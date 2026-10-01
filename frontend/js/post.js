import { Memoria } from "../main.js";
import { Formata, Normalizers } from "../util.js";
import { Database } from "../banco.js";
import { Notificacao } from "./notificacao.js";
import { Home } from "./home.js";
import { Admin } from "./admin.js";

export const Post = {
  createPostCard(p) {
    const safeTitle = Formata.escapeHtml(p.title);
    return `
      <div class="post-card">
        <div class="post-media" style="background:${p.bg}"><span class="post-tag">${Formata.escapeHtml(p.tag)}</span></div>
        <div class="post-body">
          <h3>${p.urgent ? '<span class="urgent-pill">Urgente</span> ' : ''}${safeTitle}</h3>
          <p>${Formata.escapeHtml(p.desc)}</p>
          ${Formata.renderAttachments(p.attachments)}
          <div class="post-foot"><span>Por ${Formata.escapeHtml(p.author)}</span><span class="post-dia">${p.date}</span></div>
        </div>
      </div>
    `;
  },

  toggleForm() {
    const wrap = document.getElementById('mural-post-form-wrap');
    const btn = document.getElementById('mural-post-toggle-btn');
    if(!wrap) return;
    const isOpen = wrap.style.display !== 'none';
    wrap.style.display = isOpen ? 'none' : 'block';
    if(btn) btn.textContent = isOpen ? '+' : '–';
    if(!isOpen) {
      const titleInput = document.getElementById('post-title');
      if(titleInput) titleInput.focus();
    }
  },

  render(filter = 'Todos', search = '') {
    const container = document.getElementById('mural-grid');
    if(!container) return;

    const filtered = Memoria.postsData.filter(p => {
      const matchFilter = filter === 'Todos' || p.tag === filter;
      const matchSearch = p.title.toLowerCase().includes(search.toLowerCase());
      return matchFilter && matchSearch;
    });

    container.innerHTML = filtered.length === 0 ? '<div style="padding:32px; color:#788e9e;">Nenhum informativo.</div>' : filtered.map(p => Post.createPostCard(p)).join('');
  },

  async submitPostForm(e) {
    e.preventDefault();
    const form = e.target;
    // Lê os campos a partir do próprio form: mural.html e admin.html
    // usam os mesmos ids, e getElementById pegaria sempre o primeiro.
    const title = form.querySelector('#post-title').value.trim();
    const desc = form.querySelector('#post-desc').value.trim();
    const tag = form.querySelector('#post-tag').value;
    const author = form.querySelector('#post-author').value.trim();
    const urgent = form.querySelector('#post-urgent').checked;
    const fileInput = form.querySelector('input[type="file"]');
    const files = fileInput ? Array.from(fileInput.files) : [];
    const submitBtn = form.querySelector('button[type="submit"]');

    const sizeError = Formata.checkFileSize(files);
    if (sizeError) return alert(sizeError.message);

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Publicando...';
    }

    try {
      await Database.uploadPost(title, desc, author, tag, urgent, files);
      localStorage.setItem('alltak_new_notification', 'true');
      Notificacao.checkState();
      Memoria.postsData = (await Database.getPosts()).map(Normalizers.post);

      form.reset();
      const preview = form.querySelector('.attach-preview');
      if (preview) preview.innerHTML = '';

      const wrap = document.getElementById('mural-post-form-wrap');
      const toggleBtn = document.getElementById('mural-post-toggle-btn');
      if(wrap) wrap.style.display = 'none';
      if(toggleBtn) toggleBtn.textContent = '+';
      Home.renderUser(); Home.renderFeed(); Post.render(); Admin.postsRender(); Admin.metricsRender();
    } catch (err) {
      alert(err.message);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Publicar comunicado';
      }
    }
  },

  async deletePost(index) {
    if(confirm("Excluir este comunicado permanentemente?")) {
      const post = Memoria.postsData[index];
      try {
        await Database.deletePost(post.id);
        Memoria.postsData = (await Database.getPosts()).map(Normalizers.post);
        Admin.postsRender();
        Admin.metricsRender();
      } catch (err) {
        alert(err.message);
      }
    }
  }
};
