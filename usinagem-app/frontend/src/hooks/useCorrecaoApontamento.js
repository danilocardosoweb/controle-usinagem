import { useState, useCallback } from 'react'
import supabaseService from '../services/SupabaseService'
import { supabase } from '../config/supabase'

export const useCorrecaoApontamento = () => {
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState(null)

  const salvarCorrecao = useCallback(async (apontamentoId, usuarioId, dadosOriginais, dadosNovos, camposAlterados, motivo) => {
    setCarregando(true)
    setErro(null)

    try {
      const { data: correcaoId, error } = await supabase.rpc('corrigir_apontamento_auditado', {
        p_apontamento_id: apontamentoId,
        p_usuario_id: usuarioId,
        p_esperado: dadosOriginais,
        p_alteracoes: Object.fromEntries(camposAlterados.map(campo => [campo, dadosNovos[campo]])),
        p_motivo: motivo
      })
      if (error) throw error

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
