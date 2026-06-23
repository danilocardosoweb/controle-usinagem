import { FaArrowRight, FaCheck, FaFlagCheckered, FaRoute } from 'react-icons/fa'

interface Etapa { id: string; titulo: string; instrucao: string }
interface Props { etapas: Etapa[]; concluidas: string[]; disabled?: boolean; onConcluir: (id: string, final: boolean) => Promise<void> }

export default function StepByStepIT({ etapas, concluidas, disabled, onConcluir }: Props) {
  const atual = etapas.findIndex(etapa => !concluidas.includes(etapa.id))
  const indiceAtual = atual === -1 ? etapas.length : atual
  const progresso = etapas.length ? Math.round((concluidas.length / etapas.length) * 100) : 0

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div><h3 className="font-black text-slate-900 flex items-center gap-2"><FaRoute className="text-orange-500" /> Modo corte guiado</h3><p className="text-xs text-slate-500 mt-1">Siga uma etapa por vez.</p></div>
        <span className="text-lg font-black text-orange-600">{progresso}%</span>
      </div>
      <div className="mt-4 h-3 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-gradient-to-r from-orange-500 to-emerald-500 transition-all" style={{ width: `${progresso}%` }} /></div>
      <div className="mt-5 space-y-3">
        {etapas.map((etapa, index) => {
          const concluida = concluidas.includes(etapa.id)
          const ativa = index === indiceAtual
          return (
            <div key={etapa.id} className={`rounded-xl border p-4 ${concluida ? 'border-emerald-200 bg-emerald-50' : ativa ? 'border-orange-300 bg-orange-50 ring-2 ring-orange-100' : 'border-slate-200 bg-slate-50 opacity-65'}`}>
              <div className="flex items-start gap-3">
                <span className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-black ${concluida ? 'bg-emerald-600 text-white' : ativa ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-500'}`}>{concluida ? <FaCheck /> : index + 1}</span>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-slate-900">{etapa.titulo}</h4>
                  <p className="text-sm text-slate-600 mt-1">{etapa.instrucao}</p>
                </div>
                {ativa && !concluida && <button type="button" disabled={disabled} onClick={() => onConcluir(etapa.id, index === etapas.length - 1)} className="hidden sm:flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-50">{index === etapas.length - 1 ? <FaFlagCheckered /> : <FaArrowRight />}{index === etapas.length - 1 ? 'Finalizar IT' : 'Concluir etapa'}</button>}
              </div>
              {ativa && !concluida && <button type="button" disabled={disabled} onClick={() => onConcluir(etapa.id, index === etapas.length - 1)} className="sm:hidden mt-3 w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-black text-white disabled:opacity-50">{index === etapas.length - 1 ? 'Finalizar IT' : 'Concluir etapa'}</button>}
            </div>
          )
        })}
      </div>
    </section>
  )
}
