# 🚀 GUIA DE EXECUÇÃO PRÁTICA - REFATORAÇÃO ExpUsinagem.jsx

## ⚡ QUICK START - COMEÇAR AQUI

### Passo 1: Preparar Ambiente (15 minutos)
```bash
# Terminal 1: Backup completo
cd /caminho/do/projeto/usinagem-app
git status  # Verificar se está limpo
git checkout main
git pull origin main
git checkout -b refactor/exp-usinagem-safe
git tag BACKUP-$(date +%Y%m%d-%H%M%S)

# Terminal 2: Servidor de desenvolvimento
npm run dev  # Deixar rodando para testar

# Terminal 3: Para comandos Git
# Manter aberto
```

### Passo 2: Criar Estrutura de Pastas
```bash
# Criar estrutura necessária
cd frontend/src/components/exp-usinagem
mkdir -p modals tabs forms
cd ../../hooks
# Já deve existir
cd ../utils
# Já deve existir
```

### Passo 3: Arquivo de Feature Flags
```javascript
// frontend/src/config/refactorFlags.js
export const REFACTOR = {
  // Iniciar tudo como false
  USE_NEW_APONTAMENTO_MODAL: false,
  USE_NEW_APROVAR_MODAL: false,
  USE_NEW_REABRIR_MODAL: false,
  USE_NEW_TECNO_TAB: false,
  USE_NEW_ALUNICA_TAB: false,
  USE_NEW_ALUNICA_HOOK: false,
  USE_NEW_TECNO_HOOK: false,
  
  // Debug
  LOG_CHANGES: true,
  SHOW_OLD_CODE: true  // Mostrar código antigo para comparação
};
```

---

## 📋 CHECKLIST DE VALIDAÇÃO RÁPIDA

Use este checklist após CADA mudança:

```markdown
### ✅ Validação Básica (30 segundos)
- [ ] App compila sem erros
- [ ] Console sem erros vermelhos
- [ ] Página carrega normalmente
- [ ] Abas funcionam

### ✅ Validação TecnoPerfil (1 minuto)
- [ ] Cards aparecem
- [ ] Botões clicáveis
- [ ] Modal de seleção abre
- [ ] Pedido move entre estágios

### ✅ Validação Alúnica (1 minuto)
- [ ] Cards aparecem
- [ ] Botão Apontar funciona
- [ ] Modal abre e fecha
- [ ] Dados salvam

### ✅ Validação Estoque (30 segundos)
- [ ] Tabela carrega
- [ ] Filtros funcionam
- [ ] Export funciona
```

---

## 🔧 PRIMEIRA REFATORAÇÃO - Modal de Apontamento

### PASSO A PASSO DETALHADO

#### 1. Copiar o Modal Atual (10 minutos)

