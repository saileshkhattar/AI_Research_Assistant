from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import Base, engine
from routers import ingestRouter
from routers.userRouter import router as users_router
from routers.agentRouter import router as agents_router




import models.users as User
import models.agents as Agent
import models.savedPages as SavedPage
import models.chat as Chats

Base.metadata.create_all(bind=engine)





app = FastAPI()

app.include_router(ingestRouter.router)
app.include_router(users_router)
app.include_router(agents_router)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)







