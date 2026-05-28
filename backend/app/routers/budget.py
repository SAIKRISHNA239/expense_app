from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.auth import get_current_user
from app.database import get_db

router = APIRouter(prefix="/api/budget", tags=["budget"])


@router.get("", response_model=schemas.BudgetStateOut)
def get_budget(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    return crud.get_budget_state(db)


@router.put("", response_model=schemas.BudgetStateOut)
def update_budget(
    payload: schemas.BudgetStateUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    return crud.upsert_budget_state(db, payload)
