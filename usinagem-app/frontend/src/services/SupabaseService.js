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
   * Busca itens aplicando múltiplos filtros (compatível com chamadas do tipo getWhere).
   * @param {string} tableName
   * @param {{column:string, operator:string, value:any}[]} filters
   * @returns {Promise<Array>}
   */
  async getWhere(tableName, filters = []) {
    await this.init();

    try {
      let query = this.supabase.from(tableName).select('*')

      for (const f of (filters || [])) {
        if (!f || !f.column) continue
        const op = String(f.operator || 'eq').toLowerCase()
        const col = f.column
        const val = f.value

        if (op === 'eq') query = query.eq(col, val)
        else if (op === 'neq') query = query.neq(col, val)
        else if (op === 'gt') query = query.gt(col, val)
        else if (op === 'gte') query = query.gte(col, val)
        else if (op === 'lt') query = query.lt(col, val)
        else if (op === 'lte') query = query.lte(col, val)
        else if (op === 'like') query = query.like(col, val)
        else if (op === 'ilike') query = query.ilike(col, val)
        else query = query.eq(col, val)
      }

      const { data, error } = await query

      if (error) {
        console.error(`Erro ao buscar (getWhere) em ${tableName}:`, error)
        return Promise.reject(error)
      }

      return data || []
    } catch (error) {
      console.error(`Erro ao buscar (getWhere) em ${tableName}:`, error)
      return Promise.reject(error)
    }
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
      console.log(`📝 Inserindo em ${tableName}:`, item);
      const { data, error } = await this.supabase
        .from(tableName)
        .insert(item)
        .select();

      if (error) {
        console.error(`❌ Erro ao adicionar item em ${tableName}:`, error);
        return Promise.reject(error);
      }

      console.log(`✅ Item adicionado em ${tableName}:`, data);
      
      if (!data || !data[0] || !data[0].id) {
        console.error(`⚠️ Resposta inválida ao adicionar em ${tableName}:`, data);
        return Promise.reject(new Error('Resposta inválida do servidor'));
      }

      return data[0].id;
    } catch (error) {
      console.error(`❌ Erro ao adicionar item em ${tableName}:`, error);
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
      const valorStr = typeof valor === 'string' ? valor : JSON.stringify(valor)
      const { data, error } = await this.supabase
        .from('configuracoes')
        .upsert({ chave, valor: valorStr })
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

  async obterProximoRackUsinagem() {
    await this.init();

    try {
      const { data, error } = await this.supabase
        .rpc('obter_proximo_rack_usinagem')

      if (error) {
        console.error('Erro ao obter próximo rack:', error)
        return Promise.reject(error)
      }

      return data || null
    } catch (error) {
      console.error('Erro ao obter próximo rack:', error)
      return Promise.reject(error)
    }
  }

  /**
   * Busca rack em aberto para o mesmo produto/ordem nas últimas 24 horas
   * @param {string} produto - Código do produto
   * @param {string} ordemTrabalho - Número da ordem de trabalho
   * @returns {Promise<string|null>} - Número do rack em aberto ou null
   */
  async buscarRackEmAberto(produto, ordemTrabalho) {
    await this.init();

    try {
      // Buscar apontamentos do mesmo produto/ordem nas últimas 24 horas
      // que tenham rack_acabado preenchido
      const vinteQuatroHorasAtras = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      
      const { data, error } = await this.supabase
        .from('apontamentos')
        .select('rack_acabado, created_at, rack_finalizado')
        .eq('produto', produto)
        .eq('ordem_trabalho', ordemTrabalho)
        .not('rack_acabado', 'is', null)
        .not('rack_acabado', 'eq', '')
        .gte('created_at', vinteQuatroHorasAtras)
        .order('created_at', { ascending: false })
        .limit(1)

      if (error) {
        console.error('Erro ao buscar rack em aberto:', error)
        return null
      }

      // Se não encontrou nenhum apontamento, retorna null (gerar novo rack)
      if (!data || data.length === 0) {
        return null
      }

      const ultimoApontamento = data[0]

      // Se o último apontamento marcou o rack como finalizado, retorna null (gerar novo)
      if (ultimoApontamento.rack_finalizado === true) {
        console.log('Rack foi finalizado no último apontamento, gerando novo rack')
        return null
      }

      // Retorna o rack mais recente (não finalizado)
      return ultimoApontamento.rack_acabado
    } catch (error) {
      console.error('Erro ao buscar rack em aberto:', error)
      return null
    }
  }

  async uploadImagemEstoque({ bucket, file, path }) {
    await this.init();

    try {
      if (!bucket) return Promise.reject(new Error('Bucket não informado.'))
      if (!file) return Promise.reject(new Error('Arquivo não informado.'))
      if (!path) return Promise.reject(new Error('Caminho do arquivo não informado.'))

      const { error } = await this.supabase
        .storage
        .from(bucket)
        .upload(path, file, { upsert: true, contentType: file.type || 'application/octet-stream' })

      if (error) {
        console.error('Erro ao enviar arquivo para o Storage:', error)
        return Promise.reject(error)
      }

      const { data } = this.supabase
        .storage
        .from(bucket)
        .getPublicUrl(path)

      return data?.publicUrl || null
    } catch (error) {
      console.error('Erro ao enviar arquivo para o Storage:', error)
      return Promise.reject(error)
    }
  }
}

// Exporta uma instância única do serviço
const supabaseService = new SupabaseService();
export default supabaseService;
