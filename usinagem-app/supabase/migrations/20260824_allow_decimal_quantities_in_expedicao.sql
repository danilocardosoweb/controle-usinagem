-- Quantidades em KG podem ter casas decimais. A conversao preserva os valores inteiros existentes.
alter table public.expedicao_romaneio_itens
  alter column quantidade type numeric(18,3)
  using quantidade::numeric;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'expedicao_romaneio_itens'
      and column_name = 'quantidade_conferida'
  ) then
    alter table public.expedicao_romaneio_itens
      alter column quantidade_conferida type numeric(18,3)
      using quantidade_conferida::numeric;
  end if;
end
$$;

alter table public.expedicao_romaneio_itens
  add column if not exists unidade text not null default 'PC';

update public.expedicao_romaneio_itens
set unidade = 'PC'
where unidade is null or btrim(unidade) = '';

alter table public.expedicao_romaneio_itens
  drop constraint if exists expedicao_romaneio_itens_unidade_check;

alter table public.expedicao_romaneio_itens
  add constraint expedicao_romaneio_itens_unidade_check
  check (unidade in ('PC', 'KG'));
