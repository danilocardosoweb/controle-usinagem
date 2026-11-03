import { useEffect, useMemo, useState } from 'react'
import { FaExclamationTriangle, FaHistory, FaRecycle, FaTimes, FaUndo } from 'react-icons/fa'
import SucateamentoService from '../services/SucateamentoService'
import RackTransferenciaService from '../services/RackTransferenciaService'

const MOTIVOS = [
  ['dimensional', 'Dimensional'],
  ['risco', 'Risco'],
  ['amassado', 'Amassado'],
  ['torcao', 'Torção'],
  ['empenamento', 'Empenamento'],
  ['acabamento', 'Acabamento'],
  ['extrusao', 'Problema de extrusão'],
  ['usinagem', 'Problema de usinagem'],
  ['embalagem', 'Problema de embalagem'],
  ['qualidade', 'Reprovação da Qualidade'],
  ['outro', 'Outro'],
]

const ORIGENS = [
  ['qualidade', 'Qualidade'],
  ['producao', 'Produção'],
  ['cliente', 'Cliente'],
  ['expedicao', 'Expedição'],
  ['outro', 'Outro'],
]

const numero = (valor) => Number(valor || 0) || 0
const formatar = (valor, unidade = 'PC') => numero(valor).toLocaleString('pt-BR', {
  minimumFractionDigits: unidade === 'KG' ? 2 : 0,
  maximumFractionDigits: unidade === 'KG' ? 3 : 0,
})

