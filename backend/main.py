import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client

app = FastAPI()

# 1. Configuração do CORS (Libera acesso para o seu frontend na Vercel)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Libera todas as origens
    allow_credentials=True,
    allow_methods=["*"],  # Libera POST, GET, OPTIONS, etc.
    allow_headers=["*"],
)

# 2. Conexão com o Supabase através das Variáveis de Ambiente
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("As variáveis SUPABASE_URL e SUPABASE_KEY precisam estar configuradas!")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# 3. Modelo dos dados recebidos no Login
class LoginData(BaseModel):
    email: str
    password: str

# 4. Rota principal de verificação da API
@app.get("/")
def read_root():
    return {"status": "API online e rodando!"}

# 5. Tratamento de Preflight (OPTIONS) para evitar bloqueio de CORS no navegador
@app.options("/login")
@app.options("/login/")
async def options_login():
    return {}

# 6. Rota de Login (POST) ajustada para as versões recentes do Supabase
@app.post("/login")
@app.post("/login/")
async def login(data: LoginData):
    try:
        # Autentica no Supabase passando o dicionário dentro de credentials
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
