# PLANO DE CORREÇÕES - EXP Usinagem (25/11/2025)

## 🎯 OBJETIVO

Restaurar funcionalidade completa dos fluxos TecnoPerfil e Alúnica, permitindo que pedidos se movimentem corretamente entre estágios e finalizem sem erros.

---

## 🔴 PROBLEMAS CRÍTICOS A RESOLVER

### 1. Pedidos desaparecem após mover para Alúnica
**Causa:** Falta de sincronização entre `alunicaStages` e `fluxoPedidos.alunica_stage`
**Impacto:** Usuário não consegue acompanhar pedidos na Alúnica
**Severidade:** 🔴 CRÍTICO

### 2. Totais da Alúnica mostram valores incorretos
**Causa:** Lógica de cálculo não reconcilia `alunica_stage` com `exp_stage` dos apontamentos
**Impacto:** Impossível validar se fluxo está completo
**Severidade:** 🔴 CRÍTICO

### 3. Código duplicado entre ExpUsinagem.jsx e useAlunicaModals.js
**Causa:** Refatoração incompleta deixou duas versões da mesma lógica
**Impacto:** Manutenção difícil, risco de inconsistência
**Severidade:** 🟡 DESIGN

### 4. Validação de finalização incompleta
**Causa:** Não valida se pedido está realmente na Alúnica
**Impacto:** Pode permitir finalizações indevidas
**Severidade:** 🟡 RISCO

---

## 📋 PLANO DE AÇÃO

### FASE 1: Diagnóstico e Preparação (1 hora)

#### 1.1 Criar branch de segurança
```bash
git checkout -b fix/exp-usinagem-fluxos
git add .
git commit -m "SNAPSHOT: Pre-fix EXP Usinagem fluxos"
```

#### 1.2 Documentar estado atual
- ✅ Análise completa criada: `ANALISE_FLUXOS_EXP_USINAGEM.md`
- ✅ Dados do banco verificados
- ✅ Código-fonte mapeado

#### 1.3 Preparar testes manuais
Criar checklist de validação:
```
[ ] Pedido 84122/40 aparece na Alúnica após mover
[ ] Pedido 84116/10 aparece na Alúnica após mover
[ ] Totais mostram 19 PC em para-embarque
[ ] Botão "Aprovar Inspeção" funciona
[ ] Botão "Finalizar" funciona
[ ] Histórico de movimentações registra corretamente
```

---

### FASE 2: Correção de Sincronização (30 min)

**Arquivo:** `frontend/src/hooks/useAlunicaState.js`

**Mudança 1: Melhorar sincronização com banco**

```javascript
// ANTES (linhas 54-99):
useEffect(() => {
  if (!Array.isArray(fluxoPedidos)) return

  setAlunicaStages((prev) => {
    const currentIds = new Set(fluxoPedidos.map((pedido) => String(pedido.id)).filter(Boolean))

    // Se ainda não houver estado, inicializa a partir do banco
    if (!prev || typeof prev !== 'object') {
      const next = /** @type {Record<string,string>} */({})
      fluxoPedidos.forEach((pedido) => {
        const dbStage = pedido?.alunica_stage
        const id = String(pedido?.id)
        if (id && dbStage && ALUNICA_STAGE_KEYS.includes(dbStage)) next[id] = dbStage
      })
      return next
    }

    // Atualiza estágios existentes e adiciona novos
    const next = { ...prev }
    let hasChanges = false

    fluxoPedidos.forEach((pedido) => {
      const id = String(pedido?.id)
      if (!id) return

      const dbStage = pedido?.alunica_stage
      if (dbStage && ALUNICA_STAGE_KEYS.includes(dbStage)) {
        if (next[id] !== dbStage) {
          next[id] = dbStage
          hasChanges = true
        }
      }
    })

    // Remove pedidos que não existem mais
    Object.keys(next).forEach((id) => {
      if (!currentIds.has(id)) {
        delete next[id]
        hasChanges = true
      }
    })

    return hasChanges ? next : prev
  })
}, [fluxoPedidos])

// DEPOIS (melhorado):
useEffect(() => {
  if (!Array.isArray(fluxoPedidos)) return

  setAlunicaStages((prev) => {
    const next = { ...prev }
    let hasChanges = false
    const currentIds = new Set()

    fluxoPedidos.forEach((pedido) => {
      const id = String(pedido?.id)
      if (!id) return
      
      currentIds.add(id)
      const dbStage = pedido?.alunica_stage
      
      // ✅ Sincronizar SEMPRE que houver alunica_stage no banco
      if (dbStage && ALUNICA_STAGE_KEYS.includes(dbStage)) {
        if (next[id] !== dbStage) {
          next[id] = dbStage
          hasChanges = true
          console.log(`[Alúnica] Sincronizando ${id} → ${dbStage}`)
        }
      } else if (id in next && !dbStage) {
        // Se o banco não tem mais alunica_stage, remover do estado local
        delete next[id]
        hasChanges = true
        console.log(`[Alúnica] Removendo ${id} (sem alunica_stage no banco)`)
      }
    })

    // Remove pedidos que não existem mais
    Object.keys(next).forEach((id) => {
      if (!currentIds.has(id)) {
        delete next[id]
        hasChanges = true
      }
    })

    return hasChanges ? next : prev
  })
}, [fluxoPedidos])
```

