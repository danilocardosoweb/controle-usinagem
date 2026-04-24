# 📋 PLANO DE REFATORAÇÃO - CONTROLE DE USINAGEM

## 1. DIAGNÓSTICO ATUAL

### Arquivos Críticos (>2000 linhas)

| Arquivo | Tamanho | Linhas | Status |
|---------|---------|--------|--------|
| **ApontamentosUsinagem.jsx** | 163 KB | ~3.624 | 🔴 CRÍTICO |
| Estoque.jsx | 154 KB | ~3.000 | 🟠 Alto |
| Configuracoes.jsx | 108 KB | ~2.100 | 🟠 Alto |
| PrevisaoTrabalho.jsx | 86 KB | ~1.700 | 🟡 Médio |
| Relatorios.jsx | 83 KB | ~1.600 | 🟡 Médio |
| Pedidos.jsx | 74 KB | ~1.400 | 🟡 Médio |
| ExpUsinagem.jsx | 58 KB | ~1.100 | 🟢 Aceitável |

### Problemas Identificados

#### 1. **Componente Monolítico**
- ApontamentosUsinagem.jsx concentra:
  - Lógica de formulário
  - Gerenciamento de modais (8+ modais inline)
  - Lógica de busca e filtros
  - Impressão (térmica e comum)
  - Cronômetro
  - Validações
  - Cálculos

#### 2. **Estados Espalhados (50+ useState)**
```javascript
// Apenas alguns exemplos:
const [formData, setFormData] = useState({...})
const [timerOn, setTimerOn] = useState(false)
const [buscaAberta, setBuscaAberta] = useState(false)
const [confirmarAberto, setConfirmarAberto] = useState(false)
const [pecaMortaAberto, setPecaMortaAberto] = useState(false)
// ... mais 45+ estados
```

#### 3. **Funções Duplicadas**
- `extrairFerramenta()` - declarada 3 vezes
- `extrairComprimentoAcabado()` - declarada 2 vezes
- Lógica de formatação de datas espalhada

#### 4. **Modais Inline**
- ~800 linhas de JSX para modais dentro do componente principal
- Difícil de testar isoladamente
- Difícil de reutilizar

#### 5. **Sem Separação de Responsabilidades**
- UI misturada com lógica de negócio
- Serviços chamados diretamente no componente
- Sem camada de abstração

---

## 2. ESTRATÉGIA DE REFATORAÇÃO

### Princípios
✅ **Sem quebra de funcionalidade** - Migração gradual  
✅ **Testes contínuos** - Validar após cada fase  
✅ **Componentes reutilizáveis** - Máxima modularidade  
✅ **Separação de responsabilidades** - Clean Code  
✅ **Performance** - useMemo/useCallback onde necessário  

### Fases de Implementação

#### **FASE 1: Extrair Utilitários (Sem Risco)**
**Duração:** 2-3 horas  
**Risco:** Muito baixo

Criar arquivos em `src/utils/`:

1. **productUtils.js** (100 linhas)
   ```javascript
   export const extrairFerramenta = (produto) => { ... }
   export const extrairComprimentoAcabado = (produto) => { ... }
   export const normalizarProduto = (produto) => { ... }
   ```

2. **dateUtils.js** (80 linhas)
   ```javascript
   export const getNowLocalInput = () => { ... }
   export const parseLocalInputToDate = (val) => { ... }
   export const localInputToISO = (val) => { ... }
   export const addMinutesToInput = (input, minutes) => { ... }
   export const formatHMS = (ms) => { ... }
   ```

3. **validationUtils.js** (100 linhas)
   ```javascript
   export const validarFormulario = (formData) => { ... }
   export const validarApontamento = (data) => { ... }
   ```

4. **printUtils.js** (150 linhas)
   ```javascript
   export const gerarCodigoLote = (formData) => { ... }
   export const buildHttpPdfUrl = (basePath, fileName) => { ... }
   export const buildLocalFileUrl = (basePath, fileName) => { ... }
   ```

**Benefício:** Remove ~430 linhas de ApontamentosUsinagem.jsx

---

#### **FASE 2: Extrair Hooks Customizados (Baixo Risco)**
**Duração:** 3-4 horas  
**Risco:** Baixo

Criar em `src/hooks/`:

