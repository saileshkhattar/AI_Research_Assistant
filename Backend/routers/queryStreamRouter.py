import uuid
 
from fastapi import APIRouter, Depends, Header, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
 
from database import get_db, SessionLocal
from models.chat import Chat
from models.message import Message
from models.agents import Agent
from models.savedPages import SavedPage
 
from requestSchemas.requestSchemas import QueryRequest
from ragSetup.ragServices import stream_generate_response, generate_chat_title
 
router = APIRouter()
 
 
@router.post("/query/stream")
def query_stream(
    req: QueryRequest,
    db: Session = Depends(get_db),
    gemini_api_key: str = Header(..., alias="X-Gemini-Api-Key", min_length=20, max_length=256),
):
 
    chat_id = req.chat_id
 
    # ─────────────────────────────────────────────────────────
    # Auto-create chat if none provided
    # ─────────────────────────────────────────────────────────
    agent = db.query(Agent).filter(
        Agent.id == req.agent_id,
        Agent.user_id == req.user_id,
    ).first()
    if not agent:
        raise HTTPException(403, "Agent not found or does not belong to user")

    if req.page_id:
        page = db.query(SavedPage).filter(
            SavedPage.id == req.page_id,
            SavedPage.agent_id == req.agent_id,
            SavedPage.user_id == req.user_id,
        ).first()
        if not page:
            raise HTTPException(403, "Page does not belong to agent")

    if not chat_id:
        # Inbox agent: every chat MUST be scoped to a single page.
        # Reject the request if no page_id is provided.
        if agent.type == "system_inbox" and not req.page_id:
            raise HTTPException(
                400,
                "Inbox chats must be linked to a saved page. "
                "Save a page first and start the chat from the Pages list."
            )
 
        try:
            title = generate_chat_title(agent.type, req.question, gemini_api_key)
        except Exception:
            title = req.question[:60] or "New Chat"
 
        new_chat = Chat(
            id=str(uuid.uuid4()),
            user_id=req.user_id,
            agent_id=req.agent_id,
            page_id=req.page_id,   # None for general/custom, required for inbox
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

        if chat.agent_id != req.agent_id:
            raise HTTPException(403, "Chat does not belong to agent")

        if req.page_id and chat.page_id != req.page_id:
            raise HTTPException(403, "Page does not belong to chat")
 
        # For inbox chats that already exist, inherit the page_id from the chat
        # so ragServices can scope retrieval to the correct page even if the
        # frontend didn't send page_id explicitly.
        if not req.page_id and chat.page_id:
            req = QueryRequest(
                user_id=req.user_id,
                agent_id=req.agent_id,
                chat_id=req.chat_id,
                question=req.question,
                page_id=chat.page_id,
            )
 
    # ─────────────────────────────────────────────────────────
    # Save user message
    # ─────────────────────────────────────────────────────────
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
 
    # Snapshot values — the request-scoped db closes before the generator runs
    _user_id  = req.user_id
    _agent_id = req.agent_id
    _chat_id  = chat_id
    _question = req.question
    _page_id  = req.page_id
    _api_key = gemini_api_key
 
    def generator():
        full_response = ""
        gen_db = SessionLocal()
        try:
            for token in stream_generate_response(
                gen_db, _user_id, _agent_id, _chat_id, _question, _page_id, _api_key
            ):
                full_response += token
                yield token
 
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
            message = str(e).lower()
            if "resource_exhausted" in message or "429" in message or "quota" in message:
                yield "\n\n[RATE_LIMITED] Gemini has reached a temporary quota. Try again later or review your Gemini API plan."
            else:
                # Do not expose provider exceptions; they can contain request details.
                yield "\n\n[Error: Gemini could not complete this request. Check your API key and try again.]"
        finally:
            gen_db.close()
 
    headers = {
        "X-Chat-Id": chat_id,
        "Access-Control-Expose-Headers": "X-Chat-Id",
    }
 
    return StreamingResponse(generator(), media_type="text/plain", headers=headers)
