-- Schema Consolidado - Sistema de Usinagem
-- Data: 13/10/2025 17:17
-- Objetivo: Schema unificado para Supabase/PostgreSQL com rastreabilidade completa
-- Última atualização: Adicionadas colunas dureza_material e comprimento_refugo em apontamentos

-- ============================
-- UP (Criar/atualizar estrutura)
-- ============================

BEGIN TRANSACTION;

-- 1) Tabela de configurações chave/valor
CREATE TABLE IF NOT EXISTS configuracoes (
  chave TEXT PRIMARY KEY,
  valor TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

INSERT INTO configuracoes (chave, valor)
VALUES ('pdf_base_path', '')
ON CONFLICT (chave) DO NOTHING;

-- 2) Usuários
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  senha_hash TEXT NOT NULL,
  nivel_acesso TEXT NOT NULL CHECK (nivel_acesso IN ('operador','supervisor','admin')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

-- 3) Máquinas
CREATE TABLE IF NOT EXISTS maquinas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  status TEXT NOT NULL CHECK (status IN ('ativa','inativa','manutencao')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

-- 4) Carteira de Encomendas (Ordens de Trabalho)
CREATE TABLE IF NOT EXISTS carteira_encomendas (
  id TEXT PRIMARY KEY,
  codigo_perfil TEXT NOT NULL,
  descricao_perfil TEXT,
  quantidade_necessaria REAL NOT NULL,
  prazo_entrega TEXT,
  status TEXT NOT NULL CHECK (status IN ('pendente','em_execucao','concluida')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

-- 5) Apontamentos de Produção
CREATE TABLE IF NOT EXISTS apontamentos_producao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_trabalho_id TEXT,                 -- FK lógica para carteira_encomendas.id
  pedido_seq TEXT,                         -- Referência amigável ao pedido/seq
  usuario_id TEXT,                         -- FK lógica para usuarios.id
  maquina_id TEXT,                         -- FK lógica para maquinas.id
  inicio TIMESTAMPTZ NOT NULL,
  fim TIMESTAMPTZ,
  quantidade REAL,
  rack_ou_pallet TEXT,                     -- Novo campo
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);
CREATE INDEX IF NOT EXISTS idx_apontamentos_pedido_seq ON apontamentos_producao(pedido_seq);
CREATE INDEX IF NOT EXISTS idx_apontamentos_maquina ON apontamentos_producao(maquina_id);
CREATE INDEX IF NOT EXISTS idx_apontamentos_inicio ON apontamentos_producao(inicio);

-- 6) Motivos de Parada
CREATE TABLE IF NOT EXISTS motivos_parada (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao TEXT NOT NULL,
  tipo_parada TEXT NOT NULL CHECK (tipo_parada IN ('planejada','nao_planejada','manutencao','setup'))
);

-- 7) Apontamentos de Parada (view compatível com tabela canônica "paradas")
CREATE OR REPLACE VIEW apontamentos_parada AS
SELECT
  id,
  maquina,
  motivo_parada,
  tipo_parada,
  inicio AS inicio_timestamp,
  fim AS fim_timestamp,
  observacoes,
  created_at
FROM paradas;

-- 7.1) Alias de compatibilidade: tipos_parada -> motivos_parada
CREATE OR REPLACE VIEW public.tipos_parada AS
SELECT * FROM public.motivos_parada;

COMMENT ON VIEW public.tipos_parada IS
'Alias compatível para motivos_parada, usado pelo frontend.';

-- 8) Pedidos (planilha importada)
CREATE TABLE IF NOT EXISTS pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  dados_originais JSONB,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pedidos_cliente ON pedidos(cliente);
CREATE INDEX IF NOT EXISTS idx_pedidos_produto ON pedidos(produto);

