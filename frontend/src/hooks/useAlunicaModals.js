import { useState, useCallback } from 'react';
import supabaseService from '../services/SupabaseService';
import { toIntegerRound } from '../utils/expUsinagem';

const LOTE_STAGE_TAGS = {
  INSP: 'INS',
  EMB: 'EMB'
};

const normalizeLoteBase = (row) => {
  if (!row) return null;
  if (row.lote_externo) return row.lote_externo;
  if (typeof row.lote === 'string') {
    const match = row.lote.match(/-(INS|EMB)-\d+$/);
    if (match) {
      return row.lote.slice(0, match.index);
    }
    return row.lote;
  }
  return null;
};

const buildSeqMapFromApontamentos = (list = []) => {
  const map = {};
  list.forEach((row) => {
    const base = normalizeLoteBase(row);
    if (!base || typeof row.lote !== 'string') return;
    const match = row.lote.match(/-(INS|EMB)-(\d+)$/);
    if (!match) return;
    const [, tag, seq] = match;
    const key = `${base}|${tag}`;
    const curr = map[key] || 0;
    const parsed = Number.parseInt(seq, 10);
    map[key] = Number.isNaN(parsed) ? curr : Math.max(curr, parsed);
  });
  return map;
};

const buildNextLoteCode = (seqMap, base, tag) => {
  if (!base || !tag) return null;
  const key = `${base}|${tag}`;
  const next = (seqMap[key] || 0) + 1;
  seqMap[key] = next;
  return `${base}-${tag}-${String(next).padStart(2, '0')}`;
};

/**
 * Hook customizado para gerenciar modais de Aprovação e Reabertura da Alúnica
 * 
 * Encapsula toda a lógica de estado e operações dos modais que movimentam
 * lotes entre os estágios de inspeção e embalagem.
 * 
 * @param {Object} params - Parâmetros do hook
 * @param {Object} params.user - Usuário atual
 * @param {Object} params.alunicaStages - Estágios atuais da Alúnica por pedido
 * @param {Function} params.setAlunicaStages - Setter dos estágios
 * @param {Function} params.loadApontamentosFor - Função para recarregar apontamentos
 * @param {Function} params.loadFluxo - Função para recarregar fluxo
 * 
 * @returns {Object} Estados e funções para gerenciar os modais
 * 
 * @created 18/11/2024
 * @author Cascade AI
 */
