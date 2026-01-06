-- Tabela de Usuários
-- Criação da tabela para gerenciamento de usuários do sistema

CREATE TABLE IF NOT EXISTS usuarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  senha VARCHAR(255) NOT NULL, -- Em produção, deve ser hasheada (bcrypt, argon2, etc)
  nivel_acesso VARCHAR(50) NOT NULL DEFAULT 'operador',
  ativo BOOLEAN DEFAULT true,
  data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ultimo_acesso TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT usuarios_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
  CONSTRAINT usuarios_nivel_acesso_check CHECK (nivel_acesso IN ('admin', 'supervisor', 'operador'))
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_nivel_acesso ON usuarios(nivel_acesso);
CREATE INDEX IF NOT EXISTS idx_usuarios_ativo ON usuarios(ativo);

-- Trigger para atualizar data_atualizacao automaticamente
CREATE OR REPLACE FUNCTION update_usuarios_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.data_atualizacao = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_usuarios_timestamp
  BEFORE UPDATE ON usuarios
  FOR EACH ROW
  EXECUTE FUNCTION update_usuarios_updated_at();

-- Comentários na tabela
COMMENT ON TABLE usuarios IS 'Tabela de usuários do sistema de controle de usinagem';
COMMENT ON COLUMN usuarios.id IS 'Identificador único do usuário (UUID)';
COMMENT ON COLUMN usuarios.nome IS 'Nome completo do usuário';
COMMENT ON COLUMN usuarios.email IS 'Email do usuário (único, usado para login)';
COMMENT ON COLUMN usuarios.senha IS 'Senha do usuário (deve ser hasheada em produção)';
COMMENT ON COLUMN usuarios.nivel_acesso IS 'Nível de acesso: admin, supervisor ou operador';
COMMENT ON COLUMN usuarios.ativo IS 'Indica se o usuário está ativo no sistema';
COMMENT ON COLUMN usuarios.data_criacao IS 'Data e hora de criação do registro';
COMMENT ON COLUMN usuarios.data_atualizacao IS 'Data e hora da última atualização';
COMMENT ON COLUMN usuarios.ultimo_acesso IS 'Data e hora do último acesso ao sistema';

-- Inserir usuário administrador padrão (senha: admin123 - TROCAR EM PRODUÇÃO!)
INSERT INTO usuarios (nome, email, senha, nivel_acesso, ativo)
VALUES 
  ('Administrador', 'admin@usinagem.com', 'admin123', 'admin', true),
  ('Supervisor Produção', 'supervisor@usinagem.com', 'super123', 'supervisor', true),
  ('Operador 1', 'operador@usinagem.com', 'oper123', 'operador', true)
ON CONFLICT (email) DO NOTHING;

-- Habilitar RLS (Row Level Security) - IMPORTANTE PARA PRODUÇÃO
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Política de acesso: usuários podem ver apenas seus próprios dados
-- Admins podem ver todos
CREATE POLICY usuarios_select_policy ON usuarios
  FOR SELECT
  USING (
    auth.uid() = id OR 
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() AND nivel_acesso = 'admin'
    )
  );

-- Política de inserção: apenas admins podem criar usuários
CREATE POLICY usuarios_insert_policy ON usuarios
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() AND nivel_acesso = 'admin'
    )
  );

-- Política de atualização: usuários podem atualizar seus próprios dados
-- Admins podem atualizar qualquer usuário
CREATE POLICY usuarios_update_policy ON usuarios
  FOR UPDATE
  USING (
    auth.uid() = id OR 
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() AND nivel_acesso = 'admin'
    )
  );

-- Política de exclusão: apenas admins podem excluir usuários
CREATE POLICY usuarios_delete_policy ON usuarios
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() AND nivel_acesso = 'admin'
    )
  );
