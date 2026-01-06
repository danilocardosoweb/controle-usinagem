# Plano de Refatoração - ExpUsinagem.jsx

## 📊 Situação Atual
- **Arquivo:** `frontend/src/pages/ExpUsinagem.jsx`
- **Tamanho:** 2.372 linhas
- **Status:** ❌ MUITO GRANDE - Dificulta manutenção

## 🎯 Objetivo
Reduzir o arquivo principal para **~300-500 linhas**, extraindo lógica para hooks, componentes e utilitários especializados.

---

## 📋 Análise da Estrutura Atual

### ✅ Já Refatorado (Sessão Anterior)
1. **Componentes Extraídos:**
   - `InventariosPanel.jsx` - Painel de inventários
   - `EstoqueUsinagemPanel.jsx` - Painel de estoque
   - `SelectionModal.jsx` - Modal de seleção
   - `DeletePedidoButton.jsx` - Botão de exclusão admin
   - `StatusCard.jsx` - Cards de status
   - `AlunicaStageCard.jsx` - Cards de estágios Alúnica
   - `WorkflowHeader.jsx` - Cabeçalho do workflow
   - `ResumoDashboard.jsx` - Dashboard resumo

2. **Hooks Extraídos:**
   - `useFluxoExpUsinagem.js` - Gerenciamento de fluxo e importados
   - `useInventarios.js` - Gerenciamento de inventários

3. **Utilitários:**
   - `utils/expUsinagem.js` - Funções de formatação e transformação
   - `constants/expUsinagem.js` - Constantes e configurações

### ❌ Ainda no Arquivo Principal (Precisa Refatorar)

#### 1. **Lógica de Estados (42 estados useState/useMemo)**
- Estados TecnoPerfil (orderStages, lastMovement, etc.)
- Estados Alúnica (alunicaStages, finalizados, apontamentos, etc.)
- Estados de UI (activeTab, selectionModal, etc.)
- Estados de formulários (manualPedido, importFeedback, etc.)

#### 2. **Handlers de Ações (~15 funções)**
- `handleDeleteFluxo` - Exclusão de pedidos
- `handleConfirmSelection` - Confirmação de seleção
- `handleManualSubmit` - Submissão de pedido manual
- `handleFileImport` - Importação de arquivos
- `moveOrderToStage` - Movimentação TecnoPerfil
- `handleAlunicaAction` - Ações da Alúnica
- `handleConfirmApontamento` - Confirmação de apontamento
- Outros handlers menores

#### 3. **Funções de Renderização (~10 funções)**
- `renderOrderActions` - Ações TecnoPerfil
- `renderAlunicaActions` - Ações Alúnica
- `renderAlunicaDetails` - Detalhes de apontamentos
- `renderStageOrders` - Listagem de pedidos por estágio
- `renderAlunicaStage` - Renderização de estágios Alúnica
- `renderTecnoHeader` - Cabeçalho TecnoPerfil
- `renderAlunicaHeader` - Cabeçalho Alúnica
- Outras funções de renderização

#### 4. **Lógica de Negócio (~8 funções)**
- `summarizeApontamentos` - Sumarização de apontamentos
- `alunicaBuckets` - Distribuição de pedidos por estágio
- `stageBuckets` - Buckets de estágios TecnoPerfil
- `isPedidoCompleto` - Verificação de completude
- `loadApontamentosFor` - Carregamento de apontamentos
- `montagemPayloadCarteira` - Montagem de payload
- `montagemPayloadImportado` - Montagem de payload importado

#### 5. **Componentes JSX Inline (~1000 linhas)**
- Tab TecnoPerfil completa
- Tab Alúnica completa
- Tab Resumo
- Modais (Apontamento, Seleção)
- Formulários (Manual, Importação)

---

## 🔧 Plano de Refatoração

### **FASE 1: Extrair Hooks de Lógica de Negócio** 📦

