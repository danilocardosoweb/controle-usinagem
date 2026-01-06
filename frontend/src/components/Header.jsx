import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaBars } from 'react-icons/fa'
import { useAuth } from '../contexts/AuthContext'

const Header = ({ onMenuClick, isMobile }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const navigate = useNavigate()
  const { logout } = useAuth()
  
  const handleLogout = () => {
    try {
      logout()
    } finally {
      navigate('/login')
      setDropdownOpen(false)
    }
  }

  return (
    <header className="bg-white shadow h-16 flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center space-x-4">
        {isMobile && (
          <button
            onClick={onMenuClick}
            className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            aria-label="Abrir menu"
          >
            <FaBars className="w-5 h-5" />
          </button>
        )}
        <h1 className="text-lg md:text-xl font-semibold text-gray-800 truncate">
          Controle de Usinagem
        </h1>
      </div>
      
      <div className="relative">
        <button 
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center space-x-2 focus:outline-none"
        >
          <span className="text-gray-700">Usuário</span>
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
            <button
              onClick={handleLogout}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Sair
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

export default Header
