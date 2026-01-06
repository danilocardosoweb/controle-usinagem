# Guia de Migração para 100% Supabase

## Passos para Migração Completa

### 1. **Executar Schema Fix no Supabase**
```sql
-- Execute o arquivo schema_fix.sql no SQL Editor do Supabase
-- Isso corrige incompatibilidades de campos
```

### 2. **Substituir Imports em Todas as Páginas**

**ANTES:**
```javascript
import { useDatabase } from '../hooks/useDatabase'
const { items: pedidos } = useDatabase('pedidos', true)
```

**DEPOIS:**
```javascript
import { useSupabase } from '../hooks/useSupabase'
const { items: pedidos } = useSupabase('pedidos')
```

### 3. **Arquivos que Precisam ser Atualizados:**

- `src/pages/ApontamentosUsinagem.jsx` ✅ (já corrigido)
- `src/pages/ApontamentosParadas.jsx`
- `src/pages/Configuracoes.jsx`
- `src/pages/Dashboard.jsx`
- `src/pages/Pedidos.jsx`
- `src/pages/Relatorios.jsx`

### 4. **Remover Arquivos Obsoletos:**
- `src/services/DatabaseService.js`
- `src/hooks/useDatabase.js`
- `src/hooks/useDatabaseProvider.js`
- `src/services/SyncService.js`

### 5. **Configurar Variáveis de Ambiente Seguras**

**Criar `.env.local` (não commitado):**
```
VITE_SUPABASE_URL=https://oykzakzcqjoaeixbxhvb.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Atualizar `.gitignore`:**
```
.env.local
.env
```

### 6. **Implementar Autenticação Real com Supabase**

Substituir o `AuthContext.jsx` simulado por autenticação real do Supabase.

## Benefícios da Migração

✅ **Eliminação de Duplicação**: Um único serviço de banco  
✅ **Sincronização Automática**: Dados sempre atualizados  
✅ **Escalabilidade**: PostgreSQL robusto  
✅ **Backup Automático**: Dados seguros no Supabase  
✅ **Colaboração**: Múltiplos usuários simultâneos  

## Riscos Mitigados

🔒 **Segurança**: Credenciais não expostas  
🔒 **Integridade**: Schema consistente  
🔒 **Performance**: Queries otimizadas  
🔒 **Manutenibilidade**: Código mais limpo  