#### 1.1. Hook: `useExpTecnoPerfil.js`
**Responsabilidade:** Gerenciar todo o fluxo TecnoPerfil
```javascript
// frontend/src/hooks/useExpTecnoPerfil.js
export const useExpTecnoPerfil = (fluxoPedidos, user) => {
  // Estados
  const [orderStages, setOrderStages] = useState({})
  const [lastMovement, setLastMovement] = useState(null)
  const [deletingIds, setDeletingIds] = useState(new Set())
  
  // Lógica
  const stageBuckets = useMemo(...)
  const moveOrderToStage = useCallback(...)
  const handleDeleteFluxo = useCallback(...)
  
  return {
    orderStages,
    lastMovement,
    stageBuckets,
    moveOrderToStage,
    handleDeleteFluxo,
    deletingIds
  }
}
```

**Linhas economizadas:** ~200 linhas

---

#### 1.2. Hook: `useExpAlunica.js`
**Responsabilidade:** Gerenciar todo o fluxo Alúnica
```javascript
// frontend/src/hooks/useExpAlunica.js
export const useExpAlunica = (fluxoPedidos, user) => {
  // Estados
  const [alunicaStages, setAlunicaStages] = useState({})
  const [finalizados, setFinalizados] = useState(...)
  const [apontByFluxo, setApontByFluxo] = useState({})
  
  // Lógica
  const alunicaBuckets = useMemo(...)
  const summarizeApontamentos = useCallback(...)
  const loadApontamentosFor = useCallback(...)
  const isPedidoCompleto = useCallback(...)
  const finalizarPedidoAlunica = useCallback(...)
  const reabrirPedidoAlunica = useCallback(...)
  const handleAlunicaAction = useCallback(...)
  
  return {
    alunicaStages,
    finalizados,
    apontByFluxo,
    alunicaBuckets,
    isPedidoCompleto,
    finalizarPedidoAlunica,
    reabrirPedidoAlunica,
    handleAlunicaAction,
    loadApontamentosFor
  }
}
```

**Linhas economizadas:** ~300 linhas

---

#### 1.3. Hook: `useExpApontamento.js`
**Responsabilidade:** Gerenciar modal e lógica de apontamento
```javascript
// frontend/src/hooks/useExpApontamento.js
export const useExpApontamento = (loadFluxo, loadApontamentosFor) => {
  // Estados do modal
  const [apontOpen, setApontOpen] = useState(false)
  const [apontPedido, setApontPedido] = useState(null)
  const [apontStage, setApontStage] = useState(null)
  const [apontQtdPc, setApontQtdPc] = useState('')
  const [apontQtdPcInspecao, setApontQtdPcInspecao] = useState('')
  const [apontObs, setApontObs] = useState('')
  const [apontInicio, setApontInicio] = useState('')
  const [apontFim, setApontFim] = useState('')
  const [apontSaving, setApontSaving] = useState(false)
  const [apontError, setApontError] = useState(null)
  
  // Funções
  const openApontamento = useCallback(...)
  const closeApontamento = useCallback(...)
  const handleConfirmApontamento = useCallback(...)
  
  return {
    apontOpen,
    apontPedido,
    apontStage,
    // ... todos os estados e funções
    openApontamento,
    closeApontamento,
    handleConfirmApontamento
  }
}
```

**Linhas economizadas:** ~200 linhas

---

#### 1.4. Hook: `useExpImportacao.js`
**Responsabilidade:** Gerenciar importação e seleção de pedidos
```javascript
// frontend/src/hooks/useExpImportacao.js
export const useExpImportacao = (importados, pedidosCarteira, loadFluxo) => {
  // Estados
  const [selectionModalOpen, setSelectionModalOpen] = useState(false)
  const [selectionTab, setSelectionTab] = useState('importados')
  const [selectedImportados, setSelectedImportados] = useState([])
  const [selectedCarteira, setSelectedCarteira] = useState([])
  const [isSavingSelection, setIsSavingSelection] = useState(false)
  
  // Estados de formulário manual
  const [manualPedido, setManualPedido] = useState(INITIAL_MANUAL_PEDIDO)
  const [showManualForm, setShowManualForm] = useState(false)
  
  // Estados de importação de arquivo
  const [isProcessingImport, setIsProcessingImport] = useState(false)
  const [importFeedback, setImportFeedback] = useState({ type: null, message: '' })
  const fileInputRef = useRef(null)
  
  // Lógica
  const importadosDisponiveis = useMemo(...)
  const toggleSelection = useCallback(...)
  const handleConfirmSelection = useCallback(...)
  const handleFileImport = useCallback(...)
  const handleManualSubmit = useCallback(...)
  
  return {
    // Estados e funções de seleção
    selectionModalOpen,
    setSelectionModalOpen,
    // ... etc
  }
}
```

