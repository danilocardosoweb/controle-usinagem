export interface ParsedITWordData {
  cliente?: string
  codigoPerfil?: string
  codigoCliente?: string
  comprimentoAcabadoMm?: number
  arquivoIt?: string
  pecasPorPacote?: number
  quantidadeAmarrados?: number
  totalPecas?: number
  produtividadePadraoPcsHora?: number
  objetivo?: string
  aplicacaoResponsaveis?: string
  equipamentos?: string[]
  materiais?: string[]
  episObrigatorios?: string[]
  procedimentoOperacional?: Array<{ id: string; titulo: string; instrucao: string }>
  criteriosAprovacao?: string[]
  criteriosReprovacao?: string[]
  rawText: string
  warnings: string[]
}

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

const parseNumber = (value?: string): number | undefined => {
  if (!value) return undefined
  const match = value.replace(/\./g, '').replace(',', '.').match(/-?\d+(?:\.\d+)?/)
  if (!match) return undefined
  const parsed = Number(match[0])
  return Number.isFinite(parsed) ? parsed : undefined
}

const splitList = (value?: string): string[] => {
  if (!value) return []
  return value
    .split(/;|\n|•/g)
    .map(item => item.replace(/^\s*[-–•]\s*/, '').trim())
    .filter(Boolean)
}

const cleanListLine = (value: string) => value.replace(/^\s*(?:[-–•]|\d+\.)\s*/, '').trim()

const getValueAfterLabel = (lines: string[], labels: string[]) => {
  const normalizedLabels = labels.map(normalize)
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const normalizedLine = normalize(line)
    const foundLabel = normalizedLabels.find(label => normalizedLine === label || normalizedLine.startsWith(label))
    if (!foundLabel) continue

    const exactLabel = labels[normalizedLabels.indexOf(foundLabel)]
    const inlineValue = line.slice(exactLabel.length).trim()
    if (inlineValue) return inlineValue

    const next = lines[index + 1]?.trim()
    if (next && !/^\d+\.\s/.test(next)) return next
  }
  return ''
}

const findSection = (lines: string[], startsWith: string) => {
  const startKey = normalize(startsWith)
  const start = lines.findIndex(line => normalize(line).startsWith(startKey))
  if (start < 0) return []
  const end = lines.findIndex((line, index) => index > start && /^\d+\.\s/.test(line.trim()))
  return lines.slice(start + 1, end < 0 ? undefined : end).map(line => line.trim()).filter(Boolean)
}

const parseProcedure = (lines: string[]) =>
  lines
    .filter(line => /^\d+\.\s/.test(line.trim()))
    .map((line, index) => {
      const instrucao = cleanListLine(line)
      const titulo = instrucao.split(/[.;:]/)[0]?.trim() || `Etapa ${index + 1}`
      return {
        id: `word_${index + 1}`,
        titulo: titulo.length > 58 ? `Etapa ${index + 1}` : titulo,
        instrucao,
      }
    })

const extractItensSectionValue = (sectionLines: string[], label: string) => {
  const labelIndex = sectionLines.findIndex(line => normalize(line) === normalize(label))
  if (labelIndex < 0) return ''
  return sectionLines[labelIndex + 1]?.trim() || ''
}

export const parseITWordFile = async (file: File): Promise<ParsedITWordData> => {
  const mammoth = (await import('mammoth/mammoth.browser')).default
  const arrayBuffer = await file.arrayBuffer()
  const { value } = await mammoth.extractRawText({ arrayBuffer })
  const lines = value.split(/\r?\n/g).map(line => line.trim()).filter(Boolean)
  const dadosItem = findSection(lines, '4. DADOS DO ITEM')
  const procedimento = findSection(lines, '5. PROCEDIMENTO OPERACIONAL')
  const aprovacao = findSection(lines, '6. CRITERIOS DE APROVACAO').length
    ? findSection(lines, '6. CRITERIOS DE APROVACAO')
    : findSection(lines, '6. CRITÉRIOS DE APROVAÇÃO')
  const reprovacao = findSection(lines, '7. CRITERIOS DE REPROVACAO').length
    ? findSection(lines, '7. CRITERIOS DE REPROVACAO')
    : findSection(lines, '7. CRITÉRIOS DE REPROVAÇÃO')

  const equipamentos = getValueAfterLabel(lines, ['Equipamentos'])
  const materiais = getValueAfterLabel(lines, ['Materiais'])
  const epis = getValueAfterLabel(lines, ['EPI obrigatorio', 'EPI obrigatório'])
  const aplicacao = findSection(lines, '2. APLICACAO E RESPONSAVEIS').length
    ? findSection(lines, '2. APLICACAO E RESPONSAVEIS')
    : findSection(lines, '2. APLICAÇÃO E RESPONSÁVEIS')

  const parsed: ParsedITWordData = {
    cliente: getValueAfterLabel(lines, ['Cliente']),
    codigoPerfil: getValueAfterLabel(lines, ['Perfil']),
    comprimentoAcabadoMm: parseNumber(getValueAfterLabel(lines, ['Comprimento acabado'])),
    arquivoIt: getValueAfterLabel(lines, ['Arquivo/IT']) || file.name.replace(/\.docx$/i, ''),
    pecasPorPacote: parseNumber(extractItensSectionValue(dadosItem, 'Peças por pacote')),
    quantidadeAmarrados: parseNumber(extractItensSectionValue(dadosItem, 'Quantidade de amarrados')),
    totalPecas: parseNumber(extractItensSectionValue(dadosItem, 'Total de peças')),
    produtividadePadraoPcsHora: parseNumber(extractItensSectionValue(dadosItem, 'Produtividade Pçs Por hora')),
    objetivo: findSection(lines, '1. OBJETIVO').join('\n'),
    aplicacaoResponsaveis: aplicacao.join('\n'),
    equipamentos: splitList(equipamentos),
    materiais: splitList(materiais),
    episObrigatorios: splitList(epis),
    procedimentoOperacional: parseProcedure(procedimento),
    criteriosAprovacao: aprovacao.map(cleanListLine).filter(Boolean),
    criteriosReprovacao: reprovacao.map(cleanListLine).filter(Boolean),
    rawText: value,
    warnings: [],
  }

  if (!parsed.pecasPorPacote) parsed.warnings.push('Nao encontrei "Pecas por pacote" no Word.')
  if (!parsed.comprimentoAcabadoMm) parsed.warnings.push('Nao encontrei "Comprimento acabado" no Word.')
  if (!parsed.procedimentoOperacional?.length) parsed.warnings.push('Nao encontrei o procedimento operacional no Word.')

  return parsed
}