1. **useApontamentoForm.js** (150 linhas)
   ```javascript
   export const useApontamentoForm = (initialData) => {
     const [formData, setFormData] = useState(initialData)
     const handleChange = (field, value) => { ... }
     const reset = () => { ... }
     return { formData, setFormData, handleChange, reset }
   }
   ```

2. **useTimer.js** (100 linhas)
   ```javascript
   export const useTimer = () => {
     const [timerOn, setTimerOn] = useState(false)
     const [timerStart, setTimerStart] = useState(null)
     const [nowTick, setNowTick] = useState(Date.now())
     // ... lógica do timer
     return { timerOn, timerStart, nowTick, start, stop }
   }
   ```

3. **useRackSearch.js** (120 linhas)
   ```javascript
   export const useRackSearch = (lotesDB) => {
     const [codigoProdutoBusca, setCodigoProdutoBusca] = useState('')
     const [filtroFerramentaBusca, setFiltroFerramentaBusca] = useState('')
     const [filtroComprimentoBusca, setFiltroComprimentoBusca] = useState('')
     const resultados = useMemo(() => { ... }, [...])
     return { codigoProdutoBusca, setCodigoProdutoBusca, ... }
   }
   ```

4. **usePrioridades.js** (80 linhas)
   ```javascript
   export const usePrioridades = () => {
     const [pedidosPrioritarios, setPedidosPrioritarios] = useState(new Set())
     useEffect(() => { carregarPrioridades() }, [])
     return { pedidosPrioritarios, recarregar }
   }
   ```

**Benefício:** Remove ~450 linhas de lógica de estado

---

#### **FASE 3: Extrair Modais (Médio Risco)**
**Duração:** 6-8 horas  
**Risco:** Médio (testar cada um)

Criar em `src/pages/components/modals/`:

1. **BuscaRackProdutoModal.jsx** (300 linhas)
   - Busca por Produto, Ferramenta, Comprimento
   - Tabela de resultados
   - Filtros

2. **ConfirmacaoApontamentoModal.jsx** (250 linhas)
   - Confirmação de apontamento
   - Campos: Rack, Qtd, Refugo, Dureza

3. **PecaMortaModal.jsx** (200 linhas)
   - Apontamento de peça morta
   - Motivo, quantidade

4. **ListarApontamentosModal.jsx** (250 linhas)
   - Histórico de apontamentos
   - Ações (editar, deletar)

5. **RomaneioLoteModal.jsx** (200 linhas)
   - Entrada de romaneio e lotes

6. **RackModalSelecao.jsx** (350 linhas)
   - Seleção de rack/embalagem
   - Listagem de lotes
   - Inspeção de amarrados

**Benefício:** Remove ~1.550 linhas de JSX inline

---

#### **FASE 4: Extrair Componentes Principais (Alto Risco)**
**Duração:** 4-5 horas  
**Risco:** Alto (testar integração)

Criar em `src/pages/components/`:

1. **ApontamentosForm.jsx** (600 linhas)
   - Formulário principal
   - Seleção de pedido
   - Campos de entrada
   - Botões de ação

2. **ApontamentosTable.jsx** (400 linhas)
   - Tabela de apontamentos
   - Filtros
   - Ações (editar, deletar)

3. **BuscaPedidosSection.jsx** (300 linhas)
   - Modal de busca de pedidos
   - Tabela de resultados

4. **ApontamentosHistoricoSection.jsx** (250 linhas)
   - Histórico de apontamentos
   - Filtros e busca

**Benefício:** Remove ~1.550 linhas de JSX

---

#### **FASE 5: Refatorar Página Principal (Baixo Risco)**
**Duração:** 2-3 horas  
**Risco:** Baixo

Refatorar `ApontamentosUsinagem.jsx`:
- Importar componentes extraídos
- Orquestração de estados
- Passar props aos componentes
- Remover lógica duplicada

**Resultado:** ~500 linhas (de 3.624)

---

## 3. ESTRUTURA FINAL PROPOSTA

