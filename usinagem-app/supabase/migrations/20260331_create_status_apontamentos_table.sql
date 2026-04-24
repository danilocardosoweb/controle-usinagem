-- Criar tabela para armazenar status personalizados de apontamentos
-- Esta tabela permite que o usuário altere o status de cada apontamento
-- independentemente dos dados originais da tabela apontamentos

CREATE TABLE IF NOT EXISTS public.status_apontamentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  apontamento_id UUID NOT NULL REFERENCES public.apontamentos(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('Apontado', 'Não Apontado')),
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  criado_por TEXT,
  atualizado_em TIMESTAMP WITH TIME ZONE,
  atualizado_por TEXT
);

-- Criar índice para busca rápida por apontamento_id
CREATE INDEX IF NOT EXISTS idx_status_apontamentos_apontamento_id 
ON public.status_apontamentos(apontamento_id);

-- Criar índice para busca por status
CREATE INDEX IF NOT EXISTS idx_status_apontamentos_status 
ON public.status_apontamentos(status);

-- Garantir que só exista um registro de status por apontamento
CREATE UNIQUE INDEX IF NOT EXISTS idx_status_apontamentos_unique 
ON public.status_apontamentos(apontamento_id);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.status_apontamentos ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura para usuários autenticados
CREATE POLICY "Permitir leitura para usuários autenticados" ON public.status_apontamentos
FOR SELECT USING (auth.role() = 'authenticated');

-- Política para permitir inserção para usuários autenticados
CREATE POLICY "Permitir inserção para usuários autenticados" ON public.status_apontamentos
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Política para permitir atualização para usuários autenticados
CREATE POLICY "Permitir atualização para usuários autenticados" ON public.status_apontamentos
FOR UPDATE USING (auth.role() = 'authenticated');

-- Política para permitir exclusão para usuários autenticados
CREATE POLICY "Permitir exclusão para usuários autenticados" ON public.status_apontamentos
FOR DELETE USING (auth.role() = 'authenticated');
