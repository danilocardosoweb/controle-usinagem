# ANÁLISE COMPLETA DO FLUXO ALÚNICA - Proposta de Solução (25/11/2025)

## 🎯 OBJETIVO DO FLUXO

Implementar um fluxo de trabalho **paralelo e independente** onde:
- **Usinagem**, **Inspeção** e **Embalagem** trabalham **simultaneamente**
- Cada área trabalha com o material **conforme fica disponível**
- Não há bloqueios - material liberado em um estágio fica imediatamente disponível para o próximo

---

## 📊 FLUXO DESEJADO (Sequência Completa)

```
TECNOPERFIL (Produção)
    ↓
    Expedição TecnoPerfil
    (Material acabado, pronto para Alúnica)
    ↓
ALÚNICA (Recebimento e Processamento)
    ↓
┌─────────────────────────────────────────────────────────────┐
│ 1. MATERIAL EM ESTOQUE                                      │
│    - Recebido de TecnoPerfil                                │
│    - Aguardando programação de usinagem                     │
│    - Disponível para ser movido para "Para Usinar"          │
└─────────────────────────────────────────────────────────────┘
    ↓ (Programação)
┌─────────────────────────────────────────────────────────────┐
│ 2. MATERIAL PARA USINAR                                     │
│    - Programado para usinagem                               │
│    - Apontamentos de usinagem são registrados aqui          │
│    - Conforme material é usinado, vai para Inspeção        │
│    - Inspeção e Usinagem trabalham em PARALELO             │
└─────────────────────────────────────────────────────────────┘
    ↓ (Usinagem concluída)
┌─────────────────────────────────────────────────────────────┐
│ 3. MATERIAL PARA INSPEÇÃO                                   │
│    - Material usinado aguardando inspeção                   │
│    - Inspeção valida qualidade                              │
│    - Conforme material é inspecionado, vai para Embalagem   │
│    - Embalagem e Inspeção trabalham em PARALELO             │
└─────────────────────────────────────────────────────────────┘
    ↓ (Inspeção aprovada)
┌─────────────────────────────────────────────────────────────┐
│ 4. MATERIAL PARA EMBALAGEM                                  │
│    - Material inspecionado e aprovado                       │
│    - Apontamentos de embalagem são registrados aqui         │
│    - Conforme material é embalado, vai para Expedição       │
└─────────────────────────────────────────────────────────────┘
    ↓ (Embalagem concluída)
┌─────────────────────────────────────────────────────────────┐
│ 5. EXPEDIÇÃO TECNOPERFIL                                    │
│    - Material embalado e pronto para envio                  │
│    - Retorna para TecnoPerfil ou vai para cliente           │
│    - Finaliza o ciclo na Alúnica                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔴 PROBLEMA ATUAL

Na screenshot você vê:
- **Material para Usinar:** 2 lotes (INS-01 com 20 PC, EMB-01 com 30 PC)
- **Material para Inspeção:** Vazio
- **Material para Embalagem:** Vazio

### Por que está errado?

1. **Os lotes estão sendo criados com sufixos errados:**
   - `INS-01` deveria indicar "vai para inspeção"
   - `EMB-01` deveria indicar "vai para embalagem"
   - **MAS** ambos estão em "Material para Usinar"

2. **A lógica atual está confundindo:**
   - **Lote** (rastreabilidade) com **Estágio** (localização do material)
   - Um lote pode estar em múltiplos estágios durante seu ciclo de vida

3. **Falta de sincronização entre:**
   - Onde o material **está** (estágio atual)
   - Para onde o material **vai** (próximo estágio)

---

## 💡 SOLUÇÃO PROPOSTA

### Mudança Fundamental de Conceito

**ANTES (Errado):**
```
Apontamento = Lote + Estágio Final
Exemplo: Lote "INS-01" = "vai para inspeção"
Problema: O lote fica preso em "Material para Usinar"
```

**DEPOIS (Correto):**
```
Apontamento = Lote + Estágio Atual + Quantidade
Exemplo: 
- Lote "20251125-1416-84292/10" em "para-usinar" com 20 PC
- Quando usinado: Move para "para-inspecao" com 20 PC
- Quando inspecionado: Move para "para-embarque" com 20 PC
```

---

## 🔧 ARQUITETURA PROPOSTA

### 1. Tabela `apontamentos` (Sem mudanças estruturais)

```sql
id, pedido_seq, exp_fluxo_id, exp_unidade, exp_stage, 
quantidade, lote, lote_externo, ...
```

**Campos importantes:**
- `exp_stage`: Estágio ATUAL do material (para-usinar, para-inspecao, para-embarque)
- `quantidade`: Quantidade neste estágio
- `lote`: Código único do lote (rastreabilidade)

### 2. Fluxo de Apontamento (Novo Conceito)

#### FASE 1: Apontamento de Usinagem (COM DISTRIBUIÇÃO)
```
Operador em "Material para Usinar":
  - Informa: 50 PC usinadas
  - Distribui: 20 PC para inspeção, 30 PC direto para embalagem
  - Sistema cria 2 apontamentos:
    * Apontamento 1: exp_stage = "para-inspecao", qty = 20, lote = "20251125-1416-84292/10-INS-01"
    * Apontamento 2: exp_stage = "para-embarque", qty = 30, lote = "20251125-1416-84292/10-EMB-01"
  
