"""Rename owner Erica Motilla → Erika Motilla

Revision ID: 007_owner_erika
Revises: 006_animal_care_settings
Create Date: 2026-08-08
"""

from typing import Sequence, Union

from alembic import op

revision: str = "007_owner_erika"
down_revision: Union[str, None] = "006_animal_care_settings"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "UPDATE animals SET owner = 'Erika Motilla' WHERE owner = 'Erica Motilla'"
    )


def downgrade() -> None:
    op.execute(
        "UPDATE animals SET owner = 'Erica Motilla' WHERE owner = 'Erika Motilla'"
    )
