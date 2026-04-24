import React, { useState, useEffect, useRef } from 'react'
import { FaSearch, FaTimes } from 'react-icons/fa'
import BuscaCodigoClienteService from '../services/BuscaCodigoClienteService'

const AutocompleteCodigoCliente = ({ 
  codigoTecno, 
  value, 
  onChange, 
  placeholder = "Digite ou busque o código do cliente...",
  disabled = false 
}) => {
  const [sugestoes, setSugestoes] = useState([])
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [codigoTecnoAnterior, setCodigoTecnoAnterior] = useState('')
  const inputRef = useRef(null)
  const sugestoesRef = useRef(null)

  // Buscar sugestões quando código Tecno muda
  useEffect(() => {
    if (codigoTecno && codigoTecno !== codigoTecnoAnterior) {
      buscarSugestoesPorTecno(codigoTecno)
      setCodigoTecnoAnterior(codigoTecno)
    }
  }, [codigoTecno])

  // Buscar sugestões quando usuário digita
  useEffect(() => {
    if (value && value.length >= 2) {
      const timer = setTimeout(() => {
        buscarSugestoes(value)
      }, 300)
      return () => clearTimeout(timer)
    } else {
      setSugestoes([])
      setMostrarSugestoes(false)
    }
  }, [value])

  // Fechar sugestões ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sugestoesRef.current && !sugestoesRef.current.contains(event.target)) {
        setMostrarSugestoes(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const buscarSugestoesPorTecno = async (codigo) => {
    if (!codigo) return
    
    setCarregando(true)
    try {
      const resultados = await BuscaCodigoClienteService.buscarCodigosClientePorTecno(codigo)
      setSugestoes(resultados)
      
      // Se não tem valor digitado e há sugestões, mostrar a primeira como preferencial
      if (!value && resultados.length > 0) {
        const preferencial = resultados[0]
        onChange(preferencial.value)
      }
    } catch (error) {
      console.error('Erro ao buscar sugestões:', error)
      setSugestoes([])
    } finally {
      setCarregando(false)
    }
  }

  const buscarSugestoes = async (termo) => {
    setCarregando(true)
    try {
      const resultados = await BuscaCodigoClienteService.buscarSugestoes(termo)
      setSugestoes(resultados)
      setMostrarSugestoes(true)
    } catch (error) {
      console.error('Erro ao buscar sugestões:', error)
      setSugestoes([])
    } finally {
      setCarregando(false)
    }
  }

  const handleInputChange = (e) => {
    const valor = e.target.value
    onChange(valor)
  }

  const handleSugestaoClick = (sugestao) => {
    onChange(sugestao.codigo_cliente || sugestao.value)
    setMostrarSugestoes(false)
    inputRef.current?.focus()
  }

  const handleClear = () => {
    onChange('')
    setMostrarSugestoes(false)
    inputRef.current?.focus()
  }

  const handleFocus = () => {
    if (sugestoes.length > 0) {
      setMostrarSugestoes(true)
    }
  }

  const formatarSugestao = (sugestao) => {
    const codigo = sugestao.codigo_cliente || sugestao.value || ''
    const nome = sugestao.nome_cliente || ''
    const descricao = sugestao.descricao_produto || ''
    
    let label = codigo
    if (nome) label += ` - ${nome}`
    if (descricao) label += ` (${descricao})`
    
    return label
  }

  return (
    <div className="relative" ref={sugestoesRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleFocus}
          disabled={disabled}
          className={`w-full px-3 py-2 pr-10 border rounded ${
            disabled ? 'bg-gray-100 text-gray-500' : 'border-gray-300'
          }`}
          placeholder={placeholder}
        />
        
        {/* Ícones */}
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          {carregando && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          )}
          
          {value && !disabled && !carregando && (
            <button
              type="button"
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600"
            >
              <FaTimes className="text-sm" />
            </button>
          )}
          
          {!value && !disabled && (
            <FaSearch className="text-gray-400 text-sm" />
          )}
        </div>
      </div>

      {/* Sugestões */}
      {mostrarSugestoes && sugestoes.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {sugestoes.map((sugestao, index) => (
            <div
              key={`${sugestao.codigo_cliente || sugestao.value}-${index}`}
              onClick={() => handleSugestaoClick(sugestao)}
              className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-mono text-sm text-gray-900">
                    {sugestao.codigo_cliente || sugestao.value}
                  </div>
                  {sugestao.nome_cliente && (
                    <div className="text-xs text-gray-600">
                      {sugestao.nome_cliente}
                    </div>
                  )}
                  {sugestao.descricao_produto && (
                    <div className="text-xs text-gray-500 italic">
                      {sugestao.descricao_produto}
                    </div>
                  )}
                </div>
                {sugestao.codigo_tecno === codigoTecno && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                    Correspondente
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AutocompleteCodigoCliente
