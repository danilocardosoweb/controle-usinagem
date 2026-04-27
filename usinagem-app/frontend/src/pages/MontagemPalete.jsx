import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { FaCubes, FaSearch, FaChevronDown } from 'react-icons/fa'
import { useAuth } from '../contexts/AuthContext'
import { PaleteConteudo } from '../components/ModalPalete3D'
import { supabase } from '../config/supabase'

export default function MontagemPalete() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const ferramentaParam = searchParams.get('ferramenta') || ''
  const comprimentoParam = searchParams.get('comprimento') || ''
  const simulacaoParam = searchParams.get('simulacao') || ''

  const [ferramenta, setFerramenta] = useState(ferramentaParam)
  const [comprimento, setComprimento] = useState(comprimentoParam)
  const [simulacaoId, setSimulacaoId] = useState(simulacaoParam)
  const [buscaInput, setBuscaInput] = useState(ferramentaParam)
  const [paleteActiveTab, setPaleteActiveTab] = useState('visualizacao')

  // Estado para autocomplete de ferramentas
  const [ferramentasCadastradas, setFerramentasCadastradas] = useState([])
  const [sugestoesVisiveis, setSugestoesVisiveis] = useState(false)
  const [carregandoFerramentas, setCarregandoFerramentas] = useState(false)
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)

  // Estado para comprimentos disponíveis da ferramenta selecionada
  const [comprimentosDisponiveis, setComprimentosDisponiveis] = useState([])
  const [dropdownComprimentosAberto, setDropdownComprimentosAberto] = useState(false)
  const [carregandoComprimentos, setCarregandoComprimentos] = useState(false)
  const comprimentoRef = useRef(null)

  // Buscar ferramentas únicas cadastradas
  const buscarFerramentasCadastradas = useCallback(async () => {
    setCarregandoFerramentas(true)
    try {
      const { data, error } = await supabase
        .from('palete_config')
        .select('ferramenta')
        .order('ferramenta', { ascending: true })

      if (error) {
        console.error('Erro ao buscar ferramentas:', error)
        return
      }

      // Remover duplicados e extrair valores únicos
      const unicas = [...new Set(data.map(item => item.ferramenta).filter(Boolean))]
      setFerramentasCadastradas(unicas)
    } catch (err) {
      console.error('Erro:', err)
    } finally {
      setCarregandoFerramentas(false)
    }
  }, [])

  // Carregar ferramentas ao montar componente
  useEffect(() => {
    buscarFerramentasCadastradas()
  }, [buscarFerramentasCadastradas])

  // Filtrar sugestões baseado no texto digitado
  const sugestoesFiltradas = ferramentasCadastradas.filter(f =>
    f.toUpperCase().includes(buscaInput.toUpperCase())
  )

  // Fechar dropdowns ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          inputRef.current && !inputRef.current.contains(event.target)) {
        setSugestoesVisiveis(false)
      }
      if (comprimentoRef.current && !comprimentoRef.current.contains(event.target)) {
        setDropdownComprimentosAberto(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Buscar comprimentos disponíveis para uma ferramenta
  const buscarComprimentos = useCallback(async (ferramenta) => {
    if (!ferramenta) {
      setComprimentosDisponiveis([])
      return
    }
    
    setCarregandoComprimentos(true)
    try {
      const { data, error } = await supabase
        .from('palete_config')
        .select('comprimento_mm')
        .eq('ferramenta', ferramenta)
        .order('comprimento_mm', { ascending: true })

      if (error) {
        console.error('Erro ao buscar comprimentos:', error)
        return
      }

      // Extrair valores únicos de comprimento (incluindo null/0 como "Padrão")
      const comprimentos = data
        .map(item => item.comprimento_mm)
        .filter((v, i, a) => a.indexOf(v) === i) // únicos
        .sort((a, b) => {
          // null/0 primeiro (padrão), depois ordem crescente
          if (!a && b) return -1
          if (a && !b) return 1
          return (a || 0) - (b || 0)
        })
      
      setComprimentosDisponiveis(comprimentos)
    } catch (err) {
      console.error('Erro:', err)
    } finally {
      setCarregandoComprimentos(false)
    }
  }, [])

  const selecionarFerramenta = (f) => {
    setBuscaInput(f)
    setSugestoesVisiveis(false)
    // Buscar comprimentos disponíveis para essa ferramenta
    buscarComprimentos(f)
    // Resetar comprimento ao trocar ferramenta
    setComprimento('')
  }

  // Buscar comprimentos quando ferramenta muda (via URL ou seleção)
  useEffect(() => {
    if (ferramentaParam) {
      buscarComprimentos(ferramentaParam)
    }
  }, [ferramentaParam, buscarComprimentos])

  const handleBuscar = (e) => {
    e.preventDefault()
    const f = buscaInput.trim().toUpperCase()
    if (!f) return
    setFerramenta(f)
    navigate(`/montagem-palete?ferramenta=${encodeURIComponent(f)}${comprimento ? `&comprimento=${comprimento}` : ''}`, { replace: true })
  }

  const handleCloseTab = () => {
    window.close()
  }

  return (
    <div className="flex flex-col h-screen w-full min-h-0 bg-gray-50 overflow-hidden">
      {/* Header da página */}
      <div className="bg-gradient-to-r from-amber-600 to-orange-500 px-6 py-3 flex items-center shadow-md flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg">
            <FaCubes className="text-white text-2xl" />
          </div>
          <div>
            <h1 className="text-white font-bold text-xl leading-tight tracking-tight">Montagem do Palete</h1>
            <p className="text-orange-100 text-xs font-medium">MÓDULO DE VISUALIZAÇÃO 3D E CUBAGEM EM CAMINHÕES</p>
          </div>
        </div>
        
        {ferramenta && (
          <div className="ml-6 flex items-center">
            <span className="bg-white/90 text-orange-600 px-4 py-1.5 rounded-full text-sm font-mono font-extrabold shadow-sm border border-orange-200">
              {ferramenta}
            </span>
          </div>
        )}

        <button
          onClick={handleCloseTab}
          className="ml-auto flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold text-sm px-4 py-2 rounded-lg transition-colors flex-shrink-0 border border-white/20"
          title="Fechar esta aba"
        >
          ✕ Fechar Aba
        </button>
      </div>

      {/* Barra de busca por ferramenta — oculta na aba cubagem */}
      {paleteActiveTab !== 'cubagem' && paleteActiveTab !== 'validacao' && <div className="bg-white border-b border-gray-200 px-5 py-3 flex-shrink-0">
        <form onSubmit={handleBuscar} className="flex items-center gap-2 flex-wrap">
          <label className="text-xs font-semibold text-gray-500 uppercase">Ferramenta:</label>
          <div className="relative" ref={dropdownRef}>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={buscaInput}
                onChange={e => {
                  setBuscaInput(e.target.value.toUpperCase())
                  setSugestoesVisiveis(true)
                }}
                onFocus={() => setSugestoesVisiveis(true)}
                placeholder="Digite ou escolha..."
                className="border border-gray-300 rounded px-3 py-1.5 text-sm font-mono uppercase w-48 focus:outline-none focus:border-amber-400 pr-8"
              />
              <button
                type="button"
                onClick={() => {
                  setSugestoesVisiveis(!sugestoesVisiveis)
                  inputRef.current?.focus()
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <FaChevronDown className={`w-3 h-3 transition-transform ${sugestoesVisiveis ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Dropdown de sugestões */}
            {sugestoesVisiveis && (
              <div className="absolute z-50 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {carregandoFerramentas ? (
                  <div className="px-3 py-2 text-xs text-gray-500">Carregando...</div>
                ) : sugestoesFiltradas.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-gray-500">
                    {buscaInput ? `Nenhuma ferramenta encontrada para "${buscaInput}"` : 'Digite para buscar ou cadastrar nova'}
                  </div>
                ) : (
                  <>
                    <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase bg-gray-50 border-b">
                      {sugestoesFiltradas.length} ferramenta(s) cadastrada(s)
                    </div>
                    {sugestoesFiltradas.map((f, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => selecionarFerramenta(f)}
                        className={`w-full text-left px-3 py-2 text-sm font-mono hover:bg-amber-50 transition-colors ${f === buscaInput ? 'bg-amber-100 text-amber-700' : 'text-gray-700'}`}
                      >
                        <div className="flex items-center gap-2">
                          <FaSearch className="w-3 h-3 text-gray-400" />
                          {f}
                        </div>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
          <label className="text-xs font-semibold text-gray-500 uppercase ml-2">Comprimento (mm):</label>
          <div className="relative" ref={comprimentoRef}>
            {comprimentosDisponiveis.length > 0 ? (
              // Dropdown com comprimentos disponíveis
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDropdownComprimentosAberto(!dropdownComprimentosAberto)}
                  className="border border-gray-300 rounded px-3 py-1.5 text-sm w-36 text-left bg-white hover:border-amber-400 focus:outline-none focus:border-amber-400 pr-8"
                >
                  {comprimento ? `${comprimento} mm` : <span className="text-gray-400">Selecione...</span>}
                </button>
                <FaChevronDown className={`absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 transition-transform ${dropdownComprimentosAberto ? 'rotate-180' : ''}`} />
                
                {dropdownComprimentosAberto && (
                  <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
                    <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase bg-gray-50 border-b">
                      {comprimentosDisponiveis.length} opção(ões)
                    </div>
                    {/* Opção Padrão (sem comprimento específico) */}
                    <button
                      type="button"
                      onClick={() => { setComprimento(''); setDropdownComprimentosAberto(false) }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-amber-50 transition-colors ${!comprimento ? 'bg-amber-100 text-amber-700' : 'text-gray-700'}`}
                    >
                      Padrão (sem comprimento)
                    </button>
                    {comprimentosDisponiveis.filter(c => c).map((comp, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => { setComprimento(comp.toString()); setDropdownComprimentosAberto(false) }}
                        className={`w-full text-left px-3 py-2 text-sm font-mono hover:bg-amber-50 transition-colors ${comprimento === comp.toString() ? 'bg-amber-100 text-amber-700' : 'text-gray-700'}`}
                      >
                        {comp} mm
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              // Input livre quando não há comprimentos cadastrados
              <input
                type="number"
                value={comprimento}
                onChange={e => setComprimento(e.target.value)}
                placeholder="Ex: 1421"
                className="border border-gray-300 rounded px-3 py-1.5 text-sm w-28 focus:outline-none focus:border-amber-400"
              />
            )}
          </div>
          <button
            type="submit"
            className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-1.5 rounded transition-colors"
          >
            Carregar
          </button>
          {ferramenta && (
            <button
              type="button"
              onClick={() => { setFerramenta(''); setBuscaInput(''); setComprimento(''); navigate('/montagem-palete', { replace: true }) }}
              className="text-xs text-gray-400 hover:text-gray-600 ml-1"
            >
              ✕ Limpar
            </button>
          )}
        </form>
      </div>}

      {/* Conteúdo principal — ocupa o espaço restante */}
      <div className="flex-1 min-h-0 overflow-auto md:overflow-hidden">
        {(ferramenta || simulacaoId) ? (
          <PaleteConteudo
            ferramenta={ferramenta}
            comprimento={comprimento}
            isAdmin={isAdmin}
            onActiveTabChange={setPaleteActiveTab}
            simulacaoId={simulacaoId}
            onSimulacaoLoaded={(sim) => {
              // Keep simulacaoId to maintain PaleteConteudo mounted
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
            <FaCubes className="text-6xl opacity-20" />
            <p className="text-sm">Digite uma ferramenta acima para carregar a configuração do palete.</p>
          </div>
        )}
      </div>
    </div>
  )
}
