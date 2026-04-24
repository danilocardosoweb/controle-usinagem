import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user } = useAuth()

  // Se não há restrição de roles, apenas retorna o componente
  if (allowedRoles.length === 0) {
    return children
  }

  // Verificar se o usuário tem permissão
  if (!user || !user.role) {
    return <Navigate to="/dashboard" replace />
  }

  // Verificar se o role do usuário está na lista de permitidos
  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Acesso Negado
            </h2>
            <p className="text-gray-600 mb-6">
              Você não tem permissão para acessar esta página.
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Nível de acesso necessário: <strong>{allowedRoles.join(', ')}</strong>
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Seu nível de acesso: <strong>{user.role}</strong>
            </p>
            <button
              onClick={() => window.history.back()}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Voltar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return children
}

export default ProtectedRoute
