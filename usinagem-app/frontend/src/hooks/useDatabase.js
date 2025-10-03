import { useState, useEffect, useCallback } from 'react';
import dbService from '../services/DatabaseService';
import { useDatabaseProvider } from './useDatabaseProvider';

/**
 * Hook personalizado para interagir com o IndexedDB
 * @param {string} storeName - Nome da store a ser utilizada
 * @returns {Object} Métodos e estados para manipulação de dados
 */
export function useDatabase(storeName, useSupabase = false) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { provider, isSupabase, isConnected, error: providerError } = useDatabaseProvider(useSupabase);

  // Efeito para atualizar o erro quando o provedor mudar
  useEffect(() => {
    if (providerError) {
      setError(providerError);
    }
  }, [providerError]);

  // Carregar todos os itens da store
  const loadItems = useCallback(async () => {
    if (!isConnected) {
      setError('Banco de dados não está conectado');
      return;
    }
    
    try {
      setLoading(true);
      const data = await provider.getAll(storeName);
      setItems(data || []);
      setError(null);
    } catch (err) {
      console.error(`Erro ao carregar itens de ${storeName}:`, err);
      setError(`Erro ao carregar dados: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [storeName, provider, isConnected]);

  // Adicionar um item
  const addItem = useCallback(async (item) => {
    if (!isConnected) {
      setError('Banco de dados não está conectado');
      throw new Error('Banco de dados não está conectado');
    }
    
    try {
      const id = await provider.add(storeName, item);
      const newItem = { ...item, id };
      setItems(prev => [...prev, newItem]);
      // Enfileira alteração para sincronização (coleções suportadas)
      if (['pedidos','apontamentos'].includes(storeName)) {
        await dbService.queueChange(storeName, 'upsert', newItem);
      }
      return id;
    } catch (err) {
      console.error(`Erro ao adicionar item em ${storeName}:`, err);
      setError(`Erro ao adicionar item: ${err.message}`);
      throw err;
    }
  }, [storeName, provider, isConnected]);

  // Adicionar múltiplos itens
  const addItems = useCallback(async (newItems) => {
    if (!isConnected) {
      setError('Banco de dados não está conectado');
      throw new Error('Banco de dados não está conectado');
    }
    
    try {
      await provider.addMany(storeName, newItems);
      loadItems(); // Recarregar todos os itens após adicionar vários
      return true;
    } catch (err) {
      console.error(`Erro ao adicionar múltiplos itens em ${storeName}:`, err);
      setError(`Erro ao adicionar itens: ${err.message}`);
      throw err;
    }
  }, [storeName, loadItems, provider, isConnected]);

  // Atualizar um item
  const updateItem = useCallback(async (item) => {
    if (!isConnected) {
      setError('Banco de dados não está conectado');
      throw new Error('Banco de dados não está conectado');
    }
    
    try {
      await provider.update(storeName, item);
      setItems(prev => 
        prev.map(i => (i.id === item.id ? item : i))
      );
      if (['pedidos','apontamentos'].includes(storeName)) {
        await dbService.queueChange(storeName, 'upsert', item);
      }
      return true;
    } catch (err) {
      console.error(`Erro ao atualizar item em ${storeName}:`, err);
      setError(`Erro ao atualizar item: ${err.message}`);
      throw err;
    }
  }, [storeName, provider, isConnected]);

  // Remover um item
  const removeItem = useCallback(async (id) => {
    if (!isConnected) {
      setError('Banco de dados não está conectado');
      throw new Error('Banco de dados não está conectado');
    }
    
    try {
      await provider.remove(storeName, id);
      setItems(prev => prev.filter(item => item.id !== id));
      if (['pedidos','apontamentos'].includes(storeName)) {
        await dbService.queueChange(storeName, 'delete', { id });
      }
      return true;
    } catch (err) {
      console.error(`Erro ao remover item de ${storeName}:`, err);
      setError(`Erro ao remover item: ${err.message}`);
      throw err;
    }
  }, [storeName, provider, isConnected]);

  // Limpar todos os itens
  const clearItems = useCallback(async () => {
    if (!isConnected) {
      setError('Banco de dados não está conectado');
      throw new Error('Banco de dados não está conectado');
    }
    
    try {
      await provider.clear(storeName);
      setItems([]);
      return true;
    } catch (err) {
      console.error(`Erro ao limpar store ${storeName}:`, err);
      setError(`Erro ao limpar dados: ${err.message}`);
      throw err;
    }
  }, [storeName, provider, isConnected]);

  // Buscar item por ID
  const getItemById = useCallback(async (id) => {
    if (!isConnected) {
      setError('Banco de dados não está conectado');
      throw new Error('Banco de dados não está conectado');
    }
    
    try {
      return await provider.getById(storeName, id);
    } catch (err) {
      console.error(`Erro ao buscar item por ID em ${storeName}:`, err);
      setError(`Erro ao buscar item: ${err.message}`);
      throw err;
    }
  }, [storeName, provider, isConnected]);

  // Buscar itens por índice
  const getItemsByIndex = useCallback(async (indexName, value) => {
    if (!isConnected) {
      setError('Banco de dados não está conectado');
      throw new Error('Banco de dados não está conectado');
    }
    
    try {
      return await provider.getByIndex(storeName, indexName, value);
    } catch (err) {
      console.error(`Erro ao buscar itens por índice em ${storeName}:`, err);
      setError(`Erro ao buscar itens: ${err.message}`);
      throw err;
    }
  }, [storeName, provider, isConnected]);

  // Carregar itens ao montar o componente
  useEffect(() => {
    loadItems();
  }, [loadItems]);

  return {
    items,
    loading,
    error,
    loadItems,
    addItem,
    addItems,
    updateItem,
    removeItem,
    clearItems,
    getItemById,
    getItemsByIndex
  };
}

/**
 * Hook para gerenciar configurações do sistema
 * @param {boolean} useSupabase - Se true, usa o Supabase; se false, usa o IndexedDB local
 * @returns {Object} Métodos para manipular configurações
 */
export function useConfiguracoes(useSupabase = false) {
  const [configuracoes, setConfiguracoes] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { provider, isSupabase, isConnected, error: providerError } = useDatabaseProvider(useSupabase);

  // Efeito para atualizar o erro quando o provedor mudar
  useEffect(() => {
    if (providerError) {
      setError(providerError);
    }
  }, [providerError]);

  // Carregar todas as configurações
  const loadConfiguracoes = useCallback(async () => {
    if (!isConnected) {
      setError('Banco de dados não está conectado');
      return;
    }
    
    try {
      setLoading(true);
      const configs = await provider.getAll('configuracoes');
      const configObj = {};
      configs.forEach(config => {
        configObj[config.chave] = config.valor;
      });
      setConfiguracoes(configObj);
      setError(null);
    } catch (err) {
      console.error('Erro ao carregar configurações:', err);
      setError(`Erro ao carregar configurações: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [provider, isConnected]);

  // Salvar uma configuração
  const salvarConfiguracao = useCallback(async (chave, valor) => {
    if (!isConnected) {
      setError('Banco de dados não está conectado');
      throw new Error('Banco de dados não está conectado');
    }
    
    try {
      await provider.salvarConfiguracao(chave, valor);
      setConfiguracoes(prev => ({
        ...prev,
        [chave]: valor
      }));
      return true;
    } catch (err) {
      console.error(`Erro ao salvar configuração ${chave}:`, err);
      setError(`Erro ao salvar configuração: ${err.message}`);
      throw err;
    }
  }, [provider, isConnected]);

  // Obter uma configuração
  const obterConfiguracao = useCallback(async (chave) => {
    if (!isConnected) {
      setError('Banco de dados não está conectado');
      throw new Error('Banco de dados não está conectado');
    }
    
    try {
      return await provider.obterConfiguracao(chave);
    } catch (err) {
      console.error(`Erro ao obter configuração ${chave}:`, err);
      setError(`Erro ao obter configuração: ${err.message}`);
      throw err;
    }
  }, [provider, isConnected]);

  // Carregar configurações ao montar o componente
  useEffect(() => {
    loadConfiguracoes();
  }, [loadConfiguracoes]);

  return {
    configuracoes,
    loading,
    error,
    salvarConfiguracao,
    obterConfiguracao,
    loadConfiguracoes
  };
}

export default useDatabase;
