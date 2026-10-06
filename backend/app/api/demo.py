"""What this server can do, and the sample reports for trying it out."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.deps import SessionDep, StorageDep
from app.api.profiles import MAX_PROFILES, _out
from app.config import Settings, get_settings
from app.schemas import ProfileOut
from app.services.auth import CurrentUser
from app.services.samples import add_sample_profile, find_sample_profile

router = APIRouter(prefix="/api", tags=["demo"])


class Features(BaseModel):
    # False when no Anthropic key is set: the site runs as a demo with sample reports only.
    reading: bool


@router.get("/features", response_model=Features)
def features(settings: Annotated[Settings, Depends(get_settings)]) -> Features:
    return Features(reading=settings.ai_enabled)


@router.post("/samples", response_model=ProfileOut)
def add_samples(user: CurrentUser, session: SessionDep, storage: StorageDep) -> ProfileOut:
    """Add the example person with three pre-read reports, or return them if already added."""
    if find_sample_profile(user) is None and len(user.profiles) >= MAX_PROFILES:
        raise HTTPException(status.HTTP_409_CONFLICT, f"You can have up to {MAX_PROFILES} profiles")
    profile = add_sample_profile(session, user, storage)
    return _out(profile, len(profile.reports), max(r.report_date for r in profile.reports))
