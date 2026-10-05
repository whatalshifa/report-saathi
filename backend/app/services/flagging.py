"""Decide whether each value is low, high or normal.

This is plain Python on purpose. The AI only *reads* the report; the comparison
against the reference range is done here, by code we can test, so a value is
never marked "normal" because a model guessed.
"""

import re

from app.models import Flag

_NUM = r"[-+]?\d+(?:\.\d+)?"

# Words labs print when a qualitative test is fine.
_NORMAL_WORDS = {
    "negative",
    "neg",
    "nil",
    "absent",
    "not detected",
    "non reactive",
    "non-reactive",
    "nonreactive",
    "normal",
    "within normal limits",
    "clear",
    "pale yellow",
    "nad",
}


def _to_float(text: str) -> float:
    return float(text.replace(",", ""))


def parse_value(value_text: str) -> float | None:
    """Pull the number out of a printed value: "13.5", "1,250", "<0.5", "6.2 H"."""
    text = value_text.strip().replace(",", "")
    match = re.match(rf"^(?:[<>]=?|≤|≥)?\s*({_NUM})(?:\s*[a-zA-Z%/µ*^0-9.]*)?$", text)
    return _to_float(match.group(1)) if match else None


def parse_range(reference_text: str | None) -> tuple[float | None, float | None] | None:
    """Turn a printed reference range into (low, high). Either end may be open.

    Returns None when the text is not one simple range, for example tiered
    ranges like "Desirable <200, Borderline 200-239, High >240".
    """
    if not reference_text:
        return None
    text = reference_text.strip().lower().replace(",", "")
    text = text.replace("–", "-").replace("—", "-").replace("≤", "<=").replace("≥", ">=")

    # Tiered ranges contain more than one range; leave those to the model's reading.
    if len(re.findall(_NUM, text)) > 2 or text.count(":") > 1 or ";" in text:
        return None

    patterns: list[tuple[str, str]] = [
        (rf"^({_NUM})\s*(?:-|to)\s*({_NUM})\b", "both"),
        (rf"^(?:<=?|up\s*to|upto|less than|below|max\.?)\s*({_NUM})\b", "high"),
        (rf"^(?:>=?|more than|greater than|above|min\.?)\s*({_NUM})\b", "low"),
    ]
    # Strip a leading label such as "Adult:" or "Normal range".
    text = re.sub(r"^[a-z\s]*?(?::\s*|range\s+)", "", text) if re.match(r"^[a-z]", text) else text
    for pattern, kind in patterns:
        match = re.match(pattern, text)
        if not match:
            continue
        if kind == "both":
            low, high = _to_float(match.group(1)), _to_float(match.group(2))
            return (low, high) if low <= high else None
        if kind == "high":
            return (None, _to_float(match.group(1)))
        return (_to_float(match.group(1)), None)
    return None


def compute_flag(
    value: float | None,
    value_text: str,
    low: float | None,
    high: float | None,
    reference_text: str | None,
) -> Flag:
    if value is None:
        return _qualitative_flag(value_text, reference_text)
    if low is None and high is None:
        return Flag.unknown
    if low is not None and value < low:
        return Flag.low
    if high is not None and value > high:
        return Flag.high
    return Flag.normal


def _qualitative_flag(value_text: str, reference_text: str | None) -> Flag:
    value = value_text.strip().lower()
    expected = (reference_text or "").strip().lower()
    if not expected:
        return Flag.unknown
    if value == expected or (value in _NORMAL_WORDS and expected in _NORMAL_WORDS):
        return Flag.normal
    if expected in _NORMAL_WORDS:
        return Flag.abnormal
    return Flag.unknown


def resolve_range(
    reference_text: str | None, model_low: float | None, model_high: float | None
) -> tuple[float | None, float | None]:
    """Prefer our own parse of the printed range; fall back to the model's reading."""
    parsed = parse_range(reference_text)
    if parsed is not None:
        return parsed
    return model_low, model_high
