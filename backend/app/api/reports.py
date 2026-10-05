import uuid
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, Form, HTTPException, UploadFile, status
from sqlalchemy import select

from app.api.deps import FactoryDep, SessionDep, StorageDep, WriterDep, owned_profile, owned_report
from app.config import Settings, get_settings
from app.models import Explanation, JobStatus, Profile, Report
from app.schemas import ExplanationOut, ExplanationRequest, MoveReport, ReportDetail, ReportSummary
from app.services.auth import CurrentUser
from app.services.extraction import Extractor, get_extractor
from app.services.jobs import run_explanation
from app.services.processing import process_report
from app.services.uploads import UploadError, prepare_upload

router = APIRouter(prefix="/api/reports", tags=["reports"])

_EXTENSIONS = {"application/pdf": "pdf", "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp"}


@router.post("", status_code=status.HTTP_202_ACCEPTED, response_model=ReportDetail)
def upload_report(
    file: UploadFile,
    profile_id: Annotated[str, Form()],
    user: CurrentUser,
    background: BackgroundTasks,
    session: SessionDep,
    storage: StorageDep,
    factory: FactoryDep,
    extractor: Annotated[Extractor, Depends(get_extractor)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> Report:
    profile = owned_profile(session, user, profile_id)
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
        profile=profile,
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
def list_reports(user: CurrentUser, session: SessionDep, profile_id: str | None = None) -> list[Report]:
    query = select(Report).join(Profile).where(Profile.user_id == user.id).order_by(Report.created_at.desc())
    if profile_id is not None:
        query = query.where(Report.profile_id == profile_id)
    return list(session.scalars(query))


@router.get("/{report_id}", response_model=ReportDetail)
def get_report(report_id: str, user: CurrentUser, session: SessionDep) -> Report:
    return owned_report(session, user, report_id)


@router.patch("/{report_id}", response_model=ReportDetail)
def move_report(report_id: str, body: MoveReport, user: CurrentUser, session: SessionDep) -> Report:
    """File a report under a different profile, e.g. when it was uploaded to the wrong person."""
    report = owned_report(session, user, report_id)
    report.profile = owned_profile(session, user, body.profile_id)
    session.commit()
    return report


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_report(report_id: str, user: CurrentUser, session: SessionDep, storage: StorageDep) -> None:
    report = owned_report(session, user, report_id)
    storage.delete(report.storage_key)
    session.delete(report)
    session.commit()


@router.post("/{report_id}/explanations", status_code=status.HTTP_202_ACCEPTED, response_model=ExplanationOut)
def request_explanation(
    report_id: str,
    body: ExplanationRequest,
    user: CurrentUser,
    background: BackgroundTasks,
    session: SessionDep,
    factory: FactoryDep,
    writer: WriterDep,
) -> Explanation:
    """Start writing a plain-language explanation, or return the one already made."""
    report = owned_report(session, user, report_id)
    if report.status != JobStatus.done:
        raise HTTPException(status.HTTP_409_CONFLICT, "This report hasn't been read yet")

    explanation = session.scalar(
        select(Explanation).where(Explanation.report_id == report_id, Explanation.language == body.language)
    )
    if explanation is not None and explanation.status != JobStatus.failed:
        return explanation
    if explanation is None:
        explanation = Explanation(report_id=report_id, language=body.language)
        session.add(explanation)
    explanation.status, explanation.error = JobStatus.queued, None
    session.commit()

    background.add_task(run_explanation, explanation.id, factory, writer)
    return explanation


@router.get("/{report_id}/explanations/{language}", response_model=ExplanationOut)
def get_explanation(report_id: str, language: str, user: CurrentUser, session: SessionDep) -> Explanation:
    owned_report(session, user, report_id)
    explanation = session.scalar(
        select(Explanation).where(Explanation.report_id == report_id, Explanation.language == language)
    )
    if explanation is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No explanation yet")
    return explanation
