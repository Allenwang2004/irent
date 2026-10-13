# /// script
# requires-python = ">=3.10"
# dependencies = ["av>=12", "numpy", "soundfile"]
# ///
"""Use your own voice: read the whole narration in one take, this cuts it into lines.

Record yourself reading the "一次錄完" script in 配音稿.md from top to bottom,
pausing about one second between lines (a short breath at commas is fine). Any
format works: an iPhone Voice Memo (.m4a), a QuickTime recording, .mp3, .wav.

    uv run split_recording.py ~/Desktop/narration.m4a --dry-run   # look at the cut first
    uv run split_recording.py ~/Desktop/narration.m4a             # write the lines

It finds the longest pauses in the recording and cuts there, so it gets the right
number of pieces as long as the pauses between lines are longer than the pauses
inside a line. Each piece is trimmed, levelled and saved as
remotion/public/audio/<key>.wav, and lines.json is updated, so the video re-times
itself on the next render. The previous audio is copied to tools/tts/audio_backup/ first.

Only some lines: --only s5r_1,s5r_2,s5r_3 (read them in that order).
Too long for 3:00: --speed 1.05 plays every line 5% faster without changing the pitch.
"""

import argparse
import json
import shutil
import time
from fractions import Fraction
from pathlib import Path

import av
import numpy as np
import soundfile as sf

HERE = Path(__file__).resolve().parent
AUDIO = HERE.parent.parent / "remotion" / "public" / "audio"
BACKUP = HERE / "audio_backup"
BUDGET = 153.0  # seconds of narration that keep the video at or under 3:00
SR = 48000


def load(path: Path) -> np.ndarray:
    """Decode any audio file to mono float32 at 48 kHz."""
    out = []
    resampler = av.AudioResampler(format="flt", layout="mono", rate=SR)
    with av.open(str(path)) as f:
        for frame in f.decode(audio=0):
            for r in resampler.resample(frame):
                out.append(r.to_ndarray().reshape(-1))
    for r in resampler.resample(None):
        out.append(r.to_ndarray().reshape(-1))
    return np.concatenate(out).astype(np.float32)


def atempo(x: np.ndarray, speed: float) -> np.ndarray:
    """Faster or slower without changing the pitch (ffmpeg's atempo)."""
    g = av.filter.Graph()
    src = g.add_abuffer(format="flt", sample_rate=SR, layout="mono", time_base=Fraction(1, SR))
    t = g.add("atempo", f"{speed}")
    sink = g.add("abuffersink")
    src.link_to(t)
    t.link_to(sink)
    g.configure()
    out = []

    def drain():
        while True:
            try:
                out.append(g.pull().to_ndarray().reshape(-1))
            except (av.BlockingIOError, av.EOFError):
                break

    for i in range(0, len(x), 4096):
        fr = av.AudioFrame.from_ndarray(np.ascontiguousarray(x[None, i : i + 4096]), format="flt", layout="mono")
        fr.sample_rate, fr.pts, fr.time_base = SR, i, Fraction(1, SR)
        g.push(fr)
        drain()
    g.push(None)
    drain()
    return np.concatenate(out)


def loudness(x: np.ndarray, hop: int) -> np.ndarray:
    """Level of every 10 ms, in dB."""
    n = len(x) // hop
    frames = x[: n * hop].reshape(n, hop)
    return 20 * np.log10(np.sqrt((frames**2).mean(axis=1)) + 1e-9)


