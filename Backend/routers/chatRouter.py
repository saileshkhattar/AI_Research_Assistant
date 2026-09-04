import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.chat import Chat
from models.message import Message
from models.agents import Agent
from models.users import User
from models.savedPages import SavedPage
from security import get_current_user
from requestSchemas.requestSchemas import RenameChatRequest

router = APIRouter()


# -------------------------------------------------------
# Create chat
# -------------------------------------------------------
@router.post("/chats")
def create_chat(
    agent_id: str,
    page_id: str | None = None,
    title: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    agent = db.query(Agent).filter(
        Agent.id == agent_id, Agent.user_id == user.id
    ).first()
    if not agent:
        raise HTTPException(403, "Agent does not belong to user")

    if page_id:
        page = db.query(SavedPage).filter(
            SavedPage.id == page_id,
            SavedPage.agent_id == agent_id,
            SavedPage.user_id == user.id,
        ).first()
        if not page:
            raise HTTPException(403, "Page does not belong to agent")

    chat = Chat(
        id=str(uuid.uuid4()),
        user_id=user.id,
        agent_id=agent_id,
        page_id=page_id,
        title=title or "New Chat",
    )
    db.add(chat)
    db.commit()
    db.refresh(chat)
    return chat


# -------------------------------------------------------
# Get chats for agent
# -------------------------------------------------------
@router.get("/chats/{agent_id}")
def get_chats(agent_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    agent = db.query(Agent).filter(
        Agent.id == agent_id, Agent.user_id == user.id
    ).first()
    if not agent:
        raise HTTPException(403, "Agent not found")

    chats = db.query(Chat).filter(
        Chat.agent_id == agent_id,
        Chat.user_id == user.id,
    ).order_by(Chat.created_at.desc()).all()

    return chats


# -------------------------------------------------------
# Get messages for chat
# FIX: was missing `return messages` — every call returned null
# -------------------------------------------------------
@router.get("/messages/{chat_id}")
def get_messages(chat_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    chat = db.query(Chat).filter(
        Chat.id == chat_id, Chat.user_id == user.id
    ).first()
    if not chat:
        raise HTTPException(403, "Chat not found")

    messages = db.query(Message).filter(
        Message.chat_id == chat_id
    ).order_by(Message.created_at.asc()).all()

    return messages   # FIX: this line was missing


# -------------------------------------------------------
# Rename a chat
# -------------------------------------------------------
@router.patch("/chats/{chat_id}/title")
def rename_chat(
    chat_id: str,
    req: RenameChatRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    chat = db.query(Chat).filter(
        Chat.id == chat_id, Chat.user_id == user.id
    ).first()
    if not chat:
        raise HTTPException(404, "Chat not found")

    chat.title = req.title.strip() or "New Chat"
    db.commit()
    db.refresh(chat)
    return chat


# -------------------------------------------------------
# Delete a chat
# -------------------------------------------------------
@router.delete("/chats/{chat_id}")
def delete_chat(chat_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    chat = db.query(Chat).filter(
        Chat.id == chat_id, Chat.user_id == user.id
    ).first()
    if not chat:
        raise HTTPException(404, "Chat not found")

    db.delete(chat)
    db.commit()
    return {"deleted": chat_id}
