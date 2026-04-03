from pydantic import BaseModel, computed_field
from typing import Optional
from datetime import datetime
 
 
class IngestRequest(BaseModel):
    user_id: str
    agent_id: str
    url: str
    title: Optional[str] = None
    content: str
 
 
class QueryRequest(BaseModel):
    user_id: str
    agent_id: str
    chat_id: Optional[str] = None
    question: str
    page_id: Optional[str] = None
 
 
class CreateAgentRequest(BaseModel):
    user_id: str
    name: str
 
 
class RenameChatRequest(BaseModel):
    title: str
 
 
class SavedPageResponse(BaseModel):
    """
    Response shape for a saved page.
    Includes `display_url` — a stripped, human-readable URL for the sidebar
    (no scheme, no www, truncated at 60 chars) — computed from the stored URL.
    The full canonical `url` is also returned for use in queries and links.
    """
    id: str
    agent_id: str
    user_id: str
    url: str              # full canonical URL (for links/dedup)
    display_url: str      # clean display version (for sidebar label)
    title: Optional[str]
    created_at: datetime
 
    model_config = {"from_attributes": True}

