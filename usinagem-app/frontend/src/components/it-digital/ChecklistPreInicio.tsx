import { FaCheck, FaClipboardCheck, FaLock } from 'react-icons/fa'
import { CHECKLIST_PRE_INICIO } from './constants'

interface Props {
  values: Record<string, boolean>
  validacaoConforme: boolean
  disabled?: boolean
  onChange: (id: string, checked: boolean) => void
}

export default function ChecklistPreInicio({ values, validacaoConforme, disabled, onChange }: Props) {
  const concluidos = CHECKLIST_PRE_INICIO.filter(item => values[item.id]).length
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-black text-slate-900 flex items-center gap-2"><FaClipboardCheck className="text-blue-600" /> Checklist pré-início</h3>
          <p className="text-xs text-slate-500 mt-1">Todos os itens são obrigatórios.</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-black ${concluidos === CHECKLIST_PRE_INICIO.length ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{concluidos}/{CHECKLIST_PRE_INICIO.length}</span>
      </div>
      <div className="grid md:grid-cols-2 gap-2">
        {CHECKLIST_PRE_INICIO.map(item => {
          const locked = Boolean(('requiresConforme' in item) && item.requiresConforme && !validacaoConforme)
          const checked = Boolean(values[item.id])
          return (
            <label key={item.id} className={`flex items-center gap-3 rounded-xl border px-3 py-3 transition-colors ${checked ? 'border-emerald-300 bg-emerald-50' : locked ? 'border-slate-200 bg-slate-50 opacity-60' : 'border-slate-200 hover:border-blue-300 cursor-pointer'}`}>
              <input type="checkbox" className="sr-only" checked={checked} disabled={disabled || locked} onChange={event => onChange(item.id, event.target.checked)} />
              <span className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${checked ? 'bg-emerald-600 text-white' : 'bg-white border-2 border-slate-300 text-slate-400'}`}>{locked ? <FaLock size={11} /> : checked ? <FaCheck /> : null}</span>
              <span className="text-sm font-bold text-slate-700">{item.label}</span>
            </label>
          )
        })}
      </div>
    </section>
  )
}
