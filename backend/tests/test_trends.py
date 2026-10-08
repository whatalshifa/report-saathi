"""Trends, explanations and doctor briefs, end to end through the API."""

import pytest

from app.services.claude import AIError
from tests.conftest import FakeExtractor, FakeWriter, make_test, sample_report, upload


def lab_report(date, lab, name, tests):
    return sample_report(report_date=date, lab_name=lab, patient_name=name, tests=tests)


# Three reports for one person from three labs, each printing things its own way.
REPORTS = [
    lab_report(
        "2025-03-02",
        "Lab A",
        "Mr. Anil Sharma",
        [
            make_test("Haemoglobin (Hb)", "12.1", "g/dL", "13 - 17"),
            make_test("Platelet Count", "2.4", "Lakhs/cumm", "1.5 - 4.5"),
            make_test("Colour", "Pale yellow", None, None),
        ],
    ),
    lab_report(
        "2026-09-12",
        "Lab C",
        "ANIL SHARMA",
        [
            make_test("HGB", "112", "g/L", "130 - 170"),
            make_test("Fasting Sugar", "126", "mg/dL", "70 - 100", catalog_key="glucose_fasting"),
        ],
    ),
    lab_report(
        "2025-11-20",
        "Lab B",
        "Anil Sharma",
        [
            make_test("Hemoglobin", "11.8", "gm%", "13.0-17.0"),
            make_test("PLT", "260", "10^3/µL", "150 - 450"),
        ],
    ),
    lab_report("2026-01-05", "Lab A", "Sunita Devi", [make_test("Haemoglobin", "12.5", "g/dL", "12 - 15")]),
]


@pytest.fixture
def extractor():
    return FakeExtractor(*REPORTS)


@pytest.fixture
def papa(client):
    response = client.post("/api/profiles", json={"name": "Anil Sharma", "relation": "parent", "sex": "male"})
    assert response.status_code == 201
    return response.json()["id"]


@pytest.fixture
def uploaded(client, papa):
    # Anil's three reports go to his profile; Sunita's report is uploaded to the account's own profile.
    return [upload(client, profile_id=papa).json()["id"] for _ in REPORTS[:3]] + [upload(client).json()["id"]]


def test_profiles_list_their_reports(client, uploaded, papa):
    profiles = client.get("/api/profiles").json()
    assert [(p["name"], p["relation"], p["report_count"]) for p in profiles] == [
        ("Asha Patel", "self", 1),
        ("Anil Sharma", "parent", 3),
    ]
    assert profiles[1]["last_report_date"] == "2026-09-12"
    assert len(client.get(f"/api/reports?profile_id={papa}").json()) == 3

    summary = client.get(f"/api/profiles/{papa}/trends").json()["profile"]
    assert (summary["first_date"], summary["last_date"]) == ("2025-03-02", "2026-09-12")
    assert summary["labs"] == ["Lab A", "Lab B", "Lab C"]


def test_trends_line_up_values_across_labs_and_units(client, uploaded, papa):
    trends = client.get(f"/api/profiles/{papa}/trends").json()
    series = {s["key"]: s for s in trends["series"]}
    assert set(series) == {"hemoglobin", "platelets", "glucose_fasting"}  # "Colour" isn't in the catalog

    hb = series["hemoglobin"]
    assert [p["date"] for p in hb["points"]] == ["2025-03-02", "2025-11-20", "2026-09-12"]
    assert [p["value"] for p in hb["points"]] == pytest.approx([12.1, 11.8, 11.2])
    assert [p["printed"] for p in hb["points"]] == ["12.1 g/dL", "11.8 gm%", "112 g/L"]
    assert (hb["unit"], hb["ref_low"], hb["ref_high"]) == ("g/dL", 13, 17)
    assert hb["latest_flag"] == "low"
    assert hb["change"] == pytest.approx(-0.6)
    assert hb["change_pct"] == pytest.approx(-5.1)

    platelets = series["platelets"]
    assert [p["value"] for p in platelets["points"]] == [240000, 260000]
    assert platelets["latest_flag"] == "normal"

    sugar = series["glucose_fasting"]
    assert sugar["change"] is None  # one reading only

    # Out-of-range tests come first.
    assert [s["key"] for s in trends["series"]][:2] == ["hemoglobin", "glucose_fasting"]


