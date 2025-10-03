import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar se há um usuário armazenado no localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    console.log('AuthContext: Tentativa de login', { username, password });
    
    try {
      // Simulação de uma chamada de API
      // Em produção, isso seria uma chamada real para o backend
      const response = await new Promise((resolve) => {
        setTimeout(() => {
          // Aceitar qualquer email com senha 'senha123' para facilitar os testes
          if (password === 'senha123') {
            // Determinar o papel com base no email
            let role = 'operador';
            let nome = 'Usuário';
            
            if (username.includes('admin')) {
              role = 'admin';
              nome = 'Administrador';
            } else if (username.includes('supervisor')) {
              role = 'supervisor';
              nome = 'Supervisor';
            } else if (username.includes('danilo')) {
              role = 'admin';
              nome = 'Danilo Cardoso';
            }
            
            console.log('AuthContext: Login bem-sucedido', { username, role });
            
            resolve({
              success: true,
              user: {
                id: Math.floor(Math.random() * 1000) + 1,
                nome: nome,
                username: username,
                role: role
              }
            });
          } else {
            console.log('AuthContext: Senha incorreta');
            resolve({
              success: false,
              message: 'Credenciais inválidas'
            });
          }
        }, 500);
      });

      if (response.success) {
        localStorage.setItem('user', JSON.stringify(response.user));
        setUser(response.user);
        return { success: true };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      return { success: false, message: 'Erro ao fazer login' };
    }
  };

  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  const value = {
    user,
    login,
    logout,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
