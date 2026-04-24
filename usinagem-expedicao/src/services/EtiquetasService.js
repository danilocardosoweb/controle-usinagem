import { supabase } from '../config/supabase'

class EtiquetasService {
  // Registrar etiquetas geradas
  static async registrarEtiquetas(apontamento, distribuicaoEtiquetas, usuario = null) {
    try {
      const etiquetasParaInserir = []
      
      distribuicaoEtiquetas.forEach((dist, indexDist) => {
        for (let i = 0; i < dist.qtdEtiquetas; i++) {
          const numeroEtiqueta = etiquetasParaInserir.length + 1
          const totalEtiquetas = distribuicaoEtiquetas.reduce((sum, d) => sum + d.qtdEtiquetas, 0)
          
          // Gerar QR Code
          const lote = apontamento.lote || ''
          const loteMP = apontamento.lote_externo || apontamento.loteExterno || ''
          const pallet = apontamento.rack_ou_pallet || apontamento.rackOuPallet || ''
          const ferramenta = this.extrairFerramenta(apontamento.produto || apontamento.codigoPerfil || '')
          
          const qrText = `L=${lote}|MP=${loteMP}|P=${ferramenta}|R=${pallet}|Q=${dist.qtdPorEtiqueta}|D=${apontamento.dureza_material || 'N/A'}|E=${numeroEtiqueta}/${totalEtiquetas}`
          
          // Dados completos da etiqueta em JSON
          const dadosEtiqueta = {
            cliente: apontamento.cliente || '',
            produto: apontamento.produto || apontamento.codigoPerfil || '',
            ferramenta: ferramenta,
            quantidade: dist.qtdPorEtiqueta,
            qt_kg: dist.qtKgPorEtiqueta,
            rack: apontamento.rack_ou_pallet || apontamento.rackOuPallet || '',
            lote_usinagem: lote,
            lote_mp: loteMP,
            dureza: apontamento.dureza_material || 'N/A',
            pedido: apontamento.ordemTrabalho || apontamento.pedido_seq || '',
            divisao_amarrados: `${dist.qtdPorEtiqueta} x ${dist.qtKgPorEtiqueta}`,
            numero_etiqueta: numeroEtiqueta,
            total_etiquetas: totalEtiquetas
          }
          
          etiquetasParaInserir.push({
            lote_usinagem: lote,
            numero_etiqueta: numeroEtiqueta,
            total_etiquetas: totalEtiquetas,
            qtd_por_etiqueta: dist.qtdPorEtiqueta,
            qt_kg_por_etiqueta: dist.qtKgPorEtiqueta || null,
            apontamento_id: apontamento.id || null,
            codigo_amarrado: dist.codigoEtiqueta || `${lote}-${numeroEtiqueta}`,
            rack_ou_pallet: pallet,
            impressora: 'Impressora Térmica',
            usuario_impressao: usuario || 'Sistema',
            status: 'gerada',
            qr_code: qrText,
            dados_etiqueta: {
              ...dadosEtiqueta,
              codigo_etiqueta: dist.codigoEtiqueta || `${lote}-${numeroEtiqueta}`,
              codigo_produto_cliente: dist.codigoProdutoCliente || ''
            }
          })
        }
      })
      
      // Inserir todas as etiquetas de uma vez
      const { data, error } = await supabase
        .from('etiquetas_geradas')
        .insert(etiquetasParaInserir)
        .select()
      
      if (error) {
        console.error('Erro ao registrar etiquetas:', error)
        throw error
      }
      
      console.log(`✅ ${etiquetasParaInserir.length} etiquetas registradas com sucesso`)
      return data
      
    } catch (error) {
      console.error('Erro em EtiquetasService.registrarEtiquetas:', error)
      throw error
    }
  }
  
  // Atualizar status das etiquetas para 'impressa'
  static async marcarComoImpressa(etiquetaIds) {
    try {
      const { data, error } = await supabase
        .from('etiquetas_geradas')
        .update({ 
          status: 'impressa',
          data_hora_impresao: new Date().toISOString()
        })
        .in('id', etiquetaIds)
        .select()
      
      if (error) {
        console.error('Erro ao atualizar status das etiquetas:', error)
        throw error
      }
      
      console.log(`✅ ${etiquetaIds.length} etiquetas marcadas como impressas`)
      return data
      
    } catch (error) {
      console.error('Erro em EtiquetasService.marcarComoImpressa:', error)
      throw error
    }
  }
  
