from collections.abc import Iterator
from typing import Annotated

from fastapi import Depends
from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings


class Base(DeclarativeBase):
    pass


def make_engine(url: str):
    # SQLite needs this flag because background jobs use the connection from another thread.
    sqlite = url.startswith("sqlite")
    connect_args = {"check_same_thread": False} if sqlite else {}
    engine = create_engine(url, connect_args=connect_args, pool_pre_ping=True)
    if sqlite:
        # SQLite ignores foreign keys unless asked, unlike Postgres; make them behave the same.
        event.listen(engine, "connect", lambda conn, _: conn.execute("PRAGMA foreign_keys=ON"))
    return engine


engine = make_engine(get_settings().database_url)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


def get_session_factory() -> sessionmaker[Session]:
    """Background jobs open their own sessions, so they need the factory itself."""
    return SessionLocal


def get_session(factory: Annotated[sessionmaker[Session], Depends(get_session_factory)]) -> Iterator[Session]:
    """FastAPI dependency: one database session per request."""
    with factory() as session:
        yield session
