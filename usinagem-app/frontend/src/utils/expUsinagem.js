import * as XLSX from 'xlsx'
import {
  DEFAULT_STAGE,
  mapStageToDb,
  mapStageFromDb,
  TECNOPERFIL_STATUS,
  ALUNICA_STATUS
} from '../constants/expUsinagem'

const TECNO_STAGE_TITLE_MAP = TECNOPERFIL_STATUS.reduce((acc, stage) => {
  acc[stage.key] = stage.title
  return acc
}, {})

const ALUNICA_STAGE_TITLE_MAP = ALUNICA_STATUS.reduce((acc, stage) => {
  acc[stage.key] = stage.title
  return acc
}, {})

export const normalizeKey = (key) => String(key || '').toLowerCase().replace(/[^a-z0-9]/g, '')

export const extractFromSources = (sources, keys) => {
  const normalizedKeys = keys.map(normalizeKey)
  for (const source of sources) {
    if (!source) continue
    for (const [rawKey, value] of Object.entries(source)) {
      if (normalizedKeys.includes(normalizeKey(rawKey))) {
        return value
      }
    }
  }
  return null
}

export const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const normalized = String(value).trim().replace(/\./g, '').replace(',', '.')
  const num = Number(normalized)
  return Number.isFinite(num) ? num : null
}

export const formatNumber = (value) => {
  const num = toNumber(value)
  if (num === null) return '—'
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num)
}

export const formatInteger = (value) => {
  const num = toNumber(value)
  if (num === null) return '—'
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 0
  }).format(num)
}

const formatExcelNumber = (value) => {
  const num = toNumber(value)
  return Number.isFinite(num) ? num : null
}

export const parseDate = (value) => {
  if (!value && value !== 0) return null
  const str = String(value)
  const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) {
    const [, ano, mes, dia] = iso
    return new Date(Number(ano), Number(mes) - 1, Number(dia))
  }
  const br = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (br) {
    const [, dia, mes, ano] = br
    return new Date(Number(ano), Number(mes) - 1, Number(dia))
  }
  const parsed = new Date(str)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export const formatDateBR = (value) => {
  if (!value && value !== 0) return '—'
  const date = parseDate(value)
  if (!date) return String(value)
  return new Intl.DateTimeFormat('pt-BR').format(date)
}

const buildStageSummaryRows = (stages, stageTotals) =>
  stages.map((stage) => {
    const summary = stageTotals?.[stage.key] || {}
    return {
      Etapa: stage.title,
      Pedidos: formatExcelNumber(summary.count),
      Kg: formatExcelNumber(summary.kg),
      Pc: formatExcelNumber(summary.pc)
    }
  })

const buildDetailedRows = (stageTotals, titleMap = {}) => {
  const rows = []
  Object.entries(stageTotals || {}).forEach(([stageKey, resumo]) => {
    const ferramentas = resumo?.ferramentas || {}
    Object.entries(ferramentas).forEach(([ferramenta, dados]) => {
      rows.push({
        Etapa: titleMap[stageKey] || stageKey,
        Ferramenta: ferramenta,
        Pedidos: formatExcelNumber(dados?.count),
        Kg: formatExcelNumber(dados?.kg),
        Pc: formatExcelNumber(dados?.pc)
      })
    })
  })
  return rows
}

const buildPedidoDetalheRows = (pedidosResumo) => {
  if (!Array.isArray(pedidosResumo)) return []
  return pedidosResumo.map((pedido) => ({
    Pedido: pedido?.pedido || pedido?.pedidoSeq,
    Cliente: pedido?.cliente,
    'Status TecnoPerfil': pedido?.statusTecnoPerfil,
    'Status Alúnica': pedido?.statusAlunica,
    'Último movimento': pedido?.ultimaMovimentacao,
    Kg: formatExcelNumber(pedido?.pedidoKgNumber ?? pedido?.pedidoKg),
    Pc: formatExcelNumber(pedido?.pedidoPcNumber ?? pedido?.pedidoPc)
  }))
}

