import React from 'react';
import { FaTimes, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';

/**
 * Modal de Confirmação para Finalizar Pedido
 * 
 * @param {Object} props
 * @param {boolean} props.open - Se o modal está aberto
 * @param {Object} props.pedido - Dados do pedido
 * @param {Function} props.onClose - Handler de fechar
 * @param {Function} props.onConfirm - Handler de confirmar
 * @param {boolean} props.loading - Se está processando
 */
const ConfirmarFinalizacaoModal = ({
  open,
  pedido,
  onClose,
  onConfirm,
  loading
}) => {
  if (!open || !pedido) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-yellow-200 bg-yellow-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <FaExclamationTriangle className="h-5 w-5 text-yellow-600" />
            <h2 className="text-lg font-semibold text-gray-800">
              Confirmar Finalização
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="text-gray-500 hover:text-gray-700 disabled:opacity-60"
          >
            <FaTimes className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-4">
          {/* Aviso */}
          <div className="rounded-md bg-yellow-50 border border-yellow-200 px-4 py-3">
            <p className="text-sm text-yellow-800">
              <span className="font-semibold">Atenção!</span> Você está prestes a finalizar este pedido. 
              Esta ação não pode ser desfeita.
            </p>
          </div>

          {/* Dados do Pedido */}
          <div className="rounded-md bg-gray-50 border border-gray-200 px-4 py-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Pedido:</span>
              <span className="font-semibold text-gray-800">{pedido.pedido}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Cliente:</span>
              <span className="font-semibold text-gray-800">{pedido.cliente}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Ferramenta:</span>
              <span className="font-semibold text-gray-800">{pedido.ferramenta}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Quantidade (PC):</span>
              <span className="font-semibold text-gray-800">{pedido.pedidoPc}</span>
            </div>
          </div>

          {/* Confirmação */}
          <div className="rounded-md bg-blue-50 border border-blue-200 px-4 py-3">
            <p className="text-sm text-blue-800">
              Após finalizar, o pedido será movido para <span className="font-semibold">Expedição TecnoPerfil</span>.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="inline-flex items-center rounded-md border border-gray-300 px-4 py-2 font-semibold text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FaCheckCircle className="h-4 w-4" />
            {loading ? 'Finalizando...' : 'Confirmar Finalização'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmarFinalizacaoModal;
