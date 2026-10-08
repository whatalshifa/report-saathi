"""Doctor share links: made and revoked by the owner, opened by anyone who has the link."""

import copy
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import func, select

from app.api.auth import LimitersDep
from app.api.deps import SessionDep, owned_brief, owned_profile
from app.config import Settings, get_settings
from app.models import Brief, JobStatus, Profile, ShareLink, ShareView
from app.schemas import OpenShared, ShareCreated, SharedBrief, ShareOut
from app.services.auth import CurrentUser, as_utc
from app.services.ratelimit import client_ip
from app.services.sharing import create_share, open_share, share_state

router = APIRouter(prefix="/api", tags=["shares"])

# Enough for several doctors and a few mistakes, without letting one account mint links forever.
MAX_ACTIVE_LINKS = 20

# A shared brief is health data: no browser or proxy may keep a copy, and the link (which is the
# key) must not leak to other sites through the Referer header.
PRIVATE_HEADERS = {"Cache-Control": "no-store", "Referrer-Policy": "no-referrer"}
# One answer for unknown, expired and revoked links, so nobody can tell which a token was.
GONE = "This link has expired or was turned off. Ask the person who sent it for a new one."


def _out(link: ShareLink, view_count: int = 0, last_viewed=None) -> ShareOut:
    return ShareOut(
        id=link.id,
        brief_id=link.brief_id,
        created_at=as_utc(link.created_at),
        expires_at=as_utc(link.expires_at),
        revoked_at=as_utc(link.revoked_at) if link.revoked_at else None,
        state=share_state(link),
        view_count=view_count,
        last_viewed_at=as_utc(last_viewed) if last_viewed else None,
    )


@router.post("/briefs/{brief_id}/shares", status_code=status.HTTP_201_CREATED, response_model=ShareCreated)
def make_share(
    brief_id: str,
    user: CurrentUser,
    session: SessionDep,
    settings: Annotated[Settings, Depends(get_settings)],
) -> ShareCreated:
    brief = owned_brief(session, user, brief_id)
    if brief.status != JobStatus.done or not brief.content:
        raise HTTPException(status.HTTP_409_CONFLICT, "This brief isn't ready yet")
    links = session.scalars(select(ShareLink).where(ShareLink.profile_id == brief.profile_id))
    if sum(share_state(link) == "active" for link in links) >= MAX_ACTIVE_LINKS:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"You have {MAX_ACTIVE_LINKS} links open already. Turn off one you no longer need.",
        )
    link, token = create_share(session, user, brief, settings)
    return ShareCreated(**_out(link).model_dump(), token=token)


@router.get("/profiles/{profile_id}/shares", response_model=list[ShareOut])
def list_shares(profile_id: str, user: CurrentUser, session: SessionDep) -> list[ShareOut]:
    """Every link made for this person, newest first, with how often each was opened."""
    profile = owned_profile(session, user, profile_id)
    views = {
        row.share_id: (row.views, row.last)
        for row in session.execute(
            select(
                ShareView.share_id, func.count().label("views"), func.max(ShareView.viewed_at).label("last")
            )
            .join(ShareLink)
            .where(ShareLink.profile_id == profile.id)
            .group_by(ShareView.share_id)
        )
    }
    links = session.scalars(
        select(ShareLink).where(ShareLink.profile_id == profile.id).order_by(ShareLink.created_at.desc())
    )
    return [_out(link, *views.get(link.id, (0, None))) for link in links]


@router.delete("/shares/{share_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_share(share_id: str, user: CurrentUser, session: SessionDep) -> None:
    """Turns the link off for good. The row stays, so the owner still sees who opened it."""
    link = session.get(ShareLink, share_id)
    if link is None or session.get(Profile, link.profile_id).user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Link not found")
    if link.revoked_at is None:
        link.revoked_at = datetime.now(UTC)
        session.commit()


def _for_doctor(brief: Brief) -> dict:
    """The brief without the account's internal ids, which a doctor has no use for."""
    content = copy.deepcopy(brief.content)
    snapshot = content.get("snapshot") or {}
    (snapshot.get("profile") or {}).pop("profile_id", None)
    for series in snapshot.get("series") or []:
        for point in series.get("points") or []:
            point.pop("report_id", None)
    return content


@router.post("/shared", response_model=SharedBrief)
def open_shared(
    body: OpenShared, request: Request, response: Response, session: SessionDep, limiters: LimitersDep
) -> SharedBrief:
    """Public: the read-only brief behind a working link. No sign-in needed.

    The token travels in the body (and in the page address after "#", which browsers never send),
    so it never appears in the server's, the host's or Sentry's request logs.
    """
    if not limiters.shared.hit(client_ip(request)):
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS, "Too many tries. Please wait a few minutes.", PRIVATE_HEADERS
        )
    link = open_share(session, body.token)
    if link is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, GONE, PRIVATE_HEADERS)
    response.headers.update(PRIVATE_HEADERS)
    return SharedBrief(
        content=_for_doctor(link.brief),
        created_at=as_utc(link.brief.created_at),
        expires_at=as_utc(link.expires_at),
    )
