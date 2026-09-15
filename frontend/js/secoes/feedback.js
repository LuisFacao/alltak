import { Memoria } from "../main.js";
import { Formata, Normalizers } from "../util.js";
import { Database } from "../banco.js";
import { Admin } from "./admin.js";

export const Feedback = {
  render(email) {
    const box = document.getElementById('direct-feedback-box');
    const list = document.getElementById('direct-feedback-received-list');
    if(!box || !list) return;
    const userMessages = Memoria.directfeedbackData.filter(df => df.recipient === email);
    if(userMessages.length > 0 && localStorage.getItem('alltak_role') !== 'admin') {
      box.style.display = 'block';
      list.innerHTML = userMessages.map(m => `
        <div style="border-bottom: 1.5px dashed var(--line); padding: 10px 0; margin-bottom: 8px;">
           <p style="font-size:13px; font-weight:600; color:var(--ink); line-height:1.4;">"${Formata.escapeHtml(m.message)}"</p>
           ${Formata.renderAttachments(m.attachments)}
           <span style="font-family:'Space Mono'; font-size:9.5px; color:#788e9e; display:block; margin-top:4px;">Enviado pela Administração em ${m.date}</span>
        </div>
      `).join('');
    } else {
      box.style.display = 'none';
    }
  },

  async submit(e) {
    e.preventDefault();
    const subject = document.getElementById('fb-subject').value;
    const message = document.getElementById('fb-message').value;
    const userEmail = localStorage.getItem('alltak_user_email') || 'anonimo@alltak.com.br';
    const fileInput = document.getElementById('fb-attachments');
    const submitBtn = document.getElementById('fb-submit-btn');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';
    try {
      const attachments = await Formata.filesToAttachments(fileInput.files);
      await Database.createfeedback(userEmail, subject, message, Memoria.selectedRating, attachments);
      Memoria.feedbackData = (await Database.getfeedback()).map(Normalizers.feedback);
      alert('Requisição enviada!');
      document.getElementById('fb-message').value = '';
      fileInput.value = '';
      document.getElementById('fb-attachments-preview').innerHTML = '';
      if(localStorage.getItem('alltak_role') === 'admin') { Feedback.renderAdm(); Admin.metricsRender(); }
    } catch (err) {
      alert(err.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Enviar Requisição';
    }
  },

  renderAdm() {
    const container = document.getElementById('admin-feedback-list');
    if(!container) return;
    if(Memoria.feedbackData.length === 0) {
      container.innerHTML = '<div class="admin-empty">Nenhum feedback recebido.</div>';
      return;
    }
    container.innerHTML = Memoria.feedbackData.map((f) => `
      <div class="admin-item">
          <div class="info">
              <h4>${Formata.escapeHtml(f.subject)} <span style="color:var(--azul-claro)">★ ${f.rating}/5</span></h4>
              <p>"${Formata.escapeHtml(f.message)}"</p>
              ${Formata.renderAttachments(f.attachments)}
              <span class="meta">Enviado por ${Formata.escapeHtml(f.userEmail)} · ${f.date}</span>
          </div>
          <div class="admin-actions">
              <button class="danger" onclick="deletefeedback('${f.id}')">
                  <svg viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              </button>
          </div>
      </div>
    `).join('');
  },

  async delete(feedbackId) {
    if(confirm("Excluir este feedback permanentemente?")) {
      try {
        await Database.deletefeedbackApi(feedbackId);
        Memoria.feedbackData = (await Database.getfeedback()).map(Normalizers.feedback);
        Feedback.renderAdm();
        Admin.metricsRender();
      } catch (err) {
        alert(err.message);
      }
    }
  },

  async directSubmit(e) {
    e.preventDefault();
    const recipient = document.getElementById('direct-feedback-recipient').value;
    const message = document.getElementById('direct-feedback-text').value.trim();
    const fileInput = document.getElementById('direct-feedback-attachments');
    const submitBtn = document.getElementById('direct-feedback-submit-btn');
    if(!recipient) return alert('Por favor, cadastre um funcionário primeiro!');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';
    try {
      const attachments = await Formata.filesToAttachments(fileInput.files);
      await Database.createDirectfeedback(recipient, message, attachments);
      Memoria.directfeedbackData = (await Database.getDirectfeedback()).map(Normalizers.directFeedback);
      alert(`Mensagem direcionada com sucesso para: ${recipient}`);
      document.getElementById('direct-feedback-text').value = '';
      fileInput.value = '';
      document.getElementById('direct-feedback-attachments-preview').innerHTML = '';
      Feedback.renderAdmDireto();
    } catch (err) {
      alert(err.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Enviar Feedback Direto';
    }
  },

  renderAdmDireto() {
    const container = document.getElementById('admin-direct-feedback-list');
    if (!container) return;
    if (Memoria.directfeedbackData.length === 0) {
      container.innerHTML = '<div class="admin-empty">Nenhum feedback enviado ainda.</div>';
      return;
    }
    container.innerHTML = Memoria.directfeedbackData.map((m) => `
      <div class="admin-item">
          <div class="info">
              <h4>${Formata.escapeHtml(m.recipient)}</h4>
              <p>"${Formata.escapeHtml(m.message)}"</p>
              ${Formata.renderAttachments(m.attachments)}
              <span class="meta">Enviado em ${m.date}</span>
          </div>
          <div class="admin-actions">
              <button class="danger" onclick="deleteDirectfeedback('${m.id}')">
                  <svg viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012 2v2"/></svg>
              </button>
          </div>
      </div>
    `).join('');
  },

  async directDelete(directfeedbackId) {
    if (confirm("Excluir este feedback enviado permanentemente?")) {
      try {
        await Database.deleteDirectfeedbackApi(directfeedbackId);
        Memoria.directfeedbackData = (await Database.getDirectfeedback()).map(Normalizers.directFeedback);
        Feedback.renderAdmDireto();
      } catch (err) {
        alert(err.message);
      }
    }
  }
};