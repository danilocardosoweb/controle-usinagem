import { supabase } from '../config/supabase'

class CodigosProdutosClientesService {
  // Listar todos os códigos
  async listarTodos() {
    try {
      const { data, error } = await supabase
        .from('codigos_produtos_clientes')
        .select('*')
        .order('codigo_tecno', { ascending: true })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Erro ao listar códigos de produtos:', error)
      throw error
    }
  }

  // Buscar por código Tecno
  async buscarPorCodigoTecno(codigoTecno) {
    try {
      const { data, error } = await supabase
        .from('codigos_produtos_clientes')
        .select('*')
        .eq('codigo_tecno', codigoTecno)

      if (error) throw error
      return data
    } catch (error) {
      console.error('Erro ao buscar por código Tecno:', error)
      throw error
    }
  }

  // Buscar por código Cliente
  async buscarPorCodigoCliente(codigoCliente) {
    try {
      const { data, error } = await supabase
        .from('codigos_produtos_clientes')
        .select('*')
        .eq('codigo_cliente', codigoCliente)

      if (error) throw error
      return data
    } catch (error) {
      console.error('Erro ao buscar por código Cliente:', error)
      throw error
    }
  }

  // Buscar por nome do cliente
  async buscarPorNomeCliente(nomeCliente) {
    try {
      const { data, error } = await supabase
        .from('codigos_produtos_clientes')
        .select('*')
        .ilike('nome_cliente', `%${nomeCliente}%`)
        .order('nome_cliente', { ascending: true })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Erro ao buscar por nome do cliente:', error)
      throw error
    }
  }

  // Criar novo código
  async criar(codigo) {
    try {
      const novoCodigo = {
        ...codigo,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('codigos_produtos_clientes')
        .insert(novoCodigo)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Erro ao criar código de produto:', error)
      throw error
    }
  }

  // Atualizar código
  async atualizar(id, codigo) {
    try {
      const codigoAtualizado = {
        ...codigo,
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('codigos_produtos_clientes')
        .update(codigoAtualizado)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Erro ao atualizar código de produto:', error)
      throw error
    }
  }

  // Excluir código
  async excluir(id) {
    try {
      const { error } = await supabase
        .from('codigos_produtos_clientes')
        .delete()
        .eq('id', id)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Erro ao excluir código de produto:', error)
      throw error
    }
  }

  // Verificar se já existe combinação
  async verificarExistencia(codigoTecno, codigoCliente) {
    try {
      const { data, error } = await supabase
        .from('codigos_produtos_clientes')
        .select('id')
        .eq('codigo_tecno', codigoTecno)
        .eq('codigo_cliente', codigoCliente)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      
      return data ? data.id : null
    } catch (error) {
      console.error('Erro ao verificar existência:', error)
      throw error
    }
  }

  // Buscar sugestões para autocomplete
  async buscarSugestoes(termo) {
    try {
      const { data, error } = await supabase
        .from('codigos_produtos_clientes')
        .select('codigo_tecno, codigo_cliente, nome_cliente')
        .or(`codigo_tecno.ilike.%${termo}%,codigo_cliente.ilike.%${termo}%,nome_cliente.ilike.%${termo}%`)
        .limit(10)

      if (error) throw error
      return data
    } catch (error) {
      console.error('Erro ao buscar sugestões:', error)
      throw error
    }
  }

  // Obter estatísticas
  async obterEstatisticas() {
    try {
      const { data, error } = await supabase
        .from('codigos_produtos_clientes')
        .select('id')

      if (error) throw error

      const total = data?.length || 0

      // Obter clientes únicos
      const { data: clientesData, error: clientesError } = await supabase
        .from('codigos_produtos_clientes')
        .select('nome_cliente')
        .not('nome_cliente', 'is', null)

      if (clientesError) throw clientesError

      const clientesUnicos = [...new Set(clientesData?.map(c => c.nome_cliente))].length

      return {
        total_codigos: total,
        total_clientes: clientesUnicos
      }
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error)
      throw error
    }
  }
}

export default new CodigosProdutosClientesService()
