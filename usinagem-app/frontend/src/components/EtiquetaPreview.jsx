import React from 'react'

/**
 * Componente de pré-visualização da etiqueta 100x45mm
 * Layout em formato paisagem (mais largo que alto)
 * Corresponde ao layout TSPL gerado para TSC TE200
 */
const EtiquetaPreview = ({
  lote = '',
  loteMP = '',
  rack = '',
  qtde = '',
  ferramenta = '',
  dureza = '',
  numeroEtiqueta = 1,
  totalEtiquetas = 1,
  codigoProdutoCliente = '',
  nomeCliente = '',
  comprimento = '',
  pedidoCliente = ''
}) => {
  const loteLine1 = String(lote || '').slice(0, 32)
  const loteLine2 = String(lote || '').slice(32, 64)

  // Proporção real: 100mm x 45mm = largura 100%, altura 45%
  // Escala visual: 100mm = 400px, 45mm = 180px
  return (
    <div 
      className="bg-white border-2 border-gray-800 rounded overflow-hidden shadow-lg flex flex-col"
      style={{ width: '400px', height: '180px' }}
    >
      {/* Header - Faixa preta */}
      <div className="bg-gray-900 text-white text-center py-1 font-bold text-sm tracking-wide">
        TECNOPERFIL ALUMINIO
      </div>

      {/* Conteúdo Principal - Duas colunas */}
      <div className="flex-1 flex px-2 py-1 text-xs gap-3">
        {/* Coluna Esquerda */}
        <div className="flex-1 space-y-1">
          {/* Qtde */}
          <div className="font-semibold"><strong>Qtde:</strong> {qtde} PC</div>
          
          {/* Perfil */}
          <div className="font-semibold"><strong>Perfil:</strong> {ferramenta}</div>
          
          {/* Dureza */}
          <div className="font-semibold"><strong>Dureza:</strong> {dureza}</div>

          {/* Comp */}
          <div className="font-semibold"><strong>Comp.:</strong> {comprimento ? `${comprimento} mm` : '-'} </div>
          
          {/* Cod Cliente */}
          <div className="text-[9px]"><strong>Cod Cliente:</strong> {codigoProdutoCliente || '-'}</div>
          
          {/* Nome */}
          <div className="text-[9px]"><strong>Nome:</strong> {nomeCliente || '-'}</div>
        </div>

        {/* Coluna Direita */}
        <div className="flex-1 space-y-1">
          {/* Rack */}
          <div className="font-semibold"><strong>Rack:</strong> {rack}</div>
          
          {/* Lote MP */}
          <div className="text-[9px]"><strong>Lote MP:</strong> {loteMP || '-'}</div>

          {/* Pedido.Cliente */}
          <div className="text-[9px]"><strong>Pedido.Cliente:</strong> {pedidoCliente || '-'}</div>
        </div>
      </div>

      {/* Rodapé - Faixa preta */}
      <div className="px-2 pb-2 text-[9px]">
        <div><strong>Lote Usinagem:</strong></div>
        <div className="font-mono text-[8px] break-all">{loteLine1 || '-'}</div>
        {loteLine2 ? <div className="font-mono text-[8px] break-all">{loteLine2}</div> : null}
      </div>
    </div>
  )
}

export default EtiquetaPreview
