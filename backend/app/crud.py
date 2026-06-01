"""
CRUD layer — raw database operations with zero business logic.

Each function receives a SQLAlchemy Session and returns ORM objects.
All financial data is scoped by user_id.
"""

import uuid
from datetime import date as date_type
from decimal import Decimal
from typing import Optional

from sqlalchemy import asc, delete, desc, select
from sqlalchemy.orm import Session

from app import models, schemas


def _new_id() -> str:
    return str(uuid.uuid4())


RESERVED_CATEGORIES = {"Income", "Auto-Pay"}

DEFAULT_CATEGORIES = [
    "Diet",
    "Snacks/Chai",
    "Gym & Supplements",
    "Travel",
    "Outside Food",
    "Shopping",
    "Misc",
    "Income",
]


# ─── User onboarding ─────────────────────────────────────────────────────────

def seed_user_defaults(db: Session, user_id: str) -> None:
    """Create default categories and budget row for a new user."""
    for name in DEFAULT_CATEGORIES:
        db.add(models.Category(id=_new_id(), user_id=user_id, name=name))
    db.add(models.BudgetState(user_id=user_id))
    db.commit()


# ─── Transactions ─────────────────────────────────────────────────────────────

def get_transactions(db: Session, user_id: str) -> list[models.Transaction]:
    return db.execute(
        select(models.Transaction)
        .where(models.Transaction.user_id == user_id)
        .order_by(desc(models.Transaction.date), desc(models.Transaction.created_at))
    ).scalars().all()


def get_transaction(db: Session, user_id: str, tx_id: str) -> models.Transaction | None:
    tx = db.get(models.Transaction, tx_id)
    if tx is None or tx.user_id != user_id:
        return None
    return tx


