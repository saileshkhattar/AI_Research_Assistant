from database import Base
from sqlalchemy import Column, String, DateTime
from datetime import datetime, UTC


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key = True)
    created_at = Column(DateTime, default = datetime.now(UTC))