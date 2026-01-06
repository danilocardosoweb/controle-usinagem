# RESUMO VISUAL - Problemas EXP Usinagem

## 🎯 VISÃO GERAL

```
┌─────────────────────────────────────────────────────────────────┐
│                    EXP - USINAGEM (25/11/2025)                  │
│                                                                 │
│  Status: 🔴 FLUXOS PARCIALMENTE QUEBRADOS                       │
│  Pedidos Ativos: 2 (84122/40, 84116/10)                         │
│  Apontamentos: 2 (ambos em para-embarque)                       │
│  Problemas Críticos: 4 (1 falso alarme)                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 ESTADO ATUAL DO BANCO

```
exp_pedidos_fluxo (2 registros)
├─ 84122/40 (ZINCOLOR)
│  ├─ status_atual: expedicao_alu (TecnoPerfil)
│  ├─ alunica_stage: para-usinar (Alúnica)
│  ├─ pedido_pc: 16
│  ├─ pc_disponivel: 1 ✅
│  └─ saldo_pc_total: 15 ✅
│
└─ 84116/10 (USINAGEM)
   ├─ status_atual: expedicao_alu (TecnoPerfil)
   ├─ alunica_stage: para-usinar (Alúnica)
   ├─ pedido_pc: 4
   ├─ pc_disponivel: 0 ✅
   └─ saldo_pc_total: 4 ✅

apontamentos (2 registros)
├─ exp_fluxo_id: e8654ad9... (84122/40)
│  ├─ exp_stage: para-embarque ⚠️
│  ├─ quantidade: 15
│  └─ lote: 20112025-1257-84122/40-EMB-01
│
└─ exp_fluxo_id: e57221f7... (84116/10)
   ├─ exp_stage: para-embarque ⚠️
   ├─ quantidade: 4
   └─ lote: 20112025-1242-84116/10-EMB-01

exp_pedidos_movimentacoes (10 registros)
├─ Histórico de movimentações registrado ✅
└─ Últimas movimentações: 20/11/2025 15:57
```

---

## 🔴 PROBLEMA 1: PEDIDOS DESAPARECEM

```
FLUXO ESPERADO:
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│ TecnoPerfil  │      │   Alúnica    │      │  Finalizado  │
│ expedicao_alu│─────▶│ para-usinar  │─────▶│  (removido)   │
└──────────────┘      └──────────────┘      └──────────────┘
     ✅ Visível          ✅ Visível            ✅ Removido

FLUXO ATUAL (QUEBRADO):
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│ TecnoPerfil  │      │   Alúnica    │      │  Desaparece  │
│ expedicao_alu│─────▶│ ??? (vazio)  │─────▶│  ❌ PERDIDO   │
└──────────────┘      └──────────────┘      └──────────────┘
     ✅ Visível          ❌ Invisível          ❌ Perdido

CAUSA:
┌─────────────────────────────────────────────────────────┐
│ useAlunicaState.js (linhas 54-99)                       │
│                                                         │
│ alunicaStages = {} (vazio)                              │
│ fluxoPedidos[0].alunica_stage = 'para-usinar'           │
│                                                         │
│ ❌ Sincronização não acontece                           │
│ ❌ Pedido não aparece em alunicaBuckets                 │
│ ❌ Usuário não vê nada                                  │
└─────────────────────────────────────────────────────────┘

SOLUÇÃO:
┌─────────────────────────────────────────────────────────┐
│ Adicionar logs e melhorar sincronização                 │
│                                                         │
│ fluxoPedidos.forEach(pedido => {                        │
│   if (pedido.alunica_stage) {                           │
│     alunicaStages[pedido.id] = pedido.alunica_stage     │
│     console.log('Sincronizado:', pedido.id)             │
│   }                                                     │
│ })                                                      │
└─────────────────────────────────────────────────────────┘
```

---

## 🔴 PROBLEMA 2: TOTAIS INCORRETOS

```
CABEÇALHO ALÚNICA (ESPERADO):
┌────────────────────────────────────────┐
│ Para-Usinar: 19 PC                     │
│ Para-Inspeção: 0 PC                    │
│ Para-Embarque: 0 PC                    │
└────────────────────────────────────────┘

CABEÇALHO ALÚNICA (ATUAL - QUEBRADO):
┌────────────────────────────────────────┐
│ Para-Usinar: 0 PC ❌                   │
│ Para-Inspeção: 0 PC ✅                 │
│ Para-Embarque: 0 PC ❌                 │
└────────────────────────────────────────┘