Resultado:
  - Material para Usinar: Vazio
  - Material para Inspeção: 20 PC (lote 20251125-1416-84292/10-INS-01)
  - Material para Embalagem: 30 PC (lote 20251125-1416-84292/10-EMB-01)
```

#### FASE 2: Apontamento de Inspeção (Paralelo)
```
Operador em "Material para Inspeção":
  - Vê: 20 PC do lote 20251125-1416-84292/10-INS-01
  - Informa: 20 PC inspecionadas (aprovadas)
  - Sistema atualiza apontamento:
    * exp_stage = "para-embarque" (move para embalagem)
    * quantidade = 20
    * lote = "20251125-1416-84292/10-INS-01-EMB-01" (novo lote derivado)
  
Resultado:
  - Material para Inspeção: Vazio
  - Material para Embalagem: 20 PC (lote 20251125-1416-84292/10-INS-01-EMB-01)
  - Material para Embalagem: 30 PC (lote 20251125-1416-84292/10-EMB-01) [já estava lá]
```

#### FASE 3: Apontamento de Embalagem (Paralelo)
```
Operador em "Material para Embalagem":
  - Vê: 30 PC do lote 20251125-1416-84292/10-EMB-01 (direto da usinagem)
  - Informa: 30 PC embaladas
  - Sistema atualiza apontamento:
    * exp_stage = "expedicao-tecno"
    * quantidade = 30
    * lote = "20251125-1416-84292/10-EMB-01-EXP-01" (novo lote derivado)
  
Resultado:
  - Material para Embalagem: 20 PC (lote 20251125-1416-84292/10-INS-01-EMB-01)
  - Expedição TecnoPerfil: 30 PC (lote 20251125-1416-84292/10-EMB-01-EXP-01)
```

#### FASE 4: Apontamento de Embalagem (Continuação)
```
Operador em "Material para Embalagem":
  - Vê: 20 PC do lote 20251125-1416-84292/10-INS-01-EMB-01 (vindo da inspeção)
  - Informa: 20 PC embaladas
  - Sistema atualiza apontamento:
    * exp_stage = "expedicao-tecno"
    * quantidade = 20
    * lote = "20251125-1416-84292/10-INS-01-EMB-01-EXP-01" (novo lote derivado)
  
Resultado:
  - Material para Embalagem: Vazio
  - Expedição TecnoPerfil: 30 PC + 20 PC = 50 PC total
```

---

## 📋 MUDANÇAS NECESSÁRIAS NO CÓDIGO

### 1. Remover Lógica de "Distribuição Antecipada"

**REMOVER:**
```javascript
// ❌ ERRADO - Criar apontamentos em múltiplos estágios
if (pcsInspecao > 0) {
  criar apontamento em "para-inspecao"
}
if (pcsEmbalar > 0) {
  criar apontamento em "para-embarque"
}
```

**SUBSTITUIR POR:**
```javascript
// ✅ CORRETO - Criar apontamento apenas no estágio atual
criar apontamento em stage (seja "para-usinar", "para-inspecao", etc)
```

### 2. Adicionar Ação "Mover para Próximo Estágio"

Para cada estágio, adicionar botão:
- **Material para Usinar** → "Enviar para Inspeção"
- **Material para Inspeção** → "Enviar para Embalagem"
- **Material para Embalagem** → "Enviar para Expedição"

### 3. Modal de Apontamento (MANTÉM DISTRIBUIÇÃO)

**Manter campos:**
- "Quantidade produzida (Pc)" - Total usinado
- "Para Inspeção (Pc)" - Quanto vai direto para inspeção
- "Direto p/ Embalagem (Pc)" - Quanto vai direto para embalagem (sem inspeção)
- "Início" e "Fim"
- "Observações"

**IMPORTANTE:** Mínimo 20 PC devem ir para inspeção antes de enviar direto para embalagem

### 4. Criar Modal de "Movimentação de Lotes"

Novo modal para mover material entre estágios:
```
Estágio Atual: Material para Usinar
Lotes Disponíveis:
  ☐ Lote 20251125-1416-84292/10 (50 PC)
  ☐ Lote 20251125-1420-84292/10 (30 PC)

