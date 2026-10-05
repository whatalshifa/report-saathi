"""The JSON shapes the API sends back to the web app."""

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, computed_field

from app.models import Flag, ReportStatus


class TestResultOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    __test__ = False

    id: int
    section: str | None
    name: str
    value_text: str
    value: float | None
    unit: str | None
    reference_text: str | None
    ref_low: float | None
    ref_high: float | None
    lab_flag: str | None
    flag: Flag
    catalog_key: str | None


class ReportSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    filename: str
    status: ReportStatus
    error: str | None
    lab_name: str | None
    patient_name: str | None
    report_date: date | None
    person_key: str | None
    created_at: datetime


class ReportDetail(ReportSummary):
    patient_age: str | None
    patient_sex: str | None
    results: list[TestResultOut]

    @computed_field
    @property
    def out_of_range(self) -> int:
        return sum(r.flag in (Flag.low, Flag.high, Flag.abnormal) for r in self.results)


class PersonSummary(BaseModel):
    key: str
    name: str
    age: str | None
    sex: str | None
    report_count: int
    first_date: date
    last_date: date
    labs: list[str]


class TrendPoint(BaseModel):
    date: date
    value: float  # in the series' standard unit
    flag: Flag  # judged against the range printed on that report
    report_id: str
    lab_name: str | None
    printed: str  # the value and unit exactly as that lab printed them


class TrendSeries(BaseModel):
    key: str
    name: str
    unit: str
    ref_low: float | None
    ref_high: float | None
    points: list[TrendPoint]
    latest_flag: Flag
    change: float | None
    change_pct: float | None


class Trends(BaseModel):
    person: PersonSummary
    series: list[TrendSeries]


class JobOut(BaseModel):
    """An AI writing job: an explanation or a doctor brief."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    status: ReportStatus
    error: str | None
    content: dict | None
    created_at: datetime


class ExplanationOut(JobOut):
    report_id: str
    language: str


class BriefOut(JobOut):
    person_key: str


class ExplanationRequest(BaseModel):
    language: Literal["en", "hi", "mr"] = "en"
