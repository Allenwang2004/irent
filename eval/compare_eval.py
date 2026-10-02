"""取車照 vs 還車照的新車損判讀評估。

對本機 vLLM（OpenAI 相容介面）上的開源 VLM，逐組送出 datasets/pairs.json 的取車照與還車照，
每組跑多次，計算 recall、誤報率、穩定度與延遲。

用法：
    python eval/compare_eval.py --model Qwen/Qwen3.5-9B --limit 10
    python eval/compare_eval.py --summarize datasets/eval_results/xxx.jsonl
"""

import argparse
import asyncio
import base64
import io
import json
import statistics
import time
from collections import defaultdict
from functools import lru_cache
from pathlib import Path

from openai import AsyncOpenAI
from PIL import Image, ImageOps

DAMAGE_TYPES = ["刮傷", "凹陷", "破裂", "掉漆", "燈具破損", "其他"]

SCHEMA = {
    "type": "object",
    "properties": {
        "observation": {"type": "string"},
        "comparable": {"type": "boolean"},
        "new_damage": {"type": "boolean"},
        "items": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "location": {"type": "string"},
                    "type": {"type": "string", "enum": DAMAGE_TYPES},
                    "severity": {"type": "string", "enum": ["輕微", "中等", "嚴重"]},
                },
                "required": ["location", "type", "severity"],
                "additionalProperties": False,
            },
        },
        "confidence": {"type": "number", "minimum": 0, "maximum": 1},
        "reason": {"type": "string"},
    },
    "required": ["observation", "comparable", "new_damage", "items", "confidence", "reason"],
    "additionalProperties": False,
}

SYSTEM = "你是租車公司的車況檢查員，負責比對同一台車在租車前後的照片，找出這次租車期間新產生的車損。"

INSTRUCTION = f"""請比對上面兩張照片，以 JSON 回答：

- observation：先分別描述兩張照片拍到車子的哪個部位、角度，以及各自看得到的損傷。
- comparable：兩張照片是否拍到同一區域、足以比對。若還車照的可疑區域在取車照中看不到，填 false。
- new_damage：還車照中是否有「取車照沒有」的新損傷。取車照已存在的舊傷不算。
- items：每一處新損傷的位置（用鈑件名稱，例如「左前保險桿」、「右後車門」）、類型（限 {"、".join(DAMAGE_TYPES)}）、嚴重度。沒有則為空陣列。
- confidence：對 new_damage 判斷的信心，0 到 1。
- reason：用繁體中文說明判斷理由。

注意：反光、倒影、水漬、灰塵、陰影、光線與拍攝角度造成的差異都不是車損。"""


@lru_cache(maxsize=512)
def encode_image(path: str, max_side: int) -> str:
    im = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
    im.thumbnail((max_side, max_side))
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=90)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


async def judge(client: AsyncOpenAI, args, pair: dict, run: int) -> dict:
    content = [
        {"type": "text", "text": "第一張：取車照（本次租車開始時拍攝）"},
        {"type": "image_url", "image_url": {"url": encode_image(pair["before"], args.max_side)}},
        {"type": "text", "text": "第二張：還車照（本次租車結束時拍攝）"},
        {"type": "image_url", "image_url": {"url": encode_image(pair["after"], args.max_side)}},
        {"type": "text", "text": INSTRUCTION},
    ]
    record = {"id": pair["id"], "run": run, "claim": pair["claim"], "model": args.model, "thinking": args.thinking}
    t0 = time.perf_counter()
    try:
        resp = await client.chat.completions.create(
            model=args.model,
            messages=[{"role": "system", "content": SYSTEM}, {"role": "user", "content": content}],
            response_format={"type": "json_schema", "json_schema": {"name": "damage_compare", "schema": SCHEMA}},
            temperature=args.temperature,
            top_p=0.95 if args.thinking else 0.8,
            max_tokens=8192 if args.thinking else 1536,
            extra_body={"top_k": 20, "chat_template_kwargs": {"enable_thinking": args.thinking}},
        )
        text = resp.choices[0].message.content or ""
        record["usage"] = {"input": resp.usage.prompt_tokens, "output": resp.usage.completion_tokens}
        try:
            record["result"] = json.loads(text)
        except json.JSONDecodeError:
            record["error"] = "parse"
            record["raw"] = text
    except Exception as e:  # 逾時、連線錯誤等，記錄後繼續
        record["error"] = f"{type(e).__name__}: {e}"
    record["latency_s"] = round(time.perf_counter() - t0, 2)
    return record


def group_by_pair(records: list[dict]) -> dict[str, list[dict]]:
    by_pair = defaultdict(list)
    for r in records:
        by_pair[r["id"]].append(r)
    return {pid: sorted(rs, key=lambda r: r["run"]) for pid, rs in sorted(by_pair.items())}


