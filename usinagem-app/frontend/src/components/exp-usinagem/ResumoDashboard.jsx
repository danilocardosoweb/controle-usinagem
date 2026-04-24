import PropTypes from 'prop-types'
import { FaFileExcel } from 'react-icons/fa'
import { formatInteger, formatNumber } from '../../utils/expUsinagem'

const buildStageList = (statuses = [], stageTotals = {}) =>
  statuses.map((status, index) => {
    const summary = stageTotals?.[status.key] || {}
    return {
      ...status,
      index: index + 1,
      summary: {
        count: summary.count || 0,
        kg: summary.kg || 0,
        pc: summary.pc || 0
      }
    }
  })

const computeTopFerramentas = (stageTotals = {}) => {
  const acumulado = {}

  Object.values(stageTotals || {}).forEach((summary) => {
    const ferramentas = summary?.ferramentas
    if (!ferramentas) return

    Object.entries(ferramentas).forEach(([ferramenta, dados]) => {
      if (!acumulado[ferramenta]) {
        acumulado[ferramenta] = { kg: 0, pc: 0, count: 0 }
      }

      acumulado[ferramenta].kg += dados?.kg || 0
      acumulado[ferramenta].pc += dados?.pc || 0
      acumulado[ferramenta].count += dados?.count || 0
    })
  })

  return Object.entries(acumulado)
    .map(([ferramenta, dados]) => ({ ferramenta, ...dados }))
    .sort((a, b) => {
      if (b.kg !== a.kg) return b.kg - a.kg
      if (b.count !== a.count) return b.count - a.count
      return b.pc - a.pc
    })
}

const HotspotItem = ({ area, title, resumo }) => (
  <li className="rounded-xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{area}</p>
        <p className="text-sm font-semibold text-slate-700">{title}</p>
      </div>
      <span className="text-xs font-medium text-slate-500">
        {formatInteger(resumo.count)} pedido(s)
      </span>
    </div>
    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500">
      <span className="rounded-lg bg-slate-50 px-2 py-1">
        <span className="font-semibold text-slate-700">{formatNumber(resumo.kg)}</span>
        <span className="ml-1">Kg</span>
      </span>
      <span className="rounded-lg bg-slate-50 px-2 py-1">
        <span className="font-semibold text-slate-700">{formatInteger(resumo.pc)}</span>
        <span className="ml-1">Pc</span>
      </span>
    </div>
  </li>
)

HotspotItem.propTypes = {
  area: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  resumo: PropTypes.shape({
    count: PropTypes.number,
    kg: PropTypes.number,
    pc: PropTypes.number
  }).isRequired
}

