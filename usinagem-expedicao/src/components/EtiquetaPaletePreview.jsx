import React from 'react'

/**
 * Componente de pré-visualização da etiqueta de palete 100x150mm
 * Layout industrial com blocos e QR Code
 */
const EtiquetaPaletePreview = ({
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
  tipo = 'USINADO',
  fifo = 'ÁREA A',
  dureza = '',
  status = 'PRODUZIDO',
  qrCodeUrl = ''
}) => {
  return (
    <div 
      className="bg-white border-2 border-gray-800 rounded overflow-hidden shadow-lg flex flex-col font-sans relative"
      style={{ width: '400px', height: '600px' }}
    >
      {/* Header - 15mm (aprox 60px) */}
      <div className="flex border-b-2 border-gray-800 h-[60px] flex-none">
        <div className="w-2/3 border-r-2 border-gray-800 flex flex-col justify-center items-center bg-gray-900 text-white">
           <div className="font-black text-sm tracking-widest">TECNOPERFIL ALUMÍNIO</div>
           <div className="text-xs tracking-widest mt-1">PALETES</div>
        </div>
        <div className="w-1/3 flex flex-col justify-center items-center bg-gray-100">
           <div className="text-[10px] font-bold text-gray-600 mb-1">DUREZA:</div>
           <div className="font-black text-[16px] text-gray-900 leading-none">{dureza || '-'}</div>
        </div>
      </div>

      {/* Bloco 1 - Dados Essenciais (35mm - aprox 140px) */}
      <div className="flex flex-col border-b-2 border-gray-800 p-2.5 h-[140px] flex-none bg-white justify-between">
        <div className="flex justify-between items-start">
           <div className="flex-1 border-2 border-gray-800 p-1.5 px-2 mr-2 bg-white h-[55px] overflow-hidden flex flex-col justify-center">
             <div className="text-[10px] font-bold text-gray-600 leading-none mb-1">CÓDIGO:</div>
             <div className="font-black text-xl leading-none truncate">{codigoProduto || '-'}</div>
           </div>
           <div className="w-[120px] flex items-center border-2 border-gray-800 p-1.5 px-2 bg-yellow-100 h-[55px]">
             <div className="text-[10px] font-bold text-gray-600 mr-2">QTD:</div>
             <div className="font-black text-2xl leading-none">{quantidade || '-'}</div>
             <div className="text-xs font-bold ml-1 pt-1">PC</div>
           </div>
        </div>
        
        <div className="flex flex-col gap-1 mt-1">
          <div className="text-xs truncate"><strong className="text-gray-600">DESCRIÇÃO:</strong> <span className="font-bold">{descricao || '-'}</span></div>
          <div className="text-xs truncate"><strong className="text-gray-600">CLIENTE:</strong> <span className="font-bold">{cliente || '-'}</span></div>
          <div className="flex justify-between text-xs gap-2">
            <div className="truncate flex-1"><strong className="text-gray-600">PEDIDO:</strong> <span className="font-bold">{pedido || '-'}</span></div>
            <div className="flex gap-4">
              {codigoCliente && (
                <div className="truncate"><strong className="text-gray-600">CÓDIGO CLIENTE:</strong> <span className="font-bold">{codigoCliente}</span></div>
              )}
              <div className="whitespace-nowrap"><strong className="text-gray-600">DATA:</strong> <span className="font-bold">{dataProducao || '-'}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Bloco 2 - Informações Técnicas (25mm - aprox 100px) */}
      <div className="flex border-b-2 border-gray-800 h-[100px] text-xs flex-none bg-white">
        <div className="w-1/2 border-r-2 border-gray-800 p-3 flex flex-col justify-between">
           <div className="truncate"><strong className="text-gray-600">MATERIAL:</strong> {material || '-'}</div>
           <div className="truncate"><strong className="text-gray-600">LOTE MP:</strong> {loteMP || '-'}</div>
           <div className="truncate"><strong className="text-gray-600">MÁQUINA:</strong> {maquina || '-'}</div>
           <div className="truncate"><strong className="text-gray-600">OPERADOR:</strong> {operador || '-'}</div>
        </div>
        <div className="w-1/2 p-3 flex flex-col justify-between">
           <div className="truncate"><strong className="text-gray-600">RACK:</strong> {rack || '-'}</div>
           <div className="truncate"><strong className="text-gray-600">TIPO:</strong> {tipo || 'USINADO'}</div>
           <div className="truncate"><strong className="text-gray-600">STATUS:</strong> {status || 'PRODUZIDO'}</div>
           <div className="truncate"><strong className="text-gray-600">FIFO:</strong> {fifo || 'ÁREA A'}</div>
        </div>
      </div>

      {/* Bloco 3 - Rastreabilidade (50mm - aprox 240px) */}
      <div className="flex flex-col items-center justify-center border-b-2 border-gray-800 h-[240px] p-4 bg-gray-50 flex-none">
        <div className="bg-white p-3 border-2 border-gray-800 flex items-center justify-center w-[160px] h-[160px]">
           {qrCodeUrl ? (
             <img src={qrCodeUrl} alt="QR Code da etiqueta" className="w-full h-full object-contain" />
           ) : (
             <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 font-bold flex-col border-2 border-dashed border-gray-400">
               <span>QR CODE</span>
               <span className="text-[9px] font-normal mt-2 text-center px-1 leading-tight">Gerando...</span>
             </div>
           )}
        </div>
        <div className="mt-4 font-bold text-xs tracking-wider text-gray-800 text-center truncate w-full px-2">{lote || '-'}</div>
      </div>

      {/* Bloco 4 - Controles (15mm - aprox 60px) */}
      <div className="flex flex-col justify-center h-[60px] p-2 text-[10px] bg-white flex-none">
         <div className="flex justify-between mb-2 px-4">
            <div className="flex items-center gap-1.5 font-bold"><div className="w-3.5 h-3.5 border-2 border-gray-800 bg-white flex-none"></div> INSPEÇÃO OK</div>
            <div className="flex items-center gap-1.5 font-bold"><div className="w-3.5 h-3.5 border-2 border-gray-800 bg-white flex-none"></div> EXPEDIÇÃO OK</div>
            <div className="flex items-center gap-1.5 font-bold"><div className="w-3.5 h-3.5 border-2 border-gray-800 bg-white flex-none"></div> ESTOQUE OK</div>
         </div>
      </div>
    </div>
  )
}

export default EtiquetaPaletePreview