def test_trends_for_unknown_profile_is_404(client, uploaded):
    assert client.get("/api/profiles/nobody/trends").status_code == 404


def test_explanation_is_written_once_per_language(client, uploaded, writer):
    report_id = uploaded[0]
    response = client.post(f"/api/reports/{report_id}/explanations", json={"language": "hi"})
    assert response.status_code == 202

    explanation = client.get(f"/api/reports/{report_id}/explanations/hi").json()
    assert explanation["status"] == "done"
    assert explanation["content"]["summary"] == "Summary in hi"

    # Asking again returns the saved one instead of calling the AI again.
    client.post(f"/api/reports/{report_id}/explanations", json={"language": "hi"})
    client.post(f"/api/reports/{report_id}/explanations", json={"language": "mr"})
    assert writer.explained == [(report_id, "hi"), (report_id, "mr")]

    assert client.get(f"/api/reports/{report_id}/explanations/en").status_code == 404
    assert client.post(f"/api/reports/{report_id}/explanations", json={"language": "fr"}).status_code == 422


def test_an_explanation_written_before_a_fix_can_be_written_again(client, uploaded, writer):
    report_id = uploaded[0]
    explanations = f"/api/reports/{report_id}/explanations"
    client.post(explanations, json={"language": "en"})
    first = client.get(f"{explanations}/en").json()

    # The haemoglobin was misread; once fixed, the old explanation may describe the wrong value.
    hb = client.get(f"/api/reports/{report_id}").json()["results"][0]
    fixed = client.patch(f"/api/reports/{report_id}/results/{hb['id']}", json={"value_text": "16.1"}).json()
    assert client.post(explanations, json={"language": "en"}).status_code == 202
    again = client.get(f"{explanations}/en").json()
    assert (again["id"], again["status"]) == (first["id"], "done")
    assert again["created_at"] > fixed["corrected_at"]
    assert writer.explained == [(report_id, "en")] * 2

    # Now it is up to date, so asking again returns it.
    client.post(explanations, json={"language": "en"})
    assert len(writer.explained) == 2


@pytest.mark.parametrize("writer", [FakeWriter(AIError("The AI service is busy"))])
def test_failed_explanation_can_be_retried(client, uploaded, writer):
    report_id = uploaded[0]
    client.post(f"/api/reports/{report_id}/explanations", json={"language": "en"})
    failed = client.get(f"/api/reports/{report_id}/explanations/en").json()
    assert (failed["status"], failed["error"]) == ("failed", "The AI service is busy")

    writer.error = None
    client.post(f"/api/reports/{report_id}/explanations", json={"language": "en"})
    assert client.get(f"/api/reports/{report_id}/explanations/en").json()["status"] == "done"


def test_explanations_are_deleted_with_their_report(client, uploaded):
    report_id = uploaded[0]
    client.post(f"/api/reports/{report_id}/explanations", json={"language": "en"})
    client.delete(f"/api/reports/{report_id}")
    assert client.get(f"/api/reports/{report_id}/explanations/en").status_code == 404


def test_doctor_brief_keeps_the_numbers_it_was_written_from(client, uploaded, writer, papa):
    response = client.post(f"/api/profiles/{papa}/briefs")
    assert response.status_code == 202

    brief = client.get(f"/api/briefs/{response.json()['id']}").json()
    assert brief["status"] == "done"
    assert brief["content"]["brief"]["overview"] == "Haemoglobin is falling."
    snapshot = brief["content"]["snapshot"]
    assert snapshot["profile"]["report_count"] == 3
    assert snapshot["series"][0]["key"] == "hemoglobin"
    assert writer.briefed[0].profile.profile_id == papa

    assert client.post("/api/profiles/nobody/briefs").status_code == 404
    assert client.get("/api/briefs/missing").status_code == 404
