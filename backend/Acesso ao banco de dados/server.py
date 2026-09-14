from fastapi import FastAPI, File, UploadFile

app = FastAPI()

@app.post("/")
async def Bancoupload_endpoint(file: UploadFile = File(...)):
    # Lê o conteúdo do arquivo recebido
    contents = await file.read()
    print(f"Arquivo recebido: {file.filename} ({len(contents)} bytes)")
    
    # Você pode salvar o arquivo localmente se quiser testar:
    with open(f"received_{file.filename}", "wb") as f:
        f.write(contents)
        
    return {"message": "Upload successful!", "filename": file.filename}

if __name__ == "__main__":
    import uvicorn
    # Roda o servidor na porta 8000
    uvicorn.run(app, host="127.0.0.1", port=8000)