"""
Auth router — register and login endpoints.

POST /api/auth/register  — create a new user account
POST /api/auth/login     — exchange credentials for a JWT (OAuth2 password flow)
GET  /api/auth/me        — return the currently authenticated user's info
DELETE /api/auth/me      — permanently delete account and all data (Play Store requirement)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.auth import create_access_token, get_current_user, hash_password, verify_password
from app.database import get_db

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=schemas.UserOut,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
)
def register(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    # Reject duplicate usernames
    existing = db.query(models.User).filter(models.User.username == payload.username).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Username '{payload.username}' is already taken.",
        )

    user = models.User(
        username=payload.username,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    crud.seed_user_defaults(db, user.id)
    return user


@router.post(
    "/login",
    response_model=schemas.Token,
    summary="Login and receive a JWT (OAuth2 Password Flow)",
)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """
    Accepts `username` + `password` as form fields (OAuth2 standard).
    Returns a Bearer token to include in the Authorization header for all
    subsequent requests.

    In Swagger UI: click the 🔒 Authorize button at the top of the page.
    """
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(user.username)
    return schemas.Token(access_token=token, token_type="bearer")


@router.get(
    "/me",
    response_model=schemas.UserOut,
    summary="Return the currently authenticated user",
)
def get_me(current_user: models.User = Depends(get_current_user)):
    """Use this endpoint to verify that your token is valid."""
    return current_user


@router.delete(
    "/me",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Permanently delete your account and all data",
)
def delete_account(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Required for Google Play Store apps that allow registration.
    Deletes the user, all transactions, categories, auto-pays, and budget settings.
    This action is irreversible.
    """
    ok = crud.delete_user_account(db, current_user.id)
    if not ok:
        raise HTTPException(status_code=404, detail="User not found")
