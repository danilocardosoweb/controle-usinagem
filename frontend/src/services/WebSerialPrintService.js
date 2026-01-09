/**
 * WebSerialPrintService - Impressão direta via Web Serial API
 * 
 * Permite impressão em impressoras térmicas USB/Serial diretamente do navegador
 * sem necessidade de backend intermediário.
 * 
 * Requisitos:
 * - Navegador compatível (Chrome 89+, Edge 89+)
 * - Impressora conectada via USB/Serial
 * - Permissão do usuário para acessar porta serial
 */

class WebSerialPrintService {
  constructor() {
    this.port = null
    this.reader = null
    this.writer = null
  }

  /**
   * Verifica se o navegador suporta Web Serial API
   */
  static isSupported() {
    return 'serial' in navigator
  }

  /**
   * Solicita permissão ao usuário e conecta à porta serial
   * @param {Object} options - Opções de conexão
   * @param {number} options.baudRate - Velocidade (padrão: 9600)
   * @param {number} options.dataBits - Bits de dados (padrão: 8)
   * @param {number} options.stopBits - Bits de parada (padrão: 1)
   * @param {string} options.parity - Paridade (padrão: 'none')
   * @returns {Promise<SerialPort>}
   */
  async requestPort(options = {}) {
    if (!WebSerialPrintService.isSupported()) {
      throw new Error('Web Serial API não suportada neste navegador. Use Chrome 89+ ou Edge 89+')
    }

    try {
      // Solicitar permissão ao usuário para selecionar porta
      this.port = await navigator.serial.requestPort()
      
      // Configurações padrão para impressoras térmicas
      const defaultOptions = {
        baudRate: 9600,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        flowControl: 'none'
      }

      // Abrir porta com configurações
      await this.port.open({ ...defaultOptions, ...options })

      // Configurar streams de leitura/escrita
      this.writer = this.port.writable.getWriter()
      this.reader = this.port.readable.getReader()

      console.log('✅ Porta serial conectada:', this.port.getInfo())
      return this.port
    } catch (error) {
      console.error('❌ Erro ao conectar porta serial:', error)
      throw new Error(`Falha ao conectar: ${error.message}`)
    }
  }

  /**
   * Conecta a uma porta serial já autorizada anteriormente
   * @param {Object} options - Opções de conexão
   * @returns {Promise<SerialPort>}
   */
  async reconnect(options = {}) {
    if (!WebSerialPrintService.isSupported()) {
      throw new Error('Web Serial API não suportada')
    }

    try {
      // Obter portas já autorizadas
      const ports = await navigator.serial.getPorts()
      
      if (ports.length === 0) {
        throw new Error('Nenhuma porta autorizada. Use requestPort() primeiro.')
      }

      // Usar a primeira porta autorizada
      this.port = ports[0]

      const defaultOptions = {
        baudRate: 9600,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        flowControl: 'none'
      }

      await this.port.open({ ...defaultOptions, ...options })
      this.writer = this.port.writable.getWriter()
      this.reader = this.port.readable.getReader()

      console.log('✅ Reconectado à porta serial:', this.port.getInfo())
      return this.port
    } catch (error) {
      console.error('❌ Erro ao reconectar:', error)
      throw error
    }
  }

  /**
   * Lista portas seriais já autorizadas
   * @returns {Promise<Array>}
   */
  static async getAuthorizedPorts() {
    if (!WebSerialPrintService.isSupported()) {
      return []
    }

    try {
      const ports = await navigator.serial.getPorts()
      return ports.map(port => ({
        info: port.getInfo(),
        port: port
      }))
    } catch (error) {
      console.error('❌ Erro ao listar portas:', error)
      return []
    }
  }

  /**
   * Envia comandos TSPL para a impressora
   * @param {string} tspl - Comandos TSPL
   * @returns {Promise<boolean>}
   */
  async enviarTspl(tspl) {
    if (!this.port || !this.writer) {
      throw new Error('Porta serial não conectada. Use requestPort() ou reconnect() primeiro.')
    }

    try {
      // Converter string para bytes UTF-8
      const encoder = new TextEncoder()
      const data = encoder.encode(tspl)

      // Enviar dados para impressora
      await this.writer.write(data)

      console.log('✅ TSPL enviado com sucesso:', tspl.substring(0, 100) + '...')
      return true
    } catch (error) {
      console.error('❌ Erro ao enviar TSPL:', error)
      throw new Error(`Falha ao imprimir: ${error.message}`)
    }
  }

  /**
   * Desconecta da porta serial
   */
  async disconnect() {
    try {
      if (this.reader) {
        await this.reader.cancel()
        await this.reader.releaseLock()
        this.reader = null
      }

      if (this.writer) {
        await this.writer.releaseLock()
        this.writer = null
      }

      if (this.port) {
        await this.port.close()
        this.port = null
      }

      console.log('✅ Porta serial desconectada')
    } catch (error) {
      console.error('❌ Erro ao desconectar:', error)
    }
  }

  /**
   * Verifica se está conectado
   */
  isConnected() {
    return this.port !== null && this.writer !== null
  }

  /**
   * Obtém informações da porta conectada
   */
  getPortInfo() {
    if (!this.port) return null
    return this.port.getInfo()
  }

  /**
   * Testa a conexão enviando um comando simples
   */
  async testarConexao() {
    const tsplTeste = 'SIZE 100 mm,45 mm\nGAP 2 mm,0 mm\nCLS\nTEXT 10,10,"0",0,1,1,"TESTE WEB SERIAL"\nPRINT 1,1\n'
    return await this.enviarTspl(tsplTeste)
  }
}

// Exportar classe e função auxiliar
export default WebSerialPrintService

/**
 * Função auxiliar para verificar suporte
 */
export function isWebSerialSupported() {
  return WebSerialPrintService.isSupported()
}

/**
 * Função auxiliar para obter mensagem de suporte
 */
export function getWebSerialSupportMessage() {
  if (WebSerialPrintService.isSupported()) {
    return '✅ Web Serial API suportada'
  }
  
  const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor)
  const isEdge = /Edg/.test(navigator.userAgent)
  
  if (isChrome || isEdge) {
    return '⚠️ Web Serial API não disponível. Verifique se está usando HTTPS ou localhost.'
  }
  
  return '❌ Web Serial API não suportada. Use Chrome 89+ ou Edge 89+'
}
