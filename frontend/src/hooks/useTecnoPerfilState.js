import { useState, useEffect, useMemo, useCallback } from 'react'
import supabaseService from '../services/SupabaseService'
import {
  TECNO_STAGE_KEYS,
  DEFAULT_STAGE,
  mapStageFromDb,
  mapStageToDb
} from '../constants/expUsinagem'

/**
 * Hook para gerenciar o estado e lógica do fluxo TecnoPerfil
 * 
 * @param {Object} params
 * @param {Array} params.fluxoPedidos - Lista de pedidos do fluxo
 * @param {Array} params.pedidosTecnoPerfil - Pedidos normalizados
 * @param {Object} params.alunicaStages - Estágios da Alúnica
 * @param {Object} params.user - Usuário autenticado
 * @param {Function} params.loadFluxo - Função para recarregar fluxo
 * 
 * @returns {Object} Estado e funções do TecnoPerfil
 * 
 * @created 20/11/2025
 * @author Cascade AI
 */
const useTecnoPerfilState = ({ fluxoPedidos, pedidosTecnoPerfil, alunicaStages, user, loadFluxo }) => {
  const [orderStages, setOrderStages] = useState({})
  const [lastMovement, setLastMovement] = useState(null)
  const [deletingIds, setDeletingIds] = useState(new Set())

  // Sincroniza orderStages com os dados do banco
  useEffect(() => {
    if (!Array.isArray(fluxoPedidos)) return

    setOrderStages(prev => {
      const next = { ...prev }
      let hasChanges = false
      const currentIds = new Set()

      fluxoPedidos.forEach(registro => {
        if (!registro || !registro.id) return
        const id = String(registro.id)
        currentIds.add(id)

        // Usa o status_atual do banco se for um estágio válido
        const stageFromDb = mapStageFromDb(registro.status_atual)
        
        // Não manter em orderStages quando estiver finalizado
        if (stageFromDb === 'finalizado') {
          if (id in next) {
            delete next[id]
            hasChanges = true
          }
          return
        }

        // Se o pedido está na Alúnica, não deve aparecer no TecnoPerfil
        if (alunicaStages && alunicaStages[id]) {
          if (id in next) {
            delete next[id]
            hasChanges = true
          }
          return
        }

        // Atualiza apenas se mudou
        if (next[id] !== stageFromDb) {
          next[id] = stageFromDb
          hasChanges = true
        }
      })

      // Remove pedidos que não existem mais no fluxo
      Object.keys(next).forEach(id => {
        if (!currentIds.has(id)) {
          delete next[id]
          hasChanges = true
        }
      })

      return hasChanges ? next : prev
    })
  }, [fluxoPedidos, alunicaStages])

  // Agrupa pedidos por estágio (buckets)
  const tecnoPerfilBuckets = useMemo(() => {
    const buckets = {}
    TECNO_STAGE_KEYS.forEach((key) => {
      buckets[key] = []
    })

    if (!Array.isArray(pedidosTecnoPerfil)) return buckets

    pedidosTecnoPerfil.forEach((pedido) => {
      const id = String(pedido.id)
      if (pedido?.status === 'finalizado') return
      
      const stage = orderStages[id] && TECNO_STAGE_KEYS.includes(orderStages[id])
        ? orderStages[id]
        : DEFAULT_STAGE

      // Não incluir se estiver na Alúnica
      if (alunicaStages && alunicaStages[id]) {
        return
      }

      if (buckets[stage]) {
        buckets[stage].push(pedido)
      }
    })

    return buckets
  }, [orderStages, pedidosTecnoPerfil, alunicaStages])

  // Move pedido para outro estágio
  const moveOrderToStage = useCallback(async (orderId, targetStage) => {
    try {
      const statusAnterior = orderStages[orderId] || DEFAULT_STAGE

      // Determina estágio de UI (orderStages) e estágio de banco (status_atual)
      let uiStage
      if (targetStage === '__alunica__') {
        // Botão especial: enviar para Alúnica a partir da expedição TecnoPerfil
        uiStage = 'expedicao-alu'
      } else {
        uiStage = targetStage
      }

      const dbStage = mapStageToDb(uiStage)

      // Atualiza o estado local com o estágio de UI
      setOrderStages(prev => ({
        ...prev,
        [orderId]: uiStage
      }))

      // Monta payload de atualização no banco
      const updates = {
        id: orderId,
        status_atual: dbStage
      }

      // ✅ Quando enviamos para a Alúnica pela primeira vez, inicializamos alunica_stage como 'estoque'
      if (targetStage === '__alunica__') {
        updates.alunica_stage = 'estoque'  // ✅ CORRETO: Começa em "Material em Estoque"
      }

      await supabaseService.update('exp_pedidos_fluxo', updates)

      // Registra movimentação (usando estágios de UI para leitura humana)
      await supabaseService.add('exp_pedidos_movimentacoes', {
        fluxo_id: orderId,
        status_anterior: statusAnterior,
        status_novo: uiStage,
        motivo: null,
        movimentado_por: user?.nome || user?.email || 'Operador',
        movimentado_em: new Date().toISOString(),
        tipo_movimentacao: 'status'
      })

      setLastMovement({
        orderId,
        from: statusAnterior,
        to: uiStage,
        timestamp: Date.now()
      })

      // Recarrega dados
      if (loadFluxo) {
        await loadFluxo()
      }
    } catch (error) {
      console.error('Erro ao mover pedido:', error)
      // Reverte estado local em caso de erro
      setOrderStages(prev => {
        const next = { ...prev }
        const statusAnterior = orderStages[orderId] || DEFAULT_STAGE
        next[orderId] = statusAnterior
        return next
      })
      throw error
    }
  }, [orderStages, user, loadFluxo])

  // Remove pedido do fluxo
  const deleteFromFlow = useCallback(async (orderId) => {
    try {
      setDeletingIds(prev => new Set(prev).add(String(orderId)))
      
      await supabaseService.remove('exp_pedidos_fluxo', orderId)
      
      setOrderStages(prev => {
        const next = { ...prev }
        delete next[orderId]
        return next
      })

      if (loadFluxo) {
        await loadFluxo()
      }
    } catch (error) {
      console.error('Erro ao excluir pedido:', error)
      throw error
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev)
        next.delete(String(orderId))
        return next
      })
    }
  }, [loadFluxo])

  // Verifica se pedido está sendo excluído
  const isDeleting = useCallback((orderId) => {
    return deletingIds.has(String(orderId))
  }, [deletingIds])

  return {
    // Estados
    orderStages,
    lastMovement,
    tecnoPerfilBuckets,
    
    // Funções
    moveOrderToStage,
    deleteFromFlow,
    isDeleting,
    
    // Utilitários
    getTotalPedidos: () => Object.keys(orderStages).length
  }
}

export default useTecnoPerfilState
