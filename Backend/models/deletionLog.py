import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, String

from database import Base


class DeletionLog(Base):
    """Minimal, non-personal record that an account deletion occurred.

    Deliberately holds no user id, email, or other identifier — just a
    timestamp and the policy versions in effect at time of deletion, per
    the agreed default: keep an audit trail of "a deletion happened", not
    a trace of *who*.
    """
    __tablename__ = "deletion_log"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    deleted_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    tos_version = Column(String, nullable=True)
    privacy_version = Column(String, nullable=True)