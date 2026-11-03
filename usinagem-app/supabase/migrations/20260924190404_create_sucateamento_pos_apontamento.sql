create table public.apontamentos_sucata (
  id uuid primary key default gen_random_uuid(),
  apontamento_id uuid not null references public.apontamentos(id) on delete restrict,
  ordem_producao text,
  produto text,
  ferramenta text,
  lote text,
  rack_ou_pallet text,
  unidade text not null default 'PC' check (unidade in ('PC', 'KG')),
  quantidade_produzida_original numeric(18,3) not null check (quantidade_produzida_original >= 0),
  peso_produzido_original_kg numeric(18,3) check (peso_produzido_original_kg is null or peso_produzido_original_kg >= 0),
  quantidade_sucateada numeric(18,3) not null check (quantidade_sucateada > 0),
  peso_sucateado_kg numeric(18,3) check (peso_sucateado_kg is null or peso_sucateado_kg >= 0),
  motivo_codigo text not null check (motivo_codigo in (
    'dimensional', 'risco', 'amassado', 'torcao', 'empenamento',
    'acabamento', 'extrusao', 'usinagem', 'embalagem', 'qualidade', 'outro'
  )),
  categoria_motivo text not null default 'qualidade',
  observacao text,
  origem_reprovacao text not null default 'qualidade',
  evidencia_url text,
  usuario_solicitante uuid references public.usuarios(id) on delete restrict,
  usuario_responsavel uuid not null references public.usuarios(id) on delete restrict,
  status text not null default 'ativo' check (status in ('ativo', 'estornado')),
  estornado_por uuid references public.usuarios(id) on delete restrict,
  estornado_em timestamptz,
  motivo_estorno text,
  observacao_estorno text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint apontamentos_sucata_estorno_completo check (
    (status = 'ativo' and estornado_por is null and estornado_em is null and motivo_estorno is null)
    or
    (status = 'estornado' and estornado_por is not null and estornado_em is not null and nullif(trim(motivo_estorno), '') is not null)
  )
);

create index apontamentos_sucata_apontamento_ativo_idx
  on public.apontamentos_sucata (apontamento_id)
  where status = 'ativo';

create index apontamentos_sucata_created_at_idx
  on public.apontamentos_sucata (created_at desc);

alter table public.apontamentos_sucata enable row level security;

create policy "leitura de sucateamentos"
  on public.apontamentos_sucata
  for select
  to anon, authenticated
  using (true);

revoke insert, update, delete on public.apontamentos_sucata from anon, authenticated;
grant select on public.apontamentos_sucata to anon, authenticated;

create or replace function public.registrar_sucateamento_apontamento(
  p_apontamento_id uuid,
  p_quantidade numeric,
  p_peso_sucateado_kg numeric,
  p_peso_produzido_original_kg numeric,
  p_motivo_codigo text,
  p_categoria_motivo text,
  p_observacao text,
  p_origem_reprovacao text,
  p_evidencia_url text,
  p_usuario_solicitante uuid,
  p_usuario_responsavel uuid
)
returns public.apontamentos_sucata
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_apontamento public.apontamentos%rowtype;
  v_usuario public.usuarios%rowtype;
  v_ja_sucateado numeric(18,3);
  v_peso_ja_sucateado numeric(18,3);
  v_saldo numeric(18,3);
  v_peso_original numeric(18,3);
  v_unidade text;
  v_resultado public.apontamentos_sucata%rowtype;
begin
  select * into v_usuario
  from public.usuarios
  where id = p_usuario_responsavel and ativo is not false;

  if not found then
    raise exception 'Usuario responsavel invalido ou inativo.' using errcode = 'P0001';
  end if;

  if lower(trim(v_usuario.nivel_acesso)) not in (
    'admin', 'administrador', 'administrator', 'superadmin', 'supervisor'
  ) then
    raise exception 'Apenas supervisores ou administradores podem confirmar o sucateamento.' using errcode = '42501';
  end if;

  if p_quantidade is null or p_quantidade <= 0 then
    raise exception 'A quantidade a sucatear deve ser maior que zero.' using errcode = '22023';
  end if;

  if p_peso_sucateado_kg is not null and p_peso_sucateado_kg < 0 then
    raise exception 'O peso a sucatear nao pode ser negativo.' using errcode = '22023';
  end if;

  select * into v_apontamento
  from public.apontamentos
  where id = p_apontamento_id
  for update;

  if not found then
    raise exception 'Apontamento nao encontrado.' using errcode = 'P0002';
  end if;

  select coalesce(sum(quantidade_sucateada), 0),
         coalesce(sum(peso_sucateado_kg), 0),
         max(peso_produzido_original_kg)
    into v_ja_sucateado, v_peso_ja_sucateado, v_peso_original
  from public.apontamentos_sucata
  where apontamento_id = p_apontamento_id
    and status = 'ativo';

  v_saldo := coalesce(v_apontamento.quantidade, 0) - v_ja_sucateado;
  if p_quantidade > v_saldo then
    raise exception 'Quantidade solicitada (%) excede o saldo disponivel (%).', p_quantidade, v_saldo using errcode = '22003';
  end if;

  v_peso_original := coalesce(v_peso_original, p_peso_produzido_original_kg);
  if p_peso_sucateado_kg is not null
     and v_peso_original is not null
     and p_peso_sucateado_kg > greatest(v_peso_original - v_peso_ja_sucateado, 0) then
    raise exception 'Peso solicitado excede o saldo de peso disponivel.' using errcode = '22003';
  end if;

  v_unidade := case
    when upper(trim(coalesce(v_apontamento.unidade, 'PC'))) = 'KG' then 'KG'
    else 'PC'
  end;

  if v_unidade = 'PC' and p_quantidade <> trunc(p_quantidade) then
    raise exception 'A quantidade em pecas deve ser inteira.' using errcode = '22023';
  end if;

  insert into public.apontamentos_sucata (
    apontamento_id, ordem_producao, produto, ferramenta, lote, rack_ou_pallet,
    unidade, quantidade_produzida_original, peso_produzido_original_kg,
    quantidade_sucateada, peso_sucateado_kg, motivo_codigo, categoria_motivo,
    observacao, origem_reprovacao, evidencia_url,
    usuario_solicitante, usuario_responsavel
  ) values (
    v_apontamento.id,
    coalesce(v_apontamento.ordem_trabalho, v_apontamento.pedido_seq),
    v_apontamento.produto,
    split_part(coalesce(v_apontamento.produto, ''), '-', 1),
    coalesce(v_apontamento.lote_externo, v_apontamento.lote),
    coalesce(v_apontamento.rack_acabado, v_apontamento.rack_ou_pallet),
    v_unidade,
    coalesce(v_apontamento.quantidade, 0),
    v_peso_original,
    p_quantidade,
    p_peso_sucateado_kg,
    lower(trim(p_motivo_codigo)),
    coalesce(nullif(trim(p_categoria_motivo), ''), 'qualidade'),
    nullif(trim(p_observacao), ''),
    coalesce(nullif(trim(p_origem_reprovacao), ''), 'qualidade'),
    nullif(trim(p_evidencia_url), ''),
    coalesce(p_usuario_solicitante, p_usuario_responsavel),
    p_usuario_responsavel
  )
  returning * into v_resultado;

  return v_resultado;
