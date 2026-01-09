# Instruções para Adicionar Filtros de Produto e Ferramenta

## Objetivo
Adicionar filtros de **Produto** e **Ferramenta** no relatório de Rastreabilidade para permitir filtragem específica dos dados.

## Arquivo a ser editado
`frontend/src/pages/Relatorios.jsx`

## Alterações necessárias

### 1. Adicionar campos no estado dos filtros
Localize a linha que define o estado `filtros` (aproximadamente linha 6-16) e adicione os novos campos:

```javascript
const [filtros, setFiltros] = useState({
  tipoRelatorio: 'producao',
  dataInicio: '',
  dataFim: '',
  maquina: '',
  operador: '',
  produto: '', // ADICIONAR ESTA LINHA
  ferramenta: '', // ADICIONAR ESTA LINHA
  formato: 'excel',
  modo: 'detalhado'
})
```

### 2. Atualizar a lógica de filtragem
Localize a função `apontamentosFiltrados` (aproximadamente linha 427-438) e substitua o bloco de filtros:

**ENCONTRE:**
```javascript
if (filtros.operador && String(a.operador) !== String(filtros.operador)) return false
return true
```

**SUBSTITUA POR:**
```javascript
if (filtros.operador && String(a.operador) !== String(filtros.operador)) return false

// Filtro por produto
if (filtros.produto) {
  const produtoApontamento = String(a.produto || a.codigoPerfil || '').toLowerCase()
  const produtoFiltro = String(filtros.produto).toLowerCase()
  if (!produtoApontamento.includes(produtoFiltro)) return false
}

// Filtro por ferramenta
if (filtros.ferramenta) {
  const ferramentaApontamento = extrairFerramenta(a.produto || a.codigoPerfil || '').toLowerCase()
  const ferramentaFiltro = String(filtros.ferramenta).toLowerCase()
  if (!ferramentaApontamento.includes(ferramentaFiltro)) return false
}

return true
```

### 3. Adicionar campos na interface do usuário
Localize a seção do formulário de filtros (aproximadamente linha 1018-1095) e adicione os novos campos após o campo "Operador":

```jsx
{/* Após o campo Operador, adicione: */}

{/* Filtro por Produto (apenas para rastreabilidade) */}
{filtros.tipoRelatorio === 'rastreabilidade' && (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      Produto
    </label>
    <input
      type="text"
      name="produto"
      value={filtros.produto}
      onChange={handleChange}
      placeholder="Ex: TR0018171100NANV"
      className="input-field"
    />
  </div>
)}

{/* Filtro por Ferramenta (apenas para rastreabilidade) */}
{filtros.tipoRelatorio === 'rastreabilidade' && (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      Ferramenta
    </label>
    <input
      type="text"
      name="ferramenta"
      value={filtros.ferramenta}
      onChange={handleChange}
      placeholder="Ex: TR-001"
      className="input-field"
    />
  </div>
)}
```

## Como usar após implementar

1. **Acesse Relatórios** > Tipo: "Rastreabilidade (Amarrados/Lotes)"
2. **Novos campos aparecerão:**
   - **Produto**: Digite parte do código do produto (ex: "TR001817")
   - **Ferramenta**: Digite parte do código da ferramenta (ex: "TR-001")
3. **Filtragem em tempo real:**
   - A visualização prévia será filtrada automaticamente
   - A exportação Excel respeitará os filtros aplicados

## Exemplos de uso

- **Filtrar por produto específico**: Digite "TR0018171100NANV" no campo Produto
- **Filtrar por família de ferramentas**: Digite "TR-" no campo Ferramenta
- **Combinar filtros**: Use produto + ferramenta + data para análises específicas

## Resultado esperado

- Filtros aparecem apenas no relatório de Rastreabilidade
- Busca parcial (contém o texto digitado)
- Case-insensitive (não diferencia maiúsculas/minúsculas)
- Funciona tanto na prévia quanto na exportação
- Permite análises focadas em produtos/ferramentas específicos
