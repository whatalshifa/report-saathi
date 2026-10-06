"""Fixing a misread value: re-flagging, the log, privacy, and the export for the accuracy kit."""

import json
import sys

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from accuracy import run
from accuracy.corrections import export_corrections
from app.main import app
from app.models import Correction, TestResult
from tests.conftest import FakeExtractor, make_test, sample_report, signup, upload


def january(client) -> dict:
    """Meera's January report, where haemoglobin was printed as 10.6 (Low)."""
    profile_id = client.post("/api/samples").json()["id"]
    reports = client.get("/api/reports", params={"profile_id": profile_id}).json()
    report_id = next(r["id"] for r in reports if r["report_date"] == "2026-01-12")
    return client.get(f"/api/reports/{report_id}").json()


def result_named(report: dict, name: str) -> dict:
    return next(r for r in report["results"] if r["name"] == name)


def fix(client, report: dict, result: dict, **body):
    return client.patch(f"/api/reports/{report['id']}/results/{result['id']}", json=body)


def log_rows(session_factory) -> list[Correction]:
    with session_factory() as session:
        return list(session.scalars(select(Correction).order_by(Correction.id)))


@pytest.fixture
def other_user(client):
    """A second account in another browser, sharing the test database with `client`."""
    with TestClient(app) as other:
        assert signup(other, email="ravi@example.com", name="Ravi").status_code == 201
        yield other


def test_a_fix_reflags_the_value_and_moves_the_timeline(client):
    report = january(client)
    hb = result_named(report, "Haemoglobin (Hb)")
    assert (hb["value_text"], hb["flag"], hb["corrected"]) == ("10.6", "low", False)
    assert report["out_of_range"] == 10

    response = fix(client, report, hb, value_text="13")
    assert response.status_code == 200
    fixed = response.json()
    assert (fixed["value_text"], fixed["value"], fixed["unit"], fixed["flag"]) == ("13", 13, "g/dL", "normal")
    assert fixed["corrected"] is True and fixed["corrected_at"]
    assert (fixed["original_value_text"], fixed["original_unit"]) == ("10.6", "g/dL")

    # The report and the timeline both follow the fix.
    again = client.get(f"/api/reports/{report['id']}").json()
    assert result_named(again, "Haemoglobin (Hb)") == fixed
    assert again["out_of_range"] == 9
    trends = client.get(f"/api/profiles/{report['profile_id']}/trends").json()
    hemoglobin = next(s for s in trends["series"] if s["key"] == "hemoglobin")
    assert [p["value"] for p in hemoglobin["points"]] == [13, 11.4, 12.4]
    assert (hemoglobin["points"][0]["flag"], hemoglobin["points"][0]["printed"]) == ("normal", "13 g/dL")


def test_every_fix_is_logged_and_the_first_reading_kept(client, session_factory):
    report = january(client)
    hb = result_named(report, "Haemoglobin (Hb)")
    fix(client, report, hb, value_text="1.36")  # a typo in the fix
    second = fix(client, report, hb, value_text="13.6").json()
    assert second["original_value_text"] == "10.6"  # still the AI's reading, not the typo

    user_id = client.get("/api/auth/me").json()["id"]
    rows = log_rows(session_factory)
    assert [(r.old_value_text, r.old_value, r.new_value_text, r.new_value) for r in rows] == [
        ("10.6", 10.6, "1.36", 1.36),
        ("1.36", 1.36, "13.6", 13.6),
    ]
    assert {(r.result_id, r.user_id, r.old_unit, r.new_unit) for r in rows} == {
        (hb["id"], user_id, "g/dL", "g/dL")
    }
    assert all(r.created_at for r in rows)


def test_putting_the_reading_back_undoes_the_fix(client, session_factory):
    report = january(client)
    hb = result_named(report, "Haemoglobin (Hb)")
    fix(client, report, hb, value_text="13")
    back = fix(client, report, hb, value_text=" 10.6 ").json()
    assert (back["value_text"], back["flag"], back["corrected"]) == ("10.6", "low", False)
    assert back["original_value_text"] is None
    assert len(log_rows(session_factory)) == 2

    # Saving the same value again changes and logs nothing.
    assert fix(client, report, hb, value_text="10.6").json() == back
    assert len(log_rows(session_factory)) == 2


@pytest.mark.parametrize(
    "extractor",
    [FakeExtractor(sample_report(tests=[make_test("Haemoglobin", "128", "g/dL", "120 - 160")]))],
)
def test_a_unit_fix_converts_the_value_for_the_timeline(client, session_factory):
    """The lab printed g/L, but it was read as g/dL: 128 g/dL would wreck the timeline."""
    report = client.get(f"/api/reports/{upload(client).json()['id']}").json()
    hb = report["results"][0]

    fixed = fix(client, report, hb, value_text="128", unit=" g/L ").json()
    assert (fixed["value_text"], fixed["unit"], fixed["flag"]) == ("128", "g/L", "normal")
    assert (fixed["original_value_text"], fixed["original_unit"]) == ("128", "g/dL")
    with session_factory() as session:
        stored = session.get(TestResult, hb["id"])
        assert (stored.std_value, stored.std_low, stored.std_high) == (12.8, 12, 16)
    series = client.get(f"/api/profiles/{client.profile_id}/trends").json()["series"][0]
    assert (series["points"][0]["value"], series["ref_low"], series["ref_high"]) == (12.8, 12, 16)

    # Leaving the unit out keeps it; sending null (or nothing typed) clears it.
    assert fix(client, report, hb, value_text="130").json()["unit"] == "g/L"
    assert fix(client, report, hb, value_text="130", unit=None).json()["unit"] is None
    assert len(log_rows(session_factory)) == 3


