import uuid
from typing import Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr, Field

from core.config import settings
from core.database import get_supabase_client
from core.security import get_password_hash
from schemas.user import UserCreate

router = APIRouter()

# Esta é uma simulação. A lógica de banco de dados será adicionada depois.
fake_users_db = {}

ACCESS_ROLE_ALIASES = {
    "cliente": "cliente",
    "representante": "representante",
    "empresa": "empresa",
    "funcionario_cliente": "funcionario_cliente",
    "funcionario_empresa": "funcionario_empresa",
    "funcionario do cliente": "funcionario_cliente",
    "funcionario da empresa": "funcionario_empresa",
    "funcionario da empresa proprietaria do app": "funcionario_empresa",
    "funcionario da empresa proprietária do app": "funcionario_empresa",
    "pcp": "pcp",
    "logistica": "logistica",
    "comercial": "comercial",
    "qualidade": "qualidade",
    "admin": "admin",
    "administrador": "admin",
}


class PortalAccessCreate(BaseModel):
    nome: str
    email: EmailStr
    password: str = Field(min_length=8)
    tipo_acesso: str = "cliente"
    empresa_id: Optional[str] = None
    empresa_nome: Optional[str] = None
    empresa_cnpj: Optional[str] = None
    telefone: Optional[str] = None
    cargo: Optional[str] = None
    setor: Optional[str] = None
    status: str = "ativo"
    convite_status: str = "ativo"
    observacoes: Optional[str] = None


class PortalAccessUpdate(PortalAccessCreate):
    password: Optional[str] = None
    current_email: Optional[EmailStr] = None


def _normalize_access_role(role: Optional[str]) -> str:
    key = (role or "cliente").strip().lower()
    return ACCESS_ROLE_ALIASES.get(key, key or "cliente")


def _find_auth_user_by_email(client, email: str):
    try:
        users = client.auth.admin.list_users(page=1, per_page=1000)
        for user in users:
            if (user.email or "").strip().lower() == email.strip().lower():
                return user
    except Exception:
        return None
    return None


def _ensure_auth_user(client, payload: PortalAccessCreate, role: str):
    user_metadata = {
        "nome": payload.nome,
        "tipo_acesso": role,
        "empresa_id": payload.empresa_id,
        "empresa_nome": payload.empresa_nome,
        "empresa_cnpj": payload.empresa_cnpj,
        "telefone": payload.telefone,
        "cargo": payload.cargo,
        "setor": payload.setor,
    }
    app_metadata = {
        "portal_role": role,
        "portal_source": "cadastros_portal",
        "empresa_id": payload.empresa_id,
    }
    auth_attributes = {
        "email": payload.email,
        "password": payload.password,
        "user_metadata": user_metadata,
        "app_metadata": app_metadata,
        "email_confirm": True,
    }

    existing_user = _find_auth_user_by_email(client, payload.email)
    if existing_user:
        user_result = client.auth.admin.update_user_by_id(existing_user.id, auth_attributes)
        return user_result.user

    user_result = client.auth.admin.create_user(auth_attributes)
    return user_result.user


def _sync_portal_records(client, payload, role: str, email_normalizado: str):
    portal_cliente = {
        "nome": payload.nome,
        "email": email_normalizado,
        "cnpj": payload.empresa_cnpj or None,
        "telefone": payload.telefone or None,
        "tipo_acesso": role,
        "ativo": payload.status == "ativo",
    }

    portal_usuario = {
        "empresa_id": payload.empresa_id,
        "empresa_nome": payload.empresa_nome,
        "empresa_cnpj": payload.empresa_cnpj,
        "nome": payload.nome,
        "email": email_normalizado,
        "telefone": payload.telefone or None,
        "perfil": role,
        "setor": payload.setor or role,
        "cargo": payload.cargo or None,
        "status": payload.status,
        "convite_status": "ativo",
        "observacoes": payload.observacoes,
        "responsavel_email": "pcp@tecnoperfilalumino.com.br",
    }

    client.table("clientes_portal").upsert(portal_cliente, on_conflict="email").execute()
    client.table("portal_usuarios_empresa").upsert(portal_usuario, on_conflict="email").execute()


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


