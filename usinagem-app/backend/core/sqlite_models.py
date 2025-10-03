from sqlalchemy import Column, Text, Integer, Float, CheckConstraint
from sqlalchemy.orm import declarative_base
from .sqlite_db import engine

Base = declarative_base()

class Configuracao(Base):
    __tablename__ = 'configuracoes'
    chave = Column(Text, primary_key=True)
    valor = Column(Text, nullable=False)
    updated_at = Column(Text)

class Usuario(Base):
    __tablename__ = 'usuarios'
    id = Column(Text, primary_key=True)
    nome = Column(Text, nullable=False)
    email = Column(Text, unique=True, nullable=False)
    senha_hash = Column(Text, nullable=False)
    nivel_acesso = Column(Text, nullable=False)
    created_at = Column(Text)
    __table_args__ = (
        CheckConstraint("nivel_acesso in ('operador','supervisor','admin')"),
    )

class Maquina(Base):
    __tablename__ = 'maquinas'
    id = Column(Text, primary_key=True)
    nome = Column(Text, nullable=False)
    descricao = Column(Text)
    status = Column(Text, nullable=False)
    created_at = Column(Text)
    __table_args__ = (
        CheckConstraint("status in ('ativa','inativa','manutencao')"),
    )

class CarteiraEncomenda(Base):
    __tablename__ = 'carteira_encomendas'
    id = Column(Text, primary_key=True)
    codigo_perfil = Column(Text, nullable=False)
    descricao_perfil = Column(Text)
    quantidade_necessaria = Column(Float, nullable=False)
    prazo_entrega = Column(Text)
    status = Column(Text, nullable=False)
    created_at = Column(Text)
    __table_args__ = (
        CheckConstraint("status in ('pendente','em_execucao','concluida')"),
    )

class ApontamentoProducao(Base):
    __tablename__ = 'apontamentos_producao'
    id = Column(Text, primary_key=True)
    ordem_trabalho_id = Column(Text)
    pedido_seq = Column(Text)
    usuario_id = Column(Text)
    maquina_id = Column(Text)
    inicio = Column(Text, nullable=False)
    fim = Column(Text)
    quantidade = Column(Float)
    rack_ou_pallet = Column(Text)
    observacoes = Column(Text)
    created_at = Column(Text)

class MotivoParada(Base):
    __tablename__ = 'motivos_parada'
    id = Column(Text, primary_key=True)
    descricao = Column(Text, nullable=False)
    tipo_parada = Column(Text, nullable=False)
    __table_args__ = (
        CheckConstraint("tipo_parada in ('planejada','nao_planejada','manutencao','setup')"),
    )

class ApontamentoParada(Base):
    __tablename__ = 'apontamentos_parada'
    id = Column(Text, primary_key=True)
    maquina_id = Column(Text)
    motivo_parada_id = Column(Text)
    inicio = Column(Text, nullable=False)
    fim = Column(Text)
    observacoes = Column(Text)
    created_at = Column(Text)

class Pedido(Base):
    __tablename__ = 'pedidos'
    id = Column(Text, primary_key=True)
    pedido_seq = Column(Text, nullable=False)
    pedido_cliente = Column(Text)
    cliente = Column(Text, nullable=False)
    dt_fatura = Column(Text)
    dt_implant_item = Column(Text)
    prazo = Column(Integer)
    produto = Column(Text, nullable=False)
    descricao = Column(Text, nullable=False)
    unidade = Column(Text, nullable=False)
    qtd_pedido = Column(Float, nullable=False)
    qt_saldo_op = Column(Float)
    em_wip = Column(Float)
    saldo_a_prod = Column(Float, nullable=False)
    estoque_aca = Column(Float)
    separado = Column(Float)
    faturado = Column(Float)
    saldo_a_fat = Column(Float)
    item_perfil = Column(Text, nullable=False)
    unidade_mp = Column(Text)
    estoque_mp = Column(Float)
    peso_barra = Column(Float)
    cod_cliente = Column(Text)
    situacao_item_pedido = Column(Text)
    efetivado = Column(Integer)  # 0/1
    item_do_cliente = Column(Text)
    representante = Column(Text)
    fam_comercial = Column(Text)
    nro_op = Column(Text)
    operacao_atual = Column(Text)
    qtd_operacao_finalizadas = Column(Integer)
    qtd_operacao_total = Column(Integer)
    data_ultimo_reporte = Column(Text)
    status = Column(Text, nullable=False)
    prioridade = Column(Integer)
    observacoes = Column(Text)
    dados_originais = Column(Text)
    created_at = Column(Text)
    updated_at = Column(Text)
    __table_args__ = (
        CheckConstraint("status in ('pendente','em_producao','concluido')"),
    )

# Criar tabelas se não existirem
Base.metadata.create_all(bind=engine)
