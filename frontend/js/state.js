import * as API from './api.js';
import * as Helpers from './helpers.js';
import * as UI from './ui.js';
import * as Admin from './admin.js';

const _now = new Date();

export const Store = { /* objeto para armazenar o estado global da aplicação */
    VALID_USERS: {},
    directfeedbackData: [],
    payslipsData: [],
    postsData: [],
    eventsData: {},
    feedbackData: [],
    currentYear: _now.getFullYear(),
    currentMonth: _now.getMonth(),
    monthNames: ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"],
    selectedRating: 4,
    selectedBulkFiles: [],
    autoRefreshTimer: null
};

export async function initDatabase() { /* função para inicializar o banco de dados local com os usuários válidos */
    Store.VALID_USERS = await API.Database.getUsers();
}

export async function loadSharedData(currentUserEmail, currentUserRole) { /* função para carregar os dados compartilhados da API, incluindo comunicados, eventos, feedbacks e contracheques */  
  try {
    const [posts, events, feedback, directfeedback, payslips] = await Promise.all([
      API.Database.getPosts(), API.Database.getEvents(), API.Database.getfeedback(),
      currentUserRole === 'admin' ? API.Database.getDirectfeedback() : (currentUserEmail ? API.Database.getDirectfeedback(currentUserEmail) : Promise.resolve([])),
      currentUserRole === 'admin' ? API.Database.getPayslips() : (currentUserEmail ? API.Database.getPayslips(currentUserEmail) : Promise.resolve([]))
    ]);
    Store.postsData = (posts || []).map(Helpers.normalizePost);
    Store.eventsData = Helpers.rebuildEventsMap(events);
    Store.feedbackData = (feedback || []).map(Helpers.normalizefeedback);
    Store.directfeedbackData = (directfeedback || []).map(Helpers.normalizeDirectfeedback);
    Store.payslipsData = (payslips || []).map(Helpers.normalizePayslip);
  } catch (err) {
    console.error('Erro ao carregar dados compartilhados:', err);
  }
}

export const AUTO_REFRESH_MS = 6000;

export function refreshAllViews() {
  const role = localStorage.getItem('alltak_role');
  const email = localStorage.getItem('alltak_user_email');
  UI.renderFeaturedAnnouncement(); UI.renderHomeFeed(); UI.renderMural(); UI.buildCalendar();
  if (email) { UI.renderDirectfeedbackForUser(email); UI.renderUserPayslips(email); }
  if (role === 'admin') {
    Admin.renderAdminPosts(); Admin.renderAdminEvents(); Admin.renderAdminfeedback();
    Admin.renderAdminDirectfeedback(); Admin.renderAdminMetrics(); Admin.renderAdminPayslips();
  }
}

export async function autoRefreshData() { /* função para atualizar automaticamente os dados compartilhados e verificar se há novos comunicados, contracheques ou feedbacks diretos */
  const role = localStorage.getItem('alltak_role');
  if (!email || localStorage.getItem('alltak_logged') !== 'true') return;
  const prevPostIds = new Set(Store.postsData.map(p => p.id));
  const prevPayslipIds = new Set(Store.payslipsData.map(p => p.id));
  const prevDirectIds = new Set(Store.directfeedbackData.map(d => d.id));
  try { await loadSharedData(email, role); } catch (err) { return; }
  const hasNewPost = Store.postsData.some(p => !prevPostIds.has(p.id));
  const hasNewPayslip = role !== 'admin' && Store.payslipsData.some(p => p.recipient === email && !prevPayslipIds.has(p.id));
  const hasNewDirect = role !== 'admin' && Store.directfeedbackData.some(d => d.recipient === email && !prevDirectIds.has(d.id));
  if (hasNewPost || hasNewPayslip || hasNewDirect) {
    localStorage.setItem('alltak_new_notification', 'true');
    UI.checkNotificationState();
  }
  refreshAllViews();
}

export function handleVisibilityRefresh() { /* função para lidar com a visibilidade da aba e atualizar os dados quando a aba estiver visível */
  if (document.visibilityState === 'visible' && localStorage.getItem('alltak_logged') === 'true') { autoRefreshData(); }
}

export function startAutoRefresh() { /* função para iniciar o auto-refresh dos dados compartilhados */
  stopAutoRefresh();
  Store.autoRefreshTimer = setInterval(autoRefreshData, AUTO_REFRESH_MS);
  document.addEventListener('visibilitychange', handleVisibilityRefresh);
  window.addEventListener('focus', handleVisibilityRefresh);
}

export function stopAutoRefresh() { /* função para parar o auto-refresh dos dados compartilhados */
  if (Store.autoRefreshTimer) { clearInterval(Store.autoRefreshTimer); Store.autoRefreshTimer = null; }
  document.removeEventListener('visibilitychange', handleVisibilityRefresh);
  window.removeEventListener('focus', handleVisibilityRefresh);
}
