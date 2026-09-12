from sqlalchemy import Column, DateTime, ForeignKey, String
from datetime import datetime, timezone
from database import Base


class Consent(Base):
    """The user's latest recorded acceptance of the ToS/Privacy Policy.

    This is the authoritative, server-side proof of consent — the backend
    always writes CURRENT_TOS_VERSION/CURRENT_PRIVACY_VERSION into this row
    itself (see consentGate.py); it never trusts a version number supplied
    by the client. One row per user reflects their *current* standing
    consent, not a full history.
    """
    __tablename__ = "consents"

    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    tos_version = Column(String, nullable=False)
    privacy_version = Column(String, nullable=False)
    accepted_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    ip_address = Column(String, nullable=True)