import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from supabase import create_client, Client

app = FastAPI(title="Alltak API")

# Libera o acesso para o seu site acessar a API sem bloqueios (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Seus dados do Supabase configurados
SUPABASE_URL = "https://qyuxafswqrwialnnvjsu.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5dXhhZnN3cXJ3aWFsbm52anN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4OTExMzYsImV4cCI6MjEwMDQ2NzEzNn0.8A2VXp8RgIpRa-Cl9uRttF_kaVZ_xKLPRabH6zHhAu4"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Estrutura para receber os dados de login
class LoginSchema(BaseModel):
    email: EmailStr
    password: str

# Estrutura para cadastro de novos usuários
class UserCreateSchema(BaseModel):
    email: EmailStr
    password: str
    role: str = "funcionario"

# Rota de Login
@app.post("/api/auth/login")
def login(data: LoginSchema):
    try:
        # Autentica e-mail e senha no Supabase Auth
        res = supabase.auth.sign_in_with_password({
            "email": data.email,
            "password": data.password
        })
        
        # Busca o perfil para saber se é admin ou funcionario
        profile = supabase.table("profiles").select("*").eq("id", res.user.id).execute()
        role = profile.data[0]["role"] if profile.data else "funcionario"

        return {
            "token": res.session.access_token,
            "user": {
                "id": res.user.id,
                "email": res.user.email,
                "role": role
            }
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail="E-mail ou senha incorretos.")

# Rota para cadastrar novos funcionários ou admins
@app.post("/api/users")
def create_user(data: UserCreateSchema):
    try:
        # Cria o usuário na autenticação do Supabase
        res = supabase.auth.sign_up({
            "email": data.email,
            "password": data.password
        })
        
        if res.user:
            # Registra o papel (admin/funcionario) na tabela profiles
            supabase.table("profiles").insert({
                "id": res.user.id,
                "email": data.email,
                "role": data.role
            }).execute()

        return {"message": "Usuário criado com sucesso!"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Rota para listar os usuários cadastrados
@app.get("/api/users")
def get_users():
    try:
        res = supabase.table("profiles").select("*").execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))