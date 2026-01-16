-- ============================================================================
-- SCRIPT PARA ZERAR DADOS DA ABA EXP - USINAGEM
-- Data: 25/11/2025
-- Descrição: Remove todos os dados de apontamentos, fluxos e movimentações
--            mantendo a estrutura das tabelas intacta
-- ============================================================================

-- ⚠️ CUIDADO: Este script é destrutivo! Faça backup antes de executar!

BEGIN;

-- 1. Deletar apontamentos
DELETE FROM apontamentos 
WHERE exp_unidade IN ('alunica', 'tecno-perfil');

-- 2. Deletar movimentações
DELETE FROM exp_pedidos_movimentacoes;

-- 3. Deletar fluxos
DELETE FROM exp_pedidos_fluxo;

-- 4. Deletar baixas de estoque
DELETE FROM exp_estoque_baixas;

-- 5. Resetar sequências (se necessário)
-- Descomente as linhas abaixo se quiser resetar os IDs para começar do 1
-- ALTER SEQUENCE apontamentos_id_seq RESTART WITH 1;
-- ALTER SEQUENCE exp_pedidos_fluxo_id_seq RESTART WITH 1;
-- ALTER SEQUENCE exp_pedidos_movimentacoes_id_seq RESTART WITH 1;
-- ALTER SEQUENCE exp_estoque_baixas_id_seq RESTART WITH 1;

COMMIT;

-- ============================================================================
-- VERIFICAÇÃO: Executar após o script para confirmar que tudo foi zerado
-- ============================================================================

-- SELECT COUNT(*) as "Apontamentos" FROM apontamentos WHERE exp_unidade IN ('alunica', 'tecno-perfil');
-- SELECT COUNT(*) as "Fluxos" FROM exp_pedidos_fluxo;
-- SELECT COUNT(*) as "Movimentações" FROM exp_pedidos_movimentacoes;
-- SELECT COUNT(*) as "Baixas" FROM exp_estoque_baixas;
