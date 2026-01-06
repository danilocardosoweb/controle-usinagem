# ANÁLISE COMPLETA - Fluxos EXP Usinagem (25/11/2025)

## 📊 RESUMO EXECUTIVO

A aba "EXP - Usinagem" possui **2 pedidos ativos** no banco de dados com fluxos parcialmente funcionais. Identificadas **5 problemas críticos** que impedem o funcionamento completo dos fluxos, principalmente relacionados a:

1. **Inconsistência de saldos** entre `pc_disponivel` e `saldo_pc_total`
2. **Lógica de cálculo de totais** na Alúnica incorreta
3. **Duplicação de código** entre hooks e componente principal
4. **Falta de sincronização** entre TecnoPerfil e Alúnica
5. **Validações incompletas** de movimentação de lotes

---

## 🗄️ ESTADO DO BANCO DE DADOS

### Tabelas Principais
```
✅ exp_pedidos_fluxo (2 registros)
✅ apontamentos (2 registros com exp_unidade='alunica')
✅ exp_pedidos_movimentacoes (10 registros)
✅ exp_pedidos_importados (vazia)
✅ exp_estoque_baixas (vazia)
```

### Dados Atuais em exp_pedidos_fluxo

| ID | Pedido | Cliente | Status | Alunica Stage | Pedido PC | PC Disponível | Saldo PC Total |
|----|--------|---------|--------|---------------|-----------|---------------|----------------|
| e8654ad9... | 84122/40 | ZINCOLOR | expedicao_alu | para-usinar | 16 | 1.000 | 15.000 |
| e57221f7... | 84116/10 | USINAGEM | expedicao_alu | para-usinar | 4 | 0.000 | 4.000 |

### Apontamentos Existentes

```sql
-- 2 apontamentos em estágio para-embarque
exp_fluxo_id: e8654ad9... | exp_stage: para-embarque | quantidade: 4 | lote: 20112025-1242-84116/10-EMB-01
exp_fluxo_id: e8654ad9... | exp_stage: para-embarque | quantidade: 15 | lote: 20112025-1257-84122/40-EMB-01
```

---

## 🔴 PROBLEMAS IDENTIFICADOS

### PROBLEMA 1: Inconsistência de Saldos (CRÍTICO)

**Localização:** `exp_pedidos_fluxo` - campos `pc_disponivel` vs `saldo_pc_total`

**Descrição:**
```
Pedido 84122/40:
  pedido_pc = 16
  pc_disponivel = 1.000 (esperado: 16 - 15 = 1)  ✅ CORRETO
  saldo_pc_total = 15.000 (apontado)
  diferenca_real = 16 - 1 = 15 ✅ CORRETO
  
Pedido 84116/10:
  pedido_pc = 4
  pc_disponivel = 0.000 (esperado: 4 - 4 = 0) ✅ CORRETO
  saldo_pc_total = 4.000 (apontado)
  diferenca_real = 4 - 0 = 4 ✅ CORRETO
```

**Status:** ✅ **Saldos estão corretos no banco**

**Impacto:** Nenhum - os dados estão consistentes.

---

### PROBLEMA 2: Lógica de Totais da Alúnica Incorreta (CRÍTICO)

**Localização:** `useAlunicaState.js` linhas 146-171

**Código Problemático:**
```javascript
const alunicaTotals = useMemo(() => {
  const totals = { 'para-usinar': 0, 'para-inspecao': 0, 'para-embarque': 0 }
  
  // ❌ PROBLEMA: Calcula totais apenas dos pedidos em alunicaStages
  // Mas alunicaStages está vazio ou desatualizado!
  Object.entries(alunicaStages || {}).forEach(([id, st]) => {
    if (idsByStage[st]) idsByStage[st].push(String(id))
  })
  
  // ❌ Depois tenta sumarizar apontamentos por estágio
  // Mas summarizeApontamentos retorna resumos por lote, não por estágio
  Object.entries(idsByStage).forEach(([stage, ids]) => {
    ids.forEach((id) => {
      const resumo = summarizeApontamentos(id, [stage]) // ← Problema aqui
      // ...
    })
  })
}, [alunicaStages, summarizeApontamentos])
```

**Raiz do Problema:**
1. `alunicaStages` é sincronizado com `fluxoPedidos.alunica_stage` (linhas 55-99)
2. Mas ambos os pedidos têm `alunica_stage = 'para-usinar'`
3. Nenhum apontamento está em `para-usinar` (estão em `para-embarque`)
4. Logo, `alunicaTotals['para-usinar']` retorna 0, mas deveria retornar 19 (4+15)

**Impacto:** 
- ❌ Totais exibidos no cabeçalho da Alúnica estão **INCORRETOS**
- ❌ Usuário não consegue ver quantas peças estão em cada estágio
- ❌ Impossível validar se fluxo está completo

**Causa Raiz:**
O campo `alunica_stage` em `exp_pedidos_fluxo` armazena o estágio **persistido** (para-usinar), mas os apontamentos estão em estágios **diferentes** (para-embarque). O sistema não reconcilia essas duas informações.

---

