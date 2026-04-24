import { useCallback, useEffect, useState } from 'react'
import supabaseService from '../services/SupabaseService'

const useFluxoExpUsinagem = () => {
  const [fluxoPedidos, setFluxoPedidos] = useState([])
  const [fluxoLoading, setFluxoLoading] = useState(true)
  const [fluxoError, setFluxoError] = useState(null)

  const [importados, setImportados] = useState([])
  const [importadosLoading, setImportadosLoading] = useState(false)

  const loadFluxo = useCallback(async () => {
    try {
      setFluxoLoading(true)
      const data = await supabaseService.getAll('exp_pedidos_fluxo')
      if (!data) throw new Error('Nenhum dado retornado do banco')
      setFluxoPedidos(Array.isArray(data) ? data : [])
      setFluxoError(null)
      return data
    } catch (error) {
      console.error('Erro ao carregar fluxo EXP Usinagem:', error)
      setFluxoError(error?.message || 'Erro ao carregar pedidos da EXP Usinagem')
      setFluxoPedidos([])
      return []
    } finally {
      setFluxoLoading(false)
    }
  }, [])

  const loadImportados = useCallback(async () => {
    try {
      setImportadosLoading(true)
      const data = await supabaseService.getAll('exp_pedidos_importados')
      setImportados(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Erro ao carregar pedidos importados:', error)
    } finally {
      setImportadosLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFluxo()
    loadImportados()
  }, [loadFluxo, loadImportados])

  return {
    fluxoPedidos,
    fluxoLoading,
    fluxoError,
    loadFluxo,
    importados,
    importadosLoading,
    loadImportados
  }
}

export default useFluxoExpUsinagem
