"""value corrections

Lets people fix a value the AI misread: the result keeps its first reading, and every
fix is logged so it can become a test case for the accuracy kit.

Revision ID: 0006
Revises: 0005
Create Date: 2026-10-06 14:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = '0006'
down_revision: str | None = '0005'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("test_results", schema=None) as batch_op:
        batch_op.add_column(sa.Column("corrected_at", sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column("original_value_text", sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column("original_unit", sa.String(length=50), nullable=True))

    op.create_table(
        "corrections",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("result_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("old_value_text", sa.String(length=255), nullable=False),
        sa.Column("old_value", sa.Float(), nullable=True),
        sa.Column("old_unit", sa.String(length=50), nullable=True),
        sa.Column("new_value_text", sa.String(length=255), nullable=False),
        sa.Column("new_value", sa.Float(), nullable=True),
        sa.Column("new_unit", sa.String(length=50), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["result_id"], ["test_results.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_corrections_result_id", "corrections", ["result_id"])
    op.create_index("ix_corrections_user_id", "corrections", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_corrections_user_id", table_name="corrections")
    op.drop_index("ix_corrections_result_id", table_name="corrections")
    op.drop_table("corrections")
    with op.batch_alter_table("test_results", schema=None) as batch_op:
        batch_op.drop_column("original_unit")
        batch_op.drop_column("original_value_text")
        batch_op.drop_column("corrected_at")
