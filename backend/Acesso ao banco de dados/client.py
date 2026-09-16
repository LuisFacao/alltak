import requests
from fastapi import APIRouter, FastAPI

app = FastAPI()
nomedaclassedeuploadnopython = APIRouter()

@nomedaclassedeuploadnopython.get("/nomequetánodoc/", tags=["users"])
def BancoUploadarquivo(file_path: str):
    url = "Caminho relativo" 

    try:
        # Abre o arquivo local em modo binário
        with open(file_path, "rb") as f:
            files = {"file": f}
            response = requests.post(url, files=files)
            
            if response.status_code == 200:
                print("Resposta do servidor:", response.json())
            else:
                print(f"Erro no upload. Status: {response.status_code}")
                
    except Exception as error:
        print("Erro ao conectar:", error)

if __name__ == "__main__":
    # Crie um arquivo de teste na mesma pasta chamado 'teste.txt' antes de rodar
    BancoUploadarquivo("teste.txt")