const buildTopFerramentasRows = (stageTotals, titleMap = {}, limite = 5) => {
  const rows = []
  Object.entries(stageTotals || {}).forEach(([stageKey, resumo]) => {
    const ferramentas = resumo?.ferramentas || {}
    const lista = Object.entries(ferramentas)
      .map(([ferramenta, dados]) => ({
        etapa: titleMap[stageKey] || stageKey,
        ferramenta,
        kg: formatExcelNumber(dados?.kg) || 0,
        pc: formatExcelNumber(dados?.pc) || 0,
        pedidos: formatExcelNumber(dados?.count) || 0
      }))
      .sort((a, b) => {
        if (b.kg !== a.kg) return b.kg - a.kg
        if (b.pedidos !== a.pedidos) return b.pedidos - a.pedidos
        return b.pc - a.pc
      })
      .slice(0, limite)

    lista.forEach((item) => {
      rows.push({
        Etapa: item.etapa,
        Ferramenta: item.ferramenta,
        Pedidos: item.pedidos,
        Kg: item.kg,
        Pc: item.pc
      })
    })
  })
  return rows
}

export const exportResumoExcel = ({
  resumoTecnoPerfil,
  resumoAlunica,
  pedidosResumo,
  lastMovement,
  tecnoperfilStatus = TECNOPERFIL_STATUS,
  alunicaStatus = ALUNICA_STATUS
}) => {
  const workbook = XLSX.utils.book_new()

  const totalPedidosMonitorados =
    (Number(resumoTecnoPerfil?.totalCount) || 0) + (Number(resumoAlunica?.totalCount) || 0)
  const totalKgTecno = Number(resumoTecnoPerfil?.totalKg) || 0
  const totalKgAlunica = Number(resumoAlunica?.totalKg) || 0
  const totalPedidosTecno = Number(resumoTecnoPerfil?.totalCount) || 0
  const totalPedidosAlunica = Number(resumoAlunica?.totalCount) || 0

  const resumoSheetData = [
    ['Resumo Geral'],
    ['Pedidos monitorados', totalPedidosMonitorados],
    ['TecnoPerfil Kg', totalKgTecno],
    ['Alúnica Kg', totalKgAlunica],
    ['TecnoPerfil Pedidos', totalPedidosTecno],
    ['Alúnica Pedidos', totalPedidosAlunica]
  ]

  if (lastMovement) {
    resumoSheetData.push([])
    resumoSheetData.push(['Última movimentação', lastMovement.pedido])
    resumoSheetData.push(['Cliente', lastMovement.cliente])
    resumoSheetData.push(['Destino', lastMovement.destino])
  }

  const buildStageList = (statuses = [], stageTotals = {}) =>
    statuses.map((status) => ({
      area: status.area || status.title,
      title: status.title,
      key: status.key,
      summary: {
        count: Number(stageTotals?.[status.key]?.count) || 0,
        kg: Number(stageTotals?.[status.key]?.kg) || 0,
        pc: Number(stageTotals?.[status.key]?.pc) || 0
      }
    }))

  const tecnoHotspots = buildStageList(tecnoperfilStatus, resumoTecnoPerfil?.stages)
    .filter((stage) => stage.summary.count > 0)
    .sort((a, b) => {
      if (b.summary.count !== a.summary.count) return b.summary.count - a.summary.count
      return b.summary.kg - a.summary.kg
    })
    .slice(0, 2)

  const alunicaHotspots = buildStageList(alunicaStatus, resumoAlunica?.stages)
    .filter((stage) => stage.summary.count > 0)
    .sort((a, b) => {
      if (b.summary.count !== a.summary.count) return b.summary.count - a.summary.count
      return b.summary.kg - a.summary.kg
    })
    .slice(0, 2)

  const hotspots = [
    ...tecnoHotspots.map((stage) => ({ area: 'TecnoPerfil', title: stage.title, resumo: stage.summary })),
    ...alunicaHotspots.map((stage) => ({ area: 'Alúnica', title: stage.title, resumo: stage.summary }))
  ]

  if (hotspots.length > 0) {
    resumoSheetData.push([])
    resumoSheetData.push(['Próximas ações prioritárias'])
    resumoSheetData.push(['Área', 'Estágio', 'Pedidos', 'Kg', 'Pc'])
    hotspots.forEach((item) => {
      resumoSheetData.push([
        item.area,
        item.title,
        formatExcelNumber(item?.resumo?.count) ?? 0,
        formatExcelNumber(item?.resumo?.kg) ?? 0,
        formatExcelNumber(item?.resumo?.pc) ?? 0
      ])
    })
  }

  const resumoSheet = XLSX.utils.aoa_to_sheet(resumoSheetData)
  XLSX.utils.book_append_sheet(workbook, resumoSheet, 'Resumo')

  const tecnoSummarySheet = XLSX.utils.json_to_sheet(
    buildStageSummaryRows(TECNOPERFIL_STATUS, resumoTecnoPerfil?.stages)
  )
  XLSX.utils.book_append_sheet(workbook, tecnoSummarySheet, 'TecnoPerfil_Resumo')

  const tecnoTop = buildTopFerramentasRows(resumoTecnoPerfil?.stages, TECNO_STAGE_TITLE_MAP)
  if (tecnoTop.length) {
    const sheetTop = XLSX.utils.json_to_sheet(tecnoTop)
    XLSX.utils.book_append_sheet(workbook, sheetTop, 'TecnoPerfil_Top')
  }

  const tecnoDetalhes = buildDetailedRows(resumoTecnoPerfil?.stages, TECNO_STAGE_TITLE_MAP)
  if (tecnoDetalhes.length) {
    const sheetDetalhes = XLSX.utils.json_to_sheet(tecnoDetalhes)
    XLSX.utils.book_append_sheet(workbook, sheetDetalhes, 'TecnoPerfil_Ferramentas')
  }

  const alunicaSummarySheet = XLSX.utils.json_to_sheet(
    buildStageSummaryRows(ALUNICA_STATUS, resumoAlunica?.stages)
  )
  XLSX.utils.book_append_sheet(workbook, alunicaSummarySheet, 'Alunica_Resumo')

  const alunicaTop = buildTopFerramentasRows(resumoAlunica?.stages, ALUNICA_STAGE_TITLE_MAP)
  if (alunicaTop.length) {
    const sheetTop = XLSX.utils.json_to_sheet(alunicaTop)
    XLSX.utils.book_append_sheet(workbook, sheetTop, 'Alunica_Top')
  }

  const alunicaDetalhes = buildDetailedRows(resumoAlunica?.stages, ALUNICA_STAGE_TITLE_MAP)
  if (alunicaDetalhes.length) {
    const sheetDetalhes = XLSX.utils.json_to_sheet(alunicaDetalhes)
    XLSX.utils.book_append_sheet(workbook, sheetDetalhes, 'Alunica_Ferramentas')
  }

  const pedidosRows = buildPedidoDetalheRows(pedidosResumo)
  if (pedidosRows.length) {
    const sheetPedidos = XLSX.utils.json_to_sheet(pedidosRows)
    XLSX.utils.book_append_sheet(workbook, sheetPedidos, 'Pedidos_Detalhe')
  }

  const fileName = `exp_usinagem_resumo_${new Date().toISOString().split('T')[0]}.xlsx`
  XLSX.writeFile(workbook, fileName, { compression: true })
}

