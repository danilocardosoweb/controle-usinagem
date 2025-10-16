import { useMemo, useState, useEffect } from 'react'
import { FaClock, FaCalculator, FaChartLine, FaPlus, FaTrash, FaBusinessTime, FaSave, FaFileImport, FaProjectDiagram } from 'react-icons/fa'
import { useSupabase } from '../hooks/useSupabase'
import supabaseService from '../services/SupabaseService'

const PrevisaoTrabalho = () => {
  const [abaSelecionada, setAbaSelecionada] = useState('carteira')
  const [filtros, setFiltros] = useState({
    produto: '',
    maquina: '',
    operador: ''
  })
  // Tipo de dia para estimativa: dia útil ou sábado
  const [tipoDia, setTipoDia] = useState('dia_util')
  
  // Modo de cálculo de produtividade
  const [modoProdutividade, setModoProdutividade] = useState('historica') // 'historica' | 'estimativa'
  const [estimativaPcsPorDia, setEstimativaPcsPorDia] = useState(15000)
  
  // Data inicial para previsões
  const [dataInicialPrevisao, setDataInicialPrevisao] = useState(() => {
    const hoje = new Date()
    return hoje.toISOString().split('T')[0] // formato YYYY-MM-DD
  })
  
  // Novos pedidos para estimativa manual
  const [novosPedidos, setNovosPedidos] = useState([])
  const [novoPedido, setNovoPedido] = useState({
    quantidade: '',
    produtividadeManual: '',
    ferramenta: '',
    comprimentoMm: ''
  })
  const [mostrarCotacao, setMostrarCotacao] = useState(false)
  // Controles da visualização Gantt
  const [ganttZoomPX, setGanttZoomPX] = useState(36) // px por dia
  const [ganttOrdenacao, setGanttOrdenacao] = useState('prazo') // 'prazo' | 'estimativa' | 'sequencia'
  const [ganttSombrarFds, setGanttSombrarFds] = useState(true)

  // Filtros e seleção de pedidos da carteira
  const [filtroPedidoCliente, setFiltroPedidoCliente] = useState('')
  const [pedidosSelecionados, setPedidosSelecionados] = useState([]) // array de pedido_seq

  // Turnos de trabalho
  const [turnos, setTurnos] = useState([
    { id: 'TA', nome: 'Turno A', horasTrabalho: 8, horasParadas: 0, ativo: true },
    { id: 'TB', nome: 'Turno B', horasTrabalho: 8, horasParadas: 0, ativo: true },
    { id: 'TC', nome: 'Turno C', horasTrabalho: 8, horasParadas: 0, ativo: true }
  ])
  
  const [turnoEditando, setTurnoEditando] = useState(null)
  // Horas extras
  const [extrasDiaUtil, setExtrasDiaUtil] = useState(0)
  const [extrasSabado, setExtrasSabado] = useState(0)

  // Dados do sistema
  const { items: apontamentos } = useSupabase('apontamentos')
  const { items: pedidos } = useSupabase('pedidos')
  const { items: maquinas } = useSupabase('maquinas')
  
  // Importar planilha de cotação
  // Formato específico informado:
  // - Cabeçalho na linha 20 (1-index)
  // - Dados começam na linha 21
  // - Coluna C = Ferramenta, F = Comprimento (mm), I = Quantidade (pcs)
  // Observação: também suportamos CSV/XLSX genéricos (fallback)
  const importarCotacaoArquivo = async (file) => {
    if (!file) return
    try {
      const XLSX = await import('xlsx')
      const data = await file.arrayBuffer()
      const wb = XLSX.read(data, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const adicionados = []

      if (ws['!ref']) {
        // Tentar o formato específico por colunas
        const range = XLSX.utils.decode_range(ws['!ref'])
        // Dados a partir da linha 21 (1-index) => índice base 0: 20
        for (let r = 20; r <= range.e.r; r++) {
          const cellFerr = ws['C' + (r + 1)]
          const cellComp = ws['F' + (r + 1)]
          const cellQtd = ws['I' + (r + 1)]

          const ferramenta = (cellFerr?.v ?? '').toString().trim()
          const comprimentoMmRaw = cellComp?.v
          const quantidadeRaw = cellQtd?.v

          const comprimentoMm = comprimentoMmRaw != null && comprimentoMmRaw !== ''
            ? String(comprimentoMmRaw).toString().replace(',', '.')
            : ''
          const quantidade = quantidadeRaw != null && quantidadeRaw !== ''
            ? parseFloat(String(quantidadeRaw).toString().replace(',', '.')) || 0
            : 0

          // Ignorar linha se não houver quantidade e ferramenta
          if (!ferramenta && quantidade <= 0) continue

          // Preencher produto com a própria ferramenta (ajustável depois se necessário)
          const produto = ferramenta
          const descricao = ''
          const produtividadeManual = 0

          // Calcular com produtividade histórica se existir
          let estimativaHoras = 0
          let estimativaDias = 0
          let confiabilidade = 'Manual'
          const prodHist = produtividadePorProduto[produto]
          if (quantidade > 0) {
            if (prodHist && prodHist.pcsPorHora > 0) {
              estimativaHoras = quantidade / prodHist.pcsPorHora
              estimativaDias = estimativaHoras / (horasUteisSelecionadas || 1)
              confiabilidade = 'Histórica'
            } else {
              estimativaHoras = 0
              estimativaDias = 0
            }
          }

          adicionados.push({
            id: Date.now() + Math.random(),
            produto,
            descricao,
            quantidade,
            produtividadeManual,
            ferramenta,
            comprimentoMm,
            estimativaHoras: estimativaHoras.toFixed(2),
            estimativaDias: estimativaDias.toFixed(2),
            confiabilidade
          })
        }
      }

      // Fallback: se nada foi adicionado, tentar parse genérico
      if (adicionados.length === 0) {
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })
        rows.forEach((r) => {
          const produto = String(r.produto || r.Produto || '').trim()
          const descricao = String(r.descricao || r.Descricao || '').trim()
          const quantidade = parseFloat(r.quantidade || r.Qtd || r.volume || r.Volume || 0) || 0
          const produtividadeManual = parseFloat(r.produtividade || r['produtividade (pcs/h)'] || 0) || 0
          const ferramenta = String(r.ferramenta || r.Ferramenta || '').trim()
          const comprimentoMm = String(r.comprimento_mm || r.Comprimento || r['Comprimento (mm)'] || '').trim()
          if (!produto && !ferramenta) return
          if (!quantidade) return
          let estimativaHoras = 0
          let estimativaDias = 0
          let confiabilidade = 'Manual'
          if (produtividadeManual > 0) {
            estimativaHoras = quantidade / produtividadeManual
            estimativaDias = estimativaHoras / (horasUteisSelecionadas || 1)
          } else {
            const prodHist = produtividadePorProduto[produto]
            if (prodHist && prodHist.pcsPorHora > 0) {
              estimativaHoras = quantidade / prodHist.pcsPorHora
              estimativaDias = estimativaHoras / (horasUteisSelecionadas || 1)
              confiabilidade = 'Histórica'
            }
          }
          adicionados.push({
            id: Date.now() + Math.random(),
            produto: produto || ferramenta,
            descricao,
            quantidade,
            produtividadeManual,
            ferramenta,
            comprimentoMm,
            estimativaHoras: estimativaHoras.toFixed(1),
            estimativaDias: estimativaDias.toFixed(1),
            confiabilidade
          })
        })
      }

      if (adicionados.length) {
        setNovosPedidos(prev => [...prev, ...adicionados])
        setMostrarCotacao(false)
      }
    } catch (e) {
      console.error('Falha ao importar cotação:', e)
    }
  }

  // Carregar turnos, extras e configurações a partir do Supabase (fallback: localStorage)
  useEffect(() => {
    ;(async () => {
      try {
        // Tenta carregar do Supabase primeiro
        const turnosCfg = await supabaseService.obterConfiguracao('previsao_turnos')
        if (Array.isArray(turnosCfg) && turnosCfg.length) {
          setTurnos(turnosCfg)
        }

        const extrasCfg = await supabaseService.obterConfiguracao('previsao_extras')
        if (extrasCfg && typeof extrasCfg === 'object') {
          if (typeof extrasCfg.extrasDiaUtil === 'number') setExtrasDiaUtil(extrasCfg.extrasDiaUtil)
          if (typeof extrasCfg.extrasSabado === 'number') setExtrasSabado(extrasCfg.extrasSabado)
        }

        const prodCfg = await supabaseService.obterConfiguracao('previsao_produtividade')
        if (prodCfg && typeof prodCfg === 'object') {
          if (prodCfg.modo) setModoProdutividade(prodCfg.modo)
          if (typeof prodCfg.estimativaPcsPorDia === 'number' && prodCfg.estimativaPcsPorDia > 0) {
            setEstimativaPcsPorDia(prodCfg.estimativaPcsPorDia)
          } else {
            setEstimativaPcsPorDia(15000)
            await supabaseService.salvarConfiguracao('previsao_produtividade', { modo: 'estimativa', estimativaPcsPorDia: 15000 })
          }
        }
      } catch {}
    })()

    const turnosSalvos = localStorage.getItem('previsao_turnos')
    if (turnosSalvos) {
      setTurnos(JSON.parse(turnosSalvos))
    }
    const extras = localStorage.getItem('previsao_extras')
    if (extras) {
      try {
        const obj = JSON.parse(extras)
        if (typeof obj.extrasDiaUtil === 'number') setExtrasDiaUtil(obj.extrasDiaUtil)
        if (typeof obj.extrasSabado === 'number') setExtrasSabado(obj.extrasSabado)
      } catch {}
    }
    const configProd = localStorage.getItem('previsao_produtividade')
    if (configProd) {
      try {
        const obj = JSON.parse(configProd)
        if (obj.modo) setModoProdutividade(obj.modo)
        if (typeof obj.estimativaPcsPorDia === 'number' && obj.estimativaPcsPorDia > 0) {
          setEstimativaPcsPorDia(obj.estimativaPcsPorDia)
        } else {
          // Fallback padrão
          setEstimativaPcsPorDia(15000)
        }
      } catch {}
    } else {
      // Sem configuração prévia, aplica padrão
      setEstimativaPcsPorDia(15000)
    }
  }, [])

  // Garantir 15.000 pcs/dia quando o modo for 'estimativa'
  useEffect(() => {
    if (modoProdutividade === 'estimativa' && estimativaPcsPorDia !== 15000) {
      setEstimativaPcsPorDia(15000)
      // Persistir imediatamente
      try { localStorage.setItem('previsao_produtividade', JSON.stringify({ modo: 'estimativa', estimativaPcsPorDia: 15000 })) } catch {}
    }
  }, [modoProdutividade])

  // Salvar turnos no localStorage
  const salvarTurnos = async () => {
    try { await supabaseService.salvarConfiguracao('previsao_turnos', turnos) } catch {}
    try { localStorage.setItem('previsao_turnos', JSON.stringify(turnos)) } catch {}
  }
  const salvarExtras = async () => {
    const payload = { extrasDiaUtil, extrasSabado }
    try { await supabaseService.salvarConfiguracao('previsao_extras', payload) } catch {}
    try { localStorage.setItem('previsao_extras', JSON.stringify(payload)) } catch {}
  }
  const salvarConfigProdutividade = async () => {
    const payload = { modo: modoProdutividade, estimativaPcsPorDia }
    try { await supabaseService.salvarConfiguracao('previsao_produtividade', payload) } catch {}
    try { localStorage.setItem('previsao_produtividade', JSON.stringify(payload)) } catch {}
  }

  // Calcular horas base e horas úteis por dia considerando extras e tipo de dia
  const horasBase = useMemo(() => {
    return turnos
      .filter(turno => turno.ativo)
      .reduce((total, turno) => total + (turno.horasTrabalho - turno.horasParadas), 0)
  }, [turnos])

  const horasUteisDiaUtil = useMemo(() => horasBase + (extrasDiaUtil || 0), [horasBase, extrasDiaUtil])
  // Para sábado, consideramos apenas as horas extras de sábado (caso a operação aconteça somente como hora extra)
  const horasUteisSabado = useMemo(() => (extrasSabado || 0), [extrasSabado])
  const horasUteisSelecionadas = tipoDia === 'sabado' ? horasUteisSabado : horasUteisDiaUtil

  // Helpers locais: extrair ferramenta e comprimento a partir do código do produto
  const extrairComprimentoAcabado = (produto) => {
    if (!produto) return ''
    const resto = String(produto).slice(8)
    const match = resto.match(/^\d+/)
    const valor = match ? parseInt(match[0], 10) : null
    return Number.isFinite(valor) ? `${valor} mm` : ''
  }
  const extrairFerramenta = (produto) => {
    if (!produto) return ''
    const s = String(produto).toUpperCase()
    const re3 = /^([A-Z]{3})([A-Z0-9]+)/
    const re2 = /^([A-Z]{2})([A-Z0-9]+)/
    let letras = '', resto = '', qtd = 0
    let m = s.match(re3)
    if (m) { letras = m[1]; resto = m[2]; qtd = 3 }
    else {
      m = s.match(re2)
      if (!m) return ''
      letras = m[1]; resto = m[2]; qtd = 4
    }
    let nums = ''
    for (const ch of resto) {
      if (/[0-9]/.test(ch)) nums += ch
      else if (ch === 'O') nums += '0'
      if (nums.length === qtd) break
    }
    if (nums.length < qtd) nums = nums.padEnd(qtd, '0')
    return `${letras}-${nums}`
  }

  // Mapeamento de máquinas (ID -> Nome)
  const maquinasMap = useMemo(() => {
    const map = {}
    if (maquinas && maquinas.length > 0) {
      maquinas.forEach(maq => {
        if (maq.id && maq.nome) {
          map[String(maq.id)] = maq.nome
        }
      })
    }
    return map
  }, [maquinas])

  // Cálculo de produtividade baseado em apontamentos históricos
  const produtividadePorProduto = useMemo(() => {
    const stats = {}
    
    if (!apontamentos || apontamentos.length === 0) return stats

    apontamentos.forEach(apont => {
      if (!apont.produto || !apont.quantidade || !apont.inicio || !apont.fim) return
      
      const inicio = new Date(apont.inicio)
      const fim = new Date(apont.fim)
      const horasTrabalhadas = (fim - inicio) / (1000 * 60 * 60) // em horas
      
      if (horasTrabalhadas <= 0) return
      
      const produto = apont.produto
      const quantidade = parseFloat(apont.quantidade) || 0
      const pcsPorHora = quantidade / horasTrabalhadas
      
      if (!stats[produto]) {
        stats[produto] = {
          produto,
          totalPcs: 0,
          totalHoras: 0,
          registros: 0,
          maquinas: new Set(),
          operadores: new Set()
        }
      }
      
      stats[produto].totalPcs += quantidade
      stats[produto].totalHoras += horasTrabalhadas
      stats[produto].registros += 1
      // Usar nome da máquina em vez do ID
      const nomeMaquina = maquinasMap[String(apont.maquina)] || apont.maquina || 'N/A'
      stats[produto].maquinas.add(nomeMaquina)
      stats[produto].operadores.add(apont.operador)
    })

    // Calcular médias
    Object.keys(stats).forEach(produto => {
      const stat = stats[produto]
      stat.pcsPorHora = stat.totalPcs / stat.totalHoras
      // pcs/dia depende do tipo de dia selecionado (dia útil ou sábado)
      stat.pcsPorDia = stat.pcsPorHora * horasUteisSelecionadas
      stat.maquinasArray = Array.from(stat.maquinas)
      stat.operadoresArray = Array.from(stat.operadores)
    })

    return stats
  }, [apontamentos, horasUteisSelecionadas, maquinasMap])

  // Contadores para estatísticas
  const estatisticasPedidos = useMemo(() => {
    if (!pedidos || pedidos.length === 0) return { total: 0, concluidos: 0, saldoNegativo: 0, validos: 0 }
    
    const total = pedidos.length
    const concluidos = pedidos.filter(p => p.status === 'concluido').length
    const saldoNegativo = pedidos.filter(p => p.status !== 'concluido' && parseFloat(p.saldo_a_prod) <= 0).length
    const validos = pedidos.filter(p => p.status !== 'concluido' && parseFloat(p.saldo_a_prod) > 0).length
    
    return { total, concluidos, saldoNegativo, validos }
  }, [pedidos])

  // Estimativa para pedidos da carteira (lista exibida - NÃO filtra por seleção)
  const estimativaCarteira = useMemo(() => {
    if (!pedidos || pedidos.length === 0) return []
    
    let base = pedidos
      .filter(pedido => pedido.status !== 'concluido')
      .filter(pedido => parseFloat(pedido.saldo_a_prod) > 0) // Filtra apenas saldos positivos
      .filter(p => !filtroPedidoCliente || (p.pedido_cliente || '').toLowerCase().includes(filtroPedidoCliente.toLowerCase()))

    return base
      .map(pedido => {
        const produtividade = produtividadePorProduto[pedido.produto]
        const saldoProduzir = Math.max(0, parseFloat(pedido.saldo_a_prod) || 0) // Ignora valores negativos
        
        let estimativaHoras = 0
        let estimativaDias = 0
        let confiabilidade = 'Baixa'
        
        if (modoProdutividade === 'estimativa') {
          // Usar estimativa manual (peças por dia)
          if (saldoProduzir > 0 && estimativaPcsPorDia > 0) {
            // Cálculo correto: Dias = Peças / (Peças por dia)
            estimativaDias = saldoProduzir / estimativaPcsPorDia
            // Horas = Dias * Horas úteis por dia
            estimativaHoras = estimativaDias * (horasUteisSelecionadas || 24)
            confiabilidade = 'Estimativa'
          }
        } else {
          // Usar produtividade histórica (peças por hora)
          if (saldoProduzir > 0 && produtividade && produtividade.pcsPorHora > 0) {
            // Cálculo: Horas = Peças / (Peças por hora)
            estimativaHoras = saldoProduzir / produtividade.pcsPorHora
            // Dias = Horas / Horas úteis por dia
            estimativaDias = estimativaHoras / (horasUteisSelecionadas || 24)
            confiabilidade = produtividade.registros >= 5 ? 'Alta' : 
                            produtividade.registros >= 2 ? 'Média' : 'Baixa'
          }
        }
        
        return {
          ...pedido,
          produtividade,
          estimativaHoras: estimativaHoras.toFixed(2),
          estimativaDias: estimativaDias.toFixed(2),
          confiabilidade,
          saldoProduzir
        }
      })
      .sort((a, b) => new Date(a.dt_fatura) - new Date(b.dt_fatura))
  }, [pedidos, produtividadePorProduto, filtroPedidoCliente, horasUteisSelecionadas, modoProdutividade, estimativaPcsPorDia])

  // Itens efetivamente considerados no cálculo (quando há seleção, usa apenas selecionados)
  const itensParaCalculo = useMemo(() => {
    if (pedidosSelecionados.length === 0) return estimativaCarteira
    const setSel = new Set(pedidosSelecionados)
    return estimativaCarteira.filter(p => setSel.has(p.pedido_seq))
  }, [estimativaCarteira, pedidosSelecionados])

  // Filtrar dados
  const dadosFiltrados = useMemo(() => {
    let dados = abaSelecionada === 'carteira' ? estimativaCarteira : novosPedidos
    
    if (filtros.produto) {
      dados = dados.filter(item => 
        item.produto?.toLowerCase().includes(filtros.produto.toLowerCase())
      )
    }
    
    return dados
  }, [estimativaCarteira, novosPedidos, filtros, abaSelecionada])

  const handleFiltroChange = (e) => {
    const { name, value } = e.target
    setFiltros(prev => ({ ...prev, [name]: value }))
  }

  const adicionarNovoPedido = () => {
    if (!novoPedido.ferramenta || !novoPedido.quantidade) return
    
    const quantidade = parseFloat(novoPedido.quantidade) || 0
    const produtividadeManual = parseFloat(novoPedido.produtividadeManual) || 0
    
    let estimativaHoras = 0
    let estimativaDias = 0
    let confiabilidade = 'Manual'
    const produtoRef = (novoPedido.ferramenta || '').trim()

    if (produtividadeManual > 0) {
      estimativaHoras = quantidade / produtividadeManual
      estimativaDias = estimativaHoras / (horasUteisSelecionadas || 1)
    } else if (modoProdutividade === 'estimativa') {
      // Usar estimativa manual (peças por dia)
      if (quantidade > 0 && estimativaPcsPorDia > 0) {
        // Cálculo correto: Dias = Peças / (Peças por dia)
        estimativaDias = quantidade / estimativaPcsPorDia
        // Horas = Dias * Horas úteis por dia
        estimativaHoras = estimativaDias * (horasUteisSelecionadas || 24)
        confiabilidade = 'Estimativa'
      }
    } else {
      // Tentar usar produtividade histórica (peças por hora)
      const produtividade = produtividadePorProduto[produtoRef]
      if (produtividade && produtividade.pcsPorHora > 0) {
        // Cálculo: Horas = Peças / (Peças por hora)
        estimativaHoras = quantidade / produtividade.pcsPorHora
        // Dias = Horas / Horas úteis por dia
        estimativaDias = estimativaHoras / (horasUteisSelecionadas || 24)
        confiabilidade = 'Histórica'
      }
    }
    
    const pedido = {
      id: Date.now(),
      produto: produtoRef, // interno, não exibido
      descricao: '',
      quantidade,
      produtividadeManual,
      ferramenta: novoPedido.ferramenta,
      comprimentoMm: novoPedido.comprimentoMm,
      estimativaHoras: estimativaHoras.toFixed(2),
      estimativaDias: estimativaDias.toFixed(2),
      confiabilidade
    }
    
    setNovosPedidos(prev => [...prev, pedido])
    setNovoPedido({
      quantidade: '',
      produtividadeManual: '',
      ferramenta: '',
      comprimentoMm: ''
    })
  }

  const removerNovoPedido = (id) => {
    setNovosPedidos(prev => prev.filter(p => p.id !== id))
  }

  // Seleção via checkboxes na tabela
  const isPedidoSelecionado = (pedidoSeq) => pedidosSelecionados.includes(pedidoSeq)
  const togglePedidoSelecionado = (pedidoSeq) => {
    setPedidosSelecionados(prev => {
      const set = new Set(prev)
      if (set.has(pedidoSeq)) set.delete(pedidoSeq)
      else set.add(pedidoSeq)
      return Array.from(set)
    })
  }
  const selecionarTodosVisiveis = () => {
    setPedidosSelecionados(Array.from(new Set((dadosFiltrados || []).map(p => p.pedido_seq))))
  }
  const limparSelecao = () => setPedidosSelecionados([])

  // Funções para gerenciar turnos
  const editarTurno = (turno) => {
    setTurnoEditando({ ...turno })
  }

  const salvarTurno = () => {
    if (!turnoEditando) return
    
    setTurnos(prev => prev.map(t => 
      t.id === turnoEditando.id ? turnoEditando : t
    ))
    setTurnoEditando(null)
    salvarTurnos()
  }

  const cancelarEdicaoTurno = () => {
    setTurnoEditando(null)
  }

  const toggleTurnoAtivo = (turnoId) => {
    setTurnos(prev => prev.map(t => 
      t.id === turnoId ? { ...t, ativo: !t.ativo } : t
    ))
  }

  const totalEstimativaHoras = itensParaCalculo.reduce((acc, item) => 
    acc + parseFloat(item.estimativaHoras || 0), 0
  )
  
  const totalEstimativaDias = totalEstimativaHoras / (horasUteisSelecionadas || 1)

  // Data de término prevista considerando a sequência (arredonda para cima os dias)
  const dataTerminoPrevisto = useMemo(() => {
    try {
      const base = new Date(dataInicialPrevisao)
      const add = Math.max(0, Math.ceil(Number(totalEstimativaDias || 0)))
      if (isNaN(base.getTime())) return ''
      base.setDate(base.getDate() + add)
      return base.toLocaleDateString('pt-BR')
    } catch { return '' }
  }, [dataInicialPrevisao, totalEstimativaDias])

  // Gantt: calcular tarefas sequenciais a partir da data inicial selecionada (suporta frações de dia)
  const tarefasGantt = useMemo(() => {
    if (!itensParaCalculo || itensParaCalculo.length === 0) return []
    let itens = [...itensParaCalculo]
    if (ganttOrdenacao === 'prazo') {
      itens.sort((a, b) => {
        const da = a.dt_fatura ? new Date(a.dt_fatura).getTime() : Infinity
        const db = b.dt_fatura ? new Date(b.dt_fatura).getTime() : Infinity
        return da - db
      })
    } else if (ganttOrdenacao === 'estimativa') {
      itens.sort((a, b) => parseFloat(b.estimativaDias || 0) - parseFloat(a.estimativaDias || 0))
    } else if (ganttOrdenacao === 'comp_desc') {
      const getComp = (p) => {
        const dir = parseFloat(p.comprimentoMm)
        if (!isNaN(dir) && isFinite(dir)) return dir
        const str = extrairComprimentoAcabado(p.produto) || ''
        const num = parseFloat(String(str).replace(/[^0-9.]/g, ''))
        return isNaN(num) ? 0 : num
      }
      itens.sort((a, b) => getComp(b) - getComp(a))
    } else if (ganttOrdenacao === 'comp_asc') {
      const getComp = (p) => {
        const dir = parseFloat(p.comprimentoMm)
        if (!isNaN(dir) && isFinite(dir)) return dir
        const str = extrairComprimentoAcabado(p.produto) || ''
        const num = parseFloat(String(str).replace(/[^0-9.]/g, ''))
        return isNaN(num) ? 0 : num
      }
      itens.sort((a, b) => getComp(a) - getComp(b))
    } // 'sequencia' mantém ordem atual
    const inicioBase = new Date(dataInicialPrevisao)
    let cursorMs = inicioBase.getTime()
    let startIndex = 0 // em dias (pode ser fracionário)
    const tarefas = itens.map((p) => {
      const spanDias = Math.max(0, parseFloat(p.estimativaDias || 0)) // permite 0, mas trataremos exibição
      const inicio = new Date(cursorMs)
      const fim = new Date(cursorMs + spanDias * 24 * 60 * 60 * 1000)
      // Montagem do rótulo da tarefa: Pedido, Ferramenta, Comprimento
      const pedidoLbl = p.pedido_seq || p.id || ''
      const ferramentaLbl = extrairFerramenta(p.produto || p.ferramenta) || (p.ferramenta || '')
      const compLbl = p.comprimentoMm ? `${p.comprimentoMm} mm` : (extrairComprimentoAcabado(p.produto) || '')
      const tarefa = {
        id: p.pedido_seq || p.id,
        label: [pedidoLbl, ferramentaLbl, compLbl].filter(Boolean).join(' - '),
        produto: p.produto || p.ferramenta || '-',
        dias: spanDias,
        inicio,
        fim,
        startIndex,
        span: spanDias
      }
      // avançar cursor e índice (fracionário)
      cursorMs += spanDias * 24 * 60 * 60 * 1000
      startIndex += spanDias
      return tarefa
    })
    return tarefas
  }, [itensParaCalculo, dataInicialPrevisao, ganttOrdenacao])

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Previsão de Trabalho</h1>
        <p className="text-gray-600">Estimativas de tempo para conclusão de pedidos</p>
      </div>

      {/* Abas */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <div className="overflow-x-auto">
          <nav className="-mb-px flex space-x-8 whitespace-nowrap">
            <button
              onClick={() => setAbaSelecionada('carteira')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                abaSelecionada === 'carteira'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FaChartLine className="inline mr-2" />
              Carteira de Pedidos
            </button>
            <button
              onClick={() => setAbaSelecionada('manual')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                abaSelecionada === 'manual'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FaCalculator className="inline mr-2" />
              Estimativa Manual
            </button>
            <button
              onClick={() => setAbaSelecionada('turnos')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                abaSelecionada === 'turnos'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FaBusinessTime className="inline mr-2" />
              Turnos
            </button>
            <button
              onClick={() => setAbaSelecionada('produtividade')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                abaSelecionada === 'produtividade'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FaClock className="inline mr-2" />
              Histórico Produtividade
            </button>
            <button
              onClick={() => setAbaSelecionada('gantt')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                abaSelecionada === 'gantt'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FaProjectDiagram className="inline mr-2" />
              Gantt
            </button>
          </nav>
          </div>
        </div>
      </div>

      {/* Filtros */}
        <div className="bg-white p-3 rounded-lg shadow mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="min-w-0">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Produto
            </label>
            <input
              type="text"
              name="produto"
              value={filtros.produto}
              onChange={handleFiltroChange}
              className="w-full h-9 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Filtrar por produto..."
            />
          </div>
          <div className="min-w-0">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Pedido Cliente
            </label>
            <input
              type="text"
              value={filtroPedidoCliente}
              onChange={(e) => setFiltroPedidoCliente(e.target.value)}
              className="w-full h-9 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Filtrar por Pedido Cliente..."
            />
          </div>
          <div className="min-w-0">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Data Inicial da Previsão
            </label>
            <input
              type="date"
              value={dataInicialPrevisao}
              onChange={(e) => setDataInicialPrevisao(e.target.value)}
              className="w-full h-9 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="min-w-0">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Tipo de Dia
            </label>
            <select
              value={tipoDia}
              onChange={(e) => setTipoDia(e.target.value)}
              className="w-full h-9 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="dia_util">Dia Útil (turnos + extras)</option>
              <option value="sabado">Sábado (apenas extras de sábado)</option>
            </select>
          </div>
          <div className="min-w-0">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Horas Úteis Selecionadas
            </label>
            <input
              type="text"
              value={`${Number(horasUteisSelecionadas || 0).toFixed(2)}h`}
              readOnly
              className="w-full h-9 px-2 py-1.5 text-sm border border-gray-300 rounded-md bg-gray-100 text-gray-600"
            />
          </div>
          <div className="min-w-0">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Turnos Ativos
            </label>
            <input
              type="text"
              value={turnos.filter(t => t.ativo).map(t => t.id).join(', ')}
              readOnly
              className="w-full h-9 px-2 py-1.5 text-sm border border-gray-300 rounded-md bg-gray-100 text-gray-600"
            />
          </div>
        </div>
        
        {/* Configuração de Produtividade */}
        <div className="bg-blue-50 p-4 rounded-lg mt-4">
          <h4 className="text-sm font-medium text-gray-800 mb-3">Modo de Cálculo de Produtividade</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 gap-y-3 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Método de Cálculo
              </label>
              <select
                value={modoProdutividade}
                onChange={(e) => {
                  setModoProdutividade(e.target.value)
                  salvarConfigProdutividade()
                }}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="historica">Produtividade Histórica (Registrada)</option>
                <option value="estimativa">Estimativa Manual (Peças/Dia)</option>
              </select>
            </div>
            {modoProdutividade === 'estimativa' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estimativa (peças/dia)
                </label>
                <input
                  type="number"
                  value={estimativaPcsPorDia}
                  onChange={(e) => {
                    setEstimativaPcsPorDia(parseInt(e.target.value) || 15000)
                    salvarConfigProdutividade()
                  }}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="15000"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <div className="p-2 bg-white border border-gray-300 rounded-md text-sm text-gray-600">
                {modoProdutividade === 'historica' ? 
                  'Usando dados de apontamentos' : 
                  `${estimativaPcsPorDia.toLocaleString('pt-BR')} pcs/dia`
                }
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Seleção de Pedidos removida (uso de checkboxes na tabela) */}

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center">
            <FaClock className="text-blue-600 text-2xl mr-3" />
            <div>
              <p className="text-sm text-gray-600">Total Estimado</p>
              <p className="text-2xl font-bold text-blue-600">
                {totalEstimativaHoras.toFixed(2)}h
              </p>
            </div>
          </div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center">
            <FaChartLine className="text-green-600 text-2xl mr-3" />
            <div>
              <p className="text-sm text-gray-600">Dias de Trabalho</p>
              <p className="text-2xl font-bold text-green-600">
                {totalEstimativaDias.toFixed(2)} dias
              </p>
            </div>
          </div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="flex items-center">
            <FaCalculator className="text-yellow-600 text-2xl mr-3" />
            <div>
              <p className="text-sm text-gray-600">Itens</p>
              <p className="text-2xl font-bold text-yellow-600">
                {itensParaCalculo.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Aba: Gantt (renderização independente) */}
      {abaSelecionada === 'gantt' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Gantt da Previsão</h3>
            <p className="text-sm text-gray-600">Início: {new Date(dataInicialPrevisao).toLocaleDateString('pt-BR')} • Término previsto: {dataTerminoPrevisto || '-'}</p>
          </div>
          <div className="p-4 overflow-x-auto">
            {/* Controles Gantt */}
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700">Zoom</label>
                <input type="range" min="20" max="80" step="4" value={ganttZoomPX} onChange={(e)=>setGanttZoomPX(parseInt(e.target.value)||36)} />
                <span className="text-sm text-gray-500">{ganttZoomPX}px/dia</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700">Ordenar por</label>
                <select value={ganttOrdenacao} onChange={(e)=>setGanttOrdenacao(e.target.value)} className="p-1 border border-gray-300 rounded">
                  <option value="prazo">Prazo (dt_fatura)</option>
                  <option value="estimativa">Maior duração</option>
                  <option value="comprimento">Comprimento</option>
                  <option value="sequencia">Sequência atual</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={ganttSombrarFds} onChange={(e)=>setGanttSombrarFds(e.target.checked)} /> Sombrar finais de semana
              </label>
            </div>
            {tarefasGantt.length === 0 ? (
              <p className="text-gray-500">Nenhum item para exibir.</p>
            ) : (
              (() => {
                const totalSpan = tarefasGantt.reduce((acc, t) => acc + (parseFloat(t.span) || 0), 0)
                const diasTotais = Math.max(1, Math.ceil(totalSpan))
                const diaLargura = ganttZoomPX // px por dia
                const headers = Array.from({ length: diasTotais }, (_, i) => {
                  const d = new Date(dataInicialPrevisao)
                  d.setDate(d.getDate() + i)
                  return d
                })
                // Header de meses
                const meses = []
                let i = 0
                while (i < diasTotais) {
                  const d = headers[i]
                  const mes = d.getMonth()
                  let span = 0
                  while (i + span < diasTotais && headers[i + span].getMonth() === mes) span++
                  meses.push({ label: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }), span })
                  i += span
                }

                const hoje = new Date()
                const idxHoje = Math.floor((hoje - new Date(dataInicialPrevisao)) / (1000 * 60 * 60 * 24))

                return (
                  <div>
                    {/* Header de meses */}
                    <div className="grid" style={{ gridTemplateColumns: `220px repeat(${diasTotais}, ${diaLargura}px)` }}>
                      <div></div>
                      {meses.map((m, idx) => (
                        <div key={idx} className="text-xs text-center text-gray-700 font-medium border-b border-gray-200 flex items-center justify-center" style={{ gridColumn: `span ${m.span}` }}>
                          {m.label.toUpperCase()}
                        </div>
                      ))}
                    </div>
                    {/* Header de dias */}
                    <div className="grid" style={{ gridTemplateColumns: `220px repeat(${diasTotais}, ${diaLargura}px)` }}>
                      <div className="text-xs text-gray-400 pl-2">Tarefa</div>
                      {headers.map((d, idx) => (
                        <div key={idx} className={`text-[10px] text-center border-r border-gray-100 ${ganttSombrarFds && (d.getDay()===0 || d.getDay()===6) ? 'bg-gray-50 text-gray-400' : 'text-gray-400'}`}>
                          {d.getDate().toString().padStart(2, '0')}
                        </div>
                      ))}
                    </div>

                    {/* Grade + barras */}
                    <div className="relative">
                      {/* Marcador de hoje */}
                      {idxHoje >= 0 && idxHoje < diasTotais && (
                        <div className="absolute top-0 bottom-0 w-0.5 bg-red-500" style={{ left: `${220 + idxHoje * diaLargura}px` }}></div>
                      )}
                      {tarefasGantt.map((t) => {
                        // Buscar confiabilidade do item original
                        const itemOriginal = itensParaCalculo.find(item => (item.pedido_seq || item.id) === t.id)
                        const confiabilidade = itemOriginal?.confiabilidade || 'Baixa'
                        const cor = confiabilidade === 'Alta' ? 'bg-green-500' : 
                                   confiabilidade === 'Média' ? 'bg-yellow-500' : 
                                   confiabilidade === 'Estimativa' ? 'bg-purple-500' : 'bg-blue-500'
                        return (
                          <div key={t.id} className="grid items-center" style={{ gridTemplateColumns: `220px repeat(${diasTotais}, ${diaLargura}px)` }}>
                            <div className="text-sm text-gray-700 py-2 pr-3 truncate">{t.label}</div>
                            {headers.map((d, i) => (
                              <div key={i} className={`h-7 border-b border-r border-gray-100 ${ganttSombrarFds && (d.getDay()===0 || d.getDay()===6) ? 'bg-gray-50' : ''}`}></div>
                            ))}
                            {/* Barra posicionada por grid */}
                            <div className="col-start-2 col-end-[-1] -mt-7 relative" style={{ pointerEvents: 'none' }}>
                              <div className={`h-7 ${cor} rounded shadow-sm text-white text-[11px] flex items-center justify-center`}
                                   title={`${t.label} | ${t.inicio.toLocaleDateString('pt-BR')} → ${t.fim.toLocaleDateString('pt-BR')} | ${Number(t.span || 0).toFixed(2)} dia(s) | ${confiabilidade}`}
                                   style={{ position: 'absolute', left: `${t.startIndex * diaLargura}px`, width: `${Math.max(0.05, t.span) * diaLargura}px`, minWidth: '4px' }}>
                                {Number(t.span) < 1 ? `${(Number(t.span)*24).toFixed(1)}h` : `${Number(t.span).toFixed(1)}d`}
                              </div>
                              <div className="text-[10px] text-gray-500 mt-1" style={{ position: 'absolute', left: `${t.startIndex * diaLargura}px`, top: '28px' }}>
                                {t.inicio.toLocaleDateString('pt-BR')} → {t.fim.toLocaleDateString('pt-BR')}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()
            )}
          </div>
        </div>
      )}

      {/* Conteúdo das Abas */}
      {abaSelecionada === 'carteira' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Estimativa para Pedidos da Carteira
            </h3>
            <div className="mt-3 flex items-center gap-2">
              <button onClick={selecionarTodosVisiveis} className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">Selecionar todos</button>
              <button onClick={limparSelecao} className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300">Limpar seleção</button>
              {pedidosSelecionados.length > 0 && (
                <span className="text-sm text-gray-600">{pedidosSelecionados.length} selecionados</span>
              )}

      {abaSelecionada === 'gantt' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Gantt da Previsão</h3>
            <p className="text-sm text-gray-600">Início: {new Date(dataInicialPrevisao).toLocaleDateString('pt-BR')} • Término previsto: {dataTerminoPrevisto || '-'}</p>
          </div>
          <div className="p-4 overflow-x-auto">
            {/* Controles Gantt */}
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700">Zoom</label>
                <input type="range" min="20" max="80" step="4" value={ganttZoomPX} onChange={(e)=>setGanttZoomPX(parseInt(e.target.value)||36)} />
                <span className="text-sm text-gray-500">{ganttZoomPX}px/dia</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700">Ordenar por</label>
                <select value={ganttOrdenacao} onChange={(e)=>setGanttOrdenacao(e.target.value)} className="p-1 border border-gray-300 rounded">
                  <option value="prazo">Prazo (dt_fatura)</option>
                  <option value="estimativa">Maior duração</option>
                  <option value="comp_asc">Comprimento de AZ (menor → maior)</option>
                  <option value="comp_desc">Comprimento de ZA (maior → menor)</option>
                  <option value="sequencia">Sequência atual</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={ganttSombrarFds} onChange={(e)=>setGanttSombrarFds(e.target.checked)} /> Sombrar finais de semana
              </label>
            </div>
            {tarefasGantt.length === 0 ? (
              <p className="text-gray-500">Nenhum item para exibir.</p>
            ) : (
              (() => {
                const diasTotais = Math.max(1, tarefasGantt.reduce((acc, t) => acc + t.span, 0))
                const diaLargura = ganttZoomPX // px por dia
                const headers = Array.from({ length: diasTotais }, (_, i) => {
                  const d = new Date(dataInicialPrevisao)
                  d.setDate(d.getDate() + i)
                  return d
                })
                // Header de meses
                const meses = []
                let i = 0
                while (i < diasTotais) {
                  const d = headers[i]
                  const mes = d.getMonth()
                  let span = 0
                  while (i + span < diasTotais && headers[i + span].getMonth() === mes) span++
                  meses.push({ label: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }), span })
                  i += span
                }

                const hoje = new Date()
                const idxHoje = Math.floor((hoje - new Date(dataInicialPrevisao)) / (1000 * 60 * 60 * 24))

                return (
                  <div>
                    {/* Header de meses */}
                    <div className="grid" style={{ gridTemplateColumns: `220px repeat(${diasTotais}, ${diaLargura}px)` }}>
                      <div></div>
                      {meses.map((m, idx) => (
                        <div key={idx} className="text-xs text-center text-gray-700 font-medium border-b border-gray-200 flex items-center justify-center" style={{ gridColumn: `span ${m.span}` }}>
                          {m.label.toUpperCase()}
                        </div>
                      ))}
                    </div>
                    {/* Header de dias */}
                    <div className="grid" style={{ gridTemplateColumns: `220px repeat(${diasTotais}, ${diaLargura}px)` }}>
                      <div className="text-xs text-gray-400 pl-2">Tarefa</div>
                      {headers.map((d, idx) => (
                        <div key={idx} className={`text-[10px] text-center border-r border-gray-100 ${ganttSombrarFds && (d.getDay()===0 || d.getDay()===6) ? 'bg-gray-50 text-gray-400' : 'text-gray-400'}`}>
                          {d.getDate().toString().padStart(2, '0')}
                        </div>
                      ))}
                    </div>

                    {/* Grade + barras */}
                    <div className="relative">
                      {/* Marcador de hoje */}
                      {idxHoje >= 0 && idxHoje < diasTotais && (
                        <div className="absolute top-0 bottom-0 w-0.5 bg-red-500" style={{ left: `${220 + idxHoje * diaLargura}px` }}></div>
                      )}
                      {tarefasGantt.map((t) => {
                        const cor = t.confiabilidade === 'Alta' ? 'bg-green-500' : t.confiabilidade === 'Média' ? 'bg-yellow-500' : 'bg-blue-500'
                        return (
                          <div key={t.id} className="grid items-center" style={{ gridTemplateColumns: `220px repeat(${diasTotais}, ${diaLargura}px)` }}>
                            <div className="text-sm text-gray-700 py-2 pr-3 truncate">{t.label}</div>
                            {headers.map((d, i) => (
                              <div key={i} className={`h-7 border-b border-r border-gray-100 ${ganttSombrarFds && (d.getDay()===0 || d.getDay()===6) ? 'bg-gray-50' : ''}`}></div>
                            ))}
                            {/* Barra posicionada por grid */}
                            <div className="col-start-2 col-end-[-1] -mt-7 relative" style={{ pointerEvents: 'none' }}>
                              <div className={`h-7 ${cor} rounded shadow-sm text-white text-xs flex items-center justify-center`}
                                   title={`${t.label} | ${t.inicio.toLocaleDateString('pt-BR')} → ${t.fim.toLocaleDateString('pt-BR')} | ${t.span} dia(s)`}
                                   style={{ position: 'absolute', left: `${t.startIndex * diaLargura}px`, width: `${t.span * diaLargura}px` }}>
                                {t.span}d
                              </div>
                              <div className="text-[10px] text-gray-500 mt-1" style={{ position: 'absolute', left: `${t.startIndex * diaLargura}px`, top: '28px' }}>
                                {t.inicio.toLocaleDateString('pt-BR')} → {t.fim.toLocaleDateString('pt-BR')}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()
            )}
          </div>
        </div>
      )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      onChange={(e) => e.target.checked ? selecionarTodosVisiveis() : limparSelecao()}
                      checked={pedidosSelecionados.length > 0 && (dadosFiltrados || []).every(p => pedidosSelecionados.includes(p.pedido_seq))}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                      title="Selecionar todos"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pedido/Seq
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pedido Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Produto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Saldo a Produzir
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Produtividade (pcs/h)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estimativa (horas)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estimativa (dias)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Confiabilidade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prazo
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dadosFiltrados.map((pedido, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={isPedidoSelecionado(pedido.pedido_seq)}
                        onChange={() => togglePedidoSelecionado(pedido.pedido_seq)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {pedido.pedido_seq}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {pedido.pedido_cliente || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {pedido.produto}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {pedido.saldoProduzir?.toLocaleString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {pedido.produtividade ? pedido.produtividade.pcsPorHora.toFixed(1) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {pedido.estimativaHoras}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {pedido.estimativaDias}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        pedido.confiabilidade === 'Alta' ? 'bg-green-100 text-green-800' :
                        pedido.confiabilidade === 'Média' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {pedido.confiabilidade}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {pedido.dt_fatura ? new Date(pedido.dt_fatura).toLocaleDateString('pt-BR') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Importar Cotação */}
      {mostrarCotacao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Importar Formulário de Cotação</h4>
            <p className="text-sm text-gray-600 mb-4">Carregue um arquivo CSV/XLSX com as colunas: produto, descricao, quantidade, produtividade, ferramenta, comprimento_mm.</p>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={async (e) => {
              const file = e.target.files?.[0]
              await importarCotacaoArquivo(file)
            }} className="w-full mb-4" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setMostrarCotacao(false)} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {abaSelecionada === 'manual' && (
        <div className="space-y-6">
          {/* Formulário para adicionar novo pedido */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Adicionar Estimativa Manual
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ferramenta</label>
                <input
                  type="text"
                  value={novoPedido.ferramenta}
                  onChange={(e) => setNovoPedido(prev => ({ ...prev, ferramenta: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex.: TR-0018"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Comprimento (mm)</label>
                <input
                  type="number"
                  step="1"
                  value={novoPedido.comprimentoMm}
                  onChange={(e) => setNovoPedido(prev => ({ ...prev, comprimentoMm: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex.: 1100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Volume (pcs)
                </label>
                <input
                  type="number"
                  value={novoPedido.quantidade}
                  onChange={(e) => setNovoPedido(prev => ({ ...prev, quantidade: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Qtd a produzir (pcs)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Produtividade (pcs/h)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={novoPedido.produtividadeManual}
                  onChange={(e) => setNovoPedido(prev => ({ ...prev, produtividadeManual: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Opcional"
                />
              </div>
            </div>
            <button
              onClick={adicionarNovoPedido}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <FaPlus className="inline mr-2" />
              Adicionar
            </button>
            <button
              onClick={() => setMostrarCotacao(true)}
              className="ml-3 bg-indigo-600 text-white px-3 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              title="Importar formulário de cotação"
            >
              <FaFileImport className="inline mr-2" /> Importar Cotação
            </button>
          </div>

          {/* Lista de estimativas manuais */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Estimativas Manuais
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ferramenta
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Comprimento (mm)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Volume (pcs)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Produtividade (pcs/h)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estimativa (horas)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estimativa (dias)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Confiabilidade
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {novosPedidos.map((pedido) => (
                    <tr key={pedido.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {pedido.ferramenta || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {pedido.comprimentoMm || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {pedido.quantidade?.toLocaleString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {pedido.produtividadeManual ? Number(pedido.produtividadeManual).toFixed(1) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {pedido.estimativaHoras}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {pedido.estimativaDias}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          pedido.confiabilidade === 'Manual' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {pedido.confiabilidade}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <button
                          onClick={() => removerNovoPedido(pedido.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {abaSelecionada === 'produtividade' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Histórico de Produtividade por Produto
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Produto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Registros
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Produzido
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Horas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pcs/Hora
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pcs/Dia (8h)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Máquinas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Operadores
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.values(produtividadePorProduto).map((stat, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {stat.produto}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {stat.registros}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {stat.totalPcs.toLocaleString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {stat.totalHoras.toFixed(1)}h
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {stat.pcsPorHora.toFixed(1)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {stat.pcsPorDia.toFixed(1)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {stat.maquinasArray.join(', ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {stat.operadoresArray.join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {abaSelecionada === 'turnos' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Configuração de Turnos de Trabalho
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Configure os turnos para cálculos mais precisos de estimativas
            </p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 gap-4">
              {turnos.map((turno) => (
                <div key={turno.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={turno.ativo}
                        onChange={() => toggleTurnoAtivo(turno.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                      />
                      <h4 className={`text-lg font-medium ${turno.ativo ? 'text-gray-900' : 'text-gray-400'}`}>
                        {turno.nome} ({turno.id})
                      </h4>
                    </div>
                    <div className="flex items-center space-x-2">
                      {turnoEditando?.id === turno.id ? (
                        <>
                          <button
                            onClick={salvarTurno}
                            className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                          >
                            <FaSave className="inline mr-1" />
                            Salvar
                          </button>
                          <button
                            onClick={cancelarEdicaoTurno}
                            className="bg-gray-600 text-white px-3 py-1 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => editarTurno(turno)}
                          className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          Editar
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Horas de Trabalho
                      </label>
                      {turnoEditando?.id === turno.id ? (
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="24"
                          value={turnoEditando.horasTrabalho}
                          onChange={(e) => setTurnoEditando(prev => ({
                            ...prev,
                            horasTrabalho: parseFloat(e.target.value) || 0
                          }))}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                      ) : (
                        <div className="w-full p-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700">
                          {turno.horasTrabalho}h
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Horas de Paradas
                      </label>
                      {turnoEditando?.id === turno.id ? (
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="24"
                          value={turnoEditando.horasParadas}
                          onChange={(e) => setTurnoEditando(prev => ({
                            ...prev,
                            horasParadas: parseFloat(e.target.value) || 0
                          }))}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                      ) : (
                        <div className="w-full p-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700">
                          {turno.horasParadas}h
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Horas Úteis
                      </label>
                      <div className="w-full p-2 border border-gray-300 rounded-md bg-blue-50 text-blue-700 font-medium">
                        {turnoEditando?.id === turno.id 
                          ? (turnoEditando.horasTrabalho - turnoEditando.horasParadas).toFixed(1)
                          : (turno.horasTrabalho - turno.horasParadas).toFixed(1)
                        }h
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-medium text-blue-900">Resumo dos Turnos</h4>
                  <p className="text-sm text-blue-700">
                    Total de horas úteis por dia considerando todos os turnos ativos
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">
                    {horasBase}h/dia (turnos)
                  </div>
                  <div className="text-sm text-blue-600">{turnos.filter(t => t.ativo).length} turnos ativos</div>
                </div>
              </div>
            </div>

            {/* Horas Extras */}
            <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
              <h4 className="text-lg font-medium text-yellow-900 mb-3">Horas Extras</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Extras Dia Útil (h)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={extrasDiaUtil}
                    onChange={(e) => setExtrasDiaUtil(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Extras Sábado (h)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={extrasSabado}
                    onChange={(e) => setExtrasSabado(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex md:justify-end">
                  <button
                    onClick={salvarExtras}
                    className="self-end bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  >
                    <FaSave className="inline mr-2" /> Salvar Extras
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PrevisaoTrabalho
