import React from 'react';
import { FaTimes } from 'react-icons/fa';
import { formatInteger, toIntegerRound } from '../../../utils/expUsinagem';

/**
 * Modal de Reabertura de Inspeção por Lote
 * 
 * Permite reabrir lotes (total ou parcial) da embalagem para inspeção.
 * 
 * @param {Object} props - Propriedades do componente
 * @param {boolean} props.open - Se o modal está aberto
 * @param {Object} props.pedido - Dados do pedido
 * @param {Array} props.itens - Lista de lotes disponíveis para reabertura
 * @param {boolean} props.saving - Se está processando
 * @param {string} props.error - Mensagem de erro
 * @param {Function} props.onClose - Handler de fechar
 * @param {Function} props.onConfirm - Handler de confirmar reabertura
 * @param {Function} props.onSetMover - Handler para alterar quantidade a mover
 * @param {Function} props.onReabrirTudo - Handler para preencher tudo
 * 
 * @created 18/11/2024
 * @author Cascade AI
 */
const ReabrirModal = ({
  open,
  pedido,
  itens,
  saving,
  error,
  onClose,
  onConfirm,
  onSetMover,
  onReabrirTudo
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-3xl rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="text-base font-semibold text-gray-800">
            Reabrir Inspeção
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-md p-2 text-gray-500 hover:bg-gray-100"
            disabled={saving}
          >
            <FaTimes />
          </button>
        </div>
        
        <div className="px-6 py-4 space-y-4">
          {pedido && (
            <div className="text-sm text-gray-700">
              <div className="flex flex-wrap gap-3">
                <span>
                  <span className="font-semibold">Pedido:</span> {pedido.pedido}
                </span>
                <span>
                  <span className="font-semibold">Cliente:</span> {pedido.cliente}
                </span>
                <span>
                  <span className="font-semibold">Ferramenta:</span> {pedido.ferramenta}
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">
              {error}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full text-[13px] text-gray-700">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-gray-500">
                  <th className="py-1.5 pr-3">Lote</th>
                  <th className="py-1.5 pr-3 text-right">Disponível (Pc)</th>
                  <th className="py-1.5 pr-3 text-right">Mover (Pc)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {itens.length === 0 ? (
                  <tr>
                    <td className="py-2 pr-3 text-sm text-gray-500" colSpan={3}>
                      Nenhum lote disponível para reabrir.
                    </td>
                  </tr>
                ) : (
                  itens.map((it) => (
                    <tr key={`reabr-${pedido?.id}-${it.lote}`}>
                      <td className="py-1.5 pr-3 font-semibold text-gray-800">
                        {it.lote}
                      </td>
                      <td className="py-1.5 pr-3 text-right">
                        {formatInteger(it.disponivel)}
                      </td>
                      <td className="py-1.5 pr-3 text-right">
                        <input
                          type="number"
                          inputMode="numeric"
                          className="w-28 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-200"
                          value={toIntegerRound(it.mover) || ''}
                          onChange={(e) => onSetMover(it.lote, e.target.value)}
                          min={0}
                          max={toIntegerRound(it.disponivel) || 0}
                          disabled={saving}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-2 text-xs text-gray-500">
            <span>
              Ajuste as quantidades por lote para retornar peças à Inspeção.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onReabrirTudo}
                disabled={saving || itens.length === 0}
                className="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 font-semibold text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Reabrir tudo
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 font-semibold text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={saving || itens.length === 0}
                className="inline-flex items-center rounded-md bg-purple-600 px-3 py-1.5 font-semibold text-white shadow-sm transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Processando...' : 'Confirmar reabertura'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReabrirModal;
