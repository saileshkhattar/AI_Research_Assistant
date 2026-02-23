from database import Base
from sqlalchemy import Column, String, DateTime, UniqueConstraint, ForeignKey, Index
from datetime import datetime, timezone
import uuid


class SavedPage(Base):
    __tablename__ = "saved_pages"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))

    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    agent_id = Column(String, ForeignKey("agents.id", ondelete="CASCADE"), nullable=False, index=True)

    url = Column(String, nullable=False)

    title = Column(String)

    created_at = Column(DateTime, default=datetime.now(timezone.utc), index=True)

    __table_args__ = (
        UniqueConstraint("agent_id", "url", "user_id", name="unique_agent_url"),
        Index("idx_agent_pages", "agent_id", "created_at"),
    )