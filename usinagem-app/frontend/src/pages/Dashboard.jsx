import { useMemo, useState } from 'react'
import { useSupabase } from '../hooks/useSupabase'
import { useApontamentosRecentes } from '../hooks/useApontamentosRecentes'
import ApontamentoAlerta from '../components/ApontamentoAlerta'

const Dashboard = () => {
  // Dados reais do Supabase
  const { items: pedidos } = useSupabase('pedidos')
  const { items: apontamentos } = useSupabase('apontamentos')
  const { items: paradas } = useSupabase('apontamentos_parada')
  const { items: maquinas } = useSupabase('maquinas')
  
  // Hook para apontamentos recentes
  const { apontamentosRecentes, loading: loadingApontamentos } = useApontamentosRecentes()

  const [periodo, setPeriodo] = useState('hoje') // 'hoje' | 'ontem' | 'ult7'
  const toLocalYMD = (dt) => {
    if (!(dt instanceof Date)) return ''
    if (isNaN(dt.getTime())) return ''
    const y = dt.getFullYear()
    const m = String(dt.getMonth() + 1).padStart(2, '0')
    const d = String(dt.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  // Calcula início e fim do período selecionado (datas locais)
  const range = useMemo(() => {
    const hoje = new Date()
    const inicio = new Date(hoje)
    const fim = new Date(hoje)
    if (periodo === 'ontem') {
      inicio.setDate(hoje.getDate() - 1)
      fim.setDate(hoje.getDate() - 1)
    } else if (periodo === 'ult7') {
      inicio.setDate(hoje.getDate() - 6)
    }
    // Normalizar para início/fim do dia
    inicio.setHours(0,0,0,0)
    fim.setHours(23,59,59,999)
    return { inicio, fim, ymdInicio: toLocalYMD(inicio), ymdFim: toLocalYMD(fim) }
  }, [periodo])

  const apontamentosPeriodo = useMemo(() => (apontamentos || []).filter(a => {
    const inicio = new Date(a.inicio || a.inicio_timestamp || a.data || a.inicio_norm || '')
    return !isNaN(inicio.getTime()) && inicio >= range.inicio && inicio <= range.fim
  }), [apontamentos, range])

  const paradasPeriodo = useMemo(() => (paradas || []).filter(p => {
    const inicio = new Date(p.inicio || p.inicio_timestamp || p.inicio_norm || '')
    const fim = new Date(p.fim || p.fim_timestamp || p.fim_norm || new Date())
    return !isNaN(inicio.getTime()) && !isNaN(fim.getTime()) && inicio <= range.fim && fim >= range.inicio
  }), [paradas, range])

  const stats = useMemo(() => {
    const producaoPorUnidade = Object.entries(apontamentosPeriodo.reduce((acc, a) => {
      const unidade = String(a.unidade || a.unidade_medida || 'PC').toUpperCase()
      acc[unidade] = (acc[unidade] || 0) + (Number(a.quantidade) || 0)
      return acc
    }, {})).sort(([a], [b]) => a.localeCompare(b))

    const producaoTotal = apontamentosPeriodo.reduce((acc, a) => acc + (Number(a.quantidade) || 0), 0)
    const refugoTotal = apontamentosPeriodo.reduce((acc, a) => acc + (Number(a.qtd_refugo) || 0), 0)

    const msProducao = apontamentosPeriodo.reduce((acc, a) => {
      const inicio = new Date(a.inicio || a.inicio_timestamp || a.inicio_norm || '')
      const fim = new Date(a.fim || a.fim_timestamp || a.fim_norm || '')
      if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) return acc
      return acc + Math.max(0, fim - inicio)
    }, 0)

    // Tempo de Parada do período: somar interseções com o range
    const inicioDia = range.inicio
    const fimDia = range.fim
    const msParadaHoje = paradasPeriodo.reduce((acc, p) => {
      const iniRaw = p.inicio || p.inicio_timestamp || p.inicio_norm
      if (!iniRaw) return acc
      const fimRaw = p.fim || p.fim_timestamp || p.fim_norm || new Date()
      const iniP = new Date(iniRaw)
      const fimP = new Date(fimRaw)
      if (isNaN(iniP.getTime())) return acc
      const start = iniP > inicioDia ? iniP : inicioDia
      const end = fimP < fimDia ? fimP : fimDia
      const delta = Math.max(0, end - start)
      return acc + delta
    }, 0)
    const totalMin = Math.floor(msParadaHoje / 60000)
    const hh = String(Math.floor(totalMin / 60)).padStart(2, '0')
    const mm = String(totalMin % 60).padStart(2, '0')
    const tempoParadaFmt = msParadaHoje > 0 ? `${hh}:${mm}` : '-'

    // Ordens: considerar finalização manual ou quantidade separada atendida
    const concluidas = (pedidos || []).filter(p => {
      if (p?.finalizado_manual) return true
      const sep = Number(p.separado || 0)
      const qtd = Number(p.qtd_pedido || 0)
      return qtd > 0 && sep >= qtd
    }).length
    const pendentes = (pedidos || []).filter(p => {
      if (p?.finalizado_manual) return false
      const sep = Number(p.separado || 0)
      const qtd = Number(p.qtd_pedido || 0)
      // pendente quando não atingiu o pedido
      return !(qtd > 0 && sep >= qtd)
    }).length

    const disponibilidade = msProducao + msParadaHoje > 0
      ? Math.round((msProducao / (msProducao + msParadaHoje)) * 100)
      : null
    const unidadesNoPeriodo = producaoPorUnidade.map(([unidade]) => unidade)
    const qualidade = unidadesNoPeriodo.length === 1 && producaoTotal + refugoTotal > 0
      ? Math.round((producaoTotal / (producaoTotal + refugoTotal)) * 100)
      : null

    return {
      oee: {
        disponibilidade,
        performance: null,
        qualidade,
        total: null,
        qualidadeMotivo: unidadesNoPeriodo.length > 1 ? 'Unidades mistas no período' : null
      },
      tempoParada: tempoParadaFmt,
      producaoPorUnidade,
      refugoTotal,
      ordensCompletadas: concluidas,
      ordensPendentes: pendentes,
    }
  }, [apontamentosPeriodo, pedidos, paradasPeriodo, range])

  const ordensExecucao = useMemo(() => {
    // Agregar apontamentos por pedido (ordemTrabalho = pedido_seq)
    const porPedido = {}
    for (const a of apontamentosPeriodo) {
      const seq = String(a.ordem_trabalho || a.pedido_seq || '')
      if (!seq) continue
      const q = Number(a.quantidade || 0)
      if (!porPedido[seq]) porPedido[seq] = { quantidade: 0, ultimo: null }
      porPedido[seq].quantidade += isNaN(q) ? 0 : q
      // guardar o último apontamento para mostrar máquina/operador
      porPedido[seq].ultimo = a
    }

    // Mapa de máquinas (id -> nome visível)
    const mapMaq = new Map()
    for (const m of (maquinas || [])) {
      const nomeVisivel = (m.nome || m.codigo || m.modelo || '').toString() || '-'
      if (m.id) mapMaq.set(String(m.id), nomeVisivel)
      if (m.codigo) mapMaq.set(String(m.codigo), nomeVisivel)
    }

    // Selecionar pedidos que:
    // - têm quantidade apontada > 0
    // - NÃO estão finalizados/concluídos
    // - e quantidade apontada < qtd_pedido (para não aparecer quando já atingiu a meta)
    const statusKey = (s) => String(s || '').toLowerCase()
    const lista = (pedidos || [])
      .filter(p => {
        const seq = String(p.pedido_seq || '')
        const info = porPedido[seq]
        if (!info || info.quantidade <= 0) return false
        const finalizado = ['finalizado','concluido'].includes(statusKey(p.status)) || p.finalizado_manual
        if (finalizado) return false
        const qtd = Number(p.qtd_pedido || 0)
        return !(qtd > 0 && info.quantidade >= qtd)
      })
      .map(p => {
        const seq = String(p.pedido_seq || '')
        const info = porPedido[seq] || { quantidade: 0 }
        const qtd = Number(p.qtd_pedido || 0)
        const produzidas = info.quantidade
        const progresso = qtd > 0 ? Math.min(Math.round((produzidas / qtd) * 100), 100) : 0
        const ultimo = info.ultimo || {}
        const rawMaq = String(ultimo.maquina || p.operacao_atual || '').trim()
        const maqNome = mapMaq.get(rawMaq) || (/^[0-9a-f-]{8,}$/i.test(rawMaq) ? '-' : (rawMaq || '-'))
        return {
          codigo: p.pedido_seq || p.nro_op || p.id,
          perfil: p.produto,
          maquina: maqNome,
          operador: ultimo.operador || '-',
          qtdPedido: qtd,
          separado: Number(p.separado || 0),
          apontado: produzidas,
          progresso,
        }
      })
      .sort((a, b) => b.progresso - a.progresso)
      .slice(0, 8)
    return lista
  }, [pedidos, apontamentosPeriodo, maquinas])
  
  return (
    <div>
      {/* Alerta de Apontamentos Recentes */}
      <ApontamentoAlerta 
        apontamentosRecentes={apontamentosRecentes} 
        loading={loadingApontamentos} 
      />
      
      <div className="p-6">
        {/* Seletor de período */}
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <div className="flex items-center space-x-2">
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1 text-sm"
            >
              <option value="hoje">Hoje</option>
              <option value="ontem">Ontem</option>
              <option value="ult7">Últimos 7 dias</option>
            </select>
            <span className="text-xs text-gray-500">{range.ymdInicio} → {range.ymdFim}</span>
          </div>
        </div>
        
        {/* Cards principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-700">OEE Total</h2>
          <p className="text-3xl font-bold text-gray-400">-</p>
          <p className="mt-1 text-xs text-gray-500">Aguardando meta teórica de performance</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-700">Tempo de Parada</h2>
          <p className="text-3xl font-bold text-yellow-500">{stats.tempoParada}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-700">Produção no Período</h2>
          {stats.producaoPorUnidade.length > 0 ? stats.producaoPorUnidade.map(([unidade, quantidade]) => (
            <p key={unidade} className="text-2xl font-bold text-green-600">
              {quantidade.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} <span className="text-sm">{unidade}</span>
            </p>
          )) : <p className="text-3xl font-bold text-gray-400">-</p>}
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-700">Ordens</h2>
          <p className="text-xs text-gray-400 mb-2">Carteira total</p>
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500">Concluídas</p>
              <p className="text-xl font-bold text-green-600">{stats.ordensCompletadas}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Pendentes</p>
              <p className="text-xl font-bold text-yellow-500">{stats.ordensPendentes}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Componentes do OEE */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-700">Indicadores para cálculo do OEE</h2>
        <p className="text-xs text-gray-500 mb-4">O OEE total será exibido quando houver meta teórica para calcular a performance.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Disponibilidade</h3>
            <div className="mt-1 relative pt-1">
              <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                <div style={{ width: `${stats.oee.disponibilidade ?? 0}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"></div>
              </div>
              <p className="text-right text-sm font-semibold text-gray-700">{stats.oee.disponibilidade != null ? `${stats.oee.disponibilidade}%` : '-'}</p>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Performance</h3>
            <div className="mt-1 relative pt-1">
              <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                <div style={{ width: `${stats.oee.performance ?? 0}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-yellow-500"></div>
              </div>
              <p className="text-right text-sm font-semibold text-gray-500">Sem meta teórica</p>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Qualidade</h3>
            <div className="mt-1 relative pt-1">
              <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                <div style={{ width: `${stats.oee.qualidade ?? 0}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-green-500"></div>
              </div>
              <p className="text-right text-sm font-semibold text-gray-700">
                {stats.oee.qualidade != null ? `${stats.oee.qualidade}%` : (stats.oee.qualidadeMotivo || '-')}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Ordens em Execução baseadas nos pedidos em_producao */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-700">Ordens movimentadas no período</h2>
          <p className="text-xs text-gray-500">Até 8 ordens incompletas, priorizadas pelo maior progresso</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Perfil</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Máquina</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operador</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qtd. Pedido</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Separado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Apontado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progresso</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ordensExecucao.map((o, idx) => (
                <tr key={o.codigo || idx}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{o.codigo}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{o.perfil}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{o.maquina}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{o.operador}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{(o.qtdPedido||0).toLocaleString('pt-BR')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{(o.separado||0).toLocaleString('pt-BR')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{(o.apontado||0).toLocaleString('pt-BR')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="relative pt-1">
                      <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                        <div style={{ width: `${o.progresso}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary-500"></div>
                      </div>
                      <span className="text-xs font-semibold inline-block text-primary-600">
                        {o.progresso}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
              {ordensExecucao.length === 0 && (
                <tr>
                  <td colSpan="8" className="px-6 py-6 text-center text-gray-500">Nenhuma ordem movimentada no período</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </div>
  )
}

export default Dashboard
