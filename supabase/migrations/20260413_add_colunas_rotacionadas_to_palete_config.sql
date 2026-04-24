-- Adiciona suporte à lista de colunas com orientação alternada na tabela palete_config
ALTER TABLE public.palete_config
  ADD COLUMN IF NOT EXISTS colunas_rotacionadas jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Garante que registros antigos tenham o formato correto
UPDATE public.palete_config
SET colunas_rotacionadas = '[]'::jsonb
WHERE colunas_rotacionadas IS NULL;
