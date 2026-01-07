class PrintService {
  static async enviarTspl({ tipo = 'rede_ip', ip = '', porta = 9100, portaCom = '', caminhoCompartilhada = '', tspl, timeoutMs = 3000 }) {
    const backend = (import.meta?.env?.VITE_BACKEND_URL || 'http://localhost:8000').replace(/\/+$/, '')

    const payload = {
      tipo: tipo || 'rede_ip',
      tspl,
      timeout_ms: Number(timeoutMs || 3000)
    }

    // Adicionar campos específicos conforme o tipo
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
    nomeCliente
  }) {
    const widthDots = this.mmToDots(100)
    const heightDots = this.mmToDots(45)

    const xMargin = 16
    const yMargin = 10

    const safeLote = this._tsplSafeText(lote)
    const safeMp = this._tsplSafeText(loteMP)
    const safeRack = this._tsplSafeText(rack)
    const safeQtde = this._tsplSafeText(qtde)
    const safeFerr = this._tsplSafeText(ferramenta)
    const safeDur = this._tsplSafeText(dureza)
    const safeCodCli = this._tsplSafeText(codigoProdutoCliente)
    const safeNome = this._tsplSafeText(nomeCliente)

    const qrText = this._tsplSafeText(
      `L=${String(lote || '')}|MP=${String(loteMP || '')}|P=${String(ferramenta || '')}|R=${String(rack || '')}|Q=${String(qtde || '')}|D=${String(dureza || '')}|E=${String(numeroEtiqueta || '')}/${String(totalEtiquetas || '')}|CC=${String(codigoProdutoCliente || '')}`
    )

    const rightColX = widthDots - 180
    const qrX = rightColX
    const qrY = yMargin + 30

    const lines = [
      `SIZE 100 mm,45 mm`,
      `GAP 2 mm,0 mm`,
      `DIRECTION 1`,
      `REFERENCE 0,0`,
      `CLS`,
      // Header
      `TEXT ${xMargin},${yMargin},"0",0,1,1,"TECNOPERFIL ALUMINIO"`,
      // Conteúdo
      `TEXT ${xMargin},${yMargin + 30},"0",0,1,1,"Qtde: ${safeQtde} PC"`,
      `TEXT ${xMargin},${yMargin + 55},"0",0,1,1,"Rack: ${safeRack}"`,
      `TEXT ${xMargin},${yMargin + 80},"0",0,1,1,"Perfil: ${safeFerr}"`,
      `TEXT ${xMargin},${yMargin + 105},"0",0,1,1,"Dureza: ${safeDur}"`,
      `TEXT ${xMargin},${yMargin + 135},"0",0,1,1,"MP: ${safeMp}"`,
      `TEXT ${xMargin},${yMargin + 160},"0",0,1,1,"Lote: ${safeLote}"`,
      safeCodCli ? `TEXT ${xMargin},${yMargin + 185},"0",0,1,1,"Cod Cliente: ${safeCodCli}"` : '',
      safeNome ? `TEXT ${xMargin},${yMargin + 210},"0",0,1,1,"Nome: ${safeNome}"` : '',
      // QR Code
      `QRCODE ${qrX},${qrY},L,4,A,0,"${qrText}"`,
      // Rodapé
      `TEXT ${xMargin},${heightDots - 28},"0",0,1,1,"Etiqueta ${numeroEtiqueta}/${totalEtiquetas}"`,
      `PRINT 1,1`,
      ''
    ].filter(Boolean)

    return lines.join('\r\n')
  }
}

export default PrintService
