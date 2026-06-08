export const calcularTurno = (dataHora) => {
  if (!dataHora) return ''
  try {
    const date = new Date(dataHora)
    const horas = date.getHours()
    const minutos = date.getMinutes()
    const totalMinutos = horas * 60 + minutos

    // TB: 06:30 às 16:10
    // TC: 16:11 às 01:30
    const tb_inicio = 6 * 60 + 30
    const tb_fim = 16 * 60 + 10
    const tc_inicio = 16 * 60 + 11

    if (totalMinutos >= tb_inicio && totalMinutos <= tb_fim) {
      return 'TB'
    } else if (totalMinutos >= tc_inicio || totalMinutos <= 1 * 60 + 30) {
      return 'TC'
    }
    return ''
  } catch {
    return ''
  }
}

/**
 * Dado um produto (item) e os arrays de kits+componentes,
 * retorna o objeto { nome, codigo } do primeiro kit que contém esse produto.
 */
export const resolverKit = (produto, kits = [], componentes = []) => {
  if (!produto || !kits.length) return null
  const prodUpper = String(produto).toUpperCase().trim()
  for (const kit of kits) {
    const compsDoKit = componentes.filter(c => String(c.kit_id) === String(kit.id))
    if (compsDoKit.some(c => String(c.produto || '').toUpperCase().trim() === prodUpper)) {
      return { nome: kit.nome || '', codigo: kit.codigo || '' }
    }
  }
  return null
}

/**
 * @deprecated Use resolverKit() que retorna objeto com nome e codigo
 */
export const resolverNomeKit = (produto, kits = [], componentes = []) => {
  const kit = resolverKit(produto, kits, componentes)
  return kit ? kit.nome : ''
}

