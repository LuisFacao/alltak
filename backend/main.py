import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client

app = FastAPI()

# 1. Configuração do CORS (deve vir logo após a criação do 'app')
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Libera o acesso para a Vercel e outros domínios
    allow_credentials=True,
    allow_methods=["*"],  # Libera POST, GET, OPTIONS, etc.
    allow_headers=["*"],
)

# 2. Conexão com o Supabase usando as variáveis de ambiente
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("As variáveis SUPABASE_URL e SUPABASE_KEY precisam estar configuradas!")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# 3. Modelo dos dados que chegam no Login
class LoginData(BaseModel):
    email: str
    password: str

# 4. Rota principal para testar se a API está no ar
@app.get("/")
def read_root():
    return {"status": "API online e rodando!"}

# 5. Rota de Login (POST)
@app.post("/login")
async def login(data: LoginData):
    try:
        # Autentica o usuário no Supabase
        response = supabase.auth.sign_in_with_password({
            "email": data.email,
            "password": data.password
        })
        
        return {
            "message": "Login realizado com sucesso!",
            "user": response.user,
            "session": response.session
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
