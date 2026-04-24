# Ajustes na Aba Expedição - Fonte de Dados

## 📋 Mudança Realizada

A aba Expedição foi ajustada para buscar dados diretamente dos **Apontamentos de Usinagem** em vez de Apontamentos de Embalagem.

### Motivo
- A embalagem não está sendo muito utilizada no fluxo atual
- Os dados de racks já estão sendo preenchidos nos Apontamentos de Usinagem
- Isso permite que a expedição comece a acompanhar os racks assim que forem apontados na usinagem

## 🔄 Alterações Implementadas

### 1. **Filtro de Racks Prontos**
**Antes:**
```javascript
.filter(a => (a.exp_unidade || '').toLowerCase() === 'embalagem')
```

**Depois:**
```javascript
.filter(a => {
  const temRack = String(a.rack_ou_pallet || '').trim().length > 0
  if (!temRack) return false
  // ... outros filtros
})
```

### 2. **Campos Capturados**
Agora a aba Expedição captura:
- `rack_ou_pallet` - Identificação do rack (obrigatório)
- `produto` ou `codigoPerfil` - Código do perfil/produto
- `quantidade` - Quantidade de peças
- `cliente` - Cliente final
- `pedido_seq` ou `ordemTrabalho` - Ordem de trabalho
- `lote` - Lote de usinagem
- `lote_externo` ou `loteExterno` - Lote MP

### 3. **Tabela de Racks Prontos**
Adicionada coluna **Pedidos** para melhor visualização:
- Rack
- Cliente
- Produtos
- **Pedidos** (novo)
- Peças
- Ações

### 4. **Compatibilidade de Campos**
O código agora trata múltiplas variações de nomes de campos:
- `produto` ou `codigoPerfil`
- `pedido_seq` ou `ordemTrabalho` ou `ordem_trabalho`
- `lote_externo` ou `loteExterno`

## 🎯 Novo Fluxo

```
Apontamento de Usinagem com Rack Preenchido
    ↓
Aparece em "Racks Prontos" na Expedição
    ↓
Selecionar Racks → Novo Romaneio
    ↓
Conferência com Scanner
    ↓
Expedição → Arquivo no Histórico
```

## ✅ Benefícios

✅ Dados em tempo real dos apontamentos de usinagem
✅ Sem dependência de embalagem
✅ Racks aparecem assim que são apontados
✅ Melhor rastreabilidade
✅ Fluxo mais simples e direto

## 📝 Notas

- Apenas apontamentos com `rack_ou_pallet` preenchido aparecem
- Os filtros (data, cliente, produto) funcionam normalmente
- A seleção múltipla e criação de romaneio funcionam como antes
- Todos os dados são capturados corretamente nos itens do romaneio
