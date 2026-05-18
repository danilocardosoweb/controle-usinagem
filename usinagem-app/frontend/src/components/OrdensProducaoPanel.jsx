import { useState, useEffect, useMemo, useRef } from 'react'
import {
  FaSearch, FaPrint, FaFilePdf, FaCheckCircle, FaCut, FaFlag,
  FaEye, FaTimes, FaExclamationTriangle, FaHistory, FaSync,
  FaChevronDown, FaChevronUp, FaBox, FaListUl, FaQrcode
} from 'react-icons/fa'
import supabaseService from '../services/SupabaseService'
import auditoriaService from '../services/AuditoriaService'
import { useAuth } from '../contexts/AuthContext'

const STATUS_LABELS = {
  pendente: { label: 'Pendente', color: 'bg-gray-100 text-gray-700 border-gray-300' },
  impresso: { label: 'Impresso', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  em_corte: { label: 'Em Corte', color: 'bg-yellow-100 text-yellow-800 border-yellow-400' },
  finalizado: { label: 'Finalizado', color: 'bg-green-100 text-green-700 border-green-300' },
}

const extrairFerramenta = (produto) => {
  if (!produto) return ''
  const s = String(produto).toUpperCase().trim()
  const m3 = s.match(/^([A-Z]{3})([A-Z0-9]+)/)
  const m2 = s.match(/^([A-Z]{2})([A-Z0-9]+)/)
  let letras = '', resto = '', qtd = 0
  let m = m3
  if (m) { letras = m[1]; resto = m[2]; qtd = 3 }
  else { m = m2; if (!m) return ''; letras = m[1]; resto = m[2]; qtd = 4 }
  let nums = ''
  for (const ch of resto) {
    if (/[0-9]/.test(ch)) nums += ch
    else if (ch === 'O') nums += '0'
    if (nums.length === qtd) break
  }
  if (nums.length < qtd) nums = nums.padEnd(qtd, '0')
  return `${letras}-${nums}`
}

const normalizarProduto = (produto) => String(produto || '').trim().toUpperCase()

const extrairComprimentoDoCodigo = (produto) => {
  if (!produto) return ''
  const resto = String(produto).slice(8)
  const match = resto.match(/^\d+/)
  const valor = match ? parseInt(match[0], 10) : null
  return Number.isFinite(valor) ? String(valor) : ''
}

const OP_STATUS_KEY = 'pcp_op_status'

const lerStatusLocal = () => {
  try { return JSON.parse(localStorage.getItem(OP_STATUS_KEY) || '{}') } catch { return {} }
}

const salvarStatusLocal = (mapa) => {
  try { localStorage.setItem(OP_STATUS_KEY, JSON.stringify(mapa)) } catch {}
}

const OP_HISTORICO_KEY = 'pcp_op_historico'

const lerHistoricoLocal = () => {
  try { return JSON.parse(localStorage.getItem(OP_HISTORICO_KEY) || '{}') } catch { return {} }
}

const salvarHistoricoLocal = (mapa) => {
  try { localStorage.setItem(OP_HISTORICO_KEY, JSON.stringify(mapa)) } catch {}
}

export default function OrdensProducaoPanel() {
  const { user } = useAuth()
  const [lotesDB, setLotesDB] = useState([])
  const [pedidosDB, setPedidosDB] = useState([])
  const [mapeamentosDB, setMapeamentosDB] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroRack, setFiltroRack] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [statusMap, setStatusMap] = useState(lerStatusLocal)
  const [historicoMap, setHistoricoMap] = useState(lerHistoricoLocal)
  const [rackSelecionado, setRackSelecionado] = useState(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [modalHistoricoAberto, setModalHistoricoAberto] = useState(false)
  const [rackHistorico, setRackHistorico] = useState(null)
  const printRef = useRef(null)

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    setLoading(true)
    try {
      const [lotes, pedidos, mapeamentos] = await Promise.all([
        supabaseService.getAll('lotes'),
        supabaseService.getAll('pedidos'),
        supabaseService.getAll('extrusao_mapeamento'),
      ])
      setLotesDB(lotes || [])
      setPedidosDB(pedidos || [])
      setMapeamentosDB(mapeamentos || [])
    } catch (e) {
      console.error('Erro ao carregar dados:', e)
    } finally {
      setLoading(false)
    }
  }

  const pedidoDadosMap = useMemo(() => {
    const m = new Map()
    for (const p of pedidosDB) {
      const seq = String(p.pedido_seq || '').trim()
      if (!seq) continue
      const produtoPedido = String(p.produto || '').trim()
      const comp = extrairComprimentoDoCodigo(produtoPedido)
      m.set(seq, {
        comprimento: comp,
        produto: produtoPedido,
      })
    }
    return m
  }, [pedidosDB])

  const mapaComprimentoPorProdutoLongo = useMemo(() => {
    const map = new Map()
    for (const item of mapeamentosDB) {
      const produtoLongo = normalizarProduto(item?.produto_longo)
      const comp = item?.comprimento_acabado_mm
      if (produtoLongo && comp) {
        map.set(produtoLongo, String(comp))
      }
    }
    return map
  }, [mapeamentosDB])

  const racksAgrupados = useMemo(() => {
    const mapa = new Map()
    for (const l of lotesDB) {
      const rack = String(l.rack_embalagem || '').trim()
      if (!rack) continue
      const produto = String(l.produto || l.dados_originais?.Produto || '').trim()
      const ferramenta = extrairFerramenta(produto)
      const pedidoSeq = String(l.pedido_seq || '').trim()
      const dadosPedido = pedidoDadosMap.get(pedidoSeq)
      const produtoPedidoCod = dadosPedido?.produto || ''
      const comprimentoPedido = dadosPedido?.comprimento || extrairComprimentoDoCodigo(produtoPedidoCod)
      const comprimentoMapeamento = mapaComprimentoPorProdutoLongo.get(normalizarProduto(produto)) || ''
      const comprimentoFallback = extrairComprimentoDoCodigo(produto)
      const comprimento = comprimentoPedido || comprimentoMapeamento || ''

      if (!mapa.has(rack)) {
        mapa.set(rack, {
          rack,
          amarrados: [],
          produtos: new Set(),
          ferramentas: new Set(),
          comprimentos: new Set(),
          clientes: new Set(),
          pedidos: new Set(),
          romaneios: new Set(),
          totalKg: 0,
          totalPc: 0,
        })
      }
      const entry = mapa.get(rack)
      entry.amarrados.push({
        codigo: String(l.codigo || '').trim(),
        lote: String(l.lote || '').trim(),
        produto,
        ferramenta,
        comprimento,
        pedido_seq: pedidoSeq,
        comprimentoPedido: comprimentoPedido || null,
        comprimentoMapeamento: comprimentoMapeamento || null,
        comprimentoFallback,
        romaneio: String(l.romaneio || '').trim(),
        qt_kg: Number(l.qt_kg || 0),
        qtd_pc: Number(l.qtd_pc || 0),
        situacao: String(l.situacao || '').trim(),
        cliente: String(l.cliente || l.dados_originais?.Cliente || '').trim(),
      })
      if (produto) entry.produtos.add(produto)
      if (ferramenta) entry.ferramentas.add(ferramenta)
      if (comprimento) entry.comprimentos.add(comprimento)
      const cliente = String(l.cliente || l.dados_originais?.Cliente || '').trim()
      if (cliente) entry.clientes.add(cliente)
      if (pedidoSeq) entry.pedidos.add(pedidoSeq)
      const rom = String(l.romaneio || '').trim()
      if (rom) entry.romaneios.add(rom)
      entry.totalKg += Number(l.qt_kg || 0)
      entry.totalPc += Number(l.qtd_pc || 0)
    }

    return Array.from(mapa.values()).map(e => ({
      ...e,
      produtos: Array.from(e.produtos),
      ferramentas: Array.from(e.ferramentas),
      comprimentos: Array.from(e.comprimentos),
      clientes: Array.from(e.clientes),
      pedidos: Array.from(e.pedidos),
      romaneios: Array.from(e.romaneios),
      qtdAmarrados: e.amarrados.length,
      statusAtual: statusMap[e.rack] || 'pendente',
    })).sort((a, b) => String(a.rack).localeCompare(String(b.rack), 'pt-BR'))
  }, [lotesDB, pedidosDB, pedidoDadosMap, mapaComprimentoPorProdutoLongo, statusMap])

  const temAlerta = (rack) => {
    const clientes = new Set(rack.amarrados.map(a => a.cliente).filter(Boolean))
    const ferramentas = new Set(rack.amarrados.map(a => a.ferramenta).filter(Boolean))
    const comprimentos = new Set(rack.amarrados.map(a => a.comprimento).filter(Boolean))
    const amarradosSemPedido = rack.amarrados.some(a => !a.pedido_seq)
    return {
      clientesMistos: clientes.size > 1,
      ferramentasMistas: ferramentas.size > 1,
      comprimentosMistos: comprimentos.size > 1,
      semPedido: amarradosSemPedido,
    }
  }

  const racksFiltrados = useMemo(() => {
    return racksAgrupados.filter(r => {
      const matchRack = !filtroRack || String(r.rack).toLowerCase().includes(filtroRack.toLowerCase())
      const matchStatus = filtroStatus === 'todos' || r.statusAtual === filtroStatus
      return matchRack && matchStatus
    })
  }, [racksAgrupados, filtroRack, filtroStatus])

  const atualizarStatus = (rack, novoStatus) => {
    const novoMapa = { ...statusMap, [rack]: novoStatus }
    setStatusMap(novoMapa)
    salvarStatusLocal(novoMapa)

    const novoHistorico = { ...historicoMap }
    if (!novoHistorico[rack]) novoHistorico[rack] = []
    novoHistorico[rack] = [
      { status: novoStatus, data: new Date().toISOString(), usuario: user?.nome || user?.email || 'Sistema' },
      ...novoHistorico[rack],
    ].slice(0, 20)
    setHistoricoMap(novoHistorico)
    salvarHistoricoLocal(novoHistorico)

    try {
      auditoriaService.registrar({
        acao: 'op_status_alterado',
        detalhe: `Rack ${rack} → ${novoStatus}`,
        usuario: user?.nome || user?.email,
      })
    } catch {}
  }

  const abrirOP = (rack) => {
    setRackSelecionado(rack)
    setModalAberto(true)
  }

  const fecharModal = () => {
    setModalAberto(false)
    setRackSelecionado(null)
  }

  const abrirHistorico = (rack) => {
    setRackHistorico(rack)
    setModalHistoricoAberto(true)
  }

  const handleImprimir = (rack) => {
    abrirOP(rack)
    setTimeout(() => {
      window.print()
      atualizarStatus(rack.rack, 'impresso')
    }, 600)
  }

  const handleGerarPDF = (rack) => {
    abrirOP(rack)
    setTimeout(() => {
      window.print()
      atualizarStatus(rack.rack, 'impresso')
    }, 600)
  }

  const contadores = useMemo(() => {
    const c = { pendente: 0, impresso: 0, em_corte: 0, finalizado: 0 }
    for (const r of racksAgrupados) {
      const st = r.statusAtual
      if (c[st] !== undefined) c[st]++
    }
    return c
  }, [racksAgrupados])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mr-3" />
        <span className="text-gray-600">Carregando racks...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho e resumo */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Ordens de Produção — Racks Longos</h2>
            <p className="text-sm text-gray-500">Gere, imprima e acompanhe o status de corte de cada rack</p>
          </div>
          <button
            onClick={carregarDados}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700 transition-colors"
          >
            <FaSync size={12} /> Atualizar
          </button>
        </div>

        {/* Cards de contagem */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(STATUS_LABELS).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setFiltroStatus(filtroStatus === key ? 'todos' : key)}
              className={`rounded-lg border p-3 text-left transition-all hover:shadow-sm ${filtroStatus === key ? cfg.color + ' ring-2 ring-offset-1 ring-blue-400' : 'bg-gray-50 border-gray-200 text-gray-700'}`}
            >
              <div className="text-xl font-bold">{contadores[key]}</div>
              <div className="text-xs font-medium mt-0.5">{cfg.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
          <input
            type="text"
            value={filtroRack}
            onChange={e => setFiltroRack(e.target.value)}
            placeholder="Filtrar por número do rack..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filtroStatus}
          onChange={e => setFiltroStatus(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="todos">Todos os status</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Tabela de racks */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Rack</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Ferramentas</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Comp. Acabado</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Amarrados</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Kg / Pc</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Alertas</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {racksFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-10 text-center text-gray-400">
                    Nenhum rack encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                racksFiltrados.map(rack => {
                  const alerta = temAlerta(rack)
                  const temQualquerAlerta = alerta.clientesMistos || alerta.ferramentasMistas || alerta.comprimentosMistos
                  const cfg = STATUS_LABELS[rack.statusAtual] || STATUS_LABELS.pendente
                  return (
                    <tr key={rack.rack} className={`hover:bg-gray-50 ${temQualquerAlerta ? 'bg-yellow-50/40' : ''}`}>
                      <td className="px-4 py-3 font-bold text-gray-800 whitespace-nowrap">
                        {rack.rack}
                      </td>
                      <td className="px-4 py-3 text-gray-700 max-w-[180px]">
                        <div className="flex flex-wrap gap-1">
                          {rack.ferramentas.slice(0, 3).map((f, i) => (
                            <span key={i} className="inline-block bg-blue-50 text-blue-700 text-xs px-1.5 py-0.5 rounded border border-blue-100">{f || '-'}</span>
                          ))}
                          {rack.ferramentas.length > 3 && <span className="text-xs text-gray-400">+{rack.ferramentas.length - 3}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        <div className="flex flex-wrap gap-1">
                          {rack.comprimentos.slice(0, 3).map((c, i) => (
                            <span key={i} className="text-xs text-gray-600">{c}mm</span>
                          ))}
                          {rack.comprimentos.length > 3 && <span className="text-xs text-gray-400">+{rack.comprimentos.length - 3}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-800">{rack.qtdAmarrados}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {rack.totalKg > 0 ? `${rack.totalKg.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg` : '-'}
                        {rack.totalPc > 0 && <span className="text-xs text-gray-400 ml-1">/ {rack.totalPc} pc</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {temQualquerAlerta || alerta.semPedido ? (
                          <div className="flex flex-col gap-0.5">
                            {alerta.clientesMistos && (
                              <span className="flex items-center gap-1 text-xs text-amber-700">
                                <FaExclamationTriangle size={10} /> Clientes mistos
                              </span>
                            )}
                            {alerta.ferramentasMistas && (
                              <span className="flex items-center gap-1 text-xs text-amber-700">
                                <FaExclamationTriangle size={10} /> Ferramentas mistas
                              </span>
                            )}
                            {alerta.comprimentosMistos && (
                              <span className="flex items-center gap-1 text-xs text-amber-700">
                                <FaExclamationTriangle size={10} /> Comprimentos mistos
                              </span>
                            )}
                            {alerta.semPedido && (
                              <span className="flex items-center gap-1 text-xs text-red-700">
                                <FaExclamationTriangle size={10} /> Amarrados sem pedido
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            onClick={() => abrirOP(rack)}
                            title="Visualizar OP"
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                          >
                            <FaEye size={11} /> Ver OP
                          </button>
                          <button
                            onClick={() => handleImprimir(rack)}
                            title="Imprimir"
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-50 text-gray-700 border border-gray-200 rounded hover:bg-gray-100 transition-colors"
                          >
                            <FaPrint size={11} /> Imprimir
                          </button>
                          {rack.statusAtual !== 'impresso' && rack.statusAtual !== 'finalizado' && (
                            <button
                              onClick={() => atualizarStatus(rack.rack, 'impresso')}
                              title="Marcar como Impresso"
                              className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                            >
                              <FaCheckCircle size={11} /> Impresso
                            </button>
                          )}
                          {rack.statusAtual !== 'em_corte' && rack.statusAtual !== 'finalizado' && (
                            <button
                              onClick={() => atualizarStatus(rack.rack, 'em_corte')}
                              title="Marcar Em Corte"
                              className="flex items-center gap-1 px-2 py-1 text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 rounded hover:bg-yellow-100 transition-colors"
                            >
                              <FaCut size={11} /> Em Corte
                            </button>
                          )}
                          {rack.statusAtual !== 'finalizado' && (
                            <button
                              onClick={() => atualizarStatus(rack.rack, 'finalizado')}
                              title="Marcar Finalizado"
                              className="flex items-center gap-1 px-2 py-1 text-xs bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100 transition-colors"
                            >
                              <FaFlag size={11} /> Finalizado
                            </button>
                          )}
                          {rack.statusAtual === 'finalizado' && (
                            <button
                              onClick={() => atualizarStatus(rack.rack, 'pendente')}
                              title="Reabrir"
                              className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-50 text-gray-600 border border-gray-200 rounded hover:bg-gray-100 transition-colors"
                            >
                              <FaSync size={11} /> Reabrir
                            </button>
                          )}
                          <button
                            onClick={() => abrirHistorico(rack)}
                            title="Histórico"
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-50 text-purple-700 border border-purple-200 rounded hover:bg-purple-100 transition-colors"
                          >
                            <FaHistory size={11} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal OP */}
      {modalAberto && rackSelecionado && (
        <ModalOP
          rack={rackSelecionado}
          statusMap={statusMap}
          onClose={fecharModal}
          onAtualizarStatus={atualizarStatus}
          user={user}
          printRef={printRef}
        />
      )}

      {/* Modal Histórico */}
      {modalHistoricoAberto && rackHistorico && (
        <ModalHistorico
          rack={rackHistorico}
          historico={historicoMap[rackHistorico.rack] || []}
          onClose={() => { setModalHistoricoAberto(false); setRackHistorico(null) }}
        />
      )}
    </div>
  )
}

function ModalOP({ rack, statusMap, onClose, onAtualizarStatus, user, printRef }) {
  const agora = new Date().toLocaleString('pt-BR')
  const cfg = STATUS_LABELS[statusMap[rack.rack] || 'pendente'] || STATUS_LABELS.pendente

  const handlePrint = () => {
    window.print()
    onAtualizarStatus(rack.rack, 'impresso')
  }

  const alertas = (() => {
    const clientes = new Set(rack.amarrados.map(a => a.cliente).filter(Boolean))
    const ferramentas = new Set(rack.amarrados.map(a => a.ferramenta).filter(Boolean))
    const comprimentos = new Set(rack.amarrados.map(a => a.comprimento).filter(Boolean))
    const semPedido = rack.amarrados.some(a => !a.pedido_seq)
    return {
      clientesMistos: clientes.size > 1,
      ferramentasMistas: ferramentas.size > 1,
      comprimentosMistos: comprimentos.size > 1,
      clientesLista: Array.from(clientes),
      ferramentasLista: Array.from(ferramentas),
      comprimentosLista: Array.from(comprimentos),
      semPedido,
    }
  })()

  return (
    <div className="op-print-modal fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl my-6">
        {/* Cabeçalho modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 print:hidden">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <FaListUl className="text-blue-600" />
            Ordem de Produção — Rack {rack.rack}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <FaPrint size={13} /> Imprimir / PDF
            </button>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded">
              <FaTimes size={16} />
            </button>
          </div>
        </div>

        {/* Conteúdo imprimível */}
        <div ref={printRef} className="p-6 print:p-4">
          {/* Cabeçalho da OP */}
          <div className="flex items-start justify-between mb-4 pb-3 border-b-2 border-gray-800">
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Ordem de Produção</div>
              <div className="text-2xl font-black text-gray-900 mt-0.5">Rack Longo #{rack.rack}</div>
              <div className="text-sm text-gray-600 mt-1">
                Emissão: {agora} &nbsp;|&nbsp; Responsável: {user?.nome || user?.email || '—'}
              </div>
            </div>
            <div className="text-right">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border ${cfg.color}`}>
                {cfg.label}
              </span>
              <div className="mt-2 text-xs text-gray-500">
                {rack.qtdAmarrados} amarrado(s)
              </div>
            </div>
          </div>

          {/* Alertas */}
          {(alertas.clientesMistos || alertas.ferramentasMistas || alertas.comprimentosMistos || alertas.semPedido) && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded-lg">
              <div className="flex items-center gap-2 font-semibold text-amber-800 mb-1">
                <FaExclamationTriangle /> Atenção — revise antes do corte
              </div>
              {alertas.clientesMistos && (
                <p className="text-sm text-amber-700">
                  ⚠ Múltiplos clientes: {alertas.clientesLista.join(', ')}
                </p>
              )}
              {alertas.ferramentasMistas && (
                <p className="text-sm text-amber-700">
                  ⚠ Múltiplas ferramentas: {alertas.ferramentasLista.join(', ')}
                </p>
              )}
              {alertas.comprimentosMistos && (
                <p className="text-sm text-amber-700">
                  ⚠ Múltiplos comprimentos pedidos: {alertas.comprimentosLista.map(c => `${c}mm`).join(', ')}
                </p>
              )}
              {alertas.semPedido && (
                <p className="text-sm text-red-700">
                  ⚠ Existem amarrados sem pedido vinculado. Confirme comprimento antes de cortar.
                </p>
              )}
            </div>
          )}

          {/* Resumo do Rack */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            <InfoBlock label="Ferramentas" value={rack.ferramentas.join(', ') || '—'} />
            <InfoBlock label="Comp. Acabado" value={rack.comprimentos.map(c => `${c}mm`).join(', ') || '—'} />
            <InfoBlock label="Qtd Amarrados" value={rack.qtdAmarrados} />
            <InfoBlock label="Total KG" value={rack.totalKg > 0 ? `${rack.totalKg.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg` : '—'} />
            <InfoBlock label="Total Peças" value={rack.totalPc > 0 ? rack.totalPc.toLocaleString('pt-BR') : '—'} />
            <InfoBlock label="Pedidos" value={rack.pedidos.join(', ') || '—'} />
          </div>

          {/* Tabela de amarrados */}
          <div className="mb-4">
            <h3 className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Itens do Rack</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-3 py-2 text-left font-semibold text-gray-600 border-b border-gray-200">#</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600 border-b border-gray-200">Lote</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600 border-b border-gray-200">Código</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600 border-b border-gray-200">Produto</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600 border-b border-gray-200">Ferramenta</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600 border-b border-gray-200">Comp. Pedido</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-600 border-b border-gray-200">KG</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-600 border-b border-gray-200">Pc</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600 border-b border-gray-200">Pedido</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600 border-b border-gray-200">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {rack.amarrados.map((a, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-3 py-1.5 text-gray-500 border-b border-gray-100">{i + 1}</td>
                      <td className="px-3 py-1.5 font-mono text-gray-800 border-b border-gray-100">{a.lote || '—'}</td>
                      <td className="px-3 py-1.5 font-mono text-gray-700 border-b border-gray-100">{a.codigo || '—'}</td>
                      <td className="px-3 py-1.5 text-gray-700 max-w-[140px] truncate border-b border-gray-100" title={a.produto}>{a.produto || '—'}</td>
                      <td className="px-3 py-1.5 font-semibold text-blue-700 border-b border-gray-100">{a.ferramenta || '—'}</td>
                      <td className={`px-3 py-1.5 border-b border-gray-100 ${a.comprimentoPedido ? 'text-gray-900' : a.comprimentoMapeamento ? 'text-gray-900' : 'text-amber-700 font-semibold'}`}> 
                        {a.comprimentoPedido
                          ? `${a.comprimentoPedido}mm`
                          : a.comprimentoMapeamento
                            ? `${a.comprimentoMapeamento}mm`
                            : a.comprimentoFallback
                              ? `~${a.comprimentoFallback}mm`
                              : '—'}
                      </td>
                      <td className="px-3 py-1.5 text-right text-gray-800 border-b border-gray-100">{a.qt_kg > 0 ? a.qt_kg.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : '—'}</td>
                      <td className="px-3 py-1.5 text-right text-gray-800 border-b border-gray-100">{a.qtd_pc > 0 ? a.qtd_pc : '—'}</td>
                      <td className="px-3 py-1.5 text-gray-700 border-b border-gray-100">{a.pedido_seq || '—'}</td>
                      <td className="px-3 py-1.5 border-b border-gray-100">
                        {a.situacao ? (
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${a.situacao === 'liberado' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {a.situacao}
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 font-bold">
                    <td colSpan="6" className="px-3 py-2 text-right text-gray-700 text-xs">TOTAL</td>
                    <td className="px-3 py-2 text-right text-gray-900 text-xs">
                      {rack.totalKg > 0 ? rack.totalKg.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-900 text-xs">
                      {rack.totalPc > 0 ? rack.totalPc.toLocaleString('pt-BR') : '—'}
                    </td>
                    <td colSpan="2" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Assinatura */}
          <div className="mt-6 pt-4 border-t border-gray-200 grid grid-cols-3 gap-6 text-xs text-gray-600 print:mt-8">
            <div className="border-t border-gray-400 pt-2 text-center">Operador</div>
            <div className="border-t border-gray-400 pt-2 text-center">Conferência</div>
            <div className="border-t border-gray-400 pt-2 text-center">Data / Hora</div>
          </div>
        </div>

        {/* Rodapé do modal (ações de status) */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl print:hidden">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-gray-600 mr-1">Atualizar status:</span>
            {Object.entries(STATUS_LABELS).map(([key, val]) => (
              <button
                key={key}
                onClick={() => onAtualizarStatus(rack.rack, key)}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-full border transition-all ${(statusMap[rack.rack] || 'pendente') === key ? val.color + ' ring-2 ring-offset-1 ring-blue-400' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'}`}
              >
                {val.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoBlock({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-200">
      <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-0.5">{label}</div>
      <div className="text-sm font-semibold text-gray-800 truncate" title={String(value)}>{value || '—'}</div>
    </div>
  )
}

function ModalHistorico({ rack, historico, onClose }) {
  const formatarData = (iso) => {
    try { return new Date(iso).toLocaleString('pt-BR') } catch { return iso }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <FaHistory className="text-purple-600" /> Histórico — Rack {rack.rack}
          </h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded">
            <FaTimes size={15} />
          </button>
        </div>
        <div className="p-5 max-h-80 overflow-y-auto">
          {historico.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Nenhuma alteração registrada.</p>
          ) : (
            <ol className="relative border-l border-gray-200 pl-4 space-y-3">
              {historico.map((h, i) => {
                const cfg = STATUS_LABELS[h.status] || STATUS_LABELS.pendente
                return (
                  <li key={i} className="ml-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.color}`}>
                      {cfg.label}
                    </span>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {formatarData(h.data)} &nbsp;·&nbsp; {h.usuario || '—'}
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </div>
        <div className="px-5 py-3 border-t border-gray-100 text-right">
          <button onClick={onClose} className="px-4 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700 transition-colors">
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
