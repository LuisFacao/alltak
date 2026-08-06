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
# SUPABASE_URL      -> Project Settings > API > Project URL
# SUPABASE_KEY      -> Project Settings > API > anon public key
# SUPABASE_SERVICE_KEY -> Project Settings > API > service_role key (SECRETA! nunca exponha no front-end)
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_ANON_KEY or not SUPABASE_SERVICE_KEY:
    raise ValueError(
        "As variáveis SUPABASE_URL, SUPABASE_KEY e SUPABASE_SERVICE_KEY precisam estar configuradas!"
    )

# Cliente público: usado só para validar login (respeita as regras normais do Supabase Auth)
supabase_public: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

# Cliente admin: usado para criar/listar/apagar usuários e ler a tabela profiles sem restrição de RLS
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
    tag: str = "Geral"
    urgent: bool = False


class EventData(BaseModel):
    date: str
    title: str
    color: str


class RequisicaoData(BaseModel):
    user_email: str
    category: str
    message: str
    rating: int


class DirectRequisicaokData(BaseModel):
    recipient: str
    message: str


class PayslipData(BaseModel):
    recipient: str
    ref: str
    file_name: str
    file_data: str


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
                "email_confirm": True,  # dispensa a confirmação por e-mail
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
    res = (
        supabase_admin.table("posts")
        .select("*")
        .order("created_at", desc=True)
        .execute()
    )
    return res.data


@app.post("/api/posts")
async def create_post(data: PostData):
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


@app.delete("/api/posts/{post_id}")
async def delete_post(post_id: str):
    supabase_admin.table("posts").delete().eq("id", post_id).execute()
    return {"status": "deleted"}


# ---------------------------------------------------------------------------
# AGENDA (EVENTS)
# ---------------------------------------------------------------------------
@app.get("/api/events")
async def list_events():
    res = (
        supabase_admin.table("events")
        .select("*")
        .order("date")
        .execute()
    )
    return res.data


@app.post("/api/events")
async def create_event(data: EventData):
    res = supabase_admin.table("events").insert(
        {"date": data.date, "title": data.title, "color": data.color}
    ).execute()
    return res.data[0] if res.data else {}


@app.delete("/api/events/{event_id}")
async def delete_event(event_id: str):
    supabase_admin.table("events").delete().eq("id", event_id).execute()
    return {"status": "deleted"}


# ---------------------------------------------------------------------------
# requisicao (GERAL / SUGESTÕES)
# ---------------------------------------------------------------------------
@app.get("/api/requisicao")
async def list_requisicao():
    res = (
        supabase_admin.table("requisicao")
        .select("*")
        .order("created_at", desc=True)
        .execute()
    )
    return res.data


@app.post("/api/requisicao")
async def create_requisicao(data: requisicaoData):
    res = supabase_admin.table("requisicaos").insert(
        {
            "user_email": data.user_email,
            "category": data.category,
            "message": data.message,
            "rating": data.rating,
        }
    ).execute()
    return res.data[0] if res.data else {}


@app.delete("/api/requisicao/{requisicao_id}")
async def delete_requisicao(requisicao_id: str):
    supabase_admin.table("requisicaos").delete().eq("id", requisicao_id).execute()
    return {"status": "deleted"}


# ---------------------------------------------------------------------------
# requisicao DIRECIONADO (ADMIN -> FUNCIONÁRIO)
# ---------------------------------------------------------------------------
@app.get("/api/direct-requisicaos")
async def list_direct_requisicaos(recipient: Optional[str] = None):
    query = supabase_admin.table("direct_requisicaos").select("*").order("created_at", desc=True)
    if recipient:
        query = query.eq("recipient", recipient)
    res = query.execute()
    return res.data


@app.post("/api/direct-requisicaos")
async def create_direct_requisicao(data: DirectrequisicaoData):
    res = supabase_admin.table("direct_requisicaos").insert(
        {"recipient": data.recipient, "message": data.message}
    ).execute()
    return res.data[0] if res.data else {}


# ---------------------------------------------------------------------------
# HOLERITES (PAYSLIPS)
# ---------------------------------------------------------------------------
@app.get("/api/payslips")
async def list_payslips(recipient: Optional[str] = None):
    query = supabase_admin.table("payslips").select("*").order("created_at", desc=True)
    if recipient:
        query = query.eq("recipient", recipient)
    res = query.execute()
    return res.data


@app.post("/api/payslips")
async def create_payslip(data: PayslipData):
    res = supabase_admin.table("payslips").insert(
        {
            "recipient": data.recipient,
            "ref": data.ref,
            "file_name": data.file_name,
            "file_data": data.file_data,
        }
    ).execute()
    return res.data[0] if res.data else {}


@app.delete("/api/payslips/{payslip_id}")
async def delete_payslip(payslip_id: str):
    supabase_admin.table("payslips").delete().eq("id", payslip_id).execute()
    return {"status": "deleted"}
