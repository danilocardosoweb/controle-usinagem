import { useState, useEffect, useMemo, useCallback } from 'react'
import supabaseService from '../services/SupabaseService'
import {
  ALUNICA_STAGE_KEYS,
  ALUNICA_DEFAULT_STAGE,
  mapStageToDb
} from '../constants/expUsinagem'
import { toIntegerRound } from '../utils/expUsinagem'

const FINALIZADOS_STORAGE_KEY = 'exp_usinagem_finalizados_alunica'
const LEGACY_FINALIZADOS_STORAGE_KEY = 'exp_usinagem_finalizados_v1'

/**
 * Hook para gerenciar o estado e lógica do fluxo Alúnica
 * 
 * @param {Object} params
 * @param {Array} params.fluxoPedidos - Lista de pedidos do fluxo
 * @param {Array} params.pedidosTecnoPerfil - Pedidos normalizados
 * @param {Function} params.summarizeApontamentos - Função para sumarizar apontamentos
 * @param {Object} params.user - Usuário autenticado
 * @param {Function} params.loadFluxo - Função para recarregar fluxo
 * @param {Object} params.apontByFluxo - Apontamentos agrupados por fluxo_id
 * 
 * @returns {Object} Estado e funções da Alúnica
 * 
 * @created 20/11/2025
 * @author Cascade AI
 */