[Selecionar Lotes] [Quantidade] [Enviar para Inspeção]
```

---

## 🎯 BENEFÍCIOS DA NOVA ARQUITETURA

| Aspecto | Antes | Depois |
|---------|-------|--------|
| **Paralelismo** | ❌ Bloqueado | ✅ Usinagem, Inspeção e Embalagem em paralelo |
| **Rastreabilidade** | ❌ Confusa | ✅ Cada lote tem histórico completo |
| **Flexibilidade** | ❌ Rígida | ✅ Pode parar/retomar em qualquer estágio |
| **Simplicidade** | ❌ Complexa | ✅ Cada apontamento é simples |
| **Sincronização** | ❌ Problemas | ✅ Cada estágio independente |

---

## 📊 EXEMPLO PRÁTICO COMPLETO

### Cenário: Pedido 84292/10 com 120 PC

**DIA 1 - MANHÃ (Usinagem com Distribuição)**
```
09:00 - Operador de Usinagem abre "Material para Usinar"
        Apontar: 50 PC usinadas
        Distribui: 20 PC para inspeção, 30 PC direto para embalagem
        → Cria 2 apontamentos:
           * 20 PC em "para-inspecao" (lote X-INS-01)
           * 30 PC em "para-embarque" (lote X-EMB-01)
        
        Material para Usinar: Vazio
        Material para Inspeção: 20 PC (lote X-INS-01)
        Material para Embalagem: 30 PC (lote X-EMB-01)

10:00 - Operador de Usinagem apontar mais: 40 PC usinadas
        Distribui: 20 PC para inspeção, 20 PC direto para embalagem
        → Cria 2 apontamentos:
           * 20 PC em "para-inspecao" (lote Y-INS-01)
           * 20 PC em "para-embarque" (lote Y-EMB-01)
        
        Material para Inspeção: 20 + 20 = 40 PC (lotes X-INS-01, Y-INS-01)
        Material para Embalagem: 30 + 20 = 50 PC (lotes X-EMB-01, Y-EMB-01)
```

**DIA 1 - TARDE (Inspeção em Paralelo)**
```
13:00 - Operador de Inspeção abre "Material para Inspeção"
        Vê: 40 PC (lotes X-INS-01, Y-INS-01)
        Apontar: 20 PC do lote X-INS-01 inspecionadas (aprovadas)
        → Atualiza apontamento: exp_stage="para-embarque", lote X-INS-01-EMB-01
        
        Material para Inspeção: 20 PC (lote Y-INS-01)
        Material para Embalagem: 30 + 20 + 20 = 70 PC

14:00 - Operador de Inspeção apontar: 20 PC do lote Y-INS-01 inspecionadas
        → Atualiza apontamento: exp_stage="para-embarque", lote Y-INS-01-EMB-01
        
        Material para Inspeção: Vazio
        Material para Embalagem: 30 + 20 + 20 + 20 = 90 PC
```

**DIA 1 - FIM DO DIA (Embalagem em Paralelo)**
```
15:00 - Operador de Embalagem abre "Material para Embalagem"
        Vê: 90 PC (lotes X-EMB-01, Y-EMB-01, X-INS-01-EMB-01, Y-INS-01-EMB-01)
        Apontar: 30 PC do lote X-EMB-01 embaladas
        → Atualiza apontamento: exp_stage="expedicao-tecno", lote X-EMB-01-EXP-01
        
        Material para Embalagem: 60 PC
        Expedição TecnoPerfil: 30 PC

16:00 - Operador de Embalagem apontar: 20 PC do lote Y-EMB-01 embaladas
        → Atualiza apontamento: exp_stage="expedicao-tecno", lote Y-EMB-01-EXP-01
        
        Material para Embalagem: 40 PC
        Expedição TecnoPerfil: 50 PC
