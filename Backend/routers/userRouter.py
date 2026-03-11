import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.users import User
from helpers.agentHelper import ensure_default_agents

router = APIRouter()


@router.get("/users/{user_id}")
def get_user(user_id: str, db: Session = Depends(get_db)):

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {"id": user.id}



@router.post("/users")
def create_user(db: Session = Depends(get_db)):

    # Check if a user already exists
    existing_user = db.query(User).first()

    if existing_user:
        return {"id": existing_user.id}

    # Create new user if none exists
    new_user = User(id=str(uuid.uuid4()))

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Create default agents
    ensure_default_agents(db, new_user.id)

    return {"id": new_user.id}
