"""Where did this number come from, for PDFs with real text: boxes found by code, and pages drawn."""

import io

import pytest
from PIL import Image

from app.services.extraction import SourceBox
from app.services.pdf_text import PAD, locate_values
from tests.conftest import PDF_BYTES, FakeExtractor, make_test, sample_report, signup, upload
from tests.pdfs import make_pdf

# A4 in points. Text is 10-point Helvetica; a baseline at y=700 puts the word's top 134.1 points
# from the top of the page and its bottom 144.1 (pdfplumber measures from the top).
WIDTH, HEIGHT = 595, 842

REPORT = [
    (50, 780, "City Diagnostics"),
    (50, 720, "Complete Blood Count"),
    (50, 700, "Haemoglobin (Hb)"),
    (250, 700, "11.2"),
    (300, 700, "g/dL"),
    (380, 700, "13.0 - 17.0"),
    (50, 680, "Platelet Count"),
    (250, 680, "2,50,000"),
    (300, 680, "/cumm"),
    (380, 680, "1,50,000 - 4,50,000"),
    (50, 660, "Total Cholesterol"),
    (250, 660, "232"),
    (300, 660, "mg/dL"),
    (380, 660, "Desirable: <200"),
    (50, 640, "Urine Sugar"),
    (250, 640, "Positive (+)"),
    (380, 640, "Negative"),
]


def read_as(*pairs: tuple[str, str]):
    return [make_test(name, value, None, None) for name, value in pairs]


def expected(x0: float, x1: float, baseline: float, page: int = 1) -> SourceBox:
    top = HEIGHT - baseline - 7.9  # Helvetica's ascent above the baseline at 10 points, as pdfplumber has it
    return SourceBox(
        page=page,
        x0=(x0 - PAD) / WIDTH,
        y0=(top - PAD) / HEIGHT,
        x1=(x1 + PAD) / WIDTH,
        y1=(top + 10 + PAD) / HEIGHT,
    )


def close(a: SourceBox | None, b: SourceBox) -> bool:
    return (
        a is not None
        and a.page == b.page
        and all(abs(getattr(a, edge) - getattr(b, edge)) < 0.002 for edge in ("x0", "y0", "x1", "y1"))
    )


def test_each_value_is_found_beside_its_name():
    hb, platelets, cholesterol, sugar = locate_values(
        make_pdf(REPORT),
        read_as(
            ("Haemoglobin (Hb)", "11.2"),
            ("Platelet Count", "2,50,000"),
            ("Total Cholesterol", "232"),
            ("Urine Sugar", "Positive (+)"),
        ),
    )
    assert close(hb, expected(250, 269.5, 700))
    assert close(platelets, expected(250, 288.9, 680))
    assert close(cholesterol, expected(250, 266.7, 660))
    # A result printed as two words gets one box around both.
    assert close(sugar, expected(250, 300.3, 640))


@pytest.mark.parametrize(
    "name, value",
    [
        ("Haemoglobin (Hb)", "13.0"),  # misread: 13.0 is the range, not the result
        ("Haemoglobin (Hb)", "12.0"),  # not printed at all
        ("Urine Sugar", "Negative"),  # the expected result, printed after the real one
        ("Haemoglobin", "232"),  # the value is on another test's line
        ("Serum Iron", "11.2"),  # a name that isn't on the page
    ],
)
def test_no_box_unless_the_text_matches_exactly(name, value):
    assert locate_values(make_pdf(REPORT), read_as((name, value))) == [None]


def test_names_match_whole_words_only():
    page = [(50, 700, "HbA1c"), (250, 700, "6.2")]
    assert locate_values(make_pdf(page), read_as(("Hb", "6.2"))) == [None]
    assert locate_values(make_pdf(page), read_as(("HbA1c", "6.2")))[0] is not None


def test_a_match_on_two_lines_is_not_trusted():
    # The same test and value on two pages (a repeated page, or a summary): which one is it?
    pdf = make_pdf(REPORT, REPORT)
    assert locate_values(pdf, read_as(("Haemoglobin (Hb)", "11.2"))) == [None]


def test_the_right_page_is_named():
    pdf = make_pdf([(50, 780, "Page one")], REPORT)
    [hb] = locate_values(pdf, read_as(("Haemoglobin (Hb)", "11.2")))
    assert close(hb, expected(250, 269.5, 700, page=2))


def test_two_tests_side_by_side_with_the_same_value():
    page = [(50, 700, "Neutrophils"), (150, 700, "60"), (300, 700, "Lymphocytes"), (400, 700, "60")]
    neutrophils, lymphocytes = locate_values(
        make_pdf(page), read_as(("Neutrophils", "60"), ("Lymphocytes", "60"))
    )
    assert close(neutrophils, expected(150, 161.1, 700))
    assert close(lymphocytes, expected(400, 411.1, 700))


