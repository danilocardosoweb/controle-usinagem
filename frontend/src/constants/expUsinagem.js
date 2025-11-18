export const TABS = ['Resumo', 'TecnoPerfil', 'Alúnica', 'Estoque da Usinagem']

export const TECNOPERFIL_STATUS = [
  {
    key: 'pedido',
    title: 'Pedido',
    badge: 'Materiais Solicitados',
    description: 'Itens que já possuem pedido formal aberto e aguardam avanço na cadeia de produção.',
    accent: 'border-blue-500',
    badgeClass: 'bg-blue-100 text-blue-700'
  },
  {
    key: 'produzido',
    title: 'Produzido',
    badge: 'Disponíveis para Embalar',
    description: 'Materiais produzidos e liberados internamente, prontos para iniciar o processo de embalagem.',
    accent: 'border-emerald-500',
    badgeClass: 'bg-emerald-100 text-emerald-700'
  },
  {
    key: 'inspecao',
    title: 'Inspeção',
    badge: 'Prontos para Auditoria',
    description: 'Lotes separados aguardando inspeção externa ou auditoria de qualidade.',
    accent: 'border-amber-500',
    badgeClass: 'bg-amber-100 text-amber-700'
  },
  {
    key: 'embalagem',
    title: 'Embalagem',
    badge: 'Preparação Final',
    description: 'Itens liberados para montagem de kits, etiquetagem e preparação logística.',
    accent: 'border-cyan-500',
    badgeClass: 'bg-cyan-100 text-cyan-700'
  },
  {
    key: 'expedicao-alu',
    title: 'Expedição Alúnica',
    badge: 'Transferência',
    description: 'Materiais conferidos e prontos para expedição à unidade Alúnica.',
    accent: 'border-purple-500',
    badgeClass: 'bg-purple-100 text-purple-700'
  },
  {
    key: 'expedicao-cliente',
    title: 'Expedição Cliente',
    badge: 'Entrega Final',
    description: 'Itens embalados e conferidos aguardando transporte para o cliente final.',
    accent: 'border-indigo-500',
    badgeClass: 'bg-indigo-100 text-indigo-700'
  }
]

export const ALUNICA_STATUS = [
  {
    key: 'estoque',
    title: 'Material em Estoque',
    badge: 'Recebidos da TecnoPerfil',
    description: '',
    accent: 'border-sky-500',
    badgeClass: 'bg-sky-100 text-sky-700'
  },
  {
    key: 'para-usinar',
    title: 'Material para Usinar',
    badge: 'Programado',
    description: '',
    accent: 'border-cyan-500',
    badgeClass: 'bg-cyan-100 text-cyan-700'
  },
  {
    key: 'para-inspecao',
    title: 'Material para Inspeção',
    badge: 'Aguardando Conferência',
    description: '',
    accent: 'border-amber-500',
    badgeClass: 'bg-amber-100 text-amber-700'
  },
  {
    key: 'para-embarque',
    title: 'Material para Embalagem',
    badge: 'Preparação Final',
    description: '',
    accent: 'border-violet-500',
    badgeClass: 'bg-violet-100 text-violet-700'
  },
  {
    key: 'expedicao-tecno',
    title: 'Expedição TecnoPerfil',
    badge: 'Transferência',
    description: '',
    accent: 'border-rose-500',
    badgeClass: 'bg-rose-100 text-rose-700'
  }
]

export const STATUS_TABS = {
  Resumo: [...TECNOPERFIL_STATUS, ...ALUNICA_STATUS],
  TecnoPerfil: TECNOPERFIL_STATUS,
  'Alúnica': ALUNICA_STATUS
}

export const RESUMO_THEME = {
  blue: {
    bubbleActive: 'bg-blue-600 text-white',
    bubbleInactive: 'bg-blue-100 text-blue-700',
    line: 'bg-blue-100',
    statPanel: 'bg-blue-50 border border-blue-100 text-blue-700',
    badge: 'bg-blue-50 text-blue-700',
    gradient: 'from-blue-500 via-blue-400 to-blue-500'
  },
  purple: {
    bubbleActive: 'bg-purple-600 text-white',
    bubbleInactive: 'bg-purple-100 text-purple-700',
    line: 'bg-purple-100',
    statPanel: 'bg-purple-50 border border-purple-100 text-purple-700',
    badge: 'bg-purple-50 text-purple-700',
    gradient: 'from-purple-500 via-purple-400 to-purple-500'
  }
}

export const FINAL_STAGE_KEY = 'finalizado'

export const TECNO_STAGE_KEYS = TECNOPERFIL_STATUS.map((item) => item.key)
export const DEFAULT_STAGE = 'pedido'
export const WORKFLOW_STORAGE_KEY = 'exp_usinagem_tecnoperfil_stages_v1'

