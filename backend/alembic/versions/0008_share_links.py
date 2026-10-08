"""share links

Lets someone send their doctor a link to a brief that expires, can be revoked, and logs
each time it is opened. Only a hash of each link's token is stored.

Revision ID: 0008
Revises: 0007
Create Date: 2026-10-06 16:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = '0008'
down_revision: str | None = '0007'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "share_links",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("profile_id", sa.String(length=36), nullable=False),
        sa.Column("brief_id", sa.String(length=36), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["profile_id"], ["profiles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["brief_id"], ["briefs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_share_links_profile_id", "share_links", ["profile_id"])
    op.create_index("ix_share_links_brief_id", "share_links", ["brief_id"])
    op.create_index("ix_share_links_token_hash", "share_links", ["token_hash"], unique=True)

    op.create_table(
        "share_views",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("share_id", sa.String(length=36), nullable=False),
        sa.Column("viewed_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["share_id"], ["share_links.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_share_views_share_id", "share_views", ["share_id"])


def downgrade() -> None:
    op.drop_index("ix_share_views_share_id", table_name="share_views")
    op.drop_table("share_views")
    op.drop_index("ix_share_links_token_hash", table_name="share_links")
    op.drop_index("ix_share_links_brief_id", table_name="share_links")
    op.drop_index("ix_share_links_profile_id", table_name="share_links")
    op.drop_table("share_links")
