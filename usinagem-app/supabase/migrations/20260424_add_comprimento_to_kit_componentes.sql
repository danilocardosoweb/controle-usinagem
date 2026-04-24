-- Adiciona coluna de comprimento à tabela expedicao_kit_componentes

ALTER TABLE public.expedicao_kit_componentes
  ADD COLUMN IF NOT EXISTS comprimento text;

CREATE INDEX IF NOT EXISTS idx_expedicao_kit_componentes_comprimento ON public.expedicao_kit_componentes (comprimento);
