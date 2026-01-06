import { useState, useEffect } from 'react'
import { FaTimes, FaHistory, FaCheck, FaExclamationTriangle } from 'react-icons/fa'
import { useCorrecaoApontamento } from '../hooks/useCorrecaoApontamento'
import supabaseService from '../services/SupabaseService'

const CorrecaoApontamentoModal = ({ apontamento, usuarioId, onClose, onSucesso }) => {
  const { salvarCorrecao, carregarCorrecoes, carregando } = useCorrecaoApontamento()
  const [correcoes, setCorrecoes] = useState([])
  const [formData, setFormData] = useState({})
  const [motivo, setMotivo] = useState('')
  const [camposAlterados, setCamposAlterados] = useState([])
  const [aba, setAba] = useState('corrigir') // 'corrigir' | 'historico'
  const [maquinas, setMaquinas] = useState([])
  const [carregandoMaquinas, setCarregandoMaquinas] = useState(false)

  const formatDateTimeLocalInput = (value) => {
    if (!value) return ''
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return ''
    const pad = (n) => String(n).padStart(2, '0')
    const yyyy = d.getFullYear()
    const mm = pad(d.getMonth() + 1)
    const dd = pad(d.getDate())
    const hh = pad(d.getHours())
    const mi = pad(d.getMinutes())
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
  }

  const normalizeToDbIso = (campo, value) => {
    if ((campo === 'inicio' || campo === 'fim') && value) {
      const d = new Date(value) // interpreta como local no browser
      if (Number.isNaN(d.getTime())) return value
      return d.toISOString()
    }
    return value
  }

  useEffect(() => {
    if (apontamento) {
      // Inicializar formulário com dados atuais
      setFormData({
        quantidade: apontamento.quantidade || '',
        inicio: formatDateTimeLocalInput(apontamento.inicio),
        fim: formatDateTimeLocalInput(apontamento.fim),
        operador: apontamento.operador || '',
        maquina: apontamento.maquina || '',
        rack_ou_pallet: apontamento.rack_ou_pallet || '',
        observacoes: apontamento.observacoes || ''
      })

      // Carregar histórico de correções
      carregarCorrecoes(apontamento.id).then(setCorrecoes)
    }
  }, [apontamento, carregarCorrecoes])

  useEffect(() => {
    const loadMaquinas = async () => {
      try {
        setCarregandoMaquinas(true)
        const data = await supabaseService.getAll('maquinas')
        setMaquinas(data || [])
      } catch {
        setMaquinas([])
      } finally {
        setCarregandoMaquinas(false)
      }
    }
    loadMaquinas()
  }, [])

  const getMaquinaLabel = (value) => {
    const v = String(value || '').trim()
    if (!v) return ''
    const m = (maquinas || []).find(x => String(x.id || '').trim() === v)
    if (m) return m.nome || m.codigo || `Máquina ${String(m.id).slice(0, 8)}...`
    return v
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    const valorAnteriorBruto = apontamento[name]
    const valorAnterior = (name === 'inicio' || name === 'fim')
      ? formatDateTimeLocalInput(valorAnteriorBruto)
      : valorAnteriorBruto
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    // Rastrear campos alterados
    if (value !== valorAnterior) {
      setCamposAlterados(prev => 
        prev.includes(name) ? prev : [...prev, name]
      )
    } else {
      setCamposAlterados(prev => prev.filter(c => c !== name))
    }
  }

  const handleSalvarCorrecao = async () => {
    if (camposAlterados.length === 0) {
      alert('Nenhum campo foi alterado')
      return
    }

    if (!motivo.trim()) {
      alert('Por favor, informe o motivo da correção')
      return
    }

    // Preparar dados para auditoria
    const dadosOriginais = {}
    const dadosNovos = {}

    camposAlterados.forEach(campo => {
      dadosOriginais[campo] = apontamento[campo]
      dadosNovos[campo] = normalizeToDbIso(campo, formData[campo])
    })

    const resultado = await salvarCorrecao(
      apontamento.id,
      usuarioId,
      dadosOriginais,
      dadosNovos,
      camposAlterados,
      motivo
    )

    if (resultado.sucesso) {
      alert('Correção salva com sucesso!')
      onSucesso?.()
      onClose()
    } else {
      alert('Erro ao salvar correção: ' + resultado.erro)
    }
  }

  const formatarData = (data) => {
    if (!data) return '-'
    try {
      return new Date(data).toLocaleString('pt-BR')
    } catch {
      return String(data)
    }
  }

  const formatarCampo = (campo) => {
    const mapa = {
      quantidade: 'Quantidade',
      inicio: 'Data/Hora Início',
      fim: 'Data/Hora Fim',
      operador: 'Operador',
      maquina: 'Máquina',
      rack_ou_pallet: 'Rack/Pallet',
      observacoes: 'Observações'
    }
    return mapa[campo] || campo
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex items-center justify-between border-b">
          <div>
            <h2 className="text-xl font-bold">Correção de Apontamento</h2>
            <p className="text-sm text-blue-100 mt-1">
              ID: {apontamento?.id?.slice(0, 8)}... | Operador: {apontamento?.operador}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-blue-800 p-2 rounded transition"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Abas */}
        <div className="flex border-b bg-gray-50">
          <button
            onClick={() => setAba('corrigir')}
            className={`flex-1 py-3 px-4 font-medium transition ${
              aba === 'corrigir'
                ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FaCheck className="inline mr-2" />
            Corrigir
          </button>
          <button
            onClick={() => setAba('historico')}
            className={`flex-1 py-3 px-4 font-medium transition ${
              aba === 'historico'
                ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FaHistory className="inline mr-2" />
            Histórico ({correcoes.length})
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6">
          {aba === 'corrigir' ? (
            <div className="space-y-4">
              {/* Alerta */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
                <FaExclamationTriangle className="text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <strong>Atenção:</strong> Todas as correções são registradas na auditoria. Informe o motivo da correção.
                </div>
              </div>

              {/* Formulário */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantidade
                  </label>
                  <input
                    type="number"
                    name="quantidade"
                    value={formData.quantidade ?? ''}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      camposAlterados.includes('quantidade') ? 'border-orange-500 bg-orange-50' : 'border-gray-300'
                    }`}
                  />
                  {camposAlterados.includes('quantidade') && (
                    <p className="text-xs text-orange-600 mt-1">
                      Original: {apontamento?.quantidade}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data/Hora Início
                  </label>
                  <input
                    type="datetime-local"
                    name="inicio"
                    value={formData.inicio ?? ''}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      camposAlterados.includes('inicio') ? 'border-orange-500 bg-orange-50' : 'border-gray-300'
                    }`}
                  />
                  {camposAlterados.includes('inicio') && (
                    <p className="text-xs text-orange-600 mt-1">
                      Original: {formatarData(apontamento?.inicio)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data/Hora Fim
                  </label>
                  <input
                    type="datetime-local"
                    name="fim"
                    value={formData.fim ?? ''}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      camposAlterados.includes('fim') ? 'border-orange-500 bg-orange-50' : 'border-gray-300'
                    }`}
                  />
                  {camposAlterados.includes('fim') && (
                    <p className="text-xs text-orange-600 mt-1">
                      Original: {formatarData(apontamento?.fim)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Operador
                  </label>
                  <input
                    type="text"
                    name="operador"
                    value={formData.operador ?? ''}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      camposAlterados.includes('operador') ? 'border-orange-500 bg-orange-50' : 'border-gray-300'
                    }`}
                  />
                  {camposAlterados.includes('operador') && (
                    <p className="text-xs text-orange-600 mt-1">
                      Original: {apontamento?.operador}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Máquina
                  </label>
                  <select
                    name="maquina"
                    value={formData.maquina ?? ''}
                    onChange={handleChange}
                    disabled={carregandoMaquinas}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      camposAlterados.includes('maquina') ? 'border-orange-500 bg-orange-50' : 'border-gray-300'
                    }`}
                  >
                    <option value="">{carregandoMaquinas ? 'Carregando máquinas...' : 'Selecione a máquina'}</option>
                    {(maquinas || []).map(m => (
                      <option key={m.id} value={m.id}>
                        {m.nome || m.codigo || `Máquina ${String(m.id).slice(0, 8)}...`}
                      </option>
                    ))}
                    {!!formData.maquina && !(maquinas || []).some(m => String(m.id || '').trim() === String(formData.maquina || '').trim()) && (
                      <option value={formData.maquina}>Atual: {getMaquinaLabel(formData.maquina)}</option>
                    )}
                  </select>
                  {camposAlterados.includes('maquina') && (
                    <p className="text-xs text-orange-600 mt-1">
                      Original: {getMaquinaLabel(apontamento?.maquina)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rack/Pallet
                  </label>
                  <input
                    type="text"
                    name="rack_ou_pallet"
                    value={formData.rack_ou_pallet ?? ''}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      camposAlterados.includes('rack_ou_pallet') ? 'border-orange-500 bg-orange-50' : 'border-gray-300'
                    }`}
                  />
                  {camposAlterados.includes('rack_ou_pallet') && (
                    <p className="text-xs text-orange-600 mt-1">
                      Original: {apontamento?.rack_ou_pallet}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                </label>
                <textarea
                  name="observacoes"
                  value={formData.observacoes ?? ''}
                  onChange={handleChange}
                  rows="3"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    camposAlterados.includes('observacoes') ? 'border-orange-500 bg-orange-50' : 'border-gray-300'
                  }`}
                />
                {camposAlterados.includes('observacoes') && (
                  <p className="text-xs text-orange-600 mt-1">
                    Original: {apontamento?.observacoes || '(vazio)'}
                  </p>
                )}
              </div>

              {/* Motivo da Correção */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivo da Correção <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ex: Operador digitou quantidade errada. Foram 120 peças, não 100."
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Este motivo será registrado na auditoria
                </p>
              </div>

              {/* Resumo de Alterações */}
              {camposAlterados.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Campos a serem alterados:</h4>
                  <ul className="space-y-1 text-sm text-blue-800">
                    {camposAlterados.map(campo => (
                      <li key={campo}>
                        • <strong>{formatarCampo(campo)}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            // Histórico
            <div className="space-y-4">
              {correcoes.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Nenhuma correção registrada para este apontamento
                </p>
              ) : (
                correcoes.map((correcao) => (
                  <div key={correcao.id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-medium text-gray-900">
                          Corrigido em {formatarData(correcao.corrigido_em)}
                        </p>
                        <p className="text-sm text-gray-600">
                          Por: {correcao.corrigido_por}
                        </p>
                      </div>
                      {correcao.revertido && (
                        <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded">
                          Revertido
                        </span>
                      )}
                    </div>

                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-700 mb-1">Motivo:</p>
                      <p className="text-sm text-gray-600 bg-white p-2 rounded border border-gray-200">
                        {correcao.motivo_correcao}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">Alterações:</p>
                      {correcao.campos_alterados?.map((campo) => (
                        <div key={campo} className="text-sm bg-white p-2 rounded border border-gray-200">
                          <p className="font-medium text-gray-700">{formatarCampo(campo)}</p>
                          <p className="text-gray-600">
                            De: <span className="font-mono">{String(correcao.valor_anterior?.[campo] || '-')}</span>
                          </p>
                          <p className="text-gray-600">
                            Para: <span className="font-mono">{String(correcao.valor_novo?.[campo] || '-')}</span>
                          </p>
                        </div>
                      ))}
                    </div>

                    {correcao.revertido && (
                      <div className="mt-3 pt-3 border-t border-gray-300">
                        <p className="text-xs text-gray-600">
                          Revertido em {formatarData(correcao.revertido_em)} por {correcao.revertido_por}
                        </p>
                        {correcao.motivo_reversao && (
                          <p className="text-xs text-gray-600 mt-1">
                            Motivo: {correcao.motivo_reversao}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t p-4 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition"
          >
            Cancelar
          </button>
          {aba === 'corrigir' && (
            <button
              onClick={handleSalvarCorrecao}
              disabled={carregando || camposAlterados.length === 0 || !motivo.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
            >
              {carregando ? 'Salvando...' : 'Salvar Correção'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default CorrecaoApontamentoModal
