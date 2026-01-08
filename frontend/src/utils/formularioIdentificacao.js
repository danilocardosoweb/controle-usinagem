export const buildFormularioIdentificacaoHtml = ({
  lote,
  loteMP,
  cliente,
  item,
  codigoCliente,
  medida,
  pedidoTecno,
  pedidoCli,
  qtde,
  pallet,
  dureza
}) => {
  const loteMPVal = loteMP || ''

  return `<!DOCTYPE html>
  <html><head><meta charset="utf-8" />
  <style>
    @page { 
      size: A4 landscape; 
      margin: 12.7mm; /* Margens estreitas padrão */
    }
    @media print {
      @page {
        size: landscape;
        margin: 12.7mm;
      }
      body {
        margin: 0;
      }
    }
    body { 
      font-family: 'Segoe UI', Arial, sans-serif; 
      color: #000; 
      margin: 0;
      padding: 10mm;
      background: #fff;
      -webkit-print-color-adjust: exact; 
      print-color-adjust: exact; 
    }
    .container {
      max-width: 100%;
      margin: 0 auto;
      background: #fff;
      border: 2px solid #000;
      padding: 8mm;
    }
    .header { 
      text-align: center; 
      margin-bottom: 8mm;
      border-bottom: 3px solid #000;
      padding-bottom: 4mm;
    }
    .titulo { 
      font-size: 24pt; 
      font-weight: 800; 
      text-transform: uppercase;
      letter-spacing: 1pt;
      margin: 0;
    }
    .sub { 
      margin-top: 4mm; 
      font-size: 11pt; 
      font-weight: 600; 
      color: #333;
      display: flex;
      gap: 8mm;
      justify-content: center;
      flex-wrap: nowrap;
    }
    .sub-item {
      white-space: nowrap;
    }
    .form-grid { 
      display: grid;
      grid-template-columns: 25% 75%;
      gap: 5mm 0;
      margin-bottom: 5mm;
    }
    .form-row {
      display: contents;
    }
    .form-row.dupla {
      display: grid;
      grid-column: 1 / -1;
      grid-template-columns: 12.5% 37.5% 12.5% 37.5%;
      gap: 0 4mm;
      align-items: end;
    }
    .label { 
      font-weight: 700; 
      font-size: 14pt; 
      text-transform: uppercase;
      letter-spacing: 0.5pt;
      color: #000;
      padding-right: 4mm;
      align-self: end;
      padding-bottom: 2mm;
    }
    .valor { 
      border-bottom: 2px solid #000; 
      font-size: 16pt; 
      font-weight: 600;
      padding: 2mm 4mm; 
      min-height: 8mm; 
      text-align: center;
      background: #f9f9f9;
      position: relative;
    }
    .valor:empty::after {
      content: '';
      display: inline-block;
      width: 100%;
      height: 8mm;
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
          <div class="valor">${codigoCliente || ''}</div>
        </div>
        
        <div class="form-row">
          <div class="label">Medida:</div>
          <div class="valor">${medida || ''}</div>
        </div>
        
        <div class="form-row">
          <div class="label">Pedido Tecno:</div>
          <div class="valor">${pedidoTecno || ''}</div>
        </div>
        
        <div class="form-row dupla">
          <div class="label">Qtde:</div>
          <div class="valor">${qtde || ''}</div>
          <div class="label">Palet:</div>
          <div class="valor">${pallet || ''}</div>
        </div>
        
        <div class="form-row">
          <div class="label">Pedido Cli:</div>
          <div class="valor">${pedidoCli || ''}</div>
        </div>
        
        <div class="form-row">
          <div class="label">Dureza:</div>
          <div class="valor">${dureza || ''}</div>
        </div>
      </div>
    </div>
  </body></html>`
}
