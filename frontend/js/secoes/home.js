import { Memoria } from "../main.js";
import { Formata } from "../util.js";
import { App } from "../secoes.js";
import { Post } from "./post.js";

export const Home = {
  renderFeaturedAnnouncement() {
    const container = document.getElementById('featured-announcement');
    if(!container) return;

    if(Memoria.postsData.length === 0) {
      container.innerHTML = `
        <span class="eyebrow">Comunicado em destaque</span>
        <h1>Nenhum comunicado publicado ainda</h1>
        <p>Assim que um novo comunicado for criado, ele aparecerá aqui.</p>
      `;
      return;
    }

    const latestPost = Memoria.postsData[0];
    container.innerHTML = `
      <span class="eyebrow">Comunicado em destaque</span>
      <h1>${Formata.escapeHtml(latestPost.title)}</h1>
      <p>${Formata.escapeHtml(latestPost.desc)}</p>
      <div class="hero-meta">
        <div><span class="k">Publicado</span><span class="v">${latestPost.date}</span></div>
        <div><span class="k">Categoria</span><span class="v">${Formata.escapeHtml(latestPost.tag)}</span></div>
      </div>
      <div class="hero-actions">
        <button class="btn" onclick="openFeaturedPost('${latestPost.id}')">Ler comunicado</button>
      </div>
    `;
  },

  openFeaturedPost(id) {
    const post = Memoria.postsData.find(p => p.id == id);
    if(!post) return;
    App.go('mural');
    const searchInput = document.getElementById('search-input');
    if (searchInput) { searchInput.value = post.title; Post.render('Todos', post.title); }
  },

  renderFeed() {
    const container = document.getElementById('home-feed-grid');
    if(!container) return;
    container.innerHTML = Memoria.postsData.slice(0, 2).map(p => Post.createPostCard(p)).join('');
  }
};