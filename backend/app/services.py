"""
services.py — Business logic layer.

This module is a faithful Python port of the math engine that lived in the
original store.ts `thisMonthData` derived store and `runAutoBilling` function.

All arithmetic uses Python's `Decimal` type (not float) to match the
PostgreSQL DECIMAL(12,2) columns and avoid floating-point drift.

No HTTP or SQLAlchemy specifics live here — functions accept plain Python
objects so they can be unit-tested without a database.
"""

import uuid
from calendar import monthrange
from datetime import date, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import NamedTuple

from sqlalchemy.orm import Session

from app import crud, models, schemas

# ─── Constants ───────────────────────────────────────────────────────────────

INCOME_CATEGORY = "Income"
AUTO_PAY_CATEGORY = "Auto-Pay"
ZERO = Decimal("0")


# ─── Date helpers ─────────────────────────────────────────────────────────────

def _ym(d: date) -> str:
    """Return 'YYYY-MM' string from a date object."""
    return d.strftime("%Y-%m")


def _first_of_month(d: date) -> date:
    return d.replace(day=1)


def _next_month(d: date) -> date:
    """Advance exactly one month (handles year rollover)."""
    if d.month == 12:
        return d.replace(year=d.year + 1, month=1)
    return d.replace(month=d.month + 1)


def _format_date(d: date) -> str:
    return d.strftime("%Y-%m-%d")


def _format_time(d: datetime) -> str:
    h = d.hour % 12 or 12
    m = d.strftime("%M")
    ap = "AM" if d.hour < 12 else "PM"
    return f"{h}:{m} {ap}"


# ─── Dashboard calculation ─────────────────────────────────────────────────────

class DashboardData(NamedTuple):
    safe_to_spend: Decimal
    dynamic_rollover: Decimal
    current_amortized_burden: Decimal
    current_category_spending: dict[str, Decimal]
    total_auto_pays: Decimal
    current_month_income: Decimal
    upcoming_liabilities: list[dict]   # [{"month": "YYYY-MM", "amount": Decimal}]


def calculate_dashboard(
    transactions: list[models.Transaction],
    auto_pays: list[models.AutoPay],
    budget: models.BudgetState,
    categories: list[models.Category],
) -> DashboardData:
    """
    Port of store.ts `thisMonthData` derived store.

    Algorithm:
    1. Find the earliest transaction date to determine how many "past months"
       existed before the current month.
    2. For each past month, accumulate the amortized burden from every
       multi-month transaction whose spread overlaps that month.
    3. Compute dynamicRollover = initial_rollover
                                + (monthly_income × past_month_count)
                                - past_variable_burden
                                - past_auto_pay_burden
    4. For the current month, accumulate the amortized current burden and
       per-category breakdown.
    5. safeToSpend = monthly_income + currentMonthIncome + dynamicRollover
                     - totalAutoPays - currentAmortizedBurden
    """
    now = date.today()
    current_ym = _ym(now)

    cat_names = {c.name for c in categories}

    # ── Step 1: Determine active past months ─────────────────────────────────
    earliest = now
    for tx in transactions:
        tx_date = tx.date if isinstance(tx.date, date) else date.fromisoformat(str(tx.date))
        if tx_date < earliest:
            earliest = tx_date

    # Build the set of months strictly before the current month
    active_months: set[str] = set()
    cursor = _first_of_month(earliest)
    while _ym(cursor) != current_ym:
        active_months.add(_ym(cursor))
        cursor = _next_month(cursor)

    # ── Step 2 & 4: Loop transactions once, amortize into correct buckets ────
    past_amortized: dict[str, Decimal] = {m: ZERO for m in active_months}
    current_amortized_burden = ZERO
    current_month_income = ZERO
    current_category_spending: dict[str, Decimal] = {c: ZERO for c in cat_names}

    # Upcoming liability buckets for next 3 months
    upcoming_burdens: dict[str, Decimal] = {}
    for i in range(1, 4):
        cursor = now
        for _ in range(i):
            cursor = _next_month(cursor)
        upcoming_burdens[_ym(cursor)] = ZERO

    for tx in transactions:
        tx_date = tx.date if isinstance(tx.date, date) else date.fromisoformat(str(tx.date))
        tx_ym = _ym(tx_date)

        # Income transactions: only count current-month income
        if tx.is_income or tx.category == INCOME_CATEGORY:
            if tx_ym == current_ym:
                current_month_income += Decimal(str(tx.amount))
            continue

        # Auto-Pay category entries are excluded from amortization math
        if tx.category == AUTO_PAY_CATEGORY:
            continue

        num_months = max(int(tx.duration_months), 1)
        monthly_burden = Decimal(str(tx.amount)) / Decimal(num_months)

        # Spread the burden across each month in the duration
        start_year = tx_date.year
        start_month = tx_date.month

        for i in range(num_months):
            # Calculate target month
            total_months = start_month - 1 + i
            target_year = start_year + total_months // 12
            target_month = total_months % 12 + 1
            target_date = date(target_year, target_month, 1)
            target_ym = _ym(target_date)

            if target_ym == current_ym:
                current_amortized_burden += monthly_burden
                # Attribute to correct category (fall back to 'Misc' if unknown)
                cat_key = tx.category if tx.category in cat_names else "Misc"
                current_category_spending[cat_key] = (
                    current_category_spending.get(cat_key, ZERO) + monthly_burden
                )
            elif target_ym in active_months:
                past_amortized[target_ym] += monthly_burden

            # Accumulate into upcoming liability window
            if target_ym in upcoming_burdens:
                upcoming_burdens[target_ym] += monthly_burden

    # ── Step 3: Dynamic rollover ──────────────────────────────────────────────
    total_auto_pays = sum(
        (Decimal(str(ap.amount)) for ap in auto_pays), ZERO
    )
    past_auto_pay_burden = total_auto_pays * len(active_months)
    past_variable_burden = sum(past_amortized.values(), ZERO)

    monthly_income = Decimal(str(budget.monthly_income))
    initial_rollover = Decimal(str(budget.rollover_amount))
    total_historical_income = monthly_income * len(active_months)

    dynamic_rollover = (
        initial_rollover
        + total_historical_income
        - past_variable_burden
        - past_auto_pay_burden
    )

    # ── Step 5: Safe to Spend ─────────────────────────────────────────────────
    effective_income = monthly_income + current_month_income
    safe_to_spend = (
        effective_income + dynamic_rollover - total_auto_pays - current_amortized_burden
    )

    # ── Upcoming liabilities ──────────────────────────────────────────────────
    upcoming_liabilities = [
        {"month": ym, "amount": upcoming_burdens[ym] + total_auto_pays}
        for ym in sorted(upcoming_burdens)
    ]

    # Round all output values to 2 decimal places for clean JSON
    def _r(v: Decimal) -> Decimal:
        return v.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    return DashboardData(
        safe_to_spend=_r(safe_to_spend),
        dynamic_rollover=_r(dynamic_rollover),
        current_amortized_burden=_r(current_amortized_burden),
        current_category_spending={k: _r(v) for k, v in current_category_spending.items()},
        total_auto_pays=_r(total_auto_pays),
        current_month_income=_r(current_month_income),
        upcoming_liabilities=[
            {"month": ul["month"], "amount": _r(ul["amount"])}
            for ul in upcoming_liabilities
        ],
    )


