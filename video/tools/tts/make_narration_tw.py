# /// script
# requires-python = ">=3.10"
# dependencies = ["edge-tts", "soundfile", "numpy"]
# ///
"""Taiwanese-accent narration with Microsoft zh-TW neural voices. Run this on your own computer.

The machine that built the video cannot reach Microsoft's speech service, so this
script runs on your Mac or PC. It reads the same narration.json as make_narration.py
and uses the on-screen subtitle text (Traditional Chinese) directly.

Two ways to reach the voices:
  * No account (default): the `edge-tts` package, which uses the Edge browser's
    read-aloud voices. Free and quick, but unofficial.
  * Official Azure Speech: set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION (e.g. eastasia).
    The free tier covers 500k characters a month; the whole narration is about 1,000.

With uv nothing needs installing (the dependencies above are picked up automatically,
in a separate environment, so the project's own .venv is not touched):

Listen first (writes preview_tw/<voice>.wav, the same lines in every voice):
    uv run make_narration_tw.py --preview

Then generate the narration and re-time the video:
    uv run make_narration_tw.py --voice zh-TW-YunJheNeural --rate=-2%

By default only the lines that need it are made: lines marked "draft" in
lines.json (a temporary voice), lines whose text changed in narration.json, and
lines without an audio file. Add --all to redo every line, or --only s2_1,s5r_2
for specific ones. If the free service refuses the connection (HTTP 403), the
script waits and retries; whatever is done is saved, so running it again picks
up where it stopped.

Mac's own Taiwanese voice, offline (no account, works when edge-tts is down):
    uv run make_narration_tw.py --voice Meijia --preview          # sample: preview_tw/Meijia.wav
    uv run make_narration_tw.py --voice Meijia --all              # every line in the same voice

Without uv: pip install edge-tts soundfile numpy, then use `python` instead of `uv run`.
Write the rate with "=" (--rate=-8%), otherwise a negative value is read as an option.

The narration must stay under about 153 seconds in total, or the video passes 3:00
(remotion/fit-3min.mjs can speed the rendered video up to fit).
The script prints the total; raise --rate if it is over.
"""

import argparse
import asyncio
import io
import json
import os
import time
import urllib.request
from pathlib import Path
from xml.sax.saxutils import escape

import numpy as np
import soundfile as sf

HERE = Path(__file__).resolve().parent
OUT = HERE.parent.parent / "remotion" / "public" / "audio"
PREVIEW = HERE / "preview_tw"
VOICES = {
    "zh-TW-HsiaoChenNeural": "女聲・曉臻（沉穩）",
    "zh-TW-HsiaoYuNeural": "女聲・曉雨（明亮）",
    "zh-TW-YunJheNeural": "男聲・雲哲",
    "Meijia": "女聲・美佳（Mac 內建，離線）",
}
# Voices that are not Microsoft's (no "zh-TW-" prefix) are spoken by macOS `say`,
# e.g. Meijia, or "Meijia (Enhanced)" after downloading the better version.
MEIJIA_HELP = (
    "Mac 上沒有這個聲音。到「系統設定 → 輔助使用 → 朗讀內容 → 系統聲音 → 管理聲音…」，"
    "在「中文（台灣）」勾選「美佳」下載（有「加強版」或「高品質」可以選的話選那個，聲音比較自然），"
    "再用 say -v '?' | grep -i meijia 看它的名字，例如 --voice \"Meijia (Enhanced)\"。"
)
# The narration total (seconds) that keeps the video at or under 3:00.
BUDGET = 153.0
# Words to say differently from how they are written on screen.
# 還車: the voice sometimes reads 還 as hai2 at the start of a sentence; 環 is always huan2.
SAY = {"iRent+": "iRent Plus", "1 人": "一個人", "還車": "環車"}
PREVIEW_KEYS = ["s1_2", "s1_3", "s1_4", "s4_3"]


def spoken(line: dict) -> str:
    text = line.get("spoken_tw") or line["subtitle"]
    for a, b in SAY.items():
        text = text.replace(a, b)
    return text


async def edge_tts_bytes(text: str, voice: str, rate: str) -> bytes:
    import edge_tts

    buf = bytearray()
    async for chunk in edge_tts.Communicate(text, voice, rate=rate).stream():
        if chunk["type"] == "audio":
            buf.extend(chunk["data"])
    return bytes(buf)


