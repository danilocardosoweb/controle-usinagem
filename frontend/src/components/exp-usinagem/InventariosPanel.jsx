import { FaPlus, FaSave, FaTimes } from 'react-icons/fa'
import { formatNumber, formatInteger } from '../../utils/expUsinagem'

const InventariosPanel = ({
  onBack,
  newInvUnidade,
  setNewInvUnidade,
  newInvObs,
  setNewInvObs,
  invSaving,
  createInventarioFromSnapshot,
  invLoading,
  inventarios,
  activeInventario,
  setActiveInventario,
  loadInventarioItens,
  invError,
  invItensLoading,
  invItens,
  setInvItemField,
  saveInventarioItem,
  cancelInventario
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md px-3 py-1.5 text-xs font-semibold border border-gray-300 text-gray-600 hover:bg-gray-100"
        >
          Voltar ao estoque
        </button>
        <div className="ml-auto flex items-center gap-2">
          <select value={newInvUnidade} onChange={(e)=>setNewInvUnidade(e.target.value)} className="rounded-md border border-gray-300 px-2 py-1 text-xs">
            <option value="todas">Todas</option>
            <option value="TecnoPerfil">TecnoPerfil</option>
            <option value="Alúnica">Alúnica</option>
          </select>
          <input value={newInvObs} onChange={(e)=>setNewInvObs(e.target.value)} placeholder="Observações" className="rounded-md border border-gray-300 px-2 py-1 text-xs w-64" />
          <button type="button" onClick={createInventarioFromSnapshot} disabled={invSaving} className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
            <FaPlus className="h-3.5 w-3.5"/> Nova contagem
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 border rounded-md bg-white">
          <div className="border-b px-3 py-2 text-xs font-semibold text-gray-600">Inventários</div>
          <div className="max-h-[60vh] overflow-y-auto divide-y">
            {invLoading ? (
              <div className="p-3 text-xs text-gray-500">Carregando...</div>
            ) : (inventarios.length === 0 ? (
              <div className="p-3 text-xs text-gray-500">Nenhum inventário.</div>
            ) : inventarios.map((inv) => (
              <button
                key={inv.id}
                type="button"
                onClick={() => { setActiveInventario(inv.id); loadInventarioItens(inv.id) }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${String(activeInventario)===String(inv.id)?'bg-gray-50':''}`}
              >
                <div className="font-semibold text-gray-800">{new Date(inv.criado_em).toLocaleString('pt-BR')}</div>
                <div className="text-xs text-gray-500">{inv.unidade} • {inv.status}</div>
                {inv.observacoes ? <div className="text-xs text-gray-500 truncate">{inv.observacoes}</div> : null}
              </button>
            )))}
          </div>
        </div>

        <div className="lg:col-span-2 border rounded-md bg-white">
          <div className="border-b px-3 py-2 text-xs font-semibold text-gray-600 flex items-center">
            <span>Itens</span>
            {activeInventario ? (
              <div className="ml-auto flex items-center gap-2">
                <span className="text-[11px] text-gray-500">Inventário: {String(activeInventario).slice(0,8)}...</span>
                {(() => {
                  const inv = (inventarios || []).find((i) => String(i.id) === String(activeInventario))
                  return inv && inv.status === 'rascunho' ? (
                    <button
                      type="button"
                      onClick={() => cancelInventario(activeInventario)}
                      disabled={invSaving}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-red-600 text-white hover:bg-red-700"
                      title="Cancelar inventário"
                    >
                      <FaTimes />
                    </button>
                  ) : null
                })()}
              </div>
            ) : null}
          </div>
          {invError && <div className="px-3 py-2 text-xs text-red-600">{invError}</div>}
          {activeInventario ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm text-gray-700">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-gray-500">
                    <th className="py-2 pr-3">Pedido</th>
                    <th className="py-2 pr-3">Cliente</th>
                    <th className="py-2 pr-3">Ferramenta</th>
                    <th className="py-2 pr-3">Estágio</th>
                    <th className="py-2 pr-3 text-right">Sistema Kg</th>
                    <th className="py-2 pr-3 text-right">Sistema Pc</th>
                    <th className="py-2 pr-3 text-right">Contado Kg</th>
                    <th className="py-2 pr-3 text-right">Contado Pc</th>
                    <th className="py-2 pr-3 text-right">Dif Kg</th>
                    <th className="py-2 pr-3 text-right">Dif Pc</th>
                    <th className="py-2 pr-3">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invItensLoading ? (
                    <tr><td className="py-2 px-3 text-xs text-gray-500" colSpan={11}>Carregando...</td></tr>
                  ) : (
                    invItens.map((it) => (
                      <tr key={it.id} className="align-top">
                        <td className="py-2 pr-3 font-semibold text-gray-800">{it.pedido_seq}</td>
                        <td className="py-2 pr-3 w-40 truncate" title={it.cliente}>{it.cliente}</td>
                        <td className="py-2 pr-3">{it.ferramenta}</td>
                        <td className="py-2 pr-3">{it.estagio}</td>
                        <td className="py-2 pr-3 text-right">{formatNumber(it.sistema_kg)}</td>
                        <td className="py-2 pr-3 text-right">{formatInteger(it.sistema_pc)}</td>
                        <td className="py-2 pr-3 text-right">
                          <input
                            type="text"
                            value={it.contado_kg ?? ''}
                            onChange={(e)=> setInvItemField(it.id, 'contado_kg', e.target.value)}
                            className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm text-right"
                            placeholder="Kg"
                          />
                        </td>
                        <td className="py-2 pr-3 text-right">
                          <input
                            type="text"
                            value={it.contado_pc ?? ''}
                            onChange={(e)=> setInvItemField(it.id, 'contado_pc', e.target.value)}
                            className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm text-right"
                            placeholder="Pc"
                          />
                        </td>
                        <td className="py-2 pr-3 text-right">{formatNumber(it.diff_kg)}</td>
                        <td className="py-2 pr-3 text-right">{formatInteger(it.diff_pc)}</td>
                        <td className="py-2 pr-3">
                          <button
                            type="button"
                            onClick={() => saveInventarioItem(it, { contado_kg: it.contado_kg, contado_pc: it.contado_pc })}
                            disabled={invSaving}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-white hover:bg-blue-700"
                            title="Salvar contagem"
                          >
                            <FaSave />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-3 py-2 text-xs text-gray-500">Selecione um inventário na lista.</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default InventariosPanel
