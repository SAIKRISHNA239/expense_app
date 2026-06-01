"""
CRUD integrity tests — category delete, auto-pay delete, auto-billed transactions.

Run: pytest tests/test_crud.py -v
"""

import os
import sys

os.environ.setdefault("DATABASE_URL", "sqlite:///./test_crud.db")
os.environ.setdefault("ENABLE_SCHEDULER", "false")

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from datetime import date
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient

from app import crud, models, schemas
from app.main import app
from app.database import Base, SessionLocal, engine

Base.metadata.create_all(bind=engine)
client = TestClient(app)


def _register_and_token(username: str = "cruduser") -> str:
    r = client.post(
        "/api/auth/register",
        json={
            "username": username,
            "password": "password1",
            "confirm_password": "password1",
        },
    )
    assert r.status_code == 201, r.text
    return r.json()["access_token"]


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(autouse=True)
def _clean_db():
    db = SessionLocal()
    try:
        db.query(models.Transaction).delete()
        db.query(models.Category).delete()
        db.query(models.AutoPay).delete()
        db.query(models.BudgetState).delete()
        db.query(models.User).delete()
        db.commit()
    finally:
        db.close()
    yield


def test_delete_category_without_reassign_blocked():
    token = _register_and_token("catblock")
    headers = _auth_headers(token)

    client.post("/api/categories", json={"name": "TestCat"}, headers=headers)
    client.post(
        "/api/transactions",
        json={
            "amount": "100",
            "category": "TestCat",
            "date": str(date.today()),
            "time": "10:00 AM",
            "duration_months": 1,
            "is_income": False,
        },
        headers=headers,
    )

    r = client.delete("/api/categories/TestCat", headers=headers)
    assert r.status_code == 400
    assert "reassign_to" in r.json()["detail"].lower()


def test_delete_category_with_reassign():
    token = _register_and_token("catreassign")
    headers = _auth_headers(token)

    client.post("/api/categories", json={"name": "OldCat"}, headers=headers)
    client.post(
        "/api/transactions",
        json={
            "amount": "50",
            "category": "OldCat",
            "date": str(date.today()),
            "time": "11:00 AM",
            "duration_months": 1,
            "is_income": False,
        },
        headers=headers,
    )

    r = client.delete("/api/categories/OldCat?reassign_to=Misc", headers=headers)
    assert r.status_code == 204

    txs = client.get("/api/transactions", headers=headers).json()
    assert txs[0]["category"] == "Misc"


def test_auto_billed_transaction_not_deletable():
    token = _register_and_token("autotx")
    headers = _auth_headers(token)

    ap = client.post(
        "/api/auto-pays",
        json={"name": "Rent", "amount": "5000", "billing_day": 1},
        headers=headers,
    ).json()

    db = SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.username == "autotx").first()
        db.add(
            models.Transaction(
                id="bill-1",
                user_id=user.id,
                amount=Decimal("5000"),
                category="Auto-Pay",
                date=date.today(),
                time="12:00 AM",
                duration_months=1,
                is_income=False,
                auto_pay_id=ap["id"],
            )
        )
        db.commit()
    finally:
        db.close()

    r = client.delete("/api/transactions/bill-1", headers=headers)
    assert r.status_code == 400


def test_delete_auto_pay_detaches_billed_transactions():
    token = _register_and_token("apdelete")
    headers = _auth_headers(token)

    ap = client.post(
        "/api/auto-pays",
        json={"name": "Netflix", "amount": "499", "billing_day": 15},
        headers=headers,
    ).json()

    db = SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.username == "apdelete").first()
        db.add(
            models.Transaction(
                id="bill-2",
                user_id=user.id,
                amount=Decimal("499"),
                category="Auto-Pay",
                date=date.today(),
                time="12:00 AM",
                duration_months=1,
                is_income=False,
                auto_pay_id=ap["id"],
            )
        )
        db.commit()
    finally:
        db.close()

    r = client.delete(f"/api/auto-pays/{ap['id']}", headers=headers)
    assert r.status_code == 204

    txs = client.get("/api/transactions", headers=headers).json()
    assert len(txs) == 1
    assert txs[0]["category"] == "Auto-Pay"
    assert txs[0].get("auto_pay_id") in (None, "")


def test_transaction_out_includes_auto_pay_id():
    token = _register_and_token("txout")
    headers = _auth_headers(token)

    ap = client.post(
        "/api/auto-pays",
        json={"name": "Gym", "amount": "999", "billing_day": 5},
        headers=headers,
    ).json()

    db = SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.username == "txout").first()
        crud.create_transaction(
            db,
            user.id,
            schemas.TransactionCreate(
                amount=Decimal("999"),
                category="Auto-Pay",
                date=date.today(),
                time="9:00 AM",
                duration_months=1,
                is_income=False,
            ),
        )
        tx = db.query(models.Transaction).filter(models.Transaction.user_id == user.id).first()
        tx.auto_pay_id = ap["id"]
        db.commit()
    finally:
        db.close()

    txs = client.get("/api/transactions", headers=headers).json()
    assert txs[0]["auto_pay_id"] == ap["id"]