const StageTimeline = ({ titulo, destaque, stages, accent }) => {
  const totalCount = destaque.count || 0

  return (
    <section className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-800">{titulo}</h3>
          <p className="text-xs text-slate-500">Sequência resumida das etapas e volumes atuais.</p>
        </div>
        <div className="flex items-baseline gap-2 text-sm font-semibold text-slate-700">
          <span>{formatInteger(destaque.count)} pedido(s)</span>
          <span className="text-xs font-medium text-slate-400">•</span>
          <span>{formatNumber(destaque.kg)} Kg</span>
          <span className="text-xs font-medium text-slate-400">•</span>
          <span>{formatInteger(destaque.pc)} Pc</span>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stages.map((stage) => {
          const percentual = totalCount > 0 ? Math.round((stage.summary.count / totalCount) * 100) : 0

          return (
            <div
              key={stage.key}
              className="flex h-full flex-col rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold text-white ${accent}`}
                  >
                    {stage.index}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{stage.title}</p>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{stage.badge}</p>
                  </div>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  {percentual}%
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-500">
                <span className="rounded-xl border border-slate-100 bg-white px-3 py-2 shadow-inner">
                  <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400">Pedidos</span>
                  <span className="text-sm font-semibold text-slate-700">{formatInteger(stage.summary.count)}</span>
                </span>
                <span className="rounded-xl border border-slate-100 bg-white px-3 py-2 shadow-inner">
                  <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400">Kg</span>
                  <span className="text-sm font-semibold text-slate-700">{formatNumber(stage.summary.kg)}</span>
                </span>
                <span className="rounded-xl border border-slate-100 bg-white px-3 py-2 shadow-inner">
                  <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400">Pc</span>
                  <span className="text-sm font-semibold text-slate-700">{formatInteger(stage.summary.pc)}</span>
                </span>
                <span className="rounded-xl border border-slate-100 bg-white px-3 py-2 shadow-inner">
                  <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400">Fluxos</span>
                  <span className="text-[11px] text-slate-500">
                    {stage.summary.count > 0 ? `${formatInteger(stage.summary.count)} em curso` : '—'}
                  </span>
                </span>
              </div>

              <div className="mt-4 space-y-1 text-[11px] text-slate-400">
                <div className="flex items-center justify-between">
                  <span>Participação no fluxo</span>
                  <span className="font-semibold text-slate-500">{percentual}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${accent.replace('bg-', 'bg-gradient-to-r from-')} to-slate-200`}
                    style={{ width: `${Math.min(percentual, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

StageTimeline.propTypes = {
  titulo: PropTypes.string.isRequired,
  destaque: PropTypes.shape({
    count: PropTypes.number,
    kg: PropTypes.number,
    pc: PropTypes.number
  }).isRequired,
  stages: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string,
      title: PropTypes.string,
      badge: PropTypes.string,
      summary: PropTypes.shape({
        count: PropTypes.number,
        kg: PropTypes.number,
        pc: PropTypes.number
      })
    })
  ).isRequired,
  accent: PropTypes.string.isRequired
}

const TopFerramentasCard = ({ titulo, linhas }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between">
      <h3 className="text-base font-semibold text-slate-800">{titulo}</h3>
      <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Top 4</span>
    </div>

    {linhas.length === 0 ? (
      <p className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
        Ainda não há materiais agrupados por ferramenta neste fluxo.
      </p>
    ) : (
      <div className="mt-4 overflow-hidden rounded-xl border border-slate-100">
        <table className="min-w-full divide-y divide-slate-100 text-sm text-slate-600">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="py-2 pl-4 pr-3 text-left font-semibold">Ferramenta</th>
              <th className="px-3 py-2 text-right font-semibold">Pedidos</th>
              <th className="px-3 py-2 text-right font-semibold">Kg</th>
              <th className="px-4 py-2 text-right font-semibold">Pc</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {linhas.map((item, index) => (
              <tr key={item.ferramenta} className="hover:bg-slate-50/60">
                <td className="py-2 pl-4 pr-3 font-semibold text-slate-700">
                  <span className="mr-2 text-xs font-bold text-slate-400">#{index + 1}</span>
                  {item.ferramenta}
                </td>
                <td className="px-3 py-2 text-right font-medium">{formatInteger(item.count)}</td>
                <td className="px-3 py-2 text-right font-medium">{formatNumber(item.kg)}</td>
                <td className="px-4 py-2 text-right font-medium">{formatInteger(item.pc)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </section>
)

TopFerramentasCard.propTypes = {
  titulo: PropTypes.string.isRequired,
  linhas: PropTypes.arrayOf(
    PropTypes.shape({
      ferramenta: PropTypes.string,
      kg: PropTypes.number,
      pc: PropTypes.number,
      count: PropTypes.number
    })
  ).isRequired
}

const ResumoDashboard = ({
  resumoTecnoPerfil,
  resumoAlunica,
  tecnoperfilStatus,
  alunicaStatus,
  fluxoLoading,
  lastMovement,
  onExport,
  exporting
}) => {
  const tecnoTotals = resumoTecnoPerfil || { totalCount: 0, totalKg: 0, totalPc: 0, stages: {} }
  const alunicaTotals = resumoAlunica || { totalCount: 0, totalKg: 0, totalPc: 0, stages: {} }

  const combinedTotals = {
    totalCount: (tecnoTotals.totalCount || 0) + (alunicaTotals.totalCount || 0),
    totalKg: (tecnoTotals.totalKg || 0) + (alunicaTotals.totalKg || 0),
    totalPc: (tecnoTotals.totalPc || 0) + (alunicaTotals.totalPc || 0)
  }

  const tecnoStages = buildStageList(tecnoperfilStatus, tecnoTotals.stages)
  const alunicaStages = buildStageList(alunicaStatus, alunicaTotals.stages)

  const tecnoHotspots = tecnoStages
    .filter((stage) => stage.summary.count > 0)
    .sort((a, b) => {
      if (b.summary.count !== a.summary.count) return b.summary.count - a.summary.count
      return b.summary.kg - a.summary.kg
    })
    .slice(0, 2)

  const alunicaHotspots = alunicaStages
    .filter((stage) => stage.summary.count > 0)
    .sort((a, b) => {
      if (b.summary.count !== a.summary.count) return b.summary.count - a.summary.count
      return b.summary.kg - a.summary.kg
    })
    .slice(0, 2)

  const hotspots = [
    ...tecnoHotspots.map((stage) => ({ area: 'TecnoPerfil', title: stage.title, resumo: stage.summary })),
    ...alunicaHotspots.map((stage) => ({ area: 'Alúnica', title: stage.title, resumo: stage.summary }))
  ]

  const tecnoTopFerramentas = computeTopFerramentas(tecnoTotals.stages).slice(0, 4)
  const alunicaTopFerramentas = computeTopFerramentas(alunicaTotals.stages).slice(0, 4)

  const tecnoExpedicao = tecnoTotals?.stages?.['expedicao-alu']?.count || 0
  const alunicaExpedicao = alunicaTotals?.stages?.['para-embarque']?.count || 0
  const transferReady = tecnoExpedicao + alunicaExpedicao

  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 p-[1px] shadow-lg">
        <div className="rounded-3xl bg-white/95 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-400">Resumo Integrado</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Situação consolidada das unidades TecnoPerfil e Alúnica</h2>
              <p className="mt-1 text-sm text-slate-500">
                Monitore rapidamente os pedidos em produção, os volumes movimentados e os próximos passos prioritários.
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 text-sm">
              <button
                type="button"
                onClick={onExport}
                disabled={fluxoLoading || exporting}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                  fluxoLoading || exporting
                    ? 'border-slate-200 bg-slate-100 text-slate-400'
                    : 'border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50'
                }`}
                title="Exportar resumo para Excel"
              >
                <FaFileExcel className="h-4 w-4" />
                {exporting ? 'Gerando arquivo...' : 'Exportar Excel'}
              </button>
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                  fluxoLoading
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-current" />
                {fluxoLoading ? 'Sincronizando dados do fluxo...' : 'Dados sincronizados com sucesso'}
              </span>
              {lastMovement ? (
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-xs text-slate-600 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Última movimentação</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">Pedido {lastMovement.pedido}</p>
                  <p className="text-xs text-slate-500">{lastMovement.cliente}</p>
                  <p className="mt-1 text-xs font-medium text-indigo-600">Movido para {lastMovement.destino}</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-3 text-xs text-slate-400">
                  Ainda não houve movimentações registradas nesta sessão.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Pedidos monitorados</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{formatInteger(combinedTotals.totalCount)}</p>
          <p className="mt-1 text-sm text-slate-500">Fluxo total entre TecnoPerfil e Alúnica</p>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">TecnoPerfil</p>
          <p className="mt-3 text-3xl font-semibold text-blue-800">{formatNumber(tecnoTotals.totalKg)}</p>
          <p className="mt-1 text-sm font-medium text-blue-700">Kg em processamento</p>
          <p className="mt-2 text-xs text-blue-500">{formatInteger(tecnoTotals.totalCount)} pedido(s)</p>
        </div>
        <div className="rounded-2xl border border-purple-100 bg-purple-50/60 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-purple-500">Alúnica</p>
          <p className="mt-3 text-3xl font-semibold text-purple-800">{formatNumber(alunicaTotals.totalKg)}</p>
          <p className="mt-1 text-sm font-medium text-purple-700">Kg em usinagem e expedição</p>
          <p className="mt-2 text-xs text-purple-500">{formatInteger(alunicaTotals.totalCount)} pedido(s)</p>
        </div>
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">Prontos para transferência</p>
          <p className="mt-3 text-3xl font-semibold text-indigo-800">{formatInteger(transferReady)}</p>
          <p className="mt-1 text-sm text-indigo-600">Pedidos aguardando expedição entre plantas</p>
          <p className="mt-2 text-xs text-indigo-500">
            {formatInteger(tecnoExpedicao)} TecnoPerfil → Alúnica · {formatInteger(alunicaExpedicao)} Alúnica → TecnoPerfil
          </p>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <StageTimeline
          titulo="Fluxo TecnoPerfil"
          destaque={{
            count: tecnoTotals.totalCount || 0,
            kg: tecnoTotals.totalKg || 0,
            pc: tecnoTotals.totalPc || 0
          }}
          stages={tecnoStages}
          accent="bg-blue-500"
        />
        <StageTimeline
          titulo="Fluxo Alúnica"
          destaque={{
            count: alunicaTotals.totalCount || 0,
            kg: alunicaTotals.totalKg || 0,
            pc: alunicaTotals.totalPc || 0
          }}
          stages={alunicaStages}
          accent="bg-purple-500"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-1">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-800">Próximas ações prioritárias</h3>
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Top gargalos</span>
          </div>
          {hotspots.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              Todos os estágios estão vazios no momento. Movimente pedidos para ver recomendações.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {hotspots.map((item) => (
                <HotspotItem key={`${item.area}-${item.title}`} area={item.area} title={item.title} resumo={item.resumo} />
              ))}
            </ul>
          )}
        </section>

        <TopFerramentasCard titulo="Top ferramentas • TecnoPerfil" linhas={tecnoTopFerramentas} />
        <TopFerramentasCard titulo="Top ferramentas • Alúnica" linhas={alunicaTopFerramentas} />
      </div>
    </div>
  )
}

ResumoDashboard.propTypes = {
  resumoTecnoPerfil: PropTypes.shape({
    totalCount: PropTypes.number,
    totalKg: PropTypes.number,
    totalPc: PropTypes.number,
    stages: PropTypes.object
  }),
  resumoAlunica: PropTypes.shape({
    totalCount: PropTypes.number,
    totalKg: PropTypes.number,
    totalPc: PropTypes.number,
    stages: PropTypes.object
  }),
  tecnoperfilStatus: PropTypes.arrayOf(PropTypes.object).isRequired,
  alunicaStatus: PropTypes.arrayOf(PropTypes.object).isRequired,
  fluxoLoading: PropTypes.bool,
  lastMovement: PropTypes.shape({
    pedido: PropTypes.string,
    cliente: PropTypes.string,
    destino: PropTypes.string
  }),
  onExport: PropTypes.func,
  exporting: PropTypes.bool
}

ResumoDashboard.defaultProps = {
  resumoTecnoPerfil: null,
  resumoAlunica: null,
  fluxoLoading: false,
  lastMovement: null,
  onExport: () => {},
  exporting: false
}

export default ResumoDashboard
