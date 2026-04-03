from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine

# Import all models so SQLAlchemy registers them before create_all
import models.users
import models.agents
import models.savedPages
import models.chat
import models.message

# Create tables
Base.metadata.create_all(bind=engine)

from routers import ingestRouter
from routers.userRouter import router as users_router
from routers.agentRouter import router as agents_router
from routers.chatRouter import router as chat_router
from routers.queryStreamRouter import router as query_router

app = FastAPI(title="Research Extension API")

# -------------------------------------------------------
# CORS — restrict to the Chrome extension origin in production.
# "chrome-extension://*" works for MV3 extensions.
# "*" is fine for local development but exposes the API to
# any origin, so tighten this before deploying.
# -------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # TODO: replace with extension origin in prod
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Chat-Id"], # required so JS can read the header cross-origin
)

app.include_router(users_router)
app.include_router(agents_router)
app.include_router(chat_router)
app.include_router(ingestRouter.router)
app.include_router(query_router)


@app.get("/health")
def health():
    return {"status": "ok"}







