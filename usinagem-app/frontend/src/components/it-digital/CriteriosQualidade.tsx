import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa'

export default function CriteriosQualidade({ aprovacao, reprovacao }: { aprovacao: string[]; reprovacao: string[] }) {
  return (
    <section className="grid lg:grid-cols-2 gap-4">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <h3 className="font-black text-emerald-900 flex items-center gap-2"><FaCheckCircle /> Critérios de aprovação</h3>
        <ul className="mt-3 space-y-2">{aprovacao.map(item => <li key={item} className="flex gap-2 text-sm text-emerald-900"><FaCheckCircle className="mt-0.5 flex-shrink-0" />{item}</li>)}</ul>
      </div>
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
        <h3 className="font-black text-red-900 flex items-center gap-2"><FaTimesCircle /> Critérios de reprovação</h3>
        <ul className="mt-3 space-y-2">{reprovacao.map(item => <li key={item} className="flex gap-2 text-sm text-red-900"><FaTimesCircle className="mt-0.5 flex-shrink-0" />{item}</li>)}</ul>
      </div>
    </section>
  )
}
