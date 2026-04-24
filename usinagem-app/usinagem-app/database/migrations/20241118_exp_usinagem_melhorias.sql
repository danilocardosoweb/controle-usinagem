-- =============================================================================
-- MIGRATION: Melhorias EXP Usinagem
-- Data: 18/11/2024
-- Autor: Cascade AI
-- Descrição: Adiciona campos para baixa de estoque e índices de performance
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PARTE 1: ADICIONAR CAMPOS PARA BAIXA DE ESTOQUE
-- -----------------------------------------------------------------------------

-- Adicionar campos em exp_pedidos_movimentacoes para baixa de estoque
ALTER TABLE exp_pedidos_movimentacoes 
ADD COLUMN IF NOT EXISTS tipo_baixa VARCHAR(50),
ADD COLUMN IF NOT EXISTS quantidade_pc INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS quantidade_kg NUMERIC(10,2) DEFAULT 0;

-- Comentários dos campos
COMMENT ON COLUMN exp_pedidos_movimentacoes.tipo_baixa IS 
'Tipo de baixa de estoque: consumo (uso interno) ou venda (saída comercial)';

COMMENT ON COLUMN exp_pedidos_movimentacoes.quantidade_pc IS 
'Quantidade em peças para movimentações de baixa de estoque';

COMMENT ON COLUMN exp_pedidos_movimentacoes.quantidade_kg IS 
'Quantidade em kg para movimentações de baixa de estoque';

-- -----------------------------------------------------------------------------
-- PARTE 2: CRIAR ÍNDICES PARA PERFORMANCE
-- -----------------------------------------------------------------------------

-- Índices para tabela apontamentos
CREATE INDEX IF NOT EXISTS idx_apontamentos_exp_fluxo_id 
ON apontamentos(exp_fluxo_id);

CREATE INDEX IF NOT EXISTS idx_apontamentos_unidade_stage 
ON apontamentos(exp_unidade, exp_stage);

CREATE INDEX IF NOT EXISTS idx_apontamentos_created_at 
ON apontamentos(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_apontamentos_lote 
ON apontamentos(lote) WHERE lote IS NOT NULL;

-- Índices para tabela exp_pedidos_movimentacoes
CREATE INDEX IF NOT EXISTS idx_movimentacoes_fluxo_id 
ON exp_pedidos_movimentacoes(fluxo_id);

CREATE INDEX IF NOT EXISTS idx_movimentacoes_tipo 
ON exp_pedidos_movimentacoes(tipo_movimentacao);

CREATE INDEX IF NOT EXISTS idx_movimentacoes_data 
ON exp_pedidos_movimentacoes(movimentado_em DESC);

CREATE INDEX IF NOT EXISTS idx_movimentacoes_tipo_baixa 
ON exp_pedidos_movimentacoes(tipo_baixa) WHERE tipo_baixa IS NOT NULL;

-- Índices para tabela exp_pedidos_fluxo
CREATE INDEX IF NOT EXISTS idx_fluxo_tipo 
ON exp_pedidos_fluxo(tipo);

CREATE INDEX IF NOT EXISTS idx_fluxo_status 
ON exp_pedidos_fluxo(status) WHERE status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fluxo_alunica_stage 
ON exp_pedidos_fluxo(alunica_stage) WHERE alunica_stage IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fluxo_origem 
ON exp_pedidos_fluxo(origem);

CREATE INDEX IF NOT EXISTS idx_fluxo_importado_id 
ON exp_pedidos_fluxo(importado_id) WHERE importado_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fluxo_pedido_id 
ON exp_pedidos_fluxo(pedido_id) WHERE pedido_id IS NOT NULL;

-- Índices para tabela inventarios_usinagem
CREATE INDEX IF NOT EXISTS idx_inventarios_unidade 
ON inventarios_usinagem(unidade);

CREATE INDEX IF NOT EXISTS idx_inventarios_status 
ON inventarios_usinagem(status);

CREATE INDEX IF NOT EXISTS idx_inventarios_criado_em 
ON inventarios_usinagem(criado_em DESC);

-- Índices para tabela inventarios_usinagem_itens
CREATE INDEX IF NOT EXISTS idx_inventarios_itens_inventario_id 
ON inventarios_usinagem_itens(inventario_id);

CREATE INDEX IF NOT EXISTS idx_inventarios_itens_fluxo_id 
ON inventarios_usinagem_itens(fluxo_id);

-- -----------------------------------------------------------------------------
-- PARTE 3: VALIDAÇÃO E ESTATÍSTICAS
-- -----------------------------------------------------------------------------

-- Atualizar estatísticas das tabelas
ANALYZE apontamentos;
ANALYZE exp_pedidos_movimentacoes;
ANALYZE exp_pedidos_fluxo;
ANALYZE inventarios_usinagem;
ANALYZE inventarios_usinagem_itens;

-- Verificar campos adicionados
DO $$
BEGIN
    RAISE NOTICE '=== Verificação de Campos ===';
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exp_pedidos_movimentacoes' 
        AND column_name = 'tipo_baixa'
    ) THEN
        RAISE NOTICE '✅ Campo tipo_baixa existe';
    ELSE
        RAISE WARNING '❌ Campo tipo_baixa NÃO existe';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exp_pedidos_movimentacoes' 
        AND column_name = 'quantidade_pc'
    ) THEN
        RAISE NOTICE '✅ Campo quantidade_pc existe';
    ELSE
        RAISE WARNING '❌ Campo quantidade_pc NÃO existe';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exp_pedidos_movimentacoes' 
        AND column_name = 'quantidade_kg'
    ) THEN
        RAISE NOTICE '✅ Campo quantidade_kg existe';
    ELSE
        RAISE WARNING '❌ Campo quantidade_kg NÃO existe';
    END IF;
