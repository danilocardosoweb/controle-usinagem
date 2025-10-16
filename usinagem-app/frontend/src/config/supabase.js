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

// Log de debug (apenas em desenvolvimento)
if (import.meta.env.DEV) {
  console.log('🔧 Configuração Supabase:', {
    url: SUPABASE_CONFIG.url ? '✅ Configurada' : '❌ Ausente',
    anonKey: SUPABASE_CONFIG.anonKey ? '✅ Configurada' : '❌ Ausente',
    env: import.meta.env.MODE
  });
}
