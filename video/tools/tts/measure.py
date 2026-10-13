# /// script
# requires-python = ">=3.10"
# dependencies = ["soundfile"]
# ///
"""After replacing the WAVs in remotion/public/audio with real recordings,
update the lengths in lines.json so the video re-times itself.

    uv run measure.py        (or: pip install soundfile, then python measure.py)

Files changed since lines.json was last written are taken to be new recordings,
so their "draft" mark (a temporary voice) is removed.
"""

import json
from pathlib import Path

import soundfile as sf

AUDIO = Path(__file__).resolve().parent.parent.parent / "remotion" / "public" / "audio"

meta_path = AUDIO / "lines.json"
since = meta_path.stat().st_mtime
lines = json.loads(meta_path.read_text(encoding="utf-8"))
total = 0.0
for line in lines:
    f = AUDIO / f"{line['key']}.wav"
    info = sf.info(f)
    line["seconds"] = round(info.frames / info.samplerate, 3)
    total += line["seconds"]
    if f.stat().st_mtime > since:
        line.pop("draft", None)
    print(f"{line['key']}: {line['seconds']}s{'  （暫用語音）' if line.get('draft') else ''}")
meta_path.write_text(json.dumps(lines, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"\n旁白總長 {total:.1f} 秒（上限約 153 秒，超過影片就會超過 3:00，可以用 remotion/fit-3min.mjs 整支加速）")
