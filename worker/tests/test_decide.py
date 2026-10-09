"""Voting rules. Run from worker/: python -m pytest tests  (or: python tests/test_decide.py)"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from irent_worker.decide import decide_compare, decide_tidy  # noqa: E402


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


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_"):
            fn()
            print("ok", name)
