"""Turn one person's reports into a timeline per test.

All the numbers here are computed by code from the database, never by the AI:
the charts, the change since last time, and the doctor brief's table all come
from build_trends().
"""

from collections import defaultdict
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Flag, Report, ReportStatus
from app.schemas import PersonSummary, TrendPoint, Trends, TrendSeries
from app.services.catalog import CATALOG_KEYS, get_test
from app.services.people import UNKNOWN_PERSON

_ORDER = {key: i for i, key in enumerate(CATALOG_KEYS)}
_OUT_OF_RANGE = (Flag.low, Flag.high, Flag.abnormal)


def _report_day(report: Report) -> date:
    return report.report_date or report.created_at.date()


def _display_name(key: str, reports: list[Report]) -> str:
    if key == UNKNOWN_PERSON:
        return "Name not on report"
    return next((r.patient_name for r in reversed(reports) if r.patient_name), key.title())


def _done_reports(session: Session, key: str | None = None) -> list[Report]:
    query = select(Report).where(Report.status == ReportStatus.done).options(selectinload(Report.results))
    if key is not None:
        query = query.where(Report.person_key == key)
    return sorted(session.scalars(query), key=lambda r: (_report_day(r), r.created_at))


def _summary(key: str, reports: list[Report]) -> PersonSummary:
    latest = reports[-1]
    return PersonSummary(
        key=key,
        name=_display_name(key, reports),
        age=latest.patient_age,
        sex=latest.patient_sex,
        report_count=len(reports),
        first_date=_report_day(reports[0]),
        last_date=_report_day(latest),
        labs=sorted({r.lab_name for r in reports if r.lab_name}),
    )


def list_people(session: Session) -> list[PersonSummary]:
    groups: dict[str, list[Report]] = defaultdict(list)
    for report in _done_reports(session):
        groups[report.person_key or UNKNOWN_PERSON].append(report)
    people = [_summary(key, reports) for key, reports in groups.items()]
    return sorted(people, key=lambda p: p.last_date, reverse=True)


def build_trends(session: Session, key: str) -> Trends | None:
    reports = _done_reports(session, key)
    if not reports:
        return None

    points: dict[str, list[TrendPoint]] = defaultdict(list)
    ranges: dict[str, tuple[float | None, float | None]] = {}
    for report in reports:
        for result in report.results:
            if result.catalog_key is None or result.std_value is None:
                continue
            points[result.catalog_key].append(
                TrendPoint(
                    date=_report_day(report),
                    value=result.std_value,
                    flag=result.flag,
                    report_id=report.id,
                    lab_name=report.lab_name,
                    printed=f"{result.value_text} {result.unit or ''}".strip(),
                )
            )
            # Reports are in date order, so the last range seen is the latest lab's range.
            if result.std_low is not None or result.std_high is not None:
                ranges[result.catalog_key] = (result.std_low, result.std_high)

    series = []
    for catalog_key, series_points in points.items():
        test = get_test(catalog_key)
        latest = series_points[-1]
        previous = series_points[-2] if len(series_points) > 1 else None
        low, high = ranges.get(catalog_key, (None, None))
        series.append(
            TrendSeries(
                key=catalog_key,
                name=test.name,
                unit=test.unit,
                ref_low=low,
                ref_high=high,
                points=series_points,
                latest_flag=latest.flag,
                change=round(latest.value - previous.value, 4) if previous else None,
                change_pct=round((latest.value - previous.value) / previous.value * 100, 1)
                if previous and previous.value
                else None,
            )
        )

    # Values outside the range first, then tests with the longest history.
    series.sort(key=lambda s: (s.latest_flag not in _OUT_OF_RANGE, -len(s.points), _ORDER[s.key]))
    return Trends(person=_summary(key, reports), series=series)
