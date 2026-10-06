"""Demo mode: sample reports that work with no Anthropic key, and AI features switched off cleanly."""

import pytest

from app.config import Settings, get_settings
from app.main import app
from app.services.samples import sample_data
from tests.conftest import upload


@pytest.fixture
def no_key(client):
    """The server as deployed without an Anthropic key."""
    app.dependency_overrides[get_settings] = lambda: Settings(ANTHROPIC_API_KEY="")
    yield client
    app.dependency_overrides.pop(get_settings, None)


def test_features_say_whether_reading_is_on(client):
    assert client.get("/api/features").json() == {"reading": True}
    app.dependency_overrides[get_settings] = lambda: Settings(ANTHROPIC_API_KEY="  ")
    assert client.get("/api/features").json() == {"reading": False}


def test_samples_add_a_finished_example_person(client):
    response = client.post("/api/samples")
    assert response.status_code == 200
    profile = response.json()
    assert profile["is_sample"] is True
    assert profile["report_count"] == 3
    assert profile["last_report_date"] == "2026-09-08"

    reports = client.get("/api/reports", params={"profile_id": profile["id"]}).json()
    assert {r["status"] for r in reports} == {"done"}
    assert {r["lab_name"] for r in reports} == {"Sample Pathology Lab, Pune", "Demo Diagnostics Centre, Pune"}

    # Adding them again changes nothing.
    assert client.post("/api/samples").json()["id"] == profile["id"]
    assert len(client.get("/api/profiles").json()) == 2


def test_sample_values_are_flagged_by_the_app_not_the_data(client):
    """Flags come from the same code as real uploads, and agree with what each lab printed."""
    profile_id = client.post("/api/samples").json()["id"]
    for summary in client.get("/api/reports", params={"profile_id": profile_id}).json():
        report = client.get(f"/api/reports/{summary['id']}").json()
        for result in report["results"]:
            printed = (result["lab_flag"] or "").lower()
            expected = "low" if printed.startswith("l") else "high" if printed.startswith("h") else "normal"
            assert result["flag"] == expected, result["name"]


def test_every_sample_test_lines_up_across_labs(client):
    """Each test has a standard key and unit, so the timeline joins the two labs' reports."""
    profile_id = client.post("/api/samples").json()["id"]
    trends = client.get(f"/api/profiles/{profile_id}/trends").json()
    hemoglobin = next(s for s in trends["series"] if s["key"] == "hemoglobin")
    assert [p["value"] for p in hemoglobin["points"]] == [10.6, 11.4, 12.4]
    keys = {t["catalog_key"] for r in sample_data()["reports"] for t in r["reading"]["tests"]}
    assert keys <= {s["key"] for s in trends["series"]}


def test_samples_work_without_a_key(no_key):
    profile_id = no_key.post("/api/samples").json()["id"]
    reports = no_key.get("/api/reports", params={"profile_id": profile_id}).json()
    january = next(r for r in reports if r["report_date"] == "2026-01-12")

    summaries = {}
    for language in ("en", "hi", "mr"):
        response = no_key.post(f"/api/reports/{january['id']}/explanations", json={"language": language})
        assert response.json()["status"] == "done"
        summaries[language] = response.json()["content"]["summary"]
    assert summaries["en"].isascii()
    assert all("\u0900" <= ch <= "\u097f" for ch in summaries["mr"].split()[0])  # Devanagari

    brief = no_key.post(f"/api/profiles/{profile_id}/briefs").json()
    assert brief["status"] == "done"
    assert brief["content"]["snapshot"]["profile"]["report_count"] == 3


def test_without_a_key_new_ai_work_is_refused_plainly(no_key, writer):
    response = upload(no_key)
    assert response.status_code == 503
    assert "switched off" in response.json()["detail"]

    profile_id = no_key.post("/api/samples").json()["id"]
    april = next(
        r
        for r in no_key.get("/api/reports", params={"profile_id": profile_id}).json()
        if r["report_date"] == "2026-04-20"
    )
    response = no_key.post(f"/api/reports/{april['id']}/explanations", json={"language": "en"})
    assert response.status_code == 503
    assert no_key.post(f"/api/profiles/{no_key.profile_id}/briefs").status_code in (404, 503)
    assert writer.explained == []


def test_deleting_samples_removes_them_like_any_profile(client):
    profile_id = client.post("/api/samples").json()["id"]
    assert client.delete(f"/api/profiles/{profile_id}").status_code == 204
    assert [p["is_sample"] for p in client.get("/api/profiles").json()] == [False]
    # And they can be added back.
    assert client.post("/api/samples").json()["report_count"] == 3


def test_samples_are_private_to_each_account(client):
    profile_id = client.post("/api/samples").json()["id"]
    client.post("/api/auth/logout")
    client.post(
        "/api/auth/signup",
        json={"name": "Ravi", "email": "ravi@example.com", "password": "another long password"},
    )
    assert client.get(f"/api/profiles/{profile_id}/trends").status_code == 404


def test_ai_clients_start_without_a_key(monkeypatch):
    """The server must boot (as a demo) with no key; only an actual AI call reports it."""
    from app.services import claude
    from app.services.claude import AIError
    from app.services.extraction import ClaudeExtractor
    from app.services.writing import ClaudeWriter

    monkeypatch.setattr(claude, "get_settings", lambda: Settings(ANTHROPIC_API_KEY=""))
    extractor, writer = ClaudeExtractor(), ClaudeWriter()
    with pytest.raises(AIError, match="switched off"):
        extractor.extract(b"%PDF", "application/pdf")
    with pytest.raises(AIError, match="switched off"):
        writer.client  # noqa: B018
