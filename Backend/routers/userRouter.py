from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from helpers.agentHelper import ensure_default_agents
from models.geminiKey import GeminiKey
from models.users import User
from requestSchemas.requestSchemas import GeminiKeyRequest, GoogleSignInRequest
from security import create_session_token, decrypt_gemini_key, encrypt_gemini_key, get_current_user, verify_google_access_token

router = APIRouter()


@router.post("/auth/google")
async def sign_in_with_google(req: GoogleSignInRequest, db: Session = Depends(get_db)):
    claims = await verify_google_access_token(req.access_token)
    user = db.query(User).filter(User.google_sub == claims["sub"]).first()
    if not user:
        user = User(google_sub=claims["sub"], email=claims["email"].lower())
        db.add(user)
        db.commit()
        db.refresh(user)
        ensure_default_agents(db, user.id)
    return {"access_token": create_session_token(user), "user": {"id": user.id, "email": user.email}, "has_gemini_key": bool(user.gemini_key)}


@router.get("/me")
def get_me(user: User = Depends(get_current_user)):
    return {"id": user.id, "email": user.email, "has_gemini_key": bool(user.gemini_key)}


@router.put("/me/gemini-key", status_code=status.HTTP_204_NO_CONTENT)
def save_gemini_key(req: GeminiKeyRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    record = db.query(GeminiKey).filter(GeminiKey.user_id == user.id).first()
    if record:
        record.ciphertext = encrypt_gemini_key(req.api_key)
    else:
        db.add(GeminiKey(user_id=user.id, ciphertext=encrypt_gemini_key(req.api_key)))
    db.commit()


@router.delete("/me/gemini-key", status_code=status.HTTP_204_NO_CONTENT)
def delete_gemini_key(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    record = db.query(GeminiKey).filter(GeminiKey.user_id == user.id).first()
    if record:
        db.delete(record)
        db.commit()


def get_user_gemini_key(db: Session, user: User) -> str:
    record = db.query(GeminiKey).filter(GeminiKey.user_id == user.id).first()
    if not record:
        raise HTTPException(status.HTTP_428_PRECONDITION_REQUIRED, "Add a Gemini API key in Settings")
    return decrypt_gemini_key(record.ciphertext)
