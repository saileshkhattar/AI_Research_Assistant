from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import uuid

from database import get_db
from models.agents import Agent

router = APIRouter()


@router.get("/agents/{user_id}")
def get_agents(user_id: str, db: Session = Depends(get_db)):

    agents = db.query(Agent).filter(
        Agent.user_id == user_id
    ).all()

    # ⭐ Create defaults if missing
    if not agents:

        inbox = Agent(
            id=str(uuid.uuid4()),
            user_id=user_id,
            name="Inbox",
            type="system_inbox"
        )

        general = Agent(
            id=str(uuid.uuid4()),
            user_id=user_id,
            name="General",
            type="general"
        )

        db.add_all([inbox, general])
        db.commit()

        agents = [inbox, general]

    return agents
