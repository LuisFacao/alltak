import { API_URL } from "./main.js";

export const Database = {
  async _apiRequest(path, options = {}, errorMessage = 'Erro na requisição', { extractDetail = false, parseJson = true } = {}) {
    try {
      const res = await fetch(`${API_URL}${path}`, options);
      if (!res.ok) {
        if (extractDetail) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail || errorMessage);
        }
        throw new Error(errorMessage);
      }
      return parseJson ? await res.json() : true;
    } catch (error) {
      console.warn(`[API Helper] Falha ao conectar em ${path}:`, error.message);
      throw error;
    }
  },

  _apiJsonOptions(method, body) {
    return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
  },

  async login(email, password) {
    return this._apiRequest('/auth/login', this._apiJsonOptions('POST', { email, password }), 'Credenciais inválidas');
  },

  async getUsersRaw() {
    return this._apiRequest('/users', {}, 'Erro ao buscar usuários').catch(() => []);
  },
  async getUsers() {
    try {
      const list = await this.getUsersRaw();
      const map = {};
      if (Array.isArray(list)) {
        list.forEach(u => {
          map[u.email] = { id: u.id, role: u.role, initial: u.initial || u.email.slice(0, 2).toUpperCase() };
        });
      }
      return map;
    } catch {
      return {};
    }
  },
  async saveUser(email, data) {
    return this._apiRequest('/users', this._apiJsonOptions('POST', { email, password: data.password, role: data.role }), 'Erro ao cadastrar usuário', { extractDetail: true, parseJson: false });
  },
  async deleteUser(userId) {
    return this._apiRequest(`/users/${userId}`, { method: 'DELETE' }, 'Erro ao remover usuário', { parseJson: false });
  },

  async getPosts() {
    return this._apiRequest('/posts', {}, 'Erro ao buscar comunicados').catch(() => []);
  },
  async createPost(title, content, author, tag, urgent) {
    return this._apiRequest('/posts', this._apiJsonOptions('POST', { title, content, author, tag, urgent }), 'Erro ao salvar comunicado');
  },
  async deletePost(id) {
    return this._apiRequest(`/posts/${id}`, { method: 'DELETE' }, 'Erro ao excluir comunicado', { parseJson: false });
  },

  async getEvents() {
    return this._apiRequest('/events', {}, 'Erro ao buscar agenda').catch(() => []);
  },
  async createEvent(date, title, color) {
    return this._apiRequest('/events', this._apiJsonOptions('POST', { date, title, color }), 'Erro ao salvar evento');
  },
  async deleteEvent(id) {
    return this._apiRequest(`/events/${id}`, { method: 'DELETE' }, 'Erro ao excluir evento', { parseJson: false });
  },

  async getfeedback() {
    return this._apiRequest('/feedback', {}, 'Erro ao buscar feedback').catch(() => []);
  },
  async createfeedback(userEmail, category, message, rating, attachments) {
    return this._apiRequest('/feedback', this._apiJsonOptions('POST', { user_email: userEmail, category, message, rating, attachments: attachments || [] }), 'Erro ao enviar feedback');
  },
  async deletefeedbackApi(id) {
    return this._apiRequest(`/feedback/${id}`, { method: 'DELETE' }, 'Erro ao excluir feedback', { parseJson: false });
  },

  async getDirectfeedback(recipient) {
    const path = recipient ? `/direct-feedback?recipient=${encodeURIComponent(recipient)}` : '/direct-feedback';
    return this._apiRequest(path, {}, 'Erro ao buscar feedback direcionados').catch(() => []);
  },
  async createDirectfeedback(recipient, message, attachments) {
    return this._apiRequest('/direct-feedback', this._apiJsonOptions('POST', { recipient, message, attachments: attachments || [] }), 'Erro ao enviar feedback direcionado');
  },
  async deleteDirectfeedbackApi(id) {
    return this._apiRequest(`/direct-feedback/${id}`, { method: 'DELETE' }, 'Erro ao excluir feedback direto', { parseJson: false });
  },

  async getHolerite(recipient) {
    const path = recipient ? `/payslips?recipient=${encodeURIComponent(recipient)}` : '/payslips';
    return this._apiRequest(path, {}, 'Erro ao buscar holerites').catch(() => []);
  },
  async createHolerite(recipient, ref, fileName, fileData) {
    return this._apiRequest('/payslips', this._apiJsonOptions('POST', { recipient, ref, file_name: fileName, file_data: fileData }), 'Erro ao enviar holerite');
  },
  async deleteHoleriteApi(id) {
    return this._apiRequest(`/payslips/${id}`, { method: 'DELETE' }, 'Erro ao excluir holerite', { parseJson: false });
  }
};