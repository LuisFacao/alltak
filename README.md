# 📱 Intranet Alltak — Documentação do Sistema

[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Render](https://img.shields.io/badge/Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://render.com/)

Este repositório contém o código-fonte completo da **Intranet Alltak**, uma plataforma web e mobile (PWA/App Nativo) desenvolvida para centralizar a comunicação interna, distribuição de informativos, agenda corporativa, canal de sugestões/feedback e disponibilização de holerites para os colaboradores.

---

## 📋 Sumário
- [🛠️ Tecnologias Utilizadas](#️-tecnologias-utilizadas)
- [📂 Estrutura e Explicativo do Código](#-estrutura-e-explicativo-do-código)
  - [🐍 Backend (`main.py`)](#-backend-mainpy---fastapi--supabase)
  - [💻 Frontend (`index.html`)](#-frontend-indexhtml---spa--vanilla-js)
- [🎨 Funcionalidades do Aplicativo](#-funcionalidades-do-aplicativo)
- [🚀 Como Executar o Projeto Localmente](#-como-executar-o-projeto-localmente)
- [📌 Publicação e Deploy](#-publicação-e-deploy)

---

## 🛠️ Tecnologias Utilizadas

A arquitetura da solução foi projetada com foco em alta performance, simplicidade e escalabilidade:

### 1. Frontend (Interface do Usuário)
* **HTML5 & CSS3 Avançado**: Interface *Mobile-First*, responsiva, utilizando CSS Grid, Flexbox, variáveis nativas CSS (`var(--...)`) e tipografia moderna (*Inter*, *Anton* e *Space Mono*).
* **JavaScript Vanilla (ES6+)**: Sem frameworks pesados no client-side. Utiliza requisições assíncronas com `fetch` / `async/await`, gerenciamento de estado via `localStorage` e mecanismo de *Polling* para atualizações em tempo real.
* **Single Page Application (SPA)**: Navegação fluida entre telas sem necessidade de recarregamento da página.

### 2. Applix (Transformação para App Mobile)
* **Plataforma Applix**: Utilizada para empacotar a aplicação web responsiva e convertê-la em um **aplicativo móvel nativo / PWA** para iOS e Android, permitindo instalação na tela inicial dos colaboradores, modo *fullscreen* e barra de navegação responsiva.

### 3. Backend (API RESTful)
* **Python 3.10+**: Linguagem principal do ecossistema do servidor.
* **FastAPI**: Framework web assíncrono de altíssima performance para construção da API REST.
* **Pydantic**: Validação estrita de esquemas de dados de entrada e saída (`BaseModel`).
* **Uvicorn**: Servidor ASGI leve e rápido.
* **CORS Middleware**: Habilitado para permitir requisições cross-origin com o aplicativo mobile.

### 4. Banco de Dados & Autenticação
* **Supabase (PostgreSQL BaaS)**: Plataforma de Backend-as-a-Service responsável pelo banco de dados relacional e controle de autenticação de usuários.
* **Supabase Auth**: Gerenciamento seguro de sessões e tokens JWT.
* **Duplo Cliente Supabase**:
  * **Cliente Público (`SUPABASE_KEY` / Anon Key)**: Utilizado para validação de logins normais de usuários.
  * **Cliente Admin (`SUPABASE_SERVICE_KEY` / Service Role Key)**: Utilizado exclusivamente no backend para operações administrativas (criação/deleção de contas na Auth API e consultas diretas sem restrições de RLS na tabela `profiles`).

### 5. Hospedagem & Deploy
* **Render.com**: O Backend FastAPI e os arquivos estáticos estão hospedados no Render (`https://alltak.onrender.com/api`), contando com deploy contínuo via GitHub, certificados HTTPS/SSL nativos e gestão de variáveis de ambiente.

---

## 📂 Estrutura e Explicativo do Código

---

### 🐍 Backend: `main.py` (FastAPI + Supabase)

#### 1. Conexão e Inicialização dos Clientes Supabase
Neste trecho, o servidor valida as variáveis de ambiente necessárias e inicializa as duas instâncias de conexão com permissões distintas.

```python
# Carregamento das variáveis de ambiente
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_ANON_KEY or not SUPABASE_SERVICE_KEY:
    raise ValueError("As variáveis SUPABASE_URL, SUPABASE_KEY e SUPABASE_SERVICE_KEY precisam estar configuradas!")

# Cliente público: validação de login respeitando as regras padrão de RLS
supabase_public: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

# Cliente admin: privilégios totais para criar/deletar usuários e consultar a tabela profiles
supabase_admin: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
```
> **Explicação**: Isola as operações comuns de autenticação das operações administrativas críticas que necessitam de bypass de permissões (Service Role).

---

#### 2. Modelagem de Dados com Pydantic
Definição dos contratos de dados esperados nas requisições HTTP POST/PUT.

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
> **Explicação**: Garante a validação automática dos tipos de dados enviados antes da execução das queries no banco de dados.

---

#### 3. Endpoint de Autenticação (`/api/auth/login`)
Efetua o acesso do usuário no Supabase Auth e retorna seu perfil de acesso (`admin` ou `funcionario`).

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

    # Busca permissões e metadados no banco
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
> **Explicação**: Autentica as credenciais na Auth API do Supabase e lê a tabela `profiles` para determinar quais funcionalidades o usuário poderá acessar no aplicativo.

---

#### 4. Cadastro de Usuários pelo Administrador (`/api/users`)
Permite criar novas contas de colaboradores diretamente pelo painel administrativo.

```python
@app.post("/api/users")
async def create_user(data: UserData):
    # Cria o usuário na Auth API sem necessidade de confirmação por e-mail
    created = supabase_admin.auth.admin.create_user(
        {
            "email": data.email,
            "password": data.password,
            "email_confirm": True,
        }
    )
    new_id = created.user.id
    initial = data.email[:2].upper()

    # Vincula o perfil na tabela 'profiles'
    supabase_admin.table("profiles").insert(
        {
            "id": new_id,
            "email": data.email,
            "role": data.role,
            "initial": initial,
        }
    ).execute()

    return {"id": new_id, "email": data.email, "role": data.role, "initial": initial}
```
> **Explicação**: Cria o registro de autenticação e popula os metadados do perfil em uma única transação lógica no backend.

---

#### 5. Módulo de Holerites (`/api/payslips`)
Responsável pelo envio e recuperação dos contracheques codificados em Base64.

```python
@app.get("/api/payslips")
async def list_payslips(recipient: Optional[str] = None):
    query = supabase_admin.table("payslips").select("*").order("created_at", desc=True)
    if recipient:
        query = query.eq("recipient", recipient)
    res = query.execute()
    return res.data
```
> **Explicação**: Filtra os holerites por e-mail do colaborador logado, garantindo a privacidade dos dados financeiros.

---

### 💻 Frontend: `index.html` (SPA + Vanilla JS)

#### 1. Camada de Integração de Dados (`Database Object`)
Objeto utilitário responsável pela comunicação HTTP com a API no Render.

```javascript
const API_URL = 'https://alltak.onrender.com/api';

const Database = {
    async login(email, password) {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        if (!res.ok) throw new Error('Credenciais inválidas');
        return await res.json();
    },
    async getPosts() {
        const res = await fetch(`${API_URL}/posts`);
        return await res.json();
    },
    async getPayslips(recipient) {
        const url = recipient ? `${API_URL}/payslips?recipient=${encodeURIComponent(recipient)}` : `${API_URL}/payslips`;
        const res = await fetch(url);
        return await res.json();
    }
};
```
> **Explicação**: Abstrai as chamadas assíncronas `fetch`, mantendo a lógica de interface separada da camada de rede.

---

#### 2. Mecanismo de Atualização Automática (*Polling / Auto-Refresh*)
Mantém a aplicação atualizada verificando novos dados periodicamente em segundo plano.

```javascript
let autoRefreshTimer = null;
const AUTO_REFRESH_MS = 6000; // Consulta novidades a cada 6 segundos

async function autoRefreshData() {
  const email = localStorage.getItem('alltak_user_email');
  const role = localStorage.getItem('alltak_role');
  if (!email || localStorage.getItem('alltak_logged') !== 'true') return;

  const prevPostIds = new Set(postsData.map(p => p.id));
  await loadSharedData(email, role);

  // Exibe badge de notificação caso chegue um novo comunicado
  const hasNewPost = postsData.some(p => !prevPostIds.has(p.id));
  if (hasNewPost) {
    localStorage.setItem('alltak_new_notification', 'true');
    checkNotificationState();
  }

  refreshAllViews();
}

function startAutoRefresh() {
  stopAutoRefresh();
  autoRefreshTimer = setInterval(autoRefreshData, AUTO_REFRESH_MS);
}
```
> **Explicação**: Garante que comunicados urgentes ou holerites apareçam na tela do colaborador em tempo real, sem necessidade de atualizar a página.

---

#### 3. Controle de Permissões na Interface (`applyRoleUI`)
Adequa a navegação e a visibilidade dos elementos com base no perfil do usuário.

```javascript
function applyRoleUI(role) {
    const isAdmin = role === 'admin';
    document.querySelectorAll('.admin-only-nav').forEach(el => el.style.display = isAdmin ? 'flex' : 'none');

    const pill = document.getElementById('role-pill');
    if(pill) pill.style.display = isAdmin ? 'inline-flex' : 'none';

    if(isAdmin) {
        renderAdminPosts();
        renderAdminEvents();
        renderAdminFeedback();
        renderAdminMetrics();
        populateRecipientDropdown();
        populatePayslipRecipientDropdown();
        renderAdminPayslips();
    }
}
```
> **Explicação**: Oculta botões e abas administrativas para colaboradores padrão e inicializa os módulos de gestão para administradores.

---

## 🎨 Funcionalidades do Aplicativo

* 🔐 **Login Seguro**: Autenticação com e-mail corporativo e senha.
* 🏠 **Dashboard Principal**: Destaque para avisos urgentes, atalhos rápidos e comunicados recentes.
* 📢 **Mural de Comunicados**: Categorização por tags (`RH`, `TI`, `Financeiro`, `Eventos`) e busca em tempo real.
* 📅 **Agenda Institucional**: Calendário corporativo com marcadores visuais por tipo de evento.
* 🏢 **Institucional**: Missão, Visão, Valores e área de download de documentos e políticas em PDF.
* 💬 **Canal de Feedback**: Envio de sugestões com avaliação por estrelas (1 a 5) e suporte a resposta/feedback direto individual.
* 📄 **Holerites Privados**: Consulta e download individual dos demonstrativos de pagamento.
* ⚙️ **Painel Administrativo Completo**:
  * Publicação e exclusão de comunicados e eventos na agenda.
  * Gerenciamento de feedbacks recebidos.
  * Cadastro e remoção de contas de usuários.
  * Envio individual ou upload em massa de holerites (com vínculo automático pelo nome do arquivo).
  * Dashboard de métricas e acessos do sistema.

---

## 🚀 Como Executar o Projeto Localmente

### Pré-requisitos
* **Python 3.10+** instalado
* Projeto ativo no **Supabase**

### 1. Configuração do Backend
```bash
# Clone o repositório
git clone https://github.com/seu-usuario/intranet-alltak.git
cd intranet-alltak/backend

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

### 2. Configuração do Frontend
1. Abra o arquivo `index.html` diretamente em seu navegador web.
2. Para apontar para seu backend local durante os testes, edite a constante `API_URL` no início do arquivo:
   ```javascript
   const API_URL = 'http://127.0.0.1:8000/api';
   ```

---

## 📌 Publicação e Deploy

* **Backend**: Hospedado no **Render.com**, executando o comando `uvicorn main:app --host 0.0.0.0 --port $PORT`.
* **Frontend**: Servido estaticamente na mesma infraestrutura ou via provedor de hospedagem estática.
* **App Mobile**: A URL de produção gerada no Render foi vinculada ao **Applix** para empacotamento em PWA e aplicativo nativo instalável para iOS e Android.
