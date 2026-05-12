import React, { useState, useEffect, useRef } from 'react'
import { FaBox, FaWeight, FaRuler, FaInfoCircle, FaTools, FaTruck, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa'

const TooltipPaleteInfo = ({ palete, children, position = 'top' }) => {
  const [isVisible, setIsVisible] = useState(false)
  const [kitInfo, setKitInfo] = useState(null)
  const [loading, setLoading] = useState(false)
  const timeoutRef = useRef(null)
  const tooltipRef = useRef(null)

  // Extrair informações do palete
  const paleteInfo = {
    id: palete.id,
    titulo: palete.titulo || 'Sem título',
    subtitulo: palete.subtitulo || '',
    origem: palete.origem || 'manual',
    dimensao: {
      largura: palete.largura || 0,
      comprimento: palete.comprimento || 0,
      altura: palete.altura || 0
    },
    volume: palete.volume || ((palete.largura || 0) * (palete.comprimento || 0) * (palete.altura || 0)),
    quantidade: palete.quantidade || 1,
    quantidadePecas: palete.quantidadePecas || 0,
    pacotesReais: palete.pacotesReais ?? palete.pacotes ?? null,
    pacotesTotal: palete.pacotesTotal ?? palete.totalPacotes ?? null,
    peso: palete.pesoPacoteKg || 0,
    metadata: palete.metadataRomaneio || null
  }

  // Buscar informações do kit se o palete for de romaneio
  const fetchKitInfo = async () => {
    if (!paleteInfo.metadata || !paleteInfo.metadata.romaneioId) return

    setLoading(true)
    try {
      // Buscar informações do kit baseado no romaneio
      const response = await fetch(`/api/kits/romaneio/${paleteInfo.metadata.romaneioId}`)
      if (response.ok) {
        const data = await response.json()
        setKitInfo(data)
      }
    } catch (error) {
      console.error('Erro ao buscar informações do kit:', error)
    } finally {
      setLoading(false)
    }
  }

  // Controlar visibilidade do tooltip
  const handleDoubleClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('🔥 Duplo clique detectado no palete:', paleteInfo.titulo)
    setIsVisible(!isVisible)
    if (!isVisible && paleteInfo.metadata && !kitInfo) {
      fetchKitInfo()
    }
  }

  // Fechar tooltip ao clicar fora
  const handleClickOutside = (e) => {
    if (tooltipRef.current && !tooltipRef.current.contains(e.target)) {
      setIsVisible(false)
    }
  }

  useEffect(() => {
    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isVisible])

  // Limpar timeout ao desmontar
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  // Calcular posição do tooltip
  const getPositionClasses = () => {
    switch (position) {
      case 'bottom':
        return 'top-full left-1/2 transform -translate-x-1/2 mt-2'
      case 'left':
        return 'right-full top-1/2 transform -translate-y-1/2 mr-2'
      case 'right':
        return 'left-full top-1/2 transform -translate-y-1/2 ml-2'
      default: // top
        return 'bottom-full left-1/2 transform -translate-x-1/2 mb-2'
    }
  }

  // Formatar valores
  const formatPeso = (kg) => {
    if (!kg || kg === 0) return '—'
    if (kg >= 1000) return `${(kg / 1000).toFixed(2)} t`
    return `${kg.toFixed(1)} kg`
  }

  const formatVolume = (m3) => {
    if (!m3 || m3 === 0) return '—'
    return `${m3.toFixed(3)} m³`
  }

  // Determinar cor de prioridade baseada no volume
  const getVolumeColor = (volume) => {
    if (volume > 2.5) return 'text-red-600 bg-red-50 border-red-200'
    if (volume > 1.8) return 'text-amber-600 bg-amber-50 border-amber-200'
    return 'text-green-600 bg-green-50 border-green-200'
  }

  return (
    <div className="relative inline-block">
      <div
        onDoubleClick={handleDoubleClick}
        className="cursor-pointer"
      >
        {children}
      </div>

      {isVisible && (
        <div
          ref={tooltipRef}
          className={`absolute z-50 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 ${getPositionClasses()}`}
          style={{ minWidth: '320px' }}
        >
          {/* Cabeçalho */}
          <div className="flex items-start justify-between mb-3 pb-2 border-b border-slate-200">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
                <FaBox className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-slate-800 truncate">{paleteInfo.titulo}</h4>
                <p className="text-xs text-slate-500 truncate">{paleteInfo.subtitulo}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {paleteInfo.origem === 'romaneio' && (
                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full uppercase">
                  Romaneio
                </span>
              )}
              {paleteInfo.origem === 'manual' && (
                <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-full uppercase">
                  Manual
                </span>
              )}
            </div>
          </div>

          {/* Informações Principais */}
          <div className="space-y-3 mb-3">
            {/* Dimensões */}
            <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
              <FaRuler className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-bold text-slate-600 uppercase">Dimensões</p>
                <p className="text-sm font-mono text-slate-800">
                  {paleteInfo.dimensao.largura.toFixed(2)}m × {paleteInfo.dimensao.comprimento.toFixed(2)}m × {paleteInfo.dimensao.altura.toFixed(2)}m
                </p>
              </div>
            </div>

            {/* Volume com indicador de prioridade */}
            <div className={`flex items-center gap-3 p-2 rounded-lg border ${getVolumeColor(paleteInfo.volume)}`}>
              <div className="w-4 h-4 rounded-full bg-current flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-bold uppercase">Volume</p>
                <p className="text-sm font-mono font-bold">{formatVolume(paleteInfo.volume)}</p>
              </div>
              {paleteInfo.volume > 2.5 && (
                <FaExclamationTriangle className="w-4 h-4 flex-shrink-0" />
              )}
            </div>

            {/* Quantidade */}
            <div className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg">
              <FaBox className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-bold text-blue-600 uppercase">Quantidade</p>
                <p className="text-sm font-mono text-blue-800">
                  {paleteInfo.quantidade} {paleteInfo.quantidade === 1 ? 'palete' : 'paletes'}
                  {paleteInfo.quantidadePecas > 0 && (
                    <span className="text-xs text-blue-600 ml-2">
                      ({paleteInfo.quantidadePecas} peças)
                    </span>
                  )}
                </p>
                {(paleteInfo.pacotesReais || paleteInfo.pacotesTotal) && (
                  <p className="text-[11px] text-blue-700">
                    Pacotes: {paleteInfo.pacotesReais || paleteInfo.pacotesTotal}
                    {paleteInfo.pacotesReais && paleteInfo.pacotesTotal && paleteInfo.pacotesTotal !== paleteInfo.pacotesReais
                      ? `/${paleteInfo.pacotesTotal}`
                      : ''}
                  </p>
                )}
              </div>
            </div>

            {/* Peso se disponível */}
            {paleteInfo.peso > 0 && (
              <div className="flex items-center gap-3 p-2 bg-amber-50 rounded-lg">
                <FaWeight className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-amber-600 uppercase">Peso Total</p>
                  <p className="text-sm font-mono text-amber-800">
                    {formatPeso(paleteInfo.peso * paleteInfo.quantidade)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Informações do Kit (se disponível) */}
          {loading && (
            <div className="flex items-center justify-center py-3 text-slate-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-500 mr-2"></div>
              <span className="text-xs">Buscando informações do kit...</span>
            </div>
          )}

          {kitInfo && !loading && (
            <div className="border-t border-slate-200 pt-3">
              <div className="flex items-center gap-2 mb-2">
                <FaTools className="w-4 h-4 text-emerald-500" />
                <h5 className="text-sm font-bold text-slate-800">Informações do Kit</h5>
                <FaCheckCircle className="w-3 h-3 text-emerald-500" />
              </div>
              
              <div className="space-y-2 text-xs">
                {kitInfo.nome && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Kit:</span>
                    <span className="font-mono text-slate-800">{kitInfo.nome}</span>
                  </div>
                )}
                
                {kitInfo.ferramenta && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Ferramenta:</span>
                    <span className="font-mono text-slate-800">{kitInfo.ferramenta}</span>
                  </div>
                )}
                
                {kitInfo.comprimento_mm && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Comprimento:</span>
                    <span className="font-mono text-slate-800">{kitInfo.comprimento_mm}mm</span>
                  </div>
                )}
                
                {kitInfo.pecas_por_amarrado && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Peças/Amarrado:</span>
                    <span className="font-mono text-slate-800">{kitInfo.pecas_por_amarrado}</span>
                  </div>
                )}

                {/* Indicadores de compatibilidade */}
                {kitInfo.compatibilidade && (
                  <div className="mt-2 p-2 bg-emerald-50 rounded-lg">
                    <p className="text-xs font-bold text-emerald-700 mb-1">Compatibilidade</p>
                    <div className="flex flex-wrap gap-1">
                      {kitInfo.compatibilidade.map((comp, index) => (
                        <span
                          key={index}
                          className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-bold rounded-full"
                        >
                          {comp}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recomendações de carregamento */}
                {kitInfo.recomendacoes && (
                  <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                    <p className="text-xs font-bold text-blue-700 mb-1">Recomendações</p>
                    <ul className="text-xs text-blue-600 space-y-0.5">
                      {kitInfo.recomendacoes.map((rec, index) => (
                        <li key={index} className="flex items-start gap-1">
                          <span className="text-blue-400 mt-0.5">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Informações do Romaneio */}
          {paleteInfo.metadata && !kitInfo && !loading && (
            <div className="border-t border-slate-200 pt-3">
              <div className="flex items-center gap-2 mb-2">
                <FaTruck className="w-4 h-4 text-indigo-500" />
                <h5 className="text-sm font-bold text-slate-800">Dados do Romaneio</h5>
              </div>
              
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Romaneio:</span>
                  <span className="font-mono text-slate-800">#{paleteInfo.metadata.romaneioNumero}</span>
                </div>
                
                {paleteInfo.metadata.romaneioId && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">ID:</span>
                    <span className="font-mono text-slate-800">{paleteInfo.metadata.romaneioId}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Dica de otimização */}
          <div className="mt-3 p-2 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-start gap-2">
              <FaInfoCircle className="w-3 h-3 text-slate-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-slate-600">
                {paleteInfo.volume > 2.5 
                  ? "⚠️ Palete grande. Considere posicionar estrategicamente para melhor aproveitamento."
                  : paleteInfo.volume > 1.8
                  ? "📦 Palete médio. Bom para otimização de espaço."
                  : "✅ Palete compacto. Fácil de manusear e posicionar."
                }
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TooltipPaleteInfo