```javascript
// frontend/src/components/exp-usinagem/modals/ApontamentoModal.jsx

import React from 'react';
import { FaTimes } from 'react-icons/fa';
import { formatInteger, formatNumber, toIntegerRound, toDecimal } from '../../../utils/expUsinagem';

const ApontamentoModal = ({
  // Estados
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
  
  // Dados auxiliares
  fluxoPedidos,
  
  // Handlers
  onClose,
  onSave,
  onQtdPcChange,
  onQtdPcInspecaoChange,
  onObsChange,
  onInicioChange,
  onFimChange
}) => {
  if (!open) return null;

  // Cálculos auxiliares (copiar do original)
  const fluxoAtual = Array.isArray(fluxoPedidos)
    ? fluxoPedidos.find(f => String(f.id) === String(pedido?.id))
    : null;

  const pedidoPcTotal = toIntegerRound(pedido?.pedidoPcNumber ?? pedido?.pedidoPc) || 0;
  const pedidoKgTotal = toDecimal(pedido?.pedidoKgNumber ?? pedido?.pedidoKg) || 0;
  
  const apontadoPc = toIntegerRound(fluxoAtual?.saldo_pc_total) || 0;
  const apontadoKg = toDecimal(fluxoAtual?.saldo_kg_total) || 0;
  
  const saldoPc = Math.max(pedidoPcTotal - apontadoPc, 0);
  const saldoKg = Math.max(pedidoKgTotal - apontadoKg, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-3xl rounded-lg bg-white shadow-xl">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              Apontar produção - Alúnica
            </h2>
            {pedido && (
              <p className="text-xs text-gray-500">
                Pedido <span className="font-semibold">{pedido.pedido}</span> · 
                Cliente {pedido.cliente} · 
                Ferramenta {pedido.ferramenta}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-md p-2 text-gray-500 hover:bg-gray-100"
            disabled={saving}
          >
            <FaTimes />
          </button>
        </div>

        {/* Corpo */}
        <div className="px-6 py-4 space-y-4 text-sm text-gray-700">
          {/* Info Box */}
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

          {/* Erro */}
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">
              {error}
            </div>
          )}

          {/* Formulário */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Campo Quantidade Total */}
            <div className="sm:col-span-1">
              <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">
                Qtd Total (Pc) *
              </label>
              <input
                type="number"
                value={qtdPc}
                onChange={(e) => onQtdPcChange(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-200"
                placeholder="0"
                disabled={saving}
              />
            </div>

            {/* Campo Inspeção */}
            <div className="sm:col-span-1">
              <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">
                Para Inspeção (Pc)
              </label>
              <input
                type="number"
                value={qtdPcInspecao}
                onChange={(e) => onQtdPcInspecaoChange(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-200"
                placeholder="0"
                disabled={saving}
              />
            </div>

            {/* Campo Para Embarque (readonly) */}
            <div className="sm:col-span-1">
              <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">
                Para Embarque (Pc)
              </label>
              <input
                type="text"
                value={Math.max(toIntegerRound(qtdPc) - toIntegerRound(qtdPcInspecao), 0)}
                readOnly
                className="w-full rounded-md border border-dashed border-gray-300 bg-gray-50 px-2 py-1 text-sm text-gray-600"
              />
            </div>

            {/* Campo Início */}
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

            {/* Campo Fim */}
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

            {/* Observações */}
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

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 text-xs text-gray-500">
            <span>
              Informe a quantidade total produzida em peças e quantas vão para inspeção.
            </span>
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
```

#### 2. Integrar com Feature Flag (5 minutos)

```javascript
// Em ExpUsinagem.jsx

import { REFACTOR } from '../config/refactorFlags';
import ApontamentoModalNew from '../components/exp-usinagem/modals/ApontamentoModal';

// No render:
{REFACTOR.USE_NEW_APONTAMENTO_MODAL ? (
  <ApontamentoModalNew
    open={alunicaApontOpen}
    pedido={alunicaApontPedido}
    stage={alunicaApontStage}
    qtdPc={alunicaApontQtdPc}
    qtdPcInspecao={alunicaApontQtdPcInspecao}
    obs={alunicaApontObs}
    inicio={alunicaApontInicio}
    fim={alunicaApontFim}
    fimTouched={alunicaApontFimTouched}
    saving={alunicaApontSaving}
    error={alunicaApontError}
    fluxoPedidos={fluxoPedidos}
    onClose={closeAlunicaApontamento}
    onSave={handleSalvarAlunicaApont}
    onQtdPcChange={setAlunicaApontQtdPc}
    onQtdPcInspecaoChange={setAlunicaApontQtdPcInspecao}
    onObsChange={setAlunicaApontObs}
    onInicioChange={handleInicioChange}
    onFimChange={handleFimChange}
  />
) : (
  // Código original do modal (manter por enquanto)
  {alunicaApontOpen && (
    <div className="fixed inset-0 z-50...">
      {/* ... código original ... */}
    </div>
  )}
)}
```

#### 3. Ativar e Testar (5 minutos)

```javascript
// frontend/src/config/refactorFlags.js
export const REFACTOR = {
  USE_NEW_APONTAMENTO_MODAL: true,  // <-- Ativar
  // ... resto continua false
};
```

**Testes:**
1. Abrir navegador
2. Ir para aba Alúnica
3. Clicar em "Apontar"
4. Verificar se modal abre
5. Preencher campos
6. Salvar
7. Verificar se salvou

#### 4. Commit se Funcionar

```bash
git add .
git commit -m "refactor: extrair ApontamentoModal para componente separado"
git push origin refactor/exp-usinagem-safe
```

---

## ⚠️ TROUBLESHOOTING - PROBLEMAS COMUNS

### Problema 1: Modal não abre
```javascript
// Verificar no console:
console.log('Modal state:', {
  open: alunicaApontOpen,
  pedido: alunicaApontPedido,
  flag: REFACTOR.USE_NEW_APONTAMENTO_MODAL
});
```

### Problema 2: Erro de importação
```javascript
// Verificar caminho:
// ✅ Correto:
import ApontamentoModal from '../components/exp-usinagem/modals/ApontamentoModal';
// ❌ Errado:
import ApontamentoModal from './modals/ApontamentoModal';
```

