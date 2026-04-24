-- Cria o cadastro de kits para expedição e adiciona suporte ao romaneio baseado em composição

CREATE TABLE IF NOT EXISTS public.expedicao_kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  cliente text,
  produto_pai text,
  ativo boolean NOT NULL DEFAULT true,
  observacoes text,
  criado_por text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expedicao_kits_codigo ON public.expedicao_kits (codigo);
CREATE INDEX IF NOT EXISTS idx_expedicao_kits_nome ON public.expedicao_kits (nome);
CREATE INDEX IF NOT EXISTS idx_expedicao_kits_cliente ON public.expedicao_kits (cliente);
CREATE INDEX IF NOT EXISTS idx_expedicao_kits_ativo ON public.expedicao_kits (ativo);

CREATE TABLE IF NOT EXISTS public.expedicao_kit_componentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_id uuid NOT NULL REFERENCES public.expedicao_kits(id) ON DELETE CASCADE,
  produto text NOT NULL,
  quantidade_por_kit numeric(18,3) NOT NULL CHECK (quantidade_por_kit > 0),
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expedicao_kit_componentes_kit_id ON public.expedicao_kit_componentes (kit_id);
CREATE INDEX IF NOT EXISTS idx_expedicao_kit_componentes_produto ON public.expedicao_kit_componentes (produto);

ALTER TABLE public.expedicao_romaneios
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'racks',
  ADD COLUMN IF NOT EXISTS kit_id uuid NULL,
  ADD COLUMN IF NOT EXISTS kit_codigo text,
  ADD COLUMN IF NOT EXISTS kit_nome text,
  ADD COLUMN IF NOT EXISTS kits_total integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kit_componentes jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.expedicao_romaneio_itens
  ADD COLUMN IF NOT EXISTS tipo_item text NOT NULL DEFAULT 'rack',
  ADD COLUMN IF NOT EXISTS kit_id uuid NULL,
  ADD COLUMN IF NOT EXISTS kit_codigo text,
  ADD COLUMN IF NOT EXISTS kit_nome text,
  ADD COLUMN IF NOT EXISTS componente_produto text,
  ADD COLUMN IF NOT EXISTS quantidade_kit numeric(18,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lote text;

CREATE INDEX IF NOT EXISTS idx_expedicao_romaneios_tipo ON public.expedicao_romaneios (tipo);
CREATE INDEX IF NOT EXISTS idx_expedicao_romaneios_kit_id ON public.expedicao_romaneios (kit_id);
CREATE INDEX IF NOT EXISTS idx_expedicao_romaneio_itens_tipo_item ON public.expedicao_romaneio_itens (tipo_item);
CREATE INDEX IF NOT EXISTS idx_expedicao_romaneio_itens_kit_id ON public.expedicao_romaneio_itens (kit_id);
CREATE INDEX IF NOT EXISTS idx_expedicao_romaneio_itens_lote ON public.expedicao_romaneio_itens (lote);

ALTER TABLE public.expedicao_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expedicao_kit_componentes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_select_expedicao_kits ON public.expedicao_kits;
CREATE POLICY p_select_expedicao_kits ON public.expedicao_kits FOR SELECT USING (true);
DROP POLICY IF EXISTS p_ins_expedicao_kits ON public.expedicao_kits;
CREATE POLICY p_ins_expedicao_kits ON public.expedicao_kits FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS p_upd_expedicao_kits ON public.expedicao_kits;
CREATE POLICY p_upd_expedicao_kits ON public.expedicao_kits FOR UPDATE USING (true);
DROP POLICY IF EXISTS p_del_expedicao_kits ON public.expedicao_kits;
CREATE POLICY p_del_expedicao_kits ON public.expedicao_kits FOR DELETE USING (true);

DROP POLICY IF EXISTS p_select_expedicao_kit_componentes ON public.expedicao_kit_componentes;
CREATE POLICY p_select_expedicao_kit_componentes ON public.expedicao_kit_componentes FOR SELECT USING (true);
DROP POLICY IF EXISTS p_ins_expedicao_kit_componentes ON public.expedicao_kit_componentes;
CREATE POLICY p_ins_expedicao_kit_componentes ON public.expedicao_kit_componentes FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS p_upd_expedicao_kit_componentes ON public.expedicao_kit_componentes;
CREATE POLICY p_upd_expedicao_kit_componentes ON public.expedicao_kit_componentes FOR UPDATE USING (true);
DROP POLICY IF EXISTS p_del_expedicao_kit_componentes ON public.expedicao_kit_componentes;
CREATE POLICY p_del_expedicao_kit_componentes ON public.expedicao_kit_componentes FOR DELETE USING (true);
