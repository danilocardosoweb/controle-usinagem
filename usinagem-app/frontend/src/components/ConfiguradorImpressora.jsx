import { useState, useEffect } from 'react'
import PrintService from '../services/PrintService'
import WebSerialPrintService, { isWebSerialSupported, getWebSerialSupportMessage } from '../services/WebSerialPrintService'

export default function ConfiguradorImpressora({ tipo, config, onUpdate, onTestar }) {
  const [portasComDisponiveis, setPortasComDisponiveis] = useState([])
  const [impressorasWindowsDisponiveis, setImpressorasWindowsDisponiveis] = useState([])
  const [carregandoPortas, setCarregandoPortas] = useState(false)
  const [carregandoImpressoras, setCarregandoImpressoras] = useState(false)
  const [webSerialSupported, setWebSerialSupported] = useState(false)
  const [webSerialPort, setWebSerialPort] = useState(null)

  // Carregar portas COM quando tipo for usb_com
  useEffect(() => {
    if (config.tipo === 'usb_com') {
      carregarPortasCom()
    }
  }, [config.tipo])

  // Carregar impressoras Windows quando tipo for compartilhada_windows
  useEffect(() => {
    if (config.tipo === 'compartilhada_windows') {
      carregarImpressorasWindows()
    }
  }, [config.tipo])

  // Verificar suporte ao Web Serial API
  useEffect(() => {
    setWebSerialSupported(isWebSerialSupported())
  }, [])

  // Conectar via Web Serial API
  const conectarWebSerial = async () => {
    try {
      const service = new WebSerialPrintService()
      const port = await service.requestPort()
      setWebSerialPort(port)
      onUpdate('webSerialPort', port)
      alert('✅ Porta serial conectada com sucesso!\n\nA impressora está pronta para uso.')
    } catch (e) {
      console.error('❌ Erro ao conectar Web Serial:', e)
      alert(`Erro ao conectar:\n${e.message}`)
    }
  }

  const carregarPortasCom = async () => {
    setCarregandoPortas(true)
    try {
      console.log('🔄 Buscando portas COM/USB...')
      const backend = (import.meta?.env?.VITE_BACKEND_URL || 'http://localhost:8000').replace(/\/+$/, '')
      const resp = await fetch(`${backend}/api/print/portas-com`)
      
      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}))
        throw new Error(errData.detail || `Erro HTTP ${resp.status}`)
      }
      
      const resultado = await resp.json()
      console.log('✅ Portas encontradas:', resultado.portas)
      setPortasComDisponiveis(resultado.portas || [])
      
      if (!resultado.portas || resultado.portas.length === 0) {
        alert('Nenhuma porta COM/USB detectada.\n\nVerifique se:\n1. O cabo USB está conectado\n2. O driver da impressora está instalado\n3. A impressora está ligada')
      }
    } catch (e) {
      console.error('❌ Erro ao carregar portas COM:', e)
      alert(`Erro ao detectar portas COM:\n${e.message}`)
    } finally {
      setCarregandoPortas(false)
    }
  }

  const carregarImpressorasWindows = async () => {
    setCarregandoImpressoras(true)
    try {
      console.log('🔄 Buscando impressoras Windows...')
      const backend = (import.meta?.env?.VITE_BACKEND_URL || 'http://localhost:8000').replace(/\/+$/, '')
      const resp = await fetch(`${backend}/api/print/impressoras-windows`)
      
      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}))
        throw new Error(errData.detail || `Erro HTTP ${resp.status}`)
      }
      
      const resultado = await resp.json()
      console.log('✅ Impressoras encontradas:', resultado.impressoras)
      setImpressorasWindowsDisponiveis(resultado.impressoras || [])
      
      if (!resultado.impressoras || resultado.impressoras.length === 0) {
        alert('Nenhuma impressora compartilhada detectada.\n\nVerifique se:\n1. Existem impressoras compartilhadas na rede\n2. Você tem permissão de acesso')
      }
    } catch (e) {
      console.error('❌ Erro ao carregar impressoras Windows:', e)
      alert(`Erro ao detectar impressoras:\n${e.message}`)
    } finally {
      setCarregandoImpressoras(false)
    }
  }

  const handleTipoChange = (novoTipo) => {
    onUpdate('tipo', novoTipo)
  }

  const handleChange = (campo, valor) => {
    onUpdate(campo, valor)
  }

  const icone = tipo === 'termica' ? '🏷️' : '🖨️'
  const titulo = tipo === 'termica' ? 'Impressora Térmica (Etiquetas)' : 'Impressora Comum (Documentos)'

  return (
    <div className="border border-gray-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-md font-medium text-gray-800 flex items-center">
          {icone} {titulo}
        </h3>
        <div className="flex items-center space-x-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={config.ativa}
              onChange={(e) => handleChange('ativa', e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-gray-600">Ativa</span>
          </label>
          <button
            type="button"
            onClick={() => onTestar(tipo)}
            className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
          >
            Testar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Nome da Impressora */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome da Impressora
          </label>
          <input
            type="text"
            className="input-field"
            value={config.nome}
            onChange={(e) => handleChange('nome', e.target.value)}
            placeholder="Ex: Zebra ZT230"
          />
        </div>

        {/* Tipo de Impressora */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tipo de Conexão
          </label>
          <select
            className="input-field"
            value={config.tipo || 'rede_ip'}
            onChange={(e) => handleTipoChange(e.target.value)}
          >
            <option value="local_print_service">🖨️ Local Print Service (Windows)</option>
            <option value="web_serial">🌐 Web Serial API (USB Direto)</option>
            <option value="rede_ip">Rede IP (RAW/LPR)</option>
            <option value="usb_com">USB/COM (Serial via Backend)</option>
            <option value="compartilhada_windows">Compartilhada Windows</option>
          </select>
          {config.tipo === 'web_serial' && (
            <p className="text-xs text-blue-600 mt-1">
              {getWebSerialSupportMessage()}
            </p>
          )}
        </div>

        {/* Campos específicos para Rede IP */}
        {config.tipo === 'rede_ip' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Endereço IP
              </label>
              <input
                type="text"
                className="input-field"
                value={config.ip || ''}
                onChange={(e) => handleChange('ip', e.target.value)}
                placeholder="Ex: 192.168.0.138"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Porta
              </label>
              <input
                type="text"
                className="input-field"
                value={config.porta || '9100'}
                onChange={(e) => handleChange('porta', e.target.value)}
                placeholder="Ex: 9100 ou 515"
              />
              <p className="text-xs text-gray-500 mt-1">
                Porta 515 = LPR/LPD | Porta 9100 = RAW
              </p>
            </div>
          </>
        )}

        {/* Campos específicos para USB/COM */}
        {config.tipo === 'usb_com' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Porta COM/USB
              </label>
              <div className="flex gap-2">
                <select
                  className="input-field flex-1"
                  value={config.portaCom || ''}
                  onChange={(e) => handleChange('portaCom', e.target.value)}
                >
                  <option value="">Selecione uma porta...</option>
                  {portasComDisponiveis.map((p) => (
                    <option key={p.porta} value={p.porta}>
                      {p.porta} - {p.descricao}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={carregarPortasCom}
                  disabled={carregandoPortas}
                  className="px-3 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600 disabled:bg-gray-400"
                >
                  {carregandoPortas ? '...' : '🔄'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Velocidade (Baud)
              </label>
              <select className="input-field" defaultValue="9600">
                <option value="9600">9600</option>
                <option value="19200">19200</option>
                <option value="38400">38400</option>
                <option value="115200">115200</option>
              </select>
            </div>
          </>
        )}

        {/* Campos específicos para Local Print Service */}
        {config.tipo === 'local_print_service' && (
          <>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome da Impressora Windows (Local ou Compartilhada)
              </label>
              <div className="flex gap-2">
                <select
                  className="input-field flex-1"
                  value={config.nomeImpressora || ''}
                  onChange={(e) => handleChange('nomeImpressora', e.target.value)}
                >
                  <option value="">Selecione uma impressora...</option>
                  {impressorasWindowsDisponiveis.map((imp) => (
                    <option key={imp.nome} value={imp.nome}>
                      {imp.nome}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={carregarImpressorasWindows}
                  disabled={carregandoImpressoras}
                  className="px-3 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600 disabled:bg-gray-400"
                >
                  {carregandoImpressoras ? '...' : '🔄'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Serviço rodando em http://localhost:9001
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ou digite manualmente
              </label>
              <input
                type="text"
                className="input-field"
                value={config.nomeImpressora || ''}
                onChange={(e) => handleChange('nomeImpressora', e.target.value)}
                placeholder="Ex: TSC TE200 ou \\192.168.0.138\TTP-EXP"
              />
              <p className="text-xs text-gray-500 mt-1">
                💡 Para impressora compartilhada em rede, use: \\192.168.0.138\TTP-EXP
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Largura da Etiqueta (mm)
              </label>
              <input
                type="number"
                min="10"
                step="1"
                className="input-field"
                value={config.larguraEtiquetaMm || 100}
                onChange={(e) => handleChange('larguraEtiquetaMm', e.target.value)}
                placeholder="Ex: 100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Altura da Etiqueta (mm)
              </label>
              <input
                type="number"
                min="10"
                step="1"
                className="input-field"
                value={config.alturaEtiquetaMm || 45}
                onChange={(e) => handleChange('alturaEtiquetaMm', e.target.value)}
                placeholder="Ex: 45"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                GAP entre Etiquetas (mm)
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                className="input-field"
                value={config.gapEtiquetaMm ?? 3}
                onChange={(e) => handleChange('gapEtiquetaMm', e.target.value)}
                placeholder="Ex: 3"
              />
              <p className="text-xs text-gray-500 mt-1">
                Distância entre uma etiqueta e outra usada para a impressora localizar o início da mídia.
              </p>
            </div>
          </>
        )}

        {/* Campos específicos para Compartilhada Windows */}
        {config.tipo === 'compartilhada_windows' && (
          <>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Caminho da Impressora Compartilhada
              </label>
              <div className="flex gap-2">
                <select
                  className="input-field flex-1"
                  value={config.caminhoCompartilhada || ''}
                  onChange={(e) => handleChange('caminhoCompartilhada', e.target.value)}
                >
                  <option value="">Selecione uma impressora...</option>
                  {impressorasWindowsDisponiveis.map((imp) => (
                    <option key={imp.caminho} value={imp.caminho}>
                      {imp.nome} - {imp.descricao}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={carregarImpressorasWindows}
                  disabled={carregandoImpressoras}
                  className="px-3 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600 disabled:bg-gray-400"
                >
                  {carregandoImpressoras ? '...' : '🔄'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Formato: \\servidor\impressora ou \\192.168.1.100\impressora
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ou digite manualmente
              </label>
              <input
                type="text"
                className="input-field"
                value={config.caminhoCompartilhada || ''}
                onChange={(e) => handleChange('caminhoCompartilhada', e.target.value)}
                placeholder="Ex: \\servidor\impressora_termica"
              />
            </div>
          </>
        )}

        {/* Campos específicos para Web Serial API */}
        {config.tipo === 'web_serial' && (
          <>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Conexão USB Direta (Web Serial API)
              </label>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <p className="text-sm text-blue-800 mb-2">
                      {webSerialPort ? (
                        <span className="flex items-center gap-2">
                          <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                          <strong>Conectado!</strong> Impressora pronta para uso.
                        </span>
                      ) : (
                        <span>
                          <strong>Não conectado.</strong> Clique no botão para conectar à impressora USB.
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-blue-600">
                      💡 O navegador pedirá permissão para acessar a porta USB. Selecione sua impressora térmica.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={conectarWebSerial}
                    disabled={!webSerialSupported}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {webSerialPort ? '🔄 Reconectar' : '🔌 Conectar USB'}
                  </button>
                </div>
                {!webSerialSupported && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-xs text-yellow-800">
                      ⚠️ Web Serial API não suportada neste navegador.
                      <br />
                      Use <strong>Chrome 89+</strong> ou <strong>Edge 89+</strong> para usar esta funcionalidade.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Caminho de Rede (compatibilidade com versão antiga) */}
        {config.tipo !== 'usb_com' && config.tipo !== 'web_serial' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Caminho de Rede (legado)
            </label>
            <input
              type="text"
              className="input-field"
              value={config.caminho || ''}
              onChange={(e) => handleChange('caminho', e.target.value)}
              placeholder="Ex: \\192.168.1.100\Zebra_ZT230"
            />
          </div>
        )}
      </div>
    </div>
  )
}
