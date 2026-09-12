"""Consent-version constants and the dependency that gates protected routes on them."""
import logging
from datetime import datetime, timezone

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models.consent import Consent
from models.users import User
from security import get_current_user

logger = logging.getLogger("consent")

# Bump either constant to force every user back through the consent screen
# on their next request — the require_consent dependency compares against
# whatever's stored in the user's `consents` row.
CURRENT_TOS_VERSION = "1.0"
CURRENT_PRIVACY_VERSION = "1.0"


def get_consent_status(db: Session, user: User) -> dict:
    record = db.query(Consent).filter(Consent.user_id == user.id).first()
    is_current = bool(
        record
        and record.tos_version == CURRENT_TOS_VERSION
        and record.privacy_version == CURRENT_PRIVACY_VERSION
    )
    return {
        "consent_current": is_current,
        "tos_version": CURRENT_TOS_VERSION,
        "privacy_version": CURRENT_PRIVACY_VERSION,
    }


def require_consent(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> User:
    """Route dependency: blocks access unless the user's consent record is
    present and matches the current ToS/Privacy versions.

    Raises 403 with a machine-readable `code` (CONSENT_REQUIRED) rather than
    a generic 401/403, so the extension/chat-ui can specifically catch this
    and redirect to the consent screen instead of treating it as a login
    failure.
    """
    consent_status = get_consent_status(db, user)
    if not consent_status["consent_current"]:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail={
                "code": "CONSENT_REQUIRED",
                "message": "Please review and accept the latest Terms of Service and Privacy Policy.",
                "tos_version": CURRENT_TOS_VERSION,
                "privacy_version": CURRENT_PRIVACY_VERSION,
            },
        )
    return user


def record_consent(db: Session, user: User, ip_address: str | None) -> Consent:
    """Stamp the server's own CURRENT_TOS_VERSION/CURRENT_PRIVACY_VERSION onto
    this user's consent row — never anything the client sent us. This is
    the actual legal proof of consent, so nothing here is client-trusted."""
    record = db.query(Consent).filter(Consent.user_id == user.id).first()
    now = datetime.now(timezone.utc)

    if record:
        record.tos_version = CURRENT_TOS_VERSION
        record.privacy_version = CURRENT_PRIVACY_VERSION
        record.accepted_at = now
        record.ip_address = ip_address
    else:
        record = Consent(
            user_id=user.id,
            tos_version=CURRENT_TOS_VERSION,
            privacy_version=CURRENT_PRIVACY_VERSION,
            accepted_at=now,
            ip_address=ip_address,
        )
        db.add(record)

    db.commit()

    # Minimal audit trail: timestamp (via the log record itself), version,
    # and internal user id only — no IP, no email.
    logger.info("consent_recorded user_id=%s tos=%s privacy=%s", user.id, CURRENT_TOS_VERSION, CURRENT_PRIVACY_VERSION)
    return record