# Instruções para Corrigir Exportação Excel

## Problema Identificado
Os relatórios estão sendo exportados como arquivos de texto (.csv) ao invés de arquivos Excel (.xlsx) nativos.

## Solução: Implementar exportação XLSX nativa

### Opção 1: Instalar biblioteca XLSX (Recomendado)

#### 1. Instalar dependência
Execute no terminal dentro da pasta `frontend/`:
```bash
npm install xlsx
```

#### 2. Importar a biblioteca no arquivo Relatorios.jsx
Adicione no início do arquivo, após os outros imports:
```javascript
import * as XLSX from 'xlsx'
```

#### 3. Substituir a função downloadCSV por downloadExcel

**ENCONTRE a função `downloadCSV`** (aproximadamente linha 144-166):
```javascript
const downloadCSV = (rows, fileName) => {
  // código atual...
}
```

**SUBSTITUA POR:**
```javascript
const downloadExcel = (rows, fileName) => {
  if (!rows || rows.length === 0) { 
    alert('Sem dados para exportar.') 
    return 
  }

  // Criar workbook e worksheet
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)

  // Configurar larguras das colunas automaticamente
  const colWidths = []
  if (rows.length > 0) {
    Object.keys(rows[0]).forEach((key, index) => {
      const maxLength = Math.max(
        key.length, // tamanho do cabeçalho
        ...rows.map(row => String(row[key] || '').length)
      )
      colWidths[index] = { wch: Math.min(Math.max(maxLength + 2, 10), 50) }
    })
  }
  ws['!cols'] = colWidths

  // Adicionar worksheet ao workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Dados')

  // Gerar e baixar arquivo
  XLSX.writeFile(wb, `${fileName}.xlsx`)
}
```

#### 4. Atualizar as chamadas da função no handleSubmit

**ENCONTRE** (aproximadamente linha 342-348):
```javascript
if ((filtros.formato || 'excel').toLowerCase() === 'excel') {
  downloadCSV(rows, `${label}${suffix}_${Date.now()}`)
} else {
  downloadCSV(rows, `${label}${suffix}_${Date.now()}`)
  alert('Formato PDF ainda não implementado. O arquivo foi exportado em Excel (CSV).')
}
```

**SUBSTITUA POR:**
```javascript
if ((filtros.formato || 'excel').toLowerCase() === 'excel') {
  downloadExcel(rows, `${label}${suffix}_${Date.now()}`)
} else {
  downloadExcel(rows, `${label}${suffix}_${Date.now()}`)
  alert('Formato PDF ainda não implementado. O arquivo foi exportado em Excel (.xlsx).')
}
```

### Opção 2: Melhorar o CSV atual (Alternativa mais simples)

Se preferir não instalar nova dependência, pode melhorar o CSV atual:

#### 1. Corrigir o tipo MIME e extensão

**ENCONTRE na função `downloadCSV`:**
```javascript
const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' })
const url = URL.createObjectURL(blob)
const a = document.createElement('a')
a.href = url
a.download = `${fileName}.csv`
```

**SUBSTITUA POR:**
```javascript
const blob = new Blob(["\ufeff" + csv], { 
  type: 'application/vnd.ms-excel;charset=utf-8;' 
})
const url = URL.createObjectURL(blob)
const a = document.createElement('a')
a.href = url
a.download = `${fileName}.xls` // Mudança de .csv para .xls
```

#### 2. Atualizar o rótulo na interface

**ENCONTRE:**
```jsx
<option value="excel">Excel</option>
```

**SUBSTITUA POR:**
```jsx
<option value="excel">Excel (.xls)</option>
```

## Recomendação

**Use a Opção 1 (biblioteca XLSX)** pois oferece:
- ✅ Arquivos Excel nativos (.xlsx)
- ✅ Formatação adequada de colunas
- ✅ Melhor compatibilidade com Excel
- ✅ Suporte a múltiplas abas (futuro)
- ✅ Formatação de dados (datas, números)

## Resultado esperado

Após implementar a Opção 1:
- ✅ Arquivos baixados como `.xlsx` (Excel nativo)
- ✅ Abrem diretamente no Excel sem problemas
- ✅ Colunas com largura automática
- ✅ Formatação preservada
- ✅ Dados estruturados corretamente

## Teste após implementação

1. Gere um relatório de Rastreabilidade
2. Clique em "Gerar Relatório"
3. Verifique se o arquivo baixado tem extensão `.xlsx`
4. Abra no Excel e confirme a formatação correta
