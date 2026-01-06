from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime
from uuid import UUID, uuid4

class PedidoBase(BaseModel):
    pedido_seq: str = Field(..., description="Número do pedido e sequência")
    pedido_cliente: Optional[str] = Field(None, description="Número do pedido do cliente")
    cliente: str = Field(..., description="Nome do cliente")
    dt_fatura: Optional[date] = Field(None, description="Data para entrega dos pedidos")
    dt_implant_item: Optional[date] = Field(None, description="Data de implantação do item")
    prazo: Optional[int] = Field(None, description="Prazo em dias")
    produto: str = Field(..., description="Código do produto acabado")
    descricao: str = Field(..., description="Descrição do produto")
    unidade: str = Field(..., description="Unidade de atendimento")
    qtd_pedido: float = Field(..., description="Quantidade solicitada")
    qt_saldo_op: Optional[float] = Field(None, description="Quantidade em saldo OP")
    em_wip: Optional[float] = Field(None, description="Quantidade em WIP")
    saldo_a_prod: float = Field(..., description="Saldo a produzir")
    estoque_aca: Optional[float] = Field(None, description="Quantidade em estoque")
    separado: Optional[float] = Field(None, description="Quantidade separada para cliente")
    faturado: Optional[float] = Field(None, description="Quantidade já faturada")
    saldo_a_fat: Optional[float] = Field(None, description="Saldo a faturar")
    item_perfil: str = Field(..., description="Produto longo/matéria-prima")
    unidade_mp: Optional[str] = Field(None, description="Unidade da matéria-prima")
    estoque_mp: Optional[float] = Field(None, description="Estoque da matéria-prima")
    peso_barra: Optional[float] = Field(None, description="Peso da barra")
    cod_cliente: Optional[str] = Field(None, description="Código do cliente")
    situacao_item_pedido: Optional[str] = Field(None, description="Situação do item do pedido")
    efetivado: Optional[bool] = Field(None, description="Se está efetivado")
    item_do_cliente: Optional[str] = Field(None, description="Item do cliente")
    representante: Optional[str] = Field(None, description="Representante")
    fam_comercial: Optional[str] = Field(None, description="Família comercial")
    nro_op: Optional[str] = Field(None, description="Número da OP criada no sistema")
    operacao_atual: Optional[str] = Field(None, description="Operação atual")
    qtd_operacao_finalizadas: Optional[int] = Field(None, description="Quantidade de operações finalizadas")
    qtd_operacao_total: Optional[int] = Field(None, description="Quantidade total de operações")
    data_ultimo_reporte: Optional[datetime] = Field(None, description="Data do último reporte")
    
    # Campos adicionais para controle interno
    status: str = Field("pendente", description="Status do pedido (pendente, em_producao, concluido)")
    prioridade: Optional[int] = Field(None, description="Prioridade do pedido (1-5, sendo 1 a mais alta)")
    observacoes: Optional[str] = Field(None, description="Observações sobre o pedido")

class PedidoCreate(PedidoBase):
    pass

class PedidoUpdate(BaseModel):
    pedido_cliente: Optional[str] = None
    cliente: Optional[str] = None
    dt_fatura: Optional[date] = None
    produto: Optional[str] = None
    descricao: Optional[str] = None
    unidade: Optional[str] = None
    qtd_pedido: Optional[float] = None
    saldo_a_prod: Optional[float] = None
    estoque_aca: Optional[float] = None
    separado: Optional[float] = None
    faturado: Optional[float] = None
    item_perfil: Optional[str] = None
    nro_op: Optional[str] = None
    status: Optional[str] = None
    prioridade: Optional[int] = None
    observacoes: Optional[str] = None

class Pedido(PedidoBase):
    id: UUID = Field(default_factory=uuid4)
    data_criacao: datetime = Field(default_factory=datetime.now)
    data_atualizacao: Optional[datetime] = None

    class Config:
        orm_mode = True
