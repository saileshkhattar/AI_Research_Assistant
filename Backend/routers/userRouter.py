from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from consentGate import get_consent_status, require_consent
from database import get_db
from helpers.agentHelper import ensure_default_agents
from models.providerKeys import ProviderKey
from models.users import User
from requestSchemas.requestSchemas import GoogleSignInRequest, ProviderKeyRequest
from security import create_session_token, decrypt_secret, encrypt_secret, get_current_user, verify_google_access_token

router = APIRouter()

SUPPORTED_PROVIDERS = {
    "groq": "Groq",
}


def _validate_provider(provider: str) -> str:
    if provider not in SUPPORTED_PROVIDERS:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Unknown provider '{provider}'")
    return provider


def _key_flags(user: User) -> dict:
    present = {pk.provider for pk in user.provider_keys}
    return {f"has_{provider}_key": provider in present for provider in SUPPORTED_PROVIDERS}


@router.post("/auth/google")
async def sign_in_with_google(req: GoogleSignInRequest, db: Session = Depends(get_db)):
    claims = await verify_google_access_token(req.access_token)
    user = db.query(User).filter(User.google_sub == claims["sub"]).first()
    if not user:
        user = User(google_sub=claims["sub"], email=claims["email"].lower())
        db.add(user)
        db.commit()
        db.refresh(user)
        ensure_default_agents(db, user.id)
    return {
        "access_token": create_session_token(user),
        "user": {"id": user.id, "email": user.email},
        **_key_flags(user),
        **get_consent_status(db, user),
    }


@router.get("/me")
def get_me(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return {"id": user.id, "email": user.email, **_key_flags(user), **get_consent_status(db, user)}


@router.put("/me/keys/{provider}", status_code=status.HTTP_204_NO_CONTENT)
def save_provider_key(
    provider: str,
    req: ProviderKeyRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_consent),
):
    provider = _validate_provider(provider)
    record = (
        db.query(ProviderKey)
        .filter(ProviderKey.user_id == user.id, ProviderKey.provider == provider)
        .first()
    )
    if record:
        record.ciphertext = encrypt_secret(req.api_key)
    else:
        db.add(ProviderKey(user_id=user.id, provider=provider, ciphertext=encrypt_secret(req.api_key)))
    db.commit()


@router.delete("/me/keys/{provider}", status_code=status.HTTP_204_NO_CONTENT)
def delete_provider_key(provider: str, db: Session = Depends(get_db), user: User = Depends(require_consent)):
    provider = _validate_provider(provider)
    record = (
        db.query(ProviderKey)
        .filter(ProviderKey.user_id == user.id, ProviderKey.provider == provider)
        .first()
    )
    if record:
        db.delete(record)
        db.commit()


def get_user_provider_key(db: Session, user: User, provider: str) -> str:
    """Fetch + decrypt a user's key for the given provider ('groq' or 'huggingface').

    Raises 428 Precondition Required if the user hasn't added one yet —
    the frontend should route them to Settings on this status code.
    """
    provider = _validate_provider(provider)
    record = (
        db.query(ProviderKey)
        .filter(ProviderKey.user_id == user.id, ProviderKey.provider == provider)
        .first()
    )
    if not record:
        raise HTTPException(
            status.HTTP_428_PRECONDITION_REQUIRED,
            f"Add a {SUPPORTED_PROVIDERS[provider]} API key in Settings",
        )
    return decrypt_secret(record.ciphertext)