export default function SucateamentoProducaoModal({ apontamento, user, onClose, onSuccess }) {
  const [historico, setHistorico] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const [quantidade, setQuantidade] = useState('')
  const [peso, setPeso] = useState('')
  const [motivo, setMotivo] = useState('qualidade')
  const [origem, setOrigem] = useState('qualidade')
  const [observacao, setObservacao] = useState('')
  const [evidenciaUrl, setEvidenciaUrl] = useState('')
  const [estorno, setEstorno] = useState(null)
  const [motivoEstorno, setMotivoEstorno] = useState('')
  const [saldosRack, setSaldosRack] = useState([])
  const [rackSelecionado, setRackSelecionado] = useState('')

  const unidade = String(apontamento?.unidade || 'PC').toUpperCase() === 'KG' ? 'KG' : 'PC'
  const produzidoBruto = numero(apontamento?.quantidade_bruta ?? apontamento?.quantidade)
  const pesoProduzido = numero(apontamento?.peso_produzido_estimado_kg)
  const jaSucateado = useMemo(() => historico
    .filter(item => item.status === 'ativo')
    .reduce((total, item) => total + numero(item.quantidade_sucateada), 0), [historico])
  const pesoJaSucateado = useMemo(() => historico
    .filter(item => item.status === 'ativo')
    .reduce((total, item) => total + numero(item.peso_sucateado_kg), 0), [historico])
  const saldoRackSelecionado = saldosRack.find(item => item.rack_saldo === rackSelecionado)
  const saldoDisponivel = Math.max(0, numero(saldoRackSelecionado?.saldo_quantidade))
  const pesoDisponivel = Math.max(0, pesoProduzido - pesoJaSucateado)
  const quantidadeNova = numero(quantidade)
  const saldoApos = Math.max(0, saldoDisponivel - quantidadeNova)
  const podeGerenciar = ['admin', 'administrador', 'administrator', 'superadmin', 'supervisor']
    .includes(String(user?.nivel_acesso || user?.role || '').trim().toLowerCase())

  const carregar = async () => {
    setCarregando(true)
    setErro('')
    try {
      const [historicoAtual, saldosAtuais] = await Promise.all([
        SucateamentoService.listar(apontamento.id),
        RackTransferenciaService.listarSaldosApontamento(apontamento.id),
      ])
      setHistorico(historicoAtual)
      setSaldosRack(saldosAtuais)
      const rackPreferido = String(apontamento.rack_saldo || apontamento.rack_acabado || apontamento.rack_ou_pallet || '').trim().toUpperCase()
      setRackSelecionado(atual => atual && saldosAtuais.some(item => item.rack_saldo === atual)
        ? atual
        : (saldosAtuais.find(item => item.rack_saldo === rackPreferido)?.rack_saldo || saldosAtuais[0]?.rack_saldo || ''))
    } catch (e) {
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [apontamento.id])

  const validar = () => {
    if (!podeGerenciar) return 'Apenas supervisores ou administradores podem confirmar o sucateamento.'
    if (!rackSelecionado) return 'Selecione o rack onde o material será sucateado.'
    if (quantidadeNova <= 0) return 'Informe uma quantidade maior que zero.'
    if (quantidadeNova > saldoDisponivel) return 'A quantidade informada excede o saldo disponível.'
    if (unidade === 'PC' && !Number.isInteger(quantidadeNova)) return 'A quantidade em peças deve ser inteira.'
    if (peso && numero(peso) < 0) return 'O peso não pode ser negativo.'
    if (pesoProduzido > 0 && numero(peso) > pesoDisponivel) return 'O peso excede o saldo disponível.'
    return ''
  }

  const solicitarConfirmacao = () => {
    const mensagem = validar()
    if (mensagem) return setErro(mensagem)
    setErro('')
    setConfirmando(true)
  }

  const confirmar = async () => {
    setSalvando(true)
    setErro('')
    try {
      await SucateamentoService.registrar({
        apontamentoId: apontamento.id,
        quantidade: quantidadeNova,
        pesoSucateadoKg: peso ? numero(peso) : (unidade === 'KG' ? quantidadeNova : null),
        pesoProduzidoOriginalKg: pesoProduzido || (unidade === 'KG' ? produzidoBruto : null),
        motivoCodigo: motivo,
        categoriaMotivo: 'qualidade',
        observacao,
        origemReprovacao: origem,
        evidenciaUrl,
        usuarioSolicitante: user?.id,
        usuarioResponsavel: user?.id,
        rackOuPallet: rackSelecionado,
      })
      await carregar()
      setQuantidade('')
      setPeso('')
      setObservacao('')
      setEvidenciaUrl('')
      setConfirmando(false)
      await onSuccess?.()
    } catch (e) {
      setErro(e.message)
    } finally {
      setSalvando(false)
    }
  }

  const confirmarEstorno = async () => {
    if (!motivoEstorno.trim()) return setErro('Informe o motivo do estorno.')
    setSalvando(true)
    setErro('')
    try {
      await SucateamentoService.estornar({
        sucateamentoId: estorno.id,
        usuarioResponsavel: user?.id,
        motivo: motivoEstorno,
      })
      setEstorno(null)
      setMotivoEstorno('')
      await carregar()
      await onSuccess?.()
    } catch (e) {
      setErro(e.message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b bg-slate-900 px-6 py-4 text-white">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold"><FaRecycle className="text-red-400" /> Sucateamento pós-apontamento</h2>
            <p className="mt-1 text-sm text-slate-300">O apontamento original será preservado integralmente.</p>
          </div>
          <button onClick={onClose} className="rounded p-2 hover:bg-white/10" aria-label="Fechar"><FaTimes /></button>
        </header>

        <div className="overflow-y-auto p-6">
          <div className="grid gap-3 rounded-lg border bg-slate-50 p-4 text-sm md:grid-cols-3">
            <div><span className="text-slate-500">OP/Pedido</span><strong className="block">{apontamento.ordem_trabalho || apontamento.pedido_seq || '-'}</strong></div>
            <div><span className="text-slate-500">Produto</span><strong className="block">{apontamento.produto || '-'}</strong></div>
            <div><span className="text-slate-500">Rack/Lote</span><strong className="block">{rackSelecionado || '-'} / {apontamento.lote || '-'}</strong></div>
            <div><span className="text-slate-500">Operador</span><strong className="block">{apontamento.operador || '-'}</strong></div>
            <div><span className="text-slate-500">Produção</span><strong className="block">{apontamento.inicio ? new Date(apontamento.inicio).toLocaleString('pt-BR') : '-'}</strong></div>
            <div><span className="text-slate-500">Unidade</span><strong className="block">{unidade}</strong></div>
          </div>

          <div className="my-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3"><span className="text-xs text-blue-700">Produzido bruto</span><strong className="block text-xl text-blue-900">{formatar(produzidoBruto, unidade)} {unidade}</strong></div>
            <div className="rounded-lg border border-red-200 bg-red-50 p-3"><span className="text-xs text-red-700">Já sucateado</span><strong className="block text-xl text-red-900">{formatar(jaSucateado, unidade)} {unidade}</strong></div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3"><span className="text-xs text-emerald-700">Saldo no rack</span><strong className="block text-xl text-emerald-900">{formatar(saldoDisponivel, unidade)} {unidade}</strong></div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3"><span className="text-xs text-amber-700">Rack após operação</span><strong className="block text-xl text-amber-900">{formatar(saldoApos, unidade)} {unidade}</strong></div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700 md:col-span-2">Rack onde ocorreu a reprovação
              <select value={rackSelecionado} onChange={e => setRackSelecionado(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2">
                {saldosRack.map(item => <option key={item.rack_saldo} value={item.rack_saldo}>{item.rack_saldo} · saldo {formatar(item.saldo_quantidade, unidade)} {unidade}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">Quantidade a sucatear ({unidade})
              <input type="number" min="0" step={unidade === 'PC' ? '1' : '0.001'} max={saldoDisponivel} value={quantidade} onChange={e => setQuantidade(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-slate-700">Peso a sucatear (kg) <span className="font-normal text-slate-400">opcional</span>
              <input type="number" min="0" step="0.001" value={peso} onChange={e => setPeso(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-slate-700">Motivo
              <select value={motivo} onChange={e => setMotivo(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2">{MOTIVOS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
            </label>
            <label className="text-sm font-medium text-slate-700">Origem da reprovação
              <select value={origem} onChange={e => setOrigem(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2">{ORIGENS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
            </label>
            <label className="text-sm font-medium text-slate-700 md:col-span-2">Observação
              <textarea value={observacao} onChange={e => setObservacao(e.target.value)} rows="2" className="mt-1 w-full rounded-lg border px-3 py-2" placeholder="Descreva a reprovação e a disposição do material..." />
            </label>
            <label className="text-sm font-medium text-slate-700 md:col-span-2">Documento/evidência (link)
              <input type="url" value={evidenciaUrl} onChange={e => setEvidenciaUrl(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" placeholder="https://..." />
            </label>
          </div>

          {erro && <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"><FaExclamationTriangle className="mt-0.5" /> {erro}</div>}

          <section className="mt-6 border-t pt-5">
            <h3 className="mb-3 flex items-center gap-2 font-bold text-slate-800"><FaHistory /> Histórico de sucateamentos</h3>
            {carregando ? <p className="text-sm text-slate-500">Carregando histórico...</p> : historico.length === 0 ? <p className="rounded bg-slate-50 p-3 text-sm text-slate-500">Nenhum sucateamento registrado.</p> : (
              <div className="space-y-2">{historico.map(item => (
                <div key={item.id} className={`rounded-lg border p-3 text-sm ${item.status === 'ativo' ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-slate-50 opacity-75'}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div><strong>{formatar(item.quantidade_sucateada, item.unidade)} {item.unidade}</strong> · {item.rack_ou_pallet || '-'} · {MOTIVOS.find(([id]) => id === item.motivo_codigo)?.[1] || item.motivo_codigo} · {new Date(item.created_at).toLocaleString('pt-BR')}</div>
                    <div className="flex items-center gap-2"><span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold uppercase">{item.status}</span>{item.status === 'ativo' && podeGerenciar && <button onClick={() => setEstorno(item)} className="flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline"><FaUndo /> Estornar</button>}</div>
                  </div>
                  {item.observacao && <p className="mt-1 text-slate-600">{item.observacao}</p>}
                  {item.status === 'estornado' && <p className="mt-1 text-slate-600">Estorno: {item.motivo_estorno}</p>}
                </div>
              ))}</div>
            )}
          </section>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t bg-slate-50 px-6 py-4">
          <span className="text-xs text-slate-500">Produção bruta e histórico original não serão alterados.</span>
          <div className="flex gap-2"><button onClick={onClose} className="rounded-lg border px-4 py-2">Fechar</button><button disabled={salvando || saldoDisponivel <= 0 || !podeGerenciar} onClick={solicitarConfirmacao} className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Sucatear produção</button></div>
        </footer>
      </div>

      {confirmando && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4"><div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"><h3 className="text-lg font-bold text-red-700">Confirmar sucateamento</h3><p className="mt-3 text-slate-700">Você está prestes a sucatear <strong>{formatar(quantidadeNova, unidade)} {unidade}{peso ? ` / ${formatar(peso, 'KG')} kg` : ''}</strong> do rack <strong>{rackSelecionado}</strong>. Essa operação ficará registrada no histórico.</p><p className="mt-2 text-sm text-slate-600">Saldo do rack após a operação: <strong>{formatar(saldoApos, unidade)} {unidade}</strong>.</p><div className="mt-5 flex justify-end gap-2"><button onClick={() => setConfirmando(false)} className="rounded-lg border px-4 py-2">Voltar</button><button disabled={salvando} onClick={confirmar} className="rounded-lg bg-red-600 px-4 py-2 font-bold text-white">{salvando ? 'Registrando...' : 'Confirmar sucateamento'}</button></div></div></div>}

      {estorno && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4"><div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"><h3 className="text-lg font-bold">Estornar sucateamento</h3><p className="mt-2 text-sm text-slate-600">O registro não será excluído. O estorno ficará na trilha de auditoria.</p><textarea autoFocus rows="3" value={motivoEstorno} onChange={e => setMotivoEstorno(e.target.value)} className="mt-4 w-full rounded-lg border px-3 py-2" placeholder="Motivo obrigatório do estorno" /><div className="mt-4 flex justify-end gap-2"><button onClick={() => { setEstorno(null); setMotivoEstorno('') }} className="rounded-lg border px-4 py-2">Cancelar</button><button disabled={salvando} onClick={confirmarEstorno} className="rounded-lg bg-blue-700 px-4 py-2 font-bold text-white">Confirmar estorno</button></div></div></div>}
    </div>
  )
}
