# API reference

Base URL: `/api` (e.g. `http://localhost:8000/api` in dev).

Auth: `Authorization: Bearer <access_token>` on protected routes.

Interactive docs: `GET /docs` when `ENABLE_DOCS=true`.

---

## Auth — `/api/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | No | Body: `username`, `password`, `confirm_password` → `AuthResponse` |
| POST | `/login` | No | Form: `username`, `password` → `AuthResponse` |
| GET | `/me` | Yes | Current user `{ id, username }` |
| DELETE | `/me` | Yes | Delete account and all data (204) |

---

## Transactions — `/api/transactions`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `` | Yes | List txs (newest first) |
| POST | `` | Yes | Create; category must exist |
| PUT | `/{id}` | Yes | Update; fails if `auto_pay_id` set |
| DELETE | `/{id}` | Yes | Delete; fails if auto-billed |

**Transaction body:** `amount`, `category`, `date` (YYYY-MM-DD), `time`, `duration_months`, `is_income`

**Response includes:** `auto_pay_id` (null for manual txs)

---

## Categories — `/api/categories`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `` | Yes | List names (excludes reserved) |
| POST | `` | Yes | Body: `{ name }` |
| DELETE | `/{name}` | Yes | Query: `reassign_to` if txs exist |

---

## Auto-pays — `/api/auto-pays`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `` | Yes | List rules |
| POST | `` | Yes | Create + trigger billing |
| DELETE | `/{id}` | Yes | Remove rule; detach billed txs |

**Body:** `name`, `amount`, `billing_day` (1–31)

---

## Budget — `/api/budget`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `` | Yes | `BudgetState` for user |
| PUT | `` | Yes | Update income, cap, rollover |

---

## Dashboard — `/api`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/dashboard` | Yes | `DashboardOut` (computed) |
| GET | `/budget/summary` | Yes | Same payload as dashboard |

**DashboardOut:** `safe_to_spend`, `dynamic_rollover`, `current_amortized_burden`, `current_category_spending`, `total_auto_pays`, `current_month_income`, `upcoming_liabilities[]`

---

## Data — `/api/data`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/export` | Yes | Full JSON backup |
| POST | `/import` | Yes | Merge legacy JSON backup |

---

## Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | No | `{ status, env }` + DB ping |

---

## Errors

- `401` — invalid/missing token (client clears token and logs out)
- `400` — validation (unknown category, auto-bill delete, category delete without reassign)
- `404` — not found
- `409` — duplicate category

---

## Frontend mapping

| UI | Primary endpoints |
|----|-------------------|
| Auth | `/auth/register`, `/auth/login`, `/auth/me` |
| Log | `POST /transactions`, `GET /transactions`, `GET /categories` |
| Overview | `GET /budget/summary`, `GET /transactions` |
| History | `GET /transactions`, `PUT/DELETE /transactions/{id}` |
| Settings | `/budget`, `/categories`, `/auto-pays`, `/data/export`, `/data/import`, `DELETE /auth/me` |
