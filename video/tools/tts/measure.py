"""After replacing the WAVs in remotion/public/audio with real recordings,
update the lengths in lines.json so the video re-times itself.

    python measure.py
"""

import json
from pathlib import Path

import soundfile as sf

AUDIO = Path(__file__).resolve().parent.parent.parent / "remotion" / "public" / "audio"

lines = json.loads((AUDIO / "lines.json").read_text(encoding="utf-8"))
for line in lines:
    info = sf.info(AUDIO / f"{line['key']}.wav")
    line["seconds"] = round(info.frames / info.samplerate, 3)
    print(f"{line['key']}: {line['seconds']}s")
(AUDIO / "lines.json").write_text(json.dumps(lines, ensure_ascii=False, indent=1), encoding="utf-8")
