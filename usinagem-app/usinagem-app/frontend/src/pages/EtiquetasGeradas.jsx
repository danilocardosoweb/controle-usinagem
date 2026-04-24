import { useState, useEffect } from 'react'
import { FaSearch, FaPrint, FaEye, FaCalendarAlt, FaBarcode, FaFilter } from 'react-icons/fa'
import EtiquetasService from '../services/EtiquetasService'

const EtiquetasGeradas = () => {
  const [etiquetas, setEtiquetas] = useState([])
  const [loading, setLoading] = useState(false)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [estatisticas, setEstatisticas] = useState(null)

  useEffect(() => {
    carregarEstatisticas()
    carregarEtiquetas()
  }, [])

  const carregarEstatisticas = async () => {
    try {
      const stats = await EtiquetasService.getEstatisticas()
      setEstatisticas(stats)
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
    }
  }

  const carregarEtiquetas = async () => {
    setLoading(true)
    try {
      const data = await EtiquetasService.getEtiquetasRecentes(100)
      setEtiquetas(data || [])
    } catch (error) {
      console.error('Erro ao carregar etiquetas:', error)
    } finally {
      setLoading(false)
    }
  }

  const filtrarEtiquetas = () => {
    return etiquetas.filter(etiqueta => {
      const matchBusca = !busca || 
        etiqueta.lote_usinagem.toLowerCase().includes(busca.toLowerCase()) ||
        etiqueta.codigo_amarrado.toLowerCase().includes(busca.toLowerCase()) ||
        (etiqueta.dados_etiqueta?.cliente && etiqueta.dados_etiqueta.cliente.toLowerCase().includes(busca.toLowerCase()))
      
      const matchStatus = filtroStatus === 'todos' || etiqueta.status === filtroStatus
      
      return matchBusca && matchStatus
    })
  }

  const formatarData = (dataString) => {
    if (!dataString) return '-'
    const data = new Date(dataString)
    return data.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'impressa': return 'bg-green-100 text-green-800'
      case 'reimpressa': return 'bg-blue-100 text-blue-800'
      case 'gerada': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'impressa': return 'Impressa'
      case 'reimpressa': return 'Reimpressa'
      case 'gerada': return 'Gerada'
      default: return status
    }
  }

  const etiquetasFiltradas = filtrarEtiquetas()

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Etiquetas Geradas</h1>
        <p className="text-gray-600">Consulta e gerenciamento de etiquetas térmicas geradas no sistema</p>
      </div>

      {/* Estatísticas */}
      {estatisticas && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total de Etiquetas</p>
                <p className="text-2xl font-bold text-gray-800">{estatisticas.total}</p>
              </div>
              <FaBarcode className="text-3xl text-blue-500" />
            </div>
          </div>
          
          {estatisticas.por_status.map(stat => (
            <div key={stat.status} className="bg-white p-4 rounded-lg shadow border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{getStatusText(stat.status)}</p>
                  <p className="text-2xl font-bold text-gray-800">{stat.quantidade}</p>
                </div>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getStatusColor(stat.status)}`}>
                  <span className="text-xs font-bold">{stat.quantidade}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <FaSearch className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por lote, código ou cliente..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="relative">
            <FaFilter className="absolute left-3 top-3 text-gray-400" />
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="todos">Todos os Status</option>
              <option value="gerada">Geradas</option>
              <option value="impressa">Impressas</option>
              <option value="reimpressa">Reimpressas</option>
            </select>
          </div>
          
          <div className="flex items-center justify-end">
            <button
              onClick={carregarEtiquetas}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <FaCalendarAlt />
              {loading ? 'Atualizando...' : 'Atualizar'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabela de Etiquetas */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lote
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Código
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Divisão
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Etiqueta
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data/Hora
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuário
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span>Carregando etiquetas...</span>
                    </div>
                  </td>
                </tr>
              ) : etiquetasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <FaBarcode className="w-12 h-12 text-gray-300" />
                      <span>Nenhuma etiqueta encontrada</span>
                    </div>
                  </td>
                </tr>
              ) : (
                etiquetasFiltradas.map((etiqueta) => (
                  <tr key={etiqueta.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {etiqueta.lote_usinagem}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {etiqueta.codigo_amarrado}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {etiqueta.dados_etiqueta?.cliente || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {etiqueta.dados_etiqueta?.divisao_amarrados || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {etiqueta.numero_etiqueta}/{etiqueta.total_etiquetas}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(etiqueta.status)}`}>
                        {getStatusText(etiqueta.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatarData(etiqueta.data_hora_impresao)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {etiqueta.usuario_impressao || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resumo */}
      <div className="mt-6 bg-blue-50 p-4 rounded-lg">
        <div className="flex items-start gap-3">
          <FaEye className="text-blue-600 mt-1" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">Resumo da Consulta</p>
            <p>Exibindo {etiquetasFiltradas.length} de {etiquetas.length} etiquetas totais</p>
            {busca && <p>Filtrando por: "{busca}"</p>}
            {filtroStatus !== 'todos' && <p>Status: {getStatusText(filtroStatus)}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

export default EtiquetasGeradas
