/**
 * Serviço de banco de dados usando Supabase para persistência de dados
 * Fornece uma API compatível com o DatabaseService existente
 */

import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG, validateSupabaseConfig } from '../config/supabase.js';

class SupabaseService {
  constructor() {
    this.supabaseUrl = SUPABASE_CONFIG.url;
    this.supabaseKey = SUPABASE_CONFIG.anonKey;
    this.supabase = null;
    this.isInitialized = false;
    // Debug seguro: verifica se as variáveis do Vite foram carregadas (não imprime valores)
    try {
      // eslint-disable-next-line no-console
      console.log('[Supabase ENV] url:', !!this.supabaseUrl, 'key:', !!this.supabaseKey)
      // Logs temporários para diagnosticar variáveis expostas pelo Vite
      // eslint-disable-next-line no-console
      console.log('[ENV keys]', Object.keys(import.meta?.env || {}))
      // eslint-disable-next-line no-console
      console.log('[VITE vars]', {
        VITE_SUPABASE_URL_present: typeof import.meta?.env?.VITE_SUPABASE_URL === 'string',
        VITE_SUPABASE_ANON_KEY_length: (import.meta?.env?.VITE_SUPABASE_ANON_KEY || '').length
      })
    } catch {}
  }

  /**
   * Busca itens por um conjunto de valores (operador IN)
   * @param {string} tableName - Nome da tabela
   * @param {string} fieldName - Nome do campo
   * @param {any[]} values - Array de valores
   * @returns {Promise<Array>} Itens encontrados
   */
  async getByIn(tableName, fieldName, values) {
    await this.init();

    try {
      if (!Array.isArray(values) || values.length === 0) return []
      const { data, error } = await this.supabase
        .from(tableName)
        .select('*')
        .in(fieldName, values);

      if (error) {
        console.error(`Erro ao buscar por IN em ${tableName}:`, error);
        return Promise.reject(error);
      }

      return data || [];
    } catch (error) {
      console.error(`Erro ao buscar por IN em ${tableName}:`, error);
      return Promise.reject(error);
    }
  }

  /**
   * Inicializa o cliente Supabase
   * @returns {Promise} Promise que resolve quando o cliente estiver pronto
   */
  async init() {
    if (this.isInitialized) return Promise.resolve();
    
    try {
      // Validar configuração
      validateSupabaseConfig();
      
      if (!this.supabase) {
        this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
      }
      
      // Não forçar consulta a nenhuma tabela específica para não falhar quando o schema ainda não foi aplicado
      this.isInitialized = true;
      console.log('✅ Cliente Supabase inicializado com sucesso');
      return Promise.resolve();
    } catch (error) {
      console.error('❌ Erro ao inicializar Supabase:', error.message);
      return Promise.reject(error);
    }
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
      // Limitar o tamanho do lote para evitar timeout
      const MAX_BATCH_SIZE = 100;
      
      if (items.length > MAX_BATCH_SIZE) {
        console.warn(`Lote muito grande (${items.length}). Considere usar lotes menores.`);
      }

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
   * Remove múltiplos itens de uma tabela
   * @param {string} tableName - Nome da tabela
   * @param {array} ids - Array de IDs dos itens a serem removidos
   * @returns {Promise} Promise que resolve quando os itens forem removidos
   */
  async removeMany(tableName, ids) {
    await this.init();
    try {
      if (!Array.isArray(ids) || ids.length === 0) return Promise.resolve();
      const { error } = await this.supabase
        .from(tableName)
        .delete()
        .in('id', ids);
      if (error) {
        console.error(`Erro ao remover múltiplos itens de ${tableName}:`, error);
        return Promise.reject(error);
      }
      return Promise.resolve();
    } catch (error) {
      console.error(`Erro ao remover múltiplos itens de ${tableName}:`, error);
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
      // Remoção segura de todos os registros sem depender do tipo de 'id'
      // Estratégia: condição universal "id IS NOT NULL" via operador 'is' do PostgREST
      const { error } = await this.supabase
        .from(tableName)
        .delete()
        .not('id', 'is', null);

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
      // Para tabelas grandes como 'lotes', buscar todos os registros em lotes
      if (tableName === 'lotes') {
        let allData = [];
        let from = 0;
        const batchSize = 1000;
        
        while (true) {
          const { data, error } = await this.supabase
            .from(tableName)
            .select('*')
            .range(from, from + batchSize - 1);

          if (error) {
            console.error(`Erro ao buscar lotes (lote ${from}-${from + batchSize - 1}):`, error);
            return Promise.reject(error);
          }

          if (!data || data.length === 0) break;
          
          allData = allData.concat(data);
          console.log(`📦 Carregados ${allData.length} lotes...`);
          
          if (data.length < batchSize) break; // Último lote
          from += batchSize;
        }
        
        console.log(`✅ Total de lotes carregados: ${allData.length}`);
        return allData;
      }

      // Para outras tabelas, busca normal
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
