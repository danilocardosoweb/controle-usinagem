-- O frontend usa autenticação interna e acessa a Data API com a chave anon.
-- Mantemos RLS ativo e liberamos somente as operações usadas por estas telas.

alter table public.checklist_inicio_turno enable row level security;

grant select, insert on table public.checklist_inicio_turno to anon, authenticated;

drop policy if exists checklist_inicio_turno_select_app on public.checklist_inicio_turno;
create policy checklist_inicio_turno_select_app
  on public.checklist_inicio_turno
  for select
  to anon, authenticated
  using (true);

drop policy if exists checklist_inicio_turno_insert_app on public.checklist_inicio_turno;
create policy checklist_inicio_turno_insert_app
  on public.checklist_inicio_turno
  for insert
  to anon, authenticated
  with check (
    status in ('concluido', 'pendente', 'incompleto')
    and total_itens >= 0
    and itens_ok >= 0
    and itens_atencao >= 0
    and itens_problema >= 0
    and itens_ok + itens_atencao + itens_problema <= total_itens
  );

alter table public.historico_acoes enable row level security;
grant insert on table public.historico_acoes to anon, authenticated;

drop policy if exists historico_acoes_insert_app on public.historico_acoes;
create policy historico_acoes_insert_app
  on public.historico_acoes
  for insert
  to anon, authenticated
  with check (true);
