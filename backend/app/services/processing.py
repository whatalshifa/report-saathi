"""The background job: read a stored report, extract its values, flag them, save.

Upload returns straight away and this runs afterwards, so the user never waits
on a spinning request. At deployment the same function is run by a worker
pulling jobs from SQS instead of by FastAPI's background tasks.
"""

import logging
import re
from datetime import date

from sqlalchemy.orm import Session, sessionmaker

from app.models import Profile, Relation, Report, ReportStatus, TestResult
from app.services.catalog import (
    TestDef,
    conversion_factor,
    get_test,
    loose_match,
    match_test,
    needs_unit,
    typical_range,
)
from app.services.extraction import ExtractedReport, ExtractedTest, ExtractionError, Extractor
from app.services.flagging import compute_flag, parse_value, resolve_range
from app.services.pdf_text import add_pdf_boxes
from app.services.storage import Storage

log = logging.getLogger(__name__)

GENERIC_ERROR = "Something went wrong while reading this report."


def _parse_date(text: str | None) -> date | None:
    try:
        return date.fromisoformat(text) if text else None
    except ValueError:
        return None


def _clip(text: str | None, length: int) -> str | None:
    return text[:length] if text else text


def _scale(value: float | None, factor: float | None) -> float | None:
    return None if value is None or factor is None else round(value * factor, 4)


def standardize(result: TestResult, test: ExtractedTest) -> None:
    """Fill in the catalog key and the value in the standard unit, when we know them."""
    catalog_test = match_test(test.name, test.catalog_key, test.section)
    if catalog_test is None:
        return
    result.catalog_key = catalog_test.key
    convert_to_standard(result, catalog_test)


def convert_to_standard(result: TestResult, catalog_test: TestDef) -> None:
    """The value and range in the catalog's standard unit (None when the unit is unknown)."""
    factor = conversion_factor(catalog_test, result.unit)
    result.std_value = _scale(result.value, factor)
    result.std_low = _scale(result.ref_low, factor)
    result.std_high = _scale(result.ref_high, factor)


def _unscale(value: float | None, factor: float) -> float | None:
    return None if value is None else round(value / factor, 4)


ADULT_AGE = 18


def _years_old(patient_age: str | None) -> int | None:
    """The age printed on a report in whole years ("45 Y", "45 Yrs/F"); 0 for "8 months"."""
    text = (patient_age or "").lower()
    if re.search(r"\d\s*(mo|mos|mon|mons|months?|days?|wks?|weeks?)\b", text) and not re.search(
        r"\d\s*(y|yrs?|years?)\b", text
    ):
        return 0
    match = re.match(r"\s*(\d{1,3})\b", text)
    return int(match.group(1)) if match else None


def adult_ranges_fit(profile: Profile, report: Report) -> bool:
    """Whether the catalog's typical ranges, all adult ones, fit this person on this report.

    A child's normal ALP, creatinine or haemoglobin is outside the adult range, so with any doubt
    about a child no typical range is used. The profile's birth year counts first, then the age
    printed on the report, then whether the profile is a child's.
    """
    if profile.birth_year is not None:
        # Born late in the year, they may still be a year younger on the report's day.
        return (report.report_date or date.today()).year - profile.birth_year - 1 >= ADULT_AGE
    age = _years_old(report.patient_age)
    if age is not None:
        return age >= ADULT_AGE
    return profile.relation != Relation.child


def _can_judge(result: TestResult, test: TestDef) -> bool:
    """Whether a typical range can be trusted for this value, with no printed range to check it by."""
    return (
        result.value is not None
        # "2.5" platelets may be lakhs, "7.2" WBC thousands: with no unit the scale is a guess.
        and (bool((result.unit or "").strip()) or not needs_unit(test))
        # The lab marked it H or L against a range we didn't read: its mark wins, not ours.
        and not (result.lab_flag or "").strip()
        and not loose_match(result.name)
    )


