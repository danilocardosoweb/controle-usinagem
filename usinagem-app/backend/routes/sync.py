from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid

# Comentado: SQLAlchemy não é usado neste projeto (usando Supabase)
# from sqlalchemy.orm import Session
# from core.sqlite_db import get_db
# from core.sqlite_models import Pedido, ApontamentoProducao

router = APIRouter(prefix="/sync", tags=["Sincronizacao"])

ISO_FMT = "%Y-%m-%dT%H:%M:%S%z"


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S%z")


# Rotas de sincronização (placeholder para compatibilidade)
@router.get("/status")
def get_sync_status():
    return {"status": "ok", "server_time": now_iso()}
