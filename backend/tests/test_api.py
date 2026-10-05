import io

import pytest
from PIL import Image

from app.services.extraction import ExtractionError
from tests.conftest import FakeExtractor, sample_report, upload


def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}


def test_upload_reads_and_flags_report(client, extractor):
    response = upload(client)
    assert response.status_code == 202
    assert response.json()["status"] == "queued"

    # TestClient runs the background job before returning, so the result is ready.
    report = client.get(f"/api/reports/{response.json()['id']}").json()
    assert report["status"] == "done"
    assert report["lab_name"] == "City Diagnostics"
    assert report["report_date"] == "2026-09-12"
    assert extractor.calls == ["application/pdf"]

    flags = {r["name"]: r["flag"] for r in report["results"]}
    assert flags == {
        "Haemoglobin": "low",
        "Platelet Count": "normal",
        "Total Cholesterol": "high",
        "Urine Sugar": "abnormal",
    }
    assert report["out_of_range"] == 3
    platelets = report["results"][1]
    assert (platelets["value"], platelets["ref_low"], platelets["ref_high"]) == (250000, 150000, 450000)


@pytest.mark.parametrize(
    ("extractor", "message"),
    [
        (FakeExtractor(sample_report(is_lab_report=False, tests=[])), "does not look like a lab report"),
        (FakeExtractor(sample_report(tests=[])), "No test values"),
        (FakeExtractor(ExtractionError("The AI service is busy")), "busy"),
        (FakeExtractor(RuntimeError("boom")), "Something went wrong"),
    ],
)
def test_failed_reading_is_reported(client, extractor, message):
    report_id = upload(client).json()["id"]
    report = client.get(f"/api/reports/{report_id}").json()
    assert report["status"] == "failed"
    assert message in report["error"]
    assert "boom" not in report["error"]


def test_rejects_files_that_are_not_reports(client):
    response = upload(client, data=b"MZ\x90\x00 windows exe", name="report.pdf")
    assert response.status_code == 422
    assert "PDF, JPG, PNG" in response.json()["detail"]
    assert upload(client, data=b"").status_code == 422


def test_accepts_photos_and_shrinks_large_ones(client, extractor):
    noisy = Image.effect_noise((3000, 3000), 100).convert("RGB")
    buffer = io.BytesIO()
    noisy.save(buffer, format="PNG")
    assert len(buffer.getvalue()) > 4_500_000

    response = upload(client, data=buffer.getvalue(), name="photo.png")
    assert response.status_code == 202
    assert extractor.calls == ["image/jpeg"]


def test_list_and_delete(client, storage):
    first = upload(client).json()["id"]
    second = upload(client).json()["id"]
    assert [r["id"] for r in client.get("/api/reports").json()] == [second, first]

    assert client.delete(f"/api/reports/{first}").status_code == 204
    assert client.get(f"/api/reports/{first}").status_code == 404
    assert not (storage.inner.root / f"{first}.pdf").exists()
    assert client.delete(f"/api/reports/{first}").status_code == 404
