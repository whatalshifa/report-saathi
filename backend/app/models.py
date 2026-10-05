"""Database tables.

A Report is one uploaded file. Each Report has many TestResults, one per value
printed on it (Haemoglobin, TSH, Vitamin D, ...).
"""

import enum
import uuid
from datetime import UTC, date, datetime

from sqlalchemy import Date, DateTime, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def _now() -> datetime:
    return datetime.now(UTC)


class ReportStatus(enum.StrEnum):
    queued = "queued"
    processing = "processing"
    done = "done"
    failed = "failed"


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

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    results: Mapped[list["TestResult"]] = relationship(
        back_populates="report", cascade="all, delete-orphan", order_by="TestResult.position"
    )


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

    report: Mapped[Report] = relationship(back_populates="results")
