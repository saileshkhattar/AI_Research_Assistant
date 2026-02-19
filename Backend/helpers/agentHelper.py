import uuid
from models.agents import Agent

def ensure_default_agents(db, user_id):

    existing = db.query(Agent).filter(
        Agent.user_id == user_id
    ).count()

    if existing > 0:
        return

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