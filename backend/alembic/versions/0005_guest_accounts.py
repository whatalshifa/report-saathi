"""guest accounts

Marks the one-click demo accounts, which are deleted after a day.

Revision ID: 0005
Revises: 0004
Create Date: 2026-10-06 13:30:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = '0005'
down_revision: str | None = '0004'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("is_guest", sa.Boolean(), server_default=sa.false(), nullable=False))
    op.create_index("ix_users_is_guest", "users", ["is_guest"])


def downgrade() -> None:
    op.drop_index("ix_users_is_guest", table_name="users")
    op.drop_column("users", "is_guest")
