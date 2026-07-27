import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client

app = FastAPI()

# ---------------------------------------------------------------------------
# CONFIGURAÇÃO DE CORS (Permite que o Vercel acesse a API no Render)
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# CONEXÃO COM O SUPABASE
# ---------------------------------------------------------------------------
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
# Prioriza a Service Role Key para poder cadastrar usuários sem confirmação
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY", "")

supabase_admin: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


# ---------------------------------------------------------------------------
# MODELOS DE DADOS (Pydantic)
# ---------------------------------------------------------------------------
class UserCreate(BaseModel):
    email: str
    password: str
    role: str = "user"
    initial: str = "U"

class PostCreate(BaseModel):
    title: str
    content: str
    author: str
    tag: str = "RH"
    urgent: bool = False

class FeedbackCreate(BaseModel):
    user_email: str
    message: str
    category: str = "Geral"


# ---------------------------------------------------------------------------
# ROTAS DE USUÁRIOS E PERFIS
# ---------------------------------------------------------------------------

async def _process_user_registration(user: UserCreate):
    try:
        # 1. Cria a conta no Supabase Auth
        auth_res = supabase_admin.auth.admin.create_user({
            "email": user.email,
            "password": user.password,
            "email_confirm": True
        })
        user_id = auth_res.user.id

        # 2. Salva/Atualiza os dados na tabela profiles
        profile_data = {
            "id": user_id,
            "email": user.email,
            "role": user.role,
            "initial": user.initial
        }
        supabase_admin.table("profiles").upsert(profile_data).execute()

        return {"status": "success", "user_id": user_id, "email": user.email}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Rota POST para /api/users (Corrige o erro 405 Method Not Allowed)
@app.post("/api/users")
async def register_user_endpoint(user: UserCreate):
    return await _process_user_registration(user)


# Rota POST alternativa /api/register
@app.post("/api/register")
async def register_user_alias(user: UserCreate):
    return await _process_user_registration(user)


# Rota GET para listar usuários
@app.get("/api/users")
async def get_users():
    try:
        response = supabase_admin.table("profiles").select("*").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ---------------------------------------------------------------------------
# ROTAS DE COMUNICADOS (POSTS)
# ---------------------------------------------------------------------------

@app.get("/api/posts")
async def get_posts():
    try:
        response = supabase_admin.table("posts").select("*").order("created_at", desc=True).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/posts")
async def create_post(post: PostCreate):
    try:
        data = {
            "title": post.title,
            "content": post.content,
            "author": post.author,
            "tag": post.tag,
            "urgent": post.urgent
        }
        response = supabase_admin.table("posts").insert(data).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.delete("/api/posts/{post_id}")
async def delete_post(post_id: str):
    try:
        supabase_admin.table("posts").delete().eq("id", post_id).execute()
        return {"status": "success", "message": f"Post {post_id} deletado"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ---------------------------------------------------------------------------
# ROTAS DE FEEDBACKS / SUGESTÕES
# ---------------------------------------------------------------------------

@app.get("/api/feedbacks")
async def get_feedbacks():
    try:
        response = supabase_admin.table("feedbacks").select("*").order("created_at", desc=True).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/feedbacks")
async def create_feedback(feedback: FeedbackCreate):
    try:
        data = {
            "user_email": feedback.user_email,
            "message": feedback.message,
            "category": feedback.category
        }
        response = supabase_admin.table("feedbacks").insert(data).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
