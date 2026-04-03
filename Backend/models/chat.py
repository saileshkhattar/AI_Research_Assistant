from sqlalchemy import Column, String, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid
 
from database import Base
 
 
class Chat(Base):
    __tablename__ = "chats"
 
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
 
    user_id = Column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
 
    agent_id = Column(
        String, ForeignKey("agents.id", ondelete="CASCADE"), nullable=False, index=True
    )
 
    page_id = Column(
        String, ForeignKey("saved_pages.id", ondelete="SET NULL"), nullable=True, index=True
    )
 
    title = Column(String, default="New Chat")
 
    created_at = Column(DateTime, default=datetime.now(timezone.utc), index=True)
 
    messages = relationship("Message", back_populates="chat", cascade="all, delete-orphan")
    agent = relationship("Agent")
    user = relationship("User")
 
 
Index("idx_agent_created", Chat.agent_id, Chat.created_at)