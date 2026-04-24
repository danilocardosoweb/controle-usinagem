import { FaTimes, FaCheck } from 'react-icons/fa'
import { formatDateBR } from '../../utils/expUsinagem'

const SelectionModal = ({
  open,
  onClose,
  selectionTab,
  setSelectionTab,
  importadosDisponiveis,
  pedidosCarteira,
  importadosLoading,
  selectedImportados,
  setSelectedImportados,
  selectedCarteira,
  setSelectedCarteira,
  toggleSelection,
  handleConfirmSelection,
  isSavingSelection
}) => {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
      <div className="relative w-full max-w-5xl rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Selecionar pedidos para o fluxo</h2>
            <p className="text-xs text-gray-500">Escolha itens da planilha importada ou da carteira para acompanhar na TecnoPerfil.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <FaTimes className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 border-b bg-gray-50 px-6 py-3 text-xs font-semibold text-gray-600">
          <button
            type="button"
            onClick={() => setSelectionTab('importados')}
            className={`rounded-md px-3 py-1 transition ${selectionTab === 'importados' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
          >
            Planilha importada ({importadosDisponiveis.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectionTab('carteira')}
            className={`rounded-md px-3 py-1 transition ${selectionTab === 'carteira' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
          >
            Carteira de pedidos ({(pedidosCarteira || []).length})
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto px-6 py-4">
          {selectionTab === 'importados' ? (
            importadosLoading ? (
              <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                Carregando itens importados...
              </div>
            ) : importadosDisponiveis.length === 0 ? (
              <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-4 text-sm text-gray-600">
                Nenhum item disponível na planilha importada (ou todos já foram adicionados ao fluxo).
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm text-gray-700">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide text-gray-500">
                      <th className="w-12 py-2 pr-3">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300"
                          checked={selectedImportados.length > 0 && selectedImportados.length === importadosDisponiveis.length}
                          onChange={(event) => {
                            if (event.target.checked) {
                              setSelectedImportados(importadosDisponiveis.map((item) => item.id))
                            } else {
                              setSelectedImportados([])
                            }
                          }}
                        />
                      </th>
                      <th className="py-2 pr-3">Pedido</th>
                      <th className="py-2 pr-3">Cliente</th>
                      <th className="py-2 pr-3">Nº Pedido</th>
                      <th className="py-2 pr-3">Entrega</th>
                      <th className="py-2 pr-3">Ferramenta</th>
                      <th className="py-2 pr-3 text-right">Kg</th>
                      <th className="py-2 pr-3 text-right">Pc</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {importadosDisponiveis.map((item) => (
                      <tr key={`importado-${item.id}`} className="align-top hover:bg-blue-50/40">
                        <td className="py-2 pr-3">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300"
                            checked={selectedImportados.includes(item.id)}
                            onChange={() => toggleSelection(item.id, 'importados')}
                          />
                        </td>
                        <td className="py-2 pr-3 font-semibold text-gray-800">{item.pedidoSeq}</td>
                        <td className="py-2 pr-3 w-48">{item.cliente}</td>
                        <td className="py-2 pr-3">{item.numeroPedido || '—'}</td>
                        <td className="py-2 pr-3">{item.dataEntrega}</td>
                        <td className="py-2 pr-3">{item.ferramenta}</td>
                        <td className="py-2 pr-3 text-right">{item.pedidoKg}</td>
                        <td className="py-2 pr-3 text-right">{item.pedidoPc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : !pedidosCarteira || pedidosCarteira.length === 0 ? (
            <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-4 text-sm text-gray-600">
              Nenhum pedido da carteira disponível para seleção (ou já está na TecnoPerfil).
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm text-gray-700">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-gray-500">
                    <th className="w-12 py-2 pr-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300"
                        checked={selectedCarteira.length > 0 && selectedCarteira.length === (pedidosCarteira || []).length}
                        onChange={(event) => {
                          if (event.target.checked) {
                            setSelectedCarteira(pedidosCarteira.map((item) => item.pedido_id))
                          } else {
                            setSelectedCarteira([])
                          }
                        }}
                      />
                    </th>
                    <th className="py-2 pr-3">Pedido</th>
                    <th className="py-2 pr-3">Cliente</th>
                    <th className="py-2 pr-3">Nº Pedido</th>
                    <th className="py-2 pr-3">Entrega</th>
                    <th className="py-2 pr-3">Ferramenta</th>
                    <th className="py-2 pr-3 text-right">Kg</th>
                    <th className="py-2 pr-3 text-right">Pc</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(pedidosCarteira || []).map((item) => (
                    <tr key={`carteira-${item.pedido_id}`} className="align-top hover:bg-blue-50/40">
                      <td className="py-2 pr-3">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300"
                          checked={selectedCarteira.includes(item.pedido_id)}
                          onChange={() => toggleSelection(item.pedido_id, 'carteira')}
                        />
                      </td>
                      <td className="py-2 pr-3 font-semibold text-gray-800">{item.pedidoSeq}</td>
                      <td className="py-2 pr-3 w-48">{item.cliente}</td>
                      <td className="py-2 pr-3">{item.numeroPedido || '—'}</td>
                      <td className="py-2 pr-3">{formatDateBR(item.dataEntregaIso)}</td>
                      <td className="py-2 pr-3">{item.ferramenta}</td>
                      <td className="py-2 pr-3 text-right">{item.pedidoKg}</td>
                      <td className="py-2 pr-3 text-right">{item.pedidoPc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t bg-gray-50 px-6 py-4 text-xs text-gray-500">
          <div>
            <p>Seleção atual: {selectedImportados.length + selectedCarteira.length} pedido(s).</p>
            <p>Os pedidos começarão no estágio "Pedido".</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-1.5 font-semibold text-gray-600 transition hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmSelection}
              disabled={isSavingSelection}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-1.5 font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FaCheck className="h-3.5 w-3.5" />
              {isSavingSelection ? 'Salvando...' : 'Adicionar ao fluxo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SelectionModal
