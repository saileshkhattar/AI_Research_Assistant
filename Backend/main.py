from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import Base, engine
from routers import ingestRouter
from routers.userRouter import router as users_router
from routers.agentRouter import router as agents_router
from routers.chatRouter import router as chat_router
from routers.queryRouter import router as query_router




import models.users as User
import models.agents as Agent
import models.savedPages as SavedPage
import models.chat as Chats
import models.message as Message

Base.metadata.create_all(bind=engine)





app = FastAPI()

app.include_router(ingestRouter.router)
app.include_router(users_router)
app.include_router(agents_router)
app.include_router(chat_router)
app.include_router(query_router)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)







