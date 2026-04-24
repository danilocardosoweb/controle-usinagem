import React, { useState } from 'react'
import { useResponsive, getResponsiveClasses } from '../hooks/useResponsive'
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa'

/**
 * Layout responsivo para ModalPalete3D
 * Collapsa painel lateral em resoluções baixas
 */
export const ResponsiveLayout = ({ children3D, childrenPanel, title = 'Montagem do Palete' }) => {
  const screen = useResponsive()
  const [sidebarOpen, setSidebarOpen] = useState(!screen.isCompact)
  const classes = getResponsiveClasses(screen.isCompact)

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-lg border-b border-amber-800">
        <div className="flex items-center gap-3">
          <span className={`${classes.text2xl} font-black`}>📦</span>
          <h1 className={`${classes.textLg} font-bold`}>{title}</h1>
        </div>
        
        {/* Toggle Sidebar em modo compacto */}
        {screen.isCompact && (
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-amber-500 rounded-lg transition-colors"
            title={sidebarOpen ? 'Fechar painel' : 'Abrir painel'}
          >
            {sidebarOpen ? <FaChevronRight size={18} /> : <FaChevronLeft size={18} />}
          </button>
        )}
      </div>

      {/* Conteúdo Principal */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Painel 3D */}
        <div className={`flex-1 bg-gray-900 overflow-hidden transition-all duration-300 ${
          screen.isCompact && sidebarOpen ? 'hidden' : ''
        }`}>
          {children3D}
        </div>

        {/* Painel Lateral */}
        <div
          className={`${
            screen.isCompact
              ? `fixed inset-y-0 right-0 z-40 w-full sm:w-96 bg-slate-50 border-l border-slate-200 shadow-2xl transition-transform duration-300 ${
                  sidebarOpen ? 'translate-x-0' : 'translate-x-full'
                }`
              : `w-full md:w-80 lg:w-96 flex-shrink-0 bg-slate-50 border-l border-slate-200 overflow-hidden flex flex-col`
          }`}
        >
          {/* Overlay para fechar em mobile */}
          {screen.isCompact && sidebarOpen && (
            <div
              className="fixed inset-0 bg-black/30 z-30"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Conteúdo do Painel */}
          <div className="flex-1 overflow-y-auto">
            {childrenPanel}
          </div>
        </div>
      </div>

      {/* Indicador de Modo Compacto (debug) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-[9px] text-slate-400 px-2 py-1 bg-slate-100 border-t border-slate-200">
          {screen.width}x{screen.height} | Compacto: {screen.isCompact ? 'Sim' : 'Não'} | Sidebar: {sidebarOpen ? 'Aberto' : 'Fechado'}
        </div>
      )}
    </div>
  )
}

/**
 * Componente para grids responsivos
 */
export const ResponsiveGrid = ({ children, cols = 3, isCompact = false, gap = 3 }) => {
  const colsClass = {
    2: isCompact ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2',
    3: isCompact ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-3',
    4: isCompact ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-4',
  }

  const gapClass = {
    2: 'gap-2',
    3: 'gap-3',
    4: 'gap-4',
  }

  return (
    <div className={`grid ${colsClass[cols] || colsClass[3]} ${gapClass[gap] || gapClass[3]}`}>
      {children}
    </div>
  )
}

/**
 * Componente para inputs responsivos
 */
export const ResponsiveInput = ({ isCompact = false, ...props }) => {
  const classes = getResponsiveClasses(isCompact)
  return (
    <input
      {...props}
      className={`w-full border border-slate-300 rounded-lg ${classes.pxSm} ${classes.pySm} ${classes.textSm} bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all placeholder:text-slate-400 ${props.className || ''}`}
    />
  )
}

/**
 * Componente para labels responsivos
 */
export const ResponsiveLabel = ({ isCompact = false, children, ...props }) => {
  const classes = getResponsiveClasses(isCompact)
  return (
    <label {...props} className={`block ${classes.textXs} font-bold text-slate-600 uppercase tracking-tight mb-1 ${props.className || ''}`}>
      {children}
    </label>
  )
}
