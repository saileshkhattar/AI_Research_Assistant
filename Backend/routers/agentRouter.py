from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import uuid

from database import get_db
from models.agents import Agent
from helpers.agentHelper import ensure_default_agents
from models.savedPages import SavedPage
from requestSchemas.requestSchemas import CreateAgentRequest


router = APIRouter()


@router.get("/agents/{user_id}")
def get_agents(user_id: str, db: Session = Depends(get_db)):

    ensure_default_agents(db, user_id)

    agents = db.query(Agent).filter(
        Agent.user_id == user_id
    ).all()

    return agents

@router.post("/agents")
def create_agent(req: CreateAgentRequest, db: Session = Depends(get_db)):

    agent = Agent(
        id=str(uuid.uuid4()),
        user_id=req.user_id,
        name=req.name,
        type="custom"
    )

    db.add(agent)
    db.commit()

    return agent

@router.get("/agents/{agent_id}/urls")
def get_agent_urls(agent_id: str, db: Session = Depends(get_db)):

    pages = db.query(SavedPage).filter(
        SavedPage.agent_id == agent_id
    ).all()

    return pages

