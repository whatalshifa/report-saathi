"""Shared request dependencies, and the ownership checks every endpoint uses.

Something that belongs to another account answers 404, exactly like something
that doesn't exist, so nobody can probe for other people's report ids.
"""

from typing import Annotated

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session, sessionmaker

from app.db import get_session, get_session_factory
from app.models import Brief, Profile, Report, User
from app.services.storage import Storage, get_storage
from app.services.writing import Writer, get_writer

SessionDep = Annotated[Session, Depends(get_session)]
StorageDep = Annotated[Storage, Depends(get_storage)]
FactoryDep = Annotated[sessionmaker[Session], Depends(get_session_factory)]
WriterDep = Annotated[Writer, Depends(get_writer)]


def _not_found(what: str) -> HTTPException:
    return HTTPException(status.HTTP_404_NOT_FOUND, f"{what} not found")


def owned_profile(session: Session, user: User, profile_id: str) -> Profile:
    profile = session.get(Profile, profile_id)
    if profile is None or profile.user_id != user.id:
        raise _not_found("Profile")
    return profile


def owned_report(session: Session, user: User, report_id: str) -> Report:
    report = session.get(Report, report_id)
    if report is None or report.profile.user_id != user.id:
        raise _not_found("Report")
    return report


def owned_brief(session: Session, user: User, brief_id: str) -> Brief:
    brief = session.get(Brief, brief_id)
    if brief is None or session.get(Profile, brief.profile_id).user_id != user.id:
        raise _not_found("Brief")
    return brief
