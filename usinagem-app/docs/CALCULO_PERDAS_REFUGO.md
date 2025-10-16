# Cálculo de Perdas de Refugo em KG

## Visão Geral

O sistema agora permite calcular com precisão as perdas de material refugado em quilogramas (kg), considerando:
- Quantidade de peças refugadas
- Comprimento médio das peças refugadas
- Peso linear da ferramenta (cadastrado em "Parâmetros por Ferramenta")

## Campos Adicionados

### Tabela `apontamentos`
1. **`qtd_refugo`** (NUMERIC): Quantidade de peças refugadas
2. **`comprimento_refugo`** (NUMERIC): Comprimento médio das peças refugadas em mm
3. **`dureza_material`** (TEXT): Dureza do material cortado (ex: HRC 45-50)

### Tabela `ferramentas_cfg`
- **`ferramenta`** (TEXT): Código da ferramenta (ex: TR-0018)
- **`peso_linear`** (NUMERIC): Peso linear em kg/mm
- **`comprimento_mm`** (INTEGER): Comprimento padrão da ferramenta
- **`pcs_por_pallet`**, **`ripas_por_pallet`**, **`embalagem`**, **`pcs_por_caixa`**: Parâmetros de expedição

## Fórmula de Cálculo

```javascript
// Peso total de refugo em kg
peso_refugo_kg = qtd_refugo × comprimento_refugo × peso_linear

// Onde:
// - qtd_refugo: número de peças refugadas (PCs)
// - comprimento_refugo: comprimento médio em mm
// - peso_linear: kg/mm (obtido de ferramentas_cfg)
```

## Exemplo Prático

### Dados do Apontamento
- Produto: `TR0018171100NANI`
- Ferramenta extraída: `TR-0018`
- Refugos/Sucata: `5 PCs`
- Comprimento: `850 mm`

### Dados da Ferramenta (ferramentas_cfg)
- Ferramenta: `TR-0018`
- Peso Linear: `0.182 kg/mm`

### Cálculo
```
peso_refugo_kg = 5 × 850 × 0.182
peso_refugo_kg = 773.5 kg
```

## Query SQL para Relatório de Perdas

```sql
SELECT 
  a.id,
  a.ordem_trabalho,
  a.produto,
  -- Extrai ferramenta do código do produto (primeiros 7 caracteres)
  SUBSTRING(a.produto, 1, 7) AS ferramenta,
  a.qtd_refugo,
  a.comprimento_refugo,
  f.peso_linear,
  -- Cálculo do peso de refugo em kg
  (a.qtd_refugo * a.comprimento_refugo * f.peso_linear) AS peso_refugo_kg,
  a.inicio::DATE AS data_apontamento,
  a.operador,
  a.maquina
FROM public.apontamentos a
LEFT JOIN public.ferramentas_cfg f 
  ON SUBSTRING(a.produto, 1, 7) = f.ferramenta
WHERE a.qtd_refugo > 0
  AND a.comprimento_refugo > 0
  AND a.inicio >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY a.inicio DESC;
```

## Relatório Agregado por Ferramenta

```sql
SELECT 
  SUBSTRING(a.produto, 1, 7) AS ferramenta,
  f.peso_linear,
  COUNT(*) AS total_apontamentos,
  SUM(a.qtd_refugo) AS total_pecas_refugadas,
  AVG(a.comprimento_refugo) AS comprimento_medio_mm,
  SUM(a.qtd_refugo * a.comprimento_refugo * f.peso_linear) AS total_perdas_kg,
  -- Custo estimado (assumindo R$ 8,00/kg)
  SUM(a.qtd_refugo * a.comprimento_refugo * f.peso_linear) * 8.00 AS custo_estimado_brl
FROM public.apontamentos a
LEFT JOIN public.ferramentas_cfg f 
  ON SUBSTRING(a.produto, 1, 7) = f.ferramenta
WHERE a.qtd_refugo > 0
  AND a.comprimento_refugo > 0
  AND a.inicio >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY SUBSTRING(a.produto, 1, 7), f.peso_linear
ORDER BY total_perdas_kg DESC;
```

