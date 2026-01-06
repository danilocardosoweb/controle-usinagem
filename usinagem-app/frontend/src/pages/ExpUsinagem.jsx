import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaTimes, FaUndo, FaChevronRight, FaClipboardCheck, FaBoxOpen, FaIndustry, FaTruck, FaWarehouse, FaCogs, FaCheckCircle, FaEdit, FaUpload, FaCheck, FaPlay, FaExclamationTriangle } from 'react-icons/fa'
import * as XLSX from 'xlsx'
import PageTitle from '../components/PageTitle'
import useSupabase from '../hooks/useSupabase'
import supabaseService from '../services/SupabaseService'
import StatusCard from '../components/exp-usinagem/StatusCard'
import WorkflowHeader from '../components/exp-usinagem/WorkflowHeader'
import ResumoDashboard from '../components/exp-usinagem/ResumoDashboard'
import InventariosPanel from '../components/exp-usinagem/InventariosPanel'
import EstoqueUsinagemPanel from '../components/exp-usinagem/EstoqueUsinagemPanel'
import AnaliseProdutividadePanel from '../components/exp-usinagem/AnaliseProdutividadePanel'
import SelectionModal from '../components/exp-usinagem/SelectionModal'
import DeletePedidoButton from '../components/exp-usinagem/DeletePedidoButton'
import useFluxoExpUsinagem from '../hooks/useFluxoExpUsinagem'
import useInventarios from '../hooks/useInventarios'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { isAdmin as isAdminCheck } from '../utils/auth'
import { REFACTOR } from '../config/refactorFlags'
import ApontamentoModal from '../components/exp-usinagem/modals/ApontamentoModal'
import AprovarModal from '../components/exp-usinagem/modals/AprovarModal'
import ReabrirModal from '../components/exp-usinagem/modals/ReabrirModal'
import useApontamentoModal from '../hooks/useApontamentoModal'
import useAlunicaModals from '../hooks/useAlunicaModals'
import useTecnoPerfilState from '../hooks/useTecnoPerfilState'
import useAlunicaState from '../hooks/useAlunicaState'

// Novos Componentes da Reestruturação
import DashboardPanel from '../components/exp-usinagem/DashboardPanel'
import ApontamentoUsinagemPanel from '../components/exp-usinagem/ApontamentoUsinagemPanel'
import ApontamentoEmbalagemPanel from '../components/exp-usinagem/ApontamentoEmbalagemPanel'
import InsumosUsinagemPanel from '../components/exp-usinagem/InsumosUsinagemPanel'

import {
  TECNOPERFIL_STATUS,
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
  toIntegerRound,
  calcularDuracaoTotal,
  formatarDuracao
} from '../utils/expUsinagem'
import { summarizeApontamentos } from '../utils/apontamentosLogic'

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

// Nova definição de abas
const TABS = [
  'Dashboard',
  'Apontamento Usinagem',
  'Apontamento Embalagem',
  'Estoque Usinagem',
  'Insumos Usinagem'
]

const FINALIZADOS_STORAGE_KEY = 'exp_usinagem_finalizados_alunica'
const LEGACY_FINALIZADOS_STORAGE_KEY = 'exp_usinagem_finalizados_v1'
const FINALIZACAO_BLOQUEIO_MSG = 'Não é possível finalizar o pedido. Existem peças pendentes de embalagem ou inspeção ainda não aprovada.'

