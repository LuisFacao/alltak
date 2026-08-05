import os
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client

app = FastAPI(title="Alltak Intranet API", version="2.0.0")

# ---------------------------------------------------------------------------
# CONFIGURAÇÃO DE CORS
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# CONEXÃO COM SUPABASE
# ---------------------------------------------------------------------------
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

supabase_admin: Optional[Client] = None
if SUPABASE_URL and SUPABASE_KEY:
    supabase_admin = create_client(SUPABASE_URL, SUPABASE_KEY)

# ---------------------------------------------------------------------------
# MODELOS DE DADOS (PYDANTIC)
# ---------------------------------------------------------------------------
class PostData(BaseModel):
    title: str
    content: str
    author: str
    tag: str = "Geral"
    urgent: bool = False
    media_url: Optional[str] = None   # Base64 ou URL da mídia
    media_type: Optional[str] = None  # 'image' ou 'video'

class FeedbackData(BaseModel):
    user_email: str
    category: str
    message: str
    rating: int = 5
    media_url: Optional[str] = None
    media_type: Optional[str] = None

class DirectFeedbackData(BaseModel):
    recipient: str
    message: str
    media_url: Optional[str] = None
    media_type: Optional[str] = None

# ---------------------------------------------------------------------------
# ROTAS E ENDPOINTS API
# ---------------------------------------------------------------------------

@app.get("/")
def read_root():
    return {"status": "ok", "message": "API Alltak em execução."}

# --- MURAL / POSTS ---
@app.get("/api/posts")
async def get_posts():
    if not supabase_admin:
        return []
    res = supabase_admin.table("posts").select("*").order("id", desc=True).execute()
    return res.data or []

@app.post("/api/posts")
async def create_post(data: PostData):
    if not supabase_admin:
        raise HTTPException(status_code=500, detail="Supabase não configurado.")
    res = supabase_admin.table("posts").insert(
        {
            "title": data.title,
            "content": data.content,
            "author": data.author,
            "tag": data.tag,
            "urgent": data.urgent,
            "media_url": data.media_url,
            "media_type": data.media_type
        }
    ).execute()
    return res.data[0] if res.data else {}

# --- OUVIDORIA / SUGESTÕES DOS COLABORADORES ---
@app.get("/api/feedback")
async def get_feedbacks():
    if not supabase_admin:
        return []
    res = supabase_admin.table("feedbacks").select("*").order("id", desc=True).execute()
    return res.data or []

@app.post("/api/feedback")
async def create_feedback(data: FeedbackData):
    if not supabase_admin:
        raise HTTPException(status_code=500, detail="Supabase não configurado.")
    res = supabase_admin.table("feedbacks").insert(
        {
            "user_email": data.user_email,
            "category": data.category,
            "message": data.message,
            "rating": data.rating,
            "media_url": data.media_url,
            "media_type": data.media_type
        }
    ).execute()
    return res.data[0] if res.data else {}

# --- FEEDBACKS OFICIAIS DE DESEMPEMHO (EMPRESA -> COLABORADOR) ---
@app.get("/api/direct-feedbacks")
async def get_direct_feedbacks():
    if not supabase_admin:
        return []
    res = supabase_admin.table("direct_feedbacks").select("*").order("id", desc=True).execute()
    return res.data or []

@app.post("/api/direct-feedbacks")
async def create_direct_feedback(data: DirectFeedbackData):
    if not supabase_admin:
        raise HTTPException(status_code=500, detail="Supabase não configurado.")
    res = supabase_admin.table("direct_feedbacks").insert(
        {
            "recipient": data.recipient, 
            "message": data.message,
            "media_url": data.media_url,
            "media_type": data.media_type
        }
    ).execute()
    return res.data[0] if res.data else {}

# --- LISTA DE COLABORADORES ---
@app.get("/api/users")
async def get_users():
    if not supabase_admin:
        return [
            {"email": "colaborador1@alltak.com.br", "name": "João Silva"},
            {"email": "colaborador2@alltak.com.br", "name": "Maria Santos"},
            {"email": "colaborador3@alltak.com.br", "name": "Carlos Oliveira"}
        ]
    res = supabase_admin.table("users").select("email, name").execute()
    return res.data or []
