import uuid

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from sqlalchemy.orm import Session

from database import get_db

from models.chat import Chat
from models.message import Message
from models.agents import Agent
from models.users import User

from requestSchemas.requestSchemas import QueryRequest

from ragSetup.ragServices import stream_generate_response


router = APIRouter()


@router.post("/query/stream")
def query_stream(
    req: QueryRequest,
    db: Session = Depends(get_db)
):
    # -------------------------------------------------------
    # If no chat_id provided → auto-create a new chat
    # -------------------------------------------------------
    chat_id = req.chat_id
    chat_created = False
    print(chat_id)
    if not chat_id:
        # Validate user + agent exist and belong together
        agent = db.query(Agent).filter(
            Agent.id == req.agent_id,
            Agent.user_id == req.user_id
        ).first()

        if not agent:
            raise HTTPException(403, "Agent not found or does not belong to user")

        new_chat = Chat(
            id=str(uuid.uuid4()),
            user_id=req.user_id,
            agent_id=req.agent_id,
            page_id=req.page_id,
            title="New Chat"
        )

        db.add(new_chat)
        db.commit()
        db.refresh(new_chat)

        chat_id = new_chat.id
        chat_created = True

        print(f"Auto-created chat: {chat_id}")

    else:
        # Validate the provided chat_id belongs to this user
        chat = db.query(Chat).filter(
            Chat.id == chat_id,
            Chat.user_id == req.user_id
        ).first()

        if not chat:
            raise HTTPException(403, "Chat not found or does not belong to user")

    # -------------------------------------------------------
    # Save the user message
    # -------------------------------------------------------
    user_message = Message(
        id=str(uuid.uuid4()),
        chat_id=chat_id,
        agent_id=req.agent_id,
        user_id=req.user_id,
        role="user",
        content=req.question
    )

    db.add(user_message)
    db.commit()

    # -------------------------------------------------------
    # Stream the response, save assistant message at the end
    # -------------------------------------------------------
    full_response = ""

    def generator():
        nonlocal full_response

        for token in stream_generate_response(
            db,
            req.user_id,
            req.agent_id,
            chat_id,
            req.question,
            req.page_id
        ):
            full_response += token
            yield token

        assistant_message = Message(
            id=str(uuid.uuid4()),
            chat_id=chat_id,
            agent_id=req.agent_id,
            user_id=req.user_id,
            role="assistant",
            content=full_response
        )

        db.add(assistant_message)
        db.commit()

    # -------------------------------------------------------
    # Return chat_id in response headers so frontend can save it
    # -------------------------------------------------------
    headers = {
        "X-Chat-Id": chat_id,
        "Access-Control-Expose-Headers": "X-Chat-Id",   # required for CORS
    }

    return StreamingResponse(
        generator(),
        media_type="text/plain",
        headers=headers
    )