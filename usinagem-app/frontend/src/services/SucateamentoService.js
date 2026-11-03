import { supabase } from '../config/supabase'

const traduzirErro = (error) => {
  const mensagem = String(error?.message || error || 'Erro desconhecido')
  if (mensagem.includes('excede o saldo')) return 'A quantidade informada excede o saldo disponível deste apontamento.'
  if (mensagem.includes('maior que zero')) return 'Informe uma quantidade maior que zero.'
  if (mensagem.includes('pecas deve ser inteira')) return 'Para unidade PC, informe uma quantidade inteira.'
  if (mensagem.includes('supervisores ou administradores')) return mensagem
  return mensagem
}

const SucateamentoService = {
  async listar(apontamentoId) {
    const { data, error } = await supabase
      .from('apontamentos_sucata')
      .select('*')
      .eq('apontamento_id', apontamentoId)
      .order('created_at', { ascending: false })
    if (error) throw new Error(traduzirErro(error))
    return data || []
  },

  async registrar(payload) {
    const { data, error } = await supabase.rpc('registrar_sucateamento_apontamento', {
      p_apontamento_id: payload.apontamentoId,
      p_quantidade: payload.quantidade,
      p_peso_sucateado_kg: payload.pesoSucateadoKg ?? null,
      p_peso_produzido_original_kg: payload.pesoProduzidoOriginalKg ?? null,
      p_motivo_codigo: payload.motivoCodigo,
      p_categoria_motivo: payload.categoriaMotivo,
      p_observacao: payload.observacao || null,
      p_origem_reprovacao: payload.origemReprovacao,
      p_evidencia_url: payload.evidenciaUrl || null,
      p_usuario_solicitante: payload.usuarioSolicitante,
      p_usuario_responsavel: payload.usuarioResponsavel,
      p_rack_ou_pallet: payload.rackOuPallet || null,
    })
    if (error) throw new Error(traduzirErro(error))
    return data
  },

  async estornar({ sucateamentoId, usuarioResponsavel, motivo, observacao }) {
    const { data, error } = await supabase.rpc('estornar_sucateamento_apontamento', {
      p_sucateamento_id: sucateamentoId,
      p_usuario_responsavel: usuarioResponsavel,
      p_motivo_estorno: motivo,
      p_observacao_estorno: observacao || null,
    })
    if (error) throw new Error(traduzirErro(error))
    return data
  },
}

export default SucateamentoService
