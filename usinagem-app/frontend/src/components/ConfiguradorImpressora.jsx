import { useState, useEffect } from 'react'
import PrintService from '../services/PrintService'

export default function ConfiguradorImpressora({ tipo, config, onUpdate, onTestar }) {
  const [portasComDisponiveis, setPortasComDisponiveis] = useState([])
  const [impressorasWindowsDisponiveis, setImpressorasWindowsDisponiveis] = useState([])
  const [carregandoPortas, setCarregandoPortas] = useState(false)
  const [carregandoImpressoras, setCarregandoImpressoras] = useState(false)

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
            <option value="rede_ip">Rede IP (RAW/LPR)</option>
            <option value="usb_com">USB/COM (Serial)</option>
            <option value="compartilhada_windows">Compartilhada Windows</option>
          </select>
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

        {/* Caminho de Rede (compatibilidade com versão antiga) */}
        {config.tipo !== 'usb_com' && (
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
