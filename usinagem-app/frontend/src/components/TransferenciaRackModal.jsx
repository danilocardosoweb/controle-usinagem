import { useEffect, useMemo, useState } from 'react'
import { FaArrowRight, FaExchangeAlt, FaHistory, FaTimes, FaUndo } from 'react-icons/fa'
import RackTransferenciaService from '../services/RackTransferenciaService'

const MOTIVOS = [
  ['reorganizacao', 'Reorganização'],
  ['rack_cheio', 'Rack cheio'],
  ['separacao_lote', 'Separação de lote'],
  ['preparacao_expedicao', 'Preparação para expedição'],
  ['correcao_operacional', 'Correção operacional'],
  ['rack_danificado', 'Troca de rack danificado'],
  ['separacao_parcial', 'Separação parcial'],
  ['outro', 'Outro'],
]

const normalizar = (valor) => String(valor || '').trim().toUpperCase()
const numero = (valor) => {
  const texto = String(valor ?? '').trim().replace(/\s/g, '')
  if (!texto) return 0
  const normalizado = texto.includes(',') ? texto.replace(/\./g, '').replace(',', '.') : texto
  return Number(normalizado)
}
const formatar = (valor, unidade = 'PC') => Number(valor || 0).toLocaleString('pt-BR', {
  minimumFractionDigits: unidade === 'KG' ? 0 : 0,
  maximumFractionDigits: unidade === 'KG' ? 3 : 0,
})
const podeMovimentar = (user) => ['admin', 'administrador', 'administrator', 'superadmin', 'supervisor']
  .includes(String(user?.nivel_acesso || user?.role || '').trim().toLowerCase())

