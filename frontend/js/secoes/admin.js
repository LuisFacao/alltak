import { Memoria } from "../main.js";
import { Formata } from "../util.js";
import { Database } from "../banco.js";
import { Feedback } from "./feedback.js";

export const Admin = {
  showTab(tab) {
    document.querySelectorAll('#admin-tabs .chip').forEach(c => c.classList.remove('on'));
    document.querySelector(`#admin-tabs .chip[data-admintab="${tab}"]`).classList.add('on');
    document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('admin-' + tab).classList.add('active');
    
    switch (tab) { 
      case 'usuarios' : Admin.usersRender(); break;
      case 'feedback' : Feedback.renderAdm(); Feedback.renderAdmDireto(); break;
      case 'metricas' : Admin.metricsRender(); break;
      case 'holerites' : Admin.holeriteDropdown(); Admin.holeriteRender(); break;
    }
  },

  recipentePopularDropdown() {
    const dropdown = document.getElementById('direct-feedback-recipient');
    if(!dropdown) return;
    dropdown.innerHTML = '';
    const nonAdmins = Object.keys(Memoria.VALID_USERS).filter(email => Memoria.VALID_USERS[email].role !== 'admin');
    if(nonAdmins.length === 0) {
      dropdown.innerHTML = '<option value="">Nenhum funcionário cadastrado</option>';
      return;
    }
    nonAdmins.forEach(email => {
      dropdown.innerHTML += `<option value="${Formata.escapeHtml(email)}">${Formata.escapeHtml(email)}</option>`;
    });
  },

  eventsRender() {
    const container = document.getElementById('admin-events-list');
    if(!container) return;
    let html = '';
    let count = 0;
    for (let d in Memoria.eventsData) {
      Memoria.eventsData[d].forEach((ev) => {
        count++;
        html += `
        <div class="admin-item">
            <div class="info"><h4>${Formata.escapeHtml(ev.title)}</h4><span class="meta">${d}</span></div>
            <div class="admin-actions">
                <button class="danger" onclick="deleteEvent('${ev.id}')">
                    <svg viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012 2v2"/></svg>
                </button>
            </div>
        </div>`;
      });
    }
    container.innerHTML = count === 0 ? '<div class="admin-empty">Nenhum evento agendado.</div>' : html;
  },

  postsRender() {
    const container = document.getElementById('admin-posts-list');
    if(!container) return;
    if(Memoria.postsData.length === 0) { container.innerHTML = '<div class="admin-empty">Nenhum comunicado criado.</div>'; return; }
    container.innerHTML = Memoria.postsData.map((p, index) => `
      <div class="admin-item">
          <div class="info"><h4>${Formata.escapeHtml(p.title)}</h4><p>${Formata.escapeHtml(p.desc.substring(0, 60))}...</p></div>
          <div class="admin-actions">
              <button class="danger" onclick="deletePost(${index})">
                  <svg viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012 2v2"/></svg>
              </button>
          </div>
      </div>`).join('');
  },

  usersRender() {
    const container = document.getElementById('admin-users-list');
    if(!container) return;
    const keys = Object.keys(Memoria.VALID_USERS);
    if(keys.length === 0) { container.innerHTML = '<div class="admin-empty">Nenhum usuário cadastrado.</div>'; return; }
    container.innerHTML = keys.map(email => `
      <div class="admin-item">
          <div class="info"><h4>${Formata.escapeHtml(email)}</h4><span class="meta">Cargo/Nível: ${Formata.escapeHtml(Memoria.VALID_USERS[email].role)}</span></div>
          <div class="admin-actions">
              ${email !== 'admin@alltak.com.br' ? `
              <button class="danger" onclick="deleteUserSystem('${email}')">
                  <svg viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              </button>` : ''}
          </div>
      </div>`).join('');
  },

  async userSubmitForm(e) {
    e.preventDefault();
    const email = document.getElementById('user-email').value.trim().toLowerCase();
    const pass = document.getElementById('user-password').value;
    const role = document.getElementById('user-role').value;

    const newUser = { password: pass, role: role, initial: email.substring(0,2).toUpperCase() };
    await Database.saveUser(email, newUser);
    Memoria.VALID_USERS = await Database.getUsers();
    
    document.getElementById('user-form').reset();
    alert(`Usuário ${email} cadastrado com sucesso e salvo no banco!`);
    Admin.usersRender();
    Admin.recipentePopularDropdown();
    Admin.holeriteDropdown();
    Admin.metricsRender();
  },

  async userDelete(email) {
    if(confirm(`Tem certeza que deseja excluir permanentemente o acesso de ${email}?`)) {
      const userId = Memoria.VALID_USERS[email] && Memoria.VALID_USERS[email].id;
      await Database.deleteUser(userId);
      Memoria.VALID_USERS = await Database.getUsers();
      Admin.usersRender();
      Admin.recipentePopularDropdown();
      Admin.holeriteDropdown();
      Admin.metricsRender();
    }
  },

  holeriteDropdown() {
    const dropdown = document.getElementById('payslip-recipient');
    if(!dropdown) return;
    dropdown.innerHTML = Object.keys(Memoria.VALID_USERS).map(email => `<option value="${Formata.escapeHtml(email)}">${Formata.escapeHtml(email)}</option>`).join('');
  },

  holeriteRender() {
    const container = document.getElementById('admin-payslips-list');
    if(!container) return;
    if(Memoria.holeriteData.length === 0) { container.innerHTML = '<div class="admin-empty">Nenhum holerite enviado.</div>'; return; }
    container.innerHTML = Memoria.holeriteData.map((p) => `
      <div class="admin-item">
          <div class="info"><h4>Ref: ${Formata.escapeHtml(p.ref)} ➔ ${Formata.escapeHtml(p.recipient)}</h4><p>${Formata.escapeHtml(p.fileName)}</p></div>
          <div class="admin-actions">
              <button class="danger" onclick="deletePayslip('${p.id}')">
                  <svg viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012 2v2"/></svg>
              </button>
          </div>
      </div>`).join('');
  },

  metricsRender() {
    const grid = document.getElementById('admin-stat-grid');
    if(!grid) return;
    grid.innerHTML = `
      <div class="stat-card"><div class="n">${Object.keys(Memoria.VALID_USERS).length}</div><div class="l">Usuários Ativos</div></div>
      <div class="stat-card"><div class="n">${Memoria.postsData.length}</div><div class="l">Comunicados</div></div>
      <div class="stat-card"><div class="n">${Memoria.feedbackData.length}</div><div class="l">Sugestões</div></div>
      <div class="stat-card"><div class="n">${Memoria.holeriteData.length}</div><div class="l">Holerites no Banco</div></div>
    `;
  }
};