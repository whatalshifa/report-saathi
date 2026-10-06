import logging
import threading
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api import auth, demo, profiles, reports
from app.api.deps import SessionDep
from app.config import get_settings
from app.db import get_session_factory
from app.services.extraction import get_extractor
from app.services.jobs import recover_interrupted
from app.services.storage import get_storage

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    if get_settings().recover_jobs_on_start:
        overrides = app.dependency_overrides
        factory = overrides.get(get_session_factory, get_session_factory)()
        storage = overrides.get(get_storage, get_storage)()
        extractor = overrides.get(get_extractor, get_extractor)()
        # In a thread, so the server starts answering straight away.
        threading.Thread(target=recover_interrupted, args=(factory, storage, extractor), daemon=True).start()
    yield


app = FastAPI(title="ReportSaathi API", version="0.5.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins,
    allow_credentials=True,  # the sign-in cookie
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Content-Type"],
)

app.include_router(auth.router)
app.include_router(profiles.router)
app.include_router(reports.router)
app.include_router(demo.router)


@app.get("/api/health")
def health(session: SessionDep) -> dict[str, str]:
    """For the hosting platform's health check: answers only when the database does."""
    try:
        session.execute(text("SELECT 1"))
    except Exception as exc:
        log.exception("Health check: database unreachable")
        raise HTTPException(503, "Database unreachable") from exc
    return {"status": "ok"}
