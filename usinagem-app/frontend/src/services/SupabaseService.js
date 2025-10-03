/**
 * Serviço de banco de dados usando Supabase para persistência de dados
 * Fornece uma API compatível com o DatabaseService existente
 */

import { createClient } from '@supabase/supabase-js';

class SupabaseService {
  constructor() {
    this.supabaseUrl = import.meta?.env?.VITE_SUPABASE_URL || '';
    this.supabaseKey = import.meta?.env?.VITE_SUPABASE_ANON_KEY || '';
    this.supabase = null;
    this.isInitialized = false;
    // Debug seguro: verifica se as variáveis do Vite foram carregadas (não imprime valores)
    try {
      // eslint-disable-next-line no-console
      console.log('[Supabase ENV] url:', !!this.supabaseUrl, 'key:', !!this.supabaseKey)
    } catch {}
  }

  /**
   * Inicializa o cliente Supabase
   * @returns {Promise} Promise que resolve quando o cliente estiver pronto
   */
  async init() {
    if (this.isInitialized) return Promise.resolve();
    if (!this.supabaseUrl || !this.supabaseKey) {
      const msg = 'Configuração do Supabase ausente: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env';
      console.error(msg);
      return Promise.reject(new Error(msg));
    }
    if (!this.supabase) {
      this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
    }
    // Não forçar consulta a nenhuma tabela específica para não falhar quando o schema ainda não foi aplicado
    this.isInitialized = true;
    console.log('Cliente Supabase pronto');
    return Promise.resolve();
  }

  /**
   * Adiciona um item a uma tabela
   * @param {string} tableName - Nome da tabela
   * @param {object} item - Item a ser adicionado
   * @returns {Promise} Promise com o ID do item adicionado
   */
  async add(tableName, item) {
    await this.init();

    try {
      const { data, error } = await this.supabase
        .from(tableName)
        .insert(item)
        .select();

      if (error) {
        console.error(`Erro ao adicionar item em ${tableName}:`, error);
        return Promise.reject(error);
      }

      return data[0].id;
    } catch (error) {
      console.error(`Erro ao adicionar item em ${tableName}:`, error);
      return Promise.reject(error);
    }
  }

  /**
   * Adiciona múltiplos itens a uma tabela
   * @param {string} tableName - Nome da tabela
   * @param {array} items - Array de itens a serem adicionados
   * @returns {Promise} Promise que resolve quando todos os itens forem adicionados
   */
  async addMany(tableName, items) {
    await this.init();

    try {
      const { data, error } = await this.supabase
        .from(tableName)
        .insert(items);

      if (error) {
        console.error(`Erro ao adicionar múltiplos itens em ${tableName}:`, error);
        return Promise.reject(error);
      }

      return items.length;
    } catch (error) {
      console.error(`Erro ao adicionar múltiplos itens em ${tableName}:`, error);
      return Promise.reject(error);
    }
  }

  /**
   * Atualiza um item em uma tabela
   * @param {string} tableName - Nome da tabela
   * @param {object} item - Item a ser atualizado (deve conter a chave primária)
   * @returns {Promise} Promise que resolve quando o item for atualizado
   */
  async update(tableName, item) {
    await this.init();

    try {
      const { error } = await this.supabase
        .from(tableName)
        .update(item)
        .eq('id', item.id);

      if (error) {
        console.error(`Erro ao atualizar item em ${tableName}:`, error);
        return Promise.reject(error);
      }

      return Promise.resolve();
    } catch (error) {
      console.error(`Erro ao atualizar item em ${tableName}:`, error);
      return Promise.reject(error);
    }
  }

  /**
   * Remove um item de uma tabela
   * @param {string} tableName - Nome da tabela
   * @param {string|number} id - ID do item a ser removido
   * @returns {Promise} Promise que resolve quando o item for removido
   */
  async remove(tableName, id) {
    await this.init();

    try {
      const { error } = await this.supabase
        .from(tableName)
        .delete()
        .eq('id', id);

      if (error) {
        console.error(`Erro ao remover item de ${tableName}:`, error);
        return Promise.reject(error);
      }

      return Promise.resolve();
    } catch (error) {
      console.error(`Erro ao remover item de ${tableName}:`, error);
      return Promise.reject(error);
    }
  }

