from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.users import User

router = APIRouter()


@router.get("/users/{user_id}")
def get_user(user_id: str, db: Session = Depends(get_db)):

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {"id": user.id}


@router.post("/users")
def create_user(user_id: str, db: Session = Depends(get_db)):

    user = User(id=user_id)
    db.add(user)
    db.commit()

    return {"id": user.id}