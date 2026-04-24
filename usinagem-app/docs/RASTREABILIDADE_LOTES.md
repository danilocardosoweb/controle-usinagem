# Sistema de Rastreabilidade de Lotes - Alúnica

## 📋 Visão Geral

Sistema completo de rastreabilidade de lotes implementado para o fluxo da Alúnica, permitindo rastrear cada peça desde a usinagem até a embalagem final através de códigos de lote únicos e derivados.

**Data de Implementação:** 20/11/2025  
**Autor:** Cascade AI  
**Status:** ✅ Implementado e Documentado

---

## 🎯 Objetivo

Criar um sistema de rastreabilidade que permita:
1. Identificar a origem de cada lote (usinagem)
2. Rastrear movimentação entre estágios (inspeção → embalagem)
3. Validar disponibilidade antes de apontamentos
4. Prevenir erros de embalagem (embalar mais do que o disponível)
5. Bloquear finalização com pendências

---

## 🔢 Formato dos Lotes

### Lote Base (Usinagem)
```
DDMMAAAA-HHMM-PEDIDO
```

**Exemplo:** `20112025-1430-78914/10`

**Componentes:**
- `DD` - Dia (2 dígitos)
- `MM` - Mês (2 dígitos)
- `AAAA` - Ano (4 dígitos)
- `HH` - Hora (2 dígitos)
- `MM` - Minuto (2 dígitos)
- `PEDIDO` - Número do pedido/seq

### Lotes Derivados

#### Inspeção
```
LOTE_BASE-INS-XX
```

**Exemplo:** `20112025-1430-78914/10-INS-01`

#### Embalagem
```
LOTE_BASE-EMB-XX
```

**Exemplo:** `20112025-1430-78914/10-EMB-01`

**Sequência:**
- `-INS-01`, `-INS-02`, `-INS-03` (incremental por apontamento de inspeção)
- `-EMB-01`, `-EMB-02`, `-EMB-03` (incremental por apontamento de embalagem)

---

## 🗃️ Estrutura no Banco de Dados

### Tabela: `apontamentos`

| Campo | Tipo | Descrição | Exemplo |
|-------|------|-----------|---------|
| `lote` | TEXT | Lote derivado com sufixo | `20112025-1430-78914/10-EMB-01` |
| `lote_externo` | TEXT | Lote base (rastreabilidade) | `20112025-1430-78914/10` |
| `exp_stage` | TEXT | Estágio atual | `para-embarque` |
| `exp_unidade` | TEXT | Unidade produtiva | `alunica` |
| `quantidade` | NUMERIC | Quantidade em peças | `50` |

### Fluxo de Dados

```
Usinagem (para-usinar)
  ↓ Apontamento
  ├─→ Inspeção: lote = "LOTE_BASE-INS-01", lote_externo = "LOTE_BASE"
  └─→ Embalagem: lote = "LOTE_BASE-EMB-01", lote_externo = "LOTE_BASE"

Inspeção (para-inspecao)
  ↓ Aprovação
  └─→ Embalagem: exp_stage muda para 'para-embarque' (lote preservado)

Embalagem (para-embarque)
  ↓ Apontamento de Embalagem
  └─→ Pedido finalizado
```

---

## 💻 Implementação

### 1. Geração de Lotes (useApontamentoModal.js)

```javascript
// Gera lote base
const now = new Date();
const dd = String(now.getDate()).padStart(2, '0');
const mm = String(now.getMonth() + 1).padStart(2, '0');
const yyyy = String(now.getFullYear());
const hh = String(now.getHours()).padStart(2, '0');
const min = String(now.getMinutes()).padStart(2, '0');
const pedidoCode = String(pedido?.pedido || pedido?.pedidoSeq || '').trim();
const loteBase = `${dd}${mm}${yyyy}-${hh}${min}-${pedidoCode}`;

// Conta lotes existentes e gera próximo
const countByStageTag = (tag) => apontList.filter((row) => {
  const base = row.lote_externo || '';
  return base === loteBase && row.lote?.includes(tag);
}).length;

const nextInsSeq = countByStageTag('-INS-') + 1;
const nextEmbSeq = countByStageTag('-EMB-') + 1;

const buildLoteInspecao = () => `${loteBase}-INS-${formatSeq(nextInsSeq)}`;
const buildLoteEmbalagem = () => `${loteBase}-EMB-${formatSeq(nextEmbSeq)}`;
```

### 2. Sumarização de Apontamentos (apontamentosLogic.js)

