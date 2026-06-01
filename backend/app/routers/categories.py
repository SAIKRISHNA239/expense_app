from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.auth import get_current_user
from app.database import get_db

router = APIRouter(prefix="/api/categories", tags=["categories"])


@router.get("", response_model=list[str])
def list_categories(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    cats = crud.get_categories(db, current_user.id)
    return [c.name for c in cats if c.name not in crud.RESERVED_CATEGORIES]


@router.post("", response_model=schemas.CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(
    payload: schemas.CategoryCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if payload.name.strip() in crud.RESERVED_CATEGORIES:
        raise HTTPException(status_code=400, detail="That category name is reserved.")
    cat = crud.create_category(db, current_user.id, payload.name)
    if cat is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Category '{payload.name}' already exists.",
        )
    return cat


@router.delete("/{name}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    name: str,
    reassign_to: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if reassign_to and not crud.category_exists(db, current_user.id, reassign_to):
        raise HTTPException(status_code=400, detail=f"Reassign target '{reassign_to}' does not exist.")
    ok = crud.delete_category(db, current_user.id, name, reassign_to)
    if not ok:
        raise HTTPException(status_code=404, detail="Category not found or reserved")
