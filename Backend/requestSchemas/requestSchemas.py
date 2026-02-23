from pydantic import BaseModel, Field
from typing import Optional


class IngestRequest(BaseModel):
    user_id : str
    agent_id: str
    url: str
    title: Optional[str] = None
    content: str


class QueryRequest(BaseModel):
    chat_id: str
    agent_id: str
    user_id: str
    page_id: str | None
    question: str

class CreateAgentRequest(BaseModel):
    user_id: str
    name: str