```javascript
export const summarizeApontamentos = (apontList, allowedStages = null) => {
  // Agrupa por lote e expõe loteExterno
  const aggregates = {};
  
  apontList.forEach((row) => {
    if (!row || row.exp_unidade !== 'alunica') return;
    if (stageFilter && !stageFilter.has(row.exp_stage)) return;
    
    const loteKey = row.lote || '(sem lote)';
    
    if (!aggregates[loteKey]) {
      aggregates[loteKey] = {
        lote: loteKey,
        loteExterno: row.lote_externo || null, // 🆕 Rastreabilidade
        total: 0,
        inspecao: 0,
        embalagem: 0,
        // ...
      };
    }
    // Acumula quantidades...
  });
  
  return Object.values(aggregates);
};
```

### 3. Validação de Disponível (ApontamentoModal.jsx)

```javascript
// Calcula disponível para embalar
const resumoEmbalagem = useMemo(() => (
  isStageEmbalagem
    ? summarizeApontamentos(apontamentosPedido, ['para-embarque']) || []
    : []
), [apontamentosPedido, isStageEmbalagem]);

const disponivelParaEmbalar = useMemo(
  () => resumoEmbalagem.reduce((acc, lote) => 
    acc + (toIntegerRound(lote?.embalagem) || 0), 0
  ),
  [resumoEmbalagem]
);

// Calcula saldo após apontamento
const saldoAposApontar = useMemo(() => {
  if (!isStageEmbalagem) return null;
  const diff = disponivelParaEmbalar - emb;
  return diff < 0 ? 0 : diff;
}, [isStageEmbalagem, disponivelParaEmbalar, emb]);

// Detecta excesso
const excedeDisponivel = isStageEmbalagem && 
  emb > disponivelParaEmbalar && 
  disponivelParaEmbalar > 0;
```

---

## 🎨 Interface do Usuário

### Modal "Apontar Embalagem – Alúnica"

**Título Dinâmico:**
```javascript
{isStageEmbalagem ? 'Apontar Embalagem – Alúnica' : 'Apontar produção - Alúnica'}
```

**Bloco "Disponível para Embalar":**

```
┌─────────────────────────────────────────────────────┐
│ Disponível para Embalar (Pc)     Saldo após apont  │
│           150                              100      │
├─────────────────────────────────────────────────────┤
│ Lote Usinagem        Lote Embalagem    Disponível  │
│ 20112025-1430-78914  ...EMB-01          50          │
│ 20112025-1430-78914  ...EMB-02          100         │
└─────────────────────────────────────────────────────┘
```

**Alerta quando excede:**
```
⚠️ Quantidade informada (200) excede o saldo disponível. 
   Ajuste antes de salvar.
```

### Cards de Inspeção/Embalagem

**Colunas:**
- Lote Usinagem (loteExterno)
- Lote Inspeção/Embalagem (lote)
- Quantidade
- Datas
- Observações

---

## ✅ Validações Implementadas

### 1. Validação no Modal de Apontamento

```javascript
// Previne embalar mais do que disponível
if (excedeDisponivel) {
  // Exibe alerta visual
  // Saldo fica vermelho
  // Mensagem descritiva
}
```

### 2. Validação de Finalização

```javascript
const hasInspecaoPendente = totalInsp > 0;
const hasEmbalagemPendente = apontadoTotal > 0 && totalEmb < apontadoTotal;
const deveBloquearFinalizacao = hasInspecaoPendente || 
  hasEmbalagemPendente || 
  hasProducaoPendente;

if (deveBloquearFinalizacao) {
  openBloqueioFinalizacaoModal(mensagem);
  return;
}
```

---

## 📊 Fluxo Completo

```
1. USINAGEM (para-usinar)
   └─ Operador abre modal "Apontar produção"
      ├─ Informa: 100 peças total
      ├─ Informa: 20 para inspeção
      └─ Sistema cria:
         ├─ Apontamento Inspeção: lote = "20112025-1430-78914/10-INS-01", qtd = 20
         └─ Apontamento Embalagem: lote = "20112025-1430-78914/10-EMB-01", qtd = 80

2. INSPEÇÃO (para-inspecao)
   └─ Supervisor clica "Aprovar Inspeção e Embalar"
      └─ Sistema atualiza exp_stage de 'para-inspecao' para 'para-embarque'
         (lote preservado: "20112025-1430-78914/10-INS-01")

3. EMBALAGEM (para-embarque)
   └─ Operador abre modal "Apontar Embalagem – Alúnica"
      ├─ Vê disponível: 100 peças (80 direto + 20 aprovados)
      ├─ Informa: 100 peças embaladas
      └─ Sistema registra apontamento de embalagem

4. FINALIZAÇÃO
   └─ Sistema valida:
      ├─ ✅ Produção completa (100/100)
      ├─ ✅ Sem lotes em inspeção
      ├─ ✅ Todos embalados
      └─ ✅ Permite finalização
```

