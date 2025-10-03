import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const Header = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const navigate = useNavigate()
  
  const handleLogout = () => {
    // Implementar lógica de logout
    navigate('/login')
  }

  return (
    <header className="bg-white shadow h-16 flex items-center justify-between px-6">
      <div className="flex items-center">
        <h1 className="text-xl font-semibold text-gray-800">Controle de Usinagem</h1>
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
