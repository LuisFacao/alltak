import * as State from './state.js';
import * as Helpers from './helpers.js';

export function indexHTML(arquivo) {
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
      })
}

export function renderDirectfeedbackForUser(email) {
  const box = document.getElementById('direct-feedback-box');
  const list = document.getElementById('direct-feedback-received-list');
  if(!box || !list) return;
  const userMessages = State.Store.directfeedbackData.filter(df => df.recipient === email);
  if(userMessages.length > 0 && localStorage.getItem('alltak_role') !== 'admin') {
    box.style.display = 'block';
    list.innerHTML = userMessages.map(m => `
      <div style="border-bottom: 1.5px dashed var(--line); padding: 10px 0; margin-bottom: 8px;">
         <p style="font-size:13px; font-weight:600; color:var(--ink); line-height:1.4;">"${Helpers.escapeHtml(m.message)}"</p>
         ${Helpers.renderAttachments(m.attachments)}
         <span style="font-family:'Space Mono'; font-size:9.5px; color:#788e9e; display:block; margin-top:4px;">Enviado pela Administração em ${m.date}</span>
      </div>
    `).join('');
  } else {
    box.style.display = 'none';
  }
}

export function go(id){
  if(!localStorage.getItem('alltak_logged') && id !== 'acesso') id = 'acesso';
  if(id === 'admin' && localStorage.getItem('alltak_role') !== 'admin') id = 'home';

  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  const targetScreen = document.getElementById(id);
  if(targetScreen) targetScreen.classList.add('active');

  document.querySelectorAll('.navitem').forEach(n=>n.classList.remove('active'));
  const targetNav = document.querySelector('.navitem[data-screen="'+id+'"]');
  if(targetNav) targetNav.classList.add('active');
}

export function renderFeaturedAnnouncement() {
  const container = document.getElementById('featured-announcement');
  if(!container || State.Store.postsData.length === 0) return;
  const latestPost = State.Store.postsData[0];
  container.innerHTML = `
    <span class="eyebrow">Comunicado em destaque</span>
    <h1>${Helpers.escapeHtml(latestPost.title)}</h1>
    <p>${Helpers.escapeHtml(latestPost.desc)}</p>
    <div class="hero-meta">
      <div><span class="k">Publicado</span><span class="v">${latestPost.date}</span></div>
      <div><span class="k">Categoria</span><span class="v">${Helpers.escapeHtml(latestPost.tag)}</span></div>
    </div>
    <div class="hero-actions">
      <button class="btn" onclick="openFeaturedPost('${latestPost.id}')">Ler comunicado</button>
    </div>
  `;
}

export function openFeaturedPost(id) {
  const post = State.Store.postsData.find(p => p.id == id);
  if(!post) return;
  go('mural');
  const searchInput = document.getElementById('search-input');
  if (searchInput) { searchInput.value = post.title; renderMural('Todos', post.title); }
}

export function renderHomeFeed() {
  const container = document.getElementById('home-feed-grid');
  if(!container) return;
  container.innerHTML = State.Store.postsData.slice(0, 2).map(p => createPostCard(p)).join('');
}

