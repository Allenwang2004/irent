# /// script
# requires-python = ">=3.10"
# ///
"""How the screen recordings in remotion/public/demo/ were cut from the originals.

The originals (Mac .mov or iPhone .mp4) are kept in video/demo-raw/. Each clip is
cropped and scaled to the slot it plays in, turned into 30 fps, and cut: loading
screens and waits after a click are removed, and a few still frames are held so
the clicks land on the right words of the narration.

Needs ffmpeg with the usual filters (brew install ffmpeg). Run from video/:

    uv run tools/demo/cut_demos.py            # all clips
    uv run tools/demo/cut_demos.py s5f-alerts # one clip

Pieces: ("play", start, end) plays that part of the original (seconds);
("hold", at, seconds) shows the frame at `at` for that long.
"""
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parents[2]  # video/
RAW = HERE / "demo-raw"
OUT = HERE / "remotion" / "public" / "demo"

CLIPS = {
    # ① review back office (Mac, 2940x1912): crop the menu bar and side margins; hold the top 2.5 s
    "s2-reviews": ("s2-reviews.mov", "crop=2340:1186:300:68,scale=1500:760:flags=lanczos", [
        ("hold", 0.0, 2.5),
        ("play", 0.9, 9.6),
    ]),
    # ⑤ alerts (Mac): crop from the tabs to the buttons; cut the ~3 s waits after 確認 and 駁回
    "s5f-alerts": ("s5f-alerts.mov", "crop=2340:1217:300:470,scale=1500:780:flags=lanczos", [
        ("hold", 0.0, 2.3),
        ("play", 0.0, 4.05),     # cursor to 確認
        ("play", 7.30, 8.45),    # the card is replaced (wait cut)
        ("hold", 8.45, 3.7),
        ("play", 8.45, 9.90),    # cursor to 駁回
        ("play", 13.42, 15.13),  # the card is replaced (wait cut)
        ("hold", 15.10, 3.0),
    ]),
    # ⑥ receipts (iPhone, 1206x2622): cut the three loading screens. Crop off the iOS
    # status bar (time, recording dot, "◀ Notion") and Safari's toolbar so it doesn't look
    # like a web page; the video draws its own status bar and the taps on top.
    # Output is the phone screen at 2x (780x1688): content from y 108 (= 54 pt).
    "s5g-receipt": ("s5g-receipt.mp4", "crop=1206:2134:0:186,scale=780:-2:flags=lanczos,pad=780:1688:0:108:white", [
        ("play", 3.15, 4.85),    # history list
        ("play", 7.70, 10.20),   # return receipt with its photo
        ("play", 11.40, 12.10),  # back on the list
        ("play", 15.45, 17.40),  # pickup receipt with its photos
        ("hold", 17.35, 4.5),
    ]),
}


def build(name: str, fps: int = 30) -> None:
    src, pre, pieces = CLIPS[name]
    n = len(pieces)
    g = f"[0:v]{pre},fps={fps},split={n}" + "".join(f"[s{i}]" for i in range(n)) + ";"
    for i, p in enumerate(pieces):
        if p[0] == "play":
            g += f"[s{i}]trim=start={p[1]}:end={p[2]},setpts=PTS-STARTPTS[p{i}];"
        else:
            frames = round(p[2] * fps)
            g += (f"[s{i}]trim=start={p[1]}:end={p[1] + 1.5 / fps},setpts=PTS-STARTPTS,trim=end_frame=1,"
                  f"loop=loop={frames - 1}:size=1:start=0,setpts=N/{fps}/TB[p{i}];")
    g += "".join(f"[p{i}]" for i in range(n)) + f"concat=n={n}:v=1:a=0,format=yuv420p[v]"
    out = OUT / f"{name}.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(RAW / src), "-filter_complex", g, "-map", "[v]", "-an",
                    "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-movflags", "+faststart", str(out)], check=True)
    print(f"{out.relative_to(HERE)}")


if __name__ == "__main__":
    for name in sys.argv[1:] or CLIPS:
        build(name)
