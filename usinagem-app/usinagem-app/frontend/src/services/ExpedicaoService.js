import { supabase } from '../config/supabase'

class ExpedicaoService {
  // Gerar número de romaneio único
  static gerarNumeroRomaneio() {
    const hoje = new Date()
    const dd = String(hoje.getDate()).padStart(2, '0')
    const mm = String(hoje.getMonth() + 1).padStart(2, '0')
    const yyyy = hoje.getFullYear()
    const timestamp = Date.now().toString().slice(-4)
    return `ROM-${dd}${mm}${yyyy}-${timestamp}`
  }

  // Criar novo romaneio com itens
  static async criarRomaneio(romaneioData, itensData) {
    try {
      // Inserir romaneio
      const { data: novoRomaneio, error: erroRomaneio } = await supabase
        .from('expedicao_romaneios')
        .insert(romaneioData)
        .select()

      if (erroRomaneio) throw erroRomaneio

      const romaneioId = novoRomaneio[0].id

      // Inserir itens com romaneio_id
      const itensComRomaneio = itensData.map(item => ({
        ...item,
        romaneio_id: romaneioId
      }))

      const { error: erroItens } = await supabase
        .from('expedicao_romaneio_itens')
        .insert(itensComRomaneio)

      if (erroItens) throw erroItens

      return novoRomaneio[0]
    } catch (erro) {
      console.error('Erro ao criar romaneio:', erro)
      throw erro
    }
  }

  // Obter romaneio com seus itens
  static async obterRomaneioComItens(romaneioId) {
    try {
      const { data: romaneio, error: erroRomaneio } = await supabase
        .from('expedicao_romaneios')
        .select('*')
        .eq('id', romaneioId)
        .single()

      if (erroRomaneio) throw erroRomaneio

      const { data: itens, error: erroItens } = await supabase
        .from('expedicao_romaneio_itens')
        .select('*')
        .eq('romaneio_id', romaneioId)

      if (erroItens) throw erroItens

      return { ...romaneio, itens }
    } catch (erro) {
      console.error('Erro ao obter romaneio:', erro)
      throw erro
    }
  }

  // Atualizar status de item
  static async atualizarItemRomaneio(itemId, dados) {
    try {
      const { error } = await supabase
        .from('expedicao_romaneio_itens')
        .update(dados)
        .eq('id', itemId)

      if (error) throw error
    } catch (erro) {
      console.error('Erro ao atualizar item:', erro)
      throw erro
    }
  }

  // Finalizar conferência de romaneio
  static async finalizarConferencia(romaneioId, usuarioConferencia) {
    try {
      const { error } = await supabase
        .from('expedicao_romaneios')
        .update({
          status: 'conferido',
          data_conferencia: new Date().toISOString(),
          usuario_conferencia: usuarioConferencia
        })
        .eq('id', romaneioId)

      if (error) throw error
    } catch (erro) {
      console.error('Erro ao finalizar conferência:', erro)
      throw erro
    }
  }

  // Expedir romaneio
  static async expedir(romaneioId, usuarioExpedicao) {
    try {
      const { error } = await supabase
        .from('expedicao_romaneios')
        .update({
          status: 'expedido',
          data_expedicao: new Date().toISOString(),
          usuario_expedicao: usuarioExpedicao
        })
        .eq('id', romaneioId)

      if (error) throw error
    } catch (erro) {
      console.error('Erro ao expedir romaneio:', erro)
      throw erro
    }
  }

  // Cancelar romaneio
  static async cancelar(romaneioId) {
    try {
      const { error } = await supabase
        .from('expedicao_romaneios')
        .update({ status: 'cancelado' })
        .eq('id', romaneioId)

      if (error) throw error
    } catch (erro) {
      console.error('Erro ao cancelar romaneio:', erro)
      throw erro
    }
  }

  // Gerar relatório de expedição
  static async gerarRelatorio(dataInicio, dataFim) {
    try {
      const { data, error } = await supabase
        .from('expedicao_romaneios')
        .select(`
          *,
          itens:expedicao_romaneio_itens(*)
        `)
        .gte('data_criacao', dataInicio)
        .lte('data_criacao', dataFim)
        .order('data_criacao', { ascending: false })

      if (error) throw error

      return data
    } catch (erro) {
      console.error('Erro ao gerar relatório:', erro)
      throw erro
    }
  }

  // Exportar romaneio para Excel
  static async exportarParaExcel(romaneioId, XLSX) {
    try {
      const romaneio = await this.obterRomaneioComItens(romaneioId)

      const dados = [
        ['ROMANEIO DE EXPEDIÇÃO'],
        ['Número:', romaneio.numero_romaneio],
        ['Data de Criação:', new Date(romaneio.data_criacao).toLocaleDateString('pt-BR')],
        ['Status:', romaneio.status.toUpperCase()],
        ['Total de Racks:', romaneio.total_racks],
        ['Total de Peças:', romaneio.total_pecas],
        [],
        ['ITENS DO ROMANEIO'],
        ['Rack', 'Produto', 'Quantidade', 'Cliente', 'Pedido', 'Lote', 'Status']
      ]

      romaneio.itens.forEach(item => {
        dados.push([
          item.rack_ou_pallet,
          item.produto,
          item.quantidade,
          item.cliente,
          item.pedido_seq,
          item.lote,
          item.status_item
        ])
      })

      const ws = XLSX.utils.aoa_to_sheet(dados)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Romaneio')
      XLSX.writeFile(wb, `${romaneio.numero_romaneio}.xlsx`)
    } catch (erro) {
      console.error('Erro ao exportar para Excel:', erro)
      throw erro
    }
  }
}

export default ExpedicaoService
