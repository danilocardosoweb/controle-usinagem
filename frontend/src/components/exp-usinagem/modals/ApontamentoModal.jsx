import React from 'react';
import { FaTimes } from 'react-icons/fa';
import { 
  formatInteger, 
  formatNumber, 
  toIntegerRound, 
  toDecimal 
} from '../../../utils/expUsinagem';

/**
 * Modal de Apontamento de Produção da Alúnica
 * 
 * Componente extraído do ExpUsinagem.jsx para melhor organização
 * 
 * @param {Object} props - Propriedades do componente
 * @param {boolean} props.open - Se o modal está aberto
 * @param {Object} props.pedido - Dados do pedido
 * @param {string} props.stage - Estágio atual
 * @param {string} props.qtdPc - Quantidade total em peças
 * @param {string} props.qtdPcInspecao - Quantidade para inspeção
 * @param {string} props.obs - Observações
 * @param {string} props.inicio - Data/hora de início
 * @param {string} props.fim - Data/hora de fim
 * @param {boolean} props.saving - Se está salvando
 * @param {string} props.error - Mensagem de erro
 * @param {Array} props.fluxoPedidos - Pedidos do fluxo
 * @param {Function} props.onClose - Handler de fechar
 * @param {Function} props.onSave - Handler de salvar
 * @param {Function} props.onQtdPcChange - Handler de mudança de qtd total
 * @param {Function} props.onQtdPcInspecaoChange - Handler de mudança de qtd inspeção
 * @param {Function} props.onObsChange - Handler de mudança de observações
 * @param {Function} props.onInicioChange - Handler de mudança de início
 * @param {Function} props.onFimChange - Handler de mudança de fim
 */
const ApontamentoModal = ({
  open,
  pedido,
  stage,
  qtdPc,
  qtdPcInspecao,
  obs,
  inicio,
  fim,
  saving,
  error,
  fluxoPedidos,
  onClose,
  onSave,
  onQtdPcChange,
  onQtdPcInspecaoChange,
  onObsChange,
  onInicioChange,
  onFimChange
}) => {
  if (!open) return null;

  const fluxoAtual = Array.isArray(fluxoPedidos)
    ? fluxoPedidos.find((f) => String(f.id) === String(pedido?.id))
    : null;

  const pedidoPcTotal = toIntegerRound(
    pedido?.pedidoPcNumber ?? pedido?.pedidoPc
  ) || 0;
  const pedidoKgTotal = toDecimal(
    pedido?.pedidoKgNumber ?? pedido?.pedidoKg
  ) || 0;

  const apontadoPc = toIntegerRound(fluxoAtual?.saldo_pc_total) || 0;
  const apontadoKg = toDecimal(fluxoAtual?.saldo_kg_total) || 0;

  const saldoPc = Math.max(pedidoPcTotal - apontadoPc, 0);
  const saldoKg = Math.max(pedidoKgTotal - apontadoKg, 0);

  const total = toIntegerRound(qtdPc) || 0;
  const insp = stage === 'para-embarque' ? 0 : (toIntegerRound(qtdPcInspecao) || 0);
  const emb = Math.max(total - insp, 0);
  const isStageEmbalagem = stage === 'para-embarque';
  const gridColsClass = isStageEmbalagem ? 'sm:grid-cols-2' : 'sm:grid-cols-3';
  const instructionText = isStageEmbalagem
    ? 'Informe a quantidade embalada e o período trabalhado nesta atividade.'
    : 'Informe a quantidade total produzida em peças e quantas vão para inspeção. Pelo menos 20 peças devem passar por inspeção antes de enviar o restante direto para embalagem.';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-3xl rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              Apontar produção - Alúnica
            </h2>
            {pedido && (
              <p className="text-xs text-gray-500">
                Pedido <span className="font-semibold">{pedido.pedido}</span> · Cliente {pedido.cliente} · Ferramenta {pedido.ferramenta}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="text-gray-500 hover:text-gray-700 disabled:opacity-60"
          >
            <FaTimes className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4 text-sm text-gray-700">
          {pedido && (
            <div className="rounded-md bg-purple-50 border border-purple-100 px-3 py-2 text-xs text-purple-700">
              <div className="flex flex-wrap gap-3">
                <span>
                  <span className="font-semibold">Qtd pedido Kg:</span> {pedido.pedidoKg}
                </span>
                <span>
                  <span className="font-semibold">Qtd pedido Pc:</span> {pedido.pedidoPc}
                </span>
                <span>
                  <span className="font-semibold">Saldo Kg:</span> {formatNumber(saldoKg)}
                </span>
                <span>
                  <span className="font-semibold">Saldo Pc:</span> {formatInteger(saldoPc)}
                </span>
                <span>
                  <span className="font-semibold">Estágio:</span> {stage}
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">
              {error}
            </div>
          )}

          <div className={`grid gap-3 ${gridColsClass}`}>
            <div className="sm:col-span-1">
              <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">
                Quantidade produzida (Pc)
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={qtdPc}
                onChange={(e) => onQtdPcChange(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-200"
                placeholder="Ex.: 50"
                disabled={saving}
              />
            </div>
            {!isStageEmbalagem && (
              <>
                <div className="sm:col-span-1">
                  <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">
                    Para Inspeção (Pc)
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={qtdPcInspecao}
                    onChange={(e) => onQtdPcInspecaoChange(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-200"
                    placeholder="Ex.: 5"
                    disabled={saving}
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">
                    Direto p/ Embalagem (Pc)
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={emb || ''}
                    readOnly
                    className="w-full rounded-md border border-dashed border-gray-300 bg-gray-50 px-2 py-1 text-sm text-gray-600"
                  />
                </div>
              </>
            )}
            <div className="sm:col-span-1">
              <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">
                Início
              </label>
              <input
                type="datetime-local"
                value={inicio}
                onChange={(e) => onInicioChange(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-200"
                disabled={saving}
              />
            </div>
            <div className="sm:col-span-1">
              <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">
                Fim
              </label>
              <input
                type="datetime-local"
                value={fim}
                onChange={(e) => onFimChange(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-200"
                disabled={saving}
              />
            </div>
            <div className="sm:col-span-3">
              <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">
                Observações
              </label>
              <textarea
                rows={3}
                value={obs}
                onChange={(e) => onObsChange(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-200 resize-y"
                placeholder="Comentários rápidos sobre o apontamento (opcional)"
                disabled={saving}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 text-xs text-gray-500">
            <span>{instructionText}</span>
            <div className="flex items-center gap-2">
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
                onClick={onSave}
                disabled={saving}
                className="inline-flex items-center rounded-md bg-purple-600 px-3 py-1.5 font-semibold text-white shadow-sm transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Salvando...' : 'Salvar apontamento'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApontamentoModal;
