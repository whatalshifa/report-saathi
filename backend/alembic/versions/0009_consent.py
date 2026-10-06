"""consent

Records which version of the data notice each person agreed to, and when, before their first
upload. Existing accounts start empty and are asked on their next upload.

Revision ID: 0009
Revises: 0008
Create Date: 2026-10-06 20:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = '0009'
down_revision: str | None = '0008'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("users") as batch:
        batch.add_column(sa.Column("consent_version", sa.String(length=20), nullable=True))
        batch.add_column(sa.Column("consented_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("users") as batch:
        batch.drop_column("consented_at")
        batch.drop_column("consent_version")
