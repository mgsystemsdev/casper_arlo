"""digest_mode: household | per_pet

Revision ID: 005_digest_mode
Revises: 004_tail_events
Create Date: 2026-08-08
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "005_digest_mode"
down_revision: Union[str, None] = "004_tail_events"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "app_settings",
        sa.Column("digest_mode", sa.String(20), nullable=False, server_default="household"),
    )


def downgrade() -> None:
    op.drop_column("app_settings", "digest_mode")
