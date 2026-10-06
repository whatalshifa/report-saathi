"""One-click demo accounts, the limits that keep them cheap, and sign-in rate limits."""

from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select

from app.api.auth import Limiters, get_limiters
from app.config import Settings, get_settings
from app.main import app
from app.models import Report, User
from app.services.guests import GUEST_DOMAIN, purge_expired_guests
from tests.conftest import PASSWORD, upload


@pytest.fixture
def visitor(client):
    """A browser that isn't signed in."""
    client.post("/api/auth/logout")
    return client


def start_demo(client, ip="203.0.113.7"):
    return client.post("/api/auth/demo", headers={"X-Forwarded-For": f"{ip}, 10.0.0.1"})


def test_demo_signs_in_to_an_account_with_the_samples(visitor):
    response = start_demo(visitor)
    assert response.status_code == 201
    user = response.json()
    assert user["is_guest"] is True
    assert user["name"] == "Guest"
    assert user["email"].endswith(GUEST_DOMAIN)

    assert visitor.get("/api/auth/me").json()["id"] == user["id"]
    profiles = visitor.get("/api/profiles").json()
    assert [(p["name"], p["is_sample"], p["report_count"]) for p in profiles] == [("Meera Joshi", True, 3)]


def test_demo_session_ends_with_the_demo(visitor):
    response = start_demo(visitor)
    cookie = response.headers["set-cookie"]
    assert "Max-Age=86400" in cookie
    assert "HttpOnly" in cookie


def test_each_demo_is_a_separate_account(visitor):
    first = start_demo(visitor).json()["id"]
    second = start_demo(visitor).json()["id"]
    assert first != second


def test_real_accounts_are_not_guests(client):
    assert client.get("/api/auth/me").json()["is_guest"] is False


def test_one_address_can_start_only_a_few_demos(visitor):
    for _ in range(get_settings().demo_per_ip_per_hour):
        assert start_demo(visitor).status_code == 201
    assert start_demo(visitor).status_code == 429
    # Someone else is unaffected.
    assert start_demo(visitor, ip="198.51.100.4").status_code == 201


def test_total_demos_are_capped(visitor):
    limiters = Limiters(Settings(demo_per_hour=2))
    app.dependency_overrides[get_limiters] = lambda: limiters
    assert start_demo(visitor, ip="198.51.100.1").status_code == 201
    assert start_demo(visitor, ip="198.51.100.2").status_code == 201
    response = start_demo(visitor, ip="198.51.100.3")
    assert response.status_code == 429
    assert "busy" in response.json()["detail"]


def test_old_demos_are_deleted_with_their_files(visitor, session_factory, storage, tmp_path):
    start_demo(visitor)
    with session_factory() as session:
        guest = session.scalar(select(User).where(User.is_guest))
        keys = [r.storage_key for p in guest.profiles for r in p.reports]
        assert all(storage.read(k) for k in keys)

        # Not yet a day old: kept.
        assert purge_expired_guests(session, storage, hours=24) == 0
        guest.created_at = datetime.now(UTC) - timedelta(hours=25)
        session.commit()
        assert purge_expired_guests(session, storage, hours=24) == 1

        assert session.scalar(select(User).where(User.is_guest)) is None
        assert session.scalar(select(Report.id)) is None
    for key in keys:
        assert not (tmp_path / "uploads" / key).exists()


def test_purge_leaves_real_accounts_alone(client, session_factory, storage):
    with session_factory() as session:
        user = session.scalar(select(User))
        user.created_at = datetime.now(UTC) - timedelta(days=400)
        session.commit()
        assert purge_expired_guests(session, storage, hours=24) == 0
    assert client.get("/api/auth/me").status_code == 200


def test_starting_a_demo_tidies_up_expired_ones(visitor, session_factory):
    start_demo(visitor)
    with session_factory() as session:
        old = session.scalar(select(User).where(User.is_guest))
        old.created_at = datetime.now(UTC) - timedelta(days=2)
        session.commit()
    start_demo(visitor)
    with session_factory() as session:
        assert len(session.scalars(select(User).where(User.is_guest)).all()) == 1


def test_demo_accounts_can_read_only_a_few_reports(visitor):
    start_demo(visitor)
    profile_id = visitor.get("/api/profiles").json()[0]["id"]
    for _ in range(get_settings().guest_upload_limit):
        assert upload(visitor, profile_id=profile_id).status_code == 202
    response = upload(visitor, profile_id=profile_id)
    assert response.status_code == 403
    assert "Create a free account" in response.json()["detail"]


def test_accounts_have_a_daily_reading_limit(client):
    app.dependency_overrides[get_settings] = lambda: Settings(daily_upload_limit=2)
    try:
        assert upload(client).status_code == 202
        assert upload(client).status_code == 202
        response = upload(client)
        assert response.status_code == 429
        assert "tomorrow" in response.json()["detail"]
    finally:
        app.dependency_overrides.pop(get_settings, None)


def test_sign_in_attempts_are_rate_limited_per_address(visitor):
    limit = get_settings().auth_per_ip_per_10min
    # An unknown email, so no account lockout gets in the way of counting.
    wrong = {"email": "nobody@example.com", "password": "wrong password!"}
    right = {"email": "asha@example.com", "password": PASSWORD}
    for _ in range(limit):
        assert (
            visitor.post(
                "/api/auth/login", json=wrong, headers={"X-Forwarded-For": "203.0.113.9"}
            ).status_code
            == 401
        )
    assert (
        visitor.post("/api/auth/login", json=right, headers={"X-Forwarded-For": "203.0.113.9"}).status_code
        == 429
    )
    assert (
        visitor.post("/api/auth/login", json=right, headers={"X-Forwarded-For": "198.51.100.9"}).status_code
        == 200
    )
