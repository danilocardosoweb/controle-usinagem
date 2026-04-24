/**
 * LocalPrintService - Impressão via Print Service Local
 * 
 * Comunica com o Print Service rodando em localhost:9001
 * Permite imprimir em impressoras Windows sem backend complexo
 */

class LocalPrintService {
  static SERVICE_URL = 'http://localhost:9001'

  /**
   * Verifica se o Print Service está rodando
   */
  static async isServiceRunning() {
    try {
      const response = await fetch(`${LocalPrintService.SERVICE_URL}/status`, {
        method: 'GET',
        timeout: 2000
      })
      return response.ok
    } catch (error) {
      console.error('❌ Print Service não está rodando:', error)
      return false
    }
  }

  /**
   * Lista todas as impressoras disponíveis no Windows
   */
  static async listarImpressoras() {
    try {
      const response = await fetch(`${LocalPrintService.SERVICE_URL}/printers`)
      
      if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log('✅ Impressoras encontradas:', data.printers)
      return data.printers || []
    } catch (error) {
      console.error('❌ Erro ao listar impressoras:', error)
      return []
    }
  }

  /**
   * Envia TSPL para impressora via Print Service
   * @param {string} nomeImpressora - Nome da impressora Windows
   * @param {string} tspl - Comandos TSPL
   */
  static async enviarTspl(nomeImpressora, tspl) {
    try {
      // Validar entrada
      if (!nomeImpressora || !tspl) {
        throw new Error('Faltam parâmetros: nomeImpressora e tspl')
      }

      // Preparar payload
      const payload = {
        printer: nomeImpressora,
        data: tspl
      }

      // Enviar para Print Service
      const response = await fetch(`${LocalPrintService.SERVICE_URL}/print`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `Erro HTTP ${response.status}`)
      }

      const result = await response.json()
      console.log('✅ TSPL enviado com sucesso:', result)
      return result
    } catch (error) {
      console.error('❌ Erro ao enviar TSPL:', error)
      throw error
    }
  }

  /**
   * Testa conexão com a impressora
   */
  static async testarConexao(nomeImpressora) {
    const tsplTeste = 'SIZE 100 mm,45 mm\nGAP 2 mm,0 mm\nCLS\nTEXT 10,10,"0",0,1,1,"TESTE LOCAL PRINT SERVICE"\nPRINT 1,1\n'
    return await LocalPrintService.enviarTspl(nomeImpressora, tsplTeste)
  }

  /**
   * Obtém mensagem de status do serviço
   */
  static async getStatusMessage() {
    const isRunning = await LocalPrintService.isServiceRunning()
    
    if (isRunning) {
      return {
        status: 'ok',
        message: '✅ Print Service está rodando em http://localhost:9001',
        icon: '✅'
      }
    } else {
      return {
        status: 'error',
        message: '❌ Print Service não está rodando. Execute: iniciar_print_service.bat',
        icon: '❌'
      }
    }
  }
}

export default LocalPrintService