### PROBLEMA 3: Duplicação de Lógica de Aprovação/Reabertura (DESIGN)

**Localização:** 
- `ExpUsinagem.jsx` linhas 107-191 (funções `handleAprovarTudoOneClick` e `handleReabrirTudoOneClick`)
- `useAlunicaModals.js` linhas 305-364 (mesmas funções duplicadas)

**Descrição:**
Existem **duas implementações idênticas** das mesmas operações:

```javascript
// ❌ ExpUsinagem.jsx - Versão 1
const handleAprovarTudoOneClick = async (orderId) => {
  // ... 40 linhas de lógica
}

// ❌ useAlunicaModals.js - Versão 2 (duplicada)
const handleAprovarTudoOneClick = useCallback(async (orderId) => {
  // ... 60 linhas de lógica (com mais detalhes)
})
```

**Impacto:**
- ❌ Manutenção duplicada (bug em um lugar não é corrigido no outro)
- ❌ Inconsistência de comportamento
- ❌ Código mais difícil de entender
- ⚠️ Risco de regressão ao corrigir um lado

**Qual usar?**
- `useAlunicaModals.js` é mais completo (gera lotes derivados com sufixos `-EMB-01`, etc.)
- `ExpUsinagem.jsx` é mais simples mas incompleto

---

### PROBLEMA 4: Falta de Sincronização TecnoPerfil ↔ Alúnica (CRÍTICO)

**Localização:** `useTecnoPerfilState.js` linhas 56-63

**Código:**
```javascript
// Se o pedido está na Alúnica, não deve aparecer no TecnoPerfil
if (alunicaStages && alunicaStages[id]) {
  if (id in next) {
    delete next[id]
    hasChanges = true
  }
  return
}
```

**Problema:**
1. Ambos os pedidos têm `status_atual = 'expedicao_alu'` no banco
2. Ambos têm `alunica_stage = 'para-usinar'`
3. O código **remove** esses pedidos do TecnoPerfil (linha 59)
4. Mas os pedidos **nunca aparecem** na Alúnica porque:
   - `alunicaStages` está vazio inicialmente
   - Não há sincronização automática com `fluxoPedidos.alunica_stage`

**Fluxo Quebrado:**
```
TecnoPerfil (status_atual='expedicao_alu')
    ↓ (move para Alúnica)
Alúnica (alunica_stage='para-usinar')
    ↓ (mas alunicaStages não sincroniza!)
❌ Pedido desaparece de ambos os lados
```

**Impacto:**
- ❌ Pedidos "desaparecem" após mover para Alúnica
- ❌ Usuário não consegue acompanhar o fluxo
- ❌ Impossível finalizar pedidos

---

### PROBLEMA 5: Validação de Finalização Incompleta (CRÍTICO)

**Localização:** `ExpUsinagem.jsx` linhas 2061-2131 (função `validarFinalizacaoPorLote`)

**Descrição:**
A validação verifica:
```javascript
1. ✅ Produção completa (apontadoTotal >= pedidoTotalPc)
2. ✅ Nenhum lote de inspeção pendente
3. ✅ Todos os lotes movidos para embalagem
```

**Mas não valida:**
```javascript
❌ Se o pedido está realmente na Alúnica (alunicaStages[id])
❌ Se o estágio atual é 'expedicao-tecno' (estágio final antes de finalizar)
❌ Se há apontamentos órfãos (sem lote válido)
❌ Se pc_disponivel está correto no banco
```

**Impacto:**
- ⚠️ Pode permitir finalização prematura
- ⚠️ Pode bloquear finalização legítima

---

## 🔄 FLUXO DE DADOS ATUAL

### Fluxo TecnoPerfil (Esperado)
```
Pedido → Produzido → Inspeção → Embalagem → Expedição Alúnica → Alúnica
```

### Fluxo Alúnica (Esperado)
```
Para-Usinar → Para-Inspeção → Para-Embarque → Expedição-Tecno → Finalizado
```

### Estado Atual (QUEBRADO)
```
Pedidos em exp_pedidos_fluxo:
  - status_atual = 'expedicao_alu' (TecnoPerfil)
  - alunica_stage = 'para-usinar' (Alúnica)
  
Apontamentos em apontamentos:
  - exp_stage = 'para-embarque' (Alúnica)
  
❌ DESCONEXÃO: alunica_stage ≠ exp_stage dos apontamentos
```

---

## 📋 CHECKLIST DE PROBLEMAS

| # | Problema | Severidade | Causa | Solução |
|---|----------|-----------|-------|---------|
| 1 | Saldos inconsistentes | ✅ OK | N/A | Nenhuma ação necessária |
| 2 | Totais Alúnica incorretos | 🔴 CRÍTICO | Lógica de cálculo | Recalcular totais baseado em apontamentos |
| 3 | Código duplicado | 🟡 DESIGN | Refatoração incompleta | Remover duplicação, usar hook único |
| 4 | Pedidos desaparecem | 🔴 CRÍTICO | Falta de sincronização | Sincronizar alunicaStages com fluxoPedidos |
| 5 | Validação incompleta | 🟡 RISCO | Lógica parcial | Adicionar validações faltantes |

