"""Authentication and encrypted per-user Gemini key handling."""
import os
from datetime import datetime, timedelta, timezone

import httpx
import jwt
from cryptography.fernet import Fernet, InvalidToken
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from database import get_db
from models.users import User

bearer = HTTPBearer(auto_error=False)
JWT_ALGORITHM = "HS256"


def _required_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"{name} must be configured")
    return value


def _jwt_secret() -> str:
    return _required_env("AUTH_JWT_SECRET")


def _fernet() -> Fernet:
    return Fernet(_required_env("GEMINI_KEY_ENCRYPTION_KEY").encode())


def create_session_token(user: User) -> str:
    return jwt.encode(
        {"sub": user.id, "exp": datetime.now(timezone.utc) + timedelta(days=7)},
        _jwt_secret(), algorithm=JWT_ALGORITHM,
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sign in is required")
    try:
        payload = jwt.decode(credentials.credentials, _jwt_secret(), algorithms=[JWT_ALGORITHM])
        user_id = payload["sub"]
    except (jwt.PyJWTError, KeyError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired session")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session user no longer exists")
    return user


async def verify_google_access_token(access_token: str) -> dict:
    """Validate a Chrome Identity token with Google and check its audience."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                "https://oauth2.googleapis.com/tokeninfo", params={"access_token": access_token}
            )
        response.raise_for_status()
        claims = response.json()
    except (httpx.HTTPError, ValueError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Google sign-in token is invalid")
    if claims.get("aud") != _required_env("GOOGLE_OAUTH_CLIENT_ID") or not claims.get("sub"):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Google sign-in token is not for this extension")
    if claims.get("verified_email") not in ("true", True):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Google email must be verified")
    return claims


def encrypt_gemini_key(key: str) -> str:
    return _fernet().encrypt(key.encode()).decode()


def decrypt_gemini_key(ciphertext: str) -> str:
    try:
        return _fernet().decrypt(ciphertext.encode()).decode()
    except (InvalidToken, UnicodeDecodeError):
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Stored API key cannot be decrypted")