CAUSA:
┌─────────────────────────────────────────────────────────┐
│ useAlunicaState.js (linhas 146-171)                     │
│                                                         │
│ alunicaTotals = {                                       │
│   'para-usinar': 0,      ← Esperado: 19 (4+15)          │
│   'para-inspecao': 0,    ← Esperado: 0                  │
│   'para-embarque': 0     ← Esperado: 0                  │
│ }                                                       │
│                                                         │
│ ❌ Calcula totais de alunicaStages (vazio)              │
│ ❌ Não reconcilia com apontamentos.exp_stage            │
│ ❌ Apontamentos estão em para-embarque, não em          │
│    para-usinar                                          │
└─────────────────────────────────────────────────────────┘

RECONCILIAÇÃO NECESSÁRIA:
┌─────────────────────────────────────────────────────────┐
│ alunica_stage (banco)    │ exp_stage (apontamentos)     │
├─────────────────────────────────────────────────────────┤
│ para-usinar             │ para-embarque               │
│                         │                             │
│ ❌ DESCONEXÃO!          │                             │
│                         │                             │
│ Solução: Contar apontamentos por exp_stage, não por    │
│ alunica_stage                                          │
└─────────────────────────────────────────────────────────┘

SOLUÇÃO:
┌─────────────────────────────────────────────────────────┐
│ Recalcular totais direto dos apontamentos:              │
│                                                         │
│ fluxoPedidos.forEach(fluxo => {                         │
│   apontByFluxo[fluxo.id].forEach(apt => {               │
│     totals[apt.exp_stage] += apt.quantidade             │
│   })                                                    │
│ })                                                      │
│                                                         │
│ Resultado:                                              │
│ totals['para-embarque'] = 19 ✅                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🟡 PROBLEMA 3: CÓDIGO DUPLICADO

```
DUPLICAÇÃO IDENTIFICADA:

ExpUsinagem.jsx (linhas 107-191)
├─ handleAprovarTudoOneClick (40 linhas)
└─ handleReabrirTudoOneClick (40 linhas)

useAlunicaModals.js (linhas 305-364)
├─ handleAprovarTudoOneClick (60 linhas) ← Mais completo
└─ handleReabrirTudoOneClick (60 linhas) ← Mais completo

DIFERENÇAS:
┌─────────────────────────────────────────────────────────┐
│ ExpUsinagem.jsx                                         │
│ ❌ Não gera lotes derivados (-EMB-01, etc.)             │
│ ❌ Não registra movimentações completas                 │
│ ❌ Não atualiza alunica_stage no banco                  │
│                                                         │
│ useAlunicaModals.js                                     │
│ ✅ Gera lotes derivados com sufixos                     │
│ ✅ Registra movimentações completas                     │
│ ✅ Atualiza alunica_stage no banco                      │
└─────────────────────────────────────────────────────────┘

IMPACTO:
❌ Manutenção duplicada (bug em um lugar não é corrigido no outro)
❌ Inconsistência de comportamento
❌ Código mais difícil de entender

SOLUÇÃO:
┌─────────────────────────────────────────────────────────┐
│ 1. Remover funções de ExpUsinagem.jsx (linhas 107-191)  │
│ 2. Importar do hook useAlunicaModals                    │
│ 3. Usar versão completa (com lotes derivados)           │
│ 4. Resultado: 80 linhas removidas, 0 funcionalidade     │
│    perdida                                              │
└─────────────────────────────────────────────────────────┘
```

---

## 🟡 PROBLEMA 4: VALIDAÇÃO INCOMPLETA

```
VALIDAÇÃO ATUAL (ExpUsinagem.jsx linhas 2061-2131):

validarFinalizacaoPorLote(orderId) {
  ✅ Produção completa (apontadoTotal >= pedidoTotalPc)
  ✅ Nenhum lote de inspeção pendente
  ✅ Todos os lotes movidos para embalagem
  ❌ Pedido está na Alúnica?
  ❌ Estágio é para-embarque?
  ❌ Saldo no banco está correto?
}

CENÁRIOS NÃO VALIDADOS:

Cenário 1: Pedido não está na Alúnica
┌──────────────────────────────────────┐
│ alunicaStages[orderId] = undefined    │
│ ❌ Validação passa (não deveria)      │
│ ❌ Tenta finalizar pedido que não     │
│    está na Alúnica                   │
└──────────────────────────────────────┘

Cenário 2: Estágio não é para-embarque
┌──────────────────────────────────────┐
│ alunicaStages[orderId] = 'para-usinar'│
│ ❌ Validação passa (não deveria)      │
│ ❌ Tenta finalizar pedido em estágio  │
│    errado                            │
└──────────────────────────────────────┘

Cenário 3: PC disponível > 0
┌──────────────────────────────────────┐
│ fluxoRecord.pc_disponivel = 1         │
│ ❌ Validação passa (não deveria)      │
│ ❌ Tenta finalizar com peças pendentes│
└──────────────────────────────────────┘

SOLUÇÃO:
Adicionar validações no início da função:

if (!alunicaStages[orderId]) {
  return { valido: false, motivo: 'Não está na Alúnica' }
}

if (alunicaStages[orderId] !== 'para-embarque') {
  return { valido: false, motivo: 'Estágio incorreto' }
}

if (fluxoRecord.pc_disponivel > 0) {
  return { valido: false, motivo: 'Peças pendentes' }
}
```

