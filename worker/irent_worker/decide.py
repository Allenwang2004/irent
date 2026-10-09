"""Turn several VLM runs for one photo into a verdict and alerts.

Voting follows eval/compare_eval.py's pair_row: a verdict needs more than
half of the successful runs. Where runs disagree on cleanliness, the dirtier
level wins: a missed dirty car costs more than an extra check.

Who an alert points at depends on the inspection:
  pickup  differences from the car's previous inspection happened before this
          renter took the car (previous renter, or while parked)
  return  differences from this rental's pickup happened during this rental
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
    kind: str  # new_damage | pickup_difference | reported_damage | dirty | left_item | card_missing | needs_review
    severity: str  # high | medium | low
    message: str
    details: dict = field(default_factory=dict)


@dataclass
class Decision:
    verdict: str
    confidence: float | None
    alerts: list[Alert] = field(default_factory=list)
    # Damage items found, for reconciling with what the renter reported.
    items: list[dict] = field(default_factory=list)


def _ok(runs: list[dict]) -> list[dict]:
    return [r["result"] for r in runs if "result" in r]


def _confidence(ok: list[dict]) -> float:
    return round(mean(float(r["confidence"]) for r in ok), 3)


def _where(items: list[dict]) -> str:
    return "、".join(sorted({f"{i['location']}{i['type']}" for i in items})) or "位置未標明"


def decide_compare(image_type: int, runs: list[dict], context: str = "return") -> Decision:
    angle = IMAGE_TYPE_LABELS.get(image_type, str(image_type))
    ok = _ok(runs)
    if not ok:
        return Decision("error", None, [Alert("needs_review", "medium", f"{angle}：車損判讀失敗，請人工檢查")])

    votes = sum(bool(r["new_damage"]) for r in ok)
    not_comparable = sum(not r["comparable"] for r in ok)
    confidence = _confidence(ok)

    if votes * 2 > len(ok):
        items = [i for r in ok if r["new_damage"] for i in r["items"]]
        severe = any(i["severity"] in ("中等", "嚴重") for i in items)
        tally = f"（{votes}/{len(ok)} 次判定）"
        if context == "pickup":
            alert = Alert(
                "pickup_difference",
                "medium",
                f"{angle}取車時與上一次紀錄不同：{_where(items)}{tally}。不是這位用戶造成，請確認是否為上一位用戶或停放期間產生",
                {"items": items, "image_type": image_type},
            )
        else:
            alert = Alert(
                "new_damage",
                "high" if severe else "medium",
                f"{angle}疑似本次租用期間的新車損：{_where(items)}{tally}",
                {"items": items, "image_type": image_type},
            )
        return Decision("new_damage", confidence, [alert], items)
    # Not comparable goes to a person rather than being counted as "no damage".
    if (votes + not_comparable) * 2 > len(ok):
        base = "取車" if context == "return" else "上一次紀錄"
        return Decision(
            "not_comparable",
            confidence,
            [Alert("needs_review", "low", f"{angle}：與{base}的照片角度或範圍不同，無法比對，請人工確認", {"image_type": image_type})],
        )
    return Decision("no_new_damage", confidence)


def decide_tidy(image_type: int, runs: list[dict], context: str = "return") -> Decision:
    area = IMAGE_TYPE_LABELS.get(image_type, str(image_type))
    ok = _ok(runs)
    if not ok:
        return Decision("error", None, [Alert("needs_review", "medium", f"{area}：整潔度判讀失敗，請人工檢查")])

    levels = [TIDY_VERDICT.get(r["level"], "normal") for r in ok]
    counts = {lv: levels.count(lv) for lv in TIDY_ORDER}
    top = max(counts.values())
    verdict = max((lv for lv in TIDY_ORDER if counts[lv] == top), key=TIDY_ORDER.index)
    confidence = _confidence(ok)
    who = "上一位用戶留下" if context == "pickup" else "本次用戶還車時"

    alerts = []
    if verdict == "dirty":
        issues = [i for r in ok if TIDY_VERDICT.get(r["level"]) == "dirty" for i in r["issues"]]
        alerts.append(Alert("dirty", "high", f"{area}髒汙（{who}），須立即清潔：{_where(issues)}", {"issues": issues}))

    with_items = [r for r in ok if r["left_items"]]
    if len(with_items) * 2 > len(ok):
        things = sorted({t for r in with_items for t in r["left_items"]})
        alerts.append(
            Alert("left_item", "medium", f"{area}疑似有遺留物（{who}）：{'、'.join(things)}，請聯絡該用戶", {"items": things})
        )
    return Decision(verdict, confidence, alerts)


def decide_card(runs: list[dict], context: str = "return") -> Decision:
    ok = _ok(runs)
    if not ok:
        return Decision("error", None, [Alert("needs_review", "medium", "卡片照片判讀失敗，請人工檢查")])
    confidence = _confidence(ok)

    def present(key: str) -> bool:
        return sum(bool(r[key]) for r in ok) * 2 > len(ok)

    if sum(not r["holder_visible"] for r in ok) * 2 > len(ok):
        return Decision("error", confidence, [Alert("needs_review", "low", "卡片照片沒有拍到遮陽板卡夾，請人工確認")])
    missing = [name for key, name in (("fuel_card", "加油卡"), ("parking_card", "停車卡")) if not present(key)]
    if not missing:
        return Decision("cards_present", confidence)
    who = "上一位用戶可能沒有放回" if context == "pickup" else "本次用戶還車時"
    return Decision(
        "card_missing",
        confidence,
        [Alert("card_missing", "high", f"卡夾裡沒有看到{'、'.join(missing)}（{who}），請確認", {"missing": missing})],
    )


def decide_describe(runs: list[dict]) -> Decision:
    """What a renter-reported close-up shows; alerts are built in reconcile()."""
    ok = _ok(runs)
    if not ok:
        return Decision("error", None)
    visible = sum(bool(r["damage_visible"]) for r in ok) * 2 > len(ok)
    items = [i for r in ok if r["damage_visible"] for i in r["items"]] if visible else []
    return Decision("damage_visible" if visible else "no_damage_visible", _confidence(ok), items=items)


def reconcile(context: str, reports: list[dict], found_new_damage: bool) -> list[Alert]:
    """One alert per renter-reported photo, worded by what the comparison found.

    reports: [{"photo_id", "location", "note", "decision": Decision}]
      pickup: the renter points out damage that was already there; staff
              should add it to the car's known damage so nobody is blamed.
      return: the renter admits damage; say whether the comparison saw new
              damage too, or whether a person needs to look.
    """
    alerts = []
    for r in reports:
        d: Decision = r["decision"]
        where = r["location"] or "未標示位置"
        note = f"「{r['note']}」" if r.get("note") else ""
        seen = f"照片判讀：{_where(d.items)}" if d.verdict == "damage_visible" else "照片中看不太出損傷"
        if context == "pickup":
            message = f"用戶取車時回報既有損傷（{where}）{note}。{seen}。確認後請記錄為已知車損"
            severity = "low"
        elif found_new_damage:
            message = f"用戶還車時主動回報損傷（{where}）{note}，比對也偵測到新車損。{seen}"
            severity = "medium"
        else:
            message = f"用戶還車時主動回報損傷（{where}）{note}，但比對沒有偵測到新車損，請人工確認。{seen}"
            severity = "medium"
        alerts.append(Alert("reported_damage", severity, message, {"items": d.items, "location": r["location"]}))
    return alerts


def note_unreported(alerts: list[Alert], reported_count: int) -> None:
    """At return, say on each new-damage alert whether the renter reported anything."""
    for a in alerts:
        if a.kind == "new_damage":
            a.message += f"。用戶自行回報 {reported_count} 處" if reported_count else "。用戶沒有自行回報"
            a.details["reported_by_renter"] = reported_count > 0
