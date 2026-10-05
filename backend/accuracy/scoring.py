"""Score ReportSaathi's reading of real reports against hand-checked answers.

An answer key ("label") is written by a person for each report:

    {
      "reviewed": true,
      "source": "photo",                 # or "pdf"
      "lab_name": "City Diagnostics",
      "report_date": "2026-09-12",
      "tests": [
        {"name": "Haemoglobin", "value": "11.2", "unit": "g/dL", "flag": "low"},
        ...
      ]
    }

`flag` is what a careful person decides by comparing the value with the range
printed on the report: low, high, normal, abnormal (a word result like
"Positive" where "Negative" is expected) or unknown (no range printed).

Everything here is pure functions, so the scoring itself is unit-tested.
"""

from collections import Counter
from dataclasses import dataclass, field

from app.services.catalog import match_test, normalize_unit
from app.services.flagging import parse_value


@dataclass
class Predicted:
    name: str
    value: str
    unit: str | None
    flag: str
    catalog_key: str | None = None


@dataclass
class ReportScore:
    source: str
    expected: int = 0
    predicted: int = 0
    found: int = 0
    value_ok: int = 0
    unit_ok: int = 0
    flag_ok: int = 0
    lab_ok: bool = False
    date_ok: bool = False
    missed: list[str] = field(default_factory=list)
    wrong_value: list[str] = field(default_factory=list)
    wrong_flag: list[str] = field(default_factory=list)


def _name_key(name: str, catalog_key: str | None = None) -> str:
    """Two names are the same test if the catalog says so, or if they read the same."""
    test = match_test(name, catalog_key)
    if test is not None:
        return test.key
    return " ".join("".join(c if c.isalnum() else " " for c in name.lower()).split())


def _same_value(expected: str, got: str) -> bool:
    a, b = parse_value(expected), parse_value(got)
    if a is not None and b is not None:
        return abs(a - b) <= 1e-9 * max(1, abs(a))
    return " ".join(expected.lower().split()) == " ".join(got.lower().split())


def _same_unit(expected: str | None, got: str | None) -> bool:
    return normalize_unit(expected or "") == normalize_unit(got or "")


def _norm_text(text: str | None) -> str:
    return " ".join("".join(c if c.isalnum() else " " for c in (text or "").lower()).split())


def score_report(
    label: dict, predicted: list[Predicted], lab_name: str | None, report_date: str | None
) -> ReportScore:
    score = ReportScore(source=label.get("source", "unknown"))
    expected = label["tests"]
    score.expected, score.predicted = len(expected), len(predicted)

    # Pair each expected test with the first unused prediction of the same test, in page order.
    unused = list(predicted)
    for test in expected:
        key = _name_key(test["name"])
        match = next((p for p in unused if _name_key(p.name, p.catalog_key) == key), None)
        if match is None:
            score.missed.append(key)
            continue
        unused.remove(match)
        score.found += 1
        if _same_value(test["value"], match.value):
            score.value_ok += 1
        else:
            score.wrong_value.append(key)
        score.unit_ok += _same_unit(test.get("unit"), match.unit)
        if test["flag"] == match.flag:
            score.flag_ok += 1
        else:
            score.wrong_flag.append(key)

    expected_lab = _norm_text(label.get("lab_name"))
    score.lab_ok = bool(expected_lab) and expected_lab == _norm_text(lab_name)
    score.date_ok = label.get("report_date") is not None and label.get("report_date") == report_date
    return score


def _pct(part: int, whole: int) -> float | None:
    return round(100 * part / whole, 1) if whole else None


def summarize(scores: list[ReportScore]) -> dict:
    """Totals across reports. Only counts and test names: nothing that identifies a patient."""

    def block(group: list[ReportScore]) -> dict:
        expected = sum(s.expected for s in group)
        predicted = sum(s.predicted for s in group)
        found = sum(s.found for s in group)
        return {
            "reports": len(group),
            "values_on_reports": expected,
            "values_found_pct": _pct(found, expected),
            "values_invented_pct": _pct(predicted - found, predicted),
            "value_correct_pct": _pct(sum(s.value_ok for s in group), found),
            "unit_correct_pct": _pct(sum(s.unit_ok for s in group), found),
            "flag_correct_pct": _pct(sum(s.flag_ok for s in group), found),
            "lab_name_correct_pct": _pct(sum(s.lab_ok for s in group), len(group)),
            "date_correct_pct": _pct(sum(s.date_ok for s in group), len(group)),
        }

    by_source = sorted({s.source for s in scores})
    return {
        "overall": block(scores),
        "by_source": {source: block([s for s in scores if s.source == source]) for source in by_source},
        "most_missed": Counter(name for s in scores for name in s.missed).most_common(5),
        "most_misread": Counter(name for s in scores for name in s.wrong_value).most_common(5),
        "most_misflagged": Counter(name for s in scores for name in s.wrong_flag).most_common(5),
    }
