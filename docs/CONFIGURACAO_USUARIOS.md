# Configuração da Tabela de Usuários

## 🎯 Objetivo
Este documento explica como configurar a tabela de usuários no Supabase para que o sistema de gerenciamento de usuários funcione corretamente.

## ⚠️ Problema Comum
Se você está vendo a mensagem "Nenhum usuário cadastrado" e não consegue adicionar usuários, provavelmente a tabela `usuarios` ainda não foi criada no Supabase.

## 📋 Passo a Passo

### 1. Acessar o Supabase
1. Acesse [https://supabase.com](https://supabase.com)
2. Faça login na sua conta
3. Selecione o projeto do sistema de usinagem

### 2. Abrir o SQL Editor
1. No menu lateral, clique em **SQL Editor**
2. Clique em **New Query** para criar uma nova consulta

### 3. Executar o Script SQL
1. Abra o arquivo `database_schema_usuarios.sql` na raiz do projeto
2. **Copie todo o conteúdo** do arquivo
3. **Cole** no SQL Editor do Supabase
4. Clique em **Run** (ou pressione `Ctrl+Enter`)

### 4. Verificar a Criação
Após executar o script, você deve ver:
- ✅ Mensagem de sucesso
- ✅ Tabela `usuarios` criada
- ✅ 3 usuários padrão inseridos

### 5. Verificar no Table Editor
1. No menu lateral, clique em **Table Editor**
2. Procure pela tabela `usuarios`
3. Você deve ver 3 usuários:
   - Administrador (admin@usinagem.com)
   - Supervisor Produção (supervisor@usinagem.com)
   - Operador 1 (operador@usinagem.com)

## 🔐 Usuários Padrão Criados

| Nome | Email | Senha | Nível |
|------|-------|-------|-------|
| Administrador | admin@usinagem.com | admin123 | admin |
| Supervisor Produção | supervisor@usinagem.com | super123 | supervisor |
| Operador 1 | operador@usinagem.com | oper123 | operador |

⚠️ **IMPORTANTE**: Altere essas senhas em produção!

## 🔧 Estrutura da Tabela

```sql
CREATE TABLE usuarios (
  id UUID PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  senha VARCHAR(255) NOT NULL,
  nivel_acesso VARCHAR(50) DEFAULT 'operador',
  ativo BOOLEAN DEFAULT true,
  data_criacao TIMESTAMP DEFAULT NOW(),
  data_atualizacao TIMESTAMP DEFAULT NOW(),
  ultimo_acesso TIMESTAMP
)
```

## 🛡️ Segurança (RLS)

O script também configura **Row Level Security (RLS)** com as seguintes políticas:

### SELECT (Visualizar)
- Usuários podem ver apenas seus próprios dados
- Administradores podem ver todos os usuários

### INSERT (Criar)
- Apenas administradores podem criar novos usuários

### UPDATE (Atualizar)
- Usuários podem atualizar seus próprios dados
- Administradores podem atualizar qualquer usuário

### DELETE (Excluir)
- Apenas administradores podem excluir usuários

## 🐛 Solução de Problemas

### Problema: "Usuário excluído mas continua aparecendo"

**Causa**: O cache do navegador ou hot reload do Vite pode estar mantendo dados antigos.

**Soluções**:
1. **Recarregue a página** (F5 ou Ctrl+R)
2. **Limpe o cache** (Ctrl+Shift+R)
3. **Feche e abra o navegador**
4. Verifique no console do navegador se há erros

### Problema: "Erro ao adicionar usuário"

**Possíveis causas**:
1. Tabela não foi criada
2. Email já existe (constraint UNIQUE)
3. Campos obrigatórios vazios
4. Problemas de conexão com Supabase

**Solução**:
1. Verifique se a tabela existe no Supabase
2. Tente com um email diferente
3. Preencha todos os campos obrigatórios
4. Verifique a conexão com o Supabase

### Problema: "ReferenceError: setUsuarios is not defined"

**Causa**: Código antigo em cache do hot reload.

**Solução**:
1. **Pare o servidor** (Ctrl+C no terminal)
2. **Limpe o cache do Vite**: `rm -rf node_modules/.vite`
3. **Reinicie o servidor**: `npm run dev`
4. **Recarregue o navegador** (Ctrl+Shift+R)

## 📊 Verificação Final

Após configurar tudo, você deve conseguir:
- ✅ Ver a lista de 3 usuários padrão
- ✅ Adicionar novos usuários
- ✅ Editar usuários existentes
- ✅ Excluir usuários (e ver a lista atualizar automaticamente)
- ✅ Ver mensagens de sucesso/erro apropriadas

## 🔒 Recomendações de Segurança

### Em Produção:
1. **Altere todas as senhas padrão**
2. **Implemente hash de senhas** (bcrypt, argon2)
3. **Configure autenticação JWT** via Supabase Auth
4. **Ative 2FA** para administradores
5. **Implemente política de senhas fortes**
6. **Monitore tentativas de login**
7. **Configure rate limiting**

### Política de Senhas Recomendada:
- Mínimo 8 caracteres
- Pelo menos 1 letra maiúscula
- Pelo menos 1 letra minúscula
- Pelo menos 1 número
- Pelo menos 1 caractere especial
- Não usar senhas comuns

## 📝 Logs e Debug

Para debug, verifique o console do navegador:
```javascript
// Logs úteis:
console.log('Excluindo usuário ID:', id)
console.log('Usuário excluído com sucesso')
console.error('Erro ao excluir usuário:', error)
```

## 🆘 Suporte

Se continuar com problemas:
1. Verifique o console do navegador (F12)
2. Verifique os logs do Supabase
3. Confirme que a tabela foi criada corretamente
4. Teste com um usuário novo (não os padrão)
5. Tente em modo anônimo do navegador

## ✅ Checklist de Configuração

- [ ] Script SQL executado no Supabase
- [ ] Tabela `usuarios` criada
- [ ] 3 usuários padrão inseridos
- [ ] RLS configurado
- [ ] Políticas de acesso criadas
- [ ] Índices criados
- [ ] Trigger de atualização funcionando
- [ ] Sistema de gerenciamento funcionando
- [ ] Senhas padrão alteradas (produção)
