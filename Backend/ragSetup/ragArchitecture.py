from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_text_splitters import RecursiveCharacterTextSplitter

from dotenv import load_dotenv
import os

load_dotenv()

def get_model(api_key: str) -> ChatGoogleGenerativeAI:
    return ChatGoogleGenerativeAI(model="gemini-2.5-flash", api_key=api_key)


def get_embeddings(api_key: str) -> GoogleGenerativeAIEmbeddings:
    return GoogleGenerativeAIEmbeddings(
        model="gemini-embedding-001", version="v1", google_api_key=api_key
    )

PERSIST_DIR = "chroma_db"

# Global vectorstore for ingestion (shared write handle)
vectorstore = Chroma(
    collection_name="web_pages",
    embedding_function=None,
    persist_directory=PERSIST_DIR,
)

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
)

# -------------------------------------------------------
# REMOVED: base_retriever, multiquery, combine_docs, prompt,
# rag_chain — these were built at import time with NO user/agent
# filter, meaning they would retrieve documents from ALL users.
# Per-request filtered retrieval is done in retrieverFactory.py.
# -------------------------------------------------------