**Linhas economizadas:** ~250 linhas

---

### **FASE 2: Extrair Componentes de UI** 🎨

#### 2.1. Componente: `TecnoPerfilTab.jsx`
**Responsabilidade:** Renderizar toda a aba TecnoPerfil
```javascript
// frontend/src/components/exp-usinagem/TecnoPerfilTab.jsx
const TecnoPerfilTab = ({
  stageBuckets,
  orderStages,
  lastMovement,
  pedidosTecnoPerfil,
  onMoveStage,
  onDeleteOrder,
  onOpenSelection,
  isAdmin,
  deletingIds
}) => {
  return (
    <div>
      <TecnoPerfilHeader ... />
      <WorkflowStages ... />
      <StageCards ... />
    </div>
  )
}
```

**Linhas economizadas:** ~300 linhas

---

#### 2.2. Componente: `AlunicaTab.jsx`
**Responsabilidade:** Renderizar toda a aba Alúnica
```javascript
// frontend/src/components/exp-usinagem/AlunicaTab.jsx
const AlunicaTab = ({
  alunicaBuckets,
  apontByFluxo,
  onAction,
  onApontar,
  onFinalizar,
  onReabrir,
  isAdmin,
  isPedidoCompleto
}) => {
  return (
    <div>
      <AlunicaHeader ... />
      <AlunicaStages ... />
    </div>
  )
}
```

**Linhas economizadas:** ~250 linhas

---

#### 2.3. Componente: `ApontamentoModal.jsx`
**Responsabilidade:** Modal de apontamento completo
```javascript
// frontend/src/components/exp-usinagem/ApontamentoModal.jsx
const ApontamentoModal = ({
  open,
  pedido,
  stage,
  qtdPc,
  qtdPcInspecao,
  obs,
  inicio,
  fim,
  error,
  saving,
  onClose,
  onConfirm,
  onFieldChange
}) => {
  // ... renderização do modal completo
}
```

**Linhas economizadas:** ~150 linhas

---

#### 2.4. Componente: `ImportacaoPanel.jsx`
**Responsabilidade:** Painel de importação e cadastro manual
```javascript
// frontend/src/components/exp-usinagem/ImportacaoPanel.jsx
const ImportacaoPanel = ({
  showManualForm,
  manualPedido,
  importFeedback,
  isProcessing,
  onToggleForm,
  onFileImport,
  onManualSubmit,
  onFieldChange,
  fileInputRef
}) => {
  // ... formulário manual + botão upload
}
```

**Linhas economizadas:** ~100 linhas

---

### **FASE 3: Utilitários e Helpers** 🛠️

#### 3.1. Arquivo: `utils/expApontamentos.js`
**Responsabilidade:** Lógica de apontamentos
```javascript
// Funções:
- summarizeApontamentos()
- gerarNumeroLote()
- calcularDistribuicaoApontamentos()
- validarApontamento()
```

**Linhas economizadas:** ~100 linhas

---

#### 3.2. Arquivo: `utils/expPayloads.js`
**Responsabilidade:** Montagem de payloads
```javascript
// Funções:
- montagemPayloadCarteira()
- montagemPayloadImportado()
- montagemPayloadApontamento()
```

**Linhas economizadas:** ~80 linhas

---

## 📊 Estimativa de Redução

| Fase | Ação | Linhas Removidas |
|------|------|------------------|
| **Fase 1** | Hooks de lógica | ~950 linhas |
| **Fase 2** | Componentes UI | ~800 linhas |
| **Fase 3** | Utilitários | ~180 linhas |
| **TOTAL** | - | **~1.930 linhas** |

**Resultado Final:** ExpUsinagem.jsx ficará com **~440 linhas** (apenas orquestração)

---

## 🗂️ Estrutura Final do Projeto

