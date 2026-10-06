"""Read a lab report (PDF or photo) with Claude and return its values as data.

Claude sees the file directly: PDFs go in as a document, photos as an image.
We ask for output that matches a fixed schema (structured outputs), so the
reply is always valid JSON in the shape below, never free text to parse.
"""

import base64
from typing import Literal, Protocol

import anthropic
from pydantic import BaseModel, Field

from app.services.catalog import CATALOG_KEYS
from app.services.claude import AIError, ask_structured, make_client

# The catalog keys Claude may choose from, plus "other" for anything else.
CatalogKey = Literal[(*CATALOG_KEYS, "other")]


class ExtractedTest(BaseModel):
    section: str | None = Field(description="Panel heading the test sits under, e.g. 'Complete Blood Count'")
    name: str = Field(description="Test name exactly as printed, e.g. 'Haemoglobin (Hb)'")
    catalog_key: CatalogKey = Field(description="The standard test this is, or 'other' if none fits")
    value_text: str = Field(description="Result exactly as printed, e.g. '11.2', '<0.5', 'Positive'")
    numeric_value: float | None = Field(description="The result as a number, or null if it is a word")
    unit: str | None
    reference_text: str | None = Field(description="Reference/normal range exactly as printed")
    ref_low: float | None = Field(description="Lower bound of the normal range for this patient, or null")
    ref_high: float | None = Field(description="Upper bound of the normal range for this patient, or null")
    lab_flag: str | None = Field(description="Any H/L/High/Low/* mark the lab printed next to the value")


class ExtractedReport(BaseModel):
    is_lab_report: bool = Field(description="False if the file is not a medical lab test report")
    lab_name: str | None
    patient_name: str | None
    patient_age: str | None
    patient_sex: str | None
    report_date: str | None = Field(description="Date the sample was collected or reported, as YYYY-MM-DD")
    tests: list[ExtractedTest]


SYSTEM_PROMPT = """You read Indian medical laboratory reports and transcribe them into structured data.

Transcribe every test result on every page, including all panels (CBC, lipid profile, \
thyroid, liver and kidney function, urine routine, and so on). Copy names, values, units \
and reference ranges exactly as printed; do not correct, convert or round them. Skip \
lines that are only headings, method names, or interpretation notes.

For ref_low and ref_high, give the bounds that apply to this patient. When the report \
prints several ranges (by sex, by age, or tiers like Desirable/Borderline/High), choose \
the one for this patient, or the desirable/normal tier. Leave them null when there is \
no numeric range.

For catalog_key, pick the standard test this line measures (for example 'Hb' and \
'Haemoglobin' are both hemoglobin). Use 'other' when none fits; never force a match.

If a value is unreadable, leave it out rather than guessing. If the file is not a lab \
report, set is_lab_report to false and return no tests."""


# Kept as a name of its own so the processing code reads clearly.
ExtractionError = AIError


class Extractor(Protocol):
    def extract(self, data: bytes, content_type: str) -> ExtractedReport: ...


def _file_block(data: bytes, content_type: str) -> dict:
    encoded = base64.standard_b64encode(data).decode("ascii")
    if content_type == "application/pdf":
        return {"type": "document", "source": {"type": "base64", "media_type": content_type, "data": encoded}}
    return {"type": "image", "source": {"type": "base64", "media_type": content_type, "data": encoded}}


class ClaudeExtractor:
    def __init__(self, client: anthropic.Anthropic | None = None):
        self._client = client

    @property
    def client(self) -> anthropic.Anthropic:
        # Made on first use, so the app starts (as a demo) even without an API key.
        if self._client is None:
            self._client = make_client()
        return self._client

    def extract(self, data: bytes, content_type: str) -> ExtractedReport:
        return ask_structured(
            self.client,
            system=SYSTEM_PROMPT,
            content=[
                _file_block(data, content_type),
                {"type": "text", "text": "Transcribe this lab report."},
            ],
            output_format=ExtractedReport,
        )


def get_extractor() -> Extractor:
    """FastAPI dependency, so tests can swap in a fake extractor."""
    return ClaudeExtractor()
