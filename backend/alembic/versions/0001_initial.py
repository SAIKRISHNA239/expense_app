"""Initial schema — creates all 4 tables.

Revision ID: 0001_initial
Revises: 
Create Date: 2026-05-28
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── budget_state ──────────────────────────────────────────────────────────
    op.create_table(
        "budget_state",
        sa.Column("id", sa.String(20), primary_key=True),
        sa.Column("monthly_income", sa.DECIMAL(12, 2), nullable=False, server_default="0"),
        sa.Column("base_budget", sa.DECIMAL(12, 2), nullable=False, server_default="0"),
        sa.Column("rollover_amount", sa.DECIMAL(12, 2), nullable=False, server_default="0"),
    )

    # ── categories ────────────────────────────────────────────────────────────
    op.create_table(
        "categories",
        sa.Column("name", sa.String(100), primary_key=True),
    )

    # ── auto_pays ────────────────────────────────────────────────────────────
    op.create_table(
        "auto_pays",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("amount", sa.DECIMAL(12, 2), nullable=False),
        sa.Column("billing_day", sa.SmallInteger, nullable=False),
    )

    # ── transactions ──────────────────────────────────────────────────────────
    op.create_table(
        "transactions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("amount", sa.DECIMAL(12, 2), nullable=False),
        sa.Column("category", sa.String(100), nullable=False),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column("time", sa.String(20), nullable=False),
        sa.Column("duration_months", sa.SmallInteger, nullable=False, server_default="1"),
        sa.Column("is_income", sa.Boolean, nullable=False, server_default="false"),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    # Index for fast date-sorted queries
    op.create_index("ix_transactions_date", "transactions", ["date"])
    op.create_index("ix_transactions_category", "transactions", ["category"])


def downgrade() -> None:
    op.drop_index("ix_transactions_category", table_name="transactions")
    op.drop_index("ix_transactions_date", table_name="transactions")
    op.drop_table("transactions")
    op.drop_table("auto_pays")
    op.drop_table("categories")
    op.drop_table("budget_state")
