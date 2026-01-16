import React, { useEffect, useMemo, useRef, useState } from 'react'
import { FaBoxOpen, FaCubes, FaExclamationTriangle, FaTools, FaArrowDown, FaClock, FaChartPie, FaPlusCircle, FaHistory, FaComments, FaImage, FaFileExcel } from 'react-icons/fa'
import useSupabase from '../hooks/useSupabase'
import supabaseService from '../services/SupabaseService'
import ImageModalViewer from '../components/ImageModalViewer'
import CorrecaoLancamentoInsumoModal from '../components/CorrecaoLancamentoInsumoModal'
import * as XLSX from 'xlsx'
import { useAuth } from '../contexts/AuthContext'
import { isVisualizador } from '../utils/auth'

export default function Estoque() {
  const { user } = useAuth()
  const somenteVisualizacao = isVisualizador(user)
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
  const { items: inventariosAcabados, loadItems: loadInventariosAcabados } = useSupabase('estoque_acabados_inventarios')
  const { items: movimentacoesDeposito, loadItems: loadMovimentacoesDeposito } = useSupabase('movimentacoes_deposito')

  // Função para obter o depósito atual de um produto
  const getDepositoAtual = (produto) => {
    const movs = (Array.isArray(movimentacoesDeposito) ? movimentacoesDeposito : [])
      .filter(m => String(m.produto || '').trim() === String(produto || '').trim())
      .sort((a, b) => new Date(b.movimentado_em || 0) - new Date(a.movimentado_em || 0))
    
    if (movs.length > 0) {
      return movs[0].deposito_destino || 'alunica'
    }
    return 'alunica'
  }

  const [tab, setTab] = useState('acabados') // acabados | ferramentas
  const [subTab, setSubTab] = useState('insumos') // insumos | ferramentas_status
  const [periodo, setPeriodo] = useState('30') // dias para giro
  const [baixaOpen, setBaixaOpen] = useState(false)
  const [baixaSaving, setBaixaSaving] = useState(false)
  const [baixaForm, setBaixaForm] = useState({ produto: '', quantidade: '', motivo: 'producao', pedido: '', numero_pedido: '', cliente: '' })
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
  const [observacoesModalOpen, setObservacoesModalOpen] = useState(false)
  const [observacoesProdutoSelecionado, setObservacoesProdutoSelecionado] = useState('')
  const [inventarioOpen, setInventarioOpen] = useState(false)
  const [inventarioSaving, setInventarioSaving] = useState(false)
  const [inventarioForm, setInventarioForm] = useState({ produto: '', saldoAtual: 0, saldoFinal: '', motivo: 'inventario', observacao: '', lote: '', numero_pedido: '' })
  const [inventarioProdutoSearch, setInventarioProdutoSearch] = useState('')
  const [inventarioProdutoShowSuggestions, setInventarioProdutoShowSuggestions] = useState(false)

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
  
  // Modal de Movimentação de Depósito (Itens Acabados)
  const [depositoMovOpen, setDepositoMovOpen] = useState(false)
  const [depositoMovSaving, setDepositoMovSaving] = useState(false)
  const [depositoMovError, setDepositoMovError] = useState('')
  const [depositoMovForm, setDepositoMovForm] = useState({ produto: '', deposito_origem: 'alunica', deposito_destino: 'tecnoperfil', motivo: '', observacao: '' })
  
  const [cadFerrForm, setCadFerrForm] = useState({
    ferramenta: '',
    numero_serial: '',
    corpo_mm: '',
    quant_pcs: '',
    vida_valor: '',
    vida_unidade: 'horas',
    ultima_troca: new Date().toISOString().split('T')[0],
    responsavel: '',
    ativo: true,
    produtos: [],
    tempo_por_peca: ''
  })

  // Modais de Imagem e Correção
  const [imageModalOpen, setImageModalOpen] = useState(false)
  const [imageModalData, setImageModalData] = useState({ url: '', name: '' })
  const [correcaoLancamentoOpen, setCorrecaoLancamentoOpen] = useState(false)

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

  // Mapa de observações por produto (todas as observações)
  const observacoesPorProduto = useMemo(() => {
    const map = {}
    ;(Array.isArray(inventariosAcabados) ? inventariosAcabados : [])
      .sort((a, b) => new Date(b?.created_at || 0) - new Date(a?.created_at || 0))
      .forEach((inv) => {
        const produto = String(inv?.produto || '').trim()
        if (!produto) return
        if (!map[produto]) map[produto] = []
        const obs = String(inv?.observacao || '').trim()
        if (obs) {
          map[produto].push({
            data: inv?.created_at,
            observacao: obs,
            motivo: inv?.motivo,
            saldo_antes: inv?.saldo_antes_pc,
            saldo_depois: inv?.saldo_depois_pc,
            delta: inv?.delta_pc
          })
        }
      })
    return map
  }, [inventariosAcabados])

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

    // Adicionar produtos que existem apenas em ajustes de inventário (sem apontamentos)
    ;(Array.isArray(inventariosAcabados) ? inventariosAcabados : []).forEach((inv) => {
      const prod = String(inv?.produto || '').trim()
      if (!prod || map[prod]) return
      map[prod] = { produto: prod, saldo: 0, min: 0 }
    })

    // Aplicar deltas de inventário
    Object.values(map).forEach((row) => {
      const delta = Number(observacoesPorProduto?.[row.produto]?.reduce((sum, obs) => sum + (Number(obs.delta) || 0), 0) || 0)
      row.saldo += delta
    })

    // Mínimo sugerido: pcs_por_pallet se existir (sem criar tabela nova)
    Object.values(map).forEach((row) => {
      const cfg = cfgByFerramenta[row.produto]
      const pcsPal = Number(cfg?.pcs_por_pallet || 0)
      const override = Number(minAcabadosMap?.[row.produto] ?? NaN)
      row.min = Number.isFinite(override) ? override : (pcsPal > 0 ? pcsPal : 0)
    })
    return Object.values(map)
  }, [saldoPorChave, cfgByFerramenta, minAcabadosMap, inventariosAcabados, observacoesPorProduto])

  // Sugestões de produtos para autocomplete no ajuste de inventário
  const inventarioProdutoSuggestions = useMemo(() => {
    const search = String(inventarioProdutoSearch || '').trim().toLowerCase()
    if (!search) return (Array.isArray(estoquePorProduto) ? estoquePorProduto : []).map(r => r.produto)
    return (Array.isArray(estoquePorProduto) ? estoquePorProduto : [])
      .map(r => r.produto)
      .filter(p => String(p || '').toLowerCase().includes(search))
      .slice(0, 10)
  }, [inventarioProdutoSearch, estoquePorProduto])

  const handleOpenFerrStatusEdit = (f) => {
    if (!f) return
    const key = String(f.ferramenta || '').trim()
    const cfg = cfgByFerramenta[key]
    const cfgVida = ferrVidaCfg?.[key]
    const unidade = cfgVida?.vida_unidade || 'horas'
    const valor = cfgVida?.vida_valor ?? (cfg?.vida_valor ?? '')
    setFerrStatusEditError('')
    setFerrStatusEditForm({
      id: cfg?.id || '',
      ferramenta: key,
      numero_serial: cfg?.numero_serial || '',
      corpo_mm: cfg?.corpo_mm || '',
      quant_pcs: cfg?.quant_pcs || '',
      vida_valor: valor === '' ? '' : String(valor),
      vida_unidade: unidade,
      ultima_troca: cfg?.ultima_troca ? new Date(cfg.ultima_troca).toISOString().slice(0, 10) : '',
      responsavel: cfg?.responsavel || '',
      ativo: cfg?.ativo !== false
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
    try {
      setFerrStatusEditSaving(true)
      await supabaseService.update('ferramentas_cfg', {
        id,
        numero_serial: ferrStatusEditForm.numero_serial || null,
        corpo_mm: ferrStatusEditForm.corpo_mm ? Number(ferrStatusEditForm.corpo_mm) : null,
        quant_pcs: ferrStatusEditForm.quant_pcs ? Number(ferrStatusEditForm.quant_pcs) : null,
        vida_valor: vidaValor,
        vida_unidade: ferrStatusEditForm.vida_unidade || 'horas',
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
    // Combinar ferramentas de ferramentas_cfg com dados de vw_ferramentas_status
    const statusMap = {}
    ;(Array.isArray(ferrStatus) ? ferrStatus : []).forEach((f) => {
      statusMap[String(f.ferramenta || '').trim()] = f
    })

    // Criar lista com todas as ferramentas cadastradas
    const allFerramentas = (Array.isArray(ferramentasCfg) ? ferramentasCfg : [])
      .map((cfg) => {
        const ferrCode = String(cfg.ferramenta || cfg.codigo || '').trim()
        const statusData = statusMap[ferrCode]
        return {
          id: cfg.id,
          ferramenta: ferrCode,
          vida_util_dias: cfg.vida_valor,
          vida_unidade: cfg.vida_unidade,
          ultima_troca: cfg.ultima_troca,
          restante_dias: statusData?.restante_dias,
          status: statusData?.status || 'ativa',
          responsavel: cfg.responsavel || statusData?.responsavel,
          ativo: cfg.ativo !== false
        }
      })
      .filter((f) => f.ferramenta)

    const ativosPrimeiro = allFerramentas.sort((a, b) => {
      const rank = (s) => {
        const v = String(s || '').toLowerCase()
        if (v === 'ativa') return 0
        if (v === 'atenção') return 1
        if (v === 'para trocar') return 2
        if (v === 'estoque') return 3
        if (v === 'inativa') return 4
        return 5
      }
      const statusA = a.ativo === false ? 'estoque' : a.status
      const statusB = b.ativo === false ? 'estoque' : b.status
      const rA = rank(statusA)
      const rB = rank(statusB)
      if (rA !== rB) return rA - rB
      return String(a.ferramenta || '').localeCompare(String(b.ferramenta || ''))
    })

    return ativosPrimeiro
  }, [ferrStatus, ferramentasCfg])

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

  // Funções de Exportação para Excel
  const exportarItensAcabadosExcel = () => {
    const dados = (Array.isArray(estoquePorProdutoFiltrado) ? estoquePorProdutoFiltrado : []).map(item => ({
      'Produto': item.produto || '-',
      'Saldo (pcs)': item.saldo || 0,
      'Mínimo': item.min || 0,
      'Status': item.saldo < item.min ? 'Abaixo do Mínimo' : 'OK'
    }))
    const ws = XLSX.utils.json_to_sheet(dados)
    ws['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 15 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Itens Acabados')
    XLSX.writeFile(wb, `Estoque_ItensAcabados_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`)
  }

  const exportarInsumosExcel = () => {
    const saldoMap = {}
    ;(Array.isArray(insumosSaldo) ? insumosSaldo : []).forEach(r => { saldoMap[String(r.nome)] = Number(r.saldo || 0) })
    const dados = (Array.isArray(insumosFiltrados) ? insumosFiltrados : []).map(item => ({
      'Insumo': item.nome || '-',
      'Categoria': item.categoria || '-',
      'Saldo': saldoMap[String(item.nome)] || 0,
      'Unidade': item.unidade || '-',
      'Mínimo': item.qtd_minima || 0,
      'Status': (saldoMap[String(item.nome)] || 0) < (item.qtd_minima || 0) ? 'Abaixo do Mínimo' : 'OK'
    }))
    const ws = XLSX.utils.json_to_sheet(dados)
    ws['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 15 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Insumos')
    XLSX.writeFile(wb, `Estoque_Insumos_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`)
  }

  const exportarFerramentasExcel = () => {
    const dados = (Array.isArray(ferrStatusFiltrado) ? ferrStatusFiltrado : []).map(f => ({
      'Ferramenta': f.ferramenta || '-',
      'Vida Útil': f.vida_util_dias ? `${f.vida_util_dias} dias` : (f.vida_unidade ? `${f.vida_valor} ${f.vida_unidade}` : '-'),
      'Última Troca': f.ultima_troca ? new Date(f.ultima_troca).toLocaleDateString('pt-BR') : '-',
      'Restante': f.restante_dias ? `${Math.max(0, Math.round(f.restante_dias))}d` : '-',
      'Status': f.status || 'ativa',
      'Responsável': f.responsavel || '-',
      'Ativo': f.ativo !== false ? 'Sim' : 'Não'
    }))
    const ws = XLSX.utils.json_to_sheet(dados)
    ws['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 10 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Ferramentas')
    XLSX.writeFile(wb, `Estoque_Ferramentas_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`)
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
  const openBaixa = (produto = '') => { setBaixaForm({ produto, quantidade: '', motivo: 'producao', pedido: '', numero_pedido: '', cliente: '' }); setErroBaixa(''); setBaixaOpen(true) }
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
                <button className="text-xs bg-green-600 text-white px-3 py-1 rounded inline-flex items-center gap-2 hover:bg-green-700 transition" onClick={exportarItensAcabadosExcel}><FaFileExcel/> Exportar Excel</button>
                <button className="text-xs bg-blue-600 text-white px-3 py-1 rounded inline-flex items-center gap-2" onClick={()=>setInventarioOpen(true)}><FaPlusCircle/> Ajustar inventário</button>
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

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2 whitespace-nowrap">Produto</th>
                    <th className="text-left px-4 py-2 whitespace-nowrap">Saldo</th>
                    <th className="text-left px-4 py-2 whitespace-nowrap">Mínimo</th>
                    <th className="text-left px-4 py-2 whitespace-nowrap">Status</th>
                    <th className="text-left px-4 py-2 whitespace-nowrap">Depósito</th>
                    <th className="text-left px-4 py-2 whitespace-nowrap">Ações</th>
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
                        <td className="px-4 py-2">
                          {(() => {
                            const deposito = getDepositoAtual(r.produto)
                            const cor = deposito === 'tecnoperfil' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                            const label = deposito === 'tecnoperfil' ? 'Tecnoperfil' : 'Alúnica'
                            return <span className={`px-2 py-1 rounded text-xs font-medium ${cor}`}>{label}</span>
                          })()}
                        </td>
                        <td className="px-4 py-2 flex items-center gap-1">
                          {(observacoesPorProduto?.[r.produto]?.length || 0) > 0 && (
                            <button
                              type="button"
                              className="text-xs bg-yellow-50 hover:bg-yellow-100 px-2 py-1 rounded inline-flex items-center gap-1"
                              onClick={() => {
                                setObservacoesProdutoSelecionado(r.produto)
                                setObservacoesModalOpen(true)
                              }}
                              title={`${observacoesPorProduto?.[r.produto]?.length || 0} observação(ões)`}
                            >
                              <FaComments className="text-sm" /> {observacoesPorProduto?.[r.produto]?.length || 0}
                            </button>
                          )}
                          <button className="text-xs bg-purple-600 text-white hover:bg-purple-700 px-2 py-1 rounded whitespace-nowrap" onClick={()=>{ setDepositoMovForm({...depositoMovForm, produto: r.produto}); setDepositoMovOpen(true); setDepositoMovError('') }}>Mover</button>
                          <button className="text-xs bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded whitespace-nowrap" onClick={()=>openBaixa(r.produto)}>Baixa</button>
                        </td>
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

      {inventarioOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="font-semibold text-gray-800">Ajustar inventário (valor final)</div>
              <button type="button" className="text-sm text-gray-500" onClick={() => setInventarioOpen(false)}>Fechar</button>
            </div>

            <form className="p-4 space-y-3" onSubmit={async (e) => {
              e.preventDefault()
              const produto = String(inventarioForm?.produto || '').trim()
              const saldoFinal = Number(String(inventarioForm?.saldoFinal || '').replace(',', '.'))
              const motivo = String(inventarioForm?.motivo || '').trim()
              
              if (!produto) { alert('Selecione o produto'); return }
              if (!Number.isFinite(saldoFinal) || saldoFinal < 0) { alert('Contagem física inválida'); return }
              
              try {
                setInventarioSaving(true)
                const saldoAntes = Number(inventarioForm?.saldoAtual || 0)
                const delta = saldoFinal - saldoAntes
                await supabaseService.add('estoque_acabados_inventarios', {
                  produto,
                  saldo_antes_pc: saldoAntes,
                  saldo_depois_pc: saldoFinal,
                  delta_pc: delta,
                  motivo,
                  observacao: inventarioForm?.observacao || null,
                  lote: inventarioForm?.lote || null,
                  numero_pedido: inventarioForm?.numero_pedido || null,
                  criado_por: null
                })
                await loadInventariosAcabados()
                setInventarioOpen(false)
                setInventarioForm({ produto: '', saldoAtual: 0, saldoFinal: '', motivo: 'inventario', observacao: '', lote: '', numero_pedido: '' })
              } catch (err) {
                console.error('Erro ao salvar inventário:', err)
                alert('Falha ao salvar inventário')
              } finally {
                setInventarioSaving(false)
              }
            }}>
              <div className="relative">
                <label className="block text-sm text-gray-600 mb-1">Produto</label>
                <input
                  type="text"
                  className="w-full border rounded px-2 py-2"
                  placeholder="Digite ou selecione um produto..."
                  value={inventarioForm?.produto || inventarioProdutoSearch}
                  onChange={(e) => {
                    const val = e.target.value
                    setInventarioProdutoSearch(val)
                    setInventarioForm((prev) => ({ ...prev, produto: val }))
                    setInventarioProdutoShowSuggestions(true)
                  }}
                  onFocus={() => setInventarioProdutoShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setInventarioProdutoShowSuggestions(false), 200)}
                  disabled={inventarioSaving}
                  required
                />
                {inventarioProdutoShowSuggestions && inventarioProdutoSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 border rounded bg-white shadow-lg z-10 max-h-48 overflow-y-auto">
                    {inventarioProdutoSuggestions.map((prod) => (
                      <button
                        key={`inv-sugg-${prod}`}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm"
                        onClick={() => {
                          const row = estoquePorProduto.find((r) => String(r?.produto || '').trim() === String(prod || '').trim())
                          const saldoAtual = Number(row?.saldo || 0)
                          setInventarioForm((prev) => ({ ...prev, produto: prod, saldoAtual }))
                          setInventarioProdutoSearch(prod)
                          setInventarioProdutoShowSuggestions(false)
                        }}
                      >
                        {prod}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Saldo atual</label>
                  <input
                    className="w-full border rounded px-2 py-2 bg-gray-100"
                    value={Number(inventarioForm?.saldoAtual || 0).toLocaleString('pt-BR')}
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Contagem física (valor final)</label>
                  <input
                    className="w-full border rounded px-2 py-2"
                    value={inventarioForm?.saldoFinal || ''}
                    onChange={(e) => setInventarioForm((prev) => ({ ...prev, saldoFinal: e.target.value }))}
                    disabled={inventarioSaving}
                    inputMode="decimal"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Motivo</label>
                <select
                  className="w-full border rounded px-2 py-2"
                  value={inventarioForm?.motivo || 'inventario'}
                  onChange={(e) => setInventarioForm((prev) => ({ ...prev, motivo: e.target.value }))}
                  disabled={inventarioSaving}
                  required
                >
                  <option value="inventario">Inventário</option>
                  <option value="correcao_erro">Correção de erro</option>
                  <option value="ajuste_pos_usinagem_embalagem">Ajuste pós usinagem/embalagem</option>
                  <option value="outro">Outro</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Lote</label>
                  <input
                    type="text"
                    className="w-full border rounded px-2 py-2"
                    placeholder="Ex: LOTE-001"
                    value={inventarioForm?.lote || ''}
                    onChange={(e) => setInventarioForm((prev) => ({ ...prev, lote: e.target.value }))}
                    disabled={inventarioSaving}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Número do Pedido</label>
                  <input
                    type="text"
                    className="w-full border rounded px-2 py-2"
                    placeholder="Ex: PED-001"
                    value={inventarioForm?.numero_pedido || ''}
                    onChange={(e) => setInventarioForm((prev) => ({ ...prev, numero_pedido: e.target.value }))}
                    disabled={inventarioSaving}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Observação</label>
                <textarea
                  className="w-full border rounded px-2 py-2"
                  rows={3}
                  value={inventarioForm?.observacao || ''}
                  onChange={(e) => setInventarioForm((prev) => ({ ...prev, observacao: e.target.value }))}
                  disabled={inventarioSaving}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" className="px-3 py-2 rounded border" onClick={() => setInventarioOpen(false)} disabled={inventarioSaving}>Cancelar</button>
                <button type="submit" className="px-3 py-2 rounded bg-blue-600 text-white" disabled={inventarioSaving}>
                  {inventarioSaving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {observacoesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-4xl max-h-[90vh] rounded-lg bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between border-b px-4 py-3 flex-shrink-0">
              <div className="font-semibold text-gray-800">Observações - {observacoesProdutoSelecionado}</div>
              <button type="button" className="text-sm text-gray-500" onClick={() => setObservacoesModalOpen(false)}>Fechar</button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              {(observacoesPorProduto?.[observacoesProdutoSelecionado] || []).length > 0 ? (
                <div className="space-y-4">
                  {observacoesPorProduto[observacoesProdutoSelecionado].map((obs, idx) => (
                    <div key={idx} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-start justify-between mb-3">
                        <div className="text-xs text-gray-500">
                          {obs.data ? new Date(obs.data).toLocaleString('pt-BR') : '-'}
                        </div>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{obs.motivo || '-'}</span>
                      </div>
                      <div className="text-sm text-gray-700 mb-3 p-3 bg-white rounded border-l-4 border-yellow-400 max-h-40 overflow-y-auto whitespace-pre-wrap break-words">
                        {obs.observacao}
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-xs text-gray-600">
                        <div className="bg-white p-2 rounded border">
                          <span className="font-semibold">Antes:</span> {Number(obs.saldo_antes || 0).toLocaleString('pt-BR')}
                        </div>
                        <div className="bg-white p-2 rounded border">
                          <span className="font-semibold">Depois:</span> {Number(obs.saldo_depois || 0).toLocaleString('pt-BR')}
                        </div>
                        <div className="bg-white p-2 rounded border">
                          <span className="font-semibold">Delta:</span> {Number(obs.delta || 0).toLocaleString('pt-BR')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-sm text-gray-500 py-8">Nenhuma observação registrada para este produto.</div>
              )}
            </div>
          </div>
        </div>
      )}

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

            <div>
              <label className="block text-sm text-gray-600">Planta</label>
              <select
                className="w-full border rounded px-2 py-1"
                value={insumoEntradaForm.planta}
                onChange={(e) => setInsumoEntradaForm(f => ({ ...f, planta: e.target.value }))}
              >
                <option value="">Selecione a planta...</option>
                <option value="Alúnica">Alúnica</option>
                <option value="Tecnoperfil">Tecnoperfil</option>
              </select>
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
      <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 overflow-y-auto p-4">
        <div className="bg-white rounded shadow-lg w-full max-w-lg my-4">
          <div className="px-4 py-3 border-b bg-gradient-to-r from-indigo-50 to-indigo-100">
            <h2 className="text-base font-semibold text-indigo-900 flex items-center gap-2">
              <FaTools className="text-indigo-600" />
              Editar Ferramenta CNC
            </h2>
          </div>
          <form className="p-4 space-y-3" onSubmit={handleSaveFerrStatusEdit}>
            {/* Seção 1: Identificação */}
            <div className="bg-blue-50 rounded p-3 border-l-4 border-blue-600">
              <h3 className="text-xs font-semibold text-blue-900 mb-2">📌 Identificação</h3>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="block text-xs text-gray-600 font-medium">Código</label>
                  <input className="w-full border rounded px-2 py-1 text-xs bg-gray-100" value={ferrStatusEditForm.ferramenta} disabled placeholder="Código" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 font-medium">Número Serial</label>
                  <input className="w-full border rounded px-2 py-1 text-xs" value={ferrStatusEditForm.numero_serial} onChange={(e)=>setFerrStatusEditForm(f=>({...f, numero_serial: e.target.value}))} placeholder="Ex: 001" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-600 font-medium">Corpo (mm)</label>
                <input type="number" className="w-full border rounded px-2 py-1 text-xs" value={ferrStatusEditForm.corpo_mm} onChange={(e)=>setFerrStatusEditForm(f=>({...f, corpo_mm: e.target.value}))} placeholder="Ex: 12.5" step="0.1" />
              </div>
            </div>

            {/* Seção 2: Especificações */}
            <div className="bg-green-50 rounded p-3 border-l-4 border-green-600">
              <h3 className="text-xs font-semibold text-green-900 mb-2">⚙️ Especificações</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-600 font-medium">Quantidade (pcs)</label>
                  <input type="number" className="w-full border rounded px-2 py-1 text-xs" value={ferrStatusEditForm.quant_pcs} onChange={(e)=>setFerrStatusEditForm(f=>({...f, quant_pcs: e.target.value}))} placeholder="Ex: 10" min="1" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 font-medium">Responsável</label>
                  <input className="w-full border rounded px-2 py-1 text-xs" value={ferrStatusEditForm.responsavel} onChange={(e)=>setFerrStatusEditForm(f=>({...f, responsavel: e.target.value}))} placeholder="Nome" />
                </div>
              </div>
            </div>

            {/* Seção 3: Vida Útil */}
            <div className="bg-purple-50 rounded p-3 border-l-4 border-purple-600">
              <h3 className="text-xs font-semibold text-purple-900 mb-2">⏱️ Vida Útil (Horas de Corte)</h3>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="block text-xs text-gray-600 font-medium">Horas de Corte</label>
                  <input type="number" className="w-full border rounded px-2 py-1 text-xs" value={ferrStatusEditForm.vida_valor} onChange={(e)=>setFerrStatusEditForm(f=>({...f, vida_valor: e.target.value}))} placeholder="Ex: 100" min="1" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 font-medium">Unidade</label>
                  <select className="w-full border rounded px-2 py-1 text-xs" value={ferrStatusEditForm.vida_unidade} onChange={(e)=>setFerrStatusEditForm(f=>({...f, vida_unidade: e.target.value}))}>
                    <option value="horas">Horas de Corte</option>
                    <option value="dias">Dias (aprox.)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-600 font-medium">Última Troca</label>
                <input type="date" className="w-full border rounded px-2 py-1 text-xs" value={ferrStatusEditForm.ultima_troca} onChange={(e)=>setFerrStatusEditForm(f=>({...f, ultima_troca: e.target.value}))} />
              </div>
            </div>

            {/* Seção 4: Status */}
            <div className="bg-yellow-50 rounded p-3 border-l-4 border-yellow-600">
              <label className="inline-flex items-center gap-2 text-xs text-gray-700">
                <input type="checkbox" className="h-4 w-4 rounded border-gray-300" checked={ferrStatusEditForm.ativo} onChange={(e)=>setFerrStatusEditForm(f=>({...f, ativo: e.target.checked}))} />
                <span className="font-medium">Ativo</span>
              </label>
            </div>

            {ferrStatusEditError && <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700 text-xs">{ferrStatusEditError}</div>}
            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button type="button" className="px-4 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition text-sm" onClick={()=>{ if (!ferrStatusEditSaving) setFerrStatusEditOpen(false) }} disabled={ferrStatusEditSaving}>Cancelar</button>
              <button type="submit" className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 transition font-medium text-sm" disabled={ferrStatusEditSaving}>{ferrStatusEditSaving ? 'Salvando...' : 'Salvar Ferramenta'}</button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* Modal Movimentação de Depósito (Itens Acabados) */}
    {depositoMovOpen && (
      <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
        <div className="bg-white rounded shadow-lg w-full max-w-md">
          <div className="px-4 py-3 border-b bg-gradient-to-r from-purple-50 to-purple-100">
            <h2 className="text-base font-semibold text-purple-900">Mover Item para Outro Depósito</h2>
          </div>
          <form className="p-4 space-y-3" onSubmit={async (e)=>{
            e.preventDefault()
            if (depositoMovSaving) return
            setDepositoMovError('')
            
            const produto = String(depositoMovForm.produto || '').trim()
            if (!produto) { setDepositoMovError('Produto não selecionado.'); return }
            
            try {
              setDepositoMovSaving(true)
              // Salvar movimentação no banco de dados
              await supabaseService.add('movimentacoes_deposito', {
                produto: produto,
                deposito_origem: depositoMovForm.deposito_origem,
                deposito_destino: depositoMovForm.deposito_destino,
                motivo: depositoMovForm.motivo || null,
                observacao: depositoMovForm.observacao || null,
                movimentado_em: new Date().toISOString()
              })
              console.log('✅ Movimentação salva:', depositoMovForm)
              await loadMovimentacoesDeposito()
              setDepositoMovOpen(false)
              setDepositoMovForm({ produto: '', deposito_origem: 'alunica', deposito_destino: 'tecnoperfil', motivo: '', observacao: '' })
            } catch (err) {
              console.error('Erro ao mover depósito:', err)
              setDepositoMovError(err?.message || 'Erro ao mover item.')
            } finally {
              setDepositoMovSaving(false)
            }
          }}>
            <div>
              <label className="block text-xs text-gray-600 font-medium">Produto</label>
              <input className="w-full border rounded px-2 py-1 text-sm bg-gray-100" value={depositoMovForm.produto} disabled placeholder="Produto" />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 font-medium">De (Origem)</label>
                <select className="w-full border rounded px-2 py-1 text-sm" value={depositoMovForm.deposito_origem} onChange={(e)=>setDepositoMovForm(f=>({...f, deposito_origem: e.target.value}))}>
                  <option value="alunica">Alúnica</option>
                  <option value="tecnoperfil">Tecnoperfil</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 font-medium">Para (Destino)</label>
                <select className="w-full border rounded px-2 py-1 text-sm" value={depositoMovForm.deposito_destino} onChange={(e)=>setDepositoMovForm(f=>({...f, deposito_destino: e.target.value}))}>
                  <option value="tecnoperfil">Tecnoperfil</option>
                  <option value="alunica">Alúnica</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-xs text-gray-600 font-medium">Motivo</label>
              <input className="w-full border rounded px-2 py-1 text-sm" value={depositoMovForm.motivo} onChange={(e)=>setDepositoMovForm(f=>({...f, motivo: e.target.value}))} placeholder="Ex: Transferência para cliente" />
            </div>
            
            <div>
              <label className="block text-xs text-gray-600 font-medium">Observação</label>
              <textarea className="w-full border rounded px-2 py-1 text-sm" value={depositoMovForm.observacao} onChange={(e)=>setDepositoMovForm(f=>({...f, observacao: e.target.value}))} placeholder="Observações adicionais" rows="2" />
            </div>
            
            {depositoMovError && <div className="bg-red-50 border border-red-200 rounded p-2 text-red-700 text-xs">{depositoMovError}</div>}
            
            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button type="button" className="px-4 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition text-sm" onClick={()=>{ if (!depositoMovSaving) setDepositoMovOpen(false) }} disabled={depositoMovSaving}>Cancelar</button>
              <button type="submit" className="px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-700 transition font-medium text-sm" disabled={depositoMovSaving}>{depositoMovSaving ? 'Movimentando...' : 'Confirmar Movimentação'}</button>
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

    {/* Modal Cadastro Inteligente de Ferramenta CNC */}
    {cadFerrOpen && (
      <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 overflow-y-auto p-4">
        <div className="bg-white rounded shadow-lg w-full max-w-lg my-4">
          <div className="px-4 py-3 border-b bg-gradient-to-r from-indigo-50 to-indigo-100">
            <h2 className="text-base font-semibold text-indigo-900 flex items-center gap-2">
              <FaTools className="text-indigo-600" />
              Cadastro Inteligente de Ferramenta CNC
            </h2>
            <p className="text-xs text-indigo-600 mt-0.5">Cálculos automáticos de vida útil e status</p>
          </div>
          <form className="p-4 space-y-3" onSubmit={async (e)=>{
            e.preventDefault()
            if (cadFerrSaving) return
            setCadFerrError('')

            const ferramenta = String(cadFerrForm.ferramenta || '').trim()
            const numeroSerial = String(cadFerrForm.numero_serial || '').trim()
            if (!ferramenta) { setCadFerrError('Informe o código da ferramenta.'); return }
            if (!numeroSerial) { setCadFerrError('Informe o número serial.'); return }

            try {
              setCadFerrSaving(true)

              const ferramentaCompleta = `${ferramenta}-${numeroSerial}`
              const exists = (Array.isArray(ferramentasCfg) ? ferramentasCfg : []).some((f) => {
                const fCode = String(f?.ferramenta || f?.codigo || '').trim()
                const fSerial = String(f?.numero_serial || '').trim()
                return fCode === ferramenta && fSerial === numeroSerial
              })
              if (!exists) {
                await supabaseService.add('ferramentas_cfg', {
                  ferramenta: ferramentaCompleta,
                  codigo: ferramentaCompleta,
                  numero_serial: numeroSerial,
                  corpo_mm: cadFerrForm.corpo_mm ? Number(cadFerrForm.corpo_mm) : null,
                  quant_pcs: cadFerrForm.quant_pcs ? Number(cadFerrForm.quant_pcs) : null,
                  vida_valor: cadFerrForm.vida_valor ? Number(cadFerrForm.vida_valor) : null,
                  vida_unidade: cadFerrForm.vida_unidade || 'horas',
                  ultima_troca: cadFerrForm.ultima_troca || null,
                  responsavel: cadFerrForm.responsavel || null,
                  ativo: cadFerrForm.ativo !== false,
                  produtos: (cadFerrForm.produtos || []).length > 0 ? cadFerrForm.produtos : null,
                  tempo_por_peca: cadFerrForm.tempo_por_peca ? Number(cadFerrForm.tempo_por_peca) : null
                })
              }

              await loadFerramentasCfg()
              setCadFerrOpen(false)
              setCadFerrForm({
                ferramenta: '',
                numero_serial: '',
                corpo_mm: '',
                quant_pcs: '',
                vida_valor: '',
                vida_unidade: 'horas',
                ultima_troca: new Date().toISOString().split('T')[0],
                responsavel: '',
                ativo: true,
                produtos: [],
                tempo_por_peca: ''
              })
            } catch (err) {
              console.error(err)
              setCadFerrError(err?.message || 'Falha ao cadastrar ferramenta.')
            } finally {
              setCadFerrSaving(false)
            }
          }}>
            {/* Seção 1: Identificação */}
            <div className="bg-blue-50 rounded p-3 border-l-4 border-blue-600">
              <h3 className="text-xs font-semibold text-blue-900 mb-2">📌 Identificação</h3>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="block text-xs text-gray-600 font-medium">Código *</label>
                  <input className="w-full border rounded px-2 py-1 text-xs" value={cadFerrForm.ferramenta} onChange={(e)=>setCadFerrForm(f=>({...f, ferramenta: e.target.value}))} placeholder="Ex: Fresa" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 font-medium">Número Serial *</label>
                  <input className="w-full border rounded px-2 py-1 text-xs" value={cadFerrForm.numero_serial} onChange={(e)=>setCadFerrForm(f=>({...f, numero_serial: e.target.value}))} placeholder="Ex: 001" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-600 font-medium">Corpo (mm)</label>
                <input type="number" className="w-full border rounded px-2 py-1 text-xs" value={cadFerrForm.corpo_mm} onChange={(e)=>setCadFerrForm(f=>({...f, corpo_mm: e.target.value}))} placeholder="Ex: 12.5" step="0.1" />
              </div>
            </div>

            {/* Seção 2: Especificações */}
            <div className="bg-green-50 rounded p-3 border-l-4 border-green-600">
              <h3 className="text-xs font-semibold text-green-900 mb-2">⚙️ Especificações</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-600 font-medium">Quantidade (pcs)</label>
                  <input type="number" className="w-full border rounded px-2 py-1 text-xs" value={cadFerrForm.quant_pcs} onChange={(e)=>setCadFerrForm(f=>({...f, quant_pcs: e.target.value}))} placeholder="Ex: 10" min="1" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 font-medium">Responsável</label>
                  <input className="w-full border rounded px-2 py-1 text-xs" value={cadFerrForm.responsavel} onChange={(e)=>setCadFerrForm(f=>({...f, responsavel: e.target.value}))} placeholder="Nome" />
                </div>
              </div>
            </div>

            {/* Seção 3: Tempo por Peça (Cálculo de Uso) */}
            <div className="bg-purple-50 rounded p-3 border-l-4 border-purple-600">
              <h3 className="text-xs font-semibold text-purple-900 mb-2">⏱️ Tempo por Peça (Cálculo de Uso)</h3>
              <div className="mb-2 p-2 bg-white rounded border border-purple-200 text-xs text-purple-700">
                <strong>💡 Dica:</strong> Informe o tempo médio por peça para calcular o uso real baseado nos apontamentos de produção.
              </div>
              
              {/* Produtos que essa ferramenta fabrica */}
              <div className="mb-2">
                <label className="block text-xs text-gray-600 font-medium mb-1">Produtos (quais itens essa ferramenta fabrica)</label>
                <select
                  className="w-full border rounded px-2 py-1 text-xs"
                  value=""
                  onChange={(e) => {
                    const produto = e.target.value
                    const produtosAtuais = cadFerrForm.produtos || []
                    if (produto && !produtosAtuais.includes(produto)) {
                      setCadFerrForm(f => ({ ...f, produtos: [...(f.produtos || []), produto] }))
                    }
                  }}
                >
                  <option value="">Selecione produtos...</option>
                  {(Array.isArray(apontamentos) ? apontamentos : [])
                    .map(a => String(a.produto || '').trim())
                    .filter(Boolean)
                    .filter((v, i, arr) => arr.indexOf(v) === i)
                    .sort((a, b) => a.localeCompare(b))
                    .map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                </select>
                {(cadFerrForm.produtos || []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(cadFerrForm.produtos || []).map(p => (
                      <span key={p} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-100 text-purple-700 text-xs">
                        {p}
                        <button type="button" className="text-purple-500 hover:text-purple-800" onClick={() => setCadFerrForm(f => ({ ...f, produtos: (f.produtos || []).filter(x => x !== p) }))}>×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="block text-xs text-gray-600 font-medium">Tempo por Peça (min)</label>
                  <input type="number" className="w-full border rounded px-2 py-1 text-xs" value={cadFerrForm.tempo_por_peca} onChange={(e)=>setCadFerrForm(f=>({...f, tempo_por_peca: e.target.value}))} placeholder="Ex: 4" min="0.1" step="0.1" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 font-medium">Vida Útil (horas)</label>
                  <input type="number" className="w-full border rounded px-2 py-1 text-xs" value={cadFerrForm.vida_valor} onChange={(e)=>setCadFerrForm(f=>({...f, vida_valor: e.target.value}))} placeholder="Ex: 100" min="1" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-600 font-medium">Última Troca</label>
                <input type="date" className="w-full border rounded px-2 py-1 text-xs" value={cadFerrForm.ultima_troca} onChange={(e)=>setCadFerrForm(f=>({...f, ultima_troca: e.target.value}))} />
              </div>
            </div>

            {/* Seção 4: Status */}
            <div className="bg-yellow-50 rounded p-3 border-l-4 border-yellow-600">
              <label className="inline-flex items-center gap-2 text-xs text-gray-700">
                <input type="checkbox" className="h-4 w-4 rounded border-gray-300" checked={cadFerrForm.ativo !== false} onChange={(e)=>setCadFerrForm(f=>({...f, ativo: e.target.checked}))} />
                <span className="font-medium">Ativo</span>
              </label>
            </div>

            {cadFerrError && <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700 text-sm">{cadFerrError}</div>}
            
            <div className="flex items-center justify-end gap-2 pt-4 border-t">
              <button type="button" className="px-4 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition" onClick={()=>{ if (!cadFerrSaving) setCadFerrOpen(false) }} disabled={cadFerrSaving}>Cancelar</button>
              <button type="submit" className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 transition font-medium" disabled={cadFerrSaving}>{cadFerrSaving? 'Salvando...' : 'Salvar Ferramenta'}</button>
            </div>
          </form>
        </div>
      </div>
    )}

      {tab==='ferramentas' && (
        <div className="space-y-6">
          {/* Sub-abas Navigation */}
          <div className="bg-white rounded shadow overflow-hidden border-b">
            <div className="flex border-b">
              <button
                onClick={() => setSubTab('insumos')}
                className={`flex-1 px-4 py-3 text-center font-medium transition ${
                  subTab === 'insumos'
                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <FaCubes className="text-lg" />
                  <span>Insumos</span>
                </div>
              </button>
              <button
                onClick={() => setSubTab('ferramentas_status')}
                className={`flex-1 px-4 py-3 text-center font-medium transition ${
                  subTab === 'ferramentas_status'
                    ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <FaTools className="text-lg" />
                  <span>Status de Ferramentas</span>
                </div>
              </button>
            </div>
          </div>

          {/* SUB-ABA: INSUMOS */}
          {subTab === 'insumos' && (
            <div className="space-y-6">
              {/* Ações Rápidas */}
              <div className="flex gap-2 flex-wrap">
                <button className="px-4 py-2 rounded bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition inline-flex items-center gap-2" onClick={exportarInsumosExcel}>
                  <FaFileExcel/> Exportar Excel
                </button>
                <button 
                  className="px-4 py-2 rounded bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed" 
                  onClick={()=>{ setInsumoEntradaOpen(true); setErroInsumo('') }}
                  disabled={somenteVisualizacao}
                  title={somenteVisualizacao ? 'Modo visualização' : ''}
                >
                  <div className="flex items-center gap-2"><FaArrowDown/> Entrada</div>
                </button>
                <button 
                  className="px-4 py-2 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed" 
                  onClick={()=>{ setInsumoSaidaOpen(true); setErroInsumo('') }}
                  disabled={somenteVisualizacao}
                  title={somenteVisualizacao ? 'Modo visualização' : ''}
                >
                  <div className="flex items-center gap-2"><FaArrowDown/> Saída</div>
                </button>
                <button
                  onClick={() => setCorrecaoLancamentoOpen(true)}
                  className="px-4 py-2 rounded bg-orange-600 text-white text-sm font-medium hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  title={somenteVisualizacao ? 'Modo visualização' : 'Corrigir lançamentos incorretos'}
                  disabled={somenteVisualizacao}
                >
                  Corrigir Lançamentos
                </button>
                <button className="px-4 py-2 rounded bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition" onClick={()=>setInsumosVerSecundario(v=>!v)}>
                  {insumosVerSecundario ? 'Ocultar Histórico' : 'Ver Histórico'}
                </button>
              </div>

              {/* Dashboard de Indicadores */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded shadow p-4 border-l-4 border-red-600">
                  <div className="text-gray-600 text-sm font-medium">Abaixo do Mínimo</div>
                  <div className="text-3xl font-bold text-red-700 mt-1">{insumosIndicadores.abaixoMin}</div>
                  <div className="text-xs text-red-600 mt-2">⚠️ Reposição necessária</div>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded shadow p-4 border-l-4 border-blue-600">
                  <div className="text-gray-600 text-sm font-medium">Consumo Médio (30d)</div>
                  <div className="text-3xl font-bold text-blue-700 mt-1">{Number(insumosIndicadores.consumoMedio||0).toLocaleString('pt-BR')}</div>
                  <div className="text-xs text-blue-600 mt-2">📊 Referência</div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded shadow p-4 border-l-4 border-green-600">
                  <div className="text-gray-600 text-sm font-medium">Total de Insumos</div>
                  <div className="text-3xl font-bold text-green-700 mt-1">{(Array.isArray(insumosSaldo)?insumosSaldo:[]).length}</div>
                  <div className="text-xs text-green-600 mt-2">✓ Cadastrados</div>
                </div>
              </div>

              {/* Tabela de Insumos */}
              <div className="bg-white rounded shadow overflow-hidden">
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
                    <th className="text-left px-4 py-2">Depósito</th>
                    <th className="text-left px-4 py-2">Status</th>
                    <th className="text-left px-4 py-2">Ações</th>
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
                              <button
                                onClick={() => {
                                  setImageModalData({ url: i.foto_url, name: i.nome })
                                  setImageModalOpen(true)
                                }}
                                className="cursor-pointer hover:opacity-80 transition"
                                title="Clique para visualizar"
                              >
                                <img src={i.foto_url} alt={i.nome} className="h-8 w-8 object-cover rounded border hover:border-blue-500" />
                              </button>
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
                  <div className="px-4 py-2 border-b font-semibold">Histórico de Insumos</div>
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
                        </tr>
                      </thead>
                      <tbody>
                        {(Array.isArray(insumosMov) ? insumosMov : []).slice(0, 50).map((h, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="px-4 py-2">{h.created_at ? new Date(h.created_at).toLocaleString('pt-BR') : '-'}</td>
                            <td className="px-4 py-2"><span className="px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs font-medium">{h.tipo}</span></td>
                            <td className="px-4 py-2 font-medium">{h.nome}</td>
                            <td className="px-4 py-2">{h.categoria || '-'}</td>
                            <td className="px-4 py-2">{Number(h.quantidade||0).toLocaleString('pt-BR')} {h.unidade||''}</td>
                            <td className="px-4 py-2">{h.responsavel || '-'}</td>
                          </tr>
                        ))}
                        {(Array.isArray(insumosMov) ? insumosMov : []).length === 0 && (
                          <tr className="border-t"><td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">Sem movimentações recentes.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SUB-ABA: STATUS DE FERRAMENTAS */}
          {subTab === 'ferramentas_status' && (
            <div className="space-y-6">
              {/* Ações Rápidas */}
              <div className="flex gap-2 flex-wrap">
                <button className="px-4 py-2 rounded bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition inline-flex items-center gap-2" onClick={exportarFerramentasExcel}>
                  <FaFileExcel/> Exportar Excel
                </button>
                <button 
                  className="px-4 py-2 rounded bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed" 
                  onClick={()=>{ setFerrMovOpen(true); setErroFerr('') }}
                  disabled={somenteVisualizacao}
                  title={somenteVisualizacao ? 'Modo visualização' : ''}
                >
                  <div className="flex items-center gap-2"><FaClock/> Movimentar</div>
                </button>
                <button 
                  className="px-4 py-2 rounded bg-gray-700 text-white text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed" 
                  onClick={()=>{ setCadFerrOpen(true); setCadFerrError(''); setCadFerrForm({ ferramenta: '', numero_serial: '', descricao: '', ativo: true }) }}
                  disabled={somenteVisualizacao}
                  title={somenteVisualizacao ? 'Modo visualização' : ''}
                >
                  <div className="flex items-center gap-2"><FaPlusCircle/> Cadastrar</div>
                </button>
                <button
                  className="px-4 py-2 rounded bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition"
                  onClick={()=>{
                    setCategoriasError('')
                    setCategoriasInsumosText((categoriasInsumos || []).join('\n'))
                    setCategoriasFerramentasText((categoriasFerramentas || []).join('\n'))
                    setCategoriasOpen(true)
                  }}
                >
                  Gerenciar Categorias
                </button>
              </div>

              {/* Dashboard de Indicadores */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded shadow p-4 border-l-4 border-indigo-600">
                  <div className="text-gray-600 text-sm font-medium">Total Monitoradas</div>
                  <div className="text-3xl font-bold text-indigo-700 mt-1">{(Array.isArray(ferramentasCfg)?ferramentasCfg:[]).filter(f => f.ativo !== false).length}</div>
                  <div className="text-xs text-indigo-600 mt-2">🔧 Ativas</div>
                </div>
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded shadow p-4 border-l-4 border-yellow-600">
                  <div className="text-gray-600 text-sm font-medium">Atenção</div>
                  <div className="text-3xl font-bold text-yellow-700 mt-1">{(Array.isArray(ferrStatusFiltrado)?ferrStatusFiltrado:[]).filter(f => f.status === 'atenção').length}</div>
                  <div className="text-xs text-yellow-600 mt-2">⚠️ Próximo vencimento</div>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded shadow p-4 border-l-4 border-red-600">
                  <div className="text-gray-600 text-sm font-medium">Para Trocar</div>
                  <div className="text-3xl font-bold text-red-700 mt-1">{(Array.isArray(ferrStatusFiltrado)?ferrStatusFiltrado:[]).filter(f => f.status === 'para trocar').length}</div>
                  <div className="text-xs text-red-600 mt-2">🚨 Urgente</div>
                </div>
              </div>

              {/* Tabela de Status de Ferramentas */}
              <div className="bg-white rounded shadow overflow-hidden">
                <div className="px-4 py-3 border-b bg-gradient-to-r from-indigo-50 to-indigo-100">
                  <div className="font-semibold text-indigo-900 flex items-center gap-2">
                    <FaTools className="text-indigo-600" />
                    Status de Ferramentas
                  </div>
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
                        const statusLabel = f.ativo === false ? 'estoque' : (f.ativo === true ? 'ativa' : (f.status || 'ativa'))
                        const cls = statusLabel === 'para trocar' ? 'bg-red-100 text-red-700' : statusLabel === 'atenção' ? 'bg-yellow-100 text-yellow-800' : statusLabel === 'estoque' ? 'bg-gray-100 text-gray-700' : 'bg-green-100 text-green-800'
                        return (
                          <tr key={f.ferramenta} className="border-t hover:bg-gray-50 transition">
                            <td className="px-4 py-2 font-medium">{f.ferramenta}</td>
                            <td className="px-4 py-2">{vidaLabel}</td>
                            <td className="px-4 py-2">{f.ultima_troca ? new Date(f.ultima_troca).toLocaleDateString('pt-BR') : '-'}</td>
                            <td className="px-4 py-2 font-semibold">{restanteLabel}</td>
                            <td className="px-4 py-2"><span className={`px-2 py-1 rounded text-xs font-medium ${cls}`}>{statusLabel}</span></td>
                            <td className="px-4 py-2">{f.responsavel || '-'}</td>
                            <td className="px-4 py-2 flex gap-2">
                              <button
                                type="button"
                                className="text-xs bg-indigo-600 text-white hover:bg-indigo-700 px-3 py-1 rounded transition"
                                onClick={() => handleOpenFerrStatusEdit(f)}
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                className="text-xs bg-red-600 text-white hover:bg-red-700 px-3 py-1 rounded transition"
                                onClick={async () => {
                                  if (window.confirm(`Tem certeza que deseja excluir a ferramenta "${f.ferramenta}"?`)) {
                                    try {
                                      if (!f.id) {
                                        alert('Erro: ID da ferramenta não encontrado')
                                        return
                                      }
                                      await supabaseService.remove('ferramentas_cfg', f.id)
                                      const loadFerramentasCfg = async () => {
                                        try {
                                          const data = await supabaseService.fetch('ferramentas_cfg')
                                          setFerramentasCfg(Array.isArray(data) ? data : [])
                                        } catch (e) {
                                          console.error('Erro ao carregar ferramentas_cfg:', e)
                                        }
                                      }
                                      await loadFerramentasCfg()
                                    } catch (err) {
                                      console.error('Erro ao excluir ferramenta:', err)
                                      alert('Erro ao excluir ferramenta: ' + (err?.message || 'Desconhecido'))
                                    }
                                  }
                                }}
                              >
                                Excluir
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                      {(Array.isArray(ferrStatusFiltrado)?ferrStatusFiltrado:[]).length === 0 && (
                        <tr className="border-t"><td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-500">Nenhuma ferramenta encontrada.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {insumosVerSecundario && (
                <div className="bg-white rounded shadow overflow-hidden">
                  <div className="px-4 py-2 border-b font-semibold">Histórico de Ferramentas</div>
                  <div className="overflow-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-4 py-2">Data</th>
                          <th className="text-left px-4 py-2">Tipo</th>
                          <th className="text-left px-4 py-2">Ferramenta</th>
                          <th className="text-left px-4 py-2">Qtd</th>
                          <th className="text-left px-4 py-2">Resp.</th>
                          <th className="text-left px-4 py-2">Máquina</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(Array.isArray(ferrMov) ? ferrMov : []).slice(0, 50).map((h, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="px-4 py-2">{h.created_at ? new Date(h.created_at).toLocaleString('pt-BR') : '-'}</td>
                            <td className="px-4 py-2"><span className="px-2 py-1 rounded bg-indigo-100 text-indigo-700 text-xs font-medium">{h.tipo}</span></td>
                            <td className="px-4 py-2 font-medium">{h.ferramenta}</td>
                            <td className="px-4 py-2">{Number(h.quantidade||0).toLocaleString('pt-BR')} {h.unidade||''}</td>
                            <td className="px-4 py-2">{h.responsavel || '-'}</td>
                            <td className="px-4 py-2">{h.maquina || '-'}</td>
                          </tr>
                        ))}
                        {(Array.isArray(ferrMov) ? ferrMov : []).length === 0 && (
                          <tr className="border-t"><td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">Sem movimentações recentes.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
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
              <div>
                <label className="block text-sm text-gray-600">Pedido</label>
                <input type="text" className="w-full border rounded px-2 py-1" placeholder="Ex: PED-001" value={baixaForm.pedido} onChange={(e)=>setBaixaForm(f=>({...f, pedido:e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm text-gray-600">Nº Pedido</label>
                <input type="text" className="w-full border rounded px-2 py-1" placeholder="Ex: 123456" value={baixaForm.numero_pedido} onChange={(e)=>setBaixaForm(f=>({...f, numero_pedido:e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm text-gray-600">Cliente</label>
                <input type="text" className="w-full border rounded px-2 py-1" placeholder="Ex: Empresa XYZ" value={baixaForm.cliente} onChange={(e)=>setBaixaForm(f=>({...f, cliente:e.target.value}))} />
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

      {/* Modal de Visualização de Imagem */}
      <ImageModalViewer
        isOpen={imageModalOpen}
        imageUrl={imageModalData.url}
        imageName={imageModalData.name}
        onClose={() => setImageModalOpen(false)}
      />

      {/* Modal de Correção de Lançamentos */}
      <CorrecaoLancamentoInsumoModal
        isOpen={correcaoLancamentoOpen}
        onClose={() => setCorrecaoLancamentoOpen(false)}
        onSuccess={() => {
          loadInsumosMov()
          loadInsumosSaldo()
        }}
      />
    </div>
  )
}