const ExpUsinagem = () => {
  const { user } = useAuth()
  const { showSuccess, showError } = useToast()
  const [activeTab, setActiveTab] = useState(TABS[0])

  // Hooks de Fluxo e Dados
  const {
    fluxoPedidos,
    fluxoLoading,
    fluxoError,
    loadFluxo,
    importados,
    importadosLoading,
    loadImportados
  } = useFluxoExpUsinagem()

  // Hook TecnoPerfil
  const {
    pedidosTecnoPerfil,
    pedidosLoading,
    pedidosError,
    loadPedidosTecnoPerfil,
    stageBuckets,
    tecnoPerfilBuckets,
    moveOrderToStage,
    deleteFromFlow,
    isDeleting
  } = useTecnoPerfilState({
    fluxoPedidos,
    pedidosTecnoPerfil: [], // Will be calculated inside hook if not passed, but better to pass memoized
    alunicaStages: {}, // Will be calculated
    user,
    loadFluxo
  })

  // Hook Alúnica
  const {
    alunicaStages,
    setAlunicaStages,
    apontByFluxo,
    apontLoading,
    loadApontamentosFor,
    removeFromAlunica,
    alunicaBuckets,
    alunicaTotals,
    finalizados
  } = useAlunicaState({
    fluxoPedidos,
    pedidosTecnoPerfil,
    user,
    loadFluxo
  })

  // Hook Inventários
  const {
    inventarios,
    invLoading: inventariosLoading,
    loadInventarios,
    activeInventario,
    setActiveInventario,
    invItens,
    invItensLoading,
    invSaving,
    invError,
    newInvUnidade,
    setNewInvUnidade,
    newInvObs,
    setNewInvObs,
    setInvItemField,
    loadInventarioItens,
    createInventarioFromSnapshot,
    saveInventarioItem,
    cancelInventario
  } = useInventarios({
    fluxoPedidos,
    pedidosTecnoPerfil,
    alunicaStages,
    user
  })

  // Hook Modais Alúnica
  const alunicaModalsHook = useAlunicaModals({
    alunicaStages,
    setAlunicaStages,
    loadApontamentosFor,
    loadFluxo,
    user,
    apontByFluxo
  })

  // Hook Apontamento Modal
  const apontamentoModal = useApontamentoModal({
    onSuccess: async (pedidoId) => {
      await loadApontamentosFor(pedidoId)
      await loadFluxo()
    }
  })

  // Estados legados (podem ser removidos gradualmente)
  const [estoqueSubTab, setEstoqueSubTab] = useState('lista')
  const [inventariosOpen, setInventariosOpen] = useState(false)
  const [manualPedido, setManualPedido] = useState(INITIAL_MANUAL_PEDIDO)
  const [showManualForm, setShowManualForm] = useState(false)
  const [importFeedback, setImportFeedback] = useState({ type: null, message: '' })
  const fileInputRef = useRef(null)
  const [isProcessingImport, setIsProcessingImport] = useState(false)
  const [selectionModalOpen, setSelectionModalOpen] = useState(false)
  const [selectionTab, setSelectionTab] = useState('importados')
  const [selectedImportados, setSelectedImportados] = useState([])
  const [selectedCarteira, setSelectedCarteira] = useState([])
  const [isSavingSelection, setIsSavingSelection] = useState(false)
  const [exportingResumo, setExportingResumo] = useState(false)

  // Estados para EstoqueUsinagemPanel
  const [estoqueBusca, setEstoqueBusca] = useState('')
  const [estoqueUnidade, setEstoqueUnidade] = useState('todas')
  const [estoqueSituacao, setEstoqueSituacao] = useState('todas')
  const [estoquePeriodo, setEstoquePeriodo] = useState(30)
  const [exportandoEstoque, setExportandoEstoque] = useState(false)

  // Verifica admin
  const isAdmin = useMemo(() => isAdminCheck(user), [user])

  // Efeitos de carga inicial
  useEffect(() => {
    loadFluxo()
    loadImportados()
    loadInventarios()
  }, [])

  // Efeito para carregar apontamentos de pedidos Alúnica
  useEffect(() => {
    if (fluxoPedidos.length > 0) {
      fluxoPedidos.forEach((p) => {
        if (p.alunica_stage) {
          loadApontamentosFor(p.id)
        }
      })
    }
  }, [fluxoPedidos])

  const handleDeleteFluxo = async (orderId) => {
    try {
      if (!isAdmin) return
      const ok = typeof window !== 'undefined' ? window.confirm('Confirma remover este pedido do processo? Esta ação não pode ser desfeita.') : true
      if (!ok) return

      // Usa função do hook para deletar
      await deleteFromFlow(orderId)

      // Limpa também da Alúnica
      removeFromAlunica(orderId)

      showSuccess('Pedido removido do fluxo com sucesso.')
    } catch (err) {
      console.error('Erro ao remover pedido do fluxo:', err)
      showError(`Falha ao remover o pedido: ${err?.message || err}`)
    }
  }

  const isPedidoCompleto = useCallback((pedido) => {
    if (!pedido) return false
    const total = toIntegerRound(pedido.pedidoPcNumber ?? pedido.pedidoPc) || 0
    if (total <= 0) return false
    const apont = toIntegerRound(pedido.apontadoPcNumber ?? pedido.apontadoPc) || 0
    return apont >= total
  }, [])

  const importadosDisponiveis = useMemo(() => {
    if (!Array.isArray(importados)) return []
    const list = importados
      // Ocultar já no fluxo (verifica por importado_id E por pedido_seq)
      .filter((item) => !fluxoPedidos.some((fluxo) =>
        fluxo.importado_id === item.id ||
        String(fluxo.pedido_seq) === String(item.pedido)
      ))
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

  const handleOpenApontamento = (pedido) => {
    if (!pedido) return
    apontamentoModal.openModal(pedido, 'para-usinar')
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

    const registrosSelecionadosCarteira = (Array.isArray(pedidosTecnoPerfil) ? pedidosTecnoPerfil : [])
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

  // useEffects de sincronização do TecnoPerfil removidos - agora gerenciados por useTecnoPerfilState

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




  const resumoTecnoPerfil = useMemo(() => {
    const stageTotals = {}
    let totalKg = 0
    let totalPc = 0
    let totalCount = 0

    TECNO_STAGE_KEYS.forEach((stageKey) => {
      const orders = tecnoPerfilBuckets[stageKey] || []
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
  }, [tecnoPerfilBuckets])

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
      ; (Array.isArray(fluxoPedidos) ? fluxoPedidos : []).forEach((f) => {
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
    pedidosTecnoPerfil
  ])

  // moveOrderToStage removida - agora gerenciada por useTecnoPerfilState
  // Nota: Lógica de __alunica__ e __finalizar__ precisa ser tratada separadamente

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

  // Funções antigas de apontamento e Alúnica removidas - agora gerenciadas por hooks

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
          disabled={isDeleting(orderId)}
          className={getButtonClasses('danger')}
        />
      </div>
    )
  }

  /**
   * Valida se o pedido pode ser finalizado verificando lote por lote
   * @param {string} orderId - ID do pedido
   * @returns {Object} { podefinalizar: boolean, motivo: string }
   */
  const validarFinalizacaoPorLote = useCallback((orderId) => {
    // ✅ VALIDAÇÃO 1: Verificar que pedido está na Alúnica
    if (!alunicaStages[orderId]) {
      return {
        podeFinali: false,
        motivo: 'Pedido não está na Alúnica'
      };
    }

    // ✅ VALIDAÇÃO 2: Verificar estágio final
    const currentStage = alunicaStages[orderId];
    if (currentStage !== 'para-embarque') {
      return {
        podeFinali: false,
        motivo: `Pedido está em "${currentStage}", não em "para-embarque"`
      };
    }

    // ✅ VALIDAÇÃO 3: Verificar saldo no banco
    const fluxoRecord = fluxoPedidos.find(f => String(f.id) === String(orderId));
    if (!fluxoRecord) {
      return {
        podeFinali: false,
        motivo: 'Pedido não encontrado no fluxo'
      };
    }

    if (fluxoRecord.pc_disponivel > 0) {
      return {
        podeFinali: false,
        motivo: `Ainda há ${fluxoRecord.pc_disponivel} PC disponíveis para apontar`
      };
    }

    // ✅ VALIDAÇÕES ORIGINAIS
    const pedidoTotalPc = toIntegerRound(
      pedidosTecnoPerfil.find(p => String(p.id) === String(orderId))?.pedidoPcNumber || 0
    );
    const apontadoTotal = toIntegerRound(
      fluxoPedidos.find(f => String(f.id) === String(orderId))?.saldo_pc_total || 0
    );

    // 1. Verifica se produção está completa
    if (apontadoTotal < pedidoTotalPc) {
      return {
        podeFinali: false,
        motivo: `Produção incompleta: ${apontadoTotal}/${pedidoTotalPc} peças. Ainda faltam ${pedidoTotalPc - apontadoTotal} peças para produzir.`
      };
    }

    // 2. Busca todos os apontamentos do pedido
    const apontList = apontByFluxo[String(orderId)] || [];

    // 3. Verifica lotes de inspeção não aprovados
    const lotesInspecao = apontList.filter(
      row => row && row.exp_unidade === 'alunica' && row.exp_stage === 'para-inspecao'
    );

    if (lotesInspecao.length > 0) {
      const totalPcsInspecao = lotesInspecao.reduce((acc, row) => acc + (Number(row.quantidade) || 0), 0);
      const lotesDescricao = lotesInspecao.map(r => r.lote).join(', ');
      return {
        podeFinali: false,
        motivo: `Existem ${totalPcsInspecao} peças em ${lotesInspecao.length} lote(s) aguardando aprovação da inspeção: ${lotesDescricao}. Aprove todos os lotes antes de finalizar.`
      };
    }

    // 4. Verifica se todos os lotes de embalagem foram processados
    const lotesEmbalagem = apontList.filter(
      row => row && row.exp_unidade === 'alunica' && row.exp_stage === 'para-embarque'
    );
    const totalPcsEmbalagem = lotesEmbalagem.reduce((acc, row) => acc + (Number(row.quantidade) || 0), 0);

    // Se há lotes de embalagem, deve haver apontamentos de embalagem correspondentes
    // (Por enquanto, consideramos que se o lote está em para-embarque, já foi "movido" para lá)
    // Validação adicional: verificar se apontadoTotal == totalPcsEmbalagem
    if (apontadoTotal > totalPcsEmbalagem && totalPcsEmbalagem > 0) {
      const faltamEmbalar = apontadoTotal - totalPcsEmbalagem;
      return {
        podeFinali: false,
        motivo: `Ainda faltam ${faltamEmbalar} peças para serem movidas para embalagem. Total produzido: ${apontadoTotal}, Em embalagem: ${totalPcsEmbalagem}.`
      };
    }

    // Se passou todas as validações, pode finalizar
    return { podeFinali: true, motivo: '' };
  }, [alunicaStages, apontByFluxo, pedidosTecnoPerfil, fluxoPedidos]);

  const renderAlunicaActions = (pedidoCtx, stageKey) => {
    if (!pedidoCtx || !stageKey) return null

    const orderId = String(pedidoCtx.id)
    const actions = ALUNICA_ACTIONS[stageKey] || []
    const actionLoadingSet = REFACTOR.USE_ALUNICA_MODALS_HOOK ? alunicaModalsHook?.alunicaActionLoading : alunicaActionLoading
    const isLoading = actionLoadingSet?.has(orderId)

    // VALIDAÇÃO ROBUSTA: Verifica lote por lote
    const validacao = validarFinalizacaoPorLote(orderId);
    const deveBloquearFinalizacao = !validacao.podeFinali;
    const mensagemBloqueioFinalizacao = validacao.motivo || 'Não é possível finalizar o pedido. Verifique as pendências.'

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
                  onClick={() => {
                    if (deveBloquearFinalizacao) {
                      openBloqueioFinalizacaoModal(mensagemBloqueioFinalizacao)
                      return
                    }
                    finalizarPedidoAlunica(orderId)
                  }}
                  className={`${getButtonClasses('success')} ${deveBloquearFinalizacao ? 'opacity-70 cursor-not-allowed' : ''}`}
                  disabled={isLoading}
                  title={deveBloquearFinalizacao ? 'Finalize após resolver pendências' : 'Finalizar pedido'}
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
            onClick={() => apontamentoHook?.openModal(pedidoCtx.id, stageKey)}
            className={getButtonClasses('primary')}
            disabled={isLoading}
            title="Registrar Apontamento"
          >
            <FaPlay className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Botão Apontar para estágio para-inspecao (Inspeção) */}
        {stageKey === 'para-inspecao' && !pedidoCtx.finalizado && (
          <button
            type="button"
            onClick={() => apontamentoHook?.openModal(pedidoCtx.id, stageKey)}
            className={getButtonClasses('primary')}
            disabled={isLoading}
            title="Registrar Apontamento de Inspeção"
          >
            <FaPlay className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Botão Apontar para estágio para-embarque (Embalagem) */}
        {stageKey === 'para-embarque' && !pedidoCtx.finalizado && (
          <button
            type="button"
            onClick={() => apontamentoHook?.openModal(pedidoCtx.id, stageKey)}
            className={getButtonClasses('primary')}
            disabled={isLoading}
            title="Registrar Apontamento de Embalagem"
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
            disabled={isLoading || !pedidoCtx?.resumoLotes?.length}
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
            disabled={isLoading || !pedidoCtx?.resumoLotes?.length}
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
          disabled={isDeleting(orderId) || isLoading}
          className={getButtonClasses('danger')}
        />
      </div>
    )
  }



  const renderTabContent = () => {
    switch (activeTab) {
      case 'Dashboard':
        return (
          <DashboardPanel
            resumoTecnoPerfil={resumoTecnoPerfil}
            resumoAlunica={resumoAlunica}
            alunicaHeaderTotals={alunicaHeaderTotals}
            alunicaBuckets={alunicaBuckets}
            fluxoLoading={fluxoLoading}
          />
        )
      case 'Apontamento Usinagem':
        return (
          <ApontamentoUsinagemPanel
            alunicaBuckets={alunicaBuckets}
            pedidosCarteira={pedidosTecnoPerfil}
            importados={importados}
            handleFileImport={handleFileImport}
            handleManualSubmit={handleManualSubmit}
            handleConfirmSelection={handleConfirmSelection}
            handleToggleManualForm={handleToggleManualForm}
            handleFileButtonClick={handleFileButtonClick}
            handleOpenSelection={handleOpenSelection}
            handleManualFieldChange={handleManualFieldChange}
            handleOpenApontamento={handleOpenApontamento}
            manualPedido={manualPedido}
            showManualForm={showManualForm}
            importFeedback={importFeedback}
            isProcessingImport={isProcessingImport}
            fileInputRef={fileInputRef}
            fluxoLoading={fluxoLoading}
            renderAlunicaActions={(pedido) => renderAlunicaActions(pedido, 'para-usinar')}
            summarizeApontamentos={summarizeApontamentos}
            formatInteger={formatInteger}
            formatNumber={formatNumber}
            toIntegerRound={toIntegerRound}
            user={user}
          />
        )
      case 'Apontamento Embalagem':
        return (
          <ApontamentoEmbalagemPanel
            alunicaBuckets={alunicaBuckets}
            renderAlunicaActions={(pedido) => renderAlunicaActions(pedido, 'para-embarque')}
            summarizeApontamentos={summarizeApontamentos}
            formatInteger={formatInteger}
            toIntegerRound={toIntegerRound}
            importados={importados}
            user={user}
          />
        )
      case 'Estoque Usinagem':
        if (estoqueSubTab === 'inventarios') {
          return (
            <InventariosPanel
              onBack={() => setEstoqueSubTab('lista')}
              newInvUnidade={newInvUnidade}
              setNewInvUnidade={setNewInvUnidade}
              newInvObs={newInvObs}
              setNewInvObs={setNewInvObs}
              invSaving={invSaving}
              createInventarioFromSnapshot={createInventarioFromSnapshot}
              invLoading={inventariosLoading}
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
      case 'Insumos Usinagem':
        return <InsumosUsinagemPanel user={user} />
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <PageTitle
        title="EXP - Usinagem"
      />

      <div className="bg-white rounded-lg shadow">
        <div className="border-b px-6 pt-5">
          <nav className="flex gap-2 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-t-md border-b-2 transition-colors ${activeTab === tab
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
        pedidosCarteira={pedidosTecnoPerfil}
        importadosLoading={importadosLoading}
        selectedImportados={selectedImportados}
        setSelectedImportados={setSelectedImportados}
        selectedCarteira={selectedCarteira}
        setSelectedCarteira={setSelectedCarteira}
        toggleSelection={toggleSelection}
        handleConfirmSelection={handleConfirmSelection}
        isSavingSelection={isSavingSelection}
      />

      <ApontamentoModal
        open={apontamentoModal?.open}
        pedido={apontamentoModal?.pedido}
        stage={apontamentoModal?.stage}
        qtdPc={apontamentoModal?.qtdPc}
        qtdPcInspecao={apontamentoModal?.qtdPcInspecao}
        obs={apontamentoModal?.obs}
        inicio={apontamentoModal?.inicio}
        fim={apontamentoModal?.fim}
        saving={apontamentoModal?.saving}
        error={apontamentoModal?.error}
        fluxoPedidos={fluxoPedidos}
        apontamentosPorFluxo={apontByFluxo}
        onClose={apontamentoModal?.closeModal}
        onSave={apontamentoModal?.saveApontamento}
        onQtdPcChange={apontamentoModal?.setQtdPc}
        onQtdPcInspecaoChange={apontamentoModal?.setQtdPcInspecao}
        onObsChange={apontamentoModal?.setObs}
        onInicioChange={apontamentoModal?.handleInicioChange}
        onFimChange={apontamentoModal?.handleFimChange}
      />

      {/* Modal antigo inline removido - agora usa ApontamentoModal + useApontamentoModal */}
      {false && (
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
