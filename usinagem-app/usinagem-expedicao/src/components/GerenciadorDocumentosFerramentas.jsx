import { useState, useEffect } from 'react'
import { FaFile, FaImage, FaDownload, FaTrash, FaUpload, FaSpinner } from 'react-icons/fa'
import supabaseService from '../services/SupabaseService'

const GerenciadorDocumentosFerramentas = ({ configId, documentoKey, ferramentaNome, comprimentoMm }) => {
  const [documentos, setDocumentos] = useState({
    desenho: null,
    ficha_processo: null,
    foto_padronizacao: null
  })
  const [carregando, setCarregando] = useState(false)
  const [uploadando, setUploadando] = useState({})
  const [erro, setErro] = useState(null)

  useEffect(() => {
    if (documentoKey) carregarDocumentos()
  }, [documentoKey])

  const carregarDocumentos = async () => {
    try {
      setCarregando(true)
      const docs = await supabaseService.getWhere('documentos_ferramentas', [
        { column: 'ferramenta_id', operator: 'eq', value: documentoKey },
        { column: 'ativo', operator: 'eq', value: true }
      ])
      const mapa = {}
      ;(docs || []).forEach((doc) => {
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

  const campoUrlPorTipo = {
    desenho: 'desenho_pdf_url',
    ficha_processo: 'ficha_processo_pdf_url',
    foto_padronizacao: 'foto_padronizacao_url'
  }

  const handleUpload = async (tipo, file) => {
    if (!file) return

    try {
      setUploadando((prev) => ({ ...prev, [tipo]: true }))
      setErro(null)

      const tiposPermitidos = {
        desenho: ['application/pdf'],
        ficha_processo: ['application/pdf'],
        foto_padronizacao: ['image/jpeg', 'image/png', 'image/webp']
      }

      if (!tiposPermitidos[tipo].includes(file.type)) {
        throw new Error(`Tipo de arquivo não permitido para ${tipo}`)
      }

      if (file.size > 50 * 1024 * 1024) {
        throw new Error('Arquivo muito grande (máximo 50MB)')
      }

      const nomeArquivo = `${documentoKey}_${tipo}_${Date.now()}_${file.name}`
      const caminho = `documentos-ferramentas/${documentoKey}/${tipo}/${nomeArquivo}`

      const { error: erroUpload } = await supabaseService.supabase.storage
        .from('documentos')
        .upload(caminho, file, { upsert: true })

      if (erroUpload) throw erroUpload

      const { data: publicData } = supabaseService.supabase.storage
        .from('documentos')
        .getPublicUrl(caminho)

      const publicUrl = publicData?.publicUrl || ''

      const docsAntigos = await supabaseService.getWhere('documentos_ferramentas', [
        { column: 'ferramenta_id', operator: 'eq', value: documentoKey },
        { column: 'tipo_documento', operator: 'eq', value: tipo },
        { column: 'ativo', operator: 'eq', value: true }
      ])

      for (const doc of docsAntigos || []) {
        await supabaseService.update('documentos_ferramentas', doc.id, { ativo: false })
      }

      const novoDoc = {
        ferramenta_id: documentoKey,
        tipo_documento: tipo,
        nome_arquivo: file.name,
        url_arquivo: publicUrl,
        tamanho_bytes: file.size,
        mime_type: file.type,
        versao: ((docsAntigos && docsAntigos[0]?.versao) || 0) + 1,
        ativo: true,
        uploaded_by: 'sistema',
        descricao: `Upload de ${tipo}`
      }

      const docCriado = await supabaseService.add('documentos_ferramentas', novoDoc)

      await supabaseService.update('ferramentas_cfg', configId, {
        [campoUrlPorTipo[tipo]]: publicUrl,
        updated_at: new Date().toISOString()
      })

      setDocumentos((prev) => ({
        ...prev,
        [tipo]: { ...novoDoc, id: docCriado }
      }))

      alert('Arquivo enviado com sucesso!')
    } catch (err) {
      console.error('Erro no upload:', err)
      setErro(err.message || 'Erro ao fazer upload')
      alert(`Erro: ${err.message || 'Falha no upload'}`)
    } finally {
      setUploadando((prev) => ({ ...prev, [tipo]: false }))
    }
  }

  const handleExcluir = async (tipo) => {
    if (!window.confirm('Deseja excluir este documento?')) return

    try {
      setUploadando((prev) => ({ ...prev, [tipo]: true }))
      const doc = documentos[tipo]
      if (!doc) return

      await supabaseService.update('documentos_ferramentas', doc.id, { ativo: false })
      await supabaseService.update('ferramentas_cfg', configId, {
        [campoUrlPorTipo[tipo]]: null,
        updated_at: new Date().toISOString()
      })

      setDocumentos((prev) => ({ ...prev, [tipo]: null }))
      alert('Documento excluído com sucesso!')
    } catch (err) {
      console.error('Erro ao excluir:', err)
      setErro(err.message || 'Erro ao excluir documento')
    } finally {
      setUploadando((prev) => ({ ...prev, [tipo]: false }))
    }
  }

  const renderDocumento = (tipo, label, icone) => {
    const doc = documentos[tipo]
    const isUploadando = uploadando[tipo]

    return (
      <div key={tipo} className="border rounded-md px-3 py-2 bg-gray-50">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {icone}
            <h3 className="font-medium text-sm text-gray-800">{label}</h3>
          </div>
          {doc && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">v{doc.versao}</span>}
        </div>

        {doc ? (
          <div className="mt-2 space-y-2">
            <p className="text-xs text-gray-600 truncate" title={doc.nome_arquivo}>{doc.nome_arquivo}</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-gray-500">{new Date(doc.uploaded_at).toLocaleDateString('pt-BR')}</span>
              <a href={doc.url_arquivo} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600">
                <FaDownload className="w-4 h-4" />
                Visualizar
              </a>
              <button onClick={() => handleExcluir(tipo)} disabled={isUploadando} className="flex items-center gap-1 px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50">
                <FaTrash className="w-4 h-4" />
                Excluir
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-xs text-gray-500">Nenhum arquivo enviado</p>
        )}

        <div className="mt-2">
          <label className="inline-flex items-center gap-2 px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded cursor-pointer hover:bg-gray-50 disabled:opacity-50">
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
            <input type="file" onChange={(e) => handleUpload(tipo, e.target.files?.[0])} disabled={isUploadando} className="hidden" accept={tipo === 'foto_padronizacao' ? 'image/*' : 'application/pdf'} />
          </label>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
        <div>
          <h2 className="text-sm font-semibold text-gray-800">{ferramentaNome}</h2>
          <p className="text-xs text-gray-500">Comprimento: {comprimentoMm ?? '-'} mm</p>
        </div>
      </div>

      {erro && <div className="bg-red-50 border border-red-200 rounded-md p-2 text-red-800 text-xs">{erro}</div>}

      {carregando ? (
        <div className="flex items-center justify-center py-4">
          <FaSpinner className="w-5 h-5 animate-spin text-blue-500" />
          <span className="ml-2 text-sm text-gray-600">Carregando documentos...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {renderDocumento('desenho', 'Desenho do Produto', <FaFile className="w-5 h-5 text-red-500" />)}
          {renderDocumento('ficha_processo', 'Ficha de Processo', <FaFile className="w-5 h-5 text-blue-500" />)}
          {renderDocumento('foto_padronizacao', 'Foto Padronização Palete', <FaImage className="w-5 h-5 text-green-500" />)}
        </div>
      )}
    </div>
  )
}

export default GerenciadorDocumentosFerramentas
