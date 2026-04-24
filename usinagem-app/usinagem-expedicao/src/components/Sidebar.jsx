import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { FaCog, FaChartBar, FaClipboardList, FaTools, FaFileAlt, FaTachometerAlt, FaBars, FaTimes, FaClock, FaTasks, FaCogs, FaBoxOpen, FaWarehouse, FaQuestionCircle } from 'react-icons/fa'
import { useAuth } from '../contexts/AuthContext'
import logoTecno from '../assets/LogoTecno.png'
import logoTecnoSemFundo from '../assets/LogoTecnoRedeSocial-SemFundo.png'

const Sidebar = ({ isOpen, onToggle, onClose, isMobile }) => {
  const [menuRecolhido, setMenuRecolhido] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const { user } = useAuth()

  const allMenuItems = [
    { path: '/dashboard', name: 'Dashboard', icon: <FaTachometerAlt />, roles: ['admin', 'supervisor', 'operador'] },
    { path: '/pedidos', name: 'Pedidos e Produtos', icon: <FaFileAlt />, roles: ['admin', 'supervisor', 'operador'] },
    { path: '/apontamentos-usinagem', name: 'Apontamentos de Usinagem', icon: <FaClipboardList />, roles: ['admin', 'supervisor', 'operador'] },
    { path: '/apontamentos-embalagem', name: 'Apontamentos de Embalagem', icon: <FaBoxOpen />, roles: ['admin', 'supervisor', 'operador'] },
    { path: '/apontamentos-paradas', name: 'Apontamentos de Paradas', icon: <FaTools />, roles: ['admin', 'supervisor', 'operador'] },
    { path: '/relatorios', name: 'Relatórios', icon: <FaChartBar />, roles: ['admin', 'supervisor', 'operador'] },
    { path: '/estoque', name: 'Estoque', icon: <FaWarehouse />, roles: ['admin', 'supervisor', 'operador'] },
    // Aba "EXP - Usinagem" desativada
    { path: '/previsao-trabalho', name: 'Previsão Trab.', icon: <FaClock />, roles: ['admin', 'supervisor', 'operador'] },
    { path: '/pcp', name: 'PCP', icon: <FaTasks />, roles: ['admin', 'supervisor'] },
    { path: '/configuracoes', name: 'Configurações', icon: <FaCog />, roles: ['admin'] }, // ✅ Apenas admin
    { path: '/manual', name: 'Manual do Usuário', icon: <FaQuestionCircle />, roles: ['admin', 'supervisor', 'operador'] },
  ]

  // Filtrar itens do menu baseado no role do usuário
  const menuItems = allMenuItems.filter(item => {
    if (!user || !user.role) return false
    return item.roles.includes(user.role)
  })

  const toggleMenu = () => {
    if (isMobile) {
      onToggle()
    } else {
      setMenuRecolhido(!menuRecolhido)
    }
  }

  const handleLinkClick = () => {
    if (isMobile) {
      onClose()
    }
  }

  return (
    <div 
      className={`bg-blue-800 text-white flex flex-col
        ${isMobile ? (
          `fixed inset-y-0 left-0 z-30 w-64 transform transition-transform duration-300 ease-in-out shadow-lg ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
          }`
        ) : (
          `relative ${menuRecolhido ? 'w-16' : 'w-64'} min-h-screen transition-all duration-300 ease-in-out`
        )}`}
    >
      {/* Botão de Toggle - Centralizado */}
      <div className="flex items-center justify-center p-3 border-b border-blue-700">
        <button 
          onClick={toggleMenu} 
          className="p-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-colors"
          aria-label={isMobile ? 'Fechar menu' : (menuRecolhido ? 'Expandir menu' : 'Recolher menu')}
        >
          {isMobile ? <FaTimes /> : (menuRecolhido ? <FaBars /> : <FaBars />)}
        </button>
      </div>
      
      {/* Logo e Nome da Empresa */}
      <div className="flex flex-col items-center px-2 py-4 border-b border-blue-700">
        {(!menuRecolhido || isMobile) ? (
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="bg-white rounded-lg p-3 mb-2 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
              aria-label="Visualizar logo"
            >
              <img 
                src={logoTecno} 
                alt="Tecnoperfil" 
                className="h-12 w-auto"
              />
            </button>
            <div className="text-center">
              <h2 className="text-lg font-bold text-white">Tecnoperfil</h2>
              <p className="text-xs text-blue-200">Controle de Usinagem</p>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-300 rounded mt-2"
            aria-label="Visualizar logo"
          >
            <img 
              src={logoTecnoSemFundo} 
              alt="Tecnoperfil" 
              className="h-10 w-10 object-contain"
            />
          </button>
        )}
      </div>
      
      <nav className="flex-1 overflow-y-auto py-2">
        <div className="space-y-1 px-2">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={handleLinkClick}
              className={({ isActive }) =>
                `flex items-center ${(menuRecolhido && !isMobile) ? 'justify-center' : 'space-x-3'} py-2 px-3 rounded-lg transition-all duration-200 ${
                  isActive 
                    ? 'bg-blue-700 text-white shadow-md' 
                    : 'text-blue-100 hover:bg-blue-700 hover:text-white'
                }`
              }
              title={item.name}
            >
              <div className="text-lg flex-shrink-0">{item.icon}</div>
              {((!menuRecolhido) || isMobile) && (
                <span className="font-medium truncate">{item.name}</span>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60" onClick={() => setPreviewOpen(false)} />
          {/* Conteúdo */}
          <div className="relative z-10 max-w-[90vw] max-h-[90vh] p-4">
            <img
              src={logoTecnoSemFundo}
              alt="Logo Tecnoperfil"
              className="max-w-[80vw] max-h-[80vh] object-contain rounded-lg shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setPreviewOpen(false)}
              className="absolute -top-2 -right-2 bg-white text-blue-800 rounded-full w-8 h-8 shadow hover:bg-gray-100"
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Sidebar
