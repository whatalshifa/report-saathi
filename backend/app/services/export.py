"""Download all my data: one ZIP with everything an account holds, for the DPDP Act's right of access.

Inside:
  reports/<person>/<date>.<ext>  every original file, decrypted, named so a person can find them
  reportsaathi-data.json         the account, people, reports, every value (with fixes), explanations,
                                 doctor briefs and share links, for moving to another service
  results.csv                    one row per value, for opening in Excel or Google Sheets
  README.txt                     what each file is, in plain words

Nothing secret goes in: no password hash, no sign-in or share-link tokens (only their hashes are
kept anyway), no encryption keys.
"""

import csv
import io
import json
import logging
import re
import zipfile
from datetime import UTC, date, datetime
from typing import IO

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Correction, Flag, Profile, Report, ShareLink, ShareView, TestResult, User
from app.services.auth import as_utc
from app.services.storage import Storage

log = logging.getLogger(__name__)

FORMAT_VERSION = 1
DATA_FILE = "reportsaathi-data.json"
CSV_FILE = "results.csv"

CSV_HEADER = ["Person", "Date", "Lab", "Test", "Value", "Unit", "Normal range", "Flag"]
FLAG_WORDS = {
    Flag.low: "Low",
    Flag.high: "High",
    Flag.normal: "Normal",
    Flag.abnormal: "Abnormal",
    Flag.unknown: "No range",
}

README = """\
Your ReportSaathi data, downloaded on {day}.

reports/            The original report files you uploaded, in a folder for each person,
                    named by the report's date.
results.csv         Every value read from your reports, one per line. Opens in Excel or
                    Google Sheets.
reportsaathi-data.json
                    Everything in your account in one file (people, reports, values and any
                    you corrected, explanations, doctor briefs), for moving to another service.

Keep this file somewhere private: it holds your family's health information.
ReportSaathi explains lab reports. It is not medical advice; always ask your doctor.
"""

# Characters no file system accepts in a name, and control characters. Everything else (Hindi and
# Marathi names too) is kept, since zip names are UTF-8.
_UNSAFE = re.compile(r'[\\/:*?"<>|\x00-\x1f\x7f]+')


def safe_name(text: str, fallback: str) -> str:
    cleaned = _UNSAFE.sub("", text).strip(" .")
    return re.sub(r"\s+", "-", cleaned)[:60] or fallback


def _unique(name: str, taken: set[str], suffix: str = "") -> str:
    """name, or name-2, name-3... so two people (or two reports on one day) never overwrite each other."""
    candidate, n = name + suffix, 1
    while candidate.lower() in taken:
        n += 1
        candidate = f"{name}-{n}{suffix}"
    taken.add(candidate.lower())
    return candidate


def _time(moment: datetime | None) -> str | None:
    return as_utc(moment).isoformat() if moment else None


def _day(day: date | None) -> str | None:
    return day.isoformat() if day else None


def _cell(text: str | None) -> str:
    """A spreadsheet runs a cell starting with = + - @ as a formula. A report read by the AI could print
    one, so such text gets a leading apostrophe, which spreadsheets show as plain text. Plain numbers
    (a negative one too) are left alone."""
    text = text or ""
    if text[:1] in ("=", "+", "@", "\t", "\r") or (text.startswith("-") and not _is_number(text)):
        return "'" + text
    return text


def _is_number(text: str) -> bool:
    try:
        float(text)
    except ValueError:
        return False
    return True


def _normal_range(result: TestResult) -> str:
    if result.reference_text:
        return result.reference_text
    if result.ref_low is not None and result.ref_high is not None:
        return f"{result.ref_low:g} - {result.ref_high:g}"
    if result.ref_low is not None:
        return f">= {result.ref_low:g}"
    if result.ref_high is not None:
        return f"<= {result.ref_high:g}"
    return ""


def _report_order(report: Report) -> tuple:
    return (report.report_date or as_utc(report.created_at).date(), as_utc(report.created_at))


def _result_json(result: TestResult, corrections: list[Correction]) -> dict:
    return {
        "section": result.section,
        "test": result.name,
        "value_text": result.value_text,
        "value": result.value,
        "unit": result.unit,
        "normal_range": result.reference_text,
        "range_low": result.ref_low,
        "range_high": result.ref_high,
        "lab_flag": result.lab_flag,
        "flag": result.flag.value,
        "catalog_key": result.catalog_key,
        "standard_value": result.std_value,
        "standard_low": result.std_low,
        "standard_high": result.std_high,
        "where_on_page": result.box,
        "corrected_at": _time(result.corrected_at),
        "first_read_as": (
            {"value_text": result.original_value_text, "unit": result.original_unit}
            if result.corrected_at
            else None
        ),
        "corrections": [
            {
                "from_value": c.old_value_text,
                "from_unit": c.old_unit,
                "to_value": c.new_value_text,
                "to_unit": c.new_unit,
                "at": _time(c.created_at),
            }
            for c in corrections
        ],
    }


