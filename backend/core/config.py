from pydantic import BaseModel
from typing import Optional

class Settings(BaseModel):
    PROJECT_NAME: str = "API de Controle de Usinagem"
    PROJECT_VERSION: str = "0.1.0"
    
    # Configurações do Supabase (a serem preenchidas)
    SUPABASE_URL: Optional[str] = None
    SUPABASE_KEY: Optional[str] = None
    
    # Configurações de segurança
    SECRET_KEY: str = "chave_secreta_temporaria_para_desenvolvimento"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 horas

settings = Settings()
