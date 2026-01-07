import { useState, useEffect } from 'react'
import { FaPrint, FaTimes, FaCheckCircle, FaExclamationTriangle, FaFileWord, FaBarcode } from 'react-icons/fa'
import { getConfiguracaoImpressoras, isImpressoraAtiva } from '../utils/impressoras'
import { buildFormularioIdentificacaoHtml } from '../utils/formularioIdentificacao'
import EtiquetasService from '../services/EtiquetasService'
import PrintService from '../services/PrintService'
import AutocompleteCodigoCliente from './AutocompleteCodigoCliente'
import BuscaCodigoClienteService from '../services/BuscaCodigoClienteService'

const PrintModal = ({ isOpen, onClose, apontamento, onPrintSuccess }) => {
  const [printType, setPrintType] = useState('formulario') // 'formulario' | 'etiquetas'
  const [qtdEtiquetas, setQtdEtiquetas] = useState(1)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [messageType, setMessageType] = useState('info') // 'info' | 'success' | 'error'
  const [qtdAmarrados, setQtdAmarrados] = useState(0)
  const [qtdPorAmarrado, setQtdPorAmarrado] = useState(0)
  const [amarradosPersonalizados, setAmarradosPersonalizados] = useState([])
  const [distribuicaoEtiquetas, setDistribuicaoEtiquetas] = useState([])
  const [codigoProdutoCliente, setCodigoProdutoCliente] = useState('')

  // Buscar código do cliente automaticamente quando apontamento mudar
  useEffect(() => {
    if (apontamento && isOpen && apontamento.produto) {
      buscarCodigoClienteAutomatico(apontamento.produto)
    }
  }, [apontamento, isOpen])

  // Calcular distribuição quando apontamento mudar ou quando valores de formação mudarem
  useEffect(() => {
    if (apontamento && isOpen) {
      const qtd = apontamento.quantidade || 0
      
      // Se já houver amarrados detalhados, usar esses dados
      if (apontamento.amarrados_detalhados && apontamento.amarrados_detalhados.length > 0) {
        const amarrados = apontamento.amarrados_detalhados
        setQtdAmarrados(amarrados.length)
        setQtdPorAmarrado(amarrados[0].qtd_pc || 0)
        setQtdEtiquetas(amarrados.length)
        
        // Criar distribuição com base nos amarrados existentes
        const dist = amarrados.map(amarrado => ({
          qtdEtiquetas: 1,
          qtdPorEtiqueta: amarrado.qtd_pc || 0,
          qtKgPorEtiqueta: amarrado.qt_kg || 0
        }))
        setDistribuicaoEtiquetas(dist)
      } else {
        // Calcular automaticamente se não houver amarrados
        if (qtd > 0) {
          const qtdPadrao = 20
          const numAmarrados = Math.ceil(qtd / qtdPadrao)
          setQtdAmarrados(numAmarrados)
          setQtdPorAmarrado(qtdPadrao)
          setQtdEtiquetas(numAmarrados)
          
          // Criar distribuição padrão
          const dist = []
          let qtdRestante = qtd
          for (let i = 0; i < numAmarrados && qtdRestante > 0; i++) {
            const qtdNesteAmarrado = Math.min(qtdPadrao, qtdRestante)
            dist.push({
              qtdEtiquetas: 1,
              qtdPorEtiqueta: qtdNesteAmarrado,
              qtKgPorEtiqueta: 0 // Será calculado posteriormente se necessário
            })
            qtdRestante -= qtdNesteAmarrado
          }
          setDistribuicaoEtiquetas(dist)
        }
      }
    }
  }, [apontamento, isOpen])

  // Recalcular distribuição quando valores de formação mudarem
  useEffect(() => {
    if (apontamento && isOpen) {
      const dist = calcularDistribuicaoCompleta()
      setDistribuicaoEtiquetas(dist)
      setQtdEtiquetas(dist.length)
    }
  }, [qtdAmarrados, qtdPorAmarrado, amarradosPersonalizados, apontamento, isOpen])

  const showMessage = (text, type = 'info') => {
    setMessage(text)
    setMessageType(type)
    if (type === 'success') {
      setTimeout(() => {
        setMessage(null)
      }, 3000)
    }
  }

  // Adicionar amarrado personalizado
  const adicionarAmarradoPersonalizado = () => {
    const novoAmarrado = {
      id: Date.now(),
      quantidade: 0
    }
    setAmarradosPersonalizados([...amarradosPersonalizados, novoAmarrado])
  }

  // Remover amarrado personalizado
  const removerAmarradoPersonalizado = (id) => {
    setAmarradosPersonalizados(amarradosPersonalizados.filter(a => a.id !== id))
  }

  // Atualizar quantidade de amarrado personalizado
  const atualizarAmarradoPersonalizado = (id, quantidade) => {
    setAmarradosPersonalizados(amarradosPersonalizados.map(a => 
      a.id === id ? { ...a, quantidade: Math.max(1, quantidade) } : a
    ))
  }

  // Buscar código do cliente automaticamente
  const buscarCodigoClienteAutomatico = async (codigoTecno) => {
    try {
      const codigoPreferencial = await BuscaCodigoClienteService.buscarCodigoPreferencial(codigoTecno)
      if (codigoPreferencial) {
        setCodigoProdutoCliente(codigoPreferencial.codigo_cliente)
        console.log(`Código do cliente encontrado automaticamente: ${codigoPreferencial.codigo_cliente} para ${codigoTecno}`)
      }
    } catch (error) {
      console.error('Erro ao buscar código do cliente automático:', error)
    }
  }

  // Buscar código do cliente quando usuário digitar (para autocomplete)
  const handleCodigoClienteChange = async (valor) => {
    setCodigoProdutoCliente(valor)
    
    // Se o valor digitado corresponde a um código Tecno, buscar correspondências
    if (valor && valor.length >= 3) {
      try {
        const resultados = await BuscaCodigoClienteService.buscarSugestoes(valor)
        // Se encontrar apenas um resultado e for exato, usar automaticamente
        if (resultados.length === 1 && 
            (resultados[0].codigo_tecno === valor || resultados[0].codigo_cliente === valor)) {
          setCodigoProdutoCliente(resultados[0].codigo_cliente)
        }
      } catch (error) {
        console.error('Erro ao buscar correspondências:', error)
      }
    }
  }

  // Calcular distribuição completa (padrão + personalizados)
  const calcularDistribuicaoCompleta = () => {
    const qtd = apontamento?.quantidade || 0
    const dist = []
    let qtdRestante = qtd
    let seq = 1

    // Primeiro adicionar amarrados padrão
    if (qtdAmarrados > 0 && qtdPorAmarrado > 0) {
      for (let i = 0; i < qtdAmarrados && qtdRestante > 0; i++) {
        const qtdNesteAmarrado = Math.min(qtdPorAmarrado, qtdRestante)
        dist.push({
          qtdEtiquetas: 1,
          qtdPorEtiqueta: qtdNesteAmarrado,
          qtKgPorEtiqueta: 0, // Será calculado posteriormente se necessário
          codigoEtiqueta: gerarCodigoEtiqueta(seq),
          codigoProdutoCliente: codigoProdutoCliente
        })
        qtdRestante -= qtdNesteAmarrado
        seq++
      }
    }

    // Depois adicionar amarrados personalizados
    amarradosPersonalizados.forEach(amarrado => {
      if (qtdRestante > 0 && amarrado.quantidade > 0) {
        const qtdNesteAmarrado = Math.min(amarrado.quantidade, qtdRestante)
        dist.push({
          qtdEtiquetas: 1,
          qtdPorEtiqueta: qtdNesteAmarrado,
          qtKgPorEtiqueta: 0,
          codigoEtiqueta: gerarCodigoEtiqueta(seq),
          codigoProdutoCliente: codigoProdutoCliente
        })
        qtdRestante -= qtdNesteAmarrado
        seq++
      }
    })

    return dist
  }

  // Gerar código de etiqueta único
  const gerarCodigoEtiqueta = (sequencia) => {
    const agora = new Date()
    const dia = String(agora.getDate()).padStart(2, '0')
    const mes = String(agora.getMonth() + 1).padStart(2, '0')
    const ano = agora.getFullYear()
    const hora = String(agora.getHours()).padStart(2, '0')
    const minuto = String(agora.getMinutes()).padStart(2, '0')
    const segundo = String(agora.getSeconds()).padStart(2, '0')
    const seq = String(sequencia).padStart(4, '0')
    
    return `${dia}${mes}${ano}${hora}${minuto}${segundo}${seq}`
  }

  if (!isOpen || !apontamento) return null

  const imprimirFormulario = () => {
    try {
      const cliente = apontamento.cliente || ''
      const item = apontamento.produto || apontamento.codigoPerfil || ''
      const medida = apontamento.comprimento_acabado_mm 
        ? `${apontamento.comprimento_acabado_mm} mm` 
        : extrairComprimentoAcabado(item)
      const pedidoTecno = apontamento.ordemTrabalho || apontamento.pedido_seq || ''
      const pedidoCli = apontamento.pedido_cliente || ''
      const qtde = apontamento.quantidade || ''
      const pallet = apontamento.rack_ou_pallet || apontamento.rackOuPallet || ''
      const lote = apontamento.lote || ''
      const loteMPVal = apontamento.lote_externo || apontamento.loteExterno || 
        (Array.isArray(apontamento.lotes_externos) ? apontamento.lotes_externos.join(', ') : '') || ''
      const durezaVal = (apontamento.dureza_material && String(apontamento.dureza_material).trim())
        ? apontamento.dureza_material
        : 'N/A'

      const html = buildFormularioIdentificacaoHtml({
        lote,
        loteMP: loteMPVal,
        cliente,
        item,
        codigoCliente: codigoProdutoCliente,
        medida,
        pedidoTecno,
        pedidoCli,
        qtde,
        pallet,
        dureza: durezaVal
      })

      const blob = new Blob([html], { type: 'application/msword' })
      const url = URL.createObjectURL(blob)
      const aTag = document.createElement('a')
      aTag.href = url
      aTag.download = `identificacao_${lote || 'apontamento'}.doc`
      document.body.appendChild(aTag)
      aTag.click()
      document.body.removeChild(aTag)
      URL.revokeObjectURL(url)

      return true
    } catch (error) {
      console.error('Erro ao imprimir formulário:', error)
      return false
    }
  }

  const imprimirEtiquetaTermica = async (numeroEtiqueta, totalEtiquetas, qtdPorEtiqueta = null) => {
    try {
      // Verificar configuração da impressora térmica
      const impressoraTermica = getConfiguracaoImpressoras().termica

      if (!isImpressoraAtiva('termica')) {
        showMessage('Impressora térmica não está configurada ou ativa. Vá em Configurações > Impressoras para configurar.', 'error')
        return false
      }

      if (!impressoraTermica?.ip) {
        showMessage('Impressora térmica sem IP configurado. Vá em Configurações > Impressoras e preencha o IP.', 'error')
        return false
      }

      const qtde = qtdPorEtiqueta || apontamento.quantidade || ''
      const pallet = apontamento.rack_ou_pallet || apontamento.rackOuPallet || ''
      const lote = apontamento.lote || ''
      const durezaDisplay = (apontamento.dureza_material && String(apontamento.dureza_material).trim()) ? apontamento.dureza_material : 'N/A'
      const loteMP = apontamento.lote_externo || apontamento.loteExterno ||
        (Array.isArray(apontamento.lotes_externos) ? apontamento.lotes_externos.join(', ') : '') || ''
      const ferramenta = extrairFerramenta(apontamento.produto || apontamento.codigoPerfil || '')
      const nomeCliente = apontamento.cliente || apontamento.nome_cliente || ''

      const tspl = PrintService.gerarEtiquetaTspl({
        lote,
        loteMP: loteMP || '',
        rack: pallet,
        qtde: qtde || '',
        ferramenta,
        dureza: durezaDisplay,
        numeroEtiqueta,
        totalEtiquetas,
        codigoProdutoCliente: codigoProdutoCliente || '',
        nomeCliente: nomeCliente || ''
      })

      await PrintService.enviarTspl({
        tipo: impressoraTermica.tipo || 'rede_ip',
        ip: impressoraTermica.ip || '',
        porta: Number(impressoraTermica.porta || 9100),
        portaCom: impressoraTermica.portaCom || '',
        caminhoCompartilhada: impressoraTermica.caminhoCompartilhada || '',
        tspl
      })

      return true
    } catch (error) {
      console.error('Erro ao imprimir etiqueta térmica:', error)
      showMessage('Erro ao imprimir etiqueta térmica', 'error')
      return false
    }
  }

  const handlePrint = async () => {
    setLoading(true)
    setMessage(null)

    try {
      let sucesso = true

      if (printType === 'formulario') {
        const formOk = imprimirFormulario()
        if (!formOk) {
          sucesso = false
          showMessage('Erro ao imprimir formulário', 'error')
        }
      }

      if (printType === 'etiquetas' && sucesso) {
        // Gerar códigos únicos para cada etiqueta
        const codigosEtiquetas = distribuicaoEtiquetas.map((_, index) => gerarCodigoEtiqueta(index + 1))
        
        // Registrar etiquetas no banco antes de imprimir
        let etiquetasRegistradas = []
        try {
          if (distribuicaoEtiquetas.length > 0) {
            const distribuicaoComCodigos = distribuicaoEtiquetas.map((dist, index) => ({
              ...dist,
              codigoEtiqueta: codigosEtiquetas[index]
            }))
            
            etiquetasRegistradas = await EtiquetasService.registrarEtiquetas(
              apontamento, 
              distribuicaoComCodigos, 
              'Usuário Sistema' // TODO: Obter usuário logado
            )
          }
        } catch (error) {
          console.error('Erro ao registrar etiquetas:', error)
          showMessage('Erro ao registrar etiquetas no banco, mas impressão continuará', 'error')
        }
        
        let seq = 1
        const etiquetasIds = []
        
        for (const dist of distribuicaoEtiquetas) {
          for (let i = 0; i < dist.qtdEtiquetas; i++) {
            const etiquetaOk = await imprimirEtiquetaTermica(seq, distribuicaoEtiquetas.length, dist.qtdPorEtiqueta)
            if (!etiquetaOk) {
              sucesso = false
              break
            }
            
            // Coletar IDs das etiquetas para atualizar status
            if (etiquetasRegistradas.length > 0) {
              const etiquetaIndex = seq - 1
              if (etiquetasRegistradas[etiquetaIndex]) {
                etiquetasIds.push(etiquetasRegistradas[etiquetaIndex].id)
              }
            }
            
            seq += 1
            if (i < dist.qtdEtiquetas - 1 || seq <= distribuicaoEtiquetas.length) {
              await new Promise(resolve => setTimeout(resolve, 500))
            }
          }
          if (!sucesso) break
        }
        
        // Marcar etiquetas como impressas
        if (etiquetasIds.length > 0) {
          try {
            await EtiquetasService.marcarComoImpressa(etiquetasIds)
            console.log(`✅ ${etiquetasIds.length} etiquetas marcadas como impressas`)
          } catch (error) {
            console.error('Erro ao marcar etiquetas como impressas:', error)
          }
        }
      }

      if (sucesso) {
        const totalEtiquetas = distribuicaoEtiquetas.reduce((sum, d) => sum + d.qtdEtiquetas, 0)
        showMessage(
          `${printType === 'formulario' ? 'Formulário' : `${totalEtiquetas} etiqueta(s)`} impresso(s) com sucesso!`,
          'success'
        )
        if (onPrintSuccess) {
          onPrintSuccess(apontamento)
        }
      }
    } catch (error) {
      console.error('Erro durante impressão:', error)
      showMessage('Erro durante a impressão', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FaPrint className="text-blue-600" />
            Opções de Impressão
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
            disabled={loading}
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Coluna Esquerda - Informações e Tipo de Impressão */}
            <div className="space-y-4">
              {/* Informações do Apontamento */}
              <div className="bg-gray-50 p-3 rounded border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Informações do Apontamento</h3>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">
                    <strong>Lote:</strong> {apontamento.lote || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Pedido:</strong> {apontamento.ordemTrabalho || apontamento.pedido_seq || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Produto:</strong> {apontamento.produto || apontamento.codigoPerfil || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Quantidade:</strong> {apontamento.quantidade || 'N/A'} PC
                  </p>
                </div>
              </div>

              {/* Tipo de Impressão */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-700">Tipo de Impressão:</h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded cursor-pointer hover:bg-blue-50" style={{ borderColor: printType === 'formulario' ? '#3b82f6' : '#e5e7eb', backgroundColor: printType === 'formulario' ? '#eff6ff' : 'white' }}>
                    <input
                      type="radio"
                      name="printType"
                      value="formulario"
                      checked={printType === 'formulario'}
                      onChange={(e) => setPrintType(e.target.value)}
                      disabled={loading}
                      className="w-4 h-4"
                    />
                    <div className="flex items-center gap-2">
                      <FaFileWord className="text-blue-600" />
                      <span className="text-sm font-medium">Apenas Formulário</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded cursor-pointer hover:bg-blue-50" style={{ borderColor: printType === 'etiquetas' ? '#3b82f6' : '#e5e7eb', backgroundColor: printType === 'etiquetas' ? '#eff6ff' : 'white' }}>
                    <input
                      type="radio"
                      name="printType"
                      value="etiquetas"
                      checked={printType === 'etiquetas'}
                      onChange={(e) => setPrintType(e.target.value)}
                      disabled={loading}
                      className="w-4 h-4"
                    />
                    <div className="flex items-center gap-2">
                      <FaBarcode className="text-green-600" />
                      <span className="text-sm font-medium">Apenas Etiquetas Térmicas</span>
                    </div>
                  </label>

                                  </div>
              </div>
            </div>

            {/* Coluna Central - Formação dos Pacotes */}
            {printType === 'etiquetas' && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">Formação dos Pacotes:</h3>
                
                {/* Amarrados Padrão */}
                <div className="bg-blue-50 p-3 rounded border border-blue-200">
                  <div className="text-sm font-medium text-blue-800 mb-2">Amarrados Padrão</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Qtd. Amarrados:</label>
                      <input
                        type="number"
                        min="0"
                        max="99"
                        value={qtdAmarrados}
                        onChange={(e) => setQtdAmarrados(Math.max(0, parseInt(e.target.value) || 0))}
                        disabled={loading}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Qtd. por Amarrado:</label>
                      <input
                        type="number"
                        min="1"
                        max="999"
                        value={qtdPorAmarrado}
                        onChange={(e) => setQtdPorAmarrado(Math.max(1, parseInt(e.target.value) || 1))}
                        disabled={loading}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-center"
                      />
                    </div>
                  </div>
                </div>

                {/* Amarrados Personalizados */}
                <div className="bg-orange-50 p-3 rounded border border-orange-200">
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-sm font-medium text-orange-800">Amarrados Personalizados</div>
                    <button
                      onClick={adicionarAmarradoPersonalizado}
                      disabled={loading}
                      className="px-2 py-1 bg-orange-500 text-white text-xs rounded hover:bg-orange-600 disabled:opacity-50"
                    >
                      + Adicionar
                    </button>
                  </div>
                  
                  {amarradosPersonalizados.length === 0 ? (
                    <div className="text-xs text-gray-500 italic">
                      Nenhum amarrado personalizado adicionado
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {amarradosPersonalizados.map((amarrado, index) => (
                        <div key={amarrado.id} className="flex items-center gap-2">
                          <div className="flex-1">
                            <input
                              type="number"
                              min="1"
                              max="999"
                              value={amarrado.quantidade}
                              onChange={(e) => atualizarAmarradoPersonalizado(amarrado.id, parseInt(e.target.value) || 1)}
                              disabled={loading}
                              className="w-full px-3 py-2 border border-gray-300 rounded text-center text-sm"
                              placeholder="Qtd. peças"
                            />
                          </div>
                          <div className="text-xs text-gray-600">PC</div>
                          <button
                            onClick={() => removerAmarradoPersonalizado(amarrado.id)}
                            disabled={loading}
                            className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 disabled:opacity-50"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Código do Produto do Cliente */}
                <div className="bg-purple-50 p-3 rounded border border-purple-200">
                  <div className="text-sm font-medium text-purple-800 mb-2">Código do Produto do Cliente</div>
                  <div className="space-y-2">
                    <AutocompleteCodigoCliente
                      codigoTecno={apontamento?.produto || ''}
                      value={codigoProdutoCliente}
                      onChange={handleCodigoClienteChange}
                      disabled={loading}
                      placeholder="Digite ou busque o código do cliente..."
                    />
                    <div className="text-xs text-gray-500 italic">
                      {apontamento?.produto && (
                        <span>
                          Código Tecno: <strong>{apontamento.produto}</strong> - 
                          Buscando correspondências cadastradas...
                        </span>
                      )}
                      {!apontamento?.produto && (
                        <span>Este código será impresso na etiqueta para identificação</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Coluna Direita - Resumo e Mensagens */}
            <div className="space-y-4">
              {/* Resumo da distribuição */}
              {distribuicaoEtiquetas.length > 0 && (
                <div className="bg-gray-50 p-3 rounded border border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Resumo da Distribuição</h3>
                  <div className="text-xs space-y-1 max-h-48 overflow-y-auto">
                    {distribuicaoEtiquetas.map((dist, index) => (
                      <div key={index} className="text-gray-600">
                        <div className="font-mono text-xs text-blue-600">ID: {dist.codigoEtiqueta}</div>
                        <div>{dist.qtdEtiquetas} etiqueta(s) × {dist.qtdPorEtiqueta} PC
                        {dist.qtKgPorEtiqueta > 0 && ` × ${dist.qtKgPorEtiqueta} KG`}</div>
                      </div>
                    ))}
                    <div className="mt-2 pt-2 border-t border-gray-300 text-gray-700 font-semibold">
                      Total: {distribuicaoEtiquetas.reduce((sum, d) => sum + (d.qtdEtiquetas * d.qtdPorEtiqueta), 0)} PC
                    </div>
                    <div className="text-gray-600">
                      Total de etiquetas: {distribuicaoEtiquetas.length}
                    </div>
                  </div>
                </div>
              )}

              {/* Mensagens */}
              {message && (
                <div
                  className={`p-3 rounded flex items-start gap-2 ${
                    messageType === 'success'
                      ? 'bg-green-50 border border-green-200 text-green-800'
                      : messageType === 'error'
                      ? 'bg-red-50 border border-red-200 text-red-800'
                      : 'bg-blue-50 border border-blue-200 text-blue-800'
                  }`}
                >
                  {messageType === 'success' ? (
                    <FaCheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  ) : (
                    <FaExclamationTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  )}
                  <p className="text-sm">{message}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 disabled:opacity-50 font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handlePrint}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
          >
            <FaPrint />
            {loading ? 'Imprimindo...' : 'Imprimir'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Helper functions
function extrairComprimentoAcabado(produto) {
  if (!produto) return ''
  const resto = String(produto).slice(8)
  const match = resto.match(/^\d+/)
  const valor = match ? parseInt(match[0], 10) : null
  return Number.isFinite(valor) ? `${valor} mm` : ''
}

function extrairFerramenta(produto) {
  if (!produto) return ''
  const s = String(produto).toUpperCase()
  const re3 = /^([A-Z]{3})([A-Z0-9]+)/
  const re2 = /^([A-Z]{2})([A-Z0-9]+)/
  let letras = '', resto = '', qtd = 0
  let m = s.match(re3)
  if (m) { letras = m[1]; resto = m[2]; qtd = 3 }
  else {
    m = s.match(re2)
    if (!m) return ''
    letras = m[1]; resto = m[2]; qtd = 4
  }
  let nums = ''
  for (const ch of resto) {
    if (/[0-9]/.test(ch)) nums += ch
    else if (ch === 'O') nums += '0'
    if (nums.length === qtd) break
  }
  if (nums.length < qtd) nums = nums.padEnd(qtd, '0')
  return `${letras}-${nums}`
}

export default PrintModal
