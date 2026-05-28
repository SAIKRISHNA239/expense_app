"""
Unit tests for services.calculate_dashboard and services.run_auto_billing.

These tests use plain Python objects (not a real DB) to verify the math engine
produces results identical to the original store.ts derived store logic.

Run with:  pytest tests/ -v
"""

import os
import sys

# Set a dummy DATABASE_URL before any app module is imported, so pydantic-settings
# doesn't raise a ValidationError trying to read a missing .env file during tests.
os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost/test")

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from datetime import date
from decimal import Decimal
from unittest.mock import MagicMock
import pytest

from app.services import calculate_dashboard, ZERO


# ─── Helpers to build fake ORM objects ───────────────────────────────────────

def make_tx(
    amount,
    category="Diet",
    tx_date=None,
    duration_months=1,
    is_income=False,
    tx_id="tx1",
):
    tx = MagicMock()
    tx.id = tx_id
    tx.amount = Decimal(str(amount))
    tx.category = category
    tx.date = tx_date or date.today()
    tx.duration_months = duration_months
    tx.is_income = is_income
    return tx


def make_ap(amount, billing_day=1, ap_id="ap1"):
    ap = MagicMock()
    ap.id = ap_id
    ap.amount = Decimal(str(amount))
    ap.billing_day = billing_day
    return ap


def make_budget(monthly_income=0, base_budget=0, rollover_amount=0):
    b = MagicMock()
    b.monthly_income = Decimal(str(monthly_income))
    b.base_budget = Decimal(str(base_budget))
    b.rollover_amount = Decimal(str(rollover_amount))
    return b


def make_cat(name):
    c = MagicMock()
    c.name = name
    return c


# ─── Tests ───────────────────────────────────────────────────────────────────

class TestCalculateDashboard:

    def test_zero_state(self):
        """With no data at all, everything should be 0."""
        result = calculate_dashboard([], [], make_budget(), [])
        assert result.safe_to_spend == ZERO
        assert result.dynamic_rollover == ZERO
        assert result.current_amortized_burden == ZERO
        assert result.total_auto_pays == ZERO

    def test_simple_current_month_expense(self):
        """A single expense this month reduces safe_to_spend."""
        budget = make_budget(monthly_income=10000, rollover_amount=0)
        today = date.today()
        tx = make_tx(amount=500, tx_date=today)

        result = calculate_dashboard([tx], [], budget, [make_cat("Diet")])

        # No past months, so dynamicRollover = initial_rollover = 0
        assert result.dynamic_rollover == ZERO
        assert result.current_amortized_burden == Decimal("500.00")
        # safeToSpend = 10000 + 0 + 0 - 0 - 500 = 9500
        assert result.safe_to_spend == Decimal("9500.00")

    def test_multi_month_amortization_current_month(self):
        """A 3-month purchase of 3000 should contribute 1000 to current burden."""
        budget = make_budget(monthly_income=5000)
        today = date.today()
        tx = make_tx(amount=3000, tx_date=today, duration_months=3)

        result = calculate_dashboard([tx], [], budget, [make_cat("Shopping")])

        assert result.current_amortized_burden == Decimal("1000.00")
        assert result.safe_to_spend == Decimal("4000.00")

    def test_auto_pay_deducted_from_safe_to_spend(self):
        """AutoPay amount should reduce safeToSpend directly."""
        budget = make_budget(monthly_income=10000)
        ap = make_ap(amount=500)

        result = calculate_dashboard([], [ap], budget, [])

        assert result.total_auto_pays == Decimal("500.00")
        assert result.safe_to_spend == Decimal("9500.00")

    def test_income_transaction_adds_to_current_month_income(self):
        """An Income-category transaction should add to currentMonthIncome."""
        budget = make_budget(monthly_income=5000)
        today = date.today()
        income_tx = make_tx(amount=2000, category="Income", tx_date=today, is_income=True)

        result = calculate_dashboard([income_tx], [], budget, [])

        assert result.current_month_income == Decimal("2000.00")
        # safeToSpend = 5000 + 2000 + 0 - 0 - 0 = 7000
        assert result.safe_to_spend == Decimal("7000.00")

    def test_initial_rollover_carries_forward(self):
        """Initial rollover should add to safeToSpend even with no history."""
        budget = make_budget(monthly_income=5000, rollover_amount=2000)

        result = calculate_dashboard([], [], budget, [])

        assert result.dynamic_rollover == Decimal("2000.00")
        assert result.safe_to_spend == Decimal("7000.00")

    def test_negative_safe_to_spend_is_allowed(self):
        """Safe to spend can go negative (over budget)."""
        budget = make_budget(monthly_income=1000)
        today = date.today()
        tx = make_tx(amount=5000, tx_date=today)

        result = calculate_dashboard([tx], [], budget, [make_cat("Diet")])

        assert result.safe_to_spend == Decimal("-4000.00")

    def test_upcoming_liabilities_present(self):
        """Three upcoming months should always appear in upcomingLiabilities."""
        budget = make_budget(monthly_income=5000)
        ap = make_ap(amount=1000)

        result = calculate_dashboard([], [ap], budget, [])

        assert len(result.upcoming_liabilities) == 3
        # Each upcoming month should include at least the autopay amount
        for ul in result.upcoming_liabilities:
            assert ul["amount"] >= Decimal("1000.00")

    def test_category_spending_breakdown(self):
        """Current month spending should be split per category."""
        budget = make_budget(monthly_income=10000)
        today = date.today()
        cats = [make_cat("Diet"), make_cat("Travel"), make_cat("Shopping")]

        txs = [
            make_tx(500, "Diet", today, tx_id="t1"),
            make_tx(300, "Travel", today, tx_id="t2"),
            make_tx(200, "Shopping", today, tx_id="t3"),
        ]

        result = calculate_dashboard(txs, [], budget, cats)

        assert result.current_category_spending["Diet"] == Decimal("500.00")
        assert result.current_category_spending["Travel"] == Decimal("300.00")
        assert result.current_category_spending["Shopping"] == Decimal("200.00")
        assert result.current_amortized_burden == Decimal("1000.00")

    def test_unknown_category_falls_back_to_misc(self):
        """Transactions with unknown categories should be attributed to 'Misc'."""
        budget = make_budget(monthly_income=5000)
        today = date.today()
        cats = [make_cat("Diet"), make_cat("Misc")]

        tx = make_tx(400, "UnknownCat", today)

        result = calculate_dashboard([tx], [], budget, cats)

        assert result.current_category_spending.get("Misc", ZERO) == Decimal("400.00")
        assert "UnknownCat" not in result.current_category_spending
