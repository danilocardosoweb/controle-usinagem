-- Transferencias entre racks sao eventos imutaveis. A producao original permanece em apontamentos.
create table if not exists public.rack_transferencias (
  id uuid primary key default gen_random_uuid(),
  idempotency_key uuid not null unique,
  apontamento_id uuid not null references public.apontamentos(id) on delete restrict,
  transferencia_original_id uuid references public.rack_transferencias(id) on delete restrict,
  tipo text not null default 'transferencia' check (tipo in ('transferencia', 'estorno')),
  rack_origem text not null,
  rack_destino text not null,
  produto text,
  codigo_peca text,
  ordem_producao text,
  numero_op text,
  lote text,
  ferramenta text,
  unidade text not null default 'PC' check (unidade in ('PC', 'KG')),
  quantidade numeric(18,3) not null check (quantidade > 0),
  peso_kg numeric(18,3) check (peso_kg is null or peso_kg >= 0),
  motivo text not null check (motivo in (
    'reorganizacao', 'rack_cheio', 'separacao_lote', 'preparacao_expedicao',
    'correcao_operacional', 'rack_danificado', 'separacao_parcial', 'outro', 'estorno'
  )),
  observacao text,
  mistura_autorizada boolean not null default false,
  usuario_id uuid not null references public.usuarios(id) on delete restrict,
  status text not null default 'concluida' check (status in ('concluida', 'estornada')),
  estornada_por uuid references public.usuarios(id) on delete restrict,
  estornada_em timestamptz,
  motivo_estorno text,
  observacao_estorno text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rack_transferencias_racks_distintos check (upper(trim(rack_origem)) <> upper(trim(rack_destino))),
  constraint rack_transferencias_estorno_consistente check (
    (status = 'concluida' and estornada_por is null and estornada_em is null and motivo_estorno is null)
    or
    (status = 'estornada' and estornada_por is not null and estornada_em is not null and motivo_estorno is not null)
  )
);

create unique index if not exists rack_transferencias_estorno_unico_idx
  on public.rack_transferencias (transferencia_original_id)
  where transferencia_original_id is not null and tipo = 'estorno';

create index if not exists rack_transferencias_apontamento_idx
  on public.rack_transferencias (apontamento_id, created_at desc);
create index if not exists rack_transferencias_origem_idx
  on public.rack_transferencias (upper(trim(rack_origem)), created_at desc);
create index if not exists rack_transferencias_destino_idx
  on public.rack_transferencias (upper(trim(rack_destino)), created_at desc);
create index if not exists rack_transferencias_usuario_idx
  on public.rack_transferencias (usuario_id, created_at desc);

