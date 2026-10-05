"""Alembic runs this to apply database migrations (changes to the tables)."""

from logging.config import fileConfig

from alembic import context
from app import models  # noqa: F401  (registers the tables on Base.metadata)
from app.db import Base, engine

if context.config.config_file_name is not None:
    fileConfig(context.config.config_file_name)

with engine.connect() as connection:
    context.configure(
        connection=connection,
        target_metadata=Base.metadata,
        render_as_batch=connection.dialect.name == "sqlite",
    )
    with context.begin_transaction():
        context.run_migrations()
