# Instruções para Corrigir Coluna "Separado" no Relatório

## Problema Identificado
A coluna "Separado" está aparecendo vazia porque está tentando buscar dados dos apontamentos (`a.separado`), mas essa informação está na tabela `pedidos`, não em `apontamentos`.

## Arquivo a ser editado
`frontend/src/pages/Relatorios.jsx`

## Solução: Fazer join com dados dos pedidos

### 1. Adicionar dados dos pedidos no componente

**ENCONTRE** (aproximadamente linha 18-23):
```javascript
const { items: apontamentos } = useSupabase('apontamentos')
const { items: paradasRaw } = useSupabase('apontamentos_parada')
const { items: ferramentasCfg } = useSupabase('ferramentas_cfg')
const { items: maquinasCat } = useSupabase('maquinas')
const { items: lotesDB } = useSupabase('lotes')
```

**ADICIONE após a última linha:**
```javascript
const { items: pedidosDB } = useSupabase('pedidos')
```

### 2. Criar função para buscar dados do pedido

**ADICIONE** após as funções utilitárias (aproximadamente linha 165):
```javascript
// Busca dados do pedido relacionado ao apontamento
const buscarDadosPedido = (apontamento) => {
  if (!pedidosDB || !apontamento) return null
  
  const pedidoSeq = apontamento.ordemTrabalho || apontamento.ordem_trabalho || apontamento.pedido_seq || ''
  
  // Busca exata primeiro
  let pedido = pedidosDB.find(p => String(p.pedido_seq || '').trim() === String(pedidoSeq).trim())
  
  // Se não encontrou, tenta busca por produto
  if (!pedido && apontamento.produto) {
    pedido = pedidosDB.find(p => String(p.produto || '').trim() === String(apontamento.produto).trim())
  }
  
  return pedido
}
```

### 3. Atualizar a construção das linhas do relatório de produção

**ENCONTRE** (aproximadamente linha 172-185):
```javascript
case 'producao':
  return apontamentosOrdenados.map(a => ({
    Data: brDate(a.inicio),
    Hora: brTime(a.inicio),
    Maquina: maqMap[String(a.maquina)] || a.maquina || '-',
    Operador: a.operador || '-',
    PedidoSeq: a.ordemTrabalho || a.ordem_trabalho || a.pedido_seq || '-',
    Produto: a.produto || a.codigoPerfil || '-',
    Ferramenta: extrairFerramenta(a.produto || a.codigoPerfil) || '-',
    Quantidade: a.quantidade || 0,
    Refugo: a.qtd_refugo || 0,
    RackOuPallet: a.rack_ou_pallet || a.rackOuPallet || '-',
    QtdPedido: a.qtd_pedido ?? a.qtdPedido ?? '-',
    Separado: a.separado ?? a.qtd_separado ?? '-'
  }))
```

**SUBSTITUA POR:**
```javascript
case 'producao':
  return apontamentosOrdenados.map(a => {
    const pedido = buscarDadosPedido(a)
    return {
      Data: brDate(a.inicio),
      Hora: brTime(a.inicio),
      Maquina: maqMap[String(a.maquina)] || a.maquina || '-',
      Operador: a.operador || '-',
      PedidoSeq: a.ordemTrabalho || a.ordem_trabalho || a.pedido_seq || '-',
      Produto: a.produto || a.codigoPerfil || '-',
      Ferramenta: extrairFerramenta(a.produto || a.codigoPerfil) || '-',
      Quantidade: a.quantidade || 0,
      Refugo: a.qtd_refugo || 0,
      RackOuPallet: a.rack_ou_pallet || a.rackOuPallet || '-',
      QtdPedido: pedido?.qtd_pedido ?? a.qtd_pedido ?? a.qtdPedido ?? '-',
      Separado: pedido?.separado ?? pedido?.qtd_separado ?? '-'
    }
  })
```

### 4. Atualizar a visualização prévia do relatório de produção

**ENCONTRE** (aproximadamente linha 587):
```javascript
<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{(a.separado ?? a.qtd_separado ?? '-')}</td>
```

**SUBSTITUA POR:**
```javascript
<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{(() => {
  const pedido = buscarDadosPedido(a)
  return pedido?.separado ?? pedido?.qtd_separado ?? '-'
})()}</td>
```

### 5. Atualizar também a coluna QtdPedido na visualização

**ENCONTRE** (aproximadamente linha 586):
```javascript
<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{(a.qtd_pedido ?? a.qtdPedido ?? '-') }</td>
```

**SUBSTITUA POR:**
```javascript
<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{(() => {
  const pedido = buscarDadosPedido(a)
  return pedido?.qtd_pedido ?? a.qtd_pedido ?? a.qtdPedido ?? '-'
})()}</td>
```

### 6. Atualizar dependências do useMemo

**ENCONTRE** (aproximadamente linha 438):
```javascript
}, [apontamentos, filtros])
```

**SUBSTITUA POR:**
```javascript
}, [apontamentos, filtros, pedidosDB])
```

## Explicação da correção

### Problema original:
- A coluna "Separado" buscava `a.separado` nos apontamentos
- Apontamentos não têm campo "separado" - essa informação está nos pedidos
- Por isso aparecia sempre vazio ("-")

### Solução implementada:
- ✅ Busca dados do pedido relacionado ao apontamento
- ✅ Usa `pedido_seq` ou `produto` para fazer o relacionamento
- ✅ Pega `separado` e `qtd_pedido` do pedido correto
- ✅ Aplica tanto na exportação quanto na visualização

## Resultado esperado

Após implementar:
- ✅ Coluna "Separado" mostrará os valores corretos dos pedidos
- ✅ Coluna "Qtd Pedido" também será mais precisa
- ✅ Relacionamento correto entre apontamentos e pedidos
- ✅ Dados consistentes na exportação e visualização

## Teste após implementação

1. Gere um relatório de "Produção por Período"
2. Verifique se a coluna "Separado" mostra valores numéricos
3. Confirme se os valores batem com os dados da aba "Pedidos e Produtos"
