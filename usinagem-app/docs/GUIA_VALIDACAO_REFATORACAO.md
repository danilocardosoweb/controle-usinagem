# 🧪 GUIA DE VALIDAÇÃO - Refatoração ExpUsinagem.jsx

**Data:** 18/11/2024  
**Progresso:** 70% (Fases 0-5 completas)  
**Status:** Aguardando validação antes de continuar

---

## 🎯 OBJETIVO

Validar todos os componentes e hooks extraídos nas Fases 1-5 antes de prosseguir com a Fase 6.

**Por quê validar agora?**
- ✅ Reduzimos 1.000 linhas do arquivo principal
- ✅ Criamos 1.928 linhas de código novo
- ⚠️ **NENHUMA** feature flag foi ativada ainda
- ⚠️ Todo o código novo está **SEM TESTE em produção**

---

## 📦 O QUE FOI EXTRAÍDO

### ✅ FASE 1: Componentes UI (Modais)
1. **ApontamentoModal.jsx** (227 linhas)
   - Flag: `USE_NEW_APONTAMENTO_MODAL` ✅ ATIVA
   
2. **AprovarModal.jsx** (176 linhas)
   - Flag: `USE_NEW_APROVAR_MODAL` ✅ ATIVA
   
3. **ReabrirModal.jsx** (176 linhas)
   - Flag: `USE_NEW_REABRIR_MODAL` ✅ ATIVA

### ✅ FASE 2: Lógica Pura (Utilitários)
4. **apontamentosLogic.js** (234 linhas)
   - 8 funções puras para apontamentos
   - Já sendo usado pelo `useApontamentoModal`

### ✅ FASE 3: Hook de Apontamento
5. **useApontamentoModal.js** (410 linhas)
   - Flag: `USE_APONTAMENTO_HOOK` ❌ DESATIVADA
   - Encapsula 11 estados + validações + salvamento

### ✅ FASE 5: Hook de Modais Alúnica
6. **useAlunicaModals.js** (649 linhas)
   - Flag: `USE_ALUNICA_MODALS_HOOK` ❌ DESATIVADA
   - Encapsula 11 estados + 12 funções

---

## 🧪 PLANO DE VALIDAÇÃO

### ETAPA 1: Validar Modais Extraídos (Flags já ativas)

#### ✅ 1.1 ApontamentoModal
**Local:** Aba Alúnica → Pedido em "Para Usinar" → Botão "Apontar"

**Testes:**
- [ ] Modal abre corretamente
- [ ] Campos do formulário funcionam:
  - [ ] Quantidade (Pc)
  - [ ] Distribuição (Inspeção/Embalagem)
  - [ ] Lote
  - [ ] Observações
  - [ ] Data/Hora Início
  - [ ] Data/Hora Fim
- [ ] Validações funcionam:
  - [ ] Não permite quantidade zero
  - [ ] Não permite lote vazio
  - [ ] Não permite quantidade > saldo disponível
  - [ ] Não permite distribuição inválida
- [ ] Salvamento funciona:
  - [ ] Salva no banco corretamente
  - [ ] Atualiza lista após salvar
  - [ ] Mostra mensagem de sucesso
- [ ] Erros são exibidos corretamente
- [ ] Modal fecha ao clicar "Cancelar"
- [ ] Botão "Limpar" funciona

**Rollback:** Se falhar, desative `USE_NEW_APONTAMENTO_MODAL`

#### ✅ 1.2 AprovarModal
**Local:** Aba Alúnica → Pedido em "Para Inspeção" → Ícone de aprovação

**Testes:**
- [ ] Modal abre com lotes corretos
- [ ] Lista mostra lotes disponíveis
- [ ] Campos de quantidade funcionam
- [ ] Botão "Aprovar tudo" preenche todos os campos
- [ ] Validação não permite quantidade > disponível
- [ ] Salvamento funciona:
  - [ ] Move lotes corretamente
  - [ ] Atualiza estágio se aprovar tudo
  - [ ] Mantém em inspeção se aprovar parcial
  - [ ] Registra movimentação no histórico
