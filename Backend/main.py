from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import os

from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from langchain_classic.retrievers import MultiQueryRetriever
from langchain_core.runnables import RunnableLambda
from langchain_core.prompts import ChatPromptTemplate

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

class IngestRequest(BaseModel):
    url: str
    title: str | None = None
    content: str

class QueryRequest(BaseModel):
    question: str
    url: str | None = None

@app.post("/ingest_page")
async def ingest_page(req: IngestRequest):
    print("Dsdsdsdsds")

    document = Document(
        page_content=req.content,
        metadata={"url": req.url, "title": req.title or ""}
    )

    print(document)
    docs = text_splitter.split_documents([document])
    print(docs)
    vectorstore.add_documents(docs)

    return {"added_chunks": len(docs)}

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




