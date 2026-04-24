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

    // Se for Local Print Service, usar LocalPrintService diretamente (porta 9001)
    if (tipo === 'local_print_service') {
      if (!nomeImpressora) {
        throw new Error('Nome da impressora não informado')
      }

      return await LocalPrintService.enviarTspl(nomeImpressora, tspl)
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

  static _normalizarDimensoesEtiqueta({ larguraMm, alturaMm } = {}) {
    const largura = Number(larguraMm)
    const altura = Number(alturaMm)

    return {
      larguraMm: Number.isFinite(largura) && largura > 0 ? largura : 100,
      alturaMm: Number.isFinite(altura) && altura > 0 ? altura : 45
    }
  }

  static _normalizarGapEtiqueta(gapMm) {
    const gap = Number(gapMm)
    return Number.isFinite(gap) && gap >= 0 ? gap : 3
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
    larguraEtiquetaMm = 100,
    alturaEtiquetaMm = 45,
    gapEtiquetaMm = 3,
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
    pedidoCliente,
    pedidoSeq
  }) {
    const { larguraMm: widthMm, alturaMm: heightMm } = this._normalizarDimensoesEtiqueta({
      larguraMm: larguraEtiquetaMm,
      alturaMm: alturaEtiquetaMm
    })
    const gapMm = this._normalizarGapEtiqueta(gapEtiquetaMm)
    const widthDots = this.mmToDots(widthMm)
    const heightDots = this.mmToDots(heightMm)
    const scaleX = widthDots / 800
    const scaleY = heightDots / 360
    const sx = (v) => Math.round(v * scaleX)
    const sy = (v) => Math.round(v * scaleY)
    const xColEsq = sx(15)
    const xColDir = sx(480)

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
    const safePedidoSeq = this._tsplSafeText(pedidoSeq)

    const tituloEmpresa = 'T E C N O P E R F I L  A L U M I N I O'

    const faixaX = sx(80)
    const faixaY = sy(10)
    const faixaW = sx(640)
    const faixaH = sy(36)

    // Gerar ID único baseado no lote e data
    const idEtiqueta = `${String(lote || '').replace(/[^a-zA-Z0-9]/g, '').substring(0, 16)}${String(numeroEtiqueta).padStart(4, '0')}`

    const lines = [
      // ========== COMANDOS DE RESET E INICIALIZAÇÃO ==========
      `\r\n`,
      `SIZE ${widthMm} mm,${heightMm} mm`,
      `GAP ${gapMm} mm,0 mm`,
      `DIRECTION 1`,
      `DENSITY 8`,
      `SPEED 6`,
      `REFERENCE 0,0`,
      `OFFSET 0 mm`,
      `SHIFT 0`,
      `CLS`,
      
      // ========== TÍTULO NO TOPO ==========
      // Fonte "3" (maior, mais destacada), texto sem acento para evitar falhas
      `TEXT ${faixaX + sx(10)},${sy(18)},"3",0,1,1,"${tituloEmpresa}"`,
      `TEXT ${faixaX + sx(11)},${sy(18)},"3",0,1,1,"${tituloEmpresa}"`,
      `REVERSE ${faixaX},${faixaY},${faixaW},${faixaH}`,

      // ========== CONTEÚDO PRINCIPAL (mais espaçado) ==========
      // Coluna 1
      `TEXT ${xColEsq},${sy(70)},"2",0,1,1,"Nome: ${safeNome || '-'}"`,
      `TEXT ${xColEsq},${sy(105)},"2",0,1,1,"Pedido Cliente: ${safePedidoCliente || '-'}"`,
      `TEXT ${xColEsq},${sy(140)},"2",0,1,1,"Perfil: ${safeFerr}"`,
      `TEXT ${xColEsq},${sy(175)},"2",0,1,1,"Comp.: ${safeComp || '-'} mm"`,
      `TEXT ${xColEsq},${sy(210)},"2",0,1,1,"Rack: ${safeRack}"`,
      `TEXT ${xColEsq},${sy(245)},"2",0,1,1,"Lote MP: ${safeMp || '-'}"`,

      // Coluna 2
      `TEXT ${xColDir},${sy(70)},"2",0,1,1,"Cod. Cliente: ${safeCodCli || '-'}"`,
      `TEXT ${xColDir},${sy(105)},"2",0,1,1,"Qtde: ${safeQtde} PC"`,
      `TEXT ${xColDir},${sy(140)},"2",0,1,1,"Pedido/Seq: ${safePedidoSeq || '-'}"`,

      // Rodapé: Lote Usinagem (somente o valor centralizado)
      `BLOCK ${sx(15)},${sy(300)},${Math.max(sx(770), sx(120))},${Math.max(sy(25), sy(18))},"2",0,1,1,0,1,"${safeLote || '-'}"`,

      // Finalização obrigatória do job TSPL (Solução 1: PRINT + FEED)
      // Para impressão unitária mantemos PRINT + FEED dentro do mesmo job
      `PRINT 1,1`,
      `FEED 1`
    ].filter(Boolean)

    return lines.join('\r\n')
  }

  /**
   * Gera TSPL para etiqueta de palete 100x150mm
   * Layout industrial com QR Code e informações completas
   * 
   * @param {Object} params - Parâmetros da etiqueta
   * @returns {string} Comandos TSPL completos
   */
  static gerarEtiquetaPaleteTspl({
    larguraEtiquetaMm = 100,
    alturaEtiquetaMm = 150,
    gapEtiquetaMm = 3,
    idPalete,
    codigoProduto,
    descricao,
    cliente,
    codigoCliente = '',
    pedido,
    quantidade,
    lote,
    loteMP,
    rack,
    material,
    maquina,
    operador,
    dataProducao,
    qrCode,
    tipo = 'USINADO',
    fifo = 'ÁREA A',
    dureza = '',
    status = 'PRODUZIDO'
  }) {
    const { larguraMm: widthMm, alturaMm: heightMm } = this._normalizarDimensoesEtiqueta({
      larguraMm: larguraEtiquetaMm,
      alturaMm: alturaEtiquetaMm
    })
    const gapMm = this._normalizarGapEtiqueta(gapEtiquetaMm)
    const widthDots = this.mmToDots(widthMm)
    const heightDots = this.mmToDots(heightMm)
    const scaleX = widthDots / 800
    const scaleY = heightDots / 1200
    const sx = (v) => Math.round(v * scaleX)
    const sy = (v) => Math.round(v * scaleY)

    // Funções de segurança para texto
    const safeText = (text) => this._tsplSafeText(text)
    const safeId = safeText(idPalete)
    const safeCodigo = safeText(codigoProduto)
    const safeDescricao = safeText(descricao)
    const safeCliente = safeText(cliente)
    const safeCodigoCliente = safeText(codigoCliente)
    const safePedido = safeText(pedido)
    const safeQuantidade = safeText(quantidade)
    const safeLote = safeText(lote)
    const safeLoteMP = safeText(loteMP)
    const safeRack = safeText(rack)
    const safeMaterial = safeText(material)
    const safeMaquina = safeText(maquina)
    const safeOperador = safeText(operador)
    const safeData = safeText(dataProducao)
    const safeTipo = safeText(tipo)
    const safeFifo = safeText(fifo)
    const safeDureza = safeText(dureza)
    const safeStatus = safeText(status)

    const tituloEmpresa = 'T E C N O P E R F I L  A L U M I N I O'

    // Layout 100x150mm - Header 15mm, Conteúdo 35mm, Técnico 25mm, QR Code 50mm, Controles 15mm
    const lines = [
      // ========== COMANDOS DE RESET E INICIALIZAÇÃO ==========
      `\r\n`,
      `SIZE ${widthMm} mm,${heightMm} mm`,
      `GAP ${gapMm} mm,0 mm`,
      `DIRECTION 1`,
      `DENSITY 8`,
      `SPEED 6`,
      `REFERENCE 0,0`,
      `OFFSET 0 mm`,
      `SHIFT 0`,
      `CLS`,
      
      // ========== HEADER - IDENTIFICAÇÃO PRINCIPAL (15mm) ==========
      // Faixa preta com título
      `BOX ${sx(10)},${sy(10)},${sx(780)},${sy(50)},1,1,1`,
      `TEXT ${sx(15)},${sy(30)},"3",0,1,1,"${tituloEmpresa}"`,
      `TEXT ${sx(600)},${sy(30)},"3",0,1,1,"PALETES"`,
      `TEXT ${sx(650)},${sy(30)},"2",0,1,1,"DUREZA:"`,
      `BOX ${sx(720)},${sy(18)},${sx(70)},${sy(24)},1,1,1`,
      `TEXT ${sx(725)},${sy(30)},"2",0,1,1,"${safeDureza}"`,

      // ========== BLOCO 1 - DADOS ESSENCIAIS (35mm) - DESTAQUE MÁXIMO ==========
      // Linha divisória
      `BOX ${sx(10)},${sy(70)},${sx(780)},${sy(2)},1,1,1`,
      
      // Código e Quantidade - Destaque máximo
      `BOX ${sx(15)},${sy(80)},${sx(380)},${sy(60)},1,1,0`,
      `TEXT ${sx(20)},${sy(95)},"3",0,1,1,"CÓDIGO:"`,
      `TEXT ${sx(20)},${sy(120)},"3",0,1,1,"${safeCodigo}"`,
      `TEXT ${sx(400)},${sy(95)},"3",0,1,1,"QTD:"`,
      `BOX ${sx(440)},${sy(85)},${sx(80)},${sy(35)},1,1,1`,
      `TEXT ${sx(445)},${sy(105)},"3",0,1,1,"${safeQuantidade}"`,
      `TEXT ${sx(530)},${sy(105)},"3",0,1,1,"PEÇAS"`,

      // Descrição, Cliente, Pedido, Código Cliente e Data
      `TEXT ${sx(20)},${sy(155)},"2",0,1,1,"DESCRIÇÃO: ${safeDescricao}"`,
      `TEXT ${sx(20)},${sy(180)},"2",0,1,1,"CLIENTE: ${safeCliente}"`,
      `TEXT ${sx(20)},${sy(205)},"2",0,1,1,"PEDIDO: ${safePedido}"`,
      `TEXT ${sx(400)},${sy(205)},"2",0,1,1,"CÓDIGO CLIENTE: ${safeCodigoCliente}"`,
      `TEXT ${sx(400)},${sy(230)},"2",0,1,1,"DATA: ${safeData}"`,

      // ========== BLOCO 2 - INFORMAÇÕES TÉCNICAS (25mm) ==========
      // Linha divisória
      `BOX ${sx(10)},${sy(280)},${sx(780)},${sy(2)},1,1,1`,
      
      // Duas colunas de informações técnicas
      `TEXT ${sx(20)},${sy(300)},"2",0,1,1,"MATERIAL: ${safeMaterial}"`,
      `TEXT ${sx(20)},${sy(325)},"2",0,1,1,"MÁQUINA: ${safeMaquina}"`,
      `TEXT ${sx(20)},${sy(350)},"2",0,1,1,"OPERADOR: ${safeOperador}"`,
      
      `TEXT ${sx(400)},${sy(300)},"2",0,1,1,"LOTE MP: ${safeLoteMP}"`,
      `TEXT ${sx(400)},${sy(325)},"2",0,1,1,"RACK: ${safeRack}"`,
      `TEXT ${sx(400)},${sy(350)},"2",0,1,1,"TIPO: ${safeTipo}"`,
      `TEXT ${sx(400)},${sy(375)},"2",0,1,1,"STATUS: ${safeStatus}"`,
      `TEXT ${sx(400)},${sy(400)},"2",0,1,1,"FIFO: ${safeFifo}"`,
      `TEXT ${sx(400)},${sy(425)},"2",0,1,1,"DUREZA: ${safeDureza}"`,

      // ========== BLOCO 3 - RASTREABILIDADE (50mm) ==========
      // Linha divisória
      `BOX ${sx(10)},${sy(450)},${sx(780)},${sy(2)},1,1,1`,
      
      // QR Code (40mm x 40mm centralizado)
      `QRCODE ${sx(300)},${sy(500)},${sx(400)},${sx(600)},L,6,M,0,"${qrCode}"`,
      
      // Lote Usinagem abaixo do QR Code
      `TEXT ${sx(200)},${sy(850)},"1",0,1,1,"${safeLote}"`,

      // ========== BLOCO 4 - CONTROLES (15mm) ==========
      // Linha divisória
      `BOX ${sx(10)},${sy(1050)},${sx(780)},${sy(2)},1,1,1`,
      
      // Checkboxes de controle
      `BOX ${sx(20)},${sy(1070)},${sx(15)},${sx(15)},1,1,1`,
      `TEXT ${sx(40)},${sy(1080)},"2",0,1,1,"INSPEÇÃO OK"`,
      
      `BOX ${sx(200)},${sy(1070)},${sx(15)},${sx(15)},1,1,1`,
      `TEXT ${sx(220)},${sy(1080)},"2",0,1,1,"EXPEDIÇÃO OK"`,
      
      `BOX ${sx(380)},${sy(1070)},${sx(15)},${sx(15)},1,1,1`,
      `TEXT ${sx(400)},${sy(1080)},"2",0,1,1,"ESTOQUE OK"`,
      
      // Data de validade
      `TEXT ${sx(600)},${sy(1080)},"2",0,1,1,"VALIDADE: 31/12/2026"`,

      // Finalização obrigatória do job TSPL
      `PRINT 1,1`,
      `FEED 1`
    ].filter(Boolean)

    return lines.join('\r\n')
  }

  /**
   * Gera comandos TSPL para múltiplas etiquetas em um único job
   * Isso é mais eficiente e evita problemas de buffer
   */
  static gerarMultiplasEtiquetas(etiquetas, opcoes = {}) {
    if (!etiquetas || etiquetas.length === 0) return ''

    const { larguraMm: widthMm, alturaMm: heightMm } = this._normalizarDimensoesEtiqueta(opcoes)
    const gapMm = this._normalizarGapEtiqueta(opcoes?.gapMm)

    // Header do job (configuração única)
    const header = [
      `\r\n`,
      `SIZE ${widthMm} mm,${heightMm} mm`,
      `GAP ${gapMm} mm,0 mm`,
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
        larguraEtiquetaMm: widthMm,
        alturaEtiquetaMm: heightMm,
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
    larguraEtiquetaMm = 100,
    alturaEtiquetaMm = 45,
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
    pedidoCliente,
    pedidoSeq
  }) {
    const { larguraMm, alturaMm } = this._normalizarDimensoesEtiqueta({
      larguraMm: larguraEtiquetaMm,
      alturaMm: alturaEtiquetaMm
    })
    const widthDots = this.mmToDots(larguraMm)
    const heightDots = this.mmToDots(alturaMm)
    const scaleX = widthDots / 800
    const scaleY = heightDots / 360
    const sx = (v) => Math.round(v * scaleX)
    const sy = (v) => Math.round(v * scaleY)
    const xColEsq = sx(15)
    const xColDir = sx(480)

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
    const safePedidoSeq = this._tsplSafeText(pedidoSeq)

    const tituloEmpresa = 'T E C N O P E R F I L  A L U M I N I O'

    const faixaX = sx(80)
    const faixaY = sy(10)
    const faixaW = sx(640)
    const faixaH = sy(36)

    const idEtiqueta = `${String(lote || '').replace(/[^a-zA-Z0-9]/g, '').substring(0, 16)}${String(numeroEtiqueta).padStart(4, '0')}`

    const lines = [
      `CLS`,

      // Título no topo (mesma fonte/posição da impressão única)
      `TEXT ${faixaX + sx(10)},${sy(18)},"3",0,1,1,"${tituloEmpresa}"`,
      `TEXT ${faixaX + sx(11)},${sy(18)},"3",0,1,1,"${tituloEmpresa}"`,
      `REVERSE ${faixaX},${faixaY},${faixaW},${faixaH}`,

      // Coluna 1
      `TEXT ${xColEsq},${sy(70)},"2",0,1,1,"Nome: ${safeNome || '-'}"`,
      `TEXT ${xColEsq},${sy(105)},"2",0,1,1,"Pedido Cliente: ${safePedidoCliente || '-'}"`,
      `TEXT ${xColEsq},${sy(140)},"2",0,1,1,"Perfil: ${safeFerr}"`,
      `TEXT ${xColEsq},${sy(175)},"2",0,1,1,"Comp.: ${safeComp || '-'} mm"`,
      `TEXT ${xColEsq},${sy(210)},"2",0,1,1,"Rack: ${safeRack}"`,
      `TEXT ${xColEsq},${sy(245)},"2",0,1,1,"Lote MP: ${safeMp || '-'}"`,

      // Coluna 2
      `TEXT ${xColDir},${sy(70)},"2",0,1,1,"Cod. Cliente: ${safeCodCli || '-'}"`,
      `TEXT ${xColDir},${sy(105)},"2",0,1,1,"Qtde: ${safeQtde} PC"`,
      `TEXT ${xColDir},${sy(140)},"2",0,1,1,"Pedido/Seq: ${safePedidoSeq || '-'}"`,

      // Rodapé: Lote Usinagem (somente o valor centralizado)
      `BLOCK ${sx(15)},${sy(300)},${Math.max(sx(770), sx(120))},${Math.max(sy(25), sy(18))},"2",0,1,1,0,1,"${safeLote || '-'}"`,

      // Para uso em múltiplas etiquetas, aqui finalizamos apenas com PRINT.
      // O FEED 1 é enviado uma única vez no final do job em gerarMultiplasEtiquetas.
      `PRINT 1,1`
    ].filter(Boolean)

    return lines.join('\r\n')
  }
}

export default PrintService
