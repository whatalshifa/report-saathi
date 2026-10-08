"""Where did this number come from: the box around each value, the original file, and the sample pages."""

import io

import pytest
from PIL import Image
from sqlalchemy import select

from app.config import Settings, get_settings
from app.main import app
from app.models import Report
from app.services.extraction import SYSTEM_PROMPT, ExtractedReport, ExtractedTest, SourceBox
from tests.conftest import PDF_BYTES, FakeExtractor, make_test, sample_report, signup, upload


def box(**overrides) -> dict:
    return {"page": 1, "x0": 0.4, "y0": 0.2, "x1": 0.5, "y1": 0.22} | overrides


def with_box(value) -> SourceBox | None:
    """The box as it comes out of checking Claude's reply."""
    test = make_test("Haemoglobin", "11.2", "g/dL", "13 - 17").model_dump() | {"box": value}
    return ExtractedTest.model_validate(test).box


def test_a_good_box_is_kept():
    assert with_box(box()) == SourceBox(**box())
    assert with_box(None) is None


def test_edges_outside_the_page_are_pulled_back_onto_it():
    assert with_box(box(x0=-0.1, y1=1.3, page=2)) == SourceBox(page=2, x0=0.0, y0=0.2, x1=0.5, y1=1.0)


@pytest.mark.parametrize(
    "bad",
    [
        box(x1=0.4),  # no width
        box(x0=0.6),  # left of right edge
        box(y1=0.1),  # upside down
        box(page=0),
        box(page=-1),
        box(x0=1.2, x1=1.5),  # entirely off the page: nothing left after clamping
    ],
)
def test_impossible_boxes_are_dropped(bad):
    assert with_box(bad) is None


def test_claude_is_asked_for_the_box_around_the_value():
    assert "box" in SYSTEM_PROMPT and "not the test name" in SYSTEM_PROMPT
    description = ExtractedReport.model_json_schema()["$defs"]["ExtractedTest"]["properties"]["box"]
    assert "result value" in description["description"]


@pytest.mark.parametrize(
    "extractor",
    [
        FakeExtractor(
            sample_report(
                tests=[
                    make_test("Haemoglobin", "11.2", "g/dL", "13 - 17").model_copy(
                        update={"box": SourceBox(**box(page=2))}
                    ),
                    make_test("TSH", "3.1", "mIU/L", "0.4 - 4.5"),
                ]
            )
        )
    ],
)
def test_boxes_are_stored_and_returned_with_the_report(client):
    report = client.get(f"/api/reports/{upload(client).json()['id']}").json()
    assert report["content_type"] == "application/pdf"
    hb, tsh = report["results"]
    assert hb["box"] == box(page=2)
    assert tsh["box"] is None  # reports read before boxes existed look the same


def test_the_original_file_is_returned_privately(client):
    report_id = upload(client).json()["id"]
    response = client.get(f"/api/reports/{report_id}/file")
    assert response.status_code == 200
    assert response.content == PDF_BYTES  # decrypted
    assert response.headers["content-type"] == "application/pdf"
    assert response.headers["content-disposition"] == 'inline; filename="report.pdf"'
    assert response.headers["cache-control"] == "private, no-store"
    assert response.headers["x-content-type-options"] == "nosniff"


def test_nobody_else_can_get_the_original_file(client):
    report_id = upload(client).json()["id"]
    assert client.get("/api/reports/no-such-report/file").status_code == 404

    client.post("/api/auth/logout")
    assert client.get(f"/api/reports/{report_id}/file").status_code == 401
    signup(client, email="ravi@example.com", name="Ravi")
    assert client.get(f"/api/reports/{report_id}/file").status_code == 404


def sample_reports(client) -> list[dict]:
    profile_id = client.post("/api/samples").json()["id"]
    summaries = client.get("/api/reports", params={"profile_id": profile_id}).json()
    return [client.get(f"/api/reports/{s['id']}").json() for s in summaries]


def test_sample_reports_have_a_page_image_and_a_box_for_every_value(client):
    for report in sample_reports(client):
        assert report["content_type"] == "image/png"
        response = client.get(f"/api/reports/{report['id']}/file")
        assert response.headers["content-type"] == "image/png"
        page = Image.open(io.BytesIO(response.content)).convert("L")
        width, height = page.size

        for result in report["results"]:
            b = result["box"]
            assert b["page"] == 1
            assert 0 <= b["x0"] < b["x1"] <= 1 and 0 <= b["y0"] < b["y1"] <= 1
            # Something dark is printed inside the box: the value, not blank paper or the watermark.
            crop = page.crop((b["x0"] * width, b["y0"] * height, b["x1"] * width, b["y1"] * height))
            assert crop.getextrema()[0] < 80, result["name"]


def test_sample_reports_never_count_against_upload_limits(client, session_factory):
    meera = client.post("/api/samples").json()["id"]
    with session_factory() as session:
        assert all(session.scalars(select(Report.is_sample)))

    app.dependency_overrides[get_settings] = lambda: Settings(daily_upload_limit=1)
    try:
        # Three sample reports, yet the one upload allowed today still goes through, even filed
        # under the sample person; after it, the limit applies.
        assert upload(client, profile_id=meera).status_code == 202
        assert upload(client).status_code == 429
    finally:
        app.dependency_overrides.pop(get_settings, None)
