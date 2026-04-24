import supabaseService from './SupabaseService';

/**
 * Serviço de Auditoria - Registra ações dos usuários
 */
class AuditoriaService {
  /**
   * Registrar uma ação no histórico
   * @param {Object} params - Parâmetros da ação
   * @param {Object} params.usuario - Dados do usuário
   * @param {string} params.acao - Tipo de ação (login, criar, editar, excluir, etc)
   * @param {string} params.modulo - Módulo do sistema (usuarios, pedidos, etc)
   * @param {string} params.descricao - Descrição detalhada da ação
   * @param {Object} params.dadosAnteriores - Estado anterior (opcional)
   * @param {Object} params.dadosNovos - Estado novo (opcional)
   */
  async registrarAcao({ usuario, acao, modulo, descricao, dadosAnteriores = null, dadosNovos = null }) {
    try {
      // Obter informações do navegador
      const userAgent = navigator.userAgent;
      
      // Tentar obter IP (limitado no browser, mas podemos registrar o que temos)
      const ipAddress = await this.obterIP();

      const registro = {
        usuario_id: usuario?.id || null,
        usuario_nome: usuario?.nome || 'Desconhecido',
        usuario_email: usuario?.email || usuario?.username || 'desconhecido@sistema.com',
        acao,
        modulo,
        descricao,
        dados_anteriores: dadosAnteriores,
        dados_novos: dadosNovos,
        ip_address: ipAddress,
        user_agent: userAgent,
        created_at: new Date().toISOString()
      };

      await supabaseService.add('historico_acoes', registro);
      
      console.log('✅ Ação registrada:', { acao, modulo, usuario: usuario?.nome });
    } catch (error) {
      // Não bloquear a operação principal se auditoria falhar
      console.error('❌ Erro ao registrar auditoria:', error);
    }
  }

  /**
   * Obter IP do usuário (limitado no browser)
   */
  async obterIP() {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'N/A';
    }
  }

  /**
   * Registrar login
   */
  async registrarLogin(usuario) {
    await this.registrarAcao({
      usuario,
      acao: 'login',
      modulo: 'autenticacao',
      descricao: `Login realizado por ${usuario.nome}`
    });
  }

  /**
   * Registrar logout
   */
  async registrarLogout(usuario) {
    await this.registrarAcao({
      usuario,
      acao: 'logout',
      modulo: 'autenticacao',
      descricao: `Logout realizado por ${usuario.nome}`
    });
  }

  /**
   * Registrar criação de registro
   */
  async registrarCriacao(usuario, modulo, descricao, dadosNovos) {
    await this.registrarAcao({
      usuario,
      acao: 'criar',
      modulo,
      descricao,
      dadosNovos
    });
  }

  /**
   * Registrar edição de registro
   */
  async registrarEdicao(usuario, modulo, descricao, dadosAnteriores, dadosNovos) {
    await this.registrarAcao({
      usuario,
      acao: 'editar',
      modulo,
      descricao,
      dadosAnteriores,
      dadosNovos
    });
  }

  /**
   * Registrar exclusão de registro
   */
  async registrarExclusao(usuario, modulo, descricao, dadosAnteriores) {
    await this.registrarAcao({
      usuario,
      acao: 'excluir',
      modulo,
      descricao,
      dadosAnteriores
    });
  }

  /**
   * Registrar acesso negado
   */
  async registrarAcessoNegado(usuario, modulo, descricao) {
    await this.registrarAcao({
      usuario,
      acao: 'acesso_negado',
      modulo,
      descricao
    });
  }

  /**
   * Registrar exportação
   */
  async registrarExportacao(usuario, modulo, descricao) {
    await this.registrarAcao({
      usuario,
      acao: 'exportar',
      modulo,
      descricao
    });
  }

  /**
   * Buscar histórico de um usuário
   */
  async buscarHistoricoUsuario(usuarioId, limite = 50) {
    try {
      const historico = await supabaseService.getAll('historico_acoes');
      return historico
        .filter(h => h.usuario_id === usuarioId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, limite);
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      return [];
    }
  }

  /**
   * Buscar histórico geral (apenas admins)
   */
  async buscarHistoricoGeral(filtros = {}) {
    try {
      let historico = await supabaseService.getAll('historico_acoes');
      
      // Aplicar filtros
      if (filtros.acao) {
        historico = historico.filter(h => h.acao === filtros.acao);
      }
      
      if (filtros.modulo) {
        historico = historico.filter(h => h.modulo === filtros.modulo);
      }
      
      if (filtros.usuarioId) {
        historico = historico.filter(h => h.usuario_id === filtros.usuarioId);
      }
      
      if (filtros.dataInicio) {
        historico = historico.filter(h => new Date(h.created_at) >= new Date(filtros.dataInicio));
      }
      
      if (filtros.dataFim) {
        historico = historico.filter(h => new Date(h.created_at) <= new Date(filtros.dataFim));
      }
      
      // Ordenar por data (mais recente primeiro)
      return historico.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } catch (error) {
      console.error('Erro ao buscar histórico geral:', error);
      return [];
    }
  }

  /**
   * Obter estatísticas de ações
   */
  async obterEstatisticas(usuarioId = null) {
    try {
      let historico = await supabaseService.getAll('historico_acoes');
      
      if (usuarioId) {
        historico = historico.filter(h => h.usuario_id === usuarioId);
      }
      
      const stats = {
        total: historico.length,
        porAcao: {},
        porModulo: {},
        ultimaAcao: historico.length > 0 ? historico.sort((a, b) => 
          new Date(b.created_at) - new Date(a.created_at)
        )[0] : null
      };
      
      historico.forEach(h => {
        stats.porAcao[h.acao] = (stats.porAcao[h.acao] || 0) + 1;
        stats.porModulo[h.modulo] = (stats.porModulo[h.modulo] || 0) + 1;
      });
      
      return stats;
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      return { total: 0, porAcao: {}, porModulo: {}, ultimaAcao: null };
    }
  }
}

export default new AuditoriaService();