-- 8.1) Configuração mínima de ferramentas (evitar quebra no frontend)
CREATE TABLE IF NOT EXISTS public.ferramentas_cfg (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

ALTER TABLE public.ferramentas_cfg
  ADD COLUMN IF NOT EXISTS ferramenta text,
  ADD COLUMN IF NOT EXISTS responsavel text,
  ADD COLUMN IF NOT EXISTS vida_util_dias int,
  ADD COLUMN IF NOT EXISTS ultima_troca timestamptz,
  ADD COLUMN IF NOT EXISTS pcs_por_pallet numeric(14,3);

-- Campos adicionais esperados pelo frontend (Configurações de Ferramentas)
ALTER TABLE public.ferramentas_cfg
  ADD COLUMN IF NOT EXISTS peso_linear numeric(14,3),
  ADD COLUMN IF NOT EXISTS comprimento_mm int,
  ADD COLUMN IF NOT EXISTS ripas_por_pallet int,
  ADD COLUMN IF NOT EXISTS embalagem text,
  ADD COLUMN IF NOT EXISTS pcs_por_caixa int;

UPDATE public.ferramentas_cfg
SET ferramenta = codigo
WHERE ferramenta IS NULL AND codigo IS NOT NULL;

COMMENT ON TABLE public.ferramentas_cfg IS 'Configuração básica de ferramentas para uso no frontend.';

DO $$
BEGIN
  IF EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_name = 'apontamentos' AND column_name = 'inicio'
     )
     AND NOT EXISTS (
       SELECT 1
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE c.relname = 'idx_apont_inicio'
     ) THEN
    EXECUTE 'CREATE INDEX idx_apont_inicio ON apontamentos(inicio)';
  END IF;

  IF EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_name = 'apontamentos' AND column_name = 'maquina'
     )
     AND NOT EXISTS (
       SELECT 1
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE c.relname = 'idx_apont_maquina'
     ) THEN
    EXECUTE 'CREATE INDEX idx_apont_maquina ON apontamentos(maquina)';
  END IF;
END $$;

-- Remover política de auditoria criada no UP (idempotente)
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

-- ============================
-- EXP - Usinagem (importação e workflow)
-- ============================

CREATE TABLE IF NOT EXISTS public.exp_pedidos_importados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arquivo_nome TEXT,
  arquivo_hash TEXT,
  pedido TEXT,
  cliente TEXT,
  numero_pedido TEXT,
  data_entrega DATE,
  ferramenta TEXT,
  pedido_kg NUMERIC,
  pedido_pc NUMERIC,
  dados_brutos JSONB,
  importado_por TEXT,
  importado_em TIMESTAMPTZ DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.exp_pedidos_fluxo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID,
  importado_id UUID REFERENCES public.exp_pedidos_importados(id) ON DELETE SET NULL,
  origem TEXT NOT NULL CHECK (origem IN ('carteira','arquivo','manual')),
  pedido_seq TEXT NOT NULL,
  cliente TEXT NOT NULL,
  numero_pedido TEXT,
  data_entrega DATE,
  ferramenta TEXT,
  pedido_kg NUMERIC,
  pedido_pc NUMERIC,
  kg_disponivel NUMERIC(18,3) DEFAULT 0 NOT NULL,
  pc_disponivel NUMERIC(18,3) DEFAULT 0 NOT NULL,
  saldo_kg_total NUMERIC(18,3) DEFAULT 0 NOT NULL,
  saldo_pc_total NUMERIC(18,3) DEFAULT 0 NOT NULL,
  saldo_atualizado_em TIMESTAMPTZ,
  status_atual TEXT NOT NULL CHECK (status_atual IN ('pedido','produzido','inspecao','embalagem','expedicao_alu','expedicao_cliente','finalizado')),
  dados_originais JSONB,
  selecionado_por TEXT,
  selecionado_em TIMESTAMPTZ DEFAULT timezone('utc', now()),
  criado_em TIMESTAMPTZ DEFAULT timezone('utc', now()),
  atualizado_em TIMESTAMPTZ DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_exp_fluxo_status ON public.exp_pedidos_fluxo(status_atual);
CREATE INDEX IF NOT EXISTS idx_exp_fluxo_pedido_seq ON public.exp_pedidos_fluxo(pedido_seq);
CREATE INDEX IF NOT EXISTS idx_exp_fluxo_origem ON public.exp_pedidos_fluxo(origem);

