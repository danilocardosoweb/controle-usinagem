import { useState, useEffect } from 'react'

/**
 * Hook para detectar tamanho de tela e modo compacto
 * Breakpoints:
 * - sm: 640px (mobile)
 * - md: 768px (tablet)
 * - lg: 1024px (laptop)
 * - xl: 1280px (desktop)
 * - 2xl: 1536px (ultrawide)
 */
export const useResponsive = () => {
  const [screenSize, setScreenSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1366,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
    isMobile: false,
    isTablet: false,
    isLaptop: false,
    isDesktop: false,
    isCompact: false, // HD e resoluções menores
  })

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      
      setScreenSize({
        width,
        height,
        isMobile: width < 640,
        isTablet: width >= 640 && width < 1024,
        isLaptop: width >= 1024 && width < 1366,
        isDesktop: width >= 1366,
        isCompact: width < 1400 || height < 800, // HD 1366x768 ou menor
      })
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return screenSize
}

/**
 * Retorna classes Tailwind baseado no tamanho da tela
 */
export const getResponsiveClasses = (isCompact) => ({
  // Tamanhos de fonte
  textXs: isCompact ? 'text-[10px]' : 'text-xs',
  textSm: isCompact ? 'text-xs' : 'text-sm',
  textBase: isCompact ? 'text-sm' : 'text-base',
  textLg: isCompact ? 'text-base' : 'text-lg',
  textXl: isCompact ? 'text-lg' : 'text-xl',
  text2xl: isCompact ? 'text-xl' : 'text-2xl',
  text3xl: isCompact ? 'text-2xl' : 'text-3xl',

  // Padding
  pxSm: isCompact ? 'px-2' : 'px-3',
  pySm: isCompact ? 'py-1.5' : 'py-2',
  p3: isCompact ? 'p-2' : 'p-3',
  p4: isCompact ? 'p-3' : 'p-4',
  p5: isCompact ? 'p-3' : 'p-5',

  // Gap
  gap2: isCompact ? 'gap-1.5' : 'gap-2',
  gap3: isCompact ? 'gap-2' : 'gap-3',
  gap4: isCompact ? 'gap-3' : 'gap-4',

  // Altura de componentes
  inputHeight: isCompact ? 'h-8' : 'h-10',
  buttonHeight: isCompact ? 'h-8' : 'h-10',

  // Largura do painel lateral
  sidebarWidth: isCompact ? 'w-full md:w-80' : 'w-full md:w-[420px]',
  sidebarMaxWidth: isCompact ? '320px' : '420px',

  // Grid columns
  gridCols2: isCompact ? 'grid-cols-2' : 'grid-cols-2',
  gridCols3: isCompact ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-3',
  gridCols4: isCompact ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-4',
})
