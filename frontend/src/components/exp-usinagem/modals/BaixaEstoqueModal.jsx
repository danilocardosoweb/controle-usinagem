import React, { useState, useEffect } from 'react';
import { FaTimes, FaBoxOpen, FaDollarSign } from 'react-icons/fa';
import { formatInteger, formatNumber, toIntegerRound, toDecimal } from '../../../utils/expUsinagem';

/**
 * Modal para dar baixa no estoque (consumo ou venda)
 * 
 * @param {Object} props
 * @param {boolean} props.open - Se o modal está aberto
 * @param {Object} props.item - Item do estoque selecionado
 * @param {Function} props.onClose - Função para fechar o modal
 * @param {Function} props.onConfirm - Função para confirmar a baixa
 * @param {boolean} props.saving - Se está salvando
 * @param {string} props.error - Mensagem de erro
 * 
 * @created 18/11/2024
 * @author Cascade AI
 */
const BaixaEstoqueModal = ({
  open,
  item,
  onClose,
  onConfirm,
  saving,
  error
}) => {
  const [tipoBaixa, setTipoBaixa] = useState('consumo'); // 'consumo' ou 'venda'
  const [quantidadePc, setQuantidadePc] = useState('');
  const [quantidadeKg, setQuantidadeKg] = useState('');
  const [observacao, setObservacao] = useState('');
  const [validationError, setValidationError] = useState('');

  // Reset ao abrir/fechar
  useEffect(() => {
    if (open) {
      setTipoBaixa('consumo');
      setQuantidadePc('');
      setQuantidadeKg('');
      setObservacao('');
      setValidationError('');
    }
  }, [open]);

  if (!open || !item) return null;

  const saldoPc = toIntegerRound(item.saldoPc) || 0;
  const saldoKg = toDecimal(item.saldoKg) || 0;

  const handleConfirm = () => {
    setValidationError('');

    const qtdPc = toIntegerRound(quantidadePc) || 0;
    const qtdKg = toDecimal(quantidadeKg) || 0;

    // Validações
    if (qtdPc === 0 && qtdKg === 0) {
      setValidationError('Informe a quantidade em Pc ou Kg para dar baixa.');
      return;
    }

    if (qtdPc > saldoPc) {
      setValidationError(`Quantidade em Pc (${qtdPc}) não pode ser maior que o saldo disponível (${saldoPc}).`);
      return;
    }

    if (qtdKg > saldoKg) {
      setValidationError(`Quantidade em Kg (${qtdKg}) não pode ser maior que o saldo disponível (${saldoKg}).`);
      return;
    }

    onConfirm({
      item,
      tipoBaixa,
      quantidadePc: qtdPc,
      quantidadeKg: qtdKg,
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
                <span className="font-semibold text-blue-600">Saldo Pc:</span>{' '}
                <span className="text-lg font-bold text-blue-800">{formatInteger(saldoPc)}</span>
              </div>
              <div>
                <span className="font-semibold text-blue-600">Saldo Kg:</span>{' '}
                <span className="text-lg font-bold text-blue-800">{formatNumber(saldoKg)}</span>
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

          {/* Quantidade */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Quantidade (Pc)
              </label>
              <input
                type="number"
                min="0"
                max={saldoPc}
                value={quantidadePc}
                onChange={(e) => setQuantidadePc(e.target.value)}
                disabled={saving}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
                placeholder="0"
              />
              <p className="text-xs text-gray-500 mt-1">
                Máx: {formatInteger(saldoPc)} Pc
              </p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Quantidade (Kg)
              </label>
              <input
                type="number"
                min="0"
                max={saldoKg}
                step="0.01"
                value={quantidadeKg}
                onChange={(e) => setQuantidadeKg(e.target.value)}
                disabled={saving}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500 mt-1">
                Máx: {formatNumber(saldoKg)} Kg
              </p>
            </div>
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
