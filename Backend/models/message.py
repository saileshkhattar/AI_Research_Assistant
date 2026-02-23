from sqlalchemy import Column, String, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid

from database import Base


class Message(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))

    # ownership hierarchy
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    agent_id = Column(String, ForeignKey("agents.id", ondelete="CASCADE"), nullable=False, index=True)

    chat_id = Column(String, ForeignKey("chats.id", ondelete="CASCADE"), nullable=False, index=True)

    # message info
    role = Column(String, nullable=False)  # "user", "assistant", "system"

    content = Column(String, nullable=False)

    created_at = Column(DateTime, default=datetime.now(timezone.utc), index=True)

    # relationships (optional but strongly recommended)
    chat = relationship("Chat", back_populates="messages")

    agent = relationship("Agent")

    user = relationship("User")


# Composite index for fast chat message retrieval
Index("idx_chat_created", Message.chat_id, Message.created_at)