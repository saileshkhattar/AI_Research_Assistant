from models.savedPages import SavedPage
from urllib.parse import urlparse, urlunparse
from sqlalchemy.orm import Session
import re
 
 
def normalize_url(url: str) -> str:
    """
    Normalize a URL for storage and deduplication.
    - Lowercases scheme and host
    - Strips fragment (#section)
    - Strips trailing slash from path
    - Strips common tracking query params (utm_*, ref, etc.)
    Keeps the full URL including scheme — stored value is always canonical.
    """
    parsed = urlparse(url.strip())
 
    scheme = parsed.scheme.lower() or "https"
    netloc = parsed.netloc.lower()
    path = parsed.path.rstrip("/")
 
    # Strip tracking query params but keep meaningful ones
    if parsed.query:
        STRIP_PARAMS = {"utm_source", "utm_medium", "utm_campaign", "utm_term",
                        "utm_content", "ref", "fbclid", "gclid", "mc_cid", "mc_eid"}
        kept = []
        for part in parsed.query.split("&"):
            key = part.split("=")[0].lower()
            if key not in STRIP_PARAMS:
                kept.append(part)
        query = "&".join(kept)
    else:
        query = ""
 
    normalized = parsed._replace(
        scheme=scheme,
        netloc=netloc,
        path=path,
        query=query,
        fragment="",
    )
    return urlunparse(normalized)
 
 
def display_url(url: str) -> str:
    """
    Return a clean, human-readable version of a URL for display in the sidebar.
 
    Rules:
    - Strip scheme (https://, http://)
    - Strip www. prefix
    - Strip trailing slash
    - Keep path + query if present, but truncate at 60 chars with ellipsis
 
    Examples:
      https://docs.langchain.com/docs/overview  →  docs.langchain.com/docs/overview
      https://www.fastapi.tiangolo.com/         →  fastapi.tiangolo.com
      https://example.com/very/long/path/here   →  example.com/very/long/path/…
    """
    try:
        parsed = urlparse(url)
        host = parsed.netloc.lower()
 
        # Strip www.
        if host.startswith("www."):
            host = host[4:]
 
        path = parsed.path.rstrip("/")
        query = f"?{parsed.query}" if parsed.query else ""
        display = f"{host}{path}{query}"
 
        # Truncate long paths
        if len(display) > 60:
            display = display[:57] + "…"
 
        return display
    except Exception:
        return url
 
 
def check_if_url_exists(db: Session, agent_id: str, url: str) -> bool:
    existing = (
        db.query(SavedPage)
        .filter(SavedPage.agent_id == agent_id, SavedPage.url == url)
        .first()
    )
    return existing is not None