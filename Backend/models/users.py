from database import Base
from sqlalchemy import Column, String, DateTime, Index
from sqlalchemy.orm import relationship
from datetime import datetime, timezone


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True)

    created_at = Column(DateTime, default=datetime.now(timezone.utc), index=True)

    agents = relationship(
        "Agent",
        cascade="all, delete-orphan"
    )

    chats = relationship(
        "Chat",
        cascade="all, delete-orphan"
    )

    messages = relationship(
        "Message",
        cascade="all, delete-orphan"
    )