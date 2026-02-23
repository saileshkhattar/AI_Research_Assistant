from database import Base
from sqlalchemy import Column, String, ForeignKey, Index
from sqlalchemy.orm import relationship


class Agent(Base):
    __tablename__ = "agents"

    id = Column(String, primary_key=True)

    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    name = Column(String)

    type = Column(String, default="knowledge", index=True)

    chats = relationship(
        "Chat",
        cascade="all, delete-orphan"
    )

    user = relationship("User")


Index("idx_user_agents", Agent.user_id)