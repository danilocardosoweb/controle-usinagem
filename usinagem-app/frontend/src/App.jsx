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
import Expedicao from './pages/Expedicao'
import MontagemPalete from './pages/MontagemPalete'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import ToastContainer from './components/ToastContainer'

function App() {
  const { user, login, loading: authLoading } = useAuth()
  
  // Verificar se o usuário está autenticado
  const isAuthenticated = !!user
  
  // Mostrar loading enquanto verifica autenticação (evita redirects prematuros)
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 text-sm">Carregando...</p>
        </div>
      </div>
    )
  }
  
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
      
      {/* Rotas protegidas com Layout Padrão */}
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
        <Route path="expedicao" element={<Expedicao />} />
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

      {/* Rotas protegidas SEM Layout (Fullscreen / Standalone) */}
      <Route path="/montagem-palete" element={
        isAuthenticated 
          ? <MontagemPalete /> 
          : <Navigate to="/login" replace />
      } />
      
      {/* Redirecionar para login se não autenticado */}
      <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
      </Routes>
      <ToastContainer />
    </ToastProvider>
  )
}

export default App
