"""Database tables.

A Report is one uploaded file. Each Report has many TestResults, one per value
printed on it (Haemoglobin, TSH, Vitamin D, ...). An Explanation is the
plain-language reading of one report in one language, and a Brief is the
summary of one person's reports written for their doctor.
"""

import enum
import uuid
from datetime import UTC, date, datetime

from sqlalchemy import JSON, Date, DateTime, Enum, Float, ForeignKey, Integer, String, Text, UniqueConstraint
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


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    filename: Mapped[str] = mapped_column(String(255))
    content_type: Mapped[str] = mapped_column(String(100))
    storage_key: Mapped[str] = mapped_column(String(255))
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
    # Groups one person's reports into a timeline. Phase 3 replaces this with family profiles.
    person_key: Mapped[str | None] = mapped_column(String(255), index=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    results: Mapped[list["TestResult"]] = relationship(
        back_populates="report", cascade="all, delete-orphan", order_by="TestResult.position"
    )
    explanations: Mapped[list["Explanation"]] = relationship(cascade="all, delete-orphan")


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

    # The same value in the catalog's standard unit, so different labs line up.
    catalog_key: Mapped[str | None] = mapped_column(String(50), index=True)
    std_value: Mapped[float | None] = mapped_column(Float)
    std_low: Mapped[float | None] = mapped_column(Float)
    std_high: Mapped[float | None] = mapped_column(Float)

    report: Mapped[Report] = relationship(back_populates="results")


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
    person_key: Mapped[str] = mapped_column(String(255), index=True)
    status: Mapped[JobStatus] = mapped_column(
        Enum(JobStatus, native_enum=False, length=20), default=JobStatus.queued
    )
    content: Mapped[dict | None] = mapped_column(JSON)
    error: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)
