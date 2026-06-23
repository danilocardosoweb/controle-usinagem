import { useState } from 'react'
import { FaCheckCircle, FaExclamationTriangle, FaRuler } from 'react-icons/fa'
import type { ITDigital, ValidacaoStatus } from './types'

interface Props {
  it: ITDigital
  value: number | null
  status: ValidacaoStatus
  disabled?: boolean
  onValidate: (value: number, status: ValidacaoStatus) => Promise<void>
}

export default function ValidacaoDimensional({ it, value, status, disabled, onValidate }: Props) {
  const [input, setInput] = useState(value != null ? String(value).replace('.', ',') : '')
  const [saving, setSaving] = useState(false)
  const alvo = Number(it.comprimento_acabado_mm)
  const minimo = alvo - Number(it.tolerancia_menos_mm)
  const maximo = alvo + Number(it.tolerancia_mais_mm)

  const validar = async () => {
    const medida = Number(input.replace(',', '.'))
    if (!Number.isFinite(medida) || medida <= 0) return
    const novoStatus: ValidacaoStatus = medida >= minimo && medida <= maximo ? 'conforme' : 'fora_tolerancia'
    setSaving(true)
    try { await onValidate(medida, novoStatus) } finally { setSaving(false) }
  }

  return (
    <section className={`rounded-2xl border p-5 shadow-sm ${status === 'conforme' ? 'border-emerald-300 bg-emerald-50' : status === 'fora_tolerancia' ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-black text-slate-900 flex items-center gap-2"><FaRuler className="text-orange-500" /> Validação da primeira peça</h3>
          <p className="text-sm text-slate-600 mt-1">Faixa permitida: <b>{minimo.toLocaleString('pt-BR')} a {maximo.toLocaleString('pt-BR')} mm</b></p>
        </div>
        {status === 'conforme' && <span className="flex items-center gap-2 rounded-full bg-emerald-600 text-white px-4 py-2 font-black"><FaCheckCircle /> Conforme</span>}
        {status === 'fora_tolerancia' && <span className="flex items-center gap-2 rounded-full bg-red-600 text-white px-4 py-2 font-black"><FaExclamationTriangle /> Fora da tolerância</span>}
      </div>
      <div className="mt-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input type="text" inputMode="decimal" value={input} disabled={disabled} onChange={event => setInput(event.target.value)} placeholder="Informe a medida em mm" className="w-full h-14 rounded-xl border-2 border-slate-300 bg-white px-4 pr-14 text-2xl font-black focus:border-orange-500 focus:outline-none" />
          <span className="absolute right-4 top-4 font-bold text-slate-400">mm</span>
        </div>
        <button type="button" disabled={disabled || saving || !input.trim()} onClick={validar} className="h-14 rounded-xl bg-orange-500 px-6 font-black text-white hover:bg-orange-600 disabled:opacity-50">{saving ? 'Validando...' : 'Validar medida'}</button>
      </div>
      {status === 'fora_tolerancia' && <p className="mt-3 text-sm font-bold text-red-700">Produção bloqueada. Regule novamente a serra e valide uma nova peça piloto.</p>}
    </section>
  )
}
