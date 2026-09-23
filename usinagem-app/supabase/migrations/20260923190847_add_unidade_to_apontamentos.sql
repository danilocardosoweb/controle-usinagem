-- Preserva a unidade comercial usada no apontamento para que a expedicao nao
-- dependa da carteira atual, que pode ser substituida por novas importacoes.
alter table public.apontamentos
  add column if not exists unidade text;

update public.apontamentos a
set unidade = case
  when upper(trim(p.unidade)) in ('KG', 'KGS', 'QUILO', 'QUILOS') then 'KG'
  when upper(trim(p.unidade)) in ('PC', 'PCS', 'PÇ', 'PÇS', 'PECA', 'PEÇA', 'PECAS', 'PEÇAS') then 'PC'
  else null
end
from public.pedidos p
where a.unidade is null
  and coalesce(nullif(trim(a.pedido_seq), ''), nullif(trim(a.ordem_trabalho), '')) = trim(p.pedido_seq)
  and p.unidade is not null;

-- Peças não podem ser fracionárias. Essa regra recupera com segurança os
-- apontamentos históricos em KG cujo pedido já saiu da carteira operacional.
update public.apontamentos
set unidade = 'KG'
where unidade is null
  and quantidade is not null
  and quantidade <> trunc(quantidade);

alter table public.apontamentos
  drop constraint if exists apontamentos_unidade_check;

alter table public.apontamentos
  add constraint apontamentos_unidade_check
  check (unidade is null or unidade in ('PC', 'KG'));

comment on column public.apontamentos.unidade is
  'Unidade comercial da quantidade apontada: PC ou KG. Nulo apenas em registros históricos sem identificação segura.';
