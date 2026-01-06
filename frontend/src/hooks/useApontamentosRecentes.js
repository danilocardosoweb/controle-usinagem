import { useState, useEffect } from 'react'
import supabaseService from '../services/SupabaseService'

export const useApontamentosRecentes = () => {
  const [apontamentosRecentes, setApontamentosRecentes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchApontamentosRecentes = async () => {
      try {
        setLoading(true)
        const hoje = new Date()
        hoje.setHours(0, 0, 0, 0)
        const amanha = new Date(hoje)
        amanha.setDate(amanha.getDate() + 1)

        // Buscar todos os apontamentos e filtrar no cliente
        const allApontamentos = await supabaseService.getAll('apontamentos')
        
        // Filtrar apontamentos de hoje nas áreas de usinagem e embalagem
        const filteredApontamentos = (allApontamentos || []).filter(apont => {
          const inicioDate = new Date(apont.inicio)
          const isHoje = inicioDate >= hoje && inicioDate < amanha
          const isAreaValid = ['usinagem', 'embalagem'].includes(apont.exp_stage)
          return isHoje && isAreaValid
        })

        setApontamentosRecentes(filteredApontamentos)
      } catch (error) {
        console.error('Erro ao buscar apontamentos recentes:', error)
        setApontamentosRecentes([])
      } finally {
        setLoading(false)
      }
    }

    fetchApontamentosRecentes()
  }, [])

  return { apontamentosRecentes, loading }
}
