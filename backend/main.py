import os
import uuid
import json
import bcrypt
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional, List

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from jose import jwt
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, String, Boolean, Integer, DateTime, Text
from sqlalchemy.orm import sessionmaker, declarative_base, Session

BASE_DIR = Path(__file__).resolve().parent
_PROJECT_ROOT = BASE_DIR.parent

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'alltak.db'}")

def _first_existing(*candidates: Path) -> Path:
    for c in candidates:
        if c.exists():
            return c
    return candidates[0]

FRONTEND_DIR = _first_existing(
    BASE_DIR / "frontend",
    _PROJECT_ROOT / "frontend",
)

INDEX_HTML_PATH = _first_existing(
    FRONTEND_DIR / "html" / "index.html",
    BASE_DIR / "index.html",
    _PROJECT_ROOT / "index.html",
)

JWT_SECRET = os.getenv("JWT_SECRET", "change-this-secret-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 12

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def gen_id():
    return str(uuid.uuid4())

class UserModel(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=gen_id)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="user")
    initial = Column(String)

class PostModel(Base):
    __tablename__ = "posts"
    id = Column(String, primary_key=True, default=gen_id)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    author = Column(String, nullable=False)
    tag = Column(String, default="Geral")
    urgent = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class EventModel(Base):
    __tablename__ = "events"
    id = Column(String, primary_key=True, default=gen_id)
    date = Column(String, nullable=False)
    title = Column(String, nullable=False)
    color = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class FeedbackModel(Base):
    __tablename__ = "requisicao"
    id = Column(String, primary_key=True, default=gen_id)
    user_email = Column(String, nullable=False)
    category = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    rating = Column(Integer)
    attachments = Column(Text, default="[]")
    created_at = Column(DateTime, default=datetime.utcnow)

class DirectFeedbackModel(Base):
    __tablename__ = "direct_requisicaos"
    id = Column(String, primary_key=True, default=gen_id)
    recipient = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    attachments = Column(Text, default="[]")
    created_at = Column(DateTime, default=datetime.utcnow)

class PayslipModel(Base):
    __tablename__ = "payslips"
    id = Column(String, primary_key=True, default=gen_id)
    recipient = Column(String, nullable=False)
    ref = Column(String, nullable=False)
    file_name = Column(String, nullable=False)
    file_data = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)

class LoginData(BaseModel):
    email: str
    password: str

class UserData(BaseModel):
    email: str
    password: Optional[str] = None
    role: str = "user"

class PostData(BaseModel):
    title: str
    content: str
    author: str
    tag: str = "Geral"
    urgent: bool = False

class EventData(BaseModel):
    date: str
    title: str
    color: str

class Attachment(BaseModel):
    file_name: str
    file_type: str
    file_data: str

class FeedbackData(BaseModel):
    user_email: str
    category: str
    message: str
    rating: int
    attachments: Optional[List[Attachment]] = []

class DirectFeedbackData(BaseModel):
    recipient: str
    message: str
    attachments: Optional[List[Attachment]] = []

class PayslipData(BaseModel):
    recipient: str
    ref: str
    file_name: str
    file_data: str

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8")[:72], bcrypt.gensalt()).decode("utf-8")

def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8")[:72], password_hash.encode("utf-8"))
    except (ValueError, TypeError):
        return False

def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRE_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def serialize_post(p):
    return {
        "id": p.id,
        "title": p.title,
        "content": p.content,
        "author": p.author,
        "tag": p.tag,
        "urgent": p.urgent,
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }

def serialize_event(e):
    return {"id": e.id, "date": e.date, "title": e.title, "color": e.color}

def serialize_feedback(f):
    return {
        "id": f.id,
        "user_email": f.user_email,
        "category": f.category,
        "message": f.message,
        "rating": f.rating,
        "attachments": json.loads(f.attachments or "[]"),
        "created_at": f.created_at.isoformat() if f.created_at else None,
    }

def serialize_direct(m):
    return {
        "id": m.id,
        "recipient": m.recipient,
        "message": m.message,
        "attachments": json.loads(m.attachments or "[]"),
        "created_at": m.created_at.isoformat() if m.created_at else None,
    }

def serialize_payslip(p):
    return {
        "id": p.id,
        "recipient": p.recipient,
        "ref": p.ref,
        "file_name": p.file_name,
        "file_data": p.file_data,
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from rotas.posts import router as posts_router
from rotas.events import router as events_router
from rotas.feedback import feedback_router, direct_feedback_router
from rotas.login import login_router, users_router
from rotas.payslips import router as payslips_router

app.include_router(posts_router)
app.include_router(events_router)
app.include_router(feedback_router)
app.include_router(direct_feedback_router)
app.include_router(login_router)
app.include_router(users_router)
app.include_router(payslips_router)

@app.on_event("startup")
def seed_default_admin():
    db = SessionLocal()
    try:
        if db.query(UserModel).count() == 0:
            admin = UserModel(
                email="admin@alltak.com.br",
                password_hash=hash_password("123"),
                role="admin",
                initial="AD",
            )
            user = UserModel(
                email="user@alltak.com.br",
                password_hash=hash_password("123"),
                role="user",
                initial="US",
            )
            db.add(admin)
            db.add(user)
            db.commit()
    finally:
        db.close()

@app.get("/api/status")
def read_root():
    return {"status": "API online e rodando! (SQLite local, sem Supabase)"}

@app.get("/")
def serve_index():
    return FileResponse(INDEX_HTML_PATH)

app.mount("/frontend", StaticFiles(directory=FRONTEND_DIR), name="frontend")