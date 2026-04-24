import { useState } from 'react'

const CarteiraEncomendas = () => {
  const [file, setFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  
  // Dados simulados da carteira de encomendas
  const encomendas = [
    {
      id: 'OT-2025-001',
      codigoPerfil: 'P-1045',
      descricaoPerfil: 'Perfil Retangular 30x20',
      quantidade: 500,
      prazoEntrega: '10/09/2025',
      status: 'em_execucao',
      progresso: 45
    },
    {
      id: 'OT-2025-002',
      codigoPerfil: 'P-2078',
      descricaoPerfil: 'Perfil L 40x40',
      quantidade: 350,
      prazoEntrega: '15/09/2025',
      status: 'em_execucao',
      progresso: 75
    },
    {
      id: 'OT-2025-003',
      codigoPerfil: 'P-3012',
      descricaoPerfil: 'Perfil U 50x25',
      quantidade: 200,
      prazoEntrega: '20/09/2025',
      status: 'pendente',
      progresso: 0
    },
    {
      id: 'OT-2025-004',
      codigoPerfil: 'P-4056',
      descricaoPerfil: 'Perfil T 60x30',
      quantidade: 150,
      prazoEntrega: '05/09/2025',
      status: 'concluida',
      progresso: 100
    }
  ]
  
  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setFile(e.target.files[0])
    }
  }
  
  const handleUpload = async (e) => {
    e.preventDefault()
    
    if (!file) {
      alert('Por favor, selecione um arquivo Excel.')
      return
    }
    
    setIsUploading(true)
    
    // Simulação de upload
    setTimeout(() => {
      setIsUploading(false)
      setUploadSuccess(true)
      setFile(null)
      
      // Limpar a mensagem de sucesso após 3 segundos
      setTimeout(() => {
        setUploadSuccess(false)
      }, 3000)
    }, 1500)
  }
  
  // Função para retornar a cor do status
  const getStatusColor = (status) => {
    switch (status) {
      case 'pendente':
        return 'bg-yellow-100 text-yellow-800'
      case 'em_execucao':
        return 'bg-blue-100 text-blue-800'
      case 'concluida':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }
  
  // Função para formatar o status
  const formatStatus = (status) => {
    switch (status) {
      case 'pendente':
        return 'Pendente'
      case 'em_execucao':
        return 'Em Execução'
      case 'concluida':
        return 'Concluída'
      default:
        return status
    }
  }
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Carteira de Encomendas</h1>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Upload de Planilha</h2>
        
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Arquivo Excel (.xlsx)
            </label>
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded file:border-0
                file:text-sm file:font-semibold
                file:bg-primary-50 file:text-primary-700
                hover:file:bg-primary-100"
            />
            <p className="mt-1 text-sm text-gray-500">
              Selecione o arquivo da carteira de encomendas no formato Excel.
            </p>
          </div>
          
          {uploadSuccess && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              Arquivo carregado com sucesso!
            </div>
          )}
          
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!file || isUploading}
              className={`btn-primary ${(!file || isUploading) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isUploading ? 'Carregando...' : 'Carregar Arquivo'}
            </button>
          </div>
        </form>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Ordens de Trabalho</h2>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ordem</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantidade</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prazo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progresso</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {encomendas.map((ordem) => (
                <tr key={ordem.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{ordem.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ordem.codigoPerfil}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ordem.descricaoPerfil}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ordem.quantidade}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ordem.prazoEntrega}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(ordem.status)}`}>
                      {formatStatus(ordem.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="relative pt-1">
                      <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                        <div 
                          style={{ width: `${ordem.progresso}%` }} 
                          className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary-500"
                        ></div>
                      </div>
                      <span className="text-xs font-semibold inline-block text-primary-600">
                        {ordem.progresso}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default CarteiraEncomendas
