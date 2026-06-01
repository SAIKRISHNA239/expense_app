"""
SQLAlchemy ORM models.

Column naming follows snake_case (Python convention).
Pydantic schemas handle the camelCase ↔ snake_case conversion for the API.
"""

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    Date,
    DECIMAL,
    ForeignKey,
    SmallInteger,
    String,
    TIMESTAMP,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def _new_uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_uuid)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False
    )


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    amount: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    date: Mapped[Date] = mapped_column(Date, nullable=False)
    time: Mapped[str] = mapped_column(String(20), nullable=False)
    duration_months: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=1)
    is_income: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    auto_pay_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("auto_pays.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False
    )


class AutoPay(Base):
    __tablename__ = "auto_pays"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    amount: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False)
    billing_day: Mapped[int] = mapped_column(SmallInteger, nullable=False)


class Category(Base):
    __tablename__ = "categories"
    __table_args__ = (UniqueConstraint("user_id", "name", name="uq_categories_user_name"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)


class BudgetState(Base):
    __tablename__ = "budget_state"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), primary_key=True)
    monthly_income: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False, default=0)
    base_budget: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False, default=0)
    rollover_amount: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False, default=0)
