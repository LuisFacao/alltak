import { Memoria } from "../main.js";
import { Formata } from "../util.js";

export const Perfil = {
  render(email) {
    if(!email) return;
    const role = localStorage.getItem('alltak_role');

    const emailEl = document.getElementById('perfil-user-email');
    if(emailEl) emailEl.textContent = email;

    const pill = document.getElementById('perfil-role-pill');
    if(pill) pill.style.display = role === 'admin' ? 'inline-flex' : 'none';

    Perfil.renderPayslips(email);
    Perfil.renderDirectFeedback(email);
    Perfil.renderMyFeedback(email);
  },

  renderPayslips(email) {
    const container = document.getElementById('perfil-payslips-list');
    if(!container) return;
    const filtered = Memoria.holeriteData.filter(p => p.recipient === email);
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
  },

  renderDirectFeedback(email) {
    const container = document.getElementById('perfil-direct-feedback-list');
    if(!container) return;
    const userMessages = Memoria.directfeedbackData.filter(df => df.recipient === email);
    if(userMessages.length === 0) {
      container.innerHTML = '<div class="admin-empty">Nenhuma mensagem recebida da administração até o momento.</div>';
      return;
    }
    container.innerHTML = userMessages.map(m => `
      <div style="border-bottom: 1.5px dashed var(--line); padding: 10px 0; margin-bottom: 8px;">
         <p style="font-size:13px; font-weight:600; color:var(--ink); line-height:1.4;">"${Formata.escapeHtml(m.message)}"</p>
         ${Formata.renderAttachments(m.attachments)}
         <span style="font-family:'Space Mono'; font-size:9.5px; color:#788e9e; display:block; margin-top:4px;">Enviado pela Administração em ${m.date}</span>
      </div>
    `).join('');
  },

  renderMyFeedback(email) {
    const container = document.getElementById('perfil-feedback-list');
    if(!container) return;
    const mine = Memoria.feedbackData.filter(f => f.userEmail === email);
    if(mine.length === 0) {
      container.innerHTML = '<div class="admin-empty">Você ainda não enviou nenhuma requisição.</div>';
      return;
    }
    container.innerHTML = mine.map(f => `
      <div class="admin-item">
          <div class="info">
              <h4>${Formata.escapeHtml(f.subject)} <span style="color:var(--azul-claro)">★ ${f.rating}/5</span></h4>
              <p>"${Formata.escapeHtml(f.message)}"</p>
              ${Formata.renderAttachments(f.attachments)}
              <span class="meta">Enviado em ${f.date}</span>
          </div>
      </div>
    `).join('');
  }
};
