# PLANO DE IMPLEMENTAÇÃO - Fluxo Alúnica Corrigido (25/11/2025)

## 🎯 OBJETIVO

Implementar o fluxo correto da Alúnica onde:
- ✅ Apontamento de usinagem **distribui** material para inspeção e embalagem
- ✅ Material aparece nos estágios corretos
- ✅ Inspeção e embalagem trabalham em paralelo
- ✅ Rastreabilidade completa com lotes derivados

---

## 📋 MUDANÇAS NECESSÁRIAS

### 1️⃣ CORREÇÃO: useApontamentoModal.js (Linhas 346-376)

**Problema Atual:**
```javascript
// ❌ ERRADO - Código já estava correto mas não está sendo usado
if (stage === 'para-usinar') {
  if (pcsInspecao > 0) {
    criar apontamento em "para-inspecao"
  }
  if (pcsEmbalar > 0) {
    criar apontamento em "para-embarque"
  }
}
```

**Solução:**
O código está correto! Apenas precisa garantir que:
1. ✅ `stage` chegue correto como `'para-usinar'`
2. ✅ `pcsInspecao` e `pcsEmbalar` sejam calculados corretamente
3. ✅ Lotes derivados sejam gerados com sufixos corretos

**Verificar:**
- [ ] Linha 346: `if (stage === 'para-usinar')` 
- [ ] Linha 353: `exp_stage: 'para-inspecao'` ✅
- [ ] Linha 365: `exp_stage: 'para-embarque'` ✅
- [ ] Linha 313-314: Sufixos `-INS-` e `-EMB-` ✅

---

### 2️⃣ ADICIONAR: Modal para "Material para Inspeção"

**Arquivo:** `frontend/src/components/exp-usinagem/modals/ApontamentoInspecaoModal.jsx` (NOVO)

**Funcionalidade:**
```javascript
// Quando operador clica "Apontar" em "Material para Inspeção"
// Modal deve permitir:
// - Selecionar lotes em "para-inspecao"
// - Informar quantidade inspecionada
// - Mover para "para-embarque"
// - Gerar novo lote derivado (-INS-01-EMB-01)
```

**Campos:**
```
Lote: [Dropdown com lotes em para-inspecao]
Quantidade Inspecionada (PC): [Input]
Observações: [Textarea]
[Cancelar] [Salvar Apontamento]
```

**Lógica:**
```javascript
// Ao salvar:
// 1. Buscar apontamento atual em "para-inspecao"
// 2. Atualizar: exp_stage = "para-embarque"
// 3. Gerar novo lote: lote_anterior + "-INS-01-EMB-01"
// 4. Registrar movimentação
// 5. Recarregar dados
```

---

### 3️⃣ ADICIONAR: Modal para "Material para Embalagem"

**Arquivo:** `frontend/src/components/exp-usinagem/modals/ApontamentoEmbalagemModal.jsx` (NOVO)

**Funcionalidade:**
```javascript
// Quando operador clica "Apontar" em "Material para Embalagem"
// Modal deve permitir:
// - Selecionar lotes em "para-embarque"
// - Informar quantidade embalada
// - Mover para "expedicao-tecno"
// - Gerar novo lote derivado (-EMB-01-EXP-01)
```

**Campos:**
```
Lote: [Dropdown com lotes em para-embarque]
Quantidade Embalada (PC): [Input]
Observações: [Textarea]
[Cancelar] [Salvar Apontamento]
```

**Lógica:**
```javascript
// Ao salvar:
// 1. Buscar apontamento atual em "para-embarque"
// 2. Atualizar: exp_stage = "expedicao-tecno"
// 3. Gerar novo lote: lote_anterior + "-EMB-01-EXP-01"
// 4. Registrar movimentação
// 5. Recarregar dados
```

---

### 4️⃣ ATUALIZAR: ExpUsinagem.jsx

**Adicionar Botões de Apontamento:**

