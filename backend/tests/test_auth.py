"""Accounts, sessions and keeping each account's data private."""

import hashlib

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.main import app
from app.models import AuthSession, Report, User
from app.services.auth import COOKIE_NAME
from tests.conftest import PASSWORD, signup, upload


@pytest.fixture
def anon(client):
    """A second browser with nobody signed in (shares the test database with `client`)."""
    with TestClient(app) as other:
        yield other


@pytest.fixture
def other_user(anon):
    assert signup(anon, email="ravi@example.com", name="Ravi").status_code == 201
    return anon


def login(client, email="asha@example.com", password=PASSWORD):
    return client.post("/api/auth/login", json={"email": email, "password": password})


def test_signup_creates_account_profile_and_session(client):
    me = client.get("/api/auth/me").json()
    assert (me["name"], me["email"]) == ("Asha Patel", "asha@example.com")
    profiles = client.get("/api/profiles").json()
    assert [(p["name"], p["relation"]) for p in profiles] == [("Asha Patel", "self")]


def test_session_cookie_is_locked_down(anon):
    response = signup(anon, email="New.User@Example.com ")
    cookie = response.headers["set-cookie"]
    assert "HttpOnly" in cookie and "SameSite=lax" in cookie and "Path=/" in cookie
    assert response.json()["email"] == "new.user@example.com"


def test_database_never_holds_the_password_or_token(client, session_factory):
    token = client.cookies[COOKIE_NAME]
    with session_factory() as session:
        user = session.scalar(select(User))
        assert user.password_hash.startswith("$argon2id$")
        assert PASSWORD not in user.password_hash
        stored = session.scalar(select(AuthSession.token_hash))
    assert stored == hashlib.sha256(token.encode()).hexdigest() != token


@pytest.mark.parametrize(
    ("body", "status"),
    [
        ({"name": "A", "email": "asha@example.com", "password": PASSWORD}, 409),  # already registered
        ({"name": "A", "email": "not-an-email", "password": PASSWORD}, 422),
        ({"name": "A", "email": "b@example.com", "password": "short"}, 422),
        ({"name": " ", "email": "b@example.com", "password": PASSWORD}, 422),
    ],
)
def test_signup_validation(client, body, status):
    assert client.post("/api/auth/signup", json=body).status_code == status


def test_login_and_logout(anon, client):
    assert anon.get("/api/auth/me").status_code == 401
    assert login(anon, password="wrong password").status_code == 401
    assert login(anon, email="nobody@example.com").json()["detail"] == "Wrong email or password"

    assert login(anon, email="ASHA@example.com").status_code == 200
    token = anon.cookies[COOKIE_NAME]
    assert anon.get("/api/auth/me").status_code == 200

    assert anon.post("/api/auth/logout").status_code == 204
    # The old token no longer works, even if someone copied it.
    anon.cookies.set(COOKIE_NAME, token)
    assert anon.get("/api/auth/me").status_code == 401


def test_too_many_wrong_passwords_lock_the_account(anon, client):
    for _ in range(5):
        assert login(anon, password="wrong password").status_code == 401
    locked = login(anon)
    assert locked.status_code == 401
    assert "Too many" in locked.json()["detail"]


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("get", "/api/reports"),
        ("get", "/api/reports/x"),
        ("delete", "/api/reports/x"),
        ("get", "/api/profiles"),
        ("get", "/api/profiles/x/trends"),
        ("post", "/api/profiles/x/briefs"),
        ("get", "/api/briefs/x"),
        ("delete", "/api/auth/me"),
    ],
)
def test_everything_needs_sign_in(anon, method, path):
    assert getattr(anon, method)(path).status_code == 401


def test_accounts_cannot_see_each_others_data(client, other_user):
    report_id = upload(client).json()["id"]
    profile_id = client.profile_id
    brief_id = client.post(f"/api/profiles/{profile_id}/briefs").json()["id"]
    client.post(f"/api/reports/{report_id}/explanations", json={"language": "en"})

    # Ravi gets "not found" for everything of Asha's, the same as for ids that don't exist.
    assert other_user.get("/api/reports").json() == []
    assert other_user.get(f"/api/reports/{report_id}").status_code == 404
    assert other_user.delete(f"/api/reports/{report_id}").status_code == 404
    assert other_user.get(f"/api/reports/{report_id}/explanations/en").status_code == 404
    assert other_user.post(f"/api/reports/{report_id}/explanations", json={}).status_code == 404
    assert other_user.get(f"/api/profiles/{profile_id}/trends").status_code == 404
    assert other_user.post(f"/api/profiles/{profile_id}/briefs").status_code == 404
    assert other_user.delete(f"/api/profiles/{profile_id}").status_code == 404
    assert other_user.get(f"/api/briefs/{brief_id}").status_code == 404

    # Nor can Ravi upload into Asha's profile, or move his report into it.
    assert upload(other_user, profile_id=profile_id).status_code == 404
    ravi_profile = other_user.get("/api/profiles").json()[0]["id"]
    ravi_report = upload(other_user, profile_id=ravi_profile).json()["id"]
    move = other_user.patch(f"/api/reports/{ravi_report}", json={"profile_id": profile_id})
    assert move.status_code == 404

    assert client.get(f"/api/reports/{report_id}").status_code == 200


def test_deleting_the_account_deletes_everything(client, storage, session_factory):
    report_id = upload(client).json()["id"]
    assert (storage.inner.root / f"{report_id}.pdf").exists()

    assert client.delete("/api/auth/me").status_code == 204
    assert not (storage.inner.root / f"{report_id}.pdf").exists()
    assert client.get("/api/auth/me").status_code == 401
    with session_factory() as session:
        assert session.scalars(select(User)).all() == []
        assert session.scalars(select(Report)).all() == []
