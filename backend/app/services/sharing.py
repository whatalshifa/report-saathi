"""Doctor share links: a read-only link to one brief that a doctor opens without an account.

- The link carries a random token (32 bytes, as for sign-in sessions). Only its SHA-256
  hash is stored, so the link is shown once, when it is made.
- A link works for a week. A demo account's links stop when the account is deleted, so a
  link never outlives the data it points to.
- Every opening is logged (only the time), so the owner can see whether the doctor looked.
"""

import secrets
from datetime import UTC, datetime, timedelta
from typing import Literal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import Settings
from app.models import Brief, JobStatus, ShareLink, ShareView, User
from app.services.auth import as_utc, hash_token

ShareState = Literal["active", "expired", "revoked"]


def _now() -> datetime:
    return datetime.now(UTC)


def link_expiry(user: User, settings: Settings, now: datetime | None = None) -> datetime:
    now = now or _now()
    expires = now + timedelta(days=settings.share_days)
    if user.is_guest:
        expires = min(expires, as_utc(user.created_at) + timedelta(hours=settings.guest_hours))
    return expires


def create_share(session: Session, user: User, brief: Brief, settings: Settings) -> tuple[ShareLink, str]:
    """Makes a link to a finished brief. Returns the link and its token, which is not stored."""
    token = secrets.token_urlsafe(32)
    link = ShareLink(
        profile_id=brief.profile_id,
        brief_id=brief.id,
        token_hash=hash_token(token),
        expires_at=link_expiry(user, settings),
    )
    session.add(link)
    session.commit()
    return link, token


def share_state(link: ShareLink, now: datetime | None = None) -> ShareState:
    if link.revoked_at is not None:
        return "revoked"
    if as_utc(link.expires_at) <= (now or _now()):
        return "expired"
    return "active"


def open_share(session: Session, token: str) -> ShareLink | None:
    """The link for a working token, with the visit logged; None for anything else.

    Unknown, expired and revoked links all give None, so the caller can answer them the same.
    """
    link = session.scalar(select(ShareLink).where(ShareLink.token_hash == hash_token(token)))
    if link is None or share_state(link) != "active":
        return None
    brief = link.brief
    if brief.status != JobStatus.done or not brief.content:
        return None
    session.add(ShareView(share_id=link.id))
    session.commit()
    return link