# ─── Auto-billing service ──────────────────────────────────────────────────────

def run_auto_billing(db: Session) -> int:
    """
    Port of store.ts `runAutoBilling`.

    Idempotent: safe to call multiple times. For each AutoPay rule, it:
    1. Finds the most recently billed Auto-Pay transaction for that rule
       (matched by amount — same logic as the original).
    2. Walks forward month by month from the last-billed month (or the
       current month if never billed) to the current month.
    3. Inserts a billing record for any month where today >= billing_day.

    Returns the number of new transaction records created.
    """
    now = datetime.now()
    today = now.date()
    current_ym = _ym(today)

    auto_pays = crud.get_auto_pays(db)
    all_txs = crud.get_transactions(db)

    # Index existing Auto-Pay transactions by amount for fast lookup
    ap_txs_by_amount: dict[str, list[models.Transaction]] = {}
    for tx in all_txs:
        if tx.category == AUTO_PAY_CATEGORY:
            key = str(tx.amount)
            ap_txs_by_amount.setdefault(key, []).append(tx)

    created_count = 0

    for ap in auto_pays:
        amount_key = str(ap.amount)
        matching_txs = ap_txs_by_amount.get(amount_key, [])

        # Find most recent billing date for this autopay
        if matching_txs:
            matching_txs.sort(
                key=lambda t: t.date if isinstance(t.date, date) else date.fromisoformat(str(t.date)),
                reverse=True,
            )
            last_date = (
                matching_txs[0].date
                if isinstance(matching_txs[0].date, date)
                else date.fromisoformat(str(matching_txs[0].date))
            )
            # Start from the month AFTER the last billed month
            process_date = _next_month(_first_of_month(last_date))
        else:
            # Never billed: start from the first of the current month
            process_date = _first_of_month(today)

        # Walk forward until we exceed the current month
        while _ym(process_date) <= current_ym:
            py, pm = process_date.year, process_date.month

            # Clamp billing day to last day of this month (e.g., 31 in Feb → 28/29)
            last_day = monthrange(py, pm)[1]
            effective_day = min(ap.billing_day, last_day)

            is_current_month = _ym(process_date) == current_ym
            day_has_passed = today.day >= effective_day

            if not is_current_month or day_has_passed:
                bill_date = date(py, pm, effective_day)
                bill_datetime = datetime(py, pm, effective_day, 0, 0, 0)

                new_tx = models.Transaction(
                    id=str(uuid.uuid4()),
                    amount=ap.amount,
                    category=AUTO_PAY_CATEGORY,
                    date=bill_date,
                    time=_format_time(bill_datetime),
                    duration_months=1,
                    is_income=False,
                )
                db.add(new_tx)
                created_count += 1

            process_date = _next_month(process_date)

    if created_count > 0:
        db.commit()

    return created_count
