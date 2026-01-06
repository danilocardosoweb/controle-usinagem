import React, { useEffect, useMemo, useRef, useState } from 'react'
import { FaBoxOpen, FaCubes, FaExclamationTriangle, FaTools, FaArrowDown, FaClock, FaChartPie, FaPlusCircle, FaHistory } from 'react-icons/fa'
import useSupabase from '../hooks/useSupabase'
import supabaseService from '../services/SupabaseService'

export default function Estoque() {
  const CATEGORIAS_USINAGEM = [
    'CNC - Ferramental',
    'CNC - Consumíveis',
    'Usinagem - Lubrificantes',
    'Usinagem - Fixação',
    'Usinagem - Abrasivos',
    'Usinagem - Medição',
    'Manutenção',
    'Limpeza',
    'EPI'
  ]

  const CFG_KEY_CATEGORIAS_INSUMOS = 'estoque_categorias_insumos'
  const CFG_KEY_CATEGORIAS_FERRAMENTAS = 'estoque_categorias_ferramentas'
  const CFG_KEY_MINIMO_ACABADOS = 'estoque_minimo_acabados'
  const CFG_KEY_FERR_VIDA_UTIL = 'ferramentas_vida_util_cfg'

  const UNIDADES_PADRAO = ['un', 'pcs', 'kg', 'l', 'ml', 'm', 'cx']
  const CATEGORIAS_FERRAMENTAS = [
    'Broca',
    'Fresa',
    'Pastilha',
    'Porta-ferramenta',
    'Rosqueamento',
    'Serra',
    'Medição',
    'Outros'
  ]

  // Dados base
  const { items: apontamentos } = useSupabase('apontamentos')
  const { items: baixas, loadItems: loadBaixas } = useSupabase('exp_estoque_baixas')
  const { items: maquinasCat } = useSupabase('maquinas')
  const { items: ferramentasCfg, loadItems: loadFerramentasCfg } = useSupabase('ferramentas_cfg')
  const { items: insumos, loadItems: loadInsumos } = useSupabase('exp_insumos')
  // Views e tabelas de movimentos (para aba Ferramentas e Insumos)
  const { items: insumosSaldo, loadItems: loadInsumosSaldo } = useSupabase('vw_insumos_saldo')
  const { items: insumosConsumo30 } = useSupabase('vw_insumos_consumo_30d')
  const { items: insumosMov, loadItems: loadInsumosMov } = useSupabase('exp_insumos_mov')
  const { items: ferrStatus, loadItems: loadFerrStatus } = useSupabase('vw_ferramentas_status')
  const { items: ferrConsumo30 } = useSupabase('vw_ferramentas_consumo_30d')
  const { items: ferrMov } = useSupabase('exp_ferramentas_mov')

  const [tab, setTab] = useState('acabados') // acabados | ferramentas
  const [periodo, setPeriodo] = useState('30') // dias para giro
  const [baixaOpen, setBaixaOpen] = useState(false)
  const [baixaSaving, setBaixaSaving] = useState(false)
  const [baixaForm, setBaixaForm] = useState({ produto: '', quantidade: '', motivo: 'producao' })
  const [erroBaixa, setErroBaixa] = useState('')

  const [filtroProduto, setFiltroProduto] = useState('')
  const [somenteComSaldo, setSomenteComSaldo] = useState(true)
  const [somenteAbaixoMin, setSomenteAbaixoMin] = useState(false)
  const [ordemAcabados, setOrdemAcabados] = useState('alerta')
  const [acabadosVerSecundario, setAcabadosVerSecundario] = useState(false)

  const [filtroInsumo, setFiltroInsumo] = useState('')
  const [insumosSomenteAbaixoMin, setInsumosSomenteAbaixoMin] = useState(false)
  const [insumosVerSecundario, setInsumosVerSecundario] = useState(false)
  const [categoriasInsumos, setCategoriasInsumos] = useState(CATEGORIAS_USINAGEM)
  const [categoriasFerramentas, setCategoriasFerramentas] = useState(CATEGORIAS_FERRAMENTAS)
  const [categoriasOpen, setCategoriasOpen] = useState(false)
  const [categoriasSaving, setCategoriasSaving] = useState(false)
  const [categoriasError, setCategoriasError] = useState('')
  const [categoriasInsumosText, setCategoriasInsumosText] = useState('')
  const [categoriasFerramentasText, setCategoriasFerramentasText] = useState('')

  const [minAcabadosMap, setMinAcabadosMap] = useState({})
  const [minAcabadosSaving, setMinAcabadosSaving] = useState(false)
  const [minEditProduto, setMinEditProduto] = useState('')
  const [minEditValor, setMinEditValor] = useState('')

  const [minInsumoSavingId, setMinInsumoSavingId] = useState('')
  const [minInsumoEditId, setMinInsumoEditId] = useState('')
  const [minInsumoEditValor, setMinInsumoEditValor] = useState('')
  const [ferrStatusEditOpen, setFerrStatusEditOpen] = useState(false)
  const [ferrStatusEditSaving, setFerrStatusEditSaving] = useState(false)
  const [ferrStatusEditError, setFerrStatusEditError] = useState('')
  const [ferrStatusEditForm, setFerrStatusEditForm] = useState({ id: '', ferramenta: '', vida_valor: '', vida_unidade: 'dias', vida_util_dias: '', ultima_troca: '', responsavel: '', status: 'ativa' })
  const [ferrVidaCfg, setFerrVidaCfg] = useState({})
  const [ferrMostrarEstoque, setFerrMostrarEstoque] = useState(false) // mostrar também inativas/estoque
  // Modais de Insumos
  const [insumoEntradaOpen, setInsumoEntradaOpen] = useState(false)
  const [insumoSaidaOpen, setInsumoSaidaOpen] = useState(false)
  const [insumoSaving, setInsumoSaving] = useState(false)
  const [insumoEntradaForm, setInsumoEntradaForm] = useState({ nome: '', categoria: '', quantidade: '', unidade: 'un', responsavel: '', observacao: '' })
  const [insumoSaidaForm, setInsumoSaidaForm] = useState({ nome: '', quantidade: '', unidade: 'un', motivo: 'consumo', maquina: '', responsavel: '', observacao: '' })
  const [insumoFotoFile, setInsumoFotoFile] = useState(null)
  const [insumoFotoPreview, setInsumoFotoPreview] = useState('')
  const [erroInsumo, setErroInsumo] = useState('')
  // Modais de Ferramentas
  const [ferrMovOpen, setFerrMovOpen] = useState(false)
  const [ferrSaving, setFerrSaving] = useState(false)
  const [ferrForm, setFerrForm] = useState({ ferramenta: '', categoria: '', tipo: 'troca', quantidade: '1', unidade: 'un', motivo: 'troca', maquina: '', responsavel: '', observacao: '' })
  const [erroFerr, setErroFerr] = useState('')

  const [cadFerrOpen, setCadFerrOpen] = useState(false)
  const [cadFerrSaving, setCadFerrSaving] = useState(false)
  const [cadFerrError, setCadFerrError] = useState('')
  const [cadFerrForm, setCadFerrForm] = useState({ ferramenta: '', descricao: '', ativo: true })

  const insumoFotoInputRef = useRef(null)

  // Utils
  const parseDate = (d) => (d ? new Date(d) : null)
  const hoje = new Date()
  const diasAtras = (n) => new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - Number(n || 0))

  const normKey = (v) => String(v || '').trim().toLowerCase()

  useEffect(() => {
    if (!insumoFotoFile) {
      setInsumoFotoPreview('')
      return
    }

    const url = URL.createObjectURL(insumoFotoFile)
    setInsumoFotoPreview(url)
    return () => {
      try { URL.revokeObjectURL(url) } catch {}
    }
  }, [insumoFotoFile])

  useEffect(() => {
    const loadCategorias = async () => {
      try {
        const a = await supabaseService.obterConfiguracao(CFG_KEY_CATEGORIAS_INSUMOS)
        const b = await supabaseService.obterConfiguracao(CFG_KEY_CATEGORIAS_FERRAMENTAS)
        const arrA = Array.isArray(a) ? a : (typeof a === 'string' ? JSON.parse(a) : null)
        const arrB = Array.isArray(b) ? b : (typeof b === 'string' ? JSON.parse(b) : null)
        if (Array.isArray(arrA) && arrA.length > 0) setCategoriasInsumos(arrA)
        if (Array.isArray(arrB) && arrB.length > 0) setCategoriasFerramentas(arrB)
      } catch (e) {
        console.error('Erro ao carregar categorias configuráveis:', e)
      }
    }
    loadCategorias()
  }, [])

  useEffect(() => {
    const loadMinAcabados = async () => {
      try {
        const v = await supabaseService.obterConfiguracao(CFG_KEY_MINIMO_ACABADOS)
        const obj = (v && typeof v === 'object') ? v : (typeof v === 'string' ? JSON.parse(v) : null)
        if (obj && typeof obj === 'object') setMinAcabadosMap(obj)
      } catch (e) {
        console.error('Erro ao carregar mínimos de acabados:', e)
      }
    }
    loadMinAcabados()
  }, [])

  useEffect(() => {
    const loadFerrVida = async () => {
      try {
        const v = await supabaseService.obterConfiguracao(CFG_KEY_FERR_VIDA_UTIL)
        const obj = (v && typeof v === 'object') ? v : (typeof v === 'string' ? JSON.parse(v) : null)
        if (obj && typeof obj === 'object') setFerrVidaCfg(obj)
      } catch (e) {
        console.error('Erro ao carregar config de vida útil de ferramentas:', e)
      }
    }
    loadFerrVida()
  }, [])

  // Index de configuração por produto/ferramenta
  const cfgByFerramenta = useMemo(() => {
    const map = {}
    ;(Array.isArray(ferramentasCfg) ? ferramentasCfg : []).forEach((c) => {
      const key = String(c.ferramenta || c.codigo || '').trim()
      if (key) map[key] = c
    })
    return map
  }, [ferramentasCfg])

  // 1) Controle de Itens Acabados (tudo que foi embalado)
  // Considera apontamentos com exp_unidade='embalagem' como ENTRADAS de estoque
  const entradasEmbalagem = useMemo(() => {
    return (Array.isArray(apontamentos) ? apontamentos : [])
      .filter(a => (a.exp_unidade || '').toLowerCase() === 'embalagem')
  }, [apontamentos])

  // Baixas efetivas (não estornadas)
  const baixasValidas = useMemo(() => {
    return (Array.isArray(baixas) ? baixas : [])
      .filter(b => !b.estornado)
  }, [baixas])

  // Saldo por produto+lote
  const saldoPorChave = useMemo(() => {
    const saldos = {}
    const keyOf = (a) => `${String(a.produto || '').trim()}|${String(a.lote || a.lote_externo || '').trim()}`

    entradasEmbalagem.forEach(a => {
      const key = keyOf(a)
      if (!saldos[key]) saldos[key] = { produto: String(a.produto || '').trim(), lote: a.lote || a.lote_externo || '', entradas: 0, saidas: 0 }
      saldos[key].entradas += Number(a.quantidade || 0)
    })

    baixasValidas.forEach(b => {
      const key = `${String(b.produto || '').trim()}|${String(b.lote_codigo || '').trim()}`
      if (!saldos[key]) saldos[key] = { produto: String(b.produto || '').trim(), lote: b.lote_codigo, entradas: 0, saidas: 0 }
      saldos[key].saidas += Number(b.quantidade_pc || 0)
    })

    Object.values(saldos).forEach(s => { s.saldo = (s.entradas || 0) - (s.saidas || 0) })
    return saldos
  }, [entradasEmbalagem, baixasValidas])

  // Agregação por produto
  const estoquePorProduto = useMemo(() => {
    const map = {}
    Object.values(saldoPorChave).forEach((s) => {
      const prod = String(s.produto || '').trim()
      if (!prod) return
      if (!map[prod]) map[prod] = { produto: prod, saldo: 0, min: 0 }
      map[prod].saldo += Number(s.saldo || 0)
    })
    // Mínimo sugerido: pcs_por_pallet se existir (sem criar tabela nova)
    Object.values(map).forEach((row) => {
      const cfg = cfgByFerramenta[row.produto]
      const pcsPal = Number(cfg?.pcs_por_pallet || 0)
      const override = Number(minAcabadosMap?.[row.produto] ?? NaN)
      row.min = Number.isFinite(override) ? override : (pcsPal > 0 ? pcsPal : 0)
    })
    return Object.values(map)
  }, [saldoPorChave, cfgByFerramenta, minAcabadosMap])

  const handleOpenFerrStatusEdit = (f) => {
    if (!f) return
    const key = String(f.ferramenta || '').trim()
    const cfg = cfgByFerramenta[key]
    const cfgVida = ferrVidaCfg?.[key]
    const unidade = cfgVida?.vida_unidade || 'dias'
    const valor = cfgVida?.vida_valor ?? (cfg?.vida_util_dias ?? '')
    setFerrStatusEditError('')
    setFerrStatusEditForm({
      id: cfg?.id || '',
      ferramenta: key,
      vida_valor: valor === '' ? '' : String(valor),
      vida_unidade: unidade,
      vida_util_dias: String(cfg?.vida_util_dias || ''),
      ultima_troca: cfg?.ultima_troca ? new Date(cfg.ultima_troca).toISOString().slice(0, 10) : '',
      responsavel: cfg?.responsavel || '',
      status: cfg?.ativo === false ? 'estoque' : 'ativa'
    })
    setFerrStatusEditOpen(true)
  }

  const handleSaveFerrStatusEdit = async (e) => {
    e?.preventDefault?.()
    if (ferrStatusEditSaving) return
    setFerrStatusEditError('')
    const id = ferrStatusEditForm.id
    if (!id) {
      setFerrStatusEditError('Não foi possível localizar o registro da ferramenta para edição.')
      return
    }
    const vidaValor = ferrStatusEditForm.vida_valor ? Number(ferrStatusEditForm.vida_valor) : null
    if (vidaValor != null && (!Number.isFinite(vidaValor) || vidaValor < 0)) {
      setFerrStatusEditError('Vida útil inválida.')
      return
    }
    const unidade = ferrStatusEditForm.vida_unidade || 'dias'
    let vidaDias = null
    if (vidaValor != null) {
      if (unidade === 'dias') vidaDias = vidaValor
      else if (unidade === 'horas') vidaDias = vidaValor / 24
      else if (unidade === 'semanas') vidaDias = vidaValor * 7
      else vidaDias = vidaValor
      if (Number.isFinite(vidaDias)) vidaDias = Math.ceil(vidaDias)
    }
    try {
      setFerrStatusEditSaving(true)
      await supabaseService.update('ferramentas_cfg', {
        id,
        vida_util_dias: vidaDias,
        ultima_troca: ferrStatusEditForm.ultima_troca || null,
        responsavel: ferrStatusEditForm.responsavel || null,
        ativo: ferrStatusEditForm.status !== 'estoque',
      })
      const nextCfg = { ...(ferrVidaCfg || {}), [ferrStatusEditForm.ferramenta]: { vida_valor: vidaValor, vida_unidade: unidade } }
      await supabaseService.salvarConfiguracao(CFG_KEY_FERR_VIDA_UTIL, nextCfg)
      setFerrVidaCfg(nextCfg)
      await Promise.all([loadFerramentasCfg(), loadFerrStatus()])
      setFerrStatusEditOpen(false)
    } catch (err) {
      console.error(err)
      setFerrStatusEditError(err?.message || 'Falha ao salvar configuração da ferramenta.')
    } finally {
      setFerrStatusEditSaving(false)
    }
  }

  // Indicadores
  const totalEmEstoque = useMemo(() => estoquePorProduto.reduce((acc, r) => acc + (r.saldo || 0), 0), [estoquePorProduto])

  const estoquePorProdutoFiltrado = useMemo(() => {
    const q = String(filtroProduto || '').trim().toLowerCase()
    const base = (Array.isArray(estoquePorProduto) ? estoquePorProduto : []).filter((r) => {
      if (!r) return false
      const produto = String(r.produto || '')
      const produtoOk = !q || produto.toLowerCase().includes(q)
      if (!produtoOk) return false
      if (somenteComSaldo && Number(r.saldo || 0) <= 0) return false
      if (somenteAbaixoMin && !(Number(r.min || 0) > 0 && Number(r.saldo || 0) < Number(r.min || 0))) return false
      return true
    })

    const sorters = {
      alerta: (a, b) => {
        const aa = Number(a.min || 0) > 0 && Number(a.saldo || 0) < Number(a.min || 0) ? 1 : 0
        const bb = Number(b.min || 0) > 0 && Number(b.saldo || 0) < Number(b.min || 0) ? 1 : 0
        if (bb !== aa) return bb - aa
        return String(a.produto || '').localeCompare(String(b.produto || ''))
      },
      produto: (a, b) => String(a.produto || '').localeCompare(String(b.produto || '')),
      saldo_desc: (a, b) => Number(b.saldo || 0) - Number(a.saldo || 0)
    }
    const sorter = sorters[ordemAcabados] || sorters.alerta
    return [...base].sort(sorter)
  }, [estoquePorProduto, filtroProduto, somenteComSaldo, somenteAbaixoMin, ordemAcabados])

  const insumosFiltrados = useMemo(() => {
    const saldoMap = {}
    ;(Array.isArray(insumosSaldo) ? insumosSaldo : []).forEach((r) => {
      saldoMap[normKey(r.nome)] = Number(r.saldo || 0)
    })

    // Deduplicar catálogo por nome (evita confusão quando há mais de um registro com o mesmo nome)
    const uniq = {}
    ;(Array.isArray(insumos) ? insumos : []).forEach((i) => {
      const k = normKey(i?.nome)
      if (!k) return
      if (!uniq[k]) uniq[k] = i
      else if (!uniq[k]?.foto_url && i?.foto_url) uniq[k] = i
    })
    const insumosUniq = Object.values(uniq)

    const q = String(filtroInsumo || '').trim().toLowerCase()
    const base = insumosUniq.filter((i) => {
      if (!i) return false
      const nome = String(i.nome || '')
      const categoria = String(i.categoria || '')
      const hit = !q || nome.toLowerCase().includes(q) || categoria.toLowerCase().includes(q)
      if (!hit) return false
      const saldo = saldoMap[normKey(i.nome)] || 0
      const abaixoMin = Number(saldo) < Number(i.qtd_minima || 0)
      if (insumosSomenteAbaixoMin && !abaixoMin) return false
      return true
    })

    return base
      .map((i) => {
        const saldo = saldoMap[normKey(i.nome)] || 0
        const abaixoMin = Number(saldo) < Number(i.qtd_minima || 0)
        return { ...i, __saldo_calc: saldo, __abaixo_min: abaixoMin }
      })
      .sort((a, b) => {
        if (Number(b.__abaixo_min) !== Number(a.__abaixo_min)) return Number(b.__abaixo_min) - Number(a.__abaixo_min)
        return String(a.nome || '').localeCompare(String(b.nome || ''))
      })
  }, [insumos, insumosSaldo, filtroInsumo, insumosSomenteAbaixoMin])

  const periodoInicio = useMemo(() => diasAtras(periodo), [periodo])
  const giroPeriodo = useMemo(() => {
    // Saídas no período
    const saidas = baixasValidas.filter(b => {
      const d = parseDate(b.data_baixa || b.created_at)
      return d && d >= periodoInicio
    })
    const porProduto = {}
    saidas.forEach(b => {
      const prod = String(b.produto || '').trim()
      if (!porProduto[prod]) porProduto[prod] = 0
      porProduto[prod] += Number(b.quantidade_pc || 0)
    })
    return porProduto
  }, [baixasValidas, periodoInicio])

  const produtosMaisSaem = useMemo(() => {
    const list = Object.entries(giroPeriodo).map(([produto, qtd]) => ({ produto, qtd }))
    return list.filter(i => i.produto).sort((a, b) => b.qtd - a.qtd).slice(0, 5)
  }, [giroPeriodo])

  const qFiltroProduto = String(filtroProduto || '').trim().toLowerCase()
  const giroPeriodoFiltrado = useMemo(() => {
    if (!qFiltroProduto) return giroPeriodo
    const out = {}
    Object.entries(giroPeriodo).forEach(([prod, qtd]) => {
      if (String(prod || '').toLowerCase().includes(qFiltroProduto)) out[prod] = qtd
    })
    return out
  }, [giroPeriodo, qFiltroProduto])

  const produtosMaisSaemFiltrado = useMemo(() => {
    const list = Object.entries(giroPeriodoFiltrado).map(([produto, qtd]) => ({ produto, qtd }))
    return list.filter(i => i.produto).sort((a, b) => b.qtd - a.qtd).slice(0, 5)
  }, [giroPeriodoFiltrado])

  const produtosParados = useMemo(() => {
    // Sem saídas no período e com saldo
    const list = estoquePorProduto
      .filter(r => (r.saldo || 0) > 0 && !giroPeriodo[r.produto])
      .map(r => r.produto)
    return list
  }, [estoquePorProduto, giroPeriodo])

  const produtosParadosFiltrado = useMemo(() => {
    const base = estoquePorProdutoFiltrado
      .filter(r => (r.saldo || 0) > 0 && !giroPeriodoFiltrado[r.produto])
      .map(r => r.produto)
    return base
  }, [estoquePorProdutoFiltrado, giroPeriodoFiltrado])

  // Cards seguem sempre o conjunto filtrado da tabela (inclui busca e toggles)
  const estoqueCardsBase = estoquePorProdutoFiltrado
  const totalEmEstoqueCard = useMemo(() => estoqueCardsBase.reduce((acc, r) => acc + (Number(r.saldo || 0)), 0), [estoqueCardsBase])
  const produtosAlertaCard = useMemo(() => estoqueCardsBase.filter(r => r.min && r.saldo < r.min).length, [estoqueCardsBase])
  const produtosMaisSaemCard = produtosMaisSaemFiltrado
  const produtosParadosCard = produtosParadosFiltrado

  const ferrStatusFiltrado = useMemo(() => {
    const list = Array.isArray(ferrStatus) ? [...ferrStatus] : []
    const ativosPrimeiro = list.sort((a, b) => {
      const rank = (s) => {
        const v = String(s || '').toLowerCase()
        if (v === 'ativa') return 0
        if (v === 'atenção') return 1
        if (v === 'para trocar') return 2
        if (v === 'estoque') return 3
        if (v === 'inativa') return 4
        return 5
      }
      const cfgA = cfgByFerramenta[String(a.ferramenta || '')]
      const cfgB = cfgByFerramenta[String(b.ferramenta || '')]
      const statusA = cfgA?.ativo === false ? 'estoque' : a.status
      const statusB = cfgB?.ativo === false ? 'estoque' : b.status
      const rA = rank(statusA)
      const rB = rank(statusB)
      if (rA !== rB) return rA - rB
      return String(a.ferramenta || '').localeCompare(String(b.ferramenta || ''))
    })
    if (!ferrMostrarEstoque) {
      return ativosPrimeiro.filter((f) => {
        const cfg = cfgByFerramenta[String(f.ferramenta || '')]
        const st = cfg?.ativo === false ? 'estoque' : String(f.status || '').toLowerCase()
        return st !== 'estoque' && st !== 'inativa'
      })
    }
    return ativosPrimeiro
  }, [ferrStatus, ferrMostrarEstoque, cfgByFerramenta])

  // 2) Ferramentas e Insumos (leitura e indicadores simples, sem criar novas tabelas)
  const ferramentasStatus = useMemo(() => {
    // Heurística: status visual baseado em última troca e vida útil (dias)
    const today = new Date()
    const map = (Array.isArray(ferramentasCfg) ? ferramentasCfg : []).map(f => {
      const vidaUtilDias = Number(f.vida_util_dias || f.vida_util || 0)
      const ultimaTroca = parseDate(f.ultima_troca)
      let diasDesde = ultimaTroca ? Math.floor((today - ultimaTroca) / 86400000) : null
      const restante = vidaUtilDias && diasDesde != null ? Math.max(vidaUtilDias - diasDesde, 0) : null
      let status = 'inativa'
      if (vidaUtilDias > 0 && diasDesde != null) {
        if (restante <= 0) status = 'para trocar'
        else if (restante <= Math.ceil(vidaUtilDias * 0.2)) status = 'atenção'
        else status = 'ativa'
      }
      return { ferramenta: f.ferramenta, vidaUtilDias, ultimaTroca, restante, status, responsavel: f.responsavel || '-' }
    })
    return map
  }, [ferramentasCfg])

  // Histórico unificado (Ferramentas e Insumos)
  const historicoFerrInsum = useMemo(() => {
    const a = (Array.isArray(insumosMov) ? insumosMov : []).map((m) => ({
      data: m.created_at,
      tipo: m.tipo === 'entrada' ? 'Entrada' : 'Saída',
      item: m.nome,
      categoria: m.categoria,
      qtd: Number(m.quantidade || 0),
      unidade: m.unidade || '',
      resp: m.responsavel || '-',
      maquina: m.maquina || '',
      origem: 'insumo',
      motivo: m.motivo || ''
    }))
    const b = (Array.isArray(ferrMov) ? ferrMov : []).map((m) => ({
      data: m.created_at,
      tipo: m.tipo,
      item: m.ferramenta,
      categoria: m.categoria,
      qtd: Number(m.quantidade || 0),
      unidade: m.unidade || '',
      resp: m.responsavel || '-',
      maquina: m.maquina || '',
      origem: 'ferramenta',
      motivo: m.motivo || ''
    }))
    return [...a, ...b]
      .sort((x, y) => new Date(y.data || 0) - new Date(x.data || 0))
      .slice(0, 50)
  }, [insumosMov, ferrMov])

  const insumosIndicadores = useMemo(() => {
    // Saldo real por nome via view
    const saldoMap = {}
    ;(Array.isArray(insumosSaldo)?insumosSaldo:[]).forEach(r => { saldoMap[String(r.nome)] = Number(r.saldo||0) })
    const lista = Array.isArray(insumos) ? insumos : []
    const abaixoMin = lista.filter(i => {
      const s = saldoMap[String(i.nome)] || 0
      return Number(s) < Number(i.qtd_minima||0)
    }).length
    // Consumo médio (referência 30d)
    const consumo30 = (Array.isArray(insumosConsumo30)?insumosConsumo30:[]).reduce((acc, r)=> acc + Number(r.consumo_30d||0), 0)
    const consumoMedio = consumo30 / Math.max(1, (Array.isArray(insumosConsumo30)?insumosConsumo30.length:1))
    return { consumoMedio, abaixoMin, totalInsumos: lista.length }
  }, [insumos, insumosSaldo, insumosConsumo30])

  // UI helpers
  const chipSaldoClass = (saldo, min) => {
    if (saldo < 0) return 'bg-red-200 text-red-800'
    if (min && saldo < min) return 'bg-red-100 text-red-700'
    if (min && saldo < min * 1.3) return 'bg-yellow-100 text-yellow-800'
    return 'bg-green-100 text-green-800'
  }

  // Histórico de movimentações (unificado): Entradas (apontamentos embalagem) + Saídas (baixas)
  const historicoMov = useMemo(() => {
    const entradas = (Array.isArray(entradasEmbalagem) ? entradasEmbalagem : []).map((a) => ({
      tipo: 'Entrada',
      produto: String(a.produto || '').trim(),
      quantidade: Number(a.quantidade || 0),
      data: a.inicio || a.created_at || a.fim,
      responsavel: a.operador || '-',
      origem: 'apontamento'
    }))
    const saidas = (Array.isArray(baixasValidas) ? baixasValidas : []).map((b) => ({
      tipo: 'Saída',
      produto: String(b.produto || '').trim(),
      quantidade: Number(b.quantidade_pc || 0),
      data: b.data_baixa || b.created_at,
      responsavel: b.baixado_por || '-',
      origem: b.tipo_baixa || 'baixa'
    }))
    const todos = [...entradas, ...saidas].filter(r => r.produto)
    return todos.sort((a, b) => new Date(b.data || 0) - new Date(a.data || 0)).slice(0, 50)
  }, [entradasEmbalagem, baixasValidas])

  // Abrir/fechar modal de baixa automática
  const openBaixa = (produto = '') => { setBaixaForm({ produto, quantidade: '', motivo: 'producao' }); setErroBaixa(''); setBaixaOpen(true) }
  const closeBaixa = () => { if (!baixaSaving) setBaixaOpen(false) }

  // Confirmar baixa: valida saldo e grava em exp_estoque_baixas
  const handleConfirmBaixa = async (e) => {
    e.preventDefault()
    setErroBaixa('')
    const produto = String(baixaForm.produto || '').trim()
    const quantidade = Number(baixaForm.quantidade || 0)
    const motivo = String(baixaForm.motivo || 'producao')
    if (!produto) { setErroBaixa('Selecione o produto.'); return }
    if (!Number.isFinite(quantidade) || quantidade <= 0) { setErroBaixa('Quantidade inválida.'); return }

    const row = estoquePorProduto.find(r => r.produto === produto)
    const saldoAtual = Number(row?.saldo || 0)
    if (saldoAtual < quantidade) { setErroBaixa('Estoque insuficiente.'); return }

    // Seleciona um lote com saldo positivo (regra simples inicial)
    const chaveComSaldo = Object.values(saldoPorChave).find(s => String(s.produto || '').trim() === produto && (s.saldo || 0) > 0)
    const loteCodigo = chaveComSaldo?.lote || ''

    try {
      setBaixaSaving(true)
      await supabaseService.add('exp_estoque_baixas', {
        produto,
        lote_codigo: loteCodigo,
        tipo_baixa: motivo,
        quantidade_pc: quantidade,
        baixado_por: 'Sistema',
        baixado_em: new Date().toISOString(),
        estornado: false,
      })
      await loadBaixas()
    } catch (err) {
      console.error('Erro ao dar baixa:', err)
      setErroBaixa('Falha ao registrar baixa. Verifique conexão e permissões.')
      return
    } finally {
      setBaixaSaving(false)
    }

    setBaixaOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Estoque</h1>
        <div className="flex items-center gap-2 text-sm">
          <label className="text-gray-600">Giro nos últimos</label>
          <select className="border rounded px-2 py-1" value={periodo} onChange={(e)=>setPeriodo(e.target.value)}>
            <option value="7">7 dias</option>
            <option value="30">30 dias</option>
            <option value="90">90 dias</option>
          </select>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={()=>setTab('acabados')} className={`px-3 py-2 rounded ${tab==='acabados'?'bg-blue-600 text-white':'bg-gray-100 text-gray-700'}`}>
          Itens Acabados
        </button>
        <button onClick={()=>setTab('ferramentas')} className={`px-3 py-2 rounded ${tab==='ferramentas'?'bg-blue-600 text-white':'bg-gray-100 text-gray-700'}`}>
          Ferramentas e Insumos
        </button>
      </div>

      {tab==='acabados' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded shadow p-4">
              <div className="text-gray-500 text-sm">Total em Estoque (peças)</div>
              <div className="text-2xl font-bold flex items-center gap-2"><FaCubes/>{totalEmEstoqueCard.toLocaleString('pt-BR')}</div>
            </div>
            <div className="bg-white rounded shadow p-4">
              <div className="text-gray-500 text-sm">Produtos com Alerta</div>
              <div className="text-2l font-bold flex items-center gap-2"><FaExclamationTriangle className="text-yellow-600"/>{produtosAlertaCard}</div>
            </div>
            <div className="bg-white rounded shadow p-4">
              <div className="text-gray-500 text-sm">Top Saídas</div>
              <div className="text-sm text-gray-800">{produtosMaisSaemCard.map(p=>`${p.produto}: ${p.qtd}`).join(' | ') || '-'}</div>
            </div>
            <div className="bg-white rounded shadow p-4">
              <div className="text-gray-500 text-sm">Produtos Parados</div>
              <div className="text-sm text-gray-800">{produtosParadosCard.slice(0,5).join(' | ') || '-'}</div>
            </div>
          </div>

          <div className="bg-white rounded shadow">
            <div className="px-4 py-2 border-b flex items-center justify-between">
              <div className="font-semibold flex items-center gap-2"><FaBoxOpen/> Itens Acabados (Embalados)</div>
              <div className="flex items-center gap-2">
                <button className="text-xs bg-gray-100 px-3 py-1 rounded" onClick={()=>setAcabadosVerSecundario(v=>!v)}>
                  {acabadosVerSecundario ? 'Ocultar secundários' : 'Ver secundários'}
                </button>
                <button className="text-xs bg-gray-100 px-3 py-1 rounded inline-flex items-center gap-2" onClick={()=>openBaixa()}> <FaArrowDown/> Dar Baixa</button>
              </div>
            </div>
            <div className="p-4 border-b bg-white">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs text-gray-600">Buscar produto</label>
                  <input className="w-full border rounded px-2 py-1" value={filtroProduto} onChange={(e)=>setFiltroProduto(e.target.value)} placeholder="Ex: TP8329..." />
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Ordenar</label>
                  <select className="w-full border rounded px-2 py-1" value={ordemAcabados} onChange={(e)=>setOrdemAcabados(e.target.value)}>
                    <option value="alerta">Alertas primeiro</option>
                    <option value="saldo_desc">Maior saldo</option>
                    <option value="produto">Produto (A-Z)</option>
                  </select>
                </div>
                <div className="flex items-end gap-3">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" className="h-4 w-4" checked={somenteComSaldo} onChange={(e)=>setSomenteComSaldo(e.target.checked)} />
                    Somente com saldo
                  </label>
                </div>
              </div>

              <div className="pt-3">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" className="h-4 w-4" checked={somenteAbaixoMin} onChange={(e)=>setSomenteAbaixoMin(e.target.checked)} />
                  Somente abaixo do mínimo
                </label>
              </div>
            </div>

            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2">Produto</th>
                    <th className="text-left px-4 py-2">Saldo</th>
                    <th className="text-left px-4 py-2">Mínimo</th>
                    <th className="text-left px-4 py-2">Status</th>
                    <th className="text-left px-4 py-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {estoquePorProdutoFiltrado.map((r)=>{
                    const statusClass = chipSaldoClass(r.saldo, r.min)
                    const emEdicao = minEditProduto && minEditProduto === r.produto
                    return (
                      <tr key={r.produto} className="border-t">
                        <td className="px-4 py-2 font-medium">{r.produto || '-'}</td>
                        <td className="px-4 py-2">{Number(r.saldo||0).toLocaleString('pt-BR')}</td>
                        <td className="px-4 py-2">
                          {!emEdicao ? (
                            <div className="flex items-center justify-between gap-2">
                              <div>{Number(r.min||0).toLocaleString('pt-BR')}</div>
                              <button
                                type="button"
                                className="text-xs bg-gray-100 px-2 py-1 rounded"
                                onClick={() => {
                                  setMinEditProduto(r.produto)
                                  setMinEditValor(String(Number(r.min || 0)))
                                }}
                              >
                                Definir
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                className="w-24 border rounded px-2 py-1"
                                value={minEditValor}
                                onChange={(e)=>setMinEditValor(e.target.value)}
                              />
                              <button
                                type="button"
                                className="text-xs bg-blue-600 text-white px-2 py-1 rounded"
                                disabled={minAcabadosSaving}
                                onClick={async () => {
                                  try {
                                    setMinAcabadosSaving(true)
                                    const v = Number(minEditValor || 0)
                                    if (!Number.isFinite(v) || v < 0) return
                                    const next = { ...(minAcabadosMap || {}), [r.produto]: v }
                                    await supabaseService.salvarConfiguracao(CFG_KEY_MINIMO_ACABADOS, next)
                                    setMinAcabadosMap(next)
                                    setMinEditProduto('')
                                    setMinEditValor('')
                                  } catch (e) {
                                    console.error(e)
                                  } finally {
                                    setMinAcabadosSaving(false)
                                  }
                                }}
                              >
                                Salvar
                              </button>
                              <button
                                type="button"
                                className="text-xs bg-gray-100 px-2 py-1 rounded"
                                disabled={minAcabadosSaving}
                                onClick={() => { setMinEditProduto(''); setMinEditValor('') }}
                              >
                                Cancelar
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2"><span className={`px-2 py-1 rounded ${statusClass}`}>{r.saldo < 0 ? 'Saldo negativo' : (r.min && r.saldo < r.min ? 'Abaixo do mínimo' : 'OK')}</span></td>
                        <td className="px-4 py-2"><button className="text-xs bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded" onClick={()=>openBaixa(r.produto)}>Baixa</button></td>
                      </tr>
                    )
                  })}
                  {estoquePorProdutoFiltrado.length === 0 && (
                    <tr className="border-t"><td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">Nenhum item encontrado com os filtros atuais.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {acabadosVerSecundario && (
            <>
              <div className="bg-white rounded shadow">
                <div className="px-4 py-2 border-b font-semibold flex items-center gap-2"><FaChartPie/> Giro de Estoque no período</div>
                <div className="p-4 text-sm text-gray-800">
                  {produtosMaisSaem.length === 0 ? 'Sem saídas no período.' : produtosMaisSaem.map(p => (
                    <div key={p.produto} className="flex items-center justify-between border-b last:border-0 py-1">
                      <div>{p.produto}</div>
                      <div className="font-semibold">{Number(p.qtd).toLocaleString('pt-BR')}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded shadow">
                <div className="px-4 py-2 border-b font-semibold flex items-center gap-2"><FaHistory/> Histórico de Movimentações</div>
                <div className="overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-2">Data</th>
                        <th className="text-left px-4 py-2">Tipo</th>
                        <th className="text-left px-4 py-2">Produto</th>
                        <th className="text-left px-4 py-2">Quantidade</th>
                        <th className="text-left px-4 py-2">Responsável</th>
                        <th className="text-left px-4 py-2">Origem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historicoMov.map((m, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="px-4 py-2">{m.data ? new Date(m.data).toLocaleString('pt-BR') : '-'}</td>
                          <td className="px-4 py-2">{m.tipo}</td>
                          <td className="px-4 py-2">{m.produto}</td>
                          <td className="px-4 py-2">{Number(m.quantidade||0).toLocaleString('pt-BR')}</td>
                          <td className="px-4 py-2">{m.responsavel}</td>
                          <td className="px-4 py-2">{m.origem}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {categoriasOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg w-full max-w-2xl">
            <div className="px-4 py-2 border-b font-semibold flex items-center justify-between">
              <div>Gerenciar categorias</div>
              <button type="button" className="text-sm text-gray-600" onClick={()=>{ if (!categoriasSaving) setCategoriasOpen(false) }}>Fechar</button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-gray-700">Categorias (Insumos)</div>
                  <div className="text-xs text-gray-500">1 por linha</div>
                  <textarea className="w-full border rounded px-2 py-2 h-48" value={categoriasInsumosText} onChange={(e)=>setCategoriasInsumosText(e.target.value)} />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700">Categorias (Ferramentas)</div>
                  <div className="text-xs text-gray-500">1 por linha</div>
                  <textarea className="w-full border rounded px-2 py-2 h-48" value={categoriasFerramentasText} onChange={(e)=>setCategoriasFerramentasText(e.target.value)} />
                </div>
              </div>

              {categoriasError && <div className="text-sm text-red-600">{categoriasError}</div>}

              <div className="flex items-center justify-end gap-2">
                <button type="button" className="px-3 py-1 rounded bg-gray-100" onClick={()=>{ if (!categoriasSaving) setCategoriasOpen(false) }} disabled={categoriasSaving}>Cancelar</button>
                <button type="button" className="px-3 py-1 rounded bg-blue-600 text-white" disabled={categoriasSaving} onClick={async ()=>{
                  try {
                    setCategoriasSaving(true)
                    setCategoriasError('')

                    const parse = (txt) => {
                      return String(txt || '')
                        .split('\n')
                        .map((s)=>s.trim())
                        .filter(Boolean)
                    }

                    const a = parse(categoriasInsumosText)
                    const b = parse(categoriasFerramentasText)
                    await supabaseService.salvarConfiguracao(CFG_KEY_CATEGORIAS_INSUMOS, a)
                    await supabaseService.salvarConfiguracao(CFG_KEY_CATEGORIAS_FERRAMENTAS, b)
                    setCategoriasInsumos(a.length ? a : CATEGORIAS_USINAGEM)
                    setCategoriasFerramentas(b.length ? b : CATEGORIAS_FERRAMENTAS)
                    setCategoriasOpen(false)
                  } catch (e) {
                    console.error(e)
                    setCategoriasError('Falha ao salvar categorias. Verifique conexão/permissões.')
                  } finally {
                    setCategoriasSaving(false)
                  }
                }}>{categoriasSaving ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

    {/* Modal Entrada de Insumo */}
    {insumoEntradaOpen && (
      <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
        <div className="bg-white rounded shadow-lg w-full max-w-md">
          <div className="px-4 py-2 border-b font-semibold">Entrada (Insumo)</div>
          <form className="p-4 space-y-3" onSubmit={async (e)=>{
            e.preventDefault(); setErroInsumo('')
            if (insumoSaving) return
            const nome = String(insumoEntradaForm.nome||'').trim(); const quantidade = Number(insumoEntradaForm.quantidade||0)
            if (!nome) { setErroInsumo('Informe o nome do insumo.'); return }
            if (!String(insumoEntradaForm.categoria || '').trim()) { setErroInsumo('Selecione a categoria.'); return }
            if (!Number.isFinite(quantidade) || quantidade<=0) { setErroInsumo('Quantidade inválida.'); return }
            try {
              setInsumoSaving(true)

              let fotoUrl = null
              if (insumoFotoFile) {
                const extRaw = String(insumoFotoFile.name || '').split('.').pop()
                const ext = (extRaw || 'jpg').toLowerCase()
                const safeNome = nome.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80) || 'insumo'
                const path = `insumos/${safeNome}-${Date.now()}.${ext}`
                fotoUrl = await supabaseService.uploadImagemEstoque({ bucket: 'estoque-itens', file: insumoFotoFile, path })
              }

              // garantir o item no catálogo (vincular a foto ao item)
              // buscar no banco para evitar duplicidade quando a lista local estiver desatualizada
              const nomeKey = normKey(nome)
              const existingDb = await supabaseService.getByIndex('exp_insumos', 'nome', nome)
              const existing = (Array.isArray(existingDb) && existingDb.length > 0)
                ? existingDb[0]
                : (Array.isArray(insumos) ? insumos : []).find((x) => normKey(x?.nome) === nomeKey)
              if (existing?.id) {
                if (fotoUrl) {
                  await supabaseService.update('exp_insumos', {
                    id: existing.id,
                    foto_url: fotoUrl,
                    atualizado_em: new Date().toISOString()
                  })
                }
              } else {
                await supabaseService.add('exp_insumos', {
                  nome,
                  categoria: insumoEntradaForm.categoria || null,
                  qtd_minima: 0,
                  unidade: insumoEntradaForm.unidade || null,
                  foto_url: fotoUrl,
                  criado_em: new Date().toISOString(),
                  atualizado_em: new Date().toISOString()
                })
              }

              await supabaseService.add('exp_insumos_mov', {
                tipo: 'entrada',
                nome,
                categoria: insumoEntradaForm.categoria || null,
                quantidade,
                unidade: insumoEntradaForm.unidade || null,
                responsavel: insumoEntradaForm.responsavel || null,
                observacao: insumoEntradaForm.observacao || null
              })

              await Promise.all([
                loadInsumos(),
                loadInsumosSaldo(),
                loadInsumosMov()
              ])

              setInsumoFotoFile(null)
              setInsumoEntradaOpen(false)
            } catch(err){
              console.error(err)
              setErroInsumo('Falha ao registrar entrada.')
            } finally {
              setInsumoSaving(false)
            }
          }}>
            <datalist id="cat-usinagem">
              {categoriasInsumos.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <datalist id="unidades-padrao">
              {UNIDADES_PADRAO.map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
            <div>
              <label className="block text-sm text-gray-600">Nome</label>
              <input className="w-full border rounded px-2 py-1" value={insumoEntradaForm.nome} onChange={(e)=>setInsumoEntradaForm(f=>({...f, nome:e.target.value}))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm text-gray-600">Categoria</label>
                <select className="w-full border rounded px-2 py-1" value={insumoEntradaForm.categoria} onChange={(e)=>setInsumoEntradaForm(f=>({...f, categoria:e.target.value}))}>
                  <option value="">Selecione...</option>
                  {(categoriasInsumos || []).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600">Unidade</label>
                <input className="w-full border rounded px-2 py-1" list="unidades-padrao" value={insumoEntradaForm.unidade} onChange={(e)=>setInsumoEntradaForm(f=>({...f, unidade:e.target.value}))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm text-gray-600">Quantidade</label>
                <input type="number" min="0" className="w-full border rounded px-2 py-1" value={insumoEntradaForm.quantidade} onChange={(e)=>setInsumoEntradaForm(f=>({...f, quantidade:e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm text-gray-600">Responsável</label>
                <input className="w-full border rounded px-2 py-1" value={insumoEntradaForm.responsavel} onChange={(e)=>setInsumoEntradaForm(f=>({...f, responsavel:e.target.value}))} />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600">Observação</label>
              <input className="w-full border rounded px-2 py-1" value={insumoEntradaForm.observacao} onChange={(e)=>setInsumoEntradaForm(f=>({...f, observacao:e.target.value}))} />
            </div>

            <div>
              <label className="block text-sm text-gray-600">Foto do item (opcional)</label>
              <input
                ref={insumoFotoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files && e.target.files[0]
                  setInsumoFotoFile(file || null)
                }}
              />

              <div
                className={`mt-2 rounded border-2 border-dashed px-3 py-3 cursor-pointer select-none ${insumoFotoFile ? 'border-green-300 bg-green-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}
                onClick={() => insumoFotoInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  const file = e.dataTransfer?.files && e.dataTransfer.files[0]
                  if (file) setInsumoFotoFile(file)
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded bg-white border flex items-center justify-center">
                    <FaPlusCircle className="text-gray-500" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">
                      {insumoFotoFile ? 'Foto selecionada' : 'Adicionar foto'}
                    </div>
                    <div className="text-xs text-gray-600">
                      {insumoFotoFile ? (insumoFotoFile.name || 'arquivo') : 'Clique para escolher ou arraste a imagem aqui'}
                    </div>
                  </div>
                  {insumoFotoFile && (
                    <button
                      type="button"
                      className="px-2 py-1 text-xs rounded bg-white border hover:bg-gray-50"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setInsumoFotoFile(null)
                        if (insumoFotoInputRef.current) insumoFotoInputRef.current.value = ''
                      }}
                    >
                      Remover
                    </button>
                  )}
                </div>

                {insumoFotoPreview && (
                  <div className="pt-3">
                    <img src={insumoFotoPreview} alt="Preview" className="h-32 w-full object-cover rounded border bg-white" />
                  </div>
                )}
              </div>
            </div>
            {erroInsumo && <div className="text-red-600 text-sm">{erroInsumo}</div>}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button type="button" className="px-3 py-1 rounded bg-gray-100" onClick={()=>{ setInsumoEntradaOpen(false); setInsumoFotoFile(null) }} disabled={insumoSaving}>Cancelar</button>
              <button type="submit" className="px-3 py-1 rounded bg-green-600 text-white" disabled={insumoSaving}>{insumoSaving? 'Salvando...' : 'Confirmar'}</button>
            </div>
          </form>
        </div>
      </div>
    )}

    {ferrStatusEditOpen && (
      <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
        <div className="bg-white rounded shadow-lg w-full max-w-md">
          <div className="px-4 py-2 border-b font-semibold">Editar status da ferramenta</div>
          <form className="p-4 space-y-3" onSubmit={handleSaveFerrStatusEdit}>
            <div>
              <div className="text-xs text-gray-500 uppercase">Ferramenta</div>
              <div className="font-semibold text-gray-800">{ferrStatusEditForm.ferramenta || '-'}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-600">Vida útil</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    className="w-24 border rounded px-2 py-1"
                    value={ferrStatusEditForm.vida_valor}
                    onChange={(e)=>setFerrStatusEditForm(f=>({...f, vida_valor: e.target.value}))}
                  />
                  <select
                    className="border rounded px-2 py-1"
                    value={ferrStatusEditForm.vida_unidade}
                    onChange={(e)=>setFerrStatusEditForm(f=>({...f, vida_unidade: e.target.value}))}
                  >
                    <option value="dias">Dias</option>
                    <option value="horas">Horas</option>
                    <option value="semanas">Semanas</option>
                  </select>
                </div>
                <div className="text-xs text-gray-500 pt-1">Convertemos para dias para calcular “Restante”.</div>
              </div>
              <div>
                <label className="block text-sm text-gray-600">Última troca</label>
                <input
                  type="date"
                  className="w-full border rounded px-2 py-1"
                  value={ferrStatusEditForm.ultima_troca}
                  onChange={(e)=>setFerrStatusEditForm(f=>({...f, ultima_troca: e.target.value}))}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600">Responsável</label>
              <input
                className="w-full border rounded px-2 py-1"
                value={ferrStatusEditForm.responsavel}
                onChange={(e)=>setFerrStatusEditForm(f=>({...f, responsavel: e.target.value}))}
                placeholder="Ex: João, Equipe Alúnica..."
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600">Status</label>
              <select
                className="w-full border rounded px-2 py-1"
                value={ferrStatusEditForm.status}
                onChange={(e)=>setFerrStatusEditForm(f=>({...f, status: e.target.value}))}
              >
                <option value="ativa">Ativo (em uso)</option>
                <option value="estoque">Em estoque (reserva)</option>
              </select>
            </div>
            {ferrStatusEditError && <div className="text-red-600 text-sm">{ferrStatusEditError}</div>}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button type="button" className="px-3 py-1 rounded bg-gray-100" onClick={()=>{ if (!ferrStatusEditSaving) setFerrStatusEditOpen(false) }} disabled={ferrStatusEditSaving}>Cancelar</button>
              <button type="submit" className="px-3 py-1 rounded bg-blue-600 text-white" disabled={ferrStatusEditSaving}>{ferrStatusEditSaving ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* Modal Saída de Insumo */}
    {insumoSaidaOpen && (
      <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
        <div className="bg-white rounded shadow-lg w-full max-w-md">
          <div className="px-4 py-2 border-b font-semibold">Saída (Insumo)</div>
          <form className="p-4 space-y-3" onSubmit={async (e)=>{
            e.preventDefault(); setErroInsumo('')
            if (insumoSaving) return
            const nome = String(insumoSaidaForm.nome||'').trim(); const quantidade = Number(insumoSaidaForm.quantidade||0)
            if (!nome) { setErroInsumo('Selecione o insumo.'); return }
            if (!Number.isFinite(quantidade) || quantidade<=0) { setErroInsumo('Quantidade inválida.'); return }
            // valida saldo
            const saldoRow = (Array.isArray(insumosSaldo)?insumosSaldo:[]).find(r=> normKey(r.nome)===normKey(nome))
            const saldoAtual = Number(saldoRow?.saldo||0)
            if (saldoAtual < quantidade) { setErroInsumo('Estoque insuficiente.'); return }
            try {
              setInsumoSaving(true)

              await supabaseService.add('exp_insumos_mov', {
                tipo: 'saida',
                nome,
                quantidade,
                unidade: insumoSaidaForm.unidade || null,
                motivo: insumoSaidaForm.motivo || null,
                maquina: insumoSaidaForm.maquina || null,
                responsavel: insumoSaidaForm.responsavel || null,
                observacao: insumoSaidaForm.observacao || null
              })

              await Promise.all([
                loadInsumos(),
                loadInsumosSaldo(),
                loadInsumosMov()
              ])

              setInsumoSaidaOpen(false)
            } catch(err){
              console.error(err)
              const msg = err?.message || err?.error_description || 'Falha ao registrar saída.'
              setErroInsumo(String(msg))
            } finally {
              setInsumoSaving(false)
            }
          }}>
            <div>
              <label className="block text-sm text-gray-600">Insumo</label>
              <select className="w-full border rounded px-2 py-1" value={insumoSaidaForm.nome} onChange={(e)=>setInsumoSaidaForm(f=>({...f, nome:e.target.value}))}>
                <option value="">Selecione...</option>
                {(Array.isArray(insumosSaldo)?insumosSaldo:[]).map(r => (
                  <option key={r.nome} value={r.nome}>{r.nome} — saldo: {Number(r.saldo||0).toLocaleString('pt-BR')}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm text-gray-600">Quantidade</label>
                <input type="number" min="1" className="w-full border rounded px-2 py-1" value={insumoSaidaForm.quantidade} onChange={(e)=>setInsumoSaidaForm(f=>({...f, quantidade:e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm text-gray-600">Motivo</label>
                <select className="w-full border rounded px-2 py-1" value={insumoSaidaForm.motivo} onChange={(e)=>setInsumoSaidaForm(f=>({...f, motivo:e.target.value}))}>
                  <option value="consumo">Consumo</option>
                  <option value="perda">Perda/Avaria</option>
                  <option value="manutencao">Manutenção</option>
                  <option value="transferencia">Transferência</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm text-gray-600">Unidade</label>
                <input className="w-full border rounded px-2 py-1" list="unidades-padrao" value={insumoSaidaForm.unidade} onChange={(e)=>setInsumoSaidaForm(f=>({...f, unidade:e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm text-gray-600">Máquina/Setor</label>
                <select className="w-full border rounded px-2 py-1" value={insumoSaidaForm.maquina} onChange={(e)=>setInsumoSaidaForm(f=>({...f, maquina:e.target.value}))}>
                  <option value="">Selecione...</option>
                  {(Array.isArray(maquinasCat) ? maquinasCat : [])
                    .filter((m)=> m && String(m.status || '').toLowerCase() !== 'inativa')
                    .map((m) => ({
                      key: String(m.id || ''),
                      label: String(m.nome || m.codigo || '').trim()
                    }))
                    .filter((x) => x.label)
                    .sort((a,b)=> a.label.localeCompare(b.label))
                    .map((m) => (
                      <option key={m.key} value={m.label}>{m.label}</option>
                    ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm text-gray-600">Responsável</label>
                <input className="w-full border rounded px-2 py-1" value={insumoSaidaForm.responsavel} onChange={(e)=>setInsumoSaidaForm(f=>({...f, responsavel:e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm text-gray-600">Observação</label>
                <input className="w-full border rounded px-2 py-1" value={insumoSaidaForm.observacao} onChange={(e)=>setInsumoSaidaForm(f=>({...f, observacao:e.target.value}))} />
              </div>
            </div>
            {erroInsumo && <div className="text-red-600 text-sm">{erroInsumo}</div>}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button type="button" className="px-3 py-1 rounded bg-gray-100" onClick={()=>setInsumoSaidaOpen(false)} disabled={insumoSaving}>Cancelar</button>
              <button type="submit" className="px-3 py-1 rounded bg-blue-600 text-white" disabled={insumoSaving}>{insumoSaving? 'Salvando...' : 'Confirmar Saída'}</button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* Modal Movimentação de Ferramenta */}
    {ferrMovOpen && (
      <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
        <div className="bg-white rounded shadow-lg w-full max-w-md">
          <div className="px-4 py-2 border-b font-semibold">Movimentação (Ferramenta)</div>
          <form className="p-4 space-y-3" onSubmit={async (e)=>{
            e.preventDefault(); setErroFerr('')
            const ferramenta = String(ferrForm.ferramenta||'').trim(); const quantidade = Number(ferrForm.quantidade||0)
            if (!ferramenta) { setErroFerr('Informe a ferramenta.'); return }
            if (!String(ferrForm.categoria || '').trim()) { setErroFerr('Selecione a categoria.'); return }
            if (!Number.isFinite(quantidade) || quantidade<=0) { setErroFerr('Quantidade inválida.'); return }
            try { setFerrSaving(true); await supabaseService.add('exp_ferramentas_mov', { ferramenta, categoria: ferrForm.categoria||null, tipo: ferrForm.tipo||'troca', quantidade, unidade: ferrForm.unidade||null, motivo: ferrForm.motivo||null, maquina: ferrForm.maquina||null, responsavel: ferrForm.responsavel||null, observacao: ferrForm.observacao||null }); setFerrMovOpen(false) } catch(err){ console.error(err); setErroFerr('Falha ao registrar movimentação.') } finally { setFerrSaving(false) }
          }}>
            <datalist id="cat-ferramentas">
              {categoriasFerramentas.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <div>
              <label className="block text-sm text-gray-600">Ferramenta</label>
              <select className="w-full border rounded px-2 py-1" value={ferrForm.ferramenta} onChange={(e)=>setFerrForm(f=>({...f, ferramenta:e.target.value}))}>
                <option value="">Selecione...</option>
                {(Array.isArray(ferramentasCfg) ? ferramentasCfg : [])
                  .map((f) => String(f.ferramenta || f.codigo || '').trim())
                  .filter(Boolean)
                  .sort((a,b)=>a.localeCompare(b))
                  .map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm text-gray-600">Categoria</label>
                <select className="w-full border rounded px-2 py-1" value={ferrForm.categoria} onChange={(e)=>setFerrForm(f=>({...f, categoria:e.target.value}))}>
                  <option value="">Selecione...</option>
                  {(categoriasFerramentas || []).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600">Unidade</label>
                <input className="w-full border rounded px-2 py-1" list="unidades-padrao" value={ferrForm.unidade} onChange={(e)=>setFerrForm(f=>({...f, unidade:e.target.value}))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm text-gray-600">Tipo</label>
                <select className="w-full border rounded px-2 py-1" value={ferrForm.tipo} onChange={(e)=>setFerrForm(f=>({...f, tipo:e.target.value}))}>
                  <option value="troca">Troca</option>
                  <option value="consumo">Consumo</option>
                  <option value="entrada">Entrada</option>
                  <option value="ajuste">Ajuste</option>
                  <option value="perda">Perda</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600">Quantidade</label>
                <input type="number" min="0" className="w-full border rounded px-2 py-1" value={ferrForm.quantidade} onChange={(e)=>setFerrForm(f=>({...f, quantidade:e.target.value}))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm text-gray-600">Máquina</label>
                <select className="w-full border rounded px-2 py-1" value={ferrForm.maquina} onChange={(e)=>setFerrForm(f=>({...f, maquina:e.target.value}))}>
                  <option value="">Selecione...</option>
                  {(Array.isArray(maquinasCat) ? maquinasCat : [])
                    .filter((m)=> m && String(m.status || '').toLowerCase() !== 'inativa')
                    .map((m) => ({
                      key: String(m.id || ''),
                      label: String(m.nome || m.codigo || '').trim()
                    }))
                    .filter((x) => x.label)
                    .sort((a,b)=> a.label.localeCompare(b.label))
                    .map((m) => (
                      <option key={m.key} value={m.label}>{m.label}</option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600">Responsável</label>
                <input className="w-full border rounded px-2 py-1" value={ferrForm.responsavel} onChange={(e)=>setFerrForm(f=>({...f, responsavel:e.target.value}))} />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600">Observação</label>
              <input className="w-full border rounded px-2 py-1" value={ferrForm.observacao} onChange={(e)=>setFerrForm(f=>({...f, observacao:e.target.value}))} />
            </div>
            {erroFerr && <div className="text-red-600 text-sm">{erroFerr}</div>}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button type="button" className="px-3 py-1 rounded bg-gray-100" onClick={()=>setFerrMovOpen(false)} disabled={ferrSaving}>Cancelar</button>
              <button type="submit" className="px-3 py-1 rounded bg-indigo-600 text-white" disabled={ferrSaving}>{ferrSaving? 'Salvando...' : 'Confirmar'}</button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* Modal Cadastro de Ferramenta */}
    {cadFerrOpen && (
      <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
        <div className="bg-white rounded shadow-lg w-full max-w-md">
          <div className="px-4 py-2 border-b font-semibold">Cadastrar Ferramenta</div>
          <form className="p-4 space-y-3" onSubmit={async (e)=>{
            e.preventDefault()
            if (cadFerrSaving) return
            setCadFerrError('')

            const ferramenta = String(cadFerrForm.ferramenta || '').trim()
            if (!ferramenta) { setCadFerrError('Informe o código/nome da ferramenta.'); return }

            try {
              setCadFerrSaving(true)

              const exists = (Array.isArray(ferramentasCfg) ? ferramentasCfg : []).some((f) => String(f?.ferramenta || f?.codigo || '').trim() === ferramenta)
              if (!exists) {
                await supabaseService.add('ferramentas_cfg', {
                  ferramenta,
                  codigo: ferramenta,
                  descricao: cadFerrForm.descricao || null,
                  ativo: cadFerrForm.ativo !== false
                })
              }

              await loadFerramentasCfg()
              setCadFerrOpen(false)
            } catch (err) {
              console.error(err)
              setCadFerrError(err?.message || 'Falha ao cadastrar ferramenta.')
            } finally {
              setCadFerrSaving(false)
            }
          }}>
            <div>
              <label className="block text-sm text-gray-600">Ferramenta (código/nome)</label>
              <input className="w-full border rounded px-2 py-1" value={cadFerrForm.ferramenta} onChange={(e)=>setCadFerrForm(f=>({...f, ferramenta: e.target.value}))} placeholder="Ex: TR-0018" />
            </div>
            <div>
              <label className="block text-sm text-gray-600">Descrição (opcional)</label>
              <input className="w-full border rounded px-2 py-1" value={cadFerrForm.descricao} onChange={(e)=>setCadFerrForm(f=>({...f, descricao: e.target.value}))} />
            </div>
            <div>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" className="h-4 w-4" checked={cadFerrForm.ativo !== false} onChange={(e)=>setCadFerrForm(f=>({...f, ativo: e.target.checked}))} />
                Ativo
              </label>
            </div>
            {cadFerrError && <div className="text-red-600 text-sm">{cadFerrError}</div>}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button type="button" className="px-3 py-1 rounded bg-gray-100" onClick={()=>{ if (!cadFerrSaving) setCadFerrOpen(false) }} disabled={cadFerrSaving}>Cancelar</button>
              <button type="submit" className="px-3 py-1 rounded bg-gray-700 text-white" disabled={cadFerrSaving}>{cadFerrSaving? 'Salvando...' : 'Salvar'}</button>
            </div>
          </form>
        </div>
      </div>
    )}

      {tab==='ferramentas' && (
        <div className="space-y-6">
          <div className="flex gap-2">
            <button className="px-3 py-2 rounded bg-green-600 text-white text-sm" onClick={()=>{ setInsumoEntradaOpen(true); setErroInsumo('') }}>Entrada (Insumo)</button>
            <button className="px-3 py-2 rounded bg-blue-600 text-white text-sm" onClick={()=>{ setInsumoSaidaOpen(true); setErroInsumo('') }}>Saída (Insumo)</button>
            <button className="px-3 py-2 rounded bg-indigo-600 text-white text-sm" onClick={()=>{ setFerrMovOpen(true); setErroFerr('') }}>Movimentar Ferramenta</button>
            <button className="px-3 py-2 rounded bg-gray-700 text-white text-sm" onClick={()=>{ setCadFerrOpen(true); setCadFerrError(''); setCadFerrForm({ ferramenta: '', descricao: '', ativo: true }) }}>Cadastrar Ferramenta</button>
            <button
              className="px-3 py-2 rounded bg-gray-100 text-gray-700 text-sm"
              onClick={()=>{
                setCategoriasError('')
                setCategoriasInsumosText((categoriasInsumos || []).join('\n'))
                setCategoriasFerramentasText((categoriasFerramentas || []).join('\n'))
                setCategoriasOpen(true)
              }}
            >
              Gerenciar categorias
            </button>
            <button className="px-3 py-2 rounded bg-gray-100 text-gray-700 text-sm" onClick={()=>setInsumosVerSecundario(v=>!v)}>
              {insumosVerSecundario ? 'Ocultar Histórico (Ferramentas e Insumos)' : 'Ver Histórico (Ferramentas e Insumos)'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded shadow p-4">
              <div className="text-gray-500 text-sm">Insumos abaixo do mínimo</div>
              <div className="text-2xl font-bold flex items-center gap-2"><FaExclamationTriangle className="text-red-600"/> {insumosIndicadores.abaixoMin}</div>
            </div>
            <div className="bg-white rounded shadow p-4">
              <div className="text-gray-500 text-sm">Consumo médio (ref.)</div>
              <div className="text-2xl font-bold flex items-center gap-2"><FaArrowDown/> {Number(insumosIndicadores.consumoMedio||0).toLocaleString('pt-BR')}</div>
            </div>
            <div className="bg-white rounded shadow p-4">
              <div className="text-gray-500 text-sm">Ferramentas monitoradas</div>
              <div className="text-2xl font-bold flex items-center gap-2"><FaTools/> {(Array.isArray(ferramentasCfg)?ferramentasCfg:[]).length}</div>
            </div>
          </div>

          <div className="bg-white rounded shadow overflow-hidden">
            <div className="px-4 py-2 border-b font-semibold flex items-center justify-between">
              <div>Status de Ferramentas</div>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={ferrMostrarEstoque}
                  onChange={(e)=>setFerrMostrarEstoque(e.target.checked)}
                />
                Mostrar também estoque (inativas)
              </label>
            </div>
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2">Ferramenta</th>
                    <th className="text-left px-4 py-2">Vida útil</th>
                    <th className="text-left px-4 py-2">Última troca</th>
                    <th className="text-left px-4 py-2">Restante</th>
                    <th className="text-left px-4 py-2">Status</th>
                    <th className="text-left px-4 py-2">Responsável</th>
                    <th className="text-left px-4 py-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(ferrStatusFiltrado)?ferrStatusFiltrado:[]).map((f) => {
                    const cls = f.status === 'para trocar' ? 'bg-red-100 text-red-700' : f.status === 'atenção' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                    const vidaCfg = ferrVidaCfg?.[f.ferramenta]
                    const vidaLabel = (() => {
                      if (vidaCfg && vidaCfg.vida_valor != null && vidaCfg.vida_unidade) {
                        return `${vidaCfg.vida_valor} ${vidaCfg.vida_unidade}`
                      }
                      if (f.vida_util_dias != null) return `${f.vida_util_dias} dias`
                      return '-'
                    })()
                    const restanteLabel = (() => {
                      if (f.restante_dias == null) return '-'
                      const dias = Number(f.restante_dias || 0)
                      if (vidaCfg && vidaCfg.vida_unidade === 'horas') return `${Math.max(0, Math.round(dias * 24))} horas`
                      if (vidaCfg && vidaCfg.vida_unidade === 'semanas') return `${Math.max(0, Math.round(dias / 7))} semanas`
                      return `${Math.max(0, Math.round(dias))}d`
                    })()
                    const cfg = cfgByFerramenta[String(f.ferramenta || '')]
                    const statusLabel = cfg?.ativo === false ? 'estoque' : f.status
                    return (
                      <tr key={f.ferramenta} className="border-t">
                        <td className="px-4 py-2 font-medium">{f.ferramenta}</td>
                        <td className="px-4 py-2">{vidaLabel}</td>
                        <td className="px-4 py-2">{f.ultima_troca ? new Date(f.ultima_troca).toLocaleDateString('pt-BR') : '-'}</td>
                        <td className="px-4 py-2">{restanteLabel}</td>
                        <td className="px-4 py-2"><span className={`px-2 py-1 rounded ${cls}`}>{statusLabel}</span></td>
                        <td className="px-4 py-2">{f.responsavel || '-'}</td>
                        <td className="px-4 py-2">
                          <button
                            type="button"
                            className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
                            onClick={() => handleOpenFerrStatusEdit(f)}
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded shadow overflow-hidden">
            <div className="px-4 py-2 border-b font-semibold flex items-center gap-2">Insumos</div>
            <div className="p-4 border-b bg-white">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs text-gray-600">Buscar (nome ou categoria)</label>
                  <input className="w-full border rounded px-2 py-1" value={filtroInsumo} onChange={(e)=>setFiltroInsumo(e.target.value)} placeholder="Ex: óleo, broca, lubrificante..." />
                </div>
                <div className="flex items-end">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" className="h-4 w-4" checked={insumosSomenteAbaixoMin} onChange={(e)=>setInsumosSomenteAbaixoMin(e.target.checked)} />
                    Somente abaixo do mínimo
                  </label>
                </div>
              </div>
            </div>
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2">Nome</th>
                    <th className="text-left px-4 py-2">Categoria</th>
                    <th className="text-left px-4 py-2">Qtd. Atual</th>
                    <th className="text-left px-4 py-2">Mínimo</th>
                    <th className="text-left px-4 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {insumosFiltrados.map((i) => {
                    const saldo = Number(i.__saldo_calc || 0)
                    const alerta = !!i.__abaixo_min
                    const cls = alerta ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-800'
                    const emEdicao = minInsumoEditId && minInsumoEditId === String(i.id || '')
                    return (
                      <tr key={i.id || i.nome} className="border-t">
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            {i.foto_url ? (
                              <a href={i.foto_url} target="_blank" rel="noreferrer" title="Abrir foto">
                                <img src={i.foto_url} alt={i.nome} className="h-8 w-8 object-cover rounded border" />
                              </a>
                            ) : (
                              <div className="h-8 w-8 rounded border bg-gray-50" />
                            )}
                            <div>{i.nome}</div>
                          </div>
                        </td>
                        <td className="px-4 py-2">{i.categoria}</td>
                        <td className="px-4 py-2">{Number(saldo).toLocaleString('pt-BR')} {i.unidade||''}</td>
                        <td className="px-4 py-2">
                          {!emEdicao ? (
                            <div className="flex items-center justify-between gap-2">
                              <div>{Number(i.qtd_minima||0).toLocaleString('pt-BR')} {i.unidade||''}</div>
                              <button
                                type="button"
                                className="text-xs bg-gray-100 px-2 py-1 rounded"
                                onClick={() => {
                                  setMinInsumoEditId(String(i.id || ''))
                                  setMinInsumoEditValor(String(Number(i.qtd_minima || 0)))
                                }}
                              >
                                Definir
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                className="w-24 border rounded px-2 py-1"
                                value={minInsumoEditValor}
                                onChange={(e)=>setMinInsumoEditValor(e.target.value)}
                              />
                              <button
                                type="button"
                                className="text-xs bg-blue-600 text-white px-2 py-1 rounded"
                                disabled={minInsumoSavingId === String(i.id || '')}
                                onClick={async () => {
                                  try {
                                    setMinInsumoSavingId(String(i.id || ''))
                                    const v = Number(minInsumoEditValor || 0)
                                    if (!Number.isFinite(v) || v < 0) return
                                    await supabaseService.update('exp_insumos', { id: i.id, qtd_minima: v, atualizado_em: new Date().toISOString() })
                                    await loadInsumos()
                                    setMinInsumoEditId('')
                                    setMinInsumoEditValor('')
                                  } catch (e) {
                                    console.error(e)
                                  } finally {
                                    setMinInsumoSavingId('')
                                  }
                                }}
                              >
                                Salvar
                              </button>
                              <button
                                type="button"
                                className="text-xs bg-gray-100 px-2 py-1 rounded"
                                disabled={minInsumoSavingId === String(i.id || '')}
                                onClick={() => { setMinInsumoEditId(''); setMinInsumoEditValor('') }}
                              >
                                Cancelar
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2"><span className={`px-2 py-1 rounded ${cls}`}>{alerta?'Abaixo do mínimo':'OK'}</span></td>
                      </tr>
                    )
                  })}
                  {insumosFiltrados.length === 0 && (
                    <tr className="border-t"><td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">Nenhum insumo encontrado com os filtros atuais.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {insumosVerSecundario && (
            <div className="bg-white rounded shadow overflow-hidden">
              <div className="px-4 py-2 border-b font-semibold">Histórico (Ferramentas e Insumos)</div>
              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-2">Data</th>
                      <th className="text-left px-4 py-2">Tipo</th>
                      <th className="text-left px-4 py-2">Item</th>
                      <th className="text-left px-4 py-2">Categoria</th>
                      <th className="text-left px-4 py-2">Qtd</th>
                      <th className="text-left px-4 py-2">Resp.</th>
                      <th className="text-left px-4 py-2">Máquina</th>
                      <th className="text-left px-4 py-2">Origem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historicoFerrInsum.map((h, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="px-4 py-2">{h.data ? new Date(h.data).toLocaleString('pt-BR') : '-'}</td>
                        <td className="px-4 py-2">{h.tipo}</td>
                        <td className="px-4 py-2">{h.item}</td>
                        <td className="px-4 py-2">{h.categoria || '-'}</td>
                        <td className="px-4 py-2">{Number(h.qtd||0).toLocaleString('pt-BR')} {h.unidade||''}</td>
                        <td className="px-4 py-2">{h.resp}</td>
                        <td className="px-4 py-2">{h.maquina || '-'}</td>
                        <td className="px-4 py-2">{h.origem}</td>
                      </tr>
                    ))}
                    {historicoFerrInsum.length === 0 && (
                      <tr className="border-t"><td colSpan={8} className="px-4 py-6 text-center text-sm text-gray-500">Sem movimentações recentes.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
      {baixaOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg w-full max-w-md">
            <div className="px-4 py-2 border-b font-semibold">Dar Baixa Automática</div>
            <form onSubmit={handleConfirmBaixa} className="p-4 space-y-3">
              <div>
                <label className="block text-sm text-gray-600">Produto</label>
                <select className="w-full border rounded px-2 py-1" value={baixaForm.produto} onChange={(e)=>setBaixaForm(f=>({...f, produto:e.target.value}))}>
                  <option value="">Selecione...</option>
                  {estoquePorProduto.map(r => (
                    <option key={r.produto} value={r.produto}>{r.produto} — saldo: {Number(r.saldo||0).toLocaleString('pt-BR')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600">Quantidade a consumir</label>
                <input type="number" min="1" className="w-full border rounded px-2 py-1" value={baixaForm.quantidade} onChange={(e)=>setBaixaForm(f=>({...f, quantidade:e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm text-gray-600">Motivo</label>
                <select className="w-full border rounded px-2 py-1" value={baixaForm.motivo} onChange={(e)=>setBaixaForm(f=>({...f, motivo:e.target.value}))}>
                  <option value="producao">Produção</option>
                  <option value="manutencao">Manutenção</option>
                  <option value="perda">Perda</option>
                  <option value="ajuste">Ajuste</option>
                </select>
              </div>
              {erroBaixa && <div className="text-red-600 text-sm">{erroBaixa}</div>}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" className="px-3 py-1 rounded bg-gray-100" onClick={closeBaixa} disabled={baixaSaving}>Cancelar</button>
                <button type="submit" className="px-3 py-1 rounded bg-blue-600 text-white" disabled={baixaSaving}>{baixaSaving? 'Salvando...' : 'Confirmar Baixa'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