def write_export(session: Session, user: User, storage: Storage, out: IO[bytes]) -> None:
    """Writes the account's ZIP to `out`. A file that can't be read is noted in the JSON, not fatal."""
    now = datetime.now(UTC)
    profiles = list(
        session.scalars(select(Profile).where(Profile.user_id == user.id).order_by(Profile.created_at))
    )
    profile_ids = [p.id for p in profiles]

    # Fetched in one query each rather than per value or per link.
    corrections: dict[int, list[Correction]] = {}
    fixes = (
        select(Correction)
        .join(TestResult, Correction.result_id == TestResult.id)
        .join(Report, TestResult.report_id == Report.id)
        .where(Report.profile_id.in_(profile_ids))
        .order_by(Correction.created_at, Correction.id)
    )
    for fix in session.scalars(fixes):
        corrections.setdefault(fix.result_id, []).append(fix)
    links = list(
        session.scalars(
            select(ShareLink).where(ShareLink.profile_id.in_(profile_ids)).order_by(ShareLink.created_at)
        )
    )
    views: dict[str, list[datetime]] = {}
    for view in session.scalars(
        select(ShareView).where(ShareView.share_id.in_([link.id for link in links])).order_by(ShareView.id)
    ):
        views.setdefault(view.share_id, []).append(view.viewed_at)

    rows: list[list[str]] = []
    people: list[dict] = []
    folders: set[str] = set()

    with zipfile.ZipFile(out, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for profile in profiles:
            folder = _unique(safe_name(profile.name, "person"), folders)
            names: set[str] = set()
            reports_json = []
            for report in sorted(profile.reports, key=_report_order):
                day = report.report_date or as_utc(report.created_at).date()
                path = None
                if report.storage_key:
                    extension = report.storage_key.rpartition(".")[2]
                    path = f"reports/{folder}/{_unique(day.isoformat(), names, '.' + extension)}"
                    try:
                        data = storage.read(report.storage_key)
                    except Exception:
                        log.exception("Export: could not read the file for report %s", report.id)
                        path = None
                    else:
                        # Already compressed (PDF, JPEG, PNG): store as is rather than squeeze again.
                        archive.writestr(path, data, compress_type=zipfile.ZIP_STORED)

                for result in report.results:
                    rows.append(
                        [
                            _cell(profile.name),
                            _day(report.report_date) or "",
                            _cell(report.lab_name),
                            _cell(result.name),
                            _cell(result.value_text),
                            _cell(result.unit),
                            _cell(_normal_range(result)),
                            FLAG_WORDS[result.flag],
                        ]
                    )
                reports_json.append(
                    {
                        "file": path,
                        "uploaded_as": report.filename,
                        "file_type": report.content_type,
                        "is_sample": report.is_sample,
                        "status": report.status.value,
                        "lab": report.lab_name,
                        "name_on_report": report.patient_name,
                        "age_on_report": report.patient_age,
                        "sex_on_report": report.patient_sex,
                        "report_date": _day(report.report_date),
                        "uploaded_at": _time(report.created_at),
                        "results": [_result_json(r, corrections.get(r.id, [])) for r in report.results],
                        "explanations": [
                            {
                                "language": e.language,
                                "status": e.status.value,
                                "content": e.content,
                                "written_at": _time(e.created_at),
                            }
                            for e in sorted(report.explanations, key=lambda e: e.language)
                        ],
                    }
                )
            people.append(
                {
                    "name": profile.name,
                    "relation": profile.relation.value,
                    "birth_year": profile.birth_year,
                    "sex": profile.sex,
                    "is_sample": profile.is_sample,
                    "added_at": _time(profile.created_at),
                    "reports": reports_json,
                    "doctor_briefs": [
                        {"status": b.status.value, "content": b.content, "written_at": _time(b.created_at)}
                        for b in sorted(profile.briefs, key=lambda b: as_utc(b.created_at))
                    ],
                    "doctor_links": [
                        {
                            "made_at": _time(link.created_at),
                            "expires_at": _time(link.expires_at),
                            "turned_off_at": _time(link.revoked_at),
                            "opened_at": [_time(v) for v in views.get(link.id, [])],
                        }
                        for link in links
                        if link.profile_id == profile.id
                    ],
                }
            )

        data = {
            "format_version": FORMAT_VERSION,
            "exported_at": now.isoformat(),
            "account": {
                "name": user.name,
                "email": None if user.is_guest else user.email,
                "is_demo_account": user.is_guest,
                "created_at": _time(user.created_at),
                "consent_version": user.consent_version,
                "consented_at": _time(user.consented_at),
            },
            "people": people,
        }
        archive.writestr(DATA_FILE, json.dumps(data, ensure_ascii=False, indent=2))

        text = io.StringIO()
        writer = csv.writer(text)
        writer.writerow(CSV_HEADER)
        writer.writerows(rows)
        # With a byte-order mark, Excel reads the file as UTF-8, so Hindi names come out right.
        archive.writestr(CSV_FILE, "﻿" + text.getvalue())
        archive.writestr("README.txt", README.format(day=now.date().isoformat()))
