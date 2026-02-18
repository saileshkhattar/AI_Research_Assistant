from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models.agents import Agent
from helpers.agentHelper import ensure_default_agents

router = APIRouter()


@router.get("/agents/{user_id}")
def get_agents(user_id: str, db: Session = Depends(get_db)):

    ensure_default_agents(db, user_id)

    agents = db.query(Agent).filter(
        Agent.user_id == user_id
    ).all()

    return agents
