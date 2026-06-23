import { FaClock, FaCubes, FaForward, FaLayerGroup, FaRulerHorizontal, FaTachometerAlt } from 'react-icons/fa'
import type { ITDigital, ItemCorteContext } from './types'

interface Props { item: ItemCorteContext; it: ITDigital }

const tones: Record<string, { card: string; label: string }> = {
  slate: { card: 'bg-slate-50 border-slate-200', label: 'text-slate-600' },
  orange: { card: 'bg-orange-50 border-orange-200', label: 'text-orange-600' },
  blue: { card: 'bg-blue-50 border-blue-200', label: 'text-blue-600' },
  amber: { card: 'bg-amber-50 border-amber-200', label: 'text-amber-600' },
  cyan: { card: 'bg-cyan-50 border-cyan-200', label: 'text-cyan-600' },
  indigo: { card: 'bg-indigo-50 border-indigo-200', label: 'text-indigo-600' },
  emerald: { card: 'bg-emerald-50 border-emerald-200', label: 'text-emerald-600' },
}

const Metric = ({ label, value, tone = 'slate', icon }: { label: string; value: string; tone?: string; icon: React.ReactNode }) => (
  <div className={`rounded-xl border px-3 py-3 min-w-0 ${tones[tone]?.card || tones.slate.card}`}>
    <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-wider ${tones[tone]?.label || tones.slate.label}`}>{icon}{label}</div>
    <div className="mt-1 text-xl font-black text-slate-900 truncate">{value}</div>
  </div>
)

export default function ItemHeaderCard({ item, it }: Props) {
  const tolerancia = `-${Number(it.tolerancia_menos_mm).toLocaleString('pt-BR')} / +${Number(it.tolerancia_mais_mm).toLocaleString('pt-BR')} mm`
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="bg-slate-900 px-5 py-4 text-white flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300">Item em corte</p>
          <h2 className="text-2xl font-black">{item.codigoItem}</h2>
          <p className="text-sm text-slate-300">{item.cliente} · Pedido {item.pedidoSeq}</p>
        </div>
        <div className="rounded-full bg-emerald-500/15 border border-emerald-400/30 px-4 py-2 text-sm font-black text-emerald-300">
          IT v{it.versao} · {it.status === 'ativa' ? 'ATIVA' : it.status.toUpperCase()}
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-7 gap-3 p-4">
        <Metric tone="orange" icon={<FaRulerHorizontal />} label="Comprimento" value={`${Number(it.comprimento_acabado_mm).toLocaleString('pt-BR')} mm`} />
        <Metric tone="blue" icon={<FaTachometerAlt />} label="Meta" value={`${it.produtividade_padrao_pcs_hora || 0} pç/h`} />
        <Metric tone="amber" icon={<FaClock />} label="Tempo ciclo" value={`${it.tempo_ciclo_seg || 0} s`} />
        <Metric tone="slate" icon={<FaForward />} label="Avanco" value={it.avanco_maquina ? String(it.avanco_maquina).replace('.', ',') : '-'} />
        <Metric tone="cyan" icon={<FaLayerGroup />} label="Peças/pacote" value={String(it.pecas_por_pacote || 0)} />
        <Metric tone="indigo" icon={<FaCubes />} label="Total peças" value={Number(item.totalPecas || it.total_pecas || 0).toLocaleString('pt-BR')} />
        <Metric tone="emerald" icon={<FaRulerHorizontal />} label="Tolerância" value={tolerancia} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-2 px-5 pb-4 text-xs text-slate-600">
        <span><b>Perfil:</b> {item.codigoPerfil || '-'}</span>
        <span><b>Amarrados:</b> {it.quantidade_amarrados || item.quantidadeAmarrados || 0}</span>
        <span><b>Set-up:</b> {it.setup_minutos || 0} min</span>
        <span><b>Cortes/ciclo:</b> {it.cortes_por_ciclo || 1}</span>
      </div>
    </section>
  )
}