export function renderMural(filter = 'Todos', search = '') {
  const container = document.getElementById('mural-grid');
  if(!container) return;
  
  const filtered = State.Store.postsData.filter(p => {
    const matchFilter = filter === 'Todos' || p.tag === filter;
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  container.innerHTML = filtered.length === 0 ? '<div style="padding:32px; color:var(--corEscura);">Nenhum informativo.</div>' : filtered.map(p => createPostCard(p)).join('');
}

export function createPostCard(p) {
  const safeTitle = Helpers.escapeHtml(p.title);
  return `
    <div class="post-card card" onclick="alert('Post: ${safeTitle}')">
      <div class="post-media" style="background:${p.bg}"><span class="post-tag">${Helpers.escapeHtml(p.tag)}</span></div>
      <div class="post-body">
        <h3>${p.urgent ? '<span class="urgent-pill">Urgente</span> ' : ''}${safeTitle}</h3>
        <p>${Helpers.escapeHtml(p.desc)}</p>
        <div class="post-foot"><span>Por ${Helpers.escapeHtml(p.author)}</span><span>${p.date}</span></div>
      </div>
    </div>
  `;
}

export function buildCalendar() {
  const grid = document.getElementById('cal-grid');
  const monthYearLabel = document.getElementById('calendar-month-year');
  if(!grid) return;
  grid.innerHTML = '';
  monthYearLabel.innerText = `${State.Store.monthNames[State.Store.currentMonth]} ${State.Store.currentYear}`;

  const dows = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  dows.forEach(d => grid.innerHTML += `<div class="cal-dow">${d}</div>`);

  const firstDay = new Date(State.Store.currentYear, State.Store.currentMonth, 1).getDay();
  const totalDays = new Date(State.Store.currentYear, State.Store.currentMonth + 1, 0).getDate();

  for(let i = 0; i < firstDay; i++) grid.innerHTML += `<div class="cal-cell muted"></div>`;

  for(let day = 1; day <= totalDays; day++) {
    const dateStr = `${State.Store.currentYear}-${String(State.Store.currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    let evtsHtml = State.Store.eventsData[dateStr] ? '<div class="cal-evt-wrap">' + State.Store.eventsData[dateStr].map(e => `<div class="cal-evt" style="background:${e.color}"></div>`).join('') + '</div>' : '';

    grid.innerHTML += `<div class="cal-cell" onclick="showDayEvents('${dateStr}', ${day})">${day}${evtsHtml}</div>`;
  }
}

export function changeMonth(dir) {
  State.Store.currentMonth += dir;
  if(State.Store.currentMonth > 11) { State.Store.currentMonth = 0; State.Store.currentYear++; }
  if(State.Store.currentMonth < 0) { State.Store.currentMonth = 11; State.Store.currentYear--; }
  buildCalendar();
}

export function showDayEvents(dateStr, day) {
  const container = document.getElementById('cal-day-events');
  if(!container) return;
  container.innerHTML = `<h4 style="margin-bottom:8px;">Dia ${day}</h4>`;
  if(State.Store.eventsData[dateStr]) {
    State.Store.eventsData[dateStr].forEach(e => {
      container.innerHTML += `<div class="evt-row"><span class="evt-dot" style="background:${e.color}"></span><span>${Helpers.escapeHtml(e.title)}</span></div>`;
    });
  } else {
    container.innerHTML += '<p style="font-size:12px; color:#788e9e;">Nenhum evento.</p>';
  }
}

export function renderUserPayslips(email) {
  const container = document.getElementById('user-payslips-list');
  if(!container) return;
  const filtered = State.Store.payslipsData.filter(p => p.recipient === email);
  if(filtered.length === 0) {
      container.innerHTML = '<p style="font-size:12px; color:var(--corEscura); text-align:center; padding:20px;">Nenhum contracheque disponível para sua conta até o momento.</p>';
      return;
  }
  container.innerHTML = filtered.map(p => `
    <div class="doc-row" onclick="downloadPayslip('${p.id}')">
      <div class="doc-ic"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg></div>
      <div class="info"><h4>Holerite Competência: ${p.ref}</h4><span>Upload em ${p.uploadDate} · Clique para abrir</span></div>
      <div class="doc-dl">Baixar</div>
    </div>`).join('');
}

export function downloadPayslip(id) {
  const p = State.Store.payslipsData.find(p => p.id == id);
  if(!p) return;
  Helpers.downloadAttachment(p.fileData, p.fileName);
}

export function checkNotificationState() {
  const hasNew = localStorage.getItem('alltak_new_notification') === 'true';
  const dot = document.getElementById('notification-dot');
  if(dot) dot.style.display = hasNew ? 'block' : 'none';
}

export function toggleNotificationPanel(event) {
  if (event) event.stopPropagation();
  const panel = document.getElementById('notif-panel');
  if (!panel) return;
  panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
}

export function clearAllNotifications(event) {
  if (event) event.stopPropagation();
  localStorage.removeItem('alltak_new_notification');
  checkNotificationState();
  const list = document.getElementById('notif-list');
  if (list) list.innerHTML = '<div style="padding:12px; font-size:12px; color:var(--corEscura);">Nenhuma notificação.</div>';
}

document.addEventListener('click', (e) => {
  const panel = document.getElementById('notif-panel');
  const wrap = document.querySelector('.notif-wrap');
  if (panel && panel.style.display === 'block' && wrap && !wrap.contains(e.target)) {
    panel.style.display = 'none';
  }
});
