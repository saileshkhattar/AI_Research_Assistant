import uuid

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from sqlalchemy.orm import Session

from database import get_db

from models.chat import Chat
from models.message import Message

from requestSchemas.requestSchemas import QueryRequest

from ragSetup.ragServices import stream_generate_response


router = APIRouter()


@router.post("/query/stream")
def query_stream(
    req: QueryRequest,
    db: Session = Depends(get_db)
):

    chat = db.query(Chat).filter(
        Chat.id == req.chat_id,
        Chat.user_id == req.user_id
    ).first()

    if not chat:
        raise HTTPException(403, "Chat not found")


    user_message = Message(
        id=str(uuid.uuid4()),
        chat_id=req.chat_id,
        agent_id=req.agent_id,
        user_id=req.user_id,
        role="user",
        content=req.question
    )

    db.add(user_message)
    db.commit()


    full_response = ""


    def generator():

        nonlocal full_response

        for token in stream_generate_response(
            db,
            req.user_id,
            req.agent_id,
            req.chat_id,
            req.question,
            req.page_id
        ):

            full_response += token

            yield token


        assistant_message = Message(
            id=str(uuid.uuid4()),
            chat_id=req.chat_id,
            agent_id=req.agent_id,
            user_id=req.user_id,
            role="assistant",
            content=full_response
        )

        db.add(assistant_message)
        db.commit()


    return StreamingResponse(
        generator(),
        media_type="text/plain"
    )