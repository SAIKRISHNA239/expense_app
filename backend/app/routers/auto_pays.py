from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.auth import get_current_user
from app.database import get_db

router = APIRouter(prefix="/api/auto-pays", tags=["auto-pays"])


@router.get("", response_model=list[schemas.AutoPayOut])
def list_auto_pays(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    return crud.get_auto_pays(db)


@router.post("", response_model=schemas.AutoPayOut, status_code=status.HTTP_201_CREATED)
def create_auto_pay(
    payload: schemas.AutoPayCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    ap = crud.create_auto_pay(db, payload)
    from app.services import run_auto_billing
    run_auto_billing(db)
    return ap


@router.delete("/{ap_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_auto_pay(
    ap_id: str,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    ok = crud.delete_auto_pay(db, ap_id)
    if not ok:
        raise HTTPException(status_code=404, detail="AutoPay not found")
