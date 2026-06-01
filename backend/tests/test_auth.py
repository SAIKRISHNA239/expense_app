"""
Auth API tests — register, login, validation, duplicate users.

Run: pytest tests/test_auth.py -v
"""

import os
import sys

os.environ.setdefault("DATABASE_URL", "sqlite:///./test_auth.db")
os.environ.setdefault("ENABLE_SCHEDULER", "false")

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database import Base, engine

Base.metadata.create_all(bind=engine)

client = TestClient(app)


@pytest.fixture(autouse=True)
def _clean_users():
  """Isolate tests — clear users between runs (sqlite file)."""
  from app.database import SessionLocal
  from app import models

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


def test_register_and_login():
  reg = client.post(
    "/api/auth/register",
    json={
      "username": "testuser",
      "password": "secret123",
      "confirm_password": "secret123",
    },
  )
  assert reg.status_code == 201
  data = reg.json()
  assert "access_token" in data
  assert data["user"]["username"] == "testuser"

  login = client.post(
    "/api/auth/login",
    data={"username": "testuser", "password": "secret123"},
  )
  assert login.status_code == 200
  assert login.json()["user"]["username"] == "testuser"


def test_register_password_mismatch():
  res = client.post(
    "/api/auth/register",
    json={
      "username": "user2",
      "password": "secret123",
      "confirm_password": "different",
    },
  )
  assert res.status_code == 422


def test_register_duplicate_username():
  payload = {
    "username": "dupe",
    "password": "secret123",
    "confirm_password": "secret123",
  }
  assert client.post("/api/auth/register", json=payload).status_code == 201
  res = client.post("/api/auth/register", json=payload)
  assert res.status_code == 409


def test_register_duplicate_case_insensitive():
  assert client.post(
    "/api/auth/register",
    json={"username": "MyUser", "password": "secret123", "confirm_password": "secret123"},
  ).status_code == 201
  res = client.post(
    "/api/auth/register",
    json={"username": "myuser", "password": "secret123", "confirm_password": "secret123"},
  )
  assert res.status_code == 409


def test_login_wrong_password():
  client.post(
    "/api/auth/register",
    json={"username": "u1", "password": "secret123", "confirm_password": "secret123"},
  )
  res = client.post(
    "/api/auth/login",
    data={"username": "u1", "password": "wrongpass"},
  )
  assert res.status_code == 401


def test_me_requires_token():
  res = client.get("/api/auth/me")
  assert res.status_code == 401