  /**
   * Limpa todos os itens de uma tabela
   * @param {string} tableName - Nome da tabela
   * @returns {Promise} Promise que resolve quando a tabela for limpa
   */
  async clear(tableName) {
    await this.init();

    try {
      const { error } = await this.supabase
        .from(tableName)
        .delete()
        .neq('id', -1); // Deleta todos os registros

      if (error) {
        console.error(`Erro ao limpar tabela ${tableName}:`, error);
        return Promise.reject(error);
      }

      return Promise.resolve();
    } catch (error) {
      console.error(`Erro ao limpar tabela ${tableName}:`, error);
      return Promise.reject(error);
    }
  }

  /**
   * Obtém um item pelo ID
   * @param {string} tableName - Nome da tabela
   * @param {string|number} id - ID do item
   * @returns {Promise} Promise com o item encontrado ou null
   */
  async getById(tableName, id) {
    await this.init();

    try {
      const { data, error } = await this.supabase
        .from(tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error(`Erro ao buscar item em ${tableName}:`, error);
        return Promise.reject(error);
      }

      return data;
    } catch (error) {
      console.error(`Erro ao buscar item em ${tableName}:`, error);
      return Promise.reject(error);
    }
  }

  /**
   * Obtém todos os itens de uma tabela
   * @param {string} tableName - Nome da tabela
   * @returns {Promise} Promise com array de itens
   */
  async getAll(tableName) {
    await this.init();

    try {
      const { data, error } = await this.supabase
        .from(tableName)
        .select('*');

      if (error) {
        console.error(`Erro ao buscar todos os itens de ${tableName}:`, error);
        return Promise.reject(error);
      }

      return data;
    } catch (error) {
      console.error(`Erro ao buscar todos os itens de ${tableName}:`, error);
      return Promise.reject(error);
    }
  }

  /**
   * Busca itens por um campo específico
   * @param {string} tableName - Nome da tabela
   * @param {string} fieldName - Nome do campo
   * @param {any} value - Valor a ser buscado
   * @returns {Promise} Promise com array de itens encontrados
   */
  async getByIndex(tableName, fieldName, value) {
    await this.init();

    try {
      const { data, error } = await this.supabase
        .from(tableName)
        .select('*')
        .eq(fieldName, value);

      if (error) {
        console.error(`Erro ao buscar por índice em ${tableName}:`, error);
        return Promise.reject(error);
      }

      return data;
    } catch (error) {
      console.error(`Erro ao buscar por índice em ${tableName}:`, error);
      return Promise.reject(error);
    }
  }

  /**
   * Salva uma configuração
   * @param {string} chave - Chave da configuração
   * @param {any} valor - Valor da configuração
   * @returns {Promise} Promise que resolve quando a configuração for salva
   */
  async salvarConfiguracao(chave, valor) {
    try {
      const { data, error } = await this.supabase
        .from('configuracoes')
        .upsert({ chave, valor })
        .select();

      if (error) {
        console.error('Erro ao salvar configuração:', error);
        return Promise.reject(error);
      }

      return Promise.resolve();
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      return Promise.reject(error);
    }
  }

  /**
   * Obtém uma configuração
   * @param {string} chave - Chave da configuração
   * @returns {Promise} Promise com o valor da configuração ou null
   */
  async obterConfiguracao(chave) {
    try {
      const { data, error } = await this.supabase
        .from('configuracoes')
        .select('valor')
        .eq('chave', chave)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // Não encontrado
          return null;
        }
        console.error('Erro ao obter configuração:', error);
        return Promise.reject(error);
      }

      return data ? data.valor : null;
    } catch (error) {
      console.error('Erro ao obter configuração:', error);
      return Promise.reject(error);
    }
  }
}

// Exporta uma instância única do serviço
const supabaseService = new SupabaseService();
export default supabaseService;