```

**RESULTADO FINAL:**
```
✅ 50 PC já expedidas (lotes X-EMB-01, Y-EMB-01)
⏳ 40 PC em embalagem (lotes X-INS-01-EMB-01, Y-INS-01-EMB-01)
⏳ 0 PC em inspeção
⏳ 0 PC em usinagem

Próximo dia: Embalagem continua, depois expedição
```

---

## 🛠️ IMPLEMENTAÇÃO (Resumo)

### Mudanças Necessárias:

1. **useApontamentoModal.js** (MANTER DISTRIBUIÇÃO, CORRIGIR LÓGICA)
   - ✅ **MANTER** campos: "Quantidade produzida", "Para Inspeção", "Direto p/ Embalagem"
   - ✅ **CORRIGIR** para criar apontamentos nos estágios corretos:
     * Se "Para Inspeção" > 0: Criar apontamento em `exp_stage = "para-inspecao"`
     * Se "Direto p/ Embalagem" > 0: Criar apontamento em `exp_stage = "para-embarque"`
   - ✅ Gerar lotes derivados com sufixos corretos (`-INS-01`, `-EMB-01`)
   - ✅ Validar: Mínimo 20 PC para inspeção se houver embalagem

2. **ExpUsinagem.jsx**
   - ✅ Manter botão "Apontar" em "Material para Usinar"
   - ✅ Adicionar botão "Apontar" em "Material para Inspeção"
   - ✅ Adicionar botão "Apontar" em "Material para Embalagem"
   - ✅ Cada botão abre modal apropriado para aquele estágio

3. **useAlunicaState.js**
   - ✅ Manter sincronização de estágios
   - ✅ Manter totais por estágio
   - ✅ Garantir que apontamentos apareçam no estágio correto

4. **Banco de Dados**
   - ✅ Sem mudanças estruturais
   - ✅ Apenas usar `exp_stage` corretamente
   - ✅ Constraint já foi atualizada para aceitar 'estoque'

---

## ✅ RESULTADO ESPERADO

```
FLUXO COMPLETO COM DISTRIBUIÇÃO:

Material para Usinar: [Lotes em usinagem]
  ├─ Botão "Apontar Usinagem"
  │  └─ Modal com:
  │     • Quantidade produzida (PC)
  │     • Para Inspeção (PC) - mínimo 20
  │     • Direto p/ Embalagem (PC)
  │     • Cria apontamentos em estágios corretos
  └─ Resultado: Material distribuído para Inspeção e Embalagem

Material para Inspeção: [Lotes aguardando inspeção]
  ├─ Botão "Apontar Inspeção"
  │  └─ Modal com:
  │     • Quantidade inspecionada (PC)
  │     • Move para Embalagem
  │     • Gera novo lote derivado (-INS-01-EMB-01)
  └─ Resultado: Material aprovado vai para Embalagem

Material para Embalagem: [Lotes aguardando embalagem]
  ├─ Botão "Apontar Embalagem"
  │  └─ Modal com:
  │     • Quantidade embalada (PC)
  │     • Move para Expedição
  │     • Gera novo lote derivado (-EMB-01-EXP-01)
  └─ Resultado: Material pronto para expedição

Expedição TecnoPerfil: [Lotes prontos para envio]
  └─ Botão "Finalizar"
     └─ Resultado: Pedido concluído
```

### Fluxo de Lotes (Rastreabilidade):
```
Apontamento Usinagem (50 PC):
  ├─ 20 PC → Lote "20251125-1416-84292/10-INS-01" (para-inspecao)
  └─ 30 PC → Lote "20251125-1416-84292/10-EMB-01" (para-embarque)

Apontamento Inspeção (20 PC):
  └─ 20 PC → Lote "20251125-1416-84292/10-INS-01-EMB-01" (para-embarque)

Apontamento Embalagem (30 PC do EMB-01):
  └─ 30 PC → Lote "20251125-1416-84292/10-EMB-01-EXP-01" (expedicao-tecno)

Apontamento Embalagem (20 PC do INS-01-EMB-01):
  └─ 20 PC → Lote "20251125-1416-84292/10-INS-01-EMB-01-EXP-01" (expedicao-tecno)

RESULTADO: 50 PC expedidas com rastreabilidade completa
```

---

**Análise concluída em:** 25/11/2025 14:30 UTC-03:00  
**Autor:** Cascade AI  
**Status:** Pronto para implementação completa