export const extrairFerramenta = (produto) => {
  if (!produto) return '—'
  const str = String(produto).toUpperCase()
  // Captura prefixo de 2 a 4 letras seguido do primeiro bloco de dígitos (3+)
  const match = str.match(/^([A-Z]{2,4})(\d{3,})/)
  if (match) {
    const prefixo = match[1]
    const digitos = match[2]
    // Regra específica: para EXP usar somente os 3 primeiros dígitos (ex.: EXP908 → EXP-908)
    if (prefixo === 'EXP') {
      const n3 = digitos.slice(0, 3)
      return `${prefixo}-${n3}`
    }
    // Demais prefixos: usar até 4 dígitos (mantém TP-0192, etc.)
    const n4 = digitos.slice(0, 4).padEnd(4, '0')
    return `${prefixo}-${n4}`
  }
  return str.slice(0, 7) || '—'
}

export const toIsoDate = (value) => {
  if (!value && value !== 0) return null
  if (value instanceof Date) {
    return value.toISOString().split('T')[0]
  }
  if (typeof value === 'number' && XLSX?.SSF?.parse_date_code) {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (parsed) {
      const date = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d))
      return date.toISOString().split('T')[0]
    }
  }

  const str = String(value).trim()
  if (!str) return null

  const slashMatch = str.match(/^(\d{1,2})[\/](\d{1,2})[\/](\d{2,4})$/)
  if (slashMatch) {
    const [, d, m, yRaw] = slashMatch
    const year = yRaw.length === 2 ? `20${yRaw}` : yRaw.padStart(4, '20')
    const month = m.padStart(2, '0')
    const day = d.padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const dashMatch = str.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/)
  if (dashMatch) {
    const [, d, m, yRaw] = dashMatch
    const year = yRaw.length === 2 ? `20${yRaw}` : yRaw.padStart(4, '20')
    const month = m.padStart(2, '0')
    const day = d.padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const isoCandidate = new Date(str)
  if (!Number.isNaN(isoCandidate.getTime())) {
    return isoCandidate.toISOString().split('T')[0]
  }

  return null
}

