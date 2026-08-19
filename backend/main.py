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


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8")[:72], bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8")[:72], password_hash.encode("utf-8"))
    except (ValueError, TypeError):
        return False

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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

Base.metadata.create_all(engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

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

def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRE_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def serialize_post(p):
    return {"id": p.id, "title": p.title, "content": p.content, "author": p.author,
            "tag": p.tag, "urgent": p.urgent, "created_at": p.created_at.isoformat()}

def serialize_event(e):
    return {"id": e.id, "date": e.date, "title": e.title, "color": e.color}

def serialize_feedback(f):
    return {"id": f.id, "user_email": f.user_email, "category": f.category, "message": f.message,
            "rating": f.rating, "attachments": json.loads(f.attachments or "[]"),
            "created_at": f.created_at.isoformat()}

def serialize_direct(m):
    return {"id": m.id, "recipient": m.recipient, "message": m.message,
            "attachments": json.loads(m.attachments or "[]"), "created_at": m.created_at.isoformat()}

def serialize_payslip(p):
    return {"id": p.id, "recipient": p.recipient, "ref": p.ref, "file_name": p.file_name,
            "file_data": p.file_data, "created_at": p.created_at.isoformat()}

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


@app.options("/api/auth/login")
async def options_login():
    return {}

@app.post("/api/auth/login")
async def login(data: LoginData, db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(UserModel.email == data.email).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="E-mail ou senha inválidos")

    token = create_token(user.id, user.email, user.role)
    return {
        "token": token,
        "user": {"id": user.id, "email": user.email, "role": user.role, "initial": user.initial},
    }


@app.get("/api/users")
async def list_users(db: Session = Depends(get_db)):
    return [{"id": u.id, "email": u.email, "role": u.role, "initial": u.initial} for u in db.query(UserModel).all()]

@app.post("/api/users")
async def create_user(data: UserData, db: Session = Depends(get_db)):
    if not data.password:
        raise HTTPException(status_code=400, detail="Senha é obrigatória para criar usuário")
    if db.query(UserModel).filter(UserModel.email == data.email).first():
        raise HTTPException(status_code=400, detail="Este e-mail já está cadastrado")

    initial = data.email[:2].upper()
    user = UserModel(email=data.email, password_hash=hash_password(data.password), role=data.role, initial=initial)
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": user.id, "email": user.email, "role": user.role, "initial": user.initial}

@app.delete("/api/users/{user_id}")
async def delete_user(user_id: str, db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if user:
        db.delete(user)
        db.commit()
    return {"status": "deleted"}

@app.get("/api/posts")
async def list_posts(db: Session = Depends(get_db)):
    posts = db.query(PostModel).order_by(PostModel.created_at.desc()).all()
    return [serialize_post(p) for p in posts]

@app.post("/api/posts")
async def create_post(data: PostData, db: Session = Depends(get_db)):
    post = PostModel(title=data.title, content=data.content, author=data.author, tag=data.tag, urgent=data.urgent)
    db.add(post)
    db.commit()
    db.refresh(post)
    return serialize_post(post)

@app.delete("/api/posts/{post_id}")
async def delete_post(post_id: str, db: Session = Depends(get_db)):
    post = db.query(PostModel).filter(PostModel.id == post_id).first()
    if post:
        db.delete(post)
        db.commit()
    return {"status": "deleted"}

@app.get("/api/events")
async def list_events(db: Session = Depends(get_db)):
    events = db.query(EventModel).order_by(EventModel.date).all()
    return [serialize_event(e) for e in events]

@app.post("/api/events")
async def create_event(data: EventData, db: Session = Depends(get_db)):
    event = EventModel(date=data.date, title=data.title, color=data.color)
    db.add(event)
    db.commit()
    db.refresh(event)
    return serialize_event(event)

@app.delete("/api/events/{event_id}")
async def delete_event(event_id: str, db: Session = Depends(get_db)):
    event = db.query(EventModel).filter(EventModel.id == event_id).first()
    if event:
        db.delete(event)
        db.commit()
    return {"status": "deleted"}

@app.get("/api/feedback")
async def list_feedback(db: Session = Depends(get_db)):
    items = db.query(FeedbackModel).order_by(FeedbackModel.created_at.desc()).all()
    return [serialize_feedback(f) for f in items]

@app.post("/api/feedback")
async def create_feedback(data: FeedbackData, db: Session = Depends(get_db)):
    fb = FeedbackModel(
        user_email=data.user_email, category=data.category, message=data.message, rating=data.rating,
        attachments=json.dumps([a.model_dump() for a in (data.attachments or [])]),
    )
    db.add(fb)
    db.commit()
    db.refresh(fb)
    return serialize_feedback(fb)

@app.delete("/api/feedback/{feedback_id}")
async def delete_feedback(feedback_id: str, db: Session = Depends(get_db)):
    fb = db.query(FeedbackModel).filter(FeedbackModel.id == feedback_id).first()
    if fb:
        db.delete(fb)
        db.commit()
    return {"status": "deleted"}

@app.get("/api/direct-feedback")
async def list_direct_feedback(recipient: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(DirectFeedbackModel).order_by(DirectFeedbackModel.created_at.desc())
    if recipient:
        q = q.filter(DirectFeedbackModel.recipient == recipient)
    return [serialize_direct(m) for m in q.all()]

@app.post("/api/direct-feedback")
async def create_direct_feedback(data: DirectFeedbackData, db: Session = Depends(get_db)):
    m = DirectFeedbackModel(
        recipient=data.recipient, message=data.message,
        attachments=json.dumps([a.model_dump() for a in (data.attachments or [])]),
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return serialize_direct(m)

@app.delete("/api/direct-feedback/{direct_feedback_id}")
async def delete_direct_feedback(direct_feedback_id: str, db: Session = Depends(get_db)):
    m = db.query(DirectFeedbackModel).filter(DirectFeedbackModel.id == direct_feedback_id).first()
    if m:
        db.delete(m)
        db.commit()
    return {"status": "deleted"}

@app.get("/api/payslips")
async def list_payslips(recipient: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(PayslipModel).order_by(PayslipModel.created_at.desc())
    if recipient:
        q = q.filter(PayslipModel.recipient == recipient)
    return [serialize_payslip(p) for p in q.all()]

@app.post("/api/payslips")
async def create_payslip(data: PayslipData, db: Session = Depends(get_db)):
    p = PayslipModel(recipient=data.recipient, ref=data.ref, file_name=data.file_name, file_data=data.file_data)
    db.add(p)
    db.commit()
    db.refresh(p)
    return serialize_payslip(p)

@app.delete("/api/payslips/{payslip_id}")
async def delete_payslip(payslip_id: str, db: Session = Depends(get_db)):
    p = db.query(PayslipModel).filter(PayslipModel.id == payslip_id).first()
    if p:
        db.delete(p)
        db.commit()
    return {"status": "deleted"}