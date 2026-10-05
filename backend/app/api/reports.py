import uuid
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from app.config import Settings, get_settings
from app.db import get_session, get_session_factory
from app.models import Report
from app.schemas import ReportDetail, ReportSummary
from app.services.extraction import Extractor, get_extractor
from app.services.processing import process_report
from app.services.storage import Storage, get_storage
from app.services.uploads import UploadError, prepare_upload

router = APIRouter(prefix="/api/reports", tags=["reports"])

SessionDep = Annotated[Session, Depends(get_session)]
StorageDep = Annotated[Storage, Depends(get_storage)]

_EXTENSIONS = {"application/pdf": "pdf", "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp"}


def _get_report(session: Session, report_id: str) -> Report:
    report = session.get(Report, report_id)
    if report is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Report not found")
    return report


@router.post("", status_code=status.HTTP_202_ACCEPTED, response_model=ReportDetail)
def upload_report(
    file: UploadFile,
    background: BackgroundTasks,
    session: SessionDep,
    storage: StorageDep,
    factory: Annotated[sessionmaker[Session], Depends(get_session_factory)],
    extractor: Annotated[Extractor, Depends(get_extractor)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> Report:
    max_bytes = settings.max_upload_mb * 1_000_000
    try:
        data, content_type = prepare_upload(file.file.read(max_bytes + 1), max_bytes)
    except UploadError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from exc

    report_id = str(uuid.uuid4())
    storage_key = f"{report_id}.{_EXTENSIONS[content_type]}"
    storage.save(storage_key, data)

    report = Report(
        id=report_id,
        filename=(file.filename or "report")[:255],
        content_type=content_type,
        storage_key=storage_key,
    )
    session.add(report)
    session.commit()

    # Reading happens after the response is sent; the web app polls for the result.
    background.add_task(process_report, report_id, factory, storage, extractor)
    return report


@router.get("", response_model=list[ReportSummary])
def list_reports(session: SessionDep) -> list[Report]:
    return list(session.scalars(select(Report).order_by(Report.created_at.desc())))


@router.get("/{report_id}", response_model=ReportDetail)
def get_report(report_id: str, session: SessionDep) -> Report:
    return _get_report(session, report_id)


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_report(report_id: str, session: SessionDep, storage: StorageDep) -> None:
    report = _get_report(session, report_id)
    storage.delete(report.storage_key)
    session.delete(report)
    session.commit()
