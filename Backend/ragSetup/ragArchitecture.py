import os

from dotenv import load_dotenv
import chromadb
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


def _chroma_api_key() -> str:
    value = os.getenv("CHROMA_API_KEY")
    if not value:
        raise RuntimeError("CHROMA_API_KEY must be configured on the server")
    return value


COLLECTION_NAME = "web_pages"

_chroma_client = None


def get_chroma_client() -> chromadb.CloudClient:
    """Lazily create a single Chroma Cloud client for the process.

    Replaces the old `chroma_db/` local-disk directory, which was wiped
    every time the free-tier host redeployed, restarted, or spun down from
    inactivity — Chroma Cloud persists independently of the app instance.

    Tenant/database are auto-resolved from the API key when it's scoped to
    a single database (Chroma's default for a fresh project); set
    CHROMA_TENANT / CHROMA_DATABASE explicitly only if that resolution
    ever becomes ambiguous. Lazy + a single shared instance so tests can
    substitute an in-memory client (see tests/conftest.py) without needing
    real Chroma Cloud credentials or network access.
    """
    global _chroma_client
    if _chroma_client is None:
        _chroma_client = chromadb.CloudClient(api_key=_chroma_api_key())
    return _chroma_client


def get_deletion_vectorstore() -> Chroma:
    """Handle for direct collection access (bulk delete by metadata filter).

    No embedding function needed for deletes. Same client + collection
    name as get_vectorstore() in retrieverFactory.py, so both always point
    at the same Chroma Cloud data — built fresh each call (not cached at
    module load) so it always reflects the current get_chroma_client().
    """
    return Chroma(
        client=get_chroma_client(),
        collection_name=COLLECTION_NAME,
        embedding_function=None,
    )


text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
)