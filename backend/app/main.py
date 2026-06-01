"""
FastAPI application entry point.

Responsibilities:
  - Create the FastAPI app with full OpenAPI/Swagger UI metadata
  - Configure CORS (permissive for local dev; tighten in production)
  - Register all routers
  - On startup: seed default categories if empty, run initial auto-billing
  - APScheduler: run auto-billing daily at midnight
"""

from contextlib import asynccontextmanager

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from sqlalchemy.orm import Session

from app.config import settings
from app import crud
from app.database import SessionLocal, engine, get_db
from app.models import Base
from app.routers import auto_pays, budget, categories, dashboard, data, transactions
from app.routers.auth_router import router as auth_router
from app.services import run_auto_billing


# ─── Scheduler ───────────────────────────────────────────────────────────────

def _scheduled_auto_billing():
    """Called by APScheduler — creates its own DB session."""
    db = SessionLocal()
    try:
        count = run_auto_billing(db)
        if count:
            print(f"[APScheduler] Auto-billing: created {count} transaction(s)")
    finally:
        db.close()


# ─── Lifespan ────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ───────────────────────────────────────────────────────────────
    # Create all tables if they don't exist yet.
    # In production, prefer `alembic upgrade head`; this is a safe dev fallback.
    # Create tables in dev only — production should use `alembic upgrade head`
    if settings.AUTO_CREATE_TABLES:
        Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        count = run_auto_billing(db)
        if count:
            print(f"[Startup] Auto-billing: created {count} transaction(s)")
    finally:
        db.close()

    scheduler = None
    if settings.ENABLE_SCHEDULER:
        scheduler = BackgroundScheduler()
        scheduler.add_job(
            _scheduled_auto_billing,
            trigger="cron",
            hour=0,
            minute=5,
            id="daily_auto_billing",
            replace_existing=True,
        )
        scheduler.start()

    yield

    if scheduler is not None:
        scheduler.shutdown(wait=False)


# ─── OpenAPI tag metadata (controls section order + descriptions in Swagger) ─

TAGS_METADATA = [
    {
        "name": "auth",
        "description": (
            "🔐 **Authentication** — Register an account and obtain a JWT.\n\n"
            "**Workflow:**\n"
            "1. `POST /api/auth/register` — create your account.\n"
            "2. `POST /api/auth/login` — get your `access_token`.\n"
            "3. Click the **🔒 Authorize** button at the top of this page, "
            "enter `Bearer <your_token>`, and all protected endpoints unlock."
        ),
    },
    {
        "name": "dashboard",
        "description": (
            "📊 **Math Engine** — The computed Safe-to-Spend state.\n\n"
            "This is a Python port of the original Svelte `thisMonthData` derived store. "
            "It calculates:\n"
            "- **`safe_to_spend`** — spendable balance after amortization + rollover\n"
            "- **`dynamic_rollover`** — cumulative surplus/deficit from all past months\n"
            "- **`current_amortized_burden`** — this month's share of multi-month purchases\n"
            "- **`upcoming_liabilities`** — projected burden for the next 3 months"
        ),
    },
    {
        "name": "transactions",
        "description": (
            "💳 **Transactions** — The core ledger.\n\n"
            "Set `duration_months > 1` to amortize a purchase across multiple months "
            "(e.g. a ₹12,000 annual subscription with `duration_months=12` contributes "
            "₹1,000/month to the dashboard burden).\n\n"
            "Set `is_income=true` or `category='Income'` to record income."
        ),
    },
    {
        "name": "auto-pays",
        "description": (
            "🔄 **Auto-Pays** — Recurring bills that self-insert into the ledger.\n\n"
            "Creating an Auto-Pay rule immediately triggers the billing engine. "
            "It then runs again every day at **00:05** via APScheduler, inserting "
            "an `Auto-Pay` transaction for any month where `billing_day ≤ today`."
        ),
    },
    {
        "name": "categories",
        "description": (
            "🏷️ **Categories** — Labels for grouping transactions.\n\n"
            "Use `DELETE /api/categories/{name}?reassign_to=OtherCat` to safely "
            "migrate all transactions before removing a category."
        ),
    },
    {
        "name": "budget",
        "description": (
            "⚙️ **Budget Variables** — Global math inputs.\n\n"
            "- `monthly_income` — assumed income per month (used in rollover calc)\n"
            "- `base_budget` — budget cap (used for chart scaling on the frontend)\n"
            "- `rollover_amount` — seed balance carried in from before the app started"
        ),
    },
    {
        "name": "data",
        "description": (
            "💾 **Data Management** — Import & export.\n\n"
            "`POST /api/data/import` accepts the exact JSON shape produced by the "
            "original Svelte app's `financeApi.exportData()` — use it to seed your "
            "PostgreSQL database from your existing Dexie backup."
        ),
    },
    {
        "name": "health",
        "description": "🩺 **Health check** — Returns `{\"status\": \"ok\"}` when the server is up.",
    },
]

