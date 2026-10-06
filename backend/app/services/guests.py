"""One-click demo accounts.

"Try the demo" makes a throwaway account with the sample person already in it, so a
visitor sees the whole product without inventing an email and password. The account
has no password anyone knows, and it is deleted (with its files) after a day.
"""

import logging
import secrets
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import User
from app.services.auth import hash_password
from app.services.samples import add_sample_profile
from app.services.storage import Storage

log = logging.getLogger(__name__)

GUEST_NAME = "Guest"
# .invalid is reserved for addresses that can never exist (RFC 2606), so no email is ever sent.
GUEST_DOMAIN = "guest.reportsaathi.invalid"


def create_guest(session: Session, storage: Storage) -> User:
    user = User(
        email=f"guest-{uuid.uuid4().hex}@{GUEST_DOMAIN}",
        name=GUEST_NAME,
        # A random password nobody is told: the only way in is the session cookie.
        password_hash=hash_password(secrets.token_urlsafe(32)),
        is_guest=True,
    )
    session.add(user)
    add_sample_profile(session, user, storage)
    session.commit()
    return user


def delete_user_files(user: User, storage: Storage) -> None:
    for profile in user.profiles:
        for report in profile.reports:
            if report.storage_key:
                storage.delete(report.storage_key)


def purge_expired_guests(session: Session, storage: Storage, hours: int) -> int:
    """Deletes demo accounts older than `hours`, with everything in them. Returns how many."""
    cutoff = datetime.now(UTC) - timedelta(hours=hours)
    expired = list(session.scalars(select(User).where(User.is_guest, User.created_at < cutoff)))
    for user in expired:
        delete_user_files(user, storage)
        session.delete(user)
    session.commit()
    if expired:
        log.info("Deleted %d expired demo accounts", len(expired))
    return len(expired)
