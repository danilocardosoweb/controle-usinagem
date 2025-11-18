import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaTimes, FaUndo, FaChevronRight, FaClipboardCheck, FaBoxOpen, FaIndustry, FaTruck, FaWarehouse, FaCogs, FaCheckCircle, FaEdit, FaUpload, FaCheck, FaPlay } from 'react-icons/fa'
import * as XLSX from 'xlsx'
import PageTitle from '../components/PageTitle'
import useSupabase from '../hooks/useSupabase'
import supabaseService from '../services/SupabaseService'
import StatusCard from '../components/exp-usinagem/StatusCard'
import AlunicaStageCard from '../components/exp-usinagem/AlunicaStageCard'
import WorkflowHeader from '../components/exp-usinagem/WorkflowHeader'
import ResumoDashboard from '../components/exp-usinagem/ResumoDashboard'
import InventariosPanel from '../components/exp-usinagem/InventariosPanel'
import EstoqueUsinagemPanel from '../components/exp-usinagem/EstoqueUsinagemPanel'
import SelectionModal from '../components/exp-usinagem/SelectionModal'
import DeletePedidoButton from '../components/exp-usinagem/DeletePedidoButton'
import useFluxoExpUsinagem from '../hooks/useFluxoExpUsinagem'
import useInventarios from '../hooks/useInventarios'
import { useAuth } from '../contexts/AuthContext'
import { isAdmin as isAdminCheck } from '../utils/auth'
import { REFACTOR } from '../config/refactorFlags'
import ApontamentoModal from '../components/exp-usinagem/modals/ApontamentoModal'
import AprovarModal from '../components/exp-usinagem/modals/AprovarModal'
import ReabrirModal from '../components/exp-usinagem/modals/ReabrirModal'
import useApontamentoModal from '../hooks/useApontamentoModal'
import useAlunicaModals from '../hooks/useAlunicaModals'
import {
  TABS,
  TECNOPERFIL_STATUS,
  ALUNICA_STATUS,
  STATUS_TABS,
  TECNO_STAGE_KEYS,
  DEFAULT_STAGE,
  STATUS_LABEL,
  STAGE_ACTIONS,
  INITIAL_MANUAL_PEDIDO,
  EMPTY_MESSAGES,
  ALUNICA_STAGE_KEYS,
  ALUNICA_DEFAULT_STAGE,
  ALUNICA_ACTIONS,
  mapStageFromDb,
  mapStageToDb
} from '../constants/expUsinagem'
import {
  extractFromSources,
  formatNumber,
  formatInteger,
  formatDateBR,
  parseDate,
  extrairFerramenta,
  toIsoDate,
  buildPedidoBase,
  buildFluxoRecordFromBase,
  mapRowToImportadoRecord,
  normalizeFluxoRecord,
  parseDadosOriginais,
  exportResumoExcel,
  toDecimal,
  toIntegerRound
} from '../utils/expUsinagem'

const toLocalDateTimeInput = (value) => {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offsetMs = date.getTimezoneOffset() * 60000
  const local = new Date(date.getTime() - offsetMs)
  return local.toISOString().slice(0, 16)
}

const localDateTimeToISO = (value) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

const addMinutesToLocalInput = (value, minutes = 5) => {
  if (!value) return ''
  const date = value instanceof Date ? new Date(value) : new Date(String(value))
  if (Number.isNaN(date.getTime())) return ''
  date.setMinutes(date.getMinutes() + minutes)
  return toLocalDateTimeInput(date)
}

const FINALIZADOS_STORAGE_KEY = 'exp_usinagem_finalizados_alunica'
const LEGACY_FINALIZADOS_STORAGE_KEY = 'exp_usinagem_finalizados_v1'

