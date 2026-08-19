import subprocess
import sys
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
REQUIREMENTS = os.path.join(BACKEND_DIR, "requirements.txt")

def install_requirements():
    print("Instalando requirements.txt...")
    try:
        subprocess.check_call(
            [
                sys.executable, 
                "-m", 
                "pip", 
                "install", 
                "-r", 
                REQUIREMENTS, 
                "-q", 
                "--disable-pip-version-check",
                "--no-warn-script-location"
            ]
        )
        print("Requerimentos instalados.\n")
    except subprocess.CalledProcessError as exc:
        print(f'    {sys.executable} -m pip install -r "{REQUIREMENTS}"')
        sys.exit(exc.returncode)

def main():
    if not os.path.isfile(REQUIREMENTS):
        print(f"Não encontrei {REQUIREMENTS}.")
        sys.exit(1)

    install_requirements()

    import uvicorn

    os.chdir(BACKEND_DIR)
    sys.path.insert(0, BACKEND_DIR)

    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", 8000))
    
    print(f"Servidor iniciado em http://{host}:{port}")

    uvicorn.run("main:app", host=host, port=port, reload=False)

if __name__ == "__main__":
    main()