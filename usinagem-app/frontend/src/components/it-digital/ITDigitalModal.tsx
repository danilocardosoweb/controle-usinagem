import { useCallback, useEffect, useMemo, useState } from 'react'
import { FaBookOpen, FaCheckCircle, FaClipboardList, FaExclamationTriangle, FaFileAlt, FaPlay, FaSave, FaTimes } from 'react-icons/fa'
import ChecklistPreInicio from './ChecklistPreInicio'
import CorteVisual from './CorteVisual'
import CriarITForm from './CriarITForm'
import CriteriosQualidade from './CriteriosQualidade'
import HistoricoIT from './HistoricoIT'
import ItemHeaderCard from './ItemHeaderCard'
import StepByStepIT from './StepByStepIT'
import ValidacaoDimensional from './ValidacaoDimensional'
import { CHECKLIST_PRE_INICIO, ETAPAS_PADRAO } from './constants'
import { atualizarExecucao, abrirOuReutilizarExecucao, buscarHistoricoIT, buscarITDoItem, criarIT, ITDigitalSchemaError } from './itDigitalService'
import type { CriarITInput, ITDigital, ITExecucao, ItemCorteContext, MaquinaContext, OperadorContext, ValidacaoStatus } from './types'

interface Props {
  open: boolean
  item: ItemCorteContext | null
  operador: OperadorContext
  maquina: MaquinaContext
  onClose: () => void
}

type Tab = 'preparo' | 'guia' | 'qualidade' | 'historico'