export const STATUS_LABEL = TECNOPERFIL_STATUS.reduce((map, item) => {
  map[item.key] = item.title
  return map
}, /** @type {Record<string,string>} */ ({}))

STATUS_LABEL[FINAL_STAGE_KEY] = 'Finalizado'

export const STAGE_DB_MAP = {
  pedido: 'pedido',
  produzido: 'produzido',
  inspecao: 'inspecao',
  embalagem: 'embalagem',
  'expedicao-alu': 'expedicao_alu',
  'expedicao-cliente': 'expedicao_cliente',
  [FINAL_STAGE_KEY]: 'finalizado'
}

const DB_STAGE_TO_UI_MAP = Object.entries(STAGE_DB_MAP).reduce((acc, [uiStage, dbStage]) => {
  acc[dbStage] = uiStage
  return acc
}, /** @type {Record<string,string>} */ ({}))

export const mapStageFromDb = (stage) => {
  if (!stage) return DEFAULT_STAGE
  return DB_STAGE_TO_UI_MAP[stage] || (TECNO_STAGE_KEYS.includes(stage) ? stage : DEFAULT_STAGE)
}

export const mapStageToDb = (stage) => {
  if (!stage) return STAGE_DB_MAP[DEFAULT_STAGE]
  return STAGE_DB_MAP[stage] || stage
}

export const ALUNICA_STAGE_KEYS = ALUNICA_STATUS.map((item) => item.key)
export const ALUNICA_DEFAULT_STAGE = 'estoque'
export const ALUNICA_STORAGE_KEY = 'exp_usinagem_alunica_stages_v1'
export const FINALIZADOS_STORAGE_KEY = 'exp_usinagem_finalizados_v1'

export const STAGE_ACTIONS = {
  pedido: [
    { to: 'produzido', label: 'Avançar para Produzido', tone: 'primary' }
  ],
  produzido: [
    { to: 'pedido', label: 'Revisar Pedido', tone: 'ghost' },
    { to: 'inspecao', label: 'Enviar para Inspeção', tone: 'primary' }
  ],
  inspecao: [
    { to: 'produzido', label: 'Retornar para Produzido', tone: 'ghost' },
    { to: 'embalagem', label: 'Mover para Embalagem', tone: 'primary' },
    { to: 'expedicao-alu', label: 'Expedir para Alúnica', tone: 'purple' },
    { to: 'expedicao-cliente', label: 'Expedir para Cliente', tone: 'indigo' }
  ],
  embalagem: [
    { to: 'inspecao', label: 'Reabrir Inspeção', tone: 'ghost' },
    { to: 'expedicao-alu', label: 'Expedir para Alúnica', tone: 'purple' },
    { to: 'expedicao-cliente', label: 'Expedir para Cliente', tone: 'indigo' }
  ],
  'expedicao-alu': [
    { to: 'embalagem', label: 'Retornar para Embalagem', tone: 'ghost' },
    { to: '__alunica__', label: 'Enviar para Alúnica', tone: 'primary' }
  ],
  'expedicao-cliente': [
    { to: 'pedido', label: 'Reiniciar Fluxo', tone: 'ghost' },
    { to: '__finalizar__', label: 'Finalizar Pedido', tone: 'indigo' }
  ]
}

export const ALUNICA_ACTIONS = {
  estoque: [
    { to: 'para-usinar', label: 'Programar Usinagem', tone: 'primary' }
  ],
  'para-usinar': [
    { to: 'estoque', label: 'Devolver ao Estoque', tone: 'ghost' }
  ],
  'para-inspecao': [
    { to: 'para-usinar', label: 'Ajustar Programação', tone: 'ghost' },
    { to: 'para-embarque', label: 'Aprovar Inspeção e Embalar', tone: 'primary' }
  ],
  'para-embarque': [
    { to: 'para-inspecao', label: 'Reabrir Inspeção', tone: 'ghost' },
    { to: 'expedicao-tecno', label: 'Preparar Expedição', tone: 'primary' }
  ],
  'expedicao-tecno': [
    { to: 'para-embarque', label: 'Reabrir Embarque', tone: 'ghost' },
    { to: '__finalizar__', label: 'Finalizar Transferência', tone: 'indigo' }
  ]
}

export const INITIAL_MANUAL_PEDIDO = {
  pedido: '',
  cliente: '',
  numeroPedido: '',
  dataEntrega: '',
  ferramenta: '',
  pedidoKg: '',
  pedidoPc: ''
}

export const EMPTY_MESSAGES = {
  pedido: '',
  produzido: '',
  inspecao: '',
  embalagem: '',
  'expedicao-alu': '',
  'expedicao-cliente': ''
}