END $$;

-- Listar índices criados
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN (
    'apontamentos', 
    'exp_pedidos_movimentacoes', 
    'exp_pedidos_fluxo',
    'inventarios_usinagem',
    'inventarios_usinagem_itens'
)
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- =============================================================================
-- FIM DA MIGRATION
-- =============================================================================

-- Rollback (se necessário):
/*
-- Remover campos
ALTER TABLE exp_pedidos_movimentacoes 
DROP COLUMN IF EXISTS tipo_baixa,
DROP COLUMN IF EXISTS quantidade_pc,
DROP COLUMN IF EXISTS quantidade_kg;

-- Remover índices
DROP INDEX IF EXISTS idx_apontamentos_exp_fluxo_id;
DROP INDEX IF EXISTS idx_apontamentos_unidade_stage;
DROP INDEX IF EXISTS idx_apontamentos_created_at;
DROP INDEX IF EXISTS idx_apontamentos_lote;
DROP INDEX IF EXISTS idx_movimentacoes_fluxo_id;
DROP INDEX IF EXISTS idx_movimentacoes_tipo;
DROP INDEX IF EXISTS idx_movimentacoes_data;
DROP INDEX IF EXISTS idx_movimentacoes_tipo_baixa;
DROP INDEX IF EXISTS idx_fluxo_tipo;
DROP INDEX IF EXISTS idx_fluxo_status;
DROP INDEX IF EXISTS idx_fluxo_alunica_stage;
DROP INDEX IF EXISTS idx_fluxo_origem;
DROP INDEX IF EXISTS idx_fluxo_importado_id;
DROP INDEX IF EXISTS idx_fluxo_pedido_id;
DROP INDEX IF EXISTS idx_inventarios_unidade;
DROP INDEX IF EXISTS idx_inventarios_status;
DROP INDEX IF EXISTS idx_inventarios_criado_em;
DROP INDEX IF EXISTS idx_inventarios_itens_inventario_id;
DROP INDEX IF EXISTS idx_inventarios_itens_fluxo_id;
*/
