# 📱 Solução de Responsividade para HD (1366x768)

## Problema
A aplicação fica muito grande em resoluções HD e menores, com elementos saindo da tela.

## Solução Implementada

### 1. **Hook `useResponsive`** (`frontend/src/hooks/useResponsive.js`)
Detecta tamanho da tela e modo compacto automaticamente.

```javascript
const screen = useResponsive()
// screen.isCompact = true para HD (< 1400px ou < 800px altura)
// screen.width, screen.height, screen.isMobile, etc.
```

### 2. **Componente `ResponsiveLayout`** (`frontend/src/components/ResponsiveLayout.jsx`)
Wrapper que:
- ✅ Collapsa painel lateral em modo compacto
- ✅ Usa overlay em mobile
- ✅ Toggle para abrir/fechar painel
- ✅ Ajusta tamanhos de fonte e espaçamento

### 3. **Classes Responsivas**
```javascript
const classes = getResponsiveClasses(isCompact)
// Retorna:
// - textXs, textSm, textBase, textLg, textXl, text2xl, text3xl
// - pxSm, pySm, p3, p4, p5
// - gap2, gap3, gap4
// - inputHeight, buttonHeight
// - sidebarWidth, gridCols2, gridCols3, gridCols4
```

## Como Implementar

### Passo 1: Envolver ModalPalete3D com ResponsiveLayout

**Antes:**
```jsx
<ModalPalete3D {...props} />
```

**Depois:**
```jsx
import { ResponsiveLayout } from './ResponsiveLayout'
import { useResponsive, getResponsiveClasses } from '../hooks/useResponsive'

export const MontagemPalete = () => {
  const screen = useResponsive()
  const classes = getResponsiveClasses(screen.isCompact)

  return (
    <ResponsiveLayout
      title="Montagem do Palete"
      children3D={<div>{/* Conteúdo 3D */}</div>}
      childrenPanel={<div>{/* Painel de configuração */}</div>}
    />
  )
}
```

### Passo 2: Atualizar Tamanhos de Fonte

**Antes:**
```jsx
<span className="text-2xl font-black">72 un</span>
```

**Depois:**
```jsx
<span className={`${classes.text2xl} font-black`}>72 un</span>
```

### Passo 3: Usar ResponsiveGrid para Layouts

**Antes:**
```jsx
<div className="grid grid-cols-3 gap-3">
  {/* items */}
</div>
```

**Depois:**
```jsx
<ResponsiveGrid cols={3} isCompact={screen.isCompact} gap={3}>
  {/* items */}
</ResponsiveGrid>
```

### Passo 4: Atualizar Inputs

**Antes:**
```jsx
<input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
```

**Depois:**
```jsx
<ResponsiveInput isCompact={screen.isCompact} placeholder="..." />
```

## Breakpoints Utilizados

| Resolução | Tipo | isCompact | Comportamento |
|-----------|------|-----------|---------------|
| < 640px | Mobile | true | Painel em overlay, fonte muito pequena |
| 640-1024px | Tablet | true | Painel em overlay, fonte pequena |
| 1024-1366px | Laptop | false | Painel lado a lado, fonte normal |
| 1366-1920px | Desktop | false | Painel lado a lado, fonte normal |
| > 1920px | Ultrawide | false | Painel lado a lado, fonte normal |

## Modo Compacto (isCompact = true)

Ativado quando:
- Largura < 1400px OU
- Altura < 800px

Comportamentos:
- Fonte reduzida em ~10-15%
- Padding reduzido em ~20%
- Painel lateral em overlay (não ocupa espaço)
- Grid com menos colunas
- Inputs mais compactos

## Exemplo Completo para ModalPalete3D

```jsx
import { useResponsive, getResponsiveClasses } from '../hooks/useResponsive'
import { ResponsiveLayout, ResponsiveGrid, ResponsiveInput, ResponsiveLabel } from './ResponsiveLayout'

const ModalPalete3D = (props) => {
  const screen = useResponsive()
  const classes = getResponsiveClasses(screen.isCompact)

  return (
    <ResponsiveLayout
      title="Montagem do Palete"
      children3D={
        <div className="w-full h-full">
          {/* Canvas 3D aqui */}
        </div>
      }
      childrenPanel={
        <div className={`${classes.p4} space-y-4`}>
          {/* Painel de configuração */}
          <ResponsiveLabel isCompact={screen.isCompact}>
            Pacotes por Camada
          </ResponsiveLabel>
          <ResponsiveInput
            isCompact={screen.isCompact}
            type="number"
            placeholder="Ex: 15"
          />

          <ResponsiveGrid cols={3} isCompact={screen.isCompact}>
            <div>
              <ResponsiveLabel isCompact={screen.isCompact}>Largura</ResponsiveLabel>
              <ResponsiveInput isCompact={screen.isCompact} type="number" />
            </div>
            <div>
              <ResponsiveLabel isCompact={screen.isCompact}>Altura</ResponsiveLabel>
              <ResponsiveInput isCompact={screen.isCompact} type="number" />
            </div>
            <div>
              <ResponsiveLabel isCompact={screen.isCompact}>Comprimento</ResponsiveLabel>
              <ResponsiveInput isCompact={screen.isCompact} type="number" />
            </div>
          </ResponsiveGrid>
        </div>
      }
    />
  )
}
```

## Testes Recomendados

1. **HD (1366x768)** - Principal
2. **FHD (1920x1080)** - Desktop padrão
3. **Tablet (768x1024)** - iPad
4. **Mobile (375x667)** - iPhone

## Dicas de Implementação

### ✅ Faça
- Use `isCompact` para condicionais de layout
- Aplique classes responsivas a TODOS os textos
- Teste em DevTools (F12 → Device Toggle)
- Use `ResponsiveGrid` para layouts multi-coluna

### ❌ Evite
- Tamanhos fixos em pixels (use Tailwind)
- `w-[420px]` em modo compacto (use `w-full md:w-80`)
- Grids com `grid-cols-${cols}` (não funciona em Tailwind)
- Overflow sem `overflow-hidden` ou `overflow-y-auto`

## Próximos Passos

1. Integrar `ResponsiveLayout` em `ModalPalete3D.jsx`
2. Substituir todos os tamanhos fixos por classes responsivas
3. Testar em HD (1366x768)
4. Ajustar valores de `isCompact` se necessário
5. Adicionar testes de responsividade no CI/CD

## Suporte

Para dúvidas sobre implementação, consulte:
- `frontend/src/hooks/useResponsive.js` - Lógica de detecção
- `frontend/src/components/ResponsiveLayout.jsx` - Componentes prontos
- Este arquivo - Guia de uso
