from datetime import timedelta
from functools import lru_cache
from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from sqlalchemy import select

from app.api.deps import SessionDep, StorageDep
from app.config import Settings, get_settings
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
from app.services.guests import create_guest, delete_user_files, purge_expired_guests
from app.services.ratelimit import RateLimiter, client_ip

router = APIRouter(prefix="/api/auth", tags=["auth"])


class Limiters:
    """How often one address may try to sign in or start a demo, and how many demos in total."""

    def __init__(self, settings: Settings):
        self.auth = RateLimiter(settings.auth_per_ip_per_10min, 600)
        self.demo_per_ip = RateLimiter(settings.demo_per_ip_per_hour, 3600)
        self.demo_total = RateLimiter(settings.demo_per_hour, 3600)


@lru_cache
def get_limiters() -> Limiters:
    return Limiters(get_settings())


LimitersDep = Annotated[Limiters, Depends(get_limiters)]


@router.post("/signup", status_code=status.HTTP_201_CREATED, response_model=UserOut)
def signup(
    body: SignupIn,
    request: Request,
    response: Response,
    session: SessionDep,
    settings: SettingsDep,
    limiters: LimitersDep,
) -> User:
    limiters.auth.check(client_ip(request))
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
def login(
    body: LoginIn,
    request: Request,
    response: Response,
    session: SessionDep,
    settings: SettingsDep,
    limiters: LimitersDep,
) -> User:
    limiters.auth.check(client_ip(request))
    user = session.scalar(select(User).where(User.email == body.email))
    try:
        user = authenticate(session, user, body.password, settings)
    except AuthError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, str(exc)) from exc
    start_session(session, user, response, settings)
    return user


@router.post("/demo", status_code=status.HTTP_201_CREATED, response_model=UserOut)
def start_demo(
    request: Request,
    response: Response,
    session: SessionDep,
    storage: StorageDep,
    settings: SettingsDep,
    limiters: LimitersDep,
) -> User:
    """Signs the visitor in to a fresh demo account that already holds the sample reports."""
    busy = "The demo is busy right now. Please try again in a little while."
    limiters.demo_per_ip.check(client_ip(request), "You've started several demos already. Try again later.")
    limiters.demo_total.check("all", busy)
    # Tidy up yesterday's demos while we're here, so the database never fills with them.
    purge_expired_guests(session, storage, settings.guest_hours)
    user = create_guest(session, storage)
    start_session(session, user, response, settings, lifetime=timedelta(hours=settings.guest_hours))
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
    delete_user_files(user, storage)
    end_session(session, rs_session, response)
    session.delete(user)
    session.commit()