#### Em "Material para Inspeção":
```javascript
// Linha ~1450 (onde está o botão de apontamento para para-embarque)
// Adicionar ANTES:

{stageKey === 'para-inspecao' && !pedidoCtx.finalizado && (
  <button
    type="button"
    onClick={() => apontamentoInspecaoHook?.openModal(pedidoCtx.id, stageKey)}
    className={getButtonClasses('primary')}
    disabled={isLoading}
    title="Registrar Apontamento de Inspeção"
  >
    <FaPlay className="h-3.5 w-3.5" />
  </button>
)}
```

#### Em "Material para Embalagem":
```javascript
// Linha ~1455 (onde está o botão de apontamento para para-embarque)
// Adicionar ANTES:

{stageKey === 'para-embarque' && !pedidoCtx.finalizado && (
  <button
    type="button"
    onClick={() => apontamentoEmbalagemHook?.openModal(pedidoCtx.id, stageKey)}
    className={getButtonClasses('primary')}
    disabled={isLoading}
    title="Registrar Apontamento de Embalagem"
  >
    <FaPlay className="h-3.5 w-3.5" />
  </button>
)}
```

**Adicionar Hooks:**
```javascript
// No início do componente, após os outros hooks:

const apontamentoInspecaoHook = useApontamentoInspecaoModal({
  user,
  pedidosTecnoPerfil,
  loadApontamentosFor,
  loadFluxo
});

const apontamentoEmbalagemHook = useApontamentoEmbalagemModal({
  user,
  pedidosTecnoPerfil,
  loadApontamentosFor,
  loadFluxo
});
```

**Adicionar Modais:**
```javascript
// No final do JSX, antes do fechamento do componente:

{apontamentoInspecaoHook?.open && (
  <ApontamentoInspecaoModal
    open={apontamentoInspecaoHook.open}
    pedido={apontamentoInspecaoHook.pedido}
    stage={apontamentoInspecaoHook.stage}
    onClose={apontamentoInspecaoHook.closeModal}
    onSave={apontamentoInspecaoHook.saveApontamento}
    saving={apontamentoInspecaoHook.saving}
    error={apontamentoInspecaoHook.error}
  />
)}

{apontamentoEmbalagemHook?.open && (
  <ApontamentoEmbalagemModal
    open={apontamentoEmbalagemHook.open}
    pedido={apontamentoEmbalagemHook.pedido}
    stage={apontamentoEmbalagemHook.stage}
    onClose={apontamentoEmbalagemHook.closeModal}
    onSave={apontamentoEmbalagemHook.saveApontamento}
    saving={apontamentoEmbalagemHook.saving}
    error={apontamentoEmbalagemHook.error}
  />
)}
```

---

### 5️⃣ CRIAR: useApontamentoInspecaoModal.js

**Arquivo:** `frontend/src/hooks/useApontamentoInspecaoModal.js` (NOVO)

**Baseado em:** `useApontamentoModal.js` mas simplificado para inspeção

**Lógica Principal:**
```javascript
const saveApontamento = useCallback(async () => {
  // 1. Validar quantidade
  // 2. Buscar apontamento atual em "para-inspecao"
  // 3. Atualizar: exp_stage = "para-embarque"
  // 4. Gerar novo lote derivado
  // 5. Registrar movimentação
  // 6. Recarregar dados
}, [...dependencies])
```

---

### 6️⃣ CRIAR: useApontamentoEmbalagemModal.js

**Arquivo:** `frontend/src/hooks/useApontamentoEmbalagemModal.js` (NOVO)

**Baseado em:** `useApontamentoModal.js` mas simplificado para embalagem

**Lógica Principal:**
```javascript
const saveApontamento = useCallback(async () => {
  // 1. Validar quantidade
  // 2. Buscar apontamento atual em "para-embarque"
  // 3. Atualizar: exp_stage = "expedicao-tecno"
  // 4. Gerar novo lote derivado
  // 5. Registrar movimentação
  // 6. Recarregar dados
}, [...dependencies])
```

---

## 🧪 TESTES APÓS IMPLEMENTAÇÃO

### Teste 1: Apontamento de Usinagem com Distribuição
```
1. Abrir "Material para Usinar"
2. Clicar "Apontar"
3. Informar:
   - Quantidade produzida: 50 PC
   - Para Inspeção: 20 PC
   - Direto p/ Embalagem: 30 PC
4. Salvar

✅ ESPERADO:
   - Material para Usinar: Vazio
   - Material para Inspeção: 20 PC (lote com -INS-01)
   - Material para Embalagem: 30 PC (lote com -EMB-01)
```