def create_transaction(
    db: Session, user_id: str, payload: schemas.TransactionCreate
) -> models.Transaction:
    tx = models.Transaction(
        id=_new_id(),
        user_id=user_id,
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


def update_transaction(
    db: Session, user_id: str, tx_id: str, payload: schemas.TransactionUpdate
) -> models.Transaction | None:
    tx = get_transaction(db, user_id, tx_id)
    if tx is None:
        return None
    if tx.auto_pay_id:
        return None  # auto-billed entries are read-only

    tx.amount = payload.amount
    tx.category = payload.category
    tx.date = payload.date
    tx.time = payload.time
    tx.duration_months = payload.duration_months
    tx.is_income = payload.is_income
    db.commit()
    db.refresh(tx)
    return tx


def delete_transaction(db: Session, user_id: str, tx_id: str) -> bool:
    tx = get_transaction(db, user_id, tx_id)
    if tx is None:
        return False
    db.delete(tx)
    db.commit()
    return True


def bulk_upsert_transactions(db: Session, user_id: str, txs: list[dict]) -> int:
    count = 0
    for raw in txs:
        tx_id = str(raw.get("id", _new_id()))
        raw_date = raw.get("date", "")
        if "T" in str(raw_date):
            tx_date = date_type.fromisoformat(str(raw_date).split("T")[0])
        else:
            try:
                tx_date = date_type.fromisoformat(str(raw_date))
            except ValueError:
                continue  # skip invalid dates instead of silently corrupting

        amount = Decimal(str(raw.get("amount", 0)))
        if amount <= 0:
            continue

        existing = get_transaction(db, user_id, tx_id)
        fields = dict(
            amount=amount,
            category=raw.get("category", "Misc"),
            date=tx_date,
            time=raw.get("time", "12:00 PM"),
            duration_months=int(raw.get("durationMonths", raw.get("duration_months", 1))),
            is_income=bool(raw.get("isIncome", raw.get("is_income", False))),
        )
        if existing:
            for k, v in fields.items():
                setattr(existing, k, v)
        else:
            db.add(models.Transaction(id=tx_id, user_id=user_id, **fields))
        count += 1

    db.commit()
    return count


# ─── AutoPays ────────────────────────────────────────────────────────────────

def get_auto_pays(db: Session, user_id: str) -> list[models.AutoPay]:
    return db.execute(
        select(models.AutoPay).where(models.AutoPay.user_id == user_id)
    ).scalars().all()


def get_all_auto_pays(db: Session) -> list[models.AutoPay]:
    """Used by the scheduler to bill every user."""
    return db.execute(select(models.AutoPay)).scalars().all()


def create_auto_pay(db: Session, user_id: str, payload: schemas.AutoPayCreate) -> models.AutoPay:
    ap = models.AutoPay(
        id=_new_id(),
        user_id=user_id,
        name=payload.name,
        amount=payload.amount,
        billing_day=payload.billing_day,
    )
    db.add(ap)
    db.commit()
    db.refresh(ap)
    return ap


def delete_auto_pay(db: Session, user_id: str, ap_id: str) -> bool:
    ap = db.get(models.AutoPay, ap_id)
    if ap is None or ap.user_id != user_id:
        return False
    db.delete(ap)
    db.commit()
    return True


def bulk_upsert_auto_pays(db: Session, user_id: str, aps: list[dict]) -> int:
    count = 0
    for raw in aps:
        ap_id = str(raw.get("id", _new_id()))
        existing = db.get(models.AutoPay, ap_id)
        fields = dict(
            name=raw.get("name", ""),
            amount=Decimal(str(raw.get("amount", 0))),
            billing_day=int(raw.get("billingDay", raw.get("billing_day", 1))),
        )
        if existing and existing.user_id == user_id:
            for k, v in fields.items():
                setattr(existing, k, v)
        else:
            db.add(models.AutoPay(id=ap_id, user_id=user_id, **fields))
        count += 1
    db.commit()
    return count


# ─── Categories ──────────────────────────────────────────────────────────────

def get_categories(db: Session, user_id: str) -> list[models.Category]:
    return db.execute(
        select(models.Category)
        .where(models.Category.user_id == user_id)
        .order_by(asc(models.Category.name))
    ).scalars().all()


def category_exists(db: Session, user_id: str, name: str) -> bool:
    return db.execute(
        select(models.Category).where(
            models.Category.user_id == user_id,
            models.Category.name == name.strip(),
        )
    ).scalar_one_or_none() is not None


def create_category(db: Session, user_id: str, name: str) -> Optional[models.Category]:
    clean = name.strip()
    if not clean or clean in RESERVED_CATEGORIES:
        return None
    if category_exists(db, user_id, clean):
        return None
    cat = models.Category(id=_new_id(), user_id=user_id, name=clean)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


def delete_category(
    db: Session, user_id: str, name: str, reassign_to: Optional[str] = None
) -> bool:
    cat = db.execute(
        select(models.Category).where(
            models.Category.user_id == user_id,
            models.Category.name == name,
        )
    ).scalar_one_or_none()
    if cat is None or name in RESERVED_CATEGORIES:
        return False

    if reassign_to and category_exists(db, user_id, reassign_to):
        txs = db.execute(
            select(models.Transaction).where(
                models.Transaction.user_id == user_id,
                models.Transaction.category == name,
            )
        ).scalars().all()
        for tx in txs:
            tx.category = reassign_to

    db.delete(cat)
    db.commit()
    return True


# ─── BudgetState ─────────────────────────────────────────────────────────────

def get_budget_state(db: Session, user_id: str) -> models.BudgetState:
    row = db.get(models.BudgetState, user_id)
    if row is None:
        row = models.BudgetState(user_id=user_id)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def upsert_budget_state(
    db: Session, user_id: str, payload: schemas.BudgetStateUpdate
) -> models.BudgetState:
    row = get_budget_state(db, user_id)
    row.monthly_income = payload.monthly_income
    row.base_budget = payload.base_budget
    row.rollover_amount = payload.rollover_amount
    db.commit()
    db.refresh(row)
    return row


# ─── Account deletion (Play Store requirement) ─────────────────────────────────

def delete_user_account(db: Session, user_id: str) -> bool:
    """Permanently delete a user and all their financial data."""
    user = db.get(models.User, user_id)
    if user is None:
        return False

    db.execute(delete(models.Transaction).where(models.Transaction.user_id == user_id))
    db.execute(delete(models.AutoPay).where(models.AutoPay.user_id == user_id))
    db.execute(delete(models.Category).where(models.Category.user_id == user_id))
    db.execute(delete(models.BudgetState).where(models.BudgetState.user_id == user_id))
    db.delete(user)
    db.commit()
    return True
