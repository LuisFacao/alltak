import { App } from "../secoes.js";

export const Notificacao = {
  checkState() {
    const hasNew = localStorage.getItem('alltak_new_notification') === 'true';
    const dot = document.getElementById('notification-dot');
    if(dot) dot.style.display = hasNew ? 'block' : 'none';
  },

  togglePanel(event) {
    if (event) event.stopPropagation();
    const panel = document.getElementById('notif-panel');
    if (!panel) return;
    panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
  },

  clearAll(event) {
    if (event) event.stopPropagation();
    localStorage.removeItem('alltak_new_notification');
    Notificacao.checkState();
    const list = document.getElementById('notif-list');
    if (list) list.innerHTML = '<div style="padding:12px; font-size:12px; color:#788e9e;">Nenhuma notificação.</div>';
  },

  handleClick() {
    localStorage.removeItem('alltak_new_notification'); Notificacao.checkState(); App.go('mural');
  }
};