def azure_bytes(text: str, voice: str, rate: str) -> bytes:
    region = os.environ["AZURE_SPEECH_REGION"]
    ssml = (
        "<speak version='1.0' xml:lang='zh-TW'>"
        f"<voice name='{voice}'><prosody rate='{rate}'>{escape(text)}</prosody></voice></speak>"
    )
    req = urllib.request.Request(
        f"https://{region}.tts.speech.microsoft.com/cognitiveservices/v1",
        data=ssml.encode("utf-8"),
        headers={
            "Ocp-Apim-Subscription-Key": os.environ["AZURE_SPEECH_KEY"],
            "Content-Type": "application/ssml+xml",
            "X-Microsoft-OutputFormat": "riff-24khz-16bit-mono-pcm",
            "User-Agent": "irent-video",
        },
    )
    with urllib.request.urlopen(req) as resp:
        return resp.read()


def is_microsoft(voice: str) -> bool:
    return voice.startswith("zh-TW-")


def mac_say_bytes(text: str, voice: str, rate: str) -> bytes:
    """macOS built-in voices, offline. --rate is applied on top of about 180 words a minute."""
    import shutil
    import subprocess
    import tempfile

    if not shutil.which("say"):
        raise SystemExit("找不到 say 指令：Mac 內建的聲音只能在 Mac 上用。")
    with tempfile.TemporaryDirectory() as d:
        out = Path(d) / "line.wav"
        cmd = ["say", "-v", voice, "-o", str(out), "--file-format=WAVE", "--data-format=LEI16@24000"]
        pct = float(rate.strip().rstrip("%") or 0)
        if abs(pct) > 0.5:
            cmd += ["-r", str(round(180 * (1 + pct / 100)))]
        r = subprocess.run([*cmd, text], capture_output=True, text=True)
        if r.returncode != 0 or not out.exists():
            raise SystemExit(f"say 執行失敗：{r.stderr.strip()}\n{MEIJIA_HELP}")
        return out.read_bytes()


def check_mac_voice(voice: str) -> None:
    import subprocess

    try:
        names = subprocess.run(["say", "-v", "?"], capture_output=True, text=True).stdout
    except FileNotFoundError:
        raise SystemExit("找不到 say 指令：Mac 內建的聲音只能在 Mac 上用。")
    if not any(line.startswith(voice + " ") or line.split("  ")[0].strip() == voice for line in names.splitlines()):
        raise SystemExit(MEIJIA_HELP)


def synth(text: str, voice: str, rate: str) -> tuple[np.ndarray, int]:
    if not is_microsoft(voice):
        data = mac_say_bytes(text, voice, rate)
    elif os.environ.get("AZURE_SPEECH_KEY"):
        data = azure_bytes(text, voice, rate)
    else:
        data = asyncio.run(edge_tts_bytes(text, voice, rate))
    x, sr = sf.read(io.BytesIO(data), dtype="float32")
    if x.ndim > 1:
        x = x.mean(axis=1)
    # Trim silence at both ends, keep a short tail, normalise (same as make_narration.py).
    idx = np.where(np.abs(x) > 0.01)[0]
    if len(idx):
        x = x[max(0, idx[0] - int(0.03 * sr)) : idx[-1] + int(0.08 * sr)]
    return x / max(1e-6, float(np.abs(x).max())) * 0.89, sr


