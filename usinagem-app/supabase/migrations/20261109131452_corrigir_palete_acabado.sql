create or replace function public.corrigir_apontamento_auditado(
  p_apontamento_id uuid,
  p_usuario_id uuid,
  p_esperado jsonb,
  p_alteracoes jsonb,
  p_motivo text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_inicial public.apontamentos%rowtype;
  v_atual public.apontamentos%rowtype;
  v_novo public.apontamentos%rowtype;
  v_esperado public.apontamentos%rowtype;
  v_origem text;
  v_destino text;
  v_campo text;
  v_campos text[] := array[]::text[];
  v_antes jsonb := '{}'::jsonb;
  v_depois jsonb := '{}'::jsonb;
  v_id uuid;
begin
  if (auth.uid() is not null and auth.uid() is distinct from p_usuario_id)
     or not exists (
       select 1 from public.usuarios u
       where u.id = p_usuario_id and u.ativo is not false
         and lower(trim(u.nivel_acesso)) in ('admin', 'administrador', 'administrator', 'superadmin')
     ) then
    raise exception 'Apenas administradores podem corrigir apontamentos.' using errcode = '42501';
  end if;
  if nullif(trim(p_motivo), '') is null then
    raise exception 'Informe o motivo da correcao.';
  end if;
  if jsonb_typeof(p_alteracoes) is distinct from 'object'
     or jsonb_typeof(p_esperado) is distinct from 'object'
     or p_alteracoes = '{}'::jsonb then
    raise exception 'Nenhum campo foi alterado.';
  end if;
  for v_campo in select jsonb_object_keys(p_alteracoes) loop
    if v_campo not in ('quantidade', 'inicio', 'fim', 'operador', 'maquina',
                       'rack_acabado', 'rack_ou_pallet', 'lote_externo', 'observacoes')
       or not (p_esperado ? v_campo) then
      raise exception 'Campo invalido para correcao: %', v_campo;
    end if;
  end loop;

  if p_alteracoes ? 'rack_acabado' then
    v_destino := upper(trim(coalesce(p_alteracoes->>'rack_acabado', '')));
    if v_destino = '' then
      raise exception 'Informe o numero do palete acabado.';
    end if;
    p_alteracoes := jsonb_set(p_alteracoes, '{rack_acabado}', to_jsonb(v_destino));
  end if;

  if p_alteracoes ?| array['rack_acabado', 'rack_ou_pallet'] then
    select * into strict v_inicial from public.apontamentos where id = p_apontamento_id;
    v_novo := jsonb_populate_record(v_inicial, p_alteracoes);
    v_origem := upper(coalesce(nullif(trim(v_inicial.rack_acabado), ''), nullif(trim(v_inicial.rack_ou_pallet), ''), ''));
    v_destino := upper(coalesce(nullif(trim(v_novo.rack_acabado), ''), nullif(trim(v_novo.rack_ou_pallet), ''), ''));

    -- Same lock order as the rack transfer RPC.
    if v_origem <> v_destino then
      perform pg_advisory_xact_lock(hashtextextended(least(v_origem, v_destino), 0));
      perform pg_advisory_xact_lock(hashtextextended(greatest(v_origem, v_destino), 0));
    end if;
  end if;

  select * into strict v_atual from public.apontamentos where id = p_apontamento_id for update;
  if v_origem is not null and
     (v_atual.rack_acabado is distinct from v_inicial.rack_acabado
      or v_atual.rack_ou_pallet is distinct from v_inicial.rack_ou_pallet) then
    raise exception 'O palete foi alterado. Reabra o apontamento antes de corrigir.';
  end if;
  v_esperado := jsonb_populate_record(null::public.apontamentos, p_esperado);
  v_novo := jsonb_populate_record(v_atual, p_alteracoes);
  for v_campo in select jsonb_object_keys(p_alteracoes) loop
    if (to_jsonb(v_atual)->v_campo) is distinct from (to_jsonb(v_esperado)->v_campo) then
      raise exception 'O campo % foi alterado. Reabra o apontamento antes de corrigir.', v_campo;
    end if;
    if (to_jsonb(v_atual)->v_campo) is distinct from (to_jsonb(v_novo)->v_campo) then
      v_campos := array_append(v_campos, v_campo);
      v_antes := v_antes || jsonb_build_object(v_campo, to_jsonb(v_atual)->v_campo);
      v_depois := v_depois || jsonb_build_object(v_campo, to_jsonb(v_novo)->v_campo);
    end if;
  end loop;
  if cardinality(v_campos) = 0 then
    raise exception 'Nenhum campo foi alterado.';
  end if;

  if v_origem <> v_destino then
    if exists (select 1 from public.rack_movimentacoes m where m.apontamento_id = p_apontamento_id)
       or exists (select 1 from public.apontamentos_sucata s where s.apontamento_id = p_apontamento_id) then
      raise exception 'Este apontamento tem movimentacao ou sucata. Use o fluxo de transferencia entre racks.';
    end if;
    if exists (
      select 1 from public.expedicao_romaneio_itens i
      join public.expedicao_romaneios r on r.id = i.romaneio_id
      where coalesce(r.status, '') <> 'cancelado'
        and (i.apontamento_id = p_apontamento_id
             or upper(trim(coalesce(nullif(i.rack_ou_pallet, ''), i.rack, ''))) in (nullif(v_origem, ''), nullif(v_destino, '')))
    ) then
      raise exception 'O apontamento ou um dos paletes esta vinculado a um romaneio nao cancelado.';
    end if;
  end if;

  update public.apontamentos set
    quantidade = v_novo.quantidade, inicio = v_novo.inicio, fim = v_novo.fim,
    operador = v_novo.operador, maquina = v_novo.maquina,
    rack_acabado = v_novo.rack_acabado, rack_ou_pallet = v_novo.rack_ou_pallet,
    lote_externo = v_novo.lote_externo, observacoes = v_novo.observacoes
  where id = p_apontamento_id;
  if not found then
    raise exception 'Nao foi possivel atualizar o apontamento.' using errcode = '42501';
  end if;

  insert into public.apontamentos_correcoes (
    apontamento_id, valor_anterior, valor_novo, campos_alterados, corrigido_por, motivo_correcao
  ) values (
    p_apontamento_id, v_antes, v_depois, v_campos, p_usuario_id, trim(p_motivo)
  ) returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.corrigir_apontamento_auditado(uuid, uuid, jsonb, jsonb, text) from public;
grant execute on function public.corrigir_apontamento_auditado(uuid, uuid, jsonb, jsonb, text) to anon, authenticated;
