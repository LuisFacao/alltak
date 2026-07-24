// URL base da sua API FastAPI rodando localmente
const API_URL = 'http://localhost:8000/api';

// --- PONTE DE COMUNICAÇÃO COM O BACKEND ONLINE ---
const Database = {
    async login(email, password) {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        if (!response.ok) throw new Error('Credenciais inválidas');
        return await response.json(); 
    },

    async getPosts() {
        const response = await fetch(`${API_URL}/posts`);
        if (!response.ok) throw new Error('Erro ao buscar posts do banco');
        return await response.json();
    },

    async createPost(postData) {
        const response = await fetch(`${API_URL}/posts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(postData)
        });
        if (!response.ok) throw new Error('Erro ao salvar post');
        return await response.json();
    },

    async getUsers() {
        const response = await fetch(`${API_URL}/users`);
        if (!response.ok) throw new Error('Erro ao buscar usuários');
        return await response.json();
    },

    async saveUser(email, password, role) {
        const response = await fetch(`${API_URL}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, role })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Erro ao cadastrar usuário');
        }
        return await response.json();
    },

    async deleteUser(userId) {
        const response = await fetch(`${API_URL}/users/${userId}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Erro ao remover usuário');
        return true;
    }
};

// --- CONTROLE DE ESTADO DA APLICAÇÃO ---
let currentUser = JSON.parse(localStorage.getItem('alltak_user')) || null;

// Inicialização do App ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    
    // Vincula o evento do formulário de criação de usuários se ele existir na tela
    const userForm = document.getElementById('user-form');
    if (userForm) {
        userForm.addEventListener('submit', submitUserForm);
    }
});

function initApp() {
    if (currentUser) {
        showDashboard();
    } else {
        showLogin();
    }
}

// --- CONTROLE DE TELAS VISUAIS ---
function showLogin() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('main-app').style.display = 'none';
}

function showDashboard() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    
    // Altera visibilidade de abas baseado na role do usuário logado
    if (currentUser.role === 'admin') {
        document.getElementById('nav-admin-btn').style.display = 'block';
    } else {
        document.getElementById('nav-admin-btn').style.display = 'none';
    }
    
    loadPosts();
    renderAdminUsers();
}

// --- FUNÇÃO DE LOGIN ---
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-password').value;
    const errorBox = document.getElementById('login-error');

    try {
        const data = await Database.login(email, pass);
        currentUser = data.user;
        localStorage.setItem('alltak_token', data.token);
        localStorage.setItem('alltak_user', JSON.stringify(data.user));
        
        if(errorBox) errorBox.style.display = 'none';
        showDashboard();
    } catch (err) {
        if(errorBox) {
            errorBox.innerText = "E-mail ou senha incorretos.";
            errorBox.style.display = 'block';
        }
    }
}

function handleLogout() {
    localStorage.removeItem('alltak_token');
    localStorage.removeItem('alltak_user');
    currentUser = null;
    showLogin();
}

// --- GERENCIAMENTO DE COMUNICADOS ---
async function loadPosts() {
    const timeline = document.getElementById('timeline');
    if (!timeline) return;

    try {
        const posts = await Database.getPosts();
        if(posts.length === 0) {
            timeline.innerHTML = '<p class="empty-msg">Nenhum comunicado disponível.</p>';
            return;
        }

        timeline.innerHTML = posts.map(post => `
            <div class="card-post">
                <h3>${post.title}</h3>
                <p>${post.content}</p>
                <div class="post-meta">Postado por: <strong>${post.author}</strong></div>
            </div>
        `).join('');
    } catch (err) {
        timeline.innerHTML = '<p class="empty-msg" style="color:red;">Erro ao carregar o mural de avisos.</p>';
    }
}

// --- SUBMIT DO FORMULÁRIO DE CADASTRO DE USUÁRIOS (ADMIN) ---
async function submitUserForm(e) {
    e.preventDefault();
    const email = document.getElementById('user-email').value.trim().toLowerCase();
    const pass = document.getElementById('user-password').value;
    const role = document.getElementById('user-role').value;

    try {
        await Database.saveUser(email, pass, role);
        document.getElementById('user-form').reset();
        alert(`Usuário ${email} cadastrado com sucesso no banco de dados!`);
        
        await renderAdminUsers(); // Recarrega a lista dinamicamente da API
    } catch (error) {
        console.error(error);
        alert(error.message || "Erro ao salvar o usuário no servidor.");
    }
}

// --- RENDERIZAR PAINEL DE USUÁRIOS ONLINE (ADMIN) ---
async function renderAdminUsers() {
    const container = document.getElementById('admin-users-list');
    if (!container) return;

    try {
        const usersList = await Database.getUsers();
        
        if (usersList.length === 0) {
            container.innerHTML = '<div class="admin-empty">Nenhum usuário cadastrado.</div>';
            return;
        }

        container.innerHTML = usersList.map(user => `
            <div class="admin-item" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; padding:10px; border:1px solid #ddd;">
                <div class="info">
                    <strong>${user.email}</strong>
                    <div style="font-size:12px; color:#666;">Nível: ${user.role}</div>
                </div>
                <div class="admin-actions">
                    ${user.email !== 'admin@alltak.com.br' ? `
                    <button style="background:red; color:white; border:none; padding:5px 10px; cursor:pointer;" onclick="deleteUserSystem('${user.id}', '${user.email}')">
                        Excluir
                    </button>` : '<em>Master</em>'}
                </div>
            </div>
        `).join('');
    } catch (error) {
        container.innerHTML = '<div class="admin-empty" style="color:red;">Erro ao buscar usuários do servidor.</div>';
    }
}

// --- EXCLUIR USUÁRIO ---
async function deleteUserSystem(userId, email) {
    if (confirm(`Deseja revogar definitivamente o acesso de ${email}?`)) {
        try {
            await Database.deleteUser(userId);
            alert("Usuário removido da base.");
            await renderAdminUsers();
        } catch (error) {
            console.error(error);
            alert("Não foi possível processar a exclusão.");
        }
    }
}