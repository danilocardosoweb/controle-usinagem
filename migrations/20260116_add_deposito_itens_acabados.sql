-- Migração: Adicionar coluna de depósito para itens acabados
-- Data: 16/01/2026
-- Descrição: Adiciona campo deposito para rastrear localização do item (Alúnica ou Tecnoperfil)

BEGIN;

-- Adicionar coluna deposito à tabela apontamentos
ALTER TABLE public.apontamentos
  ADD COLUMN IF NOT EXISTS deposito text DEFAULT 'alunica' CHECK (deposito IN ('alunica', 'tecnoperfil'));

-- Criar índice para busca rápida por depósito
CREATE INDEX IF NOT EXISTS idx_apontamentos_deposito ON public.apontamentos(deposito);

-- Adicionar comentário ao novo campo
COMMENT ON COLUMN public.apontamentos.deposito IS 'Depósito onde o item acabado está armazenado (alunica ou tecnoperfil)';

-- Criar tabela de histórico de movimentação de depósitos
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

-- Adicionar comentário à tabela
COMMENT ON TABLE public.movimentacoes_deposito IS 'Histórico de movimentações de itens acabados entre depósitos (Alúnica e Tecnoperfil)';

COMMIT;
