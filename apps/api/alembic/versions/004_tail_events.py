"""tail_events for crested gecko tracker

Revision ID: 004_tail_events
Revises: 003_maint_weight_events
Create Date: 2026-08-08
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "004_tail_events"
down_revision: Union[str, None] = "003_maint_weight_events"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "tail_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("animal_id", sa.Integer(), sa.ForeignKey("animals.id"), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("cause", sa.String(200), nullable=False, server_default=""),
        sa.Column("notes", sa.Text(), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_tail_events_animal_id", "tail_events", ["animal_id"])


def downgrade() -> None:
    op.drop_table("tail_events")
