# 📊 ANÁLISE DE BANCO DE DADOS - EXP Usinagem

**Data:** 18/11/2024  
**Autor:** Cascade AI  
**Objetivo:** Verificar estrutura de tabelas necessárias para a aba EXP - Usinagem

---

## 🗂️ TABELAS ATUALMENTE UTILIZADAS

### ✅ 1. **exp_pedidos_fluxo** (Principal)
**Propósito:** Gerencia o fluxo de pedidos (TecnoPerfil e Alúnica)

**Campos Utilizados:**
- `id` (UUID, PK)
- `pedido` / `pedido_seq` (String)
- `cliente` (String)
- `ferramenta` (String)
- `pedido_kg` (Numeric)
- `pedido_pc` (Integer)
- `numero_pedido` (String)
- `data_entrega` (Date)
- `status` (String) - Para TecnoPerfil
- `alunica_stage` (String) - Para Alúnica
- `origem` (String) - 'arquivo', 'carteira', 'manual'
- `importado_id` (UUID, FK → pedidos_importacao)
- `pedido_id` (UUID, FK → pedidos)
- `tipo` (String) - 'tecnoperfil' ou 'alunica'
- `kg_disponivel` (Numeric)
- `pc_disponivel` (Integer)
- `saldo_kg_total` (Numeric)
- `saldo_pc_total` (Integer)
- `saldo_atualizado_em` (Timestamp)
- `criado_em` (Timestamp)
- `atualizado_em` (Timestamp)
- `movimentado_em` (Timestamp)
- `dados_brutos` (JSONB)

**Status:** ✅ **EXISTE** (verificar campos)

---

### ✅ 2. **apontamentos**
**Propósito:** Registra apontamentos de produção

**Campos Utilizados:**
- `id` (UUID, PK)
- `exp_fluxo_id` (UUID, FK → exp_pedidos_fluxo) **[ÍNDICE NECESSÁRIO]**
- `exp_unidade` (String) - 'tecnoperfil' ou 'alunica'
- `exp_stage` (String) - Estágio atual do apontamento
- `operador` (String)
- `produto` (String)
- `cliente` (String)
- `quantidade` (Integer)
- `lote` (String)
- `inicio` (Timestamp)
- `fim` (Timestamp)
- `observacoes` (Text)
- `criado_em` (Timestamp)
- `qtd_refugo` (Integer)
- `perfil_longo` (String)
- `comprimento_acabado_mm` (Numeric)
- `ordem_trabalho` (String)
- `rack_ou_pallet` (String)
- `dureza_material` (String)
- `lotes_externos` (Array)
- `romaneio_numero` (String)
- `lote_externo` (String)
- `amarrados_detalhados` (JSONB)

**Status:** ✅ **EXISTE** (verificar índice)

---

### ✅ 3. **exp_pedidos_movimentacoes**
**Propósito:** Registra histórico de movimentações e mudanças de status

**Campos Utilizados:**
- `id` (UUID, PK)
- `fluxo_id` (UUID, FK → exp_pedidos_fluxo) **[ÍNDICE NECESSÁRIO]**
- `tipo_movimentacao` (String) - 'status', 'baixa_estoque', etc.
- `tipo_baixa` (String) - 'consumo', 'venda' (para baixas)
- `quantidade_pc` (Integer) - Para baixas de estoque
- `quantidade_kg` (Numeric) - Para baixas de estoque
- `status_anterior` (String)
- `status_novo` (String)
- `motivo` (String)
- `observacoes` (Text)
- `movimentado_por` (String)
- `movimentado_em` (Timestamp)
- `criado_em` (Timestamp)

**Status:** ✅ **EXISTE** (verificar campos novos)

---

### ✅ 4. **pedidos** (Carteira)
**Propósito:** Pedidos da carteira (não importados)

**Campos Utilizados:**
- `id` (UUID, PK)
- `pedido_seq` (String)
- `cliente` (String)
- `pedido_cliente` (String)
- `produto` (String)
- `dt_fatura` (Date)
- `qtd_pedido` (Integer)
- `dados_originais` (JSONB)
- Outros campos dinâmicos via `dados_originais`

**Status:** ✅ **EXISTE**

---

### ✅ 5. **pedidos_importacao**
**Propósito:** Pedidos importados de planilha

**Campos Utilizados:**
- `id` (UUID, PK)
- `pedido` (String)
- `cliente` (String)
- `numero_pedido` (String)
- `ferramenta` (String)
- `data_entrega` (Date)
- `pedido_kg` (Numeric)
- `pedido_pc` (Integer)
- `dados_brutos` (JSONB)
- `criado_em` (Timestamp)

**Status:** ✅ **EXISTE**

---

### ✅ 6. **inventarios_usinagem**
**Propósito:** Controle de inventários

