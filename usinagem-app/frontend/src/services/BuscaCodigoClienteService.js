import CodigosProdutosClientesService from './CodigosProdutosClientesService'

class BuscaCodigoClienteService {
  // Buscar código do cliente pelo código da Tecno
  async buscarPorCodigoTecno(codigoTecno) {
    try {
      const resultados = await CodigosProdutosClientesService.buscarPorCodigoTecno(codigoTecno)
      return resultados
    } catch (error) {
      console.error('Erro ao buscar código do cliente:', error)
      return []
    }
  }

  // Buscar sugestões para autocomplete
  async buscarSugestoes(termo) {
    try {
      const resultados = await CodigosProdutosClientesService.buscarSugestoes(termo)
      return resultados
    } catch (error) {
      console.error('Erro ao buscar sugestões:', error)
      return []
    }
  }

  // Obter todos os códigos para cache
  async obterTodosCodigos() {
    try {
      const codigos = await CodigosProdutosClientesService.listarTodos()
      return codigos
    } catch (error) {
      console.error('Erro ao obter todos os códigos:', error)
      return []
    }
  }

  // Criar mapa de código Tecno -> Cliente para busca rápida
  async criarMapaCodigos() {
    try {
      const codigos = await this.obterTodosCodigos()
      const mapa = {}
      
      codigos.forEach(codigo => {
        // Mapear código Tecno para array de clientes (pode ter múltiplos)
        if (!mapa[codigo.codigo_tecno]) {
          mapa[codigo.codigo_tecno] = []
        }
        mapa[codigo.codigo_tecno].push({
          codigo_cliente: codigo.codigo_cliente,
          nome_cliente: codigo.nome_cliente,
          descricao_produto: codigo.descricao_produto,
          id: codigo.id
        })
      })
      
      return mapa
    } catch (error) {
      console.error('Erro ao criar mapa de códigos:', error)
      return {}
    }
  }

  // Buscar múltiplos clientes para um código Tecno
  async buscarClientesPorTecno(codigoTecno) {
    try {
      const mapa = await this.criarMapaCodigos()
      return mapa[codigoTecno] || []
    } catch (error) {
      console.error('Erro ao buscar clientes por Tecno:', error)
      return []
    }
  }

  // Verificar se existe correspondência
  async verificarCorrespondencia(codigoTecno, codigoCliente) {
    try {
      const existingId = await CodigosProdutosClientesService.verificarExistencia(codigoTecno, codigoCliente)
      return existingId !== null
    } catch (error) {
      console.error('Erro ao verificar correspondência:', error)
      return false
    }
  }

  // Função para autocomplete no campo de código do cliente
  async buscarCodigosClientePorTecno(codigoTecno) {
    try {
      if (!codigoTecno || codigoTecno.trim() === '') {
        return []
      }
      
      const clientes = await this.buscarClientesPorTecno(codigoTecno)
      return clientes.map(cliente => ({
        value: cliente.codigo_cliente,
        label: `${cliente.codigo_cliente} - ${cliente.nome_cliente || 'Sem nome'}`,
        ...cliente
      }))
    } catch (error) {
      console.error('Erro ao buscar códigos do cliente:', error)
      return []
    }
  }

  // Buscar código preferencial do cliente (primeiro da lista)
  async buscarCodigoPreferencial(codigoTecno) {
    try {
      const clientes = await this.buscarClientesPorTecno(codigoTecno)
      return clientes.length > 0 ? clientes[0] : null
    } catch (error) {
      console.error('Erro ao buscar código preferencial:', error)
      return null
    }
  }
}

export default new BuscaCodigoClienteService()