@router.post("/portal/register-access", status_code=status.HTTP_201_CREATED)
def register_portal_access(payload: PortalAccessCreate):
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase nao configurado para criar acessos autenticaveis.",
        )

    try:
        client = get_supabase_client()
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Nao foi possivel inicializar o cliente Supabase: {error}",
        ) from error

    role = _normalize_access_role(payload.tipo_acesso)

    try:
        auth_user = _ensure_auth_user(client, payload, role)

        email_normalizado = payload.email.strip().lower()
        _sync_portal_records(client, payload, role, email_normalizado)

        return {
            "message": "Acesso criado com sucesso.",
            "auth_user_id": auth_user.id,
            "email": email_normalizado,
            "tipo_acesso": role,
            "empresa_nome": payload.empresa_nome,
        }
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Nao foi possivel criar o acesso autenticavel: {error}",
        ) from error


@router.put("/portal/register-access", status_code=status.HTTP_200_OK)
def update_portal_access(payload: PortalAccessUpdate):
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase nao configurado para atualizar acessos autenticaveis.",
        )

    try:
        client = get_supabase_client()
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Nao foi possivel inicializar o cliente Supabase: {error}",
        ) from error

    role = _normalize_access_role(payload.tipo_acesso)
    email_normalizado = payload.email.strip().lower()
    lookup_email = (payload.current_email or payload.email or "").strip().lower()

    try:
        existing_user = _find_auth_user_by_email(client, lookup_email)
        if not existing_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario autenticavel nao encontrado.",
            )

        auth_attributes = {
            "email": email_normalizado,
            "user_metadata": {
                "nome": payload.nome,
                "tipo_acesso": role,
                "empresa_id": payload.empresa_id,
                "empresa_nome": payload.empresa_nome,
                "empresa_cnpj": payload.empresa_cnpj,
                "telefone": payload.telefone,
                "cargo": payload.cargo,
                "setor": payload.setor,
            },
            "app_metadata": {
                "portal_role": role,
                "portal_source": "cadastros_portal",
                "empresa_id": payload.empresa_id,
            },
            "email_confirm": True,
        }

        if payload.password:
            auth_attributes["password"] = payload.password

        client.auth.admin.update_user_by_id(existing_user.id, auth_attributes)
        _sync_portal_records(client, payload, role, email_normalizado)

        if lookup_email and lookup_email != email_normalizado:
            client.table("portal_usuarios_empresa").delete().eq("email", lookup_email).execute()
            client.table("clientes_portal").delete().eq("email", lookup_email).execute()

        return {
            "message": "Acesso atualizado com sucesso.",
            "auth_user_id": existing_user.id,
            "email": email_normalizado,
            "tipo_acesso": role,
            "empresa_nome": payload.empresa_nome,
        }
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Nao foi possivel atualizar o acesso autenticavel: {error}",
        ) from error


@router.delete("/portal/register-access", status_code=status.HTTP_200_OK)
def delete_portal_access(email: EmailStr):
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase nao configurado para remover acessos autenticaveis.",
        )

    try:
        client = get_supabase_client()
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Nao foi possivel inicializar o cliente Supabase: {error}",
        ) from error

    lookup_email = email.strip().lower()

    try:
        existing_user = _find_auth_user_by_email(client, lookup_email)
        if existing_user:
            client.auth.admin.delete_user(existing_user.id)

        client.table("portal_usuarios_empresa").delete().eq("email", lookup_email).execute()
        client.table("clientes_portal").delete().eq("email", lookup_email).execute()

        return {
            "message": "Acesso removido com sucesso.",
            "email": lookup_email,
        }
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Nao foi possivel remover o acesso autenticavel: {error}",
        ) from error
