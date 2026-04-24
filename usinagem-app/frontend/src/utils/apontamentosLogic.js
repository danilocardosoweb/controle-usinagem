/**
 * Lógica de Apontamentos - Funções Puras
 * 
 * Funções utilitárias para processamento de apontamentos da Alúnica.
 * Todas as funções são puras (sem side-effects) e podem ser testadas isoladamente.
 * 
 * @module apontamentosLogic
 * @created 18/11/2024
 * @author Cascade AI
 */

/**
 * Sumariza apontamentos agrupando por lote e estágio
 * 
 * Agrega apontamentos de um pedido, somando quantidades por lote e estágio.
 * Útil para exibir resumos de produção nos cards da Alúnica.
 * 
 * @param {Array} apontList - Lista de apontamentos do pedido
 * @param {Array|null} allowedStages - Estágios permitidos (null = todos)
 * @returns {Array} Array de objetos com resumo por lote
 * 
 * @example
 * const resumo = summarizeApontamentos(apontamentos, ['para-inspecao']);
 * // [{lote: 'A1', total: 100, inspecao: 100, embalagem: 0, ...}]
 */
export const summarizeApontamentos = (apontList, allowedStages = null) => {
  if (!Array.isArray(apontList) || !apontList.length) return [];

  const stageFilter = allowedStages ? new Set(allowedStages) : null;
  const aggregates = {};

  apontList.forEach((row) => {
    if (!row || row.exp_unidade !== 'alunica') return;
    if (stageFilter && !stageFilter.has(row.exp_stage)) return;
    
    const loteKey = row.lote || '(sem lote)';
    
    if (!aggregates[loteKey]) {
      aggregates[loteKey] = {
        lote: loteKey,
        loteExterno: row.lote_externo || null,
        total: 0,
        inspecao: 0,
        embalagem: 0,
        inicio: row.inicio || null,
        fim: row.fim || null,
        obs: row.observacoes || ''
      };
    }

    const bucket = aggregates[loteKey];
    const qtd = Number(row.quantidade || 0);
    bucket.total += qtd;
    if (!bucket.loteExterno && row.lote_externo) {
      bucket.loteExterno = row.lote_externo;
    }
    
    if (row.exp_stage === 'para-inspecao') bucket.inspecao += qtd;
    if (row.exp_stage === 'para-embarque') bucket.embalagem += qtd;

    // Pega o início mais cedo e o fim mais tarde
    if (row.inicio) {
      if (!bucket.inicio || new Date(row.inicio) < new Date(bucket.inicio)) {
        bucket.inicio = row.inicio;
      }
    }
    if (row.fim) {
      if (!bucket.fim || new Date(row.fim) > new Date(bucket.fim)) {
        bucket.fim = row.fim;
      }
    }
    if (row.observacoes) bucket.obs = row.observacoes;
  });

  return Object.values(aggregates);
};

/**
 * Calcula totais de apontamentos por estágio
 * 
 * @param {Array} resumos - Resumos de apontamentos
 * @param {string} campo - Campo a somar ('inspecao', 'embalagem', 'total')
 * @returns {number} Total somado
 * 
 * @example
 * const total = calcularTotalPorEstago(resumos, 'inspecao');
 */
export const calcularTotalPorEstagio = (resumos, campo = 'total') => {
  if (!Array.isArray(resumos)) return 0;
  
  return resumos.reduce((acc, r) => {
    const valor = Number(r?.[campo]) || 0;
    return acc + valor;
  }, 0);
};

/**
 * Filtra apontamentos por unidade
 * 
 * @param {Array} apontamentos - Lista de apontamentos
 * @param {string} unidade - Unidade para filtrar
 * @returns {Array} Apontamentos filtrados
 */
export const filtrarPorUnidade = (apontamentos, unidade = 'alunica') => {
  if (!Array.isArray(apontamentos)) return [];
  return apontamentos.filter(a => a && a.exp_unidade === unidade);
};

