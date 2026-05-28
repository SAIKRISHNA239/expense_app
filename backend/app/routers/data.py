import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.auth import get_current_user
from app.database import get_db

router = APIRouter(prefix="/api/data", tags=["data"])


@router.post("/import", summary="Bulk import from legacy Dexie JSON backup")
def import_data(
    payload: schemas.LegacyImportPayload,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    tx_count = 0
    ap_count = 0
    cat_count = 0

    if payload.transactions:
        tx_count = crud.bulk_upsert_transactions(db, payload.transactions)

    if payload.autoPays:
        ap_count = crud.bulk_upsert_auto_pays(db, payload.autoPays)

    if payload.categories:
        for name in payload.categories:
            if isinstance(name, str) and name.strip():
                crud.create_category(db, name.strip())
                cat_count += 1

    if payload.budget:
        raw = payload.budget
        crud.upsert_budget_state(
            db,
            schemas.BudgetStateUpdate(
                monthly_income=raw.get("monthlyIncome", raw.get("monthly_income", 0)),
                base_budget=raw.get("baseBudget", raw.get("base_budget", 0)),
                rollover_amount=raw.get("rolloverAmount", raw.get("rollover_amount", 0)),
            ),
        )

    from app.services import run_auto_billing
    billed = run_auto_billing(db)

    return {
        "imported": {
            "transactions": tx_count,
            "auto_pays": ap_count,
            "categories": cat_count,
        },
        "auto_billing_records_created": billed,
    }


@router.get("/export", summary="Export full database snapshot as JSON")
def export_data(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    txs = crud.get_transactions(db)
    aps = crud.get_auto_pays(db)
    cats = crud.get_categories(db)
    budget = crud.get_budget_state(db)

    data = {
        "version": 5,
        "exported_at": datetime.utcnow().isoformat() + "Z",
        "transactions": [
            {
                "id": t.id,
                "amount": float(t.amount),
                "category": t.category,
                "date": str(t.date),
                "time": t.time,
                "durationMonths": t.duration_months,
                "isIncome": t.is_income,
            }
            for t in txs
        ],
        "autoPays": [
            {
                "id": ap.id,
                "name": ap.name,
                "amount": float(ap.amount),
                "billingDay": ap.billing_day,
            }
            for ap in aps
        ],
        "categories": [c.name for c in cats],
        "budget": {
            "monthlyIncome": float(budget.monthly_income),
            "baseBudget": float(budget.base_budget),
            "rolloverAmount": float(budget.rollover_amount),
        },
    }

    return JSONResponse(content=data)