CREATE TABLE IF NOT EXISTS public.exp_pedidos_movimentacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fluxo_id UUID NOT NULL REFERENCES public.exp_pedidos_fluxo(id) ON DELETE CASCADE,
  status_anterior TEXT,
  status_novo TEXT,
  motivo TEXT,
  movimentado_por TEXT,
  movimentado_em TIMESTAMPTZ DEFAULT timezone('utc', now()),
  tipo_movimentacao TEXT NOT NULL DEFAULT 'status' CHECK (tipo_movimentacao IN ('status','quantidade','ajuste')),
  kg_movimentado NUMERIC(18,3) DEFAULT 0,
  pc_movimentado NUMERIC(18,3) DEFAULT 0,
  kg_disponivel_anterior NUMERIC(18,3),
  kg_disponivel_atual NUMERIC(18,3),
  pc_disponivel_anterior NUMERIC(18,3),
  pc_disponivel_atual NUMERIC(18,3)
);

COMMENT ON TABLE public.exp_pedidos_importados IS 'Staging de linhas importadas via planilha na aba EXP - Usinagem.';
COMMENT ON TABLE public.exp_pedidos_fluxo IS 'Pedidos selecionados para acompanhamento na EXP - Usinagem com status persistente.';
COMMENT ON TABLE public.exp_pedidos_movimentacoes IS 'Histórico de movimentações do fluxo EXP - Usinagem.';

-- 8.2) RLS e política para auditoria (historico_acoes)
DO $$
BEGIN
  -- Habilita RLS (idempotente)
  BEGIN
    EXECUTE 'ALTER TABLE public.historico_acoes ENABLE ROW LEVEL SECURITY';
  EXCEPTION WHEN others THEN
    -- ignora se a tabela não existir neste ambiente
    NULL;
  END;

  -- Cria política de INSERT para usuários autenticados (idempotente)
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'historico_acoes'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename  = 'historico_acoes'
        AND policyname = 'allow_insert_authenticated'
    ) THEN
      EXECUTE 'CREATE POLICY allow_insert_authenticated ON public.historico_acoes FOR INSERT TO authenticated WITH CHECK (true)';
    END IF;
  END IF;
END$$;

NOTIFY pgrst, 'reload schema';

-- Política adicional para permitir INSERT por role "anon" (ambiente de desenvolvimento)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'historico_acoes'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename  = 'historico_acoes'
        AND policyname = 'allow_insert_anon'
    ) THEN
      EXECUTE 'CREATE POLICY allow_insert_anon ON public.historico_acoes FOR INSERT TO anon WITH CHECK (true)';
    END IF;
  END IF;
END$$;

NOTIFY pgrst, 'reload schema';

-- ============================
-- MELHORIAS DE RASTREABILIDADE (v2.0.0)
-- ============================

-- Adicionar campo para rastreabilidade completa de amarrados
ALTER TABLE public.apontamentos 
  ADD COLUMN IF NOT EXISTS amarrados_detalhados jsonb;

-- Adicionar campo de refugo/sucata
ALTER TABLE public.apontamentos
  ADD COLUMN IF NOT EXISTS qtd_refugo numeric(18,3) DEFAULT 0;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_apontamentos_amarrados_detalhados 
  ON public.apontamentos USING gin (amarrados_detalhados);

-- Comentários explicativos
COMMENT ON COLUMN public.apontamentos.amarrados_detalhados IS 
'Detalhes completos dos amarrados selecionados para rastreabilidade. 
Estrutura: [{"codigo": "2532005482", "rack": "278", "lote": "224020089", "produto": "EXP908155000NANV", "pedido_seq": "78914/10", "romaneio": "37513", "qt_kg": 12.42, "qtd_pc": 3}]';

COMMENT ON COLUMN public.apontamentos.qtd_refugo IS 'Quantidade de refugo/sucata apontada na usinagem (na mesma unidade de quantidade).';

-- Adicionar colunas para dureza e comprimento de refugo (v2.1.0 - 13/10/2025)
ALTER TABLE public.apontamentos 
  ADD COLUMN IF NOT EXISTS dureza_material TEXT;