  // Consultar etiquetas por lote
  static async getEtiquetasPorLote(loteUsinagem) {
    try {
      const { data, error } = await supabase
        .from('etiquetas_geradas')
        .select('*')
        .eq('lote_usinagem', loteUsinagem)
        .order('numero_etiqueta', { ascending: true })
      
      if (error) {
        console.error('Erro ao consultar etiquetas por lote:', error)
        throw error
      }
      
      return data
      
    } catch (error) {
      console.error('Erro em EtiquetasService.getEtiquetasPorLote:', error)
      throw error
    }
  }
  
  // Consultar etiquetas por apontamento
  static async getEtiquetasPorApontamento(apontamentoId) {
    try {
      const { data, error } = await supabase
        .from('etiquetas_geradas')
        .select('*')
        .eq('apontamento_id', apontamentoId)
        .order('numero_etiqueta', { ascending: true })
      
      if (error) {
        console.error('Erro ao consultar etiquetas por apontamento:', error)
        throw error
      }
      
      return data
      
    } catch (error) {
      console.error('Erro em EtiquetasService.getEtiquetasPorApontamento:', error)
      throw error
    }
  }
  
  // Consultar etiquetas recentes
  static async getEtiquetasRecentes(limite = 50) {
    try {
      const { data, error } = await supabase
        .from('etiquetas_geradas')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limite)
      
      if (error) {
        console.error('Erro ao consultar etiquetas recentes:', error)
        throw error
      }
      
      return data
      
    } catch (error) {
      console.error('Erro em EtiquetasService.getEtiquetasRecentes:', error)
      throw error
    }
  }
  
  // Verificar se etiquetas já foram impressas para um lote
  static async verificarEtiquetasImpressas(loteUsinagem) {
    try {
      const { data, error } = await supabase
        .from('etiquetas_geradas')
        .select('status, COUNT(*) as quantidade')
        .eq('lote_usinagem', loteUsinagem)
        .group('status')
      
      if (error) {
        console.error('Erro ao verificar status das etiquetas:', error)
        return null
      }
      
      return data
      
    } catch (error) {
      console.error('Erro em EtiquetasService.verificarEtiquetasImpressas:', error)
      return null
    }
  }
  
  // Função auxiliar para extrair ferramenta (copiada de outros arquivos)
  static extrairFerramenta(produto) {
    if (!produto) return ''
    const s = String(produto).toUpperCase()
    const re3 = /^([A-Z]{3})([A-Z0-9]+)/
    const re2 = /^([A-Z]{2})([A-Z0-9]+)/
    let letras = '', resto = '', qtd = 0
    let m = s.match(re3)
    if (m) { letras = m[1]; resto = m[2]; qtd = 3 }
    else {
      m = s.match(re2)
      if (!m) return ''
      letras = m[1]; resto = m[2]; qtd = 4
    }
    let nums = ''
    for (const ch of resto) {
      if (/[0-9]/.test(ch)) nums += ch
      else if (ch === 'O') nums += '0'
      if (nums.length === qtd) break
    }
    if (nums.length < qtd) nums = nums.padEnd(qtd, '0')
    return `${letras}-${nums}`
  }
  
  // Obter estatísticas de etiquetas
  static async getEstatisticas() {
    try {
      const { data, error } = await supabase
        .from('etiquetas_geradas')
        .select('status, COUNT(*) as quantidade')
        .group('status')
      
      if (error) {
        console.error('Erro ao obter estatísticas:', error)
        return null
      }
      
      // Obter total geral
      const { count: total, error: errorTotal } = await supabase
        .from('etiquetas_geradas')
        .select('*', { count: 'exact', head: true })
      
      if (errorTotal) {
        console.error('Erro ao obter total de etiquetas:', errorTotal)
        return null
      }
      
      return {
        por_status: data || [],
        total: total || 0
      }
      
    } catch (error) {
      console.error('Erro em EtiquetasService.getEstatisticas:', error)
      return null
    }
  }
}

export default EtiquetasService
