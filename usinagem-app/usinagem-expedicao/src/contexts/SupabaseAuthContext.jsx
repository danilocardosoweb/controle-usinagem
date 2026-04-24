import { createContext, useContext, useState, useEffect } from 'react';
import supabaseService from '../services/SupabaseService';

const SupabaseAuthContext = createContext();

export function SupabaseAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    // Inicializar Supabase e verificar sessão existente
    const initAuth = async () => {
      try {
        await supabaseService.init();
        
        // Verificar se há sessão ativa
        const { data: { session } } = await supabaseService.supabase.auth.getSession();
        
        if (session) {
          setSession(session);
          // Buscar dados completos do usuário na tabela usuarios
          const userData = await getUserData(session.user.email);
          setUser(userData);
        }
        
        // Escutar mudanças de autenticação
        const { data: { subscription } } = supabaseService.supabase.auth.onAuthStateChange(
          async (event, session) => {
            setSession(session);
            
            if (session) {
              const userData = await getUserData(session.user.email);
              setUser(userData);
            } else {
              setUser(null);
            }
          }
        );

        return () => subscription.unsubscribe();
      } catch (error) {
        console.error('Erro ao inicializar autenticação:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Buscar dados do usuário na tabela usuarios
  const getUserData = async (email) => {
    try {
      const usuarios = await supabaseService.getByIndex('usuarios', 'email', email);
      return usuarios.length > 0 ? usuarios[0] : null;
    } catch (error) {
      console.error('Erro ao buscar dados do usuário:', error);
      return null;
    }
  };

  // Login com email e senha
  const login = async (email, password) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabaseService.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return { success: false, message: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      return { success: false, message: 'Erro interno do sistema' };
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    try {
      await supabaseService.supabase.auth.signOut();
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  // Registrar novo usuário (apenas para admins)
  const register = async (userData) => {
    try {
      // Primeiro criar o usuário na autenticação
      const { data: authData, error: authError } = await supabaseService.supabase.auth.signUp({
        email: userData.email,
        password: userData.password
      });

      if (authError) {
        return { success: false, message: authError.message };
      }

      // Depois inserir na tabela usuarios
      await supabaseService.add('usuarios', {
        nome: userData.nome,
        email: userData.email,
        nivel_acesso: userData.nivel_acesso || 'operador',
        senha_hash: 'managed_by_supabase_auth' // Placeholder, pois o Supabase gerencia
      });

      return { success: true };
    } catch (error) {
      console.error('Erro ao registrar usuário:', error);
      return { success: false, message: 'Erro ao criar usuário' };
    }
  };

  const value = {
    user,
    session,
    login,
    logout,
    register,
    loading
  };

  return (
    <SupabaseAuthContext.Provider value={value}>
      {children}
    </SupabaseAuthContext.Provider>
  );
}

export function useSupabaseAuth() {
  const context = useContext(SupabaseAuthContext);
  if (!context) {
    throw new Error('useSupabaseAuth deve ser usado dentro de SupabaseAuthProvider');
  }
  return context;
}
