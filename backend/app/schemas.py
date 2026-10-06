"""The JSON shapes the API sends back to the web app."""

import re
from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, StringConstraints, computed_field

from app.models import Flag, Relation, ReportStatus
from app.services.consent import CONSENT_VERSION
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
    # Which data notice the person agreed to before uploading, and when; empty until they do.
    consent_version: str | None = None
    consented_at: datetime | None = None

    @computed_field
    @property
    def needs_consent(self) -> bool:
        """True until the person agrees to the current notice; the web app asks before an upload."""
        return self.consent_version != CONSENT_VERSION


class ConsentIn(BaseModel):
    # The notice version the person was shown, so agreeing to an old copy of the page counts for nothing.
    version: str = Field(max_length=20)


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


class SourceBoxOut(BaseModel):
    """Where a value is printed on the original: a page, and edges as fractions of that page."""

    page: int
    x0: float
    y0: float
    x1: float
    y1: float


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
    # Filled in when the person fixed a misread value: when, and what the AI first read.
    corrected_at: datetime | None = None
    original_value_text: str | None = None
    original_unit: str | None = None
    # Where the value is printed in the original file, for "where did this number come from?".
    box: SourceBoxOut | None = None

    @computed_field
    @property
    def corrected(self) -> bool:
        return self.corrected_at is not None


class ResultCorrection(BaseModel):
    """A value fixed by hand. Leaving `unit` out keeps the unit as it was; null or "" clears it.

    Only types are checked here; the service checks the rest, with messages meant for people.
    """

    value_text: str
    unit: str | None = None


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
    content_type: str  # the original file's type, so the page knows how to show it
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


# ---------- Doctor share links ----------


class ShareOut(BaseModel):
    """A link as its owner sees it later: never the token, which only the person who made it has."""

    id: str
    brief_id: str
    created_at: datetime
    expires_at: datetime
    revoked_at: datetime | None
    state: Literal["active", "expired", "revoked"]
    view_count: int
    last_viewed_at: datetime | None


class ShareCreated(ShareOut):
    token: str  # shown once; only its hash is kept


class SharedBrief(BaseModel):
    """What a doctor sees: the brief's content, and nothing that leads back into the account."""

    content: dict
    created_at: datetime
    expires_at: datetime
