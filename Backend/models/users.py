from database import Base
from sqlalchemy import Column, String, DateTime, Index
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid
 
 
class User(Base):
    __tablename__ = "users"
 
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    google_sub = Column(String, nullable=False, unique=True, index=True)
    email = Column(String, nullable=False, unique=True, index=True)
 
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
 
    agents = relationship("Agent", cascade="all, delete-orphan")
    chats = relationship("Chat", cascade="all, delete-orphan")
    messages = relationship("Message", cascade="all, delete-orphan")
    provider_keys = relationship("ProviderKey", cascade="all, delete-orphan")
