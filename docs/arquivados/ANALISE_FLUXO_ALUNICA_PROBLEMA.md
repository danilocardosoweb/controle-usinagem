# ANÁLISE - Problema de Fluxo Alúnica (25/11/2025)

## 🔴 PROBLEMA IDENTIFICADO

Ao expedir material de **TecnoPerfil** para **Alúnica**, o sistema está:
1. ❌ **Pulando** o estágio `"Material em Estoque"` (estoque)
2. ❌ **Indo direto** para `"Material para Usinar"` (para-usinar)
3. ❌ **Apontamentos não seguem fluxo correto:**
   - Deveriam ir: `para-usinar` → `para-inspecao` → `para-embarque`
   - Estão indo: Direto para `para-inspecao` ou `para-embarque`

---

## 📊 ANÁLISE DO BANCO (MCP)

### Estado Atual do Pedido 84290/10

```
exp_pedidos_fluxo:
  - id: e11d2849...
  - pedido_seq: 84290/10
  - status_atual: expedicao_alu (TecnoPerfil)
  - alunica_stage: para-usinar ❌ (deveria ser "estoque")
  - pedido_pc: 150
  - saldo_pc_total: 100

apontamentos (Alúnica):
  1. exp_stage: para-inspecao (20 PC)
  2. exp_stage: para-embarque (80 PC)
```

### Movimentações Registradas

```
1. pedido → produzido (TecnoPerfil)
2. produzido → inspecao (TecnoPerfil)
3. inspecao → expedicao-alu (TecnoPerfil)
4. expedicao-alu → expedicao-alu (TecnoPerfil - sem mudança)
5. expedicao_alu → expedicao_alu (Alúnica - apontamento)
```

---

## 🎯 FLUXO ESPERADO vs REAL

### FLUXO ESPERADO (Alúnica)

```
TecnoPerfil                    Alúnica
expedicao-alu ──────────────→ estoque (Material em Estoque)
                                  ↓
                          para-usinar (Material para Usinar)
                                  ↓
                          para-inspecao (Material para Inspeção)
                                  ↓
                          para-embarque (Material para Embalagem)
                                  ↓
                          expedicao-tecno (Expedição)
```

### FLUXO REAL (QUEBRADO)

```
TecnoPerfil                    Alúnica
expedicao-alu ──────────────→ para-usinar ❌ (pulou estoque!)
                                  ↓
                          para-inspecao ❌ (apontamento direto)
                                  ↓
                          para-embarque ❌ (apontamento direto)
```

---

## 🔍 RAIZ DO PROBLEMA

### Problema 1: Entrada na Alúnica (CÓDIGO)

**Arquivo:** `frontend/src/pages/ExpUsinagem.jsx`

**Localização:** Função que move pedido de TecnoPerfil para Alúnica

**Código Atual (ERRADO):**
```javascript
// Quando move de expedicao-alu para Alúnica:
// Deveria:
// 1. Criar registro com alunica_stage = 'estoque'
// 2. Depois usuário move para 'para-usinar'

// Mas está fazendo:
// 1. Criar registro com alunica_stage = 'para-usinar' ❌
// Pulando o estágio 'estoque'
```

**Solução:**
```javascript
// Ao enviar para Alúnica, deve iniciar em 'estoque', não 'para-usinar'
alunica_stage: 'estoque'  // ← CORRETO
// alunica_stage: 'para-usinar'  // ← ERRADO (atual)
```

---

### Problema 2: Apontamentos Pulam Estágios (CÓDIGO)

**Arquivo:** `frontend/src/hooks/useApontamentoModal.js`

**Problema:** Quando cria apontamento, não respeita o fluxo:

**Fluxo Correto:**
```
1. Apontar em "para-usinar" (usinagem)
   → Cria apontamento com exp_stage = 'para-usinar'

2. Mover para "para-inspecao" (inspeção)
   → Atualiza apontamento: exp_stage = 'para-inspecao'

3. Mover para "para-embarque" (embalagem)
   → Atualiza apontamento: exp_stage = 'para-embarque'
```

**Fluxo Atual (ERRADO):**
```
1. Apontar em "para-usinar"
   → Cria apontamento com exp_stage = 'para-inspecao' ❌
   
2. Apontar em "para-inspecao"
   → Cria apontamento com exp_stage = 'para-embarque' ❌
```

---

## 🛠️ CORREÇÕES NECESSÁRIAS

### CORREÇÃO 1: Inicializar Alúnica em "Estoque"

**Arquivo:** `frontend/src/pages/ExpUsinagem.jsx`

