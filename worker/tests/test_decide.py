"""Voting rules. Run from worker/: python -m pytest tests  (or: python tests/test_decide.py)"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from irent_worker.decide import (  # noqa: E402
    decide_card,
    decide_compare,
    decide_describe,
    decide_tidy,
    note_unreported,
    reconcile,
)


def cmp(new_damage, comparable=True, severity="中等"):
    items = [{"location": "前保險桿", "type": "刮傷", "severity": severity}] if new_damage else []
    return {"result": {"comparable": comparable, "new_damage": new_damage, "items": items, "confidence": 0.8}}


def tidy(level, left_items=()):
    issues = [{"location": "腳踏墊", "type": "垃圾"}] if level == "髒汙" else []
    return {"result": {"level": level, "issues": issues, "left_items": list(left_items), "confidence": 0.7}}


ERR = {"error": "parse"}


def test_compare_majority_new_damage():
    d = decide_compare(1, [cmp(True), cmp(True), cmp(False)])
    assert d.verdict == "new_damage"
    assert [a.kind for a in d.alerts] == ["new_damage"]
    assert d.alerts[0].severity == "high"
    assert "左前" in d.alerts[0].message and "2/3" in d.alerts[0].message


def test_compare_minor_damage_is_medium():
    d = decide_compare(2, [cmp(True, severity="輕微")] * 3)
    assert d.alerts[0].severity == "medium"


def test_compare_minority_is_no_damage():
    d = decide_compare(3, [cmp(True), cmp(False), cmp(False)])
    assert d.verdict == "no_new_damage" and d.alerts == []


def test_compare_not_comparable_goes_to_review():
    d = decide_compare(4, [cmp(False, comparable=False), cmp(False, comparable=False), cmp(False)])
    assert d.verdict == "not_comparable"
    assert d.alerts[0].kind == "needs_review"


def test_compare_ignores_failed_runs():
    d = decide_compare(1, [cmp(True), ERR, ERR])
    assert d.verdict == "new_damage"


def test_compare_all_failed():
    d = decide_compare(1, [ERR, ERR, ERR])
    assert d.verdict == "error" and d.alerts[0].kind == "needs_review"


def test_tidy_majority():
    assert decide_tidy(10, [tidy("乾淨"), tidy("乾淨"), tidy("普通")]).verdict == "clean"


def test_tidy_tie_goes_dirtier():
    d = decide_tidy(11, [tidy("乾淨"), tidy("髒汙"), ERR])
    assert d.verdict == "dirty"
    assert d.alerts[0].kind == "dirty" and d.alerts[0].severity == "high"


def test_tidy_left_items_need_majority():
    d = decide_tidy(11, [tidy("普通", ["雨傘"]), tidy("普通", ["雨傘", "手機"]), tidy("普通")])
    assert [a.kind for a in d.alerts] == ["left_item"]
    assert "雨傘" in d.alerts[0].message and "手機" in d.alerts[0].message
    assert decide_tidy(11, [tidy("普通", ["雨傘"]), tidy("普通"), tidy("普通")]).alerts == []


def test_compare_pickup_points_at_previous_period():
    d = decide_compare(1, [cmp(True)] * 3, context="pickup")
    assert d.verdict == "new_damage"
    assert d.alerts[0].kind == "pickup_difference" and "不是這位用戶造成" in d.alerts[0].message
    assert d.alerts[0].details["items"][0]["location"] == "前保險桿"


def test_tidy_pickup_blames_previous_renter():
    d = decide_tidy(10, [tidy("髒汙")] * 3, context="pickup")
    assert "上一位用戶" in d.alerts[0].message


def card(fuel=True, parking=True, holder=True):
    return {"result": {"holder_visible": holder, "fuel_card": fuel, "parking_card": parking, "confidence": 0.9}}


def test_card_present():
    assert decide_card([card(), card(), card(fuel=False)]).verdict == "cards_present"


def test_card_missing():
    d = decide_card([card(fuel=False), card(fuel=False), card()], context="pickup")
    assert d.verdict == "card_missing"
    assert d.alerts[0].kind == "card_missing" and "加油卡" in d.alerts[0].message and "上一位" in d.alerts[0].message


def test_card_holder_not_visible():
    d = decide_card([card(holder=False)] * 3)
    assert d.alerts[0].kind == "needs_review"


def desc(visible=True):
    items = [{"location": "後保險桿", "type": "刮傷", "severity": "輕微"}] if visible else []
    return {"result": {"damage_visible": visible, "items": items, "confidence": 0.8}}


def test_reconcile_return_reported_but_not_detected():
    d = decide_describe([desc()] * 3)
    [a] = reconcile("return", [{"photo_id": 1, "location": "車尾", "note": "倒車擦到", "decision": d}], found_new_damage=False)
    assert a.kind == "reported_damage" and "沒有偵測到" in a.message and "倒車擦到" in a.message


def test_reconcile_return_reported_and_detected():
    d = decide_describe([desc()] * 3)
    [a] = reconcile("return", [{"photo_id": 1, "location": "車尾", "note": None, "decision": d}], found_new_damage=True)
    assert "也偵測到" in a.message


def test_reconcile_pickup_asks_to_record():
    d = decide_describe([desc(False)] * 3)
    [a] = reconcile("pickup", [{"photo_id": 1, "location": "左側", "note": None, "decision": d}], found_new_damage=False)
    assert a.severity == "low" and "已知車損" in a.message and "看不太出" in a.message


def test_new_damage_says_whether_renter_reported():
    d = decide_compare(1, [cmp(True)] * 3)
    note_unreported(d.alerts, 0)
    assert d.alerts[0].message.endswith("用戶沒有自行回報")
    d = decide_compare(1, [cmp(True)] * 3)
    note_unreported(d.alerts, 2)
    assert "用戶自行回報 2 處" in d.alerts[0].message and d.alerts[0].details["reported_by_renter"]


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_"):
            fn()
            print("ok", name)
