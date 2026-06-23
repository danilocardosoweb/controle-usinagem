export const CHECKLIST_PRE_INICIO = [
  { id: 'conferir_op', label: 'Conferir OP' },
  { id: 'conferir_perfil', label: 'Conferir perfil' },
  { id: 'conferir_cliente', label: 'Conferir cliente' },
  { id: 'conferir_comprimento', label: 'Conferir comprimento acabado' },
  { id: 'conferir_identificacao', label: 'Conferir identificação do material' },
  { id: 'inspecionar_protecoes', label: 'Inspecionar proteções da serra' },
  { id: 'conferir_disco', label: 'Conferir disco' },
  { id: 'conferir_emergencia', label: 'Conferir botão de emergência' },
  { id: 'regular_medida', label: 'Regular medida de corte' },
  { id: 'produzir_piloto', label: 'Produzir peça piloto' },
  { id: 'medir_primeira_peca', label: 'Medir primeira peça' },
  { id: 'aprovar_primeira_peca', label: 'Aprovar primeira peça', requiresConforme: true },
] as const

export const ETAPAS_PADRAO = [
  { id: 'preparar_material', titulo: 'Preparar material', instrucao: 'Separe o perfil correto e confira a identificação do lote.' },
  { id: 'inspecionar_maquina', titulo: 'Inspecionar máquina', instrucao: 'Confirme proteções, disco, limpeza e botão de emergência.' },
  { id: 'regular_serra', titulo: 'Regular serra', instrucao: 'Ajuste comprimento, batentes e quantidade de cortes por ciclo.' },
  { id: 'cortar_peca_piloto', titulo: 'Cortar peça piloto', instrucao: 'Produza uma peça antes de liberar o lote completo.' },
  { id: 'validar_primeira_peca', titulo: 'Validar primeira peça', instrucao: 'Meça a peça piloto e confirme a tolerância indicada na IT.' },
  { id: 'produzir_lote', titulo: 'Produzir lote', instrucao: 'Mantenha o padrão aprovado e acompanhe a meta de produção.' },
  { id: 'embalar_identificar', titulo: 'Embalar e identificar', instrucao: 'Confira quantidade por pacote e aplique a identificação correta.' },
] as const

export const CRITERIOS_APROVACAO = [
  'Comprimento conforme OP/desenho',
  'Corte limpo',
  'Sem rebarbas excessivas',
  'Sem batidas, riscos críticos ou deformações',
  'Quantidade correta por pacote/amarrado',
  'Identificação aplicada',
]

export const CRITERIOS_REPROVACAO = [
  'Medida fora da tolerância',
  'Batidas',
  'Riscos críticos',
  'Deformações',
  'Falta de identificação',
  'Mistura de itens',
  'Quantidade incorreta',
]
