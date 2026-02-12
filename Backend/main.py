from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import os
from urllib.parse import urlparse, urlunparse
from sqlalchemy import Column, String, DateTime, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
from typing import Optional
import uuid
from sqlalchemy.orm import sessionmaker, Session
from database import engine
from sqlalchemy.exc import IntegrityError

from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from langchain_classic.retrievers import MultiQueryRetriever
from langchain_core.runnables import RunnableLambda
from langchain_core.prompts import ChatPromptTemplate

load_dotenv()
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
Base = declarative_base()

SessionLocal = sessionmaker(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def normalize_url(url: str):
    parsed = urlparse(url)

    parsed = parsed._replace(fragment="")

    scheme = parsed.scheme.lower()
    netloc = parsed.netloc.lower()
    path = parsed.path.rstrip("/")

    normalized = parsed._replace(
        scheme=scheme,
        netloc=netloc,
        path=path
    )

    return urlunparse(normalized)


def check_if_url_exists(db: Session, agent_id: str, url: str):
    existing = (
        db.query(SavedPage)
        .filter(
            SavedPage.agent_id == agent_id,
            SavedPage.url == url
        )
        .first()
    )

    if(existing) :
        return true
    
    return false


def ensure_default_agents(db, user_id):

    # General Chat Agent
    create_if_missing(
        name="General Chat",
        type="general"
    )

    # Inbox Agent
    create_if_missing(
        name="Inbox",
        type="system_inbox"
    )


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

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key = true)
    created_at = Column(DateTime, default = datetime.utcnow)

class Agent(Base):
    __tablename__ = "agents"

    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False)
    name = Column(String)
    type = Column(String, default="knowledge")


class SavedPage(Base):
    __tablename__ = "saved_pages"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False)
    agent_id = Column(String, nullable=False)
    url = Column(String, nullable=False)
    title = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("agent_id", "url", name="unique_agent_url"),
    )


class Chat(Base):
    __tablename__ = "chats"

    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False)
    agent_id = Column(String, nullable=False)
    page_id = Column(String, nullable=True)   # ⭐ NEW
    title = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)


class IngestRequest(BaseModel):
    user_id : str
    agent_id: str
    url: str
    title: Optional[str] = None
    content: str


class QueryRequest(BaseModel):
    question: str
    url: str | None = None



@router.post("/ingest_page")
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
        page_id = page_id
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




