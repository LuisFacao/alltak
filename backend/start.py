#!/usr/bin/env python3
"""
Inicializador do projeto Alltak — 100% local.

Não precisa de Render, Supabase ou qualquer outro serviço externo:
- Banco de dados: SQLite (arquivo alltak.db, criado automaticamente nesta pasta)
- Backend: FastAPI/Uvicorn
- Frontend: servido pelo próprio backend, na mesma porta

Uso:
    python start.py

Depois abra no navegador:  http://127.0.0.1:8000
"""
import subprocess
import sys
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
REQUIREMENTS = os.path.join(BASE_DIR, "requirements.txt")


def install_requirements():
    print("Verificando/instalando dependências (requirements.txt)...")
    try:
        subprocess.check_call(
            [sys.executable, "-m", "pip", "install", "-r", REQUIREMENTS, "-q", "--disable-pip-version-check"]
        )
        print("Dependências prontas.\n")
    except subprocess.CalledProcessError as exc:
        print("\nNão consegui instalar as dependências automaticamente.")
        print("Tente rodar manualmente:")
        print(f"    {sys.executable} -m pip install -r requirements.txt")
        print(
            "\nSe o erro for de compilação (ex: 'Building wheel for pydantic-core' falhando,\n"
            "pedindo Rust/cargo), o motivo geralmente é usar uma versão do Python muito nova\n"
            "para a qual as bibliotecas ainda não publicaram um pacote pronto (wheel).\n"
            "Nesse caso, instale o Python 3.11 ou 3.12 (https://www.python.org/downloads/)\n"
            "e rode este script com ele, por exemplo:\n"
            "    py -3.12 start.py"
        )
        sys.exit(exc.returncode)


def main():
    install_requirements()

    # importado só depois de garantir que está instalado
    import uvicorn

    os.chdir(BASE_DIR)

    host = "127.0.0.1"
    port = 8000
    print("=" * 60)
    print(f"Servidor iniciando em http://{host}:{port}")
    print("Abra esse endereço no navegador para usar o sistema.")
    print("Pressione CTRL+C para parar.")
    print("=" * 60)

    uvicorn.run("main:app", host=host, port=port, reload=False)


if __name__ == "__main__":
    main()
