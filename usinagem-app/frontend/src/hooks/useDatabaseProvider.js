import { useState, useEffect, useCallback } from 'react';
import dbService from '../services/DatabaseService';
import supabaseService from '../services/SupabaseService';

/**
 * Hook para selecionar o provedor de banco de dados (IndexedDB local ou Supabase)
 * @param {boolean} useSupabase - Se true, usa o Supabase; se false, usa o IndexedDB local
 * @returns {Object} O serviço de banco de dados selecionado
 */
export function useDatabaseProvider(useSupabase = false) {
  const [provider, setProvider] = useState(useSupabase ? supabaseService : dbService);
  const [isSupabase, setIsSupabase] = useState(useSupabase);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  // Inicializa o provedor de banco de dados
  const initProvider = useCallback(async () => {
    try {
      await provider.init();
      setIsConnected(true);
      setError(null);
    } catch (err) {
      console.error('Erro ao inicializar provedor de banco de dados:', err);
      // Fallback automático para IndexedDB quando Supabase falhar (ex.: CORS)
      if (provider === supabaseService) {
        try {
          await dbService.init();
          setProvider(dbService);
          setIsSupabase(false);
          setIsConnected(true);
          // Mantemos um aviso suave para indicar que houve fallback
          setError(null);
          console.warn('Supabase indisponível, usando IndexedDB local (fallback automático).');
        } catch (fallbackErr) {
          console.error('Falha também ao inicializar IndexedDB:', fallbackErr);
          setError(`Erro ao conectar ao banco de dados: ${fallbackErr.message}`);
          setIsConnected(false);
        }
      } else {
        setError(`Erro ao conectar ao banco de dados: ${err.message}`);
        setIsConnected(false);
      }
    }
  }, [provider]);

  // Alterna entre provedores de banco de dados
  const toggleProvider = useCallback(async (useSupabase) => {
    const prevProvider = provider;
    const prevIsSupabase = isSupabase;
    const newProvider = useSupabase ? supabaseService : dbService;
    setIsSupabase(useSupabase);
    setProvider(newProvider);

    try {
      await newProvider.init();
      setIsConnected(true);
      setError(null);
      return true;
    } catch (err) {
      console.error('Erro ao alternar provedor de banco de dados:', err);
      // Reverte para o provedor anterior em caso de falha
      setProvider(prevProvider);
      setIsSupabase(prevIsSupabase);
      try {
        await prevProvider.init();
        setIsConnected(true);
      } catch (prevErr) {
        setIsConnected(false);
      }
      setError(`Erro ao conectar ao banco de dados: ${err.message}`);
      return false;
    }
  }, []);

  // Inicializa o provedor ao montar o componente
  useEffect(() => {
    initProvider();
  }, [initProvider]);

  return {
    provider,
    isSupabase,
    isConnected,
    error,
    toggleProvider
  };
}

export default useDatabaseProvider;
