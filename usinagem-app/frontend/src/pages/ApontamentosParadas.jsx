import { useEffect, useMemo, useState } from 'react'
import { useSupabase } from '../hooks/useSupabase'
import { useAuth } from '../contexts/AuthContext'
import { FaEdit } from 'react-icons/fa'

const ApontamentosParadas = () => {
  const { user } = useAuth()
  const isAdmin = user?.nivel_acesso === 'admin' || user?.role === 'admin'
  
  const [formData, setFormData] = useState({
    maquina: '',
    motivoParada: '',
    tipoParada: '',
    inicio: '',
    fim: '',
    observacoes: ''
  })
  const [usarMotivoCustomizado, setUsarMotivoCustomizado] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingParada, setEditingParada] = useState(null)
  
  // Filtros
  const [filtroData, setFiltroData] = useState('')
  const [filtroOperador, setFiltroOperador] = useState('')
  
  // Usaremos a tabela/view atualmente existente no seu Supabase
  const { items: paradas, addItem: addParada, updateItem: updateParada } = useSupabase('apontamentos_parada')
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
  // O formData.tipoParada contém a descrição normalizada (ex: "planejada", "nao_planejada")
  // O motivo.tipo_parada também é normalizado (ex: "planejada", "nao_planejada")
  const motivosFiltrados = useMemo(() => {
    if (!formData.tipoParada) return motivosParada || []
    
    const tipoSelecionado = formData.tipoParada // já normalizado
    
    const filtrados = (motivosParada || []).filter(m => {
      const tipoMotivo = m?.tipo_parada || ''
      return tipoMotivo === tipoSelecionado
    })
    
    return filtrados
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
    
    // Se selecionou um tipo, apenas atualizar o tipo (não limpar motivo)
    if (name === 'tipoParada') {
      const novoTipo = normalizeTipo(value)
      setFormData(prev => ({ ...prev, tipoParada: novoTipo }))
      return
    }
    
    // Se selecionou um motivo, preencher o tipo automaticamente
    if (name === 'motivoParada') {
      const motivo = (motivosParada || []).find(m => String(m.descricao ?? m.nome ?? m) === String(value))
      if (motivo) {
        const tipoDoMotivo = normalizeTipo(motivo.tipo_parada || motivo.tipo || '')
        setFormData(prev => ({
          ...prev,
          motivoParada: value,
          tipoParada: tipoDoMotivo
        }))
        return
      }
      // Se não encontrou motivo, apenas atualizar o campo
      setFormData(prev => ({ ...prev, motivoParada: value }))
      return
    }
    
    // Para outros campos
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
    // Persistir no Supabase (tabela/view atual): snake_case + datas ISO
    const payload = {
      maquina: formData.maquina,
      motivo_parada: formData.motivoParada,
      tipo_parada: formData.tipoParada,
      // lidar com possíveis nomes de colunas no backend
      inicio_timestamp: localInputToISO(formData.inicio),
      fim_timestamp: formData.fim ? localInputToISO(formData.fim) : null,
      observacoes: formData.observacoes || '',
      usuario: user?.nome || user?.username || 'Desconhecido'
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

  // Lista de operadores únicos para o filtro
  const operadoresUnicos = useMemo(() => {
    const ops = (paradas || []).map(p => p.usuario).filter(Boolean)
    return [...new Set(ops)].sort()
  }, [paradas])

  const paradasRecentes = useMemo(() => {
    let norm = (paradas || []).map(p => ({
      id: p.id,
      maquina: p.maquina,
      motivo: p.motivo_parada || p.motivoParada || '-',
      tipo: p.tipo_parada || p.tipoParada || '-',
      inicio: p.inicio || p.inicio_timestamp,
      fim: p.fim || p.fim_timestamp,
      usuario: p.usuario || '-',
      observacoes: p.observacoes || ''
    }))
    
    // Aplicar filtro de data
    if (filtroData) {
      norm = norm.filter(p => {
        if (!p.inicio) return false
        const dataParada = new Date(p.inicio).toISOString().split('T')[0]
        return dataParada === filtroData
      })
    }
    
    // Aplicar filtro de operador
    if (filtroOperador) {
      norm = norm.filter(p => p.usuario === filtroOperador)
    }
    
    norm.sort((a,b)=>String(b.inicio||'').localeCompare(String(a.inicio||'')))
    return norm.slice(0, 50) // Aumentar limite quando filtrado
  }, [paradas, filtroData, filtroOperador])

  // Função para abrir modal de edição (apenas admin)
  const handleEditParada = (parada) => {
    setEditingParada({
      ...parada,
      inicio: parada.inicio ? toDateTimeLocal(new Date(parada.inicio)) : '',
      fim: parada.fim ? toDateTimeLocal(new Date(parada.fim)) : ''
    })
    setEditModalOpen(true)
  }

  // Função para salvar edição
  const handleSaveEdit = async () => {
    if (!editingParada) return
    
    const payload = {
      id: editingParada.id,
      maquina: editingParada.maquina,
      motivo_parada: editingParada.motivo,
      tipo_parada: editingParada.tipo,
      inicio_timestamp: localInputToISO(editingParada.inicio),
      fim_timestamp: editingParada.fim ? localInputToISO(editingParada.fim) : null,
      observacoes: editingParada.observacoes || '',
      usuario: editingParada.usuario
    }
    
    await updateParada(payload)
    alert('Apontamento corrigido com sucesso!')
    setEditModalOpen(false)
    setEditingParada(null)
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
              {!usarMotivoCustomizado ? (
                <div className="flex gap-2">
                  <select
                    className="input-field flex-1"
                    value={formData.motivoParada}
                    onChange={(e) => handleChange({ target: { name: 'motivoParada', value: e.target.value } })}
                  >
                    <option value="">Selecione o motivo</option>
                    {(motivosFiltrados || []).map(m => {
                      const desc = (m && (m.descricao ?? m.nome ?? m)) || '-'
                      const key = m && (m.id ?? desc)
                      return (
                        <option key={key} value={desc}>{desc}</option>
                      )
                    })}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setUsarMotivoCustomizado(true)
                      setFormData(prev => ({ ...prev, motivoParada: '' }))
                    }}
                    className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 whitespace-nowrap text-sm font-medium"
                    title="Digitar motivo customizado"
                  >
                    + Outro
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input-field flex-1"
                    value={formData.motivoParada}
                    onChange={(e) => setFormData(prev => ({ ...prev, motivoParada: e.target.value }))}
                    placeholder="Digite o motivo da parada"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setUsarMotivoCustomizado(false)
                      setFormData(prev => ({ ...prev, motivoParada: '' }))
                    }}
                    className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 whitespace-nowrap text-sm font-medium"
                    title="Voltar para lista"
                  >
                    ← Lista
                  </button>
                </div>
              )}
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
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold text-gray-700">Paradas Recentes</h2>
          
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Dia:</label>
              <input
                type="date"
                className="input-field text-sm py-1"
                value={filtroData}
                onChange={(e) => setFiltroData(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Operador:</label>
              <select
                className="input-field text-sm py-1"
                value={filtroOperador}
                onChange={(e) => setFiltroOperador(e.target.value)}
              >
                <option value="">Todos</option>
                {operadoresUnicos.map(op => (
                  <option key={op} value={op}>{op}</option>
                ))}
              </select>
            </div>
            {(filtroData || filtroOperador) && (
              <button
                onClick={() => { setFiltroData(''); setFiltroOperador(''); }}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </div>
        
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuário</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Obs.</th>
                {isAdmin && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paradasRecentes.map((p) => {
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.usuario}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={p.observacoes}>
                      {p.observacoes || '-'}
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => handleEditParada(p)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Corrigir apontamento"
                        >
                          <FaEdit />
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
              {paradasRecentes.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 9 : 8} className="px-6 py-6 text-center text-gray-500">Nenhuma parada registrada</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Edição (apenas admin) */}
      {editModalOpen && editingParada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Corrigir Apontamento</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Máquina</label>
                <select
                  className="input-field"
                  value={editingParada.maquina}
                  onChange={(e) => setEditingParada({...editingParada, maquina: e.target.value})}
                >
                  <option value="">Selecione</option>
                  {(maquinas || []).map(m => (
                    <option key={m.id} value={m.nome || m.codigo}>{m.nome || m.codigo}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Parada</label>
                <select
                  className="input-field"
                  value={editingParada.tipo}
                  onChange={(e) => setEditingParada({...editingParada, tipo: e.target.value})}
                >
                  <option value="">Selecione</option>
                  {(tiposParada || []).map(t => (
                    <option key={t.id} value={normalizeTipo(t.descricao)}>{t.descricao}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
                <input
                  type="text"
                  className="input-field"
                  value={editingParada.motivo}
                  onChange={(e) => setEditingParada({...editingParada, motivo: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Início</label>
                  <input
                    type="datetime-local"
                    className="input-field"
                    value={editingParada.inicio}
                    onChange={(e) => setEditingParada({...editingParada, inicio: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fim</label>
                  <input
                    type="datetime-local"
                    className="input-field"
                    value={editingParada.fim}
                    onChange={(e) => setEditingParada({...editingParada, fim: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                <textarea
                  className="input-field"
                  rows="2"
                  value={editingParada.observacoes}
                  onChange={(e) => setEditingParada({...editingParada, observacoes: e.target.value})}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setEditModalOpen(false); setEditingParada(null); }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Salvar Correção
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ApontamentosParadas
