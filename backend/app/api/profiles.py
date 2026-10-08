from fastapi import APIRouter, BackgroundTasks, HTTPException, status
from sqlalchemy import func, select

from app.api.deps import FactoryDep, SessionDep, StorageDep, WriterDep, owned_brief, owned_profile
from app.models import Brief, JobStatus, Profile, Relation, Report, ReportStatus
from app.schemas import BriefOut, ProfileIn, ProfileOut, Trends
from app.services.auth import CurrentUser, SettingsDep
from app.services.claude import AI_OFF
from app.services.jobs import run_brief
from app.services.processing import refresh_typical_ranges
from app.services.trends import build_trends

router = APIRouter(prefix="/api", tags=["profiles"])

MAX_PROFILES = 12


def _out(profile: Profile, count: int = 0, last=None) -> ProfileOut:
    return ProfileOut.model_validate(profile).model_copy(
        update={"report_count": count, "last_report_date": last}
    )


@router.get("/profiles", response_model=list[ProfileOut])
def list_profiles(user: CurrentUser, session: SessionDep) -> list[ProfileOut]:
    stats = dict(
        (row.profile_id, (row.count, row.last))
        for row in session.execute(
            select(
                Report.profile_id,
                func.count().label("count"),
                func.max(func.coalesce(Report.report_date, func.date(Report.created_at))).label("last"),
            )
            .join(Profile)
            .where(Profile.user_id == user.id, Report.status == ReportStatus.done)
            .group_by(Report.profile_id)
        )
    )
    return [_out(p, *stats.get(p.id, (0, None))) for p in user.profiles]


@router.post("/profiles", status_code=status.HTTP_201_CREATED, response_model=ProfileOut)
def create_profile(body: ProfileIn, user: CurrentUser, session: SessionDep) -> ProfileOut:
    if len(user.profiles) >= MAX_PROFILES:
        raise HTTPException(status.HTTP_409_CONFLICT, f"You can have up to {MAX_PROFILES} profiles")
    if body.relation == Relation.self and any(p.relation == Relation.self for p in user.profiles):
        raise HTTPException(status.HTTP_409_CONFLICT, "You already have a profile for yourself")
    profile = Profile(user_id=user.id, **body.model_dump())
    session.add(profile)
    session.commit()
    return _out(profile)


@router.put("/profiles/{profile_id}", response_model=ProfileOut)
def update_profile(profile_id: str, body: ProfileIn, user: CurrentUser, session: SessionDep) -> ProfileOut:
    profile = owned_profile(session, user, profile_id)
    if body.relation == Relation.self and any(
        p.relation == Relation.self and p.id != profile.id for p in user.profiles
    ):
        raise HTTPException(status.HTTP_409_CONFLICT, "You already have a profile for yourself")
    # Typical ranges depend on sex and on being an adult; ranges the lab printed never change.
    ranges_changed = (body.sex, body.birth_year, body.relation) != (
        profile.sex,
        profile.birth_year,
        profile.relation,
    )
    for field, value in body.model_dump().items():
        setattr(profile, field, value)
    if ranges_changed:
        for report in profile.reports:
            refresh_typical_ranges(report)
    session.commit()
    return _out(profile)


@router.delete("/profiles/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_profile(profile_id: str, user: CurrentUser, session: SessionDep, storage: StorageDep) -> None:
    """Deletes the profile with all its reports and their files."""
    profile = owned_profile(session, user, profile_id)
    if len(user.profiles) == 1:
        raise HTTPException(status.HTTP_409_CONFLICT, "You need at least one profile")
    for report in profile.reports:
        storage.delete(report.storage_key)
    session.delete(profile)
    session.commit()


@router.get("/profiles/{profile_id}/trends", response_model=Trends)
def trends(profile_id: str, user: CurrentUser, session: SessionDep) -> Trends:
    result = build_trends(session, owned_profile(session, user, profile_id))
    if result is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No finished reports for this profile yet")
    return result


@router.post("/profiles/{profile_id}/briefs", status_code=status.HTTP_202_ACCEPTED, response_model=BriefOut)
def request_brief(
    profile_id: str,
    user: CurrentUser,
    background: BackgroundTasks,
    session: SessionDep,
    factory: FactoryDep,
    writer: WriterDep,
    settings: SettingsDep,
) -> Brief:
    """Start a fresh doctor brief from everything on file for this profile."""
    profile = owned_profile(session, user, profile_id)
    if profile.is_sample:
        # The example person's reports never change, so the ready-made brief is always current.
        ready = session.scalar(
            select(Brief)
            .where(Brief.profile_id == profile.id, Brief.status == JobStatus.done)
            .order_by(Brief.created_at.desc())
            .limit(1)
        )
        if ready is not None:
            return ready
    if not settings.ai_enabled:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, AI_OFF)
    has_reports = session.scalar(
        select(Report.id).where(Report.profile_id == profile.id, Report.status == ReportStatus.done).limit(1)
    )
    if has_reports is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No finished reports for this profile yet")
    brief = Brief(profile_id=profile.id)
    session.add(brief)
    session.commit()
    background.add_task(run_brief, brief.id, factory, writer)
    return brief


@router.get("/briefs/{brief_id}", response_model=BriefOut)
def get_brief(brief_id: str, user: CurrentUser, session: SessionDep) -> Brief:
    return owned_brief(session, user, brief_id)