**Localização:** Função que move pedido para Alúnica (buscar por `__alunica__` ou `expedicao-alu`)

**Mudança:**
```javascript
// ANTES:
await supabaseService.update('exp_pedidos_fluxo', {
  id: orderId,
  alunica_stage: 'para-usinar'  // ❌ ERRADO
})

// DEPOIS:
await supabaseService.update('exp_pedidos_fluxo', {
  id: orderId,
  alunica_stage: 'estoque'  // ✅ CORRETO
})
```

---

### CORREÇÃO 2: Respeitar Fluxo de Apontamentos

**Arquivo:** `frontend/src/hooks/useApontamentoModal.js`

**Problema:** Apontamento não respeita `alunica_stage` atual

**Mudança:**
```javascript
// Ao criar apontamento, usar o estágio ATUAL da Alúnica
const currentAlunicaStage = alunicaStages[fluxoId]  // ex: 'para-usinar'

// Criar apontamento com esse estágio
const novoApontamento = {
  exp_fluxo_id: fluxoId,
  exp_unidade: 'alunica',
  exp_stage: currentAlunicaStage,  // ✅ Usar estágio atual
  // ... outros campos
}
```

---

### CORREÇÃO 3: Validar Transição de Estágios

**Arquivo:** `frontend/src/hooks/useAlunicaState.js`

**Problema:** Não valida se pode mover para próximo estágio

**Mudança:**
```javascript
// Ao mover de um estágio para outro, validar:
const ALUNICA_STAGE_FLOW = {
  'estoque': 'para-usinar',
  'para-usinar': 'para-inspecao',
  'para-inspecao': 'para-embarque',
  'para-embarque': 'expedicao-tecno'
}

// Permitir apenas transições válidas
const proximoEstagio = ALUNICA_STAGE_FLOW[currentStage]
if (targetStage !== proximoEstagio) {
  throw new Error(`Transição inválida de ${currentStage} para ${targetStage}`)
}
```

---

## 📋 CHECKLIST DE CORREÇÃO

- [ ] **Correção 1:** Inicializar Alúnica em "estoque"
  - Arquivo: `ExpUsinagem.jsx`
  - Buscar por: função que move para Alúnica
  - Mudança: `alunica_stage: 'estoque'`

- [ ] **Correção 2:** Respeitar estágio ao criar apontamento
  - Arquivo: `useApontamentoModal.js`
  - Buscar por: criação de apontamento
  - Mudança: usar `currentAlunicaStage`

- [ ] **Correção 3:** Validar transições de estágios
  - Arquivo: `useAlunicaState.js`
  - Buscar por: `handleAlunicaAction`
  - Mudança: adicionar validação de fluxo

---

## 🧪 TESTES APÓS CORREÇÃO

### Teste 1: Entrada na Alúnica
```
1. Ir para TecnoPerfil
2. Mover pedido para "Expedição Alúnica"
3. Ir para Alúnica
✅ ESPERADO: Pedido aparece em "Material em Estoque" (não em "Material para Usinar")
```

### Teste 2: Fluxo de Apontamentos
```
1. Pedido em "Material em Estoque"
2. Mover para "Material para Usinar"
3. Criar apontamento (ex: 50 PC)
✅ ESPERADO: Apontamento fica em "Material para Usinar"
   (não pula para "Material para Inspeção")
```

### Teste 3: Transição Completa
```
1. Pedido em "Material para Usinar" com apontamento
2. Mover para "Material para Inspeção"
✅ ESPERADO: Apontamento move para "Material para Inspeção"
   (não fica em "Material para Usinar")
```

---

## 📊 RESUMO

| Aspecto | Esperado | Atual | Status |
|---------|----------|-------|--------|
| Entrada na Alúnica | estoque | para-usinar | ❌ ERRADO |
| Apontamento em para-usinar | para-usinar | para-inspecao | ❌ ERRADO |
| Transição de estágios | Validada | Não validada | ❌ ERRADO |
| Fluxo completo | estoque→usinar→inspeção→embalagem | Pulando estágios | ❌ ERRADO |

---

## 🔧 PRÓXIMOS PASSOS

1. Confirmar localização exata das funções no código
2. Aplicar as 3 correções
3. Testar cada uma das 3 fases
4. Validar fluxo completo

**Problema:** CÓDIGO (não banco)  
**Severidade:** 🔴 CRÍTICO  
**Tempo estimado:** 1-2 horas

---

**Análise concluída em:** 25/11/2025 14:10 UTC-03:00  
**Autor:** Cascade AI  
**Status:** Pronto para correção
