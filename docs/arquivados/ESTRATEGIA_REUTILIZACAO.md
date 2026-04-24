# ESTRATÉGIA DE REUTILIZAÇÃO - Sem Criar Do Zero (25/11/2025)

## ✅ ANÁLISE: O QUE JÁ EXISTE

### Hook Existente: `useApontamentoModal.js`

**Está 95% pronto!** Apenas precisa de ajustes mínimos.

```javascript
// ✅ JÁ TEM:
- Estados: open, pedido, stage, qtdPc, qtdPcInspecao, obs, inicio, fim
- Funções: openModal, closeModal, saveApontamento
- Validações: quantidade, datas, saldos
- Lógica de distribuição: pcsInspecao, pcsEmbalar
- Lotes derivados: -INS-01, -EMB-01
- Sincronização com banco

// ❌ PROBLEMA:
- Lógica está CORRETA mas não está sendo usada para inspeção e embalagem
- Modal é aberto APENAS para "para-usinar"
- Não há botões para "para-inspecao" e "para-embarque"
```

---

## 🎯 ESTRATÉGIA: REUTILIZAR + ADAPTAR

### Opção 1: Usar o MESMO Hook para Todos os Estágios (RECOMENDADO)

**Vantagem:** Mínimas mudanças, máxima reutilização

**Mudanças Necessárias:**

#### 1. Adaptar `useApontamentoModal.js`
```javascript
// ANTES: Lógica específica para "para-usinar"
if (stage === 'para-usinar') {
  // Cria 2 apontamentos (inspeção + embalagem)
}

// DEPOIS: Lógica genérica para qualquer estágio
if (stage === 'para-usinar') {
  // Cria 2 apontamentos (inspeção + embalagem)
} else if (stage === 'para-inspecao') {
  // Cria 1 apontamento (move para embalagem)
} else if (stage === 'para-embarque') {
  // Cria 1 apontamento (move para expedição)
}
```

#### 2. Adicionar Botões em ExpUsinagem.jsx
```javascript
// ANTES: Botão apenas em "para-usinar"
{stageKey === 'para-usinar' && (
  <button onClick={() => apontamentoHook?.openModal(...)}>Apontar</button>
)}

// DEPOIS: Botão em todos os estágios
{['para-usinar', 'para-inspecao', 'para-embarque'].includes(stageKey) && (
  <button onClick={() => apontamentoHook?.openModal(...)}>Apontar</button>
)}
```

#### 3. Adaptar Modal para Cada Estágio
```javascript
// ANTES: Modal mostra campos de distribuição
- Quantidade produzida
- Para Inspeção
- Direto p/ Embalagem

// DEPOIS: Modal adapta-se ao estágio
Se stage === 'para-usinar':
  - Quantidade produzida
  - Para Inspeção
  - Direto p/ Embalagem

Se stage === 'para-inspecao':
  - Quantidade inspecionada
  - (sem distribuição)

Se stage === 'para-embarque':
  - Quantidade embalada
  - (sem distribuição)
```

---

## 📊 COMPARAÇÃO: Criar vs Reutilizar

| Aspecto | Criar Novo | Reutilizar |
|---------|-----------|-----------|
| **Linhas de código** | +300 | +50 |
| **Risco de erro** | Alto | Baixo |
| **Tempo** | 2 horas | 30 min |
| **Manutenção** | Difícil (3 hooks) | Fácil (1 hook) |
| **Duplicação** | Sim | Não |
| **Bugs potenciais** | Múltiplos | Mínimos |

---

## 🔧 PLANO DE REUTILIZAÇÃO (DETALHADO)

### MUDANÇA 1: Adaptar `useApontamentoModal.js`

**Arquivo:** `frontend/src/hooks/useApontamentoModal.js`

**Mudanças:**

#### A. Adicionar estado para "lote selecionado" (para inspeção/embalagem)
```javascript
// Linha ~40, adicionar:
const [loteSelecionado, setLoteSelecionado] = useState(null);
```

#### B. Adaptar `openModal` para carregar lotes disponíveis
```javascript
// Linha ~84, modificar:
const openModal = useCallback((orderId, stageKey) => {
  // ... código existente ...
  
  // ✅ NOVO: Se stage é inspeção ou embalagem, carregar lotes disponíveis
  if (stageKey === 'para-inspecao' || stageKey === 'para-embarque') {
    // Buscar apontamentos neste estágio
    const apontamentosEstágio = apontByFluxo[orderId]?.filter(
      a => a.exp_stage === stageKey
    ) || [];
    // Armazenar para usar no modal
  }
}, [...deps])
```

#### C. Adaptar `saveApontamento` para cada estágio
```javascript
// Linha ~158, modificar a lógica:

if (stage === 'para-usinar') {
  // ✅ EXISTENTE: Criar 2 apontamentos (inspeção + embalagem)
  // Código já está correto
} else if (stage === 'para-inspecao') {
  // ✅ NOVO: Atualizar apontamento para "para-embarque"
  // Buscar apontamento em "para-inspecao"
  // Atualizar: exp_stage = "para-embarque"
  // Gerar novo lote derivado
} else if (stage === 'para-embarque') {
  // ✅ NOVO: Atualizar apontamento para "expedicao-tecno"
  // Buscar apontamento em "para-embarque"
  // Atualizar: exp_stage = "expedicao-tecno"
  // Gerar novo lote derivado
}
```

