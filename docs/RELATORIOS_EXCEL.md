# Sistema de Relatórios Excel - Usinagem

## Visão Geral

O sistema de relatórios foi completamente reformulado para gerar arquivos Excel nativos (.xlsx) com formatação profissional e múltiplas funcionalidades avançadas.

## Funcionalidades Implementadas

### 1. **Geração Excel Nativa**
- Arquivos `.xlsx` verdadeiros (não CSV)
- Formatação automática de colunas
- Auto-ajuste de largura baseado no conteúdo
- Suporte a múltiplas abas em um único arquivo

### 2. **Tipos de Relatórios Disponíveis**

#### **Produção por Período**
- **Aba**: "Produção por Período"
- **Dados**: Apontamentos detalhados com data, hora, máquina, operador, produto, quantidade
- **Campos especiais**: Ferramenta extraída, refugo, rack/pallet, quantidade do pedido

#### **Paradas de Máquina**
- **Aba**: "Paradas de Máquina"
- **Dados**: Histórico de paradas com motivo, tipo, duração
- **Campos**: Data, máquina, motivo, tipo (Setup/Manutenção/etc), início, fim, duração em minutos

#### **Desempenho por Operador/Máquina**
- **Aba**: "Desempenho por Operador/Máquina"
- **Dados**: Produtividade agregada por operador e máquina
- **Campos**: Operador, máquina, produção total, minutos trabalhados, produção por hora

#### **OEE Detalhado**
- **Aba**: "OEE Detalhado"
- **Dados**: Indicadores de eficiência por dia e máquina
- **Campos**: Data, máquina, produção, tempo produção, tempo paradas

#### **Estimativa de Expedição**
- **Aba**: "Estimativa de Expedição"
- **Dados**: Cálculos de embalagem por ferramenta
- **Campos**: Ferramenta, comprimento, quantidade, estimativas de pallets/caixas/ripas, peso

#### **Produtividade (Itens)**
- **Aba**: "Produtividade (Itens)"
- **Dados**: Análise de produtividade por item específico
- **Campos**: Ferramenta, comprimento, médias por hora e por dia

#### **Rastreabilidade (Amarrados/Lotes)**
- **Duas abas**:
  - **"Rastreabilidade (Detalhado)"**: Uma linha por amarrado
  - **"Rastreabilidade (Compacto)"**: Amarrados concatenados por apontamento
- **Dados**: Rastreabilidade completa da matéria-prima ao produto final

## Funcionalidades Avançadas

### 1. **Botão "Gerar Relatório"**
- Gera o relatório selecionado no filtro
- Nome do arquivo: `{TipoRelatorio}_{Timestamp}.xlsx`
- Uma aba com o nome do relatório

### 2. **Botão "Gerar Todos os Relatórios"** ⭐ NOVO
- Gera **TODOS** os tipos de relatório em um único arquivo
- Nome do arquivo: `Relatorios_Completos_{Timestamp}.xlsx`
- **Múltiplas abas** (uma para cada tipo de relatório)
- Rastreabilidade com **duas abas** (Detalhado + Compacto)
- Filtra automaticamente abas vazias

### 3. **Formatação Automática**
```javascript
// Auto-ajuste de largura das colunas
const colWidths = []
headers.forEach((header, index) => {
  let maxWidth = header.length
  rows.forEach(row => {
    const cellValue = String(row[header] || '')
    if (cellValue.length > maxWidth) {
      maxWidth = cellValue.length
    }
  })
  // Limite máximo de 50 caracteres por coluna
  colWidths[index] = { wch: Math.min(maxWidth + 2, 50) }
})
```

### 4. **Nomenclatura Inteligente**
- **Timestamp ISO**: `20251014080530` (AAAAMMDDHHMMSS)
- **Nomes de aba limitados**: 31 caracteres (padrão Excel)
- **Caracteres especiais removidos** dos nomes de arquivo

## Estrutura Técnica

### Biblioteca Utilizada
```javascript
import * as XLSX from 'xlsx'
```

### Funções Principais

#### `downloadExcel(rows, fileName, sheetName)`
- Gera arquivo Excel com uma aba
- Auto-formatação de colunas
- Tratamento de erros robusto

#### `downloadExcelMultiSheet(sheetsData, fileName)`
- Gera arquivo Excel com múltiplas abas
- Array de objetos: `{ data: [], name: 'Nome da Aba' }`
- Filtra abas vazias automaticamente

#### `handleGerarTodosRelatorios()`
- Itera por todos os tipos de relatório
- Gera dados para cada tipo
- Consolida em um único arquivo Excel

## Filtros Aplicados

Todos os relatórios respeitam os filtros configurados:
- **Data Início/Fim**: Filtra por período
- **Máquina**: Filtra por máquina específica
- **Operador**: Filtra por operador específico
- **Modo** (apenas Rastreabilidade): Detalhado ou Compacto

## Tratamento de Erros

### Logs Detalhados
```javascript
console.log(`Excel gerado: ${fileName}.xlsx com ${rows.length} linhas`)
console.error('Erro ao gerar Excel:', error)
```

### Alertas para o Usuário
- Sem dados: "Sem dados para exportar"
- Erro de geração: "Erro ao gerar arquivo Excel: {detalhes}"
- Sucesso: "Arquivo Excel gerado com X abas de relatórios!"

## Vantagens do Sistema

### ✅ **Excel Nativo vs CSV**
| Aspecto | CSV (Anterior) | Excel (Atual) |
|---------|----------------|---------------|
| **Formato** | Texto separado | Binário Excel |
| **Múltiplas abas** | ❌ | ✅ |
| **Formatação** | Básica | Avançada |
| **Auto-ajuste colunas** | ❌ | ✅ |
| **Compatibilidade** | Limitada | Total |

### ✅ **Benefícios Operacionais**
1. **Um clique, todos os relatórios**: Botão consolidado
2. **Organização por abas**: Fácil navegação
3. **Formatação profissional**: Colunas ajustadas automaticamente
4. **Nomes padronizados**: Timestamp para organização
5. **Tratamento de erros**: Sistema robusto e confiável

## Exemplos de Uso

### Relatório Individual
1. Selecionar tipo de relatório
2. Configurar filtros (datas, máquina, operador)
3. Clicar "Gerar Relatório"
4. Arquivo baixado: `Producao_por_Periodo_20251014080530.xlsx`

### Relatórios Consolidados
1. Configurar filtros gerais
2. Clicar "Gerar Todos os Relatórios"
3. Arquivo baixado: `Relatorios_Completos_20251014080530.xlsx`
4. **8 abas** com todos os tipos de relatório

## Manutenção e Extensibilidade

### Adicionar Novo Tipo de Relatório
1. Adicionar entrada em `tiposRelatorio`
2. Implementar case em `buildRows()`
3. Automaticamente incluído no "Gerar Todos"

### Personalizar Formatação
- Modificar `colWidths` para larguras específicas
- Ajustar `cellStyles: true` para estilos avançados
- Implementar formatação condicional se necessário

## Status Atual

✅ **Implementado e Funcional**
- Geração Excel nativa
- Todos os tipos de relatório
- Múltiplas abas
- Auto-formatação
- Tratamento de erros
- Botão consolidado

🔄 **Próximas Melhorias Possíveis**
- Formatação condicional (cores, bordas)
- Gráficos incorporados
- Fórmulas Excel automáticas
- Templates personalizados por tipo
