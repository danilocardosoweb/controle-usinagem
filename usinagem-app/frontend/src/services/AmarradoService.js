import { supabase } from '../config/supabase';

/**
 * Serviço para gerenciar modelos de amarrado no banco de dados
 * Salva por ferramenta + comprimento, permitindo reutilização em múltiplas abas
 */

export const AmarradoService = {
  /**
   * Salva um novo modelo de amarrado ou atualiza um existente
   * Chave composta: ferramenta + comprimento + nome
   */
  async salvarModelo(modelo) {
    try {
      // Se tem ID, é atualização
      if (modelo.id) {
        const { data, error } = await supabase
          .from('amarrado_modelos')
          .update({
            nome: modelo.nome,
            descricao: modelo.descricao || null,
            tipo: modelo.tipo,
            quantidade: Number(modelo.quantidade) || 0,
            pecas_por_linha: Number(modelo.pecas_por_linha) || 0,
            largura: Number(modelo.largura) || 0,
            altura: Number(modelo.altura) || 0,
            espacamento: Number(modelo.espacamento) || 0,
            comprimento_perfil: Number(modelo.comprimento) || 0,
            cor: modelo.cor || null,
            mostrar_filme: modelo.mostrar_filme || false,
            ferramenta: modelo.ferramenta || null,
            comprimento_mm: Number(modelo.comprimento_mm) || null,
            criado_em: new Date().toISOString(),
          })
          .eq('id', modelo.id);

        if (error) throw error;
        return { success: true, data };
      }

      // Se não tem ID, tenta inserir novo
      // Primeiro verifica se já existe modelo com MESMO NOME + ferramenta + comprimento_mm
      const { data: existente, error: erroExistente } = await supabase
        .from('amarrado_modelos')
        .select('id')
        .eq('ferramenta', modelo.ferramenta || null)
        .eq('comprimento_mm', modelo.comprimento_mm || null)
        .eq('nome', modelo.nome)
        .limit(1)
        .single();

      // Se existe, atualiza o existente
      // Ignora erro PGRST116 (no rows) - significa que não existe nenhum modelo com esse nome
      if (existente?.id && !erroExistente) {
        const { data, error } = await supabase
          .from('amarrado_modelos')
          .update({
            nome: modelo.nome,
            descricao: modelo.descricao || null,
            tipo: modelo.tipo,
            quantidade: Number(modelo.quantidade) || 0,
            pecas_por_linha: Number(modelo.pecas_por_linha) || 0,
            largura: Number(modelo.largura) || 0,
            altura: Number(modelo.altura) || 0,
            espacamento: Number(modelo.espacamento) || 0,
            comprimento_perfil: Number(modelo.comprimento) || 0,
            cor: modelo.cor || null,
            mostrar_filme: modelo.mostrar_filme || false,
            criado_em: new Date().toISOString(),
          })
          .eq('id', existente.id);

        if (error) throw error;
        return { success: true, data };
      }

      // Se não existe, insere novo
      const { data, error } = await supabase
        .from('amarrado_modelos')
        .insert([{
          nome: modelo.nome,
          descricao: modelo.descricao || null,
          tipo: modelo.tipo,
          quantidade: Number(modelo.quantidade) || 0,
          pecas_por_linha: Number(modelo.pecas_por_linha) || 0,
          largura: Number(modelo.largura) || 0,
          altura: Number(modelo.altura) || 0,
          espacamento: Number(modelo.espacamento) || 0,
          comprimento_perfil: Number(modelo.comprimento) || 0,
          cor: modelo.cor || null,
          mostrar_filme: modelo.mostrar_filme || false,
          ferramenta: modelo.ferramenta || null,
          comprimento_mm: Number(modelo.comprimento_mm) || null,
          criado_em: new Date().toISOString(),
        }]);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Erro ao salvar modelo de amarrado:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Carrega modelos de amarrado com filtros por ferramenta e/ou comprimento
   * Busca específica: ferramenta + comprimento
   * Fallback: apenas ferramenta
   */
  async carregarModelos(filtros = {}) {
    try {
      let query = supabase.from('amarrado_modelos').select('*');

      // Busca específica: ferramenta + comprimento
      if (filtros.ferramenta && filtros.comprimento_mm) {
        query = query
          .eq('ferramenta', filtros.ferramenta)
          .eq('comprimento_mm', filtros.comprimento_mm);
      } 
      // Fallback: apenas ferramenta
      else if (filtros.ferramenta) {
        query = query.eq('ferramenta', filtros.ferramenta);
      }

      const { data, error } = await query.order('criado_em', { ascending: false });

      if (error) throw error;
      
      // Debug: mostrar todos os modelos carregados
      if (data && data.length > 0) {
        console.group('📊 MODELOS CARREGADOS');
        console.log(`Total: ${data.length} modelo(s)`);
        data.forEach((m, i) => {
          console.log(`${i + 1}. ${m.nome} | ${m.ferramenta} | ${m.comprimento_mm}mm | ${m.tipo} | ${m.quantidade}pc`);
        });
        console.groupEnd();
      }
      
      return { success: true, data };
    } catch (error) {
      console.error('Erro ao carregar modelos de amarrado:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Carrega modelo específico para ferramenta + comprimento
   * Útil para pré-carregar configuração ao abrir uma aba
   */
  async carregarModeloPorFerramenta(ferramenta, comprimento_mm) {
    try {
      const { data, error } = await supabase
        .from('amarrado_modelos')
        .select('*')
        .eq('ferramenta', ferramenta)
        .eq('comprimento_mm', comprimento_mm)
        .order('criado_em', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
      return { success: true, data };
    } catch (error) {
      console.error('Erro ao carregar modelo para ferramenta:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Carrega um modelo específico por ID
   */
  async carregarModeloPorId(id) {
    try {
      const { data, error } = await supabase
        .from('amarrado_modelos')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Erro ao carregar modelo de amarrado:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Deleta um modelo de amarrado
   */
  async deletarModelo(id) {
    try {
      const { error } = await supabase
        .from('amarrado_modelos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Erro ao deletar modelo de amarrado:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Duplica um modelo existente
   */
  async duplicarModelo(id, novoNome) {
    try {
      const resultado = await this.carregarModeloPorId(id);
      if (!resultado.success) throw new Error('Modelo não encontrado');

      const modeloOriginal = resultado.data;
      const novoModelo = {
        ...modeloOriginal,
        id: undefined,
        nome: novoNome || `${modeloOriginal.nome} (cópia)`,
        criado_em: new Date().toISOString(),
      };

      return await this.salvarModelo(novoModelo);
    } catch (error) {
      console.error('Erro ao duplicar modelo de amarrado:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * DEBUG: Lista TODOS os modelos salvos no banco
   * Use no console: AmarradoService.debugListarTodos()
   */
  async debugListarTodos() {
    try {
      const { data, error } = await supabase
        .from('amarrado_modelos')
        .select('*')
        .order('ferramenta, comprimento_mm, criado_em', { ascending: true });

      if (error) throw error;

      console.clear();
      console.log('🔍 DEBUG: TODOS OS MODELOS SALVOS NO BANCO');
      console.log('='.repeat(80));
      
      if (!data || data.length === 0) {
        console.log('❌ Nenhum modelo salvo no banco!');
        return;
      }

      console.log(`✅ Total: ${data.length} modelo(s)\n`);
      
      // Agrupar por ferramenta + comprimento
      const grupos = {};
      data.forEach(m => {
        const chave = `${m.ferramenta} | ${m.comprimento_mm}mm`;
        if (!grupos[chave]) grupos[chave] = [];
        grupos[chave].push(m);
      });

      Object.entries(grupos).forEach(([chave, modelos]) => {
        console.group(`📦 ${chave} (${modelos.length} modelo(s))`);
        modelos.forEach((m, i) => {
          console.log(`  ${i + 1}. ${m.nome}`);
          console.log(`     ID: ${m.id}`);
          console.log(`     Tipo: ${m.tipo} | Qtd: ${m.quantidade} | Por linha: ${m.pecas_por_linha}`);
          console.log(`     Dimensões: ${m.largura}mm × ${m.altura}mm | Espaçamento: ${m.espacamento}mm`);
          console.log(`     Comprimento perfil: ${m.comprimento_perfil}mm`);
          console.log(`     Criado: ${new Date(m.criado_em).toLocaleString('pt-BR')}`);
          console.log('');
        });
        console.groupEnd();
      });

      console.log('='.repeat(80));
      return { success: true, data };
    } catch (error) {
      console.error('❌ Erro ao listar modelos:', error);
      return { success: false, error: error.message };
    }
  },
};