export const buildFormularioIdentificacaoHtml = ({
  lote,
  loteMP,
  cliente,
  item,
  codigoCliente,
  nomeKit,
  codigoKit,
  medida,
  pedidoTecno,
  notaFiscal,
  pedidoCli,
  qtde,
  pallet,
  dureza,
  dataProducao,
  dataHoraProducao,
  turno
}) => {
  const loteMPVal = loteMP || ''
  const dataVal = dataProducao || ''
  const turnoVal = turno || calcularTurno(dataHoraProducao || dataProducao)

  return `<!DOCTYPE html>
  <html><head><meta charset="utf-8" />
  <style>
    @page {
      size: A4 landscape;
      margin: 5mm;
    }
    @media print {
      @page {
        size: landscape;
        margin: 5mm;
      }
      body {
        margin: 0;
        padding: 0;
      }
    }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      color: #000;
      margin: 0;
      padding: 0;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .container {
      max-width: 100%;
      height: 184mm;
      margin: 0 auto;
      background: #fff;
      border: 2px solid #000;
      padding: 4mm 8mm;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      gap: 3mm;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 2.5mm;
    }
    .titulo {
      font-size: 21pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5pt;
      margin: 0;
      line-height: 1.05;
    }
    .sub {
      margin-top: 0.5mm;
      font-size: 11pt;
      font-weight: 600;
      color: #333;
      display: flex;
      gap: 4mm;
      justify-content: center;
      flex-wrap: nowrap;
    }
    .sub-item {
      white-space: nowrap;
    }
    .form-grid {
      display: grid;
      grid-template-columns: 18% 82%;
      gap: 4mm 0;
      align-items: center;
    }
    .form-row {
      display: contents;
    }
    .label {
      font-weight: 700;
      font-size: 19pt;
      text-transform: uppercase;
      letter-spacing: 0.5pt;
      color: #000;
      padding-right: 4mm;
      text-align: right;
      line-height: 1.02;
    }
    .valor {
      border-bottom: 1px solid #000;
      font-size: 21pt;
      font-weight: 600;
      padding: 1mm 3mm;
      text-align: center;
      background: #f9f9f9;
      line-height: 1.02;
    }
    .valor.sem-linha {
      border-bottom: none;
      background: #f9f9f9;
    }
    .valor:empty::after {
      content: '';
      display: inline-block;
      width: 100%;
      height: 5mm;
    }
    .bottom-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4mm;
      align-items: stretch;
      margin-top: 0;
    }
    .content-spacer {
      flex: 1 1 auto;
      min-height: 1mm;
    }
    .bottom-left {
      display: grid;
      grid-template-columns: 24% 76%;
      gap: 3mm 0;
      align-content: start;
      align-self: stretch;
    }
    .bottom-left .field-full {
      display: contents;
    }
    .bottom-left .pair-grid {
      grid-column: 1 / -1;
      display: grid;
      grid-template-columns: 24% 26% 24% 26%;
      gap: 3mm 0;
      align-items: center;
    }
    .bottom-left .pair-grid .form-row {
      display: contents;
    }
    .bottom-left .label {
      font-size: 16pt;
      line-height: 0.95;
      white-space: nowrap;
      padding-right: 3mm;
    }
    .bottom-left .valor {
      font-size: 18pt;
    }
    .bottom-left .valor.valor-quantidade {
      font-size: 30pt;
      font-weight: 800;
    }
    .pallet-card {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 50mm;
      padding: 4mm 5mm 3mm;
      background: linear-gradient(180deg, #f7fbff 0%, #eef4ff 100%);
      border: 2px solid #000;
      box-shadow: 0 1mm 4mm rgba(0, 0, 0, 0.08);
      box-sizing: border-box;
      overflow: hidden;
      align-self: stretch;
      width: 100%;
    }
    .pallet-card .pallet-label {
      font-size: 15pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5pt;
      color: #000;
      margin-bottom: 1.5mm;
      text-align: left;
      line-height: 1;
    }
    .pallet-card .pallet-value {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 28mm;
      border-bottom: 3px solid #000;
      background: #fff;
      font-size: 58pt;
      font-weight: 900;
      color: #000;
      letter-spacing: 0.2pt;
      text-align: center;
      line-height: 0.95;
      white-space: nowrap;
      overflow: hidden;
      padding: 0 1mm;
    }
  </style>
  </head><body>
    <div class="container">
      <div class="header">
        <div class="titulo">Formulário de Identificação do Material Cortado</div>
        <div class="sub">
          <span class="sub-item">Lote: ${lote || ''}</span>
          ${loteMPVal ? `<span class="sub-item">| Lote MP: ${loteMPVal}</span>` : ''}
        </div>
      </div>

      <div class="form-grid">
        <div class="form-row">
          <div class="label">Cliente:</div>
          <div class="valor">${cliente || ''}</div>
        </div>

        <div class="form-row">
          <div class="label">Item:</div>
          <div class="valor">${item || ''}</div>
        </div>

        <div class="form-row">
          <div class="label">Código Cliente:</div>
          <div class="valor" style="display:flex;align-items:center;justify-content:center;gap:10px;">${codigoCliente || ''}${nomeKit ? `<span style="font-size:13pt;font-weight:800;color:#1a3a6b;letter-spacing:0.3pt;border-left:3px solid #1a3a6b;padding-left:10px;"> ${nomeKit}${codigoKit ? ` <span style="font-size:11pt;color:#4a6b9b;font-weight:600;">(${codigoKit})</span>` : ''}</span>` : ''}</div>
        </div>

        <div class="form-row">
          <div class="label">Medida:</div>
          <div class="valor">${medida || ''}</div>
        </div>

        <div class="form-row">
          <div class="label">Pedido Tecno:</div>
          <div class="valor">${pedidoTecno || ''}</div>
        </div>

        <div class="form-row">
          <div class="label">Nota Fiscal:</div>
          <div class="valor sem-linha">${notaFiscal || ''}</div>
        </div>
      </div>

      <div class="content-spacer"></div>

      <div class="bottom-section">
        <div class="bottom-left">
          <div class="field-full">
            <div class="label">Qtde:</div>
            <div class="valor valor-quantidade">${qtde || ''}</div>
          </div>

          <div class="pair-grid">
            <div class="form-row">
              <div class="label">Pedido Cli:</div>
              <div class="valor">${pedidoCli || ''}</div>
            </div>

            <div class="form-row">
              <div class="label">Turno:</div>
              <div class="valor">${turnoVal || ''}</div>
            </div>

            <div class="form-row">
              <div class="label">Dureza:</div>
              <div class="valor">${dureza || ''}</div>
            </div>

            <div class="form-row">
              <div class="label">Data Prod:</div>
              <div class="valor">${dataVal || ''}</div>
            </div>
          </div>
        </div>

        <div class="pallet-card">
          <div class="pallet-label">Número do Palete</div>
          <div class="pallet-value">${pallet || ''}</div>
        </div>
      </div>
    </div>
  </body></html>`
}