const useAlunicaState = ({ fluxoPedidos, pedidosTecnoPerfil, summarizeApontamentos, user, loadFluxo }) => {
  const [alunicaStages, setAlunicaStages] = useState({})
  const [apontByFluxo, setApontByFluxo] = useState({})
  const [apontLoading, setApontLoading] = useState(false)
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

  // Persiste finalizados no localStorage
  useEffect(() => {
    try {
      localStorage.setItem(FINALIZADOS_STORAGE_KEY, JSON.stringify(finalizados))
      localStorage.setItem(LEGACY_FINALIZADOS_STORAGE_KEY, JSON.stringify(finalizados))
    } catch (e) {
      console.warn('Não foi possível salvar finalizados da Alúnica:', e)
    }
  }, [finalizados])

  // Função para carregar apontamentos de um pedido específico
  const loadApontamentosFor = useCallback(async (fluxoId) => {
    if (!fluxoId) return

    try {
      setApontLoading(true)
      const apontamentos = await supabaseService.getByIndex('apontamentos', 'exp_fluxo_id', fluxoId)

      setApontByFluxo(prev => ({
        ...prev,
        [String(fluxoId)]: Array.isArray(apontamentos) ? apontamentos : []
      }))
    } catch (error) {
      console.error('Erro ao carregar apontamentos:', error)
    } finally {
      setApontLoading(false)
    }
  }, [])

  // Sincroniza alunicaStages com os dados do banco
  useEffect(() => {
    if (!Array.isArray(fluxoPedidos)) return

    setAlunicaStages((prev) => {
      const next = { ...prev }
      let hasChanges = false
      const currentIds = new Set()

      fluxoPedidos.forEach((pedido) => {
        const id = String(pedido?.id)
        if (!id) return

        currentIds.add(id)
        const dbStage = pedido?.alunica_stage

        // ✅ Sincronizar SEMPRE que houver alunica_stage no banco
        if (dbStage && ALUNICA_STAGE_KEYS.includes(dbStage)) {
          if (next[id] !== dbStage) {
            next[id] = dbStage
            hasChanges = true
            console.log(`[Alúnica] Sincronizando ${id} → ${dbStage}`)
          }
        } else if (id in next && !dbStage) {
          // Se o banco não tem mais alunica_stage, remover do estado local
          delete next[id]
          hasChanges = true
          console.log(`[Alúnica] Removendo ${id} (sem alunica_stage no banco)`)
        }
      })

      // Remove pedidos que não existem mais
      Object.keys(next).forEach((id) => {
        if (!currentIds.has(id)) {
          delete next[id]
          hasChanges = true
        }
      })

      return hasChanges ? next : prev
    })
  }, [fluxoPedidos])

  // Agrupa pedidos por estágio (buckets)
  const alunicaBuckets = useMemo(() => {
    const buckets = {}
    ALUNICA_STAGE_KEYS.forEach((key) => {
      buckets[key] = []
    })

    if (!Array.isArray(pedidosTecnoPerfil) || !Array.isArray(fluxoPedidos)) return buckets

    const fluxoById = fluxoPedidos.reduce((acc, item) => {
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
      const apontadoKgNum = parseFloat(raw?.saldo_kg_total) || 0

      // ✅ CORREÇÃO: Mostrar pedido em "para-usinar" SEMPRE que houver saldo disponível
      // E também mostrar nos outros estágios onde há apontamentos
      const apontamentosReais = apontByFluxo?.[id] || []
      const estagiosReais = new Set(apontamentosReais.map(a => a?.exp_stage).filter(Boolean))

      const pedidoCtx = {
        ...pedido,
        apontadoPcNumber: apontadoPcNum,
        apontadoKgNumber: apontadoKgNum,
        finalizado: estaFinalizado
      }

      // ✅ SEMPRE mostrar em "para-usinar" enquanto houver saldo
      const pcDisponivel = toIntegerRound(raw?.pc_disponivel) || 0
      if (stageRef === 'para-usinar' && pcDisponivel > 0) {
        const resumoLotes = summarizeApontamentos ? summarizeApontamentos(id, ['para-usinar']) : []
        if (buckets['para-usinar']) {
          buckets['para-usinar'].push({
            ...pedidoCtx,
            resumoLotes
          })
        }
      }

      // ✅ Mostrar também nos outros estágios onde há apontamentos (exceto para-usinar)
      estagiosReais.forEach((stage) => {
        if (stage !== 'para-usinar' && ALUNICA_STAGE_KEYS.includes(stage)) {
          const resumoLotes = summarizeApontamentos ? summarizeApontamentos(id, [stage]) : []

          if (buckets[stage]) {
            buckets[stage].push({
              ...pedidoCtx,
              resumoLotes
            })
          }
        }
      })
    })

    return buckets
  }, [alunicaStages, pedidosTecnoPerfil, fluxoPedidos, summarizeApontamentos, finalizados, apontByFluxo])

  // Calcula totais por estágio
  const alunicaTotals = useMemo(() => {
    const totals = { 'para-usinar': 0, 'para-inspecao': 0, 'para-embarque': 0 }

    // ✅ Contar apontamentos por estágio diretamente
    if (!Array.isArray(fluxoPedidos)) return totals

    fluxoPedidos.forEach((fluxo) => {
      const id = String(fluxo?.id)
      if (!id) return

      // Buscar apontamentos deste pedido
      const apontamentos = apontByFluxo?.[id] || []

      // Contar por estágio
      apontamentos.forEach((apt) => {
        const stage = apt?.exp_stage
        if (stage && totals.hasOwnProperty(stage)) {
          const qty = toIntegerRound(apt?.quantidade) || 0
          totals[stage] += qty
          console.log(`[Totais] ${id} em ${stage}: +${qty}`)
        }
      })
    })

    console.log('[Totais Alúnica]', totals)
    return totals
  }, [fluxoPedidos, apontByFluxo])

  // Move pedido para outro estágio da Alúnica
  const handleAlunicaAction = useCallback(async (orderId, targetStage) => {
    if (!orderId || !targetStage) return

    const id = String(orderId)

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

        // Persiste o novo estágio no banco (apenas valores aceitos no CHECK do banco)
        const persistStage = ['para-usinar', 'para-inspecao', 'para-embarque'].includes(targetStage)
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

      if (loadFluxo) {
        await loadFluxo()
      }
    } catch (error) {
      console.error('Erro ao mover pedido na Alúnica:', error)
      throw error
    }
  }, [alunicaStages, user, loadFluxo])

  // Finaliza pedido
  const finalizarPedidoAlunica = useCallback((orderId) => {
    if (!orderId) return
    const id = String(orderId)
    setFinalizados((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }, [])

  // Reabre pedido
  const reabrirPedidoAlunica = useCallback((orderId) => {
    if (!orderId) return
    const id = String(orderId)
    setFinalizados((prev) => prev.filter((curr) => curr !== id))
  }, [])

  // Remove pedido da Alúnica
  const removeFromAlunica = useCallback((orderId) => {
    setAlunicaStages(prev => {
      const next = { ...prev }
      delete next[orderId]
      return next
    })
    setFinalizados(prev => prev.filter(id => id !== orderId))
  }, [])

  return {
    // Estados
    alunicaStages,
    setAlunicaStages, // Exposto para compatibilidade com código existente
    finalizados,
    alunicaBuckets,
    alunicaTotals,
    apontByFluxo,
    apontLoading,

    // Funções
    loadApontamentosFor,
    handleAlunicaAction,
    finalizarPedidoAlunica,
    reabrirPedidoAlunica,
    removeFromAlunica,

    // Utilitários
    getTotalPedidosAlunica: () => Object.keys(alunicaStages).length,
    isPedidoFinalizado: (orderId) => finalizados.includes(String(orderId))
  }
}

export default useAlunicaState
