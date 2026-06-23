import { supabase } from '../../config/supabase'
import { CRITERIOS_APROVACAO, CRITERIOS_REPROVACAO, ETAPAS_PADRAO } from './constants'
import type { CriarITInput, ITDigital, ITExecucao, ItemCorteContext, MaquinaContext, OperadorContext } from './types'

const TABLE_MISSING_CODES = new Set(['42P01', 'PGRST205', 'PGRST204'])

export class ITDigitalSchemaError extends Error {
  constructor(message = 'As tabelas da IT Digital ainda nao foram criadas no Supabase.') {
    super(message)
    this.name = 'ITDigitalSchemaError'
  }
}

const handleError = (error: any): never => {
  if (TABLE_MISSING_CODES.has(String(error?.code || '')) || /could not find|does not exist|schema cache/i.test(String(error?.message || ''))) {
    throw new ITDigitalSchemaError()
  }
  throw new Error(error?.message || 'Nao foi possivel acessar a IT Digital.')
}

export const buscarITDoItem = async (codigoItem: string, comprimentoMm: number): Promise<ITDigital | null> => {
  const { data, error } = await supabase
    .from('it_digitais')
    .select('*')
    .eq('codigo_item', codigoItem)
    .eq('comprimento_acabado_mm', comprimentoMm)
    .eq('ativo', true)
    .order('versao', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) handleError(error)
  return data as ITDigital | null
}

export const criarIT = async (input: CriarITInput, usuarioId?: string | number): Promise<ITDigital> => {
  const { data: versoes, error: versaoError } = await supabase
    .from('it_digitais')
    .select('versao')
    .eq('codigo_item', input.codigo_item)
    .eq('comprimento_acabado_mm', input.comprimento_acabado_mm)
    .order('versao', { ascending: false })
    .limit(1)
  if (versaoError) handleError(versaoError)
  const proximaVersao = Number(versoes?.[0]?.versao || 0) + 1

  const payload = {
    ...input,
    objetivo: input.objetivo || 'Executar o corte com seguranca, qualidade e rastreabilidade.',
    aplicacao_responsaveis: input.aplicacao_responsaveis || 'Operadores habilitados da Serra Doppia 2 Cabecas.',
    equipamentos: input.equipamentos?.length ? input.equipamentos : ['Serra Doppia 2 Cabecas', 'Paquimetro ou trena calibrada'],
    materiais: input.materiais?.length ? input.materiais : ['Perfil identificado conforme OP'],
    epis_obrigatorios: input.epis_obrigatorios?.length ? input.epis_obrigatorios : ['Oculos de seguranca', 'Protetor auricular', 'Calcado de seguranca'],
    procedimento_operacional: input.procedimento_operacional?.length ? input.procedimento_operacional : ETAPAS_PADRAO,
    criterios_aprovacao: input.criterios_aprovacao?.length ? input.criterios_aprovacao : CRITERIOS_APROVACAO,
    criterios_reprovacao: input.criterios_reprovacao?.length ? input.criterios_reprovacao : CRITERIOS_REPROVACAO,
    status: 'ativa',
    versao: proximaVersao,
    ativo: true,
    criado_por: usuarioId ? String(usuarioId) : null,
    atualizado_por: usuarioId ? String(usuarioId) : null,
  }

  const { data, error } = await supabase.from('it_digitais').insert(payload).select('*').single()
  if (error) handleError(error)
  return data as ITDigital
}

export const buscarHistoricoIT = async (codigoItem: string, limite = 8): Promise<ITExecucao[]> => {
  const { data, error } = await supabase
    .from('it_execucoes')
    .select('*')
    .eq('codigo_item', codigoItem)
    .order('aberta_em', { ascending: false })
    .limit(limite)

  if (error) handleError(error)
  return (data || []) as ITExecucao[]
}

export const abrirOuReutilizarExecucao = async (
  it: ITDigital,
  item: ItemCorteContext,
  operador: OperadorContext,
  maquina: MaquinaContext,
): Promise<ITExecucao> => {
  let query = supabase
    .from('it_execucoes')
    .select('*')
    .eq('it_id', it.id)
    .eq('item_id', item.itemId)
    .in('status_final', ['aberta', 'pronta', 'em_producao'])
    .order('aberta_em', { ascending: false })
    .limit(1)

  if (operador.id != null) query = query.eq('operador_id', String(operador.id))
  const { data: existente, error: buscaError } = await query.maybeSingle()
  if (buscaError) handleError(buscaError)
  if (existente) return existente as ITExecucao

  const { data, error } = await supabase.from('it_execucoes').insert({
    it_id: it.id,
    item_id: item.itemId,
    codigo_item: item.codigoItem,
    pedido_seq: item.pedidoSeq || null,
    operador_id: operador.id != null ? String(operador.id) : null,
    operador_nome: operador.nome || 'Operador nao identificado',
    maquina_id: maquina.id != null ? String(maquina.id) : null,
    maquina_nome: maquina.nome || null,
    checklist: {},
    etapas_concluidas: [],
    status_final: 'aberta',
  }).select('*').single()

  if (error) handleError(error)
  return data as ITExecucao
}

export const atualizarExecucao = async (id: string, patch: Partial<ITExecucao>): Promise<ITExecucao> => {
  const { data, error } = await supabase
    .from('it_execucoes')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single()

  if (error) handleError(error)
  return data as ITExecucao
}
