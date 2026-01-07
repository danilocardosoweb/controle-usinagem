from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import auth, pedidos, sync, files, print

app = FastAPI(title="API de Controle de Usinagem")

# Configuração de CORS para permitir requisições do frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["Autenticação"])
app.include_router(pedidos.router, prefix="/api", tags=["Pedidos"])
app.include_router(sync.router, prefix="/api", tags=["Sincronização"]) 
app.include_router(files.router, prefix="/api", tags=["Arquivos"]) 
app.include_router(print.router, prefix="/api", tags=["Impressão"]) 

@app.get("/")
def read_root():
    return {"message": "Bem-vindo à API de Controle de Usinagem"}
