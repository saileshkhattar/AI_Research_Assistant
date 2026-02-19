from pydantic import BaseModel, Field
from typing import Optional


class IngestRequest(BaseModel):
    user_id : str
    agent_id: str
    url: str
    title: Optional[str] = None
    content: str


class QueryRequest(BaseModel):
    question: str
    url: str | None = None

class CreateAgentRequest(BaseModel):
    user_id: str
    name: str