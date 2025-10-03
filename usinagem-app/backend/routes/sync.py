from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid

from sqlalchemy.orm import Session

from core.sqlite_db import get_db
from core.sqlite_models import Pedido, ApontamentoProducao

router = APIRouter(prefix="/sync", tags=["Sincronizacao"])

ISO_FMT = "%Y-%m-%dT%H:%M:%S%z"


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S%z")


def to_dict_pedido(p: Pedido) -> Dict[str, Any]:
    return {
        "id": p.id,
        "pedido_seq": p.pedido_seq,
        "pedido_cliente": p.pedido_cliente,
        "cliente": p.cliente,
        "dt_fatura": p.dt_fatura,
        "dt_implant_item": p.dt_implant_item,
        "prazo": p.prazo,
        "produto": p.produto,
        "descricao": p.descricao,
        "unidade": p.unidade,
        "qtd_pedido": p.qtd_pedido,
        "qt_saldo_op": p.qt_saldo_op,
        "em_wip": p.em_wip,
        "saldo_a_prod": p.saldo_a_prod,
        "estoque_aca": p.estoque_aca,
        "separado": p.separado,
        "faturado": p.faturado,
        "saldo_a_fat": p.saldo_a_fat,
        "item_perfil": p.item_perfil,
        "unidade_mp": p.unidade_mp,
        "estoque_mp": p.estoque_mp,
        "peso_barra": p.peso_barra,
        "cod_cliente": p.cod_cliente,
        "situacao_item_pedido": p.situacao_item_pedido,
        "efetivado": p.efetivado,
        "item_do_cliente": p.item_do_cliente,
        "representante": p.representante,
        "fam_comercial": p.fam_comercial,
        "nro_op": p.nro_op,
        "operacao_atual": p.operacao_atual,
        "qtd_operacao_finalizadas": p.qtd_operacao_finalizadas,
        "qtd_operacao_total": p.qtd_operacao_total,
        "data_ultimo_reporte": p.data_ultimo_reporte,
        "status": p.status,
        "prioridade": p.prioridade,
        "observacoes": p.observacoes,
        "dados_originais": p.dados_originais,
        "created_at": p.created_at,
        "updated_at": p.updated_at,
    }


def to_dict_apont(a: ApontamentoProducao) -> Dict[str, Any]:
    return {
        "id": a.id,
        "ordem_trabalho_id": a.ordem_trabalho_id,
        "pedido_seq": a.pedido_seq,
        "usuario_id": a.usuario_id,
        "maquina_id": a.maquina_id,
        "inicio": a.inicio,
        "fim": a.fim,
        "quantidade": a.quantidade,
        "rack_ou_pallet": a.rack_ou_pallet,
        "observacoes": a.observacoes,
        "created_at": a.created_at,
    }


@router.get("/pedidos/changes")
def get_pedidos_changes(
    since: Optional[str] = Query(None, description="ISO8601: ex.: 2025-09-19T00:00:00+0000"),
    db: Session = Depends(get_db),
):
    # Se since não informado, retorna tudo
    if since:
        q = db.query(Pedido).filter(
            (Pedido.updated_at != None) & (Pedido.updated_at >= since)
            | (Pedido.created_at != None) & (Pedido.created_at >= since)
        )
    else:
        q = db.query(Pedido)
    rows = q.all()
    return {"changes": [to_dict_pedido(p) for p in rows], "server_time": now_iso()}


@router.post("/pedidos/batch")
def post_pedidos_batch(payload: Dict[str, List[Dict[str, Any]]], db: Session = Depends(get_db)):
    upserts = payload.get("upserts", [])
    deletes = payload.get("deletes", [])

    # Upserts
    for item in upserts:
        pid = item.get("id") or str(uuid.uuid4())
        existing = db.query(Pedido).filter(Pedido.id == pid).one_or_none()
        ts = now_iso()
        if existing:
            for k, v in item.items():
                if hasattr(existing, k) and k not in ("id",):
                    setattr(existing, k, v)
            existing.updated_at = ts
        else:
            obj = Pedido(id=pid, created_at=ts, updated_at=ts, **{k: v for k, v in item.items() if k != "id"})
            db.add(obj)
    # Deletes
    if deletes:
        db.query(Pedido).filter(Pedido.id.in_(deletes)).delete(synchronize_session=False)

    db.commit()
    return {"status": "ok", "server_time": now_iso()}


@router.get("/apontamentos/changes")
def get_apontamentos_changes(
    since: Optional[str] = Query(None, description="ISO8601: ex.: 2025-09-19T00:00:00+0000"),
    db: Session = Depends(get_db),
):
    if since:
        q = db.query(ApontamentoProducao).filter(
            (ApontamentoProducao.created_at != None) & (ApontamentoProducao.created_at >= since)
        )
    else:
        q = db.query(ApontamentoProducao)
    rows = q.all()
    return {"changes": [to_dict_apont(a) for a in rows], "server_time": now_iso()}


@router.post("/apontamentos/batch")
def post_apontamentos_batch(payload: Dict[str, List[Dict[str, Any]]], db: Session = Depends(get_db)):
    upserts = payload.get("upserts", [])
    deletes = payload.get("deletes", [])

    for item in upserts:
        aid = item.get("id") or str(uuid.uuid4())
        existing = db.query(ApontamentoProducao).filter(ApontamentoProducao.id == aid).one_or_none()
        ts = now_iso()
        if existing:
            for k, v in item.items():
                if hasattr(existing, k) and k not in ("id",):
                    setattr(existing, k, v)
            # created_at permanece; poderíamos adicionar updated_at se necessário
        else:
            obj = ApontamentoProducao(id=aid, created_at=ts, **{k: v for k, v in item.items() if k != "id"})
            db.add(obj)

    if deletes:
        db.query(ApontamentoProducao).filter(ApontamentoProducao.id.in_(deletes)).delete(synchronize_session=False)

    db.commit()
    return {"status": "ok", "server_time": now_iso()}
