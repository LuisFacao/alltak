import * as API from './api.js';
import * as State from './state.js';
import * as UI from './ui.js';
import * as Admin from './admin.js';

export async function handleLogin() {
    const emailInp = document.getElementById('login-email').value.trim().toLowerCase();
    const passInp = document.getElementById('login-pass').value;
    const errorEl = document.getElementById('login-error-msg');
    try {
        const { token, user } = await API.Database.login(emailInp, passInp);
        await State.initDatabase();
        await State.loadSharedData(user.email, user.role);
        if (errorEl) errorEl.style.display = 'none';
        localStorage.setItem('alltak_token', token);
        localStorage.setItem('alltak_role', user.role);
        localStorage.setItem('alltak_user_email', user.email);
        localStorage.setItem('alltak_logged', "true");
        
        document.getElementById('user-avatar').innerText = (State.Store.VALID_USERS[user.email] && State.Store.VALID_USERS[user.email].initial) || user.email.slice(0, 2).toUpperCase();
        
        applyRoleUI(user.role);
        UI.renderDirectfeedbackForUser(user.email);
        UI.renderUserPayslips(user.email);
        
        document.querySelectorAll('.app-protected').forEach(el => el.style.display = 'flex');
        document.getElementById('app-main-content').style.display = 'block';
        document.getElementById('acesso').classList.remove('active');
        
        UI.renderFeaturedAnnouncement(); UI.renderHomeFeed(); UI.renderMural(); UI.buildCalendar();
        UI.go('home');
        State.startAutoRefresh();
    } catch (err) {
        if (errorEl) { errorEl.innerText = 'E-mail ou senha incorretos.'; errorEl.style.display = 'block'; }
    }
}

export function handleLogout() {
    if(confirm("Deseja sair da sua conta?")) {
        State.stopAutoRefresh();
        localStorage.removeItem('alltak_role'); localStorage.removeItem('alltak_user_email'); localStorage.removeItem('alltak_logged');
        document.querySelectorAll('.app-protected').forEach(el => el.style.display = 'none');
        document.getElementById('app-main-content').style.display = 'none';
        applyRoleUI(null);
        document.getElementById('login-email').value = ''; document.getElementById('login-pass').value = '';
        document.getElementById('direct-feedback-box').style.display = 'none'; document.getElementById('user-payslips-list').innerHTML = '';
        document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
        document.getElementById('acesso').classList.add('active');
        UI.go('acesso');
    }
}

export function applyRoleUI(role) {
    const isAdmin = role === 'admin';
    document.querySelectorAll('.admin-only-nav').forEach(el => el.style.display = isAdmin ? 'flex' : 'none');
    const pill = document.getElementById('role-pill');
    if(pill) pill.style.display = isAdmin ? 'inline-flex' : 'none';
    const avatar = document.getElementById('user-avatar');
    if(avatar) avatar.classList.toggle('is-admin', isAdmin);
    if(isAdmin) {
        Admin.renderAdminPosts(); Admin.renderAdminEvents(); Admin.renderAdminfeedback();
        Admin.renderAdminDirectfeedback(); Admin.renderAdminMetrics();
        Admin.populateRecipientDropdown(); Admin.populatePayslipRecipientDropdown(); Admin.renderAdminPayslips();
    }
}