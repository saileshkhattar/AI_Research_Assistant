from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import os
from sqlalchemy.ext.declarative import declarative_base
from typing import Optional
from sqlalchemy.orm import sessionmaker, Session
from database import engine
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException
from database import SessionLocal
from fastapi import HTTPException
from fastapi import Depends

from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from langchain_classic.retrievers import MultiQueryRetriever
from langchain_core.runnables import RunnableLambda
from langchain_core.prompts import ChatPromptTemplate
from database import Base, engine, get_db
from helpers.urlHelper import normalize_url
from helpers.agentHelper import ensure_default_agents

import models.users as User
import models.agents as Agent
import models.savedPages as SavedPage
import models.chat as Chats

Base.metadata.create_all(bind=engine)

load_dotenv()
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")



model = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    api_key=GOOGLE_API_KEY
)

embeddings = GoogleGenerativeAIEmbeddings(
    model="gemini-embedding-001",
    version="v1",
    google_api_key=GOOGLE_API_KEY
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

PERSIST_DIR = "chroma_db"

vectorstore = Chroma(
    collection_name="web_pages",
    embedding_function=embeddings,
    persist_directory=PERSIST_DIR
)

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200
)

base_retriever = vectorstore.as_retriever(
    search_type="mmr",
    search_kwargs={"k": 4}
)

multiquery = MultiQueryRetriever.from_llm(
    retriever=base_retriever,
    llm=model
)

combine_docs = RunnableLambda(
    lambda docs: "\n\n".join(d.page_content for d in docs) if docs else "No context found"
)

prompt = ChatPromptTemplate.from_messages([
    ("system", "Answer using only stored research memory."),
    ("system", "Context:\n{context}"),
    ("user", "{question}")
])

rag_chain = (
    {
        "context": multiquery | combine_docs,
        "question": lambda x: x["question"]
    }
    | prompt
    | model
)

from pydantic import BaseModel

class IngestRequest(BaseModel):
    user_id : str
    agent_id: str
    url: str
    title: Optional[str] = None
    content: str


class QueryRequest(BaseModel):
    question: str
    url: str | None = None



@app.post("/ingest_page")
async def ingest_page(
    req: IngestRequest,
    db: Session = Depends(get_db)
):
    normalized_url = normalize_url(req.url)

    # ------------------------
    # Ensure user exists
    # ------------------------
    user = db.query(User).filter(User.id == req.user_id).first()

    if not user:
        user = User(id=req.user_id)
        db.add(user)
        db.commit()
        db.refresh(user)

        ensure_default_agents(db, req.user_id)

    # ------------------------
    # Validate agent ownership
    # ------------------------
    agent = db.query(Agent).filter(
        Agent.id == req.agent_id,
        Agent.user_id == req.user_id
    ).first()

    if not agent:
        raise HTTPException(
            status_code=403,
            detail="Agent does not belong to user"
        )

    # ------------------------
    # Create SavedPage
    # ------------------------
    new_page = SavedPage(
        user_id=req.user_id,
        agent_id=req.agent_id,
        page_id = req.page_id,
        url=normalized_url,
        title=req.title or ""
    )

    try:
        db.add(new_page)
        db.commit()
        db.refresh(new_page)

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Page already saved for this agent"
        )

    # ------------------------
    # Create Vector Documents
    # ------------------------
    try:
        document = Document(
            page_content=req.content,
            metadata={
                "user_id": req.user_id,
                "agent_id": req.agent_id,
                "page_id": new_page.id,  # ⭐ IMPORTANT
                "url": normalized_url,
                "title": req.title or ""
            }
        )

        docs = text_splitter.split_documents([document])

        vectorstore.add_documents(docs)

    except Exception as e:
        # Rollback SQL if vector insertion fails
        db.delete(new_page)
        db.commit()

        raise HTTPException(
            status_code=500,
            detail=f"Vector storage failed: {str(e)}"
        )

    return {
        "message": "Page ingested successfully",
        "added_chunks": len(docs),
        "page_id": new_page.id
    }



@app.post("/ask")
async def ask(req: QueryRequest):

    result = rag_chain.invoke({
        "question": req.question
    })

    return {"answer": result.content}

@app.get("/stats")
async def stats():
    return {"page_count": vectorstore._collection.count()}

@app.get("/check_page")
async def check_page(url: str):
    res = vectorstore._collection.get(where={"url": url})
    return {"exists": bool(res["ids"])}