def cut(x: np.ndarray, pieces: int, min_gap: float) -> list[tuple[int, int]]:
    hop = SR // 100
    db = loudness(x, hop)
    # Silence = well below the speech level, measured on this recording.
    speech = np.percentile(db, 90)
    floor = np.percentile(db, 10)
    threshold = max(floor + 8, speech - 30)
    silent = db < threshold
    # Runs of silence: (start frame, end frame).
    runs, start = [], None
    for i, s in enumerate(silent):
        if s and start is None:
            start = i
        elif not s and start is not None:
            runs.append((start, i))
            start = None
    if start is not None:
        runs.append((start, len(silent)))
    # Ignore leading and trailing silence; keep the inner pauses.
    voiced = np.where(~silent)[0]
    if not len(voiced):
        raise SystemExit("錄音裡找不到聲音，請確認檔案。")
    first, last = voiced[0], voiced[-1] + 1
    inner = [(a, b) for a, b in runs if a > first and b < last and (b - a) * hop / SR >= min_gap]
    if len(inner) < pieces - 1:
        raise SystemExit(
            f"只找到 {len(inner) + 1} 段，但要切成 {pieces} 句。句子之間請停久一點（約 1 秒），"
            f"或用 --min-gap 0.3 再試；也可能是漏念了句子。"
        )
    # The longest pauses are the ones between lines.
    gaps = sorted(sorted(inner, key=lambda r: r[1] - r[0], reverse=True)[: pieces - 1])
    bounds, prev = [], first
    for a, b in gaps:
        bounds.append((prev, a))
        prev = b
    bounds.append((prev, last))
    pre, post = int(0.04 * SR), int(0.12 * SR)
    return [(max(0, a * hop - pre), min(len(x), b * hop + post)) for a, b in bounds]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("recording", type=Path)
    ap.add_argument("--only", default="", help="comma-separated keys, in the order you read them")
    ap.add_argument("--speed", type=float, default=1.0, help="e.g. 1.05 = 5%% faster, pitch unchanged")
    ap.add_argument("--min-gap", type=float, default=0.45, help="shortest pause (seconds) that can separate two lines")
    ap.add_argument("--dry-run", action="store_true", help="show the cut, write nothing")
    args = ap.parse_args()

    lines = json.loads((HERE / "narration.json").read_text(encoding="utf-8"))["lines"]
    if args.only:
        order = [k.strip() for k in args.only.split(",") if k.strip()]
        by_key = {l["key"]: l for l in lines}
        missing = [k for k in order if k not in by_key]
        if missing:
            raise SystemExit(f"narration.json 裡沒有這些句子：{', '.join(missing)}")
        todo = [by_key[k] for k in order]
    else:
        todo = lines

    x = load(args.recording)
    print(f"錄音長度 {len(x) / SR:.1f} 秒，切成 {len(todo)} 句\n")
    spans = cut(x, len(todo), args.min_gap)
    meta_path = AUDIO / "lines.json"
    old = {m["key"]: m for m in json.loads(meta_path.read_text(encoding="utf-8"))}

    clips, suspicious = [], []
    print(f"{'句子':<7}{'錄音位置':>16}{'長度':>8}{'原本':>8}   台詞")
    for line, (a, b) in zip(todo, spans):
        y = x[a:b]
        if args.speed != 1.0:
            y = atempo(y, args.speed)
        y = y / max(1e-6, float(np.abs(y).max())) * 0.89
        sec = len(y) / SR
        ref = old.get(line["key"], {}).get("seconds", 0)
        flag = ""
        if ref and not 0.6 <= sec / ref <= 1.7:
            flag = "  ← 長度差很多，可能切錯"
            suspicious.append(line["key"])
        print(f"{line['key']:<7}{a / SR:>7.1f}–{b / SR:<7.1f}{sec:>7.1f}s{ref:>7.1f}s   {line['subtitle']}{flag}")
        clips.append((line, y, sec))

    total = sum(old[l["key"]]["seconds"] for l in lines if l["key"] in old)
    total += sum(sec - old.get(l["key"], {}).get("seconds", 0) for l, _, sec in clips)
    print(f"\n旁白總長 {total:.1f} 秒（上限約 {BUDGET:.0f} 秒）")
    if total > BUDGET:
        need = total / (BUDGET - 1)
        print(f"超過了：加上 --speed {need:.2f} 再跑一次（每句加快約 {round((need - 1) * 100)}%，音高不變），或念快一點重錄；也可以輸出影片後用 remotion/fit-3min.mjs 整支加速。")
    if suspicious:
        print(f"請先聽聽看：{', '.join(suspicious)}。如果整段都錯開，通常是漏念或多念了一句，或某句中間停太久。")
    if args.dry_run:
        print("\n（--dry-run：沒有寫入任何檔案）")
        return

    # Keep a copy of the audio this replaces.
    dest = BACKUP / time.strftime("%Y%m%d-%H%M%S")
    dest.mkdir(parents=True, exist_ok=True)
    shutil.copy2(meta_path, dest / "lines.json")
    for line, _, _ in clips:
        f = AUDIO / f"{line['key']}.wav"
        if f.exists():
            shutil.copy2(f, dest / f.name)

    for line, y, sec in clips:
        sf.write(AUDIO / f"{line['key']}.wav", y, SR, subtype="PCM_16")
        old[line["key"]] = {"key": line["key"], "text": line["subtitle"], "seconds": round(sec, 3)}
    meta = [old.get(l["key"], {"key": l["key"], "text": l["subtitle"], "seconds": 0}) for l in lines]
    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"\n已寫入 {len(clips)} 句到 remotion/public/audio/，原本的音檔備份在 {dest.relative_to(HERE.parent.parent)}/")
    print("接著重新輸出影片：cd ../../remotion && npx remotion render Main ../out/irent-plus_full.mp4")
    print("超過 3 分鐘的話再整支加速：node fit-3min.mjs ../out/irent-plus_full.mp4（繳交 irent-plus_full_3min.mp4）")


if __name__ == "__main__":
    main()
