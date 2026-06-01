# Development guide

---

## Prerequisites

- Python 3.10+
- Node.js 18+
- (Optional) Android Studio + JDK 17 for APK builds

---

## Environment variables

### Backend (`backend/.env`)

```env
DATABASE_URL=sqlite:///./dev.db
ENV=development
SECRET_KEY=dev-only-change-in-production
CORS_ORIGINS=http://localhost:5173,capacitor://localhost,https://localhost,http://localhost
ENABLE_DOCS=true
ENABLE_SCHEDULER=true
AUTO_CREATE_TABLES=true
```

Copy from `backend/.env.example` for production template.

### Frontend

**Web dev** — uses Vite proxy; no `.env` required.

```env
# frontend/.env.production — required for Capacitor / release builds
VITE_API_URL=https://api.yourdomain.com/api
```

**LAN phone testing:**

```env
VITE_API_URL=http://192.168.29.4:8000/api
```

---

## Running locally

### Terminal 1 — API

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

Phone on same Wi‑Fi:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Terminal 2 — Web UI

```bash
cd frontend
npm install
npm run dev
```

---

## Scripts

| Command | Where | Purpose |
|---------|-------|---------|
| `pytest tests/ -v` | backend | Unit + API tests |
| `npm run build` | frontend | Typecheck + production bundle |
| `npm run cap:sync` | frontend | Build + copy to Android |
| `./scripts/build-debug-apk.sh IP` | frontend | APK with baked API URL |

---

## Migrations

```bash
cd backend
alembic upgrade head
alembic revision --autogenerate -m "description"  # when models change
```

---

## Lint

```bash
cd frontend && npm run lint
```

---

## Common issues

| Problem | Fix |
|---------|-----|
| 401 after idle | Token expired; log in again |
| CORS error from app | Add Capacitor origins to `CORS_ORIGINS`; restart backend |
| Phone can’t reach API | `--host 0.0.0.0`, same Wi‑Fi, correct `VITE_API_URL`, rebuild APK |
| `/health` works in Chrome but app fails | Mixed content — use `androidScheme: http` + cleartext config |
| Empty categories on Log | Complete registration; check backend logs |
| Port 8000 in use | `lsof -i :8000` and stop other process |

---

## Testing accounts

Register via UI or:

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"demo","password":"password1","confirm_password":"password1"}'
```

---

## Code conventions

- Backend: snake_case; business logic in `services.py`, DB in `crud.py`
- Frontend: React function components; styles via Tailwind + `index.css` section classes (`.log-*`, `.dash-*`, `.hist-*`, `.set-*`)
- API types in `frontend/src/lib/api.ts` should match `schemas.py`
