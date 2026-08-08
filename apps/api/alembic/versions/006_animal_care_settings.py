"""animal_care_settings — per-pet care KPIs / events / digest blocks

Revision ID: 006_animal_care_settings
Revises: 005_digest_mode
Create Date: 2026-08-08
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "006_animal_care_settings"
down_revision: Union[str, None] = "005_digest_mode"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "animal_care_settings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("animal_id", sa.Integer(), sa.ForeignKey("animals.id"), nullable=False),
        sa.Column("feed_ready_days", sa.Integer(), nullable=False, server_default="2"),
        sa.Column("handle_clear_hours", sa.Integer(), nullable=False, server_default="72"),
        sa.Column("handling_max_gap_days", sa.Integer(), nullable=False, server_default="2"),
        sa.Column("maint_water_days", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("maint_substrate_days", sa.Integer(), nullable=False, server_default="30"),
        sa.Column("maint_deep_clean_days", sa.Integer(), nullable=False, server_default="90"),
        sa.Column("feed_interval_mode", sa.String(20), nullable=False, server_default="auto"),
        sa.Column("feed_interval_days", sa.Integer(), nullable=True),
        sa.Column("event_handle_cleared", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("event_feed_overdue", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("event_handling_gap", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("event_shed_status", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("event_regurg", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("event_maint_water", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("event_maint_substrate", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("event_maint_deep_clean", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("event_weight_due", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("event_tail_drop", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("weight_log_interval_days", sa.Integer(), nullable=False, server_default="7"),
        sa.Column("digest_show_feed", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("digest_show_maint", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("digest_show_shed", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("digest_show_handle", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("digest_show_activity", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("digest_show_tail", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.UniqueConstraint("animal_id"),
    )
    op.create_index("ix_animal_care_settings_animal_id", "animal_care_settings", ["animal_id"])

    # Seed from legacy app_settings + species-aware overrides for cresties
    conn = op.get_bind()
    animals = conn.execute(sa.text("SELECT id, name, species FROM animals ORDER BY id")).fetchall()
    settings = conn.execute(sa.text("SELECT * FROM app_settings WHERE id = 1")).mappings().first()

    for animal in animals:
        aid, name, species = animal[0], animal[1], animal[2]
        blob = f"{species or ''} {name or ''}".lower()
        is_crestie = "ciliatus" in blob or "crested" in blob or "arlo" in blob

        if settings:
            vals = {
                "feed_ready_days": settings["feed_ready_days"],
                "handle_clear_hours": settings["handle_clear_hours"],
                "handling_max_gap_days": settings["handling_max_gap_days"],
                "maint_water_days": settings["maint_water_days"],
                "maint_substrate_days": settings["maint_substrate_days"],
                "maint_deep_clean_days": settings["maint_deep_clean_days"],
                "feed_interval_mode": settings["feed_interval_mode"],
                "feed_interval_days": settings["feed_interval_days"],
                "event_handle_cleared": settings["event_handle_cleared"],
                "event_feed_overdue": settings["event_feed_overdue"],
                "event_handling_gap": settings["event_handling_gap"],
                "event_shed_status": settings["event_shed_status"],
                "event_regurg": settings["event_regurg"],
                "event_maint_water": settings["event_maint_water"],
                "event_maint_substrate": settings["event_maint_substrate"],
                "event_maint_deep_clean": settings["event_maint_deep_clean"],
                "event_weight_due": settings["event_weight_due"],
                "weight_log_interval_days": settings["weight_log_interval_days"],
                "digest_show_feed": settings["digest_show_feed"],
                "digest_show_maint": settings["digest_show_maint"],
                "digest_show_shed": settings["digest_show_shed"],
                "digest_show_handle": settings["digest_show_handle"],
                "digest_show_activity": settings["digest_show_activity"],
                "event_tail_drop": False,
                "digest_show_tail": False,
            }
        else:
            vals = {
                "feed_ready_days": 2,
                "handle_clear_hours": 72,
                "handling_max_gap_days": 2,
                "maint_water_days": 3,
                "maint_substrate_days": 30,
                "maint_deep_clean_days": 90,
                "feed_interval_mode": "auto",
                "feed_interval_days": None,
                "event_handle_cleared": True,
                "event_feed_overdue": True,
                "event_handling_gap": False,
                "event_shed_status": True,
                "event_regurg": True,
                "event_maint_water": True,
                "event_maint_substrate": True,
                "event_maint_deep_clean": True,
                "event_weight_due": True,
                "weight_log_interval_days": 7,
                "digest_show_feed": True,
                "digest_show_maint": True,
                "digest_show_shed": True,
                "digest_show_handle": True,
                "digest_show_activity": True,
                "event_tail_drop": False,
                "digest_show_tail": False,
            }

        if is_crestie:
            vals.update(
                {
                    "feed_ready_days": 1,
                    "handle_clear_hours": 12,
                    "maint_substrate_days": 2,
                    "event_regurg": False,
                    "event_tail_drop": True,
                    "digest_show_tail": True,
                }
            )

        cols = ["animal_id"] + list(vals.keys())
        placeholders = ", ".join(f":{c}" for c in cols)
        conn.execute(
            sa.text(
                f"INSERT INTO animal_care_settings ({', '.join(cols)}) VALUES ({placeholders})"
            ),
            {"animal_id": aid, **vals},
        )


def downgrade() -> None:
    op.drop_index("ix_animal_care_settings_animal_id", table_name="animal_care_settings")
    op.drop_table("animal_care_settings")
