from sqlalchemy import Column, DateTime, ForeignKey, String
from datetime import datetime, timezone
from database import Base


class ProviderKey(Base):
    """Encrypted per-user API key for an external provider.

    One row per (user, provider) pair — e.g. a user has a Groq key (for LLM
    calls) and a Hugging Face key (for embedding calls) stored as two
    independent rows, rather than fixed columns. Adding a new provider later
    needs no schema change, just a new `provider` value.
    """
    __tablename__ = "provider_keys"

    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    provider = Column(String, primary_key=True) 
    ciphertext = Column(String, nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )