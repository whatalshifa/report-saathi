"""Data rights under the DPDP Act 2023: download everything, and consent before the first upload."""

import csv
import io
import json
import os
import sqlite3
import subprocess
import sys
import zipfile
from datetime import UTC, datetime
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, update

from app.main import app
from app.models import Report, User
from app.services.consent import CONSENT_VERSION
from app.services.export import CSV_HEADER, _cell, safe_name
from tests.conftest import PDF_BYTES, agree, signup, upload

BACKEND = Path(__file__).parent.parent


@pytest.fixture
def stranger(client):
    """A second browser, with nobody signed in yet (shares the test database with `client`)."""
    with TestClient(app) as other:
        yield other


def export(client) -> zipfile.ZipFile:
    response = client.get("/api/auth/me/export")
    assert response.status_code == 200, response.text
    return zipfile.ZipFile(io.BytesIO(response.content))


def read_csv(archive: zipfile.ZipFile) -> list[list[str]]:
    return list(csv.reader(io.StringIO(archive.read("results.csv").decode("utf-8-sig"))))


# ---------- Download all my data ----------


def test_export_holds_the_files_the_data_and_a_csv_of_every_value(client):
    upload(client)
    client.post("/api/samples")

    response = client.get("/api/auth/me/export")
    assert response.status_code == 200
    today = datetime.now(UTC).date().isoformat()
    assert response.headers["content-type"] == "application/zip"
    assert (
        response.headers["content-disposition"] == f'attachment; filename="reportsaathi-export-{today}.zip"'
    )
    assert response.headers["cache-control"] == "private, no-store"
    assert int(response.headers["content-length"]) == len(response.content)

    archive = zipfile.ZipFile(io.BytesIO(response.content))
    names = archive.namelist()
    # The original, decrypted, named by person and the report's date.
    assert archive.read("reports/Asha-Patel/2026-09-12.pdf") == PDF_BYTES
    meera_files = [n for n in names if n.startswith("reports/Meera-Joshi/")]
    assert len(meera_files) == 3 and all(n.endswith(".png") for n in meera_files)
    assert all(archive.read(n).startswith(b"\x89PNG") for n in meera_files)
    assert {"reportsaathi-data.json", "results.csv", "README.txt"} <= set(names)

    data = json.loads(archive.read("reportsaathi-data.json"))
    assert data["account"]["email"] == "asha@example.com"
    assert data["account"]["consent_version"] == CONSENT_VERSION
    asha, meera = data["people"]
    assert (asha["name"], meera["name"], meera["is_sample"]) == ("Asha Patel", "Meera Joshi", True)
    report = asha["reports"][0]
    assert report["file"] == "reports/Asha-Patel/2026-09-12.pdf"
    assert report["lab"] == "City Diagnostics"
    assert [r["test"] for r in report["results"]][:2] == ["Haemoglobin", "Platelet Count"]
    assert report["results"][0]["flag"] == "low"
    # Meera's ready-made explanations and brief come along too.
    assert {e["language"] for e in meera["reports"][0]["explanations"]} >= {"en"}
    assert all(r["file"] in names for r in meera["reports"])
    # Nothing secret is in it.
    text = archive.read("reportsaathi-data.json").decode()
    assert "password" not in text and "token" not in text

    rows = read_csv(archive)
    assert rows[0] == CSV_HEADER
    values = sum(len(r["results"]) for person in data["people"] for r in person["reports"])
    assert len(rows) == 1 + values
    assert [
        "Asha Patel",
        "2026-09-12",
        "City Diagnostics",
        "Haemoglobin",
        "11.2",
        "g/dL",
        "13.0 - 17.0",
        "Low",
    ] in rows
    assert [
        "Asha Patel",
        "2026-09-12",
        "City Diagnostics",
        "Urine Sugar",
        "Positive (+)",
        "",
        "Negative",
        "Abnormal",
    ] in rows
    assert all(row[0] == "Meera Joshi" for row in rows[5:])


def test_export_includes_every_fix(client):
    report = client.get(f"/api/reports/{upload(client).json()['id']}").json()
    hb = report["results"][0]
    assert (
        client.patch(
            f"/api/reports/{report['id']}/results/{hb['id']}", json={"value_text": "12.1"}
        ).status_code
        == 200
    )

    archive = export(client)
    result = json.loads(archive.read("reportsaathi-data.json"))["people"][0]["reports"][0]["results"][0]
    assert result["value_text"] == "12.1"
    assert result["first_read_as"] == {"value_text": "11.2", "unit": "g/dL"}
    assert [(c["from_value"], c["to_value"]) for c in result["corrections"]] == [("11.2", "12.1")]
    assert [
        "Asha Patel",
        "2026-09-12",
        "City Diagnostics",
        "Haemoglobin",
        "12.1",
        "g/dL",
        "13.0 - 17.0",
        "Low",
    ] in read_csv(archive)


def test_export_has_only_your_own_data(client, stranger):
    upload(client)
    assert stranger.get("/api/auth/me/export").status_code == 401

    assert signup(stranger, email="ravi@example.com", name="Ravi").status_code == 201
    archive = export(stranger)
    assert not any(n.startswith("reports/") for n in archive.namelist())
    data = json.loads(archive.read("reportsaathi-data.json"))
    assert data["account"]["email"] == "ravi@example.com"
    assert [p["name"] for p in data["people"]] == ["Ravi"]
    assert data["people"][0]["reports"] == []
    assert read_csv(archive) == [CSV_HEADER]


def test_two_reports_on_one_day_both_keep_their_file(client):
    upload(client)
    upload(client)
    names = export(client).namelist()
    assert "reports/Asha-Patel/2026-09-12.pdf" in names
    assert "reports/Asha-Patel/2026-09-12-2.pdf" in names