```
frontend/src/
├── pages/
│   └── ExpUsinagem.jsx (440 linhas) ✅
│
├── hooks/
│   ├── useExpTecnoPerfil.js (200 linhas) 🆕
│   ├── useExpAlunica.js (300 linhas) 🆕
│   ├── useExpApontamento.js (200 linhas) 🆕
│   ├── useExpImportacao.js (250 linhas) 🆕
│   ├── useFluxoExpUsinagem.js (existente) ✅
│   └── useInventarios.js (existente) ✅
│
├── components/exp-usinagem/
│   ├── TecnoPerfilTab.jsx (300 linhas) 🆕
│   ├── AlunicaTab.jsx (250 linhas) 🆕
│   ├── ApontamentoModal.jsx (150 linhas) 🆕
│   ├── ImportacaoPanel.jsx (100 linhas) 🆕
│   ├── AlunicaStageCard.jsx (existente) ✅
│   ├── StatusCard.jsx (existente) ✅
│   ├── WorkflowHeader.jsx (existente) ✅
│   ├── ResumoDashboard.jsx (existente) ✅
│   ├── InventariosPanel.jsx (existente) ✅
│   ├── EstoqueUsinagemPanel.jsx (existente) ✅
│   ├── SelectionModal.jsx (existente) ✅
│   └── DeletePedidoButton.jsx (existente) ✅
│
└── utils/
    ├── expUsinagem.js (existente) ✅
    ├── expApontamentos.js (100 linhas) 🆕
    └── expPayloads.js (80 linhas) 🆕
```

---

## 🚀 Ordem de Execução

### **Prioridade 1 - Crítico** (Reduz ~950 linhas)
1. ✅ Criar `useExpTecnoPerfil.js`
2. ✅ Criar `useExpAlunica.js`
3. ✅ Criar `useExpApontamento.js`
4. ✅ Criar `useExpImportacao.js`
5. ✅ Atualizar `ExpUsinagem.jsx` para usar os novos hooks

### **Prioridade 2 - Alta** (Reduz ~800 linhas)
6. ✅ Criar `TecnoPerfilTab.jsx`
7. ✅ Criar `AlunicaTab.jsx`
8. ✅ Criar `ApontamentoModal.jsx`
9. ✅ Criar `ImportacaoPanel.jsx`
10. ✅ Atualizar `ExpUsinagem.jsx` para usar os novos componentes

### **Prioridade 3 - Média** (Reduz ~180 linhas)
11. ✅ Criar `utils/expApontamentos.js`
12. ✅ Criar `utils/expPayloads.js`
13. ✅ Atualizar imports em todos os arquivos

---

## ⚠️ Cuidados Durante a Refatoração

1. **Manter funcionalidade atual** - Não quebrar nada que funciona
2. **Testar após cada fase** - Validar que tudo continua funcionando
3. **Preservar estados compartilhados** - Usar Context se necessário
4. **Documentar dependências** - Mapear quem depende de quem
5. **Atualizar change_log.md** - Registrar cada alteração

---

## ✅ Checklist de Validação

Após cada fase, validar:
- [ ] Aba TecnoPerfil funciona (seleção, movimentação, exclusão)
- [ ] Aba Alúnica funciona (apontamentos, estágios, finalização)
- [ ] Aba Resumo funciona (exportação, filtros)
- [ ] Inventários funcionam (criação, edição, exclusão)
- [ ] Estoque funciona (filtros, exportação)
- [ ] Importação funciona (arquivo, manual, seleção)
- [ ] Sem erros no console
- [ ] Sem warnings de performance

---

## 📝 Notas Importantes

- **Não começar refatoração sem aprovação** - Aguardar confirmação do usuário
- **Fazer em branches separadas** - Criar branch `refactor/exp-usinagem`
- **Commits atômicos** - Um commit por arquivo criado
- **Mensagens descritivas** - Facilitar rollback se necessário
- **Backup antes de começar** - Git commit com "Pre-refactor snapshot"

---

**Status:** 📋 PLANEJAMENTO COMPLETO - AGUARDANDO APROVAÇÃO
**Data:** 17/11/2025 22:32
**Autor:** Cascade
