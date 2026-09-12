from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from consentGate import CURRENT_PRIVACY_VERSION, CURRENT_TOS_VERSION, get_consent_status, record_consent
from database import get_db
from models.users import User
from security import get_current_user

router = APIRouter()


@router.post("/consent")
def accept_consent(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Records this user's acceptance of the current ToS/Privacy Policy.
    Requires a valid session (issued right after the Google OAuth exchange)
    but nothing else — the client sends no version numbers here; the
    server always stamps its own CURRENT_TOS_VERSION/CURRENT_PRIVACY_VERSION,
    since this record is the actual legal proof of consent.
    """
    ip_address = request.client.host if request.client else None
    record_consent(db, user, ip_address)
    return {
        "tos_version": CURRENT_TOS_VERSION,
        "privacy_version": CURRENT_PRIVACY_VERSION,
    }


@router.get("/consent/status")
def consent_status(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """
    Lets the client check where it stands WITHOUT tripping the 403 that
    require_consent raises on gated routes — used right after login to
    decide whether to show the consent screen at all.
    """
    return get_consent_status(db, user)