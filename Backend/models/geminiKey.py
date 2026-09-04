from sqlalchemy import Column, DateTime, ForeignKey, String
from datetime import datetime, timezone
from database import Base


class GeminiKey(Base):
    __tablename__ = "gemini_keys"
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    ciphertext = Column(String, nullable=False)
    updated_at = Column(DateTime, default=datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc), nullable=False)
