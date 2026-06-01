"""
Auth router — register and login endpoints.

POST /api/auth/register  — create account + return JWT (auto sign-in)
POST /api/auth/login     — exchange credentials for JWT + user profile
GET  /api/auth/me        — return the currently authenticated user
DELETE /api/auth/me      — permanently delete account and all data
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.auth import create_access_token, get_current_user, hash_password, verify_password
from app.database import get_db

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _normalize_username(username: str) -> str:
    return username.strip()


def _find_user_by_username(db: Session, username: str) -> models.User | None:
    """Case-insensitive username lookup."""
    normalized = _normalize_username(username)
    return (
        db.query(models.User)
        .filter(func.lower(models.User.username) == normalized.lower())
        .first()
    )


def _auth_response(user: models.User) -> schemas.AuthResponse:
    token = create_access_token(user.username)
    return schemas.AuthResponse(
        access_token=token,
        token_type="bearer",
        user=schemas.UserOut.model_validate(user),
    )


@router.post(
    "/register",
    response_model=schemas.AuthResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create account and sign in",
)
def register(payload: schemas.UserRegister, db: Session = Depends(get_db)):
    username = _normalize_username(payload.username)

    if _find_user_by_username(db, username):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This username is already taken. Try another one.",
        )

    user = models.User(
        username=username,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    crud.seed_user_defaults(db, user.id)
    return _auth_response(user)


@router.post(
    "/login",
    response_model=schemas.AuthResponse,
    summary="Sign in with username and password",
)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """
    OAuth2 password flow — send `username` and `password` as form fields.
    Returns a Bearer token and user profile.
    """
    username = _normalize_username(form_data.username)
    user = _find_user_by_username(db, username)

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return _auth_response(user)


@router.get(
    "/me",
    response_model=schemas.UserOut,
    summary="Return the currently authenticated user",
)
def get_me(current_user: models.User = Depends(get_current_user)):
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
    ok = crud.delete_user_account(db, current_user.id)
    if not ok:
        raise HTTPException(status_code=404, detail="User not found")
