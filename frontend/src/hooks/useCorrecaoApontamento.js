import { useState, useCallback } from 'react'
import supabaseService from '../services/SupabaseService'

export const useCorrecaoApontamento = () => {
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState(null)

  const salvarCorrecao = useCallback(async (apontamentoId, usuarioId, dadosOriginais, dadosNovos, camposAlterados, motivo) => {
    setCarregando(true)
    setErro(null)

    try {
      // 1. Registrar a correção na tabela de auditoria
      const correcao = {
        apontamento_id: apontamentoId,
        valor_anterior: dadosOriginais,
        valor_novo: dadosNovos,
        campos_alterados: camposAlterados,
        corrigido_por: usuarioId,
        motivo_correcao: motivo
      }

      const correcaoId = await supabaseService.add('apontamentos_correcoes', correcao)

      // 2. Atualizar o apontamento com os novos dados
      const atualizacoes = {}
      camposAlterados.forEach(campo => {
        atualizacoes[campo] = dadosNovos[campo]
      })

      await supabaseService.update('apontamentos', { id: apontamentoId, ...atualizacoes })

      setCarregando(false)
      return { sucesso: true, correcaoId }
    } catch (err) {
      console.error('Erro ao salvar correção:', err)
      setErro(err.message || 'Erro ao salvar correção')
      setCarregando(false)
      return { sucesso: false, erro: err.message }
    }
  }, [])

  const carregarCorrecoes = useCallback(async (apontamentoId) => {
    setCarregando(true)
    setErro(null)

    try {
      const data = await supabaseService.getByIndex('apontamentos_correcoes', 'apontamento_id', apontamentoId)
      setCarregando(false)
      return data || []
    } catch (err) {
      console.error('Erro ao carregar correções:', err)
      setErro(err.message || 'Erro ao carregar correções')
      setCarregando(false)
      return []
    }
  }, [])

  const reverterCorrecao = useCallback(async (correcaoId, usuarioId, motivo) => {
    setCarregando(true)
    setErro(null)

    try {
      await supabaseService.update('apontamentos_correcoes', {
        id: correcaoId,
        revertido: true,
        revertido_por: usuarioId,
        revertido_em: new Date().toISOString(),
        motivo_reversao: motivo
      })

      setCarregando(false)
      return { sucesso: true }
    } catch (err) {
      console.error('Erro ao reverter correção:', err)
      setErro(err.message || 'Erro ao reverter correção')
      setCarregando(false)
      return { sucesso: false, erro: err.message }
    }
  }, [])

  return {
    carregando,
    erro,
    salvarCorrecao,
    carregarCorrecoes,
    reverterCorrecao
  }
}
