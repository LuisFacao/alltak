import sqlite3

# 1. Conecta ao banco de dados (se o arquivo não existir, ele cria)
conexao = sqlite3.connect("meu_aplicativo.db")

# DICA DE OURO: Faz o banco retornar os dados como "dicionários" em vez de tuplas.
# Isso permite usar notificacao['texto'] em vez de notificacao[1]
conexao.row_factory = sqlite3.Row
cursor = conexao.cursor()

# ==========================================
# 2. A BUSCA NO BANCO (O SELECT)
# ==========================================
id_do_usuario_logado = 1

# Usamos o '?' no lugar do valor para proteger o banco contra ataques (SQL Injection)
query = """
    SELECT id, tipo, titulo, texto, link_destino, lida 
    FROM notificacoes 
    WHERE usuario_id = ? 
    ORDER BY id DESC
"""

# Executa a busca passando o ID do usuário
cursor.execute(query, (id_do_usuario_logado,))

# Pega todos os resultados que o banco encontrou
notificacoes_do_banco = cursor.fetchall()

# ==========================================
# 3. O SEU LOOP (De 5 em 5)
# ==========================================
html_completo = ""

for j in range(0, len(notificacoes_do_banco), 5):
    lote = notificacoes_do_banco[j : j+5]
    
    for notificacao in lote:
        # Agora podemos acessar pelo nome da coluna direto!
        html_renderizado = f"<div class='card'> {notificacao['texto']} </div>\n"
        html_completo += html_renderizado

print(html_completo)

# 4. Fecha a conexão com o banco
conexao.close()