"""range source

Says where each value's normal range came from: printed by the lab, or a typical adult range
from the catalog, used only when a report printed none. Every range read so far came from the
report, so existing rows with a range are marked "lab"; values without one stay as they were.

Revision ID: 0010
Revises: 0009
Create Date: 2026-10-06 22:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = '0010'
down_revision: str | None = '0009'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("test_results") as batch:
        batch.add_column(sa.Column("range_source", sa.String(length=10), nullable=True))
    op.execute(
        sa.text("UPDATE test_results SET range_source = 'lab' WHERE ref_low IS NOT NULL OR ref_high IS NOT NULL")
    )


def downgrade() -> None:
    with op.batch_alter_table("test_results") as batch:
        batch.drop_column("range_source")