### Problema 3: Props undefined
```javascript
// Adicionar validação:
const ApontamentoModal = ({ pedido, ...props }) => {
  console.log('Modal props:', { pedido, ...props });
  
  if (!pedido) {
    console.warn('Pedido não fornecido ao modal');
    return null;
  }
  // ...
};
```

### Problema 4: Estado não atualiza
```javascript
// Verificar se handlers estão sendo chamados:
onQtdPcChange={(value) => {
  console.log('Mudando qtdPc para:', value);
  setAlunicaApontQtdPc(value);
}}
```

---

## 🔄 ROLLBACK RÁPIDO

Se algo der muito errado:

### Opção 1: Desativar Feature Flag (5 segundos)
```javascript
// frontend/src/config/refactorFlags.js
export const REFACTOR = {
  USE_NEW_APONTAMENTO_MODAL: false,  // <-- Desativar
};
```

### Opção 2: Reverter Último Commit (30 segundos)
```bash
git revert HEAD
git push origin refactor/exp-usinagem-safe
```

### Opção 3: Voltar ao Backup (1 minuto)
```bash
git reset --hard BACKUP-[timestamp]
git push --force origin refactor/exp-usinagem-safe
```

### Opção 4: Nuclear - Voltar Tudo (2 minutos)
```bash
git checkout main
git branch -D refactor/exp-usinagem-safe
# Começar do zero
```

---

## 📈 PROGRESSO DA REFATORAÇÃO

Use esta tabela para acompanhar:

| Componente | Status | Testado | Commit | Notas |
|------------|--------|---------|--------|-------|
| ApontamentoModal | 🟡 Em progresso | ⬜ | ⬜ | |
| AprovarModal | ⬜ Não iniciado | ⬜ | ⬜ | |
| ReabrirModal | ⬜ Não iniciado | ⬜ | ⬜ | |
| TecnoPerfilTab | ⬜ Não iniciado | ⬜ | ⬜ | |
| AlunicaTab | ⬜ Não iniciado | ⬜ | ⬜ | |
| useAlunicaState | ⬜ Não iniciado | ⬜ | ⬜ | |
| useTecnoPerfilState | ⬜ Não iniciado | ⬜ | ⬜ | |
| apontamentosLogic | ⬜ Não iniciado | ⬜ | ⬜ | |
| pedidosLogic | ⬜ Não iniciado | ⬜ | ⬜ | |

**Legenda:**
- ⬜ Não iniciado
- 🟡 Em progresso
- ✅ Concluído
- ❌ Com problemas

---

## 🎯 DICAS FINAIS

### DO's - FAZER
- ✅ Commitar frequentemente (a cada componente extraído)
- ✅ Testar imediatamente após cada mudança
- ✅ Manter console aberto para ver erros
- ✅ Usar feature flags para tudo
- ✅ Documentar problemas encontrados
- ✅ Fazer pausas regulares (evita erros)

### DON'Ts - NÃO FAZER
- ❌ Refatorar múltiplos componentes de uma vez
- ❌ Deletar código antigo antes de testar novo
- ❌ Ignorar warnings (eles viram erros)
- ❌ Mudar lógica durante refatoração
- ❌ Trabalhar cansado ou com pressa
- ❌ Fazer deploy sem testar TUDO

---

## 💬 COMUNICAÇÃO COM O TIME

### Template de Status Diário
```markdown
## Status Refatoração ExpUsinagem - [DATA]

### ✅ Concluído Hoje
- [ ] Componente X extraído
- [ ] Testes do componente X

### 🚧 Em Progresso
- [ ] Componente Y

### ⏭️ Próximos Passos
- [ ] Componente Z

### 🚨 Bloqueios/Problemas
- Nenhum / Descrição do problema

### 📊 Progresso Geral
- 15% completo (3 de 20 componentes)
- Tempo gasto: 4 horas
- Estimativa restante: 20 horas
```

---

## 🆘 QUANDO PEDIR AJUDA

Peça ajuda IMEDIATAMENTE se:
1. Erro persiste por mais de 15 minutos
2. Performance degradou visivelmente
3. Dados não estão sendo salvos
4. Estado corrompeu (undefined em vários lugares)
5. Não consegue fazer rollback
6. Perdeu código importante

---

**FIM DO GUIA DE EXECUÇÃO**

Mantenha este guia aberto enquanto executa a refatoração. Boa sorte! 🚀
