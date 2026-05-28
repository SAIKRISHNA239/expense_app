from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import crud, models, schemas, services
from app.auth import get_current_user
from app.database import get_db

router = APIRouter(tags=["dashboard"])


def _compute_dashboard(db: Session) -> schemas.DashboardOut:
    """Shared logic — fetch all data and run the math engine."""
    txs = crud.get_transactions(db)
    aps = crud.get_auto_pays(db)
    budget = crud.get_budget_state(db)
    cats = crud.get_categories(db)

    result = services.calculate_dashboard(txs, aps, budget, cats)

    return schemas.DashboardOut(
        safe_to_spend=result.safe_to_spend,
        dynamic_rollover=result.dynamic_rollover,
        current_amortized_burden=result.current_amortized_burden,
        current_category_spending=result.current_category_spending,
        total_auto_pays=result.total_auto_pays,
        current_month_income=result.current_month_income,
        upcoming_liabilities=[
            schemas.UpcomingLiability(month=ul["month"], amount=ul["amount"])
            for ul in result.upcoming_liabilities
        ],
    )


@router.get("/api/dashboard", response_model=schemas.DashboardOut)
def get_dashboard(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    """Server-side port of the `thisMonthData` derived store from store.ts."""
    return _compute_dashboard(db)


@router.get("/api/budget/summary", response_model=schemas.DashboardOut)
def get_budget_summary(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    """
    Math Engine endpoint — alias for /api/dashboard.
    Returns safe_to_spend, dynamic_rollover, current_amortized_burden,
    current_category_spending, total_auto_pays, current_month_income,
    and upcoming_liabilities.
    """
    return _compute_dashboard(db)
