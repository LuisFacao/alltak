import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client

app = FastAPI()

# 1. Configuração do CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Conexão com Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("As variáveis SUPABASE_URL e SUPABASE_KEY precisam estar configuradas!")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# 3. Modelo de dados
class LoginData(BaseModel):
    email: str
    password: str

@app.get("/")
def read_root():
    return {"status": "API online e rodando!"}

# 4. Tratamento de OPTIONS para /api/auth/login
@app.options("/api/auth/login")
@app.options("/api/auth/login/")
@app.options("/login")
async def options_login():
    return {}

# 5. Rota de Login aceitando /api/auth/login e /login
@app.post("/api/auth/login")
@app.post("/api/auth/login/")
@app.post("/login")
@app.post("/login/")
async def login(data: LoginData):
    try:
        response = supabase.auth.sign_in_with_password(
            credentials={
                "email": data.email,
                "password": data.password
            }
        )
        return {
            "message": "Login realizado com sucesso!",
            "user": response.user,
            "session": response.session
        }
    except Exception as e:
        print(f"Erro ao autenticar: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