def test_a_missing_file_does_not_stop_the_export(client, storage, session_factory):
    upload(client)
    with session_factory() as session:
        storage.delete(session.scalar(select(Report.storage_key)))
    archive = export(client)
    data = json.loads(archive.read("reportsaathi-data.json"))
    assert data["people"][0]["reports"][0]["file"] is None
    assert len(read_csv(archive)) == 5


def test_demo_accounts_can_download_their_data_too(stranger):
    assert stranger.post("/api/auth/demo").status_code == 201
    archive = export(stranger)
    data = json.loads(archive.read("reportsaathi-data.json"))
    assert data["account"]["is_demo_account"] is True
    assert data["account"]["email"] is None  # the made-up guest address means nothing to anyone
    assert len([n for n in archive.namelist() if n.startswith("reports/Meera-Joshi/")]) == 3


def test_export_is_rate_limited_per_account(client, stranger):
    for _ in range(5):
        assert client.get("/api/auth/me/export").status_code == 200
    response = client.get("/api/auth/me/export")
    assert response.status_code == 429
    assert "try again later" in response.json()["detail"]
    # Someone else on the same address is not held up.
    signup(stranger, email="ravi@example.com", name="Ravi")
    assert stranger.get("/api/auth/me/export").status_code == 200


def test_spreadsheet_formulas_are_neutralised():
    assert _cell('=HYPERLINK("x")') == '\'=HYPERLINK("x")'
    assert _cell("+91") == "'+91"
    assert _cell("@SUM(A1)") == "'@SUM(A1)"
    assert _cell("-cmd") == "'-cmd"
    assert _cell("-1.5") == "-1.5"
    assert _cell("11.2") == "11.2"
    assert _cell(None) == ""


def test_folder_names_keep_indian_scripts_and_drop_unsafe_characters():
    assert safe_name("मीरा जोशी", "person") == "मीरा-जोशी"
    assert safe_name("../Papa: 2/3", "person") == "Papa-23"
    assert safe_name("...", "person") == "person"


# ---------- Consent before the first upload ----------


def test_upload_waits_for_consent(stranger):
    signup(stranger, email="ravi@example.com", name="Ravi")
    me = stranger.get("/api/auth/me").json()
    assert (me["needs_consent"], me["consent_version"], me["consented_at"]) == (True, None, None)

    profile_id = stranger.get("/api/profiles").json()[0]["id"]
    response = upload(stranger, profile_id=profile_id)
    assert response.status_code == 428
    assert "agree" in response.json()["detail"]
    assert stranger.get("/api/reports").json() == []

    me = agree(stranger).json()
    assert me["needs_consent"] is False
    assert me["consent_version"] == CONSENT_VERSION
    assert me["consented_at"] is not None
    assert stranger.get("/api/auth/me").json()["needs_consent"] is False
    assert upload(stranger, profile_id=profile_id).status_code == 202


def test_consent_to_an_old_notice_is_refused(client):
    response = client.post("/api/auth/me/consent", json={"version": "2020-01-01"})
    assert response.status_code == 409
    assert "updated" in response.json()["detail"]


def test_people_are_asked_again_when_the_notice_changes(client, session_factory):
    assert upload(client).status_code == 202
    with session_factory() as session:
        session.execute(update(User).values(consent_version="2025-01-01"))
        session.commit()
    assert client.get("/api/auth/me").json()["needs_consent"] is True
    assert upload(client).status_code == 428
    agree(client)
    assert upload(client).status_code == 202


def test_consent_needs_sign_in(stranger):
    assert stranger.post("/api/auth/me/consent", json={"version": CONSENT_VERSION}).status_code == 401


def test_demo_guests_need_no_consent_to_look_around(stranger):
    assert stranger.post("/api/auth/demo").status_code == 201
    assert stranger.get("/api/auth/me").json()["needs_consent"] is True
    # The sample person and everything about them works without it.
    meera = stranger.get("/api/profiles").json()[0]
    reports = stranger.get("/api/reports", params={"profile_id": meera["id"]}).json()
    assert len(reports) == 3
    assert stranger.get(f"/api/reports/{reports[0]['id']}/file").status_code == 200


# ---------- Migration ----------


def _alembic(db: Path, *args: str) -> None:
    env = {**os.environ, "RS_DATABASE_URL": f"sqlite:///{db}"}
    subprocess.run(
        [sys.executable, "-m", "alembic", *args], cwd=BACKEND, env=env, check=True, capture_output=True
    )


def _user_columns(db: Path) -> set[str]:
    with sqlite3.connect(db) as conn:
        return {row[1] for row in conn.execute("PRAGMA table_info(users)")}


def test_migration_adds_consent_and_existing_accounts_are_asked_later(tmp_path):
    db = tmp_path / "migrate.db"
    _alembic(db, "upgrade", "0008")
    with sqlite3.connect(db) as conn:
        conn.execute(
            "INSERT INTO users (id, email, name, password_hash, failed_logins, is_guest, created_at) "
            "VALUES ('u1', 'old@example.com', 'Old', 'x', 0, 0, '2026-01-01 00:00:00')"
        )
    _alembic(db, "upgrade", "head")
    assert {"consent_version", "consented_at"} <= _user_columns(db)
    with sqlite3.connect(db) as conn:
        assert conn.execute("SELECT email, consent_version, consented_at FROM users").fetchall() == [
            ("old@example.com", None, None)
        ]

    _alembic(db, "downgrade", "0008")
    assert not {"consent_version", "consented_at"} & _user_columns(db)
    with sqlite3.connect(db) as conn:
        assert conn.execute("SELECT email FROM users").fetchall() == [("old@example.com",)]
