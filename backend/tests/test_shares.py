"""Doctor share links: hashed tokens, expiry, revoking, the opening log, and who may do what."""

import hashlib
import re
from datetime import UTC, datetime, timedelta

import pytest
import qrcode
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.api.auth import Limiters, get_limiters
from app.api.shares import MAX_ACTIVE_LINKS
from app.config import Settings, get_settings
from app.main import app
from app.models import Brief, JobStatus, ShareLink, ShareView
from tests.conftest import signup, upload


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


def opened(doctor, token, headers=None):
    """The doctor's page sends the token in the body, never in the address."""
    return doctor.post("/api/shared", json={"token": token}, headers=headers)


def links(client):
    return client.get(f"/api/profiles/{client.profile_id}/shares").json()


def test_a_link_opens_the_brief_without_signing_in(client, brief_id, doctor):
    link = share(client, brief_id)
    response = opened(doctor, link["token"])
    assert response.status_code == 200
    body = response.json()
    assert body["content"]["brief"]["overview"]
    assert body["content"]["snapshot"]["profile"]["name"] == "Meera Joshi"
    assert body["expires_at"] == link["expires_at"]
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["referrer-policy"] == "no-referrer"
    # Never in the address, where access logs and error reports would keep it.
    assert doctor.get(f"/api/shared/{link['token']}").status_code in (404, 405)


def test_the_shared_brief_leaves_out_account_ids(client, brief_id, doctor):
    text = opened(doctor, share(client, brief_id)["token"]).text
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
    assert opened(doctor, link["token"]).status_code == 200
    assert user["is_guest"]


def test_each_opening_is_logged(client, brief_id, doctor, session_factory):
    link = share(client, brief_id)
    assert links(client)[0]["view_count"] == 0
    assert links(client)[0]["last_viewed_at"] is None
    opened(doctor, link["token"])
    opened(doctor, link["token"])
    listed = links(client)[0]
    assert listed["view_count"] == 2
    assert listed["last_viewed_at"] is not None
    with session_factory() as session:
        assert len(session.scalars(select(ShareView).where(ShareView.share_id == link["id"])).all()) == 2


def test_a_revoked_link_stops_working_but_keeps_its_log(client, brief_id, doctor):
    link = share(client, brief_id)
    opened(doctor, link["token"])
    assert client.delete(f"/api/shares/{link['id']}").status_code == 204
    assert opened(doctor, link["token"]).status_code == 404
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
    assert opened(doctor, link["token"]).status_code == 404
    assert links(client)[0]["state"] == "expired"


def test_unknown_expired_and_revoked_links_look_the_same(client, brief_id, doctor, session_factory):
    expired, revoked = share(client, brief_id), share(client, brief_id)
    expire(session_factory, expired["id"])
    client.delete(f"/api/shares/{revoked['id']}")
    answers = [opened(doctor, token) for token in (expired["token"], revoked["token"], "x" * 43, "short")]
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
    opened(doctor, link["token"])
    assert client.delete(f"/api/profiles/{client.profile_id}").status_code == 204
    assert opened(doctor, link["token"]).status_code == 404
    with session_factory() as session:
        assert session.scalars(select(ShareLink)).all() == []
        assert session.scalars(select(ShareView)).all() == []


def test_deleting_the_account_deletes_its_links(client, brief_id, doctor, session_factory):
    link = share(client, brief_id)
    opened(doctor, link["token"])
    assert client.delete("/api/auth/me").status_code == 204
    assert opened(doctor, link["token"]).status_code == 404
    with session_factory() as session:
        assert session.scalars(select(ShareLink)).all() == []
        assert session.scalars(select(ShareView)).all() == []


def test_one_address_can_open_only_so_many_links(client, brief_id, doctor):
    limiters = Limiters(Settings(shared_per_ip_per_10min=2))
    app.dependency_overrides[get_limiters] = lambda: limiters
    token = share(client, brief_id)["token"]
    here = {"X-Forwarded-For": "203.0.113.9"}
    assert opened(doctor, token, headers=here).status_code == 200
    assert opened(doctor, "guess", headers=here).status_code == 404
    blocked = opened(doctor, token, headers=here)
    assert blocked.status_code == 429
    assert blocked.headers["cache-control"] == "no-store"
    # Someone else is unaffected.
    assert opened(doctor, token, headers={"X-Forwarded-For": "198.51.100.9"}).status_code == 200


