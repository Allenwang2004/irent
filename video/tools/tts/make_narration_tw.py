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

Then generate all lines and re-time the video:
    uv run make_narration_tw.py --voice zh-TW-YunJheNeural --rate=-2%

Without uv: pip install edge-tts soundfile numpy, then use `python` instead of `uv run`.
Write the rate with "=" (--rate=-8%), otherwise a negative value is read as an option.

The narration must stay under about 148 seconds in total, or the video passes 3:00.
The script prints the total; raise --rate if it is over.
"""

import argparse
import asyncio
import io
import json
import os
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
}
# The narration total (seconds) that keeps the video at or under 3:00.
BUDGET = 148.0
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


def synth(text: str, voice: str, rate: str) -> tuple[np.ndarray, int]:
    if os.environ.get("AZURE_SPEECH_KEY"):
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


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", default="zh-TW-HsiaoChenNeural", choices=list(VOICES))
    ap.add_argument("--rate", default="-2%", help="speaking rate, e.g. +5%% or -5%%")
    ap.add_argument("--preview", action="store_true", help="write a short sample in every voice")
    args = ap.parse_args()

    lines = json.loads((HERE / "narration.json").read_text(encoding="utf-8"))["lines"]

    if args.preview:
        PREVIEW.mkdir(exist_ok=True)
        picked = [l for l in lines if l["key"] in PREVIEW_KEYS]
        for voice, name in VOICES.items():
            parts, sr = [], 24000
            for line in picked:
                x, sr = synth(spoken(line), voice, args.rate)
                parts += [x, np.zeros(int(0.35 * sr), dtype="float32")]
            sf.write(PREVIEW / f"{voice}.wav", np.concatenate(parts), sr)
            print(f"{PREVIEW / (voice + '.wav')}  {name}")
        return

    OUT.mkdir(parents=True, exist_ok=True)
    meta, total = [], 0.0
    for line in lines:
        x, sr = synth(spoken(line), args.voice, args.rate)
        sf.write(OUT / f"{line['key']}.wav", x, sr)
        sec = round(len(x) / sr, 3)
        total += sec
        meta.append({"key": line["key"], "text": line["subtitle"], "seconds": sec})
        print(f"{line['key']}: {sec}s  {line['subtitle']}")
    (OUT / "lines.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"\n旁白總長 {total:.1f} 秒（上限約 {BUDGET:.0f} 秒）")
    if total > BUDGET:
        print("超過了：加快語速再跑一次，例如 --rate +6%，或刪減台詞。")


if __name__ == "__main__":
    main()
