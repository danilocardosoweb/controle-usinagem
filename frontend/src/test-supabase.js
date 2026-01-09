/**
 * Teste de conectividade do Supabase
 * Execute este arquivo para verificar se a conexão está funcionando
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oykzakzcqjoaeixbxhvb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95a3pha3pjcWpvYWVpeGJ4aHZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNjY2MjgsImV4cCI6MjA3NDc0MjYyOH0.00BmsnzyIHlzcO41aAmIPwy5NXN8Gq6Qaopn6UbdIEc';

async function testSupabase() {
  console.log('🔧 Testando conexão Supabase...');
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Teste 1: Verificar se o cliente foi criado
    console.log('✅ Cliente Supabase criado');
    
    // Teste 2: Tentar uma consulta simples
    console.log('🔍 Testando consulta à tabela pedidos...');
    const { data: pedidos, error: errorPedidos } = await supabase
      .from('pedidos')
      .select('*')
      .limit(5);
    
    if (errorPedidos) {
      console.error('❌ Erro ao consultar pedidos:', errorPedidos);
    } else {
      console.log('✅ Pedidos carregados:', pedidos?.length || 0);
    }
    
    // Teste 3: Tentar consultar lotes
    console.log('🔍 Testando consulta à tabela lotes...');
    const { data: lotes, error: errorLotes } = await supabase
      .from('lotes')
      .select('*')
      .limit(5);
    
    if (errorLotes) {
      console.error('❌ Erro ao consultar lotes:', errorLotes);
    } else {
      console.log('✅ Lotes carregados:', lotes?.length || 0);
    }
    
    // Teste 4: Verificar tabelas disponíveis
    console.log('🔍 Verificando estrutura do banco...');
    const { data: tables, error: errorTables } = await supabase
      .rpc('get_table_names');
    
    if (errorTables) {
      console.log('ℹ️ Não foi possível listar tabelas (função não existe)');
    } else {
      console.log('📋 Tabelas disponíveis:', tables);
    }
    
  } catch (error) {
    console.error('💥 Erro geral:', error);
  }
}

// Executar teste se este arquivo for chamado diretamente
if (typeof window !== 'undefined') {
  window.testSupabase = testSupabase;
  console.log('🧪 Teste disponível: execute testSupabase() no console');
}

export default testSupabase;