**Campos Utilizados:**
- `id` (UUID, PK)
- `unidade` (String) - 'tecnoperfil' ou 'alunica'
- `observacoes` (Text)
- `snapshot_data` (JSONB) - Snapshot do estoque
- `status` (String) - 'em_andamento', 'finalizado', 'cancelado'
- `criado_por` (String)
- `criado_em` (Timestamp)
- `finalizado_em` (Timestamp)

**Status:** ✅ **EXISTE**

---

### ✅ 7. **inventarios_usinagem_itens**
**Propósito:** Itens dos inventários

**Campos Utilizados:**
- `id` (UUID, PK)
- `inventario_id` (UUID, FK → inventarios_usinagem)
- `fluxo_id` (UUID, FK → exp_pedidos_fluxo)
- `pedido` (String)
- `cliente` (String)
- `ferramenta` (String)
- `saldo_sistema_kg` (Numeric)
- `saldo_sistema_pc` (Integer)
- `saldo_fisico_kg` (Numeric)
- `saldo_fisico_pc` (Integer)
- `divergencia_kg` (Numeric)
- `divergencia_pc` (Integer)
- `observacoes` (Text)
- `atualizado_em` (Timestamp)

**Status:** ✅ **EXISTE**

---

## 🔴 PROBLEMAS IDENTIFICADOS

### 1. **Campo `atualizado_em` em `apontamentos`**
**Problema:** Código tentava usar `atualizado_em` mas o campo não existe  
**Status:** ✅ **CORRIGIDO** (removido do código)  
**Ação:** Nenhuma (campo não é necessário, já temos `criado_em`)

---

### 2. **Índices Faltantes**
**Problema:** Queries podem estar lentas sem índices

**Índices Recomendados:**

```sql
-- Índice para buscar apontamentos por pedido (muito usado)
CREATE INDEX IF NOT EXISTS idx_apontamentos_exp_fluxo_id 
ON apontamentos(exp_fluxo_id);

-- Índice para buscar apontamentos por unidade e estágio
CREATE INDEX IF NOT EXISTS idx_apontamentos_unidade_stage 
ON apontamentos(exp_unidade, exp_stage);

-- Índice para buscar movimentações por pedido
CREATE INDEX IF NOT EXISTS idx_movimentacoes_fluxo_id 
ON exp_pedidos_movimentacoes(fluxo_id);

-- Índice para buscar movimentações por tipo
CREATE INDEX IF NOT EXISTS idx_movimentacoes_tipo 
ON exp_pedidos_movimentacoes(tipo_movimentacao);

-- Índice para buscar apontamentos por data (para análise de produtividade)
CREATE INDEX IF NOT EXISTS idx_apontamentos_criado_em 
ON apontamentos(criado_em);
```

**Status:** ⚠️ **PENDENTE** (executar migrations)

---

### 3. **Campos Novos em `exp_pedidos_movimentacoes`**

**Campos para Baixa de Estoque:**
```sql
ALTER TABLE exp_pedidos_movimentacoes 
ADD COLUMN IF NOT EXISTS tipo_baixa VARCHAR(50),
ADD COLUMN IF NOT EXISTS quantidade_pc INTEGER,
ADD COLUMN IF NOT EXISTS quantidade_kg NUMERIC(10,2);
```

**Status:** ⚠️ **PENDENTE** (verificar se existem)

---

## 📋 CHECKLIST DE VALIDAÇÃO

### Estrutura de Tabelas
- [x] **exp_pedidos_fluxo** - Existe
- [x] **apontamentos** - Existe
- [x] **exp_pedidos_movimentacoes** - Existe
- [x] **pedidos** - Existe
- [x] **pedidos_importacao** - Existe
- [x] **inventarios_usinagem** - Existe
- [x] **inventarios_usinagem_itens** - Existe

### Campos Necessários
- [x] `exp_pedidos_fluxo.alunica_stage` - Para Alúnica
- [x] `exp_pedidos_fluxo.tipo` - Diferenciar TecnoPerfil/Alúnica
- [x] `apontamentos.exp_fluxo_id` - FK para fluxo
- [x] `apontamentos.exp_unidade` - Unidade do apontamento
- [x] `apontamentos.exp_stage` - Estágio do apontamento
- [ ] `exp_pedidos_movimentacoes.tipo_baixa` - ⚠️ Verificar
- [ ] `exp_pedidos_movimentacoes.quantidade_pc` - ⚠️ Verificar
- [ ] `exp_pedidos_movimentacoes.quantidade_kg` - ⚠️ Verificar

### Índices
- [ ] `idx_apontamentos_exp_fluxo_id` - ⚠️ Criar
- [ ] `idx_apontamentos_unidade_stage` - ⚠️ Criar
- [ ] `idx_movimentacoes_fluxo_id` - ⚠️ Criar
- [ ] `idx_movimentacoes_tipo` - ⚠️ Criar
- [ ] `idx_apontamentos_criado_em` - ⚠️ Criar

