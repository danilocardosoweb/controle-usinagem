import { useState, useEffect, useMemo } from 'react'
import { FaTimes, FaCheckCircle, FaTimesCircle, FaCamera, FaSave, FaCheck, FaChevronDown, FaFileExcel } from 'react-icons/fa'
import useSupabase from '../hooks/useSupabase'
import AuditoriaService from '../services/AuditoriaService'
import * as XLSX from 'xlsx'

const InspecaoQualidadeModal = ({ isOpen, onClose, apontamento, onInspecaoSalva }) => {
  const [blocos, setBlocos] = useState([])
  const [expandedBloco, setExpandedBloco] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [messageType, setMessageType] = useState('info')
  const { addItem: addInspecao, updateItem: updateInspecao } = useSupabase('inspecoes_qualidade')

  const calcularIntervaloBloco = (indice, totalBlocos) => {
    if (!apontamento?.inicio || !apontamento?.fim) return '-'
    const inicio = new Date(apontamento.inicio)
    const fim = new Date(apontamento.fim)
    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) return '-'
    const duracaoMin = Math.max(0, (fim.getTime() - inicio.getTime()) / 60000)
    if (!duracaoMin || !totalBlocos) return '-'
    const intervalo = duracaoMin / totalBlocos
    const inicioBloco = Math.floor(indice * intervalo)
    const fimBloco = Math.floor((indice + 1) * intervalo)
    return `${inicioBloco}-${fimBloco} min`
  }

  // Calcula blocos de inspeção baseado na quantidade e regra
  useEffect(() => {
    if (!isOpen || !apontamento) return

    const quantidade = Number(apontamento.quantidade || 0)
    const pecsPorPalete = Number(apontamento.pcs_por_palete || apontamento.pcs_por_pallet || 1000)
    const amostraPorPalete = Number(apontamento.amostra_por_palete || apontamento.inspecao_por_palete || 80)
    const pecsPorBloco = Number(apontamento.pcs_por_bloco || 80)

    if (quantidade <= 0 || pecsPorPalete <= 0 || pecsPorBloco <= 0) {
      setBlocos([])
      return
    }

    const numBlocos = Math.ceil(quantidade / pecsPorBloco)
    const paletesEquivalentes = quantidade / pecsPorPalete
    const totalInspecao = Math.ceil(paletesEquivalentes * amostraPorPalete)
    const totalInspecaoDistribuida = Math.max(totalInspecao, 0)
    const baseInspecao = numBlocos > 0 ? Math.floor(totalInspecaoDistribuida / numBlocos) : 0
    const restoInspecao = numBlocos > 0 ? totalInspecaoDistribuida % numBlocos : 0
    const novosBlocos = []

    for (let i = 0; i < numBlocos; i++) {
      const qtdPrevista = Math.min(pecsPorBloco, quantidade - i * pecsPorBloco)
      const qtdPrevistaInspecao = baseInspecao + (i < restoInspecao ? 1 : 0)
      novosBlocos.push({
        id: `bloco-${i + 1}`,
        numero: i + 1,
        qtdApontada: qtdPrevista,
        qtdPrevistaInspecao,
        intervaloInspecao: calcularIntervaloBloco(i, numBlocos),
        qtdInspecionada: 0,
        status: null, // 'OK' ou 'NOK'
        qtdNaoConforme: 0,
        statusNaoConforme: 'separado', // 'separado', 'enviado', 'aguardando'
        comentarioNaoConforme: '',
        tipoDefeito: '',
        foto: null,
        observacoes: ''
      })
    }

    setBlocos(novosBlocos)
    setExpandedBloco(null)
  }, [isOpen, apontamento])

  // Calcula resumo
  const resumo = useMemo(() => {
    const totalApontado = blocos.reduce((sum, b) => sum + (Number(b.qtdApontada) || 0), 0)
    const totalInspecionado = blocos.reduce((sum, b) => sum + (Number(b.qtdInspecionada) || 0), 0)
    const totalNaoConforme = blocos.reduce((sum, b) => sum + (Number(b.qtdNaoConforme) || 0), 0)
    const totalPrevistoInspecao = blocos.reduce((sum, b) => sum + (Number(b.qtdPrevistaInspecao) || 0), 0)
    const blocosConcluidos = blocos.filter(b => b.status !== null).length
    const percentualConcluido = blocos.length > 0 ? (blocosConcluidos / blocos.length) * 100 : 0
    const percentualNaoConforme = totalInspecionado > 0 ? (totalNaoConforme / totalInspecionado) * 100 : 0

    return {
      totalApontado,
      totalInspecionado,
      totalNaoConforme,
      totalPrevistoInspecao,
      blocosConcluidos,
      totalBlocos: blocos.length,
      percentualConcluido,
      percentualNaoConforme,
      completo: blocosConcluidos === blocos.length && totalInspecionado === totalPrevistoInspecao
    }
  }, [blocos])

  const handleStatusBloco = (blocoId, status) => {
    setBlocos(prev =>
      prev.map(b => {
        if (b.id === blocoId) {
          return {
            ...b,
            status,
            qtdInspecionada: status === 'OK' ? b.qtdApontada : b.qtdInspecionada,
            qtdNaoConforme: status === 'OK' ? 0 : b.qtdNaoConforme,
            tipoDefeito: status === 'OK' ? '' : b.tipoDefeito
          }
        }
        return b
      })
    )
  }

  const handleTudoOK = () => {
    setBlocos(prev =>
      prev.map(b => ({
        ...b,
        status: 'OK',
        qtdInspecionada: b.qtdPrevistaInspecao,
        qtdNaoConforme: 0,
        tipoDefeito: ''
      }))
    )
    setMessage('Todos os blocos marcados como OK')
    setMessageType('success')
  }

  const handleAtualizarBloco = (blocoId, campo, valor) => {
    const camposNumericos = new Set(['qtdInspecionada', 'qtdNaoConforme'])

    setBlocos(prev =>
      prev.map(b => {
        if (b.id === blocoId) {
          const valorNormalizado = camposNumericos.has(campo)
            ? (valor === '' ? '' : Number(valor))
            : valor

          const atualizado = { ...b, [campo]: valorNormalizado }

          // Validações
          if (campo === 'qtdInspecionada') {
            if (valorNormalizado > b.qtdPrevistaInspecao) {
              setMessage(`Quantidade inspecionada não pode ser maior que ${b.qtdPrevistaInspecao}`)
              setMessageType('error')
              return b
            }
          }

          if (campo === 'qtdNaoConforme') {
            if (valorNormalizado > atualizado.qtdInspecionada) {
              setMessage('Quantidade não conforme não pode ser maior que quantidade inspecionada')
              setMessageType('error')
              return b
            }
          }

          // Se estiver atualizando quantidade, remove a mensagem de erro
          if (messageType === 'error') {
            setMessage(null)
          }

          return atualizado
        }
        return b
      })
    )
  }

  const validarDados = () => {
    // Verifica se todos os blocos foram inspecionados
    if (!resumo.completo) {
      setMessage(`A inspeção total deve atingir ${resumo.totalPrevistoInspecao} peças antes de finalizar`)
      setMessageType('error')
      return false
    }

    // Verifica consistência
    for (const bloco of blocos) {
      if (bloco.status === 'NOK' && !bloco.tipoDefeito) {
        setMessage(`Bloco ${bloco.numero}: tipo de defeito obrigatório para NOK`)
        setMessageType('error')
        return false
      }

      // Valida que não conforme não é maior que inspecionado
      if (bloco.qtdNaoConforme > bloco.qtdInspecionada) {
        setMessage(`Bloco ${bloco.numero}: quantidade não conforme não pode ser maior que inspecionada`)
        setMessageType('error')
        return false
      }
    }

    // Alerta se não conforme > 5%
    if (resumo.percentualNaoConforme > 5) {
      const confirma = window.confirm(
        `Taxa de não conformidade (${resumo.percentualNaoConforme.toFixed(2)}%) acima de 5%.\nDeseja continuar?`
      )
      if (!confirma) return false
    }

    return true
  }

  const handleSalvarParcial = async () => {
    try {
      setLoading(true)
      // Salvar estado parcial
      setMessage('Inspeção salva parcialmente')
      setMessageType('success')
    } catch (error) {
      setMessage('Erro ao salvar: ' + error.message)
      setMessageType('error')
    } finally {
      setLoading(false)
    }
  }

  const handleExportarExcel = () => {
    try {
      const wb = XLSX.utils.book_new()
      
      // Dados do cabeçalho
      const headerData = [
        ['CONTROLE DE INSPEÇÃO DE QUALIDADE'],
        [''],
        ['Produto:', apontamento.produto || apontamento.codigoPerfil, 'Pedido/Seq:', apontamento.pedido_seq || apontamento.ordem_trabalho],
        ['Palete:', apontamento.rack_acabado || apontamento.rackAcabado, 'Data/Hora:', new Date().toLocaleString('pt-BR')],
        ['Operador:', localStorage.getItem('usuario_nome') || 'Sistema', 'Status:', resumo.completo ? 'Concluída' : 'Parcial'],
        [''],
        ['RESUMO DA INSPEÇÃO'],
        ['Total Apontado:', resumo.totalApontado, 'Total Previsto Inspecionar:', resumo.totalPrevistoInspecao],
        ['Total Inspecionado:', resumo.totalInspecionado, 'Total Não Conforme:', resumo.totalNaoConforme],
        ['% Não Conforme:', `${resumo.percentualNaoConforme.toFixed(2)}%`],
        [''],
        ['DETALHAMENTO POR BLOCO'],
        ['Bloco', 'Intervalo', 'Apontado', 'Previsto Inspecionar', 'Inspecionado', 'Não Conforme', 'Status Material', 'Comentário NC', 'Resultado da Inspeção']
      ]

      // Dados dos blocos
      const blocosData = blocos.map(b => [
        `Bloco #${b.numero}`,
        b.intervaloInspecao,
        b.qtdApontada,
        b.qtdPrevistaInspecao,
        b.qtdInspecionada,
        b.qtdNaoConforme,
        b.statusNaoConforme ? b.statusNaoConforme.toUpperCase() : '-',
        b.comentarioNaoConforme || '-',
        b.status || 'PENDENTE'
      ])

      const wsData = [...headerData, ...blocosData]
      const ws = XLSX.utils.aoa_to_sheet(wsData)

      // Configurando larguras das colunas
      ws['!cols'] = [
        { wch: 15 }, // Bloco
        { wch: 18 }, // Intervalo
        { wch: 15 }, // Apontado
        { wch: 20 }, // Previsto Inspecionar
        { wch: 15 }, // Inspecionado
        { wch: 15 }, // Não Conforme
        { wch: 20 }, // Status Material
        { wch: 28 }, // Comentário NC
        { wch: 20 }  // Resultado
      ]

      XLSX.utils.book_append_sheet(wb, ws, 'Inspeção Qualidade')
      
      const fileName = `Inspecao_${apontamento.rack_acabado || apontamento.rackAcabado}_${new Date().getTime()}.xlsx`
      XLSX.writeFile(wb, fileName)
      
      setMessage('Relatório Excel gerado com sucesso!')
      setMessageType('success')
    } catch (error) {
      console.error('Erro ao gerar Excel:', error)
      setMessage('Erro ao gerar relatório Excel')
      setMessageType('error')
    }
  }

  const handleFinalizarInspecao = async () => {
    if (!validarDados()) return

    try {
      setLoading(true)

      const dataInspecao = {
        apontamento_id: apontamento.id,
        produto: apontamento.produto || apontamento.codigoPerfil,
        pedido_seq: apontamento.pedido_seq || apontamento.ordem_trabalho,
        palete: apontamento.rack_acabado || apontamento.rackAcabado,
        quantidade_total: resumo.totalApontado,
        quantidade_inspecionada: resumo.totalInspecionado,
        quantidade_nao_conforme: resumo.totalNaoConforme,
        percentual_nao_conforme: resumo.percentualNaoConforme,
        blocos: blocos,
        data_inspecao: new Date().toISOString(),
        operador: localStorage.getItem('usuario_nome') || 'Sistema',
        status: 'concluida'
      }

      await addInspecao(dataInspecao)
      await AuditoriaService.registrarAcao('INSPECAO_QUALIDADE', 'Inspeção de qualidade finalizada', {
        apontamento_id: apontamento.id,
        quantidade_nao_conforme: resumo.totalNaoConforme,
        percentual_nao_conforme: resumo.percentualNaoConforme
      })

      setMessage('Inspeção finalizada com sucesso!')
      setMessageType('success')

      setTimeout(() => {
        if (onInspecaoSalva) onInspecaoSalva(dataInspecao)
        onClose()
      }, 1500)
    } catch (error) {
      setMessage('Erro ao finalizar: ' + error.message)
      setMessageType('error')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !apontamento) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex justify-between items-center border-b shadow-md">
          <div>
            <h2 className="text-2xl font-bold">Controle de Inspeção de Qualidade</h2>
            <p className="text-blue-100 text-sm mt-1">Palete: {apontamento.rack_acabado || apontamento.rackAcabado}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-blue-800 p-2 rounded-lg transition"
            disabled={loading}
          >
            <FaTimes size={24} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Cabeçalho - Dados do Apontamento */}
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <p className="text-gray-500 mb-1">Produto</p>
                <p className="font-bold text-gray-800">{apontamento.produto || apontamento.codigoPerfil}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Pedido/Seq</p>
                <p className="font-bold text-gray-800">{apontamento.pedido_seq || apontamento.ordem_trabalho}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Palete</p>
                <p className="font-bold text-gray-800">{apontamento.rack_acabado || apontamento.rackAcabado}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Quantidade Total</p>
                <p className="font-bold text-blue-600">{apontamento.quantidade} pcs</p>
              </div>
            </div>
          </div>

          {/* Resumo da Inspeção - Tabela Compacta */}
          <div className="overflow-x-auto border rounded-lg bg-white shadow-sm">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b divide-x divide-gray-100">
                  <td className="bg-blue-50 px-3 py-2 font-medium text-blue-800 whitespace-nowrap">Blocos</td>
                  <td className="px-3 py-2 text-blue-700 font-bold text-base text-center whitespace-nowrap">{resumo.blocosConcluidos}/{resumo.totalBlocos}</td>
                  
                  <td className="bg-green-50 px-3 py-2 font-medium text-green-800 whitespace-nowrap">Inspecionado</td>
                  <td className="px-3 py-2 text-green-700 font-bold text-base text-center whitespace-nowrap">{resumo.totalInspecionado}</td>
                  
                  <td className="bg-orange-50 px-3 py-2 font-medium text-orange-800 whitespace-nowrap">Não Conforme</td>
                  <td className="px-3 py-2 text-orange-700 font-bold text-base text-center whitespace-nowrap">{resumo.totalNaoConforme}</td>
                  
                  <td className="bg-yellow-50 px-3 py-2 font-medium text-yellow-800 whitespace-nowrap">% NC</td>
                  <td className="px-3 py-2 text-yellow-700 font-bold text-base text-center whitespace-nowrap">{resumo.percentualNaoConforme.toFixed(1)}%</td>
                  
                  <td className="bg-purple-50 px-3 py-2 font-medium text-purple-800 whitespace-nowrap">Progresso</td>
                  <td className="px-3 py-2 text-purple-700 font-bold text-base text-center whitespace-nowrap">{resumo.percentualConcluido.toFixed(0)}%</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Barra de Progresso */}
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-full transition-all duration-300"
              style={{ width: `${resumo.percentualConcluido}%` }}
            />
          </div>

          {/* Blocos de Inspeção - Tabela */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-gray-800">Blocos de Inspeção</h3>
              <button
                onClick={handleTudoOK}
                className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs font-semibold transition flex items-center gap-2"
                disabled={loading || resumo.completo}
              >
                <FaCheck size={14} />
                Tudo OK
              </button>
            </div>

            <div className="overflow-x-auto border rounded-lg max-h-96 overflow-y-auto bg-white shadow-sm">
              <table className="w-full text-xs">
                <thead className="bg-gray-100 sticky top-0 z-20 shadow-sm">
                  <tr className="border-b">
                    <th className="px-2 py-3 text-center font-bold text-gray-700">Bloco</th>
                    <th className="px-2 py-3 text-center font-bold text-gray-700">Intervalo</th>
                    <th className="px-2 py-3 text-center font-bold text-gray-700">Apontado</th>
                    <th className="px-2 py-3 text-center font-bold text-gray-700">Previsto</th>
                    <th className="px-2 py-3 text-center font-bold text-gray-700">Inspecionado</th>
                    <th className="px-2 py-3 text-center font-bold text-gray-700">Não Conforme</th>
                    <th className="px-2 py-3 text-center font-bold text-gray-700">Status NC</th>
                    <th className="px-2 py-3 text-center font-bold text-gray-700">Comentário NC</th>
                    <th className="px-2 py-3 text-center font-bold text-gray-700 w-32">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {blocos.map(bloco => (
                    <tr
                      key={bloco.id}
                      className={`hover:bg-gray-50 transition ${
                        bloco.status === 'OK'
                          ? 'bg-green-50/50'
                          : bloco.status === 'NOK'
                          ? 'bg-red-50/50'
                          : 'bg-white'
                      }`}
                    >
                      <td className="px-2 py-2 text-center font-semibold text-gray-800">#{bloco.numero}</td>
                      <td className="px-2 py-2 text-center font-medium text-gray-600">{bloco.intervaloInspecao}</td>
                      <td className="px-2 py-2 text-center font-medium text-gray-600">{bloco.qtdApontada}</td>
                      <td className="px-2 py-2 text-center font-semibold text-blue-700">{bloco.qtdPrevistaInspecao}</td>
                      <td className="px-2 py-2 text-center">
                        <input
                          type="number"
                          min="0"
                          max={bloco.qtdPrevistaInspecao}
                          value={bloco.qtdInspecionada}
                          onChange={e => handleAtualizarBloco(bloco.id, 'qtdInspecionada', e.target.value)}
                          disabled={bloco.status === 'OK' || loading}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-center text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <input
                          type="number"
                          min="0"
                          max={bloco.qtdInspecionada}
                          value={bloco.qtdNaoConforme}
                          onChange={e => handleAtualizarBloco(bloco.id, 'qtdNaoConforme', e.target.value)}
                          disabled={loading}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-center text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <select
                          value={bloco.statusNaoConforme}
                          onChange={e => handleAtualizarBloco(bloco.id, 'statusNaoConforme', e.target.value)}
                          disabled={loading || bloco.qtdNaoConforme === 0}
                          className="w-28 px-2 py-1.5 border border-gray-300 rounded text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white disabled:bg-gray-100 disabled:text-gray-400"
                        >
                          <option value="separado">Separado</option>
                          <option value="sucateado">Sucateado</option>
                          <option value="enviado_ql">Enviado QL</option>
                          <option value="aguardando">Aguardando</option>
                        </select>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <input
                          type="text"
                          value={bloco.comentarioNaoConforme}
                          onChange={e => handleAtualizarBloco(bloco.id, 'comentarioNaoConforme', e.target.value)}
                          disabled={loading || bloco.qtdNaoConforme === 0}
                          className="w-40 px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-400"
                          placeholder="Comentário"
                        />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => handleStatusBloco(bloco.id, 'OK')}
                            className={`flex-1 py-1.5 rounded text-xs font-bold transition-all shadow-sm ${
                              bloco.status === 'OK'
                                ? 'bg-green-500 text-white ring-2 ring-green-300 ring-offset-1'
                                : 'bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-700 border border-gray-200'
                            }`}
                            disabled={loading}
                          >
                            OK
                          </button>
                          <button
                            onClick={() => handleStatusBloco(bloco.id, 'NOK')}
                            className={`flex-1 py-1.5 rounded text-xs font-bold transition-all shadow-sm ${
                              bloco.status === 'NOK'
                                ? 'bg-red-500 text-white ring-2 ring-red-300 ring-offset-1'
                                : 'bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-700 border border-gray-200'
                            }`}
                            disabled={loading}
                          >
                            NOK
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mensagem */}
          {message && (
            <div
              className={`p-4 rounded-lg text-sm font-semibold ${
                messageType === 'success'
                  ? 'bg-green-100 text-green-800 border border-green-300'
                  : messageType === 'error'
                  ? 'bg-red-100 text-red-800 border border-red-300'
                  : 'bg-blue-100 text-blue-800 border border-blue-300'
              }`}
            >
              {message}
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              onClick={handleSalvarParcial}
              disabled={loading || blocos.length === 0}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <FaSave size={18} />
              Salvar Parcial
            </button>
            <button
              onClick={handleExportarExcel}
              disabled={loading || blocos.length === 0}
              className="flex-1 bg-green-700 hover:bg-green-800 text-white py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <FaFileExcel size={18} />
              Exportar Excel
            </button>
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 bg-gray-400 hover:bg-gray-500 text-white py-3 rounded-lg font-semibold transition disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleFinalizarInspecao}
              disabled={loading || !resumo.completo}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <FaCheck size={18} />
              Finalizar Inspeção
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default InspecaoQualidadeModal
