"""Doctor share links: hashed tokens, expiry, revoking, the opening log, and who may do what."""

import hashlib
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.api.auth import Limiters, get_limiters
from app.config import Settings, get_settings
from app.main import app
from app.models import Brief, JobStatus, ShareLink, ShareView
from tests.conftest import signup


@pytest.fixture
def doctor():
    """A separate browser with no account, as the doctor's phone would be."""
    return TestClient(app)


@pytest.fixture
def brief_id(client):
    """Meera's ready-made brief, the same one the demo shares."""
    profile_id = client.post("/api/samples").json()["id"]
    client.profile_id = profile_id
    return client.post(f"/api/profiles/{profile_id}/briefs").json()["id"]


def share(client, brief_id):
    response = client.post(f"/api/briefs/{brief_id}/shares")
    assert response.status_code == 201
    return response.json()


def links(client):
    return client.get(f"/api/profiles/{client.profile_id}/shares").json()


def test_a_link_opens_the_brief_without_signing_in(client, brief_id, doctor):
    link = share(client, brief_id)
    response = doctor.get(f"/api/shared/{link['token']}")
    assert response.status_code == 200
    body = response.json()
    assert body["content"]["brief"]["overview"]
    assert body["content"]["snapshot"]["profile"]["name"] == "Meera Joshi"
    assert body["expires_at"] == link["expires_at"]
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["referrer-policy"] == "no-referrer"


def test_the_shared_brief_leaves_out_account_ids(client, brief_id, doctor):
    text = doctor.get(f"/api/shared/{share(client, brief_id)['token']}").text
    assert client.profile_id not in text
    assert "report_id" not in text and "profile_id" not in text


def test_only_a_hash_of_the_token_is_stored(client, brief_id, session_factory):
    link = share(client, brief_id)
    token = link["token"]
    assert len(token) >= 43  # 32 random bytes
    with session_factory() as session:
        row = session.get(ShareLink, link["id"])
        assert row.token_hash == hashlib.sha256(token.encode()).hexdigest()
        assert token not in [str(value) for value in vars(row).values()]
    # The owner never sees the token again.
    assert all("token" not in item for item in links(client))


def test_links_last_a_week(client, brief_id):
    link = share(client, brief_id)
    lasts = datetime.fromisoformat(link["expires_at"]) - datetime.fromisoformat(link["created_at"])
    assert abs(lasts - timedelta(days=get_settings().share_days)) < timedelta(seconds=5)
    assert link["state"] == "active"


def test_a_demo_accounts_links_end_when_the_account_is_deleted(client, doctor):
    client.post("/api/auth/logout")
    user = client.post("/api/auth/demo").json()
    profile_id = client.get("/api/profiles").json()[0]["id"]
    brief_id = client.post(f"/api/profiles/{profile_id}/briefs").json()["id"]
    link = share(client, brief_id)
    hours = get_settings().guest_hours
    assert datetime.fromisoformat(link["expires_at"]) - datetime.now(UTC) <= timedelta(hours=hours)
    assert doctor.get(f"/api/shared/{link['token']}").status_code == 200
    assert user["is_guest"]


def test_each_opening_is_logged(client, brief_id, doctor, session_factory):
    link = share(client, brief_id)
    assert links(client)[0]["view_count"] == 0
    assert links(client)[0]["last_viewed_at"] is None
    doctor.get(f"/api/shared/{link['token']}")
    doctor.get(f"/api/shared/{link['token']}")
    listed = links(client)[0]
    assert listed["view_count"] == 2
    assert listed["last_viewed_at"] is not None
    with session_factory() as session:
        assert len(session.scalars(select(ShareView).where(ShareView.share_id == link["id"])).all()) == 2


def test_a_revoked_link_stops_working_but_keeps_its_log(client, brief_id, doctor):
    link = share(client, brief_id)
    doctor.get(f"/api/shared/{link['token']}")
    assert client.delete(f"/api/shares/{link['id']}").status_code == 204
    assert doctor.get(f"/api/shared/{link['token']}").status_code == 404
    listed = links(client)[0]
    assert listed["state"] == "revoked"
    assert listed["revoked_at"] is not None
    assert listed["view_count"] == 1  # the failed try is not counted
    # Revoking twice is harmless.
    assert client.delete(f"/api/shares/{link['id']}").status_code == 204


