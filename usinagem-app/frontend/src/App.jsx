import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ApontamentosUsinagem from './pages/ApontamentosUsinagem'
import ApontamentosEmbalagem from './pages/ApontamentosEmbalagem'
import Estoque from './pages/Estoque'
import ApontamentosParadas from './pages/ApontamentosParadas'
import CarteiraEncomendas from './pages/CarteiraEncomendas'
import Relatorios from './pages/Relatorios'
import PrevisaoTrabalho from './pages/PrevisaoTrabalho'
import Configuracoes from './pages/Configuracoes'
import Pedidos from './pages/Pedidos'
import PCP from './pages/PCP'
import ManualUsuario from './pages/ManualUsuario'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import ToastContainer from './components/ToastContainer'

function App() {
  const { user, login } = useAuth()
  
  // Verificar se o usuário está autenticado
  const isAuthenticated = !!user
  
  // Função para autenticação
  const handleLogin = (username, password) => {
    return login(username, password)
  }

  return (
    <ToastProvider>
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
        <Route path="apontamentos-embalagem" element={<ApontamentosEmbalagem />} />
        <Route path="estoque" element={<Estoque />} />
        <Route path="apontamentos-paradas" element={<ApontamentosParadas />} />
        <Route path="relatorios" element={<Relatorios />} />
        <Route path="previsao-trabalho" element={<PrevisaoTrabalho />} />
        {/** Rota removida: EXP - Usinagem desativada */}
        <Route path="pcp" element={<PCP />} />
        <Route path="manual" element={<ManualUsuario />} />
        <Route path="configuracoes" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Configuracoes />
          </ProtectedRoute>
        } />
        <Route path="pedidos" element={<Pedidos />} />
        <Route path="carteira-encomendas" element={<Navigate to="/pedidos" replace />} />
      </Route>
      
      {/* Redirecionar para login se não autenticado */}
      <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
      </Routes>
      <ToastContainer />
    </ToastProvider>
  )
}

export default App