- [ ] Atualiza lista após aprovar
- [ ] Modal fecha após sucesso

**Rollback:** Se falhar, desative `USE_NEW_APROVAR_MODAL`

#### ✅ 1.3 ReabrirModal
**Local:** Aba Alúnica → Pedido em "Para Embarque" → Ícone de reabertura

**Testes:**
- [ ] Modal abre com lotes corretos
- [ ] Lista mostra lotes disponíveis
- [ ] Campos de quantidade funcionam
- [ ] Botão "Reabrir tudo" preenche todos os campos
- [ ] Validação não permite quantidade > disponível
- [ ] Salvamento funciona:
  - [ ] Move lotes corretamente
  - [ ] Atualiza estágio se reabrir tudo
  - [ ] Mantém em embarque se reabrir parcial
  - [ ] Registra movimentação no histórico
- [ ] Atualiza lista após reabrir
- [ ] Modal fecha após sucesso

**Rollback:** Se falhar, desative `USE_NEW_REABRIR_MODAL`

---

### ETAPA 2: Validar Hooks (Flags desativadas - ATIVAR UM POR VEZ)

#### 🔧 2.1 useApontamentoModal

**Ativação:**
```javascript
// Em frontend/src/config/refactorFlags.js
USE_APONTAMENTO_HOOK: true
```

**Testes:**
- [ ] ApontamentoModal continua funcionando igual
- [ ] Dados são salvos corretamente
- [ ] Estados persistem no localStorage
- [ ] Validações funcionam
- [ ] Não há erros no console
- [ ] Performance não degradou

**Comparação:** Teste ANTES e DEPOIS de ativar a flag para garantir comportamento idêntico

**Rollback:** Se falhar, desative `USE_APONTAMENTO_HOOK`

#### 🔧 2.2 useAlunicaModals

**Ativação:**
```javascript
// Em frontend/src/config/refactorFlags.js
USE_ALUNICA_MODALS_HOOK: true
```

**Testes:**
- [ ] AprovarModal continua funcionando
- [ ] ReabrirModal continua funcionando
- [ ] Botões "Aprovar Tudo (1 clique)" funcionam
- [ ] Botões "Reabrir Tudo (1 clique)" funcionam
- [ ] Estados de loading sincronizam
- [ ] Movimentações registram corretamente
- [ ] Não há erros no console

**Rollback:** Se falhar, desative `USE_ALUNICA_MODALS_HOOK`

---

## ✅ CHECKLIST COMPLETO DE FUNCIONALIDADES

### Aba TecnoPerfil
- [ ] Lista pedidos corretamente
- [ ] Movimentação entre estágios funciona
- [ ] Exclusão de pedidos funciona
- [ ] Seleção/importação funciona
- [ ] Botões de ação funcionam

### Aba Alúnica
- [ ] Estados carregam corretamente
- [ ] **Apontamento funciona** ⭐
- [ ] **Aprovação funciona** ⭐
- [ ] **Reabertura funciona** ⭐
- [ ] Movimentação entre estágios funciona
- [ ] Finalização funciona
- [ ] Reabrir pedido finalizado funciona

### Aba Resumo
- [ ] Dados carregam corretamente
- [ ] Exportação Excel funciona
- [ ] Filtros funcionam

### Aba Estoque
- [ ] Filtros funcionam
- [ ] Lista atualiza corretamente
- [ ] Exportação funciona

### Aba Inventários
- [ ] Criação funciona
- [ ] Edição funciona
- [ ] Itens salvam corretamente

---

## 🚨 SINAIS DE ALERTA

**PARE IMEDIATAMENTE SE:**
1. ❌ Estados não sincronizam entre componentes
2. ❌ Dados desaparecem ao trocar de aba
3. ❌ Botões param de responder
4. ❌ Erros de "undefined" ou "null" no console
5. ❌ Loop infinito de re-renders
6. ❌ Performance degrada visivelmente
7. ❌ Dados salvam incorretamente no banco

