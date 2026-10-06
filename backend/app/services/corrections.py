"""Fix a value the AI misread.

The person types what is printed on the paper. The number is parsed, flagged and
converted by the same plain-Python code as a fresh reading, so the flag, the
"needs attention" list and the timeline all follow the fix. Every fix is logged,
so it can become a test case for the accuracy kit (see accuracy/corrections.py).
"""

from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.models import Correction, TestResult, User
from app.services.catalog import conversion_factor, get_test, normalize_unit
from app.services.flagging import parse_value
from app.services.processing import convert_to_standard, reflag, use_typical_range


class CorrectionError(ValueError):
    """The fix can't be saved. The message is shown to the person as it is."""


def _check(result: TestResult, value_text: str, unit: str | None) -> float | None:
    if not value_text:
        raise CorrectionError("Enter the value as it is printed on the report.")
    if len(value_text) > 255:
        raise CorrectionError("That is too long for a test value.")
    if unit is not None and len(unit) > 50:
        raise CorrectionError("That unit is too long.")

    value = parse_value(value_text)
    # A printed number range means the lab expects a number here, so a word is most likely a typo.
    if value is None and result.range_source == "lab":
        raise CorrectionError("Enter a number, like 13.2. Signs such as < or > are fine.")

    # A unit we can't convert would quietly drop this value from the timeline, so say so instead.
    catalog_test = get_test(result.catalog_key)
    unit_changed = normalize_unit(unit or "") != normalize_unit(result.unit or "")
    if catalog_test and unit_changed and conversion_factor(catalog_test, unit) is None:
        raise CorrectionError(
            f"We don't recognise “{unit}” as a unit for {catalog_test.name}. Check it against the report."
        )
    return value


def correct_result(
    session: Session, result: TestResult, user: User, value_text: str, unit: str | None
) -> TestResult:
    """Save the person's fix, re-flag the value and log the change. Raises CorrectionError."""
    value_text = value_text.strip()
    unit = (unit or "").strip() or None
    value = _check(result, value_text, unit)
    if (value_text, unit) == (result.value_text, result.unit):
        return result  # nothing changed, nothing to log

    session.add(
        Correction(
            result_id=result.id,
            user_id=user.id,
            old_value_text=result.value_text,
            old_value=result.value,
            old_unit=result.unit,
            new_value_text=value_text,
            new_value=value,
            new_unit=unit,
        )
    )
    if result.corrected_at is None:
        result.original_value_text, result.original_unit = result.value_text, result.unit

    result.value_text, result.value, result.unit = value_text, value, unit
    catalog_test = get_test(result.catalog_key)
    if catalog_test is not None:
        convert_to_standard(result, catalog_test)
    # A typical range is kept in the printed unit, so a new unit (or a number for a word) picks it again.
    use_typical_range(result, result.report.profile.sex)
    reflag(result)

    # Putting back exactly what was read undoes the fix, so the "corrected" marker goes too.
    if (value_text, unit) == (result.original_value_text, result.original_unit):
        result.corrected_at = result.original_value_text = result.original_unit = None
    else:
        result.corrected_at = datetime.now(UTC)
    return result
