"""Turn several VLM runs for one photo into a verdict and alerts.

Voting follows eval/compare_eval.py's pair_row: a verdict needs more than
half of the successful runs. Where runs disagree on cleanliness, the dirtier
level wins: a missed dirty car costs more than an extra check.
"""

from dataclasses import dataclass, field
from statistics import mean

IMAGE_TYPE_LABELS = {1: "左前", 2: "右前", 3: "左後", 4: "右後", 10: "前座", 11: "後座"}
EXTERIOR = (1, 2, 3, 4)
INTERIOR = (10, 11)

TIDY_VERDICT = {"乾淨": "clean", "普通": "normal", "髒汙": "dirty"}
TIDY_ORDER = ["clean", "normal", "dirty"]


@dataclass
class Alert:
    kind: str  # new_damage | dirty | left_item | needs_review
    severity: str  # high | medium | low
    message: str


@dataclass
class Decision:
    verdict: str
    confidence: float | None
    alerts: list[Alert] = field(default_factory=list)


def _ok(runs: list[dict]) -> list[dict]:
    return [r["result"] for r in runs if "result" in r]


def decide_compare(image_type: int, runs: list[dict]) -> Decision:
    angle = IMAGE_TYPE_LABELS.get(image_type, str(image_type))
    ok = _ok(runs)
    if not ok:
        return Decision("error", None, [Alert("needs_review", "medium", f"{angle}：車損判讀失敗，請人工檢查")])

    votes = sum(bool(r["new_damage"]) for r in ok)
    not_comparable = sum(not r["comparable"] for r in ok)
    confidence = round(mean(float(r["confidence"]) for r in ok), 3)

    if votes * 2 > len(ok):
        items = [i for r in ok if r["new_damage"] for i in r["items"]]
        severe = any(i["severity"] in ("中等", "嚴重") for i in items)
        where = "、".join(sorted({f"{i['location']}{i['type']}" for i in items})) or "位置未標明"
        return Decision(
            "new_damage",
            confidence,
            [Alert("new_damage", "high" if severe else "medium", f"{angle}疑似新車損：{where}（{votes}/{len(ok)} 次判定）")],
        )
    # Not comparable goes to a person rather than being counted as "no damage".
    if (votes + not_comparable) * 2 > len(ok):
        return Decision(
            "not_comparable",
            confidence,
            [Alert("needs_review", "low", f"{angle}：與上次還車照角度或範圍不同，無法比對，請人工確認")],
        )
    return Decision("no_new_damage", confidence)


def decide_tidy(image_type: int, runs: list[dict]) -> Decision:
    area = IMAGE_TYPE_LABELS.get(image_type, str(image_type))
    ok = _ok(runs)
    if not ok:
        return Decision("error", None, [Alert("needs_review", "medium", f"{area}：整潔度判讀失敗，請人工檢查")])

    levels = [TIDY_VERDICT.get(r["level"], "normal") for r in ok]
    counts = {lv: levels.count(lv) for lv in TIDY_ORDER}
    top = max(counts.values())
    verdict = max((lv for lv in TIDY_ORDER if counts[lv] == top), key=TIDY_ORDER.index)
    confidence = round(mean(float(r["confidence"]) for r in ok), 3)

    alerts = []
    if verdict == "dirty":
        issues = [i for r in ok if TIDY_VERDICT.get(r["level"]) == "dirty" for i in r["issues"]]
        where = "、".join(sorted({f"{i['location']}{i['type']}" for i in issues})) or "位置未標明"
        alerts.append(Alert("dirty", "high", f"{area}髒汙，須立即清潔：{where}"))

    with_items = [r for r in ok if r["left_items"]]
    if len(with_items) * 2 > len(ok):
        things = "、".join(sorted({t for r in with_items for t in r["left_items"]}))
        alerts.append(Alert("left_item", "medium", f"{area}疑似有遺留物：{things}，請聯絡上一位用戶"))
    return Decision(verdict, confidence, alerts)
