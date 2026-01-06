import { useState, useEffect, useMemo } from 'react'
import { FaArrowUp, FaArrowDown, FaEdit, FaSave, FaTimes, FaPlus, FaTrash, FaClock, FaExclamationTriangle, FaSearch, FaCheckSquare, FaSquare, FaCheckCircle, FaUndo } from 'react-icons/fa'
import supabaseService from '../services/SupabaseService'
import auditoriaService from '../services/AuditoriaService'
import { useAuth } from '../contexts/AuthContext'

const PCP = () => {
  const { user } = useAuth()
  
  const [prioridades, setPrioridades] = useState([])
  const [pedidos, setPedidos] = useState([])
  const [pedidosFinalizaveis, setPedidosFinalizaveis] = useState([])
  const [pedidosFinalizados, setPedidosFinalizados] = useState([])
  const [loading, setLoading] = useState(true)
  const [apontadoPorPedido, setApontadoPorPedido] = useState({}) // chave: pedido_seq, valor: soma quantidade apontada
  const [editando, setEditando] = useState(null)
  const [novaPrioridade, setNovaPrioridade] = useState({
    pedido_id: '',
    prioridade: 1,
    data_entrega: '',
    observacoes: '',
    status: 'pendente'
  })
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  
  // Modo de seleção: 'individual' | 'pedido_cliente'
  const [modoSelecao, setModoSelecao] = useState('individual')
  const [pedidoClienteBusca, setPedidoClienteBusca] = useState('')
  const [pedidoClienteResultados, setPedidoClienteResultados] = useState([])
  const [pedidoClienteSelecionados, setPedidoClienteSelecionados] = useState(new Set())
  const [buscando, setBuscando] = useState(false)
  const [sugestoesPedidoCliente, setSugestoesPedidoCliente] = useState([])
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false)
  const [selecionados, setSelecionados] = useState(new Set())
  const [abaAtiva, setAbaAtiva] = useState('prioridades')
  const [mostrarFinalizados, setMostrarFinalizados] = useState(false)

  const prioridadesOrdenadas = useMemo(() => {
    const lista = [...prioridades]
    return lista.sort((a, b) => {
      const flagA = a?.finalizado_manual ? 1 : 0
      const flagB = b?.finalizado_manual ? 1 : 0
      if (flagA !== flagB) return flagA - flagB
      return (a?.prioridade || 0) - (b?.prioridade || 0)
    })
  }, [prioridades])

  const prioridadesAtivas = useMemo(
    () => prioridadesOrdenadas.filter(p => !p?.finalizado_manual),
    [prioridadesOrdenadas]
  )

  const todosSelecionados = prioridadesAtivas.length > 0 && selecionados.size === prioridadesAtivas.length

  const listaFinalizacao = useMemo(() => {
    const base = mostrarFinalizados ? [...pedidosFinalizaveis, ...pedidosFinalizados] : pedidosFinalizaveis
    const mapa = new Map()
    for (const item of base) {
      if (!item) continue
      if (!mapa.has(item.id)) {
        mapa.set(item.id, item)
      }
    }
    return Array.from(mapa.values())
  }, [mostrarFinalizados, pedidosFinalizaveis, pedidosFinalizados])

  useEffect(() => {
    carregarDados()
  }, [])

  // Carrega somatório "Apontado" para a lista de pedidos informada
  const carregarApontados = async (listaPedidos) => {
    const unicos = Array.from(new Set((listaPedidos || []).filter(Boolean)))
    if (unicos.length === 0) {
      setApontadoPorPedido({})
      return {}
    }

    const mapa = {}
    const acumularQuantidade = (dados, camposPossiveis) => {
      for (const registro of dados || []) {
        const quantidade = Number(registro?.quantidade ?? registro?.quantidade_produzida ?? 0)
        if (!Number.isFinite(quantidade) || quantidade === 0) continue
        for (const campo of camposPossiveis) {
          if (!(campo in (registro || {}))) continue
          const valor = String(registro[campo] || '').trim()
          if (!valor) continue
          mapa[valor] = (mapa[valor] || 0) + quantidade
        }
      }
    }

    const tentarCarregarPorCampo = async (campo, aliases) => {
      try {
        const dados = await supabaseService.getByIn('apontamentos', campo, unicos)
        acumularQuantidade(dados, aliases)
        return true
      } catch (error) {
        if (error?.code === '42703') {
          // Estrutura incompatível: será tratado com fallback
          return false
        }
        console.warn(`Não foi possível carregar apontamentos por ${campo}:`, error?.message || error)
        return true
      }
    }

    const suportePedidoSeq = await tentarCarregarPorCampo('pedido_seq', ['pedido_seq', 'pedidoSeq'])
    const suporteOrdemTrabalho = await tentarCarregarPorCampo('ordem_trabalho', ['ordem_trabalho', 'ordemTrabalho'])

    if ((!suportePedidoSeq || !suporteOrdemTrabalho) && Object.keys(mapa).length === 0) {
      try {
        const todos = await supabaseService.getAll('apontamentos')
        acumularQuantidade(todos, ['pedido_seq', 'pedidoSeq', 'ordem_trabalho', 'ordemTrabalho'])
      } catch (error) {
        console.warn('Não foi possível carregar apontamentos (fallback):', error?.message || error)
      }
    }

    setApontadoPorPedido(mapa)
    return mapa
  }

  const carregarDados = async () => {
    try {
      setLoading(true)

      const [prioridadesData, pedidosData] = await Promise.all([
        supabaseService.getAll('pcp_prioridades'),
        supabaseService.getAll('pedidos')
      ])

      const mapaApontados = await carregarApontados(pedidosData.map(p => p.pedido_seq).filter(Boolean))

      const pedidosComDados = pedidosData.map((p) => {
        const apontado = Number(mapaApontados[p.pedido_seq] || 0)
        return {
          ...p,
          apontadoManual: apontado
        }
      })

      setPrioridades(prioridadesData.sort((a, b) => (a?.prioridade || 0) - (b?.prioridade || 0)))

      const naoFinalizados = pedidosComDados.filter(p => !p.finalizado_manual)
      const finalizados = pedidosComDados.filter(p => p.finalizado_manual)

      const elegiveis = naoFinalizados.filter(p => {
        const qtd = Number(p.qtd_pedido || 0)
        const apontado = Number(p.apontadoManual || 0)
        const saldo = Number(p.saldo_a_prod || 0)
        if (Number.isNaN(qtd)) return false
        if (!qtd) return false
        if (apontado >= qtd) return true
        if (saldo <= 0) return true
        return false
      })

      setPedidos(naoFinalizados)
      setPedidosFinalizaveis(elegiveis)
      setPedidosFinalizados(finalizados)

    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error)
      alert('Erro ao carregar dados do PCP: ' + (error.message || 'Erro desconhecido'))
    } finally {
      setLoading(false)
    }
  }

  const handleAdicionarPrioridade = async () => {
    if (modoSelecao === 'pedido_cliente') {
      await handleAdicionarPrioridadeEmLote()
      return
    }
    if (!novaPrioridade.pedido_id) {
      alert('Selecione um pedido')
      return
    }

    try {
      const pedidoSelecionado = pedidos.find(p => p.id === novaPrioridade.pedido_id)
      
      const dados = {
        ...novaPrioridade,
        pedido_numero: pedidoSelecionado?.pedido_seq || '',
        produto: pedidoSelecionado?.produto || '',
        quantidade: pedidoSelecionado?.qtd_pedido || 0,
        criado_por: user?.nome || user?.email || 'Sistema',
        criado_em: new Date().toISOString()
      }

      await supabaseService.add('pcp_prioridades', dados)
      
      // Registrar na auditoria
      await auditoriaService.registrarCriacao(
        user,
        'pcp',
        `Adicionou prioridade: ${dados.pedido_numero} - ${dados.produto}`,
        dados
      )
      
      setNovaPrioridade({
        pedido_id: '',
        prioridade: prioridades.length + 1,
        data_entrega: '',
        observacoes: '',
        status: 'pendente'
      })
      setMostrarFormulario(false)
      await carregarDados()
      
      alert('Prioridade adicionada com sucesso!')
    } catch (error) {
      console.error('Erro ao adicionar prioridade:', error)
      alert('Erro ao adicionar prioridade')
    }
  }

  // Atualizar sugestões conforme o usuário digita
  const handlePedidoClienteChange = (valor) => {
    setPedidoClienteBusca(valor)
    
    if (!valor || valor.trim().length < 2) {
      setSugestoesPedidoCliente([])
      setMostrarSugestoes(false)
      return
    }
    
    const termo = valor.trim().toLowerCase()
    // Buscar pedidos únicos por pedido_cliente
    const pedidosUnicos = new Map()
    pedidos.forEach(p => {
      const pc = String(p.pedido_cliente || '').trim()
      if (pc && pc.toLowerCase().includes(termo)) {
        if (!pedidosUnicos.has(pc)) {
          pedidosUnicos.set(pc, p)
        }
      }
    })
    
    const sugestoes = Array.from(pedidosUnicos.values())
      .slice(0, 10) // Limitar a 10 sugestões
      .map(p => ({
        pedido_cliente: p.pedido_cliente,
        cliente: p.cliente
      }))
    
    setSugestoesPedidoCliente(sugestoes)
    setMostrarSugestoes(sugestoes.length > 0)
  }
  
  // Selecionar uma sugestão
  const selecionarSugestao = (pedidoCliente) => {
    setPedidoClienteBusca(pedidoCliente)
    setMostrarSugestoes(false)
    // Buscar automaticamente após selecionar
    setTimeout(() => buscarPorPedidoCliente(pedidoCliente), 100)
  }

  // Busca por Pedido Cliente
  const buscarPorPedidoCliente = async (termoBusca = null) => {
    try {
      setBuscando(true)
      const termo = (termoBusca || pedidoClienteBusca || '').trim().toLowerCase()
      if (!termo) {
        setPedidoClienteResultados([])
        setPedidoClienteSelecionados(new Set())
        return
      }
      const resultados = (pedidos || []).filter(p => String(p.pedido_cliente || '').toLowerCase().includes(termo))
      setPedidoClienteResultados(resultados)
      setPedidoClienteSelecionados(new Set())
      setMostrarSugestoes(false)
    } finally {
      setBuscando(false)
    }
  }

  const toggleSelecionado = (id) => {
    const next = new Set(pedidoClienteSelecionados)
    if (next.has(id)) next.delete(id); else next.add(id)
    setPedidoClienteSelecionados(next)
  }

  const selecionarTodos = () => {
    if (pedidoClienteSelecionados.size === pedidoClienteResultados.length) {
      setPedidoClienteSelecionados(new Set())
    } else {
      setPedidoClienteSelecionados(new Set(pedidoClienteResultados.map(p => p.id)))
    }
  }

  const handleAdicionarPrioridadeEmLote = async () => {
    if (!pedidoClienteResultados.length || pedidoClienteSelecionados.size === 0) {
      alert('Selecione pelo menos um item do Pedido Cliente')
      return
    }
    try {
      let ordemBase = (prioridades?.length || 0)
      for (const ped of pedidoClienteResultados) {
        if (!pedidoClienteSelecionados.has(ped.id)) continue
        const dados = {
          pedido_id: ped.id,
          prioridade: ++ordemBase,
          data_entrega: novaPrioridade.data_entrega || null,
          observacoes: novaPrioridade.observacoes || '',
          status: novaPrioridade.status || 'pendente',
          pedido_numero: ped.pedido_seq || '',
          produto: ped.produto || '',
          quantidade: ped.qtd_pedido || 0,
          criado_por: user?.nome || user?.email || 'Sistema',
          criado_em: new Date().toISOString()
        }
        await supabaseService.add('pcp_prioridades', dados)
        await auditoriaService.registrarCriacao(
          user,
          'pcp',
          `Adicionou prioridade (lote): ${dados.pedido_numero} - ${dados.produto}`,
          dados
        )
      }
      // Reset
      setPedidoClienteSelecionados(new Set())
      setPedidoClienteResultados([])
      setPedidoClienteBusca('')
      await carregarDados()
      alert('Prioridades em lote adicionadas com sucesso!')
    } catch (error) {
      console.error('Erro ao adicionar prioridades em lote:', error)
      alert('Erro ao adicionar prioridades em lote')
    }
  }

  const handleMoverPrioridade = async (index, direcao) => {
    const listaBase = prioridadesAtivas
    const novasPrioridades = [...listaBase]
    const novoIndex = direcao === 'cima' ? index - 1 : index + 1

    if (novoIndex < 0 || novoIndex >= novasPrioridades.length) return

    // Trocar posições
    const temp = novasPrioridades[index]
    novasPrioridades[index] = novasPrioridades[novoIndex]
    novasPrioridades[novoIndex] = temp

    // Atualizar prioridades
    try {
      for (let i = 0; i < novasPrioridades.length; i++) {
        await supabaseService.update('pcp_prioridades', {
          ...novasPrioridades[i],
          prioridade: i + 1
        })
      }
      await carregarDados()
    } catch (error) {
      console.error('Erro ao atualizar prioridades:', error)
      alert('Erro ao atualizar prioridades')
    }
  }

  const handleEditarPrioridade = (prioridade) => {
    setEditando({ ...prioridade })
  }

  const handleSalvarEdicao = async () => {
    try {
      await supabaseService.update('pcp_prioridades', editando)
      setEditando(null)
      await carregarDados()
      alert('Prioridade atualizada com sucesso!')
    } catch (error) {
      console.error('Erro ao atualizar prioridade:', error)
      alert('Erro ao atualizar prioridade')
    }
  }

  const handleExcluirPrioridade = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta prioridade?')) return

    try {
      await supabaseService.remove('pcp_prioridades', id)
      await carregarDados()
      alert('Prioridade excluída com sucesso!')
    } catch (error) {
      console.error('Erro ao excluir prioridade:', error)
      alert('Erro ao excluir prioridade')
    }
  }

  const toggleSelecionadoPrioridade = (id) => {
    const next = new Set(selecionados)
    if (next.has(id)) next.delete(id); else next.add(id)
    setSelecionados(next)
  }

  const selecionarTodosPrioridades = () => {
    if (todosSelecionados) {
      setSelecionados(new Set())
    } else {
      setSelecionados(new Set(prioridadesAtivas.map(p => p.id)))
    }
  }

  const handleExcluirSelecionados = async () => {
    if (selecionados.size === 0) return
    if (!window.confirm(`Excluir ${selecionados.size} registro(s) selecionado(s)?`)) return
    try {
      await supabaseService.removeMany('pcp_prioridades', Array.from(selecionados))
      setSelecionados(new Set())
      await carregarDados()
      alert('Registros selecionados excluídos com sucesso!')
    } catch (error) {
      console.error('Erro ao excluir selecionados:', error)
      alert('Erro ao excluir selecionados')
    }
  }

  const handleExcluirTodos = async () => {
    if (prioridades.length === 0) return
    if (!window.confirm('Excluir TODOS os registros da lista?')) return
    try {
      await supabaseService.removeMany('pcp_prioridades', prioridadesAtivas.map(p => p.id))
      setSelecionados(new Set())
      await carregarDados()
      alert('Todos os registros foram excluídos!')
    } catch (error) {
      console.error('Erro ao excluir todos:', error)
      alert('Erro ao excluir todos')
    }
  }

  const finalizarPedido = async (pedido) => {
    try {
      const payload = {
        id: pedido.id,
        finalizado_manual: true,
        finalizado_em: new Date().toISOString(),
        finalizado_por: user?.nome || user?.email || 'Sistema',
        status: 'concluido'
      }
      await supabaseService.update('pedidos', payload)
      await auditoriaService.registrarEdicao(
        user,
        'pcp',
        `Finalizou manualmente o pedido ${pedido.pedido_seq}`,
        pedido,
        payload
      )
      await carregarDados()
      alert(`Pedido ${pedido.pedido_seq} finalizado com sucesso!`)
    } catch (error) {
      console.error('Erro ao finalizar prioridade:', error)
      alert('Erro ao finalizar prioridade')
    }
  }

  const reabrirPedido = async (pedido) => {
    try {
      const payload = {
        id: pedido.id,
        finalizado_manual: false,
        finalizado_em: null,
        finalizado_por: null,
        status: 'em_producao'
      }
      await supabaseService.update('pedidos', payload)
      await auditoriaService.registrarEdicao(
        user,
        'pcp',
        `Reabriu manualmente o pedido ${pedido.pedido_seq}`,
        pedido,
        payload
      )
      await carregarDados()
      alert(`Pedido ${pedido.pedido_seq} reaberto com sucesso!`)
    } catch (error) {
      console.error('Erro ao reabrir prioridade:', error)
      alert('Erro ao reabrir prioridade')
    }
  }

  const getStatusColor = (status) => {
    const cores = {
      'pendente': 'bg-yellow-100 text-yellow-800',
      'em_producao': 'bg-blue-100 text-blue-800',
      'concluido': 'bg-green-100 text-green-800',
      'atrasado': 'bg-red-100 text-red-800'
    }
    return cores[status] || 'bg-gray-100 text-gray-800'
  }

  const getPrioridadeColor = (prioridade) => {
    if (prioridade <= 3) return 'bg-red-500 text-white'
    if (prioridade <= 6) return 'bg-orange-500 text-white'
    return 'bg-green-500 text-white'
  }

  const formatarData = (data) => {
    if (!data) return '-'
    return new Date(data).toLocaleDateString('pt-BR')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">PCP - Planejamento e Controle de Produção</h1>
        <p className="text-gray-600">Gerencie as prioridades de produção da usinagem</p>
      </div>

      {/* Abas principais do PCP */}
      <div className="mb-6">
        <div className="inline-flex rounded-md shadow-sm border border-gray-200 overflow-hidden">
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium transition-colors ${abaAtiva === 'prioridades' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            onClick={() => setAbaAtiva('prioridades')}
          >
            Prioridades
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium transition-colors border-l border-gray-200 ${abaAtiva === 'finalizacao' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            onClick={() => setAbaAtiva('finalizacao')}
          >
            Finalização Manual
          </button>
        </div>
      </div>

      {abaAtiva === 'prioridades' && (
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setMostrarFormulario(!mostrarFormulario)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FaPlus />
              {mostrarFormulario ? 'Cancelar' : 'Adicionar Prioridade'}
            </button>
            <button
              onClick={handleExcluirSelecionados}
              disabled={selecionados.size === 0}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400"
            >
              Excluir Selecionados ({selecionados.size})
            </button>
            <button
              onClick={handleExcluirTodos}
              disabled={prioridades.length === 0}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-400"
            >
              Excluir Todos
            </button>
          </div>
        </div>
      )}

      {/* Formulário de Nova Prioridade */}
      {mostrarFormulario && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Nova Prioridade</h2>
          {/* Abas simples de modo de seleção */}
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setModoSelecao('individual')}
              className={`px-3 py-1 rounded ${modoSelecao==='individual' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              Seleção Individual
            </button>
            <button
              type="button"
              onClick={() => setModoSelecao('pedido_cliente')}
              className={`px-3 py-1 rounded ${modoSelecao==='pedido_cliente' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              Por Pedido Cliente (grupo)
            </button>
          </div>

          {/* Modo Grupo: Pedido Cliente */}
          {modoSelecao === 'pedido_cliente' && (
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pedido Cliente</label>
                  <input
                    type="text"
                    value={pedidoClienteBusca}
                    onChange={(e) => handlePedidoClienteChange(e.target.value)}
                    onFocus={() => pedidoClienteBusca.length >= 2 && setSugestoesPedidoCliente.length > 0 && setMostrarSugestoes(true)}
                    onBlur={() => setTimeout(() => setMostrarSugestoes(false), 200)}
                    placeholder="Digite o número do Pedido do Cliente"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoComplete="off"
                  />
                  {/* Dropdown de sugestões */}
                  {mostrarSugestoes && sugestoesPedidoCliente.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                      {sugestoesPedidoCliente.map((sugestao, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => selecionarSugestao(sugestao.pedido_cliente)}
                          className="w-full text-left px-4 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none border-b last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">{sugestao.pedido_cliente}</div>
                          <div className="text-sm text-gray-500">{sugestao.cliente || 'Cliente não informado'}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => buscarPorPedidoCliente()}
                    disabled={buscando}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    <FaSearch /> {buscando ? 'Buscando...' : 'Buscar'}
                  </button>
                </div>
              </div>

              {/* Controles de Grupo: Data Entrega e Status */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Data de Entrega</label>
                  <input
                    type="date"
                    value={novaPrioridade.data_entrega}
                    onChange={(e) => setNovaPrioridade({ ...novaPrioridade, data_entrega: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={novaPrioridade.status}
                    onChange={(e) => setNovaPrioridade({ ...novaPrioridade, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pendente">Pendente</option>
                    <option value="em_producao">Em Produção</option>
                    <option value="concluido">Concluído</option>
                    <option value="atrasado">Atrasado</option>
                  </select>
                </div>
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Observações (opcional)</label>
                  <input
                    type="text"
                    value={novaPrioridade.observacoes}
                    onChange={(e) => setNovaPrioridade({ ...novaPrioridade, observacoes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Observações para o grupo"
                  />
                </div>
              </div>
              <div className="border rounded-md">
                <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b">
                  <span className="font-medium text-gray-700">Itens do Pedido Cliente</span>
                  <button type="button" onClick={selecionarTodos} className="text-blue-600 hover:underline text-sm">
                    {pedidoClienteSelecionados.size === pedidoClienteResultados.length ? 'Limpar seleção' : 'Selecionar todos'}
                  </button>
                </div>
                <div className="max-h-56 overflow-auto">
                  {pedidoClienteResultados.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-500">Nenhum item encontrado</div>
                  ) : (
                    pedidoClienteResultados.map(item => (
                      <label key={item.id} className="flex items-start gap-3 px-4 py-2 border-b last:border-b-0 cursor-pointer hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={pedidoClienteSelecionados.has(item.id)}
                          onChange={() => toggleSelecionado(item.id)}
                          className="mt-1"
                        />
                        <div className="text-sm text-gray-700">
                          <div className="font-medium">{item.pedido_seq} - {item.produto}</div>
                          <div className="text-gray-500">Qtd: {Number(item.qtd_pedido || 0).toLocaleString('pt-BR')} • Cliente: {item.cliente || '-'}</div>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAdicionarPrioridadeEmLote}
                  disabled={pedidoClienteSelecionados.size === 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                >
                  Salvar Grupo
                </button>
                <span className="text-sm text-gray-500 self-center">Selecionados: {pedidoClienteSelecionados.size}</span>
              </div>
            </div>
          )}

          {/* Modo Individual */}
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${modoSelecao==='pedido_cliente' ? 'opacity-60 pointer-events-none' : ''}`}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pedido</label>
              <select
                value={novaPrioridade.pedido_id}
                onChange={(e) => setNovaPrioridade({ ...novaPrioridade, pedido_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="">
                  {loading ? 'Carregando pedidos...' : 'Selecione um pedido'}
                </option>
                {loading ? (
                  <option disabled>Carregando...</option>
                ) : pedidos.length === 0 ? (
                  <option disabled>Nenhum pedido disponível</option>
                ) : (
                  pedidos.map(pedido => (
                    <option key={pedido.id} value={pedido.id}>
                      {pedido.pedido_seq} - {pedido.produto} - Qtd: {Number(pedido.qtd_pedido || 0).toLocaleString('pt-BR')} - {pedido.cliente || 'Cliente não informado'}
                    </option>
                  ))
                )}
              </select>
              {!loading && pedidos.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {pedidos.length} pedido(s) disponível(is)
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Data de Entrega</label>
              <input
                type="date"
                value={novaPrioridade.data_entrega}
                onChange={(e) => setNovaPrioridade({ ...novaPrioridade, data_entrega: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={novaPrioridade.status}
                onChange={(e) => setNovaPrioridade({ ...novaPrioridade, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="pendente">Pendente</option>
                <option value="em_producao">Em Produção</option>
                <option value="concluido">Concluído</option>
                <option value="atrasado">Atrasado</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Observações</label>
              <textarea
                value={novaPrioridade.observacoes}
                onChange={(e) => setNovaPrioridade({ ...novaPrioridade, observacoes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
                placeholder="Observações sobre esta prioridade..."
              />
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleAdicionarPrioridade}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Salvar
            </button>
            <button
              onClick={() => setMostrarFormulario(false)}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {abaAtiva === 'finalizacao' && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Finalização Manual de Pedidos</h2>
                <p className="text-gray-600 text-sm">
                  Utilize esta aba para finalizar ou reabrir pedidos manualmente. Consideramos elegível quem já possui quantidade apontada maior ou igual ao pedido, ou saldo a produzir menor ou igual a zero.
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={mostrarFinalizados}
                  onChange={(e) => setMostrarFinalizados(e.target.checked)}
                  className="h-4 w-4 text-blue-600"
                />
                Mostrar pedidos finalizados
              </label>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pedido</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produto</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qtd. Pedido</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Apontado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Separado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Saldo a Produzir</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {listaFinalizacao.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                        Nenhum pedido elegível para finalização no momento.
                      </td>
                    </tr>
                  ) : (
                    listaFinalizacao.map((pedido) => {
                        const qtd = Number(pedido.qtd_pedido || 0)
                        const apontado = Number(apontadoPorPedido[pedido.pedido_seq] || pedido.apontadoManual || 0)
                        const perc = qtd > 0 ? Math.round((apontado / qtd) * 100) : 0
                        return (
                          <tr key={`${pedido.id}-finalizacao`} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{pedido.pedido_seq}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{pedido.produto || '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{qtd.toLocaleString('pt-BR')}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <div className="flex items-center gap-2">
                                <span>{apontado.toLocaleString('pt-BR')}</span>
                                <span className={`text-xs font-medium ${apontado >= qtd ? 'text-green-600' : 'text-gray-500'}`}>({perc}%)</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{Number(pedido.separado || 0).toLocaleString('pt-BR')}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{Number(pedido.saldo_a_prod || 0).toLocaleString('pt-BR')}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <div className="flex gap-2">
                                {!pedido.finalizado_manual && (
                                  <button
                                    onClick={() => finalizarPedido(pedido)}
                                    className="px-3 py-1 bg-green-600 text-white text-xs font-semibold rounded-md hover:bg-green-700"
                                  >
                                    Finalizar
                                  </button>
                                )}
                                {pedido.finalizado_manual && (
                                  <button
                                    onClick={() => reabrirPedido(pedido)}
                                    className="px-3 py-1 bg-yellow-500 text-white text-xs font-semibold rounded-md hover:bg-yellow-600"
                                  >
                                    Reabrir
                                  </button>
                                )}
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
        </div>
      )}
    </div>
  )
}

export default PCP
