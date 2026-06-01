"""
Pydantic schemas for request validation and response serialization.

Naming convention:
  - `*Create`  — request body for POST endpoints
  - `*Out`     — response body (always has id + all fields)
  - `*Update`  — request body for PUT endpoints

All schemas use `model_config = ConfigDict(from_attributes=True)` so they can be
constructed directly from SQLAlchemy ORM objects via `Schema.model_validate(orm_obj)`.
"""

from datetime import date
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


# ─── Transaction ─────────────────────────────────────────────────────────────

class TransactionCreate(BaseModel):
    amount: Decimal = Field(..., gt=0, decimal_places=2)
    category: str = Field(..., min_length=1, max_length=100)
    date: date
    time: str = Field(..., max_length=20)
    duration_months: int = Field(default=1, ge=1, le=120)
    is_income: bool = False


class TransactionUpdate(TransactionCreate):
    pass


class TransactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    amount: Decimal
    category: str
    date: str          # serialized from Python date → "YYYY-MM-DD"
    time: str
    duration_months: int
    is_income: bool


# ─── AutoPay ─────────────────────────────────────────────────────────────────

class AutoPayCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    amount: Decimal = Field(..., gt=0, decimal_places=2)
    billing_day: int = Field(..., ge=1, le=31)


class AutoPayOut(AutoPayCreate):
    model_config = ConfigDict(from_attributes=True)

    id: str


# ─── Category ────────────────────────────────────────────────────────────────

class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str


# ─── BudgetState ─────────────────────────────────────────────────────────────

class BudgetStateUpdate(BaseModel):
    monthly_income: Decimal = Field(default=Decimal("0"), ge=0, decimal_places=2)
    base_budget: Decimal = Field(default=Decimal("0"), ge=0, decimal_places=2)
    rollover_amount: Decimal = Field(default=Decimal("0"), decimal_places=2)


class BudgetStateOut(BudgetStateUpdate):
    model_config = ConfigDict(from_attributes=True)

    user_id: str


# ─── Dashboard (computed, no ORM model) ──────────────────────────────────────

class UpcomingLiability(BaseModel):
    month: str          # "YYYY-MM"
    amount: Decimal


class DashboardOut(BaseModel):
    safe_to_spend: Decimal
    dynamic_rollover: Decimal
    current_amortized_burden: Decimal
    current_category_spending: dict[str, Decimal]
    total_auto_pays: Decimal
    current_month_income: Decimal
    upcoming_liabilities: list[UpcomingLiability]


# ─── Import / Export ─────────────────────────────────────────────────────────

class LegacyImportPayload(BaseModel):
    """
    Matches the JSON shape produced by the original financeApi.exportData().
    All fields are optional so a partial backup still imports cleanly.
    """
    transactions: Optional[list[dict]] = None
    autoPays: Optional[list[dict]] = None
    categories: Optional[list[str]] = None
    budget: Optional[dict] = None
    version: Optional[int] = None


# ─── Auth ────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_-]+$")
    password: str = Field(..., min_length=8, max_length=128)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    username: str


class Token(BaseModel):
    """Returned by the login endpoint."""
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Decoded JWT payload shape."""
    username: Optional[str] = None
