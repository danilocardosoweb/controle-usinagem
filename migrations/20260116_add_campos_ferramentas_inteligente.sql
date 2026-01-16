-- Migração: Adicionar campos para Cadastro Inteligente de Ferramentas CNC
-- Data: 16/01/2026
-- Descrição: Adiciona campos para suportar cadastro inteligente de ferramentas com vida útil, número serial e rastreamento

BEGIN;

-- Adicionar campos para Cadastro Inteligente de Ferramentas CNC
ALTER TABLE public.ferramentas_cfg
  ADD COLUMN IF NOT EXISTS corpo_mm numeric(10,2),
  ADD COLUMN IF NOT EXISTS quant_pcs int,
  ADD COLUMN IF NOT EXISTS vida_valor int,
  ADD COLUMN IF NOT EXISTS vida_unidade text DEFAULT 'horas' CHECK (vida_unidade IN ('dias', 'horas', 'semanas', 'meses')),
  ADD COLUMN IF NOT EXISTS ultima_troca date,
  ADD COLUMN IF NOT EXISTS numero_serial text;

-- Criar índice para busca rápida por numero_serial
CREATE INDEX IF NOT EXISTS idx_ferramentas_cfg_numero_serial ON public.ferramentas_cfg(numero_serial);

-- Criar índice composto para ferramenta + numero_serial (para validação de duplicidade)
CREATE INDEX IF NOT EXISTS idx_ferramentas_cfg_ferramenta_serial ON public.ferramentas_cfg(ferramenta, numero_serial);

-- Adicionar comentários aos novos campos
COMMENT ON COLUMN public.ferramentas_cfg.corpo_mm IS 'Diâmetro ou corpo da ferramenta em milímetros';
COMMENT ON COLUMN public.ferramentas_cfg.quant_pcs IS 'Quantidade de peças da ferramenta';
COMMENT ON COLUMN public.ferramentas_cfg.vida_valor IS 'Valor da vida útil da ferramenta (em horas de corte, dias, semanas ou meses)';
COMMENT ON COLUMN public.ferramentas_cfg.vida_unidade IS 'Unidade de medida da vida útil (dias, horas, semanas, meses)';
COMMENT ON COLUMN public.ferramentas_cfg.ultima_troca IS 'Data da última troca ou afiação da ferramenta';
COMMENT ON COLUMN public.ferramentas_cfg.numero_serial IS 'Número serial para diferenciar ferramentas idênticas (ex: 001, 002)';

COMMIT;
