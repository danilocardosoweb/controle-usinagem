/**
 * Serviço de banco de dados usando IndexedDB para persistência de dados
 * Fornece uma API simplificada para operações comuns no IndexedDB
 */

class DatabaseService {
  constructor() {
    this.dbName = 'usinagemDB';
    this.dbVersion = 6; // v6: adiciona store 'lotes' com índices
    this.db = null;
    this.isInitialized = false;
  }

  /**
   * Inicializa o banco de dados
   * @returns {Promise} Promise que resolve quando o banco estiver pronto
   */
  async init() {
    if (this.isInitialized) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = (event) => {
        console.error('Erro ao abrir o banco de dados:', event.target.error);
        reject(event.target.error);
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        this.isInitialized = true;
        console.log('Banco de dados inicializado com sucesso');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Criar stores para cada tipo de dado que precisamos persistir
        if (!db.objectStoreNames.contains('pedidos')) {
          const pedidosStore = db.createObjectStore('pedidos', { keyPath: 'id' });
          pedidosStore.createIndex('pedido_seq', 'pedido_seq', { unique: false });
          pedidosStore.createIndex('cliente', 'cliente', { unique: false });
          pedidosStore.createIndex('produto', 'produto', { unique: false });
        }

        if (!db.objectStoreNames.contains('maquinas')) {
          db.createObjectStore('maquinas', { keyPath: 'id', autoIncrement: true });
        }

        if (!db.objectStoreNames.contains('insumos')) {
          db.createObjectStore('insumos', { keyPath: 'id', autoIncrement: true });
        }

        if (!db.objectStoreNames.contains('motivosParada')) {
          db.createObjectStore('motivosParada', { keyPath: 'id', autoIncrement: true });
        }

        if (!db.objectStoreNames.contains('tiposParada')) {
          db.createObjectStore('tiposParada', { keyPath: 'id', autoIncrement: true });
        }

        // Compat: stores em snake_case usadas pelos hooks quando em fallback local
        if (!db.objectStoreNames.contains('motivos_parada')) {
          db.createObjectStore('motivos_parada', { keyPath: 'id', autoIncrement: true });
        }

        if (!db.objectStoreNames.contains('tipos_parada')) {
          db.createObjectStore('tipos_parada', { keyPath: 'id', autoIncrement: true });
        }

        if (!db.objectStoreNames.contains('apontamentos')) {
          const apontamentosStore = db.createObjectStore('apontamentos', { keyPath: 'id', autoIncrement: true });
          apontamentosStore.createIndex('data', 'inicio', { unique: false });
          apontamentosStore.createIndex('maquina', 'maquina', { unique: false });
          apontamentosStore.createIndex('operador', 'operador', { unique: false });
        }

        // Lotes (dados dos amarrados/lotes importados)
        if (!db.objectStoreNames.contains('lotes')) {
          const lotesStore = db.createObjectStore('lotes', { keyPath: 'id', autoIncrement: true });
          lotesStore.createIndex('pedido_seq', 'pedido_seq', { unique: false });
          lotesStore.createIndex('codigo', 'codigo', { unique: false });
        }

        // Paradas de máquina
        if (!db.objectStoreNames.contains('paradas')) {
          const paradasStore = db.createObjectStore('paradas', { keyPath: 'id', autoIncrement: true });
          paradasStore.createIndex('inicio', 'inicio', { unique: false });
          paradasStore.createIndex('maquina', 'maquina', { unique: false });
          paradasStore.createIndex('tipo', 'tipoParada', { unique: false });
        }

        if (!db.objectStoreNames.contains('configuracoes')) {
          db.createObjectStore('configuracoes', { keyPath: 'chave' });
        }

        // Novas stores para sincronização
        if (!db.objectStoreNames.contains('local_changes')) {
          // chave: autoIncrement; campos: {store, op, payload, ts}
          const ch = db.createObjectStore('local_changes', { keyPath: 'id', autoIncrement: true });
          ch.createIndex('store', 'store', { unique: false });
        }
        if (!db.objectStoreNames.contains('sync_meta')) {
          db.createObjectStore('sync_meta', { keyPath: 'chave' });
        }

        // Configurações por ferramenta para expedição (peso linear, pcs/pallet, ripas, embalagem)
        if (!db.objectStoreNames.contains('ferramentas_cfg')) {
          const st = db.createObjectStore('ferramentas_cfg', { keyPath: 'id', autoIncrement: true });
          st.createIndex('ferramenta', 'ferramenta', { unique: false });
        }

        console.log('Estrutura do banco de dados atualizada');
      };
    });
  }

  /**
   * Adiciona um item a uma store
   * @param {string} storeName - Nome da store
   * @param {object} item - Item a ser adicionado
   * @returns {Promise} Promise com o ID do item adicionado
   */
  async add(storeName, item) {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(item);

      request.onsuccess = (event) => {
        resolve(event.target.result);
      };

      request.onerror = (event) => {
        console.error(`Erro ao adicionar item em ${storeName}:`, event.target.error);
        reject(event.target.error);
      };
    });
  }

  /**
   * Adiciona múltiplos itens a uma store
   * @param {string} storeName - Nome da store
   * @param {array} items - Array de itens a serem adicionados
   * @returns {Promise} Promise que resolve quando todos os itens forem adicionados
   */
  async addMany(storeName, items) {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      let count = 0;

      transaction.oncomplete = () => {
        resolve(count);
      };

      transaction.onerror = (event) => {
        console.error(`Erro ao adicionar múltiplos itens em ${storeName}:`, event.target.error);
        reject(event.target.error);
      };

      items.forEach(item => {
        const request = store.add(item);
        request.onsuccess = () => {
          count++;
        };
      });
    });
  }

  /**
   * Atualiza um item em uma store
   * @param {string} storeName - Nome da store
   * @param {object} item - Item a ser atualizado (deve conter a chave primária)
   * @returns {Promise} Promise que resolve quando o item for atualizado
   */
  async update(storeName, item) {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(item);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = (event) => {
        console.error(`Erro ao atualizar item em ${storeName}:`, event.target.error);
        reject(event.target.error);
      };
    });
  }

  /**
   * Remove um item de uma store
   * @param {string} storeName - Nome da store
   * @param {string|number} id - ID do item a ser removido
   * @returns {Promise} Promise que resolve quando o item for removido
   */
  async remove(storeName, id) {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = (event) => {
        console.error(`Erro ao remover item de ${storeName}:`, event.target.error);
        reject(event.target.error);
      };
    });
  }

  /**
   * Limpa todos os itens de uma store
   * @param {string} storeName - Nome da store
   * @returns {Promise} Promise que resolve quando a store for limpa
   */
  async clear(storeName) {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = (event) => {
        console.error(`Erro ao limpar store ${storeName}:`, event.target.error);
        reject(event.target.error);
      };
    });
  }

  /**
   * Obtém um item pelo ID
   * @param {string} storeName - Nome da store
   * @param {string|number} id - ID do item
   * @returns {Promise} Promise com o item encontrado ou null
   */
  async getById(storeName, id) {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = (event) => {
        resolve(event.target.result);
      };

      request.onerror = (event) => {
        console.error(`Erro ao buscar item em ${storeName}:`, event.target.error);
        reject(event.target.error);
      };
    });
  }

  /**
   * Obtém todos os itens de uma store
   * @param {string} storeName - Nome da store
   * @returns {Promise} Promise com array de itens
   */
  async getAll(storeName) {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = (event) => {
        resolve(event.target.result);
      };

      request.onerror = (event) => {
        console.error(`Erro ao buscar todos os itens de ${storeName}:`, event.target.error);
        reject(event.target.error);
      };
    });
  }

  /**
   * Busca itens por um índice específico
   * @param {string} storeName - Nome da store
   * @param {string} indexName - Nome do índice
   * @param {any} value - Valor a ser buscado
   * @returns {Promise} Promise com array de itens encontrados
   */
  async getByIndex(storeName, indexName, value) {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = (event) => {
        resolve(event.target.result);
      };

      request.onerror = (event) => {
        console.error(`Erro ao buscar por índice em ${storeName}:`, event.target.error);
        reject(event.target.error);
      };
    });
  }

  /**
   * Salva uma configuração
   * @param {string} chave - Chave da configuração
   * @param {any} valor - Valor da configuração
   * @returns {Promise} Promise que resolve quando a configuração for salva
   */
  async salvarConfiguracao(chave, valor) {
    return this.update('configuracoes', { chave, valor });
  }

  /**
   * Obtém uma configuração
   * @param {string} chave - Chave da configuração
   * @returns {Promise} Promise com o valor da configuração ou null
   */
  async obterConfiguracao(chave) {
    const config = await this.getById('configuracoes', chave);
    return config ? config.valor : null;
  }

  // ====== Suporte a Sincronização ======
  async queueChange(store, op, payload) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['local_changes'], 'readwrite');
      const st = tx.objectStore('local_changes');
      const ts = new Date().toISOString();
      const req = st.add({ store, op, payload, ts });
      req.onsuccess = () => resolve(true);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async getAllChanges(store) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['local_changes'], 'readonly');
      const st = tx.objectStore('local_changes');
      const idx = st.index('store');
      const req = idx.getAll(store);
      req.onsuccess = (e) => resolve(e.target.result || []);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async clearChanges(ids) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['local_changes'], 'readwrite');
      const st = tx.objectStore('local_changes');
      (ids || []).forEach((id) => st.delete(id));
      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  async setSyncMeta(chave, valor) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['sync_meta'], 'readwrite');
      const st = tx.objectStore('sync_meta');
      const req = st.put({ chave, valor });
      req.onsuccess = () => resolve(true);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async getSyncMeta(chave) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['sync_meta'], 'readonly');
      const st = tx.objectStore('sync_meta');
      const req = st.get(chave);
      req.onsuccess = (e) => resolve(e.target.result ? e.target.result.valor : null);
      req.onerror = (e) => reject(e.target.error);
    });
  }
}

// Exporta uma instância única do serviço
const dbService = new DatabaseService();
export default dbService;
