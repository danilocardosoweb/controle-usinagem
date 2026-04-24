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
      `SIZE ${widthMm} mm,${heightMm} mm`,
      `GAP ${gapMm} mm,0 mm`,
      `DIRECTION 1`,
      `DENSITY 14`,
      `SPEED 6`,
      `REFERENCE 0,0`,
      `OFFSET 0 mm`,
      `SHIFT 0`,
      `CLS`,
      
      // ========== TÍTULO NO TOPO ==========
      `TEXT ${faixaX + sx(10)},${sy(18)},"3",0,1,1,"${tituloEmpresa}"`,
      `TEXT ${faixaX + sx(11)},${sy(18)},"3",0,1,1,"${tituloEmpresa}"`,
      `REVERSE ${faixaX},${faixaY},${faixaW},${faixaH}`,

      // ========== CONTEÚDO PRINCIPAL ==========
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

      // Rodapé: Lote Usinagem
      `BLOCK ${sx(15)},${sy(300)},${Math.max(sx(770), sx(120))},${Math.max(sy(25), sy(18))},"2",0,1,1,0,1,"${safeLote || '-'}"`,

      `PRINT 1,1`,
      ``
    ].filter(l => l !== null && l !== undefined)

    return lines.join('\r\n')
  }

  /**
   * Gera TSPL para etiqueta de palete 100x150mm
   * Layout industrial com Barcode 128 e informações completas
   * 
   * ESPECIFICAÇÕES TÉCNICAS:
   * - Etiqueta física: 100mm (largura) x 150mm (altura)
   * - Resolução: 203 DPI = 8 dots/mm
   * - Largura em dots: 100 × 8 = 800 dots
   * - Altura em dots: 150 × 8 = 1200 dots
   * - Orientação: Retrato (mais alta que larga)
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

    // 100mm x 150mm = 800 dots x 1200 dots (203dpi, 8dots/mm)
    // Barcode data: codigo-rack-quantidade
    const barcodeData = `${String(codigoProduto || 'SC').substring(0, 16)}-${rack || 'SR'}-${quantidade || '0'}`
    const safeBarcode = safeText(barcodeData)

    // Limitar textos para evitar overflow horizontal (800 dots)
    const safeCodTrunc = safeCodigo.length > 18 ? safeCodigo.substring(0, 17) + '.' : safeCodigo
    const safeDescTrunc = safeDescricao.length > 28 ? safeDescricao.substring(0, 27) + '.' : safeDescricao
    const safeMaqTrunc = safeMaquina.length > 22 ? safeMaquina.substring(0, 21) + '.' : safeMaquina
    const safeLoteTrunc = safeLote.length > 26 ? safeLote.substring(0, 25) + '.' : safeLote

    // ===== LAYOUT 100x150mm: Grid absoluto (203 DPI) =====
    // Limitando a área de desenho a X: 20 até 740 (largura=720) para evitar margens mortas da impressora
    // Y útil vai até aprox 1100.
    
    // Config de blocos (Heights e offsets)
    const M_LEFT = 20
    const W_TOTAL = 720
    const M_RIGHT = M_LEFT + W_TOTAL
    
    const lines = [
      `SIZE ${widthMm} mm,${heightMm} mm`,
      `GAP ${gapMm} mm,0 mm`,
      `DIRECTION 1`,
      `DENSITY 14`,
      `SPEED 6`,
      `REFERENCE 0,0`,
      `OFFSET 0 mm`,
      `SHIFT 15`,
      `CLS`,

      // ===== BLOCO 0: HEADER (Y: 20 até 150) =====
      // Desenhamos a caixa grossa primeiro (fundo branco)
      `BOX ${M_LEFT},20,${M_RIGHT},150,3`,
      // Caixa para o lado direito (Dureza) - x=520 até M_RIGHT
      `BOX 520,20,${M_RIGHT},150,3`,
      
      // Conteúdo Dureza
      `TEXT 535,45,"2",0,1,1,"DUREZA:"`,
      `TEXT 580,80,"3",0,2,2,"${safeDureza || '-'}"`,

      // Para o fundo preto da empresa (lado esquerdo):
      `TEXT 40,50,"3",0,1,1,"TECNOPERFIL ALUMINIO"`,
      `TEXT 40,95,"2",0,1,1,"PALETES"`,
      // REVERSE X, Y, Largura, Altura. 
      // Caixa vai de X=20 a 520 (W=500). Aplicando margem de 3 dots para não encavalar com a borda.
      `REVERSE ${M_LEFT + 3},23,494,124`,

      // ===== BLOCO 1: CÓDIGO + QTD (Y: 165 até 335) =====
      `BOX ${M_LEFT},165,${M_RIGHT},335,3`,
      // Divisor vertical QTD
      `BAR 520,165,3,170`,
      
      // Textos
      `TEXT ${M_LEFT + 15},180,"2",0,1,1,"CODIGO:"`,
      // Fonte "2" com scale 2,2 (Menor largura, previne overflow)
      `TEXT ${M_LEFT + 15},220,"2",0,2,2,"${safeCodTrunc}"`,
      
      `TEXT 535,180,"2",0,1,1,"QTD:"`,
      `TEXT 535,220,"2",0,2,2,"${safeQuantidade} PC"`,

      // ===== BLOCO 2: DESCRIÇÃO / CLIENTE / PEDIDO (Y: 350 até 530) =====
      `BOX ${M_LEFT},350,${M_RIGHT},530,3`,
      `BAR 450,350,3,180`, // Divisor vertical ao meio
      
      `TEXT ${M_LEFT + 15},365,"2",0,1,1,"DESCRICAO: ${safeDescTrunc}"`,
      `TEXT ${M_LEFT + 15},420,"2",0,1,1,"CLIENTE: ${safeCliente}"`,
      `TEXT ${M_LEFT + 15},475,"2",0,1,1,"COD. CLI: ${safeCodigoCliente || '-'}"`,
      
      `TEXT 465,420,"2",0,1,1,"PEDIDO: ${safePedido}"`,
      `TEXT 465,475,"2",0,1,1,"DATA: ${safeData}"`,

      // ===== BLOCO 3: TÉCNICO + RACK + STATUS (Y: 545 até 825) =====
      `BOX ${M_LEFT},545,${M_RIGHT},825,3`,
      `BAR 450,545,3,210`, // Divisor vertical para RACK
      
      // Esquerda: espaçamentos distribuidos
      `TEXT ${M_LEFT + 15},560,"2",0,1,1,"MATERIAL: ${safeMaterial}"`,
      `TEXT ${M_LEFT + 15},610,"2",0,1,1,"LOTE MP: ${safeLoteMP || '-'}"`,
      `TEXT ${M_LEFT + 15},660,"2",0,1,1,"MAQUINA: ${safeMaquina.substring(0, 19)}..."`,
      `TEXT ${M_LEFT + 15},710,"2",0,1,1,"OPERADOR: ${safeOperador}"`,
      
      // RACK (Direita) - Fonte 4 mais grossa, sem escala excessiva
      `TEXT 465,560,"2",0,1,1,"RACK:"`,
      `TEXT 485,615,"4",0,1,1,"${safeRack || '-'}"`,
      
      // Linha horizontal STATUS (altura: 755)
      `BAR ${M_LEFT},755,W_TOTAL,3`,
      `TEXT ${M_LEFT + 15},775,"2",0,1,1,"TIPO: ${safeTipo}"`,
      `TEXT 250,775,"2",0,1,1,"FIFO: ${safeFifo}"`,
      // Divisor final do status
      `BAR 450,755,3,70`,
      `TEXT 465,775,"2",0,1,1,"STATUS: ${safeStatus}"`,

      // ===== BLOCO 4: CÓDIGO DE BARRAS (Y: 840 até 1010) =====
      `BOX ${M_LEFT},840,${M_RIGHT},1010,3`,
      // Barcode mais alto
      `BARCODE ${M_LEFT + 50},865,"128",110,1,0,2,3,"${safeBarcode}"`,

      // ===== BLOCO 5: LOTE (Y: 1025 até 1095) =====
      `BOX ${M_LEFT},1025,${M_RIGHT},1095,3`,
      `TEXT ${M_LEFT + 15},1050,"2",0,1,1,"LOTE: ${safeLoteTrunc}"`,

      // ===== BLOCO 6: CHECKBOXES (Y: 1110 até 1180) =====
      `BOX ${M_LEFT},1110,${M_RIGHT},1180,3`,
      
      `BOX ${M_LEFT + 25},1130,${M_LEFT + 55},1160,2`,
      `TEXT ${M_LEFT + 70},1135,"2",0,1,1,"INSPECAO"`,
      
      `BOX 300,1130,330,1160,2`,
      `TEXT 345,1135,"2",0,1,1,"EXPEDICAO"`,
      
      `BOX 540,1130,570,1160,2`,
      `TEXT 585,1135,"2",0,1,1,"ESTOQUE"`,

      `PRINT 1,1`,
      ``
    ].filter(l => l !== null && l !== undefined)

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
      `SIZE ${widthMm} mm,${heightMm} mm`,
      `GAP ${gapMm} mm,0 mm`,
      `DIRECTION 1`,
      `DENSITY 14`,
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
