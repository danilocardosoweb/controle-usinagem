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
      margin: 10mm; /* Ajustado para dar bom respiro mas sem forçar 2 páginas */
    }
    @media print {
      @page {
        size: landscape;
        margin: 10mm;
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
      height: 185mm; /* Altura máxima para não passar de 1 página, ocupando melhor o espaço */
      margin: 0 auto;
      background: #fff;
      border: 2px solid #000;
      padding: 8mm 12mm; /* Aumentar padding interno */
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: space-between; /* Distribui o espaço uniformemente */
    }
    .header { 
      text-align: center; 
      border-bottom: 2px solid #000;
      padding-bottom: 5mm; 
    }
    .titulo { 
      font-size: 26pt; /* Fonte maior */
      font-weight: 800; 
      text-transform: uppercase;
      letter-spacing: 0.5pt;
      margin: 0;
    }
    .sub { 
      margin-top: 4mm; 
      font-size: 13pt; 
      font-weight: 600; 
      color: #333;
      display: flex;
      gap: 6mm;
      justify-content: center;
      flex-wrap: nowrap;
    }
    .sub-item {
      white-space: nowrap;
    }
    .form-grid { 
      display: grid;
      grid-template-columns: 20% 80%; /* Ajuste para dar mais espaço ao label */
      gap: 7mm 0; /* Maior espaçamento vertical */
      align-items: center;
    }
    .form-row {
      display: contents;
    }
    .form-row.dupla {
      display: grid;
      grid-column: 1 / -1;
      grid-template-columns: 20% 35% 15% 30%;
      gap: 0;
      align-items: center;
      margin: 3mm 0; /* Mais respiro ao redor desta linha */
    }
    .label { 
      font-weight: 700; 
      font-size: 16pt; /* Maior */
      text-transform: uppercase;
      letter-spacing: 0.5pt;
      color: #000;
      padding-right: 4mm;
      text-align: right; /* Alinha labels à direita para ficar mais limpo */
    }
    .valor { 
      border-bottom: 1px solid #000; 
      font-size: 20pt; /* Maior */
      font-weight: 600;
      padding: 1mm 2mm; 
      text-align: center;
      background: #f9f9f9;
    }
    .valor:empty::after {
      content: '';
      display: inline-block;
      width: 100%;
      height: 7mm; 
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
      </div>
      
      <div class="form-row dupla">
        <div class="label">Qtde:</div>
        <div class="valor" style="text-align: center;">${qtde || ''}</div>
        <div class="label" style="text-align: right; padding-right: 4mm;">Palet:</div>
        <div class="valor" style="text-align: center;">${pallet || ''}</div>
      </div>
      
      <div class="form-grid">
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
