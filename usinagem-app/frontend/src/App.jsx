import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ApontamentosUsinagem from './pages/ApontamentosUsinagem'
import ApontamentosParadas from './pages/ApontamentosParadas'
import CarteiraEncomendas from './pages/CarteiraEncomendas'
import Relatorios from './pages/Relatorios'
import Configuracoes from './pages/Configuracoes'
import Pedidos from './pages/Pedidos'
import Layout from './components/Layout'

function App() {
  const { user, login } = useAuth()
  
  // Verificar se o usuário está autenticado
  const isAuthenticated = !!user
  
  // Função para autenticação
  const handleLogin = (username, password) => {
    return login(username, password)
  }

  return (
    <Routes>
      <Route path="/login" element={
        !isAuthenticated 
          ? <Login onLogin={handleLogin} /> 
          : <Navigate to="/dashboard" replace />
      } />
      
      {/* Rotas protegidas */}
      <Route path="/" element={
        isAuthenticated 
          ? <Layout /> 
          : <Navigate to="/login" replace />
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="apontamentos-usinagem" element={<ApontamentosUsinagem />} />
        <Route path="apontamentos-paradas" element={<ApontamentosParadas />} />
        <Route path="relatorios" element={<Relatorios />} />
        <Route path="configuracoes" element={<Configuracoes />} />
        <Route path="pedidos" element={<Pedidos />} />
        <Route path="carteira-encomendas" element={<Navigate to="/pedidos" replace />} />
      </Route>
      
      {/* Redirecionar para login se não autenticado */}
      <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
    </Routes>
  )
}

export default App