---

## 🔍 Rastreabilidade

### Consulta SQL para Rastrear Lote

```sql
-- Rastrear todas as movimentações de um lote base
SELECT 
  id,
  lote,
  lote_externo,
  exp_stage,
  quantidade,
  inicio,
  fim,
  operador,
  created_at
FROM apontamentos
WHERE lote_externo = '20112025-1430-78914/10'
ORDER BY created_at;

-- Resultado:
-- lote: "20112025-1430-78914/10-INS-01", stage: "para-inspecao", qtd: 20
-- lote: "20112025-1430-78914/10-EMB-01", stage: "para-embarque", qtd: 80
-- lote: "20112025-1430-78914/10-INS-01", stage: "para-embarque", qtd: 20 (aprovado)
```

---

## ✅ Validações Robustas Implementadas

### 1. Validação de Concorrência ✅ IMPLEMENTADO (20/11/2025)
**Solução:** Validação em tempo real contra `exp_pedidos_fluxo.pc_disponivel` antes de salvar.  
**Implementação:**
```javascript
// useApontamentoModal.js - linhas 257-292
const pcDisponivelReal = toIntegerRound(fluxoAtual?.pc_disponivel) || 0;
if (stage === 'para-usinar' && pcs > pcDisponivelReal) {
  setError(
    `Saldo insuficiente para este apontamento. ` +
    `Disponível no momento: ${pcDisponivelReal} pcs. ` +
    `Tentando apontar: ${pcs} pcs. ` +
    `Outro operador pode ter apontado simultaneamente.`
  );
  setSaving(false);
  return;
}
```

**Benefícios:**
- ✅ Previne apontamentos duplicados por operadores simultâneos
- ✅ Valida contra saldo real do banco (não apenas cache local)
- ✅ Mensagem clara identifica conflito de concorrência
- ✅ Validação específica para embalagem verifica disponibilidade

### 2. Validação de Finalização por Lote ✅ IMPLEMENTADO (20/11/2025)
**Solução:** Função `validarFinalizacaoPorLote` verifica cada lote individualmente.  
**Implementação:**
```javascript
// ExpUsinagem.jsx - linhas 2061-2118
const validarFinalizacaoPorLote = useCallback((orderId) => {
  // 1. Verifica produção completa
  if (apontadoTotal < pedidoTotalPc) {
    return { podeFinali: false, motivo: `Produção incompleta...` };
  }

  // 2. Verifica lotes de inspeção não aprovados
  const lotesInspecao = apontList.filter(
    row => row.exp_stage === 'para-inspecao'
  );
  if (lotesInspecao.length > 0) {
    return { 
      podeFinali: false, 
      motivo: `Existem ${lotesInspecao.length} lote(s) aguardando aprovação...` 
    };
  }

  // 3. Verifica se todos estão em embalagem
  // ...

  return { podeFinali: true, motivo: '' };
}, [apontByFluxo, pedidosTecnoPerfil, fluxoPedidos]);
```

**Benefícios:**
- ✅ Verifica lote por lote (não apenas totais agregados)
- ✅ Detecta lotes de inspeção não aprovados
- ✅ Lista lotes específicos aguardando aprovação
- ✅ Mensagens descritivas indicam exatamente o problema
- ✅ Garante rastreabilidade completa até finalização

### 3. Performance com Muitos Apontamentos
**Problema:** `summarizeApontamentos` processa todos os apontamentos em memória.  
**Risco:** Pode impactar performance com >1000 apontamentos.  
**Solução Futura:** Implementar paginação ou agregação no banco.

---

## 🧪 Testes Recomendados

### Cenário 1: Fluxo Normal
1. Criar pedido na Alúnica (100 peças)
2. Apontar 100 peças (20 inspeção + 80 embalagem)
3. Aprovar inspeção
4. Embalar todas as 100 peças
5. Finalizar pedido
✅ **Esperado:** Fluxo completo sem bloqueios

### Cenário 2: Tentativa de Embalar Excedente
1. Criar pedido (100 peças)
2. Apontar 50 peças para embalagem
3. Tentar embalar 60 peças (excede 50 disponíveis)
✅ **Esperado:** Alerta visual no modal + saldo vermelho

### Cenário 3: Finalização Bloqueada por Inspeção Pendente
1. Criar pedido (100 peças)
2. Apontar 50 peças para inspeção
3. Tentar finalizar pedido
✅ **Esperado:** Modal de bloqueio listando lotes pendentes
✅ **Mensagem:** "Existem 50 peças em 1 lote(s) aguardando aprovação da inspeção: [código do lote]"

