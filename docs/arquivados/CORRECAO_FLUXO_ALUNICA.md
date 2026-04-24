# CORREÇÃO - Fluxo Alúnica (25/11/2025)

## ✅ CORREÇÃO 1: Inicializar Alúnica em "Estoque" - APLICADA

**Arquivo:** `frontend/src/hooks/useTecnoPerfilState.js`  
**Linha:** 144  
**Status:** ✅ CONCLUÍDO

### Problema
Ao expedir material de TecnoPerfil para Alúnica, o sistema estava:
- ❌ Pulando o estágio `"Material em Estoque"` (estoque)
- ❌ Indo direto para `"Material para Usinar"` (para-usinar)

### Código Antes
```javascript
// ❌ ERRADO - Linha 144
if (targetStage === '__alunica__') {
  updates.alunica_stage = 'para-usinar'  // Pulando "estoque"!
}
```

### Código Depois
```javascript
// ✅ CORRETO - Linha 144
if (targetStage === '__alunica__') {
  updates.alunica_stage = 'estoque'  // Começa em "Material em Estoque"
}
```

### Impacto
Agora quando você expede um pedido de TecnoPerfil para Alúnica:
1. ✅ Pedido aparece em **"Material em Estoque"** (não mais em "Material para Usinar")
2. ✅ Você pode programar a usinagem movendo para **"Material para Usinar"**
3. ✅ Depois segue o fluxo correto: Inspeção → Embalagem → Expedição

---

## 🔄 FLUXO CORRETO AGORA

```
TecnoPerfil                    Alúnica
expedicao-alu ──────────────→ estoque ✅
                                  ↓
                          para-usinar ✅
                                  ↓
                          para-inspecao ✅
                                  ↓
                          para-embarque ✅
                                  ↓
                          expedicao-tecno ✅
```

---

## 🧪 TESTE IMEDIATO

1. **Compilar:**
   ```bash
   cd frontend
   npm run dev
   ```

2. **Testar:**
   - Ir para **TecnoPerfil**
   - Mover um pedido para **"Expedição Alúnica"**
   - Ir para **Alúnica**
   - ✅ **ESPERADO:** Pedido aparece em **"Material em Estoque"** (não em "Material para Usinar")

---

## ⚠️ PRÓXIMAS CORREÇÕES NECESSÁRIAS

Após confirmar que a Correção 1 funcionou, ainda precisamos corrigir:

### Correção 2: Apontamentos Respeitarem Estágio Atual
**Arquivo:** `frontend/src/hooks/useApontamentoModal.js`  
**Problema:** Apontamentos não respeitam o estágio atual da Alúnica  
**Status:** ⏳ PENDENTE

### Correção 3: Validar Transições de Estágios
**Arquivo:** `frontend/src/hooks/useAlunicaState.js`  
**Problema:** Não valida se pode mover para próximo estágio  
**Status:** ⏳ PENDENTE

---

## 📊 RESUMO

| Correção | Arquivo | Linha | Status |
|----------|---------|-------|--------|
| 1. Inicializar em "estoque" | useTecnoPerfilState.js | 144 | ✅ APLICADA |
| 2. Apontamentos respeitam estágio | useApontamentoModal.js | ? | ⏳ PENDENTE |
| 3. Validar transições | useAlunicaState.js | ? | ⏳ PENDENTE |

---

## 📝 PRÓXIMOS PASSOS

1. ✅ Compilar e testar a Correção 1
2. ⏳ Confirmar que pedido aparece em "Material em Estoque"
3. ⏳ Depois aplicaremos Correção 2 e 3

---

**Correção aplicada em:** 25/11/2025 14:15 UTC-03:00  
**Autor:** Cascade AI  
**Status:** ✅ PRONTO PARA TESTE
