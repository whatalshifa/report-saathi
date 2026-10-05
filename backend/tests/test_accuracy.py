"""The accuracy test's scoring, and the runner end to end with a stand-in for Claude."""

import json

import pytest

from accuracy import run
from accuracy.scoring import Predicted, score_report, summarize
from tests.conftest import PDF_BYTES, make_test, sample_report

LABEL = {
    "reviewed": True,
    "source": "photo",
    "lab_name": "City Diagnostics",
    "report_date": "2026-09-12",
    "tests": [
        {"name": "Haemoglobin", "value": "11.2", "unit": "g/dL", "flag": "low"},
        {"name": "Platelet Count", "value": "2,50,000", "unit": "/cumm", "flag": "normal"},
        {"name": "TSH", "value": "3.1", "unit": "µIU/mL", "flag": "normal"},
        {"name": "Urine Sugar", "value": "Positive (+)", "unit": None, "flag": "abnormal"},
    ],
}


def test_scores_each_kind_of_mistake():
    predicted = [
        Predicted("Hb", "11.2", "gm/dl", "low"),  # different spelling, same test and unit
        Predicted("PLATELETS", "250000", "/µL", "high"),  # same number, wrong flag
        Predicted("Urine sugar", "positive (+)", None, "abnormal"),
        Predicted("Serum Iron", "80", "µg/dL", "normal"),  # not on the report: invented
    ]
    score = score_report(LABEL, predicted, "City  Diagnostics.", "2026-09-12")
    assert (score.expected, score.predicted, score.found) == (4, 4, 3)
    assert (score.value_ok, score.flag_ok) == (3, 2)
    assert score.missed == ["tsh"]
    assert score.wrong_flag == ["platelets"]
    assert score.lab_ok and score.date_ok


def test_misread_value_and_wrong_date():
    score = score_report(LABEL, [Predicted("Haemoglobin", "11.7", "g/dL", "low")], None, "2026-09-21")
    assert score.wrong_value == ["hemoglobin"]
    assert not score.lab_ok and not score.date_ok


def test_summary_splits_photos_and_pdfs():
    photo = score_report(LABEL, [Predicted("Hb", "11.2", "g/dL", "low")], "City Diagnostics", "2026-09-12")
    pdf = score_report({**LABEL, "source": "pdf"}, [], None, None)
    summary = summarize([photo, pdf])
    assert summary["overall"]["values_on_reports"] == 8
    assert summary["overall"]["values_found_pct"] == 12.5
    assert summary["by_source"]["photo"]["flag_correct_pct"] == 100.0
    assert summary["by_source"]["pdf"]["value_correct_pct"] is None  # nothing found, nothing to judge
    assert ("tsh", 2) in summary["most_missed"]


class StubExtractor:
    def __init__(self):
        self.calls = 0

    def extract(self, data, content_type):
        self.calls += 1
        return sample_report(
            tests=[
                make_test("Haemoglobin", "11.2", "g/dL", "13.0 - 17.0"),
                make_test("Urine Sugar", "Positive (+)", None, "Negative"),
            ]
        )


@pytest.fixture
def stub(monkeypatch, tmp_path):
    extractor = StubExtractor()
    monkeypatch.setattr(run, "ClaudeExtractor", lambda: extractor)
    monkeypatch.setattr(run, "RESULTS_FILES", [tmp_path / "results.json"])
    monkeypatch.setattr(run, "ROOT", tmp_path)
    (tmp_path / "docs").mkdir()
    return extractor


def test_draft_then_score(stub, tmp_path):
    data = tmp_path / "data"
    data.mkdir()
    (data / "report-01.pdf").write_bytes(PDF_BYTES)

    run.draft(data)
    label_file = data / "report-01.pdf.label.json"
    label = json.loads(label_file.read_text())
    assert label["reviewed"] is False and label["source"] == "pdf"
    assert [t["flag"] for t in label["tests"]] == ["low", "abnormal"]

    with pytest.raises(SystemExit, match="No reviewed"):
        run.score(data, None)

    # The reviewer corrects one flag the reading got "wrong", and signs it off.
    label["tests"][1]["flag"] = "normal"
    label["reviewed"] = True
    label_file.write_text(json.dumps(label))
    run.score(data, "first")

    results = json.loads((tmp_path / "results.json").read_text())
    assert results["overall"]["flag_correct_pct"] == 50.0
    assert results["overall"]["values_found_pct"] == 100.0
    markdown = (tmp_path / "docs/RESULTS.md").read_text()
    assert "| All reports | 1 | 2 | 100.0% | 0.0% | 100.0% | 100.0% | 50.0% |" in markdown

    # Re-scoring a saved run doesn't call Claude again.
    calls = stub.calls
    run.score(data, "first")
    assert stub.calls == calls
