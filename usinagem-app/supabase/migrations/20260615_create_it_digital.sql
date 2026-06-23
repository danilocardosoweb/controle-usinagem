-- IT Digital para o fluxo de corte guiado da usinagem.
-- A aplicação atual usa autenticação própria sobre a chave pública do Supabase;
-- por isso as policies permitem o papel anon, mantendo a mesma regra das tabelas existentes.

create extension if not exists pgcrypto;

create table if not exists public.it_digitais (
  id uuid primary key default gen_random_uuid(),
  codigo_item text not null,
  codigo_perfil text not null,
  cliente text,
  comprimento_acabado_mm numeric(12,3) not null check (comprimento_acabado_mm > 0),
  tolerancia_menos_mm numeric(10,3) not null default 0.5 check (tolerancia_menos_mm >= 0),
  tolerancia_mais_mm numeric(10,3) not null default 0.5 check (tolerancia_mais_mm >= 0),
  pecas_por_pacote integer check (pecas_por_pacote is null or pecas_por_pacote >= 0),
  quantidade_amarrados integer check (quantidade_amarrados is null or quantidade_amarrados >= 0),
  total_pecas integer check (total_pecas is null or total_pecas >= 0),
  tempo_ciclo_seg numeric(10,2) check (tempo_ciclo_seg is null or tempo_ciclo_seg >= 0),
  setup_minutos numeric(10,2) check (setup_minutos is null or setup_minutos >= 0),
  cortes_por_ciclo integer not null default 1 check (cortes_por_ciclo > 0),
  produtividade_padrao_pcs_hora numeric(12,2) check (produtividade_padrao_pcs_hora is null or produtividade_padrao_pcs_hora >= 0),
  avanco_maquina numeric(12,3) check (avanco_maquina is null or avanco_maquina >= 0),
  barra_original_mm numeric(12,3) check (barra_original_mm is null or barra_original_mm > 0),
  sobra_mm numeric(12,3) check (sobra_mm is null or sobra_mm >= 0),
  arquivo_it_url text,
  objetivo text,
  aplicacao_responsaveis text,
  equipamentos jsonb not null default '[]'::jsonb,
  materiais jsonb not null default '[]'::jsonb,
  epis_obrigatorios jsonb not null default '[]'::jsonb,
  procedimento_operacional jsonb not null default '[]'::jsonb,
  criterios_aprovacao jsonb not null default '[]'::jsonb,
  criterios_reprovacao jsonb not null default '[]'::jsonb,
  status text not null default 'rascunho' check (status in ('rascunho', 'ativa', 'inativa')),
  versao integer not null default 1 check (versao > 0),
  ativo boolean not null default true,
  criado_por text,
  atualizado_por text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (codigo_item, comprimento_acabado_mm, versao)
);

create table if not exists public.it_execucoes (
  id uuid primary key default gen_random_uuid(),
  it_id uuid not null references public.it_digitais(id) on delete restrict,
  item_id text not null,
  codigo_item text not null,
  pedido_seq text,
  operador_id text,
  operador_nome text not null,
  maquina_id text,
  maquina_nome text,
  aberta_em timestamptz not null default now(),
  iniciada_em timestamptz,
  finalizada_em timestamptz,
  checklist jsonb not null default '{}'::jsonb,
  checklist_concluido boolean not null default false,
  medida_primeira_peca_mm numeric(12,3),
  status_validacao_dimensional text not null default 'pendente'
    check (status_validacao_dimensional in ('pendente', 'conforme', 'fora_tolerancia')),
  etapas_concluidas jsonb not null default '[]'::jsonb,
  observacoes text,
  status_final text not null default 'aberta'
    check (status_final in ('aberta', 'pronta', 'em_producao', 'finalizada', 'bloqueada')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_it_digitais_item_medida
  on public.it_digitais (codigo_item, comprimento_acabado_mm) where ativo = true;
create index if not exists idx_it_execucoes_item_data
  on public.it_execucoes (codigo_item, aberta_em desc);
create index if not exists idx_it_execucoes_it_status
  on public.it_execucoes (it_id, status_final);

alter table public.it_digitais enable row level security;
alter table public.it_execucoes enable row level security;

grant select, insert, update on public.it_digitais to anon, authenticated;
grant select, insert, update on public.it_execucoes to anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'it_digitais' and policyname = 'it_digitais_leitura_app') then
    create policy it_digitais_leitura_app on public.it_digitais for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'it_digitais' and policyname = 'it_digitais_insercao_app') then
    create policy it_digitais_insercao_app on public.it_digitais for insert to anon, authenticated with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'it_digitais' and policyname = 'it_digitais_atualizacao_app') then
    create policy it_digitais_atualizacao_app on public.it_digitais for update to anon, authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'it_execucoes' and policyname = 'it_execucoes_leitura_app') then
    create policy it_execucoes_leitura_app on public.it_execucoes for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'it_execucoes' and policyname = 'it_execucoes_insercao_app') then
    create policy it_execucoes_insercao_app on public.it_execucoes for insert to anon, authenticated with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'it_execucoes' and policyname = 'it_execucoes_atualizacao_app') then
    create policy it_execucoes_atualizacao_app on public.it_execucoes for update to anon, authenticated using (true) with check (true);
  end if;
end $$;

comment on table public.it_digitais is 'Instruções de trabalho digitais por item e comprimento de corte.';
comment on table public.it_execucoes is 'Execuções rastreáveis do modo de corte guiado.';