```
src/
├── pages/
│   ├── ApontamentosUsinagem.jsx (500 linhas)
│   ├── ApontamentosEmbalagem.jsx (wrapper)
│   └── components/
│       ├── ApontamentosForm.jsx (600 linhas)
│       ├── ApontamentosTable.jsx (400 linhas)
│       ├── BuscaPedidosSection.jsx (300 linhas)
│       ├── ApontamentosHistoricoSection.jsx (250 linhas)
│       └── modals/
│           ├── BuscaRackProdutoModal.jsx (300 linhas)
│           ├── ConfirmacaoApontamentoModal.jsx (250 linhas)
│           ├── PecaMortaModal.jsx (200 linhas)
│           ├── ListarApontamentosModal.jsx (250 linhas)
│           ├── RomaneioLoteModal.jsx (200 linhas)
│           └── RackModalSelecao.jsx (350 linhas)
├── hooks/
│   ├── useApontamentoForm.js (150 linhas)
│   ├── useTimer.js (100 linhas)
│   ├── useRackSearch.js (120 linhas)
│   └── usePrioridades.js (80 linhas)
└── utils/
    ├── productUtils.js (100 linhas)
    ├── dateUtils.js (80 linhas)
    ├── printUtils.js (150 linhas)
    └── validationUtils.js (100 linhas)
```

---

## 4. COMPARATIVO ANTES vs DEPOIS

### Antes
```
ApontamentosUsinagem.jsx: 3.624 linhas
├── 50+ useState
├── 8+ modais inline
├── 30+ funções
├── Lógica misturada
└── Difícil manutenção
```

### Depois
```
ApontamentosUsinagem.jsx: 500 linhas
├── 10 useState (orquestração)
├── Componentes importados
├── Lógica separada
├── Fácil manutenção
└── Reutilizável

+ 10 componentes novos
+ 4 hooks customizados
+ 4 arquivos de utilitários
```

---

## 5. BENEFÍCIOS ESPERADOS

| Benefício | Impacto |
|-----------|--------|
| **Redução de linhas** | 3.624 → 500 (86% redução) |
| **Componentes reutilizáveis** | Modais podem ser usados em outras páginas |
| **Testes unitários** | Cada componente testável isoladamente |
| **Manutenção** | Mudanças localizadas, sem efeito cascata |
| **Performance** | Componentes otimizados com useMemo/useCallback |
| **Onboarding** | Novo dev entende código em horas, não dias |
| **Debugging** | Stack trace claro e rastreável |

---

## 6. RISCOS E MITIGAÇÃO

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|--------|-----------|
| Quebra de funcionalidade | Média | Alto | Testes E2E antes/depois |
| Props drilling | Média | Médio | Context API para estados globais |
| Performance degradada | Baixa | Médio | useMemo/useCallback nos hooks |
| Circular imports | Baixa | Alto | Estrutura clara de dependências |
| Regressão em impressão | Média | Alto | Testar impressão térmica e comum |

---

## 7. PLANO DE TESTES

### Testes Antes da Refatoração
- [ ] Selecionar pedido
- [ ] Preencher formulário
- [ ] Iniciar/parar cronômetro
- [ ] Confirmar apontamento
- [ ] Imprimir etiqueta térmica
- [ ] Imprimir documento
- [ ] Buscar rack por produto
- [ ] Apontar peça morta
- [ ] Editar apontamento
- [ ] Deletar apontamento

### Testes Após Cada Fase
- [ ] Funcionalidade mantida
- [ ] Performance aceitável
- [ ] Sem console errors
- [ ] Sem memory leaks

### Testes Finais
- [ ] Todos os testes anteriores
- [ ] Regressão visual
- [ ] Testes E2E completos

---

## 8. CRONOGRAMA ESTIMADO

| Fase | Duração | Início | Fim |
|------|---------|--------|-----|
| 1. Utilitários | 2-3h | Dia 1 | Dia 1 |
| 2. Hooks | 3-4h | Dia 1 | Dia 2 |
| 3. Modais | 6-8h | Dia 2 | Dia 3 |
| 4. Componentes | 4-5h | Dia 3 | Dia 4 |
| 5. Refatoração | 2-3h | Dia 4 | Dia 4 |
| 6. Testes | 3-4h | Dia 5 | Dia 5 |
| **Total** | **20-27h** | | |

---

## 9. CHECKLIST DE IMPLEMENTAÇÃO

### Fase 1: Utilitários
- [ ] Criar `src/utils/productUtils.js`
- [ ] Criar `src/utils/dateUtils.js`
- [ ] Criar `src/utils/validationUtils.js`
- [ ] Criar `src/utils/printUtils.js`
- [ ] Importar em ApontamentosUsinagem.jsx
- [ ] Testar funcionalidade
- [ ] Commit: "refactor: extract utility functions"

