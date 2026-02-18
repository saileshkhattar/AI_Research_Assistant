import uuid
from models.agents import Agent



def create_agent_if_missing(db, user_id, name, agent_type):
    agent = db.query(Agent).filter(
        Agent.user_id == user_id,
        Agent.type == agent_type
    ).first()

    if not agent:
        agent = Agent(
            id=str(uuid.uuid4()),
            user_id=user_id,
            name=name,
            type=agent_type
        )
        db.add(agent)
        db.commit()
        db.refresh(agent)

    return agent


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