### Teste 2: Apontamento de Inspeção
```
1. Abrir "Material para Inspeção"
2. Vê: 20 PC do lote X-INS-01
3. Clicar "Apontar"
4. Informar: 20 PC inspecionadas
5. Salvar

✅ ESPERADO:
   - Material para Inspeção: Vazio
   - Material para Embalagem: 30 + 20 = 50 PC
   - Novo lote: X-INS-01-EMB-01
```

### Teste 3: Apontamento de Embalagem
```
1. Abrir "Material para Embalagem"
2. Vê: 50 PC (lotes X-EMB-01 e X-INS-01-EMB-01)
3. Clicar "Apontar"
4. Informar: 30 PC embaladas (lote X-EMB-01)
5. Salvar

✅ ESPERADO:
   - Material para Embalagem: 20 PC
   - Expedição TecnoPerfil: 30 PC
   - Novo lote: X-EMB-01-EXP-01
```

### Teste 4: Paralelismo
```
1. Fazer apontamento de usinagem: 50 PC (20 inspeção, 30 embalagem)
2. Enquanto isso, fazer apontamento de embalagem: 30 PC
3. Depois fazer apontamento de inspeção: 20 PC
4. Depois fazer apontamento de embalagem: 20 PC

✅ ESPERADO:
   - Tudo funciona em paralelo
   - Totais corretos em cada estágio
   - Rastreabilidade completa
```

---

## 📊 CHECKLIST DE IMPLEMENTAÇÃO

### Fase 1: Preparação
- [ ] Criar branch: `git checkout -b fix/fluxo-alunica-completo`
- [ ] Fazer snapshot: `git commit -m "SNAPSHOT: Pre-fluxo-alunica-completo"`
- [ ] Revisar código atual em `useApontamentoModal.js`

### Fase 2: Criar Novos Modais
- [ ] Criar `ApontamentoInspecaoModal.jsx`
- [ ] Criar `ApontamentoEmbalagemModal.jsx`
- [ ] Testar renderização

### Fase 3: Criar Novos Hooks
- [ ] Criar `useApontamentoInspecaoModal.js`
- [ ] Criar `useApontamentoEmbalagemModal.js`
- [ ] Testar lógica isoladamente

### Fase 4: Integrar em ExpUsinagem.jsx
- [ ] Adicionar imports dos novos hooks
- [ ] Adicionar botões nos estágios corretos
- [ ] Adicionar modais no JSX
- [ ] Testar renderização

### Fase 5: Testes Completos
- [ ] Teste 1: Apontamento de usinagem ✅
- [ ] Teste 2: Apontamento de inspeção ✅
- [ ] Teste 3: Apontamento de embalagem ✅
- [ ] Teste 4: Paralelismo ✅

### Fase 6: Finalização
- [ ] Revisar código
- [ ] Fazer commit: `git commit -m "feat: Implementar fluxo Alúnica completo com distribuição"`
- [ ] Criar PR para revisão

---

## ⚠️ PONTOS CRÍTICOS

1. **Lotes Derivados:** Garantir que sufixos `-INS-01`, `-EMB-01`, `-EXP-01` sejam gerados corretamente
2. **Estágios:** Verificar que `exp_stage` é atualizado para o estágio correto
3. **Sincronização:** Garantir que dados recarregam após cada apontamento
4. **Validações:** Mínimo 20 PC para inspeção se houver embalagem
5. **Rastreabilidade:** Cada lote deve ter histórico completo

---

## 🚀 PRÓXIMOS PASSOS

1. ✅ Análise completa (CONCLUÍDA)
2. ⏳ Implementação (PRÓXIMO)
3. ⏳ Testes (DEPOIS)
4. ⏳ Revisão (DEPOIS)
5. ⏳ Deploy (DEPOIS)

---

**Plano criado em:** 25/11/2025 14:35 UTC-03:00  
**Autor:** Cascade AI  
**Status:** Pronto para implementação
