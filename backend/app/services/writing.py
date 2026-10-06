"""The two AI writing features: explaining a report, and writing the doctor brief.

Claude only writes words here. Every number and every low/high flag it sees has
already been decided by our code, and the prompts tell it to use those as given.
"""

import json
from typing import Protocol

import anthropic
from pydantic import BaseModel, Field

from app.models import Report
from app.schemas import Trends
from app.services.claude import ask_structured, make_client

LANGUAGES = {"en": "English", "hi": "Hindi", "mr": "Marathi"}


# ---------- Explaining one report ----------


class ExplainedTest(BaseModel):
    test_name: str = Field(description="Name as printed, then the everyday name in brackets if it helps")
    what_it_measures: str = Field(description="One or two sentences")
    what_your_result_means: str = Field(description="What this value, being low/high/abnormal, can point to")
    common_reasons: list[str] = Field(description="2 to 4 common, non-alarming-first reasons")
    what_you_can_do: str = Field(description="Practical next step: diet, follow-up test, or see a doctor")


class ReportExplanation(BaseModel):
    summary: str = Field(description="2 to 3 sentences on the report as a whole")
    see_doctor_soon: bool = Field(
        description="True only if a value is far enough out of range to need prompt care"
    )
    see_doctor_reason: str | None
    flagged: list[ExplainedTest] = Field(
        description="One entry per value outside its range, most important first"
    )
    normal_summary: str = Field(description="One or two sentences about the values that are within range")
    questions_for_doctor: list[str] = Field(description="3 to 5 short questions to ask at the next visit")


EXPLAIN_PROMPT = """You explain Indian medical lab reports to patients and their families in plain \
language. Your reader is not medically trained and may have studied only up to class 8.

Write everything in {language}.{script_note} Keep test names as printed so the reader can \
find them on the paper report. Use short sentences and everyday words; explain any medical \
word you must use.

Rules:
- The low/high/abnormal flags are already decided. Use them exactly as given; never call a \
flagged value normal or a normal value abnormal.
- Use only the values given. Do not invent results, dates or history.
- Do not diagnose. Say a value "can be linked to" something, never "you have" it.
- Do not name medicines or doses. General food, activity and follow-up advice is fine.
- Be calm and kind. Mention common, harmless reasons before serious ones.
- If a value is far outside its range (for example haemoglobin below 7 g/dL, potassium above \
6 mmol/L, or fasting sugar above 300 mg/dL), set see_doctor_soon and say why plainly."""

_SCRIPT_NOTES = {
    "en": "",
    "hi": " Use Devanagari script and the Hindi people speak at home, not formal textbook Hindi.",
    "mr": " Use Devanagari script and simple, everyday Marathi.",
}


def _report_payload(report: Report) -> str:
    return json.dumps(
        {
            "patient": {"age": report.patient_age, "sex": report.patient_sex},
            "lab": report.lab_name,
            "date": str(report.report_date) if report.report_date else None,
            "results": [
                {
                    "section": r.section,
                    "test": r.name,
                    "value": r.value_text,
                    "unit": r.unit,
                    "normal_range": r.reference_text,
                    "flag": r.flag.value,
                }
                for r in report.results
            ],
        },
        ensure_ascii=False,
    )


# ---------- The doctor brief ----------


class BriefFinding(BaseModel):
    test: str
    finding: str = Field(description="One sentence citing the values and dates given")


class DoctorBrief(BaseModel):
    overview: str = Field(description="2 to 3 sentences a doctor can read in 20 seconds")
    key_findings: list[BriefFinding] = Field(description="Up to 6, most clinically relevant first")
    questions_for_doctor: list[str] = Field(description="3 to 5 questions the patient wants to ask")


BRIEF_PROMPT = """You prepare a one-page pre-visit brief that a patient hands to their doctor. \
It summarises lab results across several reports, often from different labs.

Write in concise clinical English. The doctor is busy: lead with what changed and what is out \
of range.

Rules:
- Use only the numbers, dates and flags given. Every value is already converted to the unit \
shown for its test, and flags were judged against each lab's own printed range. Where \
range_source is "typical", the lab printed no range and a typical adult range was used; say so \
if you mention it.
- Describe trends (rising, falling, stable) only from the values given.
- Do not diagnose or suggest treatment. Point out patterns worth the doctor's attention.
- Questions are from the patient's point of view, in plain words."""


def _trends_payload(trends: Trends) -> str:
    person = trends.profile
    return json.dumps(
        {
            "patient": {"age": person.age, "sex": person.sex},
            "reports": person.report_count,
            "period": [str(person.first_date), str(person.last_date)],
            "labs": person.labs,
            "tests": [
                {
                    "test": s.name,
                    "unit": s.unit,
                    "latest_normal_range": [s.ref_low, s.ref_high],
                    "range_source": s.range_source,
                    "readings": [
                        {"date": str(p.date), "value": p.value, "flag": p.flag.value} for p in s.points
                    ],
                }
                for s in trends.series
            ],
        },
        ensure_ascii=False,
    )


# ---------- The writer ----------


class Writer(Protocol):
    def explain(self, report: Report, language: str) -> ReportExplanation: ...
    def brief(self, trends: Trends) -> DoctorBrief: ...


class ClaudeWriter:
    def __init__(self, client: anthropic.Anthropic | None = None):
        self._client = client

    @property
    def client(self) -> anthropic.Anthropic:
        # Made on first use, so the app starts (as a demo) even without an API key.
        if self._client is None:
            self._client = make_client()
        return self._client

    def explain(self, report: Report, language: str) -> ReportExplanation:
        system = EXPLAIN_PROMPT.format(language=LANGUAGES[language], script_note=_SCRIPT_NOTES[language])
        return ask_structured(
            self.client,
            system=system,
            content=[{"type": "text", "text": f"Explain this report:\n{_report_payload(report)}"}],
            output_format=ReportExplanation,
        )

    def brief(self, trends: Trends) -> DoctorBrief:
        return ask_structured(
            self.client,
            system=BRIEF_PROMPT,
            content=[
                {"type": "text", "text": f"Prepare the brief from these results:\n{_trends_payload(trends)}"}
            ],
            output_format=DoctorBrief,
        )


def get_writer() -> Writer:
    """FastAPI dependency, so tests can swap in a fake writer."""
    return ClaudeWriter()
