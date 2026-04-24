import { useState, useEffect } from 'react'
import { FaFile, FaImage, FaDownload, FaTrash, FaUpload, FaSpinner } from 'react-icons/fa'
import supabaseService from '../services/SupabaseService'

const GerenciadorDocumentosFerramentas = ({ ferramentaId, ferramentaNome }) => {
  const [documentos, setDocumentos] = useState({
    desenho: null,
    ficha_processo: null,
    foto_padronizacao: null
  })
  const [carregando, setCarregando] = useState(false)
  const [uploadando, setUploadando] = useState({})
  const [erro, setErro] = useState(null)

  // Carregar documentos ao montar
  useEffect(() => {
    carregarDocumentos()
  }, [ferramentaId])

  const carregarDocumentos = async () => {
    try {
      setCarregando(true)
      const docs = await supabaseService.getWhere('documentos_ferramentas', [
        { column: 'ferramenta_id', operator: 'eq', value: ferramentaId },
        { column: 'ativo', operator: 'eq', value: true }
      ])
      
      const mapa = {}
      docs.forEach(doc => {
        mapa[doc.tipo_documento] = doc
      })
      setDocumentos(mapa)
      setErro(null)
    } catch (err) {
      console.error('Erro ao carregar documentos:', err)
      setErro('Erro ao carregar documentos')
    } finally {
      setCarregando(false)
    }
  }

  const handleUpload = async (tipo, file) => {
    if (!file) return

    try {
      setUploadando(prev => ({ ...prev, [tipo]: true }))
      setErro(null)

      // Validar tipo de arquivo
      const tiposPermitidos = {
        desenho: ['application/pdf'],
        ficha_processo: ['application/pdf'],
        foto_padronizacao: ['image/jpeg', 'image/png', 'image/webp']
      }

      if (!tiposPermitidos[tipo].includes(file.type)) {
        throw new Error(`Tipo de arquivo não permitido para ${tipo}`)
      }

      // Validar tamanho (máx 50MB)
      if (file.size > 50 * 1024 * 1024) {
        throw new Error('Arquivo muito grande (máximo 50MB)')
      }

      // Upload para Supabase Storage
      const nomeArquivo = `${ferramentaId}_${tipo}_${Date.now()}_${file.name}`
      const caminho = `documentos-ferramentas/${ferramentaId}/${tipo}/${nomeArquivo}`

      const { data, error: erroUpload } = await supabaseService.supabase.storage
        .from('documentos')
        .upload(caminho, file, { upsert: true })

      if (erroUpload) throw erroUpload

      // Obter URL pública
      const { data: { publicUrl } } = supabaseService.supabase.storage
        .from('documentos')
        .getPublicUrl(caminho)

      // Marcar documentos antigos como inativos
      const docsAntigos = await supabaseService.getWhere('documentos_ferramentas', [
        { column: 'ferramenta_id', operator: 'eq', value: ferramentaId },
        { column: 'tipo_documento', operator: 'eq', value: tipo },
        { column: 'ativo', operator: 'eq', value: true }
      ])

      for (const doc of docsAntigos) {
        await supabaseService.update('documentos_ferramentas', doc.id, { ativo: false })
      }

      // Registrar novo documento
      const novoDoc = {
        ferramenta_id: ferramentaId,
        tipo_documento: tipo,
        nome_arquivo: file.name,
        url_arquivo: publicUrl,
        tamanho_bytes: file.size,
        mime_type: file.type,
        versao: (docsAntigos[0]?.versao || 0) + 1,
        ativo: true,
        uploaded_by: 'sistema',
        descricao: `Upload de ${tipo}`
      }

      const docCriado = await supabaseService.add('documentos_ferramentas', novoDoc)

      // Atualizar ferramentas_cfg com a URL
      const campoUrl = {
        desenho: 'desenho_pdf_url',
        ficha_processo: 'ficha_processo_pdf_url',
        foto_padronizacao: 'foto_padronizacao_url'
      }[tipo]

      await supabaseService.update('ferramentas_cfg', ferramentaId, {
        [campoUrl]: publicUrl,
        updated_at: new Date().toISOString()
      })

      // Atualizar estado local
      setDocumentos(prev => ({
        ...prev,
        [tipo]: { ...novoDoc, id: docCriado }
      }))

      alert(`${tipo} enviado com sucesso!`)
    } catch (err) {
      console.error('Erro no upload:', err)
      setErro(err.message || 'Erro ao fazer upload')
      alert(`Erro: ${err.message}`)
    } finally {
      setUploadando(prev => ({ ...prev, [tipo]: false }))
    }
  }

  const handleExcluir = async (tipo) => {
    if (!window.confirm(`Tem certeza que deseja excluir o ${tipo}?`)) return

    try {
      setUploadando(prev => ({ ...prev, [tipo]: true }))
      const doc = documentos[tipo]
      
      if (doc) {
        // Marcar como inativo
        await supabaseService.update('documentos_ferramentas', doc.id, { ativo: false })

        // Limpar URL em ferramentas_cfg
        const campoUrl = {
          desenho: 'desenho_pdf_url',
          ficha_processo: 'ficha_processo_pdf_url',
          foto_padronizacao: 'foto_padronizacao_url'
        }[tipo]

        await supabaseService.update('ferramentas_cfg', ferramentaId, {
          [campoUrl]: null,
          updated_at: new Date().toISOString()
        })

        setDocumentos(prev => ({
          ...prev,
          [tipo]: null
        }))

        alert(`${tipo} excluído com sucesso!`)
      }
    } catch (err) {
      console.error('Erro ao excluir:', err)
      setErro(err.message || 'Erro ao excluir documento')
    } finally {
      setUploadando(prev => ({ ...prev, [tipo]: false }))
    }
  }

  const renderDocumento = (tipo, label, icone) => {
    const doc = documentos[tipo]
    const isUploadando = uploadando[tipo]

    return (
      <div key={tipo} className="border rounded-lg p-4 bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {icone}
            <h3 className="font-semibold text-gray-800">{label}</h3>
          </div>
          {doc && (
            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
              v{doc.versao}
            </span>
          )}
        </div>

        {doc ? (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              <strong>Arquivo:</strong> {doc.nome_arquivo}
            </p>
            <p className="text-xs text-gray-500">
              Enviado em: {new Date(doc.uploaded_at).toLocaleDateString('pt-BR')}
            </p>
            <div className="flex gap-2">
              <a
                href={doc.url_arquivo}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                <FaDownload className="w-4 h-4" />
                Visualizar
              </a>
              <button
                onClick={() => handleExcluir(tipo)}
                disabled={isUploadando}
                className="flex items-center gap-1 px-3 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
              >
                <FaTrash className="w-4 h-4" />
                Excluir
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 mb-3">Nenhum arquivo enviado</p>
        )}

        <div className="mt-3">
          <label className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded cursor-pointer hover:bg-gray-50 disabled:opacity-50">
            {isUploadando ? (
              <>
                <FaSpinner className="w-4 h-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <FaUpload className="w-4 h-4" />
                {doc ? 'Atualizar' : 'Enviar'} Arquivo
              </>
            )}
            <input
              type="file"
              onChange={(e) => handleUpload(tipo, e.target.files[0])}
              disabled={isUploadando}
              className="hidden"
              accept={tipo === 'foto_padronizacao' ? 'image/*' : 'application/pdf'}
            />
          </label>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h2 className="text-lg font-bold text-gray-800 mb-1">
          Documentos - {ferramentaNome}
        </h2>
        <p className="text-sm text-gray-600">
          Gerencie PDFs, fichas de processo e fotos de padronização
        </p>
      </div>

      {erro && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-800 text-sm">
          {erro}
        </div>
      )}

      {carregando ? (
        <div className="flex items-center justify-center py-8">
          <FaSpinner className="w-6 h-6 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-600">Carregando documentos...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {renderDocumento('desenho', 'Desenho do Produto', <FaFile className="w-5 h-5 text-red-500" />)}
          {renderDocumento('ficha_processo', 'Ficha de Processo', <FaFile className="w-5 h-5 text-blue-500" />)}
          {renderDocumento('foto_padronizacao', 'Foto Padronização Palete', <FaImage className="w-5 h-5 text-green-500" />)}
        </div>
      )}
    </div>
  )
}

export default GerenciadorDocumentosFerramentas
