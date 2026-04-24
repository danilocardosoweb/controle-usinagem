from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    nome: str
    email: EmailStr
    password: str
    nivel_acesso: str = 'operador'

class UserOut(BaseModel):
    id: str # No Supabase, o ID é uma string (UUID)
    nome: str
    email: EmailStr
    nivel_acesso: str

    class Config:
        orm_mode = True
