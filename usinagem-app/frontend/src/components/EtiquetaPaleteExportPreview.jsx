import React from 'react'
import Barcode from 'react-barcode'

/**
 * Etiqueta de Palete para EXPORTAÇÃO INTERNACIONAL (100x150mm)
 * Baseada na EtiquetaPaletePreview, adaptada para EUA, Canadá e Chile.
 * Campos em inglês / bilíngue, data ISO 8601, GS1-128, campos adicionais de exportação.
 */
const EtiquetaPaleteExportPreview = ({
  idPalete = '',
  codigoProduto = '',
  descricao = '',
  cliente = '',
  codigoCliente = '',
  pedido = '',
  quantidade = '',
  lote = '',
  loteMP = '',
  rack = '',
  material = '6060-T6',
  maquina = '',
  operador = '',
  dataProducao = '',
  tipo = 'MACHINED',
  fifo = 'AREA A',
  dureza = '',
  status = 'PRODUCED',
  // Campos extras de exportação
  hsCode = '7604.29.90',
  countryOfOrigin = 'MADE IN BRAZIL',
  destination = '',
  grossWeight = '',
  netWeight = '',
  qcStatus = 'APPROVED',
}) => {
  // Data em formato ISO 8601 (YYYY-MM-DD) ou mantém como veio
  const formatDateISO = (dateStr) => {
    if (!dateStr) return '-'
    // Aceita DD/MM/YYYY e converte
    const parts = String(dateStr).split('/')
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
    }
    return dateStr
  }

  const dataISO = formatDateISO(dataProducao)

  // GS1-128: estrutura básica com Application Identifiers
  // AI(10) = LOT/BATCH, AI(30) = QTY
  const gs1BarcodeValue = `(10)${loteMP || lote || 'BATCH'}(30)${quantidade || '0'}`
  // Fallback legível caso o renderer não suporte AI
  const barcodeValue = `${codigoProduto || 'SC'}-${rack || 'SR'}-${quantidade || '0'}`

  return (
    <div
      className="bg-white border-2 border-gray-800 rounded overflow-hidden shadow-lg flex flex-col font-sans relative"
      style={{ width: '400px', height: '600px' }}
    >
      {/* Header */}
      <div className="flex border-b-2 border-gray-800 h-[60px] flex-none">
        <div className="w-2/3 border-r-2 border-gray-800 flex flex-col justify-center items-center bg-gray-900 text-white">
          <div className="font-black text-sm tracking-widest">TECNOPERFIL ALUMÍNIO</div>
          <div className="text-[9px] tracking-widest mt-0.5 text-blue-300 font-semibold">EXPORT LABEL / ETIQUETA DE EXPORTAÇÃO</div>
        </div>
        <div className="w-1/3 flex flex-col justify-center items-center bg-gray-100">
          <div className="text-[9px] font-bold text-gray-600 mb-0.5">HARDNESS / DUREZA:</div>
          <div className="font-black text-[16px] text-gray-900 leading-none">{dureza || '-'}</div>
          <div className="text-[8px] text-gray-500">HB</div>
        </div>
      </div>

      {/* Bloco 1 - Part No + QTY */}
      <div className="flex flex-col border-b-2 border-gray-800 p-2.5 h-[160px] flex-none bg-white justify-between">
        <div className="flex justify-between items-start mb-1.5">
          <div className="flex-1 border-2 border-gray-800 p-2 px-3 mr-2 bg-white h-[68px] overflow-hidden flex flex-col justify-center min-w-0">
            <div className="text-[9px] font-bold text-gray-500 leading-none mb-0.5">PART NO. / CÓDIGO:</div>
            <div className="font-black text-[20px] leading-none truncate tracking-tight">{codigoProduto || '-'}</div>
          </div>
          <div className="w-[120px] flex items-center justify-center border-2 border-gray-800 p-2 bg-yellow-100 h-[68px] flex-none">
            <div className="flex flex-col items-center">
              <div className="text-[9px] font-bold text-gray-600 leading-none mb-0.5">QTY / QTD:</div>
              <div className="flex items-baseline">
                <div className="font-black text-3xl leading-none">{quantidade || '-'}</div>
                <div className="text-xs font-bold ml-1">PCS</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-0.5">
          <div className="text-sm truncate"><strong className="text-gray-500">DESCRIPTION:</strong> <span className="font-bold text-sm">{descricao || '-'}</span></div>
          <div className="flex justify-between text-[10px] gap-2">
            <div className="truncate flex-[3]"><strong className="text-gray-500">CUSTOMER:</strong> <span className="font-bold">{cliente || '-'}</span></div>
            <div className="truncate flex-[2]"><strong className="text-gray-500">P.O.:</strong> <span className="font-bold">{pedido || '-'}</span></div>
          </div>
          <div className="flex justify-between text-[10px] gap-2">
            <div className="truncate flex-[3]"><strong className="text-gray-500">CUST. PART NO.:</strong> <span className="font-bold">{codigoCliente || '-'}</span></div>
            <div className="whitespace-nowrap"><strong className="text-gray-500">DATE:</strong> <span className="font-bold">{dataISO}</span></div>
          </div>
        </div>
      </div>

      {/* Bloco 2 - Info Técnica + RACK + Export fields */}
      <div className="flex border-b-2 border-gray-800 h-[130px] text-[9px] flex-none bg-white">
        <div className="w-1/2 border-r-2 border-gray-800 p-2 flex flex-col justify-between">
          <div className="truncate"><strong className="text-gray-500">ALLOY / MATERIAL:</strong> <span className="font-bold">AA {material || '-'}</span></div>
          <div className="truncate"><strong className="text-gray-500">RM BATCH:</strong> <span className="font-bold">{loteMP || '-'}</span></div>
          <div className="truncate"><strong className="text-gray-500">MACHINE:</strong> {maquina || '-'}</div>
          <div className="truncate"><strong className="text-gray-500">OPERATOR:</strong> {operador || '-'}</div>
          <div className="truncate"><strong className="text-gray-500">HS CODE:</strong> <span className="font-bold text-blue-700">{hsCode || '-'}</span></div>
        </div>
        <div className="w-1/2 p-0 flex flex-col">
          <div className="flex-1 border-b-2 border-gray-800 bg-blue-50 flex flex-col items-center justify-center p-1.5">
            <div className="text-[9px] font-bold text-gray-600 leading-none mb-0.5">RACK / PALLET ID:</div>
            <div className="font-black text-2xl leading-none text-blue-900">{rack || '-'}</div>
          </div>
          <div className="flex justify-between p-1 px-2 text-[9px] border-b border-gray-200">
            <div className="truncate"><strong className="text-gray-500">TYPE:</strong> {tipo || 'MACHINED'}</div>
            <div className="truncate"><strong className="text-gray-500">FIFO:</strong> {fifo || 'AREA A'}</div>
          </div>
          <div className="p-1 px-2 text-[9px] flex justify-between items-center">
            <div><strong className="text-gray-500">STATUS:</strong> <span className="font-bold">{status || 'PRODUCED'}</span></div>
            <div className="text-green-700 font-bold">QC: {qcStatus || 'APPROVED'}</div>
          </div>
        </div>
      </div>

      {/* Bloco 3 - Export Info */}
      <div className="border-b-2 border-gray-800 px-2.5 py-1.5 bg-blue-50 flex-none">
        <div className="grid grid-cols-2 gap-x-3 text-[9px]">
          <div className="font-bold text-blue-900 truncate">🌐 {countryOfOrigin || 'MADE IN BRAZIL'}</div>
          {destination && <div className="truncate"><strong className="text-gray-600">DEST:</strong> {destination}</div>}
          {grossWeight && <div className="truncate"><strong className="text-gray-600">GW:</strong> {grossWeight} KG</div>}
          {netWeight && <div className="truncate"><strong className="text-gray-600">NW:</strong> {netWeight} KG</div>}
        </div>
      </div>

      {/* Bloco 4 - Código de Barras (GS1-128 sugerido) */}
      <div className="flex flex-col items-center justify-center border-b-2 border-gray-800 h-[110px] p-1.5 bg-gray-50 flex-none">
        <div className="w-full flex items-center justify-center bg-white border-2 border-gray-800 py-1 h-[75px]">
          <Barcode
            value={barcodeValue}
            width={1.6}
            height={45}
            fontSize={11}
            margin={4}
            textMargin={3}
            displayValue={true}
            background="#ffffff"
          />
        </div>
        <div className="text-[8px] text-gray-400 mt-1 text-center">GS1-128 · (10){loteMP || lote || 'BATCH'} · (30){quantidade || '0'} PCS</div>
      </div>

      {/* Bloco 5 - LOT/BATCH */}
      <div className="border-b-2 border-gray-800 px-2.5 py-1.5 flex-none bg-white">
        <div className="font-bold text-[10px] tracking-wide text-gray-800 truncate">LOT/BATCH: {lote || '-'}</div>
      </div>

      {/* Bloco 6 - Checkboxes */}
      <div className="flex flex-col justify-center flex-1 p-1.5 text-[9px] bg-white">
        <div className="flex justify-between px-3">
          <div className="flex items-center gap-1 font-bold"><div className="w-4 h-4 border-2 border-gray-800 bg-white flex-none"></div> INSP / INSPEÇÃO</div>
          <div className="flex items-center gap-1 font-bold"><div className="w-4 h-4 border-2 border-gray-800 bg-white flex-none"></div> SHIP / EXPEDIÇÃO</div>
          <div className="flex items-center gap-1 font-bold"><div className="w-4 h-4 border-2 border-gray-800 bg-white flex-none"></div> EXPORT DOCS</div>
        </div>
      </div>
    </div>
  )
}

export default EtiquetaPaleteExportPreview
