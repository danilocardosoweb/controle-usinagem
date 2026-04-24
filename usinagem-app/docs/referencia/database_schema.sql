-- Tabela de Usuários
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    nivel_acesso VARCHAR(50) NOT NULL CHECK (nivel_acesso IN ('operador', 'supervisor', 'admin')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Máquinas
CREATE TABLE maquinas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    status VARCHAR(50) NOT NULL CHECK (status IN ('ativa', 'inativa', 'manutencao')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela da Carteira de Encomendas (Ordens de Trabalho)
CREATE TABLE carteira_encomendas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_perfil VARCHAR(100) NOT NULL,
    descricao_perfil TEXT,
    quantidade_necessaria INTEGER NOT NULL,
    prazo_entrega DATE,
    status VARCHAR(50) NOT NULL CHECK (status IN ('pendente', 'em_execucao', 'concluida')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Apontamentos de Produção
CREATE TABLE apontamentos_producao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ordem_trabalho_id UUID REFERENCES carteira_encomendas(id),
    usuario_id UUID REFERENCES usuarios(id),
    maquina_id UUID REFERENCES maquinas(id),
    inicio_timestamp TIMESTAMPTZ NOT NULL,
    fim_timestamp TIMESTAMPTZ,
    quantidade_produzida INTEGER,
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Motivos de Parada
CREATE TABLE motivos_parada (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    descricao VARCHAR(255) NOT NULL,
    tipo_parada VARCHAR(50) NOT NULL CHECK (tipo_parada IN ('planejada', 'nao_planejada', 'manutencao', 'setup'))
);

-- Tabela de Apontamentos de Parada
CREATE TABLE apontamentos_parada (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maquina_id UUID REFERENCES maquinas(id),
    motivo_parada_id UUID REFERENCES motivos_parada(id),
    inicio_timestamp TIMESTAMPTZ NOT NULL,
    fim_timestamp TIMESTAMPTZ,
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Pedidos
CREATE TABLE pedidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_seq VARCHAR(100) NOT NULL,
    pedido_cliente VARCHAR(100),
    cliente VARCHAR(255) NOT NULL,
    dt_fatura DATE,
    dt_implant_item DATE,
    prazo INTEGER,
    produto VARCHAR(100) NOT NULL,
    descricao TEXT NOT NULL,
    unidade VARCHAR(20) NOT NULL,
    qtd_pedido NUMERIC(15, 2) NOT NULL,
    qt_saldo_op NUMERIC(15, 2),
    em_wip NUMERIC(15, 2),
    saldo_a_prod NUMERIC(15, 2) NOT NULL,
    estoque_aca NUMERIC(15, 2),
    separado NUMERIC(15, 2),
    faturado NUMERIC(15, 2),
    saldo_a_fat NUMERIC(15, 2),
    item_perfil VARCHAR(100) NOT NULL,
    unidade_mp VARCHAR(20),
    estoque_mp NUMERIC(15, 2),
    peso_barra NUMERIC(15, 3),
    cod_cliente VARCHAR(100),
    situacao_item_pedido VARCHAR(100),
    efetivado BOOLEAN,
    item_do_cliente VARCHAR(100),
    representante VARCHAR(255),
    fam_comercial VARCHAR(100),
    nro_op VARCHAR(100),
    operacao_atual VARCHAR(100),
    qtd_operacao_finalizadas INTEGER,
    qtd_operacao_total INTEGER,
    data_ultimo_reporte TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_producao', 'concluido')),
    prioridade INTEGER,
    observacoes TEXT,
    data_criacao TIMESTAMPTZ DEFAULT NOW(),
    data_atualizacao TIMESTAMPTZ
);

-- Índices para melhorar a performance de consultas frequentes
CREATE INDEX idx_pedidos_cliente ON pedidos(cliente);
CREATE INDEX idx_pedidos_produto ON pedidos(produto);
CREATE INDEX idx_pedidos_status ON pedidos(status);
CREATE INDEX idx_pedidos_dt_fatura ON pedidos(dt_fatura);
