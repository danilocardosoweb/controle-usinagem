/**
 * Configuração centralizada do Supabase
 * Garante que as credenciais sejam carregadas corretamente
 */

// Configurações do Supabase
export const SUPABASE_CONFIG = {
  url: import.meta.env.VITE_SUPABASE_URL || 'https://oykzakzcqjoaeixbxhvb.supabase.co',
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95a3pha3pjcWpvYWVpeGJ4aHZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNjY2MjgsImV4cCI6MjA3NDc0MjYyOH0.00BmsnzyIHlzcO41aAmIPwy5NXN8Gq6Qaopn6UbdIEc'
};

// Validação das configurações
export const validateSupabaseConfig = () => {
  if (!SUPABASE_CONFIG.url || !SUPABASE_CONFIG.anonKey) {
    throw new Error('Configuração do Supabase incompleta. Verifique as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY');
  }
  
  if (!SUPABASE_CONFIG.url.startsWith('https://')) {
    throw new Error('URL do Supabase deve começar com https://');
  }
  
  return true;
};

// Importar e configurar o cliente Supabase
import { createClient } from '@supabase/supabase-js'

// Criar o cliente Supabase
export const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey)

// Log de debug (apenas em desenvolvimento)
if (import.meta.env.DEV) {
  console.log('🔧 Configuração Supabase:', {
    url: SUPABASE_CONFIG.url ? '✅ Configurada' : '❌ Ausente',
    anonKey: SUPABASE_CONFIG.anonKey ? '✅ Configurada' : '❌ Ausente',
    env: import.meta.env.MODE
  });
  
  console.log('[Supabase ENV] url: true key: true');
  
  // Verificar variáveis de ambiente
  console.log('[ENV keys]', Object.keys(import.meta.env).filter(key => key.startsWith('VITE_SUPABASE')));
  
  console.log('[VITE vars]', {
    VITE_SUPABASE_URL_present: !!import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY_length: import.meta.env.VITE_SUPABASE_ANON_KEY?.length || 0
  });
}