def use_typical_range(result: TestResult, sex: str | None, adult: bool = True) -> None:
    """When the lab printed no range, fall back to the catalog's typical adult range, or to none.

    Never touches a range the lab printed (or any printed reference text we couldn't parse).
    The typical range is kept in the report's own unit like a printed one, so the flag, a later
    fix and the timeline all work the same; range_source = "typical" is what labels it.
    `sex` is the profile's and `adult` is adult_ranges_fit(); call this again when either changes.
    """
    if result.range_source == "lab" or (result.reference_text or "").strip():
        return
    result.ref_low = result.ref_high = result.range_source = None
    test = get_test(result.catalog_key)
    if test is not None and adult and _can_judge(result, test):
        typical = typical_range(test, sex)
        factor = conversion_factor(test, result.unit)
        if typical is not None and factor:
            result.ref_low, result.ref_high = _unscale(typical.low, factor), _unscale(typical.high, factor)
            result.range_source = "typical"
    if test is not None:
        convert_to_standard(result, test)


def reflag(result: TestResult) -> None:
    result.flag = compute_flag(
        result.value, result.value_text, result.ref_low, result.ref_high, result.reference_text
    )


def refresh_typical_ranges(report: Report) -> None:
    """Re-pick typical ranges after the person's sex or age changes, or the report moves to someone else."""
    adult = adult_ranges_fit(report.profile, report)
    for result in report.results:
        if result.range_source != "lab":
            use_typical_range(result, report.profile.sex, adult)
            reflag(result)


def build_results(
    extracted: ExtractedReport, sex: str | None = None, typical: bool = True
) -> list[TestResult]:
    """The report's values, flagged. `sex` is the profile's, so a value whose lab printed no range
    can be judged against a typical range for that person. `typical` is False for a child, and for
    the accuracy kit, which scores only what the lab printed."""
    results = []
    for position, test in enumerate(extracted.tests):
        value = parse_value(test.value_text)
        if value is None:
            value = test.numeric_value
        low, high = resolve_range(test.reference_text, test.ref_low, test.ref_high)
        result = TestResult(
            position=position,
            section=_clip(test.section, 255),
            name=_clip(test.name, 255),
            value_text=_clip(test.value_text, 255),
            value=value,
            unit=_clip(test.unit, 50),
            reference_text=_clip(test.reference_text, 255),
            ref_low=low,
            ref_high=high,
            range_source="lab" if low is not None or high is not None else None,
            lab_flag=_clip(test.lab_flag, 20),
            box=test.box.model_dump() if test.box else None,
        )
        standardize(result, test)
        use_typical_range(result, sex, typical)
        reflag(result)
        results.append(result)
    return results


def process_report(
    report_id: str, session_factory: sessionmaker[Session], storage: Storage, extractor: Extractor
) -> None:
    with session_factory() as session:
        report = session.get(Report, report_id)
        if report is None:
            return
        report.status = ReportStatus.processing
        session.commit()

        try:
            data = storage.read(report.storage_key)
            extracted = extractor.extract(data, report.content_type)
            if not extracted.is_lab_report:
                raise ExtractionError("This file does not look like a lab report.")
            if not extracted.tests:
                raise ExtractionError("No test values could be read from this file.")
        except ExtractionError as exc:
            report.status, report.error = ReportStatus.failed, str(exc)
            session.commit()
            return
        except Exception:
            log.exception("Unexpected failure processing report %s", report_id)
            report.status, report.error = ReportStatus.failed, GENERIC_ERROR
            session.commit()
            return

        if report.content_type == "application/pdf":
            # Exact boxes from the PDF's own text where it has some; Claude's estimates otherwise.
            add_pdf_boxes(data, extracted.tests)
        report.lab_name = _clip(extracted.lab_name, 255)
        report.patient_name = _clip(extracted.patient_name, 255)
        report.patient_age = _clip(extracted.patient_age, 50)
        report.patient_sex = _clip(extracted.patient_sex, 20)
        report.report_date = _parse_date(extracted.report_date)
        report.results = build_results(
            extracted, report.profile.sex, adult_ranges_fit(report.profile, report)
        )
        report.status, report.error = ReportStatus.done, None
        session.commit()
