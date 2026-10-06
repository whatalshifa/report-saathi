"""The background job: read a stored report, extract its values, flag them, save.

Upload returns straight away and this runs afterwards, so the user never waits
on a spinning request. At deployment the same function is run by a worker
pulling jobs from SQS instead of by FastAPI's background tasks.
"""

import logging
from datetime import date

from sqlalchemy.orm import Session, sessionmaker

from app.models import Report, ReportStatus, TestResult
from app.services.catalog import TestDef, conversion_factor, match_test
from app.services.extraction import ExtractedReport, ExtractedTest, ExtractionError, Extractor
from app.services.flagging import compute_flag, parse_value, resolve_range
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
    catalog_test = match_test(test.name, test.catalog_key)
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


def build_results(extracted: ExtractedReport) -> list[TestResult]:
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
            lab_flag=_clip(test.lab_flag, 20),
            flag=compute_flag(value, test.value_text, low, high, test.reference_text),
        )
        standardize(result, test)
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
            extracted = extractor.extract(storage.read(report.storage_key), report.content_type)
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

        report.lab_name = _clip(extracted.lab_name, 255)
        report.patient_name = _clip(extracted.patient_name, 255)
        report.patient_age = _clip(extracted.patient_age, 50)
        report.patient_sex = _clip(extracted.patient_sex, 20)
        report.report_date = _parse_date(extracted.report_date)
        report.results = build_results(extracted)
        report.status, report.error = ReportStatus.done, None
        session.commit()
