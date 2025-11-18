import { useState, useCallback } from 'react';
import supabaseService from '../services/SupabaseService';
import { toIntegerRound, toDecimal } from '../utils/expUsinagem';

/**
 * Hook customizado para gerenciar o modal de apontamento da Alúnica
 * 
 * Encapsula toda a lógica de estado e funções relacionadas ao modal de apontamento,
 * incluindo validações, cálculos e persistência no banco de dados.
 * 
 * @param {Object} deps - Dependências externas
 * @param {Object} deps.user - Usuário autenticado
 * @param {Array} deps.pedidosTecnoPerfil - Lista de pedidos
 * @param {Function} deps.loadApontamentosFor - Função para carregar apontamentos
 * @param {Function} deps.loadFluxo - Função para recarregar fluxo
 * @returns {Object} Estado e funções do modal
 * 
 * @example
 * const apontamento = useApontamentoModal({
 *   user,
 *   pedidosTecnoPerfil,
 *   loadApontamentosFor,
 *   loadFluxo
 * });
 * 
 * @created 18/11/2024
 * @author Cascade AI
 */
export const useApontamentoModal = ({
  user,
  pedidosTecnoPerfil,
  loadApontamentosFor,
  loadFluxo
}) => {
  // Estados do modal
  const [open, setOpen] = useState(false);
  const [pedido, setPedido] = useState(null);
  const [stage, setStage] = useState(null);
  const [qtdPc, setQtdPc] = useState('');
  const [qtdPcInspecao, setQtdPcInspecao] = useState('');
  const [obs, setObs] = useState('');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [fimTouched, setFimTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Converte data para formato input datetime-local
   */
  const toLocalDateTimeInput = (value) => {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const offsetMs = date.getTimezoneOffset() * 60000;
    const local = new Date(date.getTime() - offsetMs);
    return local.toISOString().slice(0, 16);
  };

  /**
   * Converte datetime-local para ISO
   */
  const localDateTimeToISO = (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
  };

  /**
   * Adiciona minutos a um datetime-local
   */
  const addMinutesToLocalInput = (value, minutes = 5) => {
    if (!value) return '';
    const date = value instanceof Date ? new Date(value) : new Date(String(value));
    if (Number.isNaN(date.getTime())) return '';
    date.setMinutes(date.getMinutes() + minutes);
    return toLocalDateTimeInput(date);
  };

  /**
   * Abre o modal de apontamento
   */
  const openModal = useCallback((orderId, stageKey) => {
    try {
      const pedidoResumo = Array.isArray(pedidosTecnoPerfil)
        ? pedidosTecnoPerfil.find((p) => String(p.id) === String(orderId))
        : null;

      if (!pedidoResumo) {
        throw new Error('Pedido não encontrado para apontamento.');
      }

      // Carrega históricos antes de abrir o modal
      loadApontamentosFor(orderId);

      // Configura estado inicial
      setPedido(pedidoResumo);
      setStage(stageKey);
      setQtdPc('');
      setQtdPcInspecao('');
      setObs('');
      
      // Auto-preenche data/hora
      const now = new Date();
      const startStr = toLocalDateTimeInput(now);
      const endStr = toLocalDateTimeInput(new Date(now.getTime() + 5 * 60000));
      setInicio(startStr);
      setFim(endStr);
      setFimTouched(false);
      setError(null);
      setOpen(true);
    } catch (err) {
      setError('Falha ao preparar o apontamento. Tente novamente.');
      setOpen(true);
    }
  }, [pedidosTecnoPerfil, loadApontamentosFor]);

  /**
   * Fecha o modal
   */
  const closeModal = useCallback(() => {
    if (saving) return;
    
    setOpen(false);
    setPedido(null);
    setStage(null);
    setQtdPc('');
    setQtdPcInspecao('');
    setObs('');
    setInicio('');
    setFim('');
    setFimTouched(false);
    setError(null);
  }, [saving]);

  /**
   * Handler para mudança no campo Início
   */
  const handleInicioChange = useCallback((value) => {
    setInicio(value);
    if (!fimTouched) {
      setFim(addMinutesToLocalInput(value, 5));
    }
  }, [fimTouched]);

  /**
   * Handler para mudança no campo Fim
   */
  const handleFimChange = useCallback((value) => {
    setFimTouched(true);
    setFim(value);
  }, []);

  /**
   * Salva o apontamento
   */
  const saveApontamento = useCallback(async () => {
    if (!pedido || !stage) return;

    const MIN_INSPECAO_PCS = 20;

    // Validações
    const qtdPcRaw = toIntegerRound(qtdPc);
    const pcs = qtdPcRaw || 0;

    const qtdPcInspecaoRaw = toIntegerRound(qtdPcInspecao);
    const pcsInspecao = qtdPcInspecaoRaw || 0;
    const pcsEmbalar = Math.max(pcs - pcsInspecao, 0);

    if (pcs <= 0) {
      setError('Informe uma quantidade válida maior que zero.');
      return;
    }

    if (pcsInspecao < 0) {
      setError('Quantidade para inspeção não pode ser negativa.');
      return;
    }

    if (pcsInspecao > pcs) {
      setError('Quantidade para inspeção não pode ser maior que o total.');
      return;
    }

    if (pcsEmbalar > 0 && pcsInspecao > 0 && pcsInspecao < MIN_INSPECAO_PCS) {
      setError(
        `Envie pelo menos ${MIN_INSPECAO_PCS} peças para inspeção. ` +
        `Caso contrário, envie tudo para inspeção (${pcs} pcs) ou tudo para embalagem (0 para inspeção).`
      );
      return;
    }

    // Calcula kg
    const totalPc = toIntegerRound(pedido.pedidoPcNumber ?? pedido.pedidoPc) || 0;
    const totalKg = toDecimal(pedido.pedidoKgNumber ?? pedido.pedidoKg) || 0;
    const kgPorPc = totalPc > 0 && totalKg > 0 ? totalKg / totalPc : null;
    const kg = kgPorPc ? +(pcs * kgPorPc).toFixed(3) : 0;

    const pedidoPcTotal = totalPc || 0;
    const jaProduzidoPc = toIntegerRound(pedido.apontadoPcNumber) || 0;

    if (pedidoPcTotal > 0 && jaProduzidoPc + pcs > pedidoPcTotal) {
      const disponivel = Math.max(pedidoPcTotal - jaProduzidoPc, 0);
      setError(
        `Quantidade excede o saldo disponível. ` +
        `Total do pedido: ${pedidoPcTotal} pcs. ` +
        `Já produzido: ${jaProduzidoPc} pcs. ` +
        `Disponível: ${disponivel} pcs.`
      );
      return;
    }

    // Valida datas
    const inicioISO = localDateTimeToISO(inicio);
    const fimISO = localDateTimeToISO(fim);

    if (!inicioISO || !fimISO) {
      setError('Informe data e horário inicial e final válidos.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const agora = new Date().toISOString();
      const ordemTrabalho = pedido.pedido || pedido.pedidoSeq || '';
      const totalPcPedido = totalPc || null;

      // Busca dados atuais do fluxo
      let fluxoAtual;
      let jaInspecao = 0;
      
      try {
        fluxoAtual = await supabaseService.getById('exp_pedidos_fluxo', pedido.id);

        const apontamentosFluxo = await supabaseService.getByIndex(
          'apontamentos',
          'exp_fluxo_id',
          pedido.id
        );

        jaInspecao = Array.isArray(apontamentosFluxo)
          ? apontamentosFluxo
              .filter(row => row && row.exp_unidade === 'alunica' && row.exp_stage === 'para-inspecao')
              .reduce((acc, row) => acc + (Number(row.quantidade) || 0), 0)
          : 0;
      } catch (err) {
        console.error('Erro ao buscar fluxo:', err);
      }

      // Gera código do lote
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yyyy = String(now.getFullYear());
      const hh = String(now.getHours()).padStart(2, '0');
      const min = String(now.getMinutes()).padStart(2, '0');
      const pedidoCode = String(pedido?.pedido || pedido?.pedidoSeq || '').trim();
      const loteCodigo = `${dd}${mm}${yyyy}-${hh}${min}-${pedidoCode}`;

      // Monta payload base
      const basePayloadApont = {
        operador: user?.nome || user?.email || 'Operador',
        produto: pedido.ferramenta || '',
        cliente: pedido.cliente || '',
        inicio: inicioISO,
        fim: fimISO,
        qtd_refugo: 0,
        created_at: agora,
        perfil_longo: '',
        comprimento_acabado_mm: null,
        ordem_trabalho: ordemTrabalho,
        observacoes: obs || '',
        rack_ou_pallet: '',
        dureza_material: '',
        lotes_externos: [],
        romaneio_numero: '',
        lote_externo: '',
        amarrados_detalhados: null,
        exp_fluxo_id: pedido.id,
        exp_unidade: 'alunica',
        exp_stage: stage
      };

      const apontamentosToInsert = [];

      // Cria apontamentos
      if (pcsInspecao > 0) {
        apontamentosToInsert.push({
          ...basePayloadApont,
          lote: loteCodigo,
          quantidade: pcsInspecao,
          quantidade_kg: kgPorPc ? +(pcsInspecao * kgPorPc).toFixed(3) : 0,
          pedido_pc_total: totalPcPedido,
          exp_stage: 'para-inspecao'
        });
      }

      if (pcsEmbalar > 0) {
        apontamentosToInsert.push({
          ...basePayloadApont,
          lote: loteCodigo,
          quantidade: pcsEmbalar,
          quantidade_kg: kgPorPc ? +(pcsEmbalar * kgPorPc).toFixed(3) : 0,
          pedido_pc_total: totalPcPedido,
          exp_stage: 'para-embarque'
        });
      }

      // Insere apontamentos
      for (const apont of apontamentosToInsert) {
        await supabaseService.add('apontamentos', apont);
      }

      // Recarrega históricos
      await loadApontamentosFor(pedido.id);

      // Atualiza saldos no fluxo
      const pedidoKgTotal = toDecimal(fluxoAtual?.pedido_kg) ?? 0;
      const pedidoPcTotalFluxo = toIntegerRound(fluxoAtual?.pedido_pc) ?? 0;

      const prevKgDisp = toDecimal(fluxoAtual?.kg_disponivel) ?? pedidoKgTotal;
      const prevPcDisp = toIntegerRound(fluxoAtual?.pc_disponivel) ?? pedidoPcTotalFluxo;
      const prevKgSaldo = toDecimal(fluxoAtual?.saldo_kg_total) ?? 0;
      const prevPcSaldo = toIntegerRound(fluxoAtual?.saldo_pc_total) ?? 0;

      const novoKgDisp = Math.max(prevKgDisp - (kg || 0), 0);
      const novoPcDisp = Math.max(prevPcDisp - (pcs || 0), 0);
      const novoKgSaldo = prevKgSaldo + (kg || 0);
      const novoPcSaldo = prevPcSaldo + (pcs || 0);

      await supabaseService.update('exp_pedidos_fluxo', {
        id: pedido.id,
        kg_disponivel: novoKgDisp,
        pc_disponivel: novoPcDisp,
        saldo_kg_total: novoKgSaldo,
        saldo_pc_total: novoPcSaldo,
        saldo_atualizado_em: agora
      });

      // Registra movimentação
      try {
        await supabaseService.add('exp_pedidos_movimentacoes', {
          fluxo_id: pedido.id,
          status_anterior: fluxoAtual?.status_atual || 'pedido',
          status_novo: fluxoAtual?.status_atual || 'pedido',
          motivo: null,
          tipo_movimentacao: 'apontamento',
          movimentado_por: user?.nome || user?.email || 'Operador',
          movimentado_em: agora
        });
      } catch (err) {
        console.error('Erro ao registrar movimentação:', err);
      }

      // Recarrega dados
      await loadFluxo();

      // Fecha modal
      closeModal();
    } catch (err) {
      console.error('Erro ao salvar apontamento:', err);
      setError('Erro ao salvar apontamento. Verifique os dados e tente novamente.');
    } finally {
      setSaving(false);
    }
  }, [
    pedido,
    stage,
    qtdPc,
    qtdPcInspecao,
    obs,
    inicio,
    fim,
    user,
    loadApontamentosFor,
    loadFluxo,
    closeModal
  ]);

  return {
    // Estado
    open,
    pedido,
    stage,
    qtdPc,
    qtdPcInspecao,
    obs,
    inicio,
    fim,
    fimTouched,
    saving,
    error,
    
    // Setters (para uso direto no componente)
    setQtdPc,
    setQtdPcInspecao,
    setObs,
    
    // Funções
    openModal,
    closeModal,
    handleInicioChange,
    handleFimChange,
    saveApontamento
  };
};

export default useApontamentoModal;
