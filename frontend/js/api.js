export const API_URL = 'https://alltak.onrender.com/api';

export const Database = {
    async login(email, password) {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        if (!res.ok) throw new Error('Credenciais inválidas');
        return await res.json();
    },
    async getUsersRaw() {
        const res = await fetch(`${API_URL}/users`);
        if (!res.ok) throw new Error('Erro ao buscar usuários');
        return await res.json();
    },
    async getUsers() {
        const list = await this.getUsersRaw();
        const map = {};
        list.forEach(u => {
            map[u.email] = { id: u.id, role: u.role, initial: u.initial || u.email.slice(0, 2).toUpperCase() };
        });
        return map;
    },
    async saveUser(email, data) {
        const res = await fetch(`${API_URL}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: data.password, role: data.role })
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || 'Erro ao cadastrar usuário');
        }
        return true;
    },
    async deleteUser(userId) {
        const res = await fetch(`${API_URL}/users/${userId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Erro ao remover usuário');
        return true;
    },
    async getPosts() {
        const res = await fetch(`${API_URL}/posts`);
        if (!res.ok) throw new Error('Erro ao buscar comunicados');
        return await res.json();
    },
    async createPost(title, content, author, tag, urgent) {
        const res = await fetch(`${API_URL}/posts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, content, author, tag, urgent })
        });
        if (!res.ok) throw new Error('Erro ao salvar comunicado');
        return await res.json();
    },
    async deletePost(id) {
        const res = await fetch(`${API_URL}/posts/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Erro ao excluir comunicado');
        return true;
    },
    async getEvents() {
        const res = await fetch(`${API_URL}/events`);
        if (!res.ok) throw new Error('Erro ao buscar agenda');
        return await res.json();
    },
    async createEvent(date, title, color) {
        const res = await fetch(`${API_URL}/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date, title, color })
        });
        if (!res.ok) throw new Error('Erro ao salvar evento');
        return await res.json();
    },
    async deleteEvent(id) {
        const res = await fetch(`${API_URL}/events/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Erro ao excluir evento');
        return true;
    },
    async getfeedback() {
        const res = await fetch(`${API_URL}/feedback`);
        if (!res.ok) throw new Error('Erro ao buscar feedback');
        return await res.json();
    },
    async createfeedback(userEmail, category, message, rating, attachments) {
        const res = await fetch(`${API_URL}/feedback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_email: userEmail, category, message, rating, attachments: attachments || [] })
        });
        if (!res.ok) throw new Error('Erro ao enviar feedback');
        return await res.json();
    },
    async deletefeedbackApi(id) {
        const res = await fetch(`${API_URL}/feedback/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Erro ao excluir feedback');
        return true;
    },
    async getDirectfeedback(recipient) {
        const url = recipient ? `${API_URL}/direct-feedbacks?recipient=${encodeURIComponent(recipient)}` : `${API_URL}/direct-feedbacks`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Erro ao buscar feedback direcionados');
        return await res.json();
    },
    async createDirectfeedback(recipient, message, attachments) {
        const res = await fetch(`${API_URL}/direct-feedbacks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipient, message, attachments: attachments || [] })
        });
        if (!res.ok) throw new Error('Erro ao enviar feedback direcionado');
        return await res.json();
    },
    async deleteDirectfeedbackApi(id) {
        const res = await fetch(`${API_URL}/direct-feedbacks/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Erro ao excluir feedback direto');
        return true;
    },
    async getPayslips(recipient) {
        const url = recipient ? `${API_URL}/payslips?recipient=${encodeURIComponent(recipient)}` : `${API_URL}/payslips`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Erro ao buscar holerites');
        return await res.json();
    },
    async createPayslip(recipient, ref, fileName, fileData) {
        const res = await fetch(`${API_URL}/payslips`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipient, ref, file_name: fileName, file_data: fileData })
        });
        if (!res.ok) throw new Error('Erro ao enviar holerite');
        return await res.json();
    },
    async deletePayslipApi(id) {
        const res = await fetch(`${API_URL}/payslips/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Erro ao excluir holerite');
        return true;
    }
};