import { useState, useEffect, useCallback } from 'react';
import supabaseService from '../services/SupabaseService';

/**
 * Hook simplificado para usar apenas Supabase
 * Substitui o useDatabase que tinha lógica híbrida
 */
export function useSupabase(tableName) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // Inicializar conexão
  const initConnection = useCallback(async () => {
    try {
      await supabaseService.init();
      setIsConnected(true);
      setError(null);
    } catch (err) {
      console.error('Erro ao conectar Supabase:', err);
      setError(`Erro de conexão: ${err.message}`);
      setIsConnected(false);
    }
  }, []);

  // Carregar todos os itens
  const loadItems = useCallback(async () => {
    if (!isConnected) return;
    
    try {
      setLoading(true);
      const data = await supabaseService.getAll(tableName);
      setItems(data || []);
      setError(null);
    } catch (err) {
      console.error(`Erro ao carregar ${tableName}:`, err);
      setError(`Erro ao carregar dados: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [tableName, isConnected]);

  // Adicionar item
  const addItem = useCallback(async (item) => {
    try {
      const id = await supabaseService.add(tableName, item);
      await loadItems(); // Recarrega a lista
      return id;
    } catch (err) {
      console.error(`Erro ao adicionar em ${tableName}:`, err);
      setError(`Erro ao adicionar: ${err.message}`);
      throw err;
    }
  }, [tableName, loadItems]);

  // Adicionar múltiplos itens
  const addItems = useCallback(async (items) => {
    try {
      await supabaseService.addMany(tableName, items);
      await loadItems(); // Recarrega a lista
    } catch (err) {
      console.error(`Erro ao adicionar múltiplos em ${tableName}:`, err);
      setError(`Erro ao adicionar múltiplos: ${err.message}`);
      throw err;
    }
  }, [tableName, loadItems]);

  // Atualizar item
  const updateItem = useCallback(async (item) => {
    try {
      await supabaseService.update(tableName, item);
      await loadItems(); // Recarrega a lista
    } catch (err) {
      console.error(`Erro ao atualizar em ${tableName}:`, err);
      setError(`Erro ao atualizar: ${err.message}`);
      throw err;
    }
  }, [tableName, loadItems]);

  // Remover item
  const removeItem = useCallback(async (id) => {
    try {
      await supabaseService.remove(tableName, id);
      await loadItems(); // Recarrega a lista
    } catch (err) {
      console.error(`Erro ao remover de ${tableName}:`, err);
      setError(`Erro ao remover: ${err.message}`);
      throw err;
    }
  }, [tableName, loadItems]);

  // Limpar todos os itens
  const clearItems = useCallback(async () => {
    try {
      await supabaseService.clear(tableName);
      await loadItems(); // Recarrega a lista
    } catch (err) {
      console.error(`Erro ao limpar ${tableName}:`, err);
      setError(`Erro ao limpar: ${err.message}`);
      throw err;
    }
  }, [tableName, loadItems]);

  // Buscar por campo específico
  const getByField = useCallback(async (fieldName, value) => {
    try {
      const data = await supabaseService.getByIndex(tableName, fieldName, value);
      return data || [];
    } catch (err) {
      console.error(`Erro ao buscar em ${tableName}:`, err);
      setError(`Erro na busca: ${err.message}`);
      return [];
    }
  }, [tableName]);

  // Inicializar ao montar
  useEffect(() => {
    initConnection();
  }, [initConnection]);

  // Carregar dados quando conectar
  useEffect(() => {
    if (isConnected) {
      loadItems();
    }
  }, [isConnected, loadItems]);

  return {
    items,
    loading,
    error,
    isConnected,
    addItem,
    addItems,
    updateItem,
    removeItem,
    clearItems,
    loadItems,
    getByField
  };
}

export default useSupabase;
