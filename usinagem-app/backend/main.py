from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import auth, pedidos, sync, files

app = FastAPI(title="API de Controle de Usinagem")

# Configuração de CORS para permitir requisições do frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, especificar apenas as origens permitidas
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["Autenticação"])
app.include_router(pedidos.router, prefix="/api", tags=["Pedidos"])
app.include_router(sync.router, prefix="/api", tags=["Sincronização"]) 
app.include_router(files.router, prefix="/api", tags=["Arquivos"]) 

@app.get("/")
def read_root():
    return {"message": "Bem-vindo à API de Controle de Usinagem"}
