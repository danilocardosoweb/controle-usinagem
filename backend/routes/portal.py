from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Any, Dict, List, Optional
from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session
from uuid import UUID
import re

from core.sqlite_db import get_db
from core.sqlite_models import Pedido as PedidoModel

router = APIRouter(prefix="/portal", tags=["Portal do Cliente"])

STATUS_MAP = {
    "pendente": "em_producao",
    "em_producao": "em_producao",
    "em_execucao": "em_producao",
    "concluido": "entregue",
    "concluida": "entregue",
    "finalizado": "entregue",
    "finalizada": "entregue",
}


def _slugify(value: Optional[str]) -> str:
    if not value:
        return "cliente-sem-nome"
    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-") or "cliente-sem-nome"


def _safe_str(value: Any) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return str(value)


def _safe_date(value: Any) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00")).date().isoformat()
        except ValueError:
            return value
    return None


def _safe_datetime(value: Any) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return datetime.combine(value, datetime.min.time()).isoformat()
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00")).isoformat()
        except ValueError:
            return value
    return None


def _get_attr(source: Any, key: str, default: Any = None) -> Any:
    if isinstance(source, dict):
        return source.get(key, default)
    return getattr(source, key, default)


def _status_portal(raw_status: Optional[str]) -> str:
    status = (raw_status or "").strip().lower()
    return STATUS_MAP.get(status, status or "em_producao")


def _progress_from_pedido(pedido: Any, status_portal: str) -> int:
    total_ops = _get_attr(pedido, "qtd_operacao_total")
    done_ops = _get_attr(pedido, "qtd_operacao_finalizadas")

    try:
        total_ops = int(total_ops) if total_ops not in (None, "") else None
    except (TypeError, ValueError):
        total_ops = None

    try:
        done_ops = int(done_ops) if done_ops not in (None, "") else None
    except (TypeError, ValueError):
        done_ops = None

    if total_ops and done_ops is not None and total_ops > 0:
        return max(0, min(100, round((done_ops / total_ops) * 100)))

    if status_portal == "entregue":
        return 100
    if status_portal == "expedido":
        return 90
    if status_portal == "em_producao":
        return 65
    return 0


def _parse_date_for_alert(value: Any) -> Optional[date]:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00")).date()
        except ValueError:
            for fmt in ("%Y-%m-%d", "%d/%m/%Y"):
                try:
                    return datetime.strptime(value, fmt).date()
                except ValueError:
                    continue
    return None


