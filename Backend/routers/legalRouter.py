"""Serves the Terms of Service and Privacy Policy as plain HTML pages.

These are the URLs the consent checkbox (Extension popup + chat-ui
ConsentGate) links to. Deliberately unauthenticated and un-rate-limited
beyond the default GET limit — a user must be able to read these *before*
signing in or accepting anything.

Source of truth is the markdown files in this directory. This is a
"wire it up as is" implementation: plain text rendering, no markdown
parser dependency. Swap for real hosted/styled pages before launch —
see consentGate.py's CURRENT_TOS_VERSION / CURRENT_PRIVACY_VERSION,
which these pages should always be kept in sync with.
"""
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse

router = APIRouter(prefix="/legal", tags=["legal"])

_LEGAL_DIR = Path(__file__).resolve().parent.parent / "legal"

_PAGE_TEMPLATE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>{title} — TabChat</title>
<style>
  body {{ font-family: system-ui, -apple-system, sans-serif; max-width: 720px;
         margin: 40px auto; padding: 0 20px; line-height: 1.6; color: #1a1a1a; }}
  pre {{ white-space: pre-wrap; word-wrap: break-word; font-family: inherit; }}
  h1, h2 {{ line-height: 1.3; }}
</style>
</head>
<body>
<pre>{body}</pre>
</body>
</html>"""


def _render(filename: str, title: str) -> str:
    path = _LEGAL_DIR / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"{title} is not available.")
    text = path.read_text(encoding="utf-8")
    # Minimal escaping — content is our own markdown, not user input, but
    # cheap insurance against a stray "<"/">" breaking the page.
    escaped = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return _PAGE_TEMPLATE.format(title=title, body=escaped)


@router.get("/terms", response_class=HTMLResponse)
def get_terms():
    return _render("terms.md", "Terms of Service")


@router.get("/privacy", response_class=HTMLResponse)
def get_privacy():
    return _render("privacy.md", "Privacy Policy")