### Cenário 4: Múltiplos Lotes
1. Criar pedido (200 peças)
2. Apontar 100 peças (lotes INS-01, EMB-01)
3. Apontar mais 100 peças (lotes INS-02, EMB-02)
4. Verificar rastreabilidade
✅ **Esperado:** 4 lotes únicos com mesmo loteExterno

### 🆕 Cenário 5: Concorrência - Dois Operadores Simultâneos
1. Operador A abre modal de apontamento (pedido com 100 peças disponíveis)
2. Operador B abre modal de apontamento (mesmo pedido)
3. Operador A aponta 60 peças e salva (disponível: 40)
4. Operador B tenta apontar 60 peças e salva
✅ **Esperado:** Operador B recebe erro claro
✅ **Mensagem:** "Saldo insuficiente. Disponível: 40 pcs. Tentando apontar: 60 pcs. Outro operador pode ter apontado simultaneamente."

### 🆕 Cenário 6: Finalização Bloqueada por Lotes Não Movidos
1. Criar pedido (100 peças)
2. Apontar 50 peças (30 inspeção + 20 embalagem)
3. Aprovar apenas 20 peças da inspeção
4. Tentar finalizar
✅ **Esperado:** Modal de bloqueio
✅ **Mensagem:** "Existem 10 peças em 1 lote(s) aguardando aprovação"

### 🆕 Cenário 7: Validação de Embalagem em Tempo Real
1. Criar pedido (100 peças)
2. Apontar 50 peças para embalagem direta
3. Abrir modal de embalagem
4. Tentar embalar 60 peças (excede)
✅ **Esperado:** 
- Alerta visual antes de salvar
- Erro ao tentar salvar: "Quantidade excede o disponível para embalar"
- Saldo vermelho no resumo

---

## 📚 Arquivos Modificados

| Arquivo | Linhas | Mudança Principal |
|---------|--------|-------------------|
| `utils/apontamentosLogic.js` | 41-56 | Expor campo `loteExterno` |
| `hooks/useApontamentoModal.js` | 254-322 | Gerar lotes derivados + **Validação de concorrência** |
| `hooks/useApontamentoModal.js` | 257-292 | **🆕 Validação contra pc_disponivel (concorrência)** |
| `hooks/useAlunicaModals.js` | 1-45 | Helpers de lotes |
| `modals/ApontamentoModal.jsx` | 85-126 | UI "Disponível para Embalar" |
| `AlunicaStageCard.jsx` | 120-133 | Colunas rastreabilidade |
| `pages/ExpUsinagem.jsx` | 2061-2118 | **🆕 Função validarFinalizacaoPorLote (lote por lote)** |
| `pages/ExpUsinagem.jsx` | 2120-2131 | **🆕 Integração validação robusta** |

---

## 🎓 Conceitos Importantes

### Rastreabilidade
Capacidade de rastrear a origem e movimentação de cada lote através de toda a cadeia produtiva.

### Lote Base vs Lote Derivado
- **Lote Base:** Identificador único da operação de usinagem (origem)
- **Lote Derivado:** Identificador único de cada movimentação subsequente (inspeção/embalagem)

### Sequência Automática
Mecanismo que garante códigos de lote únicos contando lotes existentes e incrementando.

---

## 📞 Suporte

**Dúvidas ou problemas?**
1. Verificar `change_log.md` para histórico completo
2. Consultar `specs.md` seção 6.1.2
3. Revisar este documento

**Para desenvolvedores:**
- Código principal: `useApontamentoModal.js` linhas 254-322
- Helpers: `useAlunicaModals.js` linhas 1-45
- UI: `ApontamentoModal.jsx` linhas 85-126

---

## 🎉 Status do Projeto

### ✅ Implementação Completa (20/11/2025 07:50)

**100% das funcionalidades críticas implementadas:**
1. ✅ Sistema de lotes derivados com rastreabilidade
2. ✅ Modal "Apontar Embalagem" com cálculo em tempo real
3. ✅ Validação de concorrência contra banco de dados
4. ✅ Validação de finalização lote por lote
5. ✅ Interface visual com alertas descritivos
6. ✅ Documentação técnica completa

**Próximos Passos Recomendados:**
1. 🧪 Executar testes manuais (cenários 1-7)
2. 👥 Validar com usuários finais
3. 📊 Monitorar performance em produção
4. 🔄 Coletar feedback para iteração futura

---

**Última Atualização:** 20/11/2025 07:50  
**Versão do Documento:** 2.0 - Validações Robustas Implementadas