def test_word_results_can_be_fixed(client):
    report = client.get(f"/api/reports/{upload(client).json()['id']}").json()
    sugar = result_named(report, "Urine Sugar")
    assert sugar["flag"] == "abnormal"
    fixed = fix(client, report, sugar, value_text="Negative").json()
    assert (fixed["value_text"], fixed["value"], fixed["flag"]) == ("Negative", None, "normal")
    assert client.get(f"/api/reports/{report['id']}").json()["out_of_range"] == 2


@pytest.mark.parametrize(
    ("body", "message"),
    [
        ({"value_text": "   "}, "Enter the value as it is printed"),
        ({"value_text": "thirteen"}, "Enter a number"),
        ({"value_text": "1" * 256}, "too long"),
        ({"value_text": "13", "unit": "grams"}, "We don't recognise “grams” as a unit for Haemoglobin"),
        ({"value_text": "13", "unit": "g" * 51}, "unit is too long"),
    ],
)
def test_unusable_fixes_are_refused_plainly(client, session_factory, body, message):
    report = january(client)
    hb = result_named(report, "Haemoglobin (Hb)")
    response = fix(client, report, hb, **body)
    assert response.status_code == 422
    assert message in response.json()["detail"]

    assert result_named(client.get(f"/api/reports/{report['id']}").json(), "Haemoglobin (Hb)") == hb
    assert log_rows(session_factory) == []


def test_a_fix_needs_a_value(client):
    report = january(client)
    assert fix(client, report, report["results"][0], unit="g/dL").status_code == 422


def test_only_the_owner_can_fix_a_value(client, other_user, session_factory):
    report = january(client)
    hb = result_named(report, "Haemoglobin (Hb)")

    # Ravi gets "not found" for Asha's value, the same as for ids that don't exist.
    response = fix(other_user, report, hb, value_text="13")
    assert (response.status_code, response.json()["detail"]) == (404, "Report not found")

    # Nor can he reach it through his own report: a value only answers under its own report.
    ravi_report = january(other_user)
    response = fix(other_user, ravi_report, hb, value_text="13")
    assert (response.status_code, response.json()["detail"]) == (404, "Result not found")
    assert fix(client, report, {"id": 999999}, value_text="13").status_code == 404

    assert result_named(client.get(f"/api/reports/{report['id']}").json(), "Haemoglobin (Hb)") == hb
    assert log_rows(session_factory) == []


def test_deleting_the_report_deletes_its_fixes(client, session_factory):
    report = january(client)
    fix(client, report, result_named(report, "Haemoglobin (Hb)"), value_text="13")
    assert client.delete(f"/api/reports/{report['id']}").status_code == 204
    with session_factory() as session:
        assert session.scalar(select(func.count(Correction.id))) == 0


def test_fixes_export_as_accuracy_cases_without_personal_details(
    client, session_factory, tmp_path, monkeypatch
):
    report = client.get(f"/api/reports/{upload(client).json()['id']}").json()
    fix(client, report, result_named(report, "Haemoglobin"), value_text="12.1")
    fix(client, report, result_named(report, "Haemoglobin"), value_text="12.2")  # one case, last fix wins
    fix(client, report, result_named(report, "Urine Sugar"), value_text="Negative")
    # The same number written another way is not a misreading, so it is not a case.
    fix(client, report, result_named(report, "Platelet Count"), value_text="250000")
    # Nor is a change to the hand-typed sample reports.
    meera = january(client)
    fix(client, meera, result_named(meera, "Haemoglobin (Hb)"), value_text="13")

    expected = [
        {
            "test": "Haemoglobin",
            "printed_value": "11.2",
            "printed_unit": "g/dL",
            "corrected_value": "12.2",
            "corrected_unit": "g/dL",
        },
        {
            "test": "Urine Sugar",
            "printed_value": "Positive (+)",
            "printed_unit": None,
            "corrected_value": "Negative",
            "corrected_unit": None,
        },
    ]
    with session_factory() as session:
        assert export_corrections(session) == expected

    out = tmp_path / "out" / "corrections.json"
    monkeypatch.setattr(run, "SessionLocal", session_factory)
    monkeypatch.setattr(sys, "argv", ["run", "corrections", "--out", str(out)])
    run.main()
    exported = out.read_text()
    assert json.loads(exported)["cases"] == expected
    for private in ("Asha", "A. Sharma", "City Diagnostics", "2026-09-12", report["id"], client.profile_id):
        assert private not in exported
