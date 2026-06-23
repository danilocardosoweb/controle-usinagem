import { FaCut, FaRulerCombined } from 'react-icons/fa'
import type { ITDigital } from './types'

export default function CorteVisual({ it }: { it: ITDigital }) {
  const acabado = Number(it.comprimento_acabado_mm || 0)
  const barra = Number(it.barra_original_mm || 0)
  const porBarra = barra > 0 && acabado > 0 ? Math.max(1, Math.floor(barra / acabado)) : Math.max(1, Number(it.cortes_por_ciclo || 1))
  const usado = acabado * porBarra
  const sobra = it.sobra_mm != null ? Number(it.sobra_mm) : (barra > 0 ? Math.max(0, barra - usado) : null)
  const totalVisual = barra > 0 ? barra : usado

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-black text-slate-900 flex items-center gap-2"><FaCut className="text-orange-500" /> Visual de corte</h3>
          <p className="text-xs text-slate-500 mt-1">Representação simplificada da barra e divisões planejadas.</p>
        </div>
        <span className="text-xs font-bold text-slate-500">{porBarra} peça(s) por barra/ciclo</span>
      </div>
      <div className="rounded-xl bg-slate-900 p-4 overflow-hidden">
        <div className="flex h-16 rounded-lg overflow-hidden border-2 border-slate-600">
          {Array.from({ length: porBarra }, (_, index) => (
            <div key={index} className="relative bg-gradient-to-b from-slate-300 to-slate-500 border-r-2 border-orange-400 flex items-center justify-center text-[10px] font-black text-slate-900" style={{ width: `${(acabado / totalVisual) * 100}%` }}>
              {acabado.toLocaleString('pt-BR')} mm
            </div>
          ))}
          {sobra != null && sobra > 0 && <div className="bg-amber-400/80 flex items-center justify-center text-[10px] font-black text-amber-950" style={{ width: `${(sobra / totalVisual) * 100}%` }}>Sobra {sobra.toLocaleString('pt-BR')} mm</div>}
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-300">
          <span className="flex items-center gap-1"><FaRulerCombined /> Barra: {barra > 0 ? `${barra.toLocaleString('pt-BR')} mm` : 'não informada'}</span>
          <span>Acabado: {acabado.toLocaleString('pt-BR')} mm</span>
          <span>Sobra: {sobra == null ? 'não calculada' : `${sobra.toLocaleString('pt-BR')} mm`}</span>
        </div>
      </div>
    </section>
  )
}