---

## ✅ PROBLEMA 5: SALDOS (FALSO ALARME)

```
VERIFICAÇÃO:

Pedido 84122/40:
  pedido_pc = 16
  pc_disponivel = 1
  saldo_pc_total = 15
  
  Cálculo: 16 - 15 = 1 ✅ CORRETO

Pedido 84116/10:
  pedido_pc = 4
  pc_disponivel = 0
  saldo_pc_total = 4
  
  Cálculo: 4 - 4 = 0 ✅ CORRETO

CONCLUSÃO:
✅ Saldos estão CORRETOS no banco
✅ Nenhuma ação necessária
✅ Falso alarme (foi investigado por precaução)
```

---

## 📈 IMPACTO DOS PROBLEMAS

```
┌─────────────────────────────────────────────────────────┐
│ SEVERIDADE vs IMPACTO                                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 🔴 CRÍTICO (Bloqueia uso)                               │
│ ├─ Problema 1: Pedidos desaparecem                      │
│ └─ Problema 2: Totais incorretos                        │
│                                                         │
│ 🟡 DESIGN (Afeta manutenção)                            │
│ └─ Problema 3: Código duplicado                        │
│                                                         │
│ 🟡 RISCO (Pode causar erros)                            │
│ └─ Problema 4: Validação incompleta                    │
│                                                         │
│ ✅ OK (Sem ação)                                        │
│ └─ Problema 5: Saldos corretos                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🛠️ PLANO DE CORREÇÃO (RESUMIDO)

```
FASE 1: Sincronização (30 min)
┌─────────────────────────────────────────────────────────┐
│ Arquivo: useAlunicaState.js (linhas 54-99)              │
│ Ação: Melhorar sincronização com logs                   │
│ Resultado: Pedidos aparecem na Alúnica                  │
└─────────────────────────────────────────────────────────┘
         ↓
FASE 2: Totais (30 min)
┌─────────────────────────────────────────────────────────┐
│ Arquivo: useAlunicaState.js (linhas 146-171)            │
│ Ação: Recalcular totais dos apontamentos                │
│ Resultado: Totais corretos no cabeçalho                 │
└─────────────────────────────────────────────────────────┘
         ↓
FASE 3: Duplicação (30 min)
┌─────────────────────────────────────────────────────────┐
│ Arquivo: ExpUsinagem.jsx (linhas 107-191)               │
│ Ação: Remover funções duplicadas                        │
│ Resultado: Código mais limpo                            │
└─────────────────────────────────────────────────────────┘
         ↓
FASE 4: Validação (30 min)
┌─────────────────────────────────────────────────────────┐
│ Arquivo: ExpUsinagem.jsx (linhas 2061-2131)             │
│ Ação: Adicionar validações faltantes                    │
│ Resultado: Finalizações mais seguras                    │
└─────────────────────────────────────────────────────────┘
         ↓
TESTES (1 hora)
┌─────────────────────────────────────────────────────────┐
│ 5 testes manuais para validar cada correção             │
│ Resultado: Sistema funcionando 100%                     │
└─────────────────────────────────────────────────────────┘

TEMPO TOTAL: ~4 horas
```

---

## 📞 DOCUMENTAÇÃO GERADA

```
✅ ANALISE_FLUXOS_EXP_USINAGEM.md
   └─ Análise técnica completa (5 problemas)
   └─ Dados do banco verificados
   └─ Recomendações detalhadas

✅ PLANO_CORRECOES_EXP_USINAGEM.md
   └─ Passo a passo de implementação
   └─ Código antes/depois
   └─ Testes de validação
   └─ Checklist de implementação

✅ RESUMO_VISUAL_PROBLEMAS.md (este arquivo)
   └─ Diagramas visuais
   └─ Fluxos quebrados
   └─ Impacto dos problemas
```

---

**Análise concluída em:** 25/11/2025 13:45 UTC-03:00
**Documentação:** 3 arquivos (15 páginas)
**Status:** Pronto para implementação
