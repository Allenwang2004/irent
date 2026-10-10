"""Generate the temporary AI narration for the video.

Reads narration.json (subtitle text + how the TTS should say it), writes one
WAV per line and lines.json into ../../remotion/public/audio/. The video re-times
itself from lines.json, so after editing a line just run this and render again.

Setup (once):
    pip install sherpa-onnx soundfile
    curl -LO https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/kokoro-multi-lang-v1_1.tar.bz2
    tar xjf kokoro-multi-lang-v1_1.tar.bz2      # creates kokoro-multi-lang-v1_1/ next to this file

Run:
    python make_narration.py

"spoken" is what the TTS reads: simplified characters, numbers written out in
words, and English split so it is pronounced right ("I Rent", "P T T").
"subtitle" is what appears on screen. "pronunciations" fixes words the model
reads wrongly (it says 还车 as hai che by default).
"""

import json
from pathlib import Path

import numpy as np
import sherpa_onnx
import soundfile as sf

HERE = Path(__file__).resolve().parent
MODEL = HERE / "kokoro-multi-lang-v1_1"
OUT = HERE.parent.parent / "remotion" / "public" / "audio"


def apply_pronunciations(words: dict) -> Path:
    """Force readings for words the model gets wrong (e.g. 还车 = huan che).

    Writes a small lexicon that is consulted first, and adds the words to the
    word-segmentation dictionary so they are kept together.
    """
    words = {k: v for k, v in words.items() if not k.startswith("_")}
    custom = HERE / "lexicon-custom.txt"
    custom.write_text("".join(f"{w} {p}\n" for w, p in words.items()), encoding="utf-8")
    user_dict = MODEL / "dict" / "user.dict.utf8"
    existing = {line.split(" ")[0] for line in user_dict.read_text(encoding="utf-8").splitlines() if line}
    missing = [w for w in words if w not in existing]
    if missing:
        with user_dict.open("a", encoding="utf-8") as fh:
            for w in missing:
                fh.write(f"{w} 20000 n\n")
    return custom


def load_tts(custom_lexicon: Path) -> sherpa_onnx.OfflineTts:
    m = MODEL
    cfg = sherpa_onnx.OfflineTtsConfig(
        model=sherpa_onnx.OfflineTtsModelConfig(
            kokoro=sherpa_onnx.OfflineTtsKokoroModelConfig(
                model=str(m / "model.onnx"),
                voices=str(m / "voices.bin"),
                tokens=str(m / "tokens.txt"),
                data_dir=str(m / "espeak-ng-data"),
                dict_dir=str(m / "dict"),
                lexicon=f"{custom_lexicon},{m / 'lexicon-us-en.txt'},{m / 'lexicon-zh.txt'}",
            ),
            num_threads=4,
        ),
        rule_fsts=f"{m / 'date-zh.fst'},{m / 'number-zh.fst'},{m / 'phone-zh.fst'}",
    )
    return sherpa_onnx.OfflineTts(cfg)


def main() -> None:
    spec = json.loads((HERE / "narration.json").read_text(encoding="utf-8"))
    tts = load_tts(apply_pronunciations(spec.get("pronunciations", {})))
    OUT.mkdir(parents=True, exist_ok=True)
    meta = []
    for line in spec["lines"]:
        audio = tts.generate(line["spoken"], sid=spec["voice_sid"], speed=spec["speed"])
        x = np.asarray(audio.samples, dtype="float32")
        sr = audio.sample_rate
        # Trim silence at both ends, keep a short tail, normalise.
        idx = np.where(np.abs(x) > 0.01)[0]
        if len(idx):
            x = x[max(0, idx[0] - int(0.03 * sr)) : idx[-1] + int(0.08 * sr)]
        x = x / max(1e-6, float(np.abs(x).max())) * 0.89
        sf.write(OUT / f"{line['key']}.wav", x, sr)
        meta.append({"key": line["key"], "text": line["subtitle"], "seconds": round(len(x) / sr, 3)})
        print(f"{line['key']}: {meta[-1]['seconds']}s  {line['subtitle']}")
    (OUT / "lines.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
