import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { FaPlus, FaTrash, FaEdit, FaSave, FaBoxes, FaExclamationTriangle, FaCheckCircle, FaSearch, FaSync, FaWarehouse, FaClipboardList, FaTimes, FaUser, FaWrench, FaRuler, FaTruck } from 'react-icons/fa'
import useSupabase from '../../hooks/useSupabase'
import supabaseService from '../../services/SupabaseService'
import { extrairFerramenta } from '../../utils/expUsinagem'
import GeradorRomaneio from './GeradorRomaneio'

const createTempId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`
const normalizarTexto = (value) => String(value || '').trim()
const formatQty = (value) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(Number(value) || 0)

const extrairComprimento = (produto) => {
  if (!produto) return ''
  const s = String(produto).toUpperCase()
  const match = s.match(/(\d{3,4})([A-Z]{2,4})?$/)
  return match ? match[1] : ''
}

const initialKitForm = {
  id: null,
  codigo: '',
  nome: '',
  cliente: '',
  produto_pai: '',
  observacoes: '',
  ativo: true,
}

const createInitialComponent = (ordem = 1) => ({
  tempId: createTempId(),
  produto: '',
  comprimento: '',
  quantidade_por_kit: '1',
  ordem,
})

function KitsPanel({ apontamentos = [], romaneios = [], romaneioItens = [], user, loadRomaneios, loadRomaneioItens }) {
  const {
    items: kits,
    loading: kitsLoading,
    error: kitsError,
    addItem: addKit,
    updateItem: updateKit,
    removeItem: removeKit,
    loadItems: loadKits,
  } = useSupabase('expedicao_kits')

  // Debug: Log quantidade de apontamentos recebidos
  useEffect(() => {
    console.log('🔍 KitsPanel - Apontamentos recebidos:', apontamentos.length)
    console.log('🔍 KitsPanel - Clientes únicos:', new Set(apontamentos.map(a => a.cliente)).size)
  }, [apontamentos])

  // Debug: Log kits carregados
  useEffect(() => {
    console.log('🎁 KitsPanel - Kits carregados:', kits.length)
    console.log('  Kits:', kits)
    kits.forEach(kit => {
      console.log(`  - ${kit.codigo}: cliente="${kit.cliente}", componentes=${kit.componentes?.length || 0}`)
    })
  }, [kits])

  const {
    items: componentes,
    loading: componentesLoading,
    error: componentesError,
    addItems: addComponentes,
    loadItems: loadComponentes,
    removeItem: removeComponente,
  } = useSupabase('expedicao_kit_componentes')

  const { items: ferramentasCfg } = useSupabase('ferramentas_cfg')

  const [subTab, setSubTab] = useState('expedicao')
  const [search, setSearch] = useState('')
  const [kitForm, setKitForm] = useState(initialKitForm)
  const [filterMode, setFilterMode] = useState('ferramenta')
  const [selectedFerramenta, setSelectedFerramenta] = useState('')
  const [selectedComprimento, setSelectedComprimento] = useState('')
  const [selectedProduto, setSelectedProduto] = useState('')
  const [componentesForm, setComponentesForm] = useState([createInitialComponent(1)])
  const [kitSaving, setKitSaving] = useState(false)
  const [kitMessage, setKitMessage] = useState(null)
  const [selectedKitId, setSelectedKitId] = useState(null)
  const [selectedRackIds, setSelectedRackIds] = useState([])
  const [kitsParaGerar, setKitsParaGerar] = useState(1)
  const [gerandoRomaneio, setGerandoRomaneio] = useState(false)
  const [filtroCliente, setFiltroCliente] = useState('')
  const [filtroFerramenta, setFiltroFerramenta] = useState('')
  const [geradorRomaneioAberto, setGeradorRomaneioAberto] = useState(false)

  // Enriquecer kits com seus componentes para o GeradorRomaneio
  const kitsComComponentes = useMemo(() => {
    return kits.map(kit => ({
      ...kit,
      componentes: (Array.isArray(componentes) ? componentes : []).filter((c) => String(c.kit_id) === String(kit.id))
    }))
  }, [kits, componentes])

  // Calcula quantidade expedida por produto
  const quantidadeExpedidaPorProduto = useMemo(() => {
    const expedidas = {}
    ;(Array.isArray(romaneioItens) ? romaneioItens : []).forEach((item) => {
      if (!item.produto) return
      if (!expedidas[item.produto]) expedidas[item.produto] = 0
      expedidas[item.produto] += item.quantidade || 0
    })
    return expedidas
  }, [romaneioItens])

  // Análise de apontamentos para extrair Ferramenta, Comprimento e Produto
  // Os apontamentos já chegam filtrados (rack presente, não expedidos) de Expedicao.jsx
  const analiseApontamentos = useMemo(() => {
    const ferramentasMap = {}
    const produtosMap = {}
    const comprimentosMap = {}
    const combinacoesMap = {}

    // Agrupar quantidades por produto (somando todos os apontamentos do mesmo produto)
    const quantidadePorProduto = {}
    const clientesPorProduto = {}
    const paletesPorCombo = {}

    ;(Array.isArray(apontamentos) ? apontamentos : []).forEach((apt) => {
      if (!apt.produto) return
      const produto = apt.produto
      const qtd = apt.quantidade || 0
      const rack = apt.rack_acabado || apt.rackAcabado || apt.rack_ou_pallet || apt.rackOuPallet || ''

      if (!quantidadePorProduto[produto]) quantidadePorProduto[produto] = 0
      quantidadePorProduto[produto] += qtd

      if (!clientesPorProduto[produto]) clientesPorProduto[produto] = new Set()
      if (apt.cliente) clientesPorProduto[produto].add(apt.cliente)

      // Rastrear paletes por combo ferramenta+comprimento
      const ferramenta = extrairFerramenta(produto)
      const comprimento = extrairComprimento(produto)
      if (ferramenta && comprimento && rack) {
        const chave = `${ferramenta}|${comprimento}`
        if (!paletesPorCombo[chave]) paletesPorCombo[chave] = new Set()
        paletesPorCombo[chave].add(rack)
      }
    })

    // Construir maps a partir das quantidades agregadas
    Object.entries(quantidadePorProduto).forEach(([produto, quantidade]) => {
      const ferramenta = extrairFerramenta(produto)
      const comprimento = extrairComprimento(produto)
      const clientes = clientesPorProduto[produto] || new Set()

      if (ferramenta) {
        if (!ferramentasMap[ferramenta]) {
          ferramentasMap[ferramenta] = { ferramenta, quantidade: 0, produtos: new Set(), comprimentos: new Set() }
        }
        ferramentasMap[ferramenta].quantidade += quantidade
        ferramentasMap[ferramenta].produtos.add(produto)
        if (comprimento) ferramentasMap[ferramenta].comprimentos.add(comprimento)
      }

      if (!produtosMap[produto]) {
        produtosMap[produto] = { produto, quantidade: 0, ferramenta, comprimento, clientes: new Set() }
      }
      produtosMap[produto].quantidade += quantidade
      clientes.forEach(c => produtosMap[produto].clientes.add(c))

      if (comprimento) {
        if (!comprimentosMap[comprimento]) {
          comprimentosMap[comprimento] = { comprimento, quantidade: 0, ferramentas: new Set(), produtos: new Set() }
        }
        comprimentosMap[comprimento].quantidade += quantidade
        if (ferramenta) comprimentosMap[comprimento].ferramentas.add(ferramenta)
        comprimentosMap[comprimento].produtos.add(produto)
      }

      if (ferramenta && comprimento) {
        const chave = `${ferramenta}|${comprimento}`
        if (!combinacoesMap[chave]) {
          combinacoesMap[chave] = { ferramenta, comprimento, quantidade: 0, produtos: new Set(), paletes: paletesPorCombo[chave] || new Set() }
        }
        combinacoesMap[chave].quantidade += quantidade
        combinacoesMap[chave].produtos.add(produto)
      }
    })

    const resultado = {
      ferramentas: Object.values(ferramentasMap).sort((a, b) => b.quantidade - a.quantidade),
      produtos: Object.values(produtosMap).sort((a, b) => b.quantidade - a.quantidade),
      comprimentos: Object.values(comprimentosMap).sort((a, b) => b.quantidade - a.quantidade),
      combinacoes: Object.values(combinacoesMap).sort((a, b) => b.quantidade - a.quantidade),
    }
    
    console.log('📊 Análise de Apontamentos:')
    console.log('  - Ferramentas:', resultado.ferramentas.length)
    console.log('  - Produtos:', resultado.produtos.length)
    console.log('  - Clientes únicos:', new Set(resultado.produtos.flatMap(p => Array.from(p.clientes))).size)
    console.log('  - Combinações F+C:', resultado.combinacoes.length)
    
    return resultado
  }, [apontamentos, quantidadeExpedidaPorProduto])

  const kitsAtivos = useMemo(
    () => (Array.isArray(kits) ? kits : []).filter((kit) => kit?.ativo !== false),
    [kits],
  )

  // Dados filtrados por cliente e ferramenta
  const dadosFiltrados = useMemo(() => {
    let combinacoesFiltradas = analiseApontamentos.combinacoes
    let produtosFiltrados = analiseApontamentos.produtos
    let ferramentasFiltradas = analiseApontamentos.ferramentas

    // Filtro por cliente (aplicar PRIMEIRO)
    if (filtroCliente) {
      const clienteBusca = normalizarTexto(filtroCliente).toUpperCase()
      
      // Filtrar produtos por cliente
      produtosFiltrados = produtosFiltrados.filter((p) =>
        Array.from(p.clientes).some((c) =>
          normalizarTexto(c).toUpperCase().includes(clienteBusca)
        )
      )
      
      // Filtrar combinações por cliente
      const produtosFiltradosSet = new Set(produtosFiltrados.map(p => p.produto))
      combinacoesFiltradas = combinacoesFiltradas.filter((c) =>
        Array.from(c.produtos).some((prod) => produtosFiltradosSet.has(prod))
      )
      
      // Filtrar ferramentas por cliente
      ferramentasFiltradas = ferramentasFiltradas.filter((f) =>
        Array.from(f.produtos).some((prod) => produtosFiltradosSet.has(prod))
      )
    }

    // Filtro por ferramenta (aplicar DEPOIS)
    if (filtroFerramenta) {
      const ferramBusca = normalizarTexto(filtroFerramenta).toUpperCase()
      
      // Filtrar ferramentas
      ferramentasFiltradas = ferramentasFiltradas.filter((f) =>
        normalizarTexto(f.ferramenta).toUpperCase().includes(ferramBusca)
      )
      
      // Filtrar combinações
      combinacoesFiltradas = combinacoesFiltradas.filter((c) =>
        normalizarTexto(c.ferramenta).toUpperCase().includes(ferramBusca)
      )
      
      // Filtrar produtos
      const ferramentasFiltradosSet = new Set(ferramentasFiltradas.map(f => f.ferramenta))
      produtosFiltrados = produtosFiltrados.filter((p) =>
        ferramentasFiltradosSet.has(p.ferramenta)
      )
    }

    return {
      combinacoes: combinacoesFiltradas,
      produtos: produtosFiltrados,
      ferramentas: ferramentasFiltradas,
    }
  }, [analiseApontamentos, filtroCliente, filtroFerramenta])

  // Lista de clientes únicos para dropdown
  // Os apontamentos já chegam filtrados (rack presente, não expedidos) de Expedicao.jsx
  const clientesUnicos = useMemo(() => {
    const clientes = new Set()
    ;(Array.isArray(apontamentos) ? apontamentos : []).forEach((apt) => {
      if (apt.cliente) clientes.add(apt.cliente)
    })
    return Array.from(clientes).sort()
  }, [apontamentos])

  // Lista de ferramentas únicas para dropdown
  // Os apontamentos já chegam filtrados (rack presente, não expedidos) de Expedicao.jsx
  const ferramentasUnicas = useMemo(() => {
    const ferramentas = new Set()
    ;(Array.isArray(apontamentos) ? apontamentos : []).forEach((apt) => {
      if (!apt.produto) return
      const ferramenta = extrairFerramenta(apt.produto)
      if (ferramenta) ferramentas.add(ferramenta)
    })
    return Array.from(ferramentas).sort()
  }, [apontamentos])

  const refreshAll = useCallback(async () => {
    await loadKits()
    await loadComponentes()
  }, [loadKits, loadComponentes])

  useEffect(() => {
    refreshAll()
  }, [refreshAll])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-1">
        <div className="flex gap-6">
          <button
            onClick={() => setSubTab('expedicao')}
            className={`pb-3 text-sm font-bold transition-all ${subTab === 'expedicao' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <span className="flex items-center gap-2">
              <FaClipboardList className="w-4 h-4" /> Análise de Produção
            </span>
          </button>
          <button
            onClick={() => setSubTab('configuracoes')}
            className={`pb-3 text-sm font-bold transition-all ${subTab === 'configuracoes' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <span className="flex items-center gap-2">
              <FaBoxes className="w-4 h-4" /> Configuração de Kits
            </span>
          </button>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={refreshAll}
            className="mb-2 inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <FaSync className={kitsLoading || componentesLoading ? 'animate-spin' : ''} /> Atualizar Dados
          </button>
          <button
            type="button"
            onClick={() => setGeradorRomaneioAberto(true)}
            className="mb-2 inline-flex items-center gap-2 rounded-lg bg-orange-600 hover:bg-orange-700 px-4 py-1.5 text-xs font-bold text-white transition-colors shadow-md"
          >
            <FaTruck className="w-3.5 h-3.5" /> Gerar Romaneio
          </button>
        </div>
      </div>

      {(kitsError || componentesError || kitMessage) && (
        <div className="space-y-2">
          {kitsError && (
            <div className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
              <FaExclamationTriangle />
              <span>Tabela de kits ainda não disponível: {kitsError}</span>
            </div>
          )}
          {componentesError && (
            <div className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
              <FaExclamationTriangle />
              <span>Componentes de kits: {componentesError}</span>
            </div>
          )}
          {kitMessage && (
            <div className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm shadow-sm ${kitMessage.type === 'success' ? 'border-green-200 bg-green-50 text-green-800' : kitMessage.type === 'info' ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
              {kitMessage.type === 'success' ? <FaCheckCircle className="text-green-500" /> : <FaExclamationTriangle className={kitMessage.type === 'info' ? 'text-blue-500' : 'text-red-500'} />}
              <span>{kitMessage.text}</span>
              <button onClick={() => setKitMessage(null)} className="ml-auto text-gray-400 hover:text-gray-600">
                <FaTimes className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {subTab === 'expedicao' ? (
        <div className="space-y-6">
          {/* Mensagem de Erro/Sucesso no Formulário */}
          {kitMessage && (
            <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 shadow-sm ${kitMessage.type === 'success' ? 'border-green-300 bg-green-50 text-green-800' : kitMessage.type === 'info' ? 'border-blue-300 bg-blue-50 text-blue-800' : 'border-red-300 bg-red-50 text-red-800'}`}>
              {kitMessage.type === 'success' ? <FaCheckCircle className="text-green-600 mt-0.5 flex-shrink-0" /> : <FaExclamationTriangle className={`mt-0.5 flex-shrink-0 ${kitMessage.type === 'info' ? 'text-blue-600' : 'text-red-600'}`} />}
              <div className="flex-1">
                <p className="font-bold text-sm">{kitMessage.type === 'success' ? '✅ Sucesso!' : kitMessage.type === 'info' ? 'ℹ️ Informação' : '⚠️ Erro'}</p>
                <p className="text-sm mt-1">{kitMessage.text}</p>
              </div>
              <button onClick={() => setKitMessage(null)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                <FaTimes className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Análise de Produção - Filtros */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FaWrench className="text-blue-600" /> Análise de Produção
            </h3>
            
            {/* Filtros em linha */}
            <div className="grid gap-4 md:grid-cols-2 mb-6">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-2">Ferramenta</label>
                <select
                  value={filtroFerramenta}
                  onChange={(e) => setFiltroFerramenta(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none bg-white hover:border-gray-400 transition-colors"
                >
                  <option value="">Todas ({ferramentasUnicas.length})</option>
                  {ferramentasUnicas.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-2">Cliente</label>
                <select
                  value={filtroCliente}
                  onChange={(e) => setFiltroCliente(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none bg-white hover:border-gray-400 transition-colors"
                >
                  <option value="">Todos ({clientesUnicos.length})</option>
                  {clientesUnicos.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Botão Limpar Filtros */}
            {(filtroFerramenta || filtroCliente) && (
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => {
                    setFiltroFerramenta('')
                    setFiltroCliente('')
                  }}
                  className="text-xs font-bold text-gray-500 hover:text-red-600 flex items-center gap-1 transition-colors"
                >
                  <FaTimes className="w-3 h-3" /> Limpar Filtros
                </button>
              </div>
            )}

            {/* Cards de Resumo */}
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-lg bg-white p-4 border border-blue-100 shadow-sm text-center">
                <p className="text-[10px] font-bold text-gray-400 uppercase">Ferramentas</p>
                <p className="text-2xl font-black text-blue-600 mt-2">{dadosFiltrados.ferramentas.length}</p>
              </div>
              <div className="rounded-lg bg-white p-4 border border-blue-100 shadow-sm text-center">
                <p className="text-[10px] font-bold text-gray-400 uppercase">Produtos</p>
                <p className="text-2xl font-black text-blue-600 mt-2">{dadosFiltrados.produtos.length}</p>
              </div>
              <div className="rounded-lg bg-white p-4 border border-blue-100 shadow-sm text-center">
                <p className="text-[10px] font-bold text-gray-400 uppercase">Comprimentos</p>
                <p className="text-2xl font-black text-blue-600 mt-2">{analiseApontamentos.comprimentos.length}</p>
              </div>
              <div className="rounded-lg bg-white p-4 border border-blue-100 shadow-sm text-center">
                <p className="text-[10px] font-bold text-gray-400 uppercase">Combinações F+C</p>
                <p className="text-2xl font-black text-blue-600 mt-2">{dadosFiltrados.combinacoes.length}</p>
              </div>
            </div>

            {/* Modo de Seleção */}
            <div className="flex gap-3 mt-6 mb-6">
              <button
                onClick={() => setFilterMode('ferramenta')}
                className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${filterMode === 'ferramenta' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                <FaWrench className="w-4 h-4" /> Por Ferramenta + Comprimento
              </button>
              <button
                onClick={() => setFilterMode('produto')}
                className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${filterMode === 'produto' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                <FaBoxes className="w-4 h-4" /> Por Produto
              </button>
            </div>

            {/* Visualização por Ferramenta + Comprimento */}
            {filterMode === 'ferramenta' && (
              <div className="space-y-4">
                <h4 className="font-bold text-gray-800 text-sm">Combinações de Ferramenta + Comprimento</h4>
                {dadosFiltrados.combinacoes.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 italic">Nenhuma combinação encontrada com os filtros aplicados.</div>
                ) : (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {dadosFiltrados.combinacoes.map((combo) => (
                    <div key={`${combo.ferramenta}|${combo.comprimento}`} className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer group">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <p className="font-bold text-gray-800 text-sm flex items-center gap-2">
                            <FaWrench className="w-3 h-3 text-blue-500" /> {combo.ferramenta}
                          </p>
                          <p className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                            <FaRuler className="w-3 h-3" /> {combo.comprimento} mm
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-black text-blue-600 block">{formatQty(combo.quantidade)}</span>
                          <span className="text-[10px] text-gray-400 font-semibold flex items-center gap-1 justify-end mt-1">
                            <FaBoxes className="w-2.5 h-2.5" /> {combo.paletes?.size || 0} palete{combo.paletes?.size !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      <div className="text-[10px] text-gray-500 border-t border-gray-200 pt-2 mt-2">
                        <p className="font-bold mb-1">{combo.produtos.size} Produto(s):</p>
                        <div className="space-y-0.5">
                          {Array.from(combo.produtos).slice(0, 2).map((prod) => (
                            <p key={prod} className="truncate">{prod}</p>
                          ))}
                          {combo.produtos.size > 2 && <p className="text-gray-400">+{combo.produtos.size - 2} mais</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                )}
              </div>
            )}

            {/* Visualização por Produto */}
            {filterMode === 'produto' && (
              <div className="space-y-4">
                <h4 className="font-bold text-gray-800 text-sm">Produtos Disponíveis</h4>
                {dadosFiltrados.produtos.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 italic">Nenhum produto encontrado com os filtros aplicados.</div>
                ) : (
                <div className="max-h-[500px] overflow-y-auto pr-2">
                  <div className="space-y-2">
                    {dadosFiltrados.produtos.map((prod) => (
                      <div key={prod.produto} className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer group flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-gray-800 text-sm truncate">{prod.produto}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[10px] text-gray-500">
                            <span className="flex items-center gap-1">
                              <FaWrench className="w-2.5 h-2.5" /> {prod.ferramenta || '-'}
                            </span>
                            <span className="flex items-center gap-1">
                              <FaRuler className="w-2.5 h-2.5" /> {prod.comprimento || '-'} mm
                            </span>
                            <span className="flex items-center gap-1">
                              <FaUser className="w-2.5 h-2.5" /> {Array.from(prod.clientes).join(', ') || '-'}
                            </span>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-lg font-black text-blue-600">{formatQty(prod.quantidade)}</p>
                          <p className="text-[10px] text-gray-400">peças</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
          {/* Formulário de Cadastro */}
          <div className="space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    {kitForm.id ? <FaEdit className="text-blue-500" /> : <FaPlus className="text-green-500" />}
                    {kitForm.id ? 'Editar Kit' : 'Novo Kit'}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">Defina o código, nome e os produtos que compõem este kit.</p>
                </div>
                {kitForm.id && (
                  <button 
                    onClick={() => setKitForm(initialKitForm)}
                    className="text-xs font-bold text-gray-500 hover:text-gray-700 flex items-center gap-1"
                  >
                    <FaTimes /> Novo
                  </button>
                )}
              </div>

              <div className="grid gap-5 md:grid-cols-2 mb-6">
                <label className="block">
                  <span className="text-xs font-bold text-gray-600 uppercase mb-1.5 block">Código do Kit</span>
                  <input
                    type="text"
                    value={kitForm.codigo}
                    onChange={(e) => setKitForm((prev) => ({ ...prev, codigo: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none font-bold"
                    placeholder="Ex: KIT-ESCADA-01"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-gray-600 uppercase mb-1.5 block">Nome Descritivo</span>
                  <input
                    type="text"
                    value={kitForm.nome}
                    onChange={(e) => setKitForm((prev) => ({ ...prev, nome: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                    placeholder="Ex: Escada Alumínio 5 Degraus"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-gray-600 uppercase mb-1.5 block">Cliente</span>
                  <input
                    type="text"
                    value={kitForm.cliente}
                    onChange={(e) => setKitForm((prev) => ({ ...prev, cliente: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                    placeholder="Ex: Tramontina"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-gray-600 uppercase mb-1.5 block">Produto Pai (Referência)</span>
                  <input
                    type="text"
                    value={kitForm.produto_pai}
                    onChange={(e) => setKitForm((prev) => ({ ...prev, produto_pai: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                    placeholder="Ex: TG2012"
                  />
                </label>
              </div>

              <label className="block mb-6">
                <span className="text-xs font-bold text-gray-600 uppercase mb-1.5 block">Observações de Expedição</span>
                <textarea
                  value={kitForm.observacoes}
                  onChange={(e) => setKitForm((prev) => ({ ...prev, observacoes: e.target.value }))}
                  className="min-h-[80px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                  placeholder="Instruções especiais para montagem ou embalagem..."
                />
              </label>

              <div className="flex items-center gap-2 mb-6">
                <input
                  id="kit-ativo"
                  type="checkbox"
                  checked={kitForm.ativo}
                  onChange={(e) => setKitForm((prev) => ({ ...prev, ativo: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="kit-ativo" className="text-sm font-medium text-gray-700">Kit Ativo (Disponível para expedição)</label>
              </div>

              {/* Componentes */}
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                      <FaBoxes className="text-blue-500 w-4 h-4" /> Componentes do Kit
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">Produtos que compõem este kit com suas quantidades</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setComponentesForm([...componentesForm, createInitialComponent(componentesForm.length + 1)])}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 shadow-sm"
                  >
                    <FaPlus className="w-2.5 h-2.5" /> Adicionar
                  </button>
                </div>

                <div className="space-y-3">
                  {componentesForm.map((item, idx) => (
                    <div key={item.tempId} className="grid grid-cols-[1fr_100px_80px_60px_auto] items-end gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm group">
                      <label className="space-y-1">
                        <span className="text-[10px] font-bold text-gray-500 uppercase">Produto</span>
                        <input
                          type="text"
                          value={item.produto}
                          onChange={(e) => {
                            const novoComponentes = [...componentesForm]
                            novoComponentes[idx] = { ...item, produto: e.target.value }
                            setComponentesForm(novoComponentes)
                          }}
                          className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-400 focus:outline-none"
                          placeholder="Cód. Produto"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-[10px] font-bold text-gray-500 uppercase">Comprimento</span>
                        <input
                          type="text"
                          value={item.comprimento}
                          onChange={(e) => {
                            const novoComponentes = [...componentesForm]
                            novoComponentes[idx] = { ...item, comprimento: e.target.value }
                            setComponentesForm(novoComponentes)
                          }}
                          className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-400 focus:outline-none"
                          placeholder="Ex: 2081"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-[10px] font-bold text-gray-500 uppercase text-center block">Qtd</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={item.quantidade_por_kit}
                          onChange={(e) => {
                            const novoComponentes = [...componentesForm]
                            novoComponentes[idx] = { ...item, quantidade_por_kit: e.target.value }
                            setComponentesForm(novoComponentes)
                          }}
                          className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-400 focus:outline-none text-right font-bold"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-[10px] font-bold text-gray-500 uppercase text-center block">Ordem</span>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={item.ordem}
                          onChange={(e) => {
                            const novoComponentes = [...componentesForm]
                            novoComponentes[idx] = { ...item, ordem: e.target.value }
                            setComponentesForm(novoComponentes)
                          }}
                          className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-400 focus:outline-none text-center"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setComponentesForm(componentesForm.filter((_, i) => i !== idx))}
                        className="inline-flex h-8 w-8 items-center justify-center rounded border border-red-100 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all opacity-40 group-hover:opacity-100"
                      >
                        <FaTrash className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                {componentesForm.length === 0 && (
                  <div className="p-6 text-center text-gray-400 text-sm italic">
                    Nenhum componente adicionado. Clique em "Adicionar" para começar.
                  </div>
                )}
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  type="button"
                  onClick={async () => {
                    console.log('🔘 Botão SALVAR KIT clicado!')
                    setKitSaving(true)
                    try {
                      console.log('📋 Validando formulário...')
                      console.log('  - Código:', kitForm.codigo)
                      console.log('  - Nome:', kitForm.nome)
                      console.log('  - Componentes:', componentesForm.length)
                      
                      if (!kitForm.codigo || !kitForm.nome) {
                        console.log('❌ Erro: Código ou Nome vazio')
                        setKitMessage({ type: 'error', text: 'Código e Nome são obrigatórios.' })
                        setKitSaving(false)
                        return
                      }

                      if (componentesForm.length === 0) {
                        console.log('❌ Erro: Nenhum componente adicionado')
                        setKitMessage({ type: 'error', text: 'Adicione pelo menos um componente.' })
                        setKitSaving(false)
                        return
                      }

                      const kitData = {
                        codigo: normalizarTexto(kitForm.codigo),
                        nome: normalizarTexto(kitForm.nome),
                        cliente: normalizarTexto(kitForm.cliente),
                        produto_pai: normalizarTexto(kitForm.produto_pai),
                        observacoes: normalizarTexto(kitForm.observacoes),
                        ativo: kitForm.ativo,
                        criado_por: user?.nome || 'Sistema',
                      }

                      console.log('🎯 Iniciando salvamento do kit...')
                      let kitId = kitForm.id
                      console.log('📝 Dados do kit para salvar:', kitData)
                      
                      if (kitForm.id) {
                        console.log('🔄 Atualizando kit existente:', kitForm.id)
                        await updateKit(kitForm.id, kitData)
                      } else {
                        console.log('✨ Criando novo kit...')
                        try {
                          const novoKitId = await addKit(kitData)
                          console.log('📦 Retorno de addKit:', novoKitId)
                          kitId = novoKitId
                        } catch (err) {
                          console.error('❌ Erro ao adicionar kit:', err)
                          throw err
                        }
                      }

                      if (!kitId) throw new Error('Erro ao salvar kit - ID não retornado')

                      console.log('✅ Kit salvo com ID:', kitId)

                      // Salvar componentes
                      // Se estamos editando, deletar componentes antigos primeiro
                      if (kitForm.id) {
                        console.log('🗑️ Deletando componentes antigos do kit:', kitForm.id)
                        // Buscar componentes antigos
                        const componentesAntigos = componentes.filter((c) => c.kit_id === kitForm.id)
                        console.log('  - Componentes antigos encontrados:', componentesAntigos.length)
                        
                        // Deletar cada componente antigo
                        for (const comp of componentesAntigos) {
                          await removeComponente(comp.id)
                        }
                      }

                      const componentesParaSalvar = componentesForm
                        .filter((c) => c.produto)
                        .map((c) => ({
                          kit_id: kitId,
                          produto: normalizarTexto(c.produto),
                          comprimento: normalizarTexto(c.comprimento),
                          quantidade_por_kit: Number(c.quantidade_por_kit) || 1,
                          ordem: Number(c.ordem) || 0,
                        }))
                      
                      console.log('📦 Componentes para salvar:', componentesParaSalvar)

                      if (componentesParaSalvar.length > 0) {
                        await addComponentes(componentesParaSalvar)
                      }

                      setKitMessage({ type: 'success', text: `Kit "${kitForm.nome}" salvo com sucesso!` })
                      setKitForm(initialKitForm)
                      setComponentesForm([createInitialComponent(1)])
                      await refreshAll()
                    } catch (error) {
                      console.error('Erro ao salvar kit:', error)
                      setKitMessage({ type: 'error', text: error?.message || 'Erro ao salvar kit.' })
                    } finally {
                      setKitSaving(false)
                    }
                  }}
                  disabled={kitSaving}
                  className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-8 py-3 text-sm font-black text-white hover:bg-green-700 shadow-md hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 transition-all"
                >
                  <FaSave /> {kitSaving ? 'SALVANDO...' : 'SALVAR KIT'}
                </button>
              </div>
            </div>
          </div>

          {/* Painel Lateral: Kits Cadastrados */}
          <div className="space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm h-fit">
              <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FaBoxes className="text-gray-400" />
                Kits Cadastrados ({kitsAtivos.length})
              </h3>
              
              <div className="relative mb-4">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3 h-3" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-xs focus:border-blue-400 focus:outline-none"
                  placeholder="Buscar kit..."
                />
              </div>

              <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
                {kitsAtivos.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 italic text-sm">Nenhum kit cadastrado</div>
                ) : (
                  kitsAtivos.map((kit) => {
                    const comps = (Array.isArray(componentes) ? componentes : []).filter((c) => String(c.kit_id) === String(kit.id))
                    return (
                      <div key={kit.id} className="p-4 rounded-xl border border-gray-200 hover:border-blue-200 transition-all group relative overflow-hidden">
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${kit.ativo !== false ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-gray-800 text-sm tracking-tight">{kit.codigo}</span>
                              {kit.ativo === false && <span className="text-[8px] bg-gray-100 text-gray-500 px-1 py-0.5 rounded font-bold uppercase">Inativo</span>}
                            </div>
                            <p className="text-xs font-medium text-gray-500 truncate mt-0.5">{kit.nome}</p>
                            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                              <span className="text-[10px] text-gray-400 flex items-center gap-1 font-bold">
                                <FaUser className="w-2 h-2" /> {kit.cliente || '-'}
                              </span>
                              <span className="text-[10px] text-gray-400 flex items-center gap-1 font-bold">
                                <FaWarehouse className="w-2 h-2" /> {comps.length} Itens
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setKitForm(kit)
                                setComponentesForm(
                                  comps.map((c) => ({
                                    tempId: createTempId(),
                                    produto: c.produto,
                                    comprimento: c.comprimento || '',
                                    quantidade_por_kit: String(c.quantidade_por_kit),
                                    ordem: c.ordem,
                                  }))
                                )
                              }}
                              className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all"
                              title="Editar"
                            >
                              <FaEdit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={async () => {
                                if (window.confirm(`Deseja excluir o kit "${kit.codigo}"?`)) {
                                  try {
                                    await removeKit(kit.id)
                                    setKitMessage({ type: 'success', text: 'Kit excluído com sucesso.' })
                                    await refreshAll()
                                  } catch (error) {
                                    setKitMessage({ type: 'error', text: 'Erro ao excluir kit.' })
                                  }
                                }
                              }}
                              className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-red-600 hover:text-white transition-all"
                              title="Excluir"
                            >
                              <FaTrash className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Gerador de Romaneio */}
      <GeradorRomaneio
        isOpen={geradorRomaneioAberto}
        onClose={() => setGeradorRomaneioAberto(false)}
        apontamentos={apontamentos}
        kits={kitsComComponentes}
        onGerarRomaneio={async (dadosRomaneio) => {
          console.log('📋 Gerando romaneio:', dadosRomaneio)
          
          try {
            // Gerar número de romaneio no padrão: ROM-DDMMYYYY-NNNN
            const agora = new Date()
            const dia = String(agora.getDate()).padStart(2, '0')
            const mes = String(agora.getMonth() + 1).padStart(2, '0')
            const ano = agora.getFullYear()
            const sequencial = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
            const numeroRomaneio = `ROM-${dia}${mes}${ano}-${sequencial}`

            // Criar romaneio
            const romaneioData = {
              numero_romaneio: numeroRomaneio,
              cliente: dadosRomaneio.cliente,
              kit_id: dadosRomaneio.kitId,
              kit_codigo: dadosRomaneio.kitCodigo,
              kit_nome: dadosRomaneio.kitNome,
              quantidade_kits: dadosRomaneio.quantidadeKits,
              status: 'pendente',
              observacoes: `Romaneio gerado para ${dadosRomaneio.quantidadeKits} kits de ${dadosRomaneio.kitNome}`,
            }

            console.log('💾 Salvando romaneio:', romaneioData)
            
            // Salvar romaneio na tabela expedicao_romaneios
            const novoRomaneioId = await supabaseService.add('expedicao_romaneios', romaneioData)
            console.log('✅ Romaneio criado com ID:', novoRomaneioId)

            // Salvar itens do romaneio - buscar dados do apontamento original
            const itensRomaneio = dadosRomaneio.paletesParaSeparar.map(palete => {
              // Buscar apontamento original para pegar cliente, pedido, lote
              const apontamentoOriginal = apontamentos.find(apt => apt.id === palete.apontamentoId)
              
              // Calcular peso estimado
              // peso = peso_linear (kg/m) × comprimento (m) × quantidade
              let pesoEstimadoKg = 0
              if (ferramentasCfg && ferramentasCfg.length > 0) {
                // Buscar configuração da ferramenta
                const cfgFerramenta = ferramentasCfg.find(cfg => 
                  String(cfg.ferramenta || '').toUpperCase() === String(palete.ferramenta || '').toUpperCase()
                )
                
                if (cfgFerramenta && cfgFerramenta.peso_linear) {
                  const pesoLinear = Number(cfgFerramenta.peso_linear) || 0
                  const comprimentoM = (parseInt(palete.comprimento) || 0) / 1000
                  const quantidade = palete.quantidadeNecessaria || 0
                  pesoEstimadoKg = pesoLinear * comprimentoM * quantidade
                }
              }
              
              console.log(`🔍 Buscando apontamento:`, {
                apontamentoId: palete.apontamentoId,
                encontrado: !!apontamentoOriginal,
                rack: apontamentoOriginal?.rack_embalagem || palete.rack,
                pesoEstimado: pesoEstimadoKg,
              })
              
              return {
                romaneio_id: novoRomaneioId,
                ferramenta: palete.ferramenta,
                comprimento: palete.comprimento,
                comprimento_acabado_mm: parseInt(palete.comprimento) || 0,
                produto: palete.produtoOriginal,
                rack_ou_pallet: apontamentoOriginal?.rack_embalagem || palete.rack || 'RACK-DESCONHECIDO',
                quantidade: palete.quantidadeNecessaria,
                apontamento_id: palete.apontamentoId,
                cliente: apontamentoOriginal?.cliente || dadosRomaneio.cliente,
                pedido_seq: apontamentoOriginal?.pedido_seq || '-',
                lote: apontamentoOriginal?.lote || '-',
                lote_externo: apontamentoOriginal?.lote_externo || '-',
                peso_estimado_kg: pesoEstimadoKg > 0 ? Number(pesoEstimadoKg.toFixed(3)) : null,
                status_item: 'pendente',
                tipo_item: 'rack',
              }
            })

            console.log('📦 Salvando itens do romaneio:', itensRomaneio.length)
            
            // Calcular peso total estimado
            const pesoTotalEstimado = itensRomaneio.reduce((sum, item) => {
              return sum + (item.peso_estimado_kg || 0)
            }, 0)
            
            console.log('⚖️ Peso total estimado:', pesoTotalEstimado, 'kg')
            
            // Atualizar romaneio com peso total
            if (pesoTotalEstimado > 0) {
              await supabaseService.update('expedicao_romaneios', {
                id: novoRomaneioId,
                peso_total_estimado_kg: Number(pesoTotalEstimado.toFixed(3))
              })
              console.log('✅ Peso total atualizado no romaneio')
            }
            
            if (itensRomaneio.length > 0) {
              await supabaseService.addMany('expedicao_romaneio_itens', itensRomaneio)
              console.log('✅ Itens do romaneio salvos')
            }

            // Recarregar romaneios
            if (loadRomaneios) {
              await loadRomaneios()
            }

            setGeradorRomaneioAberto(false)
            alert(`✅ Romaneio gerado com sucesso!\n\nKit: ${dadosRomaneio.kitNome}\nQuantidade: ${dadosRomaneio.quantidadeKits} kits\nTotal de itens: ${dadosRomaneio.resumo.totalUnidades} un`)
          } catch (error) {
            console.error('❌ Erro ao gerar romaneio:', error)
            alert('Erro ao gerar romaneio: ' + error.message)
          }
        }}
      />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  )
}

export default KitsPanel