# ─── App ─────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Expense Tracker API",
    summary="Personal finance backend for the ZeroFriction Finance app.",
    description="""
## Overview

This API powers the **ZeroFriction Finance** expense tracker — a full client-server
rewrite of an offline-first Svelte+Dexie app.

---

## Authentication

All endpoints except `/api/auth/*` and `/health` require a **Bearer JWT**.

**Getting started:**
1. Register → `POST /api/auth/register`
2. Login → `POST /api/auth/login` — copy the `access_token` from the response
3. Click **🔒 Authorize** (top-right) → paste `Bearer <token>`

---

## Key Concept — Amortization

Transactions have a `duration_months` field. A purchase of ₹12,000 with
`duration_months=12` contributes exactly **₹1,000/month** to the `safe_to_spend`
calculation, spread across 12 months. This is the core of the budget math engine.

---

## Auto-Billing

Auto-Pay rules self-insert into the transaction ledger. The scheduler runs at
**00:05 daily** and is also triggered on server startup and when a new rule is added.
""",
    version="1.0.0",
    openapi_tags=TAGS_METADATA,
    # Swagger UI lives at /docs; ReDoc at /redoc
    docs_url="/docs" if settings.ENABLE_DOCS else None,
    redoc_url="/redoc" if settings.ENABLE_DOCS else None,
    lifespan=lifespan,
    # Expose contact info in the spec
    contact={
        "name": "ZeroFriction Finance",
    },
    license_info={
        "name": "MIT",
    },
)

# ─── Swagger UI configuration ────────────────────────────────────────────────
# These parameters are forwarded directly to the Swagger UI JS bundle.

app.swagger_ui_parameters = {
    # Keep the Authorize dialog pre-filled with "Bearer " prefix
    "persistAuthorization": True,
    # Collapse all endpoints by default — less overwhelming on first open
    "docExpansion": "none",
    # Show request duration in ms next to each "Execute" result
    "displayRequestDuration": True,
    # Show the "Authorize" button in each operation (not just at the top)
    "showExtensions": True,
    # Sort tags alphabetically
    "tagsSorter": "alpha",
    # Sort operations alphabetically within each tag
    "operationsSorter": "alpha",
    # Deep linking — each operation gets a shareable URL anchor
    "deepLinking": True,
    # Hide the "Models" section at the bottom (schema explorer; personal preference)
    "defaultModelsExpandDepth": -1,
}

# ─── CORS ────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ─────────────────────────────────────────────────────────────────

app.include_router(auth_router)           # /api/auth/* — public
app.include_router(transactions.router)   # /api/transactions/* — protected
app.include_router(auto_pays.router)      # /api/auto-pays/* — protected
app.include_router(categories.router)     # /api/categories/* — protected
app.include_router(budget.router)         # /api/budget — protected
app.include_router(dashboard.router)      # /api/dashboard, /api/budget/summary — protected
app.include_router(data.router)           # /api/data/* — protected


@app.get("/health", tags=["health"], summary="Server health check")
def health_check(db: Session = Depends(get_db)):
    """Returns ok when the server and database are reachable."""
    from sqlalchemy import text
    db.execute(text("SELECT 1"))
    return {"status": "ok", "env": settings.ENV}


# ─── Custom OpenAPI schema ────────────────────────────────────────────────────
# Override the auto-generated schema to add the BearerAuth security scheme
# so Swagger UI shows the 🔒 lock icon on every protected endpoint.

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    schema = get_openapi(
        title=app.title,
        version=app.version,
        summary=app.summary,
        description=app.description,
        contact=app.contact,
        license_info=app.license_info,
        tags=TAGS_METADATA,
        routes=app.routes,
    )

    # Register the HTTP Bearer security scheme
    schema.setdefault("components", {}).setdefault("securitySchemes", {})
    schema["components"]["securitySchemes"]["BearerAuth"] = {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT",
        "description": (
            "JWT obtained from `POST /api/auth/login`. "
            "Paste the `access_token` value here — do **not** include the word 'Bearer'."
        ),
    }

    # Apply the security scheme globally to every operation that isn't under /api/auth
    for path, path_item in schema.get("paths", {}).items():
        if path.startswith("/api/auth") or path in ("/health",):
            continue
        for method_item in path_item.values():
            if isinstance(method_item, dict):
                method_item.setdefault("security", [{"BearerAuth": []}])

    app.openapi_schema = schema
    return schema


app.openapi = custom_openapi
