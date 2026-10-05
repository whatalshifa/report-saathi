import pytest

from app.models import Flag
from app.services.flagging import compute_flag, parse_range, parse_value, resolve_range


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("13.5", 13.5),
        ("2,50,000", 250000),
        ("6.2 H", 6.2),
        ("<0.5", 0.5),
        ("> 1000", 1000),
        ("45 mg/dL", 45),
        ("Positive", None),
        ("Positive (+)", None),
        ("", None),
    ],
)
def test_parse_value(text, expected):
    assert parse_value(text) == expected


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("13.0 - 17.0", (13.0, 17.0)),
        ("13–17 g/dL", (13.0, 17.0)),
        ("0.4 to 4.0", (0.4, 4.0)),
        ("1,50,000 - 4,50,000", (150000, 450000)),
        ("< 200", (None, 200)),
        ("Up to 40", (None, 40)),
        ("upto 5.0", (None, 5.0)),
        ("> 40", (40, None)),
        ("≥ 60", (60, None)),
        ("Normal range: 70-100", (70, 100)),
        ("Male: 13-17", (13, 17)),
        ("Desirable: <200; Borderline: 200-239; High: >=240", None),
        ("Male: 13-17 Female: 12-15", None),
        ("Negative", None),
        ("17 - 13", None),
        (None, None),
    ],
)
def test_parse_range(text, expected):
    assert parse_range(text) == expected


def test_resolve_range_falls_back_to_model_reading_for_tiered_ranges():
    assert resolve_range("Desirable: <200; Borderline: 200-239", None, 200) == (None, 200)
    assert resolve_range("13 - 17", 99, 99) == (13, 17)


@pytest.mark.parametrize(
    ("value", "low", "high", "expected"),
    [
        (11.2, 13, 17, Flag.low),
        (18, 13, 17, Flag.high),
        (13, 13, 17, Flag.normal),  # bounds are inclusive
        (17, 13, 17, Flag.normal),
        (250, None, 200, Flag.high),
        (30, 40, None, Flag.low),
        (5, None, None, Flag.unknown),
    ],
)
def test_compute_flag_numeric(value, low, high, expected):
    assert compute_flag(value, str(value), low, high, None) == expected


@pytest.mark.parametrize(
    ("value_text", "reference", "expected"),
    [
        ("Negative", "Negative", Flag.normal),
        ("Nil", "Absent", Flag.normal),
        ("Positive (+)", "Negative", Flag.abnormal),
        ("Reactive", "Non Reactive", Flag.abnormal),
        ("Yellow", None, Flag.unknown),
        ("A+", "Rh typing", Flag.unknown),
    ],
)
def test_compute_flag_words(value_text, reference, expected):
    assert compute_flag(None, value_text, None, None, reference) == expected
