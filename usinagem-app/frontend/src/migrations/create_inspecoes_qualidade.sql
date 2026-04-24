-- Criar tabela de inspeções de qualidade
CREATE TABLE IF NOT EXISTS inspecoes_qualidade (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apontamento_id TEXT NOT NULL,
  produto TEXT,
  pedido_seq TEXT,
  palete TEXT,
  quantidade_total INTEGER,
  quantidade_inspecionada INTEGER,
  quantidade_nok INTEGER,
  percentual_nok NUMERIC(5,2),
  blocos JSONB,
  data_inspecao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  operador TEXT,
  status TEXT DEFAULT 'concluida',
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_inspecoes_apontamento ON inspecoes_qualidade(apontamento_id);
CREATE INDEX IF NOT EXISTS idx_inspecoes_pedido ON inspecoes_qualidade(pedido_seq);
CREATE INDEX IF NOT EXISTS idx_inspecoes_data ON inspecoes_qualidade(data_inspecao);

-- Habilitar RLS (Row Level Security)
ALTER TABLE inspecoes_qualidade ENABLE ROW LEVEL SECURITY;

-- Criar política de acesso para usuários autenticados
CREATE POLICY "Usuários podem ver suas próprias inspeções" ON inspecoes_qualidade
  FOR SELECT USING (true);

CREATE POLICY "Usuários podem inserir inspeções" ON inspecoes_qualidade
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Usuários podem atualizar inspeções" ON inspecoes_qualidade
  FOR UPDATE USING (true);
