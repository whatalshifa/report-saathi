"""Database tables.

A User signs in and owns Profiles: themselves and family members they look after.
Every Report belongs to one Profile. A Session is one signed-in browser.

A Report is one uploaded file. Each Report has many TestResults, one per value
printed on it (Haemoglobin, TSH, Vitamin D, ...). A Correction logs a value
the person fixed because it was misread. An Explanation is the
plain-language reading of one report in one language, and a Brief is the
summary of one profile's reports written for their doctor. A ShareLink lets a
doctor open one brief without an account, and a ShareView logs each opening.
"""

import enum
import uuid
from datetime import UTC, date, datetime

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    false,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def _now() -> datetime:
    return datetime.now(UTC)


class ReportStatus(enum.StrEnum):
    queued = "queued"
    processing = "processing"
    done = "done"
    failed = "failed"


# AI jobs (explanations, briefs) move through the same steps as a report.
JobStatus = ReportStatus


class Flag(enum.StrEnum):
    low = "low"
    high = "high"
    normal = "normal"
    abnormal = "abnormal"  # a word result that differs from the expected one, e.g. "Positive"
    unknown = "unknown"  # no usable reference range on the report


class Relation(enum.StrEnum):
    self = "self"
    spouse = "spouse"
    parent = "parent"
    child = "child"
    sibling = "sibling"
    grandparent = "grandparent"
    other = "other"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(254), unique=True)  # stored lowercased
    name: Mapped[str] = mapped_column(String(100))
    password_hash: Mapped[str] = mapped_column(String(255))
    failed_logins: Mapped[int] = mapped_column(Integer, default=0)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # A one-click demo account: no real email or password, deleted after a day.
    is_guest: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    # Which version of the "how we look after your reports" notice the person agreed to, and when.
    # Asked before the first upload; empty for accounts that haven't uploaded since it was added.
    consent_version: Mapped[str | None] = mapped_column(String(20))
    consented_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    profiles: Mapped[list["Profile"]] = relationship(
        back_populates="user", cascade="all, delete-orphan", order_by="Profile.created_at"
    )
    sessions: Mapped[list["AuthSession"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class AuthSession(Base):
    """One signed-in browser. Only a hash of the cookie's token is stored, so a leaked
    database can't be used to sign in."""

    __tablename__ = "sessions"

    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    user: Mapped[User] = relationship(back_populates="sessions")


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(100))
    relation: Mapped[Relation] = mapped_column(Enum(Relation, native_enum=False, length=20))
    birth_year: Mapped[int | None] = mapped_column(Integer)
    sex: Mapped[str | None] = mapped_column(String(20))
    # A ready-made example person with pre-read reports, so the app can be tried without an upload.
    is_sample: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    user: Mapped[User] = relationship(back_populates="profiles")
    reports: Mapped[list["Report"]] = relationship(back_populates="profile", cascade="all, delete-orphan")
    briefs: Mapped[list["Brief"]] = relationship(cascade="all, delete-orphan")
    # The database deletes these with the profile (or the brief); no need to load them first.
    shares: Mapped[list["ShareLink"]] = relationship(cascade="all, delete-orphan", passive_deletes=True)


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    profile_id: Mapped[str] = mapped_column(ForeignKey("profiles.id", ondelete="CASCADE"), index=True)
    filename: Mapped[str] = mapped_column(String(255))
    content_type: Mapped[str] = mapped_column(String(100))
    storage_key: Mapped[str] = mapped_column(String(255))
    # One of the ready-made example reports: not read by the AI, so not counted against upload limits.
    is_sample: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    status: Mapped[ReportStatus] = mapped_column(
        Enum(ReportStatus, native_enum=False, length=20), default=ReportStatus.queued
    )
    error: Mapped[str | None] = mapped_column(Text)

    # Filled in by the extraction step.
    lab_name: Mapped[str | None] = mapped_column(String(255))
    patient_name: Mapped[str | None] = mapped_column(String(255))
    patient_age: Mapped[str | None] = mapped_column(String(50))
    patient_sex: Mapped[str | None] = mapped_column(String(20))
    report_date: Mapped[date | None] = mapped_column(Date)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    results: Mapped[list["TestResult"]] = relationship(
        back_populates="report", cascade="all, delete-orphan", order_by="TestResult.position"
    )
    explanations: Mapped[list["Explanation"]] = relationship(cascade="all, delete-orphan")
    profile: Mapped[Profile] = relationship(back_populates="reports")


class TestResult(Base):
    __tablename__ = "test_results"
    __test__ = False  # stop pytest from treating this class as a test

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    report_id: Mapped[str] = mapped_column(ForeignKey("reports.id", ondelete="CASCADE"), index=True)
    position: Mapped[int] = mapped_column(Integer)

    section: Mapped[str | None] = mapped_column(String(255))
    name: Mapped[str] = mapped_column(String(255))
    value_text: Mapped[str] = mapped_column(String(255))
    value: Mapped[float | None] = mapped_column(Float)
    unit: Mapped[str | None] = mapped_column(String(50))
    reference_text: Mapped[str | None] = mapped_column(String(255))
    ref_low: Mapped[float | None] = mapped_column(Float)
    ref_high: Mapped[float | None] = mapped_column(Float)
    lab_flag: Mapped[str | None] = mapped_column(String(20))
    flag: Mapped[Flag] = mapped_column(Enum(Flag, native_enum=False, length=20))
    # Where ref_low/ref_high came from: "lab" (printed on the report) or "typical" (a typical adult
    # range from the catalog, used only when the report printed none). None when there is no range.
    range_source: Mapped[str | None] = mapped_column(String(10))

    # The same value in the catalog's standard unit, so different labs line up.
    catalog_key: Mapped[str | None] = mapped_column(String(50), index=True)
    std_value: Mapped[float | None] = mapped_column(Float)
    std_low: Mapped[float | None] = mapped_column(Float)
    std_high: Mapped[float | None] = mapped_column(Float)

    # Where the value is printed in the original file: {"page": 1, "x0": .., "y0": .., "x1": .., "y1": ..},
    # each edge a fraction of the page. None when the AI couldn't say, and for reports read before Phase 5.
    box: Mapped[dict | None] = mapped_column(JSON)

    # Set when the person fixed a misread value. The first reading is kept so the page can say
    # what it was read as; every fix is also logged in Correction.
    corrected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    original_value_text: Mapped[str | None] = mapped_column(String(255))
    original_unit: Mapped[str | None] = mapped_column(String(50))

    report: Mapped[Report] = relationship(back_populates="results")


class Correction(Base):
    """One fix a person made to a value the AI misread, kept so it can become an accuracy test case.

    Deleted with the value (and so with the report, profile or account), like everything else.
    """

    __tablename__ = "corrections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    result_id: Mapped[int] = mapped_column(ForeignKey("test_results.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    old_value_text: Mapped[str] = mapped_column(String(255))
    old_value: Mapped[float | None] = mapped_column(Float)
    old_unit: Mapped[str | None] = mapped_column(String(50))
    new_value_text: Mapped[str] = mapped_column(String(255))
    new_value: Mapped[float | None] = mapped_column(Float)
    new_unit: Mapped[str | None] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Explanation(Base):
    __tablename__ = "explanations"
    __table_args__ = (UniqueConstraint("report_id", "language"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    report_id: Mapped[str] = mapped_column(ForeignKey("reports.id", ondelete="CASCADE"), index=True)
    language: Mapped[str] = mapped_column(String(5))
    status: Mapped[JobStatus] = mapped_column(
        Enum(JobStatus, native_enum=False, length=20), default=JobStatus.queued
    )
    content: Mapped[dict | None] = mapped_column(JSON)
    error: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)


class Brief(Base):
    __tablename__ = "briefs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    profile_id: Mapped[str] = mapped_column(ForeignKey("profiles.id", ondelete="CASCADE"), index=True)
    status: Mapped[JobStatus] = mapped_column(
        Enum(JobStatus, native_enum=False, length=20), default=JobStatus.queued
    )
    content: Mapped[dict | None] = mapped_column(JSON)
    error: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)


class ShareLink(Base):
    """A link that lets a doctor read one brief without signing in.

    Like a sign-in session, only a hash of the link's token is stored, so a leaked database
    can't be used to open anyone's brief. Revoking keeps the row, so the opening log survives.
    """

    __tablename__ = "share_links"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    profile_id: Mapped[str] = mapped_column(ForeignKey("profiles.id", ondelete="CASCADE"), index=True)
    brief_id: Mapped[str] = mapped_column(ForeignKey("briefs.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    brief: Mapped[Brief] = relationship()


class ShareView(Base):
    """One time a share link was opened. No address or browser details are kept."""

    __tablename__ = "share_views"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    share_id: Mapped[str] = mapped_column(ForeignKey("share_links.id", ondelete="CASCADE"), index=True)
    viewed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