def test_a_column_of_words_between_name_and_number_is_fine():
    page = [(50, 700, "Haemoglobin"), (150, 700, "Photometry"), (250, 700, "11.2")]
    [hb] = locate_values(make_pdf(page), read_as(("Haemoglobin", "11.2")))
    assert close(hb, expected(250, 269.5, 700))


def test_turned_pages_scans_and_broken_files_give_no_boxes():
    wanted = read_as(("Haemoglobin (Hb)", "11.2"))
    assert locate_values(make_pdf(REPORT, rotate=90), wanted) == [None]
    assert locate_values(make_pdf([]), wanted) == [None]  # no text layer, like a scan
    assert locate_values(PDF_BYTES, wanted) == [None]  # not a readable PDF
    assert locate_values(b"%PDF-1.4\n" + b"\x00" * 100, wanted) == [None]


REAL_PDF = make_pdf(REPORT)


@pytest.mark.parametrize(
    "extractor",
    [
        FakeExtractor(
            sample_report(
                tests=[
                    # Claude's box is a little off: the PDF's own text replaces it.
                    make_test("Haemoglobin (Hb)", "11.2", "g/dL", "13.0 - 17.0").model_copy(
                        update={"box": SourceBox(page=1, x0=0.3, y0=0.1, x1=0.4, y1=0.12)}
                    ),
                    # No box from Claude: one is found.
                    make_test("Platelet Count", "2,50,000", "/cumm", "1,50,000 - 4,50,000"),
                    # Not found in the text: Claude's box stays.
                    make_test("TSH", "3.1", "mIU/L", "0.4 - 4.5").model_copy(
                        update={"box": SourceBox(page=1, x0=0.4, y0=0.5, x1=0.5, y1=0.52)}
                    ),
                    # Neither: no box, no source button.
                    make_test("Urine Sugar", "Negative", None, "Negative"),
                ]
            )
        )
    ],
)
def test_uploaded_pdfs_get_boxes_from_their_text(client):
    report = client.get(f"/api/reports/{upload(client, data=REAL_PDF).json()['id']}").json()
    hb, platelets, tsh, sugar = report["results"]
    assert close(SourceBox(**hb["box"]), expected(250, 269.5, 700))
    assert close(SourceBox(**platelets["box"]), expected(250, 288.9, 680))
    assert tsh["box"] == {"page": 1, "x0": 0.4, "y0": 0.5, "x1": 0.5, "y1": 0.52}
    assert sugar["box"] is None


def test_a_pdf_page_is_drawn_with_the_value_where_the_box_says(client):
    report = client.get(f"/api/reports/{upload(client, data=REAL_PDF).json()['id']}").json()
    response = client.get(f"/api/reports/{report['id']}/pages/1")
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"
    assert response.headers["cache-control"] == "private, no-store"
    page = Image.open(io.BytesIO(response.content)).convert("L")
    assert page.width == 1240 and abs(page.height - 1754) <= 1  # A4 at 150 dots per inch
    # Ink inside the box the text layer gave, and blank paper just left of it.
    b = expected(250, 269.5, 700)
    w, h = page.size
    assert page.crop((b.x0 * w, b.y0 * h, b.x1 * w, b.y1 * h)).getextrema()[0] < 80
    assert page.crop((0.3 * w, b.y0 * h, 0.4 * w, b.y1 * h)).getextrema()[0] > 240

    for missing in (0, 2, -1):
        assert client.get(f"/api/reports/{report['id']}/pages/{missing}").status_code == 404


def test_only_real_pdfs_of_your_own_have_pages(client):
    broken = upload(client).json()["id"]  # the stand-in bytes start like a PDF but aren't one
    assert client.get(f"/api/reports/{broken}/pages/1").status_code == 404
    image = upload(client, data=_png(), name="photo.png").json()["id"]
    assert client.get(f"/api/reports/{image}/pages/1").status_code == 404

    mine = upload(client, data=REAL_PDF).json()["id"]
    assert client.get(f"/api/reports/{mine}/pages/1").status_code == 200
    client.post("/api/auth/logout")
    assert client.get(f"/api/reports/{mine}/pages/1").status_code == 401
    signup(client, email="ravi@example.com", name="Ravi")
    assert client.get(f"/api/reports/{mine}/pages/1").status_code == 404


def _png() -> bytes:
    out = io.BytesIO()
    Image.new("RGB", (40, 40), "white").save(out, format="PNG")
    return out.getvalue()
