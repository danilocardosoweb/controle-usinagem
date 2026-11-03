create index if not exists apontamentos_sucata_usuario_solicitante_idx
  on public.apontamentos_sucata (usuario_solicitante);

create index if not exists apontamentos_sucata_usuario_responsavel_idx
  on public.apontamentos_sucata (usuario_responsavel);

create index if not exists apontamentos_sucata_estornado_por_idx
  on public.apontamentos_sucata (estornado_por)
  where estornado_por is not null;

create index if not exists apontamentos_sucata_ordem_idx
  on public.apontamentos_sucata (ordem_producao);

create index if not exists apontamentos_sucata_produto_idx
  on public.apontamentos_sucata (produto);
