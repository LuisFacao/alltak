# 📱 Projeto Alltak

[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Render](https://img.shields.io/badge/Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://render.com/)

Este repositório contém o código-fonte completo da **Intranet Alltak**, uma plataforma web e mobile (App via Appilix) desenvolvida para centralizar a comunicação interna: mural de comunicados, agenda corporativa, canal de feedback e disponibilização de holerites para os colaboradores.

---

## 📋 Sumário
- [🛠️ Tecnologias Utilizadas](#️-tecnologias-utilizadas)
- [📂 Estrutura de Pastas](#-estrutura-de-pastas)
- [🐍 Backend (`back/main.py`)](#-backend-backmainpy---fastapi--supabase)
- [💻 Frontend (`front/`)](#-frontend-front---spa--vanilla-js)
- [🎨 Funcionalidades do Aplicativo](#-funcionalidades-do-aplicativo)
- [🚀 Como Executar o Projeto Localmente](#-como-executar-o-projeto-localmente)
- [📌 Publicação e Deploy](#-publicação-e-deploy)

---

## 🛠️ Tecnologias Utilizadas

### 1. Frontend (Interface do Usuário) — pasta `front/`
* **HTML5 & CSS3**: interface do tipo SPA, com telas (`sections`) alternadas via JavaScript, tipografia com `Space Mono` e paleta de cores da marca Alltak (`style.css`).
* **JavaScript Vanilla (ES6+)**: sem frameworks — usa `fetch`/`async-await` para consumir a API, alterna telas com a função `go(id)` e mantém os dados atualizados via *auto-refresh* (`startAutoRefresh`).
* **Single Page Application (SPA)**: todas as telas (login, home, mural, calendário, feedback, holerites, admin) vivem no mesmo `index.html`.

### 2. Appilix (Transformação para App Mobile)
* **Plataforma Appilix**: empacota a aplicação web (`front/`) e a converte em um **aplicativo móvel** para Android/iOS, permitindo instalação na tela inicial dos colaboradores e navegação em modo *fullscreen*, sem precisar programar nada nativo.

### 3. Backend (API RESTful) — pasta `back/`
* **Python 3.13**: linguagem principal do servidor.
* **FastAPI**: framework assíncrono usado para construir a API REST (`main.py`).
* **Pydantic**: validação estrita dos dados de entrada (`BaseModel`) em cada rota.
* **Uvicorn**: servidor ASGI que executa a aplicação em produção.
* **CORS Middleware**: liberado (`allow_origins=["*"]`) para permitir que o app/site consuma a API sem bloqueios do navegador.

### 4. Banco de Dados & Autenticação
* **Supabase (PostgreSQL BaaS)**: banco de dados relacional + autenticação de usuários.
* **Supabase Auth**: gerenciamento de login e sessões (`sign_in_with_password`).
* **Duplo cliente Supabase**, ambos criados em `main.py`:
  * **Cliente público** (`supabase_public`, via `SUPABASE_KEY`): usado só para validar login.
  * **Cliente admin** (`supabase_admin`, via `SUPABASE_SERVICE_KEY`): usado para todas as operações administrativas (criar/apagar usuário, ler/gravar em `profiles`, `posts`, `events`, `feedbacks`, `direct_feedbacks`, `payslips`), sem restrição de RLS.

### 5. Hospedagem & Deploy
* **Render.com**: hospeda o backend FastAPI (`https://alltak.onrender.com`), com deploy contínuo a partir do GitHub, HTTPS/SSL nativo e variáveis de ambiente configuráveis no painel.

---

## 📂 Estrutura de Pastas

```
├── back/                      # Backend — API FastAPI
│   ├── main.py                 # Rotas da API e integração com o Supabase
│   └── requirements.txt        # Dependências Python do backend
│
└── front/                     # Frontend — aplicação web (SPA)
    ├── index.html               # Estrutura e telas da aplicação
    ├── style.css                 # Estilos visuais
    ├── script.js                  # Funções auxiliares de comunicação com a API
    └── logo.jpg                   # Logotipo da Alltak
```

> ⚠️ O arquivo `main_cpython-313.pyc` é bytecode compilado do Python (gerado automaticamente) e **não deve ser versionado** — adicione `__pycache__/` e `*.pyc` ao `.gitignore`.
> ⚠️ O arquivo de dependências está com o nome `requirementes.txt` (erro de digitação). Renomeie para **`requirements.txt`** antes do deploy, pois é esse o nome que o Render espera.

---

## 🐍 Backend: `back/main.py` (FastAPI + Supabase)

### 1. Conexão e inicialização dos clientes Supabase
```python
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_ANON_KEY or not SUPABASE_SERVICE_KEY:
    raise ValueError(
        "As variáveis SUPABASE_URL, SUPABASE_KEY e SUPABASE_SERVICE_KEY precisam estar configuradas!"
    )

supabase_public: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
supabase_admin: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
```
> **Explicação**: separa as operações comuns de login (cliente público, respeitando RLS) das operações administrativas críticas (cliente admin, com bypass total de permissões). Se alguma variável de ambiente estiver faltando, a API nem sobe.

### 2. Modelagem de dados com Pydantic
```python
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

class PayslipData(BaseModel):
    recipient: str
    ref: str
    file_name: str
    file_data: str
```
> **Explicação**: cada classe define o formato esperado do corpo das requisições. O FastAPI valida automaticamente os tipos e retorna erro `422` se algo vier fora do padrão.

### 3. Endpoint de autenticação (`/api/auth/login`)
```python
@app.post("/api/auth/login")
async def login(data: LoginData):
    try:
        auth_res = supabase_public.auth.sign_in_with_password(
            {"email": data.email, "password": data.password}
        )
    except Exception:
        raise HTTPException(status_code=401, detail="E-mail ou senha inválidos")

    user_id = auth_res.user.id

    profile = (
        supabase_admin.table("profiles")
        .select("id, email, role, initial")
        .eq("id", user_id)
        .single()
        .execute()
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
```
> **Explicação**: autentica as credenciais na Auth API do Supabase e busca o perfil na tabela `profiles` (papel `admin`/`user` e iniciais) para o frontend liberar as telas certas.

### 4. Cadastro de usuários pelo admin (`/api/users`)
```python
@app.post("/api/users")
async def create_user(data: UserData):
    if not data.password:
        raise HTTPException(status_code=400, detail="Senha é obrigatória para criar usuário")

    created = supabase_admin.auth.admin.create_user(
        {"email": data.email, "password": data.password, "email_confirm": True}
    )
    new_id = created.user.id
    initial = data.email[:2].upper()

    supabase_admin.table("profiles").insert(
        {"id": new_id, "email": data.email, "role": data.role, "initial": initial}
    ).execute()

    return {"id": new_id, "email": data.email, "role": data.role, "initial": initial}
```
> **Explicação**: cria o usuário direto na Auth API (já com e-mail confirmado, sem depender de link de confirmação) e, em seguida, grava o perfil correspondente na tabela `profiles`.

### 5. Módulo de holerites (`/api/payslips`)
```python
@app.get("/api/payslips")
async def list_payslips(recipient: Optional[str] = None):
    query = supabase_admin.table("payslips").select("*").order("created_at", desc=True)
    if recipient:
        query = query.eq("recipient", recipient)
    res = query.execute()
    return res.data
```
> **Explicação**: filtra os holerites pelo e-mail (`recipient`) do colaborador logado, garantindo que cada um veja apenas os seus próprios documentos.

### 6. Demais módulos da API
Seguindo o mesmo padrão (`GET`, `POST`, `DELETE`), o `main.py` também expõe:
| Rota | Função |
|---|---|
| `/api/posts` | Comunicados do mural (criar, listar, excluir) |
| `/api/events` | Agenda/calendário de eventos da empresa |
| `/api/feedback` | Canal de feedback geral (sugestões e avaliações) |
| `/api/direct-feedbacks` | Feedback direcionado do admin/RH para um colaborador específico |

---

## 💻 Frontend: `front/` (SPA + Vanilla JS)

### 1. Camada de integração com a API (`front/script.js`)
```javascript
const API_URL = "https://alltak.onrender.com";

async function login(email, password) {
  try {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Erro ao realizar login");

    return data;
  } catch (error) {
    console.error("Erro no login:", error.message);
    alert(error.message);
  }
}
```
> **Explicação**: abstrai as chamadas `fetch`, tratando o corpo da resposta e exibindo alertas amigáveis em caso de erro (senha incorreta, e-mail inválido etc.). O mesmo padrão se repete em `getUsers()` e `createUser()`.

### 2. Navegação entre telas — SPA (`front/index.html`)
O `index.html` concentra todas as telas do app em `<section class="screen" id="...">`, alternadas via JavaScript:

| Seção (`id`) | Função |
|---|---|
| `#acesso` | Tela de login (e-mail corporativo + senha) |
| `#home` | Início, com comunicado em destaque e atalhos rápidos |
| `#mural` | Lista de comunicados, com filtro por tag e busca |
| `#institucional` | Documentos e materiais institucionais |
| `#calendario` | Calendário mensal de eventos |
| `#feedback` | Formulário de feedback + feedbacks diretos recebidos |
| `#holerites` | Holerites do colaborador logado |
| `#admin` | Painel administrativo (comunicados, agenda, feedback, usuários, holerites, métricas) |

```javascript
function go(id){
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}
```
> **Explicação**: em vez de recarregar a página, a função `go(id)` simplesmente esconde a tela atual e exibe a tela de destino — é isso que dá a sensação de app nativo.

### 3. Controle de permissões na interface (`applyRoleUI`)
```javascript
function applyRoleUI(role) {
  const isAdmin = role === 'admin';
  document.getElementById('role-pill').style.display = isAdmin ? 'inline-flex' : 'none';
  // exibe/esconde abas e botões exclusivos do admin
}
```
> **Explicação**: com base no `role` retornado pelo login (`admin` ou `user`), a interface libera ou oculta o Painel Admin e suas funcionalidades — sem isso, um colaborador comum não veria essas opções.

### 4. Estilo visual (`front/style.css`)
Define a identidade visual da Alltak: cores da marca, tipografia (`Space Mono` para elementos técnicos), o grid do calendário, os cards do mural, as abas do painel admin e a barra de navegação inferior (`bottomnav`) que simula um app mobile nativo.

---

## 🎨 Funcionalidades do Aplicativo

* 🔐 **Login Seguro**: autenticação com e-mail corporativo e senha via Supabase Auth.
* 🏠 **Home**: comunicado em destaque e atalhos rápidos.
* 📢 **Mural de Comunicados**: filtro por tag e busca por título.
* 📅 **Agenda Institucional**: calendário mensal com eventos coloridos por categoria.
* 🏢 **Institucional**: documentos e materiais da empresa.
* 💬 **Canal de Feedback**: avaliação por estrelas + feedback direcionado (admin → colaborador).
* 📄 **Holerites Privados**: consulta individual dos holerites por colaborador.
* ⚙️ **Painel Administrativo**: publicação/exclusão de comunicados e eventos, gestão de usuários, envio individual ou em lote de holerites e métricas gerais.

---

## 🚀 Como Executar o Projeto Localmente

### Pré-requisitos
* **Python 3.10+**
* Projeto ativo no **Supabase**

### 1. Backend (`back/`)
```bash
# Clone o repositório
git clone https://github.com/seu-usuario/projeto-alltak.git
cd projeto-alltak/back

# Crie e ative o ambiente virtual
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Instale as dependências
pip install -r requirements.txt

# Defina as variáveis de ambiente
export SUPABASE_URL="https://seu-projeto.supabase.co"
export SUPABASE_KEY="sua-chave-anon-publica"
export SUPABASE_SERVICE_KEY="sua-chave-service-role-secreta"

# Execute o servidor
uvicorn main:app --reload
```

### 2. Frontend (`front/`)
1. Abra `front/index.html` diretamente no navegador, ou sirva a pasta com `npx serve front`.
2. Para apontar para o backend local durante os testes, edite a constante no início de `front/script.js`:
   ```javascript
   const API_URL = "http://127.0.0.1:8000";
   ```

---

## 📌 Publicação e Deploy

* **Backend**: hospedado no **Render.com**, definindo o *Root Directory* como `back/` e o comando de start `uvicorn main:app --host 0.0.0.0 --port $PORT`.
* **Frontend**: publique a pasta `front/` em um serviço de hospedagem estática (Render Static Site, Netlify, Vercel ou GitHub Pages).
* **App Mobile**: a URL pública do `front/` é cadastrada no **Appilix**, que empacota o site em um app instalável (Android/iOS) com ícone, nome e splash screen personalizados.

---

<p align="center">Desenvolvido para uso interno da <strong>Alltak</strong>.</p>
