-- SQLite Schema and Migration Script
-- Data: 19/09/2025 09:50
-- Objetivo: Migrar o backend para SQLite mantendo o frontend offline-first com IndexedDB

-- ============================
-- UP (Criar/atualizar estrutura)
-- ============================

BEGIN TRANSACTION;

-- 1) Tabela de configurações chave/valor
CREATE TABLE IF NOT EXISTS configuracoes (
  chave TEXT PRIMARY KEY,
  valor TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO configuracoes (chave, valor) VALUES ('pdf_base_path', '');

-- 2) Usuários
CREATE TABLE IF NOT EXISTS usuarios (
  id TEXT PRIMARY KEY,        -- UUID como string
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  senha_hash TEXT NOT NULL,
  nivel_acesso TEXT NOT NULL CHECK (nivel_acesso IN ('operador','supervisor','admin')),
  created_at TEXT DEFAULT (datetime('now'))
);

-- 3) Máquinas
CREATE TABLE IF NOT EXISTS maquinas (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  status TEXT NOT NULL CHECK (status IN ('ativa','inativa','manutencao')),
  created_at TEXT DEFAULT (datetime('now'))
);

-- 4) Carteira de Encomendas (Ordens de Trabalho)
CREATE TABLE IF NOT EXISTS carteira_encomendas (
  id TEXT PRIMARY KEY,
  codigo_perfil TEXT NOT NULL,
  descricao_perfil TEXT,
  quantidade_necessaria REAL NOT NULL,
  prazo_entrega TEXT,
  status TEXT NOT NULL CHECK (status IN ('pendente','em_execucao','concluida')),
  created_at TEXT DEFAULT (datetime('now'))
);

-- 5) Apontamentos de Produção
CREATE TABLE IF NOT EXISTS apontamentos_producao (
  id TEXT PRIMARY KEY,
  ordem_trabalho_id TEXT,                 -- FK lógica para carteira_encomendas.id
  pedido_seq TEXT,                         -- Referência amigável ao pedido/seq
  usuario_id TEXT,                         -- FK lógica para usuarios.id
  maquina_id TEXT,                         -- FK lógica para maquinas.id
  inicio TEXT NOT NULL,
  fim TEXT,
  quantidade REAL,
  rack_ou_pallet TEXT,                     -- Novo campo
  observacoes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_apontamentos_pedido_seq ON apontamentos_producao(pedido_seq);
CREATE INDEX IF NOT EXISTS idx_apontamentos_maquina ON apontamentos_producao(maquina_id);
CREATE INDEX IF NOT EXISTS idx_apontamentos_inicio ON apontamentos_producao(inicio);

-- 6) Motivos de Parada
CREATE TABLE IF NOT EXISTS motivos_parada (
  id TEXT PRIMARY KEY,
  descricao TEXT NOT NULL,
  tipo_parada TEXT NOT NULL CHECK (tipo_parada IN ('planejada','nao_planejada','manutencao','setup'))
);

-- 7) Apontamentos de Parada
CREATE TABLE IF NOT EXISTS apontamentos_parada (
  id TEXT PRIMARY KEY,
  maquina_id TEXT,
  motivo_parada_id TEXT,
  inicio TEXT NOT NULL,
  fim TEXT,
  observacoes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_parada_maquina ON apontamentos_parada(maquina_id);
CREATE INDEX IF NOT EXISTS idx_parada_inicio ON apontamentos_parada(inicio);

-- 8) Pedidos (planilha importada)
CREATE TABLE IF NOT EXISTS pedidos (
  id TEXT PRIMARY KEY,
  pedido_seq TEXT NOT NULL,
  pedido_cliente TEXT,
  cliente TEXT NOT NULL,
  dt_fatura TEXT,
  dt_implant_item TEXT,
  prazo INTEGER,
  produto TEXT NOT NULL,
  descricao TEXT NOT NULL,
  unidade TEXT NOT NULL,
  qtd_pedido REAL NOT NULL,
  qt_saldo_op REAL,
  em_wip REAL,
  saldo_a_prod REAL NOT NULL,
  estoque_aca REAL,
  separado REAL,
  faturado REAL,
  saldo_a_fat REAL,
  item_perfil TEXT NOT NULL,
  unidade_mp TEXT,
  estoque_mp REAL,
  peso_barra REAL,
  cod_cliente TEXT,
  situacao_item_pedido TEXT,
  efetivado INTEGER, -- booleano (0/1)
  item_do_cliente TEXT,
  representante TEXT,
  fam_comercial TEXT,
  nro_op TEXT,
  operacao_atual TEXT,
  qtd_operacao_finalizadas INTEGER,
  qtd_operacao_total INTEGER,
  data_ultimo_reporte TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','em_producao','concluido')),
  prioridade INTEGER,
  observacoes TEXT,
  dados_originais TEXT, -- JSON serializado
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_pedidos_cliente ON pedidos(cliente);
CREATE INDEX IF NOT EXISTS idx_pedidos_produto ON pedidos(produto);

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='apontamentos' AND column_name='inicio')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relname='idx_apont_inicio') THEN
    EXECUTE 'CREATE INDEX idx_apont_inicio ON apontamentos(inicio)';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='apontamentos' AND column_name='maquina')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relname='idx_apont_maquina') THEN
    EXECUTE 'CREATE INDEX idx_apont_maquina ON apontamentos(maquina)';
  END IF;
END $$;

-- Índices adicionais em pedidos (idempotentes)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relname='idx_pedidos_pedido_seq') THEN
    CREATE INDEX idx_pedidos_pedido_seq ON pedidos(pedido_seq);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relname='idx_pedidos_pedido_cliente') THEN
    CREATE INDEX idx_pedidos_pedido_cliente ON pedidos(pedido_cliente);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relname='idx_pedidos_nro_op') THEN
    CREATE INDEX idx_pedidos_nro_op ON pedidos(nro_op);
  END IF;
END $$;

COMMIT;

-- ============================
-- DOWN (Rollback das alterações Postgres)
-- ============================
BEGIN;
DROP TABLE IF EXISTS apontamentos;
DROP TABLE IF EXISTS ferramentas_cfg;
DROP TABLE IF EXISTS tipos_parada;

ALTER TABLE IF EXISTS maquinas
  DROP COLUMN IF EXISTS codigo,
  DROP COLUMN IF EXISTS modelo,
  DROP COLUMN IF EXISTS fabricante,
  DROP COLUMN IF EXISTS ano;

ALTER TABLE IF EXISTS pedidos
  DROP COLUMN IF EXISTS dados_originais;

DROP INDEX IF EXISTS idx_apont_pedido_seq;
DROP INDEX IF EXISTS idx_apont_inicio;
DROP INDEX IF EXISTS idx_apont_maquina;
DROP INDEX IF EXISTS idx_pedidos_pedido_seq;
DROP INDEX IF EXISTS idx_pedidos_pedido_cliente;
DROP INDEX IF EXISTS idx_pedidos_nro_op;
COMMIT;
