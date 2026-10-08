"""Sign up, sign in, and who is making this request.

- Passwords are hashed with Argon2id, the current OWASP recommendation. The
  hash is slow on purpose, so a stolen database can't be cracked quickly.
- Signing in creates a random session token. The browser keeps it in an
  HttpOnly cookie (JavaScript can't read it, so a script injected into the
  page can't steal it). The database keeps only its SHA-256 hash.
- Five wrong passwords in a row lock the account for 15 minutes, which stops
  someone guessing passwords one after another.
"""

import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from typing import Annotated

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError
from fastapi import Cookie, Depends, HTTPException, Response, status
from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.db import get_session
from app.models import AuthSession, User

COOKIE_NAME = "rs_session"

_hasher = PasswordHasher()
# Checked against when the email is unknown, so a wrong email takes as long as a wrong password
# and the response time doesn't reveal who has an account.
_DUMMY_HASH = _hasher.hash("not-a-real-password")


class AuthError(Exception):
    pass


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _now() -> datetime:
    return datetime.now(UTC)


def as_utc(moment: datetime) -> datetime:
    # SQLite hands datetimes back without a timezone; they were stored as UTC.
    return moment if moment.tzinfo else moment.replace(tzinfo=UTC)


def authenticate(session: Session, user: User | None, password: str, settings: Settings) -> User:
    if user is None:
        try:
            _hasher.verify(_DUMMY_HASH, password)
        except VerifyMismatchError:
            pass
        raise AuthError("Wrong email or password")

    if user.locked_until and as_utc(user.locked_until) > _now():
        raise AuthError("Too many wrong passwords. Try again in a few minutes.")

    try:
        _hasher.verify(user.password_hash, password)
    except (VerifyMismatchError, InvalidHashError) as exc:
        user.failed_logins += 1
        if user.failed_logins >= settings.max_failed_logins:
            user.failed_logins = 0
            user.locked_until = _now() + timedelta(minutes=settings.lockout_minutes)
        session.commit()
        raise AuthError("Wrong email or password") from exc

    user.failed_logins, user.locked_until = 0, None
    if _hasher.check_needs_rehash(user.password_hash):
        user.password_hash = hash_password(password)
    session.commit()
    return user


def start_session(
    session: Session,
    user: User,
    response: Response,
    settings: Settings,
    lifetime: timedelta | None = None,
) -> None:
    lifetime = lifetime or timedelta(days=settings.session_days)
    token = secrets.token_urlsafe(32)
    expires = _now() + lifetime
    session.add(AuthSession(token_hash=hash_token(token), user_id=user.id, expires_at=expires))
    # Tidy up this user's expired sessions while we're here.
    session.execute(
        delete(AuthSession).where(AuthSession.user_id == user.id, AuthSession.expires_at < _now())
    )
    session.commit()
    response.set_cookie(
        COOKIE_NAME,
        token,
        max_age=int(lifetime.total_seconds()),
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",  # not sent on cross-site form posts, which blocks CSRF
        path="/",
    )


def end_session(session: Session, token: str | None, response: Response) -> None:
    if token:
        session.execute(delete(AuthSession).where(AuthSession.token_hash == hash_token(token)))
        session.commit()
    response.delete_cookie(COOKIE_NAME, path="/")


def current_user(
    session: Annotated[Session, Depends(get_session)],
    rs_session: Annotated[str | None, Cookie()] = None,
) -> User:
    """FastAPI dependency: the signed-in user, or a 401."""
    if rs_session:
        auth = session.get(AuthSession, hash_token(rs_session))
        if auth is not None and as_utc(auth.expires_at) > _now():
            return auth.user
    raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Please sign in")


CurrentUser = Annotated[User, Depends(current_user)]
SettingsDep = Annotated[Settings, Depends(get_settings)]
