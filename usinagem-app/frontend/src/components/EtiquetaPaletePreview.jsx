import React from 'react'
import Barcode from 'react-barcode'

/**
 * Componente de pré-visualização da etiqueta de palete 100x150mm
 * Layout industrial com blocos e Código de Barras
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
  status = 'PRODUZIDO'
}) => {
  // Valor do código de barras
  const barcodeValue = `${codigoProduto || 'SC'}-${rack || 'SR'}-${quantidade || '0'}`

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

      {/* Bloco 1 - Dados Essenciais (aprox 160px) */}
      <div className="flex flex-col border-b-2 border-gray-800 p-2.5 h-[160px] flex-none bg-white justify-between">
        <div className="flex justify-between items-start mb-2">
           <div className="flex-1 border-2 border-gray-800 p-2 px-3 mr-2 bg-white h-[70px] overflow-hidden flex flex-col justify-center min-w-0">
             <div className="text-[10px] font-bold text-gray-600 leading-none mb-1">CÓDIGO:</div>
             <div className="font-black text-[22px] leading-none truncate tracking-tight">{codigoProduto || '-'}</div>
           </div>
           <div className="w-[120px] flex items-center justify-center border-2 border-gray-800 p-2 bg-yellow-100 h-[70px] flex-none">
             <div className="flex flex-col items-center">
               <div className="text-[10px] font-bold text-gray-600 leading-none mb-1">QTD:</div>
               <div className="flex items-baseline">
                 <div className="font-black text-3xl leading-none">{quantidade || '-'}</div>
                 <div className="text-sm font-bold ml-1">PC</div>
               </div>
             </div>
           </div>
        </div>
        
        <div className="flex flex-col gap-1">
          <div className="text-sm truncate"><strong className="text-gray-600">DESCRIÇÃO:</strong> <span className="font-bold text-base">{descricao || '-'}</span></div>
          <div className="flex justify-between text-[11px] gap-2">
            <div className="truncate flex-[3]"><strong className="text-gray-600">CLIENTE:</strong> <span className="font-bold">{cliente || '-'}</span></div>
            <div className="truncate flex-[2]"><strong className="text-gray-600">PEDIDO:</strong> <span className="font-bold">{pedido || '-'}</span></div>
          </div>
          <div className="flex justify-between text-[11px] gap-2">
            <div className="truncate flex-[3]"><strong className="text-gray-600">CÓD. CLIENTE:</strong> <span className="font-bold">{codigoCliente || '-'}</span></div>
            <div className="whitespace-nowrap"><strong className="text-gray-600">DATA:</strong> <span className="font-bold">{dataProducao || '-'}</span></div>
          </div>
        </div>
      </div>

      {/* Bloco 2 - Informações Técnicas e Rack em Destaque (aprox 120px) */}
      <div className="flex border-b-2 border-gray-800 h-[120px] text-xs flex-none bg-white">
        <div className="w-1/2 border-r-2 border-gray-800 p-3 flex flex-col justify-between">
           <div className="truncate"><strong className="text-gray-600">MATERIAL:</strong> <span className="font-bold text-sm">{material || '-'}</span></div>
           <div className="truncate"><strong className="text-gray-600">LOTE MP:</strong> <span className="font-bold text-sm">{loteMP || '-'}</span></div>
           <div className="truncate"><strong className="text-gray-600">MÁQUINA:</strong> {maquina || '-'}</div>
           <div className="truncate"><strong className="text-gray-600">OPERADOR:</strong> {operador || '-'}</div>
        </div>
        <div className="w-1/2 p-0 flex flex-col">
           <div className="flex-1 border-b-2 border-gray-800 bg-blue-50 flex flex-col items-center justify-center p-2">
             <div className="text-[10px] font-bold text-gray-600 leading-none mb-1">RACK:</div>
             <div className="font-black text-3xl leading-none text-blue-900">{rack || '-'}</div>
           </div>
           <div className="flex justify-between p-1.5 px-2 text-[10px] border-b border-gray-200">
             <div className="truncate"><strong className="text-gray-600">TIPO:</strong> {tipo || 'USINADO'}</div>
             <div className="truncate"><strong className="text-gray-600">FIFO:</strong> {fifo || 'ÁREA A'}</div>
           </div>
           <div className="p-1.5 px-2 text-[10px] bg-gray-50 flex justify-between items-center">
             <div className="truncate"><strong className="text-gray-600">STATUS:</strong> <span className="font-bold ml-1">{status || 'PRODUZIDO'}</span></div>
           </div>
        </div>
      </div>

      {/* Bloco 3 - Rastreabilidade com Código de Barras (aprox 200px) */}
      <div className="flex flex-col items-center justify-center border-b-2 border-gray-800 h-[200px] p-2 bg-gray-50 flex-none relative">
        <div className="w-full flex items-center justify-center bg-white border-2 border-gray-800 py-2 h-[120px]">
           <Barcode 
             value={barcodeValue} 
             width={1.8} 
             height={60} 
             fontSize={14}
             margin={5}
             textMargin={5}
             displayValue={true}
             background="#ffffff"
           />
        </div>
        <div className="mt-3 font-bold text-lg tracking-wider text-gray-800 text-center truncate w-full px-2">LOTE: {lote || '-'}</div>
      </div>

      {/* Bloco 4 - Controles (aprox 60px) */}
      <div className="flex flex-col justify-center h-[60px] p-2 text-[10px] bg-white flex-none">
         <div className="flex justify-between px-4">
            <div className="flex items-center gap-1.5 font-bold"><div className="w-4 h-4 border-2 border-gray-800 bg-white flex-none"></div> INSPEÇÃO</div>
            <div className="flex items-center gap-1.5 font-bold"><div className="w-4 h-4 border-2 border-gray-800 bg-white flex-none"></div> EXPEDIÇÃO</div>
            <div className="flex items-center gap-1.5 font-bold"><div className="w-4 h-4 border-2 border-gray-800 bg-white flex-none"></div> ESTOQUE</div>
         </div>
      </div>
    </div>
  )
}

export default EtiquetaPaletePreview
