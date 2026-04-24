import { useCallback, useState } from 'react'
import supabaseService from '../services/SupabaseService'
import { ALUNICA_STAGE_KEYS } from '../constants/expUsinagem'
import { toDecimal, toIntegerRound } from '../utils/expUsinagem'

const useInventarios = ({ fluxoPedidos, pedidosTecnoPerfil, alunicaStages, user }) => {
  const [inventarios, setInventarios] = useState([])
  const [invLoading, setInvLoading] = useState(false)
  const [activeInventario, setActiveInventario] = useState(null)
  const [invItens, setInvItens] = useState([])
  const [invItensLoading, setInvItensLoading] = useState(false)
  const [invSaving, setInvSaving] = useState(false)
  const [invError, setInvError] = useState(null)
  const [newInvUnidade, setNewInvUnidade] = useState('todas')
  const [newInvObs, setNewInvObs] = useState('')

  const setInvItemField = (id, field, value) => {
    setInvItens((prev) => prev.map((it) => (String(it.id) === String(id) ? { ...it, [field]: value } : it)))
  }

  const loadInventarios = useCallback(async () => {
    try {
      setInvLoading(true)
      const list = await supabaseService.getAll('inventarios')
      const ordered = Array.isArray(list)
        ? [...list].sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())
        : []
      setInventarios(ordered)
    } catch (e) {
      setInvError(e?.message || String(e))
    } finally {
      setInvLoading(false)
    }
  }, [])

  const loadInventarioItens = useCallback(async (inventarioId) => {
    try {
      setInvItensLoading(true)
      const itens = await supabaseService.getByIndex('inventario_itens', 'inventario_id', inventarioId)
      setInvItens(Array.isArray(itens) ? itens : [])
    } catch (e) {
      setInvError(e?.message || String(e))
    } finally {
      setInvItensLoading(false)
    }
  }, [])

  const getEstoqueRowsSnapshot = () => {
    const byIdRaw = (Array.isArray(fluxoPedidos) ? fluxoPedidos : []).reduce((acc, r) => {
      if (r && r.id) acc[String(r.id)] = r
      return acc
    }, /** @type {Record<string, any>} */({}))

    const base = (Array.isArray(pedidosTecnoPerfil) ? pedidosTecnoPerfil : []).map((p) => {
      const raw = byIdRaw[String(p.id)] || {}
      const pedidoPc = Number(p.pedidoPcNumber ?? 0)
      const pedidoKg = Number(p.pedidoKgNumber ?? 0)
      const apontPc = toIntegerRound(raw.saldo_pc_total) || 0
      const apontKg = toDecimal(raw.saldo_kg_total) || 0
      const saldoPc = Math.max(pedidoPc - apontPc, 0)
      const saldoKg = Math.max(pedidoKg - apontKg, 0)
      const statusTecno = p.status
      const isAlunica = ALUNICA_STAGE_KEYS.includes(alunicaStages[String(p.id)] || '')
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
        saldoPc
      }
    })
    return base
  }

  const createInventarioFromSnapshot = async () => {
    try {
      setInvError(null)
      setInvSaving(true)
      const headerId = await supabaseService.add('inventarios', {
        criado_por: user?.email || user?.username || null,
        unidade: newInvUnidade,
        status: 'rascunho',
        observacoes: newInvObs || null
      })
      const rows = getEstoqueRowsSnapshot().filter((r) => {
        if (newInvUnidade === 'TecnoPerfil') return r.unidade === 'TecnoPerfil'
        if (newInvUnidade === 'Alúnica') return r.unidade === 'Alúnica'
        return true
      })
      const itens = rows.map((r) => ({
        inventario_id: headerId,
        exp_fluxo_id: r.id,
        pedido_seq: r.pedido,
        cliente: r.cliente,
        ferramenta: r.ferramenta,
        unidade: r.unidade,
        estagio: r.estagio,
        sistema_kg: r.saldoKg,
        sistema_pc: r.saldoPc,
        contado_kg: null,
        contado_pc: null,
        diff_kg: null,
        diff_pc: null
      }))
      if (itens.length > 0) {
        await supabaseService.addMany('inventario_itens', itens)
      }
      await loadInventarios()
      setActiveInventario(headerId)
      await loadInventarioItens(headerId)
      setNewInvObs('')
    } catch (e) {
      setInvError(e?.message || String(e))
    } finally {
      setInvSaving(false)
    }
  }

  const saveInventarioItem = async (item, patch) => {
    try {
      setInvSaving(true)
      const contado_kg = patch.contado_kg ?? item.contado_kg ?? null
      const contado_pc = patch.contado_pc ?? item.contado_pc ?? null
      const diff_kg =
        contado_kg === null || contado_kg === undefined || item.sistema_kg === null || item.sistema_kg === undefined
          ? null
          : Number(contado_kg) - Number(item.sistema_kg || 0)
      const diff_pc =
        contado_pc === null || contado_pc === undefined || item.sistema_pc === null || item.sistema_pc === undefined
          ? null
          : Number(contado_pc) - Number(item.sistema_pc || 0)
      await supabaseService.update('inventario_itens', {
        ...item,
        contado_kg,
        contado_pc,
        diff_kg,
        diff_pc
      })
      await loadInventarioItens(item.inventario_id)
    } catch (e) {
      setInvError(e?.message || String(e))
    } finally {
      setInvSaving(false)
    }
  }

  const cancelInventario = async (inventarioId) => {
    try {
      if (!inventarioId) return
      const inv = (inventarios || []).find((i) => String(i.id) === String(inventarioId))
      if (inv && inv.status !== 'rascunho') {
        setInvError('Apenas inventários em rascunho podem ser cancelados.')
        return
      }
      const ok = typeof window !== 'undefined' ? window.confirm('Cancelar este inventário? Esta ação apagará todas as contagens e não pode ser desfeita.') : true
      if (!ok) return
      setInvSaving(true)
      await supabaseService.remove('inventarios', inventarioId)
      if (String(activeInventario) === String(inventarioId)) {
        setActiveInventario(null)
        setInvItens([])
      }
      await loadInventarios()
    } catch (e) {
      setInvError(e?.message || String(e))
    } finally {
      setInvSaving(false)
    }
  }

  return {
    // estados
    inventarios,
    invLoading,
    activeInventario,
    invItens,
    invItensLoading,
    invSaving,
    invError,
    newInvUnidade,
    newInvObs,
    // setters
    setActiveInventario,
    setInvItemField,
    setNewInvUnidade,
    setNewInvObs,
    // ações
    loadInventarios,
    loadInventarioItens,
    createInventarioFromSnapshot,
    saveInventarioItem,
    cancelInventario
  }
}

export default useInventarios