**Validação:**
```
✅ Após mover pedido para Alúnica, deve aparecer em alunicaStages
✅ Logs devem mostrar sincronização acontecendo
✅ Pedidos não devem desaparecer
```

---

### FASE 3: Correção de Totais (30 min)

**Arquivo:** `frontend/src/hooks/useAlunicaState.js`

**Mudança 2: Recalcular totais baseado em apontamentos**

```javascript
// ANTES (linhas 146-171):
const alunicaTotals = useMemo(() => {
  const totals = { 'para-usinar': 0, 'para-inspecao': 0, 'para-embarque': 0 }

  const idsByStage = { 'para-usinar': [], 'para-inspecao': [], 'para-embarque': [] }
  Object.entries(alunicaStages || {}).forEach(([id, st]) => {
    if (idsByStage[st]) idsByStage[st].push(String(id))
  })

  Object.entries(idsByStage).forEach(([stage, ids]) => {
    if (!ids.length) return
    ids.forEach((id) => {
      const resumo = summarizeApontamentos ? summarizeApontamentos(id, [stage]) : []
      const totalPcs = resumo.reduce((sum, r) => {
        const stageQty = stage === 'para-usinar' 
          ? r.total 
          : stage === 'para-inspecao' 
            ? r.inspecao 
            : r.embalagem
        return sum + (toIntegerRound(stageQty) || 0)
      }, 0)
      totals[stage] += totalPcs
    })
  })

  return totals
}, [alunicaStages, summarizeApontamentos])

// DEPOIS (corrigido):
const alunicaTotals = useMemo(() => {
  const totals = { 'para-usinar': 0, 'para-inspecao': 0, 'para-embarque': 0 }

  // ✅ Contar apontamentos por estágio diretamente
  if (!Array.isArray(fluxoPedidos)) return totals

  fluxoPedidos.forEach((fluxo) => {
    const id = String(fluxo?.id)
    if (!id) return

    // Buscar apontamentos deste pedido
    const apontamentos = apontByFluxo?.[id] || []
    
    // Contar por estágio
    apontamentos.forEach((apt) => {
      const stage = apt?.exp_stage
      if (stage && totals.hasOwnProperty(stage)) {
        const qty = toIntegerRound(apt?.quantidade) || 0
        totals[stage] += qty
        console.log(`[Totais] ${id} em ${stage}: +${qty}`)
      }
    })
  })

  console.log('[Totais Alúnica]', totals)
  return totals
}, [fluxoPedidos, apontByFluxo])
```

**Validação:**
```
✅ Totais devem mostrar 19 PC em para-embarque (4+15)
✅ Logs devem mostrar contagem acontecendo
✅ Totais devem atualizar quando apontamentos mudam
```

**Nota:** Você precisa passar `apontByFluxo` para o hook. Adicione ao parâmetro:
```javascript
const useAlunicaState = ({ 
  fluxoPedidos, 
  pedidosTecnoPerfil, 
  summarizeApontamentos, 
  user, 
  loadFluxo,
  apontByFluxo  // ← ADICIONAR
}) => {
```

---

### FASE 4: Remover Duplicação (30 min)

**Arquivo:** `frontend/src/pages/ExpUsinagem.jsx`

**Mudança 3: Remover funções duplicadas**

```javascript
// REMOVER linhas 107-191:
// - handleAprovarTudoOneClick
// - handleReabrirTudoOneClick

// SUBSTITUIR por:
const { handleAprovarTudoOneClick, handleReabrirTudoOneClick } = useAlunicaModals({
  // ... props existentes
})
```

**Validação:**
```
✅ Botões "Aprovar Tudo" e "Reabrir Tudo" continuam funcionando
✅ Sem erros de "function not defined"
✅ Comportamento idêntico ao anterior
```

---

### FASE 5: Melhorar Validação (30 min)

**Arquivo:** `frontend/src/pages/ExpUsinagem.jsx`

**Mudança 4: Adicionar validações faltantes**

```javascript
// Localizar função validarFinalizacaoPorLote (linhas 2061-2131)
// Adicionar no início:

const validarFinalizacaoPorLote = (orderId) => {
  // ✅ Validar que pedido está na Alúnica
  if (!alunicaStages[orderId]) {
    return {
      valido: false,
      motivo: 'Pedido não está na Alúnica'
    }
  }

  // ✅ Validar estágio final
  const currentStage = alunicaStages[orderId]
  if (currentStage !== 'para-embarque') {
    return {
      valido: false,
      motivo: `Pedido está em "${currentStage}", não em "para-embarque"`
    }
  }

  // ✅ Validar saldo no banco
  const fluxoRecord = fluxoPedidos.find(f => String(f.id) === String(orderId))
  if (!fluxoRecord) {
    return {
      valido: false,
      motivo: 'Pedido não encontrado no fluxo'
    }
  }

  if (fluxoRecord.pc_disponivel > 0) {
    return {
      valido: false,
      motivo: `Ainda há ${fluxoRecord.pc_disponivel} PC disponíveis para apontar`
    }
  }

  // ✅ Resto da validação original...
  // (manter código existente)
}
```

