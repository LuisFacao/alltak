import { Memoria } from "../main.js";
import { Formata, Normalizers } from "../util.js";
import { Database } from "../banco.js";
import { Admin } from "./admin.js";

export const Holerite = {
  renderUser(email) {
    const container = document.getElementById('user-payslips-list');
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

  download(id) {
    const p = Memoria.holeriteData.find(p => p.id == id);
    if(!p) return;
    Formata.downloadAttachment(p.fileData, p.fileName);
  },

  submitForm(e) {
    e.preventDefault();
    const recipient = document.getElementById('payslip-recipient').value;
    const ref = document.getElementById('payslip-ref').value;
    const file = document.getElementById('payslip-file').files[0];

    if (!file) return alert('Selecione um arquivo.');
    const sizeErr = Formata.checkFileSize(file);
    if (sizeErr) return alert(sizeErr.message);

    Database.uploadHolerite(recipient, ref, file)
      .then(async () => {
        Memoria.holeriteData = (await Database.getHolerite()).map(Normalizers.holerite);
        Admin.holeriteRender();
        alert('Holerite enviado com sucesso!');
        document.getElementById('payslip-form').reset();
        Admin.metricsRender();
      })
      .catch(err => alert(err.message));
  },

  handleBulkFilesSelected(input) {
    Memoria.selectedBulkFiles = Array.from(input.files);
    const preview = document.getElementById('payslip-bulk-preview');
    const btn = document.getElementById('payslip-bulk-submit');
    if(!preview) return;

    if(Memoria.selectedBulkFiles.length === 0) {
      preview.innerHTML = '';
      btn.disabled = true;
      return;
    }

    const emails = Object.keys(Memoria.VALID_USERS);
    const oversized = Memoria.selectedBulkFiles.filter(f => Formata.checkFileSize(f));

    preview.innerHTML = Memoria.selectedBulkFiles.map(file => {
      const matchedEmail = Formata.matchEmailForFile(file.name, emails);
      const tooBig = Formata.checkFileSize(file);
      const status = tooBig
        ? `<small style="color:#c0392b">Arquivo muito grande (será ignorado)</small>`
        : matchedEmail
          ? `<small style="color:var(--azul-principal)">Destinatário: ${Formata.escapeHtml(matchedEmail)}</small>`
          : `<small style="color:#c0392b">Não identificado (será ignorado)</small>`;
      return `<div class="admin-item"><div><strong>Arquivo:</strong> ${Formata.escapeHtml(file.name)}<br>${status}</div></div>`;
    }).join('');

    btn.disabled = oversized.length === Memoria.selectedBulkFiles.length;
  },

  async submitBulk(e) {
    e.preventDefault();
    const ref = document.getElementById('payslip-bulk-ref').value;
    const emails = Object.keys(Memoria.VALID_USERS);

    try {
      for (const file of Memoria.selectedBulkFiles) {
        if (Formata.checkFileSize(file)) continue;
        const matchedEmail = Formata.matchEmailForFile(file.name, emails);
        if (matchedEmail) {
          await Database.uploadHolerite(matchedEmail, ref, file);
        }
      }
      Memoria.holeriteData = (await Database.getHolerite()).map(Normalizers.holerite);
      Admin.holeriteRender(); Admin.metricsRender();
      alert('Envio em massa processado com sucesso!');
      document.getElementById('payslip-bulk-form').reset();
      document.getElementById('payslip-bulk-preview').innerHTML = '';
      document.getElementById('payslip-bulk-submit').disabled = true;
    } catch (err) {
      alert(err.message);
    }
  },

  async delete(holeriteId) {
    if(confirm("Remover este holerite do servidor?")) {
      try {
        await Database.deleteHoleriteApi(holeriteId);
        Memoria.holeriteData = (await Database.getHolerite()).map(Normalizers.holerite);
        Admin.holeriteRender(); 
        Admin.metricsRender();
      } catch (err) {
        alert(err.message);
      }
    }
  }
};