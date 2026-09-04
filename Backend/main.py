import os
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine

# Import all models so SQLAlchemy registers them before create_all
import models.users
import models.agents
import models.savedPages
import models.chat
import models.message
import models.geminiKey

# Create tables
Base.metadata.create_all(bind=engine)

from routers import ingestRouter
from routers.userRouter import router as users_router
from routers.agentRouter import router as agents_router
from routers.chatRouter import router as chat_router
from routers.queryStreamRouter import router as query_router
from rateLimit import limiter

app = FastAPI(title="Research Extension API", docs_url=None, redoc_url=None)

# -------------------------------------------------------
# CORS — restrict to the Chrome extension origin in production.
# "chrome-extension://*" works for MV3 extensions.
# "*" is fine for local development but exposes the API to
# any origin, so tighten this before deploying.
# -------------------------------------------------------
allowed_origins = [origin.strip() for origin in os.getenv("CORS_ALLOWED_ORIGINS", "").split(",") if origin.strip()]
origin_regex = None
if not allowed_origins:
    # Development-only explicit default. Production must set CORS_ALLOWED_ORIGINS
    # to the exact chrome-extension://<extension-id> origin(s).
    allowed_origins = ["http://localhost:5173"]
    origin_regex = r"chrome-extension://[a-p]{32}"

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=origin_regex,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
    expose_headers=["X-Chat-Id"], # required so JS can read the header cross-origin
)

RATE_LIMITS = {
    "/query/stream": 10,
    "/ingest_page": 12,
}


@app.middleware("http")
async def rate_limit_requests(request: Request, call_next):
    """Throttle costly Gemini work more tightly than ordinary CRUD requests."""
    if request.method == "OPTIONS":
        return await call_next(request)
    client = request.client.host if request.client else "unknown"
    limit = RATE_LIMITS.get(request.url.path, 60 if request.method != "GET" else 180)
    retry_after = limiter.check(f"{client}:{request.url.path}", limit)
    if retry_after:
        return JSONResponse(
            status_code=429,
            content={"detail": "Too many requests. Please try again shortly.", "retry_after": retry_after},
            headers={"Retry-After": str(retry_after)},
        )
    return await call_next(request)

app.include_router(users_router)
app.include_router(agents_router)
app.include_router(chat_router)
app.include_router(ingestRouter.router)
app.include_router(query_router)


@app.get("/health")
def health():
    return {"status": "ok"}