const useAlunicaModals = ({
  user,
  alunicaStages,
  setAlunicaStages,
  loadApontamentosFor,
  loadFluxo
}) => {
  // ============================================
  // ESTADOS DE APROVAÇÃO
  // ============================================
  const [alunicaAprovarOpen, setAlunicaAprovarOpen] = useState(false);
  const [alunicaAprovarPedido, setAlunicaAprovarPedido] = useState(null);
  const [alunicaAprovarItens, setAlunicaAprovarItens] = useState([]);
  const [alunicaAprovarSaving, setAlunicaAprovarSaving] = useState(false);
  const [alunicaAprovarError, setAlunicaAprovarError] = useState(null);

  // ============================================
  // ESTADOS DE REABERTURA
  // ============================================
  const [alunicaReabrirOpen, setAlunicaReabrirOpen] = useState(false);
  const [alunicaReabrirPedido, setAlunicaReabrirPedido] = useState(null);
  const [alunicaReabrirItens, setAlunicaReabrirItens] = useState([]);
  const [alunicaReabrirSaving, setAlunicaReabrirSaving] = useState(false);
  const [alunicaReabrirError, setAlunicaReabrirError] = useState(null);

  // ============================================
  // ESTADOS GERAIS
  // ============================================
  const [alunicaActionLoading, setAlunicaActionLoading] = useState(() => new Set());

  // ============================================
  // FUNÇÕES DE APROVAÇÃO
  // ============================================

  /**
   * Abre modal de aprovação com lotes disponíveis
   */
  const openAprovarModal = useCallback(async (pedido) => {
    if (!pedido) return;
    
    setAlunicaAprovarPedido(pedido);
    setAlunicaAprovarOpen(true);
    setAlunicaAprovarError(null);
    
    try {
      const id = String(pedido.id);
      const apontList = await supabaseService.getByIndex('apontamentos', 'exp_fluxo_id', id);
      const rows = Array.isArray(apontList)
        ? apontList.filter((row) => row && row.exp_unidade === 'alunica' && row.exp_stage === 'para-inspecao')
        : [];
      
      const loteMap = {};
      rows.forEach((row) => {
        const lote = row.lote || '(sem lote)';
        const loteBase = normalizeLoteBase(row) || lote;
        const qty = toIntegerRound(row.quantidade) || 0;
        const key = `${lote}|${loteBase}`;
        loteMap[key] = {
          lote,
          loteBase,
          disponivel: (loteMap[key]?.disponivel || 0) + qty
        };
      });
      
      const itens = Object.values(loteMap).map((entry) => ({
        lote: entry.lote,
        loteBase: entry.loteBase,
        disponivel: entry.disponivel,
        mover: 0
      }));
      
      setAlunicaAprovarItens(itens);
    } catch (e) {
      console.error('Erro ao carregar lotes para aprovação:', e);
      setAlunicaAprovarError('Falha ao carregar lotes.');
    }
  }, []);

  /**
   * Fecha modal de aprovação
   */
  const closeAprovarModal = useCallback(() => {
    setAlunicaAprovarOpen(false);
    setAlunicaAprovarPedido(null);
    setAlunicaAprovarItens([]);
    setAlunicaAprovarError(null);
  }, []);

  /**
   * Altera quantidade a mover de um lote específico
   */
  const setAprovarMover = useCallback((lote, value) => {
    setAlunicaAprovarItens((prev) => prev.map((it) => {
      if (it.lote !== lote) return it;
      const disp = toIntegerRound(it.disponivel) || 0;
      let v = toIntegerRound(value) || 0;
      if (v < 0) v = 0;
      if (v > disp) v = disp;
      return { ...it, mover: v };
    }));
  }, []);

  /**
   * Preenche todos os lotes com quantidade máxima disponível
   */
  const aprovarTudoFill = useCallback(() => {
    setAlunicaAprovarItens((prev) => 
      prev.map((it) => ({ ...it, mover: toIntegerRound(it.disponivel) || 0 }))
    );
  }, []);

  /**
   * Confirma aprovação parcial ou total por lote
   */
  const handleAprovarConfirm = useCallback(async () => {
    if (!alunicaAprovarPedido) return;
    
    const id = String(alunicaAprovarPedido.id);
    const itens = Array.isArray(alunicaAprovarItens) ? alunicaAprovarItens : [];
    const valid = itens.filter((i) => (toIntegerRound(i.mover) || 0) > 0);
    
    if (!valid.length) {
      setAlunicaAprovarError('Informe quantidades para aprovar.');
      return;
    }
    
    setAlunicaAprovarSaving(true);
    setAlunicaAprovarError(null);
    
    try {
      const apontList = await supabaseService.getByIndex('apontamentos', 'exp_fluxo_id', id);
      const stageAtual = alunicaStages[id] || 'para-inspecao';
      const seqMap = buildSeqMapFromApontamentos(apontList);
      
      let sumDisp = 0;
      let sumMov = 0;
      itens.forEach((i) => { 
        sumDisp += toIntegerRound(i.disponivel) || 0; 
        sumMov += toIntegerRound(i.mover) || 0;
      });
      
      // Movimentar lotes
      for (const item of valid) {
        let qtyToMove = toIntegerRound(item.mover) || 0;
        if (qtyToMove <= 0) continue;
        
        const rows = (Array.isArray(apontList) ? apontList : [])
          .filter((row) => 
            row && 
            row.exp_unidade === 'alunica' && 
            row.exp_stage === 'para-inspecao' && 
            (row.lote || '(sem lote)') === item.lote
          );
        
        for (const row of rows) {
          const q = toIntegerRound(row.quantidade) || 0;
          const loteBase = normalizeLoteBase(row) || item.loteBase || row.lote || '(sem lote)';
          const novoLote = buildNextLoteCode(seqMap, loteBase, LOTE_STAGE_TAGS.EMB) || row.lote;
          
          if (qtyToMove >= q) {
            // Move registro completo
            await supabaseService.update('apontamentos', { 
              id: row.id, 
              exp_stage: 'para-embarque',
              lote: novoLote,
              lote_externo: loteBase
            });
            qtyToMove -= q;
          } else if (qtyToMove > 0) {
            // Divide registro
            const restante = q - qtyToMove;
            await supabaseService.update('apontamentos', { 
              id: row.id, 
              quantidade: restante 
            });
            
            const { id: _oldId, ...copy } = row;
            const novo = { 
              ...copy, 
              quantidade: qtyToMove, 
              exp_stage: 'para-embarque',
              lote: novoLote,
              lote_externo: loteBase
            };
            await supabaseService.add('apontamentos', novo);
            qtyToMove = 0;
          }
          
          if (qtyToMove <= 0) break;
        }
      }
      
      // Registrar movimentação
      const movimentoBase = {
        fluxo_id: id,
        movimentado_por: user?.nome || user?.email || 'Operador',
        movimentado_em: new Date().toISOString(),
        tipo_movimentacao: 'status'
      };
      
      const motivo = sumMov >= sumDisp ? 'aprovacao_inspecao' : 'aprovacao_inspecao_parcial';
      
      await supabaseService.add('exp_pedidos_movimentacoes', {
        ...movimentoBase,
        status_anterior: stageAtual,
        status_novo: sumMov >= sumDisp ? 'para-embarque' : 'para-inspecao',
        motivo
      });
      
      // Atualizar estágio se aprovação total
      if (sumMov >= sumDisp) {
        setAlunicaStages((prev) => ({ ...prev, [id]: 'para-embarque' }));
        await supabaseService.update('exp_pedidos_fluxo', { 
          id, 
          alunica_stage: 'para-embarque' 
        });
      }
      
      await loadApontamentosFor(id);
      await loadFluxo();
      closeAprovarModal();
    } catch (e) {
      setAlunicaAprovarError(e?.message || 'Falha ao aprovar inspeção.');
    } finally {
      setAlunicaAprovarSaving(false);
    }
  }, [
    alunicaAprovarPedido, 
    alunicaAprovarItens, 
    alunicaStages, 
    setAlunicaStages, 
    loadApontamentosFor, 
    loadFluxo, 
    closeAprovarModal,
    user
  ]);

  /**
   * Aprova todos os lotes de um pedido com 1 clique (ação rápida)
   */
  const handleAprovarTudoOneClick = useCallback(async (orderId) => {
    const id = String(orderId);
    setAlunicaActionLoading((prev) => new Set([...prev, id]));
    
    try {
      const apontList = await supabaseService.getByIndex('apontamentos', 'exp_fluxo_id', id);
      const rows = Array.isArray(apontList)
        ? apontList.filter((row) => 
            row && 
            row.exp_unidade === 'alunica' && 
            row.exp_stage === 'para-inspecao'
          )
        : [];
      
      const seqMap = buildSeqMapFromApontamentos(apontList);

      for (const row of rows) {
        const loteBase = normalizeLoteBase(row) || row.lote || '(sem lote)';
        const novoLote = buildNextLoteCode(seqMap, loteBase, LOTE_STAGE_TAGS.EMB) || row.lote;
        await supabaseService.update('apontamentos', { 
          id: row.id, 
          exp_stage: 'para-embarque',
          lote: novoLote,
          lote_externo: loteBase
        });
      }

      const movimentoBase = {
        fluxo_id: id,
        movimentado_por: user?.nome || user?.email || 'Operador',
        movimentado_em: new Date().toISOString(),
        tipo_movimentacao: 'status'
      };

      await supabaseService.add('exp_pedidos_movimentacoes', {
        ...movimentoBase,
        status_anterior: alunicaStages[id] || 'para-inspecao',
        status_novo: 'para-embarque',
        motivo: 'aprovacao_inspecao'
      });

      await supabaseService.update('exp_pedidos_fluxo', { 
        id, 
        alunica_stage: 'para-embarque' 
      });
      
      setAlunicaStages((prev) => ({ ...prev, [id]: 'para-embarque' }));

      await loadApontamentosFor(id);
      await loadFluxo();
    } catch (e) {
      console.error('Falha em Aprovar Tudo (1 clique):', e);
    } finally {
      setAlunicaActionLoading((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, [alunicaStages, setAlunicaStages, loadApontamentosFor, loadFluxo, user]);

  // ============================================
  // FUNÇÕES DE REABERTURA
  // ============================================

  /**
   * Abre modal de reabertura com lotes disponíveis
   */
  const openReabrirModal = useCallback(async (pedido) => {
    if (!pedido) return;
    
    setAlunicaReabrirPedido(pedido);
    setAlunicaReabrirOpen(true);
    setAlunicaReabrirError(null);
    
    try {
      const id = String(pedido.id);
      const apontList = await supabaseService.getByIndex('apontamentos', 'exp_fluxo_id', id);
      const rows = Array.isArray(apontList)
        ? apontList.filter((row) => 
            row && 
            row.exp_unidade === 'alunica' && 
            row.exp_stage === 'para-embarque'
          )
        : [];
      
      const loteMap = {};
      rows.forEach((row) => {
        const lote = row.lote || '(sem lote)';
        const loteBase = normalizeLoteBase(row) || lote;
        const qty = toIntegerRound(row.quantidade) || 0;
        const key = `${lote}|${loteBase}`;
        loteMap[key] = {
          lote,
          loteBase,
          disponivel: (loteMap[key]?.disponivel || 0) + qty
        };
      });
      
      const itens = Object.values(loteMap).map((entry) => ({
        lote: entry.lote,
        loteBase: entry.loteBase,
        disponivel: entry.disponivel,
        mover: 0
      }));
      
      setAlunicaReabrirItens(itens);
    } catch (e) {
      console.error('Erro ao carregar lotes para reabertura:', e);
      setAlunicaReabrirError('Falha ao carregar lotes.');
    }
  }, []);

  /**
   * Fecha modal de reabertura
   */
  const closeReabrirModal = useCallback(() => {
    setAlunicaReabrirOpen(false);
    setAlunicaReabrirPedido(null);
    setAlunicaReabrirItens([]);
    setAlunicaReabrirError(null);
  }, []);

  /**
   * Altera quantidade a mover de um lote específico
   */
  const setReabrirMover = useCallback((lote, value) => {
    setAlunicaReabrirItens((prev) => prev.map((it) => {
      if (it.lote !== lote) return it;
      const disp = toIntegerRound(it.disponivel) || 0;
      let v = toIntegerRound(value) || 0;
      if (v < 0) v = 0;
      if (v > disp) v = disp;
      return { ...it, mover: v };
    }));
  }, []);

  /**
   * Preenche todos os lotes com quantidade máxima disponível
   */
  const reabrirTudoFill = useCallback(() => {
    setAlunicaReabrirItens((prev) => 
      prev.map((it) => ({ ...it, mover: toIntegerRound(it.disponivel) || 0 }))
    );
  }, []);

  /**
   * Confirma reabertura parcial ou total por lote
   */
  const handleReabrirConfirm = useCallback(async () => {
    if (!alunicaReabrirPedido) return;
    
    const id = String(alunicaReabrirPedido.id);
    const itens = Array.isArray(alunicaReabrirItens) ? alunicaReabrirItens : [];
    const valid = itens.filter((i) => (toIntegerRound(i.mover) || 0) > 0);
    
    if (!valid.length) {
      setAlunicaReabrirError('Informe quantidades para reabrir.');
      return;
    }
    
    setAlunicaReabrirSaving(true);
    setAlunicaReabrirError(null);
    
    try {
      const apontList = await supabaseService.getByIndex('apontamentos', 'exp_fluxo_id', id);
      const stageAtual = alunicaStages[id] || 'para-embarque';
      const seqMap = buildSeqMapFromApontamentos(apontList);
      
      let sumDisp = 0;
      let sumMov = 0;
      itens.forEach((i) => { 
        sumDisp += toIntegerRound(i.disponivel) || 0; 
        sumMov += toIntegerRound(i.mover) || 0;
      });
      
      // Movimentar lotes
      for (const item of valid) {
        let qtyToMove = toIntegerRound(item.mover) || 0;
        if (qtyToMove <= 0) continue;
        
        const rows = (Array.isArray(apontList) ? apontList : [])
          .filter((row) => 
            row && 
            row.exp_unidade === 'alunica' && 
            row.exp_stage === 'para-embarque' && 
            (row.lote || '(sem lote)') === item.lote
          );
        
        for (const row of rows) {
          const q = toIntegerRound(row.quantidade) || 0;
          const loteBase = normalizeLoteBase(row) || item.loteBase || row.lote || '(sem lote)';
          const novoLote = buildNextLoteCode(seqMap, loteBase, LOTE_STAGE_TAGS.INSP) || row.lote;
          
          if (qtyToMove >= q) {
            // Move registro completo
            await supabaseService.update('apontamentos', { 
              id: row.id, 
              exp_stage: 'para-inspecao',
              lote: novoLote,
              lote_externo: loteBase
            });
            qtyToMove -= q;
          } else if (qtyToMove > 0) {
            // Divide registro
            const restante = q - qtyToMove;
            await supabaseService.update('apontamentos', { 
              id: row.id, 
              quantidade: restante 
            });
            
            const { id: _oldId, ...copy } = row;
            const novo = { 
              ...copy, 
              quantidade: qtyToMove, 
              exp_stage: 'para-inspecao',
              lote: novoLote,
              lote_externo: loteBase
            };
            await supabaseService.add('apontamentos', novo);
            qtyToMove = 0;
          }
          
          if (qtyToMove <= 0) break;
        }
      }
      
      // Registrar movimentação
      const movimentoBase = {
        fluxo_id: id,
        movimentado_por: user?.nome || user?.email || 'Operador',
        movimentado_em: new Date().toISOString(),
        tipo_movimentacao: 'status'
      };
      
      const motivo = sumMov >= sumDisp ? 'reabertura_inspecao' : 'reabertura_inspecao_parcial';
      
      await supabaseService.add('exp_pedidos_movimentacoes', {
        ...movimentoBase,
        status_anterior: stageAtual,
        status_novo: sumMov >= sumDisp ? 'para-inspecao' : 'para-embarque',
        motivo
      });
      
      // Atualizar estágio se reabertura total
      if (sumMov >= sumDisp) {
        setAlunicaStages((prev) => ({ ...prev, [id]: 'para-inspecao' }));
        await supabaseService.update('exp_pedidos_fluxo', { 
          id, 
          alunica_stage: 'para-inspecao' 
        });
      }
      
      await loadApontamentosFor(id);
      await loadFluxo();
      closeReabrirModal();
    } catch (e) {
      setAlunicaReabrirError(e?.message || 'Falha ao reabrir inspeção.');
    } finally {
      setAlunicaReabrirSaving(false);
    }
  }, [
    alunicaReabrirPedido, 
    alunicaReabrirItens, 
    alunicaStages, 
    setAlunicaStages, 
    loadApontamentosFor, 
    loadFluxo, 
    closeReabrirModal,
    user
  ]);

  /**
   * Reabre todos os lotes de um pedido com 1 clique (ação rápida)
   */
  const handleReabrirTudoOneClick = useCallback(async (orderId) => {
    const id = String(orderId);
    setAlunicaActionLoading((prev) => new Set([...prev, id]));
    
    try {
      const apontList = await supabaseService.getByIndex('apontamentos', 'exp_fluxo_id', id);
      const rows = Array.isArray(apontList)
        ? apontList.filter((row) => 
            row && 
            row.exp_unidade === 'alunica' && 
            row.exp_stage === 'para-embarque'
          )
        : [];
      
      const seqMap = buildSeqMapFromApontamentos(apontList);

      for (const row of rows) {
        const loteBase = normalizeLoteBase(row) || row.lote || '(sem lote)';
        const novoLote = buildNextLoteCode(seqMap, loteBase, LOTE_STAGE_TAGS.INSP) || row.lote;
        await supabaseService.update('apontamentos', { 
          id: row.id, 
          exp_stage: 'para-inspecao',
          lote: novoLote,
          lote_externo: loteBase
        });
      }

      const movimentoBase = {
        fluxo_id: id,
        movimentado_por: user?.nome || user?.email || 'Operador',
        movimentado_em: new Date().toISOString(),
        tipo_movimentacao: 'status'
      };

      await supabaseService.add('exp_pedidos_movimentacoes', {
        ...movimentoBase,
        status_anterior: alunicaStages[id] || 'para-embarque',
        status_novo: 'para-inspecao',
        motivo: 'reabertura_inspecao'
      });

      await supabaseService.update('exp_pedidos_fluxo', { 
        id, 
        alunica_stage: 'para-inspecao' 
      });
      
      setAlunicaStages((prev) => ({ ...prev, [id]: 'para-inspecao' }));

      await loadApontamentosFor(id);
      await loadFluxo();
    } catch (e) {
      console.error('Falha em Reabrir Tudo (1 clique):', e);
    } finally {
      setAlunicaActionLoading((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, [alunicaStages, setAlunicaStages, loadApontamentosFor, loadFluxo, user]);

  // ============================================
  // RETORNO DO HOOK
  // ============================================
  return {
    // Estados de Aprovação
    alunicaAprovarOpen,
    alunicaAprovarPedido,
    alunicaAprovarItens,
    alunicaAprovarSaving,
    alunicaAprovarError,
    
    // Funções de Aprovação
    openAprovarModal,
    closeAprovarModal,
    setAprovarMover,
    aprovarTudoFill,
    handleAprovarConfirm,
    handleAprovarTudoOneClick,
    
    // Estados de Reabertura
    alunicaReabrirOpen,
    alunicaReabrirPedido,
    alunicaReabrirItens,
    alunicaReabrirSaving,
    alunicaReabrirError,
    
    // Funções de Reabertura
    openReabrirModal,
    closeReabrirModal,
    setReabrirMover,
    reabrirTudoFill,
    handleReabrirConfirm,
    handleReabrirTudoOneClick,
    
    // Estados Gerais
    alunicaActionLoading
  };
};

export default useAlunicaModals;
