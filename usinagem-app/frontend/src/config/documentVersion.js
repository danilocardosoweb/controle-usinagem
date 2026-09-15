export const DOCUMENT_VERSION = '01'
export const DOCUMENT_VERSION_DATE = '01/01/2026'
export const DOCUMENT_VERSION_LABEL = `Versão ${DOCUMENT_VERSION} - ${DOCUMENT_VERSION_DATE}`

const criarControleFormulario = (codigo, titulo) => ({
  codigo,
  titulo,
  tituloCompleto: `${codigo} | ${titulo}`,
  revisao: '00',
  elaboradoEm: '13/01/2026',
  revisadoEm: '00/00/0000',
  controle: `${codigo}, revisão: 00, Elaboração em: 13/01/2026, Revisado em: 00/00/0000`
})

export const FORMULARIO_INSPECAO_QUALIDADE = criarControleFormulario(
  'FORM-055',
  'FOLHA DE INSPEÇÃO DE QUALIDADE'
)

export const FORMULARIO_IDENTIFICACAO_MATERIAL = criarControleFormulario(
  'FORM-056',
  'FOLHA DE IDENTIFICAÇÃO DE MATERIAL CORTADO'
)
