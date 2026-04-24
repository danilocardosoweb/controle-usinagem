import { useEffect, useMemo, useState } from 'react'
import { useSupabase } from '../hooks/useSupabase'
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa'

const ApontamentosParadas = () => {
  const [formData, setFormData] = useState({
    maquina: '',
    motivoParada: '',
    tipoParada: '',
    inicio: '',
    fim: '',
    observacoes: ''
  })
  // Usaremos a tabela/view atualmente existente no seu Supabase
  const { items: paradas, addItem: addParada } = useSupabase('apontamentos_parada')
  // Máquinas do Supabase
  const { items: maquinas } = useSupabase('maquinas')
  // Motivos e tipos de parada do Supabase (tabelas snake_case)
  const { items: motivosParada } = useSupabase('motivos_parada')
  const { items: tiposParada } = useSupabase('tipos_parada')

  // Normaliza o texto de tipo para comparação e valores de select
  const normalizeTipo = (txt) => {
    if (!txt) return ''
    try {
      const s = String(txt).toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'')
      return s.replace(/\s+/g, '_')
    } catch { return String(txt).toLowerCase() }
  }

  // Lista de motivos filtrados pelo tipo selecionado
  const motivosFiltrados = useMemo(() => {
    const sel = normalizeTipo(formData.tipoParada)
    if (!sel) return motivosParada || []
    return (motivosParada || []).filter(m => normalizeTipo(m?.tipo_parada || m?.tipo) === sel)
  }, [motivosParada, formData.tipoParada])

  // Removido seed local: agora os valores devem vir de Configurações (Supabase)
  // Utilitário: converter datetime-local (YYYY-MM-DDTHH:MM) para ISO (UTC)
  const localInputToISO = (val) => {
    try {
      if (!val) return null
      const [datePart, timePart] = String(val).split('T')
      if (!datePart || !timePart) return null
      const [yy, mm, dd] = datePart.split('-').map(Number)
      const [hh, mi] = timePart.split(':').map(Number)
      const d = new Date(yy, (mm || 1) - 1, dd || 1, hh || 0, mi || 0)
      return d.toISOString()
    } catch { return null }
  }

  // Utilitário: Date -> string para input datetime-local
  const toDateTimeLocal = (d) => {
    const pad = (n) => String(n).padStart(2,'0')
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  // Controla se o fim é automático (início + 10min)
  const [fimAuto, setFimAuto] = useState(true)

  // Inicializa campos: início = agora; fim = início + 10 min
  useEffect(() => {
    if (!formData.inicio) {
      const now = new Date()
      const start = toDateTimeLocal(now)
      const end = toDateTimeLocal(new Date(now.getTime() + 10 * 60000))
      setFormData(prev => ({ ...prev, inicio: start, fim: end }))
      setFimAuto(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const handleChange = (e) => {
    const { name, value } = e.target
    
    // Se selecionou um motivo, preenche o tipo automaticamente
    if (name === 'motivoParada') {
      // Como o select passa a enviar a DESCRIÇÃO no value, tentamos achar tanto por id quanto por descricao
      const motivo = (motivosParada || []).find(m => String(m.id) === String(value) || String(m.descricao ?? m.nome) === String(value))
      if (motivo) {
        setFormData({
          ...formData,
          motivoParada: motivo.descricao ?? motivo.nome,
          tipoParada: normalizeTipo(motivo.tipo_parada || motivo.tipo || formData.tipoParada)
        })
        return
      }
    }
    // Se selecionou um tipo, limpar motivo se não pertencer ao novo tipo
    if (name === 'tipoParada') {
      const novoTipo = normalizeTipo(value)
      const aindaValido = (motivosParada || []).some(m => {
        const mm = normalizeTipo(m?.tipo_parada || m?.tipo)
        return mm === novoTipo && (String(m?.descricao ?? m?.nome ?? m) === String(formData.motivoParada))
      })
      setFormData(prev => ({ ...prev, tipoParada: novoTipo, motivoParada: aindaValido ? prev.motivoParada : '' }))
      return
    }
    
    setFormData({
      ...formData,
      [name]: value
    })

    // Se início mudou e fim ainda é automático, recalcular +10min
    if (name === 'inicio' && fimAuto) {
      try {
        const base = new Date(value)
        if (!isNaN(base.getTime())) {
          const end = toDateTimeLocal(new Date(base.getTime() + 10 * 60000))
          setFormData(prev => ({ ...prev, fim: end, inicio: value }))
        }
      } catch {}
    }
    if (name === 'fim') setFimAuto(false)
  }
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validação de datas: o término não pode ser anterior ao início
    if (formData.inicio && formData.fim) {
      const dataInicio = new Date(formData.inicio)
      const dataFim = new Date(formData.fim)
      if (dataFim < dataInicio) {
        alert('A Data/Hora de término (Fim) não pode ser menor que a Data/Hora de início.')
        return
      }
    }
    
    // Persistir no Supabase (tabela/view atual): snake_case + datas ISO
    const payload = {
      maquina: formData.maquina,
      motivo_parada: formData.motivoParada,
      tipo_parada: formData.tipoParada,
      // lidar com possíveis nomes de colunas no backend
      inicio_timestamp: localInputToISO(formData.inicio),
      fim_timestamp: formData.fim ? localInputToISO(formData.fim) : null,
      observacoes: formData.observacoes || ''
    }
    await addParada(payload)
    alert('Parada registrada com sucesso!')

    // Limpar o formulário
    setFormData({
      maquina: '',
      motivoParada: '',
      tipoParada: '',
      inicio: '',
      fim: '',
      observacoes: ''
    })
    setFimAuto(true)
  }

  const paradasRecentes = useMemo(() => {
    const norm = (paradas || []).map(p => ({
      id: p.id,
      maquina: p.maquina,
      motivo: p.motivo_parada || p.motivoParada || '-',
      tipo: p.tipo_parada || p.tipoParada || '-',
      inicio: p.inicio || p.inicio_timestamp,
      fim: p.fim || p.fim_timestamp,
    }))
    
    // Ordenar decrescente: as paradas mais novas aparecem primeiro
    norm.sort((a,b) => {
      const timeA = new Date(a.inicio || 0).getTime()
      const timeB = new Date(b.inicio || 0).getTime()
      return timeB - timeA
    })
    
    return norm
  }, [paradas])

  // Lógica de Paginação
  const [paginaAtual, setPaginaAtual] = useState(1)
  const itensPorPagina = 10
  
  const totalPaginas = Math.ceil(paradasRecentes.length / itensPorPagina) || 1
  
  const paradasPaginadas = useMemo(() => {
    const indexInicio = (paginaAtual - 1) * itensPorPagina
    const indexFim = indexInicio + itensPorPagina
    return paradasRecentes.slice(indexInicio, indexFim)
  }, [paradasRecentes, paginaAtual])

  const mudarPagina = (novaPagina) => {
    if (novaPagina >= 1 && novaPagina <= totalPaginas) {
      setPaginaAtual(novaPagina)
    }
  }

  const formatDateTime = (iso) => {
    if (!iso) return '-'
    try {
      const d = new Date(iso)
      const dd = String(d.getDate()).padStart(2,'0')
      const mm = String(d.getMonth()+1).padStart(2,'0')
      const yyyy = d.getFullYear()
      const hh = String(d.getHours()).padStart(2,'0')
      const mi = String(d.getMinutes()).padStart(2,'0')
      return `${dd}/${mm}/${yyyy} ${hh}:${mi}`
    } catch { return String(iso) }
  }

  const minutosEntre = (inicio, fim) => {
    if (!inicio || !fim) return null
    try {
      const di = new Date(inicio)
      const df = new Date(fim)
      const min = Math.max(0, Math.round((df - di) / 60000))
      return min
    } catch { return null }
  }
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Apontamentos de Paradas</h1>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Nova Parada</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Máquina</label>
              <select
                className="input-field"
                value={formData.maquina}
                onChange={(e) => handleChange({ target: { name: 'maquina', value: e.target.value } })}
                required
              >
                <option value="">Selecione a máquina</option>
                {(maquinas || []).map(m => (
                  <option key={m.id} value={m.nome || m.codigo || `Máquina ${m.id}`}>{m.nome || m.codigo || `Máquina ${m.id}`}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Parada</label>
              <select
                className="input-field"
                value={formData.tipoParada}
                onChange={(e) => handleChange({ target: { name: 'tipoParada', value: e.target.value } })}
                required
              >
                <option value="">Selecione o tipo</option>
                {(tiposParada || []).map(t => {
                  const desc = (t && (t.descricao ?? t.nome ?? t)) || '-'
                  const key = t && (t.id ?? desc)
                  const value = normalizeTipo(desc)
                  return (
                    <option key={key} value={value}>{desc}</option>
                  )
                })}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Motivo da Parada</label>
              <select
                className="input-field"
                value={formData.motivoParada}
                onChange={(e) => handleChange({ target: { name: 'motivoParada', value: e.target.value } })}
                required
              >
                <option value="">Selecione o motivo</option>
                {(motivosFiltrados || []).map(m => {
                  const desc = (m && (m.descricao ?? m.nome ?? m)) || '-'
                  const key = m && (m.id ?? desc)
                  // Salvar e exibir a DESCRIÇÃO como valor
                  return (
                    <option key={key} value={desc}>{desc}</option>
                  )
                })}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Início</label>
              <input
                type="datetime-local"
                className="input-field"
                value={formData.inicio}
                onChange={(e) => handleChange({ target: { name: 'inicio', value: e.target.value } })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fim</label>
              <input
                type="datetime-local"
                className="input-field"
                value={formData.fim}
                onChange={(e) => handleChange({ target: { name: 'fim', value: e.target.value } })}
              />
            </div>

            <div className="hidden md:block"></div>
          </div>

          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
            <textarea
              className="input-field"
              rows="3"
              value={formData.observacoes}
              onChange={(e) => handleChange({ target: { name: 'observacoes', value: e.target.value } })}
              placeholder="Descreva brevemente o motivo e observações relevantes"
            />
          </div>

          <div className="flex justify-end">
            <button type="submit" className="btn-primary">Registrar Parada</button>
          </div>
        </form>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Paradas Recentes</h2>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Máquina</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Motivo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Início</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fim</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duração</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paradasPaginadas.map((p) => {
                const minutos = minutosEntre(p.inicio, p.fim)
                const tipoNome = p.tipo === 'setup' ? 'Setup' :
                  p.tipo === 'nao_planejada' ? 'Não Planejada' :
                  p.tipo === 'manutencao' ? 'Manutenção' :
                  p.tipo === 'planejada' ? 'Planejada' : (p.tipo || '-')
                const tipoClass = p.tipo === 'setup' ? 'bg-yellow-100 text-yellow-800' :
                  p.tipo === 'nao_planejada' ? 'bg-red-100 text-red-800' :
                  p.tipo === 'manutencao' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                return (
                  <tr key={p.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.maquina}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.motivo}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${tipoClass}`}>
                        {tipoNome}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDateTime(p.inicio)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDateTime(p.fim)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{minutos != null ? `${minutos} min` : '-'}</td>
                  </tr>
                )
              })}
              {paradasPaginadas.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-6 text-center text-gray-500">Nenhuma parada registrada</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Controles de Paginação */}
        {totalPaginas > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4 rounded-b-lg">
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Mostrando <span className="font-medium">{((paginaAtual - 1) * itensPorPagina) + 1}</span> a <span className="font-medium">{Math.min(paginaAtual * itensPorPagina, paradasRecentes.length)}</span> de <span className="font-medium">{paradasRecentes.length}</span> resultados
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                  <button
                    onClick={() => mudarPagina(paginaAtual - 1)}
                    disabled={paginaAtual === 1}
                    className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${paginaAtual === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span className="sr-only">Anterior</span>
                    <FaChevronLeft className="h-4 w-4" aria-hidden="true" />
                  </button>
                  
                  <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 focus:outline-offset-0">
                    Página {paginaAtual} de {totalPaginas}
                  </span>
                  
                  <button
                    onClick={() => mudarPagina(paginaAtual + 1)}
                    disabled={paginaAtual === totalPaginas}
                    className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${paginaAtual === totalPaginas ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span className="sr-only">Próximo</span>
                    <FaChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </nav>
              </div>
            </div>
            
            {/* Controles para Mobile */}
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                onClick={() => mudarPagina(paginaAtual - 1)}
                disabled={paginaAtual === 1}
                className={`relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 ${paginaAtual === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Anterior
              </button>
              <button
                onClick={() => mudarPagina(paginaAtual + 1)}
                disabled={paginaAtual === totalPaginas}
                className={`relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 ${paginaAtual === totalPaginas ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Próximo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ApontamentosParadas
