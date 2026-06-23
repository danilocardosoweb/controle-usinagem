alter table public.it_digitais
  add column if not exists avanco_maquina numeric(12,3)
  check (avanco_maquina is null or avanco_maquina >= 0);

comment on column public.it_digitais.avanco_maquina is 'Avanco/velocidade da maquina definida na ficha de processo da IT Digital.';
