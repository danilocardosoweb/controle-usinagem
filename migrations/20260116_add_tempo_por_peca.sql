-- Migração: Adicionar campos de Tempo por Peça para ferramentas
-- Data: 16/01/2026
-- Descrição: Adiciona campos para calcular uso de ferramentas baseado em apontamentos

-- 1. Adicionar campo de produtos (array de produtos que a ferramenta fabrica)
ALTER TABLE public.ferramentas_cfg
ADD COLUMN IF NOT EXISTS produtos jsonb;

-- 2. Adicionar campo de tempo por peça (minutos)
ALTER TABLE public.ferramentas_cfg
ADD COLUMN IF NOT EXISTS tempo_por_peca numeric(10,2);

-- 3. Comentários
COMMENT ON COLUMN public.ferramentas_cfg.produtos IS 'Array de produtos que esta ferramenta fabrica';
COMMENT ON COLUMN public.ferramentas_cfg.tempo_por_peca IS 'Tempo médio por peça em minutos';
