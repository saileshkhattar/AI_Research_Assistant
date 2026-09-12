import os

from dotenv import load_dotenv
from langchain_community.vectorstores import Chroma
from langchain_groq import ChatGroq
from langchain_huggingface import HuggingFaceEndpointEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

load_dotenv()

GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
HF_EMBEDDING_MODEL = os.getenv("HF_EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")


def get_model(api_key: str) -> ChatGroq:
    """Chat LLM — uses the signed-in user's own Groq key."""
    return ChatGroq(model=GROQ_MODEL, api_key=api_key)


def _hf_api_key() -> str:
    """Server-owned Hugging Face token — NOT per-user.

    Every user's embeddings go through this single app-level HF account.
    Set HUGGINGFACE_API_KEY in the backend's own environment (Render/
    Railway env vars, or .env locally) — this is never stored per-user
    or exposed to the frontend.
    """
    value = os.getenv("HUGGINGFACE_API_KEY")
    if not value:
        raise RuntimeError("HUGGINGFACE_API_KEY must be configured on the server")
    return value


def get_embeddings() -> HuggingFaceEndpointEmbeddings:
    """Embeddings via HF's hosted Inference API — no model weights are ever
    downloaded or run locally on this server."""
    return HuggingFaceEndpointEmbeddings(
        model=HF_EMBEDDING_MODEL,
        huggingfacehub_api_token=_hf_api_key(),
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