import * as API from './api.js';
import * as State from './state.js';
import * as Helpers from './helpers.js';

export function populateRecipientDropdown() { /* indentificação de usuario */
  const dropdown = document.getElementById('direct-feedback-recipient');
  if(!dropdown) return;
  dropdown.innerHTML = '';
  const nonAdmins = Object.keys(State.Store.VALID_USERS).filter(email => State.Store.VALID_USERS[email].role !== 'admin');
  if(nonAdmins.length === 0) {
    dropdown.innerHTML = '<option value="">Nenhum funcionário cadastrado</option>';
    return;
  }
  nonAdmins.forEach(email => {
    dropdown.innerHTML += `<option value="${Helpers.escapeHtml(email)}">${Helpers.escapeHtml(email)}</option>`;
  });
}

export function renderAdminfeedback() { /* lista do feedback recebidos */
    const container = document.getElementById('admin-feedback-list');
    if(!container) return;
    if(State.Store.feedbackData.length === 0) {
        container.innerHTML = '<div class="admin-empty">Nenhum feedback recebido.</div>';
        return;
    }
    container.innerHTML = State.Store.feedbackData.map((f) => `
        <div class="admin-item">
            <div class="info">
                <h4>${Helpers.escapeHtml(f.subject)} <span style="color:var(--azul-claro)">★ ${f.rating}/5</span></h4>
                <p>"${Helpers.escapeHtml(f.message)}"</p>
                ${Helpers.renderAttachments(f.attachments)}
                <span class="meta">Enviado por ${Helpers.escapeHtml(f.userEmail)} · ${f.date}</span>
            </div>
            <div class="admin-actions">
                <button class="danger" onclick="deletefeedback('${f.id}')">
                    <svg viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                </button>
            </div>
        </div>
    `).join('');
}

export async function deletefeedback(feedbackId) { /* Excluir o feedback permanentemente */
    if(confirm("Excluir este feedback permanentemente?")) {
        try {
            await API.Database.deletefeedbackApi(feedbackId);
            State.Store.feedbackData = (await API.Database.getfeedback()).map(Helpers.normalizefeedback);
            renderAdminfeedback();
            renderAdminMetrics();
        } catch (err) {
            alert(err.message);
        }
    }
}

