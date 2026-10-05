"""Turn one profile's reports into a timeline per test.

All the numbers here are computed by code from the database, never by the AI:
the charts, the change since last time, and the doctor brief's table all come
from build_trends().
"""

from collections import defaultdict
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Flag, Profile, Report, ReportStatus
from app.schemas import TimelineSummary, TrendPoint, Trends, TrendSeries
from app.services.catalog import CATALOG_KEYS, get_test

_ORDER = {key: i for i, key in enumerate(CATALOG_KEYS)}
_OUT_OF_RANGE = (Flag.low, Flag.high, Flag.abnormal)


def _report_day(report: Report) -> date:
    return report.report_date or report.created_at.date()


def done_reports(session: Session, profile_id: str) -> list[Report]:
    query = (
        select(Report)
        .where(Report.profile_id == profile_id, Report.status == ReportStatus.done)
        .options(selectinload(Report.results))
    )
    return sorted(session.scalars(query), key=lambda r: (_report_day(r), r.created_at))


def _summary(profile: Profile, reports: list[Report]) -> TimelineSummary:
    latest = reports[-1]
    return TimelineSummary(
        profile_id=profile.id,
        name=profile.name,
        relation=profile.relation,
        age=latest.patient_age,
        sex=latest.patient_sex or profile.sex,
        report_count=len(reports),
        first_date=_report_day(reports[0]),
        last_date=_report_day(latest),
        labs=sorted({r.lab_name for r in reports if r.lab_name}),
    )


def build_trends(session: Session, profile: Profile) -> Trends | None:
    reports = done_reports(session, profile.id)
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
    return Trends(profile=_summary(profile, reports), series=series)
