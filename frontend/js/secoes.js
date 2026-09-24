import { Admin } from "./secoes/admin.js";
import { Calendario } from "./secoes/calendario.js";
import { Feedback } from "./secoes/feedback.js";
import { Holerite } from "./secoes/holerites.js";
import { Home } from "./secoes/home.js";
import { Post } from "./secoes/post.js";
import { Memoria, Estado } from "./main.js";
import { Database } from "./banco.js";

export const Auth = {
  async login() {
    const emailInp = document.getElementById('login-email').value.trim().toLowerCase();
    const passInp = document.getElementById('login-pass').value;
    const errorEl = document.getElementById('login-error-msg');
    const btn = document.getElementById('login-btn');

    if (btn) { btn.disabled = true; btn.textContent = 'Entrando...'; }
    try {
      const { token, user } = await Database.login(emailInp, passInp);
      await Estado.initDatabase();
      await Estado.loadSharedData(user.email, user.role);
      if (errorEl) errorEl.style.display = 'none';

      localStorage.setItem('alltak_token', token);
      localStorage.setItem('alltak_role', user.role);
      localStorage.setItem('alltak_user_email', user.email);
      localStorage.setItem('alltak_logged', "true");

      const avatarEl = document.getElementById('user-avatar');
      if (avatarEl) avatarEl.innerText = (Memoria.VALID_USERS[user.email] && Memoria.VALID_USERS[user.email].initial) || user.email.slice(0, 2).toUpperCase();

      Auth.adminVisualLogin(user.role);
      Feedback.render(user.email);
      Holerite.renderUser(user.email);

      document.querySelectorAll('.app-protected').forEach(el => el.style.display = 'flex');
      document.getElementById('app-main-content').style.display = 'block';
      document.getElementById('acesso').classList.remove('active');

      Home.renderUser(); Home.renderFeed(); Post.render(); Calendario.build();
      App.go('home');
      Estado.startAutoRefresh();
    } catch (err) {
      if (errorEl) { errorEl.innerText = 'E-mail ou senha incorretos.'; errorEl.style.display = 'block'; }
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Entrar'; }
    }
  },

  logout() {
    if(confirm("Deseja sair da sua conta?")) {
      Estado.stopAutoRefresh();
      localStorage.removeItem('alltak_role'); localStorage.removeItem('alltak_user_email'); localStorage.removeItem('alltak_logged');
      document.querySelectorAll('.app-protected').forEach(el => el.style.display = 'none');
      document.getElementById('app-main-content').style.display = 'none';
      Auth.adminVisualLogin(null);
      document.getElementById('login-email').value = ''; document.getElementById('login-pass').value = '';
      document.getElementById('direct-feedback-box').style.display = 'none'; document.getElementById('user-payslips-list').innerHTML = '';
      document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
      document.getElementById('acesso').classList.add('active');
      App.go('acesso');
    }
  },

  adminVisualLogin(role) {
    const isAdmin = role === 'admin';
    document.querySelectorAll('.admin-only-nav').forEach(el => el.style.display = isAdmin ? 'flex' : 'none');
    const pill = document.getElementById('role-pill');
    if(pill) pill.style.display = isAdmin ? 'inline-flex' : 'none';
    const avatar = document.getElementById('user-avatar');
    if(avatar) avatar.classList.toggle('is-admin', isAdmin);
    if(isAdmin) {
      Admin.postsRender();
      Admin.eventsRender();
      Feedback.renderAdm();
      Feedback.renderAdmDireto();
      Admin.metricsRender();
      Admin.recipentePopularDropdown();
      Admin.holeriteDropdown();
      Admin.holeriteRender();
    }
  }
};

export const App = {
  loadPageContent(arquivo) {
    const caminho = `./frontend/html/${arquivo}.html`;

    return fetch(caminho)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Erro HTTP ${response.status} ao carregar ${caminho}`);
        }
        return response.text();
      })
      .then(data => {
        const el = document.getElementById(arquivo);
        if (el) el.innerHTML = data;
      });
  },

  go(id) {
    switch (true) {
      case !localStorage.getItem('alltak_logged') && id !== 'acesso':
        id = 'acesso';
        break;
      case id === 'admin' && localStorage.getItem('alltak_role') !== 'admin':
        id = 'home';
        break;
    }
    document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
    const targetScreen = document.getElementById(id);
    if(targetScreen) targetScreen.classList.add('active');

    document.querySelectorAll('.navitem').forEach(n=>n.classList.remove('active'));
    const targetNav = document.querySelector('.navitem[data-screen="'+id+'"]');
    if(targetNav) targetNav.classList.add('active');
  }
};

function loadPartialSafe(nome) {
  return App.loadPageContent(nome).catch(err => {
    console.error(`[Partials] Falha ao carregar "${nome}.html":`, err.message);
  });
}

export const partialsReady = Promise.all([
  loadPartialSafe("acesso"),
  loadPartialSafe("admin"),
  loadPartialSafe("app-bottomnav"),
  loadPartialSafe("app-header"),
  loadPartialSafe("calendario"),
  loadPartialSafe("feedback"),
  loadPartialSafe("holerites"),
  loadPartialSafe("home"),
  loadPartialSafe("institucional"),
  loadPartialSafe("mural"),
]);