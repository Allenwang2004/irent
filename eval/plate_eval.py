"""Can the phone tell, from the photo alone, that the plate is the rented car's?

Runs PP-OCR (text detection + recognition, the ONNX models RapidOCR ships;
the same files run in a browser with onnxruntime-web) on the hackathon's
corner photos, whose file names carry the plate, and checks the text it reads
against that plate.

Because the app knows which car is being photographed, it only has to confirm
the plate, not read it from scratch: a reading within one character of the
expected plate counts as a match. Per photo the check says:

  match     a reading within MATCH_EDITS of the expected plate
  mismatch  a plate-shaped reading (3 letters + 4 digits) far from it
  unknown   nothing plate-like read; the app could only say "plate not found"

Each photo is also checked against another car's plate (an impostor), to see
how often a wrong car would wrongly pass and how often it would be caught.

  uv run --with rapidocr --with onnxruntime --with pillow python eval/plate_eval.py
  uv run ... python eval/plate_eval.py --sizes 1280 960 640
  uv run ... python eval/plate_eval.py --models v4-det+v3-en --model-dir <folder with the ONNX files>

Results (they contain plates) go to datasets/eval_results/, which is not in git.
If datasets/eval_results/plate_labels.json exists (file name -> V whole plate in
frame, P plate cut off or partly hidden, N no plate), results are also split by it.
"""

import argparse
import json
import random
import re
import statistics
import time
from pathlib import Path

from PIL import Image, ImageOps
from rapidocr import RapidOCR
from rapidocr.utils.typings import OCRVersion

ROOT = Path(__file__).resolve().parent.parent
DATASETS = ROOT / "datasets"
OUT = DATASETS / "eval_results"

ANGLES = ["左前", "右前", "左後", "右後"]
NAME_RE = re.compile(r"^([A-Z]{3})-?(\d{4})\s*(左前|右前|左後|右後)\s*(借|還)")
# File names that carry the wrong plate: every photo of this car shows RFA-7873.
PLATE_FIX = {"RFH7873": "RFA7873"}

MATCH_EDITS = 1
MISMATCH_EDITS = 3

# Recognition mistakes that are common on plates. Letters sit in the first three
# places and digits in the last four, so a character can be read back to the
# right kind for its place.
TO_DIGIT = {"O": "0", "D": "0", "Q": "0", "I": "1", "L": "1", "Z": "2", "S": "5", "B": "8", "G": "6", "T": "7"}
TO_LETTER = {v: k for k, v in {"O": "0", "I": "1", "Z": "2", "S": "5", "B": "8", "G": "6", "T": "7"}.items()}


def photos():
    out = []
    for folder in ["claim", "no_claim"]:
        for p in sorted((DATASETS / folder).iterdir()):
            m = NAME_RE.match(p.name)
            if m:
                plate = PLATE_FIX.get(m[1] + m[2], m[1] + m[2])
                out.append({"path": p, "plate": plate, "angle": m[3], "phase": m[4], "set": folder})
    return out


def edits(a: str, b: str) -> int:
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def candidates(texts: list[str]) -> list[str]:
    """Plate-length windows of everything read, with letters and digits put back in place."""
    out = set()
    for t in texts:
        s = re.sub(r"[^A-Z0-9]", "", t.upper())
        for i in range(max(1, len(s) - 6)):
            w = s[i : i + 7]
            if len(w) < 6:
                continue
            fixed = "".join(TO_LETTER.get(c, c) for c in w[:3]) + "".join(TO_DIGIT.get(c, c) for c in w[3:])
            out.add(fixed)
    return sorted(out)


def plate_shaped(c: str) -> bool:
    return bool(re.fullmatch(r"[A-Z]{3}\d{4}", c))


def verdict(cands: list[str], expected: str):
    if not cands:
        return "unknown", None
    best = min(cands, key=lambda c: edits(c, expected))
    d = edits(best, expected)
    if d <= MATCH_EDITS:
        return "match", best
    shaped = [c for c in cands if plate_shaped(c)]
    if shaped and min(edits(c, expected) for c in shaped) >= MISMATCH_EDITS:
        return "mismatch", min(shaped, key=lambda c: edits(c, expected))
    return "unknown", best


def load(path: Path, long_side: int) -> Image.Image:
    im = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
    scale = long_side / max(im.size)
    if scale < 1:
        im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    return im


# Model sets to compare. "v6-small" is RapidOCR's bundled default. The others are
# smaller PP-OCR files from https://huggingface.co/SWHL/RapidOCR (detection and
# recognition; the recognisers carry their character list), read from --model-dir.
# The same ONNX files run in a browser with onnxruntime-web.
MODELS = {
    "v6-small": None,
    "v4-det+v4-ch": ("ch_PP-OCRv4_det_infer.onnx", "ch_PP-OCRv4_rec_infer.onnx"),
    "v4-det+v3-en": ("ch_PP-OCRv4_det_infer.onnx", "en_PP-OCRv3_rec_infer.onnx"),
}


def engine_for(name: str, model_dir: Path, det_side: int | None = None) -> RapidOCR:
    """det_side: run detection with the long side at most this many pixels and no
    180-degree text classifier, as the live camera check does (camera frames are
    upright). Default: RapidOCR's own settings (short side scaled to 736)."""
    params = {}
    files = MODELS[name]
    if files is not None:
        det, rec = (model_dir / f for f in files)
        params |= {
            "Det.model_path": str(det),
            "Det.ocr_version": OCRVersion.PPOCRV4,
            "Rec.model_path": str(rec),
            "Rec.ocr_version": OCRVersion.PPOCRV4,
        }
    if det_side:
        params |= {"Det.limit_type": "max", "Det.limit_side_len": det_side, "Global.use_cls": False}
    return RapidOCR(params=params)


