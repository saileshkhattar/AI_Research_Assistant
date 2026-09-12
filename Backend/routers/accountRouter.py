import logging

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from consentGate import get_consent_status
from database import get_db
from models.consent import Consent
from models.deletionLog import DeletionLog
from models.providerKeys import ProviderKey
from models.users import User
from ragSetup.ragArchitecture import vectorstore
from security import forget_cached_secret, get_current_user

router = APIRouter()
logger = logging.getLogger("account_deletion")


def _purge_vectors(user_id: str) -> None:
    """Delete every Chroma chunk belonging to this user.

    Best-effort: a Chroma failure shouldn't block the relational deletion
    the user actually asked for — we log and continue rather than leaving
    the account half-deleted because the vector store hiccuped.
    """
    try:
        collection = vectorstore._collection
        existing = collection.get(where={"user_id": {"$eq": user_id}})
        ids = existing.get("ids") if existing else None
        if ids:
            collection.delete(ids=ids)
    except Exception:
        logger.warning("vector purge failed during account deletion", exc_info=True)


@router.delete("/account")
def delete_account(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """
    Deletes the signed-in user's account and everything tied to it.

    - Identity comes ONLY from the verified session bearer token
      (get_current_user) — never a client-supplied id.
    - Chroma vectors and the Redis-cached decrypted key are purged
      explicitly (they aren't relational FK children).
    - Everything else (agents, chats, messages, saved pages, the
      provider_keys row, the consent row) cascades via each table's
      ondelete="CASCADE" FK once the user row itself is deleted — enforced
      at the DB level (SQLite has PRAGMA foreign_keys=ON; Postgres enforces
      natively), not by hand-rolled per-table delete calls.
    - Idempotent in the sense that matters for a real API: a repeat call
      with the same (now-invalid) session token gets a clean 401 from
      get_current_user itself, since that user genuinely no longer exists
      — never a 500 from re-running deletion logic against rows that are
      already gone.
    """
    user_id = user.id

    consent = db.query(Consent).filter(Consent.user_id == user_id).first()
    tos_version = consent.tos_version if consent else None
    privacy_version = consent.privacy_version if consent else None

    _purge_vectors(user_id)

    for key_row in db.query(ProviderKey).filter(ProviderKey.user_id == user_id).all():
        forget_cached_secret(key_row.ciphertext)

    db.add(DeletionLog(tos_version=tos_version, privacy_version=privacy_version))

    db.delete(user)
    db.commit()

    logger.info("account_deleted user_id=%s", user_id)  # internal id only — no email, no IP

    return {"deleted": True}