---

## 🛠️ RECOMENDAÇÕES DE CORREÇÃO

### PRIORIDADE 1: Sincronização Alúnica (CRÍTICO)

**Arquivo:** `useAlunicaState.js` linhas 54-99

**Ação:**
```javascript
// Sincronizar alunicaStages com alunica_stage do banco
useEffect(() => {
  if (!Array.isArray(fluxoPedidos)) return
  
  setAlunicaStages((prev) => {
    const next = { ...prev }
    let changed = false
    
    fluxoPedidos.forEach((pedido) => {
      const id = String(pedido?.id)
      const dbStage = pedido?.alunica_stage
      
      // ✅ Sincronizar SEMPRE que houver alunica_stage no banco
      if (id && dbStage && ALUNICA_STAGE_KEYS.includes(dbStage)) {
        if (next[id] !== dbStage) {
          next[id] = dbStage
          changed = true
        }
      }
    })
    
    return changed ? next : prev
  })
}, [fluxoPedidos])
```

**Impacto:** Pedidos aparecerão corretamente na Alúnica

---

### PRIORIDADE 2: Recalcular Totais Alúnica (CRÍTICO)

**Arquivo:** `useAlunicaState.js` linhas 146-171

**Ação:**
```javascript
// Calcular totais diretamente dos apontamentos, não do estado local
const alunicaTotals = useMemo(() => {
  const totals = { 'para-usinar': 0, 'para-inspecao': 0, 'para-embarque': 0 }
  
  if (!Array.isArray(fluxoPedidos)) return totals
  
  // ✅ Iterar sobre fluxoPedidos e contar apontamentos por estágio
  fluxoPedidos.forEach((fluxo) => {
    const id = String(fluxo?.id)
    if (!id) return
    
    // Buscar apontamentos deste pedido
    const apontamentos = apontByFluxo[id] || []
    
    // Contar por estágio
    apontamentos.forEach((apt) => {
      const stage = apt?.exp_stage
      if (stage && totals.hasOwnProperty(stage)) {
        totals[stage] += toIntegerRound(apt?.quantidade) || 0
      }
    })
  })
  
  return totals
}, [fluxoPedidos, apontByFluxo])
```

**Impacto:** Totais corretos no cabeçalho da Alúnica

---

### PRIORIDADE 3: Remover Duplicação (DESIGN)

**Ação:**
1. Manter apenas a versão em `useAlunicaModals.js` (mais completa)
2. Remover funções de `ExpUsinagem.jsx` linhas 107-191
3. Usar hook em vez de funções locais

**Impacto:** Código mais limpo e manutenível

---

### PRIORIDADE 4: Melhorar Validação de Finalização (RISCO)

**Arquivo:** `ExpUsinagem.jsx` linhas 2061-2131

**Adicionar:**
```javascript
// Validar que pedido está realmente na Alúnica
if (!alunicaStages[orderId]) {
  return {
    valido: false,
    motivo: 'Pedido não está na Alúnica'
  }
}

// Validar estágio final
const currentStage = alunicaStages[orderId]
if (currentStage !== 'para-embarque') {
  return {
    valido: false,
    motivo: `Pedido está em "${currentStage}", não em "para-embarque"`
  }
}

// Validar saldo no banco
const fluxoRecord = fluxoPedidos.find(f => String(f.id) === String(orderId))
if (!fluxoRecord || fluxoRecord.pc_disponivel > 0) {
  return {
    valido: false,
    motivo: 'Ainda há peças disponíveis para apontar'
  }
}
```

**Impacto:** Previne finalizações indevidas

---

## 📊 DADOS PARA TESTES

### Cenário 1: Pedido 84122/40 (ZINCOLOR)
```
Status: expedicao_alu (TecnoPerfil) → para-usinar (Alúnica)
Pedido: 16 PC
Apontado: 15 PC (em para-embarque)
Disponível: 1 PC
Ação esperada: Apontar 1 PC restante, depois finalizar
```

### Cenário 2: Pedido 84116/10 (USINAGEM)
```
Status: expedicao_alu (TecnoPerfil) → para-usinar (Alúnica)
Pedido: 4 PC
Apontado: 4 PC (em para-embarque)
Disponível: 0 PC
Ação esperada: Finalizar imediatamente
```

---

## ✅ PRÓXIMOS PASSOS

1. **Imediato:** Aplicar correção de sincronização (Prioridade 1)
2. **Curto prazo:** Recalcular totais (Prioridade 2)
3. **Médio prazo:** Remover duplicação (Prioridade 3)
4. **Longo prazo:** Melhorar validações (Prioridade 4)

---

## 📝 NOTAS TÉCNICAS

- **Banco de dados:** Consistente e sem erros de integridade
- **Frontend:** Lógica fragmentada entre componente e hooks
- **Sincronização:** Falta reconciliação entre camadas
- **Testes:** Recomenda-se validação manual de cada cenário

**Data da Análise:** 25/11/2025 13:45 UTC-03:00
**Autor:** Cascade AI
**Status:** Pronto para implementação
