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
      <div class="post-card" onclick="alert('Post: ${safeTitle}')">
        <div class="post-media" style="background:${p.bg}"><span class="post-tag">${Formata.escapeHtml(p.tag)}</span></div>
        <div class="post-body">
          <h3>${p.urgent ? '<span class="urgent-pill">Urgente</span> ' : ''}${safeTitle}</h3>
          <p>${Formata.escapeHtml(p.desc)}</p>
          <div class="post-foot"><span>Por ${Formata.escapeHtml(p.author)}</span><span>${p.date}</span></div>
        </div>
      </div>
    `;
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
    const title = document.getElementById('post-title').value.trim();
    const desc = document.getElementById('post-desc').value.trim();
    const tag = document.getElementById('post-tag').value;
    const author = document.getElementById('post-author').value.trim();
    const urgent = document.getElementById('post-urgent').checked;

    try {
      await Database.createPost(title, desc, author, tag, urgent);
      localStorage.setItem('alltak_new_notification', 'true');
      Notificacao.checkState();
      Memoria.postsData = (await Database.getPosts()).map(Normalizers.post);
      document.getElementById('post-form').reset();
      Home.renderFeaturedAnnouncement(); Home.renderFeed(); Post.render(); Admin.postsRender(); Admin.metricsRender();
    } catch (err) {
      alert(err.message);
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