export const toDecimal = (value) => {
  if (value === undefined || value === null || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const normalized = String(value).replace(/\./g, '').replace(',', '.')
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

export const toIntegerRound = (value) => {
  if (value === undefined || value === null || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? Math.round(value) : null
  const normalized = String(value).replace(/\./g, '').replace(',', '.')
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? Math.round(parsed) : null
}

export const buildPedidoBase = (values, original = {}, fonte = 'carteira') => {
  const pedidoSeq = String(values.pedido || '').trim()
  const cliente = String(values.cliente || '').trim()

  if (!pedidoSeq || !cliente) {
    return null
  }

  const numeroPedido = values.numeroPedido ? String(values.numeroPedido).trim() : ''
  // Normaliza regra da ferramenta (EXP-xxx ou prefixo-4dígitos)
  const ferramenta = values.ferramenta ? extrairFerramenta(values.ferramenta) : ''
  const pedidoKg = toDecimal(values.pedidoKg)
  const pedidoPc = toIntegerRound(values.pedidoPc)
  const dataEntregaIso = toIsoDate(values.dataEntrega)

  const dadosOriginais = {
    ...original,
    pedido: pedidoSeq,
    cliente,
    numero_pedido: numeroPedido || undefined,
    data_entrega: dataEntregaIso || undefined,
    ferramenta: ferramenta || undefined,
    pedido_kg: pedidoKg ?? undefined,
    pedido_pc: pedidoPc ?? undefined,
    item_perfil: values.itemPerfil || original['item.perfil'] || original['Item.Perfil'] || original['perfil'] || undefined,
    item_do_cliente: values.itemDoCliente || original['item.do.cliente'] || original['Item do Cliente'] || undefined,
    fonte_exp_usinagem: fonte
  }

  Object.keys(dadosOriginais).forEach((key) => {
    const value = dadosOriginais[key]
    if (value === undefined || value === null || value === '') {
      delete dadosOriginais[key]
    }
  })

  return {
    pedidoSeq,
    cliente,
    numeroPedido,
    dataEntregaIso,
    ferramenta,
    pedidoKg,
    pedidoPc,
    dadosOriginais
  }
}

export const buildFluxoRecordFromBase = (base, origem = 'carteira', extras = {}) => {
  if (!base) return null
  const agora = new Date().toISOString()
  return {
    origem,
    pedido_seq: base.pedidoSeq,
    cliente: base.cliente,
    numero_pedido: base.numeroPedido || null,
    data_entrega: base.dataEntregaIso,
    ferramenta: base.ferramenta || null,
    pedido_kg: base.pedidoKg,
    pedido_pc: base.pedidoPc,
    // Inicializa saldos disponíveis com o total do pedido
    kg_disponivel: base.pedidoKg ?? 0,
    pc_disponivel: base.pedidoPc ?? 0,
    // Saldos acumulados começam zerados
    saldo_kg_total: 0,
    saldo_pc_total: 0,
    status_atual: mapStageToDb(DEFAULT_STAGE),
    dados_originais: base.dadosOriginais,
    selecionado_por: extras.selecionadoPor || null,
    selecionado_em: extras.selecionadoEm || agora,
    criado_em: extras.criadoEm || agora,
    atualizado_em: extras.atualizadoEm || agora,
    ...extras
  }
}

export const buildImportadoRecord = (base, originalRow = {}, extras = {}) => {
  if (!base) return null
  return {
    arquivo_nome: extras.arquivoNome || null,
    arquivo_hash: extras.arquivoHash || null,
    pedido: base.pedidoSeq,
    cliente: base.cliente,
    numero_pedido: base.numeroPedido || null,
    data_entrega: base.dataEntregaIso,
    ferramenta: base.ferramenta || null,
    pedido_kg: base.pedidoKg,
    pedido_pc: base.pedidoPc,
    dados_brutos: { ...originalRow, ...base.dadosOriginais },
    importado_por: extras.importadoPor || null
  }
}

export const mapRowToImportadoRecord = (row, extras = {}) => {
  if (!row || typeof row !== 'object') return null

  const pedido = extractFromSources([row], ['pedido', 'pedido_seq', 'pedido/seq'])
  const cliente = extractFromSources([row], ['cliente', 'nome_cliente'])
  const numeroPedido = extractFromSources([row], ['nr pedido', 'nr_pedido', 'pedido_cliente', 'número do pedido'])
  const dataEntrega = extractFromSources([row], ['data entrega', 'data_entrega', 'entrega', 'data', 'dt entrega'])
  const ferramenta = extractFromSources([row], ['ferramenta', 'produto', 'codigo produto'])
  const pedidoKg = extractFromSources([row], ['pedido kg', 'pedido_kg', 'kg', 'peso kg'])
  const pedidoPc = extractFromSources([row], ['pedido pc', 'pedido_pc', 'quantidade', 'qtd', 'qtd_pedido'])
  const itemPerfil = extractFromSources([row], ['item.perfil', 'item perfil', 'perfil', 'perfil longo', 'item_perfil'])
  const itemDoCliente = extractFromSources([row], ['item.do.cliente', 'item do cliente', 'item_do_cliente'])

  const base = buildPedidoBase(
    { pedido, cliente, numeroPedido, dataEntrega, ferramenta, pedidoKg, pedidoPc },
    row,
    'arquivo'
  )

  return buildImportadoRecord(base, row, extras)
}

export const normalizeFluxoRecord = (registro) => {
  if (!registro) return null
  const base = buildPedidoBase(
    {
      pedido: registro.pedido_seq,
      cliente: registro.cliente,
      numeroPedido: registro.numero_pedido,
      dataEntrega: registro.data_entrega,
      ferramenta: registro.ferramenta,
      pedidoKg: registro.pedido_kg,
      pedidoPc: registro.pedido_pc
    },
    registro.dados_originais || {},
    registro.origem || 'carteira'
  )

  if (!base) return null

  return {
    id: registro.id,
    origem: registro.origem,
    status: mapStageFromDb(registro.status_atual),
    pedido: base.pedidoSeq,
    cliente: base.cliente,
    numeroPedido: base.numeroPedido || '—',
    dataEntregaRaw: base.dataEntregaIso,
    dataEntrega: formatDateBR(base.dataEntregaIso),
    ferramenta: base.ferramenta || '—',
    pedidoKg: formatNumber(base.pedidoKg),
    pedidoPc: formatInteger(base.pedidoPc),
    pedidoKgNumber: typeof base.pedidoKg === 'number' ? base.pedidoKg : toNumber(base.pedidoKg) || 0,
    pedidoPcNumber: typeof base.pedidoPc === 'number' ? base.pedidoPc : toNumber(base.pedidoPc) || 0,
    ultimaMovimentacao: formatDateBR(registro.atualizado_em || registro.moved_at || registro.movimentado_em),
    source: 'fluxo'
  }
}

export const sanitizeStageMap = (rawMap, validStages, fallback) => {
  const safe = {}
  Object.entries(rawMap || {}).forEach(([id, stage]) => {
    safe[id] = validStages.includes(stage) ? stage : fallback
  })
  return safe
}

export const parseDadosOriginais = (pedido) => {
  const raw = pedido?.dados_originais
  if (!raw) return null
  if (typeof raw === 'object') return raw
  try {
    return JSON.parse(raw)
  } catch (error) {
    console.warn('Não foi possível interpretar dados_originais do pedido', error)
    return null
  }
}

/**
 * Calcula a duração total de trabalho em minutos a partir de apontamentos
 * @param {Array} apontamentos - Array de apontamentos com campos inicio e fim
 * @returns {number} - Total de minutos trabalhados
 */
export const calcularDuracaoTotal = (apontamentos) => {
  if (!Array.isArray(apontamentos) || apontamentos.length === 0) {
    return 0
  }

  let totalMinutos = 0
  
  apontamentos.forEach(apont => {
    if (apont.inicio && apont.fim) {
      try {
        const inicio = new Date(apont.inicio)
        const fim = new Date(apont.fim)
        const diffMs = fim - inicio
        const diffMin = Math.max(0, diffMs / (1000 * 60))
        totalMinutos += diffMin
      } catch (e) {
        console.warn('Erro ao calcular duração:', e)
      }
    }
  })

  return totalMinutos
}

/**
 * Formata minutos em formato legível (Ex: "2h 30m" ou "45m")
 * @param {number} minutos - Total de minutos
 * @returns {string} - Duração formatada
 */
export const formatarDuracao = (minutos) => {
  if (!minutos || minutos <= 0) return '—'
  
  const horas = Math.floor(minutos / 60)
  const mins = Math.round(minutos % 60)
  
  if (horas > 0 && mins > 0) {
    return `${horas}h ${mins}m`
  } else if (horas > 0) {
    return `${horas}h`
  } else {
    return `${mins}m`
  }
}
