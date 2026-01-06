import { useState, useEffect } from 'react'
import { FaUpload, FaClipboardCheck, FaMinusCircle } from 'react-icons/fa'
import * as XLSX from 'xlsx'
import { formatDateBR, formatInteger, formatNumber, toDecimal, toIntegerRound } from '../../utils/expUsinagem'
import BaixaEstoqueModal from './modals/BaixaEstoqueModal'
import supabaseService from '../../services/SupabaseService'

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
  // Estados do modal de baixa
  const [baixaModalOpen, setBaixaModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [lotesDisponiveis, setLotesDisponiveis] = useState([])
  const [baixaSaving, setBaixaSaving] = useState(false)
  const [baixaError, setBaixaError] = useState(null)
  const [baixasPorFluxo, setBaixasPorFluxo] = useState({})

  const byIdRaw = (Array.isArray(fluxoPedidos) ? fluxoPedidos : []).reduce((acc, r) => {
    if (r && r.id) acc[String(r.id)] = r
    return acc
  }, /** @type {Record<string, any>} */({}))

  // Carrega baixas de estoque da nova tabela exp_estoque_baixas
  const loadBaixas = async (fluxoList) => {
    try {
      const ids = (Array.isArray(fluxoList) ? fluxoList : [])
        .map((r) => r && r.id)
        .filter(Boolean)

      if (!ids.length) {
        setBaixasPorFluxo({})
        return
      }

      const baixas = await supabaseService.getByIn('exp_estoque_baixas', 'fluxo_id', ids)
      const map = /** @type {Record<string, { baixadoPc: number, baixadoKg: number }>} */({})

      ;(Array.isArray(baixas) ? baixas : []).forEach((baixa) => {
        if (!baixa || baixa.estornado) return // Ignora baixas estornadas

        const key = String(baixa.fluxo_id)
        if (!map[key]) {
          map[key] = { baixadoPc: 0, baixadoKg: 0 }
        }

        const qtdPc = toIntegerRound(baixa.quantidade_pc) || 0
        const qtdKg = toDecimal(baixa.quantidade_kg) || 0
        map[key].baixadoPc += qtdPc
        map[key].baixadoKg += qtdKg
      })

      setBaixasPorFluxo(map)
    } catch (e) {
      console.error('Erro ao carregar baixas de estoque:', e)
      setBaixasPorFluxo({})
    }
  }

  useEffect(() => {
    loadBaixas(fluxoPedidos)
  }, [fluxoPedidos])

  const rowsBase = (Array.isArray(pedidosTecnoPerfil) ? pedidosTecnoPerfil : []).map((p) => {
    const raw = byIdRaw[String(p.id)] || {}
    const pedidoPc = Number(p.pedidoPcNumber ?? 0)
    const pedidoKg = Number(p.pedidoKgNumber ?? 0)
    const apontPc = toIntegerRound(raw.saldo_pc_total) || 0
    const apontKg = toDecimal(raw.saldo_kg_total) || 0
    const baixas = baixasPorFluxo[String(p.id)] || {}
    const baixadoPc = toIntegerRound(baixas.baixadoPc) || 0
    const baixadoKg = toDecimal(baixas.baixadoKg) || 0
    const estoquePc = Math.max(apontPc - baixadoPc, 0)
    const estoqueKg = Math.max(apontKg - baixadoKg, 0)
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
      estoqueKg,
      estoquePc,
      updatedAt
    }
  })

  const now = Date.now()
  const maxAge = Number(estoquePeriodo || 0) * 24 * 60 * 60 * 1000
  const term = String(estoqueBusca || '').trim().toLowerCase()
  const filtered = rowsBase.filter((r) => {
    if (estoqueUnidade === 'tecno' && r.unidade !== 'TecnoPerfil') return false
    if (estoqueUnidade === 'alunica' && r.unidade !== 'Alúnica') return false
    // Estoque da usinagem: só faz sentido para pedidos que já tiveram produção apontada
    if (r.apontPc === 0 && r.apontKg === 0) return false
    if (estoqueSituacao === 'com') {
      if (!((r.estoqueKg > 0) || (r.estoquePc > 0))) return false
    }
    if (estoqueSituacao === 'sem') {
      if (!((r.estoqueKg === 0) && (r.estoquePc === 0))) return false
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

  // Abrir modal de baixa e carregar lotes disponíveis
  const handleOpenBaixa = async (item) => {
    setSelectedItem(item)
    setBaixaError(null)
    
    try {
      // Buscar apontamentos do pedido que estão em para-embarque (prontos para baixa)
      const apontamentos = await supabaseService.getByIndex('apontamentos', 'exp_fluxo_id', item.id)
      
      // Filtrar apenas lotes de embalagem (para-embarque)
      const lotesEmbalagem = (Array.isArray(apontamentos) ? apontamentos : [])
        .filter(apont => apont && apont.exp_unidade === 'alunica' && apont.exp_stage === 'para-embarque')
      
      // Buscar baixas já realizadas para calcular disponível
      const baixasExistentes = await supabaseService.getByIndex('exp_estoque_baixas', 'fluxo_id', item.id)
      const baixasPorLote = {}
      
      ;(Array.isArray(baixasExistentes) ? baixasExistentes : []).forEach(baixa => {
        if (baixa.estornado) return
        const key = baixa.lote_codigo
        if (!baixasPorLote[key]) {
          baixasPorLote[key] = { pc: 0, kg: 0 }
        }
        baixasPorLote[key].pc += toIntegerRound(baixa.quantidade_pc) || 0
        baixasPorLote[key].kg += toDecimal(baixa.quantidade_kg) || 0
      })
      
      // Montar lista de lotes com disponível
      const lotes = lotesEmbalagem.map(apont => {
        const baixado = baixasPorLote[apont.lote] || { pc: 0, kg: 0 }
        const qtdApont = toIntegerRound(apont.quantidade) || 0
        const dispPc = Math.max(qtdApont - baixado.pc, 0)
        
        // Calcular Kg proporcional (se houver)
        const kgPorPc = qtdApont > 0 && item.pedidoKg > 0 && item.pedidoPc > 0
          ? item.pedidoKg / item.pedidoPc
          : 0
        const kgApont = kgPorPc > 0 ? qtdApont * kgPorPc : 0
        const dispKg = Math.max(kgApont - baixado.kg, 0)
        
        return {
          id: apont.id,
          lote_codigo: apont.lote,
          lote_externo: apont.lote_externo,
          disponivel_pc: dispPc,
          disponivel_kg: dispKg
        }
      }).filter(lote => lote.disponivel_pc > 0 || lote.disponivel_kg > 0)
      
      setLotesDisponiveis(lotes)
      setBaixaModalOpen(true)
    } catch (error) {
      console.error('Erro ao carregar lotes:', error)
      setBaixaError('Erro ao carregar lotes disponíveis.')
      setLotesDisponiveis([])
      setBaixaModalOpen(true)
    }
  }

  // Fechar modal de baixa
  const handleCloseBaixa = () => {
    if (!baixaSaving) {
      setBaixaModalOpen(false)
      setSelectedItem(null)
      setBaixaError(null)
    }
  }

  // Confirmar baixa de estoque com rastreabilidade por lote
  const handleConfirmBaixa = async (dados) => {
    setBaixaSaving(true)
    setBaixaError(null)

    try {
      const { item, tipoBaixa, baixasPorLote, observacao } = dados

      // Salvar cada baixa de lote na nova tabela exp_estoque_baixas
      for (const baixa of baixasPorLote) {
        const registro = {
          fluxo_id: item.id,
          lote_codigo: baixa.lote_codigo,
          tipo_baixa: tipoBaixa,
          quantidade_pc: baixa.quantidade_pc,
          quantidade_kg: baixa.quantidade_kg,
          observacao: observacao || null,
          baixado_por: 'Sistema', // TODO: Substituir por usuário autenticado
          estornado: false
        }

        await supabaseService.add('exp_estoque_baixas', registro)
      }

      // Recarregar baixas
      await loadBaixas(fluxoPedidos)

      // Fechar modal
      handleCloseBaixa()
      
      const totalPc = baixasPorLote.reduce((acc, b) => acc + b.quantidade_pc, 0)
      const totalKg = baixasPorLote.reduce((acc, b) => acc + b.quantidade_kg, 0)
      
      alert(`Baixa de estoque registrada com sucesso!\nTipo: ${tipoBaixa}\nLotes: ${baixasPorLote.length}\nTotal Pc: ${totalPc} | Total Kg: ${totalKg.toFixed(3)}`)
    } catch (error) {
      console.error('Erro ao dar baixa no estoque:', error)
      setBaixaError(error?.message || 'Falha ao processar baixa.')
    } finally {
      setBaixaSaving(false)
    }
  }

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
        'Estoque Kg': r.estoqueKg,
        'Estoque Pc': r.estoquePc,
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
              <th className="py-2 pr-3 text-right">Estoque Kg</th>
              <th className="py-2 pr-3 text-right">Estoque Pc</th>
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
                <td className="py-2 pr-3 text-right">{formatNumber(r.estoqueKg)}</td>
                <td className="py-2 pr-3 text-right">{formatInteger(r.estoquePc)}</td>
                <td className="py-2 pr-3">{r.updatedAt ? formatDateBR(r.updatedAt) : '—'}</td>
                <td className="py-2 pr-3">
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50"
                    onClick={() => handleOpenBaixa(r)}
                    disabled={r.apontPc === 0 && r.apontKg === 0}
                    title="Dar baixa no estoque"
                    aria-label="Dar baixa no estoque"
                  >
                    <FaMinusCircle />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de Baixa de Estoque */}
      <BaixaEstoqueModal
        open={baixaModalOpen}
        item={selectedItem}
        lotesDisponiveis={lotesDisponiveis}
        onClose={handleCloseBaixa}
        onConfirm={handleConfirmBaixa}
        saving={baixaSaving}
        error={baixaError}
      />
    </div>
  )
}

export default EstoqueUsinagemPanel
