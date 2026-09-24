import { Memoria } from "../main.js";
import { App } from "../secoes.js";
import { Post } from "./post.js";

export const Home = {
  renderUser() {
    const container = document.getElementById('user-area');
    if(!container) return;

    const email = localStorage.getItem('alltak_user_email')
    if(Memoria.postsData.length === 0) {
      container.innerHTML = `
      ${email}
      <br>
      aaa
      `;
      return;
    }
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