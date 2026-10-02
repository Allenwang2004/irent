"""把評估結果畫成對照圖，依 TP / FP / FN / TN 分資料夾存放。

每組一張 PNG：左邊取車照、中間還車照、右邊列出每次判讀的模型輸出。
分類規則與 compare_eval.py 的 summary 相同（多數決：過半說有新車損即判定有）。

用法：
    python eval/visualize.py datasets/eval_results/Qwen3.5-9B.jsonl
"""

import argparse
import json
import shutil
from concurrent.futures import ProcessPoolExecutor
from functools import lru_cache
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

from compare_eval import group_by_pair, load_records, pair_row

FONT_DIRS = [Path.home() / ".local/share/fonts", Path("/usr/share/fonts"), Path("/usr/local/share/fonts")]

CATEGORIES = {
    "TP": ("有索賠，判定有新車損", (46, 125, 50)),
    "FN": ("有索賠，判定沒有（漏報）", (198, 40, 40)),
    "FP": ("沒索賠，判定有新車損（誤報）", (230, 81, 0)),
    "TN": ("沒索賠，判定沒有", (84, 110, 122)),
    "ERROR": ("沒有成功的判讀", (97, 97, 97)),
}

PANEL_WIDTH = 900
PAD = 24
HEADER = 120
BG = (255, 255, 255)
TEXT = (33, 33, 33)
MUTED = (110, 110, 110)
YES = (198, 40, 40)
NO = (46, 125, 50)


@lru_cache(maxsize=None)
def font(weight: str, size: int) -> ImageFont.FreeTypeFont:
    for d in FONT_DIRS:
        for path in sorted(d.rglob(f"NotoSansCJK*-{weight}.*")) if d.exists() else []:
            return ImageFont.truetype(str(path), size)
    raise SystemExit("找不到中文字型 NotoSansCJKtc，請依 eval/README.md 下載到 ~/.local/share/fonts")


def category(row: dict) -> str:
    if row["runs"] == 0:
        return "ERROR"
    if row["claim"]:
        return "TP" if row["predicted"] else "FN"
    return "FP" if row["predicted"] else "TN"


def wrap(text: str, f: ImageFont.FreeTypeFont, width: int) -> list[str]:
    lines = []
    for para in str(text).split("\n"):
        line = ""
        for ch in para:
            if f.getlength(line + ch) > width:
                lines.append(line)
                line = ch
            else:
                line += ch
        lines.append(line)
    return lines


def load_photo(path: str, height: int) -> Image.Image:
    im = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
    return im.resize((round(im.width * height / im.height), height), Image.LANCZOS)


def run_blocks(records: list[dict]) -> list[tuple[str, ImageFont.FreeTypeFont, tuple]]:
    """右側文字面板的內容：(文字, 字型, 顏色)，已依面板寬度換行。"""
    body, bold, small = font("Regular", 22), font("Bold", 26), font("Regular", 20)
    width = PANEL_WIDTH - 2 * PAD
    out = []

    def add(text, f, color):
        out.extend((line, f, color) for line in wrap(text, f, width))

    for r in records:
        n = r["run"] + 1
        if "result" not in r:
            add(f"第 {n} 次：失敗（{r.get('error', '')[:80]}）", bold, MUTED)
            if r.get("raw"):
                add(r["raw"][:300], small, MUTED)
            out.append(("", body, TEXT))
            continue
        res = r["result"]
        verdict = "有新車損" if res["new_damage"] else "沒有新車損"
        add(f"第 {n} 次：{verdict}", bold, YES if res["new_damage"] else NO)
        add(
            f"{'可比對' if res['comparable'] else '無法比對'}｜信心 {res['confidence']:.2f}｜{r.get('latency_s', '-')} 秒",
            body,
            MUTED,
        )
        items = "、".join(f"{i['location']} {i['type']}（{i['severity']}）" for i in res["items"]) or "無"
        add(f"損傷：{items}", body, TEXT)
        add(f"觀察：{res['observation']}", small, MUTED)
        add(f"理由：{res['reason']}", body, TEXT)
        out.append(("", body, TEXT))
    return out


