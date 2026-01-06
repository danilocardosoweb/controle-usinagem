import React, { useState, useEffect } from 'react'
import { FaBoxOpen, FaSpinner, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa'
import supabaseService from '../../services/SupabaseService'

// Helper para extrair comprimento do acabado a partir do código do produto
function extrairComprimentoAcabado(produto) {
  if (!produto) return ''
  
  // Extrair do campo Produto entre o 9º e 12º caractere (índices 8-11)
  const produtoStr = String(produto)
  if (produtoStr.length >= 12) {
    const comprimento = produtoStr.slice(8, 12) // Do 9º ao 12º caractere
    // Verificar se os 4 caracteres são números
    if (/^\d{4}$/.test(comprimento)) {
      return `${comprimento}mm`
    }
  }
  
  return ''
}

const ApontamentoEmbalagemPanel = ({
    alunicaBuckets,
    renderAlunicaActions,
    summarizeApontamentos,
    formatInteger,
    toIntegerRound,
    importados,
    user
}) => {
    const orders = alunicaBuckets?.['para-embarque'] || []
    console.log('[ApontamentoEmbalagem] Pedidos carregados:', orders)

    // Combinar pedidos do fluxo com importados disponíveis, removendo duplicatas
    const pedidosMap = new Map()

    // Adicionar pedidos do fluxo primeiro (prioridade)
    orders.forEach(pedido => {
        pedidosMap.set(pedido.id, pedido)
    })

    // Adicionar importados que não estão no fluxo (se houver necessidade de apontar embalagem para importados diretos)
    // Por enquanto, vamos focar nos que estão no fluxo 'para-embarque', mas manter a lógica de importados se o usuário quiser
    if (importados) {
        importados.forEach(imp => {
            if (!pedidosMap.has(imp.id)) {
                pedidosMap.set(imp.id, {
                    id: imp.id,
                    pedido: imp.pedido,
                    cliente: imp.cliente,
                    produto: imp.produto,
                    ferramenta: imp.ferramenta,
                    dataEntrega: imp.data_entrega,
                    pedidoPc: imp.pedido_pc,
                    item_perfil: imp.item_perfil,
                    item_do_cliente: imp.item_do_cliente,
                    _isImported: true
                })
            }
        })
    }

    const todosOsPedidos = Array.from(pedidosMap.values())

    // Estado para máquinas/bancadas (reutilizando tabela maquinas por enquanto)
    const [maquinas, setMaquinas] = useState([])
    const [loadingMaquinas, setLoadingMaquinas] = useState(true)

    // Estado para apontamentos do pedido selecionado
    const [apontamentosDoPedido, setApontamentosDoPedido] = useState([])
    const [loadingApontamentos, setLoadingApontamentos] = useState(false)

    // Função para formatar data para datetime-local input
    const formatDateTimeLocal = (date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        return `${year}-${month}-${day}T${hours}:${minutes}`
    }

    // Calcular data/hora inicial e final
    const getDefaultTimes = () => {
        const now = new Date()
        const fim = new Date(now.getTime() + 100 * 60 * 1000) // +100 minutos
        return {
            inicio: formatDateTimeLocal(now),
            fim: formatDateTimeLocal(fim)
        }
    }

    // Estado para o formulário de apontamento
    const [apontamentoForm, setApontamentoForm] = useState(() => {
        const { inicio, fim } = getDefaultTimes()
        return {
            pedidoSelecionado: null,
            operador: user?.nome || user?.email || '',
            maquina: '', // Pode ser bancada
            quantidade: '',
            inicio,
            fim,
            observacoes: ''
        }
    })

    // Carregar máquinas do banco
    useEffect(() => {
        const loadMaquinas = async () => {
            try {
                setLoadingMaquinas(true)
                const data = await supabaseService.getAll('maquinas')
                // Aqui poderíamos filtrar por setor 'Embalagem' se houvesse esse campo
                setMaquinas(data || [])
            } catch (error) {
                console.error('Erro ao carregar máquinas:', error)
                setMaquinas([])
            } finally {
                setLoadingMaquinas(false)
            }
        }
        loadMaquinas()
    }, [])

    // Atualizar operador quando user mudar
    useEffect(() => {
        setApontamentoForm(prev => ({
            ...prev,
            operador: user?.nome || user?.email || ''
        }))
    }, [user])

    // Carregar apontamentos quando um pedido for selecionado
    useEffect(() => {
        const loadApontamentos = async () => {
            if (!apontamentoForm.pedidoSelecionado?.id) {
                setApontamentosDoPedido([])
                return
            }

            try {
                setLoadingApontamentos(true)
                const data = await supabaseService.getAll('apontamentos')
                // Filtrar apontamentos do pedido selecionado
                const apontamentosFiltrados = (data || []).filter(
                    apont => apont.pedido_id === apontamentoForm.pedidoSelecionado.id
                )
                setApontamentosDoPedido(apontamentosFiltrados)
            } catch (error) {
                console.error('Erro ao carregar apontamentos:', error)
                setApontamentosDoPedido([])
            } finally {
                setLoadingApontamentos(false)
            }
        }

        loadApontamentos()
    }, [apontamentoForm.pedidoSelecionado?.id])

    const handleSelectPedido = (pedido) => {
        console.log('[DEBUG] Pedido selecionado:', pedido)
        console.log('[DEBUG] Produto:', pedido?.produto)
        console.log('[DEBUG] Ferramenta:', pedido?.ferramenta)
        console.log('[DEBUG] Comprimento extraído:', 
            extrairComprimentoAcabado(pedido?.produto || pedido?.ferramenta || ''))

        // Extrai campos dos dados_originais se não estiverem disponíveis diretamente
        const pedidoCompletado = {
            ...pedido,
            item_perfil: pedido?.item_perfil || pedido?.dados_originais?.item_perfil || '',
            item_do_cliente: pedido?.item_do_cliente || pedido?.dados_originais?.item_do_cliente || ''
        }

        setApontamentoForm(prev => ({
            ...prev,
            pedidoSelecionado: pedidoCompletado
        }))
    }

    const handleApontamentoFieldChange = (field) => (e) => {
        setApontamentoForm(prev => ({
            ...prev,
            [field]: e.target.value
        }))
    }

    const handleSubmitApontamento = async (e) => {
        e.preventDefault()
        
        // Validações
        if (!apontamentoForm.pedidoSelecionado) {
            alert('Selecione um pedido para continuar.')
            return
        }
        
        if (!apontamentoForm.operador) {
            alert('Informe o nome do operador.')
            return
        }
        
        if (!apontamentoForm.maquina) {
            alert('Selecione uma máquina/bancada.')
            return
        }
        
        if (!apontamentoForm.quantidade || parseFloat(apontamentoForm.quantidade) <= 0) {
            alert('Informe uma quantidade válida.')
            return
        }
        
        if (!apontamentoForm.inicio) {
            alert('Informe o horário de início.')
            return
        }
        
        if (!apontamentoForm.fim) {
            alert('Informe o horário de fim.')
            return
        }
        
        try {
            // Preparar payload do apontamento
            const produto = apontamentoForm.pedidoSelecionado.produto || apontamentoForm.pedidoSelecionado.ferramenta || ''
            const comprimentoStr = extrairComprimentoAcabado(produto)
            const comprimentoNum = comprimentoStr ? parseInt(comprimentoStr.replace(/\D/g, '')) : null
            const payloadApontamento = {
                pedido_seq: apontamentoForm.pedidoSelecionado.pedido || apontamentoForm.pedidoSelecionado.pedidoSeq,
                pedido_cliente: apontamentoForm.pedidoSelecionado.numeroPedido || apontamentoForm.pedidoSelecionado.numero_pedido,
                produto: produto,
                perfil_longo: apontamentoForm.pedidoSelecionado.item_perfil || apontamentoForm.pedidoSelecionado.item_do_cliente || '',
                cliente: apontamentoForm.pedidoSelecionado.cliente,
                operador: apontamentoForm.operador,
                maquina: apontamentoForm.maquina,
                inicio: new Date(apontamentoForm.inicio).toISOString(),
                fim: new Date(apontamentoForm.fim).toISOString(),
                quantidade: parseFloat(apontamentoForm.quantidade),
                lote: apontamentoForm.lote || '',
                observacoes: apontamentoForm.observacoes || '',
                exp_fluxo_id: apontamentoForm.pedidoSelecionado.id,
                exp_stage: 'embalagem',
                tipo: 'embalagem',
                exp_unidade: 'PC',
                comprimento_acabado: comprimentoStr,
                comprimento_acabado_mm: comprimentoNum
            }
            
            console.log('[DEBUG] Salvando apontamento de embalagem:', payloadApontamento)
            
            // Salvar no banco
            await supabaseService.add('apontamentos', payloadApontamento)
            
            // Sucesso
            alert('Apontamento de embalagem salvo com sucesso!')
            
            // Limpar formulário
            const { inicio, fim } = getDefaultTimes()
            setApontamentoForm({
                pedidoSelecionado: null,
                operador: user?.nome || user?.email || '',
                maquina: '',
                quantidade: '',
                inicio,
                fim,
                observacoes: ''
            })
            
            // Recarregar apontamentos se necessário
            loadApontamentos()
            
        } catch (error) {
            console.error('[ERRO] Ao salvar apontamento de embalagem:', error)
            alert('Erro ao salvar apontamento. Verifique o console para mais detalhes.')
        }
    }

    const renderOrderList = () => {
        if (orders.length === 0) {
            return (
                <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-500">
                    <FaBoxOpen className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                    <p>Nenhum pedido na fila de embalagem.</p>
                </div>
            )
        }

        return (
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">Fila de Embalagem</h3>
                {orders.map((pedido) => {
                    // Resumo específico para embalagem
                    const lotesResumo = summarizeApontamentos(pedido.id)
                    const totalEmbalado = lotesResumo.reduce((acc, r) => acc + (toIntegerRound(r.embalagem) || 0), 0) // Assumindo campo 'embalagem' ou similar
                    // Se não tiver campo específico de embalagem no resumo, usar total por enquanto ou ajustar summarizeApontamentos

                    return (
                        <div key={pedido.id} className="rounded-lg border border-orange-200 bg-white p-4 shadow-sm transition hover:shadow-md">
                            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-gray-800">{pedido.pedido}</span>
                                        <span className="text-sm text-gray-500">| {pedido.cliente}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                        <span title="Ferramenta">🛠️ {pedido.ferramenta || '—'}</span>
                                        <span title="Entrega">📅 {pedido.dataEntrega}</span>
                                        <span title="Peças">📦 {formatInteger(pedido.pedidoPc)} pc</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="border-l pl-4">
                                        {renderAlunicaActions(pedido)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-semibold text-gray-800">Apontamento de Embalagem</h2>
                <p className="text-sm text-gray-500">Registre a produção e finalize os pedidos para embarque.</p>
            </div>

            {/* Formulário de Apontamento Fixo */}
            <div className="rounded-lg border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white p-6 shadow-md">
                <h3 className="mb-4 text-lg font-bold text-gray-800">Novo Apontamento de Embalagem</h3>
                <form onSubmit={handleSubmitApontamento} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {/* Operador */}
                        <div>
                            <label className="mb-1 block text-xs font-semibold uppercase text-gray-600">
                                Operador
                            </label>
                            <input
                                type="text"
                                value={apontamentoForm.operador}
                                onChange={handleApontamentoFieldChange('operador')}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                                placeholder="Nome do operador"
                                required
                            />
                        </div>

                        {/* Máquina/Bancada */}
                        <div>
                            <label className="mb-1 block text-xs font-semibold uppercase text-gray-600">
                                Bancada / Máquina
                            </label>
                            <select
                                value={apontamentoForm.maquina}
                                onChange={handleApontamentoFieldChange('maquina')}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                                required
                                disabled={loadingMaquinas}
                            >
                                <option value="">
                                    {loadingMaquinas ? 'Carregando...' : 'Selecione'}
                                </option>
                                {maquinas.map(maquina => (
                                    <option key={maquina.id} value={maquina.nome || maquina.codigo}>
                                        {maquina.nome || maquina.codigo}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Pedido/Seq */}
                        <div>
                            <label className="mb-1 block text-xs font-semibold uppercase text-gray-600">
                                Pedido/Seq ✨ Todos
                            </label>
                            <select
                                value={apontamentoForm.pedidoSelecionado?.id || ''}
                                onChange={(e) => {
                                    const pedido = todosOsPedidos.find(p => p.id === e.target.value)
                                    handleSelectPedido(pedido)
                                }}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                                required
                            >
                                <option value="">Selecione o pedido</option>
                                {todosOsPedidos.map(pedido => {
                                    const isSelected = apontamentoForm.pedidoSelecionado?.id === pedido.id
                                    const displayText = isSelected
                                        ? pedido.pedido
                                        : `${pedido.pedido} - ${pedido.cliente} - ${pedido.produto || pedido.ferramenta || 'Sem produto'}`
                                    return (
                                        <option key={pedido.id} value={pedido.id}>
                                            {displayText}
                                        </option>
                                    )
                                })}
                            </select>
                        </div>

                        {/* Produto (auto-preenchido) */}
                        <div>
                            <label className="mb-1 block text-xs font-semibold uppercase text-gray-600">
                                📦 Produto
                            </label>
                            <input
                                type="text"
                                value={apontamentoForm.pedidoSelecionado?.produto || apontamentoForm.pedidoSelecionado?.ferramenta || ''}
                                className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
                                disabled
                                placeholder="Selecione um pedido"
                            />
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {/* Cliente (auto-preenchido) */}
                        <div>
                            <label className="mb-1 block text-xs font-semibold uppercase text-gray-600">
                                🏢 Cliente
                            </label>
                            <input
                                type="text"
                                value={apontamentoForm.pedidoSelecionado?.cliente || ''}
                                className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
                                disabled
                                placeholder="Selecione um pedido"
                            />
                        </div>

                        {/* Comprimento do Acabado */}
                        <div>
                            <label className="mb-1 block text-xs font-semibold uppercase text-gray-600">
                                Comprimento do Acabado
                            </label>
                            <input
                                type="text"
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 bg-gray-50"
                                placeholder="Comprimento extraído do código"
                                value={apontamentoForm.pedidoSelecionado ? (
                                    extrairComprimentoAcabado(
                                        apontamentoForm.pedidoSelecionado.produto || 
                                        apontamentoForm.pedidoSelecionado.ferramenta || ''
                                    )
                                ) : ''}
                                readOnly
                            />
                        </div>

                        {/* Início */}
                        <div>
                            <label className="mb-1 block text-xs font-semibold uppercase text-gray-600">
                                Início
                            </label>
                            <input
                                type="datetime-local"
                                value={apontamentoForm.inicio}
                                onChange={handleApontamentoFieldChange('inicio')}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                                required
                            />
                        </div>

                        {/* Fim */}
                        <div>
                            <label className="mb-1 block text-xs font-semibold uppercase text-gray-600">
                                Fim
                            </label>
                            <input
                                type="datetime-local"
                                value={apontamentoForm.fim}
                                onChange={handleApontamentoFieldChange('fim')}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                                required
                            />
                        </div>

                        {/* Data Fatura (Entrega) */}
                        <div>
                            <label className="mb-1 block text-xs font-semibold uppercase text-gray-600">
                                Dt Fatura (Entrega)
                            </label>
                            <input
                                type="text"
                                value={apontamentoForm.pedidoSelecionado?.dataEntrega || ''}
                                className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
                                disabled
                                placeholder="Selecione um pedido"
                            />
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {/* Qtd Pedido */}
                        <div>
                            <label className="mb-1 block text-xs font-semibold uppercase text-gray-600">
                                Qtd Pedido
                            </label>
                            <input
                                type="number"
                                value={apontamentoForm.pedidoSelecionado?.pedidoPc || ''}
                                className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
                                disabled
                            />
                        </div>

                        {/* Unidade */}
                        <div>
                            <label className="mb-1 block text-xs font-semibold uppercase text-gray-600">
                                Unidade
                            </label>
                            <input
                                type="text"
                                value="PC"
                                className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
                                disabled
                            />
                        </div>

                        {/* Nº OP */}
                        <div>
                            <label className="mb-1 block text-xs font-semibold uppercase text-gray-600">
                                Nº OP
                            </label>
                            <input
                                type="text"
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                                placeholder="Número da OP"
                            />
                        </div>

                        {/* Perfil Longo */}
                        <div>
                            <label className="mb-1 block text-xs font-semibold uppercase text-gray-600">
                                Perfil Longo
                            </label>
                            <input
                                type="text"
                                value={apontamentoForm.pedidoSelecionado?.item_do_cliente || apontamentoForm.pedidoSelecionado?.item_perfil || ''}
                                className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
                                disabled
                                placeholder="Selecione um pedido"
                            />
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        {/* Quantidade Embalada */}
                        <div>
                            <label className="mb-1 block text-xs font-semibold uppercase text-gray-600">
                                Quantidade Embalada
                            </label>
                            <input
                                type="number"
                                value={apontamentoForm.quantidade}
                                onChange={handleApontamentoFieldChange('quantidade')}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                                placeholder="Qtd embalada"
                                required
                                min="1"
                            />
                        </div>

                        {/* Observações */}
                        <div>
                            <label className="mb-1 block text-xs font-semibold uppercase text-gray-600">
                                Observações
                            </label>
                            <input
                                type="text"
                                value={apontamentoForm.observacoes}
                                onChange={handleApontamentoFieldChange('observacoes')}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                                placeholder="Observações..."
                            />
                        </div>
                    </div>

                    {/* Botões */}
                    <div className="flex items-center justify-end gap-3 border-t pt-4">
                        <button
                            type="button"
                            onClick={() => {
                                const { inicio, fim } = getDefaultTimes()
                                setApontamentoForm({
                                    pedidoSelecionado: null,
                                    operador: user?.nome || user?.email || '',
                                    maquina: '',
                                    quantidade: '',
                                    inicio,
                                    fim,
                                    observacoes: ''
                                })
                            }}
                            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                        >
                            ✏️ Limpar
                        </button>
                        <button
                            type="submit"
                            className="inline-flex items-center gap-2 rounded-md bg-orange-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700"
                        >
                            Registrar Embalagem
                        </button>
                    </div>
                </form>
            </div>

            {/* Histórico de Apontamentos do Pedido Selecionado */}
            {apontamentoForm.pedidoSelecionado && (
                <div className="mt-6 rounded-lg border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white p-6 shadow-md">
                    <h3 className="mb-4 text-lg font-bold text-gray-800">
                        📦 Histórico de Embalagem - {apontamentoForm.pedidoSelecionado.pedido}
                    </h3>

                    {loadingApontamentos ? (
                        <div className="flex items-center justify-center py-8">
                            <FaSpinner className="h-6 w-6 animate-spin text-orange-600" />
                            <span className="ml-2 text-sm text-gray-600">Carregando histórico...</span>
                        </div>
                    ) : apontamentosDoPedido.length === 0 ? (
                        <div className="py-8 text-center text-sm text-gray-500">
                            Nenhum registro de embalagem para este pedido.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {apontamentosDoPedido.map((apont, index) => (
                                <div
                                    key={apont.id || index}
                                    className="rounded-md border border-gray-200 bg-white p-4 shadow-sm"
                                >
                                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                        <div>
                                            <span className="text-xs font-semibold text-gray-500">Operador:</span>
                                            <p className="text-sm font-medium text-gray-800">{apont.operador || '-'}</p>
                                        </div>
                                        <div>
                                            <span className="text-xs font-semibold text-gray-500">Bancada:</span>
                                            <p className="text-sm font-medium text-gray-800">{apont.maquina || '-'}</p>
                                        </div>
                                        <div>
                                            <span className="text-xs font-semibold text-gray-500">Quantidade:</span>
                                            <p className="text-sm font-medium text-gray-800">{apont.quantidade || 0} PC</p>
                                        </div>
                                        <div>
                                            <span className="text-xs font-semibold text-gray-500">Data/Hora:</span>
                                            <p className="text-sm font-medium text-gray-800">
                                                {apont.inicio ? new Date(apont.inicio).toLocaleString('pt-BR') : '-'}
                                            </p>
                                        </div>
                                    </div>
                                    {apont.observacoes && (
                                        <div className="mt-2 border-t pt-2">
                                            <span className="text-xs font-semibold text-gray-500">Observações:</span>
                                            <p className="text-sm text-gray-700">{apont.observacoes}</p>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Resumo Total */}
                            <div className="mt-4 rounded-md bg-orange-50 p-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold text-gray-700">Total Embalado:</span>
                                    <span className="text-lg font-bold text-orange-600">
                                        {apontamentosDoPedido.reduce((sum, apont) => sum + (Number(apont.quantidade) || 0), 0)} PC
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {renderOrderList()}
        </div>
    )
}

export default ApontamentoEmbalagemPanel
