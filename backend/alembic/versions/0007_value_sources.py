"""value sources

Keeps where each value is printed in the original file, so the app can show it, and
marks the ready-made sample reports on the report itself. Sample reports now store a
page image instead of a text placeholder, so their content type no longer tells them apart.

Revision ID: 0007
Revises: 0006
Create Date: 2026-10-06 15:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = '0007'
down_revision: str | None = '0006'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("test_results", schema=None) as batch_op:
        batch_op.add_column(sa.Column("box", sa.JSON(), nullable=True))
    with op.batch_alter_table("reports", schema=None) as batch_op:
        batch_op.add_column(sa.Column("is_sample", sa.Boolean(), server_default=sa.false(), nullable=False))
    # Until now the sample reports were the only ones stored as text.
    op.execute(
        sa.text("UPDATE reports SET is_sample = :yes WHERE content_type = 'text/plain'").bindparams(yes=True)
    )


def downgrade() -> None:
    with op.batch_alter_table("reports", schema=None) as batch_op:
        batch_op.drop_column("is_sample")
    with op.batch_alter_table("test_results", schema=None) as batch_op:
        batch_op.drop_column("box")
