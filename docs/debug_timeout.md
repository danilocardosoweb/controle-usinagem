# Debug do Timeout de Lotes

## 🔍 **Problema Identificado**
- Timeout na inserção de lotes: `canceling statement due to statement timeout`
- Erro código: `57014`

## 🛠️ **Correções Aplicadas**

### **1. Inserção em Lotes Menores**
- **Lotes**: 100 registros por vez
- **Pedidos**: 50 registros por vez
- **Logs**: Console mostra progresso

### **2. Validação no SupabaseService**
- Aviso quando lote > 100 itens
- Melhor tratamento de erros

## 🧪 **Como Testar**

### **1. Teste com Arquivo Pequeno**
1. Crie um arquivo Excel com apenas 10-20 lotes
2. Tente importar
3. Verifique se funciona

### **2. Monitore o Console**
- Deve aparecer: `Inseridos X/Y lotes...`
- Se parar em algum número, há problema específico

### **3. Verifique a Estrutura dos Dados**
```javascript
// No console do navegador, execute:
console.log('Estrutura de um lote:', novos[0]);
```

## 🔧 **Possíveis Causas Restantes**

### **1. Dados Inválidos**
- Campos com tipos incorretos
- Valores nulos em campos obrigatórios
- Caracteres especiais problemáticos

### **2. Índices do Banco**
- Índices únicos causando conflitos
- Constraints violadas

### **3. Configuração do Supabase**
- Timeout muito baixo no projeto
- Limites de rate limiting

## 📋 **Próximos Passos**

1. **Teste com arquivo pequeno**
2. **Se ainda der timeout**, verifique:
   - Configurações do projeto Supabase
   - Logs detalhados no console
   - Estrutura exata dos dados sendo enviados

## 🚨 **Se o Problema Persistir**

Execute no console do navegador:
```javascript
// Verificar se a tabela existe
supabaseService.supabase.from('lotes').select('count').then(console.log)

// Testar inserção de 1 registro
supabaseService.add('lotes', {
  pedido_seq: 'TESTE/1',
  lote: 'TESTE123',
  rack_embalagem: 'RACK001',
  produto: 'TESTE'
}).then(console.log).catch(console.error)
```
