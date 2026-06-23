export type ITStatus = 'rascunho' | 'ativa' | 'inativa'
export type ExecucaoStatus = 'aberta' | 'pronta' | 'em_producao' | 'finalizada' | 'bloqueada'
export type ValidacaoStatus = 'pendente' | 'conforme' | 'fora_tolerancia'

export interface ItemCorteContext {
  itemId: string
  codigoItem: string
  codigoPerfil: string
  cliente: string
  comprimentoAcabado: number
  totalPecas: number
  pedidoSeq: string
  numeroOp?: string
  perfilLongo?: string
  pecasPorPacote?: number
  quantidadeAmarrados?: number
  tempoCicloSeg?: number
  setupMinutos?: number
  cortesPorCiclo?: number
  produtividadePadrao?: number
  avancoMaquina?: number
  barraOriginalMm?: number
  arquivoItUrl?: string
}

export interface ITDigital {
  id: string
  codigo_item: string
  codigo_perfil: string
  cliente: string | null
  comprimento_acabado_mm: number
  tolerancia_menos_mm: number
  tolerancia_mais_mm: number
  pecas_por_pacote: number | null
  quantidade_amarrados: number | null
  total_pecas: number | null
  tempo_ciclo_seg: number | null
  setup_minutos: number | null
  cortes_por_ciclo: number | null
  produtividade_padrao_pcs_hora: number | null
  avanco_maquina: number | null
  barra_original_mm: number | null
  sobra_mm: number | null
  arquivo_it_url: string | null
  objetivo: string | null
  aplicacao_responsaveis: string | null
  equipamentos: string[]
  materiais: string[]
  epis_obrigatorios: string[]
  procedimento_operacional: Array<{ id: string; titulo: string; instrucao: string }>
  criterios_aprovacao: string[]
  criterios_reprovacao: string[]
  status: ITStatus
  versao: number
  created_at: string
  updated_at: string
}

export interface ITExecucao {
  id: string
  it_id: string
  item_id: string
  codigo_item: string
  pedido_seq: string | null
  operador_id: string | null
  operador_nome: string
  maquina_id: string | null
  maquina_nome: string | null
  aberta_em: string
  iniciada_em: string | null
  finalizada_em: string | null
  checklist: Record<string, boolean>
  checklist_concluido: boolean
  medida_primeira_peca_mm: number | null
  status_validacao_dimensional: ValidacaoStatus
  etapas_concluidas: string[]
  observacoes: string | null
  status_final: ExecucaoStatus
}

export interface OperadorContext {
  id?: string | number
  nome?: string
}

export interface MaquinaContext {
  id?: string | number
  nome?: string
}

export interface CriarITInput {
  codigo_item: string
  codigo_perfil: string
  cliente: string
  comprimento_acabado_mm: number
  tolerancia_menos_mm: number
  tolerancia_mais_mm: number
  pecas_por_pacote: number
  quantidade_amarrados: number
  total_pecas: number
  tempo_ciclo_seg: number
  setup_minutos: number
  cortes_por_ciclo: number
  produtividade_padrao_pcs_hora: number
  avanco_maquina: number | null
  barra_original_mm: number | null
  sobra_mm: number | null
  arquivo_it_url: string | null
  objetivo?: string | null
  aplicacao_responsaveis?: string | null
  equipamentos?: string[]
  materiais?: string[]
  epis_obrigatorios?: string[]
  procedimento_operacional?: Array<{ id: string; titulo: string; instrucao: string }>
  criterios_aprovacao?: string[]
  criterios_reprovacao?: string[]
}
