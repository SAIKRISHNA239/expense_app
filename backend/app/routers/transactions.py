from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.auth import get_current_user
from app.database import get_db

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


def _tx_out(t: models.Transaction) -> schemas.TransactionOut:
    return schemas.TransactionOut(
        id=t.id,
        amount=t.amount,
        category=t.category,
        date=str(t.date),
        time=t.time,
        duration_months=t.duration_months,
        is_income=t.is_income,
    )


@router.get("", response_model=list[schemas.TransactionOut])
def list_transactions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return [_tx_out(t) for t in crud.get_transactions(db, current_user.id)]


@router.post("", response_model=schemas.TransactionOut, status_code=status.HTTP_201_CREATED)
def create_transaction(
    payload: schemas.TransactionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not crud.category_exists(db, current_user.id, payload.category):
        raise HTTPException(status_code=400, detail=f"Unknown category '{payload.category}'")
    tx = crud.create_transaction(db, current_user.id, payload)
    return _tx_out(tx)


@router.put("/{tx_id}", response_model=schemas.TransactionOut)
def update_transaction(
    tx_id: str,
    payload: schemas.TransactionUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not crud.category_exists(db, current_user.id, payload.category):
        raise HTTPException(status_code=400, detail=f"Unknown category '{payload.category}'")
    tx = crud.update_transaction(db, current_user.id, tx_id, payload)
    if tx is None:
        raise HTTPException(status_code=404, detail="Transaction not found or not editable")
    return _tx_out(tx)


@router.delete("/{tx_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    tx_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    ok = crud.delete_transaction(db, current_user.id, tx_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Transaction not found")