def render(job: dict) -> str:
    pair, records, row, cat, path, height, model = (
        job[k] for k in ("pair", "records", "row", "cat", "path", "height", "model")
    )
    before, after = load_photo(pair["before"], height), load_photo(pair["after"], height)
    label_f, header_f, sub_f = font("Bold", 26), font("Bold", 34), font("Regular", 24)
    label_h = 44

    blocks = run_blocks(records)
    line_h = {id(f): round(f.size * 1.4) for _, f, _ in blocks}
    text_h = sum(line_h[id(f)] for _, f, _ in blocks)

    photos_w = PAD + before.width + PAD + after.width + PAD
    W = photos_w + PANEL_WIDTH
    H = HEADER + PAD + max(label_h + height, text_h) + PAD
    canvas = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(canvas)

    desc, color = CATEGORIES[cat]
    d.rectangle([0, 0, W, HEADER], fill=color)
    d.text((PAD, 14), f"{cat}　{desc}", font=header_f, fill=(255, 255, 255))
    truth = "有索賠" if row["claim"] else "沒索賠"
    votes = f"說有新車損 {row['new_damage_votes']}/{row['runs']} 次，無法比對 {row['not_comparable_votes']}/{row['runs']} 次"
    d.text((PAD, 68), f"{pair['id']}｜正確答案：{truth}｜{votes}｜{model}", font=sub_f, fill=(255, 255, 255))

    x, y = PAD, HEADER + PAD
    for title, im, src in (("取車（借）", before, pair["before"]), ("還車（還）", after, pair["after"])):
        d.text((x, y), f"{title}  {Path(src).name}", font=label_f, fill=TEXT)
        canvas.paste(im, (x, y + label_h))
        x += im.width + PAD

    d.line([photos_w, HEADER, photos_w, H], fill=(224, 224, 224), width=2)
    ty = HEADER + PAD
    for text, f, c in blocks:
        d.text((photos_w + PAD, ty), text, font=f, fill=c)
        ty += line_h[id(f)]

    canvas.save(path)
    return path


def render_all(results_path: Path, records: list[dict], pairs: list[dict], height: int = 1024, workers: int = 8):
    results_path = Path(results_path)
    out_dir = results_path.with_name(results_path.stem + "_viz")
    for cat in CATEGORIES:
        shutil.rmtree(out_dir / cat, ignore_errors=True)

    pairs_by_id = {p["id"]: p for p in pairs}
    jobs, counts = [], {cat: 0 for cat in CATEGORIES}
    for pid, rs in group_by_pair(records).items():
        if pid not in pairs_by_id:
            print(f"  略過 {pid}：不在 pairs.json 裡")
            continue
        pair, row = pairs_by_id[pid], pair_row(pid, rs)
        cat = category(row)
        counts[cat] += 1
        name = f"{pair['plate']}_{pair['position']}"
        if len(pid.split("/")) > 3:
            name += f"_{pid.split('/')[-1]}"
        name += f"_v{row['new_damage_votes']}of{row['runs']}"
        if row["not_comparable_votes"]:
            name += f"_nc{row['not_comparable_votes']}"
        (out_dir / cat).mkdir(parents=True, exist_ok=True)
        jobs.append({
            "pair": pair, "records": rs, "row": row, "cat": cat, "height": height,
            "path": str(out_dir / cat / f"{name}.png"), "model": rs[0].get("model", ""),
        })

    with ProcessPoolExecutor(max_workers=workers) as pool:
        list(pool.map(render, jobs))
    print(f"對照圖已存到 {out_dir}/：" + "、".join(f"{c} {n}" for c, n in counts.items() if n))
    return out_dir


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("results", help="compare_eval.py 產生的 .jsonl 結果檔")
    ap.add_argument("--pairs", default="datasets/pairs.json")
    ap.add_argument("--height", type=int, default=1024, help="照片顯示高度（像素）")
    ap.add_argument("--workers", type=int, default=8)
    args = ap.parse_args()
    pairs = json.loads(Path(args.pairs).read_text(encoding="utf-8"))
    render_all(Path(args.results), load_records(Path(args.results)), pairs, args.height, args.workers)
