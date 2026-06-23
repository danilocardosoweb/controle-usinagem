import { FaHistory } from 'react-icons/fa'
import type { ITExecucao } from './types'

const statusClass: Record<string, string> = {
  finalizada: 'bg-emerald-100 text-emerald-700',
  em_producao: 'bg-blue-100 text-blue-700',
  bloqueada: 'bg-red-100 text-red-700',
  pronta: 'bg-amber-100 text-amber-700',
  aberta: 'bg-slate-100 text-slate-600',
}

export default function HistoricoIT({ rows, loading }: { rows: ITExecucao[]; loading?: boolean }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="font-black text-slate-900 flex items-center gap-2"><FaHistory className="text-blue-600" /> Últimas execuções</h3>
      {loading ? <div className="py-8 text-center text-sm text-slate-500">Carregando histórico...</div> : rows.length === 0 ? <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Nenhuma execução registrada para este item.</div> : (
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[720px] text-sm"><thead><tr className="border-b text-left text-[10px] uppercase tracking-wider text-slate-400"><th className="pb-2">Data</th><th className="pb-2">Operador</th><th className="pb-2">Máquina</th><th className="pb-2">1ª peça</th><th className="pb-2">Status</th><th className="pb-2">Observações</th></tr></thead><tbody>{rows.map(row => <tr key={row.id} className="border-b border-slate-100"><td className="py-3">{new Date(row.aberta_em).toLocaleString('pt-BR')}</td><td className="py-3 font-bold">{row.operador_nome}</td><td className="py-3">{row.maquina_nome || '-'}</td><td className="py-3 font-mono">{row.medida_primeira_peca_mm != null ? `${Number(row.medida_primeira_peca_mm).toLocaleString('pt-BR')} mm` : '-'}</td><td className="py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${statusClass[row.status_final] || statusClass.aberta}`}>{row.status_final.replace('_', ' ')}</span></td><td className="py-3 max-w-[240px] truncate" title={row.observacoes || ''}>{row.observacoes || '-'}</td></tr>)}</tbody></table></div>
      )}
    </section>
  )
}
