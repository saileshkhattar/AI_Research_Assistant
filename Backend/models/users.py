from database import Base
from sqlalchemy import Column, String, DateTime
from datetime import datetime, timezone


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key = True)
    created_at = Column(DateTime, default = datetime.now(timezone.utc))