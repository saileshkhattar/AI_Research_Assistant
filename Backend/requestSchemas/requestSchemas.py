from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime
from urllib.parse import urlparse


MAX_PAGE_CONTENT_LENGTH = 500_000
MAX_MESSAGE_LENGTH = 12_000
MAX_NAME_LENGTH = 100


class RequestModel(BaseModel):
    model_config = {"str_strip_whitespace": True}
 
 
class IngestRequest(RequestModel):
    user_id: str = Field(min_length=1, max_length=64)
    agent_id: str = Field(min_length=1, max_length=64)
    url: str = Field(min_length=1, max_length=4_096)
    title: Optional[str] = Field(default=None, max_length=500)
    content: str = Field(min_length=1, max_length=MAX_PAGE_CONTENT_LENGTH)

    @field_validator("url")
    @classmethod
    def validate_url(cls, url: str) -> str:
        parsed = urlparse(url)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError("Only absolute HTTP(S) URLs can be saved")
        return url
 
 
class QueryRequest(RequestModel):
    user_id: str = Field(min_length=1, max_length=64)
    agent_id: str = Field(min_length=1, max_length=64)
    chat_id: Optional[str] = Field(default=None, max_length=64)
    question: str = Field(min_length=1, max_length=MAX_MESSAGE_LENGTH)
    page_id: Optional[str] = Field(default=None, max_length=64)
 
 
class CreateAgentRequest(RequestModel):
    user_id: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1, max_length=MAX_NAME_LENGTH)
 
 
class RenameChatRequest(RequestModel):
    title: str = Field(min_length=1, max_length=200)
 
 
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
