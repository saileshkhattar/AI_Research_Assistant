"""Serve the versioned legal Markdown as safe, readable HTML."""
from html import escape
from pathlib import Path
import re

from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse

router = APIRouter(prefix="/legal", tags=["legal"])
_LEGAL_DIR = Path(__file__).resolve().parent.parent / "legal"

_PAGE_TEMPLATE = """<!doctype html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>{title} — TabChat</title><style>
body {{ font-family:system-ui,-apple-system,sans-serif;max-width:720px;margin:40px auto;padding:0 20px 48px;line-height:1.6;color:#1a1a1a; }}
h1,h2,h3 {{ line-height:1.3;margin-top:1.6em; }} h1 {{ margin-top:0; }}
code {{ background:#f1f3f5;padding:.1em .3em;border-radius:3px; }}
table {{ border-collapse:collapse;width:100%;overflow:auto;display:block; }} th,td {{ border:1px solid #d0d7de;padding:.5em;text-align:left;vertical-align:top; }} th {{ background:#f6f8fa; }}
</style></head><body>{body}</body></html>"""


def _inline(text: str) -> str:
    """Escape first; then allow only the Markdown constructs rendered below."""
    value = escape(text, quote=True)
    value = re.sub(r"`([^`]+)`", r"<code>\1</code>", value)
    value = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", value)
    return re.sub(r"\[([^]]+)\]\((https?://[^\s)]+)\)", r'<a href="\2" rel="noopener noreferrer" target="_blank">\1</a>', value)


def _render_markdown(markdown: str) -> str:
    output: list[str] = []
    paragraph: list[str] = []
    unordered: list[str] = []
    ordered: list[str] = []
    table: list[list[str]] = []

    def flush_paragraph() -> None:
        if paragraph:
            output.append(f"<p>{'<br>'.join(_inline(line) for line in paragraph)}</p>")
            paragraph.clear()

    def flush_lists() -> None:
        if unordered:
            output.append("<ul>" + "".join(f"<li>{_inline(item)}</li>" for item in unordered) + "</ul>")
            unordered.clear()
        if ordered:
            output.append("<ol>" + "".join(f"<li>{_inline(item)}</li>" for item in ordered) + "</ol>")
            ordered.clear()

    def flush_table() -> None:
        if not table:
            return
        header, *rows = table
        output.append(
            "<table><thead><tr>"
            + "".join(f"<th>{_inline(cell)}</th>" for cell in header)
            + "</tr></thead><tbody>"
            + "".join("<tr>" + "".join(f"<td>{_inline(cell)}</td>" for cell in row) + "</tr>" for row in rows)
            + "</tbody></table>"
        )
        table.clear()

    for line in markdown.splitlines():
        heading = re.match(r"^(#{1,3})\s+(.+)$", line)
        bullet = re.match(r"^[-*+]\s+(.+)$", line)
        number = re.match(r"^\d+\.\s+(.+)$", line)
        is_table = line.startswith("|") and line.endswith("|")
        if is_table:
            flush_paragraph(); flush_lists()
            cells = [cell.strip() for cell in line.strip("|").split("|")]
            # The Markdown separator row contains only dashes/colons.
            if not all(re.fullmatch(r":?-{3,}:?", cell) for cell in cells):
                table.append(cells)
        elif heading:
            flush_paragraph(); flush_lists(); flush_table()
            level = len(heading.group(1))
            output.append(f"<h{level}>{_inline(heading.group(2))}</h{level}>")
        elif line.strip() == "---":
            flush_paragraph(); flush_lists(); flush_table(); output.append("<hr>")
        elif bullet:
            flush_paragraph(); unordered.append(bullet.group(1))
        elif number:
            flush_paragraph(); ordered.append(number.group(1))
        elif not line.strip():
            flush_paragraph(); flush_lists(); flush_table()
        else:
            flush_lists(); flush_table(); paragraph.append(line)
    flush_paragraph(); flush_lists(); flush_table()
    return "\n".join(output)


def _render(filename: str, title: str) -> str:
    path = _LEGAL_DIR / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"{title} is not available.")
    return _PAGE_TEMPLATE.format(title=escape(title), body=_render_markdown(path.read_text(encoding="utf-8")))


@router.get("/terms", response_class=HTMLResponse)
def get_terms():
    return _render("terms.md", "Terms of Service")


@router.get("/privacy", response_class=HTMLResponse)
def get_privacy():
    return _render("privacy.md", "Privacy Policy")
