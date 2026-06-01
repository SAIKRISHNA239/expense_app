# Spendly

**Spendly** is a personal expense tracker with a **Safe to Spend** budget engine, multi-month expense spreading, recurring auto-pay rules, and offline-friendly mobile support. Each user’s data lives on the server behind JWT auth; the React app feels instant thanks to TanStack Query and a local IndexedDB cache.

---

## Highlights

| Feature | What it does |
|--------|----------------|
| **Safe to Spend** | Real-time “guilt-free” balance from income, rollover, auto-pays, and amortized spending |
| **Log** | Fast numpad entry, categories, income toggle, optional multi-month spread |
| **Overview** | Dashboard with safe-to-spend hero, weekly spend, category breakdown, upcoming bills |
| **History** | Search, filters, grouped ledger, edit/delete |
| **Settings** | Budget, categories, auto-pays, backup/restore, account deletion |
| **Offline** | Read cached data offline; queue writes and sync when back online |
| **Android** | Capacitor shell — debug APK for phone testing; Play Store path documented |

---

## Tech stack

| Layer | Stack |
|-------|--------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, TanStack Query, Capacitor 7 |
| Backend | FastAPI, SQLAlchemy, Alembic, APScheduler |
| Database | SQLite (dev) / PostgreSQL (production) |
| Auth | JWT (Bearer), bcrypt passwords |

---

## Quick start

### Prerequisites

- Python 3.10+
- Node.js 18+
- (Optional) Android Studio — for APK builds

### 1. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # edit DATABASE_URL if needed
alembic upgrade head        # optional; AUTO_CREATE_TABLES also works in dev
uvicorn app.main:app --reload --port 8000
```

API docs: [http://localhost:8000/docs](http://localhost:8000/docs)

### 2. Frontend (web)

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) — Vite proxies `/api` → `http://127.0.0.1:8000`.

### 3. First use

1. Register an account.
2. Set **Settings → Budget & income** (optional but improves Overview).
3. Log expenses on the **Log** tab.

---

## Android on your phone

Build and install a debug APK (same Wi‑Fi as your PC):

```bash
cd frontend
./scripts/build-debug-apk.sh 192.168.29.4   # your computer’s LAN IP
```

Full guide: **[docs/INSTALL_DEBUG_APK.md](docs/INSTALL_DEBUG_APK.md)**

---

## Documentation

| Doc | Description |
|-----|-------------|
| [docs/README.md](docs/README.md) | Documentation index |
| [docs/FEATURES.md](docs/FEATURES.md) | Screens, flows, budget math (plain language) |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, folders, data flow |
| [docs/API.md](docs/API.md) | REST endpoints |
| [docs/DATABASE.md](docs/DATABASE.md) | Tables, migrations, per-user isolation |
| [docs/OFFLINE.md](docs/OFFLINE.md) | IndexedDB cache, sync queue |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Env vars, tests, troubleshooting |
| [docs/INSTALL_DEBUG_APK.md](docs/INSTALL_DEBUG_APK.md) | Sideload debug APK |
| [docs/PLAY_STORE.md](docs/PLAY_STORE.md) | Production deploy & Play Console |

---

## Project layout

```
expense_app/
├── backend/          # FastAPI API, services, Alembic migrations
├── frontend/         # React app + Capacitor Android
│   ├── src/lib/      # Views, hooks, API, offline sync
│   └── scripts/      # build-debug-apk.sh
└── docs/             # Project documentation
```

---

## Tests

```bash
cd backend
source .venv/bin/activate
pytest tests/ -v
```

---

## Production checklist

1. Deploy backend with HTTPS, PostgreSQL, strong `SECRET_KEY`.
2. Set `frontend/.env.production` → `VITE_API_URL=https://your-api.com/api`.
3. Build signed AAB and complete Play Console listing.

See **[docs/PLAY_STORE.md](docs/PLAY_STORE.md)**.

---

## License

MIT (see backend OpenAPI metadata). Adjust as needed for your distribution.
