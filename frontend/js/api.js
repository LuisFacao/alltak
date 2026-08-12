export const API_URL = 'https://alltak.onrender.com/api';

async function request(path, options = {}, errorMessage = 'Erro na requisição', { extractDetail = false, parseJson = true } = {}) {
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
}

function jsonOptions(method, body) {
    return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

export const Database = {
    async login(email, password) {
        return request('/auth/login', jsonOptions('POST', { email, password }), 'Credenciais inválidas');
    },
    async getUsersRaw() {
        return request('/users', {}, 'Erro ao buscar usuários').catch(() => []);
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
        return request('/users', jsonOptions('POST', { email, password: data.password, role: data.role }), 'Erro ao cadastrar usuário', { extractDetail: true, parseJson: false });
    },
    async deleteUser(userId) {
        return request(`/users/${userId}`, { method: 'DELETE' }, 'Erro ao remover usuário', { parseJson: false });
    },
    async getPosts() {
        return request('/posts', {}, 'Erro ao buscar comunicados').catch(() => []);
    },
    async createPost(title, content, author, tag, urgent) {
        return request('/posts', jsonOptions('POST', { title, content, author, tag, urgent }), 'Erro ao salvar comunicado');
    },
    async deletePost(id) {
        return request(`/posts/${id}`, { method: 'DELETE' }, 'Erro ao excluir comunicado', { parseJson: false });
    },
    async getEvents() {
        return request('/events', {}, 'Erro ao buscar agenda').catch(() => []);
    },
    async createEvent(date, title, color) {
        return request('/events', jsonOptions('POST', { date, title, color }), 'Erro ao salvar evento');
    },
    async deleteEvent(id) {
        return request(`/events/${id}`, { method: 'DELETE' }, 'Erro ao excluir evento', { parseJson: false });
    },
    async getfeedback() {
        return request('/feedback', {}, 'Erro ao buscar feedback').catch(() => []);
    },
    async createfeedback(userEmail, category, message, rating, attachments) {
        return request('/feedback', jsonOptions('POST', { user_email: userEmail, category, message, rating, attachments: attachments || [] }), 'Erro ao enviar feedback');
    },
    async deletefeedbackApi(id) {
        return request(`/feedback/${id}`, { method: 'DELETE' }, 'Erro ao excluir feedback', { parseJson: false });
    },
    async getDirectfeedback(recipient) {
        const path = recipient ? `/direct-feedbacks?recipient=${encodeURIComponent(recipient)}` : '/direct-feedbacks';
        return request(path, {}, 'Erro ao buscar feedback direcionados').catch(() => []);
    },
    async createDirectfeedback(recipient, message, attachments) {
        return request('/direct-feedbacks', jsonOptions('POST', { recipient, message, attachments: attachments || [] }), 'Erro ao enviar feedback direcionado');
    },
    async deleteDirectfeedbackApi(id) {
        return request(`/direct-feedbacks/${id}`, { method: 'DELETE' }, 'Erro ao excluir feedback direto', { parseJson: false });
    },
    async getPayslips(recipient) {
        const path = recipient ? `/payslips?recipient=${encodeURIComponent(recipient)}` : '/payslips';
        return request(path, {}, 'Erro ao buscar holerites').catch(() => []);
    },
    async createPayslip(recipient, ref, fileName, fileData) {
        return request('/payslips', jsonOptions('POST', { recipient, ref, file_name: fileName, file_data: fileData }), 'Erro ao enviar holerite');
    },
    async deletePayslipApi(id) {
        return request(`/payslips/${id}`, { method: 'DELETE' }, 'Erro ao excluir holerite', { parseJson: false });
    }
};