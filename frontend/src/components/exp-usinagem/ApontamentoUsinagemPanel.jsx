import React, { useState, useEffect } from 'react'
import { FaUpload, FaPlus, FaList, FaSpinner, FaExclamationCircle, FaCheckCircle, FaPlay } from 'react-icons/fa'
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

const ApontamentoUsinagemPanel = ({
    alunicaBuckets,
    pedidosCarteira,
    importados,
    handleFileImport,
    handleManualSubmit,
    handleConfirmSelection,
    handleToggleManualForm,
    handleFileButtonClick,
    handleOpenSelection,
    handleManualFieldChange,
    handleOpenApontamento,
    manualPedido,
    showManualForm,
    importFeedback,
    isProcessingImport,
    fileInputRef,
    fluxoLoading,
    renderAlunicaActions,
    summarizeApontamentos,
    formatInteger,
    formatNumber,
    toIntegerRound,
    user
}) => {
    const orders = alunicaBuckets?.['para-usinar'] || []
    console.log('[ApontamentoUsinagem] Pedidos carregados:', orders)
    console.log('[ApontamentoUsinagem] Importados disponíveis:', importados)

    // Combinar pedidos do fluxo com importados disponíveis, removendo duplicatas
    const pedidosMap = new Map()

    // Adicionar pedidos do fluxo primeiro (prioridade)
    orders.forEach(pedido => {
        pedidosMap.set(pedido.id, pedido)
    })

        // Adicionar importados que não estão no fluxo
        ; (importados || []).forEach(imp => {
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

    const todosOsPedidos = Array.from(pedidosMap.values())
    console.log('[ApontamentoUsinagem] Todos os pedidos disponíveis (sem duplicatas):', todosOsPedidos)

    // Debug: mostrar estrutura do primeiro pedido importado
    if (importados && importados.length > 0) {
        console.log('[DEBUG] Estrutura do primeiro pedido importado:', importados[0])
        console.log('[DEBUG] Campos disponíveis:', Object.keys(importados[0]))
    }

    // Estado para máquinas
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
            maquina: '',
            lote: '',
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
                console.log('Máquinas carregadas:', data)
                // Mostrar todas as máquinas (remover filtro temporariamente)
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
        console.log('[DEBUG] Todos os campos:', Object.keys(pedido))
        console.log('[DEBUG] dados_originais:', pedido?.dados_originais)

        // Tentar encontrar o produto completo em vários campos
        const produtoCompleto = pedido?.produto ||
            pedido?.dados_originais?.produto ||
            pedido?.dados_originais?.ferramenta ||
            pedido?.ferramenta ||
            ''

        console.log('[DEBUG] Produto completo usado:', produtoCompleto)
        console.log('[DEBUG] Comprimento extraído:',
            extrairComprimentoAcabado(produtoCompleto))


        setApontamentoForm(prev => ({
            ...prev,
            pedidoSelecionado: pedido
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
            alert('Selecione uma máquina.')
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
            const produtoCompleto = apontamentoForm.pedidoSelecionado.produto ||
                apontamentoForm.pedidoSelecionado.dados_originais?.produto ||
                apontamentoForm.pedidoSelecionado.dados_originais?.ferramenta ||
                apontamentoForm.pedidoSelecionado.ferramenta ||
                ''
            const comprimentoStr = extrairComprimentoAcabado(produtoCompleto)
            const comprimentoNum = comprimentoStr ? parseInt(comprimentoStr.replace(/\D/g, '')) : null
            const payloadApontamento = {
                pedido_seq: apontamentoForm.pedidoSelecionado.pedido || apontamentoForm.pedidoSelecionado.pedidoSeq,
                pedido_cliente: apontamentoForm.pedidoSelecionado.numeroPedido || apontamentoForm.pedidoSelecionado.numero_pedido,
                produto: produtoCompleto,
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
                exp_stage: 'usinagem',
                tipo: 'usinagem',
                exp_unidade: 'PC',
                comprimento_acabado: comprimentoStr,
                comprimento_acabado_mm: comprimentoNum
            }

            console.log('[DEBUG] Salvando apontamento:', payloadApontamento)

            // Salvar no banco
            await supabaseService.add('apontamentos', payloadApontamento)

            // Sucesso
            alert('Apontamento salvo com sucesso!')

            // Limpar formulário
            const { inicio, fim } = getDefaultTimes()
            setApontamentoForm({
                pedidoSelecionado: null,
                operador: user?.nome || user?.email || '',
                maquina: '',
                lote: '',
                quantidade: '',
                inicio,
                fim,
                observacoes: ''
            })

            // Recarregar apontamentos se necessário
            loadApontamentos()

        } catch (error) {
            console.error('[ERRO] Ao salvar apontamento:', error)
            alert('Erro ao salvar apontamento. Verifique o console para mais detalhes.')
        }
    }

    const renderManualForm = () => (
        <form
            onSubmit={handleManualSubmit}
            className="mb-6 grid gap-3 rounded-md border border-dashed border-blue-200 bg-blue-50/40 p-4 text-sm text-gray-700 sm:grid-cols-4"
        >
            <div className="sm:col-span-1">
                <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">Pedido*</label>
                <input
                    type="text"
                    value={manualPedido.pedido}
                    onChange={handleManualFieldChange('pedido')}
                    className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200"
                    placeholder="Ex.: 84072/10"
                />
            </div>
            <div className="sm:col-span-1">
                <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">Cliente*</label>
                <input
                    type="text"
                    value={manualPedido.cliente}
                    onChange={handleManualFieldChange('cliente')}
                    className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200"
                    placeholder="Nome do cliente"
                />
            </div>
            <div className="sm:col-span-1">
                <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">Nº Pedido</label>
                <input
                    type="text"
                    value={manualPedido.numeroPedido}
                    onChange={handleManualFieldChange('numeroPedido')}
                    className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200"
                    placeholder="Pedido interno"
                />
            </div>
            <div className="sm:col-span-1">
                <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">Data Entrega</label>
                <input
                    type="date"
                    value={manualPedido.dataEntrega}
                    onChange={handleManualFieldChange('dataEntrega')}
                    className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200"
                />
            </div>
            <div className="sm:col-span-1">
                <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">Ferramenta</label>
                <input
                    type="text"
                    value={manualPedido.ferramenta}
                    onChange={handleManualFieldChange('ferramenta')}
                    className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200"
                    placeholder="Ex.: TR-0011"
                />
            </div>
            <div className="sm:col-span-1">
                <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">Pedido Kg</label>
                <input
                    type="text"
                    inputMode="decimal"
                    value={manualPedido.pedidoKg}
                    onChange={handleManualFieldChange('pedidoKg')}
                    className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200"
                    placeholder="Peso total"
                />
            </div>
            <div className="sm:col-span-1">
                <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">Pedido Pc</label>
                <input
                    type="number"
                    inputMode="numeric"
                    value={manualPedido.pedidoPc}
                    onChange={handleManualFieldChange('pedidoPc')}
                    className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200"
                    placeholder="Quantidade"
                />
            </div>
            <div className="flex flex-col gap-2 sm:col-span-1">
                <button
                    type="submit"
                    disabled={isProcessingImport}
                    className="inline-flex items-center justify-center rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    Salvar Pedido
                </button>
                <button
                    type="button"
                    onClick={handleToggleManualForm}
                    disabled={isProcessingImport}
                    className="inline-flex items-center justify-center rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    Cancelar
                </button>
            </div>
        </form>
    )

    const renderOrderList = () => {
        if (fluxoLoading) {
            return (
                <div className="flex h-40 items-center justify-center text-gray-500">
                    <FaSpinner className="mr-2 h-5 w-5 animate-spin" />
                    Carregando pedidos...
                </div>
            )
        }

        if (orders.length === 0) {
            return (
                <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-500">

                </div>
            )
        }

        return (
            <div className="space-y-4">
                {orders.map((pedido) => {
                    const lotesResumo = summarizeApontamentos(pedido.id)
                    const totalProduzido = lotesResumo.reduce((acc, r) => acc + (toIntegerRound(r.total) || 0), 0)
                    const pedidoPc = toIntegerRound(pedido.pedidoPcNumber || pedido.pedidoPc) || 0
                    const progresso = pedidoPc > 0 ? Math.min((totalProduzido / pedidoPc) * 100, 100) : 0

                    return (
                        <div key={pedido.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md">
                            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-gray-800">{pedido.pedido}</span>
                                        <span className="text-sm text-gray-500">| {pedido.cliente}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                        <span title="Ferramenta">🛠️ {pedido.ferramenta || '—'}</span>
                                        <span title="Entrega">📅 {pedido.dataEntrega}</span>
                                        <span title="Peso">⚖️ {formatNumber(pedido.pedidoKg)} kg</span>
                                        <span title="Peças">📦 {formatInteger(pedidoPc)} pc</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="flex flex-col items-end min-w-[120px]">
                                        <span className="text-xs font-semibold text-gray-500 uppercase">Progresso</span>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-lg font-bold text-blue-600">{formatInteger(totalProduzido)}</span>
                                            <span className="text-sm text-gray-400">/ {formatInteger(pedidoPc)}</span>
                                        </div>
                                        <div className="mt-1 h-1.5 w-full rounded-full bg-gray-100">
                                            <div
                                                className="h-1.5 rounded-full bg-blue-500 transition-all duration-500"
                                                style={{ width: `${progresso}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleOpenApontamento(pedido)}
                                            className="inline-flex items-center gap-2 rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700"
                                            title="Registrar Produção"
                                        >
                                            <FaPlay className="h-3.5 w-3.5" />
                                            <span>Registrar Produção</span>
                                        </button>

                                        <div className="border-l pl-2">
                                            {renderAlunicaActions(pedido)}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Detalhes dos Lotes (se houver produção) */}
                            {lotesResumo.length > 0 && (
                                <div className="mt-4 border-t pt-3">
                                    <p className="mb-2 text-xs font-semibold uppercase text-gray-500">Histórico de Produção</p>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full text-xs text-gray-600">
                                            <thead>
                                                <tr className="bg-gray-50 text-left">
                                                    <th className="px-2 py-1">Lote</th>
                                                    <th className="px-2 py-1 text-right">Qtd (Pc)</th>
                                                    <th className="px-2 py-1">Início</th>
                                                    <th className="px-2 py-1">Fim</th>
                                                    <th className="px-2 py-1">Obs</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {lotesResumo.map((lote) => (
                                                    <tr key={`${pedido.id}-${lote.lote}`}>
                                                        <td className="px-2 py-1 font-medium">{lote.lote}</td>
                                                        <td className="px-2 py-1 text-right">{formatInteger(lote.total)}</td>
                                                        <td className="px-2 py-1">{lote.inicio ? new Date(lote.inicio).toLocaleString() : '—'}</td>
                                                        <td className="px-2 py-1">{lote.fim ? new Date(lote.fim).toLocaleString() : '—'}</td>
                                                        <td className="px-2 py-1 truncate max-w-[200px]">{lote.obs || '—'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h2 className="text-lg font-semibold text-gray-800">Apontamento de Usinagem</h2>
                    <p className="text-sm text-gray-500">Gerencie a produção e registre apontamentos.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleFileButtonClick}
                            disabled={isProcessingImport}
                            className="inline-flex items-center gap-2 rounded-md border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <FaUpload className="h-4 w-4" />
                            <span>Importar</span>
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            onChange={handleFileImport}
                            className="hidden"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={handleToggleManualForm}
                        disabled={isProcessingImport}
                        className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <FaPlus className="h-4 w-4" />
                        <span>Novo Manual</span>
                    </button>
                </div>
            </div>

            {importFeedback.type && (
                <div
                    className={`flex items-center gap-2 rounded-md px-4 py-3 text-sm ${importFeedback.type === 'success'
                        ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border border-red-200 bg-red-50 text-red-600'
                        }`}
                >
                    {importFeedback.type === 'success' ? <FaCheckCircle /> : <FaExclamationCircle />}
                    {importFeedback.message}
                </div>
            )}

            {showManualForm && renderManualForm()}

            {/* Formulário de Apontamento Fixo */}
            <div className="rounded-lg border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-6 shadow-md">
                <h3 className="mb-4 text-lg font-bold text-gray-800">Novo Apontamento</h3>
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
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                placeholder="Nome do operador"
                                required
                            />
                        </div>

                        {/* Máquina */}
                        <div>
                            <label className="mb-1 block text-xs font-semibold uppercase text-gray-600">
                                Máquina
                            </label>
                            <select
                                value={apontamentoForm.maquina}
                                onChange={handleApontamentoFieldChange('maquina')}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                required
                                disabled={loadingMaquinas}
                            >
                                <option value="">
                                    {loadingMaquinas ? 'Carregando máquinas...' : 'Selecione a máquina'}
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
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
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

                        {/* Início */}
                        <div>
                            <label className="mb-1 block text-xs font-semibold uppercase text-gray-600">
                                Início
                            </label>
                            <input
                                type="datetime-local"
                                value={apontamentoForm.inicio}
                                onChange={handleApontamentoFieldChange('inicio')}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
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
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
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
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
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
                        {/* Quantidade Produzida */}
                        <div>
                            <label className="mb-1 block text-xs font-semibold uppercase text-gray-600">
                                Quantidade Produzida
                            </label>
                            <input
                                type="number"
                                value={apontamentoForm.quantidade}
                                onChange={handleApontamentoFieldChange('quantidade')}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                placeholder="Qtd produzida"
                                required
                                min="1"
                            />
                        </div>

                        {/* Separado */}
                        <div>
                            <label className="mb-1 block text-xs font-semibold uppercase text-gray-600">
                                Separado
                            </label>
                            <input
                                type="number"
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                placeholder="Qtd separada"
                            />
                        </div>
                    </div>

                    {/* Comprimento do Acabado */}
                    <div>
                        <label className="mb-1 block text-xs font-semibold uppercase text-gray-600">
                            Comprimento do Acabado
                        </label>
                        <input
                            type="text"
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-gray-50"
                            placeholder="Comprimento extraído do código"
                            value={apontamentoForm.pedidoSelecionado ? (
                                (() => {
                                    const produtoCompleto = apontamentoForm.pedidoSelecionado.produto ||
                                        apontamentoForm.pedidoSelecionado.dados_originais?.produto ||
                                        apontamentoForm.pedidoSelecionado.dados_originais?.ferramenta ||
                                        apontamentoForm.pedidoSelecionado.ferramenta ||
                                        ''
                                    return extrairComprimentoAcabado(produtoCompleto)
                                })()
                            ) : ''}
                            readOnly
                        />
                    </div>

                    {/* Observações */}
                    <div>
                        <label className="mb-1 block text-xs font-semibold uppercase text-gray-600">
                            Observações
                        </label>
                        <textarea
                            value={apontamentoForm.observacoes}
                            onChange={handleApontamentoFieldChange('observacoes')}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                            rows="3"
                            placeholder="Observações sobre a produção..."
                        />
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
                                    lote: '',
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
                            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                        >
                            Registrar Apontamento
                        </button>
                    </div>
                </form>
            </div>

            {/* Histórico de Apontamentos do Pedido Selecionado */}
            {apontamentoForm.pedidoSelecionado && (
                <div className="mt-6 rounded-lg border-2 border-green-200 bg-gradient-to-br from-green-50 to-white p-6 shadow-md">
                    <h3 className="mb-4 text-lg font-bold text-gray-800">
                        📊 Apontamentos do Pedido {apontamentoForm.pedidoSelecionado.pedido}
                    </h3>

                    {loadingApontamentos ? (
                        <div className="flex items-center justify-center py-8">
                            <FaSpinner className="h-6 w-6 animate-spin text-blue-600" />
                            <span className="ml-2 text-sm text-gray-600">Carregando apontamentos...</span>
                        </div>
                    ) : apontamentosDoPedido.length === 0 ? (
                        <div className="py-8 text-center text-sm text-gray-500">
                            Nenhum apontamento registrado para este pedido ainda.
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
                                            <span className="text-xs font-semibold text-gray-500">Máquina:</span>
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
                            <div className="mt-4 rounded-md bg-blue-50 p-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold text-gray-700">Total Produzido:</span>
                                    <span className="text-lg font-bold text-blue-600">
                                        {apontamentosDoPedido.reduce((sum, apont) => sum + (Number(apont.quantidade) || 0), 0)} PC
                                    </span>
                                </div>
                                <div className="mt-2 flex items-center justify-between">
                                    <span className="text-sm font-semibold text-gray-700">Qtd. Pedido:</span>
                                    <span className="text-sm font-medium text-gray-600">
                                        {apontamentoForm.pedidoSelecionado.pedidoPc || 0} PC
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

export default ApontamentoUsinagemPanel
