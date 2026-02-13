from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import Base, engine
from routers import ingestRouter



import models.users as User
import models.agents as Agent
import models.savedPages as SavedPage
import models.chat as Chats

Base.metadata.create_all(bind=engine)





app = FastAPI()

app.include_router(ingestRouter.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)







