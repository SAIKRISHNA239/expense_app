"""
SQLAlchemy ORM models.

Column naming follows snake_case (Python convention).
Pydantic schemas handle the camelCase ↔ snake_case conversion for the API.
"""

import uuid
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    Date,
    DECIMAL,
    ForeignKey,
    SmallInteger,
    String,
    TIMESTAMP,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def _new_uuid() -> str:
    return str(uuid.uuid4())


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=_new_uuid
    )
    # DECIMAL(12, 2) prevents floating-point currency errors
    amount: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    # Stored as a plain DATE column; Python date objects map cleanly
    date: Mapped[Date] = mapped_column(Date, nullable=False)
    # "HH:MM AM/PM" kept as text to preserve the exact original display format
    time: Mapped[str] = mapped_column(String(20), nullable=False)
    # Number of months over which this purchase is amortized (default 1 = no spread)
    duration_months: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=1)
    is_income: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[Date] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False
    )


class AutoPay(Base):
    __tablename__ = "auto_pays"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=_new_uuid
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    amount: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False)
    # Day of month the autopay is billed (1–31); clamped to last day if month is shorter
    billing_day: Mapped[int] = mapped_column(SmallInteger, nullable=False)


class Category(Base):
    __tablename__ = "categories"

    # The name IS the primary key — matches original Dexie schema
    name: Mapped[str] = mapped_column(String(100), primary_key=True)


class BudgetState(Base):
    __tablename__ = "budget_state"

    # Always "singleton" — enforces single-row constraint at the application layer
    id: Mapped[str] = mapped_column(String(20), primary_key=True, default="singleton")
    monthly_income: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False, default=0)
    base_budget: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False, default=0)
    rollover_amount: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False, default=0)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_uuid)
    # Username must be unique — used as the JWT subject claim
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[Date] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False
    )
