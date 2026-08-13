import * as API from './api.js';
import * as State from './state.js';
import * as UI from './ui.js';
import * as Admin from './admin.js';
import * as Auth from './auth.js';
import * as Helpers from './helpers.js';

const partialsReady = Promise.all([
  UI.indexHTML("acesso"),
  UI.indexHTML("admin"),
  UI.indexHTML("app-bottomnav"),
  UI.indexHTML("app-header"),
  UI.indexHTML("calendario"),
  UI.indexHTML("feedback"),
  UI.indexHTML("holerites"),
  UI.indexHTML("home"),
  UI.indexHTML("institucional"),
  UI.indexHTML("mural"),
]);

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
    const attachments = await Helpers.filesToAttachments(fileInput.files);
    await API.Database.createDirectfeedback(recipient, message, attachments);
    State.Store.directfeedbackData = (await API.Database.getDirectfeedback()).map(Helpers.normalizeDirectfeedback);
    alert(`Mensagem direcionada com sucesso para: ${recipient}`);
    document.getElementById('direct-feedback-text').value = '';
    fileInput.value = '';
    document.getElementById('direct-feedback-attachments-preview').innerHTML = '';
    Admin.renderAdminDirectfeedback();
  } catch (err) {
    alert(err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Enviar Feedback Direto';
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
    const attachments = await Helpers.filesToAttachments(fileInput.files);
    await API.Database.createfeedback(userEmail, subject, message, State.Store.selectedRating, attachments);
    State.Store.feedbackData = (await API.Database.getfeedback()).map(Helpers.normalizefeedback);
    alert('Requisição enviada!');
    document.getElementById('fb-message').value = '';
    fileInput.value = '';
    document.getElementById('fb-attachments-preview').innerHTML = '';
    if(localStorage.getItem('alltak_role') === 'admin') { Admin.renderAdminfeedback(); Admin.renderAdminMetrics(); }
  } catch (err) {
    alert(err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Enviar Requisição';
  }
}

async function submitPostForm(e) {
  e.preventDefault();
  const title = document.getElementById('post-title').value.trim();
  const desc = document.getElementById('post-desc').value.trim();
  const tag = document.getElementById('post-tag').value;
  const author = document.getElementById('post-author').value.trim();
  const urgent = document.getElementById('post-urgent').checked;

  try {
    await API.Database.createPost(title, desc, author, tag, urgent);
    localStorage.setItem('alltak_new_notification', 'true');
    UI.checkNotificationState();
    State.Store.postsData = (await API.Database.getPosts()).map(Helpers.normalizePost);
    document.getElementById('post-form').reset();
    UI.renderFeaturedAnnouncement(); UI.renderHomeFeed(); UI.renderMural(); Admin.renderAdminPosts(); Admin.renderAdminMetrics();
  } catch (err) {
    alert(err.message);
  }
}

async function submitEventForm(e) {
  e.preventDefault();
  const date = document.getElementById('event-date').value;
  const title = document.getElementById('event-title').value.trim();
  const color = document.getElementById('event-color').value;

  try {
    await API.Database.createEvent(date, title, color);
    State.Store.eventsData = Helpers.rebuildEventsMap(await API.Database.getEvents());
    document.getElementById('event-form').reset();
    UI.buildCalendar(); Admin.renderAdminEvents();
  } catch (err) {
    alert(err.message);
  }
}

async function submitUserForm(e) {
  e.preventDefault();
  const email = document.getElementById('user-email').value.trim().toLowerCase();
  const pass = document.getElementById('user-password').value;
  const role = document.getElementById('user-role').value;

  const newUser = { password: pass, role: role, initial: email.substring(0,2).toUpperCase() };
  await API.Database.saveUser(email, newUser);
  State.Store.VALID_USERS = await API.Database.getUsers();
  
  document.getElementById('user-form').reset();
  alert(`Usuário ${email} cadastrado com sucesso e salvo no banco!`);
  Admin.renderAdminUsers();
  Admin.populateRecipientDropdown();
  Admin.populatePayslipRecipientDropdown();
  Admin.renderAdminMetrics();
}

function submitPayslipForm(e) {
  e.preventDefault();
  const recipient = document.getElementById('payslip-recipient').value;
  const ref = document.getElementById('payslip-ref').value;
  const file = document.getElementById('payslip-file').files[0];

  if (!file) return alert('Selecione um arquivo.');
  const sizeErr = Helpers.checkFileSize(file);
  if (sizeErr) return alert(sizeErr.message);

  const reader = new FileReader();
  reader.onload = async function() {
    try {
      await API.Database.createPayslip(recipient, ref, file.name, reader.result);
      State.Store.payslipsData = (await API.Database.getPayslips()).map(Helpers.normalizePayslip);
      Admin.renderAdminPayslips(); alert('Holerite enviado com sucesso!');
      document.getElementById('payslip-form').reset();
      Admin.renderAdminMetrics();
    } catch (err) {
      alert(err.message);
    }
  };
  reader.readAsDataURL(file);
}

function handleBulkFilesSelected(input) {
  State.Store.selectedBulkFiles = Array.from(input.files);
  const preview = document.getElementById('payslip-bulk-preview');
  const btn = document.getElementById('payslip-bulk-submit');
  if(!preview) return;

  if(State.Store.selectedBulkFiles.length === 0) {
    preview.innerHTML = '';
    btn.disabled = true;
    return;
  }

  const emails = Object.keys(State.Store.VALID_USERS);
  const oversized = State.Store.selectedBulkFiles.filter(f => Helpers.checkFileSize(f));

  preview.innerHTML = State.Store.selectedBulkFiles.map(file => {
     const matchedEmail = Helpers.matchEmailForFile(file.name, emails);
     const tooBig = Helpers.checkFileSize(file);
     const status = tooBig
        ? `<small style="color:#c0392b">Arquivo muito grande (será ignorado)</small>`
        : matchedEmail
          ? `<small style="color:var(--corPrincipal)">Destinatário: ${Helpers.escapeHtml(matchedEmail)}</small>`
          : `<small style="color:#c0392b">Não identificado (será ignorado)</small>`;
     return `<div class="admin-item"><div><strong>Arquivo:</strong> ${Helpers.escapeHtml(file.name)}<br>${status}</div></div>`;
  }).join('');

  btn.disabled = oversized.length === State.Store.selectedBulkFiles.length;
}

async function submitBulkPayslips(e) {
  e.preventDefault();
  const ref = document.getElementById('payslip-bulk-ref').value;
  const emails = Object.keys(State.Store.VALID_USERS);

  try {
    for (const file of State.Store.selectedBulkFiles) {
      if (Helpers.checkFileSize(file)) continue;
      const matchedEmail = Helpers.matchEmailForFile(file.name, emails);
      if (matchedEmail) {
        const dataUrl = await Helpers.readFileAsDataURL(file);
        await API.Database.createPayslip(matchedEmail, ref, file.name, dataUrl);
      }
    }
    State.Store.payslipsData = (await API.Database.getPayslips()).map(Helpers.normalizePayslip);
    Admin.renderAdminPayslips(); Admin.renderAdminMetrics();
    alert('Envio em massa processado com sucesso!');
    document.getElementById('payslip-bulk-form').reset();
    document.getElementById('payslip-bulk-preview').innerHTML = '';
    document.getElementById('payslip-bulk-submit').disabled = true;
  } catch (err) {
    alert(err.message);
  }
}

function handleNotificationClick() {
  localStorage.removeItem('alltak_new_notification'); UI.checkNotificationState(); UI.go('mural');
}

function bindPartialDependentListeners() {
  document.querySelectorAll('#stars-container svg').forEach(star => {
      star.addEventListener('click', function() {
          State.Store.selectedRating = parseInt(this.getAttribute('data-star'));
          document.querySelectorAll('#stars-container svg').forEach(s => {
              if(parseInt(s.getAttribute('data-star')) <= State.Store.selectedRating) { s.classList.add('filled'); } 
              else { s.classList.remove('filled'); }
          });
      });
  });

  document.getElementById('search-input')?.addEventListener('input', function() {
      const currentActiveChip = document.querySelector('#mural-filters .chip.on');
      const activeTag = currentActiveChip ? currentActiveChip.getAttribute('data-filter') : 'Todos';
      UI.renderMural(activeTag, this.value);
  });

  document.querySelectorAll('#mural-filters .chip').forEach(chip => {
      chip.addEventListener('click', function() {
          document.querySelectorAll('#mural-filters .chip').forEach(c => c.classList.remove('on'));
          this.classList.add('on');
          const searchVal = document.getElementById('search-input')?.value || '';
          UI.renderMural(this.getAttribute('data-filter'), searchVal);
      });
  });
}

window.addEventListener('DOMContentLoaded', async () => {
    await partialsReady;
    bindPartialDependentListeners();

    try {
      await State.initDatabase();
    } catch (err) {
      console.error("Falha ao inicializar o banco, mantendo dados padrão:", err);
    }

    const isLogged = localStorage.getItem('alltak_logged') === "true";
    const userEmail = localStorage.getItem('alltak_user_email');
    const userRole = localStorage.getItem('alltak_role');
    
    if (isLogged && userEmail && State.Store.VALID_USERS[userEmail]) {
        await State.loadSharedData(userEmail, userRole);
        const avatarEl = document.getElementById('user-avatar');
        if (avatarEl) avatarEl.innerText = State.Store.VALID_USERS[userEmail].initial;
        Auth.applyRoleUI(userRole);
        UI.renderDirectfeedbackForUser(userEmail); 
        UI.renderUserPayslips(userEmail);
        
        document.querySelectorAll('.app-protected').forEach(el => el.style.display = 'flex');
        document.getElementById('app-main-content').style.display = 'block';
        document.getElementById('acesso').classList.remove('active');
        UI.go('home');
        State.startAutoRefresh();
    }

    UI.renderFeaturedAnnouncement(); 
    UI.renderHomeFeed(); 
    UI.renderMural(); 
    UI.buildCalendar(); 
    UI.checkNotificationState();
});

window.handleLogin = Auth.handleLogin;
window.handleLogout = Auth.handleLogout;
window.submitDirectfeedback = submitDirectfeedback;
window.submitfeedback = submitfeedback;
window.submitPostForm = submitPostForm;
window.submitEventForm = submitEventForm;
window.submitUserForm = submitUserForm;
window.submitPayslipForm = submitPayslipForm;
window.handleBulkFilesSelected = handleBulkFilesSelected;
window.submitBulkPayslips = submitBulkPayslips;
window.handleNotificationClick = handleNotificationClick;
window.go = UI.go;
window.showAdminTab = Admin.showAdminTab;
window.changeMonth = UI.changeMonth;
window.showDayEvents = UI.showDayEvents;
window.downloadPayslip = UI.downloadPayslip;
window.openFeaturedPost = UI.openFeaturedPost;
window.toggleNotificationPanel = UI.toggleNotificationPanel;
window.clearAllNotifications = UI.clearAllNotifications;
window.showFilePreview = Helpers.showFilePreview;
window.downloadAttachment = Helpers.downloadAttachment;
window.deletefeedback = Admin.deletefeedback;
window.deleteDirectfeedback = Admin.deleteDirectfeedback;
window.deletePost = Admin.deletePost;
window.deleteEvent = Admin.deleteEvent;
window.deleteUserSystem = Admin.deleteUserSystem;
window.deletePayslip = Admin.deletePayslip;