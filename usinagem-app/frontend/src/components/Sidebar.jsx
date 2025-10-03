import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { FaCog, FaChartBar, FaClipboardList, FaTools, FaFileAlt, FaTachometerAlt, FaBars, FaChevronLeft } from 'react-icons/fa'

const Sidebar = () => {
  const [menuRecolhido, setMenuRecolhido] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Verificar se é dispositivo móvel
  useEffect(() => {
    const verificarTamanho = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth < 768) {
        setMenuRecolhido(true)
      }
    }
    
    verificarTamanho()
    window.addEventListener('resize', verificarTamanho)
    
    return () => {
      window.removeEventListener('resize', verificarTamanho)
    }
  }, [])

  const menuItems = [
    { path: '/dashboard', name: 'Dashboard', icon: <FaTachometerAlt /> },
    { path: '/pedidos', name: 'Pedidos e Produtos', icon: <FaFileAlt /> },
    { path: '/apontamentos-usinagem', name: 'Apontamentos de Usinagem', icon: <FaClipboardList /> },
    { path: '/apontamentos-paradas', name: 'Apontamentos de Paradas', icon: <FaTools /> },
    { path: '/relatorios', name: 'Relatórios', icon: <FaChartBar /> },
    { path: '/configuracoes', name: 'Configurações', icon: <FaCog /> },
  ]

  const toggleMenu = () => {
    setMenuRecolhido(!menuRecolhido)
  }

  return (
    <div 
      className={`bg-primary-800 text-white ${menuRecolhido ? 'w-16' : 'w-64'} space-y-6 py-7 px-2 
        fixed md:relative inset-y-0 left-0 z-30 transform 
        ${isMobile && menuRecolhido ? '-translate-x-full' : 'translate-x-0'} 
        transition-all duration-300 ease-in-out shadow-lg`}
    >
      <div className="flex items-center justify-between px-2">
        {!menuRecolhido && (
          <span className="text-2xl font-extrabold">Usinagem App</span>
        )}
        <button 
          onClick={toggleMenu} 
          className="p-2 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-600"
          aria-label={menuRecolhido ? "Expandir menu" : "Recolher menu"}
        >
          {menuRecolhido ? <FaBars /> : <FaChevronLeft />}
        </button>
      </div>
      
      <nav>
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center ${menuRecolhido ? 'justify-center' : 'space-x-2'} py-2.5 px-4 rounded transition duration-200 ${
                isActive 
                  ? 'bg-primary-700 text-white' 
                  : 'text-primary-100 hover:bg-primary-700'
              }`
            }
            title={item.name}
          >
            <div className={menuRecolhido ? '' : 'mr-3'}>{item.icon}</div>
            {!menuRecolhido && <span>{item.name}</span>}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export default Sidebar
