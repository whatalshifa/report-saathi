"""Background jobs for the AI writing features, run the same way as report reading."""

import logging
from collections.abc import Callable

from sqlalchemy import select, update
from sqlalchemy.orm import Session, sessionmaker

from app.models import Brief, Explanation, JobStatus, Profile, Report
from app.services.claude import AIError
from app.services.extraction import Extractor
from app.services.processing import process_report
from app.services.storage import Storage
from app.services.trends import build_trends
from app.services.writing import Writer

log = logging.getLogger(__name__)

GENERIC_ERROR = "Something went wrong while writing this. Please try again."


def _run(job: Explanation | Brief, session: Session, work: Callable[[], dict]) -> None:
    job.status = JobStatus.processing
    session.commit()
    try:
        job.content = work()
        job.status, job.error = JobStatus.done, None
    except AIError as exc:
        job.status, job.error = JobStatus.failed, str(exc)
    except Exception:
        log.exception("Unexpected failure in %s %s", type(job).__name__, job.id)
        job.status, job.error = JobStatus.failed, GENERIC_ERROR
    session.commit()


def run_explanation(explanation_id: str, session_factory: sessionmaker[Session], writer: Writer) -> None:
    with session_factory() as session:
        explanation = session.get(Explanation, explanation_id)
        if explanation is None:
            return
        report = session.get(Report, explanation.report_id)
        _run(explanation, session, lambda: writer.explain(report, explanation.language).model_dump())


def run_brief(brief_id: str, session_factory: sessionmaker[Session], writer: Writer) -> None:
    with session_factory() as session:
        brief = session.get(Brief, brief_id)
        if brief is None:
            return

        def work() -> dict:
            profile = session.get(Profile, brief.profile_id)
            trends = build_trends(session, profile) if profile else None
            if trends is None:
                raise AIError("There are no finished reports for this profile yet.")
            # Keep the numbers the brief was written from, so the page always matches its text.
            return {"brief": writer.brief(trends).model_dump(), "snapshot": trends.model_dump(mode="json")}

        _run(brief, session, work)


INTERRUPTED = "This was interrupted by a server restart. Please try again."


def recover_interrupted(
    session_factory: sessionmaker[Session], storage: Storage, extractor: Extractor
) -> int:
    """After a restart, finish what the old server was doing.

    Background jobs run inside the API process, so a deploy or crash can stop
    one half-way. Reports still have their file, so they are read again.
    Explanations and briefs are marked failed, and the page offers a retry.
    (With an SQS worker this becomes the queue's job: an unfinished message
    simply comes back.) Returns how many reports were restarted.
    """
    pending = (JobStatus.queued, JobStatus.processing)
    with session_factory() as session:
        for model in (Explanation, Brief):
            session.execute(
                update(model)
                .where(model.status.in_(pending))
                .values(status=JobStatus.failed, error=INTERRUPTED)
            )
        report_ids = list(session.scalars(select(Report.id).where(Report.status.in_(pending))))
        session.commit()
    for report_id in report_ids:
        process_report(report_id, session_factory, storage, extractor)
    if report_ids:
        log.info("Restarted %d interrupted report(s)", len(report_ids))
    return len(report_ids)
