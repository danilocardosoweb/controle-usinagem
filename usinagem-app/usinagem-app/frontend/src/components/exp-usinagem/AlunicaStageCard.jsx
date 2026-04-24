import { Fragment } from 'react'
import { formatInteger } from '../../utils/expUsinagem'

const TABLE_HEADERS_DEFAULT = [
  'Pedido',
  'Cliente',
  'Nº Pedido',
  'Entrega',
  'Último movimento',
  'Ferramenta',
  'Kg',
  'Pc',
  'Duração',
  'Ações'
]

const AlunicaStageCard = ({ status, orders, renderActions, renderDetails, compact = false }) => (
  <article
    className={`border rounded-lg shadow-sm bg-white transition-shadow hover:shadow-md ${status.accent ? `border-l-4 ${status.accent}` : ''}`}
  >
    <div className="p-5 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            {status.title}
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
              {orders.length}
            </span>
          </h3>
        </div>
        {status.badge ? (
          <span className={`px-3 py-1 text-xs font-semibold uppercase tracking-wide rounded-full whitespace-nowrap ${status.badgeClass}`}>
            {status.badge}
          </span>
        ) : null}
      </div>

      {orders.length === 0 ? (
        <div className="rounded-md border border-dashed border-purple-200 bg-purple-50/40 px-4 py-4 text-sm text-purple-700">
          Nenhum material neste estágio.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className={`min-w-full text-left text-gray-700 ${compact ? 'text-[13px]' : 'text-sm'}`}>
            <thead>
              <tr className={`${compact ? 'text-[11px]' : 'text-xs'} uppercase tracking-wide text-gray-500`}>
                {TABLE_HEADERS_DEFAULT.map((header) => (
                  <th
                    key={header}
                    className={`${compact ? 'py-1.5' : 'py-2'} pr-3 ${['Kg', 'Pc'].includes(header) ? 'text-right' : ''}`}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((pedido, index) => {
                const rowKey = pedido.__rowKey || `alunica-frag-${pedido.id}-${index}`
                return (
                <Fragment key={rowKey}>
                <tr className="align-top hover:bg-purple-50/40">
                  <td className={`${compact ? 'py-1.5' : 'py-2'} pr-3 font-semibold text-gray-800`}>{pedido.pedido}</td>
                  <td className={`${compact ? 'py-1.5' : 'py-2'} pr-3 w-40 truncate`} title={pedido.cliente}>{pedido.cliente}</td>
                  <td className={`${compact ? 'py-1.5' : 'py-2'} pr-3`}>{pedido.numeroPedido || '—'}</td>
                  <td className={`${compact ? 'py-1.5' : 'py-2'} pr-3`}>{pedido.dataEntrega}</td>
                  <td className={`${compact ? 'py-1.5' : 'py-2'} pr-3`}>{pedido.ultimaMovimentacao || '—'}</td>
                  <td className={`${compact ? 'py-1.5' : 'py-2'} pr-3 truncate`} title={pedido.ferramenta}>{pedido.ferramenta}</td>
                  <td className={`${compact ? 'py-1.5' : 'py-2'} pr-3 text-right`}>
                    <div>{pedido.pedidoKg}</div>
                  </td>
                  <td className={`${compact ? 'py-1.5' : 'py-2'} pr-3 text-right`}>
                    <div>{pedido.pedidoPc}</div>
                    {Number.isFinite(pedido.apontadoPcNumber) && (
                      <div className="mt-0.5 text-[11px] text-gray-500 leading-tight">
                        {(() => {
                          const total = Number(pedido.pedidoPcNumber ?? 0)
                          const apont = Number(pedido.apontadoPcNumber ?? 0)
                          const saldo = Math.max(0, total - apont)
                          const percent = Number.isFinite(pedido.apontadoPercent)
                            ? pedido.apontadoPercent
                            : total > 0
                              ? Math.round((apont * 100) / total)
                              : 0
                          return `Apontado: ${apont.toLocaleString('pt-BR')} • Saldo: ${saldo.toLocaleString('pt-BR')} • ${percent}%`
                        })()}
                      </div>
                    )}
                  </td>
                  <td className={`${compact ? 'py-1.5' : 'py-2'} pr-3 text-center`}>
                    <div className="text-sm font-medium text-gray-700">
                      {pedido.duracaoFormatada || '—'}
                    </div>
                  </td>
                  <td className={`${compact ? 'py-1.5' : 'py-2'} pr-3`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      {renderActions ? renderActions(pedido) : null}
                    </div>
                  </td>
                </tr>
                {renderDetails ? (
                  <tr>
                    <td colSpan={10} className="bg-purple-50/30 px-3 pb-3">
                      {renderDetails(pedido)}
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan={10} className="bg-purple-50/30 px-3 pb-3">
                      {(() => {
                        const resumo = Array.isArray(pedido.resumoLotes) ? pedido.resumoLotes : []
                        if (!resumo.length) return null
                        const coluna = status.key === 'para-inspecao' ? 'inspecao' : 'embalagem'
                        const tituloQtd = status.key === 'para-inspecao' ? 'Qtd para Inspeção (Pc)' : 'Qtd para Embalagem (Pc)'
                        return (
                          <div className="mt-1 overflow-x-auto">
                            <table className="min-w-full text-[12px] text-gray-700">
                              <thead>
                                <tr className="text-[11px] uppercase tracking-wide text-gray-500">
                                  <th className="py-1 pr-3">Lote Usinagem</th>
                                  <th className="py-1 pr-3">Lote {status.key === 'para-inspecao' ? 'Inspeção' : 'Embalagem'}</th>
                                  <th className="py-1 pr-3 text-right">{tituloQtd}</th>
                                  <th className="py-1 pr-3">Início</th>
                                  <th className="py-1 pr-3">Fim</th>
                                  <th className="py-1 pr-3">Observações</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {resumo.map((r) => (
                                  <tr key={`res-${pedido.id}-${status.key}-${r.lote}`}>
                                    <td className="py-1 pr-3 font-medium text-gray-700">{r.loteExterno || '—'}</td>
                                    <td className="py-1 pr-3 font-semibold text-gray-800">{r.lote}</td>
                                    <td className="py-1 pr-3 text-right">{formatInteger(r[coluna])}</td>
                                    <td className="py-1 pr-3">{fmtDT(r.inicio)}</td>
                                    <td className="py-1 pr-3">{fmtDT(r.fim)}</td>
                                    <td className="py-1 pr-3">{r.obs || '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )
                      })()}
                    </td>
                  </tr>
                )}
                </Fragment>
                )})}
            </tbody>
          </table>
        </div>
      )}
    </div>
  </article>
)

export default AlunicaStageCard
