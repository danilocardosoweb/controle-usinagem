-- Schema COMPLETO para Supabase (PostgreSQL)
-- Execute ESTE script primeiro no SQL Editor do Supabase
-- Depois execute o schema_fix.sql

-- ============
-- Extensões
-- ============
create extension if not exists pgcrypto; -- para gen_random_uuid()

-- ============
-- Tabelas de domínio
-- ============
create table if not exists public.tipos_parada (
  id uuid primary key default gen_random_uuid(),
  descricao text not null,
  slug text generated always as (lower(replace(descricao, ' ', '_'))) stored unique,
  created_at timestamptz not null default now()
);

create table if not exists public.motivos_parada (
  id uuid primary key default gen_random_uuid(),
  descricao text not null,
  -- setup | manutencao | planejada | nao_planejada (livre, mas sugerido)
  tipo text,
  created_at timestamptz not null default now()
);

create table if not exists public.maquinas (
  id uuid primary key default gen_random_uuid(),
  codigo text,
  nome text,
  modelo text,
  fabricante text,
  ano int,
  status text default 'ativo',
  created_at timestamptz not null default now()
);

create table if not exists public.ferramentas_cfg (
  id uuid primary key default gen_random_uuid(),
  ferramenta text not null,
  peso_linear numeric(12,3) default 0,
  comprimento_mm int default 0,
  pcs_por_pallet int default 0,
  ripas_por_pallet int default 0,
  embalagem text default 'pallet', -- pallet | caixa
  pcs_por_caixa int default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.configuracoes (
  chave text primary key,
  valor text not null,
  updated_at timestamptz not null default now()
);

-- ============
-- Pedidos e Produção
-- ============
create table if not exists public.pedidos (
  id uuid primary key default gen_random_uuid(),
  pedido_seq text not null unique,
  pedido_cliente text,
  cliente text,
  dt_fatura date,
  produto text,
  descricao text,
  unidade text default 'PC',
  qtd_pedido numeric(18,3) default 0,
  saldo_a_prod numeric(18,3) default 0,
  estoque_aca numeric(18,3) default 0,
  separado numeric(18,3) default 0,
  faturado numeric(18,3) default 0,
  item_perfil text,
  nro_op text,
  status text default 'pendente',
  dados_originais jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_pedidos_cliente on public.pedidos (cliente);
create index if not exists idx_pedidos_produto on public.pedidos (produto);

create table if not exists public.apontamentos (
  id uuid primary key default gen_random_uuid(),
  operador text,
  maquina text,
  produto text,
  cliente text,
  inicio timestamptz not null,
  fim timestamptz,
  quantidade numeric(18,3) default 0,
  qtd_pedido numeric(18,3),
  nro_op text,
  perfil_longo text,
  comprimento_acabado_mm int,
  ordem_trabalho text, -- Pedido/Seq
  observacoes text,
  rack_ou_pallet text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_apontamentos_inicio on public.apontamentos (inicio);
create index if not exists idx_apontamentos_operador on public.apontamentos (operador);
create index if not exists idx_apontamentos_maquina on public.apontamentos (maquina);
create index if not exists idx_apontamentos_ordem on public.apontamentos (ordem_trabalho);

-- ============
-- Dados • Lotes (importados da planilha)
-- ============
create table if not exists public.lotes (
  id uuid primary key default gen_random_uuid(),
  pedido_seq text not null,
  codigo text,            -- número do amarrado
  situacao text,
  produto text,           -- terceira coluna "Produto" da planilha
  lote text not null,
  rack_embalagem text not null,
  embalagem_data date,
  romaneio text,
  nota_fiscal text,
  qt_kg numeric(18,3),
  qtd_pc numeric(18,3),
  dados_originais jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_lotes_pedido_seq on public.lotes (pedido_seq);
create index if not exists idx_lotes_rack on public.lotes (rack_embalagem);
create index if not exists idx_lotes_lote on public.lotes (lote);
create index if not exists idx_lotes_codigo on public.lotes (codigo);

create table if not exists public.paradas (
  id uuid primary key default gen_random_uuid(),
  maquina text not null,
  motivo_parada text not null,
  tipo_parada text not null,
  inicio timestamptz not null,
  fim timestamptz,
  observacoes text,
  created_at timestamptz not null default now()
);
create index if not exists idx_paradas_inicio on public.paradas (inicio);
create index if not exists idx_paradas_maquina on public.paradas (maquina);
create index if not exists idx_paradas_tipo on public.paradas (tipo_parada);

-- ============
-- RLS (Row Level Security)
-- ============
alter table public.tipos_parada enable row level security;
alter table public.motivos_parada enable row level security;
alter table public.maquinas enable row level security;
alter table public.ferramentas_cfg enable row level security;
alter table public.configuracoes enable row level security;
alter table public.pedidos enable row level security;
alter table public.apontamentos enable row level security;
alter table public.paradas enable row level security;
alter table public.lotes enable row level security;

-- Políticas mínimas (abrangentes) para ambiente inicial de desenvolvimento
-- ATENÇÃO: Ajuste para regras por usuário/role depois.
drop policy if exists p_select_tipos_parada on public.tipos_parada;
create policy p_select_tipos_parada on public.tipos_parada for select using (true);
drop policy if exists p_ins_tipos_parada on public.tipos_parada;
create policy p_ins_tipos_parada on public.tipos_parada for insert with check (true);
drop policy if exists p_upd_tipos_parada on public.tipos_parada;
create policy p_upd_tipos_parada on public.tipos_parada for update using (true);
drop policy if exists p_del_tipos_parada on public.tipos_parada;
create policy p_del_tipos_parada on public.tipos_parada for delete using (true);

drop policy if exists p_select_motivos_parada on public.motivos_parada;
create policy p_select_motivos_parada on public.motivos_parada for select using (true);
drop policy if exists p_ins_motivos_parada on public.motivos_parada;
create policy p_ins_motivos_parada on public.motivos_parada for insert with check (true);
drop policy if exists p_upd_motivos_parada on public.motivos_parada;
create policy p_upd_motivos_parada on public.motivos_parada for update using (true);
drop policy if exists p_del_motivos_parada on public.motivos_parada;
create policy p_del_motivos_parada on public.motivos_parada for delete using (true);

drop policy if exists p_select_maquinas on public.maquinas;
create policy p_select_maquinas on public.maquinas for select using (true);
drop policy if exists p_ins_maquinas on public.maquinas;
create policy p_ins_maquinas on public.maquinas for insert with check (true);
drop policy if exists p_upd_maquinas on public.maquinas;
create policy p_upd_maquinas on public.maquinas for update using (true);
drop policy if exists p_del_maquinas on public.maquinas;
create policy p_del_maquinas on public.maquinas for delete using (true);

drop policy if exists p_select_cfg on public.ferramentas_cfg;
create policy p_select_cfg on public.ferramentas_cfg for select using (true);
drop policy if exists p_ins_cfg on public.ferramentas_cfg;
create policy p_ins_cfg on public.ferramentas_cfg for insert with check (true);
drop policy if exists p_upd_cfg on public.ferramentas_cfg;
create policy p_upd_cfg on public.ferramentas_cfg for update using (true);
drop policy if exists p_del_cfg on public.ferramentas_cfg;
create policy p_del_cfg on public.ferramentas_cfg for delete using (true);

drop policy if exists p_select_config on public.configuracoes;
create policy p_select_config on public.configuracoes for select using (true);
drop policy if exists p_upd_config on public.configuracoes;
create policy p_upd_config on public.configuracoes for update using (true);
drop policy if exists p_ins_config on public.configuracoes;
create policy p_ins_config on public.configuracoes for insert with check (true);
drop policy if exists p_del_config on public.configuracoes;
create policy p_del_config on public.configuracoes for delete using (true);

drop policy if exists p_select_pedidos on public.pedidos;
create policy p_select_pedidos on public.pedidos for select using (true);
drop policy if exists p_ins_pedidos on public.pedidos;
create policy p_ins_pedidos on public.pedidos for insert with check (true);
drop policy if exists p_upd_pedidos on public.pedidos;
create policy p_upd_pedidos on public.pedidos for update using (true);
drop policy if exists p_del_pedidos on public.pedidos;
create policy p_del_pedidos on public.pedidos for delete using (true);

drop policy if exists p_select_apont on public.apontamentos;
create policy p_select_apont on public.apontamentos for select using (true);
drop policy if exists p_ins_apont on public.apontamentos;
create policy p_ins_apont on public.apontamentos for insert with check (true);
drop policy if exists p_upd_apont on public.apontamentos;
create policy p_upd_apont on public.apontamentos for update using (true);
drop policy if exists p_del_apont on public.apontamentos;
create policy p_del_apont on public.apontamentos for delete using (true);

drop policy if exists p_select_lotes on public.lotes;
create policy p_select_lotes on public.lotes for select using (true);
drop policy if exists p_ins_lotes on public.lotes;
create policy p_ins_lotes on public.lotes for insert with check (true);
drop policy if exists p_upd_lotes on public.lotes;
create policy p_upd_lotes on public.lotes for update using (true);
drop policy if exists p_del_lotes on public.lotes;
create policy p_del_lotes on public.lotes for delete using (true);

drop policy if exists p_select_paradas on public.paradas;
create policy p_select_paradas on public.paradas for select using (true);
drop policy if exists p_ins_paradas on public.paradas;
create policy p_ins_paradas on public.paradas for insert with check (true);
drop policy if exists p_upd_paradas on public.paradas;
create policy p_upd_paradas on public.paradas for update using (true);
drop policy if exists p_del_paradas on public.paradas;
create policy p_del_paradas on public.paradas for delete using (true);

-- Campos adicionais em pedidos (compatibilidade com importador)
alter table if exists public.pedidos
  add column if not exists dt_implant_item date,
  add column if not exists prazo integer,
  add column if not exists qt_saldo_op numeric(18,3),
  add column if not exists em_wip numeric(18,3),
  add column if not exists saldo_a_fat numeric(18,3),
  add column if not exists unidade_mp text,
  add column if not exists estoque_mp numeric(18,3),
  add column if not exists peso_barra numeric(18,3),
  add column if not exists cod_cliente text,
  add column if not exists situacao_item_pedido text,
  add column if not exists efetivado boolean,
  add column if not exists item_do_cliente text,
  add column if not exists representante text,
  add column if not exists fam_comercial text,
  add column if not exists operacao_atual text,
  add column if not exists qtd_operacao_finalizadas integer,
  add column if not exists qtd_operacao_total integer,
  add column if not exists data_ultimo_reporte timestamptz,
  add column if not exists prioridade integer,
  add column if not exists observacoes text;

create index if not exists idx_pedidos_pedido_seq on public.pedidos(pedido_seq);
create index if not exists idx_pedidos_pedido_cliente on public.pedidos(pedido_cliente);
create index if not exists idx_pedidos_nro_op on public.pedidos(nro_op);
