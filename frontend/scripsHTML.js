// URL base da API FastAPI hospedada no Render.
const API_URL = 'https://alltak.onrender.com/api';

// Integração real com o backend (Supabase via FastAPI).
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
    async getUsersRaw() {
        const res = await fetch(`${API_URL}/users`);
        if (!res.ok) throw new Error('Erro ao buscar usuários');
        return await res.json();
    },
    async getUsers() {
        const list = await this.getUsersRaw();
        const map = {};
        list.forEach(u => {
            map[u.email] = { id: u.id, role: u.role, initial: u.initial || u.email.slice(0, 2).toUpperCase() };
        });
        return map;
    },
    async saveUser(email, data) {
        const res = await fetch(`${API_URL}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: data.password, role: data.role })
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || 'Erro ao cadastrar usuário');
        }
        return true;
    },
    async deleteUser(userId) {
        const res = await fetch(`${API_URL}/users/${userId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Erro ao remover usuário');
        return true;
    },
    async getPosts() {
        const res = await fetch(`${API_URL}/posts`);
        if (!res.ok) throw new Error('Erro ao buscar comunicados');
        return await res.json();
    },
    async createPost(title, content, author, tag, urgent) {
        const res = await fetch(`${API_URL}/posts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, content, author, tag, urgent })
        });
        if (!res.ok) throw new Error('Erro ao salvar comunicado');
        return await res.json();
    },
    async deletePost(id) {
        const res = await fetch(`${API_URL}/posts/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Erro ao excluir comunicado');
        return true;
    },
    async getEvents() {
        const res = await fetch(`${API_URL}/events`);
        if (!res.ok) throw new Error('Erro ao buscar agenda');
        return await res.json();
    },
    async createEvent(date, title, color) {
        const res = await fetch(`${API_URL}/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date, title, color })
        });
        if (!res.ok) throw new Error('Erro ao salvar evento');
        return await res.json();
    },
    async deleteEvent(id) {
        const res = await fetch(`${API_URL}/events/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Erro ao excluir evento');
        return true;
    },
    async getfeedback() {
        const res = await fetch(`${API_URL}/feedback`);
        if (!res.ok) throw new Error('Erro ao buscar feedback');
        return await res.json();
    },
    async createfeedback(userEmail, category, message, rating, attachments) {
        const res = await fetch(`${API_URL}/feedback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_email: userEmail, category, message, rating, attachments: attachments || [] })
        });
        if (!res.ok) throw new Error('Erro ao enviar feedback');
        return await res.json();
    },
    async deletefeedbackApi(id) {
        const res = await fetch(`${API_URL}/feedback/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Erro ao excluir feedback');
        return true;
    },
    async getDirectfeedback(recipient) {
        const url = recipient ? `${API_URL}/direct-feedbacks?recipient=${encodeURIComponent(recipient)}` : `${API_URL}/direct-feedbacks`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Erro ao buscar feedback direcionados');
        return await res.json();
    },
    async createDirectfeedback(recipient, message, attachments) {
        const res = await fetch(`${API_URL}/direct-feedbacks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipient, message, attachments: attachments || [] })
        });
        if (!res.ok) throw new Error('Erro ao enviar feedback direcionado');
        return await res.json();
    },
    async deleteDirectfeedbackApi(id) {
        const res = await fetch(`${API_URL}/direct-feedbacks/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Erro ao excluir feedback direto');
        return true;
    },
    async getPayslips(recipient) {
        const url = recipient ? `${API_URL}/payslips?recipient=${encodeURIComponent(recipient)}` : `${API_URL}/payslips`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Erro ao buscar holerites');
        return await res.json();
    },
    async createPayslip(recipient, ref, fileName, fileData) {
        const res = await fetch(`${API_URL}/payslips`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipient, ref, file_name: fileName, file_data: fileData })
        });
        if (!res.ok) throw new Error('Erro ao enviar holerite');
        return await res.json();
    },
    async deletePayslipApi(id) {
        const res = await fetch(`${API_URL}/payslips/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Erro ao excluir holerite');
        return true;
    }
};

let VALID_USERS = {};
let directfeedbackData = [];
let payslipsData = [];
let postsData = [];
let eventsData = {};
let feedbackData = [];

// Reconstrói o mapa { "YYYY-MM-DD": [{id,title,color}, ...] } a partir da lista plana vinda da API,
// preservando o id de cada evento (necessário pra excluir depois).
// A tabela `posts` no Supabase já tem tag/urgent — só formatamos a data a partir de created_at.
function normalizePost(p) {
  return {
    id: p.id,
    title: p.title,
    desc: p.content,
    author: p.author,
    tag: p.tag || 'Geral',
    bg: 'var(--azul-suave)',
    urgent: !!p.urgent,
    date: p.created_at ? new Date(p.created_at).toLocaleDateString('pt-BR') : 'Hoje'
  };
}

// Normaliza os campos snake_case que vêm do Supabase (file_name, file_data) e formata
// a data de upload a partir de created_at, já que a tabela não guarda uma coluna de data própria.
function normalizePayslip(p) {
  return {
    id: p.id,
    recipient: p.recipient,
    ref: p.ref,
    fileName: p.file_name,
    fileData: p.file_data,
    uploadDate: p.created_at ? new Date(p.created_at).toLocaleDateString('pt-BR') : ''
  };
}

// Idem para feedback geral: mapeia user_email/category (nomes reais das colunas) e formata a data.
// Converte os arquivos escolhidos num input[type=file] em anexos base64 (data URI).
// Limita o tamanho total pra não travar o envio (Render/Supabase não aguentam payload gigante).
const MAX_ATTACHMENTS_BYTES = 30 * 1024 * 1024; // 30MB somados
function filesToAttachments(fileList) {
  const files = Array.from(fileList || []);
  if (files.length === 0) return Promise.resolve([]);
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  if (totalSize > MAX_ATTACHMENTS_BYTES) {
    return Promise.reject(new Error(
      `Os arquivos somam ${(totalSize / 1024 / 1024).toFixed(1)}MB. O limite total é ${(MAX_ATTACHMENTS_BYTES / 1024 / 1024).toFixed(0)}MB — tenta enviar menos arquivos ou arquivos menores.`
    ));
  }
  return Promise.all(files.map(file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ file_name: file.name, file_type: file.type || 'application/octet-stream', file_data: reader.result });
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo ' + file.name));
    reader.readAsDataURL(file);
  })));
}

// Converte um data URI base64 em Blob e dispara o download.
// Um <a href="data:..." download> direto falha silenciosamente em vários
// navegadores pra arquivos grandes — via Blob funciona de forma confiável.
function downloadAttachment(dataUri, fileName) {
  try {
    const [header, base64] = dataUri.split(',');
    const mimeMatch = header.match(/data:(.*?);base64/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (err) {
    alert('Erro ao baixar o arquivo: ' + err.message);
  }
}

// Renderiza os anexos de uma feedback/feedback: imagem inline, vídeo com player, ou link de download pra documentos.
function renderAttachments(atts) {
  if (!atts || atts.length === 0) return '';
  const items = atts.map((a, i) => {
    const type = a.file_type || '';
    if (type.startsWith('image/')) {
      return `<a href="${a.file_data}" target="_blank" title="${a.file_name}"><img src="${a.file_data}" alt="${a.file_name}" style="width:64px;height:64px;object-fit:cover;border-radius:6px;border:1.5px solid var(--line);"></a>`;
    }
    if (type.startsWith('video/')) {
      return `<video src="${a.file_data}" controls style="width:140px;height:64px;border-radius:6px;border:1.5px solid var(--line);"></video>`;
    }
    return `<button type="button" onclick='downloadAttachment(${JSON.stringify(a.file_data)}, ${JSON.stringify(a.file_name)})' style="display:inline-flex;align-items:center;gap:4px;font-size:11px;background:var(--azul-suave);padding:6px 10px;border-radius:6px;border:none;cursor:pointer;color:var(--ink);">📎 ${a.file_name}</button>`;
  }).join('');
  return `<div class="attach-list" style="display:flex; flex-wrap:wrap; gap:8px; margin-top:8px;">${items}</div>`;
}

// Mostra nome + tamanho de cada arquivo escolhido, e alerta em vermelho se passar do limite total.
function showFilePreview(input, previewId) {
  const preview = document.getElementById(previewId);
  if (!preview) return;
  const files = Array.from(input.files || []);
  if (files.length === 0) { preview.innerHTML = ''; return; }
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const formatSize = (bytes) => bytes >= 1024 * 1024 ? (bytes / 1024 / 1024).toFixed(1) + 'MB' : (bytes / 1024).toFixed(0) + 'KB';
  const overLimit = totalSize > MAX_ATTACHMENTS_BYTES;
  preview.innerHTML = files.map(f => `• ${f.name} (${formatSize(f.size)})`).join('<br>') +
    `<br><strong style="color:${overLimit ? '#c0392b' : 'inherit'}">Total: ${formatSize(totalSize)} / ${formatSize(MAX_ATTACHMENTS_BYTES)}</strong>`;
}

function normalizefeedback(f) {
  return {
    id: f.id,
    subject: f.category,
    message: f.message,
    rating: f.rating,
    userEmail: f.user_email,
    attachments: f.attachments || [],
    date: f.created_at ? new Date(f.created_at).toLocaleDateString('pt-BR') : ''
  };
}

// Idem para feedback direcionado.
function normalizeDirectfeedback(f) {
  return {
    id: f.id,
    recipient: f.recipient,
    message: f.message,
    attachments: f.attachments || [],
    date: f.created_at ? new Date(f.created_at).toLocaleDateString('pt-BR') : ''
  };
}

function rebuildEventsMap(list) {
  const map = {};
  (list || []).forEach(ev => {
    if (!map[ev.date]) map[ev.date] = [];
    map[ev.date].push({ id: ev.id, title: ev.title, color: ev.color });
  });
  return map;
}

// Busca tudo que hoje é compartilhado entre usuários (comunicados, agenda, feedback, holerites)
// direto do backend/Supabase, em vez de depender do localStorage do navegador.
async function loadSharedData(currentUserEmail, currentUserRole) {
  try {
    const [posts, events, feedback, directfeedback, payslips] = await Promise.all([
      Database.getPosts(),
      Database.getEvents(),
      Database.getfeedback(),
      currentUserRole === 'admin' ? Database.getDirectfeedback() : (currentUserEmail ? Database.getDirectfeedback(currentUserEmail) : Promise.resolve([])),
      currentUserRole === 'admin' ? Database.getPayslips() : (currentUserEmail ? Database.getPayslips(currentUserEmail) : Promise.resolve([]))
    ]);
    postsData = (posts || []).map(normalizePost);
    eventsData = rebuildEventsMap(events);
    feedbackData = (feedback || []).map(normalizefeedback);
    directfeedbackData = (directfeedback || []).map(normalizeDirectfeedback);
    payslipsData = (payslips || []).map(normalizePayslip);
  } catch (err) {
    console.error('Erro ao carregar dados compartilhados:', err);
    alert('Não foi possível carregar os dados do servidor. Verifique sua conexão.');
  }
}

let currentYear = 2026;
let currentMonth = 6;
const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
let selectedRating = 4;
let selectedBulkFiles = [];

async function initDatabase() {
    VALID_USERS = await Database.getUsers();
}

// ---------------------------------------------------------------------------
// ATUALIZAÇÃO AUTOMÁTICA (polling)
// Em vez de esperar o usuário dar F5, o app busca os dados no backend
// periodicamente e re-renderiza as telas sozinho. Assim, quando um admin
// publica um comunicado, feedback direcionado ou holerite novo, os outros
// usuários recebem sem precisar recarregar a página.
// ---------------------------------------------------------------------------
let autoRefreshTimer = null;
const AUTO_REFRESH_MS = 6000; // busca novidades a cada 6s (inclui remoções, não só itens novos)

function refreshAllViews() {
  const role = localStorage.getItem('alltak_role');
  const email = localStorage.getItem('alltak_user_email');

  renderFeaturedAnnouncement();
  renderHomeFeed();
  renderMural();
  buildCalendar();

  if (email) {
    renderDirectfeedbackForUser(email);
    renderUserPayslips(email);
  }

  if (role === 'admin') {
    renderAdminPosts();
    renderAdminEvents();
    renderAdminfeedback();
    renderAdminDirectfeedback();
    renderAdminMetrics();
    renderAdminPayslips();
  }
}

async function autoRefreshData() {
  const email = localStorage.getItem('alltak_user_email');
  const role = localStorage.getItem('alltak_role');
  if (!email || localStorage.getItem('alltak_logged') !== 'true') return;

  // Guarda o que já existia antes de buscar, pra saber se chegou algo novo.
  const prevPostIds = new Set(postsData.map(p => p.id));
  const prevPayslipIds = new Set(payslipsData.map(p => p.id));
  const prevDirectIds = new Set(directfeedbackData.map(d => d.id));

  try {
    await loadSharedData(email, role);
  } catch (err) {
    console.error('Erro na atualização automática:', err);
    return;
  }

  const hasNewPost = postsData.some(p => !prevPostIds.has(p.id));
  const hasNewPayslip = role !== 'admin' && payslipsData.some(p => p.recipient === email && !prevPayslipIds.has(p.id));
  const hasNewDirect = role !== 'admin' && directfeedbackData.some(d => d.recipient === email && !prevDirectIds.has(d.id));

  if (hasNewPost || hasNewPayslip || hasNewDirect) {
    localStorage.setItem('alltak_new_notification', 'true');
    checkNotificationState();
  }

  refreshAllViews();
}

function handleVisibilityRefresh() {
  if (document.visibilityState === 'visible' && localStorage.getItem('alltak_logged') === 'true') {
    autoRefreshData();
  }
}

function startAutoRefresh() {
  stopAutoRefresh();
  autoRefreshTimer = setInterval(autoRefreshData, AUTO_REFRESH_MS);
  document.addEventListener('visibilitychange', handleVisibilityRefresh);
  window.addEventListener('focus', handleVisibilityRefresh);
}

function stopAutoRefresh() {
  if (autoRefreshTimer) { clearInterval(autoRefreshTimer); autoRefreshTimer = null; }
  document.removeEventListener('visibilitychange', handleVisibilityRefresh);
  window.removeEventListener('focus', handleVisibilityRefresh);
}

// Comunicados, agenda, feedback e holerites agora vivem no Supabase (via API),
// não mais no localStorage — por isso não há mais funções de "saveXToStorage" aqui.

async function handleLogin() {
    const emailInp = document.getElementById('login-email').value.trim().toLowerCase();
    const passInp = document.getElementById('login-pass').value;
    const errorEl = document.getElementById('login-error-msg');

    try {
        const { token, user } = await Database.login(emailInp, passInp);
        await initDatabase();
        await loadSharedData(user.email, user.role);

        if (errorEl) errorEl.style.display = 'none';
        localStorage.setItem('alltak_token', token);
        localStorage.setItem('alltak_role', user.role);
        localStorage.setItem('alltak_user_email', user.email);
        localStorage.setItem('alltak_user_id', user.id);
        localStorage.setItem('alltak_logged', "true");

        document.getElementById('user-avatar').innerText = (VALID_USERS[user.email] && VALID_USERS[user.email].initial) || user.email.slice(0, 2).toUpperCase();
        applyRoleUI(user.role);
        renderDirectfeedbackForUser(user.email);
        renderUserPayslips(user.email);

        document.querySelectorAll('.app-protected').forEach(el => el.style.display = 'flex');
        document.getElementById('app-main-content').style.display = 'block';
        document.getElementById('acesso').classList.remove('active');
        renderFeaturedAnnouncement(); renderHomeFeed(); renderMural(); buildCalendar();
        go('home');
        startAutoRefresh();
    } catch (err) {
        if (errorEl) {
            errorEl.innerText = 'E-mail ou senha incorretos. Tente novamente.';
            errorEl.style.display = 'block';
        }
    }
}

function handleLogout() {
    if(confirm("Deseja sair da sua conta?")) {
        stopAutoRefresh();
        localStorage.removeItem('alltak_role');
        localStorage.removeItem('alltak_user_email');
        localStorage.removeItem('alltak_logged');
        
        document.querySelectorAll('.app-protected').forEach(el => el.style.display = 'none');
        document.getElementById('app-main-content').style.display = 'none';
        applyRoleUI(null);

        document.getElementById('login-email').value = '';
        document.getElementById('login-pass').value = '';
        document.getElementById('direct-feedback-box').style.display = 'none';
        document.getElementById('user-payslips-list').innerHTML = '';

        document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
        document.getElementById('acesso').classList.add('active');
    }
}

function applyRoleUI(role) {
    const isAdmin = role === 'admin';
    document.querySelectorAll('.admin-only-nav').forEach(el => el.style.display = isAdmin ? 'flex' : 'none');

    const pill = document.getElementById('role-pill');
    if(pill) pill.style.display = isAdmin ? 'inline-flex' : 'none';

    const avatar = document.getElementById('user-avatar');
    if(avatar) avatar.classList.toggle('is-admin', isAdmin);

    if(isAdmin) {
        renderAdminPosts();
        renderAdminEvents();
        renderAdminfeedback();
        renderAdminDirectfeedback();
        renderAdminMetrics();
        populateRecipientDropdown();
        populatePayslipRecipientDropdown();
        renderAdminPayslips();
    }
}

function renderDirectfeedbackForUser(email) {
  const box = document.getElementById('direct-feedback-box');
  const list = document.getElementById('direct-feedback-received-list');
  if(!box || !list) return;

  const userMessages = directfeedbackData.filter(df => df.recipient === email);

  if(userMessages.length > 0 && localStorage.getItem('alltak_role') !== 'admin') {
    box.style.display = 'block';
    list.innerHTML = userMessages.map(m => `
      <div style="border-bottom: 1.5px dashed var(--line); padding: 10px 0; margin-bottom: 8px;">
         <p style="font-size:13px; font-weight:600; color:var(--ink); line-height:1.4;">"${m.message}"</p>
         ${renderAttachments(m.attachments)}
         <span style="font-family:'Space Mono'; font-size:9.5px; color:#788e9e; display:block; margin-top:4px;">Enviado pela Administração em ${m.date}</span>
      </div>
    `).join('');
  } else {
    box.style.display = 'none';
  }
}

function populateRecipientDropdown() {
  const dropdown = document.getElementById('direct-feedback-recipient');
  if(!dropdown) return;
  dropdown.innerHTML = '';
  const nonAdmins = Object.keys(VALID_USERS).filter(email => VALID_USERS[email].role !== 'admin');
  if(nonAdmins.length === 0) {
    dropdown.innerHTML = '<option value="">Nenhum funcionário cadastrado</option>';
    return;
  }
  nonAdmins.forEach(email => {
    dropdown.innerHTML += `<option value="${email}">${email}</option>`;
  });
}

async function submitDirectfeedback(e) {
  e.preventDefault();
  const recipient = document.getElementById('direct-feedback-recipient').value;
  const message = document.getElementById('direct-feedback-text').value.trim();
  const fileInput = document.getElementById('direct-feedback-attachments');
  const submitBtn = document.getElementById('direct-feedback-submit-btn');
  if(!recipient) return alert('Por favor, cadastre um funcionário primeiro!');

  submitBtn.disabled = true;
  submitBtn.textContent = 'Enviando...';
  try {
    const attachments = await filesToAttachments(fileInput.files);
    await Database.createDirectfeedback(recipient, message, attachments);
    directfeedbackData = (await Database.getDirectfeedback()).map(normalizeDirectfeedback);
    alert(`Mensagem direcionada com sucesso para: ${recipient}`);
    document.getElementById('direct-feedback-text').value = '';
    fileInput.value = '';
    document.getElementById('direct-feedback-attachments-preview').innerHTML = '';
    renderAdminDirectfeedback();
  } catch (err) {
    alert(err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Enviar Feedback Direto';
  }
}

function renderAdminfeedback() {
    const container = document.getElementById('admin-feedback-list');
    if(!container) return;
    if(feedbackData.length === 0) {
        container.innerHTML = '<div class="admin-empty">Nenhum feedback recebido.</div>';
        return;
    }
    container.innerHTML = feedbackData.map((f) => `
        <div class="admin-item">
            <div class="info">
                <h4>${f.subject} <span style="color:var(--azul-claro)">★ ${f.rating}/5</span></h4>
                <p>"${f.message}"</p>
                ${renderAttachments(f.attachments)}
                <span class="meta">Enviado por ${f.userEmail} · ${f.date}</span>
            </div>
            <div class="admin-actions">
                <button class="danger" onclick="deletefeedback('${f.id}')">
                    <svg viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                </button>
            </div>
        </div>
    `).join('');
}

async function deletefeedback(feedbackId) {
    if(confirm("Excluir este feedback permanentemente?")) {
        try {
            await Database.deletefeedbackApi(feedbackId);
            feedbackData = (await Database.getfeedback()).map(normalizefeedback);
            renderAdminfeedback();
            renderAdminMetrics();
        } catch (err) {
            alert(err.message);
        }
    }
}

// Lista, no painel admin, os feedbacks diretos já enviados a funcionários — com opção de apagar.
function renderAdminDirectfeedback() {
    const container = document.getElementById('admin-direct-feedback-list');
    if (!container) return;
    if (directfeedbackData.length === 0) {
        container.innerHTML = '<div class="admin-empty">Nenhum feedback enviado ainda.</div>';
        return;
    }
    container.innerHTML = directfeedbackData.map((m) => `
        <div class="admin-item">
            <div class="info">
                <h4>${m.recipient}</h4>
                <p>"${m.message}"</p>
                ${renderAttachments(m.attachments)}
                <span class="meta">Enviado em ${m.date}</span>
            </div>
            <div class="admin-actions">
                <button class="danger" onclick="deleteDirectfeedback('${m.id}')">
                    <svg viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                </button>
            </div>
        </div>
    `).join('');
}

async function deleteDirectfeedback(directfeedbackId) {
    if (confirm("Excluir este feedback enviado permanentemente?")) {
        try {
            await Database.deleteDirectfeedbackApi(directfeedbackId);
            directfeedbackData = (await Database.getDirectfeedback()).map(normalizeDirectfeedback);
            renderAdminDirectfeedback();
            const email = localStorage.getItem('alltak_user_email');
            if (email) renderDirectfeedbackForUser(email);
        } catch (err) {
            alert(err.message);
        }
    }
}

function go(id){
  if(!localStorage.getItem('alltak_logged') && id !== 'acesso') id = 'acesso';
  if(id === 'admin' && localStorage.getItem('alltak_role') !== 'admin') id = 'home';

  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  const targetScreen = document.getElementById(id);
  if(targetScreen) targetScreen.classList.add('active');

  document.querySelectorAll('.navitem').forEach(n=>n.classList.remove('active'));
  const targetNav = document.querySelector('.navitem[data-screen="'+id+'"]');
  if(targetNav) targetNav.classList.add('active');
}

function renderFeaturedAnnouncement() {
  const container = document.getElementById('featured-announcement');
  if(!container || postsData.length === 0) return;
  const latestPost = postsData[0];
  container.innerHTML = `
    <span class="eyebrow">Comunicado em destaque</span>
    <h1>${latestPost.title}</h1>
    <p>${latestPost.desc}</p>
    <div class="hero-meta">
      <div><span class="k">Publicado</span><span class="v">${latestPost.date}</span></div>
      <div><span class="k">Categoria</span><span class="v">${latestPost.tag}</span></div>
    </div>
    <div class="hero-actions">
      <button class="btn" onclick="openFeaturedPost('${latestPost.id}')">Ler comunicado</button>
    </div>
  `;
}

function openFeaturedPost(id) {
  const post = postsData.find(p => p.id == id);
  if(!post) return;
  go('mural');
  const searchInput = document.getElementById('search-input');
  if (searchInput) { searchInput.value = post.title; renderMural('Todos', post.title); }
}

function renderHomeFeed() {
  const container = document.getElementById('home-feed-grid');
  if(!container) return;
  container.innerHTML = postsData.slice(0, 2).map(p => createPostCard(p)).join('');
}

function renderMural(filter = 'Todos', search = '') {
  const container = document.getElementById('mural-grid');
  if(!container) return;
  
  const filtered = postsData.filter(p => {
    const matchFilter = filter === 'Todos' || p.tag === filter;
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  container.innerHTML = filtered.length === 0 ? '<div style="padding:32px; color:#788e9e;">Nenhum informativo.</div>' : filtered.map(p => createPostCard(p)).join('');
}

function createPostCard(p) {
  return `
    <div class="post-card" onclick="alert('Post: ${p.title}')">
      <div class="post-media" style="background:${p.bg}"><span class="post-tag">${p.tag}</span></div>
      <div class="post-body">
        <h3>${p.urgent ? '<span class="urgent-pill">Urgente</span> ' : ''}${p.title}</h3>
        <p>${p.desc}</p>
        <div class="post-foot"><span>Por ${p.author}</span><span>${p.date}</span></div>
      </div>
    </div>
  `;
}

function buildCalendar() {
  const grid = document.getElementById('cal-grid');
  const monthYearLabel = document.getElementById('calendar-month-year');
  if(!grid) return;

  grid.innerHTML = '';
  monthYearLabel.innerText = `${monthNames[currentMonth]} ${currentYear}`;

  const dows = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  dows.forEach(d => grid.innerHTML += `<div class="cal-dow">${d}</div>`);

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();

  for(let i = 0; i < firstDay; i++) grid.innerHTML += `<div class="cal-cell muted"></div>`;

  for(let day = 1; day <= totalDays; day++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    let evtsHtml = eventsData[dateStr] ? '<div class="cal-evt-wrap">' + eventsData[dateStr].map(e => `<div class="cal-evt" style="background:${e.color}"></div>`).join('') + '</div>' : '';

    grid.innerHTML += `<div class="cal-cell" onclick="showDayEvents('${dateStr}', ${day})">${day}${evtsHtml}</div>`;
  }
}

function changeMonth(dir) {
  currentMonth += dir;
  if(currentMonth > 11) { currentMonth = 0; currentYear++; }
  if(currentMonth < 0) { currentMonth = 11; currentYear--; }
  buildCalendar();
}

function showDayEvents(dateStr, day) {
  const container = document.getElementById('cal-day-events');
  if(!container) return;
  container.innerHTML = `<h4 style="margin-bottom:8px;">Dia ${day}</h4>`;
  if(eventsData[dateStr]) {
    eventsData[dateStr].forEach(e => {
      container.innerHTML += `<div class="evt-row"><span class="evt-dot" style="background:${e.color}"></span><span>${e.title}</span></div>`;
    });
  } else {
    container.innerHTML += '<p style="font-size:12px; color:#788e9e;">Nenhum evento.</p>';
  }
}

async function submitfeedback(e) {
  e.preventDefault();
  const subject = document.getElementById('fb-subject').value;
  const message = document.getElementById('fb-message').value;
  const userEmail = localStorage.getItem('alltak_user_email') || 'anonimo@alltak.com.br';
  const fileInput = document.getElementById('fb-attachments');
  const submitBtn = document.getElementById('fb-submit-btn');

  submitBtn.disabled = true;
  submitBtn.textContent = 'Enviando...';
  try {
    const attachments = await filesToAttachments(fileInput.files);
    await Database.createfeedback(userEmail, subject, message, selectedRating, attachments);
    feedbackData = (await Database.getfeedback()).map(normalizefeedback);
    alert('Requisição enviada!');
    document.getElementById('fb-message').value = '';
    fileInput.value = '';
    document.getElementById('fb-attachments-preview').innerHTML = '';
    if(localStorage.getItem('alltak_role') === 'admin') { renderAdminfeedback(); renderAdminMetrics(); }
  } catch (err) {
    alert(err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Enviar Requisição';
  }
}

function showAdminTab(tab) {
  document.querySelectorAll('#admin-tabs .chip').forEach(c => c.classList.remove('on'));
  document.querySelector(`#admin-tabs .chip[data-admintab="${tab}"]`).classList.add('on');
  document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('admin-' + tab).classList.add('active');
  
  if (tab === 'usuarios') renderAdminUsers();
  if (tab === 'feedback') { renderAdminfeedback(); renderAdminDirectfeedback(); }
  if (tab === 'metricas') renderAdminMetrics();
  if (tab === 'holerites') { populatePayslipRecipientDropdown(); renderAdminPayslips(); }
}

async function submitPostForm(e) {
  e.preventDefault();
  const title = document.getElementById('post-title').value.trim();
  const desc = document.getElementById('post-desc').value.trim();
  const tag = document.getElementById('post-tag').value;
  const author = document.getElementById('post-author').value.trim();
  const urgent = document.getElementById('post-urgent').checked;

  try {
    await Database.createPost(title, desc, author, tag, urgent);
    localStorage.setItem('alltak_new_notification', 'true');
    checkNotificationState();
    postsData = (await Database.getPosts()).map(normalizePost);
    document.getElementById('post-form').reset();
    renderFeaturedAnnouncement(); renderHomeFeed(); renderMural(); renderAdminPosts(); renderAdminMetrics();
  } catch (err) {
    alert(err.message);
  }
}

function renderAdminPosts() {
  const container = document.getElementById('admin-posts-list');
  if(!container) return;
  if(postsData.length === 0) { container.innerHTML = '<div class="admin-empty">Nenhum comunicado criado.</div>'; return; }
  container.innerHTML = postsData.map((p, index) => `
    <div class="admin-item">
        <div class="info"><h4>${p.title}</h4><p>${p.desc.substring(0, 60)}...</p></div>
        <div class="admin-actions">
            <button class="danger" onclick="deletePost(${index})">
                <svg viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            </button>
        </div>
    </div>`).join('');
}

async function deletePost(index) {
    if(confirm("Excluir este comunicado permanentemente?")) {
        const post = postsData[index];
        try {
            await Database.deletePost(post.id);
            postsData = (await Database.getPosts()).map(normalizePost);
            renderFeaturedAnnouncement(); renderHomeFeed(); renderMural(); renderAdminPosts(); renderAdminMetrics();
        } catch (err) {
            alert(err.message);
        }
    }
}

async function submitEventForm(e) {
  e.preventDefault();
  const date = document.getElementById('event-date').value;
  const title = document.getElementById('event-title').value.trim();
  const color = document.getElementById('event-color').value;

  try {
    await Database.createEvent(date, title, color);
    eventsData = rebuildEventsMap(await Database.getEvents());
    document.getElementById('event-form').reset();
    buildCalendar(); renderAdminEvents();
  } catch (err) {
    alert(err.message);
  }
}

function renderAdminEvents() {
    const container = document.getElementById('admin-events-list');
    if(!container) return;
    let html = '';
    let count = 0;
    for (let d in eventsData) {
        eventsData[d].forEach((ev) => {
            count++;
            html += `
            <div class="admin-item">
                <div class="info"><h4>${ev.title}</h4><span class="meta">${d}</span></div>
                <div class="admin-actions">
                    <button class="danger" onclick="deleteEvent('${ev.id}')">
                        <svg viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                    </button>
                </div>
            </div>`;
        });
    }
    container.innerHTML = count === 0 ? '<div class="admin-empty">Nenhum evento agendado.</div>' : html;
}

async function deleteEvent(eventId) {
    if(confirm("Excluir este evento da agenda?")) {
        try {
            await Database.deleteEvent(eventId);
            eventsData = rebuildEventsMap(await Database.getEvents());
            buildCalendar(); renderAdminEvents();
        } catch (err) {
            alert(err.message);
        }
    }
}

async function submitUserForm(e) {
  e.preventDefault();
  const email = document.getElementById('user-email').value.trim().toLowerCase();
  const pass = document.getElementById('user-password').value;
  const role = document.getElementById('user-role').value;

  const newUser = { password: pass, role: role, initial: email.substring(0,2).toUpperCase() };
  await Database.saveUser(email, newUser);
  VALID_USERS = await Database.getUsers();
  
  document.getElementById('user-form').reset();
  alert(`Usuário ${email} cadastrado com sucesso e salvo no banco!`);
  renderAdminUsers();
  populateRecipientDropdown();
  populatePayslipRecipientDropdown();
  renderAdminMetrics();
}

function renderAdminUsers() {
  const container = document.getElementById('admin-users-list');
  if(!container) return;
  const keys = Object.keys(VALID_USERS);
  if(keys.length === 0) { container.innerHTML = '<div class="admin-empty">Nenhum usuário cadastrado.</div>'; return; }
  container.innerHTML = keys.map(email => `
    <div class="admin-item">
        <div class="info"><h4>${email}</h4><span class="meta">Cargo/Nível: ${VALID_USERS[email].role}</span></div>
        <div class="admin-actions">
            ${email !== 'admin@alltak.com.br' ? `
            <button class="danger" onclick="deleteUserSystem('${email}')">
                <svg viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            </button>` : ''}
        </div>
    </div>`).join('');
}

async function deleteUserSystem(email) {
    if(confirm(`Tem certeza que deseja excluir permanentemente o acesso de ${email}?`)) {
        const userId = VALID_USERS[email] && VALID_USERS[email].id;
        await Database.deleteUser(userId);
        VALID_USERS = await Database.getUsers();
        renderAdminUsers();
        populateRecipientDropdown();
        populatePayslipRecipientDropdown();
        renderAdminMetrics();
    }
}

function populatePayslipRecipientDropdown() {
  const dropdown = document.getElementById('payslip-recipient');
  if(!dropdown) return;
  dropdown.innerHTML = Object.keys(VALID_USERS).map(email => `<option value="${email}">${email}</option>`).join('');
}

function submitPayslipForm(e) {
  e.preventDefault();
  const recipient = document.getElementById('payslip-recipient').value;
  const ref = document.getElementById('payslip-ref').value;
  const file = document.getElementById('payslip-file').files[0];

  const reader = new FileReader();
  reader.onload = async function() {
    try {
      await Database.createPayslip(recipient, ref, file.name, reader.result);
      payslipsData = (await Database.getPayslips()).map(normalizePayslip);
      renderAdminPayslips(); alert('Holerite enviado com sucesso!');
      document.getElementById('payslip-form').reset();
      renderAdminMetrics();
    } catch (err) {
      alert(err.message);
    }
  };
  reader.readAsDataURL(file);
}

function handleBulkFilesSelected(input) {
  selectedBulkFiles = Array.from(input.files);
  const preview = document.getElementById('payslip-bulk-preview');
  const btn = document.getElementById('payslip-bulk-submit');
  if(!preview) return;

  if(selectedBulkFiles.length === 0) {
    preview.innerHTML = '';
    btn.disabled = true;
    return;
  }

  const emails = Object.keys(VALID_USERS);
  preview.innerHTML = selectedBulkFiles.map(file => {
     let matchedEmail = 'Não identificado (será ignorado)';
     const nameLower = file.name.toLowerCase();
     
     for(let email of emails) {
        const prefix = email.split('@')[0];
        if(nameLower.includes(prefix)) { matchedEmail = email; break; }
     }
     return `<div class="admin-item"><div><strong>Arquivo:</strong> ${file.name}<br><small style="color:var(--azul-principal)">Destinatário: ${matchedEmail}</small></div></div>`;
  }).join('');
  btn.disabled = false;
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function submitBulkPayslips(e) {
  e.preventDefault();
  const ref = document.getElementById('payslip-bulk-ref').value;
  const emails = Object.keys(VALID_USERS);

  try {
    for (const file of selectedBulkFiles) {
      let matchedEmail = null;
      const nameLower = file.name.toLowerCase();
      for (let email of emails) {
        const prefix = email.split('@')[0];
        if (nameLower.includes(prefix)) { matchedEmail = email; break; }
      }
      if (matchedEmail) {
        const dataUrl = await readFileAsDataURL(file);
        await Database.createPayslip(matchedEmail, ref, file.name, dataUrl);
      }
    }
    payslipsData = (await Database.getPayslips()).map(normalizePayslip);
    renderAdminPayslips(); renderAdminMetrics();
    alert('Envio em massa processado com sucesso!');
    document.getElementById('payslip-bulk-form').reset();
    document.getElementById('payslip-bulk-preview').innerHTML = '';
    document.getElementById('payslip-bulk-submit').disabled = true;
  } catch (err) {
    alert(err.message);
  }
}

function renderAdminPayslips() {
  const container = document.getElementById('admin-payslips-list');
  if(!container) return;
  if(payslipsData.length === 0) { container.innerHTML = '<div class="admin-empty">Nenhum holerite enviado.</div>'; return; }
  container.innerHTML = payslipsData.map((p) => `
    <div class="admin-item">
        <div class="info"><h4>Ref: ${p.ref} ➔ ${p.recipient}</h4><p>${p.fileName}</p></div>
        <div class="admin-actions">
            <button class="danger" onclick="deletePayslip('${p.id}')">
                <svg viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            </button>
        </div>
    </div>`).join('');
}

async function deletePayslip(payslipId) {
    if(confirm("Remover este holerite do servidor?")) {
        try {
            await Database.deletePayslipApi(payslipId);
            payslipsData = (await Database.getPayslips()).map(normalizePayslip);
            renderAdminPayslips(); renderAdminMetrics();
            const currentEmail = localStorage.getItem('alltak_user_email');
            if(currentEmail) renderUserPayslips(currentEmail);
        } catch (err) {
            alert(err.message);
        }
    }
}

function renderUserPayslips(email) {
  const container = document.getElementById('user-payslips-list');
  if(!container) return;
  const filtered = payslipsData.filter(p => p.recipient === email);
  if(filtered.length === 0) {
      container.innerHTML = '<p style="font-size:12px; color:#788e9e; text-align:center; padding:20px;">Nenhum contracheque disponível para sua conta até o momento.</p>';
      return;
  }
  container.innerHTML = filtered.map(p => `
    <div class="doc-row" onclick="downloadPayslip('${p.id}')">
      <div class="doc-ic"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg></div>
      <div class="info"><h4>Holerite Competência: ${p.ref}</h4><span>Upload em ${p.uploadDate} · Clique para abrir</span></div>
      <div class="doc-dl">Baixar</div>
    </div>`).join('');
}

function downloadPayslip(id) {
  const p = payslipsData.find(p => p.id == id);
  if(!p) return;
  const link = document.createElement('a'); link.href = p.fileData; link.download = p.fileName; link.click();
}

function renderAdminMetrics() {
    const grid = document.getElementById('admin-stat-grid');
    if(!grid) return;
    let totalEvts = 0; for(let k in eventsData) totalEvts += eventsData[k].length;
    grid.innerHTML = `
      <div class="stat-card"><div class="n">${Object.keys(VALID_USERS).length}</div><div class="l">Usuários Ativos</div></div>
      <div class="stat-card"><div class="n">${postsData.length}</div><div class="l">Comunicados</div></div>
      <div class="stat-card"><div class="n">${feedbackData.length}</div><div class="l">Sugestões</div></div>
      <div class="stat-card"><div class="n">${payslipsData.length}</div><div class="l">Holerites no Banco</div></div>
    `;
}

function checkNotificationState() {
  const hasNew = localStorage.getItem('alltak_new_notification') === 'true';
  const dot = document.getElementById('notification-dot');
  if(dot) dot.style.display = hasNew ? 'block' : 'none';
}

function handleNotificationClick() {
  localStorage.removeItem('alltak_new_notification'); checkNotificationState(); go('mural');
}

document.querySelectorAll('#stars-container svg').forEach(star => {
    star.addEventListener('click', function() {
        selectedRating = parseInt(this.getAttribute('data-star'));
        document.querySelectorAll('#stars-container svg').forEach(s => {
            if(parseInt(s.getAttribute('data-star')) <= selectedRating) { s.classList.add('filled'); } 
            else { s.classList.remove('filled'); }
        });
    });
});

document.getElementById('search-input')?.addEventListener('input', function() {
    const currentActiveChip = document.querySelector('#mural-filters .chip.on');
    const activeTag = currentActiveChip ? currentActiveChip.getAttribute('data-filter') : 'Todos';
    renderMural(activeTag, this.value);
});

document.querySelectorAll('#mural-filters .chip').forEach(chip => {
    chip.addEventListener('click', function() {
        document.querySelectorAll('#mural-filters .chip').forEach(c => c.classList.remove('on'));
        this.classList.add('on');
        const searchVal = document.getElementById('search-input')?.value || '';
        renderMural(this.getAttribute('data-filter'), searchVal);
    });
});

window.addEventListener('DOMContentLoaded', async () => {
    await initDatabase();
    const isLogged = localStorage.getItem('alltak_logged') === "true";
    const userEmail = localStorage.getItem('alltak_user_email');
    const userRole = localStorage.getItem('alltak_role');
    if (isLogged && userEmail && VALID_USERS[userEmail]) {
        await loadSharedData(userEmail, userRole);
        document.getElementById('user-avatar').innerText = VALID_USERS[userEmail].initial;
        applyRoleUI(userRole);
        renderDirectfeedbackForUser(userEmail); renderUserPayslips(userEmail);
        document.querySelectorAll('.app-protected').forEach(el => el.style.display = 'flex');
        document.getElementById('app-main-content').style.display = 'block';
        document.getElementById('acesso').classList.remove('active');
        go('home');
        startAutoRefresh();
    }
    renderFeaturedAnnouncement(); renderHomeFeed(); renderMural(); buildCalendar(); checkNotificationState();
});