def pair_row(pid: str, rs: list[dict]) -> dict:
    """把同一組的多次判讀合成一列；predicted 以多數決（過半說有新車損）決定。"""
    ok = [r["result"] for r in rs if "result" in r]
    votes = sum(res["new_damage"] for res in ok)
    not_comparable = sum(not res["comparable"] for res in ok)
    return {
        "id": pid,
        "claim": rs[0]["claim"],
        "runs": len(ok),
        "errors": len(rs) - len(ok),
        "new_damage_votes": votes,
        "not_comparable_votes": not_comparable,
        "predicted": len(ok) > 0 and votes * 2 > len(ok),
        "flagged": len(ok) > 0 and (votes + not_comparable) * 2 > len(ok),
        "consistent": len(ok) > 0 and votes in (0, len(ok)),
        "locations": sorted({i["location"] for res in ok for i in res["items"]}),
    }


def summarize(records: list[dict]) -> dict:
    rows = [pair_row(pid, rs) for pid, rs in group_by_pair(records).items()]

    pos = [r for r in rows if r["claim"]]
    neg = [r for r in rows if not r["claim"]]

    def rate(xs, key):
        return round(sum(x[key] for x in xs) / len(xs), 3) if xs else None

    lat = sorted(r["latency_s"] for r in records if "result" in r)
    return {
        "pairs": {"positive": len(pos), "negative": len(neg)},
        "recall": rate(pos, "predicted"),
        "false_positive_rate": rate(neg, "predicted"),
        "flagged_recall": rate(pos, "flagged"),
        "flagged_false_positive_rate": rate(neg, "flagged"),
        "consistency": rate(rows, "consistent"),
        "request_errors": sum(r["errors"] for r in rows),
        "latency_s": {
            "p50": lat[len(lat) // 2] if lat else None,
            "p95": lat[int(len(lat) * 0.95)] if lat else None,
        },
        "positives": [{k: r[k] for k in ("id", "new_damage_votes", "not_comparable_votes", "runs", "locations")} for r in pos],
        "false_positives": [{k: r[k] for k in ("id", "new_damage_votes", "runs", "locations")} for r in neg if r["predicted"]],
    }


def load_records(path: Path) -> list[dict]:
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


async def main(args):
    pairs = json.loads(Path(args.pairs).read_text(encoding="utf-8"))
    if args.limit:
        # 正負例各取一半，小規模試跑也看得到兩邊的結果
        pos = [p for p in pairs if p["claim"]][: (args.limit + 1) // 2]
        neg = [p for p in pairs if not p["claim"]][: args.limit // 2]
        pairs = pos + neg

    out = Path(args.out or f"datasets/eval_results/{args.model.split('/')[-1]}{'-thinking' if args.thinking else ''}.jsonl")
    out.parent.mkdir(parents=True, exist_ok=True)
    done = {(r["id"], r["run"]) for r in load_records(out) if "result" in r}
    todo = [(p, run) for p in pairs for run in range(args.runs) if (p["id"], run) not in done]
    print(f"{len(pairs)} 組 × {args.runs} 次，待跑 {len(todo)} 次，結果寫入 {out}")

    client = AsyncOpenAI(base_url=args.base_url, api_key="EMPTY", timeout=args.timeout, max_retries=1)
    sem = asyncio.Semaphore(args.concurrency)

    async def worker(pair, run):
        async with sem:
            return await judge(client, args, pair, run)

    with out.open("a", encoding="utf-8") as f:
        for i, task in enumerate(asyncio.as_completed([worker(p, r) for p, r in todo]), 1):
            record = await task
            f.write(json.dumps(record, ensure_ascii=False) + "\n")
            f.flush()
            if i % 10 == 0 or i == len(todo):
                print(f"  {i}/{len(todo)}")

    wanted = {p["id"] for p in pairs}
    records = [r for r in load_records(out) if r["id"] in wanted]
    report(out, records)
    if not args.no_viz:
        from visualize import render_all

        render_all(out, records, pairs)


def report(out: Path, records: list[dict]):
    summary = summarize(records)
    out.with_suffix(".summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({k: v for k, v in summary.items() if k not in ("positives", "false_positives")}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="Qwen/Qwen3.5-9B")
    ap.add_argument("--base-url", default="http://127.0.0.1:8000/v1")
    ap.add_argument("--pairs", default="datasets/pairs.json")
    ap.add_argument("--out")
    ap.add_argument("--runs", type=int, default=3)
    ap.add_argument("--limit", type=int, help="只跑前 N 組（正負例各半）")
    ap.add_argument("--concurrency", type=int, default=8)
    ap.add_argument("--max-side", type=int, default=1280, help="圖片長邊上限（像素）")
    ap.add_argument("--temperature", type=float, default=0.7)
    ap.add_argument("--thinking", action="store_true", help="開啟模型的思考模式")
    ap.add_argument("--timeout", type=float, default=300)
    ap.add_argument("--summarize", help="只重新計算既有結果檔的指標")
    ap.add_argument("--no-viz", action="store_true", help="跑完不產生對照圖")
    args = ap.parse_args()
    if args.summarize:
        report(Path(args.summarize), load_records(Path(args.summarize)))
    else:
        asyncio.run(main(args))
