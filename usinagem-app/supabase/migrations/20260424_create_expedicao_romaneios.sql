-- Criar tabela de romaneios
CREATE TABLE IF NOT EXISTS expedicao_romaneios (
  id BIGSERIAL PRIMARY KEY,
  cliente VARCHAR(255) NOT NULL,
  kit_id BIGINT REFERENCES expedicao_kits(id) ON DELETE CASCADE,
  kit_codigo VARCHAR(100),
  kit_nome VARCHAR(255),
  quantidade_kits INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(50) DEFAULT 'pendente', -- pendente, em_separacao, separado, expedido
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Criar tabela de itens do romaneio
CREATE TABLE IF NOT EXISTS expedicao_romaneio_itens (
  id BIGSERIAL PRIMARY KEY,
  romaneio_id BIGINT NOT NULL REFERENCES expedicao_romaneios(id) ON DELETE CASCADE,
  ferramenta VARCHAR(100),
  comprimento VARCHAR(50),
  produto VARCHAR(255),
  quantidade INTEGER NOT NULL,
  rack VARCHAR(100),
  apontamento_id BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Criar índices para melhor performance
CREATE INDEX idx_expedicao_romaneios_cliente ON expedicao_romaneios(cliente);
CREATE INDEX idx_expedicao_romaneios_kit_id ON expedicao_romaneios(kit_id);
CREATE INDEX idx_expedicao_romaneios_status ON expedicao_romaneios(status);
CREATE INDEX idx_expedicao_romaneio_itens_romaneio_id ON expedicao_romaneio_itens(romaneio_id);
CREATE INDEX idx_expedicao_romaneio_itens_ferramenta ON expedicao_romaneio_itens(ferramenta);

-- Habilitar RLS (Row Level Security)
ALTER TABLE expedicao_romaneios ENABLE ROW LEVEL SECURITY;
ALTER TABLE expedicao_romaneio_itens ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS para romaneios
CREATE POLICY "Romaneios são visíveis para todos" ON expedicao_romaneios
  FOR SELECT USING (true);

CREATE POLICY "Romaneios podem ser criados por usuários autenticados" ON expedicao_romaneios
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Romaneios podem ser atualizados por usuários autenticados" ON expedicao_romaneios
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Criar políticas RLS para itens de romaneios
CREATE POLICY "Itens de romaneios são visíveis para todos" ON expedicao_romaneio_itens
  FOR SELECT USING (true);

CREATE POLICY "Itens de romaneios podem ser criados por usuários autenticados" ON expedicao_romaneio_itens
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Itens de romaneios podem ser atualizados por usuários autenticados" ON expedicao_romaneio_itens
  FOR UPDATE USING (auth.role() = 'authenticated');
