# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

## [Não Lançado]

### Adicionado

#### Sistema de Correção de Apontamentos (18/12/2025)
- **Backend:**
  - Tabela `apontamentos_correcoes` para auditoria completa de correções
  - Campos: `valor_anterior`, `valor_novo`, `campos_alterados`, `corrigido_por`, `motivo_correcao`, `revertido`, `revertido_por`, `motivo_reversao`
  - RLS policies para controle de acesso (apenas admin pode inserir/atualizar, supervisor pode visualizar)
  - Índices para performance em `apontamento_id`, `corrigido_por` e `corrigido_em`
  - Cascata de exclusão: ao deletar apontamento, as correções são removidas automaticamente

- **Frontend:**
  - Componente `CorrecaoApontamentoModal.jsx`: modal interativo com duas abas
    - Aba "Corrigir": formulário com campos editáveis (quantidade, data/hora, operador, máquina, rack/pallet, observações)
    - Aba "Histórico": timeline visual de todas as correções com dados anteriores/novos
  - Hook `useCorrecaoApontamento.js`: gerencia operações de correção, carregamento de histórico e reversão
  - Integração em `ApontamentosUsinagem.jsx`:
    - Botão "🔧 Corrigir" visível apenas para admin na tabela de apontamentos
    - Coluna de ações condicional baseada em `user?.nivel_acesso === 'admin'`
    - Recarregamento automático de apontamentos após correção bem-sucedida

- **Documentação:**
  - Atualizado `database_schema.md` com especificações da tabela `apontamentos_correcoes`
  - Adicionado `specs.md` seção 7 "Correção de Apontamentos (Auditoria)"
  - Criado `CHANGELOG.md` para rastreamento de mudanças

### Modificado

#### Relatórios - Data Padrão (18/12/2025)
- Alterado padrão de `Data Início` em Relatórios de "hoje" para "7 dias úteis atrás"
- Implementada função `get7BusinessDaysAgoDateInput()` que calcula dias úteis (seg-sex) automaticamente
- Arquivo: `frontend/src/pages/Relatorios.jsx`

#### Banco de Dados - Correções Supabase (18/12/2025)
- Adicionadas colunas faltantes em `ferramentas_cfg`:
  - `peso_linear` (numeric)
  - `comprimento_mm` (int)
  - `ripas_por_pallet` (int)
  - `embalagem` (text)
  - `pcs_por_caixa` (int)
- Criada RLS policy `allow_insert_anon` em `historico_acoes` para permitir INSERT pela role `anon` (desenvolvimento)
- Arquivo: `data_schema.sql`

### Corrigido

- ✅ Erro RLS 42501 em `historico_acoes` (auditoria de ações)
- ✅ Erro PGRST204 em `ferramentas_cfg` (coluna `comprimento_mm` faltante)
- ✅ Compatibilidade numpy/pandas no backend (requirements.txt)

## Notas de Implementação

### Segurança
- Apenas usuários com `nivel_acesso = 'admin'` podem corrigir apontamentos
- Supervisores podem visualizar histórico de correções
- Operadores não têm acesso ao sistema de correção
- Todas as correções são imutáveis após criação (auditoria)

### Performance
- Índices em `apontamentos_correcoes` otimizam buscas por apontamento, admin e data
- Cascata de exclusão garante integridade referencial

### UX
- Campos alterados são destacados em laranja com valores originais visíveis
- Motivo da correção é obrigatório
- Histórico de correções é exibido em timeline visual
- Suporte a reversão de correções com justificativa

### Próximos Passos Sugeridos
1. Testar fluxo completo de correção em ambiente de desenvolvimento
2. Validar auditoria em relatórios (dados corrigidos devem aparecer)
3. Implementar aba de auditoria global (todas as correções do sistema)
4. Adicionar filtros de busca no histórico de correções
5. Implementar notificações quando apontamentos são corrigidos
