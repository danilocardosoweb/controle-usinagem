-- Correções críticas no schema do Supabase
-- Execute este script no SQL Editor do Supabase

-- 1. Corrigir nome da coluna em apontamentos
ALTER TABLE public.apontamentos 
  DROP COLUMN IF EXISTS lotes_extrusao,
  ADD COLUMN IF NOT EXISTS lotes_externos text[];

-- 2. Adicionar campos ausentes em apontamentos que o frontend usa
ALTER TABLE public.apontamentos
  ADD COLUMN IF NOT EXISTS lote text,
  ADD COLUMN IF NOT EXISTS romaneio_numero text,
  ADD COLUMN IF NOT EXISTS lote_externo text;

-- 3. Garantir que a tabela usuarios existe para autenticação futura
CREATE TABLE IF NOT EXISTS public.usuarios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text unique not null,
  senha_hash text not null,
  nivel_acesso text not null check (nivel_acesso in ('operador','supervisor','admin')),
  created_at timestamptz not null default now()
);

-- 4. Habilitar RLS para usuarios
ALTER TABLE public.usuarios ENABLE row level security;

-- 5. Política temporária para usuarios (ajustar depois)
DROP POLICY IF EXISTS p_select_usuarios on public.usuarios;
CREATE POLICY p_select_usuarios on public.usuarios for select using (true);
DROP POLICY IF EXISTS p_ins_usuarios on public.usuarios;
CREATE POLICY p_ins_usuarios on public.usuarios for insert with check (true);

-- 6. Inserir usuários de teste (senhas devem ser hasheadas em produção)
INSERT INTO public.usuarios (nome, email, senha_hash, nivel_acesso) VALUES
  ('Administrador', 'admin@usinagem.com', '$2b$10$dummy_hash_admin', 'admin'),
  ('Supervisor', 'supervisor@usinagem.com', '$2b$10$dummy_hash_supervisor', 'supervisor'),
  ('Operador', 'operador@usinagem.com', '$2b$10$dummy_hash_operador', 'operador'),
  ('Danilo Cardoso', 'danilo.cardosoweb@gmail.com', '$2b$10$dummy_hash_danilo', 'admin')
ON CONFLICT (email) DO NOTHING;

-- 7. Verificar se todas as tabelas necessárias existem
-- (Este script assume que o data_schema.sql principal já foi executado)