def model_files(name: str, model_dir: Path) -> dict:
    """ONNX files a browser would download, in MB (the bundled default's are listed by RapidOCR's log)."""
    files = MODELS[name]
    if files is None:
        return {"PP-OCRv6_det_small.onnx": 9.9, "PP-OCRv6_rec_small.onnx": 21.2}
    return {f: round((model_dir / f).stat().st_size / 1e6, 1) for f in files}


LABELS = OUT / "plate_labels.json"
VISIBILITY = {"V": "whole_plate", "P": "partial_plate", "N": "no_plate"}


def pct(n: int, total: int) -> str:
    return f"{n}/{total} ({100 * n / total:.1f}%)" if total else "0/0"


def read(engine: RapidOCR, im: Image.Image, expected: str, rotations: bool):
    """Texts read from the photo. With rotations, a photo stored sideways (some
    in the dataset are; the app's camera frames never are) is tried turned."""
    texts = list(engine(im).txts or [])
    if rotations and verdict(candidates(texts), expected)[0] != "match":
        for angle in (90, 270):
            turned = list(engine(im.rotate(angle, expand=True)).txts or [])
            if verdict(candidates(turned), expected)[0] == "match":
                return turned, angle
    return texts, 0


def run(size: int, items: list[dict], engine: RapidOCR, seed: int, rotations: bool = False):
    rng = random.Random(seed)
    plates = sorted({it["plate"] for it in items})
    rows, latencies = [], []
    for it in items:
        im = load(it["path"], size)
        t0 = time.perf_counter()
        texts, turned = read(engine, im, it["plate"], rotations)
        latencies.append(time.perf_counter() - t0)
        cands = candidates(texts)
        own, own_read = verdict(cands, it["plate"])
        impostor = rng.choice([p for p in plates if p != it["plate"]])
        other, _ = verdict(cands, impostor)
        rows.append(
            {
                "file": it["path"].name,
                "set": it["set"],
                "plate": it["plate"],
                "angle": it["angle"],
                "phase": it["phase"],
                "texts": texts,
                "turned": turned,
                "own": own,
                "own_read": own_read,
                "impostor": impostor,
                "impostor_verdict": other,
            }
        )

    n = len(rows)
    count = lambda key, val, rs=rows: sum(r[key] == val for r in rs)
    summary = {
        "long_side": size,
        "photos": n,
        "cars": len(plates),
        "own_plate": {v: pct(count("own", v), n) for v in ["match", "unknown", "mismatch"]},
        "impostor_plate": {
            "wrongly_passed": pct(count("impostor_verdict", "match"), n),
            "caught": pct(count("impostor_verdict", "mismatch"), n),
            "unknown": pct(count("impostor_verdict", "unknown"), n),
        },
        "by_angle": {
            a: pct(count("own", "match", [r for r in rows if r["angle"] == a]), sum(r["angle"] == a for r in rows))
            for a in ANGLES
        },
        "by_visibility": by_visibility(rows),
        "latency_s_mac_cpu": {
            "p50": round(statistics.median(latencies), 3),
            "p95": round(sorted(latencies)[int(0.95 * (n - 1))], 3),
        },
    }
    return rows, summary


def by_visibility(rows: list[dict]) -> dict | None:
    if not LABELS.exists():
        return None
    labels = json.loads(LABELS.read_text())
    out = {}
    for key, name in VISIBILITY.items():
        rs = [r for r in rows if labels.get(r["file"]) == key]
        n = len(rs)
        out[name] = {
            "photos": n,
            "own_plate": {v: pct(sum(r["own"] == v for r in rs), n) for v in ["match", "unknown", "mismatch"]},
            "impostor_wrongly_passed": pct(sum(r["impostor_verdict"] == "match" for r in rs), n),
        }
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sizes", type=int, nargs="+", default=[1280])
    ap.add_argument("--seed", type=int, default=0)
    ap.add_argument("--limit", type=int)
    ap.add_argument("--rotations", action="store_true", help="also try sideways photos turned (upper bound)")
    ap.add_argument("--models", choices=sorted(MODELS), default="v6-small")
    ap.add_argument("--model-dir", type=Path, default=Path.home() / ".cache" / "irent-ocr")
    ap.add_argument("--det-side", type=int, help="live-check setting: detection long side, no text classifier")
    args = ap.parse_args()

    items = photos()[: args.limit]
    engine = engine_for(args.models, args.model_dir, args.det_side)
    OUT.mkdir(parents=True, exist_ok=True)
    for size in args.sizes:
        rows, summary = run(size, items, engine, args.seed, args.rotations)
        summary["models"] = args.models
        summary["det_side"] = args.det_side
        summary["model_files_mb"] = model_files(args.models, args.model_dir)
        name = f"plate_{args.models}_{size}{f'_det{args.det_side}' if args.det_side else ''}{'_rot' if args.rotations else ''}"
        with open(OUT / f"{name}.jsonl", "w") as f:
            for r in rows:
                f.write(json.dumps(r, ensure_ascii=False) + "\n")
        (OUT / f"{name}.summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2))
        print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
