import React, { useMemo } from 'react';
import { FaTimes } from 'react-icons/fa';
import { 
  formatInteger, 
  formatNumber, 
  toIntegerRound, 
  toDecimal 
} from '../../../utils/expUsinagem';
import { summarizeApontamentos } from '../../../utils/apontamentosLogic';

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
 * @param {Object} props.apontamentosPorFluxo - Histórico de apontamentos agrupados por fluxo/id
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
  apontamentosPorFluxo,
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
  const apontamentosPedido = apontamentosPorFluxo && pedido?.id
    ? apontamentosPorFluxo[String(pedido.id)] || []
    : [];

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
  
  // ✅ Detectar estágio
  const isStageUsinar = stage === 'para-usinar';
  const isStageInspecao = stage === 'para-inspecao';
  const isStageEmbalagem = stage === 'para-embarque';
  
  const insp = isStageUsinar ? (toIntegerRound(qtdPcInspecao) || 0) : 0;
  const emb = isStageUsinar ? Math.max(total - insp, 0) : 0;

  const resumoEmbalagem = useMemo(() => (
    isStageEmbalagem
      ? summarizeApontamentos(apontamentosPedido, ['para-embarque']) || []
      : []
  ), [apontamentosPedido, isStageEmbalagem]);

  const disponivelParaEmbalar = useMemo(
    () => resumoEmbalagem.reduce((acc, lote) => acc + (toIntegerRound(lote?.embalagem) || 0), 0),
    [resumoEmbalagem]
  );

  const saldoAposApontar = useMemo(() => {
    if (!isStageEmbalagem) return null;
    const diff = disponivelParaEmbalar - emb;
    return diff < 0 ? 0 : diff;
  }, [isStageEmbalagem, disponivelParaEmbalar, emb]);

  const excedeDisponivel = isStageEmbalagem && emb > disponivelParaEmbalar && disponivelParaEmbalar > 0;

  const renderResumoEmbalagem = () => {
    if (!isStageEmbalagem || !resumoEmbalagem.length) return null;
    return (
      <div className="rounded-md border border-violet-100 bg-violet-50 px-3 py-3 text-xs text-violet-800">
        <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-violet-900">
          <div className="flex flex-col">
            <span className="font-semibold uppercase text-[11px] text-violet-700">Disponível para Embalar (Pc)</span>
            <span className="text-lg font-bold">{formatInteger(disponivelParaEmbalar)}</span>
          </div>
          {saldoAposApontar !== null && (
            <div className="flex flex-col text-right">
              <span className="font-semibold uppercase text-[11px] text-violet-700">Saldo após este apontamento</span>
              <span className={`text-lg font-bold ${excedeDisponivel ? 'text-red-600' : 'text-emerald-700'}`}>
                {formatInteger(Math.max(saldoAposApontar, 0))}
              </span>
            </div>
          )}
        </div>
        {excedeDisponivel && (
          <p className="mt-2 rounded border border-red-200 bg-white/70 px-2 py-1 text-[11px] font-medium text-red-700">
            Quantidade informada ({formatInteger(emb)}) excede o saldo disponível. Ajuste antes de salvar.
          </p>
        )}
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-[11px] text-violet-900">
            <thead>
              <tr className="uppercase tracking-wide">
                <th className="py-1 pr-3 text-left">Lote de Usinagem</th>
                <th className="py-1 pr-3 text-left">Lote de Embalagem</th>
                <th className="py-1 pr-3 text-right">Disponível (Pc)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-violet-100">
              {resumoEmbalagem.map((lote) => (
                <tr key={`emb-resumo-${pedido?.id}-${lote.lote}`}>
                  <td className="py-1 pr-3 font-medium">{lote.loteExterno || '—'}</td>
                  <td className="py-1 pr-3 font-semibold">{lote.lote}</td>
                  <td className="py-1 pr-3 text-right">{formatInteger(lote.embalagem)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };
  const gridColsClass = isStageUsinar ? 'sm:grid-cols-3' : 'sm:grid-cols-2';
  const instructionText = isStageUsinar
    ? 'Informe a quantidade total produzida em peças e quantas vão para inspeção. Pelo menos 20 peças devem passar por inspeção antes de enviar o restante direto para embalagem.'
    : isStageInspecao
    ? 'Informe a quantidade inspecionada e aprovada para embalagem.'
    : 'Informe a quantidade efetivamente embalada e o período trabalhado nesta atividade.';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-3xl rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              {isStageUsinar ? 'Apontar produção - Alúnica' : isStageInspecao ? 'Apontar inspeção - Alúnica' : 'Apontar embalagem – Alúnica'}
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

          {renderResumoEmbalagem()}

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
            {isStageUsinar && (
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
