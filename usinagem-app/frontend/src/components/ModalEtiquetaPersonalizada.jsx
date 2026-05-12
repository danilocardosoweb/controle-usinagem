import { useState } from 'react'
import { FaTimes, FaPrint, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa'
import { getConfiguracaoImpressoras, isImpressoraAtiva } from '../utils/impressoras'
import PrintService from '../services/PrintService'
import EtiquetaPaleteExportPreview from './EtiquetaPaleteExportPreview'

const ModalEtiquetaPersonalizada = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [messageType, setMessageType] = useState('info')
  const [showPreview, setShowPreview] = useState(false)
  
  const [etiqueta, setEtiqueta] = useState({
    produto: '',
    descricao: '',
    lote: '',
    quantidade: '',
    cliente: '',
    codigoCliente: '',
    material: '6060-T6',
    dureza: '',
    maquina: '',
    operador: '',
    dataProducao: new Date().toISOString().split('T')[0],
    qcStatus: 'APPROVED',
    rack: '',
    tipo: 'MACHINED / USINADO',
    fifo: 'AREA A',
    pedido: '',
    destination: '',
    hsCode: '7604.29.90',
    countryOfOrigin: 'MADE IN BRAZIL'
  })
  const [qtdEtiquetas, setQtdEtiquetas] = useState(1)

  const showMessage = (text, type = 'info') => {
    setMessage(text)
    setMessageType(type)
    if (type === 'success') {
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const imprimirEtiqueta = async () => {
    try {
      const impressoraTermica = getConfiguracaoImpressoras().termica

      if (!isImpressoraAtiva('termica')) {
        showMessage('Impressora térmica não está configurada ou ativa. Vá em Configurações > Impressoras para configurar.', 'error')
        return
      }

      if (!impressoraTermica?.ip) {
        showMessage('Impressora térmica sem IP configurado. Vá em Configurações > Impressoras e preencha o IP.', 'error')
        return
      }

      if (!etiqueta.produto || !etiqueta.lote) {
        showMessage('Produto e Lote são obrigatórios', 'error')
        return
      }

      setLoading(true)

      // Converter data de YYYY-MM-DD para DD/MM/YYYY para o TSPL
      const dataFormatada = etiqueta.dataProducao.split('-').reverse().join('/')

      for (let i = 0; i < qtdEtiquetas; i++) {
        const tspl = PrintService.gerarEtiquetaPaleteTspl({
          larguraEtiquetaMm: 100,
          alturaEtiquetaMm: 150,
          gapEtiquetaMm: Number(impressoraTermica.gapEtiquetaMm ?? 3),
          idPalete: `${etiqueta.lote}-${i + 1}`,
          codigoProduto: etiqueta.produto,
          descricao: etiqueta.descricao || etiqueta.produto,
          cliente: etiqueta.cliente,
          codigoCliente: etiqueta.codigoCliente,
          pedido: etiqueta.pedido,
          quantidade: etiqueta.quantidade,
          lote: etiqueta.lote,
          loteMP: '',
          rack: etiqueta.rack,
          material: etiqueta.material,
          maquina: etiqueta.maquina,
          operador: etiqueta.operador,
          dataProducao: dataFormatada,
          qrCode: '',
          tipo: etiqueta.tipo,
          fifo: etiqueta.fifo,
          dureza: etiqueta.dureza,
          status: 'PRODUCED / PRODUZIDO'
        })

        await PrintService.enviarTspl({
          tipo: impressoraTermica.tipo || 'local_print_service',
          ip: impressoraTermica.ip || '',
          porta: Number(impressoraTermica.porta || 9100),
          portaCom: impressoraTermica.portaCom || '',
          caminhoCompartilhada: impressoraTermica.caminhoCompartilhada || '',
          nomeImpressora: impressoraTermica.nomeImpressora || impressoraTermica.nome || 'TSC TE200',
          tspl
        })
      }

      showMessage(`${qtdEtiquetas} etiqueta(s) impresa(s) com sucesso!`, 'success')
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (error) {
      console.error('Erro ao imprimir etiqueta:', error)
      showMessage('Erro ao imprimir etiqueta: ' + error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FaPrint className="text-purple-600" />
            Etiqueta Personalizada 100x150mm
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
        <div className="p-6 space-y-4">
          {/* Abas */}
          <div className="flex gap-2 border-b border-gray-200 mb-4">
            <button
              onClick={() => setShowPreview(false)}
              className={`py-2 px-4 font-medium text-sm transition-colors ${!showPreview ? 'border-b-2 border-purple-600 text-purple-600' : 'text-gray-600 hover:text-gray-800'}`}
            >
              Editar
            </button>
            <button
              onClick={() => setShowPreview(true)}
              className={`py-2 px-4 font-medium text-sm transition-colors ${showPreview ? 'border-b-2 border-purple-600 text-purple-600' : 'text-gray-600 hover:text-gray-800'}`}
            >
              Visualizar
            </button>
          </div>

          {/* Preview */}
          {showPreview && (
            <div className="flex justify-center bg-gray-50 p-4 rounded-lg border border-gray-200">
              <EtiquetaPaleteExportPreview
                idPalete={`${etiqueta.lote}-001`}
                codigoProduto={etiqueta.produto}
                descricao={etiqueta.descricao || etiqueta.produto}
                cliente={etiqueta.cliente}
                codigoCliente={etiqueta.codigoCliente}
                pedido={etiqueta.pedido}
                quantidade={etiqueta.quantidade}
                lote={etiqueta.lote}
                loteMP=""
                rack={etiqueta.rack}
                material={etiqueta.material}
                maquina={etiqueta.maquina}
                operador={etiqueta.operador}
                dataProducao={etiqueta.dataProducao}
                tipo={etiqueta.tipo}
                fifo={etiqueta.fifo}
                dureza={etiqueta.dureza}
                status="PRODUCED / PRODUZIDO"
                hsCode={etiqueta.hsCode}
                countryOfOrigin={etiqueta.countryOfOrigin}
                destination={etiqueta.destination}
                qcStatus={etiqueta.qcStatus}
              />
            </div>
          )}

          {/* Formulário */}
          {!showPreview && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Produto *</label>
                <input
                  type="text"
                  value={etiqueta.produto}
                  onChange={(e) => setEtiqueta({ ...etiqueta, produto: e.target.value })}
                  placeholder="Ex: TG-2029"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lote *</label>
                <input
                  type="text"
                  value={etiqueta.lote}
                  onChange={(e) => setEtiqueta({ ...etiqueta, lote: e.target.value })}
                  placeholder="Ex: LOT-001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade</label>
                <input
                  type="text"
                  value={etiqueta.quantidade}
                  onChange={(e) => setEtiqueta({ ...etiqueta, quantidade: e.target.value })}
                  placeholder="Ex: 100 PC"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                <input
                  type="text"
                  value={etiqueta.cliente}
                  onChange={(e) => setEtiqueta({ ...etiqueta, cliente: e.target.value })}
                  placeholder="Ex: TRAMONTINA"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código Cliente</label>
                <input
                  type="text"
                  value={etiqueta.codigoCliente}
                  onChange={(e) => setEtiqueta({ ...etiqueta, codigoCliente: e.target.value })}
                  placeholder="Ex: 164121"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Material</label>
                <input
                  type="text"
                  value={etiqueta.material}
                  onChange={(e) => setEtiqueta({ ...etiqueta, material: e.target.value })}
                  placeholder="Ex: AA 6060-T6"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dureza</label>
                <input
                  type="text"
                  value={etiqueta.dureza}
                  onChange={(e) => setEtiqueta({ ...etiqueta, dureza: e.target.value })}
                  placeholder="Ex: HB"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Máquina</label>
                <input
                  type="text"
                  value={etiqueta.maquina}
                  onChange={(e) => setEtiqueta({ ...etiqueta, maquina: e.target.value })}
                  placeholder="Ex: Serra Doppia"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Operador</label>
                <input
                  type="text"
                  value={etiqueta.operador}
                  onChange={(e) => setEtiqueta({ ...etiqueta, operador: e.target.value })}
                  placeholder="Ex: Matheus"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rack/Palete</label>
                <input
                  type="text"
                  value={etiqueta.rack}
                  onChange={(e) => setEtiqueta({ ...etiqueta, rack: e.target.value })}
                  placeholder="Ex: USI-1386"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Produção</label>
                <input
                  type="date"
                  value={etiqueta.dataProducao}
                  onChange={(e) => setEtiqueta({ ...etiqueta, dataProducao: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status QC</label>
                <select
                  value={etiqueta.qcStatus}
                  onChange={(e) => setEtiqueta({ ...etiqueta, qcStatus: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={loading}
                >
                  <option value="APPROVED">APPROVED</option>
                  <option value="REJECTED">REJECTED</option>
                  <option value="PENDING">PENDING</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <input
                  type="text"
                  value={etiqueta.descricao}
                  onChange={(e) => setEtiqueta({ ...etiqueta, descricao: e.target.value })}
                  placeholder="Ex: TG-2012 - 1816mm"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pedido (P.O.)</label>
                <input
                  type="text"
                  value={etiqueta.pedido}
                  onChange={(e) => setEtiqueta({ ...etiqueta, pedido: e.target.value })}
                  placeholder="Ex: 85783/70"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Destino (DESTINATION)</label>
                <input
                  type="text"
                  value={etiqueta.destination}
                  onChange={(e) => setEtiqueta({ ...etiqueta, destination: e.target.value })}
                  placeholder="Ex: USA / CL / CA"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">HS Code</label>
                <input
                  type="text"
                  value={etiqueta.hsCode}
                  onChange={(e) => setEtiqueta({ ...etiqueta, hsCode: e.target.value })}
                  placeholder="Ex: 7604.29.90"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={loading}
                />
              </div>

              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200 col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Quantidade de Etiquetas a Imprimir</label>
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={qtdEtiquetas}
                  onChange={(e) => setQtdEtiquetas(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {/* Mensagens */}
          {message && (
            <div
              className={`p-3 rounded-lg flex items-start gap-2 ${
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

        {/* Footer */}
        <div className="flex gap-4 p-6 bg-gray-50 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 disabled:opacity-50 font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={imprimirEtiqueta}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
          >
            <FaPrint />
            {loading ? 'Imprimindo...' : 'Imprimir'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ModalEtiquetaPersonalizada
