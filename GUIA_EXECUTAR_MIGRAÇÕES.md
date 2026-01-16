# 🚀 Guia Completo: Executar Migrações no Supabase

## ⚠️ IMPORTANTE: Sem estas migrações, as funcionalidades NÃO funcionarão!

---

## 📋 O que será criado:

1. **Campo `deposito`** na tabela `apontamentos`
   - Armazena onde o item está (Alúnica ou Tecnoperfil)
   - Padrão: 'alunica'

2. **Tabela `movimentacoes_deposito`**
   - Histórico de movimentações entre depósitos
   - Rastreia origem, destino, motivo, data

3. **Campos em `ferramentas_cfg`**
   - `corpo_mm`, `quant_pcs`, `vida_valor`, `vida_unidade`, `ultima_troca`, `numero_serial`
   - Suporta cadastro inteligente de ferramentas

---

## 🔧 Passo a Passo:

### 1️⃣ Abra o Supabase Dashboard
- Acesse: https://app.supabase.com
- Selecione seu projeto

### 2️⃣ Vá para SQL Editor
- No menu lateral esquerdo, clique em **"SQL Editor"**
- Clique em **"New Query"** (botão verde)

### 3️⃣ Copie o SQL Completo
Copie TODO o código abaixo:

```sql
BEGIN;

-- ============================================================
-- 1. CAMPOS PARA CADASTRO INTELIGENTE DE FERRAMENTAS CNC
-- ============================================================

ALTER TABLE public.ferramentas_cfg
  ADD COLUMN IF NOT EXISTS corpo_mm numeric(10,2),
  ADD COLUMN IF NOT EXISTS quant_pcs int,
  ADD COLUMN IF NOT EXISTS vida_valor int,
  ADD COLUMN IF NOT EXISTS vida_unidade text DEFAULT 'horas' CHECK (vida_unidade IN ('dias', 'horas', 'semanas', 'meses')),
  ADD COLUMN IF NOT EXISTS ultima_troca date,
  ADD COLUMN IF NOT EXISTS numero_serial text;

CREATE INDEX IF NOT EXISTS idx_ferramentas_cfg_numero_serial ON public.ferramentas_cfg(numero_serial);
CREATE INDEX IF NOT EXISTS idx_ferramentas_cfg_ferramenta_serial ON public.ferramentas_cfg(ferramenta, numero_serial);

COMMENT ON COLUMN public.ferramentas_cfg.corpo_mm IS 'Diâmetro ou corpo da ferramenta em milímetros';
COMMENT ON COLUMN public.ferramentas_cfg.quant_pcs IS 'Quantidade de peças da ferramenta';
COMMENT ON COLUMN public.ferramentas_cfg.vida_valor IS 'Valor da vida útil da ferramenta';
COMMENT ON COLUMN public.ferramentas_cfg.vida_unidade IS 'Unidade de medida da vida útil';
COMMENT ON COLUMN public.ferramentas_cfg.ultima_troca IS 'Data da última troca ou afiação';
COMMENT ON COLUMN public.ferramentas_cfg.numero_serial IS 'Número serial para diferenciar ferramentas idênticas';

-- ============================================================
-- 2. CAMPOS PARA DEPÓSITO DE ITENS ACABADOS
-- ============================================================

ALTER TABLE public.apontamentos
  ADD COLUMN IF NOT EXISTS deposito text DEFAULT 'alunica' CHECK (deposito IN ('alunica', 'tecnoperfil'));

CREATE INDEX IF NOT EXISTS idx_apontamentos_deposito ON public.apontamentos(deposito);

COMMENT ON COLUMN public.apontamentos.deposito IS 'Depósito onde o item acabado está armazenado';

-- ============================================================
-- 3. TABELA DE HISTÓRICO DE MOVIMENTAÇÃO DE DEPÓSITOS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.movimentacoes_deposito (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apontamento_id UUID NOT NULL REFERENCES public.apontamentos(id) ON DELETE CASCADE,
  deposito_origem text NOT NULL,
  deposito_destino text NOT NULL,
  movimentado_por text,
  movimentado_em TIMESTAMPTZ DEFAULT timezone('utc', now()),
  motivo text,
  observacao text
);

CREATE INDEX IF NOT EXISTS idx_movimentacoes_deposito_apontamento ON public.movimentacoes_deposito(apontamento_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_deposito_data ON public.movimentacoes_deposito(movimentado_em);

COMMENT ON TABLE public.movimentacoes_deposito IS 'Histórico de movimentações de itens acabados entre depósitos';

-- ============================================================
-- 4. NOTIFICAR SUPABASE PARA RECARREGAR SCHEMA
-- ============================================================

NOTIFY pgrst, 'reload schema';

COMMIT;
```

### 4️⃣ Cole no Editor SQL
- Clique no editor de texto
- Pressione **Ctrl+A** para selecionar tudo (se houver algo)
- Pressione **Ctrl+V** para colar o SQL

### 5️⃣ Execute a Migração
- Clique no botão **"Run"** (canto superior direito)
- OU pressione **Ctrl+Enter**

### 6️⃣ Aguarde a Execução
- Você verá uma mensagem de sucesso: **"Success"** ou **"Query executed successfully"**
- Se houver erro, verifique se copiou todo o SQL corretamente

### 7️⃣ Recarregue o Aplicativo
- Volte para o navegador com o aplicativo
- Pressione **F5** ou **Ctrl+R** para recarregar
- As funcionalidades agora estarão ativas!

---

## ✅ Como Verificar se Funcionou:

1. **Vá para a aba "Itens Acabados"**
2. **Você deve ver:**
   - ✅ Coluna "Depósito" com "Alúnica"
   - ✅ Botão "Mover" funcionando
   - ✅ Modal de movimentação de depósito

3. **Vá para "Ferramentas e Insumos" → "Status de Ferramentas"**
4. **Clique em "Editar" em uma ferramenta**
5. **Você deve ver:**
   - ✅ Campo "Número Serial"
   - ✅ Campo "Corpo (mm)"
   - ✅ Campo "Quantidade (pcs)"
   - ✅ Campo "Horas de Corte"

---

## 🆘 Se Algo Deu Errado:

### Erro: "Column already exists"
- **Solução:** As colunas já foram criadas. Isso é normal. Clique em "Run" novamente.

### Erro: "Permission denied"
- **Solução:** Você não tem permissão. Peça a um administrador do Supabase para executar.

### Erro: "Syntax error"
- **Solução:** Verifique se copiou TODO o SQL corretamente, sem deixar nada de fora.

### Nada mudou no aplicativo
- **Solução:** Recarregue o navegador (F5) e aguarde 5 segundos.

---

## 📞 Suporte:

Se tiver dúvidas, verifique:
1. Se o SQL foi executado com sucesso (procure por "Success")
2. Se recarregou o navegador (F5)
3. Se limpou o cache do navegador (Ctrl+Shift+Delete)

---

**Pronto! Após executar, todas as funcionalidades estarão 100% operacionais! 🚀**
