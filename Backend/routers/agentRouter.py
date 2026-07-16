from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import uuid

from database import get_db
from models.agents import Agent
from models.savedPages import SavedPage
from requestSchemas.requestSchemas import CreateAgentRequest, SavedPageResponse
from helpers.urlHelper import display_url

router = APIRouter()


# -------------------------------------------------------
# IMPORTANT: specific paths MUST come before parameterised
# ones — FastAPI matches top-to-bottom and /agents/{user_id}
# would swallow /agents/{agent_id}/urls otherwise.
# -------------------------------------------------------

@router.get("/agents/{agent_id}/urls", response_model=List[SavedPageResponse])
def get_agent_urls(agent_id: str, user_id: str, db: Session = Depends(get_db)):
    """
    Return all saved pages for a given agent, newest first.
    Each page includes a `display_url` — scheme/www stripped,
    truncated at 60 chars — ready for the sidebar.
    """
    agent = db.query(Agent).filter(Agent.id == agent_id, Agent.user_id == user_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    pages = (
        db.query(SavedPage)
        .filter(SavedPage.agent_id == agent_id, SavedPage.user_id == user_id)
        .order_by(SavedPage.created_at.desc())
        .all()
    )

    return [
        SavedPageResponse(
            id=p.id,
            agent_id=p.agent_id,
            user_id=p.user_id,
            url=p.url,
            display_url=display_url(p.url),
            title=p.title or "",
            created_at=p.created_at,
        )
        for p in pages
    ]


@router.get("/agents/{user_id}")
def get_agents(user_id: str, db: Session = Depends(get_db)):
    """Return all agents belonging to a user."""
    agents = db.query(Agent).filter(Agent.user_id == user_id).all()
    return agents


@router.post("/agents")
def create_agent(req: CreateAgentRequest, db: Session = Depends(get_db)):
    """Create a new custom agent."""
    agent = Agent(
        id=str(uuid.uuid4()),
        user_id=req.user_id,
        name=req.name,
        type="custom",
    )
    db.add(agent)
    db.commit()
    db.refresh(agent)
    return agent


@router.delete("/agents/{agent_id}")
def delete_agent(agent_id: str, user_id: str, db: Session = Depends(get_db)):
    """Delete a custom agent and all its data. System agents are protected."""
    agent = db.query(Agent).filter(
        Agent.id == agent_id,
        Agent.user_id == user_id,
    ).first()

    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    if agent.type in ("general", "system_inbox"):
        raise HTTPException(status_code=403, detail="Cannot delete system agents")

    db.delete(agent)
    db.commit()
    return {"deleted": agent_id}
