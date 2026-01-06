-- Script para verificar se os campos item_perfil e item_do_cliente estão sendo armazenados corretamente

-- 1. Verificar dados na tabela exp_pedidos_importados
SELECT 
    id,
    arquivo_nome,
    pedido,
    cliente,
    dados_brutos->>'item_perfil' as item_perfil_importado,
    dados_brutos->>'item_do_cliente' as item_do_cliente_importado,
    dados_brutos->>'Item.Perfil' as item_perfil_original,
    dados_brutos->>'Item do Cliente' as item_do_cliente_original,
    importado_em
FROM exp_pedidos_importados 
WHERE dados_brutos IS NOT NULL
ORDER BY importado_em DESC
LIMIT 10;

-- 2. Verificar dados na tabela exp_pedidos_fluxo
SELECT 
    id,
    pedido_seq,
    cliente,
    dados_originais->>'item_perfil' as item_perfil_fluxo,
    dados_originais->>'item_do_cliente' as item_do_cliente_fluxo,
    status_atual,
    criado_em
FROM exp_pedidos_fluxo 
WHERE dados_originais IS NOT NULL
ORDER BY criado_em DESC
LIMIT 10;

-- 3. Verificar se existem pedidos com esses campos preenchidos
SELECT 
    COUNT(*) as total_importados,
    COUNT(CASE WHEN dados_brutos->>'item_perfil' IS NOT NULL THEN 1 END) as com_item_perfil,
    COUNT(CASE WHEN dados_brutos->>'item_do_cliente' IS NOT NULL THEN 1 END) as com_item_do_cliente
FROM exp_pedidos_importados;

-- 4. Verificar apontamentos que usam esses dados
SELECT 
    a.id,
    a.pedido_id,
    f.pedido_seq,
    f.dados_originais->>'item_perfil' as item_perfil,
    f.dados_originais->>'item_do_cliente' as item_do_cliente,
    a.exp_stage,
    a.created_at
FROM apontamentos a
JOIN exp_pedidos_fluxo f ON a.exp_fluxo_id = f.id
WHERE f.dados_originais->>'item_perfil' IS NOT NULL 
   OR f.dados_originais->>'item_do_cliente' IS NOT NULL
ORDER BY a.created_at DESC
LIMIT 10;
