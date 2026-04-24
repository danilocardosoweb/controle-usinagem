import React, { useRef } from 'react'
import { FaPrint, FaTimes } from 'react-icons/fa'

export default function ExpedicaoImpressao({ romaneio, itens, onClose }) {
  const printRef = useRef()

  const handlePrint = () => {
    const printWindow = window.open('', '', 'height=600,width=800')
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Romaneio ${romaneio.numero_romaneio}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            background: white;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
          }
          .header p {
            margin: 5px 0;
            font-size: 12px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
            font-size: 12px;
          }
          .info-item {
            display: flex;
            justify-content: space-between;
          }
          .info-label {
            font-weight: bold;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 11px;
          }
          table thead {
            background-color: #f0f0f0;
            border-bottom: 2px solid #333;
          }
          table th {
            padding: 8px;
            text-align: left;
            font-weight: bold;
          }
          table td {
            padding: 8px;
            border-bottom: 1px solid #ddd;
          }
          table tbody tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          .totals {
            margin-top: 20px;
            padding: 10px;
            background-color: #f0f0f0;
            border: 1px solid #333;
            font-size: 12px;
            font-weight: bold;
          }
          .signature-area {
            margin-top: 40px;
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 40px;
            font-size: 11px;
          }
          .signature-line {
            border-top: 1px solid #333;
            text-align: center;
            padding-top: 5px;
          }
          .barcode {
            text-align: center;
            margin: 20px 0;
            font-size: 14px;
            font-weight: bold;
            letter-spacing: 2px;
          }
          @media print {
            body {
              margin: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>ROMANEIO DE EXPEDIÇÃO</h1>
          <p>Tecnoperfil - Controle de Usinagem</p>
        </div>

        <div class="barcode">
          ${romaneio.numero_romaneio}
        </div>

        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Número do Romaneio:</span>
            <span>${romaneio.numero_romaneio}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Data de Criação:</span>
            <span>${new Date(romaneio.data_criacao).toLocaleDateString('pt-BR')}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Total de Racks:</span>
            <span>${romaneio.total_racks}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Total de Peças:</span>
            <span>${romaneio.total_pecas}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Criado por:</span>
            <span>${romaneio.usuario_criacao || '-'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Status:</span>
            <span>${romaneio.status.toUpperCase()}</span>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Rack</th>
              <th>Produto</th>
              <th>Ferramenta</th>
              <th>Comp.(mm)</th>
              <th>Qtd</th>
              <th>Cliente</th>
              <th>Pedido</th>
              <th>Lote Externo</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${itens.map(item => `
              <tr>
                <td>${item.rack_ou_pallet}</td>
                <td>${item.produto}</td>
                <td>${item.ferramenta || '-'}</td>
                <td style="text-align: center;">${item.comprimento_acabado_mm ? item.comprimento_acabado_mm + 'mm' : '-'}</td>
                <td style="text-align: center;">${item.quantidade}</td>
                <td>${item.cliente || '-'}</td>
                <td>${item.pedido_seq || '-'}</td>
                <td>${item.lote_externo || '-'}</td>
                <td>${item.status_item || 'pendente'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals">
          <div>Total de Itens: ${itens.length}</div>
          <div>Total de Peças: ${itens.reduce((sum, i) => sum + (i.quantidade || 0), 0)}</div>
        </div>

        <div class="signature-area">
          <div class="signature-line">
            Conferência
          </div>
          <div class="signature-line">
            Expedição
          </div>
          <div class="signature-line">
            Recebimento
          </div>
        </div>
      </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-gray-800">Pré-visualização: {romaneio.numero_romaneio}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        <div ref={printRef} className="p-8 bg-white">
          <div className="text-center mb-8 border-b-2 border-gray-800 pb-4">
            <h1 className="text-2xl font-bold">ROMANEIO DE EXPEDIÇÃO</h1>
            <p className="text-sm text-gray-600">Tecnoperfil - Controle de Usinagem</p>
          </div>

          <div className="text-center text-lg font-bold mb-6 tracking-wider">
            {romaneio.numero_romaneio}
          </div>

          <div className="grid grid-cols-2 gap-6 mb-8 text-sm">
            <div className="flex justify-between">
              <span className="font-bold">Número do Romaneio:</span>
              <span>{romaneio.numero_romaneio}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">Data de Criação:</span>
              <span>{new Date(romaneio.data_criacao).toLocaleDateString('pt-BR')}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">Total de Racks:</span>
              <span>{romaneio.total_racks}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">Total de Peças:</span>
              <span>{romaneio.total_pecas}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">Criado por:</span>
              <span>{romaneio.usuario_criacao || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">Status:</span>
              <span className="uppercase font-bold">{romaneio.status}</span>
            </div>
          </div>

          <table className="w-full border-collapse mb-8 text-xs">
            <thead className="bg-gray-100 border-b-2 border-gray-800">
              <tr>
                <th className="border px-3 py-2 text-left">Rack</th>
                <th className="border px-3 py-2 text-left">Produto</th>
                <th className="border px-3 py-2 text-left">Ferramenta</th>
                <th className="border px-3 py-2 text-center">Comp.(mm)</th>
                <th className="border px-3 py-2 text-center">Qtd</th>
                <th className="border px-3 py-2 text-left">Cliente</th>
                <th className="border px-3 py-2 text-left">Pedido</th>
                <th className="border px-3 py-2 text-left">Lote Externo</th>
                <th className="border px-3 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border px-3 py-2">{item.rack_ou_pallet}</td>
                  <td className="border px-3 py-2">{item.produto}</td>
                  <td className="border px-3 py-2">{item.ferramenta || '-'}</td>
                  <td className="border px-3 py-2 text-center">{item.comprimento_acabado_mm ? `${item.comprimento_acabado_mm}mm` : '-'}</td>
                  <td className="border px-3 py-2 text-center">{item.quantidade}</td>
                  <td className="border px-3 py-2">{item.cliente || '-'}</td>
                  <td className="border px-3 py-2">{item.pedido_seq || '-'}</td>
                  <td className="border px-3 py-2">{item.lote_externo || '-'}</td>
                  <td className="border px-3 py-2">{item.status_item || 'pendente'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="bg-gray-100 border border-gray-800 p-4 mb-8 text-sm font-bold">
            <div>Total de Itens: {itens.length}</div>
            <div>Total de Peças: {itens.reduce((sum, i) => sum + (i.quantidade || 0), 0)}</div>
          </div>

          <div className="grid grid-cols-3 gap-8 mt-16 text-xs">
            <div className="border-t border-gray-800 text-center pt-2">
              Conferência
            </div>
            <div className="border-t border-gray-800 text-center pt-2">
              Expedição
            </div>
            <div className="border-t border-gray-800 text-center pt-2">
              Recebimento
            </div>
          </div>
        </div>

        <div className="flex gap-4 p-6 border-t bg-gray-50 sticky bottom-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
          >
            Fechar
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2"
          >
            <FaPrint /> Imprimir
          </button>
        </div>
      </div>
    </div>
  )
}