**Validação:**
```
✅ Não permite finalizar se pedido não está na Alúnica
✅ Não permite finalizar se estágio não é para-embarque
✅ Não permite finalizar se há PC disponível
✅ Mensagens de erro são descritivas
```

---

## 🧪 TESTES DE VALIDAÇÃO

### Teste 1: Sincronização Alúnica
```
1. Abrir aba TecnoPerfil
2. Clicar "Enviar para Alúnica" no pedido 84122/40
3. Verificar se pedido aparece na aba Alúnica
4. Verificar console: deve mostrar "[Alúnica] Sincronizando..."
5. ✅ ESPERADO: Pedido aparece em "Para-Usinar"
```

### Teste 2: Totais Alúnica
```
1. Abrir aba Alúnica
2. Verificar cabeçalho: "Para-Embarque: 19 PC"
3. Verificar console: deve mostrar "[Totais Alúnica] { ... }"
4. ✅ ESPERADO: Totais corretos (4+15=19)
```

### Teste 3: Aprovação de Inspeção
```
1. Mover pedido para Para-Inspeção
2. Clicar "Aprovar Inspeção e Embalar"
3. Verificar se apontamentos mudam para Para-Embarque
4. Verificar se histórico registra movimentação
5. ✅ ESPERADO: Pedido move para Para-Embarque
```

### Teste 4: Finalização
```
1. Pedido em Para-Embarque com 0 PC disponível
2. Clicar "Finalizar"
3. Verificar se pedido é removido da Alúnica
4. Verificar se status_atual muda para "finalizado"
5. ✅ ESPERADO: Pedido finaliza sem erros
```

### Teste 5: Validação de Finalização
```
1. Pedido em Para-Embarque com 1 PC disponível
2. Clicar "Finalizar"
3. ✅ ESPERADO: Modal de bloqueio aparece com mensagem
   "Ainda há 1 PC disponíveis para apontar"
```

---

## 📊 CHECKLIST DE IMPLEMENTAÇÃO

### Fase 1: Diagnóstico
- [x] Análise completa criada
- [x] Dados do banco verificados
- [ ] Branch de segurança criada
- [ ] Testes manuais documentados

### Fase 2: Sincronização
- [ ] Código modificado em useAlunicaState.js
- [ ] Logs adicionados
- [ ] Teste 1 validado
- [ ] Sem erros no console

### Fase 3: Totais
- [ ] Código modificado em useAlunicaState.js
- [ ] Parâmetro apontByFluxo adicionado
- [ ] Teste 2 validado
- [ ] Totais corretos no cabeçalho

### Fase 4: Duplicação
- [ ] Funções removidas de ExpUsinagem.jsx
- [ ] Hook useAlunicaModals importado
- [ ] Teste 3 validado
- [ ] Sem erros de "function not defined"

### Fase 5: Validação
- [ ] Validações adicionadas
- [ ] Teste 4 validado
- [ ] Teste 5 validado
- [ ] Mensagens de erro claras

### Finalização
- [ ] Todos os 5 testes passando
- [ ] Sem erros no console
- [ ] Sem warnings de React
- [ ] Commit com mensagem descritiva
- [ ] PR criada para revisão

---

## 🚀 ESTIMATIVA DE TEMPO

| Fase | Tarefa | Tempo |
|------|--------|-------|
| 1 | Diagnóstico e Preparação | 1h |
| 2 | Correção de Sincronização | 30min |
| 3 | Correção de Totais | 30min |
| 4 | Remover Duplicação | 30min |
| 5 | Melhorar Validação | 30min |
| - | Testes Manuais | 1h |
| - | **TOTAL** | **~4h** |

---

## ⚠️ RISCOS E MITIGAÇÕES

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|--------|-----------|
| Regressão em TecnoPerfil | Média | Alto | Testar ambas as abas |
| Apontamentos órfãos | Baixa | Médio | Validar integridade do banco |
| Performance degradada | Baixa | Médio | Monitorar re-renders |
| Perda de dados | Muito Baixa | Crítico | Backup antes de começar |

---

## 📝 NOTAS IMPORTANTES

1. **Não altere `status_atual` em TecnoPerfil** - deixe que `alunica_stage` controle o fluxo
2. **Sempre sincronize com o banco** - não confie apenas no estado local
3. **Teste cada fase isoladamente** - não pule validações
4. **Mantenha logs para debug** - remova apenas após confirmar funcionamento
5. **Faça commits pequenos** - facilita rollback se necessário

---

## 📞 SUPORTE

Se encontrar problemas durante a implementação:

1. Verificar logs no console do navegador
2. Consultar `ANALISE_FLUXOS_EXP_USINAGEM.md` para contexto
3. Executar queries SQL para validar dados do banco
4. Usar React DevTools para inspecionar estado

**Criado em:** 25/11/2025 13:45 UTC-03:00
**Autor:** Cascade AI
**Status:** Pronto para implementação
