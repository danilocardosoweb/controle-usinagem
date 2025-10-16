import { useMemo, useState } from 'react'
import { FaPrint } from 'react-icons/fa'
import { useSupabase } from '../hooks/useSupabase'
import * as XLSX from 'xlsx'

// Helpers (fora do componente) para evitar problemas de hoisting/TDZ
export function extrairComprimentoAcabado(produto) {
  if (!produto) return ''
  const resto = String(produto).slice(8)
  const match = resto.match(/^\d+/)
  const valor = match ? parseInt(match[0], 10) : null
  return Number.isFinite(valor) ? `${valor} mm` : ''
}

export function extrairFerramenta(produto) {
  if (!produto) return ''
  const s = String(produto).toUpperCase()
  // Aceitar quaisquer letras (vogais ou consoantes) no prefixo
  const re3 = /^([A-Z]{3})([A-Z0-9]+)/
  const re2 = /^([A-Z]{2})([A-Z0-9]+)/
  let letras = '', resto = '', qtd = 0
  let m = s.match(re3)
  if (m) { letras = m[1]; resto = m[2]; qtd = 3 }
  else {
    m = s.match(re2)
    if (!m) return ''
    letras = m[1]; resto = m[2]; qtd = 4
  }
  let nums = ''
  for (const ch of resto) {
    if (/[0-9]/.test(ch)) nums += ch
    else if (ch === 'O') nums += '0'
    if (nums.length === qtd) break
  }
  if (nums.length < qtd) nums = nums.padEnd(qtd, '0')
  return `${letras}-${nums}`
}