---

### MUDANÇA 2: Adaptar `ApontamentoModal.jsx`

**Arquivo:** `frontend/src/components/exp-usinagem/modals/ApontamentoModal.jsx`

**Mudanças:**

#### A. Mostrar/Ocultar campos baseado no estágio
```javascript
// Linha ~80, modificar:
const isStageUsinar = stage === 'para-usinar';
const isStageInspecao = stage === 'para-inspecao';
const isStageEmbalagem = stage === 'para-embarque';

// Mostrar campos de distribuição APENAS em "para-usinar"
{isStageUsinar && (
  <>
    <input placeholder="Para Inspeção (Pc)" />
    <input placeholder="Direto p/ Embalagem (Pc)" />
  </>
)}

// Mostrar seletor de lote em "para-inspecao" e "para-embarque"
{(isStageInspecao || isStageEmbalagem) && (
  <select>
    {lotes.map(lote => <option>{lote.lote}</option>)}
  </select>
)}
```

#### B. Adaptar título e instruções
```javascript
// Linha ~160, modificar:
const titulo = isStageUsinar 
  ? 'Apontar produção - Alúnica'
  : isStageInspecao
  ? 'Apontar inspeção - Alúnica'
  : 'Apontar embalagem - Alúnica'

const instrucoes = isStageUsinar
  ? 'Informe a quantidade total produzida...'
  : isStageInspecao
  ? 'Informe a quantidade inspecionada...'
  : 'Informe a quantidade embalada...'
```

---

### MUDANÇA 3: Adicionar Botões em `ExpUsinagem.jsx`

**Arquivo:** `frontend/src/pages/ExpUsinagem.jsx`

**Mudanças:**

#### A. Expandir condição do botão "Apontar"
```javascript
// Linha ~1450, modificar:

// ❌ ANTES:
{stageKey === 'para-embarque' && !pedidoCtx.finalizado && (
  <button onClick={() => apontamentoHook?.openModal(...)}>
    <FaPlay />
  </button>
)}

// ✅ DEPOIS:
{['para-usinar', 'para-inspecao', 'para-embarque'].includes(stageKey) && 
 !pedidoCtx.finalizado && (
  <button onClick={() => apontamentoHook?.openModal(...)}>
    <FaPlay />
  </button>
)}
```

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO (REUTILIZAÇÃO)

### Fase 1: Preparação
- [ ] Criar branch: `git checkout -b fix/fluxo-alunica-reutilizacao`
- [ ] Fazer snapshot: `git commit -m "SNAPSHOT: Pre-fluxo-alunica-reutilizacao"`

### Fase 2: Adaptar Hook (30 min)
- [ ] Adicionar estado `loteSelecionado`
- [ ] Adaptar `openModal` para carregar lotes
- [ ] Adaptar `saveApontamento` para 3 estágios
- [ ] Testar lógica isoladamente

### Fase 3: Adaptar Modal (20 min)
- [ ] Adicionar lógica de mostrar/ocultar campos
- [ ] Adaptar título e instruções
- [ ] Adicionar seletor de lote
- [ ] Testar renderização

### Fase 4: Adicionar Botões (10 min)
- [ ] Expandir condição do botão
- [ ] Testar renderização dos botões

### Fase 5: Testes Completos (30 min)
- [ ] Teste 1: Apontamento de usinagem ✅
- [ ] Teste 2: Apontamento de inspeção ✅
- [ ] Teste 3: Apontamento de embalagem ✅
- [ ] Teste 4: Paralelismo ✅

### Fase 6: Finalização
- [ ] Revisar código
- [ ] Fazer commit
- [ ] Criar PR

---

## 🎯 RESULTADO FINAL

**Mudanças Totais:**
- ✅ 1 hook adaptado (não criado)
- ✅ 1 modal adaptado (não criado)
- ✅ 1 componente atualizado (ExpUsinagem.jsx)
- ✅ ~100 linhas de código modificadas (não +300)
- ✅ 0 novos arquivos criados
- ✅ Risco mínimo de erros

**Tempo Total:** ~1 hora 30 min (vs 2+ horas criando do zero)

---

## ✅ POR QUE ISSO É MELHOR

1. **Menos código:** Reutiliza 95% do que já existe
2. **Menos bugs:** Menos linhas = menos pontos de falha
3. **Mais fácil manter:** 1 hook em vez de 3
4. **Mais rápido:** 1h30 vs 2+ horas
5. **Menos risco:** Mudanças mínimas e focadas
6. **Mais confiável:** Código já testado é reutilizado

---

**Estratégia criada em:** 25/11/2025 14:40 UTC-03:00  
**Autor:** Cascade AI  
**Status:** Pronto para implementação com REUTILIZAÇÃO
