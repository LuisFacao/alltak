import os
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client

app = FastAPI()

# 1. CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Conexão com Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_ANON_KEY or not SUPABASE_SERVICE_KEY:
    raise ValueError(
        "As variáveis SUPABASE_URL, SUPABASE_KEY e SUPABASE_SERVICE_KEY precisam estar configuradas!"
    )

# Cliente público: usado só para validar login
supabase_public: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

# Cliente admin: acesso completo sem restrição de RLS
supabase_admin: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


# 3. Modelos de dados
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
    tag: Optional[str] = "RH"
    urgent: Optional[bool] = False


@app.get("/")
def read_root():
    return {"status": "API online e rodando!"}


# ---------------------------------------------------------------------------
# LOGIN
# ---------------------------------------------------------------------------
@app.options("/api/auth/login")
async def options_login():
    return {}


@app.post("/api/auth/login")
async def login(data: LoginData):
    try:
        auth_res = supabase_public.auth.sign_in_with_password(
            {"email": data.email, "password": data.password}
        )
    except Exception:
        raise HTTPException(status_code=401, detail="E-mail ou senha inválidos")

    if not auth_res.user or not auth_res.session:
        raise HTTPException(status_code=401, detail="E-mail ou senha inválidos")

    user_id = auth_res.user.id

    profile = (
        supabase_admin.table("profiles")
        .select("id, email, role, initial")
        .eq("id", user_id)
        .single()
        .execute()
    )

    if not profile.data:
        raise HTTPException(
            status_code=404,
            detail="Login válido, mas não existe um registro em 'profiles' para este usuário.",
        )

    return {
        "token": auth_res.session.access_token,
        "user": {
            "id": user_id,
            "email": profile.data.get("email", data.email),
            "role": profile.data.get("role", "user"),
            "initial": profile.data.get("initial"),
        },
    }


# ---------------------------------------------------------------------------
# USUÁRIOS
# ---------------------------------------------------------------------------
@app.get("/api/users")
async def list_users():
    res = (
        supabase_admin.table("profiles")
        .select("id, email, role, initial")
        .execute()
    )
    return res.data


@app.post("/api/users")
async def create_user(data: UserData):
    if not data.password:
        raise HTTPException(status_code=400, detail="Senha é obrigatória para criar usuário")

    try:
        created = supabase_admin.auth.admin.create_user(
            {
                "email": data.email,
                "password": data.password,
                "email_confirm": True,
            }
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    new_id = created.user.id
    initial = data.email[:2].upper()

    supabase_admin.table("profiles").insert(
        {
            "id": new_id,
            "email": data.email,
            "role": data.role,
            "initial": initial,
        }
    ).execute()

    return {"id": new_id, "email": data.email, "role": data.role, "initial": initial}


@app.delete("/api/users/{user_id}")
async def delete_user(user_id: str):
    try:
        supabase_admin.auth.admin.delete_user(user_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    supabase_admin.table("profiles").delete().eq("id", user_id).execute()
    return {"status": "deleted"}


# ---------------------------------------------------------------------------
# POSTS / COMUNICADOS
# ---------------------------------------------------------------------------
@app.get("/api/posts")
async def list_posts():
    try:
        res = (
            supabase_admin.table("posts")
            .select("*")
            .order("created_at", desc=True)
            .execute()
        )
        return res.data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/posts")
async def create_post(data: PostData):
    try:
        res = supabase_admin.table("posts").insert(
            {
                "title": data.title,
                "content": data.content,
                "author": data.author,
                "tag": data.tag,
                "urgent": data.urgent,
            }
        ).execute()
        return res.data[0] if res.data else {}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.delete("/api/posts/{post_id}")
async def delete_post(post_id: str):
    try:
        supabase_admin.table("posts").delete().eq("id", post_id).execute()
        return {"status": "deleted"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
