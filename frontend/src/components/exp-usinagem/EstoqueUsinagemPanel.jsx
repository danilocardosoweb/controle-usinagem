import { FaUpload, FaClipboardCheck, FaChevronRight } from 'react-icons/fa'
import * as XLSX from 'xlsx'
import { formatDateBR, formatInteger, formatNumber, toDecimal, toIntegerRound } from '../../utils/expUsinagem'

const EstoqueUsinagemPanel = ({
  fluxoPedidos,
  pedidosTecnoPerfil,
  alunicaStages,
  estoqueBusca,
  setEstoqueBusca,
  estoqueUnidade,
  setEstoqueUnidade,
  estoqueSituacao,
  setEstoqueSituacao,
  estoquePeriodo,
  setEstoquePeriodo,
  exportandoEstoque,
  setExportandoEstoque,
  onOpenInventarios,
  setActiveTab
}) => {
  const byIdRaw = (Array.isArray(fluxoPedidos) ? fluxoPedidos : []).reduce((acc, r) => {
    if (r && r.id) acc[String(r.id)] = r
    return acc
  }, /** @type {Record<string, any>} */({}))

  const rowsBase = (Array.isArray(pedidosTecnoPerfil) ? pedidosTecnoPerfil : []).map((p) => {
    const raw = byIdRaw[String(p.id)] || {}
    const pedidoPc = Number(p.pedidoPcNumber ?? 0)
    const pedidoKg = Number(p.pedidoKgNumber ?? 0)
    const apontPc = toIntegerRound(raw.saldo_pc_total) || 0
    const apontKg = toDecimal(raw.saldo_kg_total) || 0
    const saldoPc = Math.max(pedidoPc - apontPc, 0)
    const saldoKg = Math.max(pedidoKg - apontKg, 0)
    const updatedAt = raw.atualizado_em || raw.movimentado_em || raw.saldo_atualizado_em || raw.criado_em
    const statusTecno = p.status
    const isAlunica = Array.isArray(Object.keys(alunicaStages)) && Boolean(alunicaStages[String(p.id)])
    const unidade = isAlunica ? 'Alúnica' : 'TecnoPerfil'
    const estagio = isAlunica ? (alunicaStages[String(p.id)] || 'estoque') : statusTecno
    const origem = (p?.origem || raw?.origem || 'carteira')
    return {
      id: String(p.id),
      pedido: p.pedido,
      cliente: p.cliente,
      ferramenta: p.ferramenta,
      unidade,
      estagio,
      origem,
      pedidoKg,
      pedidoPc,
      apontKg,
      apontPc,
      saldoKg,
      saldoPc,
      updatedAt
    }
  })

  const now = Date.now()
  const maxAge = Number(estoquePeriodo || 0) * 24 * 60 * 60 * 1000
  const term = String(estoqueBusca || '').trim().toLowerCase()
  const filtered = rowsBase.filter((r) => {
    if (estoqueUnidade === 'tecno' && r.unidade !== 'TecnoPerfil') return false
    if (estoqueUnidade === 'alunica' && r.unidade !== 'Alúnica') return false
    if (estoqueSituacao === 'com') {
      if (!((r.saldoKg > 0) || (r.saldoPc > 0))) return false
    }
    if (estoqueSituacao === 'sem') {
      if (!((r.saldoKg === 0) && (r.saldoPc === 0))) return false
    }
    if (maxAge > 0 && r.updatedAt) {
      const t = new Date(r.updatedAt).getTime()
      if (Number.isFinite(t) && now - t > maxAge) return false
    }
    if (term) {
      const alvo = `${r.pedido} ${r.cliente}`.toLowerCase()
      if (!alvo.includes(term)) return false
    }
    return true
  })

  const handleExport = () => {
    if (exportandoEstoque) return
    setExportandoEstoque(true)
    try {
      const wb = XLSX.utils.book_new()
      const rows = filtered.map((r) => ({
        Pedido: r.pedido,
        Cliente: r.cliente,
        Ferramenta: r.ferramenta,
        Unidade: r.unidade,
        Estagio: r.estagio,
        Origem: r.origem,
        'Pedido Kg': r.pedidoKg,
        'Pedido Pc': r.pedidoPc,
        'Apontado Kg': r.apontKg,
        'Apontado Pc': r.apontPc,
        'Saldo Kg': r.saldoKg,
        'Saldo Pc': r.saldoPc,
        'Último movimento': r.updatedAt ? formatDateBR(r.updatedAt) : '—'
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      XLSX.utils.book_append_sheet(wb, ws, 'Estoque_Usinagem')
      XLSX.writeFile(wb, `estoque_usinagem_${new Date().toISOString().slice(0,10)}.xlsx`)
    } finally {
      setExportandoEstoque(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <input
          type="text"
          value={estoqueBusca}
          onChange={(e)=>setEstoqueBusca(e.target.value)}
          placeholder="Buscar por pedido ou cliente"
          className="rounded-md border border-gray-300 px-2 py-1"
        />
        <select value={estoqueUnidade} onChange={(e)=>setEstoqueUnidade(e.target.value)} className="rounded-md border border-gray-300 px-2 py-1">
          <option value="todas">Todas as unidades</option>
          <option value="tecno">TecnoPerfil</option>
          <option value="alunica">Alúnica</option>
        </select>
        <select value={estoqueSituacao} onChange={(e)=>setEstoqueSituacao(e.target.value)} className="rounded-md border border-gray-300 px-2 py-1">
          <option value="todas">Todas as situações</option>
          <option value="com">Com saldo</option>
          <option value="sem">Sem saldo</option>
        </select>
        <select value={estoquePeriodo} onChange={(e)=>setEstoquePeriodo(Number(e.target.value))} className="rounded-md border border-gray-300 px-2 py-1">
          <option value={7}>Últimos 7 dias</option>
          <option value={30}>Últimos 30 dias</option>
          <option value={90}>Últimos 90 dias</option>
        </select>
        <button
          type="button"
          onClick={onOpenInventarios}
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100"
          title="Abrir Inventários"
        >
          <FaClipboardCheck className="h-3.5 w-3.5" /> Inventários
        </button>
        <button type="button" onClick={handleExport} disabled={exportandoEstoque} className="ml-auto inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
          <FaUpload className="h-3.5 w-3.5" /> Exportar
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm text-gray-700">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-gray-500">
              <th className="py-2 pr-3">Pedido</th>
              <th className="py-2 pr-3">Cliente</th>
              <th className="py-2 pr-3">Ferramenta</th>
              <th className="py-2 pr-3">Unidade</th>
              <th className="py-2 pr-3">Estágio</th>
              <th className="py-2 pr-3">Origem</th>
              <th className="py-2 pr-3 text-right">Pedido Kg</th>
              <th className="py-2 pr-3 text-right">Pedido Pc</th>
              <th className="py-2 pr-3 text-right">Apontado Kg</th>
              <th className="py-2 pr-3 text-right">Apontado Pc</th>
              <th className="py-2 pr-3 text-right">Saldo Kg</th>
              <th className="py-2 pr-3 text-right">Saldo Pc</th>
              <th className="py-2 pr-3">Último movimento</th>
              <th className="py-2 pr-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((r) => (
              <tr key={`estoque-${r.id}`} className="align-top hover:bg-blue-50/40">
                <td className="py-2 pr-3 font-semibold text-gray-800">{r.pedido}</td>
                <td className="py-2 pr-3 w-48 truncate" title={r.cliente}>{r.cliente}</td>
                <td className="py-2 pr-3">{r.ferramenta}</td>
                <td className="py-2 pr-3">{r.unidade}</td>
                <td className="py-2 pr-3">{r.estagio}</td>
                <td className="py-2 pr-3">{r.origem}</td>
                <td className="py-2 pr-3 text-right">{formatNumber(r.pedidoKg)}</td>
                <td className="py-2 pr-3 text-right">{formatInteger(r.pedidoPc)}</td>
                <td className="py-2 pr-3 text-right">{formatNumber(r.apontKg)}</td>
                <td className="py-2 pr-3 text-right">{formatInteger(r.apontPc)}</td>
                <td className="py-2 pr-3 text-right">{formatNumber(r.saldoKg)}</td>
                <td className="py-2 pr-3 text-right">{formatInteger(r.saldoPc)}</td>
                <td className="py-2 pr-3">{r.updatedAt ? formatDateBR(r.updatedAt) : '—'}</td>
                <td className="py-2 pr-3">
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100"
                    onClick={() => setActiveTab(r.unidade === 'Alúnica' ? 'Alúnica' : 'TecnoPerfil')}
                    title={`Abrir no quadro ${r.unidade}`}
                    aria-label={`Abrir no quadro ${r.unidade}`}
                  >
                    <FaChevronRight />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default EstoqueUsinagemPanel
