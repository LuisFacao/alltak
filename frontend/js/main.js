import { Database } from "./banco.js";
import { Formata, Normalizers } from "./util.js";
import { Auth, App } from "./secoes.js";
import { Admin } from "./secoes/admin.js";
import { Calendario } from "./secoes/calendario.js";
import { Feedback } from "./secoes/feedback.js";
import { Holerite } from "./secoes/holerites.js";
import { Home } from "./secoes/home.js";
import { Post } from "./secoes/post.js";
import { Notificacao } from "./secoes/notificacao.js";

export const AUTO_REFRESH_MS = 6000;
const agora = new Date();

export const Memoria = {
  VALID_USERS: {},
  directfeedbackData: [],
  holeriteData: [],
  postsData: [],
  eventsData: {},
  feedbackData: [],
  currentYear: agora.getFullYear(),
  currentMonth: agora.getMonth(),
  monthNames: ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"],
  selectedRating: 4,          // Avaliação padrão em estrelas (1 a 5)
  selectedBulkFiles: [],
  autoRefreshTimer: null
};

export const Estado = {
  async initDatabase() {
    Memoria.VALID_USERS = await Database.getUsers();
  },

  async loadSharedData(currentUserEmail, currentUserRole) {
    try {
      const [posts, events, feedback, directfeedback, payslips] = await Promise.all([
        Database.getPosts(), 
        Database.getEvents(), 
        Database.getfeedback(),
        currentUserRole === 'admin' ? Database.getDirectfeedback() : (currentUserEmail ? Database.getDirectfeedback(currentUserEmail) : Promise.resolve([])),
        currentUserRole === 'admin' ? Database.getHolerite() : (currentUserEmail ? Database.getHolerite(currentUserEmail) : Promise.resolve([]))
      ]);
      Memoria.postsData = (posts || []).map(Normalizers.post);
      Memoria.eventsData = Calendario.criarEventos(events);
      Memoria.feedbackData = (feedback || []).map(Normalizers.feedback);
      Memoria.directfeedbackData = (directfeedback || []).map(Normalizers.directFeedback);
      Memoria.holeriteData = (payslips || []).map(Normalizers.holerite);
    } catch (err) {
      console.error('Erro ao carregar dados compartilhados:', err);
    }
  },

  refreshAllViews() {
    const role = localStorage.getItem('alltak_role');
    const email = localStorage.getItem('alltak_user_email');
    Home.renderFeaturedAnnouncement(); 
    Home.renderFeed(); 
    Post.render(); 
    Calendario.build();
    if (email) { 
      Feedback.render(email); 
      Holerite.renderUser(email); 
    }
    if (role === 'admin') {
      Admin.postsRender(); 
      Admin.eventsRender(); 
      Feedback.renderAdm();
      Feedback.renderAdmDireto(); 
      Admin.metricsRender(); 
      Admin.holeriteRender();
    }
  },

  async autoRefreshData() {
    const role = localStorage.getItem('alltak_role');
    const email = localStorage.getItem('alltak_user_email');
    if (!email || localStorage.getItem('alltak_logged') !== 'true') return;
    
    const prevPostIds = new Set(Memoria.postsData.map(p => p.id));
    const prevHoleriteIds = new Set(Memoria.holeriteData.map(p => p.id));
    const prevDirectIds = new Set(Memoria.directfeedbackData.map(d => d.id));
    
    try { await Estado.loadSharedData(email, role); } catch (err) { return; }

    const hasNewPost = Memoria.postsData.some(p => !prevPostIds.has(p.id));
    const hasNewHolerite = role !== 'admin' && Memoria.holeriteData.some(p => p.recipient === email && !prevHoleriteIds.has(p.id));
    const hasNewDirect = role !== 'admin' && Memoria.directfeedbackData.some(d => d.recipient === email && !prevDirectIds.has(d.id));
    
    if (hasNewPost || hasNewHolerite || hasNewDirect) {
      localStorage.setItem('alltak_new_notification', 'true');
      Notificacao.checkState();
    }
    Estado.refreshAllViews();
  },

  handleVisibilityRefresh() {
    if (document.visibilityState === 'visible' && localStorage.getItem('alltak_logged') === 'true') { Estado.autoRefreshData(); }
  },

  startAutoRefresh() {
    Estado.stopAutoRefresh();
    Memoria.autoRefreshTimer = setInterval(Estado.autoRefreshData, AUTO_REFRESH_MS);
    document.addEventListener('visibilitychange', Estado.handleVisibilityRefresh);
    window.addEventListener('focus', Estado.handleVisibilityRefresh);
  },

  stopAutoRefresh() {
    if (Memoria.autoRefreshTimer) { clearInterval(Memoria.autoRefreshTimer); Memoria.autoRefreshTimer = null; }
    document.removeEventListener('visibilitychange', Estado.handleVisibilityRefresh);
    window.removeEventListener('focus', Estado.handleVisibilityRefresh);
  }
};

