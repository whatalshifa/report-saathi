"""The JSON shapes the API sends back to the web app."""

import re
from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, StringConstraints, computed_field

from app.models import Flag, Relation, ReportStatus
from app.services.names import names_match

# ---------- Accounts ----------

_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _check_email(value: str) -> str:
    if not _EMAIL.match(value):
        raise ValueError("Enter a valid email address")
    return value.lower()


Email = Annotated[str, StringConstraints(strip_whitespace=True, max_length=254), AfterValidator(_check_email)]
Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]


class SignupIn(BaseModel):
    name: Name
    email: Email
    # Long passphrases beat complex short ones (NIST 800-63B); 128 caps the hashing work.
    password: str = Field(min_length=10, max_length=128)


class LoginIn(BaseModel):
    email: Email
    password: str = Field(max_length=128)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    email: str
    is_guest: bool = False


# ---------- Family profiles ----------


class ProfileIn(BaseModel):
    name: Name
    relation: Relation
    birth_year: int | None = Field(default=None, ge=1900, le=2100)
    sex: Literal["female", "male", "other"] | None = None


class ProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    relation: Relation
    birth_year: int | None
    sex: str | None
    is_sample: bool = False
    report_count: int = 0
    last_report_date: date | None = None


class ProfileRef(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str


class MoveReport(BaseModel):
    profile_id: str


# ---------- Reports ----------


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
    profile_id: str
    created_at: datetime


class ReportDetail(ReportSummary):
    patient_age: str | None
    patient_sex: str | None
    profile: ProfileRef
    results: list[TestResultOut]

    @computed_field
    @property
    def name_matches_profile(self) -> bool | None:
        """False when the name printed on the report looks like someone else's."""
        return names_match(self.profile.name, self.patient_name)

    @computed_field
    @property
    def out_of_range(self) -> int:
        return sum(r.flag in (Flag.low, Flag.high, Flag.abnormal) for r in self.results)


class TimelineSummary(BaseModel):
    profile_id: str
    name: str
    relation: Relation
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
    profile: TimelineSummary
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
    profile_id: str


class ExplanationRequest(BaseModel):
    language: Literal["en", "hi", "mr"] = "en"
