"""Family profiles: adding, editing, deleting, and filing reports under the right person."""

import pytest

from tests.conftest import FakeExtractor, sample_report, upload


def add(client, name="Sunita Sharma", relation="parent", **extra):
    return client.post("/api/profiles", json={"name": name, "relation": relation, **extra})


def test_add_and_edit_profile(client):
    created = add(client, birth_year=1962, sex="female")
    assert created.status_code == 201
    profile = created.json()
    assert (profile["name"], profile["birth_year"], profile["report_count"]) == ("Sunita Sharma", 1962, 0)

    edited = client.put(f"/api/profiles/{profile['id']}", json={"name": "Mummy", "relation": "parent"})
    assert edited.json()["name"] == "Mummy"
    assert edited.json()["birth_year"] is None


@pytest.mark.parametrize(
    "body",
    [
        {"name": "", "relation": "parent"},
        {"name": "X", "relation": "cousin"},
        {"name": "X", "relation": "child", "birth_year": 1800},
        {"name": "X", "relation": "child", "sex": "unknown"},
    ],
)
def test_profile_validation(client, body):
    assert client.post("/api/profiles", json=body).status_code == 422


def test_only_one_self_profile(client):
    assert add(client, "Me again", "self").status_code == 409
    other = add(client).json()["id"]
    assert client.put(f"/api/profiles/{other}", json={"name": "Me", "relation": "self"}).status_code == 409
    # Renaming your own profile keeps it "self".
    assert (
        client.put(
            f"/api/profiles/{client.profile_id}", json={"name": "Asha", "relation": "self"}
        ).status_code
        == 200
    )


def test_profile_limit(client):
    for i in range(11):
        assert add(client, f"Person {i}").status_code == 201
    assert add(client, "One too many").status_code == 409


def test_cannot_delete_the_last_profile(client):
    assert client.delete(f"/api/profiles/{client.profile_id}").status_code == 409


def test_deleting_a_profile_deletes_its_reports_and_files(client, storage):
    papa = add(client).json()["id"]
    report_id = upload(client, profile_id=papa).json()["id"]
    kept = upload(client).json()["id"]

    assert client.delete(f"/api/profiles/{papa}").status_code == 204
    assert client.get(f"/api/reports/{report_id}").status_code == 404
    assert not (storage.inner.root / f"{report_id}.pdf").exists()
    assert client.get(f"/api/reports/{kept}").status_code == 200


@pytest.fixture
def extractor():
    return FakeExtractor(sample_report(patient_name="Mrs. Sunita Sharma"), sample_report(patient_name=None))


def test_warns_when_report_name_does_not_match_profile(client):
    report = client.get(f"/api/reports/{upload(client).json()['id']}").json()
    assert report["profile"]["name"] == "Asha Patel"
    assert report["name_matches_profile"] is False

    # Moving it to the right profile clears the warning.
    mummy = add(client).json()["id"]
    moved = client.patch(f"/api/reports/{report['id']}", json={"profile_id": mummy}).json()
    assert (moved["profile_id"], moved["name_matches_profile"]) == (mummy, True)

    no_name = client.get(f"/api/reports/{upload(client).json()['id']}").json()
    assert no_name["name_matches_profile"] is None


def test_upload_needs_a_profile(client):
    response = client.post("/api/reports", files={"file": ("r.pdf", b"%PDF-1.4", "application/pdf")})
    assert response.status_code == 422