export function renderAdminDirectfeedback() { /* envio dos feedbacks */
    const container = document.getElementById('admin-direct-feedback-list');
    if (!container) return;
    if (State.Store.directfeedbackData.length === 0) {
        container.innerHTML = '<div class="admin-empty">Nenhum feedback enviado ainda.</div>';
        return;
    }
    container.innerHTML = State.Store.directfeedbackData.map((m) => `
        <div class="admin-item">
            <div class="info">
                <h4>${Helpers.escapeHtml(m.recipient)}</h4>
                <p>"${Helpers.escapeHtml(m.message)}"</p>
                ${Helpers.renderAttachments(m.attachments)}
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

export async function deleteDirectfeedback(directfeedbackId) { /* exclusão do feedback no meio do envio */
    if (confirm("Excluir este feedback enviado permanentemente?")) {
        try {
            await API.Database.deleteDirectfeedbackApi(directfeedbackId);
            State.Store.directfeedbackData = (await API.Database.getDirectfeedback()).map(Helpers.normalizeDirectfeedback);
            renderAdminDirectfeedback();
        } catch (err) {
            alert(err.message);
        }
    }
}

export function showAdminTab(tab) { /* mostrar a parte dedicada ao admin */
  document.querySelectorAll('#admin-tabs .chip').forEach(c => c.classList.remove('on'));
  document.querySelector(`#admin-tabs .chip[data-admintab="${tab}"]`).classList.add('on');
  document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('admin-' + tab).classList.add('active');
  
  switch (tab) { case 'usuarios' : renderAdminUsers() ; break ;
                 case 'feedback' : renderAdminfeedback(); renderAdminDirectfeedback() ; break ;
                 case 'metricas' : renderAdminMetrics() ; break ;
                 case 'holerites' : populatePayslipRecipientDropdown(); renderAdminPayslips() ; break ;
  }
}

export function renderAdminPosts() { /* renderização do comunicado dos admins */
  const container = document.getElementById('admin-posts-list');
  if(!container) return;
  if(State.Store.postsData.length === 0) { container.innerHTML = '<div class="admin-empty">Nenhum comunicado criado.</div>'; return; }
  container.innerHTML = State.Store.postsData.map((p, index) => `
    <div class="admin-item">
        <div class="info"><h4>${Helpers.escapeHtml(p.title)}</h4><p>${Helpers.escapeHtml(p.desc.substring(0, 60))}...</p></div>
        <div class="admin-actions">
            <button class="danger" onclick="deletePost(${index})">
                <svg viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            </button>
        </div>
    </div>`).join('');
}

export async function deletePost(index) { /* excluir os comunicados permanentemente */
    if(confirm("Excluir este comunicado permanentemente?")) {
        const post = State.Store.postsData[index];
        try {
            await API.Database.deletePost(post.id);
            State.Store.postsData = (await API.Database.getPosts()).map(Helpers.normalizePost);
            renderAdminPosts();
            renderAdminMetrics();
        } catch (err) {
            alert(err.message);
        }
    }
}

export function renderAdminEvents() { /* eventos no calendario */
    const container = document.getElementById('admin-events-list');
    if(!container) return;
    let html = '';
    let count = 0;
    for (let d in State.Store.eventsData) {
        State.Store.eventsData[d].forEach((ev) => {
            count++;
            html += `
            <div class="admin-item">
                <div class="info"><h4>${Helpers.escapeHtml(ev.title)}</h4><span class="meta">${d}</span></div>
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

export async function deleteEvent(eventId) {  /* excluir algum evento da agenda */
    if(confirm("Excluir este evento da agenda?")) {
        try {
            await API.Database.deleteEvent(eventId);
            State.Store.eventsData = Helpers.rebuildEventsMap(await API.Database.getEvents());
            renderAdminEvents();
        } catch (err) {
            alert(err.message);
        }
    }
}

export function renderAdminUsers() { 
  const container = document.getElementById('admin-users-list');
  if(!container) return;
  const keys = Object.keys(State.Store.VALID_USERS);
  if(keys.length === 0) { container.innerHTML = '<div class="admin-empty">Nenhum usuário cadastrado.</div>'; return; }
  container.innerHTML = keys.map(email => `
    <div class="admin-item">
        <div class="info"><h4>${Helpers.escapeHtml(email)}</h4><span class="meta">Cargo/Nível: ${Helpers.escapeHtml(State.Store.VALID_USERS[email].role)}</span></div>
        <div class="admin-actions">
            ${email !== 'admin@alltak.com.br' ? `
            <button class="danger" onclick="deleteUserSystem('${email}')">
                <svg viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            </button>` : ''}
        </div>
    </div>`).join('');
}

export async function deleteUserSystem(email) {
    if(confirm(`Tem certeza que deseja excluir permanentemente o acesso de ${email}?`)) {
        const userId = State.Store.VALID_USERS[email] && State.Store.VALID_USERS[email].id;
        await API.Database.deleteUser(userId);
        State.Store.VALID_USERS = await API.Database.getUsers();
        renderAdminUsers();
        populateRecipientDropdown();
        populatePayslipRecipientDropdown();
        renderAdminMetrics();
    }
}

export function populatePayslipRecipientDropdown() {
  const dropdown = document.getElementById('payslip-recipient');
  if(!dropdown) return;
  dropdown.innerHTML = Object.keys(State.Store.VALID_USERS).map(email => `<option value="${Helpers.escapeHtml(email)}">${Helpers.escapeHtml(email)}</option>`).join('');
}

export function renderAdminPayslips() {
  const container = document.getElementById('admin-payslips-list');
  if(!container) return;
  if(State.Store.payslipsData.length === 0) { container.innerHTML = '<div class="admin-empty">Nenhum holerite enviado.</div>'; return; }
  container.innerHTML = State.Store.payslipsData.map((p) => `
    <div class="admin-item">
        <div class="info"><h4>Ref: ${Helpers.escapeHtml(p.ref)} ➔ ${Helpers.escapeHtml(p.recipient)}</h4><p>${Helpers.escapeHtml(p.fileName)}</p></div>
        <div class="admin-actions">
            <button class="danger" onclick="deletePayslip('${p.id}')">
                <svg viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            </button>
        </div>
    </div>`).join('');
}

export async function deletePayslip(payslipId) {
    if(confirm("Remover este holerite do servidor?")) {
        try {
            await API.Database.deletePayslipApi(payslipId);
            State.Store.payslipsData = (await API.Database.getPayslips()).map(Helpers.normalizePayslip);
            renderAdminPayslips(); 
            renderAdminMetrics();
        } catch (err) {
            alert(err.message);
        }
    }
}

export function renderAdminMetrics() {
    const grid = document.getElementById('admin-stat-grid');
    if(!grid) return;
    grid.innerHTML = `
      <div class="stat-card"><div class="n">${Object.keys(State.Store.VALID_USERS).length}</div><div class="l">Usuários Ativos</div></div>
      <div class="stat-card"><div class="n">${State.Store.postsData.length}</div><div class="l">Comunicados</div></div>
      <div class="stat-card"><div class="n">${State.Store.feedbackData.length}</div><div class="l">Sugestões</div></div>
      <div class="stat-card"><div class="n">${State.Store.payslipsData.length}</div><div class="l">Holerites no Banco</div></div>
    `;
}
