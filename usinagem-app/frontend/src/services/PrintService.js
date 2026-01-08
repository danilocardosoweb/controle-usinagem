import WebSerialPrintService from './WebSerialPrintService'
import LocalPrintService from './LocalPrintService'

class PrintService {
  // Instância singleton do Web Serial Service
  static webSerialService = null

  static async enviarTspl({ tipo = 'rede_ip', ip = '', porta = 9100, portaCom = '', caminhoCompartilhada = '', tspl, timeoutMs = 3000, webSerialPort = null, nomeImpressora = '' }) {
    const backend = (import.meta?.env?.VITE_BACKEND_URL || 'http://localhost:8000').replace(/\/+$/, '')

    const payload = {
      tipo: tipo || 'rede_ip',
      tspl,
      timeout_ms: Number(timeoutMs || 3000)
    }

    // Se for Local Print Service, usar backend como proxy
    if (tipo === 'local_print_service') {
      if (!nomeImpressora) {
        throw new Error('Nome da impressora não informado')
      }

      payload.tipo = 'local_print_service'
      payload.nome_impressora = nomeImpressora

      const resp = await fetch(`${backend}/api/print/tspl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!resp.ok) {
        let detail = ''
        try {
          const data = await resp.json()
          detail = data?.detail ? String(data.detail) : ''
        } catch {
          detail = await resp.text()
        }
        throw new Error(detail || `Erro HTTP ${resp.status}`)
      }

      return resp.json()
    }

    // Se for Web Serial API, usar impressão direta do navegador
    if (tipo === 'web_serial') {
      if (!WebSerialPrintService.isSupported()) {
        throw new Error('Web Serial API não suportada. Use Chrome 89+ ou Edge 89+')
      }

      // Criar ou reutilizar instância do Web Serial Service
      if (!PrintService.webSerialService) {
        PrintService.webSerialService = new WebSerialPrintService()
      }

      // Se já tiver uma porta conectada, usar ela
      if (webSerialPort) {
        PrintService.webSerialService.port = webSerialPort
        PrintService.webSerialService.writer = webSerialPort.writable.getWriter()
      }

      // Se não estiver conectado, tentar reconectar ou solicitar permissão
      if (!PrintService.webSerialService.isConnected()) {
        try {
          await PrintService.webSerialService.reconnect()
        } catch {
          // Se falhar reconexão, solicitar nova permissão
          await PrintService.webSerialService.requestPort()
        }
      }

      // Enviar TSPL via Web Serial
      await PrintService.webSerialService.enviarTspl(tspl)
      return { ok: true, method: 'web_serial' }
    }

    // Para outros tipos, usar backend
    if (tipo === 'rede_ip') {
      payload.ip = ip || ''
      payload.porta = Number(porta || 9100)
    } else if (tipo === 'usb_com') {
      payload.porta_com = portaCom || ''
    } else if (tipo === 'compartilhada_windows') {
      payload.caminho_compartilhada = caminhoCompartilhada || ''
    }

    const resp = await fetch(`${backend}/api/print/tspl`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!resp.ok) {
      let detail = ''
      try {
        const data = await resp.json()
        detail = data?.detail ? String(data.detail) : ''
      } catch {
        detail = await resp.text()
      }
      throw new Error(detail || `Erro HTTP ${resp.status}`)
    }

    return resp.json()
  }

  static async listarPortasCom() {
    const backend = (import.meta?.env?.VITE_BACKEND_URL || 'http://localhost:8000').replace(/\/+$/, '')
    
    try {
      const resp = await fetch(`${backend}/api/print/portas-com`)
      if (!resp.ok) throw new Error(`Erro HTTP ${resp.status}`)
      return resp.json()
    } catch (e) {
      console.error('Erro ao listar portas COM:', e)
      return { portas: [] }
    }
  }

  static async listarImpressorasWindows() {
    const backend = (import.meta?.env?.VITE_BACKEND_URL || 'http://localhost:8000').replace(/\/+$/, '')
    
    try {
      const resp = await fetch(`${backend}/api/print/impressoras-windows`)
      if (!resp.ok) throw new Error(`Erro HTTP ${resp.status}`)
      return resp.json()
    } catch (e) {
      console.error('Erro ao listar impressoras Windows:', e)
      return { impressoras: [] }
    }
  }

  static mmToDots(mm) {
    const v = Number(mm)
    if (!Number.isFinite(v)) return 0
    return Math.round(v * 8) // 203dpi ~= 8 dots/mm
  }

  static _tsplSafeText(text) {
    return String(text || '').replace(/"/g, "'")
  }

  /**
   * Gera comandos TSPL para etiqueta 100x45mm na TSC TE200 (203 DPI)
   * 
   * ESPECIFICAÇÕES TÉCNICAS:
   * - Etiqueta física: 100mm (largura) x 45mm (altura)
   * - Resolução: 203 DPI = 8 dots/mm
   * - Largura em dots: 100 × 8 = 800 dots
   * - Altura em dots: 45 × 8 = 360 dots
   * - Orientação: Paisagem (etiqueta mais larga que alta)
   */
  static gerarEtiquetaTspl({
    lote,
    loteMP,
    rack,
    qtde,
    ferramenta,
    dureza,
    numeroEtiqueta,
    totalEtiquetas,
    codigoProdutoCliente,
    nomeCliente,
    comprimento,
    pedidoCliente
  }) {
    // Etiqueta 100mm x 45mm (800 x 360 dots em 203dpi)
    const widthMm = 100
    const heightMm = 45
    const widthDots = 800  // 100mm × 8 dots/mm
    const heightDots = 360 // 45mm × 8 dots/mm
    const xColEsq = 40   // coluna esquerda
    const xColDir = 380  // coluna direita (mais próxima do centro)

    const safeLote = this._tsplSafeText(lote)
    const safeMp = this._tsplSafeText(loteMP)
    const safeRack = this._tsplSafeText(rack)
    const safeQtde = this._tsplSafeText(qtde)
    const safeFerr = this._tsplSafeText(ferramenta)
    const safeDur = this._tsplSafeText(dureza)
    const safeCodCli = this._tsplSafeText(codigoProdutoCliente)
    const safeNome = this._tsplSafeText(nomeCliente)
    const safeComp = this._tsplSafeText(comprimento)
    const safePedidoCliente = this._tsplSafeText(pedidoCliente)
    const loteLine1 = String(safeLote || '').slice(0, 32)
    const loteLine2 = String(safeLote || '').slice(32, 64)

    // Gerar ID único baseado no lote e data
    const idEtiqueta = `${String(lote || '').replace(/[^a-zA-Z0-9]/g, '').substring(0, 16)}${String(numeroEtiqueta).padStart(4, '0')}`

    const lines = [
      // ========== COMANDOS DE RESET E INICIALIZAÇÃO ==========
      `\r\n`,
      `SIZE ${widthMm} mm,${heightMm} mm`,
      `GAP 3 mm,0 mm`,
      `DIRECTION 1`,
      `DENSITY 8`,
      `SPEED 6`,
      `REFERENCE 0,0`,
      `OFFSET 0 mm`,
      `SHIFT 0`,
      `CLS`,
      
      // ========== TÍTULO NO TOPO ==========
      // Fonte "3" (maior, mais destacada), texto sem acento para evitar falhas
      `TEXT ${Math.floor(widthDots / 2) - 180},18,"3",0,1,1,"TECNOPERFIL ALUMINIO"`,

      // ========== CONTEÚDO PRINCIPAL (mais espaçado) ==========
      // Coluna esquerda
      `TEXT ${xColEsq},70,"2",0,1,1,"Qtde: ${safeQtde} PC"`,
      `TEXT ${xColEsq},105,"2",0,1,1,"Perfil: ${safeFerr}"`,
      `TEXT ${xColEsq},140,"2",0,1,1,"Dureza: ${safeDur}"`,
      `TEXT ${xColEsq},175,"2",0,1,1,"Comp.: ${safeComp || '-'} mm"`,

      `TEXT ${xColEsq},215,"2",0,1,1,"Cod. Cliente: ${safeCodCli || '-'}"`,
      `TEXT ${xColEsq},250,"2",0,1,1,"Nome: ${safeNome || '-'}"`,

      // Coluna direita (aproximada do centro)
      `TEXT ${xColDir},105,"2",0,1,1,"Rack: ${safeRack}"`,
      `TEXT ${xColDir},140,"2",0,1,1,"Lote MP: ${safeMp || '-'}"`,

      `TEXT ${xColDir},185,"2",0,1,1,"Pedido.Cliente: ${safePedidoCliente || '-'}"`,

      // Rodapé: Lote Usinagem
      `TEXT ${xColEsq},300,"2",0,1,1,"Lote Usinagem:"`,
      `TEXT ${xColEsq},325,"2",0,1,1,"${loteLine1 || '-'}"`,
      (loteLine2 ? `TEXT ${xColEsq},350,"2",0,1,1,"${loteLine2}"` : ''),

      // Finalização obrigatória do job TSPL (Solução 1: PRINT + FEED)
      // Para impressão unitária mantemos PRINT + FEED dentro do mesmo job
      `PRINT 1,1`,
      `FEED 1`
    ].filter(Boolean)

    return lines.join('\r\n')
  }

  /**
   * Gera comandos TSPL para múltiplas etiquetas em um único job
   * Isso é mais eficiente e evita problemas de buffer
   */
  static gerarMultiplasEtiquetas(etiquetas) {
    if (!etiquetas || etiquetas.length === 0) return ''

    const widthMm = 100
    const heightMm = 45

    // Header do job (configuração única)
    const header = [
      `\r\n`,
      `SIZE ${widthMm} mm,${heightMm} mm`,
      `GAP 3 mm,0 mm`,
      `DIRECTION 1`,
      `DENSITY 8`,
      `SPEED 6`,
      `REFERENCE 0,0`,
      `OFFSET 0 mm`,
      `SHIFT 0`,
      ``
    ].join('\r\n')

    // Gerar cada etiqueta sem os comandos SIZE/GAP (já definidos no header)
    const etiquetasCommands = etiquetas.map((dados, index) => {
      return this._gerarConteudoEtiqueta({
        ...dados,
        numeroEtiqueta: index + 1,
        totalEtiquetas: etiquetas.length
      })
    }).join('\r\n')

    // Para múltiplas etiquetas, cada conteúdo termina em PRINT 1,1 e
    // enviamos um único FEED 1 ao final do job para evitar delays
    const footer = ['FEED 1', ''].join('\r\n')

    return header + etiquetasCommands + '\r\n' + footer
  }

  /**
   * Gera apenas o conteúdo de uma etiqueta (sem SIZE/GAP)
   * Para uso em impressão sequencial
   */
  static _gerarConteudoEtiqueta({
    lote,
    loteMP,
    rack,
    qtde,
    ferramenta,
    dureza,
    numeroEtiqueta,
    totalEtiquetas,
    codigoProdutoCliente,
    nomeCliente,
    comprimento,
    pedidoCliente
  }) {
    const widthDots = 800
    const heightDots = 360
    const xColEsq = 40
    const xColDir = 380

    const safeLote = this._tsplSafeText(lote)
    const safeMp = this._tsplSafeText(loteMP)
    const safeRack = this._tsplSafeText(rack)
    const safeQtde = this._tsplSafeText(qtde)
    const safeFerr = this._tsplSafeText(ferramenta)
    const safeDur = this._tsplSafeText(dureza)
    const safeCodCli = this._tsplSafeText(codigoProdutoCliente)
    const safeNome = this._tsplSafeText(nomeCliente)
    const safeComp = this._tsplSafeText(comprimento)
    const safePedidoCliente = this._tsplSafeText(pedidoCliente)

    const loteLine1 = String(safeLote || '').slice(0, 32)
    const loteLine2 = String(safeLote || '').slice(32, 64)

    const idEtiqueta = `${String(lote || '').replace(/[^a-zA-Z0-9]/g, '').substring(0, 16)}${String(numeroEtiqueta).padStart(4, '0')}`

    const lines = [
      `CLS`,

      // Título no topo (mesma fonte/posição da impressão única)
      `TEXT ${Math.floor(widthDots / 2) - 180},18,"3",0,1,1,"TECNOPERFIL ALUMINIO"`,

      // Coluna esquerda
      `TEXT ${xColEsq},70,"2",0,1,1,"Qtde: ${safeQtde} PC"`,
      `TEXT ${xColEsq},105,"2",0,1,1,"Perfil: ${safeFerr}"`,
      `TEXT ${xColEsq},140,"2",0,1,1,"Dureza: ${safeDur}"`,
      `TEXT ${xColEsq},175,"2",0,1,1,"Comp.: ${safeComp || '-'} mm"`,

      `TEXT ${xColEsq},215,"2",0,1,1,"Cod. Cliente: ${safeCodCli || '-'}"`,
      `TEXT ${xColEsq},250,"2",0,1,1,"Nome: ${safeNome || '-'}"`,

      // Coluna direita
      `TEXT ${xColDir},105,"2",0,1,1,"Rack: ${safeRack}"`,
      `TEXT ${xColDir},140,"2",0,1,1,"Lote MP: ${safeMp || '-'}"`,

      `TEXT ${xColDir},185,"2",0,1,1,"Pedido.Cliente: ${safePedidoCliente || '-'}"`,

      // Rodapé
      `TEXT ${xColEsq},300,"2",0,1,1,"Lote Usinagem:"`,
      `TEXT ${xColEsq},325,"2",0,1,1,"${loteLine1 || '-'}"`,
      (loteLine2 ? `TEXT ${xColEsq},350,"2",0,1,1,"${loteLine2}"` : ''),

      // Para uso em múltiplas etiquetas, aqui finalizamos apenas com PRINT.
      // O FEED 1 é enviado uma única vez no final do job em gerarMultiplasEtiquetas.
      `PRINT 1,1`
    ].filter(Boolean)

    return lines.join('\r\n')
  }
}

export default PrintService
