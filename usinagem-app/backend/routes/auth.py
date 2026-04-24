from fastapi import APIRouter, HTTPException, Depends, status
from schemas.user import UserCreate, UserOut
from core.security import get_password_hash
import uuid

router = APIRouter()

# Esta é uma simulação. A lógica de banco de dados será adicionada depois.
fake_users_db = {}

@router.post("/register", response_model=dict, status_code=status.HTTP_201_CREATED)
def register_user(user: UserCreate):
    if user.email in fake_users_db:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email já registrado"
        )
    
    # Gerar um ID único para o usuário (simulação do UUID do Supabase)
    user_id = str(uuid.uuid4())
    
    # Hash da senha
    hashed_password = get_password_hash(user.password)
    
    # Criar o usuário no banco de dados fake
    user_data = user.model_dump(exclude={"password"})
    user_data["id"] = user_id
    user_data["senha_hash"] = hashed_password
    
    fake_users_db[user.email] = user_data
    
    return {
        "message": f"Usuário {user.nome} registrado com sucesso!",
        "user_id": user_id
    }

@router.post("/login")
def login(email: str, password: str):
    # Implementação básica para simular login
    if email not in fake_users_db:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos"
        )
    
    # Aqui seria verificada a senha com verify_password
    # Por enquanto, apenas simulamos o login bem-sucedido
    
    return {
        "message": "Login realizado com sucesso",
        "access_token": "token_simulado",
        "token_type": "bearer"
    }
