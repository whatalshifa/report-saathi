"""Turn one profile's reports into a timeline per test.

All the numbers here are computed by code from the database, never by the AI:
the charts, the change since last time, and the doctor brief's table all come
from build_trends().
"""

import calendar
from collections import defaultdict
from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Flag, Profile, Report, ReportStatus
from app.schemas import RecheckDue, TimelineSummary, TrendPoint, Trends, TrendSeries
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


def add_months(day: date, months: float) -> date:
    """`day` plus a number of months; a half month counts as 15 days. 31 Jan + 1 month is 28 Feb."""
    whole = int(months)
    month_index = day.month - 1 + whole
    year, month = day.year + month_index // 12, month_index % 12 + 1
    moved = day.replace(year=year, month=month, day=min(day.day, calendar.monthrange(year, month)[1]))
    return moved + timedelta(days=round((months - whole) * 30))


def due_rechecks(series: list[TrendSeries], today: date) -> list[RecheckDue]:
    """Tests whose latest reading is out of range and older than the catalog's usual recheck interval.

    Only the latest reading counts: once a newer report shows the test again, the reminder goes.
    Dates are the reports' own dates, not when they were uploaded.
    """
    due = []
    for s in series:
        test = get_test(s.key)
        latest = s.points[-1]
        if test.recheck_months is None or latest.flag not in _OUT_OF_RANGE:
            continue
        if add_months(latest.date, test.recheck_months) <= today:
            due.append(
                RecheckDue(
                    key=s.key,
                    name=s.name,
                    flag=latest.flag,
                    last_date=latest.date,
                    months=test.recheck_months,
                    source=test.recheck_source,
                )
            )
    # The longest overdue first.
    return sorted(due, key=lambda d: (d.last_date, _ORDER[d.key]))


def build_trends(session: Session, profile: Profile, today: date | None = None) -> Trends | None:
    reports = done_reports(session, profile.id)
    if not reports:
        return None

    points: dict[str, list[TrendPoint]] = defaultdict(list)
    ranges: dict[str, tuple[float | None, float | None]] = {}
    typical_ranges: dict[str, tuple[float | None, float | None]] = {}
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
            # A typical range is only a fallback for when no lab printed one.
            if result.std_low is not None or result.std_high is not None:
                seen = typical_ranges if result.range_source == "typical" else ranges
                seen[result.catalog_key] = (result.std_low, result.std_high)

    series = []
    for catalog_key, series_points in points.items():
        test = get_test(catalog_key)
        latest = series_points[-1]
        previous = series_points[-2] if len(series_points) > 1 else None
        if catalog_key in ranges:
            (low, high), range_source = ranges[catalog_key], "lab"
        elif catalog_key in typical_ranges:
            (low, high), range_source = typical_ranges[catalog_key], "typical"
        else:
            (low, high), range_source = (None, None), None
        series.append(
            TrendSeries(
                key=catalog_key,
                name=test.name,
                unit=test.unit,
                loinc=test.loinc,
                ref_low=low,
                ref_high=high,
                range_source=range_source,
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
    rechecks = due_rechecks(series, today or date.today())
    return Trends(profile=_summary(profile, reports), series=series, rechecks=rechecks)