def expire(session_factory, share_id):
    with session_factory() as session:
        session.get(ShareLink, share_id).expires_at = datetime.now(UTC) - timedelta(minutes=1)
        session.commit()


def test_an_expired_link_stops_working(client, brief_id, doctor, session_factory):
    link = share(client, brief_id)
    expire(session_factory, link["id"])
    assert doctor.get(f"/api/shared/{link['token']}").status_code == 404
    assert links(client)[0]["state"] == "expired"


def test_unknown_expired_and_revoked_links_look_the_same(client, brief_id, doctor, session_factory):
    expired, revoked = share(client, brief_id), share(client, brief_id)
    expire(session_factory, expired["id"])
    client.delete(f"/api/shares/{revoked['id']}")
    answers = [
        doctor.get(f"/api/shared/{token}")
        for token in (expired["token"], revoked["token"], "x" * 43, "short")
    ]
    assert {r.status_code for r in answers} == {404}
    assert len({r.text for r in answers}) == 1
    assert "expired or was turned off" in answers[0].json()["detail"]
    for r in answers:
        assert r.headers["cache-control"] == "no-store"
        assert r.headers["referrer-policy"] == "no-referrer"


def test_only_a_finished_brief_can_be_shared(client, session_factory):
    with session_factory() as session:
        brief = Brief(profile_id=client.profile_id, status=JobStatus.processing)
        session.add(brief)
        session.commit()
        brief_id = brief.id
    response = client.post(f"/api/briefs/{brief_id}/shares")
    assert response.status_code == 409


def test_other_accounts_cannot_make_see_or_revoke_links(client, brief_id):
    link = share(client, brief_id)
    profile_id = client.profile_id
    signup(client, email="someone@example.com", name="Someone Else")
    assert client.post(f"/api/briefs/{brief_id}/shares").status_code == 404
    assert client.get(f"/api/profiles/{profile_id}/shares").status_code == 404
    assert client.delete(f"/api/shares/{link['id']}").status_code == 404
    client.post("/api/auth/logout")
    assert client.post(f"/api/briefs/{brief_id}/shares").status_code == 401
    assert client.get(f"/api/profiles/{profile_id}/shares").status_code == 401


def test_deleting_the_profile_deletes_its_links(client, brief_id, doctor, session_factory):
    link = share(client, brief_id)
    doctor.get(f"/api/shared/{link['token']}")
    assert client.delete(f"/api/profiles/{client.profile_id}").status_code == 204
    assert doctor.get(f"/api/shared/{link['token']}").status_code == 404
    with session_factory() as session:
        assert session.scalars(select(ShareLink)).all() == []
        assert session.scalars(select(ShareView)).all() == []


def test_deleting_the_account_deletes_its_links(client, brief_id, doctor, session_factory):
    link = share(client, brief_id)
    doctor.get(f"/api/shared/{link['token']}")
    assert client.delete("/api/auth/me").status_code == 204
    assert doctor.get(f"/api/shared/{link['token']}").status_code == 404
    with session_factory() as session:
        assert session.scalars(select(ShareLink)).all() == []
        assert session.scalars(select(ShareView)).all() == []


def test_one_address_can_open_only_so_many_links(client, brief_id, doctor):
    limiters = Limiters(Settings(shared_per_ip_per_10min=2))
    app.dependency_overrides[get_limiters] = lambda: limiters
    token = share(client, brief_id)["token"]
    here = {"X-Forwarded-For": "203.0.113.9"}
    assert doctor.get(f"/api/shared/{token}", headers=here).status_code == 200
    assert doctor.get("/api/shared/guess", headers=here).status_code == 404
    blocked = doctor.get(f"/api/shared/{token}", headers=here)
    assert blocked.status_code == 429
    assert blocked.headers["cache-control"] == "no-store"
    # Someone else is unaffected.
    assert doctor.get(f"/api/shared/{token}", headers={"X-Forwarded-For": "198.51.100.9"}).status_code == 200