## Implementação no Frontend

### 1. Função auxiliar para extrair ferramenta
```javascript
const extrairFerramenta = (produto) => {
  if (!produto) return ''
  const s = String(produto).toUpperCase()
  const re3 = /^([A-Z]{3})([A-Z0-9]+)/
  const re2 = /^([A-Z]{2})([A-Z0-9]+)/
  
  let letras = ''
  let resto = ''
  let qtdDigitos = 0
  
  let m = s.match(re3)
  if (m) {
    letras = m[1]
    resto = m[2]
    qtdDigitos = 3
  } else {
    m = s.match(re2)
    if (m) {
      letras = m[1]
      resto = m[2]
      qtdDigitos = 4
    } else {
      return ''
    }
  }
  
  let nums = ''
  for (const ch of resto) {
    if (/[0-9]/.test(ch)) {
      nums += ch
    } else if (ch === 'O') {
      nums += '0'
    }
    if (nums.length === qtdDigitos) break
  }
  
  if (nums.length < qtdDigitos) {
    nums = nums.padEnd(qtdDigitos, '0')
  }
  
  return `${letras}-${nums}`
}
```

### 2. Buscar peso linear da ferramenta
```javascript
const buscarPesoLinear = async (ferramenta) => {
  const { data, error } = await supabase
    .from('ferramentas_cfg')
    .select('peso_linear')
    .eq('ferramenta', ferramenta)
    .single()
  
  if (error || !data) return null
  return Number(data.peso_linear || 0)
}
```

### 3. Calcular perdas
```javascript
const calcularPerdasRefugo = (qtdRefugo, comprimentoRefugo, pesoLinear) => {
  const qtd = Number(qtdRefugo || 0)
  const comp = Number(comprimentoRefugo || 0)
  const peso = Number(pesoLinear || 0)
  
  if (qtd <= 0 || comp <= 0 || peso <= 0) return 0
  
  return qtd * comp * peso
}

// Exemplo de uso
const ferramenta = extrairFerramenta('TR0018171100NANI') // 'TR-0018'
const pesoLinear = await buscarPesoLinear(ferramenta)    // 0.182
const perdasKg = calcularPerdasRefugo(5, 850, pesoLinear) // 773.5 kg
```

## Validações Importantes

1. **Ferramenta deve estar cadastrada**: Se a ferramenta não existir em `ferramentas_cfg`, o cálculo retornará `0` ou `null`
2. **Peso linear obrigatório**: Sem o peso linear, não é possível calcular as perdas em kg
3. **Valores positivos**: Todos os valores devem ser maiores que zero para o cálculo ser válido

## Próximos Passos

### Relatório de Perdas (sugestão)
Criar um novo tipo de relatório em `Relatorios.jsx`:
- **Tipo**: "Perdas de Refugo"
- **Filtros**: Data, Ferramenta, Operador, Máquina
- **Colunas**:
  - Data
  - Pedido/Seq
  - Ferramenta
  - Qtd Refugo (PCs)
  - Comprimento (mm)
  - Peso Linear (kg/mm)
  - **Perdas (kg)**
  - Operador
  - Máquina
- **Totalizadores**:
  - Total de peças refugadas
  - Total de perdas em kg
  - Custo estimado (kg × preço/kg)

### Dashboard - KPI de Perdas
Adicionar card no Dashboard:
- **Título**: "Perdas do Mês"
- **Valor**: Total de kg refugado no mês
- **Comparação**: vs mês anterior
- **Meta**: % de refugo aceitável

## Observações

- O peso linear é específico para cada ferramenta e pode variar conforme o material
- Ferramentas com mesmo código mas comprimentos diferentes podem ter pesos lineares diferentes
- É importante manter a tabela `ferramentas_cfg` sempre atualizada
- O comprimento informado no refugo é o comprimento médio das peças refugadas, não o comprimento padrão da ferramenta

---

*Documento criado em: 13/10/2025 17:17*
*Versão: 2.1.0*
