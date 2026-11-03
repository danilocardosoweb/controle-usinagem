import { supabase } from '../config/supabase'

const mensagemErro = (error) => {
  const texto = String(error?.message || error || 'Erro desconhecido')
  if (texto.includes('excede o saldo')) return texto
  if (texto.includes('romaneio ativo')) return texto
  if (texto.includes('produto, OP ou lote diferente')) return texto
  if (texto.includes('supervisores ou administradores')) return texto
  if (texto.includes('maior que zero')) return 'Informe uma quantidade maior que zero.'
  if (texto.includes('pecas deve ser inteira')) return 'Para unidade PC, informe uma quantidade inteira.'
  return texto
}

const RackTransferenciaService = {
  async listarSaldosApontamento(apontamentoId) {
    const { data, error } = await supabase
      .from('vw_rack_saldos_detalhados')
      .select('*')
      .eq('id', apontamentoId)
      .gt('saldo_quantidade', 0)
      .order('rack_saldo')
    if (error) throw new Error(mensagemErro(error))
    return data || []
  },

  async listarSaldosRack(rack) {
    const normalizado = String(rack || '').trim().toUpperCase()
    if (!normalizado) return []
    const { data, error } = await supabase
      .from('vw_rack_saldos_detalhados')
      .select('*')
      .eq('rack_saldo', normalizado)
      .gt('saldo_quantidade', 0)
      .order('created_at', { ascending: true })
    if (error) throw new Error(mensagemErro(error))
    return data || []
  },

  async listarHistoricoRack(rack) {
    const normalizado = String(rack || '').trim().toUpperCase()
    if (!normalizado) return []
    const { data, error } = await supabase
      .from('vw_rack_historico')
      .select('*')
      .eq('rack', normalizado)
      .order('data_hora', { ascending: false })
    if (error) throw new Error(mensagemErro(error))
    return data || []
  },

  async listarTransferencias(apontamentoId) {
    const { data, error } = await supabase
      .from('rack_transferencias')
      .select('*')
      .eq('apontamento_id', apontamentoId)
      .order('created_at', { ascending: false })
    if (error) throw new Error(mensagemErro(error))
    return data || []
  },

  async registrar(payload) {
    const { data, error } = await supabase.rpc('registrar_transferencia_rack', {
      p_apontamento_id: payload.apontamentoId,
      p_rack_origem: payload.rackOrigem,
      p_rack_destino: payload.rackDestino,
      p_quantidade: payload.quantidade,
      p_peso_kg: payload.pesoKg ?? null,
      p_motivo: payload.motivo,
      p_observacao: payload.observacao || null,
      p_usuario_id: payload.usuarioId,
      p_idempotency_key: payload.idempotencyKey,
      p_permitir_mistura: Boolean(payload.permitirMistura),
    })
    if (error) throw new Error(mensagemErro(error))
    return data
  },

  async estornar(payload) {
    const { data, error } = await supabase.rpc('estornar_transferencia_rack', {
      p_transferencia_id: payload.transferenciaId,
      p_usuario_id: payload.usuarioId,
      p_motivo_estorno: payload.motivo,
      p_observacao_estorno: payload.observacao || null,
      p_idempotency_key: payload.idempotencyKey,
    })
    if (error) throw new Error(mensagemErro(error))
    return data
  },
}

export default RackTransferenciaService
