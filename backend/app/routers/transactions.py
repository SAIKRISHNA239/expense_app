from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.auth import get_current_user
from app.database import get_db

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


@router.get("", response_model=list[schemas.TransactionOut])
def list_transactions(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    """Return all transactions ordered newest-first."""
    txs = crud.get_transactions(db)
    return [
        schemas.TransactionOut(
            id=t.id,
            amount=t.amount,
            category=t.category,
            date=str(t.date),
            time=t.time,
            duration_months=t.duration_months,
            is_income=t.is_income,
        )
        for t in txs
    ]


@router.post("", response_model=schemas.TransactionOut, status_code=status.HTTP_201_CREATED)
def create_transaction(
    payload: schemas.TransactionCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    tx = crud.create_transaction(db, payload)
    return schemas.TransactionOut(
        id=tx.id,
        amount=tx.amount,
        category=tx.category,
        date=str(tx.date),
        time=tx.time,
        duration_months=tx.duration_months,
        is_income=tx.is_income,
    )


@router.delete("/{tx_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    tx_id: str,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    ok = crud.delete_transaction(db, tx_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Transaction not found")
