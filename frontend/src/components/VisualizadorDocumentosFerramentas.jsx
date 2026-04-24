import { useState, useEffect } from 'react'
import { FaFile, FaImage, FaTimes, FaSpinner, FaExternalLinkAlt } from 'react-icons/fa'
import supabaseService from '../services/SupabaseService'

const VisualizadorDocumentosFerramentas = ({ ferramentaId, ferramentaNome, isOpen, onClose }) => {
  const [documentos, setDocumentos] = useState({
    desenho: null,
    ficha_processo: null,
    foto_padronizacao: null
  })
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    if (isOpen && ferramentaId) {
      carregarDocumentos()
    }
  }, [isOpen, ferramentaId])

  const carregarDocumentos = async () => {
    try {
      setCarregando(true)
      setErro(null)
      
      const docs = await supabaseService.getWhere('documentos_ferramentas', [
        { column: 'ferramenta_id', operator: 'eq', value: ferramentaId },
        { column: 'ativo', operator: 'eq', value: true }
      ])
      
      const mapa = {}
      docs.forEach(doc => {
        mapa[doc.tipo_documento] = doc
      })
      setDocumentos(mapa)
    } catch (err) {
      console.error('Erro ao carregar documentos:', err)
      setErro('Erro ao carregar documentos')
    } finally {
      setCarregando(false)
    }
  }

  const renderDocumento = (tipo, label, icone) => {
    const doc = documentos[tipo]

    if (!doc) return null

    return (
      <div className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className="text-2xl mt-1">
              {icone}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-800">{label}</h3>
              <p className="text-sm text-gray-600 mt-1">
                <strong>Arquivo:</strong> {doc.nome_arquivo}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Versão {doc.versao} • Enviado em {new Date(doc.uploaded_at).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
          <a
            href={doc.url_arquivo}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors whitespace-nowrap ml-2"
          >
            <FaExternalLinkAlt className="w-4 h-4" />
            Abrir
          </a>
        </div>
      </div>
    )
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Documentos da Ferramenta</h2>
            <p className="text-sm text-gray-600 mt-1">{ferramentaNome}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <FaTimes className="w-6 h-6" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6">
          {carregando ? (
            <div className="flex items-center justify-center py-12">
              <FaSpinner className="w-8 h-8 animate-spin text-blue-500 mr-3" />
              <span className="text-gray-600">Carregando documentos...</span>
            </div>
          ) : erro ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
              {erro}
            </div>
          ) : Object.values(documentos).filter(Boolean).length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <FaFile className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Nenhum documento disponível</p>
              <p className="text-sm text-gray-400 mt-1">
                Os documentos serão adicionados em Configurações → Expedição
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {renderDocumento('desenho', 'Desenho do Produto', <FaFile className="w-6 h-6 text-red-500" />)}
              {renderDocumento('ficha_processo', 'Ficha de Processo', <FaFile className="w-6 h-6 text-blue-500" />)}
              {renderDocumento('foto_padronizacao', 'Foto Padronização Palete', <FaImage className="w-6 h-6 text-green-500" />)}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-gray-50 p-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

export default VisualizadorDocumentosFerramentas