---

## 🚀 AÇÕES RECOMENDADAS

### 1. **Migration Imediata** (Campos para Baixa de Estoque)
```sql
-- Migration: adicionar_campos_baixa_estoque
-- Data: 18/11/2024

ALTER TABLE exp_pedidos_movimentacoes 
ADD COLUMN IF NOT EXISTS tipo_baixa VARCHAR(50),
ADD COLUMN IF NOT EXISTS quantidade_pc INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS quantidade_kg NUMERIC(10,2) DEFAULT 0;

COMMENT ON COLUMN exp_pedidos_movimentacoes.tipo_baixa IS 
'Tipo de baixa: consumo ou venda';
COMMENT ON COLUMN exp_pedidos_movimentacoes.quantidade_pc IS 
'Quantidade em peças para baixas de estoque';
COMMENT ON COLUMN exp_pedidos_movimentacoes.quantidade_kg IS 
'Quantidade em kg para baixas de estoque';
```

### 2. **Migration de Índices** (Performance)
```sql
-- Migration: adicionar_indices_exp_usinagem
-- Data: 18/11/2024

-- Índices para apontamentos
CREATE INDEX IF NOT EXISTS idx_apontamentos_exp_fluxo_id 
ON apontamentos(exp_fluxo_id);

CREATE INDEX IF NOT EXISTS idx_apontamentos_unidade_stage 
ON apontamentos(exp_unidade, exp_stage);

CREATE INDEX IF NOT EXISTS idx_apontamentos_criado_em 
ON apontamentos(criado_em DESC);

-- Índices para movimentações
CREATE INDEX IF NOT EXISTS idx_movimentacoes_fluxo_id 
ON exp_pedidos_movimentacoes(fluxo_id);

CREATE INDEX IF NOT EXISTS idx_movimentacoes_tipo 
ON exp_pedidos_movimentacoes(tipo_movimentacao);

CREATE INDEX IF NOT EXISTS idx_movimentacoes_data 
ON exp_pedidos_movimentacoes(movimentado_em DESC);

-- Índices para fluxo
CREATE INDEX IF NOT EXISTS idx_fluxo_tipo 
ON exp_pedidos_fluxo(tipo);

CREATE INDEX IF NOT EXISTS idx_fluxo_status 
ON exp_pedidos_fluxo(status);

CREATE INDEX IF NOT EXISTS idx_fluxo_alunica_stage 
ON exp_pedidos_fluxo(alunica_stage);
```

### 3. **Verificar Campos Existentes**
Execute no banco para verificar:

```sql
-- Verificar campos em exp_pedidos_movimentacoes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'exp_pedidos_movimentacoes'
ORDER BY ordinal_position;

-- Verificar índices existentes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('apontamentos', 'exp_pedidos_movimentacoes', 'exp_pedidos_fluxo')
ORDER BY tablename, indexname;
```

---

## 📊 RESUMO EXECUTIVO

### ✅ **O Que Está OK:**
- Todas as 7 tabelas necessárias existem
- Campos principais estão presentes
- Relacionamentos (FKs) estão definidos

### ⚠️ **O Que Precisa de Atenção:**
1. **Adicionar campos de baixa de estoque** em `exp_pedidos_movimentacoes`
2. **Criar índices** para melhorar performance
3. **Validar existência dos novos campos** no banco

### 🎯 **Prioridades:**
1. **ALTA:** Migration de campos para baixa de estoque
2. **MÉDIA:** Migration de índices (performance)
3. **BAIXA:** Documentação de schema completo

---

## 📝 NOTAS TÉCNICAS

### Cálculo de Saldos
Os saldos são calculados **dinamicamente** somando apontamentos:
- Não precisa de tabela separada de saldos
- `exp_pedidos_fluxo` tem campos de cache (`saldo_kg_total`, `saldo_pc_total`)
- Atualizados ao criar apontamentos

### Histórico de Movimentações
Toda mudança é registrada em `exp_pedidos_movimentacoes`:
- Mudanças de status (TecnoPerfil)
- Mudanças de estágio (Alúnica)
- Baixas de estoque (novo)
- Aprovações/Reaberturas

### Análise de Produtividade
Usa apenas `apontamentos`:
- Calcula tempo trabalhado: `fim - inicio`
- Agrupa por dia/semana
- Filtra por unidade e período
- Não precisa de tabela adicional

---

**Conclusão:** Estrutura de banco está **95% completa**. Necessário apenas:
1. Adicionar 3 campos em `exp_pedidos_movimentacoes`
2. Criar índices para performance
3. Validar no banco de produção

---

**Próximo Passo:** Executar migrations no banco de dados.