function bindPartialDependentListeners() {
  document.querySelectorAll('#stars-container svg').forEach(star => {
    star.addEventListener('click', function() {
      Memoria.selectedRating = parseInt(this.getAttribute('data-star'));
      document.querySelectorAll('#stars-container svg').forEach(s => {
        if(parseInt(s.getAttribute('data-star')) <= Memoria.selectedRating) { s.classList.add('filled'); } 
        else { s.classList.remove('filled'); }
      });
    });
  });

  document.getElementById('search-input')?.addEventListener('input', function() {
    const currentActiveChip = document.querySelector('#mural-filters .chip.on');
    const activeTag = currentActiveChip ? currentActiveChip.getAttribute('data-filter') : 'Todos';
    Post.render(activeTag, this.value);
  });

  document.querySelectorAll('#mural-filters .chip').forEach(chip => {
    chip.addEventListener('click', function() {
      document.querySelectorAll('#mural-filters .chip').forEach(c => c.classList.remove('on'));
      this.classList.add('on');
      const searchVal = document.getElementById('search-input')?.value || '';
      Post.render(this.getAttribute('data-filter'), searchVal);
    });
  });
}

document.addEventListener('click', (e) => {
  const panel = document.getElementById('notif-panel');
  const wrap = document.querySelector('.notif-wrap');
  if (panel && panel.style.display === 'block' && wrap && !wrap.contains(e.target)) {
    panel.style.display = 'none';
  }
});

window.addEventListener('DOMContentLoaded', async () => {
  await partialsReady;
  bindPartialDependentListeners();

  try {
    await Estado.initDatabase();
  } catch (err) {
    console.error("Falha ao inicializar o banco, mantendo dados padrão:", err);
  }

  const isLogged = localStorage.getItem('alltak_logged') === "true";
  const userEmail = localStorage.getItem('alltak_user_email');
  const userRole = localStorage.getItem('alltak_role');

  if (isLogged && userEmail && Memoria.VALID_USERS[userEmail]) {
    await Estado.loadSharedData(userEmail, userRole);
    const avatarEl = document.getElementById('user-avatar');
    if (avatarEl) avatarEl.innerText = Memoria.VALID_USERS[userEmail].initial;
    Auth.adminVisualLogin(userRole);
    Feedback.render(userEmail); 
    Holerite.renderUser(userEmail);
    
    document.querySelectorAll('.app-protected').forEach(el => el.style.display = 'flex');
    document.getElementById('app-main-content').style.display = 'block';
    document.getElementById('acesso').classList.remove('active');
    App.go('home');
    Estado.startAutoRefresh();
  }

  Home.renderFeaturedAnnouncement();
  Home.renderFeed(); 
  Post.render(); 
  Calendario.build(); 
  Notificacao.checkState();
});

window.handleLogin = Auth.login;
window.handleLogout = Auth.logout;
window.submitDirectfeedback = Feedback.directSubmit;
window.submitfeedback = Feedback.submit;
window.submitPostForm = Post.submitPostForm;
window.submitEventForm = Calendario.submitForm;
window.submitUserForm = Admin.userSubmitForm;
window.submitPayslipForm = Holerite.submitForm;
window.handleBulkFilesSelected = Holerite.handleBulkFilesSelected;
window.submitBulkPayslips = Holerite.submitBulk;
window.handleNotificationClick = Notificacao.handleClick;
window.go = App.go;
window.showAdminTab = Admin.showTab;
window.changeMonth = Calendario.changeMonth;
window.showDayEvents = Calendario.showDayEvent;
window.downloadPayslip = Holerite.download;
window.openFeaturedPost = Home.openFeaturedPost;
window.toggleNotificationPanel = Notificacao.togglePanel;
window.clearAllNotifications = Notificacao.clearAll;
window.showFilePreview = Formata.showFilePreview;
window.downloadAttachment = Formata.downloadAttachment;
window.deletefeedback = Feedback.delete;
window.deleteDirectfeedback = Feedback.directDelete;
window.deletePost = Post.deletePost;
window.deleteEvent = Calendario.eventDelete;
window.deleteUserSystem = Admin.userDelete;
window.deletePayslip = Holerite.delete;