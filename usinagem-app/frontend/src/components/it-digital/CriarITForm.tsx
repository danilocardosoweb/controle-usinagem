import { useState } from 'react'
import { FaClipboardList, FaCog, FaLayerGroup, FaPlus, FaSave } from 'react-icons/fa'
import type { CriarITInput, ItemCorteContext } from './types'
import { CRITERIOS_APROVACAO, CRITERIOS_REPROVACAO, ETAPAS_PADRAO } from './constants'

type FormState = {
  tolerancia: string
  pecasPorPacote: string
  quantidadeAmarrados: string
  totalPecas: string
  tempoCiclo: string
  setup: string
  cortes: string
  produtividade: string
  avanco: string
  barra: string
  arquivo: string
  objetivo: string
  procedimento: string
}

const joinLines = (items: string[]) => items.join('\n')

const splitLines = (value: string) =>
  value
    .split(/\r?\n/g)
    .map(line => line.replace(/^\s*(?:[-–•]|\d+[.)])\s*/, '').trim())
    .filter(Boolean)

const parseNumber = (value: string) => Number(value.replace(/\./g, '').replace(',', '.')) || 0

const inputClass = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base font-black text-slate-800 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100'
const textAreaClass = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100'

const Field = ({ label, value, onChange, suffix, placeholder }: { label: string; value: string; onChange: (value: string) => void; suffix?: string; placeholder?: string }) => (
  <label className="block text-xs font-black uppercase tracking-wide text-slate-600">
    {label}
    <div className="relative">
      <input
        type="text"
        inputMode="decimal"
        value={value}
        placeholder={placeholder}
        onChange={event => onChange(event.target.value)}
        className={`${inputClass} ${suffix ? 'pr-14' : ''}`}
      />
      {suffix && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">{suffix}</span>}
    </div>
  </label>
)

const Section = ({ icon, title, subtitle, children }: { icon: React.ReactNode; title: string; subtitle: string; children: React.ReactNode }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
    <div className="mb-3 flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600">{icon}</span>
      <div>
        <h4 className="text-sm font-black text-slate-900">{title}</h4>
        <p className="text-xs font-bold text-slate-500">{subtitle}</p>
      </div>
    </div>
    {children}
  </section>
)

export default function CriarITForm({ item, onCreate, disabled }: { item: ItemCorteContext; onCreate: (input: CriarITInput) => Promise<void>; disabled?: boolean }) {
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormState>({
    tolerancia: '0,5',
    pecasPorPacote: String(item.pecasPorPacote || ''),
    quantidadeAmarrados: String(item.quantidadeAmarrados || ''),
    totalPecas: String(item.totalPecas || ''),
    tempoCiclo: String(item.tempoCicloSeg || ''),
    setup: String(item.setupMinutos || ''),
    cortes: String(item.cortesPorCiclo || 1),
    produtividade: String(item.produtividadePadrao || ''),
    avanco: '',
    barra: String(item.barraOriginalMm || ''),
    arquivo: item.arquivoItUrl || '',
    objetivo: `Cortar o perfil ${item.codigoItem} para ${item.cliente}, mantendo medida, qualidade e rastreabilidade do lote.`,
    procedimento: joinLines(ETAPAS_PADRAO.map(etapa => etapa.instrucao)),
  })

  const update = (key: keyof FormState, value: string) => setForm(prev => ({ ...prev, [key]: value }))

  const submit = async () => {
    const pecas = Math.max(0, Math.floor(parseNumber(form.pecasPorPacote)))
    const totalPecas = Math.max(0, Math.floor(parseNumber(form.totalPecas))) || item.totalPecas
    const quantidadeAmarrados = Math.max(0, Math.floor(parseNumber(form.quantidadeAmarrados))) || (pecas > 0 ? Math.ceil(totalPecas / pecas) : 0)
    const procedimento = splitLines(form.procedimento).map((instrucao, index) => ({
      id: `processo_${index + 1}`,
      titulo: `Passo ${index + 1}`,
      instrucao,
    }))

    setSaving(true)
    try {
      await onCreate({
        codigo_item: item.codigoItem,
        codigo_perfil: item.codigoPerfil,
        cliente: item.cliente,
        comprimento_acabado_mm: item.comprimentoAcabado,
        tolerancia_menos_mm: parseNumber(form.tolerancia),
        tolerancia_mais_mm: parseNumber(form.tolerancia),
        pecas_por_pacote: pecas,
        quantidade_amarrados: quantidadeAmarrados,
        total_pecas: totalPecas,
        tempo_ciclo_seg: parseNumber(form.tempoCiclo),
        setup_minutos: parseNumber(form.setup),
        cortes_por_ciclo: Math.max(1, Math.floor(parseNumber(form.cortes))),
        produtividade_padrao_pcs_hora: parseNumber(form.produtividade),
        avanco_maquina: parseNumber(form.avanco) || null,
        barra_original_mm: parseNumber(form.barra) || null,
        sobra_mm: null,
        arquivo_it_url: form.arquivo.trim() || null,
        objetivo: form.objetivo.trim() || null,
        aplicacao_responsaveis: 'Operadores habilitados da Serra Doppia 2 Cabecas.',
        equipamentos: ['Serra Doppia 2 Cabecas', 'Trena ou paquimetro calibrado'],
        materiais: ['Perfil identificado conforme OP'],
        epis_obrigatorios: ['Oculos de seguranca', 'Protetor auricular', 'Calcado de seguranca'],
        procedimento_operacional: procedimento,
        criterios_aprovacao: CRITERIOS_APROVACAO,
        criterios_reprovacao: CRITERIOS_REPROVACAO,
      })
    } finally {
      setSaving(false)
    }
  }

  if (!show) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setShow(true)}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 font-black text-white hover:bg-orange-600 disabled:opacity-50"
      >
        <FaPlus /> Criar ficha de processo
      </button>
    )
  }

  return (
    <div className="mt-3 w-full max-w-6xl rounded-3xl border border-orange-200 bg-orange-50/70 p-3 text-left shadow-sm">
      <div className="mb-3 rounded-2xl bg-slate-950 p-4 text-white">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-300">Ficha de processo</p>
        <h3 className="mt-1 text-xl font-black">Receita de corte do item</h3>
        <p className="mt-1 text-xs font-semibold text-slate-300">
          Cadastre os parametros da maquina e o modo de preparo. Essa ficha sera usada como guia do operador.
        </p>
        <div className="mt-3 grid gap-2 text-xs font-bold text-slate-200 md:grid-cols-3">
          <span className="rounded-xl bg-white/10 px-3 py-2">Item: {item.codigoItem}</span>
          <span className="rounded-xl bg-white/10 px-3 py-2">Cliente: {item.cliente}</span>
          <span className="rounded-xl bg-white/10 px-3 py-2">Acabado: {item.comprimentoAcabado.toLocaleString('pt-BR')} mm</span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="grid gap-3 xl:grid-cols-[2fr_1fr]">
        <Section icon={<FaCog />} title="1. Parametros da maquina" subtitle="Regulagens que o operador precisa repetir no corte.">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Field label="Tolerancia +/-" value={form.tolerancia} onChange={value => update('tolerancia', value)} suffix="mm" />
            <Field label="Tempo ciclo" value={form.tempoCiclo} onChange={value => update('tempoCiclo', value)} suffix="s" />
            <Field label="Set-up" value={form.setup} onChange={value => update('setup', value)} suffix="min" />
            <Field label="Avanco" value={form.avanco} onChange={value => update('avanco', value)} placeholder="Velocidade" />
            <Field label="Cortes por ciclo" value={form.cortes} onChange={value => update('cortes', value)} />
            <Field label="Meta pecas/h" value={form.produtividade} onChange={value => update('produtividade', value)} />
            <Field label="Barra original" value={form.barra} onChange={value => update('barra', value)} suffix="mm" />
            <Field label="Arquivo / IT" value={form.arquivo} onChange={value => update('arquivo', value)} placeholder="Nome ou URL" />
          </div>
        </Section>

        <Section icon={<FaLayerGroup />} title="2. Producao e embalagem" subtitle="Quantidades usadas para montar pacote, amarrado e lote.">
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <Field label="Pecas por pacote" value={form.pecasPorPacote} onChange={value => update('pecasPorPacote', value)} />
            <Field label="Quantidade de amarrados" value={form.quantidadeAmarrados} onChange={value => update('quantidadeAmarrados', value)} />
            <Field label="Total de pecas" value={form.totalPecas} onChange={value => update('totalPecas', value)} />
          </div>
        </Section>
        </div>

        <Section icon={<FaClipboardList />} title="3. Receita operacional" subtitle="Escreva como uma receita: uma linha para cada passo do operador.">
          <label className="block text-xs font-black uppercase tracking-wide text-slate-600">
            Objetivo da ficha
            <textarea rows={1} value={form.objetivo} onChange={event => update('objetivo', event.target.value)} className={textAreaClass} />
          </label>
          <label className="mt-3 block text-xs font-black uppercase tracking-wide text-slate-600">
            Modo de preparo do corte
            <textarea rows={4} value={form.procedimento} onChange={event => update('procedimento', event.target.value)} className={textAreaClass} />
          </label>
        </Section>

      </div>

      <button
        type="button"
        disabled={saving}
        onClick={submit}
        className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-base font-black text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600 disabled:opacity-50"
      >
        <FaSave /> {saving ? 'Salvando ficha...' : 'Salvar ficha e abrir IT Digital'}
      </button>
    </div>
  )
}
