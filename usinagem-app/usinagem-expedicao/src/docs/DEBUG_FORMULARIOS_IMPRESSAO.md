# 🔍 DEBUG COMPLETO - Formulários de Impressão

## ✅ **Logs de Debug Adicionados**

### **O Que Foi Adicionado:**
1. **Console.log nos dados** de cada formulário
2. **Console.log no HTML gerado** de cada formulário
3. **Comparação lado a lado** das variáveis

### **Como Testar:**

#### **Passo 1: Abrir Console do Navegador**
1. Pressione **F12** ou **Ctrl+Shift+I**
2. Vá para aba **"Console"**
3. Limpe o console (ícone de lixeira)

#### **Passo 2: Testar Apontamento de Usinagem**
1. Vá para aba **"Apontamento de Usinagem"**
2. Preencha alguns dados ou use dados existentes
3. Clique em **"Imprimir Formulário"**
4. **Observe os logs no console:**
   ```
   === APONTAMENTOS USINAGEM DADOS ===
   cliente: [valor]
   item: [valor]
   codigoCliente: [valor]
   ...
   
   === APONTAMENTOS USINAGEM HTML ===
   HTML Length: [número]
   HTML Preview: [primeiros 500 chars]...
   ```

#### **Passo 3: Testar Relatórios**
1. Vá para aba **"Relatórios"**
2. Encontre o mesmo apontamento testado
3. Clique em **"Imprimir Formulário"**
4. **Observe os logs no console:**
   ```
   === RELATORIOS DADOS ===
   cliente: [valor]
   item: [valor]
   codigoCliente: [valor]
   ...
   
   === RELATORIOS HTML ===
   HTML Length: [número]
   HTML Preview: [primeiros 500 chars]...
   ```

## 🎯 **O Que Procurar:**

### **1. Diferenças nos Dados:**
```javascript
// ApontamentosUsinagem usa:
const cliente = formData.cliente || ''
const codigoCliente = formData.codigoProdutoCliente || ''
const medida = formData.comprimentoAcabado || ''

// Relatorios usa:
const cliente = a.cliente || ''
const codigoCliente = a.codigo_produto_cliente || ''
const medida = a.comprimento_acabado_mm ? `${a.comprimento_acabado_mm} mm` : extrairComprimentoAcabado(item)
```

### **2. Diferenças no HTML:**
- **Tamanho do HTML:** `HTML Length: [número]`
- **Preview do HTML:** Primeiros 500 caracteres
- **Estrutura:** Classes CSS usadas

### **3. Campos Vazios:**
- Verifique se algum campo está vazio em um e não no outro
- Campos vazios podem afetar o layout do CSS Grid

## 📋 **Checklist de Análise:**

### **Dados:**
- [ ] `cliente` é igual em ambos?
- [ ] `item` é igual em ambos?
- [ ] `codigoCliente` é igual em ambos?
- [ ] `medida` é igual em ambos?
- [ ] `pedidoTecno` é igual em ambos?
- [ ] `pedidoCli` é igual em ambos?
- [ ] `qtde` é igual em ambos?
- [ ] `pallet` é igual em ambos?
- [ ] `durezaVal` é igual em ambos?
- [ ] `loteMPVal` é igual em ambos?

### **HTML:**
- [ ] `HTML Length` é igual?
- [ ] `HTML Preview` começa igual?
- [ ] Mesmas classes CSS?
- [ ] Mesma estrutura de divs?

## 🔧 **Possíveis Problemas e Soluções:**

### **Problema 1: Campo Vazio Afetando Layout**
**Sintoma:** Um formulário tem campo vazio, outro não
**Solução:** Garantir que ambos usem os mesmos dados

### **Problema 2: Diferença no Formato da Medida**
**Sintoma:** Um mostra "6000", outro "6000mm"
**Solução:** Padronizar formato

### **Problema 3: CSS Grid Não Funcionando**
**Sintoma:** Layout parece tabela antiga
**Solução:** Verificar se Word suporta CSS Grid

### **Problema 4: Fontes Diferentes**
**Sintoma:** Espaçamento diferente
**Solução:** Forçar mesma fonte

## 🚀 **Ações Imediatas:**

### **Teste Agora:**
1. **Abra o console** (F12)
2. **Teste os dois formulários** com o mesmo apontamento
3. **Compare os logs**
4. **Identifique a diferença**

### **Se Encontrar Diferença:**
1. **Anote exatamente** o que é diferente
2. **Verifique se é nos dados** ou no HTML
3. **Ajuste o código** para igualar
4. **Teste novamente**

## 📊 **Resultado Esperado:**

Após análise completa:
- ✅ **Dados idênticos** em ambos
- ✅ **HTML idêntico** em ambos
- ✅ **Layout visual** idêntico
- ✅ **Formulários padronizados**

---

**Status:** 🔍 **DEBUG ATIVO**  
**Próximo Passo:** Testar e analisar logs  
**Data:** 07/01/2026
