const normalizar = valor => String(valor ?? '').trim().toUpperCase()

export const obterRackRomaneio = item => normalizar(
  item.rack_saldo || item.rack_acabado || item.rackAcabado || item.rack_ou_pallet || item.rackOuPallet || item.rack
)

export const possuiQuantidadePositiva = item => {
  const quantidade = Number(item.quantidade)
  return Number.isFinite(quantidade) && quantidade > 0
}

const lotesExternos = item => [...new Set([
  item.lote_externo, item.loteExterno, ...(Array.isArray(item.lotes_externos) ? item.lotes_externos : [])
].map(valor => String(valor ?? '').trim()).filter(lote => lote && lote !== '-' && !/^0+$/.test(lote)))]

export const obterLoteExterno = item => lotesExternos(item).join(', ')

function chaveItem(item) {
  const rack = obterRackRomaneio(item)
  const produto = normalizar(item.produto || item.codigoPerfil)
  const pedido = normalizar(item.pedido_seq || item.ordem_trabalho || item.ordemTrabalho)
  const cliente = normalizar(item.cliente)
  if ([rack, produto, pedido, cliente].some(valor => !valor || valor === '-')) return null
  const unidade = normalizar(item.unidade)
  const unidadeComparacao = ['KG', 'KGS', 'QUILO', 'QUILOS'].includes(unidade) ? 'KG'
    : ['', 'PC', 'PCS', 'PÇ', 'PÇS', 'PEÇA', 'PEÇAS', 'PECA', 'PECAS'].includes(unidade) ? 'PC' : unidade
  return JSON.stringify([item.romaneio_id ?? null, rack, produto, pedido, cliente, unidadeComparacao])
}

export function prepararItensRomaneio(itens = []) {
  const positivos = itens.filter(possuiQuantidadePositiva)
  const grupos = new Map()
  for (const item of itens) {
    const chave = chaveItem(item)
    if (!chave) continue
    if (!grupos.has(chave)) grupos.set(chave, { positivos: 0, lotes: new Set() })
    const grupo = grupos.get(chave)
    if (possuiQuantidadePositiva(item)) {
      grupo.positivos++
    } else {
      // Saldo zerado por sucata ou transferencia nao faz do apontamento uma correcao zerada.
      const quantidadeOriginal = Object.hasOwn(item, 'quantidade_bruta') ? item.quantidade_bruta : item.quantidade
      if (quantidadeOriginal == null || String(quantidadeOriginal).trim() === '' || Number(quantidadeOriginal) !== 0) continue
      if (Number(item.quantidade_sucateada_rack) > 0 || item.ultima_movimentacao_em) continue
      lotesExternos(item).forEach(lote => grupo.lotes.add(lote))
    }
  }
  return positivos.map(item => {
    if (obterLoteExterno(item)) return item
    const grupo = grupos.get(chaveItem(item))
    if (grupo?.positivos !== 1 || grupo.lotes.size !== 1) return item
    return { ...item, lote_externo: [...grupo.lotes][0] }
  })
}
