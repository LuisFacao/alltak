import { indexarHTML } from './js/indexador.js'
  indexarHTML("acesso");
  indexarHTML("admin");
  indexarHTML("calendario");
  indexarHTML("feedback");
  indexarHTML("holerites");
  indexarHTML("home");
  indexarHTML("institucional");
  indexarHTML("mural");

const API_URL = "https://alltak.onrender.com";

// Função para fazer Login
async function login(email, password) {
  try {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Erro ao realizar login");
    }

    console.log("Login realizado com sucesso:", data);
    return data;
  } catch (error) {
    console.error("Erro no login:", error.message);
    alert(error.message);
  }
}

// Função para listar usuários
async function getUsers() {
  try {
    const response = await fetch(`${API_URL}/api/users`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error("Erro ao buscar usuários");
    }

    console.log("Lista de usuários:", data);
    return data;
  } catch (error) {
    console.error("Erro ao buscar usuários:", error.message);
  }
}

// Função para criar usuário
async function createUser(userData) {
  try {
    const response = await fetch(`${API_URL}/api/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Erro ao criar usuário");
    }

    console.log("Usuário criado:", data);
    return data;
  } catch (error) {
    console.error("Erro ao criar usuário:", error.message);
    alert(error.message);
  }
}
