"""Scope all financial data per user; link auto-bills to auto_pay_id.

Revision ID: 0003_user_scoped_data
Revises: 0002_add_users
Create Date: 2026-05-31
"""

import uuid
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003_user_scoped_data"
down_revision: Union[str, None] = "0002_add_users"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _first_user_id(conn) -> str | None:
    row = conn.execute(sa.text("SELECT id FROM users ORDER BY created_at LIMIT 1")).fetchone()
    return row[0] if row else None


def upgrade() -> None:
    conn = op.get_bind()
    default_user = _first_user_id(conn)

    # ── transactions: add user_id + auto_pay_id ───────────────────────────────
    with op.batch_alter_table("transactions") as batch:
        batch.add_column(sa.Column("user_id", sa.String(36), nullable=True))
        batch.add_column(sa.Column("auto_pay_id", sa.String(36), nullable=True))

    if default_user:
        conn.execute(
            sa.text("UPDATE transactions SET user_id = :uid WHERE user_id IS NULL"),
            {"uid": default_user},
        )

    with op.batch_alter_table("transactions") as batch:
        batch.alter_column("user_id", nullable=False)
        batch.create_foreign_key("fk_transactions_user_id", "users", ["user_id"], ["id"])
        batch.create_foreign_key("fk_transactions_auto_pay_id", "auto_pays", ["auto_pay_id"], ["id"])
        batch.create_index("ix_transactions_user_id", ["user_id"])

    # ── auto_pays: add user_id ────────────────────────────────────────────────
    with op.batch_alter_table("auto_pays") as batch:
        batch.add_column(sa.Column("user_id", sa.String(36), nullable=True))

    if default_user:
        conn.execute(
            sa.text("UPDATE auto_pays SET user_id = :uid WHERE user_id IS NULL"),
            {"uid": default_user},
        )

    with op.batch_alter_table("auto_pays") as batch:
        batch.alter_column("user_id", nullable=False)
        batch.create_foreign_key("fk_auto_pays_user_id", "users", ["user_id"], ["id"])
        batch.create_index("ix_auto_pays_user_id", ["user_id"])

    # ── categories: rebuild with user_id ──────────────────────────────────────
    op.create_table(
        "categories_new",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.UniqueConstraint("user_id", "name", name="uq_categories_user_name"),
    )
    op.create_index("ix_categories_new_user_id", "categories_new", ["user_id"])

    if default_user:
        old_names = conn.execute(sa.text("SELECT name FROM categories")).fetchall()
        for (cat_name,) in old_names:
            conn.execute(
                sa.text(
                    "INSERT INTO categories_new (id, user_id, name) VALUES (:id, :uid, :name)"
                ),
                {"id": str(uuid.uuid4()), "uid": default_user, "name": cat_name},
            )

    op.drop_table("categories")
    op.rename_table("categories_new", "categories")

    # ── budget_state: rebuild with user_id PK ─────────────────────────────────
    op.create_table(
        "budget_state_new",
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), primary_key=True),
        sa.Column("monthly_income", sa.DECIMAL(12, 2), nullable=False, server_default="0"),
        sa.Column("base_budget", sa.DECIMAL(12, 2), nullable=False, server_default="0"),
        sa.Column("rollover_amount", sa.DECIMAL(12, 2), nullable=False, server_default="0"),
    )

    if default_user:
        conn.execute(
            sa.text(
                "INSERT INTO budget_state_new (user_id, monthly_income, base_budget, rollover_amount) "
                "SELECT :uid, monthly_income, base_budget, rollover_amount FROM budget_state LIMIT 1"
            ),
            {"uid": default_user},
        )

    op.drop_table("budget_state")
    op.rename_table("budget_state_new", "budget_state")


def downgrade() -> None:
    raise NotImplementedError("Downgrade not supported for user-scoped migration")
