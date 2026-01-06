import React, { useState, useEffect } from 'react';
import { FaTimes, FaBoxOpen, FaDollarSign, FaCheckSquare, FaSquare } from 'react-icons/fa';
import { formatInteger, formatNumber, toIntegerRound, toDecimal } from '../../../utils/expUsinagem';

/**
 * Modal para dar baixa no estoque (consumo ou venda) com rastreabilidade por lote
 * 
 * @param {Object} props
 * @param {boolean} props.open - Se o modal está aberto
 * @param {Object} props.item - Item do estoque selecionado
 * @param {Array} props.lotesDisponiveis - Lotes disponíveis para baixa
 * @param {Function} props.onClose - Função para fechar o modal
 * @param {Function} props.onConfirm - Função para confirmar a baixa
 * @param {boolean} props.saving - Se está salvando
 * @param {string} props.error - Mensagem de erro
 * 
 * @updated 20/11/2024 - Adicionada rastreabilidade por lote
 * @author Cascade AI
 */
const BaixaEstoqueModal = ({
  open,
  item,
  lotesDisponiveis = [],
  onClose,
  onConfirm,
  saving,
  error
}) => {
  const [tipoBaixa, setTipoBaixa] = useState('consumo'); // 'consumo' ou 'venda'
  const [lotesSelecionados, setLotesSelecionados] = useState({}); // { loteId: { pc: 0, kg: 0 } }
  const [observacao, setObservacao] = useState('');
  const [validationError, setValidationError] = useState('');

  // Reset ao abrir/fechar
  useEffect(() => {
    if (open) {
      setTipoBaixa('consumo');
      setLotesSelecionados({});
      setObservacao('');
      setValidationError('');
    }
  }, [open]);

  if (!open || !item) return null;

  const totalSaldoPc = lotesDisponiveis.reduce((acc, lote) => acc + (toIntegerRound(lote.disponivel_pc) || 0), 0);
  const totalSaldoKg = lotesDisponiveis.reduce((acc, lote) => acc + (toDecimal(lote.disponivel_kg) || 0), 0);

  // Toggle seleção de lote
  const toggleLote = (loteId) => {
    setLotesSelecionados(prev => {
      const novo = { ...prev };
      if (novo[loteId]) {
        delete novo[loteId];
      } else {
        novo[loteId] = { pc: 0, kg: 0 };
      }
      return novo;
    });
  };

  // Atualizar quantidade de um lote
  const updateQuantidade = (loteId, tipo, valor) => {
    setLotesSelecionados(prev => ({
      ...prev,
      [loteId]: {
        ...prev[loteId],
        [tipo]: valor
      }
    }));
  };

  const handleConfirm = () => {
    setValidationError('');

    const lotesSelecionadosArray = Object.keys(lotesSelecionados);
    
    // Validações
    if (lotesSelecionadosArray.length === 0) {
      setValidationError('Selecione pelo menos um lote para dar baixa.');
      return;
    }

    // Validar cada lote selecionado
    const baixasPorLote = [];
    for (const loteId of lotesSelecionadosArray) {
      const qtds = lotesSelecionados[loteId];
      const qtdPc = toIntegerRound(qtds.pc) || 0;
      const qtdKg = toDecimal(qtds.kg) || 0;

      if (qtdPc === 0 && qtdKg === 0) {
        setValidationError('Informe a quantidade (Pc ou Kg) para cada lote selecionado.');
        return;
      }

      const lote = lotesDisponiveis.find(l => l.id === loteId);
      if (!lote) continue;

      const dispPc = toIntegerRound(lote.disponivel_pc) || 0;
      const dispKg = toDecimal(lote.disponivel_kg) || 0;

      if (qtdPc > dispPc) {
        setValidationError(`Lote ${lote.lote_codigo}: Quantidade Pc (${qtdPc}) excede disponível (${dispPc}).`);
        return;
      }

      if (qtdKg > dispKg) {
        setValidationError(`Lote ${lote.lote_codigo}: Quantidade Kg (${qtdKg}) excede disponível (${dispKg}).`);
        return;
      }

      baixasPorLote.push({
        lote_codigo: lote.lote_codigo,
        lote_externo: lote.lote_externo,
        quantidade_pc: qtdPc,
        quantidade_kg: qtdKg
      });
    }

    onConfirm({
      item,
      tipoBaixa,
      baixasPorLote,
      observacao: observacao.trim()
    });
  };

  const handleClose = () => {
    if (!saving) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="text-base font-semibold text-gray-800">
            Dar Baixa no Estoque
          </h3>
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            title="Fechar"
          >
            <FaTimes className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {/* Informações do Item */}
          <div className="bg-blue-50 rounded-lg p-4 space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-semibold text-gray-600">Pedido:</span>{' '}
                <span className="text-gray-800">{item.pedido}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-600">Cliente:</span>{' '}
                <span className="text-gray-800">{item.cliente}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-600">Ferramenta:</span>{' '}
                <span className="text-gray-800">{item.ferramenta}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-600">Unidade:</span>{' '}
                <span className="text-gray-800">{item.unidade}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm pt-2 border-t border-blue-200">
              <div>
                <span className="font-semibold text-blue-600">Total Disponível Pc:</span>{' '}
                <span className="text-lg font-bold text-blue-800">{formatInteger(totalSaldoPc)}</span>
              </div>
              <div>
                <span className="font-semibold text-blue-600">Total Disponível Kg:</span>{' '}
                <span className="text-lg font-bold text-blue-800">{formatNumber(totalSaldoKg)}</span>
              </div>
            </div>
          </div>

          {/* Tipo de Baixa */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Tipo de Baixa *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTipoBaixa('consumo')}
                disabled={saving}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                  tipoBaixa === 'consumo'
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                } disabled:opacity-50`}
              >
                <FaBoxOpen className="h-5 w-5" />
                <span className="font-semibold">Consumo</span>
              </button>
              <button
                type="button"
                onClick={() => setTipoBaixa('venda')}
                disabled={saving}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                  tipoBaixa === 'venda'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                } disabled:opacity-50`}
              >
                <FaDollarSign className="h-5 w-5" />
                <span className="font-semibold">Venda</span>
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {tipoBaixa === 'consumo' 
                ? 'Uso interno/produção - não gera receita' 
                : 'Saída comercial - gera receita'}
            </p>
          </div>

          {/* Seleção de Lotes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Selecionar Lotes para Baixa *
            </label>
            {lotesDisponiveis.length === 0 ? (
              <div className="rounded-md bg-yellow-50 border border-yellow-200 px-4 py-3">
                <p className="text-sm text-yellow-700">Nenhum lote disponível para baixa.</p>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="py-2 px-3 text-left">Sel.</th>
                      <th className="py-2 px-3 text-left">Lote Usinagem</th>
                      <th className="py-2 px-3 text-left">Lote Embalagem</th>
                      <th className="py-2 px-3 text-right">Disp. Pc</th>
                      <th className="py-2 px-3 text-right">Disp. Kg</th>
                      <th className="py-2 px-3 text-right">Baixar Pc</th>
                      <th className="py-2 px-3 text-right">Baixar Kg</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {lotesDisponiveis.map((lote) => {
                      const selecionado = !!lotesSelecionados[lote.id];
                      return (
                        <tr key={lote.id} className={selecionado ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                          <td className="py-2 px-3">
                            <button
                              type="button"
                              onClick={() => toggleLote(lote.id)}
                              disabled={saving}
                              className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                            >
                              {selecionado ? <FaCheckSquare /> : <FaSquare />}
                            </button>
                          </td>
                          <td className="py-2 px-3 font-medium text-gray-700">{lote.lote_externo || '—'}</td>
                          <td className="py-2 px-3 font-semibold text-gray-800">{lote.lote_codigo}</td>
                          <td className="py-2 px-3 text-right">{formatInteger(lote.disponivel_pc)}</td>
                          <td className="py-2 px-3 text-right">{formatNumber(lote.disponivel_kg)}</td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              min="0"
                              max={lote.disponivel_pc}
                              value={selecionado ? (lotesSelecionados[lote.id]?.pc || '') : ''}
                              onChange={(e) => updateQuantidade(lote.id, 'pc', e.target.value)}
                              disabled={!selecionado || saving}
                              className="w-20 rounded border border-gray-300 px-2 py-1 text-right text-xs focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
                              placeholder="0"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              min="0"
                              max={lote.disponivel_kg}
                              step="0.01"
                              value={selecionado ? (lotesSelecionados[lote.id]?.kg || '') : ''}
                              onChange={(e) => updateQuantidade(lote.id, 'kg', e.target.value)}
                              disabled={!selecionado || saving}
                              className="w-20 rounded border border-gray-300 px-2 py-1 text-right text-xs focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
                              placeholder="0.00"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-2">
              Selecione um ou mais lotes e informe a quantidade para cada um.
            </p>
          </div>

          {/* Observação */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Observação
            </label>
            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              disabled={saving}
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
              placeholder="Motivo da baixa, detalhes, referências..."
            />
          </div>

          {/* Erro de validação */}
          {validationError && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3">
              <p className="text-sm text-red-700">{validationError}</p>
            </div>
          )}

          {/* Erro do servidor */}
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t bg-gray-50 px-6 py-4">
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={saving}
            className={`rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
              tipoBaixa === 'consumo'
                ? 'bg-orange-600 hover:bg-orange-700'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {saving ? 'Processando...' : tipoBaixa === 'consumo' ? 'Dar Baixa (Consumo)' : 'Dar Baixa (Venda)'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BaixaEstoqueModal;