def _map_pedido_portal(pedido: Any) -> Dict[str, Any]:
    status_raw = _get_attr(pedido, "status", "em_producao")
    status_portal = _status_portal(status_raw)
    cliente_nome = _get_attr(pedido, "cliente", "Cliente")
    cliente_codigo = _safe_str(_get_attr(pedido, "cod_cliente"))
    cliente_key = cliente_codigo or f"cliente-{_slugify(cliente_nome)}"
    created_at = _get_attr(pedido, "created_at")
    data_pedido = _parse_date_for_alert(_get_attr(pedido, "dt_implant_item")) or _parse_date_for_alert(created_at) or date.today()
    previsao = _parse_date_for_alert(_get_attr(pedido, "dt_fatura"))
    prazo = _get_attr(pedido, "prazo")
    data_ultimo_reporte = _get_attr(pedido, "data_ultimo_reporte")
    operacao_atual = _get_attr(pedido, "operacao_atual")
    qtd_pedido = _get_attr(pedido, "qtd_pedido")

    try:
        qtd_pedido_num = float(qtd_pedido) if qtd_pedido not in (None, "") else 0
    except (TypeError, ValueError):
        qtd_pedido_num = 0

    progresso = _progress_from_pedido(pedido, status_portal)
    alerta_atraso = False
    if status_portal != "entregue":
        if previsao and previsao < date.today():
            alerta_atraso = True
        elif isinstance(prazo, int) and data_pedido:
            alerta_atraso = (date.today() - data_pedido).days > prazo

    pedido_seq = _get_attr(pedido, "pedido_seq") or _get_attr(pedido, "id")
    pedido_id = _safe_str(_get_attr(pedido, "id"))

    timeline = [
        {
            "id": f"{pedido_id}-received",
            "etapa": "received",
            "titulo": "Pedido recebido",
            "descricao": "Pedido carregado para acompanhamento operacional.",
            "data_hora": _safe_datetime(data_pedido),
            "concluido": True,
            "responsavel": "PCP",
        },
        {
            "id": f"{pedido_id}-production",
            "etapa": "production",
            "titulo": "Em produção",
            "descricao": operacao_atual or "Acompanhamento da produção em andamento.",
            "data_hora": _safe_datetime(data_ultimo_reporte or data_pedido),
            "concluido": status_portal in ("em_producao", "expedido", "entregue"),
            "responsavel": operacao_atual or "Produção",
        },
        {
            "id": f"{pedido_id}-inspection",
            "etapa": "inspection",
            "titulo": "Inspeção",
            "descricao": "Status de qualidade consolidado no portal.",
            "data_hora": _safe_datetime(data_ultimo_reporte or data_pedido),
            "concluido": status_portal in ("expedido", "entregue"),
            "responsavel": "Qualidade",
        },
        {
            "id": f"{pedido_id}-expedition",
            "etapa": "expedition",
            "titulo": "Expedição",
            "descricao": "Preparação para saída/embarque.",
            "data_hora": _safe_datetime(previsao or data_ultimo_reporte or data_pedido),
            "concluido": status_portal in ("expedido", "entregue"),
            "responsavel": "Expedição",
        },
        {
            "id": f"{pedido_id}-delivered",
            "etapa": "delivered",
            "titulo": "Entregue",
            "descricao": "Pedido concluído no acompanhamento.",
            "data_hora": _safe_datetime(_get_attr(pedido, "data_ultimo_reporte")) if status_portal == "entregue" else None,
            "concluido": status_portal == "entregue",
            "responsavel": "Transportadora",
        },
    ]

    return {
        "id": pedido_id,
        "cliente_id": cliente_key,
        "cliente_nome": cliente_nome,
        "cliente_email": None,
        "cliente_cnpj": _get_attr(pedido, "cod_cliente"),
        "numero_pedido": str(pedido_seq),
        "data_pedido": _safe_date(data_pedido),
        "status": status_portal,
        "progresso": progresso,
        "quantidade_itens": int(round(qtd_pedido_num)) if qtd_pedido_num else max(1, int(_get_attr(pedido, "qtd_operacao_total") or 1)),
        "previsao_entrega": _safe_date(previsao),
        "data_entrega": _safe_date(data_ultimo_reporte) if status_portal == "entregue" else None,
        "alerta_atraso": alerta_atraso,
        "observacoes": _get_attr(pedido, "observacoes"),
        "prioridade": _get_attr(pedido, "prioridade"),
        "operacao_atual": operacao_atual,
        "saldo_a_prod": _get_attr(pedido, "saldo_a_prod"),
        "qtd_pedido": qtd_pedido_num,
        "qtd_operacao_finalizadas": _get_attr(pedido, "qtd_operacao_finalizadas"),
        "qtd_operacao_total": _get_attr(pedido, "qtd_operacao_total"),
        "data_ultimo_reporte": _safe_datetime(data_ultimo_reporte),
        "itens": [
            {
                "id": f"{pedido_id}-item-1",
                "produto_codigo": _get_attr(pedido, "produto"),
                "produto_nome": _get_attr(pedido, "descricao"),
                "quantidade": qtd_pedido_num,
                "status": status_portal,
            }
        ],
        "timeline": timeline,
        "documentos": [],
        "fotos": [],
        "chat": [],
        "pallets": [
            {
                "id": f"pallet-{pedido_id}",
                "codigo_pallet": f"PLT-{pedido_seq}",
                "qr_code": f"portal://rastreio/{pedido_seq}",
                "nfc_uid": None,
                "status": status_portal,
                "local_atual": operacao_atual or "Produção",
                "volume": "1/1",
                "peso_kg": None,
                "ultima_leitura": _safe_datetime(data_ultimo_reporte or data_pedido),
                "historico": [
                    {
                        "data_hora": _safe_datetime(data_pedido),
                        "usuario": "Sistema",
                        "operacao": "Registro inicial",
                        "local": "PCP",
                        "status": status_portal,
                        "dispositivo": "ERP",
                    },
                    {
                        "data_hora": _safe_datetime(data_ultimo_reporte or data_pedido),
                        "usuario": operacao_atual or "Produção",
                        "operacao": "Atualização operacional",
                        "local": operacao_atual or "Chão de fábrica",
                        "status": status_portal,
                        "dispositivo": "Portal",
                    },
                ],
            }
        ],
    }


def _load_pedidos(db: Session) -> List[Any]:
    pedidos_sqlite = db.query(PedidoModel).all()
    if pedidos_sqlite:
        return pedidos_sqlite

    try:
        from routes import pedidos as pedidos_route

        if getattr(pedidos_route, "pedidos_db", None):
            return list(pedidos_route.pedidos_db)
    except Exception:
        pass

    return []


