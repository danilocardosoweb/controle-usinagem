-- ============================================================
-- ARQUIVO CONSOLIDADO DE MIGRAÇÕES - EXECUTAR NO SUPABASE
-- Data: 16/01/2026
-- ============================================================
-- Este arquivo contém TODAS as migrações necessárias para
-- as funcionalidades implementadas na aba Estoque.
-- Copie e execute no SQL Editor do Supabase.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. CAMPOS PARA CADASTRO INTELIGENTE DE FERRAMENTAS CNC
-- ============================================================

ALTER TABLE public.ferramentas_cfg
  ADD COLUMN IF NOT EXISTS corpo_mm numeric(10,2),
  ADD COLUMN IF NOT EXISTS quant_pcs int,
  ADD COLUMN IF NOT EXISTS vida_valor int,
  ADD COLUMN IF NOT EXISTS vida_unidade text DEFAULT 'horas' CHECK (vida_unidade IN ('dias', 'horas', 'semanas', 'meses')),
  ADD COLUMN IF NOT EXISTS ultima_troca date,
  ADD COLUMN IF NOT EXISTS numero_serial text;

-- Criar índices para otimização
CREATE INDEX IF NOT EXISTS idx_ferramentas_cfg_numero_serial ON public.ferramentas_cfg(numero_serial);
CREATE INDEX IF NOT EXISTS idx_ferramentas_cfg_ferramenta_serial ON public.ferramentas_cfg(ferramenta, numero_serial);

-- Comentários descritivos
COMMENT ON COLUMN public.ferramentas_cfg.corpo_mm IS 'Diâmetro ou corpo da ferramenta em milímetros';
COMMENT ON COLUMN public.ferramentas_cfg.quant_pcs IS 'Quantidade de peças da ferramenta';
COMMENT ON COLUMN public.ferramentas_cfg.vida_valor IS 'Valor da vida útil da ferramenta (em horas de corte, dias, semanas ou meses)';
COMMENT ON COLUMN public.ferramentas_cfg.vida_unidade IS 'Unidade de medida da vida útil (dias, horas, semanas, meses)';
COMMENT ON COLUMN public.ferramentas_cfg.ultima_troca IS 'Data da última troca ou afiação da ferramenta';
COMMENT ON COLUMN public.ferramentas_cfg.numero_serial IS 'Número serial para diferenciar ferramentas idênticas (ex: 001, 002)';

-- ============================================================
-- 2. CAMPOS PARA DEPÓSITO DE ITENS ACABADOS
-- ============================================================

ALTER TABLE public.apontamentos
  ADD COLUMN IF NOT EXISTS deposito text DEFAULT 'alunica' CHECK (deposito IN ('alunica', 'tecnoperfil'));

-- Criar índice para busca rápida por depósito
CREATE INDEX IF NOT EXISTS idx_apontamentos_deposito ON public.apontamentos(deposito);

-- Comentário descritivo
COMMENT ON COLUMN public.apontamentos.deposito IS 'Depósito onde o item acabado está armazenado (alunica ou tecnoperfil)';

-- ============================================================
-- 3. TABELA DE HISTÓRICO DE MOVIMENTAÇÃO DE DEPÓSITOS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.movimentacoes_deposito (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apontamento_id UUID NOT NULL REFERENCES public.apontamentos(id) ON DELETE CASCADE,
  deposito_origem text NOT NULL,
  deposito_destino text NOT NULL,
  movimentado_por text,
  movimentado_em TIMESTAMPTZ DEFAULT timezone('utc', now()),
  motivo text,
  observacao text
);

-- Criar índices para a tabela de movimentação
CREATE INDEX IF NOT EXISTS idx_movimentacoes_deposito_apontamento ON public.movimentacoes_deposito(apontamento_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_deposito_data ON public.movimentacoes_deposito(movimentado_em);

-- Comentário descritivo
COMMENT ON TABLE public.movimentacoes_deposito IS 'Histórico de movimentações de itens acabados entre depósitos (Alúnica e Tecnoperfil)';

-- ============================================================
-- 4. NOTIFICAR SUPABASE PARA RECARREGAR SCHEMA
-- ============================================================

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ============================================================
-- INSTRUÇÕES DE EXECUÇÃO:
-- ============================================================
-- 1. Abra o Supabase Dashboard
-- 2. Vá para SQL Editor
-- 3. Clique em "New Query"
-- 4. Cole TODO o conteúdo deste arquivo
-- 5. Clique em "Run" ou pressione Ctrl+Enter
-- 6. Aguarde a execução completar
-- 7. Recarregue o navegador (F5) no aplicativo
-- ============================================================
