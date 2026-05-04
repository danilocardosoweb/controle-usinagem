import React, { useRef, useState } from 'react'
import { FaPrint, FaTimes, FaFileExcel, FaFileAlt } from 'react-icons/fa'
import ReimpressaoApontamentosModal from './ReimpressaoApontamentosModal'

const fmtInt = (n) => Number(n || 0).toLocaleString('pt-BR')
const fmtDec = (n, dec = 1) => Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec })

export default function ExpedicaoImpressao({ romaneio, itens, onClose, apontamentos }) {
  const printRef = useRef()
  const [reimpressaoModalAberto, setReimpressaoModalAberto] = useState(false)

  // Ordenar itens por Palete (rack_ou_pallet) do menor para o maior
  const itensOrdenados = React.useMemo(() => {
    return [...(itens || [])].sort((a, b) => {
      const rackA = String(a.rack_ou_pallet || '').toUpperCase()
      const rackB = String(b.rack_ou_pallet || '').toUpperCase()
      return rackA.localeCompare(rackB, 'pt-BR', { numeric: true, sensitivity: 'base' })
    })
  }, [itens])

  const totalPecas = itensOrdenados.reduce((sum, i) => sum + (i.quantidade || 0), 0)
  const pesoTotal = itensOrdenados.reduce((sum, i) => sum + (i.peso_estimado_kg || 0), 0)
  const clienteUnico = romaneio.cliente || [...new Set(itensOrdenados.map(i => i.cliente).filter(Boolean))].join(', ')

  const handlePrint = () => {
    const printWindow = window.open('', '', 'height=800,width=1100')
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Romaneio ${romaneio.numero_romaneio}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Segoe UI', Arial, sans-serif; margin: 24px; background: white; color: #1a1a1a; }
          .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #1e3a5f; padding-bottom: 12px; margin-bottom: 16px; }
          .header-left h1 { font-size: 20px; color: #1e3a5f; letter-spacing: 1px; }
          .header-left p { font-size: 11px; color: #666; margin-top: 2px; }
          .header-right { text-align: right; }
          .header-right .rom-num { font-size: 16px; font-weight: 700; color: #1e3a5f; }
          .header-right .rom-date { font-size: 11px; color: #666; margin-top: 2px; }
          .info-bar { display: flex; gap: 0; margin-bottom: 16px; border: 1px solid #d1d5db; border-radius: 6px; overflow: hidden; font-size: 11px; }
          .info-cell { flex: 1; padding: 8px 12px; border-right: 1px solid #d1d5db; }
          .info-cell:last-child { border-right: none; }
          .info-cell .label { color: #6b7280; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
          .info-cell .value { font-weight: 700; font-size: 13px; margin-top: 2px; }
          .kit-bar { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 8px 14px; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; font-size: 12px; }
          .kit-bar .kit-label { font-weight: 700; color: #1e40af; }
          .kit-bar .kit-value { color: #1e3a5f; }
          table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 16px; }
          thead th { background: #1e3a5f; color: white; padding: 6px 8px; text-align: left; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; }
          thead th.center { text-align: center; }
          thead th.right { text-align: right; }
          tbody td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; }
          tbody tr:nth-child(even) { background: #f9fafb; }
          tbody td.center { text-align: center; }
          tbody td.right { text-align: right; }
          tbody td.mono { font-family: 'Consolas', monospace; }
          .summary { display: flex; gap: 0; border: 2px solid #1e3a5f; border-radius: 6px; overflow: hidden; font-size: 11px; margin-bottom: 24px; }
          .summary-cell { flex: 1; padding: 8px 12px; text-align: center; border-right: 1px solid #d1d5db; }
          .summary-cell:last-child { border-right: none; }
          .summary-cell .s-label { color: #6b7280; font-size: 9px; text-transform: uppercase; }
          .summary-cell .s-value { font-weight: 700; font-size: 14px; color: #1e3a5f; }
          .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 40px; margin-top: 32px; font-size: 10px; }
          .sig-block { text-align: center; }
          .sig-line { border-top: 1px solid #333; padding-top: 4px; margin-top: 40px; }
          @media print { body { margin: 12px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">
            <h1>ROMANEIO DE EXPEDI&Ccedil;&Atilde;O</h1>
            <p>Tecnoperfil - Controle de Usinagem</p>
          </div>
          <div class="header-right">
            <div class="rom-num">${romaneio.numero_romaneio}</div>
            <div class="rom-date">${new Date(romaneio.data_criacao).toLocaleDateString('pt-BR')}</div>
          </div>
        </div>

        <div class="info-bar">
          <div class="info-cell">
            <div class="label">Cliente</div>
            <div class="value">${clienteUnico || '-'}</div>
          </div>
          <div class="info-cell">
            <div class="label">Status</div>
            <div class="value">${(romaneio.status || '').toUpperCase()}</div>
          </div>
          <div class="info-cell">
            <div class="label">Racks</div>
            <div class="value">${fmtInt(romaneio.total_racks || itens.length)}</div>
          </div>
          <div class="info-cell">
            <div class="label">Pe&ccedil;as</div>
            <div class="value">${fmtInt(romaneio.total_pecas || totalPecas)}</div>
          </div>
          <div class="info-cell">
            <div class="label">Peso Estimado</div>
            <div class="value">${pesoTotal > 0 ? fmtDec(pesoTotal) + ' kg' : '-'}</div>
          </div>
          <div class="info-cell">
            <div class="label">Criado por</div>
            <div class="value">${romaneio.usuario_criacao || '-'}</div>
          </div>
        </div>

        ${romaneio.kit_nome ? `
        <div class="kit-bar">
          <span class="kit-label">Kit:</span>
          <span class="kit-value">${romaneio.kit_codigo || ''} - ${romaneio.kit_nome}${romaneio.quantidade_kits ? ' (' + romaneio.quantidade_kits + ' kits)' : ''}</span>
        </div>
        ` : ''}

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Palete</th>
              <th>Produto</th>
              <th>Ferramenta</th>
              <th class="center">Comp.</th>
              <th class="center">Qtd</th>
              <th class="right">Peso (kg)</th>
              <th>Cliente</th>
              <th>Pedido Seq</th>
              <th>Pedido Cliente</th>
              <th>Lote Externo</th>
            </tr>
          </thead>
          <tbody>
            ${itensOrdenados.map((item, idx) => `
              <tr>
                <td class="center" style="color:#999">${idx + 1}</td>
                <td><strong>${item.rack_ou_pallet || '-'}</strong></td>
                <td class="mono">${item.produto || '-'}</td>
                <td>${item.ferramenta || '-'}</td>
                <td class="center">${item.comprimento_acabado_mm ? item.comprimento_acabado_mm + 'mm' : '-'}</td>
                <td class="center"><strong>${fmtInt(item.quantidade)}</strong></td>
                <td class="right">${item.peso_estimado_kg ? fmtDec(item.peso_estimado_kg) : '-'}</td>
                <td>${item.cliente || '-'}</td>
                <td>${item.pedido_seq || '-'}</td>
                <td><strong>${item.pedido_cliente || '-'}</strong></td>
                <td>${item.lote_externo || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="summary">
          <div class="summary-cell">
            <div class="s-label">Total Itens</div>
            <div class="s-value">${fmtInt(itens.length)}</div>
          </div>
          <div class="summary-cell">
            <div class="s-label">Total Pe&ccedil;as</div>
            <div class="s-value">${fmtInt(totalPecas)}</div>
          </div>
          <div class="summary-cell">
            <div class="s-label">Peso Total</div>
            <div class="s-value">${fmtDec(pesoTotal)} kg</div>
          </div>
        </div>

        <div class="signatures">
          <div class="sig-block"><div class="sig-line">Confer&ecirc;ncia</div></div>
          <div class="sig-block"><div class="sig-line">Expedi&ccedil;&atilde;o</div></div>
          <div class="sig-block"><div class="sig-line">Recebimento</div></div>
        </div>
      </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[92vh] flex flex-col">
        {/* Header fixo */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-white rounded-t-lg flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-800">{romaneio.numero_romaneio}</h2>
            <p className="text-xs text-gray-500">
              {new Date(romaneio.data_criacao).toLocaleDateString('pt-BR')}
              {clienteUnico ? ` | ${clienteUnico}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        {/* Cards de resumo */}
        <div className="px-6 pt-4 pb-2 flex-shrink-0">
          <div className="grid grid-cols-5 gap-3">
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-[10px] uppercase tracking-wide text-blue-500 font-semibold">Status</p>
              <p className="text-sm font-bold text-blue-700 uppercase mt-0.5">{romaneio.status}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">Racks</p>
              <p className="text-lg font-bold text-gray-800 mt-0.5">{fmtInt(romaneio.total_racks || itens.length)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">Peças</p>
              <p className="text-lg font-bold text-gray-800 mt-0.5">{fmtInt(romaneio.total_pecas || totalPecas)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">Peso</p>
              <p className="text-lg font-bold text-gray-800 mt-0.5">{pesoTotal > 0 ? fmtDec(pesoTotal) + ' kg' : '-'}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">Criado por</p>
              <p className="text-sm font-bold text-gray-800 mt-0.5 truncate">{romaneio.usuario_criacao || '-'}</p>
            </div>
          </div>

          {romaneio.kit_nome && (
            <div className="mt-3 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
              <span className="text-xs font-bold text-blue-700 uppercase">Kit:</span>
              <span className="text-sm font-semibold text-blue-900">
                {romaneio.kit_codigo} - {romaneio.kit_nome}
              </span>
              {romaneio.quantidade_kits && (
                <span className="ml-auto bg-blue-600 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
                  {romaneio.quantidade_kits} kits
                </span>
              )}
            </div>
          )}
        </div>

        {/* Tabela com scroll */}
        <div className="flex-1 overflow-auto px-6 pb-2">
          <table className="w-full text-sm">
            <thead className="sticky top-0">
              <tr className="bg-slate-700 text-white text-xs uppercase tracking-wider">
                <th className="px-3 py-2.5 text-left rounded-tl-lg w-8">#</th>
                <th className="px-3 py-2.5 text-left">Palete</th>
                <th className="px-3 py-2.5 text-left">Produto</th>
                <th className="px-3 py-2.5 text-left">Ferramenta</th>
                <th className="px-3 py-2.5 text-center">Comp.</th>
                <th className="px-3 py-2.5 text-center">Qtd</th>
                <th className="px-3 py-2.5 text-right">Peso (kg)</th>
                <th className="px-3 py-2.5 text-left">Cliente</th>
                <th className="px-3 py-2.5 text-left">Pedido Seq</th>
                <th className="px-3 py-2.5 text-left">Pedido Cliente</th>
                <th className="px-3 py-2.5 text-left rounded-tr-lg">Lote Externo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {itensOrdenados.map((item, idx) => (
                <tr key={idx} className="hover:bg-blue-50/40 transition-colors">
                  <td className="px-3 py-2 text-gray-400 text-xs">{idx + 1}</td>
                  <td className="px-3 py-2 font-semibold text-gray-800">{item.rack_ou_pallet || '-'}</td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-600">{item.produto || '-'}</td>
                  <td className="px-3 py-2 text-gray-700">{item.ferramenta || '-'}</td>
                  <td className="px-3 py-2 text-center text-gray-700">{item.comprimento_acabado_mm ? `${item.comprimento_acabado_mm}mm` : '-'}</td>
                  <td className="px-3 py-2 text-center font-bold text-gray-800">{fmtInt(item.quantidade)}</td>
                  <td className="px-3 py-2 text-right text-gray-700">{item.peso_estimado_kg ? fmtDec(item.peso_estimado_kg) : '-'}</td>
                  <td className="px-3 py-2 text-gray-700">{item.cliente || '-'}</td>
                  <td className="px-3 py-2 text-gray-700">{item.pedido_seq || '-'}</td>
                  <td className="px-3 py-2 text-gray-700 font-semibold">{item.pedido_cliente || '-'}</td>
                  <td className="px-3 py-2 text-gray-700">{item.lote_externo || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer fixo */}
        <div className="flex items-center gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-lg flex-shrink-0">
          <div className="flex-1 text-xs text-gray-500">
            {fmtInt(itens.length)} itens | {fmtInt(totalPecas)} peças | {fmtDec(pesoTotal)} kg
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-100 text-sm font-medium"
          >
            Fechar
          </button>
          <button
            onClick={() => setReimpressaoModalAberto(true)}
            className="px-5 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm font-medium flex items-center gap-2"
          >
            <FaFileAlt className="w-3.5 h-3.5" /> Reimprimir Apontamentos
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-2"
          >
            <FaPrint className="w-3.5 h-3.5" /> Imprimir
          </button>
        </div>
      </div>

      {/* Modal de Reimpressão de Apontamentos */}
      {reimpressaoModalAberto && (
        <ReimpressaoApontamentosModal
          isOpen={reimpressaoModalAberto}
          onClose={() => setReimpressaoModalAberto(false)}
          itens={itensOrdenados}
          apontamentos={apontamentos}
        />
      )}
    </div>
  )
}