export default function ITDigitalModal({ open, item, operador, maquina, onClose }: Props) {
  const [it, setIt] = useState<ITDigital | null>(null)
  const [execucao, setExecucao] = useState<ITExecucao | null>(null)
  const [historico, setHistorico] = useState<ITExecucao[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [schemaMissing, setSchemaMissing] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<Tab>('preparo')
  const [observacoes, setObservacoes] = useState('')

  const load = useCallback(async () => {
    if (!open || !item) return
    setLoading(true); setError(''); setSchemaMissing(false); setIt(null); setExecucao(null); setTab('preparo')
    try {
      const found = await buscarITDoItem(item.codigoItem, item.comprimentoAcabado)
      setIt(found)
      const history = await buscarHistoricoIT(item.codigoItem)
      setHistorico(history)
      if (found) {
        const run = await abrirOuReutilizarExecucao(found, item, operador, maquina)
        setExecucao(run)
        setObservacoes(run.observacoes || '')
        if (run.status_final === 'em_producao') setTab('guia')
      }
    } catch (err) {
      if (err instanceof ITDigitalSchemaError) setSchemaMissing(true)
      else setError(err instanceof Error ? err.message : 'Não foi possível carregar a IT Digital.')
    } finally { setLoading(false) }
  }, [open, item, operador.id, operador.nome, maquina.id, maquina.nome])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const refreshHistory = async () => { if (item) setHistorico(await buscarHistoricoIT(item.codigoItem)) }
  const handleCreate = async (input: CriarITInput) => {
    if (!item) return
    try {
      const created = await criarIT(input, operador.id)
      setIt(created)
      const run = await abrirOuReutilizarExecucao(created, item, operador, maquina)
      setExecucao(run)
      await refreshHistory()
    } catch (err) {
      if (err instanceof ITDigitalSchemaError) setSchemaMissing(true)
      else setError(err instanceof Error ? err.message : 'Não foi possível criar a IT.')
    }
  }

  const persist = async (patch: Partial<ITExecucao>) => {
    if (!execucao) return
    setSaving(true); setError('')
    try {
      const updated = await atualizarExecucao(execucao.id, patch)
      setExecucao(updated)
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível salvar a execução.') }
    finally { setSaving(false) }
  }

  const handleChecklist = async (id: string, checked: boolean) => {
    if (!execucao) return
    const checklist = { ...(execucao.checklist || {}), [id]: checked }
    const checklistConcluido = CHECKLIST_PRE_INICIO.every(itemChecklist => Boolean(checklist[itemChecklist.id]))
    const statusFinal = execucao.status_validacao_dimensional === 'fora_tolerancia'
      ? 'bloqueada'
      : (checklistConcluido ? 'pronta' : 'aberta')
    await persist({ checklist, checklist_concluido: checklistConcluido, status_final: statusFinal })
  }

  const handleValidate = async (medida: number, status: ValidacaoStatus) => {
    if (!execucao) return
    const checklist: Record<string, boolean> = {
      ...(execucao.checklist || {}),
      medir_primeira_peca: true,
      ...(status !== 'conforme' ? { aprovar_primeira_peca: false } : {}),
    }
    const checklistConcluido = CHECKLIST_PRE_INICIO.every(itemChecklist => Boolean(checklist[itemChecklist.id]))
    await persist({ medida_primeira_peca_mm: medida, status_validacao_dimensional: status, checklist, checklist_concluido: checklistConcluido, status_final: status === 'fora_tolerancia' ? 'bloqueada' : (checklistConcluido ? 'pronta' : 'aberta') })
  }

  const podeIniciar = useMemo(() => Boolean(execucao?.checklist_concluido && execucao.status_validacao_dimensional === 'conforme'), [execucao])
  const iniciarCorte = async () => {
    if (!podeIniciar) return
    await persist({ status_final: 'em_producao', iniciada_em: execucao?.iniciada_em || new Date().toISOString() })
    setTab('guia')
  }
  const concluirEtapa = async (id: string, final: boolean) => {
    if (!execucao) return
    const etapas = Array.from(new Set([...(execucao.etapas_concluidas || []), id]))
    await persist({ etapas_concluidas: etapas, ...(final ? { status_final: 'finalizada', finalizada_em: new Date().toISOString() } : {}) })
    if (final) await refreshHistory()
  }
  const salvarObservacoes = async () => { await persist({ observacoes: observacoes.trim() || null }); await refreshHistory() }

  if (!open || !item) return null
  const etapas = (it?.procedimento_operacional?.length ? it.procedimento_operacional : ETAPAS_PADRAO) as Array<{ id: string; titulo: string; instrucao: string }>

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/75 backdrop-blur-sm p-0 md:p-3">
      <div className="mx-auto flex h-full max-w-[1500px] flex-col overflow-hidden bg-slate-100 md:rounded-2xl shadow-2xl">
        <header className="flex items-center justify-between gap-3 bg-gradient-to-r from-slate-950 via-slate-900 to-orange-950 px-4 md:px-5 py-3 text-white">
          <div className="flex items-center gap-3"><span className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-lg"><FaBookOpen /></span><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300">Assistente Digital de Corte</p><h1 className="text-lg md:text-xl font-black leading-tight">IT Digital</h1></div></div>
          <button type="button" onClick={onClose} className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center" aria-label="Fechar IT Digital"><FaTimes /></button>
        </header>

        {it && <nav className="flex overflow-x-auto border-b bg-white px-3 md:px-5">{([
          ['preparo','Preparação',FaClipboardList],['guia','Corte guiado',FaPlay],['qualidade','Qualidade',FaCheckCircle],['historico','Histórico',FaFileAlt],
        ] as const).map(([id,label,Icon]) => <button key={id} type="button" onClick={() => setTab(id)} className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-black ${tab === id ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><Icon />{label}</button>)}</nav>}

        <main className="flex-1 overflow-y-auto p-2 md:p-3">
          {loading ? <div className="h-full min-h-[360px] flex flex-col items-center justify-center text-slate-500"><div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-orange-500 animate-spin" /><p className="mt-4 font-bold">Carregando IT Digital...</p></div> : schemaMissing ? (
            <div className="h-full min-h-[360px] flex items-center justify-center"><div className="max-w-xl rounded-2xl border border-amber-300 bg-amber-50 p-7 text-center"><FaExclamationTriangle className="mx-auto text-4xl text-amber-500" /><h2 className="mt-4 text-xl font-black text-slate-900">Módulo aguardando preparação do banco</h2><p className="mt-2 text-sm text-slate-600">A interface está pronta, mas as tabelas <b>it_digitais</b> e <b>it_execucoes</b> ainda precisam ser criadas no Supabase pela migration do projeto.</p></div></div>
          ) : error && !it ? <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700 font-bold">{error}<button type="button" onClick={load} className="ml-4 underline">Tentar novamente</button></div> : !it ? (
            <div className="flex min-h-full items-start justify-center pt-2"><div className="w-full max-w-6xl rounded-3xl border-2 border-dashed border-slate-300 bg-white p-4 text-center"><div className="flex flex-col items-center justify-center sm:flex-row sm:gap-4"><FaFileAlt className="text-3xl text-slate-300" /><div><h2 className="text-xl font-black text-slate-900">Nenhuma IT cadastrada</h2><p className="mt-1 text-sm text-slate-500">{item.codigoItem} · {item.comprimentoAcabado.toLocaleString('pt-BR')} mm</p></div></div><CriarITForm item={item} onCreate={handleCreate} /></div></div>
          ) : (
            <div className="space-y-4">
              <ItemHeaderCard item={item} it={it} />
              {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}
              {tab === 'preparo' && <><CorteVisual it={it} /><div className="grid xl:grid-cols-2 gap-4"><ChecklistPreInicio values={execucao?.checklist || {}} validacaoConforme={execucao?.status_validacao_dimensional === 'conforme'} disabled={saving} onChange={handleChecklist} /><ValidacaoDimensional it={it} value={execucao?.medida_primeira_peca_mm ?? null} status={execucao?.status_validacao_dimensional || 'pendente'} disabled={saving} onValidate={handleValidate} /></div><button type="button" disabled={!podeIniciar || saving} onClick={iniciarCorte} className="w-full min-h-16 rounded-2xl bg-emerald-600 px-6 py-4 text-xl font-black text-white shadow-lg hover:bg-emerald-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"><span className="flex items-center justify-center gap-3"><FaPlay />{podeIniciar ? 'Iniciar Corte' : 'Conclua o checklist e aprove a primeira peça'}</span></button></>}
              {tab === 'guia' && <>{execucao?.status_final !== 'em_producao' && execucao?.status_final !== 'finalizada' ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">Finalize a preparação para liberar o modo de corte guiado.</div> : <StepByStepIT etapas={etapas} concluidas={execucao?.etapas_concluidas || []} disabled={saving} onConcluir={concluirEtapa} />}<div className="rounded-2xl border border-slate-200 bg-white p-5"><label className="text-sm font-black text-slate-700">Observações da execução<textarea value={observacoes} onChange={event => setObservacoes(event.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal" placeholder="Registre ajustes, ocorrências ou informações importantes..." /></label><button type="button" onClick={salvarObservacoes} disabled={saving} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-bold text-white disabled:opacity-50"><FaSave /> Salvar observações</button></div></>}
              {tab === 'qualidade' && <><ValidacaoDimensional it={it} value={execucao?.medida_primeira_peca_mm ?? null} status={execucao?.status_validacao_dimensional || 'pendente'} disabled={saving} onValidate={handleValidate} /><CriteriosQualidade aprovacao={it.criterios_aprovacao || []} reprovacao={it.criterios_reprovacao || []} /></>}
              {tab === 'historico' && <HistoricoIT rows={historico} loading={loading} />}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
