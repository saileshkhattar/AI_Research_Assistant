from models.savedPages import SavedPage
from urllib.parse import urlparse, urlunparse
from sqlalchemy.orm import Session


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
        return True
    
    return False