create table if not exists public.rack_movimentacoes (
  id uuid primary key default gen_random_uuid(),
  transferencia_id uuid not null references public.rack_transferencias(id) on delete restrict,
  apontamento_id uuid not null references public.apontamentos(id) on delete restrict,
  tipo_evento text not null check (tipo_evento in ('transferencia', 'estorno')),
  direcao text not null check (direcao in ('entrada', 'saida')),
  rack text not null,
  rack_contraparte text not null,
  quantidade numeric(18,3) not null check (quantidade > 0),
  quantidade_assinada numeric(18,3) generated always as (
    case when direcao = 'entrada' then quantidade else -quantidade end
  ) stored,
  peso_kg numeric(18,3) check (peso_kg is null or peso_kg >= 0),
  usuario_id uuid not null references public.usuarios(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (transferencia_id, direcao)
);

create index if not exists rack_movimentacoes_saldo_idx
  on public.rack_movimentacoes (apontamento_id, upper(trim(rack)));
create index if not exists rack_movimentacoes_rack_data_idx
  on public.rack_movimentacoes (upper(trim(rack)), created_at desc);
create index if not exists rack_movimentacoes_transferencia_idx
  on public.rack_movimentacoes (transferencia_id);

alter table public.rack_transferencias enable row level security;
alter table public.rack_movimentacoes enable row level security;

drop policy if exists rack_transferencias_leitura on public.rack_transferencias;
create policy rack_transferencias_leitura
  on public.rack_transferencias for select
  to anon, authenticated
  using (true);

drop policy if exists rack_movimentacoes_leitura on public.rack_movimentacoes;
create policy rack_movimentacoes_leitura
  on public.rack_movimentacoes for select
  to anon, authenticated
  using (true);

grant select on public.rack_transferencias, public.rack_movimentacoes to anon, authenticated;
revoke insert, update, delete on public.rack_transferencias, public.rack_movimentacoes from anon, authenticated;

-- Cada linha representa a parcela de um apontamento que esta fisicamente em um rack.
-- A entrada inicial e virtual e vem do registro historico de producao.
create or replace view public.vw_rack_saldos_detalhados
with (security_invoker = true)
as
with movimentos as (
  select
    m.apontamento_id,
    upper(trim(m.rack)) as rack,
    sum(m.quantidade_assinada) as saldo_movimentos,
    sum(m.quantidade) filter (where m.direcao = 'entrada') as entradas_transferencia,
    sum(m.quantidade) filter (where m.direcao = 'saida') as saidas_transferencia,
    max(m.created_at) as ultima_movimentacao_em
  from public.rack_movimentacoes m
  group by m.apontamento_id, upper(trim(m.rack))
), sucatas as (
  select
    s.apontamento_id,
    upper(trim(s.rack_ou_pallet)) as rack,
    sum(s.quantidade_sucateada) as quantidade_sucateada_rack,
    sum(coalesce(s.peso_sucateado_kg, 0)) as peso_sucateado_rack_kg
  from public.apontamentos_sucata s
  where s.status = 'ativo'
    and nullif(trim(s.rack_ou_pallet), '') is not null
  group by s.apontamento_id, upper(trim(s.rack_ou_pallet))
), chaves as (
  select
    a.id as apontamento_id,
    upper(trim(coalesce(nullif(a.rack_acabado, ''), nullif(a.rack_ou_pallet, '')))) as rack
  from public.apontamentos a
  where nullif(trim(coalesce(a.rack_acabado, a.rack_ou_pallet)), '') is not null
  union
  select apontamento_id, rack from movimentos
  union
  select apontamento_id, rack from sucatas
)
select
  a.*,
  c.rack as rack_saldo,
  case
    when c.rack = upper(trim(coalesce(nullif(a.rack_acabado, ''), nullif(a.rack_ou_pallet, ''))))
      then coalesce(a.quantidade, 0)
    else 0
  end::numeric(18,3) as quantidade_inicial_rack,
  coalesce(m.entradas_transferencia, 0)::numeric(18,3) as quantidade_transferida_entrada,
  coalesce(m.saidas_transferencia, 0)::numeric(18,3) as quantidade_transferida_saida,
  coalesce(s.quantidade_sucateada_rack, 0)::numeric(18,3) as quantidade_sucateada_rack,
  greatest(
    case
      when c.rack = upper(trim(coalesce(nullif(a.rack_acabado, ''), nullif(a.rack_ou_pallet, ''))))
        then coalesce(a.quantidade, 0)
      else 0
    end
    + coalesce(m.saldo_movimentos, 0)
    - coalesce(s.quantidade_sucateada_rack, 0),
    0
  )::numeric(18,3) as saldo_quantidade,
  coalesce(s.peso_sucateado_rack_kg, 0)::numeric(18,3) as peso_sucateado_rack_kg,
  m.ultima_movimentacao_em,
  case
    when greatest(
      case
        when c.rack = upper(trim(coalesce(nullif(a.rack_acabado, ''), nullif(a.rack_ou_pallet, ''))))
          then coalesce(a.quantidade, 0)
        else 0
      end + coalesce(m.saldo_movimentos, 0) - coalesce(s.quantidade_sucateada_rack, 0), 0
    ) = 0 then 'vazio'
    else 'em_uso'
  end as status_rack
from chaves c
join public.apontamentos a on a.id = c.apontamento_id
left join movimentos m on m.apontamento_id = c.apontamento_id and m.rack = c.rack
left join sucatas s on s.apontamento_id = c.apontamento_id and s.rack = c.rack;

grant select on public.vw_rack_saldos_detalhados to anon, authenticated;

-- Historico unificado: producao inicial, transferencias e sucateamentos.
create or replace view public.vw_rack_historico
with (security_invoker = true)
as
select
  ('producao:' || a.id::text) as evento_id,
  a.id as apontamento_id,
  null::uuid as transferencia_id,
  'producao'::text as tipo_evento,
  'entrada'::text as direcao,
  upper(trim(coalesce(nullif(a.rack_acabado, ''), nullif(a.rack_ou_pallet, '')))) as rack,
  null::text as rack_contraparte,
  coalesce(a.quantidade, 0)::numeric(18,3) as quantidade,
  a.produto,
  coalesce(a.ordem_trabalho, a.pedido_seq) as ordem_producao,
  a.nro_op as numero_op,
  coalesce(a.lote_externo, a.lote) as lote,
  null::text as motivo,
  a.observacoes as observacao,
  a.operador as usuario_nome,
  coalesce(a.created_at, a.inicio) as data_hora,
  null::uuid as transferencia_original_id
from public.apontamentos a
where nullif(trim(coalesce(a.rack_acabado, a.rack_ou_pallet)), '') is not null
union all
select
  m.id::text,
  m.apontamento_id,
  m.transferencia_id,
  m.tipo_evento,
  m.direcao,
  upper(trim(m.rack)),
  upper(trim(m.rack_contraparte)),
  m.quantidade,
  t.produto,
  t.ordem_producao,
  t.numero_op,
  t.lote,
  t.motivo,
  t.observacao,
  u.nome,
  m.created_at,
  t.transferencia_original_id
from public.rack_movimentacoes m
join public.rack_transferencias t on t.id = m.transferencia_id
left join public.usuarios u on u.id = m.usuario_id
union all
select
  ('sucata:' || s.id::text),
  s.apontamento_id,
  null::uuid,
  'sucateamento'::text,
  'saida'::text,
  upper(trim(s.rack_ou_pallet)),
  null::text,
  s.quantidade_sucateada,
  s.produto,
  s.ordem_producao,
  null::text,
  s.lote,
  s.motivo_codigo,
  s.observacao,
  u.nome,
  s.created_at,
  null::uuid
from public.apontamentos_sucata s
left join public.usuarios u on u.id = s.usuario_responsavel
where s.status = 'ativo';

grant select on public.vw_rack_historico to anon, authenticated;

create or replace function public.registrar_transferencia_rack(
  p_apontamento_id uuid,
  p_rack_origem text,
  p_rack_destino text,
  p_quantidade numeric,
  p_peso_kg numeric,
  p_motivo text,
  p_observacao text,
  p_usuario_id uuid,
  p_idempotency_key uuid,
  p_permitir_mistura boolean default false
)
returns public.rack_transferencias
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_apontamento public.apontamentos%rowtype;
  v_usuario public.usuarios%rowtype;
  v_existente public.rack_transferencias%rowtype;
  v_resultado public.rack_transferencias%rowtype;
  v_origem text := upper(trim(coalesce(p_rack_origem, '')));
  v_destino text := upper(trim(coalesce(p_rack_destino, '')));
  v_unidade text;
  v_saldo_origem numeric(18,3);
  v_incompativeis integer;
  v_origem_bloqueada boolean;
  v_destino_bloqueado boolean;
begin
  select * into v_existente
  from public.rack_transferencias
  where idempotency_key = p_idempotency_key;
  if found then return v_existente; end if;

  select * into v_usuario
  from public.usuarios
  where id = p_usuario_id and ativo is not false;
  if not found or lower(trim(v_usuario.nivel_acesso)) not in (
    'admin', 'administrador', 'administrator', 'superadmin', 'supervisor'
  ) then
    raise exception 'Apenas supervisores ou administradores podem transferir pecas.' using errcode = '42501';
  end if;

  if p_idempotency_key is null then
    raise exception 'Chave de idempotencia obrigatoria.' using errcode = '22023';
  end if;
  if v_origem = '' or v_destino = '' then
    raise exception 'Informe os racks de origem e destino.' using errcode = '22023';
  end if;
  if v_origem = v_destino then
    raise exception 'O rack de destino deve ser diferente do rack de origem.' using errcode = '22023';
  end if;
  if p_quantidade is null or p_quantidade <= 0 then
    raise exception 'A quantidade transferida deve ser maior que zero.' using errcode = '22023';
  end if;
  if p_peso_kg is not null and p_peso_kg < 0 then
    raise exception 'O peso nao pode ser negativo.' using errcode = '22023';
  end if;
  if p_motivo not in (
    'reorganizacao', 'rack_cheio', 'separacao_lote', 'preparacao_expedicao',
    'correcao_operacional', 'rack_danificado', 'separacao_parcial', 'outro'
  ) then
    raise exception 'Motivo da transferencia invalido.' using errcode = '22023';
  end if;

  -- Serializa operacoes que disputem os mesmos racks, independentemente do apontamento.
  perform pg_advisory_xact_lock(hashtextextended(least(v_origem, v_destino), 0));
  perform pg_advisory_xact_lock(hashtextextended(greatest(v_origem, v_destino), 0));

  select * into v_apontamento
  from public.apontamentos
  where id = p_apontamento_id
  for update;
  if not found then
    raise exception 'Apontamento de origem nao encontrado.' using errcode = 'P0002';
  end if;

  v_unidade := case when upper(trim(coalesce(v_apontamento.unidade, 'PC'))) = 'KG' then 'KG' else 'PC' end;
  if v_unidade = 'PC' and p_quantidade <> trunc(p_quantidade) then
    raise exception 'A quantidade em pecas deve ser inteira.' using errcode = '22023';
  end if;

  select coalesce(saldo_quantidade, 0) into v_saldo_origem
  from public.vw_rack_saldos_detalhados
  where apontamento_id = p_apontamento_id and rack_saldo = v_origem;
  v_saldo_origem := coalesce(v_saldo_origem, 0);
  if p_quantidade > v_saldo_origem then
    raise exception 'Quantidade solicitada (%) excede o saldo disponivel no rack % (%).', p_quantidade, v_origem, v_saldo_origem using errcode = '22003';
  end if;

  select exists (
    select 1
    from public.expedicao_romaneio_itens i
    join public.expedicao_romaneios r on r.id = i.romaneio_id
    where upper(trim(coalesce(i.rack_ou_pallet, i.rack, ''))) = v_origem
      and coalesce(r.status, '') <> 'cancelado'
      and coalesce(i.status_item, '') not in ('nao_encontrado', 'divergencia')
  ) into v_origem_bloqueada;
  select exists (
    select 1
    from public.expedicao_romaneio_itens i
    join public.expedicao_romaneios r on r.id = i.romaneio_id
    where upper(trim(coalesce(i.rack_ou_pallet, i.rack, ''))) = v_destino
      and coalesce(r.status, '') <> 'cancelado'
      and coalesce(i.status_item, '') not in ('nao_encontrado', 'divergencia')
  ) into v_destino_bloqueado;
  if v_origem_bloqueada then
    raise exception 'O rack de origem esta bloqueado por um romaneio ativo.' using errcode = '55000';
  end if;
  if v_destino_bloqueado then
    raise exception 'O rack de destino esta bloqueado por um romaneio ativo.' using errcode = '55000';
  end if;

  select count(*) into v_incompativeis
  from public.vw_rack_saldos_detalhados d
  where d.rack_saldo = v_destino
    and d.saldo_quantidade > 0
    and (
      coalesce(trim(d.produto), '') <> coalesce(trim(v_apontamento.produto), '')
      or coalesce(trim(d.ordem_trabalho), '') <> coalesce(trim(v_apontamento.ordem_trabalho), '')
      or coalesce(trim(coalesce(d.lote_externo, d.lote)), '') <> coalesce(trim(coalesce(v_apontamento.lote_externo, v_apontamento.lote)), '')
    );
  if v_incompativeis > 0 and not coalesce(p_permitir_mistura, false) then
    raise exception 'O rack de destino possui produto, OP ou lote diferente. Confirme explicitamente a mistura para continuar.' using errcode = '22023';
  end if;

  insert into public.rack_transferencias (
    idempotency_key, apontamento_id, rack_origem, rack_destino,
    produto, codigo_peca, ordem_producao, numero_op, lote, ferramenta,
    unidade, quantidade, peso_kg, motivo, observacao, mistura_autorizada, usuario_id
  ) values (
    p_idempotency_key, v_apontamento.id, v_origem, v_destino,
    v_apontamento.produto, v_apontamento.codigo_produto_cliente,
    coalesce(v_apontamento.ordem_trabalho, v_apontamento.pedido_seq), v_apontamento.nro_op,
    coalesce(v_apontamento.lote_externo, v_apontamento.lote), split_part(coalesce(v_apontamento.produto, ''), '-', 1),
    v_unidade, p_quantidade, p_peso_kg, p_motivo, nullif(trim(p_observacao), ''),
    coalesce(p_permitir_mistura, false), p_usuario_id
  ) returning * into v_resultado;

  insert into public.rack_movimentacoes (
    transferencia_id, apontamento_id, tipo_evento, direcao, rack, rack_contraparte,
    quantidade, peso_kg, usuario_id
  ) values
    (v_resultado.id, v_apontamento.id, 'transferencia', 'saida', v_origem, v_destino, p_quantidade, p_peso_kg, p_usuario_id),
    (v_resultado.id, v_apontamento.id, 'transferencia', 'entrada', v_destino, v_origem, p_quantidade, p_peso_kg, p_usuario_id);

  return v_resultado;
exception
  when unique_violation then
    select * into v_resultado from public.rack_transferencias where idempotency_key = p_idempotency_key;
    if found then return v_resultado; end if;
    raise;
end;
$$;

create or replace function public.estornar_transferencia_rack(
  p_transferencia_id uuid,
  p_usuario_id uuid,
  p_motivo_estorno text,
  p_observacao_estorno text,
  p_idempotency_key uuid
)
returns public.rack_transferencias
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_original public.rack_transferencias%rowtype;
  v_existente public.rack_transferencias%rowtype;
  v_usuario public.usuarios%rowtype;
  v_resultado public.rack_transferencias%rowtype;
  v_saldo_destino numeric(18,3);
  v_bloqueado boolean;
begin
  select * into v_existente from public.rack_transferencias where idempotency_key = p_idempotency_key;
  if found then return v_existente; end if;

  select * into v_usuario from public.usuarios where id = p_usuario_id and ativo is not false;
  if not found or lower(trim(v_usuario.nivel_acesso)) not in (
    'admin', 'administrador', 'administrator', 'superadmin', 'supervisor'
  ) then
    raise exception 'Apenas supervisores ou administradores podem estornar transferencias.' using errcode = '42501';
  end if;
  if p_idempotency_key is null then
    raise exception 'Chave de idempotencia obrigatoria.' using errcode = '22023';
  end if;
  if nullif(trim(p_motivo_estorno), '') is null then
    raise exception 'Informe o motivo do estorno.' using errcode = '22023';
  end if;

  select * into v_original
  from public.rack_transferencias
  where id = p_transferencia_id and tipo = 'transferencia'
  for update;
  if not found then
    raise exception 'Transferencia original nao encontrada.' using errcode = 'P0002';
  end if;
  if v_original.status <> 'concluida' then
    raise exception 'Esta transferencia ja foi estornada.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(least(v_original.rack_origem, v_original.rack_destino), 0));
  perform pg_advisory_xact_lock(hashtextextended(greatest(v_original.rack_origem, v_original.rack_destino), 0));
  perform 1 from public.apontamentos where id = v_original.apontamento_id for update;

  select coalesce(saldo_quantidade, 0) into v_saldo_destino
  from public.vw_rack_saldos_detalhados
  where apontamento_id = v_original.apontamento_id and rack_saldo = v_original.rack_destino;
  if coalesce(v_saldo_destino, 0) < v_original.quantidade then
    raise exception 'O rack destino original nao possui saldo suficiente para o estorno. Saldo atual: %.', coalesce(v_saldo_destino, 0) using errcode = '22003';
  end if;

  select exists (
    select 1 from public.expedicao_romaneio_itens i
    join public.expedicao_romaneios r on r.id = i.romaneio_id
    where upper(trim(coalesce(i.rack_ou_pallet, i.rack, ''))) in (v_original.rack_origem, v_original.rack_destino)
      and coalesce(r.status, '') <> 'cancelado'
      and coalesce(i.status_item, '') not in ('nao_encontrado', 'divergencia')
  ) into v_bloqueado;
  if v_bloqueado then
    raise exception 'O estorno envolve rack bloqueado por romaneio ativo.' using errcode = '55000';
  end if;

  insert into public.rack_transferencias (
    idempotency_key, apontamento_id, transferencia_original_id, tipo,
    rack_origem, rack_destino, produto, codigo_peca, ordem_producao, numero_op,
    lote, ferramenta, unidade, quantidade, peso_kg, motivo, observacao,
    mistura_autorizada, usuario_id
  ) values (
    p_idempotency_key, v_original.apontamento_id, v_original.id, 'estorno',
    v_original.rack_destino, v_original.rack_origem, v_original.produto, v_original.codigo_peca,
    v_original.ordem_producao, v_original.numero_op, v_original.lote, v_original.ferramenta,
    v_original.unidade, v_original.quantidade, v_original.peso_kg, 'estorno',
    nullif(trim(p_observacao_estorno), ''), true, p_usuario_id
  ) returning * into v_resultado;

  insert into public.rack_movimentacoes (
    transferencia_id, apontamento_id, tipo_evento, direcao, rack, rack_contraparte,
    quantidade, peso_kg, usuario_id
  ) values
    (v_resultado.id, v_original.apontamento_id, 'estorno', 'saida', v_original.rack_destino, v_original.rack_origem, v_original.quantidade, v_original.peso_kg, p_usuario_id),
    (v_resultado.id, v_original.apontamento_id, 'estorno', 'entrada', v_original.rack_origem, v_original.rack_destino, v_original.quantidade, v_original.peso_kg, p_usuario_id);

  update public.rack_transferencias
  set status = 'estornada', estornada_por = p_usuario_id, estornada_em = now(),
      motivo_estorno = trim(p_motivo_estorno), observacao_estorno = nullif(trim(p_observacao_estorno), ''),
      updated_at = now()
  where id = v_original.id;

  return v_resultado;
exception
  when unique_violation then
    select * into v_resultado from public.rack_transferencias where idempotency_key = p_idempotency_key;
    if found then return v_resultado; end if;
    raise;
end;
$$;

revoke all on function public.registrar_transferencia_rack(uuid,text,text,numeric,numeric,text,text,uuid,uuid,boolean) from public;
revoke all on function public.estornar_transferencia_rack(uuid,uuid,text,text,uuid) from public;
grant execute on function public.registrar_transferencia_rack(uuid,text,text,numeric,numeric,text,text,uuid,uuid,boolean) to anon, authenticated;
grant execute on function public.estornar_transferencia_rack(uuid,uuid,text,text,uuid) to anon, authenticated;

-- O sucateamento passa a identificar em qual saldo fisico do apontamento ocorreu.
drop function if exists public.registrar_sucateamento_apontamento(uuid,numeric,numeric,numeric,text,text,text,text,text,uuid,uuid);

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
  p_usuario_responsavel uuid,
  p_rack_ou_pallet text default null
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
  v_saldo_total numeric(18,3);
  v_saldo_rack numeric(18,3);
  v_peso_original numeric(18,3);
  v_unidade text;
  v_rack text;
  v_resultado public.apontamentos_sucata%rowtype;
begin
  select * into v_usuario from public.usuarios where id = p_usuario_responsavel and ativo is not false;
  if not found or lower(trim(v_usuario.nivel_acesso)) not in (
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

  select * into v_apontamento from public.apontamentos where id = p_apontamento_id for update;
  if not found then raise exception 'Apontamento nao encontrado.' using errcode = 'P0002'; end if;

  v_rack := upper(trim(coalesce(nullif(p_rack_ou_pallet, ''), nullif(v_apontamento.rack_acabado, ''), v_apontamento.rack_ou_pallet, '')));
  if v_rack = '' then raise exception 'O apontamento nao possui rack para o sucateamento.' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_rack, 0));

  select coalesce(sum(quantidade_sucateada), 0), coalesce(sum(peso_sucateado_kg), 0), max(peso_produzido_original_kg)
  into v_ja_sucateado, v_peso_ja_sucateado, v_peso_original
  from public.apontamentos_sucata where apontamento_id = p_apontamento_id and status = 'ativo';

  v_saldo_total := coalesce(v_apontamento.quantidade, 0) - v_ja_sucateado;
  if p_quantidade > v_saldo_total then
    raise exception 'Quantidade solicitada (%) excede o saldo total disponivel (%).', p_quantidade, v_saldo_total using errcode = '22003';
  end if;

  select coalesce(saldo_quantidade, 0) into v_saldo_rack
  from public.vw_rack_saldos_detalhados
  where apontamento_id = p_apontamento_id and rack_saldo = v_rack;
  if p_quantidade > coalesce(v_saldo_rack, 0) then
    raise exception 'Quantidade solicitada (%) excede o saldo disponivel no rack % (%).', p_quantidade, v_rack, coalesce(v_saldo_rack, 0) using errcode = '22003';
  end if;

  v_peso_original := coalesce(v_peso_original, p_peso_produzido_original_kg);
  if p_peso_sucateado_kg is not null and v_peso_original is not null
     and p_peso_sucateado_kg > greatest(v_peso_original - v_peso_ja_sucateado, 0) then
    raise exception 'Peso solicitado excede o saldo de peso disponivel.' using errcode = '22003';
  end if;

  v_unidade := case when upper(trim(coalesce(v_apontamento.unidade, 'PC'))) = 'KG' then 'KG' else 'PC' end;
  if v_unidade = 'PC' and p_quantidade <> trunc(p_quantidade) then
    raise exception 'A quantidade em pecas deve ser inteira.' using errcode = '22023';
  end if;

  insert into public.apontamentos_sucata (
    apontamento_id, ordem_producao, produto, ferramenta, lote, rack_ou_pallet,
    unidade, quantidade_produzida_original, peso_produzido_original_kg,
    quantidade_sucateada, peso_sucateado_kg, motivo_codigo, categoria_motivo,
    observacao, origem_reprovacao, evidencia_url, usuario_solicitante, usuario_responsavel
  ) values (
    v_apontamento.id, coalesce(v_apontamento.ordem_trabalho, v_apontamento.pedido_seq),
    v_apontamento.produto, split_part(coalesce(v_apontamento.produto, ''), '-', 1),
    coalesce(v_apontamento.lote_externo, v_apontamento.lote), v_rack, v_unidade,
    coalesce(v_apontamento.quantidade, 0), v_peso_original, p_quantidade, p_peso_sucateado_kg,
    lower(trim(p_motivo_codigo)), coalesce(nullif(trim(p_categoria_motivo), ''), 'qualidade'),
    nullif(trim(p_observacao), ''), coalesce(nullif(trim(p_origem_reprovacao), ''), 'qualidade'),
    nullif(trim(p_evidencia_url), ''), coalesce(p_usuario_solicitante, p_usuario_responsavel), p_usuario_responsavel
  ) returning * into v_resultado;
  return v_resultado;
end;
$$;

revoke all on function public.registrar_sucateamento_apontamento(uuid,numeric,numeric,numeric,text,text,text,text,text,uuid,uuid,text) from public;
grant execute on function public.registrar_sucateamento_apontamento(uuid,numeric,numeric,numeric,text,text,text,text,text,uuid,uuid,text) to anon, authenticated;
