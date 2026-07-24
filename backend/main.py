import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client

app = FastAPI()

# 1. Configuração do CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Libera o acesso para Vercel e outros
    allow_credentials=True,
    allow_methods=["*"],  # Libera POST, GET, OPTIONS, etc.
    allow_headers=["*"],
)

# 2. Conexão com o Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("As variáveis SUPABASE_URL e SUPABASE_KEY precisam estar configuradas!")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# 3. Modelo dos dados
class LoginData(BaseModel):
    email: str
    password: str

# 4. Rota principal
@app.get("/")
def read_root():
    return {"status": "API online e rodando!"}

# 5. Rota de Login (POST) CORRIGIDA
@app.post("/login")
async def login(data: LoginData):
    try:
        # Forma correta e compatível com a biblioteca do Supabase Python:
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
        # Exibe o erro real no log do Render e para a resposta HTTP
        print(f"Erro no login: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