const ExpUsinagem = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState(TABS[0])
  const [orderStages, setOrderStages] = useState({})
  const [lastMovement, setLastMovement] = useState(null)
  const [alunicaStages, setAlunicaStages] = useState({})
  const [finalizados, setFinalizados] = useState(() => {
    try {
      const curr = localStorage.getItem(FINALIZADOS_STORAGE_KEY)
      const legacy = localStorage.getItem(LEGACY_FINALIZADOS_STORAGE_KEY)
      const parsedCurr = curr ? JSON.parse(curr) : []
      const parsedLegacy = legacy ? JSON.parse(legacy) : []
      const both = [...(Array.isArray(parsedCurr) ? parsedCurr : []), ...(Array.isArray(parsedLegacy) ? parsedLegacy : [])]
      // unique
      return both.filter((v, i, a) => a.indexOf(v) === i)
    } catch {
      return []
    }
  })
  const closeReabrirModal = () => {
    setAlunicaReabrirOpen(false)
    setAlunicaReabrirPedido(null)
    setAlunicaReabrirItens([])
    setAlunicaReabrirError(null)
  }

  // Aprovação total (1 clique) por pedido no estágio para-inspecao
  const handleAprovarTudoOneClick = async (orderId) => {
    const id = String(orderId)
    setAlunicaActionLoading((prev) => new Set([...prev, id]))
    try {
      const apontList = await supabaseService.getByIndex('apontamentos', 'exp_fluxo_id', id)
      const rows = Array.isArray(apontList)
        ? apontList.filter((row) => row && row.exp_unidade === 'alunica' && row.exp_stage === 'para-inspecao')
        : []
      for (const row of rows) {
        await supabaseService.update('apontamentos', { id: row.id, exp_stage: 'para-embarque' })
      }

      const movimentoBase = {
        fluxo_id: id,
        movimentado_por: user?.nome || user?.email || 'Operador',
        movimentado_em: new Date().toISOString(),
        tipo_movimentacao: 'status'
      }

      await supabaseService.add('exp_pedidos_movimentacoes', {
        ...movimentoBase,
        status_anterior: alunicaStages[id] || 'para-inspecao',
        status_novo: 'para-embarque',
        motivo: 'aprovacao_inspecao'
      })

      await supabaseService.update('exp_pedidos_fluxo', { id, alunica_stage: 'para-embarque' })
      setAlunicaStages((prev) => ({ ...prev, [id]: 'para-embarque' }))

      await loadApontamentosFor(id)
      await loadFluxo()
    } catch (e) {
      console.error('Falha em Aprovar Tudo (1 clique):', e)
    } finally {
      setAlunicaActionLoading((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  // Reabertura total (1 clique) por pedido no estágio para-embarque
  const handleReabrirTudoOneClick = async (orderId) => {
    const id = String(orderId)
    setAlunicaActionLoading((prev) => new Set([...prev, id]))
    try {
      const apontList = await supabaseService.getByIndex('apontamentos', 'exp_fluxo_id', id)
      const rows = Array.isArray(apontList)
        ? apontList.filter((row) => row && row.exp_unidade === 'alunica' && row.exp_stage === 'para-embarque')
        : []
      for (const row of rows) {
        await supabaseService.update('apontamentos', { id: row.id, exp_stage: 'para-inspecao' })
      }

      const movimentoBase = {
        fluxo_id: id,
        movimentado_por: user?.nome || user?.email || 'Operador',
        movimentado_em: new Date().toISOString(),
        tipo_movimentacao: 'status'
      }

      await supabaseService.add('exp_pedidos_movimentacoes', {
        ...movimentoBase,
        status_anterior: alunicaStages[id] || 'para-embarque',
        status_novo: 'para-inspecao',
        motivo: 'reabertura_inspecao'
      })

      await supabaseService.update('exp_pedidos_fluxo', { id, alunica_stage: 'para-inspecao' })
      setAlunicaStages((prev) => ({ ...prev, [id]: 'para-inspecao' }))

      await loadApontamentosFor(id)
      await loadFluxo()
    } catch (e) {
      console.error('Falha em Reabrir Tudo (1 clique):', e)
    } finally {
      setAlunicaActionLoading((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const setReabrirMover = (lote, value) => {
    setAlunicaReabrirItens((prev) => prev.map((it) => {
      if (it.lote !== lote) return it
      const disp = toIntegerRound(it.disponivel) || 0
      let v = toIntegerRound(value) || 0
      if (v < 0) v = 0
      if (v > disp) v = disp
      return { ...it, mover: v }
    }))
  }

  const reabrirTudoFill = () => {
    setAlunicaReabrirItens((prev) => prev.map((it) => ({ ...it, mover: toIntegerRound(it.disponivel) || 0 })))
  }

  const handleReabrirConfirm = async () => {
    if (!alunicaReabrirPedido) return
    const id = String(alunicaReabrirPedido.id)
    const itens = Array.isArray(alunicaReabrirItens) ? alunicaReabrirItens : []
    const valid = itens.filter((i) => (toIntegerRound(i.mover) || 0) > 0)
    if (!valid.length) {
      setAlunicaReabrirError('Informe quantidades para reabrir.')
      return
    }
    setAlunicaReabrirSaving(true)
    setAlunicaReabrirError(null)
    try {
      const apontList = await supabaseService.getByIndex('apontamentos', 'exp_fluxo_id', id)
      const stageAtual = alunicaStages[id] || 'para-embarque'
      let sumDisp = 0
      let sumMov = 0
      itens.forEach((i) => { sumDisp += toIntegerRound(i.disponivel) || 0; sumMov += toIntegerRound(i.mover) || 0 })
      for (const item of valid) {
        let qtyToMove = toIntegerRound(item.mover) || 0
        if (qtyToMove <= 0) continue
        const rows = (Array.isArray(apontList) ? apontList : []).filter((row) => row && row.exp_unidade === 'alunica' && row.exp_stage === 'para-embarque' && (row.lote || '(sem lote)') === item.lote)
        for (const row of rows) {
          const q = toIntegerRound(row.quantidade) || 0
          if (qtyToMove >= q) {
            await supabaseService.update('apontamentos', { id: row.id, exp_stage: 'para-inspecao' })
            qtyToMove -= q
          } else if (qtyToMove > 0) {
            const restante = q - qtyToMove
            await supabaseService.update('apontamentos', { id: row.id, quantidade: restante })
            const { id: _oldId, ...copy } = row
            const novo = { ...copy, quantidade: qtyToMove, exp_stage: 'para-inspecao' }
            await supabaseService.add('apontamentos', novo)
            qtyToMove = 0
          }
          if (qtyToMove <= 0) break
        }
      }
      const movimentoBase = {
        fluxo_id: id,
        movimentado_por: user?.nome || user?.email || 'Operador',
        movimentado_em: new Date().toISOString(),
        tipo_movimentacao: 'status'
      }
      const motivo = sumMov >= sumDisp ? 'reabertura_inspecao' : 'reabertura_inspecao_parcial'
      await supabaseService.add('exp_pedidos_movimentacoes', {
        ...movimentoBase,
        status_anterior: stageAtual,
        status_novo: sumMov >= sumDisp ? 'para-inspecao' : 'para-embarque',
        motivo
      })
      if (sumMov >= sumDisp) {
        setAlunicaStages((prev) => ({ ...prev, [id]: 'para-inspecao' }))
        // Persistir estágio no banco quando a reabertura for total
        await supabaseService.update('exp_pedidos_fluxo', { id, alunica_stage: 'para-inspecao' })
      }
      await loadApontamentosFor(id)
      await loadFluxo()
      closeReabrirModal()
    } catch (e) {
      setAlunicaReabrirError(e?.message || 'Falha ao reabrir inspeção.')
    } finally {
      setAlunicaReabrirSaving(false)
    }
  }

  const {
    items: pedidos,
    loading: pedidosLoading,
    error: pedidosError
  } = useSupabase('pedidos')
  const [manualPedido, setManualPedido] = useState(INITIAL_MANUAL_PEDIDO)
  const [importFeedback, setImportFeedback] = useState({ type: null, message: '' })
  const [deletingIds, setDeletingIds] = useState(new Set())

  const isAdmin = useMemo(() => isAdminCheck(user), [user])
  const [showManualForm, setShowManualForm] = useState(false)
  const fileInputRef = useRef(null)
  const [isProcessingImport, setIsProcessingImport] = useState(false)
  const {
    fluxoPedidos,
    fluxoLoading,
    fluxoError,
    loadFluxo,
    importados,
    importadosLoading,
    loadImportados
  } = useFluxoExpUsinagem()
  const [selectionModalOpen, setSelectionModalOpen] = useState(false)
  const [selectionTab, setSelectionTab] = useState('importados')
  const [selectedImportados, setSelectedImportados] = useState([])
  const [selectedCarteira, setSelectedCarteira] = useState([])
  const [isSavingSelection, setIsSavingSelection] = useState(false)
  const [exportingResumo, setExportingResumo] = useState(false)
  const [alunicaApontOpen, setAlunicaApontOpen] = useState(false)
  const [alunicaApontPedido, setAlunicaApontPedido] = useState(null)
  const [alunicaApontStage, setAlunicaApontStage] = useState(null)
  const [alunicaApontQtdPc, setAlunicaApontQtdPc] = useState('')
  const [alunicaApontQtdPcInspecao, setAlunicaApontQtdPcInspecao] = useState('')
  const [alunicaApontObs, setAlunicaApontObs] = useState('')
  const [alunicaApontSaving, setAlunicaApontSaving] = useState(false)
  const [alunicaApontError, setAlunicaApontError] = useState(null)
  const [alunicaApontInicio, setAlunicaApontInicio] = useState('')
  const [alunicaApontFim, setAlunicaApontFim] = useState('')
  const [alunicaApontFimTouched, setAlunicaApontFimTouched] = useState(false)
  const [apontByFluxo, setApontByFluxo] = useState(/** @type {Record<string, any[]>} */({}))
  const [alunicaActionLoading, setAlunicaActionLoading] = useState(() => new Set())
  const [alunicaAprovarOpen, setAlunicaAprovarOpen] = useState(false)
  const [alunicaAprovarPedido, setAlunicaAprovarPedido] = useState(null)
  const [alunicaAprovarItens, setAlunicaAprovarItens] = useState([])
  const [alunicaAprovarSaving, setAlunicaAprovarSaving] = useState(false)
  const [alunicaAprovarError, setAlunicaAprovarError] = useState(null)
  const [alunicaReabrirOpen, setAlunicaReabrirOpen] = useState(false)
  const [alunicaReabrirPedido, setAlunicaReabrirPedido] = useState(null)
  const [alunicaReabrirItens, setAlunicaReabrirItens] = useState([])
  const [alunicaReabrirSaving, setAlunicaReabrirSaving] = useState(false)
  const [alunicaReabrirError, setAlunicaReabrirError] = useState(null)
  const [estoqueUnidade, setEstoqueUnidade] = useState('todas')
  const [estoqueSituacao, setEstoqueSituacao] = useState('todas')
  const [estoquePeriodo, setEstoquePeriodo] = useState(30)
  const [exportandoEstoque, setExportandoEstoque] = useState(false)
  const [estoqueBusca, setEstoqueBusca] = useState('')
  const [estoqueSubTab, setEstoqueSubTab] = useState('estoque')
  
  // pedidosTecnoPerfil precisa vir antes do useInventarios
  const pedidosTecnoPerfil = useMemo(() => {
    if (!Array.isArray(fluxoPedidos)) return []

    return fluxoPedidos
      .map(normalizeFluxoRecord)
      .filter((item) => item !== null)
      .sort((a, b) => {
        // Ordena por data de atualização (mais recente primeiro)
        const dataAtualizacaoA = a.atualizado_em ? new Date(a.atualizado_em) : new Date(0)
        const dataAtualizacaoB = b.atualizado_em ? new Date(b.atualizado_em) : new Date(0)
        
        // Se as datas de atualização forem iguais, ordena por data de entrega
        if (dataAtualizacaoA.getTime() === dataAtualizacaoB.getTime()) {
          const dataEntregaA = parseDate(a.dataEntregaRaw) || new Date(0)
          const dataEntregaB = parseDate(b.dataEntregaRaw) || new Date(0)
          return dataEntregaA - dataEntregaB
        }
        
        return dataAtualizacaoB - dataAtualizacaoA
      })
  }, [fluxoPedidos])
  

  // Hook de Inventários (refatorado)
  const {
    inventarios,
    invLoading,
    activeInventario,
    invItens,
    invItensLoading,
    invSaving,
    invError,
    newInvUnidade,
    newInvObs,
    setActiveInventario,
    setInvItemField,
    setNewInvUnidade,
    setNewInvObs,
    loadInventarios,
    loadInventarioItens,
    createInventarioFromSnapshot,
    saveInventarioItem,
    cancelInventario
  } = useInventarios({ fluxoPedidos, pedidosTecnoPerfil, alunicaStages, user })

  useEffect(() => {
    if (activeTab === 'Estoque da Usinagem' && estoqueSubTab === 'inventarios') {
      loadInventarios()
      if (activeInventario) {
        loadInventarioItens(activeInventario)
      }
    }
  }, [activeTab, estoqueSubTab, activeInventario, loadInventarios, loadInventarioItens])

  useEffect(() => {
    try {
      localStorage.setItem(FINALIZADOS_STORAGE_KEY, JSON.stringify(finalizados))
      localStorage.setItem(LEGACY_FINALIZADOS_STORAGE_KEY, JSON.stringify(finalizados))
    } catch (e) {
      console.warn('Não foi possível salvar finalizados da Alúnica:', e)
    }
  }, [finalizados])

  const isPedidoCompleto = useCallback((pedido) => {
    if (!pedido) return false
    const total = toIntegerRound(pedido.pedidoPcNumber ?? pedido.pedidoPc) || 0
    if (total <= 0) return false
    const apont = toIntegerRound(pedido.apontadoPcNumber ?? pedido.apontadoPc) || 0
    return apont >= total
  }, [])

  const finalizarPedidoAlunica = useCallback((orderId) => {
    if (!orderId) return
    const id = String(orderId)
    setFinalizados((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }, [])

  const reabrirPedidoAlunica = useCallback((orderId) => {
    if (!orderId) return
    const id = String(orderId)
    setFinalizados((prev) => prev.filter((curr) => curr !== id))
  }, [])

  const pedidosCarteira = useMemo(() => {
    if (!Array.isArray(pedidos)) return []

    const list = pedidos
      .map((pedido) => {
        const dadosOriginais = parseDadosOriginais(pedido)
        const sources = [pedido, dadosOriginais]
        const getVal = (keys) => extractFromSources(sources, keys)

        const pedidoSeq = getVal(['pedido_seq', 'pedido']) || pedido.pedido_seq
        const cliente = getVal(['cliente', 'nome_cliente']) || pedido.cliente

        if (!pedidoSeq || !cliente) return null

        const numeroPedido = getVal(['pedido_cliente', 'nr_pedido', 'numero_pedido']) || pedido.pedido_cliente
        const dataEntregaRaw = getVal(['dt_fatura', 'data_entrega', 'data entrega', 'dt_entrega']) || pedido.dt_fatura
        const ferramentaRaw = getVal(['produto', 'codigo_produto']) || pedido.produto
        const pedidoKgRaw = getVal(['pedido_kg', 'pedido kg', 'qt_kg', 'qt kg', 'pedido kg total', 'pedido kg.'])
        const pedidoPcRaw = getVal(['pedido_pc', 'pedido pc', 'pedido pcs', 'qtd_pedido', 'quantidade']) || pedido.qtd_pedido

        return {
          pedidoSeq,
          cliente,
          numeroPedido: numeroPedido || null,
          dataEntregaIso: toIsoDate(dataEntregaRaw) || null,
          dataEntrega: formatDateBR(dataEntregaRaw),
          ferramenta: extrairFerramenta(ferramentaRaw),
          pedidoKg: formatNumber(pedidoKgRaw),
          pedidoPc: formatInteger(pedidoPcRaw),
          dadosOriginais: pedido.dados_originais || dadosOriginais || {},
          pedido_id: pedido.id
        }
      })
      .filter((item) => item !== null)
      .filter((item) =>
        // Ocultar itens já no fluxo
        !fluxoPedidos.some(
          (fluxo) => fluxo.pedido_id === item.pedido_id || fluxo.pedido_seq === item.pedidoSeq
        )
      )
      // Remover duplicados por pedidoSeq
      .reduce((acc, curr) => {
        if (!acc.find((x) => String(x.pedidoSeq) === String(curr.pedidoSeq))) acc.push(curr)
        return acc
      }, /** @type {any[]} */([]))
      .sort((a, b) => {
        const dataA = parseDate(a.dataEntregaIso) || new Date(0)
        const dataB = parseDate(b.dataEntregaIso) || new Date(0)
        return dataA - dataB
      })
    return list
  }, [pedidos, fluxoPedidos, selectedCarteira])

  const closeAprovarModal = () => {
    setAlunicaAprovarOpen(false)
    setAlunicaAprovarPedido(null)
    setAlunicaAprovarItens([])
    setAlunicaAprovarError(null)
  }

  const setAprovarMover = (lote, value) => {
    setAlunicaAprovarItens((prev) => prev.map((it) => {
      if (it.lote !== lote) return it
      const disp = toIntegerRound(it.disponivel) || 0
      let v = toIntegerRound(value) || 0
      if (v < 0) v = 0
      if (v > disp) v = disp
      return { ...it, mover: v }
    }))
  }

  const aprovarTudoFill = () => {
    setAlunicaAprovarItens((prev) => prev.map((it) => ({ ...it, mover: toIntegerRound(it.disponivel) || 0 })))
  }

  const handleAprovarConfirm = async () => {
    if (!alunicaAprovarPedido) return
    const id = String(alunicaAprovarPedido.id)
    const itens = Array.isArray(alunicaAprovarItens) ? alunicaAprovarItens : []
    const valid = itens.filter((i) => (toIntegerRound(i.mover) || 0) > 0)
    if (!valid.length) {
      setAlunicaAprovarError('Informe quantidades para aprovar.')
      return
    }
    setAlunicaAprovarSaving(true)
    setAlunicaAprovarError(null)
    try {
      const apontList = await supabaseService.getByIndex('apontamentos', 'exp_fluxo_id', id)
      const stageAtual = alunicaStages[id] || 'para-inspecao'
      let sumDisp = 0
      let sumMov = 0
      itens.forEach((i) => { sumDisp += toIntegerRound(i.disponivel) || 0; sumMov += toIntegerRound(i.mover) || 0 })
      for (const item of valid) {
        let qtyToMove = toIntegerRound(item.mover) || 0
        if (qtyToMove <= 0) continue
        const rows = (Array.isArray(apontList) ? apontList : []).filter((row) => row && row.exp_unidade === 'alunica' && row.exp_stage === 'para-inspecao' && (row.lote || '(sem lote)') === item.lote)
        for (const row of rows) {
          const q = toIntegerRound(row.quantidade) || 0
          if (qtyToMove >= q) {
            await supabaseService.update('apontamentos', { id: row.id, exp_stage: 'para-embarque' })
            qtyToMove -= q
          } else if (qtyToMove > 0) {
            const restante = q - qtyToMove
            await supabaseService.update('apontamentos', { id: row.id, quantidade: restante })
            const { id: _oldId, ...copy } = row
            const novo = { ...copy, quantidade: qtyToMove, exp_stage: 'para-embarque' }
            await supabaseService.add('apontamentos', novo)
            qtyToMove = 0
          }
          if (qtyToMove <= 0) break
        }
      }
      const movimentoBase = {
        fluxo_id: id,
        movimentado_por: user?.nome || user?.email || 'Operador',
        movimentado_em: new Date().toISOString(),
        tipo_movimentacao: 'status'
      }
      const motivo = sumMov >= sumDisp ? 'aprovacao_inspecao' : 'aprovacao_inspecao_parcial'
      await supabaseService.add('exp_pedidos_movimentacoes', {
        ...movimentoBase,
        status_anterior: stageAtual,
        status_novo: sumMov >= sumDisp ? 'para-embarque' : 'para-inspecao',
        motivo
      })
      if (sumMov >= sumDisp) {
        setAlunicaStages((prev) => ({ ...prev, [id]: 'para-embarque' }))
        // Persistir estágio no banco quando a aprovação for total
        await supabaseService.update('exp_pedidos_fluxo', { id, alunica_stage: 'para-embarque' })
      }
      await loadApontamentosFor(id)
      await loadFluxo()
      closeAprovarModal()
    } catch (e) {
      setAlunicaAprovarError(e?.message || 'Falha ao aprovar inspeção.')
    } finally {
      setAlunicaAprovarSaving(false)
    }
  }


  

  const handleDeleteFluxo = async (orderId) => {
    try {
      if (!isAdmin) return
      const ok = typeof window !== 'undefined' ? window.confirm('Confirma remover este pedido do processo? Esta ação não pode ser desfeita.') : true
      if (!ok) return
      setDeletingIds((prev) => new Set(prev).add(String(orderId)))
      await supabaseService.remove('exp_pedidos_fluxo', orderId)
      setOrderStages(prev => {
        const next = { ...(prev || {}) }
        delete next[orderId]
        return next
      })
      setAlunicaStages(prev => {
        const next = { ...(prev || {}) }
        delete next[orderId]
        return next
      })
      await loadFluxo()
      if (typeof window !== 'undefined' && window.alert) {
        window.alert('Pedido removido do processo.')
      }
    } catch (err) {
      console.error('Falha ao remover pedido do processo:', err)
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(`Falha ao remover: ${err?.message || err}`)
      }
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev)
        next.delete(String(orderId))
        return next
      })
    }
  }

  const loadApontamentosFor = useCallback(async (orderId) => {
    try {
      const list = await supabaseService.getByIndex('apontamentos', 'exp_fluxo_id', orderId)
      setApontByFluxo((prev) => ({ ...prev, [String(orderId)]: Array.isArray(list) ? list : [] }))
    } catch (e) {
      console.error('Erro ao carregar apontamentos:', e)
    }
  }, [])

  // Hook de apontamento (opcional via feature flag)
  // Declarado APÓS loadApontamentosFor para evitar erro de inicialização
  const apontamentoHook = REFACTOR.USE_APONTAMENTO_HOOK
    ? useApontamentoModal({
        user,
        pedidosTecnoPerfil,
        loadApontamentosFor,
        loadFluxo
      })
    : null;

  // Hook de modais Alúnica (opcional via feature flag)
  // Declarado APÓS loadApontamentosFor para evitar erro de inicialização
  const alunicaModalsHook = REFACTOR.USE_ALUNICA_MODALS_HOOK
    ? useAlunicaModals({
        user,
        alunicaStages,
        setAlunicaStages,
        loadApontamentosFor,
        loadFluxo
      })
    : null;

  const importadosDisponiveis = useMemo(() => {
    if (!Array.isArray(importados)) return []
    const list = importados
      // Ocultar já no fluxo
      .filter((item) => !fluxoPedidos.some((fluxo) => fluxo.importado_id === item.id))
      .map((item) => {
        const base = buildPedidoBase(
          {
            pedido: item.pedido,
            cliente: item.cliente,
            numeroPedido: item.numero_pedido,
            dataEntrega: item.data_entrega,
            ferramenta: item.ferramenta,
            pedidoKg: item.pedido_kg,
            pedidoPc: item.pedido_pc
          },
          item.dados_brutos || {},
          'arquivo'
        )

        return {
          id: item.id,
          pedidoSeq: base?.pedidoSeq || item.pedido,
          cliente: base?.cliente || item.cliente,
          numeroPedido: base?.numeroPedido || item.numero_pedido,
          dataEntregaIso: base?.dataEntregaIso || item.data_entrega,
          dataEntrega: formatDateBR(base?.dataEntregaIso || item.data_entrega),
          ferramenta: base?.ferramenta || extrairFerramenta(item.ferramenta),
          pedidoKg: formatNumber(base?.pedidoKg ?? item.pedido_kg),
          pedidoPc: formatInteger(base?.pedidoPc ?? item.pedido_pc),
          dadosOriginais: item.dados_brutos || {},
          fonte: 'arquivo'
        }
      })
      // Remover duplicados por pedidoSeq
      .reduce((acc, curr) => {
        if (!acc.find((x) => String(x.pedidoSeq) === String(curr.pedidoSeq))) acc.push(curr)
        return acc
      }, /** @type {any[]} */([]))
      .sort((a, b) => {
        const dataA = parseDate(a.dataEntregaIso) || new Date(0)
        const dataB = parseDate(b.dataEntregaIso) || new Date(0)
        return dataA - dataB
      })
    return list
  }, [importados, fluxoPedidos, selectedImportados])

  const toggleSelection = (id, type) => {
    if (type === 'importados') {
      setSelectedImportados((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
      )
    } else {
      setSelectedCarteira((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
      )
    }
  }

  const resetSelection = () => {
    setSelectedImportados([])
    setSelectedCarteira([])
  }

  const handleOpenSelection = () => {
    setSelectionModalOpen(true)
    resetSelection()
    setSelectionTab('importados')
  }

  const montagemPayloadCarteira = (registroCarteira) => {
    const base = buildPedidoBase(
      {
        pedido: registroCarteira.pedidoSeq,
        cliente: registroCarteira.cliente,
        numeroPedido: registroCarteira.numeroPedido,
        dataEntrega: registroCarteira.dataEntregaIso,
        ferramenta: registroCarteira.ferramenta,
        pedidoKg: registroCarteira.pedidoKg,
        pedidoPc: registroCarteira.pedidoPc
      },
      registroCarteira.dadosOriginais,
      'carteira'
    )

    return buildFluxoRecordFromBase(base, 'carteira', {
      pedido_id: registroCarteira.pedido_id || null
    })
  }

  const montagemPayloadImportado = (registroImportado) => {
    const base = buildPedidoBase(
      {
        pedido: registroImportado.pedidoSeq,
        cliente: registroImportado.cliente,
        numeroPedido: registroImportado.numeroPedido,
        dataEntrega: registroImportado.dataEntregaIso,
        ferramenta: registroImportado.ferramenta,
        pedidoKg: registroImportado.pedidoKg,
        pedidoPc: registroImportado.pedidoPc
      },
      registroImportado.dadosOriginais,
      'arquivo'
    )

    return buildFluxoRecordFromBase(base, 'arquivo', {
      importado_id: registroImportado.id
    })
  }

  const handleConfirmSelection = async () => {
    if (isSavingSelection) return

    // IMPORTANTe: usar as fontes originais (não filtradas) para montar os payloads,
    // pois as listas do modal removem itens selecionados para evitar duplicidade visual.
    const registrosSelecionadosImportados = (Array.isArray(importados) ? importados : [])
      .filter((item) => selectedImportados.includes(item.id))
      .map((item) => ({
        id: item.id,
        pedidoSeq: item.pedido,
        cliente: item.cliente,
        numeroPedido: item.numero_pedido,
        dataEntregaIso: item.data_entrega,
        ferramenta: extrairFerramenta(item.ferramenta),
        pedidoKg: item.pedido_kg,
        pedidoPc: item.pedido_pc,
        dadosOriginais: item.dados_brutos || {}
      }))

    const registrosSelecionadosCarteira = (Array.isArray(pedidos) ? pedidos : [])
      .filter((p) => selectedCarteira.includes(p.id))
      .map((pedido) => {
        const dadosOriginais = parseDadosOriginais(pedido)
        const sources = [pedido, dadosOriginais]
        const getVal = (keys) => extractFromSources(sources, keys)

        const pedidoSeq = getVal(['pedido_seq', 'pedido']) || pedido.pedido_seq
        const cliente = getVal(['cliente', 'nome_cliente']) || pedido.cliente
        const numeroPedido = getVal(['pedido_cliente', 'nr_pedido', 'numero_pedido']) || pedido.pedido_cliente
        const dataEntregaIso = toIsoDate(
          getVal(['dt_fatura', 'data_entrega', 'data entrega', 'dt_entrega']) || pedido.dt_fatura
        )
        const ferramenta = extrairFerramenta(getVal(['produto', 'codigo_produto']) || pedido.produto)
        const pedidoKg = getVal(['pedido_kg', 'pedido kg', 'qt_kg', 'qt kg']) || pedido.pedido_kg
        const pedidoPc = getVal(['pedido_pc', 'pedido pc', 'qtd_pedido', 'quantidade']) || pedido.qtd_pedido

        return {
          pedidoSeq,
          cliente,
          numeroPedido,
          dataEntregaIso,
          ferramenta,
          pedidoKg,
          pedidoPc,
          dadosOriginais: pedido.dados_originais || dadosOriginais || {},
          pedido_id: pedido.id
        }
      })

    if (
      registrosSelecionadosImportados.length === 0 &&
      registrosSelecionadosCarteira.length === 0
    ) {
      setImportFeedback({
        type: 'error',
        message: 'Selecione pelo menos um pedido para adicionar ao fluxo.'
      })
      return
    }

    setIsSavingSelection(true)
    try {
      const payloadsImportados = registrosSelecionadosImportados
        .map((r) => montagemPayloadImportado({
          id: r.id,
          pedidoSeq: r.pedidoSeq,
          cliente: r.cliente,
          numeroPedido: r.numeroPedido,
          dataEntregaIso: r.dataEntregaIso,
          ferramenta: r.ferramenta,
          pedidoKg: r.pedidoKg,
          pedidoPc: r.pedidoPc,
          dadosOriginais: r.dadosOriginais
        }))
        .filter((item) => item !== null)

      const payloadsCarteira = registrosSelecionadosCarteira
        .map((r) => montagemPayloadCarteira(r))
        .filter((item) => item !== null)

      // Remover duplicados pelo mesmo pedido_seq dentro da seleção
      const byPedido = new Map()
      ;[...payloadsImportados, ...payloadsCarteira].forEach((p) => {
        const key = String(p.pedido_seq)
        if (!byPedido.has(key)) byPedido.set(key, p)
      })

      // Ignorar os que já estão no fluxo (evita erro por unique index)
      const existentes = new Set(
        (Array.isArray(fluxoPedidos) ? fluxoPedidos : []).map((f) => String(f.pedido_seq))
      )
      const payloads = Array.from(byPedido.values()).filter((p) => !existentes.has(String(p.pedido_seq)))

      if (!payloads.length) {
        setImportFeedback({
          type: 'error',
          message: 'Não foi possível montar dados válidos para o fluxo.'
        })
        setIsSavingSelection(false)
        return
      }

      if (!payloads.length) {
        setImportFeedback({
          type: 'error',
          message: 'Nenhum novo pedido para adicionar (já existente no fluxo ou seleção vazia).'
        })
        setIsSavingSelection(false)
        return
      }

      await supabaseService.addMany('exp_pedidos_fluxo', payloads)
      await loadFluxo()
      resetSelection()
      setSelectionModalOpen(false)
      setImportFeedback({
        type: 'success',
        message: `${payloads.length} pedido(s) adicionado(s) ao fluxo em "Pedido".`
      })
    } catch (error) {
      console.error('Erro ao confirmar seleção:', error)
      setImportFeedback({
        type: 'error',
        message: `Não foi possível adicionar pedidos ao fluxo: ${error?.message || error}`
      })
    } finally {
      setIsSavingSelection(false)
    }
  }

  

  useEffect(() => {
    if (importFeedback.type !== 'success') return undefined
    const timeout = setTimeout(() => setImportFeedback({ type: null, message: '' }), 4000)
    return () => clearTimeout(timeout)
  }, [importFeedback])

  // Efeito para depuração - mostra alterações no orderStages
  useEffect(() => {
    console.log('orderStages atualizado:', orderStages)
    console.log('fluxoPedidos:', fluxoPedidos?.map(p => ({
      id: p.id,
      status_atual: p.status_atual,
      pedido: p.pedido_seq
    })))
  }, [orderStages, fluxoPedidos])

  // Efeito para sincronizar orderStages com os dados do banco
  useEffect(() => {
    if (!Array.isArray(fluxoPedidos)) return;
    
    console.log('Sincronizando orderStages com', fluxoPedidos.length, 'pedidos');
    
    setOrderStages(prev => {
      const next = { ...prev };
      let hasChanges = false;
      const currentIds = new Set();

      // Atualiza estágios para pedidos existentes ou adiciona novos
      fluxoPedidos.forEach(registro => {
        if (!registro) return;
        
        const id = String(registro.id);
        currentIds.add(id);
        
        // Usa o status_atual do banco se for um estágio válido
        const stageFromDb = mapStageFromDb(registro.status_atual);
        // Não manter em orderStages quando estiver finalizado, para não voltar ao quadro TecnoPerfil
        if (stageFromDb === 'finalizado') {
          if (id in next) {
            delete next[id];
            hasChanges = true;
          }
          return;
        }

        const validStage = TECNO_STAGE_KEYS.includes(stageFromDb) 
          ? stageFromDb 
          : DEFAULT_STAGE;
        
        // Atualiza se for um novo pedido ou se o estágio mudou
        if (!(id in prev) || prev[id] !== validStage) {
          next[id] = validStage;
          hasChanges = true;
        }
      });

      // Remove IDs que não estão mais no fluxoPedidos
      Object.keys(next).forEach(id => {
        if (!currentIds.has(id)) {
          delete next[id];
          hasChanges = true;
        }
      });

      if (hasChanges) {
        console.log('Atualizando orderStages com', Object.keys(next).length, 'pedidos');
        return next;
      }
      
      return prev;
    });
  }, [fluxoPedidos]);

  useEffect(() => {
    if (!Array.isArray(fluxoPedidos)) return

    setAlunicaStages((prev) => {
      const currentIds = new Set(fluxoPedidos.map((pedido) => String(pedido.id)).filter(Boolean))

      // Se ainda não houver estado, inicializa a partir do banco
      if (!prev || typeof prev !== 'object') {
        const next = /** @type {Record<string,string>} */({})
        fluxoPedidos.forEach((pedido) => {
          const dbStage = pedido?.alunica_stage
          const id = String(pedido?.id)
          if (id && dbStage && ALUNICA_STAGE_KEYS.includes(dbStage)) next[id] = dbStage
        })
        return next
      }

      let changed = false
      const next = { ...prev }

      // Alimenta/atualiza com o estágio persistido no banco quando disponível
      fluxoPedidos.forEach((pedido) => {
        const id = String(pedido?.id)
        const dbStage = pedido?.alunica_stage
        if (!id) return
        if (dbStage && ALUNICA_STAGE_KEYS.includes(dbStage) && next[id] !== dbStage) {
          next[id] = dbStage
          changed = true
        }
      })

      // Remove IDs que saíram do fluxo
      Object.keys(next).forEach((id) => {
        if (!currentIds.has(id)) {
          delete next[id]
          changed = true
        }
      })

      return changed ? next : prev
    })
  }, [fluxoPedidos])

  const resetManualPedido = () => setManualPedido(INITIAL_MANUAL_PEDIDO)

  const handleManualFieldChange = (field) => (event) => {
    const { value } = event.target
    setManualPedido((prev) => ({
      ...prev,
      [field]: value
    }))
  }

  const handleManualSubmit = async (event) => {
    event.preventDefault()

    const base = buildPedidoBase(manualPedido, manualPedido, 'manual')
    if (!base) {
      setImportFeedback({
        type: 'error',
        message: 'Informe pelo menos os campos Pedido e Cliente para cadastrar manualmente.'
      })
      return
    }

    setIsProcessingImport(true)
    try {
      const fluxoPayload = buildFluxoRecordFromBase(base, 'manual')
      await supabaseService.add('exp_pedidos_fluxo', fluxoPayload)
      await loadFluxo()
      setImportFeedback({
        type: 'success',
        message: `Pedido ${base.pedidoSeq} cadastrado com sucesso.`
      })
      resetManualPedido()
      setShowManualForm(false)
    } catch (error) {
      setImportFeedback({
        type: 'error',
        message: `Falha ao cadastrar pedido: ${error?.message || error}`
      })
    } finally {
      setIsProcessingImport(false)
    }
  }

  const handleFileButtonClick = () => {
    if (isProcessingImport) return
    fileInputRef.current?.click()
  }

  const handleToggleManualForm = () => {
    if (isProcessingImport) return
    setShowManualForm((prev) => !prev)
    setImportFeedback({ type: null, message: '' })
    if (showManualForm) {
      resetManualPedido()
    }
  }

  const handleFileImport = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsProcessingImport(true)
    setImportFeedback({ type: null, message: '' })
    setShowManualForm(false)

    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      if (!worksheet) {
        throw new Error('Não foi possível ler a primeira aba da planilha.')
      }

      const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' })
      const records = rows
        .map((row) => mapRowToImportadoRecord(row, { arquivoNome: file.name }))
        .filter((item) => item !== null)

      if (!records.length) {
        setImportFeedback({
          type: 'error',
          message: 'Nenhum pedido válido encontrado na planilha. Verifique os nomes das colunas.'
        })
        return
      }

      await supabaseService.addMany('exp_pedidos_importados', records)
      await loadImportados()
      setImportFeedback({
        type: 'success',
        message: `Importação concluída com ${records.length} linha(s) disponíveis para seleção.`
      })
    } catch (error) {
      console.error('Erro ao importar pedidos:', error)
      setImportFeedback({
        type: 'error',
        message: `Falha ao importar arquivo: ${error?.message || error}`
      })
    } finally {
      setIsProcessingImport(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }


  const stageBuckets = useMemo(() => {
    const buckets = TECNO_STAGE_KEYS.reduce((acc, stage) => {
      acc[stage] = []
      return acc
    }, /** @type {Record<string, any[]>} */({}))

    pedidosTecnoPerfil.forEach((pedido) => {
      const id = String(pedido.id)
      if (pedido?.status === 'finalizado') return
      const stage = orderStages[id] && TECNO_STAGE_KEYS.includes(orderStages[id])
        ? orderStages[id]
        : DEFAULT_STAGE

      if (
        stage === 'expedicao-alu' &&
        alunicaStages?.[id] &&
        ALUNICA_STAGE_KEYS.includes(alunicaStages[id])
      ) {
        return
      }

      buckets[stage].push(pedido)
    })

    return buckets
  }, [orderStages, pedidosTecnoPerfil, alunicaStages])

  const summarizeApontamentos = useCallback(
    (pedidoId, allowedStages = null) => {
      const apontList = Array.isArray(apontByFluxo[String(pedidoId)])
        ? apontByFluxo[String(pedidoId)]
        : []
      if (!apontList.length) return []

      const stageFilter = allowedStages ? new Set(allowedStages) : null
      const aggregates = /** @type {Record<string, { lote: string, total: number, inspecao: number, embalagem: number, inicio: string|null, fim: string|null, obs: string }>} */({})

      apontList.forEach((row) => {
        if (!row || row.exp_unidade !== 'alunica') return
        if (stageFilter && !stageFilter.has(row.exp_stage)) return
        const loteKey = row.lote || '(sem lote)'
        if (!aggregates[loteKey]) {
          aggregates[loteKey] = {
            lote: loteKey,
            total: 0,
            inspecao: 0,
            embalagem: 0,
            inicio: row.inicio || null,
            fim: row.fim || null,
            obs: row.observacoes || ''
          }
        }

        const bucket = aggregates[loteKey]
        const qtd = Number(row.quantidade || 0)
        bucket.total += qtd
        if (row.exp_stage === 'para-inspecao') bucket.inspecao += qtd
        if (row.exp_stage === 'para-embarque') bucket.embalagem += qtd

        if (row.inicio) {
          if (!bucket.inicio || new Date(row.inicio) < new Date(bucket.inicio)) bucket.inicio = row.inicio
        }
        if (row.fim) {
          if (!bucket.fim || new Date(row.fim) > new Date(bucket.fim)) bucket.fim = row.fim
        }
        if (row.observacoes) bucket.obs = row.observacoes
      })

      return Object.values(aggregates)
    },
    [apontByFluxo]
  )

  const alunicaBuckets = useMemo(() => {
    const buckets = ALUNICA_STAGE_KEYS.reduce((acc, stage) => {
      acc[stage] = []
      return acc
    }, /** @type {Record<string, any[]>} */({}))
    const buildRow = (pedidoBase, stage, variant) => ({
      ...pedidoBase,
      __rowKey: `${pedidoBase.id}-${stage}-${variant}`
    })

    const fluxoById = (Array.isArray(fluxoPedidos) ? fluxoPedidos : []).reduce((acc, item) => {
      if (item?.id) acc[String(item.id)] = item
      return acc
    }, /** @type {Record<string, any>} */({}))
    const finalizadosSet = new Set(finalizados.map((id) => String(id)))

    pedidosTecnoPerfil.forEach((pedido) => {
      const id = String(pedido.id)
      const stageRef = alunicaStages[id]
      if (!stageRef || !ALUNICA_STAGE_KEYS.includes(stageRef)) return
      const estaFinalizado = finalizadosSet.has(id)

      const raw = fluxoById[id] || {}
      const apontadoPcNum = toIntegerRound(raw?.saldo_pc_total) || 0
      const apontadoKgNum = toDecimal(raw?.saldo_kg_total) || 0
      const pedidoPcNum = pedido?.pedidoPcNumber || toIntegerRound(pedido?.pedidoPc) || 0
      const percent = pedidoPcNum > 0 ? Math.min(100, Math.round((apontadoPcNum * 100) / pedidoPcNum)) : 0
      const saldoDataRaw = raw?.saldo_atualizado_em || raw?.atualizado_em || raw?.movimentado_em || null
      const apontadoDataBr = saldoDataRaw ? formatDateBR(saldoDataRaw) : null

      const basePedido = {
        ...pedido,
        apontadoPcNumber: apontadoPcNum,
        apontadoKgNumber: apontadoKgNum,
        apontadoPc: formatInteger(apontadoPcNum),
        apontadoPercent: percent,
        apontadoDataBr,
        finalizado: estaFinalizado
      }

      const agrupadosInspecao = summarizeApontamentos(id, ['para-inspecao'])
      const agrupadosEmbalagem = summarizeApontamentos(id, ['para-embarque'])

      const shouldShowBase =
        !(stageRef === 'para-usinar' && estaFinalizado) &&
        !(stageRef === 'para-inspecao' && agrupadosInspecao.length) &&
        !(stageRef === 'para-embarque' && agrupadosEmbalagem.length)

      if (shouldShowBase) {
        buckets[stageRef].push(buildRow(basePedido, stageRef, 'base'))
      }

      if (agrupadosInspecao.length) {
        buckets['para-inspecao'].push(buildRow({
          ...basePedido,
          resumoLotes: agrupadosInspecao
        }, 'para-inspecao', 'resumo'))
      }

      if (agrupadosEmbalagem.length) {
        buckets['para-embarque'].push(buildRow({
          ...basePedido,
          resumoLotes: agrupadosEmbalagem
        }, 'para-embarque', 'resumo'))
      }
    })

    return buckets
  }, [alunicaStages, pedidosTecnoPerfil, fluxoPedidos, summarizeApontamentos, finalizados])

  useEffect(() => {
    try {
      const idsPU = (alunicaBuckets['para-usinar'] || []).map(p => String(p.id))
      const idsPI = (alunicaBuckets['para-inspecao'] || []).map(p => String(p.id))
      const idsPE = (alunicaBuckets['para-embarque'] || []).map(p => String(p.id))
      const merged = [...idsPU, ...idsPI, ...idsPE]
      const uniq = merged.filter((v, i, a) => a.indexOf(v) === i)
      const toLoad = uniq.filter(id => !apontByFluxo[id])
      toLoad.forEach((id) => loadApontamentosFor(id))
    } catch (e) {
      console.warn('Falha ao pré-carregar históricos de apontamento:', e)
    }
  }, [alunicaBuckets, apontByFluxo, loadApontamentosFor])

  const resumoTecnoPerfil = useMemo(() => {
    const stageTotals = {}
    let totalKg = 0
    let totalPc = 0
    let totalCount = 0

    TECNO_STAGE_KEYS.forEach((stageKey) => {
      const orders = stageBuckets[stageKey] || []
      const summary = {
        count: orders.length,
        kg: 0,
        pc: 0,
        ferramentas: /** @type {Record<string, {kg:number, pc:number, count:number}>} */({}),
        topFerramentas: []
      }

      orders.forEach((pedido) => {
        const kg = pedido.pedidoKgNumber || 0
        const pc = pedido.pedidoPcNumber || 0
        const ferramenta = pedido.ferramenta || '—'

        summary.kg += kg
        summary.pc += pc

        if (!summary.ferramentas[ferramenta]) {
          summary.ferramentas[ferramenta] = { kg: 0, pc: 0, count: 0 }
        }

        summary.ferramentas[ferramenta].kg += kg
        summary.ferramentas[ferramenta].pc += pc
        summary.ferramentas[ferramenta].count += 1
      })

      summary.topFerramentas = Object.entries(summary.ferramentas)
        .map(([ferramenta, dados]) => ({ ferramenta, ...dados }))
        .sort((a, b) => b.kg - a.kg)
        .slice(0, 3)

      stageTotals[stageKey] = summary

      totalKg += summary.kg
      totalPc += summary.pc
      totalCount += summary.count
    })

    return {
      stages: stageTotals,
      totalKg,
      totalPc,
      totalCount
    }
  }, [stageBuckets])

  const resumoAlunica = useMemo(() => {
    const stageTotals = {}
    let totalKg = 0
    let totalPc = 0
    let totalCount = 0

    ALUNICA_STAGE_KEYS.forEach((stageKey) => {
      const orders = alunicaBuckets[stageKey] || []
      const summary = {
        count: orders.length,
        kg: 0,
        pc: 0,
        ferramentas: /** @type {Record<string, {kg:number, pc:number, count:number}>} */({}),
        topFerramentas: []
      }

      orders.forEach((pedido) => {
        const kg = pedido.pedidoKgNumber || 0
        const pc = pedido.pedidoPcNumber || 0
        const ferramenta = pedido.ferramenta || '—'

        summary.kg += kg
        summary.pc += pc

        if (!summary.ferramentas[ferramenta]) {
          summary.ferramentas[ferramenta] = { kg: 0, pc: 0, count: 0 }
        }

        summary.ferramentas[ferramenta].kg += kg
        summary.ferramentas[ferramenta].pc += pc
        summary.ferramentas[ferramenta].count += 1
      })

      summary.topFerramentas = Object.entries(summary.ferramentas)
        .map(([ferramenta, dados]) => ({ ferramenta, ...dados }))
        .sort((a, b) => b.kg - a.kg)
        .slice(0, 3)

      stageTotals[stageKey] = summary

      totalKg += summary.kg
      totalPc += summary.pc
      totalCount += summary.count
    })

    return {
      stages: stageTotals,
      totalKg,
      totalPc,
      totalCount
    }
  }, [alunicaBuckets])

  // Totais para o cabeçalho da Alúnica (pcs por estágio)
  const alunicaHeaderTotals = useMemo(() => {
    /** @type {Record<string, number>} */
    const totals = { 'para-usinar': 0, 'para-inspecao': 0, 'para-embarque': 0 }

    const idsByStage = { 'para-usinar': [], 'para-inspecao': [], 'para-embarque': [] }
    Object.entries(alunicaStages || {}).forEach(([id, st]) => {
      if (idsByStage[st]) idsByStage[st].push(String(id))
    })

    const fluxoMap = /** @type {Record<string, any>} */({})
    ;(Array.isArray(fluxoPedidos) ? fluxoPedidos : []).forEach((f) => {
      if (f?.id) fluxoMap[String(f.id)] = f
    })

    // para-usinar: saldo a produzir (pedidoPc - apontadoPc)
    idsByStage['para-usinar'].forEach((id) => {
      const pedido = (Array.isArray(pedidosTecnoPerfil) ? pedidosTecnoPerfil : []).find((p) => String(p.id) === String(id))
      if (!pedido) return
      const pedidoPcNum = toIntegerRound(pedido?.pedidoPcNumber ?? pedido?.pedidoPc) || 0
      const apontadoPc = toIntegerRound(fluxoMap[id]?.saldo_pc_total) || 0
      const saldo = Math.max(pedidoPcNum - apontadoPc, 0)
      totals['para-usinar'] += saldo
    })

    // para-inspecao: soma dos apontamentos na inspeção
    idsByStage['para-inspecao'].forEach((id) => {
      const sum = (summarizeApontamentos(id, ['para-inspecao']) || []).reduce((acc, r) => acc + (toIntegerRound(r?.inspecao) || 0), 0)
      totals['para-inspecao'] += sum
    })

    // para-embarque: soma dos apontamentos na embalagem
    idsByStage['para-embarque'].forEach((id) => {
      const sum = (summarizeApontamentos(id, ['para-embarque']) || []).reduce((acc, r) => acc + (toIntegerRound(r?.embalagem) || 0), 0)
      totals['para-embarque'] += sum
    })

    return totals
  }, [alunicaStages, pedidosTecnoPerfil, fluxoPedidos, summarizeApontamentos])

  const handleExportResumo = useCallback(() => {
    if (exportingResumo || fluxoLoading) return

    setExportingResumo(true)
    try {
      exportResumoExcel({
        resumoTecnoPerfil,
        resumoAlunica,
        pedidosResumo: pedidosTecnoPerfil,
        lastMovement,
        tecnoperfilStatus: TECNOPERFIL_STATUS,
        alunicaStatus: ALUNICA_STATUS
      })
    } catch (error) {
      console.error('Erro ao exportar resumo:', error)
    } finally {
      setExportingResumo(false)
    }
  }, [
    exportingResumo,
    fluxoLoading,
    resumoTecnoPerfil,
    resumoAlunica,
    pedidosTecnoPerfil,
    lastMovement
  ])

  const moveOrderToStage = async (orderId, targetStage) => {
    try {
      const statusAnterior = orderStages[orderId] || DEFAULT_STAGE
      let statusAtual = targetStage
      
      // Define o status atual com base no targetStage
      if (targetStage === '__alunica__') {
        statusAtual = 'expedicao-alu';
        setAlunicaStages(prev => ({
          ...(prev || {}),
          [orderId]: ALUNICA_DEFAULT_STAGE
        }));
      } else if (targetStage === '__finalizar__') {
        statusAtual = 'expedicao-cliente';
        setFinalizados(prev => (prev.includes(orderId) ? prev : [...prev, orderId]));
      } else if (!TECNO_STAGE_KEYS.includes(targetStage)) {
        return; // Sai se não for um estágio válido
      }

      // Atualiza o estado local
      setOrderStages(prev => ({
        ...prev,
        [orderId]: statusAtual
      }));

      // Prepara os dados para atualização
      const updates = {
        status_atual: mapStageToDb(statusAtual),
        atualizado_em: new Date().toISOString()
      };

      if (targetStage === '__alunica__') {
        // Ao entrar na Alúnica: UI inicia em 'estoque', mas no banco não persistimos 'estoque'
        // Para não violar o CHECK, persistimos NULL e mantemos o controle de 'estoque' apenas no front
        updates.alunica_stage = null
      }

      // Se for finalizar, atualiza a data de finalização
      if (targetStage === '__finalizar__') {
        updates.finalizado = true;
        updates.data_finalizado = new Date().toISOString();
      }

      // Atualiza o banco de dados (sem assumir shape do retorno)
      const updateResult = await supabaseService.update('exp_pedidos_fluxo', {
        id: orderId,
        ...updates
      })

      if (updateResult && typeof updateResult === 'object' && updateResult.error) {
        throw updateResult.error
      }

      // Registra a movimentação
      try {
        await supabaseService.add('exp_pedidos_movimentacoes', {
          fluxo_id: orderId,
          status_anterior: statusAnterior,
          status_novo: statusAtual,
          movimentado_por: 'sistema', // Você pode substituir pelo ID do usuário logado
          movimentado_em: new Date().toISOString()
        });
      } catch (movError) {
        console.error('Erro ao registrar movimentação:', movError);
        // Não interrompe o fluxo principal se falhar o registro da movimentação
      }

      // Atualiza o feedback visual
      try {
        const pedidoResumo = Array.isArray(pedidosTecnoPerfil) 
          ? pedidosTecnoPerfil.find(pedido => String(pedido?.id) === String(orderId))
          : null;
          
        if (pedidoResumo) {
          setLastMovement({
            pedido: pedidoResumo.pedido || 'N/A',
            cliente: pedidoResumo.cliente || 'N/A',
            destino: STATUS_LABEL[statusAtual] || statusAtual
          });
        }
      } catch (feedbackError) {
        console.error('Erro ao atualizar feedback visual:', feedbackError);
        // Não interrompe o fluxo principal se falhar o feedback visual
      }
    } catch (error) {
      console.error('Erro ao atualizar estágio do pedido:', error);
      
      // Reverte as alterações no estado local em caso de erro
      if (targetStage === '__alunica__') {
        setAlunicaStages(prev => {
          const newState = { ...prev };
          delete newState[orderId];
          return newState;
        });
      }
      
      // Mostra feedback de erro para o usuário
      setImportFeedback({
        type: 'error',
        message: `Erro ao atualizar estágio: ${error?.message || 'Tente novamente mais tarde.'}`
      });
      
      // Remove o feedback após 5 segundos
      setTimeout(() => {
        setImportFeedback({ type: null, message: '' });
      }, 5000);
    }
  };

  const getButtonClasses = (tone, variant = 'icon') => {
    const base =
      variant === 'text'
        ? 'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors'
        : 'inline-flex items-center justify-center p-2 rounded-md text-xs font-semibold transition-colors h-8 w-8'
    switch (tone) {
      case 'primary':
        return `${base} bg-blue-600 text-white hover:bg-blue-700`
      case 'purple':
        return `${base} bg-purple-600 text-white hover:bg-purple-700`
      case 'indigo':
        return `${base} bg-indigo-600 text-white hover:bg-indigo-700`
      case 'success':
        return `${base} bg-emerald-600 text-white hover:bg-emerald-700`
      case 'warning':
        return `${base} bg-amber-500 text-white hover:bg-amber-600`
      case 'danger':
        return `${base} bg-red-600 text-white hover:bg-red-700`
      case 'ghost':
      default:
        return `${base} border border-gray-300 text-gray-600 hover:bg-gray-100`
    }
  }

  const getTecnoActionMeta = (to) => {
    switch (to) {
      case 'produzido': return { icon: <FaChevronRight />, title: 'Avançar para Produzido' }
      case 'pedido': return { icon: <FaUndo />, title: 'Revisar Pedido' }
      case 'inspecao': return { icon: <FaClipboardCheck />, title: 'Enviar para Inspeção' }
      case 'embalagem': return { icon: <FaBoxOpen />, title: 'Mover para Embalagem' }
      case 'expedicao-alu': return { icon: <FaIndustry />, title: 'Expedir para Alúnica' }
      case 'expedicao-cliente': return { icon: <FaTruck />, title: 'Expedir para Cliente' }
      case '__alunica__': return { icon: <FaIndustry />, title: 'Enviar para Alúnica' }
      case '__finalizar__': return { icon: <FaCheckCircle />, title: 'Finalizar Pedido' }
      default: return { icon: <FaChevronRight />, title: to }
    }
  }

  const getAlunicaActionMeta = (to) => {
    switch (to) {
      case 'para-usinar': return { icon: <FaCogs />, title: 'Programar Usinagem' }
      case 'estoque': return { icon: <FaWarehouse />, title: 'Devolver ao Estoque' }
      case 'para-inspecao': return { icon: <FaClipboardCheck />, title: 'Enviar para Inspeção' }
      case 'para-embarque': return { icon: <FaBoxOpen />, title: 'Aprovar Inspeção e Embalar' }
      case 'expedicao-tecno': return { icon: <FaTruck />, title: 'Preparar Expedição' }
      case '__finalizar__': return { icon: <FaCheckCircle />, title: 'Finalizar Transferência' }
      default: return { icon: <FaChevronRight />, title: to }
    }
  }

  const openAlunicaApontamento = (orderId, stageKey) => {
    try {
      const pedidoResumo = Array.isArray(pedidosTecnoPerfil)
        ? pedidosTecnoPerfil.find((pedido) => String(pedido.id) === String(orderId))
        : null

      if (!pedidoResumo) {
        throw new Error('Pedido não encontrado para apontamento.')
      }

      // Carrega históricos antes de abrir o modal
      loadApontamentosFor(orderId)

      setAlunicaApontPedido(pedidoResumo)
      setAlunicaApontStage(stageKey)
      setAlunicaApontOpen(true)
      setAlunicaApontQtdPc('')
      setAlunicaApontQtdPcInspecao('')
      setAlunicaApontObs('')
      const now = new Date()
      const startStr = toLocalDateTimeInput(now)
      const endStr = toLocalDateTimeInput(new Date(now.getTime() + 5 * 60000))
      setAlunicaApontInicio(startStr)
      setAlunicaApontFim(endStr)
      setAlunicaApontFimTouched(false)
      setAlunicaApontError(null)
      setAlunicaApontOpen(true)
    } catch {
      setAlunicaApontError('Falha ao preparar o apontamento. Tente novamente.')
      setAlunicaApontOpen(true)
    }
  }

  const handleInicioChange = (value) => {
    setAlunicaApontInicio(value)
    if (!alunicaApontFimTouched) {
      setAlunicaApontFim(addMinutesToLocalInput(value, 5))
    }
  }

  const handleFimChange = (value) => {
    setAlunicaApontFimTouched(true)
    setAlunicaApontFim(value)
  }

  const closeAlunicaApontamento = () => {
    if (alunicaApontSaving) return
    setAlunicaApontOpen(false)
    setAlunicaApontPedido(null)
    setAlunicaApontStage(null)
    setAlunicaApontQtdPc('')
    setAlunicaApontQtdPcInspecao('')
    setAlunicaApontObs('')
    setAlunicaApontInicio('')
    setAlunicaApontFim('')
    setAlunicaApontFimTouched(false)
    setAlunicaApontError(null)
  }

  const handleSalvarAlunicaApont = async () => {
    if (!alunicaApontPedido || !alunicaApontStage) return

    const MIN_INSPECAO_PCS = 20

    const qtdPcRaw = toIntegerRound(alunicaApontQtdPc)
    const pcs = qtdPcRaw || 0

    const qtdPcInspecaoRaw = toIntegerRound(alunicaApontQtdPcInspecao)
    const pcsInspecao = qtdPcInspecaoRaw || 0
    const pcsEmbalar = Math.max(pcs - pcsInspecao, 0)

    if (!pcs || pcs <= 0) {
      setAlunicaApontError('Informe a quantidade produzida em peças.')
      return
    }

    if (pcsInspecao < 0) {
      setAlunicaApontError('A quantidade para inspeção não pode ser negativa.')
      return
    }

    if (pcsInspecao > pcs) {
      setAlunicaApontError('A quantidade para inspeção não pode ser maior que a quantidade produzida.')
      return
    }

    if (pcsInspecao > MIN_INSPECAO_PCS) {
      setAlunicaApontError('A quantidade para inspeção não pode ser maior que 20 peças.')
      return
    }

    const totalPc =
      toIntegerRound(alunicaApontPedido.pedidoPcNumber ?? alunicaApontPedido.pedidoPc) || 0
    const totalKg = toDecimal(alunicaApontPedido.pedidoKgNumber ?? alunicaApontPedido.pedidoKg) || 0
    const kgPorPc = totalPc > 0 && totalKg > 0 ? totalKg / totalPc : null
    const kg = kgPorPc ? +(pcs * kgPorPc).toFixed(3) : 0

    const pedidoPcTotal = totalPc || 0
    const jaProduzidoPc = toIntegerRound(alunicaApontPedido.apontadoPcNumber) || 0

    if (pedidoPcTotal > 0 && jaProduzidoPc + pcs > pedidoPcTotal) {
      const disponivel = Math.max(pedidoPcTotal - jaProduzidoPc, 0)

      if (disponivel <= 0) {
        setAlunicaApontError(
          'Este pedido já atingiu a quantidade total de peças usinadas. Não é possível apontar mais.'
        )
      } else {
        setAlunicaApontError(
          `Você só pode apontar mais ${disponivel} peça(s) para este pedido (total do pedido: ${pedidoPcTotal}, já apontado: ${jaProduzidoPc}).`
        )
      }

      return
    }

    const inicioISO = localDateTimeToISO(alunicaApontInicio)
    const fimISO = localDateTimeToISO(alunicaApontFim)

    if (!inicioISO || !fimISO) {
      setAlunicaApontError('Informe data e horário inicial e final válidos.')
      return
    }

    setAlunicaApontSaving(true)
    setAlunicaApontError(null)

    try {
      const agora = new Date().toISOString()
      const ordemTrabalho = alunicaApontPedido.pedido || alunicaApontPedido.pedidoSeq || ''
      const totalPcPedido = totalPc || null

      // Calcula inspeções já realizadas para este pedido
      let fluxoAtual
      let jaInspecao = 0
      try {
        fluxoAtual = await supabaseService.getById('exp_pedidos_fluxo', alunicaApontPedido.id)

        const apontamentosFluxo = await supabaseService.getByIndex(
          'apontamentos',
          'exp_fluxo_id',
          alunicaApontPedido.id
        )

        jaInspecao = Array.isArray(apontamentosFluxo)
          ? apontamentosFluxo
              .filter((item) => item && item.exp_stage === 'para-inspecao')
              .reduce((sum, item) => sum + (toIntegerRound(item.quantidade) || 0), 0)
          : 0
      } catch (regraErr) {
        console.error('Falha ao obter dados para regra de inspeção:', regraErr)
      }

      // Regra de negócio: até completar 20 peças inspecionadas no pedido,
      // todas as peças produzidas vão para inspeção (até o limite de 20)
      // e o excedente do apontamento vai direto para embalagem.
      if (pcsInspecao > 0 && jaInspecao + pcsInspecao > MIN_INSPECAO_PCS) {
        const restanteInspecao = Math.max(MIN_INSPECAO_PCS - jaInspecao, 0)

        if (restanteInspecao <= 0) {
          setAlunicaApontError(
            `Este pedido já atingiu o limite de ${MIN_INSPECAO_PCS} peças para inspeção.`
          )
        } else {
          setAlunicaApontError(
            `Você já apontou ${jaInspecao} peça(s) para inspeção. Só é possível apontar mais ${restanteInspecao} peça(s) (limite de ${MIN_INSPECAO_PCS}).`
          )
        }

        return
      }

      const restanteParaMinimo = Math.max(MIN_INSPECAO_PCS - jaInspecao, 0)

      let pcsInspecaoEfetivo = pcsInspecao
      let pcsEmbalarEfetivo = pcsEmbalar

      if (restanteParaMinimo > 0) {
        // Ainda não atingiu 20: força inspeção até o limite e envia o restante para embalagem
        pcsInspecaoEfetivo = Math.min(pcs, restanteParaMinimo)
        pcsEmbalarEfetivo = Math.max(pcs - pcsInspecaoEfetivo, 0)
      }

      const novoTotalInspecao = jaInspecao + pcsInspecaoEfetivo

      // Gera número de lote: data+hora+Pedido (DDMMYYYY-HHMM-PEDIDO)
      const now = new Date()
      const dd = String(now.getDate()).padStart(2, '0')
      const mm = String(now.getMonth() + 1).padStart(2, '0')
      const yyyy = String(now.getFullYear())
      const hh = String(now.getHours()).padStart(2, '0')
      const min = String(now.getMinutes()).padStart(2, '0')
      const pedidoCode = String(alunicaApontPedido?.pedido || alunicaApontPedido?.pedidoSeq || '').trim()
      const loteCodigo = `${dd}${mm}${yyyy}-${hh}${min}-${pedidoCode}`

      const basePayloadApont = {
        operador: user?.nome || user?.email || 'Operador',
        produto: alunicaApontPedido.ferramenta || '',
        cliente: alunicaApontPedido.cliente || '',
        inicio: inicioISO,
        fim: fimISO,
        qtd_refugo: 0,
        comprimento_refugo: 0,
        qtd_pedido: totalPcPedido,
        nro_op: '',
        perfil_longo: '',
        comprimento_acabado_mm: null,
        ordem_trabalho: ordemTrabalho,
        observacoes: alunicaApontObs || '',
        rack_ou_pallet: '',
        dureza_material: '',
        lotes_externos: [],
        romaneio_numero: '',
        lote_externo: '',
        amarrados_detalhados: null,
        exp_fluxo_id: alunicaApontPedido.id,
        exp_unidade: 'alunica',
        exp_stage: alunicaApontStage
      }

      const apontamentosToInsert = []

      if (pcsInspecaoEfetivo > 0) {
        apontamentosToInsert.push({
          ...basePayloadApont,
          quantidade: pcsInspecaoEfetivo,
          exp_stage: 'para-inspecao',
          lote: `${loteCodigo}-insp`
        })
      }

      if (pcsEmbalarEfetivo > 0) {
        apontamentosToInsert.push({
          ...basePayloadApont,
          quantidade: pcsEmbalarEfetivo,
          exp_stage: 'para-embarque',
          lote: `${loteCodigo}-emb`
        })
      }

      if (!apontamentosToInsert.length) {
        setAlunicaApontError('Defina pelo menos uma quantidade para inspeção ou embalagem.')
        return
      }

      if (apontamentosToInsert.length === 1) {
        await supabaseService.add('apontamentos', apontamentosToInsert[0])
      } else {
        await supabaseService.addMany('apontamentos', apontamentosToInsert)
      }

      // Recarrega históricos deste pedido
      await loadApontamentosFor(alunicaApontPedido.id)

      const pedidoKgTotal = toDecimal(fluxoAtual?.pedido_kg) ?? 0
      const pedidoPcTotalFluxo = toIntegerRound(fluxoAtual?.pedido_pc) ?? 0
      const prevKgSaldo = toDecimal(fluxoAtual?.saldo_kg_total) ?? 0
      const prevPcSaldo = toDecimal(fluxoAtual?.saldo_pc_total) ?? 0
      const prevKgDispRaw = toDecimal(fluxoAtual?.kg_disponivel)
      const prevPcDispRaw = toDecimal(fluxoAtual?.pc_disponivel)
      const calcKgDisp = Math.max(0, (pedidoKgTotal || 0) - (prevKgSaldo || 0))
      const calcPcDisp = Math.max(0, (pedidoPcTotalFluxo || 0) - (prevPcSaldo || 0))
      const prevKgDisp = prevKgDispRaw === null ? calcKgDisp : (prevKgDispRaw ?? 0)
      const prevPcDisp = prevPcDispRaw === null ? calcPcDisp : (prevPcDispRaw ?? 0)

      const novoKgDisp = Math.max(prevKgDisp - (kg || 0), 0)
      const novoPcDisp = Math.max(prevPcDisp - (pcs || 0), 0)
      const novoKgSaldo = prevKgSaldo + (kg || 0)
      const novoPcSaldo = prevPcSaldo + (pcs || 0)

      await supabaseService.update('exp_pedidos_fluxo', {
        id: alunicaApontPedido.id,
        kg_disponivel: novoKgDisp,
        pc_disponivel: novoPcDisp,
        saldo_kg_total: novoKgSaldo,
        saldo_pc_total: novoPcSaldo,
        saldo_atualizado_em: agora
      })

      try {
        await supabaseService.add('exp_pedidos_movimentacoes', {
          fluxo_id: alunicaApontPedido.id,
          status_anterior: fluxoAtual?.status_atual || 'pedido',
          status_novo: fluxoAtual?.status_atual || 'pedido',
          motivo: null,
          movimentado_por: user?.nome || user?.email || 'Operador',
          movimentado_em: agora,
          tipo_movimentacao: 'quantidade',
          kg_movimentado: kg || 0,
          pc_movimentado: pcs || 0,
          kg_disponivel_anterior: prevKgDisp,
          kg_disponivel_atual: novoKgDisp,
          pc_disponivel_anterior: prevPcDisp,
          pc_disponivel_atual: novoPcDisp
        })
      } catch (movErr) {
        console.error('Erro ao registrar movimentação de quantidade:', movErr)
      }

      await loadFluxo()

      setAlunicaApontOpen(false)
      setAlunicaApontPedido(null)
      setAlunicaApontStage(null)
      setAlunicaApontQtdPc('')
      setAlunicaApontObs('')
      setAlunicaApontInicio('')
      setAlunicaApontFim('')
      setAlunicaApontFimTouched(false)
      setAlunicaApontError(null)
    } catch (error) {
      console.error('Erro ao salvar apontamento Alúnica:', error)
      setAlunicaApontError(error?.message || 'Não foi possível salvar o apontamento.')
    } finally {
      setAlunicaApontSaving(false)
    }
  }

  const handleAlunicaAction = async (orderId, targetStage) => {
    if (!orderId || !targetStage) return
    
    const id = String(orderId)
    
    // Adiciona ao loading
    setAlunicaActionLoading((prev) => new Set([...prev, id]))
    
    try {
      const movimentoBase = {
        fluxo_id: orderId,
        movimentado_por: user?.nome || user?.email || 'Operador',
        movimentado_em: new Date().toISOString(),
        tipo_movimentacao: 'status'
      }
      const currentStage = alunicaStages[id] || ALUNICA_DEFAULT_STAGE

      if (targetStage === '__finalizar__') {
        // Finalizar transferência - remove da Alúnica e marca como concluído
        await supabaseService.update('exp_pedidos_fluxo', {
          id: orderId,
          status_atual: 'finalizado'
        })

        await supabaseService.add('exp_pedidos_movimentacoes', {
          ...movimentoBase,
          status_anterior: 'expedicao-tecno',
          status_novo: 'finalizado',
          motivo: 'finalizacao'
        })

        setAlunicaStages((prev) => {
          const next = { ...prev }
          delete next[id]
          return next
        })
      } else {
        // Mover para outro estágio da Alúnica
        if (currentStage === 'para-inspecao' && targetStage === 'para-embarque') {
          const apontList = await supabaseService.getByIndex('apontamentos', 'exp_fluxo_id', orderId)
          const toMove = Array.isArray(apontList)
            ? apontList.filter((row) => row && row.exp_unidade === 'alunica' && row.exp_stage === 'para-inspecao')
            : []
          for (const row of toMove) {
            await supabaseService.update('apontamentos', { id: row.id, exp_stage: 'para-embarque' })
          }
          await loadApontamentosFor(orderId)
        }

        if (currentStage === 'para-embarque' && targetStage === 'para-inspecao') {
          const apontList = await supabaseService.getByIndex('apontamentos', 'exp_fluxo_id', orderId)
          const toMove = Array.isArray(apontList)
            ? apontList.filter((row) => row && row.exp_unidade === 'alunica' && row.exp_stage === 'para-embarque')
            : []
          for (const row of toMove) {
            await supabaseService.update('apontamentos', { id: row.id, exp_stage: 'para-inspecao' })
          }
          await loadApontamentosFor(orderId)
        }

        const motivoMov =
          currentStage === 'para-inspecao' && targetStage === 'para-embarque'
            ? 'aprovacao_inspecao'
            : currentStage === 'para-embarque' && targetStage === 'para-inspecao'
              ? 'reabertura_inspecao'
              : null

        await supabaseService.add('exp_pedidos_movimentacoes', {
          ...movimentoBase,
          status_anterior: currentStage,
          status_novo: targetStage,
          motivo: motivoMov
        })

        // Persistir estágio no banco (ações diretas sem modal)
        const persistStage = ['para-usinar','para-inspecao','para-embarque'].includes(targetStage)
          ? targetStage
          : null
        await supabaseService.update('exp_pedidos_fluxo', {
          id: orderId,
          alunica_stage: persistStage
        })

        setAlunicaStages((prev) => ({
          ...prev,
          [id]: targetStage
        }))
      }
      
      await loadFluxo()
    } catch (error) {
      console.error('Erro ao processar ação Alúnica:', error)
    } finally {
      setAlunicaActionLoading((prev) => {
        const next = new Set([...prev])
        next.delete(id)
        return next
      })
    }
  }

  const renderOrderActions = (orderId, stageKey) => {
    const actions = STAGE_ACTIONS[stageKey] || []
    if (actions.length === 0) return null

    return (
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => {
          const meta = getTecnoActionMeta(action.to)
          return (
            <button
              key={`${orderId}-${action.to}`}
              type="button"
              onClick={() => moveOrderToStage(orderId, action.to)}
              className={getButtonClasses(action.tone)}
              title={meta.title}
              aria-label={meta.title}
            >
              {meta.icon}
            </button>
          )
        })}
        <DeletePedidoButton
          isAdmin={isAdmin}
          orderId={orderId}
          onDelete={handleDeleteFluxo}
          disabled={deletingIds.has(String(orderId))}
          className={getButtonClasses('danger')}
        />
      </div>
    )
  }

  const renderAlunicaActions = (pedidoCtx, stageKey) => {
    if (!pedidoCtx || !stageKey) return null
    
    const orderId = String(pedidoCtx.id)
    const actions = ALUNICA_ACTIONS[stageKey] || []
    const actionLoadingSet = REFACTOR.USE_ALUNICA_MODALS_HOOK ? alunicaModalsHook?.alunicaActionLoading : alunicaActionLoading
    const isLoading = actionLoadingSet?.has(orderId)
    const totalInsp = (summarizeApontamentos(orderId, ['para-inspecao']) || []).reduce((acc, r) => acc + (toIntegerRound(r?.inspecao) || 0), 0)
    const totalEmb = (summarizeApontamentos(orderId, ['para-embarque']) || []).reduce((acc, r) => acc + (toIntegerRound(r?.embalagem) || 0), 0)
    
    return (
      <div className="flex flex-wrap gap-2">
        {/* Botão Finalizar/Reabrir para estágio para-usinar */}
        {stageKey === 'para-usinar' && (
          <>
            {pedidoCtx.finalizado ? (
              <button
                type="button"
                onClick={() => reabrirPedidoAlunica(orderId)}
                className={getButtonClasses('ghost')}
                disabled={isLoading}
                title="Reabrir pedido"
              >
                <FaUndo className="h-3.5 w-3.5" />
              </button>
            ) : (
              isPedidoCompleto(pedidoCtx) && (
                <button
                  type="button"
                  onClick={() => finalizarPedidoAlunica(orderId)}
                  className={getButtonClasses('success')}
                  disabled={isLoading}
                  title="Finalizar pedido"
                >
                  <FaCheck className="h-3.5 w-3.5" />
                </button>
              )
            )}
          </>
        )}
        
        {/* Botão Apontar para estágio para-usinar */}
        {stageKey === 'para-usinar' && !pedidoCtx.finalizado && (
          <button
            type="button"
            onClick={() => {
              if (REFACTOR.USE_APONTAMENTO_HOOK && apontamentoHook) {
                apontamentoHook.openModal(pedidoCtx.id, stageKey);
              } else {
                setAlunicaApontPedido(pedidoCtx)
                setAlunicaApontStage(stageKey)
                setAlunicaApontOpen(true)
              }
            }}
            className={getButtonClasses('primary')}
            disabled={isLoading}
            title="Registrar Apontamento"
          >
            <FaPlay className="h-3.5 w-3.5" />
          </button>
        )}
        
        {/* Ações do estágio */}
        {actions.map((action) => {
          const meta = getAlunicaActionMeta(action.to)
          const title = action.label || meta.title
          return (
            <button
              key={`${orderId}-${action.to}`}
              type="button"
              onClick={async () => {
                if (stageKey === 'para-inspecao' && action.to === 'para-embarque') {
                  try {
                    setAlunicaAprovarError(null)
                    await loadApontamentosFor(orderId)
                    const resumo = summarizeApontamentos(orderId, ['para-inspecao']) || []
                    const itens = resumo
                      .map((r) => ({ lote: r.lote, disponivel: toIntegerRound(r.inspecao || 0), mover: toIntegerRound(r.inspecao || 0) }))
                      .filter((i) => i.disponivel > 0)
                    setAlunicaAprovarItens(itens)
                    setAlunicaAprovarPedido(pedidoCtx)
                    setAlunicaAprovarOpen(true)
                  } catch (e) {
                    console.error(e)
                  }
                  return
                }
                if (stageKey === 'para-embarque' && action.to === 'para-inspecao') {
                  try {
                    setAlunicaReabrirError(null)
                    await loadApontamentosFor(orderId)
                    const resumo = summarizeApontamentos(orderId, ['para-embarque']) || []
                    const itens = resumo
                      .map((r) => ({ lote: r.lote, disponivel: toIntegerRound(r.embalagem || 0), mover: toIntegerRound(r.embalagem || 0) }))
                      .filter((i) => i.disponivel > 0)
                    setAlunicaReabrirItens(itens)
                    setAlunicaReabrirPedido(pedidoCtx)
                    setAlunicaReabrirOpen(true)
                  } catch (e) {
                    console.error(e)
                  }
                  return
                }
                handleAlunicaAction(orderId, action.to)
              }}
              className={getButtonClasses(action.tone)}
              disabled={isLoading}
              title={title}
              aria-label={title}
            >
              {meta.icon}
            </button>
          )
        })}
        
        {/* Ações rápidas (1 clique) */}
        {stageKey === 'para-inspecao' && (
          <button
            type="button"
            onClick={() => 
              REFACTOR.USE_ALUNICA_MODALS_HOOK 
                ? alunicaModalsHook?.handleAprovarTudoOneClick(orderId)
                : handleAprovarTudoOneClick(orderId)
            }
            className={getButtonClasses('success')}
            disabled={isLoading || totalInsp <= 0}
            title="Aprovar tudo (1 clique)"
          >
            <FaCheckCircle className="h-3.5 w-3.5" />
          </button>
        )}
        {stageKey === 'para-embarque' && (
          <button
            type="button"
            onClick={() => 
              REFACTOR.USE_ALUNICA_MODALS_HOOK 
                ? alunicaModalsHook?.handleReabrirTudoOneClick(orderId)
                : handleReabrirTudoOneClick(orderId)
            }
            className={getButtonClasses('warning')}
            disabled={isLoading || totalEmb <= 0}
            title="Reabrir tudo (1 clique)"
          >
            <FaUndo className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Botão Admin Delete */}
        <DeletePedidoButton
          isAdmin={isAdmin}
          orderId={orderId}
          onDelete={handleDeleteFluxo}
          disabled={deletingIds.has(orderId) || isLoading}
          className={getButtonClasses('danger')}
        />
      </div>
    )
  }

  const renderStageOrders = (stageKey) => {
    const orders = stageBuckets[stageKey] || []

    if (!orders.length) {
      return (
        <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-4 text-sm text-gray-600">
          {EMPTY_MESSAGES[stageKey] || 'Nenhum item disponível.'}
        </div>
      )
    }

    return (
      <div className="space-y-3">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-[13px] text-gray-700">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-gray-500">
                <th className="py-1.5 pr-3">Pedido</th>
                <th className="py-1.5 pr-3">Cliente</th>
                <th className="py-1.5 pr-3">Nº Pedido</th>
                <th className="py-1.5 pr-3">Entrega</th>
                <th className="py-1.5 pr-3">Último movimento</th>
                <th className="py-1.5 pr-3">Ferramenta</th>
                <th className="py-1.5 pr-3 text-right">Kg</th>
                <th className="py-1.5 pr-3 text-right">Pc</th>
                <th className="py-1.5 pr-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((pedido) => (
                <tr key={pedido.id} className="align-top hover:bg-blue-50/40">
                  <td className="py-1.5 pr-3 font-semibold text-gray-800">{pedido.pedido}</td>
                  <td className="py-1.5 pr-3 w-40 truncate" title={pedido.cliente}>{pedido.cliente}</td>
                  <td className="py-1.5 pr-3">{pedido.numeroPedido || '—'}</td>
                  <td className="py-1.5 pr-3">{pedido.dataEntrega}</td>
                  <td className="py-1.5 pr-3">{pedido.ultimaMovimentacao || '—'}</td>
                  <td className="py-1.5 pr-3 truncate" title={pedido.ferramenta}>{pedido.ferramenta}</td>
                  <td className="py-1.5 pr-3 text-right">{pedido.pedidoKg}</td>
                  <td className="py-1.5 pr-3 text-right">{pedido.pedidoPc}</td>
                  <td className="py-1.5 pr-3">{renderOrderActions(String(pedido.id), stageKey)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {stageKey === 'pedido' && (
          <div className="flex justify-end">
            <Link
              to="/pedidos"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
            >
              Ver todos os pedidos
            </Link>
          </div>
        )}
      </div>
    )
  }

  const renderStatusCard = (status) => {
    if (activeTab === 'TecnoPerfil') {
      const ordersCount = stageBuckets[status.key]?.length || 0
      let bodyContent

      if (pedidosLoading) {
        bodyContent = (
          <div className="rounded-md bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-700">
            Carregando pedidos da carteira...
          </div>
        )
      } else if (pedidosError) {
        bodyContent = (
          <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
            Não foi possível carregar os pedidos: {pedidosError}
          </div>
        )
      } else if (status.key === 'pedido') {
        bodyContent = (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleFileButtonClick}
                  disabled={isProcessingImport}
                  className="inline-flex items-center gap-2 rounded-md border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                  title="Importar pedidos por planilha"
                >
                  <FaUpload className="h-3.5 w-3.5" />
                  <span>Carregar Planilha</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileImport}
                  className="hidden"
                />
              </div>
              <button
                type="button"
                onClick={handleToggleManualForm}
                disabled={isProcessingImport}
                className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 bg-blue-600 text-white hover:bg-blue-700"
              >
                Adicionar Pedido
              </button>
              <button
                type="button"
                onClick={handleOpenSelection}
                disabled={fluxoLoading || isProcessingImport}
                className="inline-flex items-center gap-2 rounded-md border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Selecionar pedidos
              </button>
              {isProcessingImport && <span className="text-xs text-gray-500">Processando...</span>}
            </div>
            <div className="text-xs text-gray-500 space-y-1">
              <p>Use planilha com colunas compatíveis (pedido, cliente, nr pedido, data entrega, ferramenta, pedido kg, pedido pc).</p>
              <p>Após importar ou selecionar, os pedidos ficam visíveis neste card e podem ser movimentados entre os estágios.</p>
            </div>

            {importFeedback.type && (
              <div
                className={`rounded-md px-4 py-2 text-sm ${
                  importFeedback.type === 'success'
                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border border-red-200 bg-red-50 text-red-600'
                }`}
              >
                {importFeedback.message}
              </div>
            )}

            {showManualForm && (
              <form
                onSubmit={handleManualSubmit}
                className="grid gap-3 rounded-md border border-dashed border-blue-200 bg-blue-50/40 p-4 text-sm text-gray-700 sm:grid-cols-4"
              >
                <div className="sm:col-span-1">
                  <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">Pedido*</label>
                  <input
                    type="text"
                    value={manualPedido.pedido}
                    onChange={handleManualFieldChange('pedido')}
                    className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200"
                    placeholder="Ex.: 84072/10"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">Cliente*</label>
                  <input
                    type="text"
                    value={manualPedido.cliente}
                    onChange={handleManualFieldChange('cliente')}
                    className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200"
                    placeholder="Nome do cliente"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">Nº Pedido</label>
                  <input
                    type="text"
                    value={manualPedido.numeroPedido}
                    onChange={handleManualFieldChange('numeroPedido')}
                    className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200"
                    placeholder="Pedido interno"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">Data Entrega</label>
                  <input
                    type="date"
                    value={manualPedido.dataEntrega}
                    onChange={handleManualFieldChange('dataEntrega')}
                    className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">Ferramenta</label>
                  <input
                    type="text"
                    value={manualPedido.ferramenta}
                    onChange={handleManualFieldChange('ferramenta')}
                    className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200"
                    placeholder="Ex.: TR-0011"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">Pedido Kg</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={manualPedido.pedidoKg}
                    onChange={handleManualFieldChange('pedidoKg')}
                    className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200"
                    placeholder="Peso total"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">Pedido Pc</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={manualPedido.pedidoPc}
                    onChange={handleManualFieldChange('pedidoPc')}
                    className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200"
                    placeholder="Quantidade"
                  />
                </div>
                <div className="flex flex-col gap-2 sm:col-span-1">
                  <button
                    type="submit"
                    disabled={isProcessingImport}
                    className="inline-flex items-center justify-center rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Salvar Pedido
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleManualForm}
                    disabled={isProcessingImport}
                    className="inline-flex items-center justify-center rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            {renderStageOrders(status.key)}
          </div>
        )
      } else {
        bodyContent = renderStageOrders(status.key)
      }

      return (
        <StatusCard status={status} count={ordersCount}>
          {bodyContent}
        </StatusCard>
      )
    }

    const orders = alunicaBuckets[status.key] || []

    const renderAlunicaDetails = (pedido) => {
      const fmtDT = (v) => {
        if (!v) return '—'
        try {
          const d = new Date(v)
          if (Number.isNaN(d.getTime())) return String(v)
          const dia = String(d.getDate()).padStart(2, '0')
          const mes = String(d.getMonth() + 1).padStart(2, '0')
          const ano = d.getFullYear()
          const hh = String(d.getHours()).padStart(2, '0')
          const mm = String(d.getMinutes()).padStart(2, '0')
          return `${dia}/${mes}/${ano} ${hh}:${mm}`
        } catch { return String(v) }
      }

      const lotesResumo = summarizeApontamentos(pedido.id)
      if (status.key === 'para-usinar') {
        if (!lotesResumo.length) return null
        return (
          <div className="mt-2 overflow-x-auto">
            <table className="min-w-full text-[12px] text-gray-700">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-gray-500">
                  <th className="py-1 pr-3">Lote</th>
                  <th className="py-1 pr-3 text-right">Produzido (Pc)</th>
                  <th className="py-1 pr-3 text-right">Para Inspeção (Pc)</th>
                  <th className="py-1 pr-3 text-right">Direto p/ Embalagem (Pc)</th>
                  <th className="py-1 pr-3">Início</th>
                  <th className="py-1 pr-3">Fim</th>
                  <th className="py-1 pr-3">Observações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-100">
                {lotesResumo.map((r) => (
                  <tr key={`res-${pedido.id}-${r.lote}`}>
                    <td className="py-1 pr-3 font-semibold text-gray-800">{r.lote}</td>
                    <td className="py-1 pr-3 text-right">{formatInteger(r.total)}</td>
                    <td className="py-1 pr-3 text-right">{formatInteger(r.inspecao)}</td>
                    <td className="py-1 pr-3 text-right">{formatInteger(r.embalagem)}</td>
                    <td className="py-1 pr-3">{fmtDT(r.inicio)}</td>
                    <td className="py-1 pr-3">{fmtDT(r.fim)}</td>
                    <td className="py-1 pr-3">{r.obs || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }

      if (status.key === 'para-inspecao' || status.key === 'para-embarque') {
        const resumo = Array.isArray(pedido.resumoLotes) ? pedido.resumoLotes : []
        if (!resumo.length) return null
        const coluna = status.key === 'para-inspecao' ? 'inspecao' : 'embalagem'
        const tituloQtd = status.key === 'para-inspecao' ? 'Qtd para Inspeção (Pc)' : 'Qtd para Embalagem (Pc)'
        return (
          <div className="mt-1 overflow-x-auto">
            <table className="min-w-full text-[12px] text-gray-700">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-gray-500">
                  <th className="py-1 pr-3">Lote</th>
                  <th className="py-1 pr-3 text-right">{tituloQtd}</th>
                  <th className="py-1 pr-3">Início</th>
                  <th className="py-1 pr-3">Fim</th>
                  <th className="py-1 pr-3">Observações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-100">
                {resumo.map((r) => (
                  <tr key={`res-${pedido.id}-${status.key}-${r.lote}`}>
                    <td className="py-1 pr-3 font-semibold text-gray-800">{r.lote}</td>
                    <td className="py-1 pr-3 text-right">{formatInteger(r[coluna])}</td>
                    <td className="py-1 pr-3">{fmtDT(r.inicio)}</td>
                    <td className="py-1 pr-3">{fmtDT(r.fim)}</td>
                    <td className="py-1 pr-3">{r.obs || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }

      return null
    }

    return (
      <AlunicaStageCard
        status={status}
        orders={orders}
        renderActions={(pedidoCtx) => renderAlunicaActions(pedidoCtx, status.key)}
        renderDetails={renderAlunicaDetails}
        compact
      />
    )
  }

  const renderTecnoHeader = () => (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
        <span className="inline-flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-xs font-semibold text-blue-700">
            {pedidosTecnoPerfil.length}
          </span>
          Pedidos no fluxo
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50 text-xs font-semibold text-emerald-700">
            {Object.keys(orderStages).length}
          </span>
          Em acompanhamento
        </span>
      </div>

      <WorkflowHeader statuses={TECNOPERFIL_STATUS} emptyMessages={EMPTY_MESSAGES} color="blue" />

      {lastMovement && (
        <div className="rounded-md bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 flex flex-wrap items-center gap-3">
          <span className="font-semibold">Fluxo atualizado:</span>
          <span>
            Pedido <strong>{lastMovement.pedido}</strong> de <strong>{lastMovement.cliente}</strong> movido para <strong>{lastMovement.destino}</strong>
          </span>
        </div>
      )}

      {REFACTOR.USE_NEW_APROVAR_MODAL ? (
        <AprovarModal
          open={REFACTOR.USE_ALUNICA_MODALS_HOOK ? alunicaModalsHook?.alunicaAprovarOpen : alunicaAprovarOpen}
          pedido={REFACTOR.USE_ALUNICA_MODALS_HOOK ? alunicaModalsHook?.alunicaAprovarPedido : alunicaAprovarPedido}
          itens={REFACTOR.USE_ALUNICA_MODALS_HOOK ? alunicaModalsHook?.alunicaAprovarItens : alunicaAprovarItens}
          saving={REFACTOR.USE_ALUNICA_MODALS_HOOK ? alunicaModalsHook?.alunicaAprovarSaving : alunicaAprovarSaving}
          error={REFACTOR.USE_ALUNICA_MODALS_HOOK ? alunicaModalsHook?.alunicaAprovarError : alunicaAprovarError}
          onClose={REFACTOR.USE_ALUNICA_MODALS_HOOK ? alunicaModalsHook?.closeAprovarModal : closeAprovarModal}
          onConfirm={REFACTOR.USE_ALUNICA_MODALS_HOOK ? alunicaModalsHook?.handleAprovarConfirm : handleAprovarConfirm}
          onSetMover={REFACTOR.USE_ALUNICA_MODALS_HOOK ? alunicaModalsHook?.setAprovarMover : setAprovarMover}
          onAprovarTudo={REFACTOR.USE_ALUNICA_MODALS_HOOK ? alunicaModalsHook?.aprovarTudoFill : aprovarTudoFill}
        />
      ) : (
        alunicaAprovarOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-3xl rounded-lg bg-white shadow-xl">
              <div className="flex items-center justify-between border-b px-6 py-4">
                <h3 className="text-base font-semibold text-gray-800">Aprovar Inspeção e Embalar</h3>
                <button
                  type="button"
                  onClick={closeAprovarModal}
                  className="inline-flex items-center justify-center rounded-md p-2 text-gray-500 hover:bg-gray-100"
                >
                  <FaTimes />
                </button>
              </div>
              <div className="px-6 py-4 space-y-4">
                {alunicaAprovarPedido && (
                  <div className="text-sm text-gray-700">
                    <div className="flex flex-wrap gap-3">
                      <span><span className="font-semibold">Pedido:</span> {alunicaAprovarPedido.pedido}</span>
                      <span><span className="font-semibold">Cliente:</span> {alunicaAprovarPedido.cliente}</span>
                      <span><span className="font-semibold">Ferramenta:</span> {alunicaAprovarPedido.ferramenta}</span>
                    </div>
                  </div>
                )}

                {alunicaAprovarError && (
                  <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">{alunicaAprovarError}</div>
                )}

                <div className="overflow-x-auto">
                  <table className="min-w-full text-[13px] text-gray-700">
                    <thead>
                      <tr className="text-[11px] uppercase tracking-wide text-gray-500">
                        <th className="py-1.5 pr-3">Lote</th>
                        <th className="py-1.5 pr-3 text-right">Disponível (Pc)</th>
                        <th className="py-1.5 pr-3 text-right">Mover (Pc)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {alunicaAprovarItens.length === 0 ? (
                        <tr>
                          <td className="py-2 pr-3 text-sm text-gray-500" colSpan={3}>Nenhum lote disponível para aprovação.</td>
                        </tr>
                      ) : (
                        alunicaAprovarItens.map((it) => (
                          <tr key={`aprov-${alunicaAprovarPedido?.id}-${it.lote}`}>
                            <td className="py-1.5 pr-3 font-semibold text-gray-800">{it.lote}</td>
                            <td className="py-1.5 pr-3 text-right">{formatInteger(it.disponivel)}</td>
                            <td className="py-1.5 pr-3 text-right">
                              <input
                                type="number"
                                inputMode="numeric"
                                className="w-28 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-200"
                                value={toIntegerRound(it.mover) || ''}
                                onChange={(e) => setAprovarMover(it.lote, e.target.value)}
                                min={0}
                                max={toIntegerRound(it.disponivel) || 0}
                                disabled={alunicaAprovarSaving}
                              />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between pt-2 text-xs text-gray-500">
                  <span>
                    Ajuste as quantidades por lote. Se mover tudo, o pedido avança para Embalagem; caso contrário, permanece em Inspeção.
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={aprovarTudoFill}
                      disabled={alunicaAprovarSaving || alunicaAprovarItens.length === 0}
                      className="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 font-semibold text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Aprovar tudo
                    </button>
                    <button
                      type="button"
                      onClick={closeAprovarModal}
                      disabled={alunicaAprovarSaving}
                      className="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 font-semibold text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleAprovarConfirm}
                      disabled={alunicaAprovarSaving || alunicaAprovarItens.length === 0}
                      className="inline-flex items-center rounded-md bg-purple-600 px-3 py-1.5 font-semibold text-white shadow-sm transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {alunicaAprovarSaving ? 'Processando...' : 'Confirmar aprovação'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      )}

      {REFACTOR.USE_NEW_REABRIR_MODAL ? (
        <ReabrirModal
          open={REFACTOR.USE_ALUNICA_MODALS_HOOK ? alunicaModalsHook?.alunicaReabrirOpen : alunicaReabrirOpen}
          pedido={REFACTOR.USE_ALUNICA_MODALS_HOOK ? alunicaModalsHook?.alunicaReabrirPedido : alunicaReabrirPedido}
          itens={REFACTOR.USE_ALUNICA_MODALS_HOOK ? alunicaModalsHook?.alunicaReabrirItens : alunicaReabrirItens}
          saving={REFACTOR.USE_ALUNICA_MODALS_HOOK ? alunicaModalsHook?.alunicaReabrirSaving : alunicaReabrirSaving}
          error={REFACTOR.USE_ALUNICA_MODALS_HOOK ? alunicaModalsHook?.alunicaReabrirError : alunicaReabrirError}
          onClose={REFACTOR.USE_ALUNICA_MODALS_HOOK ? alunicaModalsHook?.closeReabrirModal : closeReabrirModal}
          onConfirm={REFACTOR.USE_ALUNICA_MODALS_HOOK ? alunicaModalsHook?.handleReabrirConfirm : handleReabrirConfirm}
          onSetMover={REFACTOR.USE_ALUNICA_MODALS_HOOK ? alunicaModalsHook?.setReabrirMover : setReabrirMover}
          onReabrirTudo={REFACTOR.USE_ALUNICA_MODALS_HOOK ? alunicaModalsHook?.reabrirTudoFill : reabrirTudoFill}
        />
      ) : (
        alunicaReabrirOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-3xl rounded-lg bg-white shadow-xl">
              <div className="flex items-center justify-between border-b px-6 py-4">
                <h3 className="text-base font-semibold text-gray-800">Reabrir Inspeção</h3>
                <button
                  type="button"
                  onClick={closeReabrirModal}
                  className="inline-flex items-center justify-center rounded-md p-2 text-gray-500 hover:bg-gray-100"
                >
                  <FaTimes />
                </button>
              </div>
              <div className="px-6 py-4 space-y-4">
                {alunicaReabrirPedido && (
                  <div className="text-sm text-gray-700">
                    <div className="flex flex-wrap gap-3">
                      <span><span className="font-semibold">Pedido:</span> {alunicaReabrirPedido.pedido}</span>
                      <span><span className="font-semibold">Cliente:</span> {alunicaReabrirPedido.cliente}</span>
                      <span><span className="font-semibold">Ferramenta:</span> {alunicaReabrirPedido.ferramenta}</span>
                    </div>
                  </div>
                )}

                {alunicaReabrirError && (
                  <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">{alunicaReabrirError}</div>
                )}

                <div className="overflow-x-auto">
                  <table className="min-w-full text-[13px] text-gray-700">
                    <thead>
                      <tr className="text-[11px] uppercase tracking-wide text-gray-500">
                        <th className="py-1.5 pr-3">Lote</th>
                        <th className="py-1.5 pr-3 text-right">Disponível (Pc)</th>
                        <th className="py-1.5 pr-3 text-right">Mover (Pc)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {alunicaReabrirItens.length === 0 ? (
                        <tr>
                          <td className="py-2 pr-3 text-sm text-gray-500" colSpan={3}>Nenhum lote disponível para reabrir.</td>
                        </tr>
                      ) : (
                        alunicaReabrirItens.map((it) => (
                          <tr key={`reabr-${alunicaReabrirPedido?.id}-${it.lote}`}>
                            <td className="py-1.5 pr-3 font-semibold text-gray-800">{it.lote}</td>
                            <td className="py-1.5 pr-3 text-right">{formatInteger(it.disponivel)}</td>
                            <td className="py-1.5 pr-3 text-right">
                              <input
                                type="number"
                                inputMode="numeric"
                                className="w-28 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-200"
                                value={toIntegerRound(it.mover) || ''}
                                onChange={(e) => setReabrirMover(it.lote, e.target.value)}
                                min={0}
                                max={toIntegerRound(it.disponivel) || 0}
                                disabled={alunicaReabrirSaving}
                              />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between pt-2 text-xs text-gray-500">
                  <span>
                    Ajuste as quantidades por lote para retornar peças à Inspeção.
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={reabrirTudoFill}
                      disabled={alunicaReabrirSaving || alunicaReabrirItens.length === 0}
                      className="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 font-semibold text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Reabrir tudo
                    </button>
                    <button
                      type="button"
                      onClick={closeReabrirModal}
                      disabled={alunicaReabrirSaving}
                      className="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 font-semibold text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleReabrirConfirm}
                      disabled={alunicaReabrirSaving || alunicaReabrirItens.length === 0}
                      className="inline-flex items-center rounded-md bg-purple-600 px-3 py-1.5 font-semibold text-white shadow-sm transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {alunicaReabrirSaving ? 'Processando...' : 'Confirmar reabertura'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      )}

    </div>
  )

  

  const renderAlunicaHeader = () => (
    <div className="space-y-4">
      <WorkflowHeader statuses={ALUNICA_STATUS} color="purple" totals={alunicaHeaderTotals} />
      <p className="text-xs text-purple-500">
        Acompanhe o recebimento e a usinagem na unidade Alúnica movendo os pedidos entre os estágios.
      </p>
    </div>
  )

  const renderTabContent = () => {
    if (activeTab === 'Resumo') {
      return (
        <ResumoDashboard
          resumoTecnoPerfil={resumoTecnoPerfil}
          resumoAlunica={resumoAlunica}
          tecnoperfilStatus={TECNOPERFIL_STATUS}
          alunicaStatus={ALUNICA_STATUS}
          fluxoLoading={fluxoLoading}
          lastMovement={lastMovement}
          onExport={handleExportResumo}
          exporting={exportingResumo}
        />
      )
    }

    const statuses = STATUS_TABS[activeTab] || []

    if (statuses.length === 0 && activeTab !== 'Estoque da Usinagem') {
      return (
        <p className="text-gray-500">
          Em breve adicionaremos indicadores específicos para esta área.
        </p>
      )
    }

    if (activeTab === 'TecnoPerfil') {
      return (
        <div className="space-y-6">
          {renderTecnoHeader()}
          <div className="space-y-6">
            {statuses.map((status, index) => (
              <div key={status.key} className="relative pl-14">
                {index < statuses.length - 1 && (
                  <div className="absolute left-6 top-12 bottom-0 w-px bg-blue-100" />
                )}
                <div className="absolute left-0 top-8 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white shadow-md">
                  {index + 1}
                </div>
                {renderStatusCard(status)}
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (activeTab === 'Estoque da Usinagem') {
      if (estoqueSubTab === 'inventarios') {
        return (
          <InventariosPanel
            onBack={() => setEstoqueSubTab('estoque')}
            newInvUnidade={newInvUnidade}
            setNewInvUnidade={setNewInvUnidade}
            newInvObs={newInvObs}
            setNewInvObs={setNewInvObs}
            invSaving={invSaving}
            createInventarioFromSnapshot={createInventarioFromSnapshot}
            invLoading={invLoading}
            inventarios={inventarios}
            activeInventario={activeInventario}
            setActiveInventario={setActiveInventario}
            loadInventarioItens={loadInventarioItens}
            invError={invError}
            invItensLoading={invItensLoading}
            invItens={invItens}
            setInvItemField={setInvItemField}
            saveInventarioItem={saveInventarioItem}
            cancelInventario={cancelInventario}
          />
        )
      }
      return (
        <EstoqueUsinagemPanel
          fluxoPedidos={fluxoPedidos}
          pedidosTecnoPerfil={pedidosTecnoPerfil}
          alunicaStages={alunicaStages}
          estoqueBusca={estoqueBusca}
          setEstoqueBusca={setEstoqueBusca}
          estoqueUnidade={estoqueUnidade}
          setEstoqueUnidade={setEstoqueUnidade}
          estoqueSituacao={estoqueSituacao}
          setEstoqueSituacao={setEstoqueSituacao}
          estoquePeriodo={estoquePeriodo}
          setEstoquePeriodo={setEstoquePeriodo}
          exportandoEstoque={exportandoEstoque}
          setExportandoEstoque={setExportandoEstoque}
          onOpenInventarios={() => { setEstoqueSubTab('inventarios'); loadInventarios(); }}
          setActiveTab={setActiveTab}
        />
      )
    }

    return (
      <div className="space-y-6">
        {renderAlunicaHeader()}
        <div className="space-y-6">
          {statuses.map((status, index) => (
            <div key={status.key} className="relative pl-14">
              {index < statuses.length - 1 && (
                <div className="absolute left-6 top-12 bottom-0 w-px bg-purple-100" />
              )}
              <div className="absolute left-0 top-8 flex h-12 w-12 items-center justify-center rounded-full bg-purple-600 text-sm font-semibold text-white shadow-md">
                {index + 1}
              </div>
              {renderStatusCard(status)}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageTitle
        title="EXP - Usinagem"
        subtitle="Área em construção para as funcionalidades de expedição e usinagem."
      />

      <div className="bg-white rounded-lg shadow">
        <div className="border-b px-6 pt-5">
          <nav className="flex gap-2 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-t-md border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'bg-blue-50 border-blue-600 text-blue-700'
                    : 'bg-gray-100 border-transparent text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        <div className="px-6 py-6 bg-gray-50">
          {renderTabContent()}
        </div>
      </div>

      <SelectionModal
        open={selectionModalOpen}
        onClose={() => { resetSelection(); setSelectionModalOpen(false) }}
        selectionTab={selectionTab}
        setSelectionTab={setSelectionTab}
        importadosDisponiveis={importadosDisponiveis}
        pedidosCarteira={pedidosCarteira}
        importadosLoading={importadosLoading}
        selectedImportados={selectedImportados}
        setSelectedImportados={setSelectedImportados}
        selectedCarteira={selectedCarteira}
        setSelectedCarteira={setSelectedCarteira}
        toggleSelection={toggleSelection}
        handleConfirmSelection={handleConfirmSelection}
        isSavingSelection={isSavingSelection}
      />

      {REFACTOR.USE_NEW_APONTAMENTO_MODAL ? (
        <ApontamentoModal
          open={REFACTOR.USE_APONTAMENTO_HOOK ? apontamentoHook?.open : alunicaApontOpen}
          pedido={REFACTOR.USE_APONTAMENTO_HOOK ? apontamentoHook?.pedido : alunicaApontPedido}
          stage={REFACTOR.USE_APONTAMENTO_HOOK ? apontamentoHook?.stage : alunicaApontStage}
          qtdPc={REFACTOR.USE_APONTAMENTO_HOOK ? apontamentoHook?.qtdPc : alunicaApontQtdPc}
          qtdPcInspecao={REFACTOR.USE_APONTAMENTO_HOOK ? apontamentoHook?.qtdPcInspecao : alunicaApontQtdPcInspecao}
          obs={REFACTOR.USE_APONTAMENTO_HOOK ? apontamentoHook?.obs : alunicaApontObs}
          inicio={REFACTOR.USE_APONTAMENTO_HOOK ? apontamentoHook?.inicio : alunicaApontInicio}
          fim={REFACTOR.USE_APONTAMENTO_HOOK ? apontamentoHook?.fim : alunicaApontFim}
          saving={REFACTOR.USE_APONTAMENTO_HOOK ? apontamentoHook?.saving : alunicaApontSaving}
          error={REFACTOR.USE_APONTAMENTO_HOOK ? apontamentoHook?.error : alunicaApontError}
          fluxoPedidos={fluxoPedidos}
          onClose={REFACTOR.USE_APONTAMENTO_HOOK ? apontamentoHook?.closeModal : closeAlunicaApontamento}
          onSave={REFACTOR.USE_APONTAMENTO_HOOK ? apontamentoHook?.saveApontamento : handleSalvarAlunicaApont}
          onQtdPcChange={REFACTOR.USE_APONTAMENTO_HOOK ? apontamentoHook?.setQtdPc : setAlunicaApontQtdPc}
          onQtdPcInspecaoChange={REFACTOR.USE_APONTAMENTO_HOOK ? apontamentoHook?.setQtdPcInspecao : setAlunicaApontQtdPcInspecao}
          onObsChange={REFACTOR.USE_APONTAMENTO_HOOK ? apontamentoHook?.setObs : setAlunicaApontObs}
          onInicioChange={REFACTOR.USE_APONTAMENTO_HOOK ? apontamentoHook?.handleInicioChange : handleInicioChange}
          onFimChange={REFACTOR.USE_APONTAMENTO_HOOK ? apontamentoHook?.handleFimChange : handleFimChange}
        />
      ) : (
        alunicaApontOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-3xl rounded-lg bg-white shadow-xl">
              <div className="flex items-center justify-between border-b px-6 py-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">Apontar produção - Alúnica</h2>
                  {alunicaApontPedido && (
                    <p className="text-xs text-gray-500">
                      Pedido <span className="font-semibold">{alunicaApontPedido.pedido}</span> · Cliente {alunicaApontPedido.cliente} · Ferramenta {alunicaApontPedido.ferramenta}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={closeAlunicaApontamento}
                  disabled={alunicaApontSaving}
                  className="text-gray-500 hover:text-gray-700 disabled:opacity-60"
                >
                  <FaTimes className="h-4 w-4" />
                </button>
              </div>

              <div className="px-6 py-4 space-y-4 text-sm text-gray-700">
                {alunicaApontPedido && (
                  <div className="rounded-md bg-purple-50 border border-purple-100 px-3 py-2 text-xs text-purple-700">
                    {(() => {
                      const raw = (Array.isArray(fluxoPedidos)
                        ? fluxoPedidos.find((f) => String(f.id) === String(alunicaApontPedido.id))
                        : null) || {}

                      const pedidoPcTotal = toIntegerRound(
                        alunicaApontPedido.pedidoPcNumber ?? alunicaApontPedido.pedidoPc
                      ) || 0
                      const pedidoKgTotal = toDecimal(
                        alunicaApontPedido.pedidoKgNumber ?? alunicaApontPedido.pedidoKg
                      ) || 0

                      const apontadoPc = toIntegerRound(raw?.saldo_pc_total) || 0
                      const apontadoKg = toDecimal(raw?.saldo_kg_total) || 0

                      const saldoPc = Math.max(pedidoPcTotal - apontadoPc, 0)
                      const saldoKg = Math.max(pedidoKgTotal - apontadoKg, 0)

                      return (
                        <div className="flex flex-wrap gap-3">
                          <span>
                            <span className="font-semibold">Qtd pedido Kg:</span> {alunicaApontPedido.pedidoKg}
                          </span>
                          <span>
                            <span className="font-semibold">Qtd pedido Pc:</span> {alunicaApontPedido.pedidoPc}
                          </span>
                          <span>
                            <span className="font-semibold">Saldo Kg:</span> {formatNumber(saldoKg)}
                          </span>
                          <span>
                            <span className="font-semibold">Saldo Pc:</span> {formatInteger(saldoPc)}
                          </span>
                          <span>
                            <span className="font-semibold">Estágio:</span> {alunicaApontStage}
                          </span>
                        </div>
                      )
                    })()}
                  </div>
                )}

                {alunicaApontError && (
                  <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">
                    {alunicaApontError}
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="sm:col-span-1">
                    <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">Quantidade produzida (Pc)</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={alunicaApontQtdPc}
                      onChange={(e) => setAlunicaApontQtdPc(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-200"
                      placeholder="Ex.: 50"
                      disabled={alunicaApontSaving}
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">Para Inspeção (Pc)</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={alunicaApontQtdPcInspecao}
                      onChange={(e) => setAlunicaApontQtdPcInspecao(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-200"
                      placeholder="Ex.: 5"
                      disabled={alunicaApontSaving}
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">Direto p/ Embalagem (Pc)</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={(() => {
                        const total = toIntegerRound(alunicaApontQtdPc) || 0
                        const insp = toIntegerRound(alunicaApontQtdPcInspecao) || 0
                        const emb = Math.max(total - insp, 0)
                        return emb || ''
                      })()}
                      readOnly
                      className="w-full rounded-md border border-dashed border-gray-300 bg-gray-50 px-2 py-1 text-sm text-gray-600"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">Início</label>
                    <input
                      type="datetime-local"
                      value={alunicaApontInicio}
                      onChange={(e) => handleInicioChange(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-200"
                      disabled={alunicaApontSaving}
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">Fim</label>
                    <input
                      type="datetime-local"
                      value={alunicaApontFim}
                      onChange={(e) => handleFimChange(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-200"
                      disabled={alunicaApontSaving}
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">Observações</label>
                    <textarea
                      rows={3}
                      value={alunicaApontObs}
                      onChange={(e) => setAlunicaApontObs(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-200 resize-y"
                      placeholder="Comentários rápidos sobre o apontamento (opcional)"
                      disabled={alunicaApontSaving}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 text-xs text-gray-500">
                  <span>
                    Informe a quantidade total produzida em peças e quantas vão para inspeção.
                    Pelo menos 20 peças devem passar por inspeção antes de enviar o restante direto para embalagem.
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={closeAlunicaApontamento}
                      disabled={alunicaApontSaving}
                      className="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 font-semibold text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSalvarAlunicaApont}
                      disabled={alunicaApontSaving}
                      className="inline-flex items-center rounded-md bg-purple-600 px-3 py-1.5 font-semibold text-white shadow-sm transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {alunicaApontSaving ? 'Salvando...' : 'Salvar apontamento'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  )
}

export default ExpUsinagem
