"""Authentication and KMS-encrypted per-user provider-key handling."""
import base64
import hashlib
import os
from datetime import datetime, timedelta, timezone

import boto3
import httpx
import jwt
import redis
from botocore.exceptions import ClientError
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


# ─────────────────────────────────────────────────────────────────────────
# AWS KMS — encrypt/decrypt for per-user provider API keys (Groq, HF, etc.)
# ─────────────────────────────────────────────────────────────────────────

_kms_client = None


def _kms():
    """Lazily create a single boto3 KMS client for the process.

    Locally this picks up credentials from ~/.aws/credentials (the
    `default` profile). On Render/Railway it reads AWS_ACCESS_KEY_ID /
    AWS_SECRET_ACCESS_KEY straight from env vars. Same call either way —
    boto3 handles the credential lookup automatically.
    """
    global _kms_client
    if _kms_client is None:
        _kms_client = boto3.client("kms", region_name=_required_env("AWS_REGION"))
    return _kms_client


def _kms_key_id() -> str:
    return _required_env("KMS_KEY_ID")


# ─────────────────────────────────────────────────────────────────────────
# Redis decrypt cache
# Keyed by sha256(ciphertext) — not user id — so that if a user replaces
# their stored key, the new ciphertext is a fresh cache miss automatically
# and the old plaintext just expires unused. TTL keeps a decrypted key from
# sitting in Redis indefinitely and keeps KMS calls well under the 20,000
# free requests/month even under heavy use.
# ─────────────────────────────────────────────────────────────────────────

_redis_client = None
_DECRYPT_CACHE_TTL_SECONDS = int(os.getenv("KMS_DECRYPT_CACHE_TTL_SECONDS", "300"))  # 5 min


def _redis():
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(_required_env("REDIS_URL"), decode_responses=True)
    return _redis_client


def _cache_key(ciphertext_b64: str) -> str:
    return f"kms:decrypted:{hashlib.sha256(ciphertext_b64.encode()).hexdigest()}"


def encrypt_secret(plaintext: str) -> str:
    """Encrypt a small secret (API key) with KMS. Returns base64 ciphertext."""
    response = _kms().encrypt(KeyId=_kms_key_id(), Plaintext=plaintext.encode("utf-8"))
    return base64.b64encode(response["CiphertextBlob"]).decode("utf-8")


def decrypt_secret(ciphertext_b64: str) -> str:
    """Decrypt a KMS-encrypted secret, serving from the Redis cache when possible."""
    cache_key = _cache_key(ciphertext_b64)

    try:
        cached = _redis().get(cache_key)
    except redis.RedisError:
        cached = None  # cache unavailable — fall through to KMS, don't fail the request
    if cached is not None:
        return cached

    try:
        blob = base64.b64decode(ciphertext_b64)
        response = _kms().decrypt(CiphertextBlob=blob, KeyId=_kms_key_id())
        plaintext = response["Plaintext"].decode("utf-8")
    except (ClientError, ValueError):
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Stored API key cannot be decrypted")

    try:
        _redis().setex(cache_key, _DECRYPT_CACHE_TTL_SECONDS, plaintext)
    except redis.RedisError:
        pass  # cache write failure shouldn't fail the request — just costs an extra KMS call next time

    return plaintext



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
    # NOTE: kept under this name for now to avoid touching every call site
    # in the same change as the KMS migration. Will be renamed to a
    # provider-agnostic name (e.g. encrypt_provider_key) alongside the
    # Groq/HF swap, together with the GeminiKey model/table.
    return encrypt_secret(key)


def decrypt_gemini_key(ciphertext: str) -> str:
    return decrypt_secret(ciphertext)