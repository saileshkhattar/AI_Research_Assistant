import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db

from models.chat import Chat
from models.message import Message
from models.agent import Agent
from models.users import User
from models.savedPages import SavedPage

router = APIRouter()


# ---------------------------------------------------
# Create new chat
# ---------------------------------------------------
@router.post("/chats")
def create_chat(
    user_id: str,
    agent_id: str,
    page_id: str | None = None,
    title: str | None = None,
    db: Session = Depends(get_db)
):

    # validate user
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(404, "User not found")

    # validate agent ownership
    agent = db.query(Agent).filter(
        Agent.id == agent_id,
        Agent.user_id == user_id
    ).first()

    if not agent:
        raise HTTPException(403, "Agent does not belong to user")

    # validate page ownership (optional)
    if page_id:
        page = db.query(SavedPage).filter(
            SavedPage.id == page_id,
            SavedPage.agent_id == agent_id,
            SavedPage.user_id == user_id
        ).first()

        if not page:
            raise HTTPException(403, "Page does not belong to agent")

    chat = Chat(
        id=str(uuid.uuid4()),
        user_id=user_id,
        agent_id=agent_id,
        page_id=page_id,
        title=title or "New Chat"
    )

    db.add(chat)
    db.commit()

    return chat


# ---------------------------------------------------
# Get chats for agent
# ---------------------------------------------------
@router.get("/chats/{agent_id}")
def get_chats(
    agent_id: str,
    user_id: str,
    db: Session = Depends(get_db)
):

    # validate ownership
    agent = db.query(Agent).filter(
        Agent.id == agent_id,
        Agent.user_id == user_id
    ).first()

    if not agent:
        raise HTTPException(403, "Agent not found")

    chats = db.query(Chat).filter(
        Chat.agent_id == agent_id,
        Chat.user_id == user_id
    ).order_by(Chat.created_at.desc()).all()

    return chats


# ---------------------------------------------------
# Get messages for chat
# ---------------------------------------------------
@router.get("/messages/{chat_id}")
def get_messages(
    chat_id: str,
    user_id: str,
    db: Session = Depends(get_db)
):

    chat = db.query(Chat).filter(
        Chat.id == chat_id,
        Chat.user_id == user_id
    ).first()

    if not chat:
        raise HTTPException(403, "Chat not found")

    messages = db.query(Message).filter(
        Message.chat_id == chat_id
    ).order_by(Message.created_at.asc()).all()

    return messages