from typing import Annotated

from fastapi import APIRouter, Cookie, HTTPException, Response, status
from sqlalchemy import select

from app.api.deps import SessionDep, StorageDep
from app.models import Profile, Relation, User
from app.schemas import LoginIn, SignupIn, UserOut
from app.services.auth import (
    AuthError,
    CurrentUser,
    SettingsDep,
    authenticate,
    end_session,
    hash_password,
    start_session,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signup", status_code=status.HTTP_201_CREATED, response_model=UserOut)
def signup(body: SignupIn, response: Response, session: SessionDep, settings: SettingsDep) -> User:
    if session.scalar(select(User.id).where(User.email == body.email)):
        raise HTTPException(
            status.HTTP_409_CONFLICT, "An account with this email already exists. Sign in instead."
        )
    user = User(email=body.email, name=body.name, password_hash=hash_password(body.password))
    # Everyone starts with a profile for themselves; family members are added later.
    user.profiles.append(Profile(name=body.name, relation=Relation.self))
    session.add(user)
    session.commit()
    start_session(session, user, response, settings)
    return user


@router.post("/login", response_model=UserOut)
def login(body: LoginIn, response: Response, session: SessionDep, settings: SettingsDep) -> User:
    user = session.scalar(select(User).where(User.email == body.email))
    try:
        user = authenticate(session, user, body.password, settings)
    except AuthError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, str(exc)) from exc
    start_session(session, user, response, settings)
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    response: Response, session: SessionDep, rs_session: Annotated[str | None, Cookie()] = None
) -> None:
    end_session(session, rs_session, response)


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser) -> User:
    return user


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(
    user: CurrentUser,
    response: Response,
    session: SessionDep,
    storage: StorageDep,
    rs_session: Annotated[str | None, Cookie()] = None,
) -> None:
    """Delete the account and everything in it: profiles, reports, files, explanations, briefs."""
    for profile in user.profiles:
        for report in profile.reports:
            storage.delete(report.storage_key)
    end_session(session, rs_session, response)
    session.delete(user)
    session.commit()
