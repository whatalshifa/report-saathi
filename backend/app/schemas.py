"""The JSON shapes the API sends back to the web app."""

from datetime import date, datetime

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


class ReportSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    filename: str
    status: ReportStatus
    error: str | None
    lab_name: str | None
    patient_name: str | None
    report_date: date | None
    created_at: datetime


class ReportDetail(ReportSummary):
    patient_age: str | None
    patient_sex: str | None
    results: list[TestResultOut]

    @computed_field
    @property
    def out_of_range(self) -> int:
        return sum(r.flag in (Flag.low, Flag.high, Flag.abnormal) for r in self.results)
