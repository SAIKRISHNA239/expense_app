# Database

Spendly uses **SQLAlchemy** ORM and **Alembic** migrations. Every financial row is tied to a **user**.

---

## Tables

### `users`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID string PK | |
| username | string(50) | unique, indexed |
| hashed_password | string(255) | bcrypt |
| created_at | timestamp | |

### `transactions`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | FK → users | indexed |
| amount | decimal(12,2) | |
| category | string(100) | free text, not FK |
| date | date | |
| time | string(20) | |
| duration_months | smallint | default 1, spread |
| is_income | boolean | |
| auto_pay_id | FK → auto_pays | nullable; auto-billed |
| created_at | timestamp | |

### `auto_pays`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | FK → users | |
| name | string(100) | |
| amount | decimal(12,2) | |
| billing_day | smallint | 1–31 |

### `categories`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | FK → users | |
| name | string(100) | unique per `(user_id, name)` |

### `budget_state`

| Column | Type | Notes |
|--------|------|-------|
| user_id | PK, FK → users | one row per user |
| monthly_income | decimal | |
| base_budget | decimal | stored; optional charts |
| rollover_amount | decimal | starting rollover |

---

## Migrations

| Revision | File | Summary |
|----------|------|---------|
| 0001 | `0001_initial.py` | Legacy single-tenant schema |
| 0002 | `0002_add_users.py` | `users` table |
| 0003 | `0003_user_scoped_data.py` | Per-user data, `auto_pay_id`, rebuild categories/budget PK |

**Production:** run `alembic upgrade head`. Set `AUTO_CREATE_TABLES=false`.

**Dev:** `AUTO_CREATE_TABLES=true` can create tables on startup (convenience only).

---

## Seeding (new user)

`crud.seed_user_defaults()` creates:

- Default categories (including `Income`)
- Empty `budget_state` row

---

## Integrity rules (application layer)

- Category must exist before creating a transaction.
- Cannot delete category with transactions unless `reassign_to` is provided.
- Cannot delete or update auto-billed transactions (`auto_pay_id` set).
- Deleting auto-pay rule nullifies `auto_pay_id` on linked txs, then deletes rule.
- Account delete cascades all user financial data.

---

## Environment

```env
# Dev
DATABASE_URL=sqlite:///./dev.db

# Production
DATABASE_URL=postgresql://user:pass@host:5432/spendly
```
