from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from app.db import get_session, get_session_factory
from app.models import Brief, Report, ReportStatus
from app.schemas import BriefOut, PersonSummary, Trends
from app.services.jobs import run_brief
from app.services.trends import build_trends, list_people
from app.services.writing import Writer, get_writer

router = APIRouter(prefix="/api", tags=["people"])

SessionDep = Annotated[Session, Depends(get_session)]


@router.get("/people", response_model=list[PersonSummary])
def people(session: SessionDep) -> list[PersonSummary]:
    return list_people(session)


@router.get("/people/{person_key}/trends", response_model=Trends)
def trends(person_key: str, session: SessionDep) -> Trends:
    result = build_trends(session, person_key)
    if result is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No finished reports for this person")
    return result


@router.post("/people/{person_key}/briefs", status_code=status.HTTP_202_ACCEPTED, response_model=BriefOut)
def request_brief(
    person_key: str,
    background: BackgroundTasks,
    session: SessionDep,
    factory: Annotated[sessionmaker[Session], Depends(get_session_factory)],
    writer: Annotated[Writer, Depends(get_writer)],
) -> Brief:
    """Start a fresh doctor brief from everything on file for this person."""
    has_reports = session.scalar(
        select(Report.id).where(Report.person_key == person_key, Report.status == ReportStatus.done).limit(1)
    )
    if has_reports is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No finished reports for this person")
    brief = Brief(person_key=person_key)
    session.add(brief)
    session.commit()
    background.add_task(run_brief, brief.id, factory, writer)
    return brief


@router.get("/briefs/{brief_id}", response_model=BriefOut)
def get_brief(brief_id: str, session: SessionDep) -> Brief:
    brief = session.get(Brief, brief_id)
    if brief is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Brief not found")
    return brief