---

## 📊 MÉTRICAS DE SUCESSO

### Antes da Refatoração
```
ExpUsinagem.jsx: 3.124 linhas
Modularização: Baixa
Testabilidade: Difícil
Manutenibilidade: Complexa
```

### Depois da Refatoração (Objetivo)
```
ExpUsinagem.jsx: < 500 linhas
Modularização: Alta (7 arquivos novos)
Testabilidade: Fácil (hooks e funções isoladas)
Manutenibilidade: Simples (responsabilidades claras)
```

### Atual (70% completo)
```
ExpUsinagem.jsx: ~2.124 linhas
Modularização: Média (7 arquivos criados)
Testabilidade: Melhorando
Manutenibilidade: Em progresso
```

---

## 🎯 PRÓXIMAS AÇÕES

### Se TODOS os testes passarem:
1. ✅ Manter todas as flags ativadas
2. ✅ Remover código duplicado comentado
3. ✅ Continuar com Fase 6 (Tabs completas)
4. ✅ Documentar lições aprendidas

### Se ALGUM teste falhar:
1. ❌ Desativar flag problemática
2. 🔍 Investigar erro específico
3. 🐛 Corrigir bug antes de prosseguir
4. ✅ Re-testar após correção
5. ✅ Documentar problema e solução

---

## 📝 TEMPLATE DE RELATÓRIO

Use este template para reportar resultados:

```markdown
## Resultado da Validação - [Data]

### Modais Extraídos
- [x] ApontamentoModal: ✅ PASSOU | ❌ FALHOU - [Descrever problema]
- [x] AprovarModal: ✅ PASSOU | ❌ FALHOU - [Descrever problema]
- [x] ReabrirModal: ✅ PASSOU | ❌ FALHOU - [Descrever problema]

### Hooks
- [ ] useApontamentoModal: ✅ PASSOU | ❌ FALHOU - [Descrever problema]
- [ ] useAlunicaModals: ✅ PASSOU | ❌ FALHOU - [Descrever problema]

### Problemas Encontrados
1. [Descrever problema]
   - **Impacto:** Alto/Médio/Baixo
   - **Flag desativada:** Sim/Não
   - **Solução:** [Descrever]

### Decisão Final
- [ ] Continuar para Fase 6
- [ ] Corrigir bugs encontrados primeiro
- [ ] Rollback parcial necessário
```

---

## 🔧 COMANDOS ÚTEIS

### Iniciar aplicação em dev
```bash
cd frontend
npm run dev
```

### Verificar build
```bash
cd frontend
npm run build
```

### Ver logs do console
Abrir DevTools do navegador (F12) e monitorar:
- Console (erros)
- Network (requisições ao banco)
- React DevTools (re-renders)

### Rollback rápido
```javascript
// Em frontend/src/config/refactorFlags.js
export const REFACTOR = {
  USE_NEW_APONTAMENTO_MODAL: false,  // Desativa ApontamentoModal
  USE_NEW_APROVAR_MODAL: false,      // Desativa AprovarModal
  USE_NEW_REABRIR_MODAL: false,      // Desativa ReabrirModal
  USE_APONTAMENTO_HOOK: false,       // Desativa hook apontamento
  USE_ALUNICA_MODALS_HOOK: false,    // Desativa hook modais
  // ...
};
```

---

## 📚 REFERÊNCIAS

- **Plano Original:** `docs/REFATORACAO_EXPUSINAGEM_V2.md`
- **Status Detalhado:** `docs/STATUS_REFATORACAO.md`
- **Change Log:** `change_log.md`
- **Código Refatorado:** Branch `refactor/exp-usinagem-safe`

---

**⚠️ IMPORTANTE:** Não pule esta etapa de validação! Ela é crucial para garantir que a refatoração seja bem-sucedida e reversível.
