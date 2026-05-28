"""
CRUD layer — raw database operations with zero business logic.

Each function receives a SQLAlchemy Session and returns ORM objects.
The router layer handles HTTP concerns; the service layer handles math.
"""

import uuid
from datetime import date as date_type
from decimal import Decimal
from typing import Optional

from sqlalchemy import asc, desc, select
from sqlalchemy.orm import Session

from app import models, schemas


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _new_id() -> str:
    return str(uuid.uuid4())


# ─── Transactions ─────────────────────────────────────────────────────────────

def get_transactions(db: Session) -> list[models.Transaction]:
    """Return all transactions ordered newest-first (date DESC, then time DESC)."""
    return db.execute(
        select(models.Transaction).order_by(
            desc(models.Transaction.date),
            desc(models.Transaction.created_at),
        )
    ).scalars().all()


def create_transaction(db: Session, payload: schemas.TransactionCreate) -> models.Transaction:
    tx = models.Transaction(
        id=_new_id(),
        amount=payload.amount,
        category=payload.category,
        date=payload.date,
        time=payload.time,
        duration_months=payload.duration_months,
        is_income=payload.is_income,
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx


def delete_transaction(db: Session, tx_id: str) -> bool:
    tx = db.get(models.Transaction, tx_id)
    if tx is None:
        return False
    db.delete(tx)
    db.commit()
    return True


def bulk_upsert_transactions(db: Session, txs: list[dict]) -> int:
    """
    Upsert a list of raw transaction dicts (from import).
    Returns the count of records written.
    """
    count = 0
    for raw in txs:
        # Accept both original camelCase keys and snake_case
        tx_id = str(raw.get("id", _new_id()))

        # Parse date — may be "YYYY-MM-DD" string or ISO datetime string
        raw_date = raw.get("date", "")
        if "T" in raw_date:
            tx_date = date_type.fromisoformat(raw_date.split("T")[0])
        else:
            try:
                tx_date = date_type.fromisoformat(raw_date)
            except ValueError:
                tx_date = date_type.today()

        existing = db.get(models.Transaction, tx_id)
        if existing:
            # Update in-place
            existing.amount = Decimal(str(raw.get("amount", 0)))
            existing.category = raw.get("category", "Misc")
            existing.date = tx_date
            existing.time = raw.get("time", "12:00 PM")
            existing.duration_months = int(raw.get("durationMonths", raw.get("duration_months", 1)))
            existing.is_income = bool(raw.get("isIncome", raw.get("is_income", False)))
        else:
            db.add(models.Transaction(
                id=tx_id,
                amount=Decimal(str(raw.get("amount", 0))),
                category=raw.get("category", "Misc"),
                date=tx_date,
                time=raw.get("time", "12:00 PM"),
                duration_months=int(raw.get("durationMonths", raw.get("duration_months", 1))),
                is_income=bool(raw.get("isIncome", raw.get("is_income", False))),
            ))
        count += 1

    db.commit()
    return count


# ─── AutoPays ────────────────────────────────────────────────────────────────

def get_auto_pays(db: Session) -> list[models.AutoPay]:
    return db.execute(select(models.AutoPay)).scalars().all()


def create_auto_pay(db: Session, payload: schemas.AutoPayCreate) -> models.AutoPay:
    ap = models.AutoPay(
        id=_new_id(),
        name=payload.name,
        amount=payload.amount,
        billing_day=payload.billing_day,
    )
    db.add(ap)
    db.commit()
    db.refresh(ap)
    return ap


def delete_auto_pay(db: Session, ap_id: str) -> bool:
    ap = db.get(models.AutoPay, ap_id)
    if ap is None:
        return False
    db.delete(ap)
    db.commit()
    return True


def bulk_upsert_auto_pays(db: Session, aps: list[dict]) -> int:
    count = 0
    for raw in aps:
        ap_id = str(raw.get("id", _new_id()))
        existing = db.get(models.AutoPay, ap_id)
        if existing:
            existing.name = raw.get("name", "")
            existing.amount = Decimal(str(raw.get("amount", 0)))
            existing.billing_day = int(raw.get("billingDay", raw.get("billing_day", 1)))
        else:
            db.add(models.AutoPay(
                id=ap_id,
                name=raw.get("name", ""),
                amount=Decimal(str(raw.get("amount", 0))),
                billing_day=int(raw.get("billingDay", raw.get("billing_day", 1))),
            ))
        count += 1
    db.commit()
    return count


# ─── Categories ──────────────────────────────────────────────────────────────

DEFAULT_CATEGORIES = [
    "Diet",
    "Snacks/Chai",
    "Gym & Supplements",
    "Travel",
    "Outside Food",
    "Shopping",
    "Misc",
]


def get_categories(db: Session) -> list[models.Category]:
    return db.execute(select(models.Category).order_by(asc(models.Category.name))).scalars().all()


def create_category(db: Session, name: str) -> Optional[models.Category]:
    """Returns None if the category already exists."""
    existing = db.get(models.Category, name.strip())
    if existing:
        return None
    cat = models.Category(name=name.strip())
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


def delete_category(db: Session, name: str, reassign_to: Optional[str] = None) -> bool:
    cat = db.get(models.Category, name)
    if cat is None:
        return False

    # Reassign any transactions that use this category
    if reassign_to:
        txs = db.execute(
            select(models.Transaction).where(models.Transaction.category == name)
        ).scalars().all()
        for tx in txs:
            tx.category = reassign_to

    db.delete(cat)
    db.commit()
    return True


def seed_default_categories(db: Session) -> None:
    """Called on startup if the categories table is empty."""
    existing = db.execute(select(models.Category)).scalars().first()
    if existing is None:
        for name in DEFAULT_CATEGORIES:
            db.add(models.Category(name=name))
        db.commit()


# ─── BudgetState ─────────────────────────────────────────────────────────────

def get_budget_state(db: Session) -> models.BudgetState:
    """Always returns a row — creates the singleton if it doesn't exist yet."""
    row = db.get(models.BudgetState, "singleton")
    if row is None:
        row = models.BudgetState(id="singleton")
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def upsert_budget_state(db: Session, payload: schemas.BudgetStateUpdate) -> models.BudgetState:
    row = db.get(models.BudgetState, "singleton")
    if row is None:
        row = models.BudgetState(id="singleton")
        db.add(row)

    row.monthly_income = payload.monthly_income
    row.base_budget = payload.base_budget
    row.rollover_amount = payload.rollover_amount

    db.commit()
    db.refresh(row)
    return row