/**
 * Filtra apontamentos por estágio
 * 
 * @param {Array} apontamentos - Lista de apontamentos
 * @param {Array|string} estagios - Estágio(s) para filtrar
 * @returns {Array} Apontamentos filtrados
 */
export const filtrarPorEstagio = (apontamentos, estagios) => {
  if (!Array.isArray(apontamentos)) return [];
  
  const stagesSet = Array.isArray(estagios) 
    ? new Set(estagios) 
    : new Set([estagios]);
  
  return apontamentos.filter(a => a && stagesSet.has(a.exp_stage));
};

/**
 * Agrupa apontamentos por lote
 * 
 * @param {Array} apontamentos - Lista de apontamentos
 * @returns {Object} Objeto com lotes como chaves
 */
export const agruparPorLote = (apontamentos) => {
  if (!Array.isArray(apontamentos)) return {};
  
  return apontamentos.reduce((acc, apont) => {
    if (!apont) return acc;
    
    const lote = apont.lote || '(sem lote)';
    if (!acc[lote]) acc[lote] = [];
    acc[lote].push(apont);
    
    return acc;
  }, {});
};

/**
 * Valida dados de apontamento antes de salvar
 * 
 * @param {Object} dados - Dados do apontamento
 * @param {number} dados.qtdPc - Quantidade total em peças
 * @param {number} dados.qtdPcInspecao - Quantidade para inspeção
 * @param {string} dados.inicio - Data/hora de início
 * @param {string} dados.fim - Data/hora de fim
 * @returns {Object} {valid: boolean, errors: Array<string>}
 */
export const validarApontamento = (dados) => {
  const errors = [];
  
  // Validar quantidade total
  const qtdPc = Number(dados.qtdPc);
  if (!qtdPc || qtdPc <= 0) {
    errors.push('Quantidade produzida deve ser maior que zero');
  }
  
  // Validar quantidade inspeção
  const qtdPcInspecao = Number(dados.qtdPcInspecao) || 0;
  if (qtdPcInspecao < 0) {
    errors.push('Quantidade para inspeção não pode ser negativa');
  }
  
  if (qtdPcInspecao > qtdPc) {
    errors.push('Quantidade para inspeção não pode ser maior que o total');
  }
  
  // Validar datas
  if (dados.inicio && dados.fim) {
    const inicio = new Date(dados.inicio);
    const fim = new Date(dados.fim);
    
    if (fim < inicio) {
      errors.push('Data/hora de fim não pode ser anterior ao início');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Calcula distribuição de peças entre inspeção e embalagem
 * 
 * @param {number} total - Total de peças
 * @param {number} inspecao - Peças para inspeção
 * @returns {Object} {inspecao: number, embalagem: number}
 */
export const calcularDistribuicao = (total, inspecao) => {
  const totalNum = Number(total) || 0;
  const inspecaoNum = Number(inspecao) || 0;
  const embalagemNum = Math.max(totalNum - inspecaoNum, 0);
  
  return {
    inspecao: inspecaoNum,
    embalagem: embalagemNum,
    total: totalNum
  };
};

/**
 * Formata resumo de lote para exibição
 * 
 * @param {Object} lote - Objeto de lote resumido
 * @returns {string} String formatada para exibição
 */
export const formatarResumoLote = (lote) => {
  if (!lote) return '';
  
  const partes = [];
  
  if (lote.lote) partes.push(`Lote ${lote.lote}`);
  if (lote.total) partes.push(`${lote.total} pcs`);
  if (lote.inspecao) partes.push(`${lote.inspecao} em inspeção`);
  if (lote.embalagem) partes.push(`${lote.embalagem} em embalagem`);
  
  return partes.join(' · ');
};

export default {
  summarizeApontamentos,
  calcularTotalPorEstagio,
  filtrarPorUnidade,
  filtrarPorEstagio,
  agruparPorLote,
  validarApontamento,
  calcularDistribuicao,
  formatarResumoLote
};
