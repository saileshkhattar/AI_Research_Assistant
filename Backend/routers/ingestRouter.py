from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.users import User
from models.agents import Agent
from models.savedPages import SavedPage
from requestSchemas.requestSchemas import IngestRequest, SavedPageResponse
from helpers.urlHelper import normalize_url, check_if_url_exists, display_url
from ragSetup.ragArchitecture import text_splitter
from ragSetup.retrieverFactory import get_vectorstore
from security import get_current_user
from routers.userRouter import get_user_gemini_key
from langchain_core.documents import Document

router = APIRouter()


@router.post("/ingest_page", response_model=dict)
async def ingest_page(
    req: IngestRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Normalise the URL, validate ownership, embed the page content into
    Chroma, and save a SavedPage record. Returns the new page_id.
    """
    normalized = normalize_url(req.url)

    agent = db.query(Agent).filter(
        Agent.id == req.agent_id,
        Agent.user_id == user.id,
    ).first()
    if not agent:
        raise HTTPException(status_code=403, detail="Agent does not belong to user")

    if check_if_url_exists(db, req.agent_id, normalized):
        raise HTTPException(status_code=400, detail="Page already saved for this agent")

    new_page = SavedPage(
        user_id=user.id,
        agent_id=req.agent_id,
        url=normalized,
        title=req.title or "",
    )
    db.add(new_page)
    db.flush()  # get ID without committing

    try:
        document = Document(
            page_content=req.content,
            metadata={
                "user_id": user.id,
                "agent_id": req.agent_id,
                "page_id": str(new_page.id),
                "url": normalized,
                "title": req.title or "",
            },
        )
        docs = text_splitter.split_documents([document])
        get_vectorstore(get_user_gemini_key(db, user)).add_documents(docs)
        # NOTE: vectorstore.persist() removed — chromadb >= 0.4 auto-persists

    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Could not store page embeddings")

    db.commit()

    return {
        "message": "Page ingested successfully",
        "page_id": new_page.id,
        "display_url": display_url(normalized),
        "added_chunks": len(docs),
    }


@router.delete("/pages/{page_id}")
def delete_page(page_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """
    Delete a saved page from the DB and remove its vectors from Chroma.
    """
    page = db.query(SavedPage).filter(
        SavedPage.id == page_id,
        SavedPage.user_id == user.id,
    ).first()

    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    try:
        # Deleting does not need an embedding function.
        from ragSetup.ragArchitecture import vectorstore
        collection = vectorstore._collection
        results = collection.get(where={"page_id": {"$eq": page_id}})
        if results and results.get("ids"):
            collection.delete(ids=results["ids"])
    except Exception as e:
        print(f"Warning: could not remove Chroma vectors for page {page_id}: {e}")

    db.delete(page)
    db.commit()
    return {"deleted": page_id}
