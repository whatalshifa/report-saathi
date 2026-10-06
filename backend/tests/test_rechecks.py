"""Due for a recheck: out-of-range latest readings older than the usual recheck interval."""

from datetime import date

import pytest

from app.models import Flag, Profile, User
from app.services.samples import add_sample_profile
from app.services.trends import add_months, build_trends
from tests.conftest import FakeExtractor, make_test, sample_report, upload


def test_add_months():
    assert add_months(date(2026, 1, 12), 3) == date(2026, 4, 12)
    assert add_months(date(2026, 1, 31), 1) == date(2026, 2, 28)
    assert add_months(date(2026, 11, 20), 1.5) == date(2027, 1, 4)
    assert add_months(date(2026, 9, 8), 6) == date(2027, 3, 8)


REPORTS = [
    sample_report(
        report_date="2026-01-12",
        tests=[
            make_test("HbA1c", "6.1", "%", "4.0 - 5.6"),
            make_test("TSH", "5.8", "uIU/mL", "0.4 - 4.5"),
            make_test("Vitamin D", "14", "ng/mL", "30 - 100"),  # no usual recheck interval in the catalog
            make_test("LDL Cholesterol", "142", "mg/dL", "< 100"),
        ],
    ),
    sample_report(
        report_date="2026-04-20",
        tests=[
            make_test("TSH", "3.1", "uIU/mL", "0.4 - 4.5"),  # back in range: no reminder
            make_test("LDL Cholesterol", "128", "mg/dL", "< 100"),
        ],
    ),
]


@pytest.fixture
def extractor():
    return FakeExtractor(*REPORTS)


def test_rechecks_list_out_of_range_latest_readings_older_than_their_interval(client, session_factory):
    for _ in REPORTS:
        assert upload(client).status_code == 202

    with session_factory() as session:
        profile = session.get(Profile, client.profile_id)
        due = build_trends(session, profile, today=date(2026, 7, 1)).rechecks
        # HbA1c from 12 Jan (3 months) is due; LDL's latest reading, 20 Apr, isn't due until 20 Jul.
        assert [(d.key, d.flag, d.last_date, d.months) for d in due] == [
            ("hba1c", Flag.high, date(2026, 1, 12), 3)
        ]
        assert "ADA" in due[0].source
        assert [d.key for d in build_trends(session, profile, today=date(2026, 7, 20)).rechecks] == [
            "hba1c",
            "ldl",
        ]
        assert build_trends(session, profile, today=date(2026, 4, 11)).rechecks == []

    # The API uses today's date, which is well after July 2026.
    trends = client.get(f"/api/profiles/{client.profile_id}/trends").json()
    assert [(d["key"], d["last_date"], d["flag"]) for d in trends["rechecks"]] == [
        ("hba1c", "2026-01-12", "high"),
        ("ldl", "2026-04-20", "high"),
    ]


def test_meera_is_due_an_ldl_recheck_three_months_after_her_last_report(session_factory, storage):
    with session_factory() as session:
        user = User(email="demo@example.com", name="Demo", password_hash="x")
        session.add(user)
        profile = add_sample_profile(session, user, storage)
        # Her last report (8 Sep 2026) still shows LDL high; everything else is back in range.
        assert build_trends(session, profile, today=date(2026, 12, 7)).rechecks == []
        due = build_trends(session, profile, today=date(2026, 12, 8)).rechecks
        assert [(d.key, d.last_date, d.months) for d in due] == [("ldl", date(2026, 9, 8), 3)]

        # The ready-made brief keeps the numbers and their LOINC codes, not the family's reminders.
        snapshot = profile.briefs[0].content["snapshot"]
        assert "rechecks" not in snapshot
        assert {s["key"]: s["loinc"] for s in snapshot["series"]}["ldl"] == "2089-1"