export default function TransferenciaRackModal({ apontamento, rackOrigem, user, onClose, onSuccess }) {
  const [saldos, setSaldos] = useState([])
  const [origemSelecionada, setOrigemSelecionada] = useState(null)
  const [destino, setDestino] = useState('')
  const [quantidade, setQuantidade] = useState('')
  const [pesoKg, setPesoKg] = useState('')
  const [motivo, setMotivo] = useState('reorganizacao')
  const [observacao, setObservacao] = useState('')
  const [destinoItens, setDestinoItens] = useState([])
  const [permitirMistura, setPermitirMistura] = useState(false)
  const [historico, setHistorico] = useState([])
  const [transferencias, setTransferencias] = useState([])
  const [aba, setAba] = useState('transferir')
  const [confirmando, setConfirmando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [estorno, setEstorno] = useState(null)
  const [motivoEstorno, setMotivoEstorno] = useState('')
  const [observacaoEstorno, setObservacaoEstorno] = useState('')

  const permitido = podeMovimentar(user)
  const unidade = String(origemSelecionada?.unidade || apontamento?.unidade || 'PC').toUpperCase() === 'KG' ? 'KG' : 'PC'
  const saldoOrigem = Number(origemSelecionada?.saldo_quantidade ?? 0)
  const qtd = numero(quantidade)
  const rackOrigemAtual = normalizar(origemSelecionada?.rack_saldo || rackOrigem)
  const rackDestino = normalizar(destino)
  const saldoDestino = destinoItens.reduce((soma, item) => soma + Number(item.saldo_quantidade || 0), 0)
  const opOrigem = String(origemSelecionada?.ordem_trabalho || origemSelecionada?.pedido_seq || apontamento?.ordem_trabalho || '')
  const loteOrigem = String(origemSelecionada?.lote_externo || origemSelecionada?.lote || apontamento?.lote_externo || apontamento?.lote || '')
  const produtoOrigem = String(origemSelecionada?.produto || apontamento?.produto || '')
  const destinoIncompativel = destinoItens.some((item) => (
    String(item.produto || '') !== produtoOrigem
    || String(item.ordem_trabalho || item.pedido_seq || '') !== opOrigem
    || String(item.lote_externo || item.lote || '') !== loteOrigem
  ))

  const carregar = async () => {
    setErro('')
    try {
      let saldosAtuais = []
      if (rackOrigem) saldosAtuais = await RackTransferenciaService.listarSaldosRack(rackOrigem)
      else if (apontamento?.id) saldosAtuais = await RackTransferenciaService.listarSaldosApontamento(apontamento.id)

      if (apontamento?.id && !rackOrigem) {
        saldosAtuais = saldosAtuais.filter((item) => String(item.id) === String(apontamento.id))
      }
      setSaldos(saldosAtuais)
      const preferida = saldosAtuais.find((item) => normalizar(item.rack_saldo) === normalizar(rackOrigem)) || saldosAtuais[0] || null
      setOrigemSelecionada(preferida)
      if (preferida) {
        const [hist, transf] = await Promise.all([
          RackTransferenciaService.listarHistoricoRack(preferida.rack_saldo),
          RackTransferenciaService.listarTransferencias(preferida.id),
        ])
        setHistorico(hist)
        setTransferencias(transf)
      }
    } catch (e) {
      setErro(e.message)
    }
  }

  useEffect(() => { carregar() }, [apontamento?.id, rackOrigem])

  useEffect(() => {
    const timer = setTimeout(async () => {
      setPermitirMistura(false)
      if (!rackDestino || rackDestino === rackOrigemAtual) {
        setDestinoItens([])
        return
      }
      try {
        setDestinoItens(await RackTransferenciaService.listarSaldosRack(rackDestino))
      } catch (e) {
        setErro(e.message)
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [rackDestino, rackOrigemAtual])

  const validacao = useMemo(() => {
    if (!origemSelecionada) return 'Não há saldo disponível no rack selecionado.'
    if (!rackDestino) return 'Informe o rack de destino.'
    if (rackDestino === rackOrigemAtual) return 'Origem e destino devem ser diferentes.'
    if (!Number.isFinite(qtd) || qtd <= 0) return 'Informe uma quantidade maior que zero.'
    if (unidade === 'PC' && !Number.isInteger(qtd)) return 'A quantidade em peças deve ser inteira.'
    if (qtd > saldoOrigem) return 'A quantidade excede o saldo disponível no rack de origem.'
    if (destinoIncompativel && !permitirMistura) return 'Confirme a mistura de produto, OP ou lote no rack destino.'
    if (!permitido) return 'Somente supervisores e administradores podem confirmar a transferência.'
    return ''
  }, [origemSelecionada, rackDestino, rackOrigemAtual, qtd, unidade, saldoOrigem, destinoIncompativel, permitirMistura, permitido])

  const salvar = async () => {
    if (validacao) return
    setSalvando(true)
    setErro('')
    try {
      await RackTransferenciaService.registrar({
        apontamentoId: origemSelecionada.id,
        rackOrigem: rackOrigemAtual,
        rackDestino,
        quantidade: qtd,
        pesoKg: pesoKg ? numero(pesoKg) : null,
        motivo,
        observacao,
        usuarioId: user?.id,
        idempotencyKey: crypto.randomUUID(),
        permitirMistura,
      })
      await onSuccess?.()
      onClose()
    } catch (e) {
      setErro(e.message)
      setConfirmando(false)
    } finally {
      setSalvando(false)
    }
  }

  const confirmarEstorno = async () => {
    if (!estorno || !motivoEstorno.trim()) return
    setSalvando(true)
    setErro('')
    try {
      await RackTransferenciaService.estornar({
        transferenciaId: estorno.id,
        usuarioId: user?.id,
        motivo: motivoEstorno,
        observacao: observacaoEstorno,
        idempotencyKey: crypto.randomUUID(),
      })
      setEstorno(null)
      setMotivoEstorno('')
      setObservacaoEstorno('')
      await carregar()
      await onSuccess?.()
    } catch (e) {
      setErro(e.message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-4">
      <div className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b bg-slate-950 px-6 py-4 text-white">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold"><FaExchangeAlt className="text-cyan-400" /> Transferência entre racks</h2>
            <p className="mt-1 text-xs text-slate-300">Movimentação auditável sem alterar a produção original</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-white/10" aria-label="Fechar"><FaTimes /></button>
        </div>

        <div className="flex border-b bg-slate-50 px-6">
          <button type="button" onClick={() => setAba('transferir')} className={`border-b-2 px-4 py-3 text-sm font-semibold ${aba === 'transferir' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500'}`}>Transferir</button>
          <button type="button" onClick={() => setAba('historico')} className={`border-b-2 px-4 py-3 text-sm font-semibold ${aba === 'historico' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500'}`}><FaHistory className="mr-2 inline" />Histórico</button>
        </div>

        <div className="overflow-y-auto p-6">
          {erro && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>}

          {aba === 'transferir' ? (
            <div className="space-y-5">
              {saldos.length > 1 && (
                <label className="block text-sm font-semibold text-slate-700">Item do rack
                  <select value={`${origemSelecionada?.id || ''}|${origemSelecionada?.rack_saldo || ''}`} onChange={(e) => {
                    const [id, rack] = e.target.value.split('|')
                    setOrigemSelecionada(saldos.find((item) => String(item.id) === id && item.rack_saldo === rack) || null)
                  }} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
                    {saldos.map((item) => <option key={`${item.id}-${item.rack_saldo}`} value={`${item.id}|${item.rack_saldo}`}>{item.rack_saldo} · {item.produto} · {item.ordem_trabalho || item.pedido_seq || '-'} · {formatar(item.saldo_quantidade, item.unidade)} {String(item.unidade || 'PC').toUpperCase()}</option>)}
                  </select>
                </label>
              )}

              <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-4">
                <div><div className="text-[11px] font-bold uppercase text-slate-500">Rack origem</div><div className="font-bold text-slate-900">{rackOrigemAtual || '-'}</div></div>
                <div><div className="text-[11px] font-bold uppercase text-slate-500">Produto</div><div className="truncate font-semibold text-slate-900" title={produtoOrigem}>{produtoOrigem || '-'}</div></div>
                <div><div className="text-[11px] font-bold uppercase text-slate-500">OP / lote</div><div className="font-semibold text-slate-900">{opOrigem || '-'} / {loteOrigem || '-'}</div></div>
                <div><div className="text-[11px] font-bold uppercase text-slate-500">Saldo atual</div><div className="text-lg font-black text-blue-700">{formatar(saldoOrigem, unidade)} {unidade}</div></div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm font-semibold text-slate-700">Rack destino *
                  <input value={destino} onChange={(e) => setDestino(e.target.value.toUpperCase())} placeholder="Ex.: USI-2000" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 uppercase focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                </label>
                <label className="text-sm font-semibold text-slate-700">Quantidade a transferir ({unidade}) *
                  <input value={quantidade} onChange={(e) => setQuantidade(e.target.value)} inputMode="decimal" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                </label>
                <label className="text-sm font-semibold text-slate-700">Peso (kg, opcional)
                  <input value={pesoKg} onChange={(e) => setPesoKg(e.target.value)} inputMode="decimal" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
                </label>
                <label className="text-sm font-semibold text-slate-700">Motivo *
                  <select value={motivo} onChange={(e) => setMotivo(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">{MOTIVOS.map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}</select>
                </label>
              </div>
              <label className="block text-sm font-semibold text-slate-700">Observação
                <textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
              </label>

              {rackDestino && (
                <div className={`rounded-xl border p-4 ${destinoIncompativel ? 'border-amber-300 bg-amber-50' : 'border-cyan-200 bg-cyan-50'}`}>
                  <div className="mb-3 text-sm font-bold text-slate-800">Prévia da movimentação</div>
                  <div className="grid items-center gap-3 text-center md:grid-cols-[1fr_auto_1fr]">
                    <div className="rounded-lg bg-white p-3 shadow-sm"><div className="text-xs text-slate-500">{rackOrigemAtual}</div><div className="text-xl font-black text-slate-900">{formatar(Math.max(0, saldoOrigem - qtd), unidade)} {unidade}</div><div className="text-xs text-red-600">-{formatar(qtd, unidade)}</div></div>
                    <FaArrowRight className="mx-auto text-xl text-blue-600" />
                    <div className="rounded-lg bg-white p-3 shadow-sm"><div className="text-xs text-slate-500">{rackDestino}</div><div className="text-xl font-black text-slate-900">{formatar(saldoDestino + qtd, unidade)} {unidade}</div><div className="text-xs text-emerald-600">+{formatar(qtd, unidade)}</div></div>
                  </div>
                  {destinoIncompativel && (
                    <label className="mt-3 flex items-start gap-2 text-sm font-medium text-amber-900">
                      <input type="checkbox" checked={permitirMistura} onChange={(e) => setPermitirMistura(e.target.checked)} className="mt-1" />
                      O destino possui produto, OP ou lote diferente. Confirmo conscientemente a mistura neste rack.
                    </label>
                  )}
                </div>
              )}

              {!permitido && <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">Você pode consultar o histórico, mas somente supervisores e administradores podem movimentar saldo.</div>}
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <h3 className="mb-3 font-bold text-slate-800">Trajetória do rack {rackOrigemAtual}</h3>
                <div className="space-y-2">
                  {historico.map((evento) => <div key={evento.evento_id} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm"><div><div className="font-semibold text-slate-800">{evento.tipo_evento === 'producao' ? 'Entrada da produção' : evento.tipo_evento === 'sucateamento' ? 'Sucateamento' : evento.direcao === 'entrada' ? `Recebido de ${evento.rack_contraparte}` : `Enviado para ${evento.rack_contraparte}`}</div><div className="text-xs text-slate-500">{evento.produto || '-'} · {evento.ordem_producao || '-'} · {evento.usuario_nome || '-'}</div></div><div className="text-right"><div className={`font-black ${evento.direcao === 'entrada' ? 'text-emerald-700' : 'text-red-600'}`}>{evento.direcao === 'entrada' ? '+' : '-'}{formatar(evento.quantidade, unidade)} {unidade}</div><div className="text-xs text-slate-500">{evento.data_hora ? new Date(evento.data_hora).toLocaleString('pt-BR') : '-'}</div></div></div>)}
                  {historico.length === 0 && <div className="rounded-lg bg-slate-50 p-5 text-center text-sm text-slate-500">Nenhum evento encontrado.</div>}
                </div>
              </div>
              <div>
                <h3 className="mb-3 font-bold text-slate-800">Transferências do apontamento</h3>
                <div className="space-y-2">
                  {transferencias.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm"><div><div className="font-semibold text-slate-800">{item.rack_origem} <FaArrowRight className="mx-1 inline text-blue-600" /> {item.rack_destino}</div><div className="text-xs text-slate-500">{item.tipo === 'estorno' ? 'Estorno' : 'Transferência'} · {item.motivo} · {new Date(item.created_at).toLocaleString('pt-BR')}</div></div><div className="flex items-center gap-3"><span className="font-bold">{formatar(item.quantidade, item.unidade)} {item.unidade}</span>{permitido && item.tipo === 'transferencia' && item.status === 'concluida' && <button type="button" onClick={() => setEstorno(item)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50"><FaUndo className="mr-1 inline" />Estornar</button>}</div></div>)}
                  {transferencias.length === 0 && <div className="rounded-lg bg-slate-50 p-5 text-center text-sm text-slate-500">Nenhuma transferência registrada.</div>}
                </div>
              </div>
            </div>
          )}
        </div>

        {aba === 'transferir' && <div className="flex items-center justify-between gap-3 border-t bg-slate-50 px-6 py-4"><div className="max-w-xl text-xs font-medium text-red-600">{validacao}</div><div className="flex gap-3"><button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-5 py-2 font-semibold text-slate-700">Cancelar</button><button type="button" disabled={Boolean(validacao) || salvando} onClick={() => setConfirmando(true)} className="rounded-lg bg-blue-600 px-5 py-2 font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300">Revisar transferência</button></div></div>}
      </div>

      {confirmando && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4"><div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><h3 className="text-xl font-bold text-slate-900">Confirmar movimentação</h3><p className="mt-3 text-slate-700">Você está transferindo <strong>{formatar(qtd, unidade)} {unidade}</strong> do rack <strong>{rackOrigemAtual}</strong> para <strong>{rackDestino}</strong>.</p><div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-center"><div><div className="text-xs text-slate-500">{rackOrigemAtual} após</div><div className="text-xl font-black">{formatar(saldoOrigem - qtd, unidade)} {unidade}</div></div><div><div className="text-xs text-slate-500">{rackDestino} após</div><div className="text-xl font-black">{formatar(saldoDestino + qtd, unidade)} {unidade}</div></div></div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setConfirmando(false)} className="rounded-lg border border-slate-300 px-5 py-2 font-semibold">Voltar</button><button type="button" disabled={salvando} onClick={salvar} className="rounded-lg bg-emerald-600 px-5 py-2 font-bold text-white disabled:opacity-50">{salvando ? 'Transferindo...' : 'Confirmar transferência'}</button></div></div></div>}

      {estorno && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4"><div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><h3 className="text-xl font-bold text-slate-900">Estornar transferência</h3><p className="mt-2 text-sm text-slate-600">Será criada uma movimentação inversa de {estorno.rack_destino} para {estorno.rack_origem}. O registro original não será apagado.</p><label className="mt-4 block text-sm font-semibold">Motivo do estorno *<input value={motivoEstorno} onChange={(e) => setMotivoEstorno(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="mt-3 block text-sm font-semibold">Observação<textarea value={observacaoEstorno} onChange={(e) => setObservacaoEstorno(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setEstorno(null)} className="rounded-lg border border-slate-300 px-5 py-2 font-semibold">Cancelar</button><button type="button" disabled={!motivoEstorno.trim() || salvando} onClick={confirmarEstorno} className="rounded-lg bg-red-600 px-5 py-2 font-bold text-white disabled:opacity-50">Confirmar estorno</button></div></div></div>}
    </div>
  )
}
