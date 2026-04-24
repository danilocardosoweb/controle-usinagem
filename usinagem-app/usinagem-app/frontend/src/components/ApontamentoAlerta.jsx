import React, { useState } from 'react'
import { FaBell, FaTimes, FaHammer, FaBox } from 'react-icons/fa'

const ApontamentoAlerta = ({ apontamentosRecentes, loading }) => {
  const [mostrarDetalhes, setMostrarDetalhes] = useState(false)

  if (loading) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <div className="bg-gray-100 rounded-lg p-3 shadow-lg animate-pulse">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 bg-gray-300 rounded-full"></div>
            <div className="w-24 h-4 bg-gray-300 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!apontamentosRecentes || apontamentosRecentes.length === 0) {
    return null
  }

  // Agrupar apontamentos por área
  const agrupadosPorArea = apontamentosRecentes.reduce((acc, apont) => {
    if (!acc[apont.exp_stage]) {
      acc[apont.exp_stage] = []
    }
    acc[apont.exp_stage].push(apont)
    return acc
  }, {})

  const totalApontamentos = apontamentosRecentes.length
  const usinagemCount = agrupadosPorArea.usinagem?.length || 0
  const embalagemCount = agrupadosPorArea.embalagem?.length || 0

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-white rounded-lg shadow-lg border-l-4 border-blue-500 max-w-sm">
        {/* Cabeçalho do Alerta */}
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FaBell className="text-blue-500 text-lg" />
              <div>
                <h3 className="text-sm font-semibold text-gray-800">
                  Novos Apontamentos
                </h3>
                <p className="text-xs text-gray-600">
                  {totalApontamentos} hoje
                </p>
              </div>
            </div>
            <button
              onClick={() => setMostrarDetalhes(!mostrarDetalhes)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              {mostrarDetalhes ? <FaTimes /> : <FaBell />}
            </button>
          </div>
        </div>

        {/* Resumo Rápido */}
        <div className="px-4 pb-2">
          <div className="flex space-x-4 text-xs">
            <div className="flex items-center space-x-1">
              <FaHammer className="text-orange-500" />
              <span className="text-gray-700">
                Usinagem: <strong>{usinagemCount}</strong>
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <FaBox className="text-green-500" />
              <span className="text-gray-700">
                Embalagem: <strong>{embalagemCount}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Detalhes (expansível) */}
        {mostrarDetalhes && (
          <div className="border-t border-gray-200">
            <div className="max-h-64 overflow-y-auto">
              {Object.entries(agrupadosPorArea).map(([area, apontamentos]) => (
                <div key={area} className="border-b border-gray-100 last:border-b-0">
                  <div className="px-4 py-2 bg-gray-50">
                    <div className="flex items-center space-x-2">
                      {area === 'usinagem' ? (
                        <FaHammer className="text-orange-500" />
                      ) : (
                        <FaBox className="text-green-500" />
                      )}
                      <span className="text-sm font-medium text-gray-700 capitalize">
                        {area === 'usinagem' ? 'Usinagem' : 'Embalagem'}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({apontamentos.length})
                      </span>
                    </div>
                  </div>
                  <div className="px-4 py-2 space-y-1">
                    {apontamentos.slice(0, 3).map((apont, idx) => (
                      <div key={idx} className="text-xs text-gray-600">
                        <div className="flex justify-between">
                          <span className="font-medium">
                            {apont.pedido_seq || 'N/A'}
                          </span>
                          <span>
                            {apont.quantidade} {apont.exp_unidade || 'PC'}
                          </span>
                        </div>
                        <div className="text-gray-500">
                          {apont.operador} • {apont.maquina}
                        </div>
                      </div>
                    ))}
                    {apontamentos.length > 3 && (
                      <div className="text-xs text-gray-500 italic">
                        +{apontamentos.length - 3} mais...
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ApontamentoAlerta
