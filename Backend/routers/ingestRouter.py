from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from database import get_db

from models.users import User
from models.agents import Agent
from models.savedPages import SavedPage

from requestSchemas.requestSchemas import IngestRequest

from helpers.urlHelper import normalize_url, check_if_url_exists

from ragSetup.ragArchitecture import text_splitter, vectorstore

from langchain_core.documents import Document


router = APIRouter()


@router.post("/ingest_page")
async def ingest_page(
    req: IngestRequest,
    db: Session = Depends(get_db)
):
    # -----------------------------
    # Normalize URL
    # -----------------------------
    print("Attempting Ingest")
    normalized_url = normalize_url(req.url)
    print("Normalised URL = ", normalized_url)

    # -----------------------------
    # Ensure user exists
    # -----------------------------
    user = db.query(User).filter(User.id == req.user_id).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User does not exist"
        )



    # -----------------------------
    # Validate agent ownership
    # -----------------------------
    agent = (
        db.query(Agent)
        .filter(
            Agent.id == req.agent_id,
            Agent.user_id == req.user_id
        )
        .first()
    )

    if not agent:
        raise HTTPException(
            status_code=403,
            detail="Agent does not belong to user"
        )

    # -----------------------------
    # Check duplicate URL
    # -----------------------------
    if check_if_url_exists(db, req.agent_id, normalized_url):
        raise HTTPException(
            status_code=400,
            detail="Page already saved for this agent"
        )

    # -----------------------------
    # Create SavedPage (do NOT commit yet)
    # -----------------------------
    new_page = SavedPage(
        user_id=req.user_id,
        agent_id=req.agent_id,
        url=normalized_url,
        title=req.title or ""
    )

    db.add(new_page)
    db.flush()  # ⭐ Gets ID without commit

    # -----------------------------
    # Create vector documents
    # -----------------------------
    try:
        document = Document(
            page_content=req.content,
            metadata={
                "user_id": req.user_id,
                "agent_id": req.agent_id,
                "page_id": str(new_page.id),
                "url": normalized_url,
                "title": req.title or ""
            }
        )

        docs = text_splitter.split_documents([document])

        vectorstore.add_documents(docs)

        # Persist Chroma locally
        vectorstore.persist()

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Vector storage failed: {str(e)}"
        )

    # -----------------------------
    # Commit transaction
    # -----------------------------
    db.commit()

    return {
        "message": "Page ingested successfully",
        "page_id": new_page.id,
        "added_chunks": len(docs)
    }