const Relatorios = () => {
  const [filtros, setFiltros] = useState({
    tipoRelatorio: 'producao',
    dataInicio: '',
    dataFim: '',
    maquina: '',
    operador: '',
    produto: '', // filtro por produto
    ferramenta: '', // filtro por ferramenta
    comprimento: '', // filtro por comprimento (ex: "810 mm")
    formato: 'excel',
    modo: 'detalhado' // para rastreabilidade: detalhado|compacto
  })
  const [filtrosAberto, setFiltrosAberto] = useState(true)
  
  // Dados reais do IndexedDB
  const { items: apontamentos } = useSupabase('apontamentos')
  const { items: paradasRaw } = useSupabase('apontamentos_parada')
  const { items: ferramentasCfg } = useSupabase('ferramentas_cfg')
  const { items: maquinasCat } = useSupabase('maquinas')
  const { items: lotesDB } = useSupabase('lotes')

  // Utilitário: Agrupar rastreabilidade em modo compacto (uma linha por apontamento)
  const agruparRastreabilidadeCompacto = (linhas) => {
    const map = {}
    
    // Função auxiliar para concatenar valores únicos
    const concat = (a, b) => {
      const sa = (a ? String(a) : '').trim()
      const sb = (b ? String(b) : '').trim()
      if (!sa) return sb
      if (!sb) return sa
      // Usar Set para evitar duplicatas
      const set = new Set(sa.split(', ').filter(Boolean).concat(sb.split(', ').filter(Boolean)))
      return Array.from(set).join(', ')
    }
    
    // Lista de todos os campos de amarrado que devem ser concatenados
    const camposAmarrado = [
      'Amarrado_Codigo',
      'Amarrado_Lote',
      'Amarrado_Rack',
      'Amarrado_Produto',
      'Amarrado_PedidoSeq',
      'Amarrado_Pedido',
      'Amarrado_Seq',
      'Amarrado_Romaneio',
      'Amarrado_QtKG',
      'Amarrado_QtdPC',
      'Amarrado_Ferramenta',
      'Amarrado_Comprimento_mm'
    ]
    
    for (const r of (linhas || [])) {
      const k = `${r.ID_Apont || ''}`
      
      if (!map[k]) {
        // Primeira linha deste apontamento - copiar tudo
        map[k] = { ...r }
      } else {
        // Concatenar todos os campos de amarrado
        camposAmarrado.forEach(campo => {
          if (campo in r || campo in map[k]) {
            map[k][campo] = concat(map[k][campo] || '', r[campo] || '')
          }
        })
      }
    }
    
    const resultado = Object.values(map)
    
    // Log para debug
    console.log(`📊 Rastreabilidade Compacto: ${linhas.length} linhas → ${resultado.length} apontamentos agrupados`)
    
    return resultado
  }

  // Dados simulados para os filtros
  const maquinas = [
    { id: 1, nome: 'Usinagem 01' },
    { id: 2, nome: 'Usinagem 02' },
    { id: 3, nome: 'Usinagem 03' }
  ]
  
  // Operadores dinâmicos a partir dos apontamentos reais
  const operadores = useMemo(() => {
    const nomes = Array.from(new Set((apontamentos || []).map(a => a.operador).filter(Boolean)))
    return nomes.map(n => ({ id: n, nome: n }))
  }, [apontamentos])

  // Lista dinâmica de ferramentas a partir dos apontamentos
  const ferramentasLista = useMemo(() => {
    const set = new Set()
    for (const a of (apontamentos || [])) {
      const cod = a?.produto || a?.codigoPerfil
      const f = extrairFerramenta(cod)
      if (f) set.add(f)
    }
    return Array.from(set).sort()
  }, [apontamentos])

  // Lista dinâmica de comprimentos a partir dos apontamentos
  const comprimentosLista = useMemo(() => {
    const set = new Set()
    for (const a of (apontamentos || [])) {
      const cod = a?.produto || a?.codigoPerfil
      const c = extrairComprimentoAcabado(cod)
      if (c) set.add(c)
    }
    return Array.from(set).sort((a,b)=> String(a).localeCompare(String(b)))
  }, [apontamentos])
  
  const tiposRelatorio = [
    { id: 'producao', nome: 'Produção por Período' },
    { id: 'paradas', nome: 'Paradas de Máquina' },
    { id: 'desempenho', nome: 'Desempenho por Operador/Máquina' },
    { id: 'oee', nome: 'OEE Detalhado' },
    { id: 'expedicao', nome: 'Estimativa de Expedição' },
    { id: 'produtividade', nome: 'Produtividade (Itens)' },
    { id: 'rastreabilidade', nome: 'Rastreabilidade (Amarrados/Lotes)' }
  ]
  
  const handleChange = (e) => {
    const { name, value } = e.target
    setFiltros({
      ...filtros,
      [name]: value
    })
  }

  // Impressão do Formulário de Identificação (Word) a partir de uma linha
  const imprimirFormIdent = (a) => {
    const cliente = a.cliente || ''
    const item = (a.produto || a.codigoPerfil || '')
    const itemCli = a.perfil_longo || ''
    const medida = a.comprimento_acabado_mm ? `${a.comprimento_acabado_mm} mm` : extrairComprimentoAcabado(item)
    const pedidoTecno = (a.ordemTrabalho || a.pedido_seq || '')
    const pedidoCli = (a.pedido_cliente || '')
    const qtde = a.quantidade || ''
    const pallet = (a.rack_ou_pallet || a.rackOuPallet || '')
    const lote = a.lote || ''

    const html = `<!DOCTYPE html>
    <html><head><meta charset="utf-8" />
    <style>
      @page { size: A4 landscape; margin: 12mm; }
      body { font-family: Arial, Helvetica, sans-serif; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .header { text-align: center; margin-bottom: 10mm; }
      .titulo { font-size: 26pt; font-weight: 800; }
      .sub { margin-top: 4mm; font-size: 12pt; font-weight: 700; }
      table { width: 100%; border-collapse: separate; border-spacing: 0 12mm; }
      th, td { vertical-align: bottom; }
      .label { font-weight: 800; font-size: 18pt; white-space: nowrap; padding-right: 6mm; }
      .valor { border-bottom: 3px solid #000; font-size: 18pt; padding: 0 3mm; height: 14mm; }
      .dupla td { width: 50%; }
    </style>
    </head><body>
      <div class="header">
        <div class="titulo">Formulário de Identificação do Material Cortado</div>
        <div class="sub">Lote: ${lote}</div>
      </div>
      <table>
        <tr><td class="label">CLIENTE:</td><td class="valor">${cliente}</td></tr>
        <tr><td class="label">ITEM:</td><td class="valor">${item}</td></tr>
        <tr><td class="label">ITEM CLI:</td><td class="valor">${itemCli}</td></tr>
        <tr><td class="label">MEDIDA:</td><td class="valor">${medida}</td></tr>
        <tr><td class="label">PEDIDO TECNO:</td><td class="valor">${pedidoTecno}</td></tr>
        <tr class="dupla">
          <td><span class="label">QTDE:</span> <span class="valor" style="display:inline-block; min-width:60mm;">${qtde}</span></td>
          <td><span class="label">PALET:</span> <span class="valor" style="display:inline-block; min-width:60mm;">${pallet}</span></td>
        </tr>
        <tr><td class="label">PEDIDO CLI:</td><td class="valor">${pedidoCli}</td></tr>
      </table>
    </body></html>`

    const blob = new Blob([html], { type: 'application/msword' })
    const url = URL.createObjectURL(blob)
    const aTag = document.createElement('a')
    aTag.href = url
    aTag.download = `identificacao_${lote || 'apontamento'}.doc`
    document.body.appendChild(aTag)
    aTag.click()
    document.body.removeChild(aTag)
    URL.revokeObjectURL(url)
  }
  
  // Utilitário: sanitizar nome de aba do Excel
  const sanitizeSheetName = (name) => {
    if (!name) return 'Dados'
    
    // Remover caracteres inválidos: : \ / ? * [ ]
    let sanitized = String(name).replace(/[:\\\/\?\*\[\]]/g, '')
    
    // Limitar a 31 caracteres (limite do Excel)
    if (sanitized.length > 31) {
      sanitized = sanitized.substring(0, 31)
    }
    
    // Se ficou vazio após sanitização, usar nome padrão
    return sanitized.trim() || 'Dados'
  }

  // Utilitário: gerar e baixar arquivo Excel nativo
  const downloadExcel = (rows, fileName, sheetName = 'Relatório') => {
    if (!rows || rows.length === 0) { 
      alert('Sem dados para exportar.'); 
      return 
    }

    try {
      // Criar workbook
      const wb = XLSX.utils.book_new()
      
      // Converter dados para worksheet
      const ws = XLSX.utils.json_to_sheet(rows)
      
      // Configurar largura das colunas automaticamente
      const colWidths = []
      const headers = Object.keys(rows[0] || {})
      
      headers.forEach((header, index) => {
        let maxWidth = header.length
        rows.forEach(row => {
          const cellValue = String(row[header] || '')
          if (cellValue.length > maxWidth) {
            maxWidth = cellValue.length
          }
        })
        // Limitar largura máxima para evitar colunas muito largas
        colWidths[index] = { wch: Math.min(maxWidth + 2, 50) }
      })
      
      ws['!cols'] = colWidths
      
      // Sanitizar nome da aba antes de adicionar
      const safeSheetName = sanitizeSheetName(sheetName)
      
      // Adicionar worksheet ao workbook
      XLSX.utils.book_append_sheet(wb, ws, safeSheetName)
      
      // Gerar arquivo Excel
      const excelBuffer = XLSX.write(wb, { 
        bookType: 'xlsx', 
        type: 'array',
        cellStyles: true 
      })
      
      // Criar blob e fazer download
      const blob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      })
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${fileName}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      console.log(`Excel gerado: ${fileName}.xlsx com ${rows.length} linhas`)
      
    } catch (error) {
      console.error('Erro ao gerar Excel:', error)
      alert('Erro ao gerar arquivo Excel: ' + error.message)
    }
  }

  // Utilitário: gerar Excel com múltiplas abas
  const downloadExcelMultiSheet = (sheetsData, fileName) => {
    if (!sheetsData || sheetsData.length === 0) {
      alert('Sem dados para exportar.')
      return
    }

    try {
      const wb = XLSX.utils.book_new()
      
      sheetsData.forEach(({ data, name }) => {
        if (data && data.length > 0) {
          const ws = XLSX.utils.json_to_sheet(data)
          
          // Auto-ajustar largura das colunas
          const colWidths = []
          const headers = Object.keys(data[0] || {})
          
          headers.forEach((header, index) => {
            let maxWidth = header.length
            data.forEach(row => {
              const cellValue = String(row[header] || '')
              if (cellValue.length > maxWidth) {
                maxWidth = cellValue.length
              }
            })
            colWidths[index] = { wch: Math.min(maxWidth + 2, 50) }
          })
          
          ws['!cols'] = colWidths
          
          // Sanitizar nome da aba antes de adicionar
          const safeSheetName = sanitizeSheetName(name || 'Dados')
          
          XLSX.utils.book_append_sheet(wb, ws, safeSheetName)
        }
      })
      
      const excelBuffer = XLSX.write(wb, { 
        bookType: 'xlsx', 
        type: 'array',
        cellStyles: true 
      })
      
      const blob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      })
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${fileName}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
    } catch (error) {
      console.error('Erro ao gerar Excel multi-sheet:', error)
      alert('Erro ao gerar arquivo Excel: ' + error.message)
    }
  }

  // Construção das linhas para cada tipo de relatório
  const buildRows = (tipo) => {
    switch (tipo) {
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
      case 'paradas':
        return paradasFiltradas.map(p => ({
          Data: brDate(p.inicio_norm),
          Maquina: maqMap[String(p.maquina)] || p.maquina || '-',
          Motivo: p.motivo_norm,
          Tipo: p.tipo_norm,
          Inicio: p.inicio_norm ? new Date(p.inicio_norm).toLocaleString('pt-BR') : '-',
          Fim: p.fim_norm ? new Date(p.fim_norm).toLocaleString('pt-BR') : '-',
          Duracao_min: (duracaoMin(p.inicio_norm, p.fim_norm) ?? '-')
        }))
      case 'desempenho': {
        const by = {}
        for (const a of apontamentosFiltrados) {
          const op = a.operador || '-'
          const mq = maqMap[String(a.maquina)] || a.maquina || '-'
          const key = `${op}__${mq}`
          if (!by[key]) by[key] = { Operador: op, Maquina: mq, Producao: 0, Minutos: 0 }
          by[key].Producao += Number(a.quantidade || 0) || 0
          const m = duracaoMin(a.inicio, a.fim)
          by[key].Minutos += m || 0
        }
        return Object.values(by).map(r => ({ ...r, Prod_por_Hora: (r.Minutos > 0 ? (r.Producao / (r.Minutos/60)) : 0).toFixed(2) }))
      }
      case 'oee': {
        const by = {}
        for (const a of apontamentosFiltrados) {
          const d = toISODate(a.inicio) || '-'
          const mq = maqMap[String(a.maquina)] || a.maquina || '-'
          const k = `${d}__${mq}`
          if (!by[k]) by[k] = { Data: d, Maquina: mq, Producao: 0, ProdMin: 0, ParadaMin: 0 }
          by[k].Producao += Number(a.quantidade || 0) || 0
          by[k].ProdMin += duracaoMin(a.inicio, a.fim) || 0
        }
        for (const p of paradasFiltradas) {
          const d = toISODate(p.inicio_norm) || '-'
          const mq = maqMap[String(p.maquina)] || p.maquina || '-'
          const k = `${d}__${mq}`
          if (!by[k]) by[k] = { Data: d, Maquina: mq, Producao: 0, ProdMin: 0, ParadaMin: 0 }
          by[k].ParadaMin += duracaoMin(p.inicio_norm, p.fim_norm) || 0
        }
        return Object.values(by).sort((a,b)=> (a.Data||'').localeCompare(b.Data||''))
      }
      case 'expedicao': {
        const porFerramenta = {}
        for (const a of apontamentosFiltrados) {
          const cod = (a.produto || a.codigoPerfil)
          const ferramenta = extrairFerramenta(cod)
          if (!ferramenta) continue
          if (!porFerramenta[ferramenta]) porFerramenta[ferramenta] = { Ferramenta: ferramenta, Quantidade: 0 }
          porFerramenta[ferramenta].Quantidade += Number(a.quantidade || 0) || 0
        }
        return Object.values(porFerramenta)
      }
      case 'produtividade': {
        const grupos = {}
        for (const a of apontamentosFiltrados) {
          const cod = (a.produto || a.codigoPerfil)
          const ferramenta = extrairFerramenta(cod)
          const comprimento = extrairComprimentoAcabado(cod)
          const key = `${ferramenta}__${comprimento}`
          if (!grupos[key]) grupos[key] = { Ferramenta: ferramenta, Comprimento: comprimento, Quantidade: 0, Minutos: 0 }
          grupos[key].Quantidade += Number(a.quantidade || 0) || 0
          grupos[key].Minutos += duracaoMin(a.inicio, a.fim) || 0
        }
        return Object.values(grupos).map(g => ({ ...g, Media_pcs_h: (g.Minutos>0?(g.Quantidade/(g.Minutos/60)):0).toFixed(2) }))
      }
      case 'rastreabilidade': {
        const linhas = []
        let totalAmarrados = 0
        
        for (const a of apontamentosOrdenados) {
          const base = {
            ID_Apont: a.id,
            Data: brDate(a.inicio),
            Hora: brTime(a.inicio),
            Operador: a.operador || '-',
            Maquina: maqMap[String(a.maquina)] || a.maquina || '-',
            PedidoSeq: a.ordemTrabalho || a.ordem_trabalho || a.pedido_seq || '-',
            Produto_Usinagem: a.produto || a.codigoPerfil || '-',
            Lote_Usinagem: a.lote || '-',
            Qtde_Produzida: a.quantidade || 0,
            Qtde_Refugo: a.qtd_refugo || 0,
            RackOuPallet: a.rack_ou_pallet || a.rackOuPallet || '-',
            LotesExternos: Array.isArray(a.lotes_externos) ? a.lotes_externos.join(', ') : (a.lote_externo || '')
          }
          const arr = Array.isArray(a.amarrados_detalhados) ? a.amarrados_detalhados : []
          
          if (arr.length === 0) {
            // Fallback: derivar pelos lotes_externos quando não há amarrados_detalhados
            const lotesExt = Array.isArray(a.lotes_externos) ? a.lotes_externos : (a.lote_externo ? [a.lote_externo] : [])
            if (lotesExt.length > 0) {
              for (const loteNum of lotesExt) {
                const l = (lotesDB || []).find(x => String(x.lote || '').trim() === String(loteNum)) || {}
                const prodBruto = String(l.produto || getCampoOriginalLote(l, 'Produto') || '').trim()
                const ferramentaBruta = extrairFerramenta(prodBruto) || ''
                const comprimentoLongo = extrairComprimentoAcabado(prodBruto) || ''
                const pedidoSeqBruto = String(l.pedido_seq || '')
                const [pedidoBruto, seqBruto] = pedidoSeqBruto.includes('/') ? pedidoSeqBruto.split('/') : [pedidoSeqBruto, '']
                linhas.push({
                  ...base,
                  Amarrado_Codigo: String(l.codigo || '').trim(),
                  Amarrado_Lote: String(l.lote || '').trim(),
                  Amarrado_Rack: String(l.rack_embalagem || '').trim(),
                  Amarrado_Produto: prodBruto,
                  Amarrado_Ferramenta: ferramentaBruta,
                  Amarrado_Comprimento_mm: comprimentoLongo,
                  Amarrado_PedidoSeq: pedidoSeqBruto,
                  Amarrado_Pedido: pedidoBruto || '',
                  Amarrado_Seq: seqBruto || '',
                  Amarrado_Romaneio: String(l.romaneio || '').trim(),
                  Amarrado_QtKG: Number(l.qt_kg || 0) || '',
                  Amarrado_QtdPC: Number(l.qtd_pc || 0) || ''
                })
              }
            } else {
              linhas.push(base)
            }
          } else {
            // Usar amarrados_detalhados quando disponível
            totalAmarrados += arr.length
            for (const am of arr) {
              const prodBruto = am.produto || ''
              const ferramentaBruta = extrairFerramenta(prodBruto) || ''
              const comprimentoLongo = extrairComprimentoAcabado(prodBruto) || ''
              const pedidoSeqBruto = String(am.pedido_seq || '')
              const [pedidoBruto, seqBruto] = pedidoSeqBruto.includes('/') ? pedidoSeqBruto.split('/') : [pedidoSeqBruto, '']
              linhas.push({
                ...base,
                Amarrado_Codigo: am.codigo || '',
                Amarrado_Lote: am.lote || '',
                Amarrado_Rack: am.rack || '',
                Amarrado_Produto: prodBruto,
                Amarrado_Ferramenta: ferramentaBruta,
                Amarrado_Comprimento_mm: comprimentoLongo,
                Amarrado_PedidoSeq: pedidoSeqBruto,
                Amarrado_Pedido: pedidoBruto || '',
                Amarrado_Seq: seqBruto || '',
                Amarrado_Romaneio: am.romaneio || '',
                Amarrado_QtKG: am.qt_kg ?? '',
                Amarrado_QtdPC: am.qtd_pc ?? ''
              })
            }
          }
        }
        
        console.log(`📦 Rastreabilidade Detalhado: ${apontamentosOrdenados.length} apontamentos, ${totalAmarrados} amarrados, ${linhas.length} linhas geradas`)
        
        return linhas
      }
      default:
        return []
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    let rows = buildRows(filtros.tipoRelatorio)
    
    // Aplicar modo compacto para rastreabilidade
    if (filtros.tipoRelatorio === 'rastreabilidade' && filtros.modo === 'compacto') {
      rows = agruparRastreabilidadeCompacto(rows)
    }
    
    const tipoInfo = tiposRelatorio.find(t => t.id === filtros.tipoRelatorio)
    const label = (tipoInfo?.nome || 'Relatorio').replace(/\s+/g, '_')
    const suffix = filtros.tipoRelatorio === 'rastreabilidade' ? `_${filtros.modo}` : ''
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')
    const fileName = `${label}${suffix}_${timestamp}`
    
    if ((filtros.formato || 'excel').toLowerCase() === 'excel') {
      // Gerar Excel nativo com nome da aba baseado no tipo de relatório
      const sheetName = tipoInfo?.nome || 'Relatório'
      downloadExcel(rows, fileName, sheetName)
    } else {
      // Formato PDF ainda não implementado: exportar Excel como fallback
      downloadExcel(rows, fileName, tipoInfo?.nome || 'Relatório')
      alert('Formato PDF ainda não implementado. O arquivo foi exportado em Excel (.xlsx).')
    }
  }

  // Função para gerar todos os relatórios em um único arquivo Excel
  const handleGerarTodosRelatorios = () => {
    try {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')
      const fileName = `Relatorios_Completos_${timestamp}`
      
      const sheetsData = []
      
      // Mapeamento de nomes curtos para as abas
      const nomesCurtos = {
        'producao': 'Producao',
        'paradas': 'Paradas',
        'desempenho': 'Desempenho',
        'oee': 'OEE',
        'expedicao': 'Expedicao',
        'produtividade': 'Produtividade',
        'rastreabilidade': 'Rastreab'
      }
      
      // Gerar dados para cada tipo de relatório
      tiposRelatorio.forEach(tipo => {
        try {
          // Temporariamente alterar o tipo de relatório para gerar os dados
          const originalTipo = filtros.tipoRelatorio
          filtros.tipoRelatorio = tipo.id
          
          let rows = buildRows(tipo.id)
          
          // Nome curto para a aba
          const nomeBase = nomesCurtos[tipo.id] || tipo.nome
          
          // Aplicar modo compacto para rastreabilidade
          if (tipo.id === 'rastreabilidade') {
            // Gerar duas abas: detalhado e compacto
            sheetsData.push({
              data: rows,
              name: `${nomeBase} Detalhado`
            })
            
            const rowsCompacto = agruparRastreabilidadeCompacto([...rows])
            sheetsData.push({
              data: rowsCompacto,
              name: `${nomeBase} Compacto`
            })
          } else {
            sheetsData.push({
              data: rows,
              name: nomeBase
            })
          }
          
          // Restaurar tipo original
          filtros.tipoRelatorio = originalTipo
          
        } catch (error) {
          console.error(`Erro ao gerar relatório ${tipo.nome}:`, error)
        }
      })
      
      // Filtrar abas vazias
      const sheetsComDados = sheetsData.filter(sheet => sheet.data && sheet.data.length > 0)
      
      if (sheetsComDados.length === 0) {
        alert('Nenhum dado encontrado para gerar relatórios.')
        return
      }
      
      // Gerar Excel com múltiplas abas
      downloadExcelMultiSheet(sheetsComDados, fileName)
      
      alert(`Arquivo Excel gerado com ${sheetsComDados.length} abas de relatórios!`)
      
    } catch (error) {
      console.error('Erro ao gerar todos os relatórios:', error)
      alert('Erro ao gerar relatórios completos: ' + error.message)
    }
  }
  
  

  // Utilidades
  const toISODate = (val) => {
    if (!val) return null
    try { return new Date(val).toISOString().slice(0,10) } catch { return null }
  }
  const brDate = (val) => {
    if (!val) return ''
    try { const d = new Date(val); return d.toLocaleDateString('pt-BR') } catch { return String(val) }
  }
  const brTime = (val) => {
    if (!val) return ''
    try { const d = new Date(val); return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) } catch { return '' }
  }
  const fmt = (n, digits=0) => {
    try { return Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits }) } catch { return String(n) }
  }
  // Campo original do lote (dados_originais), case-insensitive
  const getCampoOriginalLote = (loteObj, campo) => {
    try {
      const dados = loteObj?.dados_originais || {}
      const alvo = String(campo).toLowerCase().replace(/[^a-z0-9]/g, '')
      for (const k of Object.keys(dados)) {
        const nk = String(k).toLowerCase().replace(/[^a-z0-9]/g, '')
        if (nk === alvo) return dados[k]
      }
      return ''
    } catch { return '' }
  }
  // Funções extrairComprimentoAcabado e extrairFerramenta já estão definidas no topo do arquivo

  // Filtro aplicado aos apontamentos conforme controles da tela
  // Mapa id->nome da máquina
  const maqMap = useMemo(() => {
    const map = {}
    for (const m of (maquinasCat || [])) {
      if (!m) continue
      map[String(m.id)] = m.nome || m.codigo || `Máquina ${m.id}`
    }
    return map
  }, [maquinasCat])

  const apontamentosFiltrados = useMemo(() => {
    const di = filtros.dataInicio ? toISODate(filtros.dataInicio) : null
    const df = filtros.dataFim ? toISODate(filtros.dataFim) : null
    return (apontamentos || []).filter(a => {
      const dd = toISODate(a.inicio)
      if (di && (!dd || dd < di)) return false
      if (df && (!dd || dd > df)) return false
      if (filtros.maquina && String(a.maquina) !== String(filtros.maquina)) return false
      if (filtros.operador && String(a.operador) !== String(filtros.operador)) return false
      // Filtros adicionais: ferramenta e comprimento
      const cod = a?.produto || a?.codigoPerfil
      if (filtros.ferramenta) {
        const f = extrairFerramenta(cod)
        if (f !== filtros.ferramenta) return false
      }
      if (filtros.comprimento) {
        const c = extrairComprimentoAcabado(cod)
        if (c !== filtros.comprimento) return false
      }
      return true
    })
  }, [apontamentos, filtros])

  // Ordena do mais recente para o mais antigo
  const apontamentosOrdenados = useMemo(() => {
    const copia = [...(apontamentosFiltrados || [])]
    copia.sort((a, b) => {
      const ta = a && a.inicio ? new Date(a.inicio).getTime() : 0
      const tb = b && b.inicio ? new Date(b.inicio).getTime() : 0
      return tb - ta
    })
    return copia
  }, [apontamentosFiltrados])

  // Filtro aplicado às paradas
  // Normaliza paradas vindas da view/tabela
  const paradas = useMemo(() => {
    return (paradasRaw || []).map(p => ({
      ...p,
      inicio_norm: p.inicio || p.inicio_timestamp,
      fim_norm: p.fim || p.fim_timestamp,
      motivo_norm: p.motivo_parada || p.motivoParada || '-',
      tipo_norm: p.tipo_parada || p.tipoParada || '-',
    }))
  }, [paradasRaw])

  const paradasFiltradas = useMemo(() => {
    const di = filtros.dataInicio ? toISODate(filtros.dataInicio) : null
    const df = filtros.dataFim ? toISODate(filtros.dataFim) : null
    return (paradas || []).filter(p => {
      const dd = toISODate(p.inicio_norm)
      if (di && (!dd || dd < di)) return false
      if (df && (!dd || dd > df)) return false
      if (filtros.maquina && String(p.maquina) !== String(filtros.maquina)) return false
      // Operador não se aplica a paradas (não temos esse campo), então ignorar
      return true
    })
  }, [paradas, filtros])

  const duracaoMin = (inicio, fim) => {
    if (!inicio || !fim) return null
    try {
      const di = new Date(inicio)
      const df = new Date(fim)
      return Math.max(0, Math.round((df - di) / 60000))
    } catch { return null }
  }

  // Componente para visualização prévia do relatório
  const PreviewRelatorio = ({ tipo }) => {
    // Agregações reais
    const desempenhoAgregado = useMemo(() => {
      const map = {}
      for (const a of apontamentosFiltrados) {
        const op = a.operador || '-'
        const maq = a.maquina || '-'
        const key = `${op}__${maq}`
        if (!map[key]) map[key] = { operador: op, maquina: maq, producao: 0, minutos: 0 }
        const qtd = Number(a.quantidade || 0)
        map[key].producao += isNaN(qtd) ? 0 : qtd
        const m = duracaoMin(a.inicio, a.fim)
        map[key].minutos += m || 0
      }
      return Object.values(map)
    }, [apontamentosFiltrados])
    
    // Flags de "apontado no segundo sistema" (persistência local)
    const STORAGE_FLAG = 'relatorio_flags_segundo_sistema'
    const readFlags = () => {
      try { const raw = localStorage.getItem(STORAGE_FLAG); return raw ? JSON.parse(raw) : {} } catch { return {} }
    }
    const writeFlags = (obj) => {
      try { localStorage.setItem(STORAGE_FLAG, JSON.stringify(obj)) } catch {}
    }
    const [flags, setFlags] = useState(readFlags())
    const rowId = (a) => `${a.inicio || ''}__${a.operador || ''}__${a.maquina || ''}__${a.codigoPerfil || ''}__${a.quantidade || ''}`
    const toggleFlag = (a) => {
      const id = rowId(a)
      const next = { ...flags, [id]: !flags[id] }
      setFlags(next)
      writeFlags(next)
    }

    // Overrides de produtividade (ajustes manuais)
    const STORAGE_OVR = 'produtividade_overrides'
    const readOverrides = () => {
      try { const raw = localStorage.getItem(STORAGE_OVR); return raw ? JSON.parse(raw) : {} } catch { return {} }
    }
    const writeOverrides = (obj) => {
      try { localStorage.setItem(STORAGE_OVR, JSON.stringify(obj)) } catch {}
    }
    const [overrides, setOverrides] = useState(readOverrides())
    const setOverride = (key, field, val) => {
      const next = { ...overrides, [key]: { ...(overrides[key] || {}), [field]: val } }
      setOverrides(next)
      writeOverrides(next)
    }

    // Renderiza a tabela de acordo com o tipo de relatório
    switch (tipo) {
      case 'producao':
        return (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hora</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Máquina</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operador</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pedido/Seq</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ferramenta</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantidade</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Apont. 2º Sistema</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rack/Pallet</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qtd. Pedido</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Separado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {apontamentosOrdenados.map((a, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{brDate(a.inicio)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{brTime(a.inicio)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{maqMap[String(a.maquina)] || a.maquina || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{a.operador || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{
                    a.ordemTrabalho
                      || a.ordem_trabalho
                      || a.pedido_seq
                      || a.pedidoSeq
                      || ((a.pedido ?? a.numeroPedido) ? `${a.pedido ?? a.numeroPedido}${a.seq ? '/' + a.seq : (a.sequencia ? '/' + a.sequencia : '')}` : '-')
                  }</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{(a.produto || a.codigoPerfil || '-')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{extrairFerramenta(a.produto || a.codigoPerfil) || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{a.quantidade || 0}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <label className="inline-flex items-center gap-2 select-none">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={!!flags[rowId(a)]}
                        onChange={() => toggleFlag(a)}
                      />
                      <span className="text-xs text-gray-600">Marcado</span>
                    </label>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{(a.rack_ou_pallet || a.rackOuPallet || '-')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{(a.qtd_pedido ?? a.qtdPedido ?? '-') }</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{(a.separado ?? a.qtd_separado ?? '-')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button type="button" className="p-2 rounded border border-gray-300 text-gray-600 hover:bg-gray-100" title="Imprimir formulário" onClick={() => imprimirFormIdent(a)}>
                      <FaPrint />
                    </button>
                  </td>
                </tr>
              ))}
              {apontamentosOrdenados.length === 0 && (
                <tr>
                  <td colSpan="12" className="px-6 py-6 text-center text-gray-500">Nenhum apontamento encontrado</td>
                </tr>
              )}
            </tbody>
          </table>
        )
      
      case 'paradas':
        return (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Máquina</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Motivo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Início</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fim</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duração (min)</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paradasFiltradas.map((p, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{brDate(p.inicio_norm)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{maqMap[String(p.maquina)] || p.maquina || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.motivo_norm}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{(() => {
                    const tp = p.tipo_norm
                    return tp === 'setup' ? 'Setup' : tp === 'nao_planejada' ? 'Não Planejada' : tp === 'manutencao' ? 'Manutenção' : tp === 'planejada' ? 'Planejada' : (tp || '-')
                  })()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.inicio_norm ? new Date(p.inicio_norm).toLocaleString('pt-BR') : '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.fim_norm ? new Date(p.fim_norm).toLocaleString('pt-BR') : '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{(() => { const m = duracaoMin(p.inicio_norm, p.fim_norm); return m != null ? m : '-'; })()}</td>
                </tr>
              ))}
              {paradasFiltradas.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-6 py-6 text-center text-gray-500">Nenhuma parada encontrada</td>
                </tr>
              )}
            </tbody>
          </table>
        )
      
      case 'desempenho':
        return (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operador</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Máquina</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produção</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Horas (apontadas)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prod./Hora</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {desempenhoAgregado.map((item, index) => {
                const horas = (item.minutos || 0) / 60
                const pph = horas > 0 ? (item.producao / horas).toFixed(2) : '-'
                return (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.operador}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{maqMap[String(item.maquina)] || item.maquina}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.producao}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{horas.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{pph}</td>
                  </tr>
                )
              })}
              {desempenhoAgregado.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-6 text-center text-gray-500">Sem dados no período/seleção</td>
                </tr>
              )}
            </tbody>
          </table>
        )
      
      case 'oee':
        // OEE detalhado: apresentamos dados reais disponíveis (produção e paradas) por dia/máquina
        const byKey = {}
        for (const a of apontamentosFiltrados) {
          const dia = toISODate(a.inicio) || '-'
          const maq = a.maquina || '-'
          const key = `${dia}__${maq}`
          if (!byKey[key]) byKey[key] = { dia, maquina: maq, producao: 0, prodMin: 0, paradaMin: 0 }
          const qtd = Number(a.quantidade || 0); byKey[key].producao += isNaN(qtd) ? 0 : qtd
          const m = duracaoMin(a.inicio, a.fim); byKey[key].prodMin += m || 0
        }
        for (const p of paradasFiltradas) {
          const dia = toISODate(p.inicio) || '-'
          const maq = p.maquina || '-'
          const key = `${dia}__${maq}`
          if (!byKey[key]) byKey[key] = { dia, maquina: maq, producao: 0, prodMin: 0, paradaMin: 0 }
          const m = duracaoMin(p.inicio, p.fim); byKey[key].paradaMin += m || 0
        }
        const linhas = Object.values(byKey).sort((a,b)=> (a.dia||'').localeCompare(b.dia||''))
        return (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Máquina</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produção</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tempo Produção (min)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tempo Paradas (min)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">OEE</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {linhas.map((r, idx) => (
                <tr key={idx}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.dia ? r.dia.split('-').reverse().join('/') : '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.maquina}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.producao}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.prodMin}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.paradaMin}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">-</td>
                </tr>
              ))}
              {linhas.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-6 text-center text-gray-500">Sem dados suficientes para OEE</td>
                </tr>
              )}
            </tbody>
          </table>
        )
      
      case 'expedicao': {
        // Agregar quantidade por ferramenta e unir com cfg
        const porFerramenta = {}
        for (const a of apontamentosFiltrados) {
          const cod = (a.produto || a.codigoPerfil)
          const ferramenta = extrairFerramenta(cod)
          if (!ferramenta) continue
          if (!porFerramenta[ferramenta]) porFerramenta[ferramenta] = { ferramenta, quantidade: 0 }
          const q = Number(a.quantidade || 0)
          porFerramenta[ferramenta].quantidade += isNaN(q) ? 0 : q
        }
        const cfgMap = {}
        for (const c of (ferramentasCfg || [])) {
          if (!c || !c.ferramenta) continue
          cfgMap[c.ferramenta] = c
        }
        const linhas = Object.values(porFerramenta).map(l => {
          const c = cfgMap[l.ferramenta] || {}
          const embalagem = c.embalagem || 'pallet'
          const comprimento_m = (Number(c.comprimento_mm) || 0) / 1000
          const peso_linear = Number(c.peso_linear) || 0
          const peso_estimado = peso_linear * comprimento_m * (Number(l.quantidade) || 0)
          let pallets = '-'
          let ripas = '-'
          let caixas = '-'
          if (embalagem === 'pallet') {
            const ppp = Number(c.pcs_por_pallet) || 0
            const rpp = Number(c.ripas_por_pallet) || 0
            pallets = ppp > 0 ? Math.ceil(l.quantidade / ppp) : '-'
            ripas = ppp > 0 ? (Math.ceil(l.quantidade / ppp) * rpp) : '-'
          } else {
            const ppc = Number(c.pcs_por_caixa) || 0
            caixas = ppc > 0 ? Math.ceil(l.quantidade / ppc) : '-'
          }
          return {
            ferramenta: l.ferramenta,
            comprimento_mm: c.comprimento_mm || '-',
            quantidade: l.quantidade,
            embalagem,
            pallets, caixas, ripas,
            peso_estimado
          }
        })
        return (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ferramenta</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comprimento (mm)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qtd. PCS Apontadas</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Embalagem</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estimativa Pallets</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estimativa Caixas</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estimativa Ripas</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Peso Estimado (kg)</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {linhas.map((r, idx) => (
                <tr key={idx}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.ferramenta}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.comprimento_mm}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{fmt(r.quantidade)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.embalagem}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{typeof r.pallets === 'number' ? fmt(r.pallets) : r.pallets}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{typeof r.caixas === 'number' ? fmt(r.caixas) : r.caixas}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{typeof r.ripas === 'number' ? fmt(r.ripas) : r.ripas}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{fmt(r.peso_estimado, 3)}</td>
                </tr>
              ))}
              {linhas.length === 0 && (
                <tr>
                  <td colSpan="8" className="px-6 py-6 text-center text-gray-500">Sem dados para estimativa</td>
                </tr>
              )}
            </tbody>
          </table>
        )
      }
      
      case 'produtividade': {
        // Agrupa por item (ferramenta + comprimento)
        const grupos = {}
        for (const a of apontamentosFiltrados) {
          const cod = (a.produto || a.codigoPerfil)
          const ferramenta = extrairFerramenta(cod)
          const comprimento = extrairComprimentoAcabado(cod)
          const key = `${ferramenta}__${comprimento}`
          if (!grupos[key]) grupos[key] = { ferramenta, comprimento, quantidade: 0, minutos: 0, porDia: {} }
          const q = Number(a.quantidade || 0)
          grupos[key].quantidade += isNaN(q) ? 0 : q
          const m = duracaoMin(a.inicio, a.fim)
          grupos[key].minutos += m || 0
          const dia = toISODate(a.inicio)
          if (dia) grupos[key].porDia[dia] = (grupos[key].porDia[dia] || 0) + (isNaN(q) ? 0 : q)
        }

        const linhas = Object.values(grupos).map(g => {
          const horas = (g.minutos || 0) / 60
          const media_h = horas > 0 ? g.quantidade / horas : 0
          const dias = Object.keys(g.porDia)
          const media_dia = dias.length > 0 ? (dias.reduce((acc,d)=> acc + (g.porDia[d]||0), 0) / dias.length) : 0
          const key = `${g.ferramenta}__${g.comprimento}`
          const ovr = overrides[key] || {}
          return { ...g, media_h, media_dia, key, ovr }
        }).sort((a,b)=> (a.ferramenta||'').localeCompare(b.ferramenta||''))

        return (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ferramenta</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comprimento</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Média (pcs/h)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ajuste (pcs/h)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Média (pcs/dia)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ajuste (pcs/dia)</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {linhas.map((r, idx) => (
                <tr key={idx}>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{r.ferramenta || '-'}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{r.comprimento || '-'}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{fmt(r.media_h, 2)}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                    <input
                      type="number"
                      className="input-field input-field-sm w-32"
                      placeholder="usar média"
                      value={r.ovr?.h ?? ''}
                      onChange={(e)=> setOverride(r.key, 'h', e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{fmt(r.media_dia, 0)}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                    <input
                      type="number"
                      className="input-field input-field-sm w-32"
                      placeholder="usar média"
                      value={r.ovr?.d ?? ''}
                      onChange={(e)=> setOverride(r.key, 'd', e.target.value)}
                    />
                  </td>
                </tr>
              ))}
              {linhas.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-6 text-center text-gray-500">Sem dados para calcular produtividade</td>
                </tr>
              )}
            </tbody>
          </table>
        )
      }
      case 'rastreabilidade': {
        // Reutiliza a mesma lógica do export para montar linhas
        let linhas = (() => {
          const out = []
          for (const a of apontamentosOrdenados) {
            const base = {
              Data: brDate(a.inicio),
              Hora: brTime(a.inicio),
              Maquina: maqMap[String(a.maquina)] || a.maquina || '-',
              Operador: a.operador || '-',
              PedidoSeq: a.ordemTrabalho || a.ordem_trabalho || a.pedido_seq || '-',
              Produto_Usinagem: a.produto || a.codigoPerfil || '-',
              Lote_Usinagem: a.lote || '-',
              Qtde_Produzida: a.quantidade || 0,
              Qtde_Refugo: a.qtd_refugo || 0,
              RackOuPallet: a.rack_ou_pallet || a.rackOuPallet || '-',
              LotesExternos: Array.isArray(a.lotes_externos) ? a.lotes_externos.join(', ') : (a.lote_externo || '')
            }
            const arr = Array.isArray(a.amarrados_detalhados) ? a.amarrados_detalhados : []
            if (arr.length === 0) {
              // Fallback por lotes_externos quando não houver amarrados_detalhados
              const lotesExt = Array.isArray(a.lotes_externos) ? a.lotes_externos : (a.lote_externo ? [a.lote_externo] : [])
              if (lotesExt.length > 0) {
                for (const loteNum of lotesExt) {
                  const l = (lotesDB || []).find(x => String(x.lote || '').trim() === String(loteNum)) || {}
                  out.push({
                    ...base,
                    Amarrado_Codigo: String(l.codigo || '').trim(),
                    Amarrado_Lote: String(l.lote || '').trim(),
                    Amarrado_Rack: String(l.rack_embalagem || '').trim(),
                    Amarrado_Produto: String(l.produto || getCampoOriginalLote(l, 'Produto') || '').trim(),
                    Amarrado_PedidoSeq: String(l.pedido_seq || '').trim(),
                    Amarrado_Romaneio: String(l.romaneio || '').trim(),
                    Amarrado_QtKG: Number(l.qt_kg || 0) || '',
                    Amarrado_QtdPC: Number(l.qtd_pc || 0) || ''
                  })
                }
              } else {
                out.push(base)
              }
            } else {
              for (const am of arr) {
                out.push({
                  ...base,
                  Amarrado_Codigo: am.codigo || '',
                  Amarrado_Lote: am.lote || '',
                  Amarrado_Rack: am.rack || '',
                  Amarrado_Produto: am.produto || '',
                  Amarrado_PedidoSeq: am.pedido_seq || '',
                  Amarrado_Romaneio: am.romaneio || '',
                  Amarrado_QtKG: am.qt_kg ?? '',
                  Amarrado_QtdPC: am.qtd_pc ?? ''
                })
              }
            }
          }
          return out
        })()
        
        // Aplicar modo compacto se selecionado
        if (filtros.modo === 'compacto') {
          linhas = agruparRastreabilidadeCompacto(linhas)
        }

        return (
          <div className="overflow-x-auto">
            <table className="min-w-[1200px] divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Hora</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Máquina</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Operador</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Pedido/Seq</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Produto Usinagem</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Lote Usinagem</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qtd Produzida</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Refugo</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rack/Pallet</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Lotes Externos</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amarrado Código</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amarrado Lote</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amarrado Rack</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amarrado Produto</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amarrado Pedido/Seq</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amarrado Romaneio</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amarrado Qt(kg)</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amarrado Qtd(pc)</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {linhas.map((r, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-2 text-sm text-gray-700">{r.Data}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{r.Hora}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{r.Maquina}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{r.Operador}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{r.PedidoSeq}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{r.Produto_Usinagem}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{r.Lote_Usinagem}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{r.Qtde_Produzida}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{r.Qtde_Refugo}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{r.RackOuPallet}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{r.LotesExternos}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{r.Amarrado_Codigo || '-'}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{r.Amarrado_Lote || '-'}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{r.Amarrado_Rack || '-'}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{r.Amarrado_Produto || '-'}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{r.Amarrado_PedidoSeq || '-'}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{r.Amarrado_Romaneio || '-'}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{r.Amarrado_QtKG ?? '-'}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{r.Amarrado_QtdPC ?? '-'}</td>
                  </tr>
                ))}
                {linhas.length === 0 && (
                  <tr><td colSpan="19" className="px-6 py-6 text-center text-gray-500">Nenhum dado de rastreabilidade no período/seleção</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )
      }
      
      default:
        return <p>Selecione um tipo de relatório</p>
    }
  }
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Relatórios</h1>
      
      <div className="bg-white rounded-lg shadow p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-700">Filtros</h2>
          <button
            type="button"
            onClick={() => setFiltrosAberto(v => !v)}
            className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
            title={filtrosAberto ? 'Recolher filtros' : 'Expandir filtros'}
          >
            {filtrosAberto ? 'Recolher' : 'Expandir'}
          </button>
        </div>
        
        {filtrosAberto && (
        <form onSubmit={handleSubmit}>
          {/* Grid responsivo para filtros principais (7 colunas em md+) */}
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Relatório
              </label>
              <select
                name="tipoRelatorio"
                value={filtros.tipoRelatorio}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                {tiposRelatorio.map(tipo => (
                  <option key={tipo.id} value={tipo.id}>{tipo.nome}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Início
              </label>
              <input
                type="date"
                name="dataInicio"
                value={filtros.dataInicio}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Fim
              </label>
              <input
                type="date"
                name="dataFim"
                value={filtros.dataFim}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Máquina
              </label>
              <select
                name="maquina"
                value={filtros.maquina}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">Todas as máquinas</option>
                {maquinas.map(maq => (
                  <option key={maq.id} value={maq.id}>{maq.nome}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Operador
              </label>
              <select
                name="operador"
                value={filtros.operador}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">Todos os operadores</option>
                {operadores.map(op => (
                  <option key={op.id} value={op.id}>{op.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ferramenta
              </label>
              <select
                name="ferramenta"
                value={filtros.ferramenta}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">Todas as ferramentas</option>
                {ferramentasLista.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Comprimento
              </label>
              <select
                name="comprimento"
                value={filtros.comprimento}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">Todos os comprimentos</option>
                {comprimentosLista.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            
            {/* Modo de Exibição (apenas para rastreabilidade) */}
            {filtros.tipoRelatorio === 'rastreabilidade' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Modo de Exibição
                </label>
                <select
                  name="modo"
                  value={filtros.modo}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="detalhado">Detalhado (1 linha por amarrado)</option>
                  <option value="compacto">Compacto (amarrados concatenados)</option>
                </select>
              </div>
            )}
          </div>
          
          {/* Seção de formato e botão */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pt-4 border-t border-gray-200">
            <div className="sm:w-48">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Formato de Exportação
              </label>
              <select
                name="formato"
                value={filtros.formato}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="excel">Excel</option>
                <option value="pdf">PDF</option>
              </select>
            </div>
            
            <div className="flex gap-2">
              <button 
                type="submit" 
                className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors whitespace-nowrap"
              >
                Gerar Relatório
              </button>
              <button 
                type="button"
                onClick={handleGerarTodosRelatorios}
                className="px-6 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors whitespace-nowrap"
              >
                Gerar Todos os Relatórios
              </button>
            </div>
          </div>
        </form>
        )}
      </div>
      
      <div className="bg-white rounded-lg shadow p-4 md:p-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Visualização Prévia</h2>
        
        <div className="overflow-x-auto pb-4">
          <PreviewRelatorio tipo={filtros.tipoRelatorio} />
        </div>
      </div>
    </div>
  )
}

export default Relatorios