end;
$$;

create or replace function public.estornar_sucateamento_apontamento(
  p_sucateamento_id uuid,
  p_usuario_responsavel uuid,
  p_motivo_estorno text,
  p_observacao_estorno text default null
)
returns public.apontamentos_sucata
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_sucata public.apontamentos_sucata%rowtype;
  v_usuario public.usuarios%rowtype;
begin
  select * into v_usuario
  from public.usuarios
  where id = p_usuario_responsavel and ativo is not false;

  if not found or lower(trim(v_usuario.nivel_acesso)) not in (
    'admin', 'administrador', 'administrator', 'superadmin', 'supervisor'
  ) then
    raise exception 'Apenas supervisores ou administradores podem estornar sucateamentos.' using errcode = '42501';
  end if;

  if nullif(trim(p_motivo_estorno), '') is null then
    raise exception 'Informe o motivo do estorno.' using errcode = '22023';
  end if;

  select s.* into v_sucata
  from public.apontamentos_sucata s
  join public.apontamentos a on a.id = s.apontamento_id
  where s.id = p_sucateamento_id
  for update of s, a;

  if not found then
    raise exception 'Sucateamento nao encontrado.' using errcode = 'P0002';
  end if;

  if v_sucata.status <> 'ativo' then
    raise exception 'Este sucateamento ja foi estornado.' using errcode = '22023';
  end if;

  update public.apontamentos_sucata
  set status = 'estornado',
      estornado_por = p_usuario_responsavel,
      estornado_em = now(),
      motivo_estorno = trim(p_motivo_estorno),
      observacao_estorno = nullif(trim(p_observacao_estorno), ''),
      updated_at = now()
  where id = p_sucateamento_id
  returning * into v_sucata;

  return v_sucata;
end;
$$;

revoke all on function public.registrar_sucateamento_apontamento(uuid,numeric,numeric,numeric,text,text,text,text,text,uuid,uuid) from public;
revoke all on function public.estornar_sucateamento_apontamento(uuid,uuid,text,text) from public;
grant execute on function public.registrar_sucateamento_apontamento(uuid,numeric,numeric,numeric,text,text,text,text,text,uuid,uuid) to anon, authenticated;
grant execute on function public.estornar_sucateamento_apontamento(uuid,uuid,text,text) to anon, authenticated;

create view public.vw_apontamentos_saldos
with (security_invoker = true)
as
select
  a.*,
  coalesce(s.quantidade_sucateada, 0)::numeric(18,3) as quantidade_sucateada,
  greatest(coalesce(a.quantidade, 0) - coalesce(s.quantidade_sucateada, 0), 0)::numeric(18,3) as quantidade_liquida,
  coalesce(s.peso_sucateado_kg, 0)::numeric(18,3) as peso_sucateado_kg,
  s.ultimo_sucateamento_em,
  coalesce(s.eventos_ativos, 0)::integer as eventos_sucata_ativos
from public.apontamentos a
left join (
  select apontamento_id,
         sum(quantidade_sucateada) as quantidade_sucateada,
         sum(coalesce(peso_sucateado_kg, 0)) as peso_sucateado_kg,
         max(created_at) as ultimo_sucateamento_em,
         count(*) as eventos_ativos
  from public.apontamentos_sucata
  where status = 'ativo'
  group by apontamento_id
) s on s.apontamento_id = a.id;

grant select on public.vw_apontamentos_saldos to anon, authenticated;

comment on table public.apontamentos_sucata is
  'Eventos auditaveis de sucateamento posterior, sem alterar a producao bruta do apontamento original.';
comment on view public.vw_apontamentos_saldos is
  'Apontamentos com producao bruta, sucata pos-apontamento e saldo liquido calculado.';
