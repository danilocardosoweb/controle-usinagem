// Script de teste para verificar se os campos item_perfil e item_do_cliente estão sendo extraídos corretamente

// Simulação de uma linha do arquivo Excel
const testRow = {
    'pedido': '12345/10',
    'cliente': 'Cliente Teste',
    'Item.Perfil': 'EXP908155000NANV',
    'Item do Cliente': 'PERFIL CLIENTE ESPECIAL',
    'data entrega': '15/12/2025',
    'ferramenta': 'EXP908',
    'pedido kg': '100,50',
    'pedido pc': '25'
};

// Importar as funções do utils
import { 
    mapRowToImportadoRecord, 
    extractFromSources,
    normalizeKey 
} from './frontend/src/utils/expUsinagem.js';

console.log('=== TESTE DE EXTRAÇÃO DE CAMPOS ===');
console.log('Linha original:', testRow);

// Testar extractFromSources diretamente
console.log('\n--- Teste extractFromSources ---');
const itemPerfil = extractFromSources([testRow], ['item.perfil', 'item perfil', 'perfil', 'perfil longo', 'item_perfil']);
const itemDoCliente = extractFromSources([testRow], ['item.do.cliente', 'item do cliente', 'item_do_cliente']);

console.log('item_perfil extraído:', itemPerfil);
console.log('item_do_cliente extraído:', itemDoCliente);

// Testar mapRowToImportadoRecord
console.log('\n--- Teste mapRowToImportadoRecord ---');
const importadoRecord = mapRowToImportadoRecord(testRow, { arquivoNome: 'teste.xlsx' });
console.log('Registro importado:', JSON.stringify(importadoRecord, null, 2));

// Verificar se os campos estão em dados_originais
if (importadoRecord && importadoRecord.dados_brutos) {
    console.log('\n--- Verificação em dados_brutos ---');
    console.log('item_perfil em dados_brutos:', importadoRecord.dados_brutos.item_perfil);
    console.log('item_do_cliente em dados_brutos:', importadoRecord.dados_brutos.item_do_cliente);
}

console.log('\n=== FIM DO TESTE ===');
