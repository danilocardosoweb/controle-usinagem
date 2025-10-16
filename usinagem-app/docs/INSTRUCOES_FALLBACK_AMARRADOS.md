# Instruções para Implementar Fallback Automático de Amarrados

## Objetivo
Quando o usuário informar apenas o **Rack** (sem selecionar amarrados específicos), o sistema deve automaticamente registrar todos os amarrados daquele rack para o mesmo produto em `amarrados_detalhados`.

## Arquivo a ser editado
`frontend/src/pages/ApontamentosUsinagem.jsx`

## Localização da edição
Dentro da função `concluirRegistro()`, logo após o bloco que monta `amarradosDetalhados` a partir de `formData.lotesExternos` e **antes** de criar `payloadDB`.

## Código a ser inserido

```javascript
// Fallback por Rack/Produto: se não houve seleção explícita de amarrados (lotesExternos),
// mas o operador informou o Rack e temos o produto do apontamento, consideramos que todos
// os amarrados daquele rack e item foram processados e registramos para rastreabilidade.
if (amarradosDetalhados.length === 0) {
  const rackAlvo = String(rackOuPallet || formData.rack_ou_pallet || '').trim()
  const produtoAlvo = String(formData.codigoPerfil || '').trim()
  if (rackAlvo && produtoAlvo) {
    const candidatos = (lotesDB || []).filter(l => {
      const rackOk = String(l.rack_embalagem || '').trim() === rackAlvo
      const prodL = String(l.produto || getCampoOriginalLote(l, 'Produto') || '').trim()
      const prodOk = !!prodL && prodL === produtoAlvo
      return rackOk && prodOk
    })
    for (const loteDetalhado of candidatos) {
      amarradosDetalhados.push({
        codigo: String(loteDetalhado.codigo || '').trim(),
        rack: String(loteDetalhado.rack_embalagem || '').trim(),
        lote: String(loteDetalhado.lote || '').trim(),
        produto: String(loteDetalhado.produto || getCampoOriginalLote(loteDetalhado, 'Produto') || '').trim(),
        pedido_seq: String(loteDetalhado.pedido_seq || '').trim(),
        romaneio: String(loteDetalhado.romaneio || '').trim(),
        qt_kg: Number(loteDetalhado.qt_kg || 0),
        qtd_pc: Number(loteDetalhado.qtd_pc || 0),
        situacao: String(loteDetalhado.situacao || '').trim(),
        embalagem_data: loteDetalhado.embalagem_data || null,
        nota_fiscal: String(loteDetalhado.nota_fiscal || '').trim()
      })
    }
  }
}
```

## Onde inserir exatamente
1. Localize a linha que contém: `const amarradosDetalhados = []`
2. Encontre o bloco que faz o loop em `formData.lotesExternos`
3. Logo após o fechamento desse bloco (após o `}` do loop), insira o código acima
4. Certifique-se de que está **antes** da linha: `const payloadDB = {`

## Resultado esperado
- Quando o usuário apontar apenas informando o "Rack" (ex: 4115) e o produto (ex: TR0018176505NANV), o sistema automaticamente encontrará todos os amarrados daquele rack para aquele produto e os salvará em `amarrados_detalhados`.
- No relatório de rastreabilidade, esses amarrados aparecerão individualmente (uma linha por amarrado) ou concatenados (modo compacto).

## Validação
Após implementar:
1. Faça um apontamento informando apenas o Rack (sem selecionar amarrados específicos)
2. Vá em Relatórios > Rastreabilidade
3. Verifique se os amarrados do rack aparecem nas colunas de "Amarrado Código", "Amarrado Lote", etc.
