import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import people, reports
from app.config import get_settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

app = FastAPI(title="ReportSaathi API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["*"],
)

app.include_router(reports.router)
app.include_router(people.router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