def synth_retry(text: str, voice: str, rate: str, waits=(5, 15, 40)) -> tuple[np.ndarray, int]:
    """The free edge-tts service sometimes refuses a connection (HTTP 403) when it
    gets many requests in a row; waiting a little and trying again usually works."""
    for i, wait in enumerate((*waits, None)):
        try:
            return synth(text, voice, rate)
        except Exception as e:  # noqa: BLE001 - any network error is worth a retry
            if wait is None:
                raise
            print(f"    連線失敗（{type(e).__name__}），{wait} 秒後重試（第 {i + 1} 次）")
            time.sleep(wait)
    raise RuntimeError("unreachable")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", default=None, help=f"one of {', '.join(VOICES)} (or another macOS voice name)")
    ap.add_argument("--rate", default="-2%", help="speaking rate, e.g. +5%% or -5%%")
    ap.add_argument("--preview", action="store_true", help="write a short sample in every voice")
    ap.add_argument("--all", action="store_true", help="regenerate every line, not only the ones that need it")
    ap.add_argument("--only", default="", help="comma-separated keys to regenerate, e.g. s2_1,s5r_2")
    args = ap.parse_args()

    lines = json.loads((HERE / "narration.json").read_text(encoding="utf-8"))["lines"]
    chosen = args.voice
    args.voice = args.voice or "zh-TW-HsiaoChenNeural"
    if not is_microsoft(args.voice):
        check_mac_voice(args.voice)

    if args.preview:
        PREVIEW.mkdir(exist_ok=True)
        picked = [l for l in lines if l["key"] in PREVIEW_KEYS]
        # --voice given: only that voice; otherwise every voice in VOICES.
        for voice, name in ({chosen: VOICES.get(chosen, chosen)} if chosen else VOICES).items():
            parts, sr = [], 24000
            for line in picked:
                x, sr = synth_retry(spoken(line), voice, args.rate)
                parts += [x, np.zeros(int(0.35 * sr), dtype="float32")]
            fname = voice.replace(" ", "_").replace("(", "").replace(")", "") + ".wav"
            sf.write(PREVIEW / fname, np.concatenate(parts), sr)
            print(f"{PREVIEW / fname}  {name}")
        return

    OUT.mkdir(parents=True, exist_ok=True)
    meta_path = OUT / "lines.json"
    old = {m["key"]: m for m in json.loads(meta_path.read_text(encoding="utf-8"))} if meta_path.exists() else {}

    # Which lines to make. By default only the ones that need it: lines marked
    # "draft" in lines.json (temporary voice), lines whose text changed, and
    # lines with no audio file yet. The rest keep their current recording.
    def needed(line: dict) -> bool:
        m = old.get(line["key"])
        return m is None or m.get("draft") or m.get("text") != line["subtitle"] or not (OUT / f"{line['key']}.wav").exists()

    if args.only:
        keys = {k.strip() for k in args.only.split(",") if k.strip()}
        todo = [l for l in lines if l["key"] in keys]
    elif args.all:
        todo = lines
    else:
        todo = [l for l in lines if needed(l)]
    if not todo:
        print("每一句都已經是最新的。要全部重做請加 --all。")
        return
    print(f"要產生 {len(todo)} 句：{', '.join(l['key'] for l in todo)}\n")

    def save() -> float:
        meta = [old.get(l["key"], {"key": l["key"], "text": l["subtitle"], "seconds": 0}) for l in lines]
        meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")
        return sum(m["seconds"] for m in meta)

    done = []
    for n, line in enumerate(todo):
        try:
            x, sr = synth_retry(spoken(line), args.voice, args.rate)
        except Exception as e:  # noqa: BLE001
            save()
            left = [l["key"] for l in todo[n:]]
            print(f"\n{line['key']} 產生失敗：{e}")
            print(f"已完成 {len(done)} 句並存檔。剩下 {len(left)} 句，等幾分鐘或換個網路（例如手機熱點）後，再執行同一個指令就會接著做。")
            print("一直失敗的話，可以改用微軟官方的 Azure 語音服務（免費額度就夠），見 README「重新產生旁白」。")
            raise SystemExit(1)
        sf.write(OUT / f"{line['key']}.wav", x, sr)
        sec = round(len(x) / sr, 3)
        old[line["key"]] = {"key": line["key"], "text": line["subtitle"], "seconds": sec}
        done.append(line["key"])
        print(f"{line['key']}: {sec}s  {line['subtitle']}")
        if is_microsoft(args.voice) and not os.environ.get("AZURE_SPEECH_KEY") and n < len(todo) - 1:
            time.sleep(1.0)  # be gentle with the free service

    total = save()
    print(f"\n旁白總長 {total:.1f} 秒（上限約 {BUDGET:.0f} 秒）")
    if total > BUDGET:
        print("超過了：輸出影片後用 remotion/fit-3min.mjs 整支加速（見 README），或加快語速再跑一次（例如 --rate=+5% --all），或刪減台詞。")


if __name__ == "__main__":
    main()
