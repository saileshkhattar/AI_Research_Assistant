from sqlalchemy import Column, String, DateTime
from datetime import datetime, timezone
from database import Base

class Chat(Base):
    __tablename__ = "chats"

    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False)
    agent_id = Column(String, nullable=False)
    page_id = Column(String, nullable=True)   # ⭐ NEW
    title = Column(String)
    created_at = Column(DateTime, default=datetime.now(timezone.utc))