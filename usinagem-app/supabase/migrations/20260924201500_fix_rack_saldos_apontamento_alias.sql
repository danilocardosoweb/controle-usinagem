-- Alias explicito usado pelas RPCs e por integracoes que precisam distinguir o ID do apontamento.
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
  end as status_rack,
  a.id as apontamento_id
from chaves c
join public.apontamentos a on a.id = c.apontamento_id
left join movimentos m on m.apontamento_id = c.apontamento_id and m.rack = c.rack
left join sucatas s on s.apontamento_id = c.apontamento_id and s.rack = c.rack;

grant select on public.vw_rack_saldos_detalhados to anon, authenticated;
