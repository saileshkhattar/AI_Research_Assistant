import uuid

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from sqlalchemy.orm import Session

from database import get_db, SessionLocal
from models.chat import Chat
from models.message import Message
from models.agents import Agent

from requestSchemas.requestSchemas import QueryRequest
from ragSetup.ragServices import stream_generate_response, generate_chat_title

router = APIRouter()


@router.post("/query/stream")
def query_stream(req: QueryRequest, db: Session = Depends(get_db)):

    # -------------------------------------------------------
    # Auto-create chat if no chat_id provided
    # -------------------------------------------------------
    chat_id = req.chat_id

    if not chat_id:
        agent = db.query(Agent).filter(
            Agent.id == req.agent_id,
            Agent.user_id == req.user_id,
        ).first()

        if not agent:
            raise HTTPException(403, "Agent not found or does not belong to user")

        # Generate a real title from the first message instead of "New Chat"
        try:
            title = generate_chat_title(agent.type, req.question)
        except Exception:
            title = req.question[:60] or "New Chat"

        new_chat = Chat(
            id=str(uuid.uuid4()),
            user_id=req.user_id,
            agent_id=req.agent_id,
            page_id=req.page_id,
            title=title,
        )
        db.add(new_chat)
        db.commit()
        db.refresh(new_chat)

        chat_id = new_chat.id

    else:
        chat = db.query(Chat).filter(
            Chat.id == chat_id,
            Chat.user_id == req.user_id,
        ).first()

        if not chat:
            raise HTTPException(403, "Chat not found or does not belong to user")

    # -------------------------------------------------------
    # Save the user message (using the request-scoped session)
    # -------------------------------------------------------
    user_message = Message(
        id=str(uuid.uuid4()),
        chat_id=chat_id,
        agent_id=req.agent_id,
        user_id=req.user_id,
        role="user",
        content=req.question,
    )
    db.add(user_message)
    db.commit()

    # -------------------------------------------------------
    # Snapshot everything the generator needs BEFORE the
    # request-scoped `db` session is closed.
    # The generator runs lazily after the handler returns, so
    # it must NOT reference `db`, `req`, or any SQLAlchemy
    # objects loaded from `db` — they will all be detached/closed.
    # -------------------------------------------------------
    _user_id = req.user_id
    _agent_id = req.agent_id
    _chat_id = chat_id
    _question = req.question
    _page_id = req.page_id

    # -------------------------------------------------------
    # FIX: open a FRESH session inside the generator.
    # The request-scoped `db` is closed by FastAPI's dependency
    # injector when query_stream() returns — which happens before
    # the StreamingResponse body is consumed. Using `db` inside
    # the generator causes "Session is closed" / DetachedInstance errors.
    # -------------------------------------------------------
    def generator():
        full_response = ""

        # Fresh independent session — lives for the duration of the stream
        gen_db = SessionLocal()
        try:
            for token in stream_generate_response(
                gen_db,
                _user_id,
                _agent_id,
                _chat_id,
                _question,
                _page_id,
            ):
                full_response += token
                yield token

            # Save the complete assistant message once streaming finishes
            assistant_message = Message(
                id=str(uuid.uuid4()),
                chat_id=_chat_id,
                agent_id=_agent_id,
                user_id=_user_id,
                role="assistant",
                content=full_response,
            )
            gen_db.add(assistant_message)
            gen_db.commit()

        except Exception as e:
            gen_db.rollback()
            # Yield an error token so the frontend shows something useful
            yield f"\n\n[Error: {str(e)}]"
        finally:
            gen_db.close()

    headers = {
        "X-Chat-Id": chat_id,
        "Access-Control-Expose-Headers": "X-Chat-Id",
    }

    return StreamingResponse(generator(), media_type="text/plain", headers=headers)