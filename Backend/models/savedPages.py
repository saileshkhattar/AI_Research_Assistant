from database import Base
from sqlalchemy import Column, String, DateTime, UniqueConstraint
from datetime import datetime, UTC
import uuid


class SavedPage(Base):
    __tablename__ = "saved_pages"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False)
    agent_id = Column(String, nullable=False)
    url = Column(String, nullable=False)
    title = Column(String)
    created_at = Column(DateTime, default=datetime.now(UTC))

    __table_args__ = (
        UniqueConstraint("agent_id", "url", name="unique_agent_url"),
    )