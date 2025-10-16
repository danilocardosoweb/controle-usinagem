import { createContext, useContext, useState, useEffect } from 'react';
import auditoriaService from '../services/AuditoriaService';

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
      // Importar o SupabaseService dinamicamente
      const { default: supabaseService } = await import('../services/SupabaseService');
      
      // Buscar usuário no banco de dados pelo email
      const usuarios = await supabaseService.getByIndex('usuarios', 'email', username.toLowerCase());
      
      if (usuarios.length === 0) {
        console.log('AuthContext: Usuário não encontrado');
        return { success: false, message: 'Credenciais inválidas' };
      }
      
      const usuario = usuarios[0];
      
      // Verificar senha (em texto plano - APENAS PARA DESENVOLVIMENTO)
      // ⚠️ EM PRODUÇÃO, USE HASH DE SENHA (bcrypt, argon2, etc)
      const senhaCorreta = usuario.senha === password || usuario.senha_hash === password;
      
      if (!senhaCorreta) {
        console.log('AuthContext: Senha incorreta');
        return { success: false, message: 'Credenciais inválidas' };
      }
      
      // Verificar se usuário está ativo
      if (usuario.ativo === false) {
        console.log('AuthContext: Usuário inativo');
        return { success: false, message: 'Usuário inativo. Contate o administrador.' };
      }
      
      console.log('AuthContext: Login bem-sucedido', { email: usuario.email, nivel: usuario.nivel_acesso });
      
      // Atualizar último acesso
      await supabaseService.update('usuarios', {
        ...usuario,
        ultimo_acesso: new Date().toISOString()
      });
      
      const userData = {
        id: usuario.id,
        nome: usuario.nome,
        username: usuario.email,
        email: usuario.email,
        role: usuario.nivel_acesso
      };
      
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      
      // Registrar login na auditoria
      await auditoriaService.registrarLogin(userData);
      
      return { success: true };
      
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      return { success: false, message: 'Erro ao fazer login: ' + error.message };
    }
  };

  const logout = async () => {
    // Registrar logout antes de limpar dados
    if (user) {
      await auditoriaService.registrarLogout(user);
    }
    
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