ALTER TABLE public.apontamentos 
  ADD COLUMN IF NOT EXISTS comprimento_refugo NUMERIC DEFAULT 0;

COMMENT ON COLUMN public.apontamentos.dureza_material IS 'Dureza do material cortado (ex: HRC 45-50)';
COMMENT ON COLUMN public.apontamentos.comprimento_refugo IS 'Comprimento médio das peças refugadas em mm para cálculo de perdas em kg';

-- Vínculo dos apontamentos com o fluxo EXP - Usinagem (TecnoPerfil/Alúnica)
ALTER TABLE public.apontamentos
  ADD COLUMN IF NOT EXISTS exp_fluxo_id UUID REFERENCES public.exp_pedidos_fluxo(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS exp_unidade TEXT,
  ADD COLUMN IF NOT EXISTS exp_stage TEXT;

ALTER TABLE public.apontamentos
  ADD COLUMN IF NOT EXISTS etapa_embalagem TEXT;

COMMENT ON COLUMN public.apontamentos.exp_fluxo_id IS 'Referência opcional para exp_pedidos_fluxo (fluxo EXP - Usinagem).';
COMMENT ON COLUMN public.apontamentos.exp_unidade IS 'Unidade/módulo de expedição associada ao apontamento (ex.: alunica, tecnoperfil).';
COMMENT ON COLUMN public.apontamentos.exp_stage IS 'Estágio do fluxo EXP (pedido, produzido, para-usinar, para-embarque etc.) no momento do apontamento.';

CREATE TABLE IF NOT EXISTS public.etiquetas_geradas (
  id uuid primary key default gen_random_uuid(),
  lote_usinagem text,
  numero_etiqueta int,
  total_etiquetas int,
  qtd_por_etiqueta int,
  qt_kg_por_etiqueta numeric(10,2),
  apontamento_id uuid,
  codigo_amarrado text,
  rack_ou_pallet text,
  data_hora_impresao timestamptz,
  impressora text,
  usuario_impressao text,
  status text,
  qr_code text,
  dados_etiqueta jsonb,
  created_at timestamptz default timezone('utc', now()),
  updated_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_etiquetas_lote ON public.etiquetas_geradas(lote_usinagem);
CREATE INDEX IF NOT EXISTS idx_etiquetas_apontamento ON public.etiquetas_geradas(apontamento_id);
CREATE INDEX IF NOT EXISTS idx_etiquetas_data ON public.etiquetas_geradas(data_hora_impresao);
CREATE INDEX IF NOT EXISTS idx_etiquetas_status ON public.etiquetas_geradas(status);

-- ============================
-- Movimentações: Insumos e Ferramentas
-- ============================

-- Tabela de Insumos (catálogo)
CREATE TABLE IF NOT EXISTS public.exp_insumos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  categoria text null,
  qtd_atual numeric default 0,
  qtd_minima numeric default 0,
  unidade text default 'un',
  criado_por text null,
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now(),
  foto_url text null
);

-- Baixas do estoque com rastreabilidade por lote
CREATE TABLE IF NOT EXISTS public.exp_estoque_baixas (
  id uuid primary key default gen_random_uuid(),
  produto text,
  fluxo_id uuid null,
  lote_codigo text not null,
  tipo_baixa text not null check (tipo_baixa in ('consumo','venda','producao')),
  quantidade_pc integer default 0,
  quantidade_kg numeric default 0,
  observacao text null,
  baixado_por text not null,
  baixado_em timestamptz not null default timezone('utc', now()),
  estornado boolean default false,
  estornado_por text null,
  estornado_em timestamptz null,
  motivo_estorno text null,
  created_at timestamptz default timezone('utc', now())
);

-- Inventários/Ajustes de estoque de Itens Acabados (por Produto)
-- Registra ajustes para valor final (contagem física), mantendo antes/depois/delta e motivo.
CREATE TABLE IF NOT EXISTS public.estoque_acabados_inventarios (
  id uuid primary key default gen_random_uuid(),
  produto text not null,
  saldo_antes_pc numeric(18,3) not null check (saldo_antes_pc >= 0),
  saldo_depois_pc numeric(18,3) not null check (saldo_depois_pc >= 0),
  delta_pc numeric(18,3) not null,
  motivo text not null,
  observacao text null,
  criado_por uuid null references public.usuarios(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_estoque_acabados_invent_produto ON public.estoque_acabados_inventarios(produto);
CREATE INDEX IF NOT EXISTS idx_estoque_acabados_invent_created ON public.estoque_acabados_inventarios(created_at desc);

-- RLS: Como o app usa autenticação própria (sem Supabase Auth), auth.uid() fica NULL.
-- Usar role 'anon' para permitir operações nesta tabela.
ALTER TABLE public.estoque_acabados_inventarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_select_anon_estoque_acabados_inventarios" ON public.estoque_acabados_inventarios;
CREATE POLICY "allow_select_anon_estoque_acabados_inventarios" ON public.estoque_acabados_inventarios
  FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "allow_insert_anon_estoque_acabados_inventarios" ON public.estoque_acabados_inventarios;
CREATE POLICY "allow_insert_anon_estoque_acabados_inventarios" ON public.estoque_acabados_inventarios
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Tabela de movimentos de Insumos
CREATE TABLE IF NOT EXISTS public.exp_insumos_mov (
  id uuid primary key default gen_random_uuid(),
  insumo_id uuid null,
  nome text not null,
  categoria text null,
  tipo text not null check (tipo in ('entrada','saida','ajuste')),
  quantidade numeric(14,3) not null check (quantidade > 0),
  unidade text null,
  motivo text null,
  maquina text null,
  responsavel text null,
  observacao text null,
  created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS idx_exp_insumos_mov_nome ON public.exp_insumos_mov (nome);
CREATE INDEX IF NOT EXISTS idx_exp_insumos_mov_categoria ON public.exp_insumos_mov (categoria);
CREATE INDEX IF NOT EXISTS idx_exp_insumos_mov_created ON public.exp_insumos_mov (created_at);

-- View de saldo por insumo (Entradas - Saídas +/- Ajustes)
CREATE OR REPLACE VIEW public.vw_insumos_saldo AS
SELECT
  nome,
  COALESCE(SUM(
    CASE
      WHEN tipo = 'entrada' THEN quantidade
      WHEN tipo = 'saida'   THEN -quantidade
      WHEN tipo = 'ajuste'  THEN quantidade
    END
  ),0) AS saldo
FROM public.exp_insumos_mov
GROUP BY nome;

-- View de consumo de insumos nos últimos 30 dias
CREATE OR REPLACE VIEW public.vw_insumos_consumo_30d AS
SELECT
  nome,
  COALESCE(SUM(quantidade),0) AS consumo_30d
FROM public.exp_insumos_mov
WHERE tipo = 'saida'
  AND created_at >= now() - interval '30 days'
GROUP BY nome;

-- Tabela de movimentos de Ferramentas
CREATE TABLE IF NOT EXISTS public.exp_ferramentas_mov (
  id uuid primary key default gen_random_uuid(),
  ferramenta text not null,
  categoria text null,
  tipo text not null check (tipo in ('entrada','consumo','troca','ajuste','perda')),
  quantidade numeric(14,3) not null check (quantidade > 0),
  unidade text null,
  motivo text null,
  maquina text null,
  responsavel text null,
  observacao text null,
  created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS idx_exp_ferramentas_mov_ferr ON public.exp_ferramentas_mov (ferramenta);
CREATE INDEX IF NOT EXISTS idx_exp_ferramentas_mov_created ON public.exp_ferramentas_mov (created_at);

-- View: consumo de ferramentas nos últimos 30 dias
CREATE OR REPLACE VIEW public.vw_ferramentas_consumo_30d AS
SELECT
  ferramenta,
  COALESCE(SUM(quantidade),0) AS consumo_30d
FROM public.exp_ferramentas_mov
WHERE tipo IN ('consumo','perda','ajuste')
  AND created_at >= now() - interval '30 days'
GROUP BY ferramenta;

-- View: status de vida útil de ferramentas (com base em ferramentas_cfg)
CREATE OR REPLACE VIEW public.vw_ferramentas_status AS
SELECT
  COALESCE(f.ferramenta, f.codigo) AS ferramenta,
  COALESCE(f.vida_util_dias,0) AS vida_util_dias,
  f.ultima_troca,
  CASE
    WHEN f.vida_util_dias IS NULL OR f.ultima_troca IS NULL THEN NULL
    ELSE GREATEST(0, f.vida_util_dias - (EXTRACT(EPOCH FROM (now() - f.ultima_troca))/86400)::int)
  END AS restante_dias,
  CASE
    WHEN f.vida_util_dias IS NULL OR f.ultima_troca IS NULL THEN 'inativa'
    WHEN (GREATEST(0, f.vida_util_dias - (EXTRACT(EPOCH FROM (now() - f.ultima_troca))/86400)::int)) <= 0 THEN 'para trocar'
    WHEN (GREATEST(0, f.vida_util_dias - (EXTRACT(EPOCH FROM (now() - f.ultima_troca))/86400)::int)) <= CEIL(COALESCE(f.vida_util_dias,0) * 0.2) THEN 'atenção'
    ELSE 'ativa'
  END AS status,
  f.responsavel,
  f.codigo
FROM public.ferramentas_cfg f;

-- View: recomendação de reposição de insumos (saldo <= mínimo)
CREATE OR REPLACE VIEW public.vw_insumos_reposicao AS
WITH s AS (
  SELECT i.nome,
         COALESCE(m.saldo,0) AS saldo,
         COALESCE(i2.qtd_minima,0) AS minimo
  FROM (SELECT DISTINCT nome FROM public.exp_insumos_mov) i
  LEFT JOIN public.vw_insumos_saldo m ON m.nome = i.nome
  LEFT JOIN public.exp_insumos i2 ON i2.nome = m.nome
)
SELECT
  s.nome,
  s.saldo,
  s.minimo,
  GREATEST(0, s.minimo - s.saldo) AS qtd_recomendada
FROM s
WHERE s.minimo > 0 AND s.saldo <= s.minimo;

COMMIT;

-- ============================
-- NOTIFY PGRST (para recarregar schema no PostgREST/Supabase API)
-- ============================
NOTIFY pgrst, 'reload schema';

-- ============================
-- DOWN (Rollback das alterações)
-- ============================
BEGIN;
ALTER TABLE IF EXISTS public.exp_pedidos_movimentacoes
  DROP COLUMN IF EXISTS tipo_movimentacao,
  DROP COLUMN IF EXISTS kg_movimentado,
  DROP COLUMN IF EXISTS pc_movimentado,
  DROP COLUMN IF EXISTS kg_disponivel_anterior,
  DROP COLUMN IF EXISTS kg_disponivel_atual,
  DROP COLUMN IF EXISTS pc_disponivel_anterior,
  DROP COLUMN IF EXISTS pc_disponivel_atual;

ALTER TABLE IF EXISTS public.exp_pedidos_fluxo
  DROP COLUMN IF EXISTS kg_disponivel,
  DROP COLUMN IF EXISTS pc_disponivel,
  DROP COLUMN IF EXISTS saldo_kg_total,
  DROP COLUMN IF EXISTS saldo_pc_total,
  DROP COLUMN IF EXISTS saldo_atualizado_em;

DROP INDEX IF EXISTS exp_fluxo_alunica_stage_idx;
ALTER TABLE IF EXISTS public.exp_pedidos_fluxo
  DROP CONSTRAINT IF EXISTS exp_fluxo_alunica_stage_chk;
ALTER TABLE IF EXISTS public.exp_pedidos_fluxo
  DROP COLUMN IF EXISTS alunica_stage;

DROP TABLE IF EXISTS apontamentos;
DROP TABLE IF EXISTS ferramentas_cfg;
DROP VIEW IF EXISTS tipos_parada;

ALTER TABLE IF EXISTS maquinas
  DROP COLUMN IF EXISTS codigo,
  DROP COLUMN IF EXISTS modelo,
  DROP COLUMN IF EXISTS fabricante,
  DROP COLUMN IF EXISTS ano;

ALTER TABLE IF EXISTS pedidos
  DROP COLUMN IF EXISTS dados_originais;

-- Finalização manual de pedidos (PCP 29/10/2025)
ALTER TABLE IF EXISTS public.pedidos
  ADD COLUMN IF NOT EXISTS finalizado_manual BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS finalizado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS finalizado_por TEXT;

NOTIFY pgrst, 'reload schema';

DROP INDEX IF EXISTS idx_apont_pedido_seq;
DROP INDEX IF EXISTS idx_apont_inicio;
DROP INDEX IF EXISTS idx_apont_maquina;
DROP INDEX IF EXISTS idx_pedidos_pedido_seq;
DROP INDEX IF EXISTS idx_pedidos_pedido_cliente;
DROP INDEX IF EXISTS idx_pedidos_nro_op;

-- Rollback melhorias v2.0.0
DROP INDEX IF EXISTS idx_apontamentos_amarrados_detalhados;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'apontamentos'
  ) THEN
    ALTER TABLE public.apontamentos DROP COLUMN IF EXISTS amarrados_detalhados;
    ALTER TABLE public.apontamentos DROP COLUMN IF EXISTS qtd_refugo;
    ALTER TABLE public.apontamentos DROP COLUMN IF EXISTS dureza_material;
    ALTER TABLE public.apontamentos DROP COLUMN IF EXISTS comprimento_refugo;
    ALTER TABLE public.apontamentos DROP COLUMN IF EXISTS exp_fluxo_id;
    ALTER TABLE public.apontamentos DROP COLUMN IF EXISTS exp_unidade;
    ALTER TABLE public.apontamentos DROP COLUMN IF EXISTS exp_stage;
    ALTER TABLE public.apontamentos DROP COLUMN IF EXISTS etapa_embalagem;
  END IF;
END $$;

DROP INDEX IF EXISTS idx_etiquetas_lote;
DROP INDEX IF EXISTS idx_etiquetas_apontamento;
DROP INDEX IF EXISTS idx_etiquetas_data;
DROP INDEX IF EXISTS idx_etiquetas_status;
DROP TABLE IF EXISTS public.etiquetas_geradas;

-- Rollback Movimentações/Views criadas neste patch
DROP VIEW IF EXISTS public.vw_insumos_reposicao;
DROP VIEW IF EXISTS public.vw_ferramentas_status;
DROP VIEW IF EXISTS public.vw_ferramentas_consumo_30d;
DROP VIEW IF EXISTS public.vw_insumos_consumo_30d;
DROP VIEW IF EXISTS public.vw_insumos_saldo;
-- Rollback Inventários de Itens Acabados
DROP POLICY IF EXISTS "allow_select_anon_estoque_acabados_inventarios" ON public.estoque_acabados_inventarios;
DROP POLICY IF EXISTS "allow_insert_anon_estoque_acabados_inventarios" ON public.estoque_acabados_inventarios;
DROP POLICY IF EXISTS "admin_can_view_estoque_acabados_inventarios" ON public.estoque_acabados_inventarios;
DROP POLICY IF EXISTS "admin_can_insert_estoque_acabados_inventarios" ON public.estoque_acabados_inventarios;
DROP TABLE IF EXISTS public.estoque_acabados_inventarios;
ALTER TABLE IF EXISTS public.exp_estoque_baixas
  DROP COLUMN IF EXISTS produto;
DROP TABLE IF EXISTS public.exp_estoque_baixas;
DROP TABLE IF EXISTS public.exp_insumos;
DROP TABLE IF EXISTS public.exp_ferramentas_mov;
DROP TABLE IF EXISTS public.exp_insumos_mov;

ALTER TABLE IF EXISTS public.ferramentas_cfg
  DROP COLUMN IF EXISTS ferramenta,
  DROP COLUMN IF EXISTS responsavel,
  DROP COLUMN IF EXISTS vida_util_dias,
  DROP COLUMN IF EXISTS ultima_troca,
  DROP COLUMN IF EXISTS pcs_por_pallet,
  DROP COLUMN IF EXISTS peso_linear,
  DROP COLUMN IF EXISTS comprimento_mm,
  DROP COLUMN IF EXISTS ripas_por_pallet,
  DROP COLUMN IF EXISTS embalagem,
  DROP COLUMN IF EXISTS pcs_por_caixa;

-- Remover política de desenvolvimento caso exista
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'historico_acoes'
  ) THEN
    BEGIN
      EXECUTE 'DROP POLICY IF EXISTS allow_insert_anon ON public.historico_acoes';
    EXCEPTION WHEN others THEN
      NULL;
    END;
  END IF;
END $$;

-- Rollback finalização manual
ALTER TABLE IF EXISTS public.pedidos
  DROP COLUMN IF EXISTS finalizado_manual,
  DROP COLUMN IF EXISTS finalizado_em,
  DROP COLUMN IF EXISTS finalizado_por;

-- Tabela de correções de apontamentos (auditoria)
CREATE TABLE IF NOT EXISTS apontamentos_correcoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apontamento_id UUID NOT NULL REFERENCES apontamentos(id) ON DELETE CASCADE,
  
  -- Dados anteriores (antes da correção)
  valor_anterior JSONB NOT NULL,
  
  -- Dados novos (após a correção)
  valor_novo JSONB NOT NULL,
  
  -- Campos corrigidos (array de nomes: ['quantidade', 'inicio', 'operador', etc])
  campos_alterados TEXT[] NOT NULL,
  
  -- Rastreabilidade
  corrigido_por UUID NOT NULL REFERENCES usuarios(id),
  corrigido_em TIMESTAMPTZ DEFAULT timezone('utc', now()),
  motivo_correcao TEXT NOT NULL,
  
  -- Reversão (se necessário)
  revertido BOOLEAN DEFAULT false,
  revertido_por UUID REFERENCES usuarios(id),
  revertido_em TIMESTAMPTZ,
  motivo_reversao TEXT,
  
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_correcoes_apontamento ON apontamentos_correcoes(apontamento_id);
CREATE INDEX IF NOT EXISTS idx_correcoes_corrigido_por ON apontamentos_correcoes(corrigido_por);
CREATE INDEX IF NOT EXISTS idx_correcoes_data ON apontamentos_correcoes(corrigido_em DESC);

-- RLS: Apenas admin pode inserir/atualizar correções
ALTER TABLE apontamentos_correcoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_can_insert_correcoes" ON apontamentos_correcoes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
      AND nivel_acesso = 'admin'
    )
  );

CREATE POLICY "admin_can_view_correcoes" ON apontamentos_correcoes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
      AND nivel_acesso IN ('admin', 'supervisor')
    )
  );