def _build_dashboard(pedidos: List[Any]) -> Dict[str, Any]:
    portal_pedidos = [_map_pedido_portal(pedido) for pedido in pedidos]

    em_producao = len([pedido for pedido in portal_pedidos if pedido["status"] == "em_producao"])
    expedidos = len([pedido for pedido in portal_pedidos if pedido["status"] == "expedido"])
    entregues = len([pedido for pedido in portal_pedidos if pedido["status"] == "entregue"])
    atencao = len([pedido for pedido in portal_pedidos if pedido["alerta_atraso"] or pedido["status"] == "atrasado"])
    total = len(portal_pedidos) or 1
    conclusao_media = round(sum(p["progresso"] for p in portal_pedidos) / total)

    clientes: Dict[str, Dict[str, Any]] = {}
    for pedido in portal_pedidos:
      cliente_id = pedido["cliente_id"]
      entry = clientes.setdefault(cliente_id, {
          "id": cliente_id,
          "nome": pedido["cliente_nome"],
          "email": pedido["cliente_email"],
          "cnpj": pedido["cliente_cnpj"],
          "tipo_acesso": "cliente",
          "pedidos": [],
      })
      entry["pedidos"].append(pedido)

    clientes_resumo = []
    for cliente in clientes.values():
        pedidos_cliente = cliente["pedidos"]
        pedidos_ativos = [p for p in pedidos_cliente if p["status"] != "entregue"]
        pedidos_atrasados = [p for p in pedidos_cliente if p["alerta_atraso"] or p["status"] == "atrasado"]
        progresso_medio = round(sum(p["progresso"] for p in pedidos_cliente) / len(pedidos_cliente)) if pedidos_cliente else 0
        ultimo_pedido = pedidos_cliente[0] if pedidos_cliente else None
        clientes_resumo.append({
            "id": cliente["id"],
            "nome": cliente["nome"],
            "email": cliente["email"],
            "cnpj": cliente["cnpj"],
            "tipo_acesso": cliente["tipo_acesso"],
            "totalPedidos": len(pedidos_cliente),
            "pedidosAtivos": len(pedidos_ativos),
            "pedidosAtrasados": len(pedidos_atrasados),
            "pedidosConcluidos": len([p for p in pedidos_cliente if p["status"] == "entregue"]),
            "progressoMedio": progresso_medio,
            "ultimoPedido": ultimo_pedido["numero_pedido"] if ultimo_pedido else None,
            "ultimoStatus": ultimo_pedido["status"] if ultimo_pedido else None,
            "ultimoPrazo": ultimo_pedido["previsao_entrega"] if ultimo_pedido else None,
        })

    clientes_resumo.sort(key=lambda item: item["totalPedidos"], reverse=True)

    return {
        "stats": {
            "emProducao": em_producao,
            "expedidos": expedidos,
            "entregues": entregues,
            "atencao": atencao,
        },
        "resumo": {
            "pedidosAtivos": len([pedido for pedido in portal_pedidos if pedido["status"] != "entregue"]),
            "pedidosConcluidos": entregues,
            "expedicoesDoDia": expedidos,
            "percentualConclusao": conclusao_media,
            "alertasCriticos": atencao,
        },
        "admin": {
            "totalClientes": len(clientes_resumo),
            "clientesAtivos": len([c for c in clientes_resumo if c["totalPedidos"] > 0]),
            "clientesComPedidosAtrasados": len([c for c in clientes_resumo if c["pedidosAtrasados"] > 0]),
            "carteiraTotal": len(portal_pedidos),
            "carteiraEmAtraso": atencao,
            "carteiraConcluida": entregues,
            "carteiraEmProducao": em_producao,
            "clientesResumo": clientes_resumo[:8],
        },
        "pedidos": portal_pedidos,
    }


@router.get("/dashboard")
def get_dashboard(db: Session = Depends(get_db)):
    pedidos = _load_pedidos(db)
    return _build_dashboard(pedidos)


@router.get("/pedidos")
def get_pedidos(
    cliente: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    pedidos = [_map_pedido_portal(pedido) for pedido in _load_pedidos(db)]

    if cliente:
        cliente_search = cliente.strip().lower()
        pedidos = [pedido for pedido in pedidos if cliente_search in (pedido["cliente_nome"] or "").lower()]

    if status:
        status_search = status.strip().lower()
        pedidos = [pedido for pedido in pedidos if pedido["status"] == status_search]

    if search:
        search_term = search.strip().lower()
        pedidos = [
            pedido for pedido in pedidos
            if search_term in " ".join([
                pedido["numero_pedido"] or "",
                pedido["cliente_nome"] or "",
                pedido["status"] or "",
                pedido["observacoes"] or "",
                pedido["operacao_atual"] or "",
            ]).lower()
        ]

    return {"pedidos": pedidos, "total": len(pedidos)}


@router.get("/pedidos/{pedido_id}")
def get_pedido(pedido_id: str, db: Session = Depends(get_db)):
    pedidos = _load_pedidos(db)
    for pedido in pedidos:
        pedido_id_value = _safe_str(_get_attr(pedido, "id"))
        if pedido_id_value == pedido_id:
            return _map_pedido_portal(pedido)

    raise HTTPException(status_code=404, detail="Pedido não encontrado")