def test_only_so_many_links_can_be_open_at_once(client, brief_id, session_factory):
    made = [share(client, brief_id) for _ in range(MAX_ACTIVE_LINKS)]
    refused = client.post(f"/api/briefs/{brief_id}/shares")
    assert refused.status_code == 409
    assert refused.json()["detail"] == "You have 20 links open already. Turn off one you no longer need."

    # Only working links count: one turned off and one expired make room for two more.
    client.delete(f"/api/shares/{made[0]['id']}")
    expire(session_factory, made[1]["id"])
    share(client, brief_id)
    share(client, brief_id)
    assert client.post(f"/api/briefs/{brief_id}/shares").status_code == 409


def test_deleting_a_report_turns_off_links_that_could_show_its_values(client, brief_id, doctor):
    link = share(client, brief_id)
    report_id = client.get("/api/reports", params={"profile_id": client.profile_id}).json()[0]["id"]
    assert client.delete(f"/api/reports/{report_id}").status_code == 204
    assert opened(doctor, link["token"]).status_code == 404
    assert links(client)[0]["state"] == "revoked"
    # A new link, made after the delete, works.
    assert opened(doctor, share(client, brief_id)["token"]).status_code == 200


def test_moving_a_report_away_turns_off_the_old_persons_links(client, brief_id, doctor):
    link = share(client, brief_id)
    meera = client.profile_id
    asha = next(p["id"] for p in client.get("/api/profiles").json() if not p["is_sample"])
    report_id = client.get("/api/reports", params={"profile_id": meera}).json()[0]["id"]
    assert client.patch(f"/api/reports/{report_id}", json={"profile_id": asha}).status_code == 200
    assert opened(doctor, link["token"]).status_code == 404

    # Moving a report to the person it is already filed under changes nothing.
    other = share(client, brief_id)
    second = client.get("/api/reports", params={"profile_id": meera}).json()[0]["id"]
    assert client.patch(f"/api/reports/{second}", json={"profile_id": meera}).status_code == 200
    assert opened(doctor, other["token"]).status_code == 200


def test_uploading_a_report_leaves_links_alone(client, brief_id, doctor):
    link = share(client, brief_id)
    upload(client)
    assert opened(doctor, link["token"]).status_code == 200


def qr(client, url):
    return client.post("/api/shares/qr", json={"url": url})


def dark_squares(svg: str) -> set[tuple[int, int]]:
    """The QR code's dark squares, read back out of the SVG path ("M4,4H5V5H4z" is one square)."""
    return {(int(x), int(y)) for x, y in re.findall(r"M(\d+),(\d+)H", svg)}


def test_a_new_link_can_be_shown_as_a_qr_code(client, brief_id):
    url = f"https://report-saathi.example/shared#{share(client, brief_id)['token']}"
    response = qr(client, url)
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    svg = response.json()["svg"]
    assert svg.startswith("<svg") and '<rect fill="white"' in svg  # black on white, in dark mode too
    # The squares are exactly the code for this link, quiet border included.
    code = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, border=4)
    code.add_data(url)
    expected = {(x, y) for y, row in enumerate(code.get_matrix()) for x, dark in enumerate(row) if dark}
    assert dark_squares(svg) == expected


def test_only_the_owners_working_links_get_a_qr_code(client, brief_id, session_factory):
    link, revoked, expired = share(client, brief_id), share(client, brief_id), share(client, brief_id)
    client.delete(f"/api/shares/{revoked['id']}")
    expire(session_factory, expired["id"])
    site = "http://localhost:3000"
    for url in [
        f"{site}/shared#{revoked['token']}",
        f"{site}/shared#{expired['token']}",
        f"{site}/shared#{'x' * 43}",
        f"{site}/shared#",
        f"{site}/somewhere-else#{link['token']}",  # not a share link
        f"javascript:alert(1)//{site}/shared#{link['token']}",
        "https://example.com/anything",
    ]:
        answer = qr(client, url)
        assert answer.status_code == 404, url
        assert answer.headers["cache-control"] == "no-store"
    assert qr(client, f"{site}/shared#{link['token']}").status_code == 200
    assert qr(client, f"{site}/shared#{link['token']}" + "x" * 500).status_code == 422  # too long

    signup(client, email="someone@example.com", name="Someone Else")
    assert qr(client, f"{site}/shared#{link['token']}").status_code == 404
    client.post("/api/auth/logout")
    assert qr(client, f"{site}/shared#{link['token']}").status_code == 401


def test_the_token_for_a_qr_code_never_travels_in_the_address(client, brief_id):
    token = share(client, brief_id)["token"]
    assert client.get(f"/api/shares/qr?url=http://x/shared%23{token}").status_code == 405