### Fase 2: Hooks
- [ ] Criar `src/hooks/useApontamentoForm.js`
- [ ] Criar `src/hooks/useTimer.js`
- [ ] Criar `src/hooks/useRackSearch.js`
- [ ] Criar `src/hooks/usePrioridades.js`
- [ ] Importar em ApontamentosUsinagem.jsx
- [ ] Testar funcionalidade
- [ ] Commit: "refactor: extract custom hooks"

### Fase 3: Modais
- [ ] Criar `src/pages/components/modals/BuscaRackProdutoModal.jsx`
- [ ] Criar `src/pages/components/modals/ConfirmacaoApontamentoModal.jsx`
- [ ] Criar `src/pages/components/modals/PecaMortaModal.jsx`
- [ ] Criar `src/pages/components/modals/ListarApontamentosModal.jsx`
- [ ] Criar `src/pages/components/modals/RomaneioLoteModal.jsx`
- [ ] Criar `src/pages/components/modals/RackModalSelecao.jsx`
- [ ] Importar em ApontamentosUsinagem.jsx
- [ ] Testar cada modal
- [ ] Commit: "refactor: extract modal components"

### Fase 4: Componentes
- [ ] Criar `src/pages/components/ApontamentosForm.jsx`
- [ ] Criar `src/pages/components/ApontamentosTable.jsx`
- [ ] Criar `src/pages/components/BuscaPedidosSection.jsx`
- [ ] Criar `src/pages/components/ApontamentosHistoricoSection.jsx`
- [ ] Importar em ApontamentosUsinagem.jsx
- [ ] Testar integração
- [ ] Commit: "refactor: extract main components"

### Fase 5: Refatoração Final
- [ ] Limpar ApontamentosUsinagem.jsx
- [ ] Remover código duplicado
- [ ] Otimizar imports
- [ ] Testar completo
- [ ] Commit: "refactor: clean up main component"

### Fase 6: Testes
- [ ] Testes E2E
- [ ] Testes de regressão
- [ ] Testes de performance
- [ ] Commit: "test: add comprehensive tests"

---

## 10. PRÓXIMAS PÁGINAS A REFATORAR

Após ApontamentosUsinagem.jsx, seguir a mesma estratégia para:

1. **Estoque.jsx** (154 KB)
2. **Configuracoes.jsx** (108 KB)
3. **PrevisaoTrabalho.jsx** (86 KB)
4. **Relatorios.jsx** (83 KB)
5. **Pedidos.jsx** (74 KB)

---

## 11. DOCUMENTAÇÃO TÉCNICA

### Convenções de Nomenclatura
- Componentes: `PascalCase` (ex: `BuscaRackProdutoModal.jsx`)
- Hooks: `camelCase` com prefixo `use` (ex: `useApontamentoForm.js`)
- Utilitários: `camelCase` (ex: `productUtils.js`)
- Constantes: `UPPER_SNAKE_CASE`

### Estrutura de Componente
```javascript
import { useState, useEffect } from 'react'
import { useCustomHook } from '../hooks/useCustomHook'
import { utilFunction } from '../utils/utilFile'

const ComponentName = ({ prop1, prop2, onClose }) => {
  const [state, setState] = useState(null)
  const { data } = useCustomHook()
  
  useEffect(() => { ... }, [])
  
  const handleAction = () => { ... }
  
  return (
    <div>
      {/* JSX */}
    </div>
  )
}

export default ComponentName
```

### Estrutura de Hook
```javascript
import { useState, useEffect, useMemo } from 'react'

export const useCustomHook = (initialValue) => {
  const [state, setState] = useState(initialValue)
  
  useEffect(() => { ... }, [])
  
  const memoizedValue = useMemo(() => { ... }, [state])
  
  const handleAction = () => { ... }
  
  return { state, setState, memoizedValue, handleAction }
}
```

---

## 12. CONCLUSÃO

Esta refatoração é **essencial** para:
- ✅ Manutenibilidade a longo prazo
- ✅ Onboarding de novos desenvolvedores
- ✅ Redução de bugs
- ✅ Facilidade de testes
- ✅ Reutilização de código

**Recomendação:** Iniciar pela Fase 1 (Utilitários) que tem risco mínimo e já traz benefícios imediatos.

---

**Documento gerado em:** 20/01/2026  
**Versão:** 1.0  
**Status:** Pronto para implementação
