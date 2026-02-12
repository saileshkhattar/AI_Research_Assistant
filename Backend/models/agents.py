from database import Base
from sqlalchemy import Column, String, DateTime

class Agent(Base):
    __tablename__ = "agents"

    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False)
    name = Column(String)
    type = Column(String, default="knowledge")