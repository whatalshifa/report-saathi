"""Demo mode: a ready-made example person, so the app can be tried without uploading anything.

The sample reports are made up (no real patient), and were transcribed in advance
into the same shape Claude returns. They go through the same flagging and unit
code as a real upload, so what the visitor sees is exactly what the app does;
only the reading step is skipped. Some explanations and the doctor brief are
written in advance too, so the site works even with no Anthropic key.
"""

import json
from functools import cache
from pathlib import Path

from sqlalchemy.orm import Session

from app.models import Brief, Explanation, JobStatus, Profile, Relation, Report, ReportStatus, User
from app.services.extraction import ExtractedReport
from app.services.processing import _parse_date, build_results
from app.services.storage import Storage
from app.services.trends import build_trends

SAMPLE_FILE = Path(__file__).parent.parent / "samples" / "meera.json"

# Stored in place of a scanned file, so deleting a sample works like deleting any report.
PLACEHOLDER = b"Sample report: there is no scanned file. The values were entered in advance."


@cache
def sample_data() -> dict:
    return json.loads(SAMPLE_FILE.read_text(encoding="utf-8"))


def find_sample_profile(user: User) -> Profile | None:
    return next((p for p in user.profiles if p.is_sample), None)


def add_sample_profile(session: Session, user: User, storage: Storage) -> Profile:
    """Adds the example person and their reports to this account. Safe to call twice."""
    existing = find_sample_profile(user)
    if existing is not None:
        return existing

    data = sample_data()
    person = data["profile"]
    profile = Profile(
        user=user,
        name=person["name"],
        relation=Relation(person["relation"]),
        birth_year=person["birth_year"],
        sex=person["sex"],
        is_sample=True,
    )
    session.add(profile)

    for item in data["reports"]:
        reading = ExtractedReport.model_validate(item["reading"])
        report = Report(
            profile=profile,
            filename=item["filename"],
            content_type="text/plain",
            storage_key="",
            status=ReportStatus.done,
            lab_name=reading.lab_name,
            patient_name=reading.patient_name,
            patient_age=reading.patient_age,
            patient_sex=reading.patient_sex,
            report_date=_parse_date(reading.report_date),
            results=build_results(reading),
        )
        session.add(report)
        session.flush()  # gives the report its id
        report.storage_key = f"{report.id}.txt"
        storage.save(report.storage_key, PLACEHOLDER)
        for language, content in item["explanations"].items():
            session.add(
                Explanation(report_id=report.id, language=language, status=JobStatus.done, content=content)
            )

    session.flush()
    # The brief keeps the numbers it was written from, the same as a freshly written one.
    trends = build_trends(session, profile)
    snapshot = trends.model_dump(mode="json") if trends else None
    brief = Brief(
        profile_id=profile.id, status=JobStatus.done, content={"brief": data["brief"], "snapshot": snapshot}
    )
    session.add(brief)
    session.commit()
    return profile