CREATE POLICY "admin_can_update_correcoes" ON apontamentos_correcoes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
      AND nivel_acesso = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
      AND nivel_acesso = 'admin'
    )
  );

-- DEV ONLY: como o app usa autenticação própria (sem Supabase Auth), auth.uid() fica NULL.
-- Para desenvolvimento/local, permitir operações via role 'anon' nesta tabela.
DROP POLICY IF EXISTS "allow_select_anon_correcoes" ON apontamentos_correcoes;
CREATE POLICY "allow_select_anon_correcoes" ON apontamentos_correcoes
  FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "allow_insert_anon_correcoes" ON apontamentos_correcoes;
CREATE POLICY "allow_insert_anon_correcoes" ON apontamentos_correcoes
  FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "allow_update_anon_correcoes" ON apontamentos_correcoes;
CREATE POLICY "allow_update_anon_correcoes" ON apontamentos_correcoes
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Rollback: remover tabela de correções
-- DROP TABLE IF EXISTS apontamentos_correcoes CASCADE;

-- Rollback DEV ONLY (policies anon)
-- DROP POLICY IF EXISTS "allow_select_anon_correcoes" ON apontamentos_correcoes;
-- DROP POLICY IF EXISTS "allow_insert_anon_correcoes" ON apontamentos_correcoes;
-- DROP POLICY IF EXISTS "allow_update_anon_correcoes" ON apontamentos_correcoes;

NOTIFY pgrst, 'reload schema';

COMMIT;
