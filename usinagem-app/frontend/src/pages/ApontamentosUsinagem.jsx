import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext' // Importando o contexto de autenticação
import { useDatabase } from '../hooks/useDatabase'
import { FaSearch, FaFilePdf, FaBroom, FaListUl, FaPlus, FaCopy } from 'react-icons/fa'

// Constrói URL HTTP para abrir PDF via backend, codificando caminho base e arquivo
const buildHttpPdfUrl = (basePath, fileName) => {
  const backend = (import.meta?.env?.VITE_BACKEND_URL || 'http://localhost:8000').replace(/\/+$/, '')
  const safeBase = String(basePath || '').replace(/[\\/]+$/, '')
  const safeFile = String(fileName || '')
  return `${backend}/api/files/pdf/${encodeURIComponent(safeFile)}?base=${encodeURIComponent(safeBase)}`
}

const copyToClipboard = async (text) => {
  try { await navigator.clipboard.writeText(text); alert('Copiado para a área de transferência:\n' + text) }
  catch { alert('Não foi possível copiar para a área de transferência.') }
}

// Constrói URL local file:///U:/... para abrir direto no navegador
const buildLocalFileUrl = (basePath, fileName) => {
  const safeBase = String(basePath || '').replace(/[\\/]+$/, '')
  const safeFile = String(fileName || '')
  const full = `${safeBase}\\${safeFile}`
  const asSlash = full.replace(/\\/g, '/')
  return `file:///${asSlash}`
}

// Abre uma URL em nova aba; se o navegador bloquear file:///, copia o caminho e alerta o usuário
const tryOpenInNewTab = async (url, fallbackPathText) => {
  try {
    const w = window.open(url, '_blank', 'noopener,noreferrer')
    // Alguns navegadores retornam null quando bloqueiam a abertura
    if (!w || w.closed || typeof w.closed === 'undefined') {
      if (fallbackPathText) {
        try { await navigator.clipboard.writeText(fallbackPathText) } catch {}
      }
      alert('O navegador bloqueou a abertura direta do arquivo local. O caminho foi copiado para a área de transferência. Cole no Explorer para abrir:\n' + (fallbackPathText || url))
    }
  } catch (e) {
    if (fallbackPathText) {
      try { await navigator.clipboard.writeText(fallbackPathText) } catch {}
    }
    alert('Não foi possível abrir o arquivo. Caminho copiado para a área de transferência:\n' + (fallbackPathText || url))
  }
}

const ApontamentosUsinagem = () => {
  const { user } = useAuth() // Obtendo o usuário logado
  const { items: pedidosDB, loading: carregandoPedidos } = useDatabase('pedidos', true)
  const { items: apontamentosDB, addItem: addApont } = useDatabase('apontamentos', true)
  // Lotes importados (Dados • Lotes)
  const { items: lotesDB } = useDatabase('lotes', false)
  const STORAGE_KEY = 'apont_usinagem_draft'
  const [formData, setFormData] = useState({
    operador: user ? user.nome : '',
    maquina: '',
    codigoPerfil: '',
    ordemTrabalho: '',
    inicio: '',
    fim: '',
    quantidade: '',
    qtdPedido: '',
    perfilLongo: '',
    separado: '',
    cliente: '',
    pedidoCliente: '',
    dtFatura: '',
    unidade: '',
    comprimentoAcabado: '',
    nroOp: '',
    observacoes: '',
    romaneioNumero: '',
    loteExterno: '', // compat: primeiro lote
    lotesExternos: [] // novo: lista de lotes
  })

  // Estados do contador de tempo
  const [timerOn, setTimerOn] = useState(false)
  const [timerStart, setTimerStart] = useState(null) // Date
  const [nowTick, setNowTick] = useState(Date.now())

  // Tick do relógio quando ligado
  useEffect(() => {
    if (!timerOn) return
    const id = setInterval(() => setNowTick(Date.now()), 1000)
    return () => clearInterval(id)
  }, [timerOn])

  // Inicia o contador, definindo início se vazio
  const handleStartTimer = () => {
    if (!formData.ordemTrabalho) {
      alert('Selecione um Pedido/Seq antes de iniciar o contador.')
      return
    }
    const startInput = formData.inicio || getNowLocalInput()
    const d = parseLocalInputToDate(startInput) || new Date()
    setFormData(prev => ({ ...prev, inicio: startInput }))
    setTimerStart(d)
    setTimerOn(true)
  }

  // Gera o código de lote: Data (DDMMYYYY) + Hora/Min (HHMM) + Romaneio + Lote Externo + Pedido.Cliente + Nº OP
  const gerarCodigoLote = () => {
    const d = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    const dia = pad(d.getDate())
    const mes = pad(d.getMonth() + 1)
    const ano = String(d.getFullYear())
    const data = `${dia}${mes}${ano}`
    const hora = pad(d.getHours())
    const min = pad(d.getMinutes())
    const hm = `${hora}${min}`
    const rom = (formData.romaneioNumero || '').toString().trim().replace(/\s+/g, '')
    const loteExt = (formData.lotesExternos && formData.lotesExternos.length > 0 ? formData.lotesExternos[0] : formData.loteExterno || '').toString().trim().replace(/\s+/g, '')
    const pedCli = (formData.pedidoCliente || '').toString().trim().replace(/\s+/g, '')
    const nro = (formData.nroOp || '').toString().trim().replace(/\s+/g, '')
    const base = `${data}-${hm}-${rom}-${loteExt}-${pedCli}-${nro}`
    return base.replace(/[^A-Za-z0-9_-]/g, '-')
  }

  // Cria conteúdo HTML estilizado para o formulário e dispara download .doc
  const imprimirDocumentoIdentificacao = (lote, quantidade, rackOuPalletValor) => {
    const cliente = formData.cliente || ''
    const item = formData.codigoPerfil || ''
    const itemCli = formData.perfilLongo || '' // se existir no futuro 'item_do_cliente', trocar aqui
    const medida = formData.comprimentoAcabado || ''
    const pedidoTecno = formData.ordemTrabalho || ''
    const pedidoCli = formData.pedidoCliente || ''
    const qtde = quantidade || ''
    const pallet = rackOuPalletValor || ''

    const html = `<!DOCTYPE html>
    <html><head><meta charset="utf-8" />
    <style>
      @page { size: A4 landscape; margin: 12mm; }
      body { font-family: Arial, Helvetica, sans-serif; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .header { text-align: center; margin-bottom: 10mm; }
      .logo { height: 18mm; object-fit: contain; }
      .titulo { font-size: 26pt; font-weight: 800; }
      .sub { margin-top: 4mm; font-size: 12pt; font-weight: 700; }
      table { width: 100%; border-collapse: separate; border-spacing: 0 12mm; }
      th, td { vertical-align: bottom; }
      .label { font-weight: 800; font-size: 18pt; white-space: nowrap; padding-right: 6mm; }
      .valor { border-bottom: 3px solid #000; font-size: 18pt; padding: 0 3mm; height: 14mm; }
      .dupla td { width: 50%; }
      .lote { font-weight: 700; font-size: 14pt; }
    </style>
    </head><body>
      <div class="header">
        <div class="titulo">Formulário de Identificação do Material Cortado</div>
        <div class="sub">Lote: ${lote}</div>
      </div>
      <table>
        <tr>
          <td class="label">CLIENTE:</td>
          <td class="valor">${cliente}</td>
        </tr>
        <tr>
          <td class="label">ITEM:</td>
          <td class="valor">${item}</td>
        </tr>
        <tr>
          <td class="label">ITEM CLI:</td>
          <td class="valor">${itemCli}</td>
        </tr>
        <tr>
          <td class="label">MEDIDA:</td>
          <td class="valor">${medida}</td>
        </tr>
        <tr>
          <td class="label">PEDIDO TECNO:</td>
          <td class="valor">${pedidoTecno}</td>
        </tr>
        <tr class="dupla">
          <td>
            <span class="label">QTDE:</span>
            <span class="valor" style="display:inline-block; min-width:60mm;">${qtde}</span>
          </td>
          <td>
            <span class="label">PALET:</span>
            <span class="valor" style="display:inline-block; min-width:60mm;">${pallet}</span>
          </td>
        </tr>
        <tr>
          <td class="label">PEDIDO CLI:</td>
          <td class="valor">${pedidoCli}</td>
        </tr>
      </table>
    </body></html>`

    // Criar blob .doc (Word abre HTML com extensão .doc)
    const blob = new Blob([html], { type: 'application/msword' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `identificacao_${lote}.doc`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Finaliza o contador e pergunta se usa o tempo no apontamento
  const handleStopTimer = () => {
    const end = new Date()
    const start = timerStart || parseLocalInputToDate(formData.inicio)
    if (!start) {
      setTimerOn(false)
      setTimerStart(null)
      return
    }
    const diffMin = Math.round((end - start) / 60000)
    const msg = `Deseja utilizar este tempo no apontamento?\n\nInício: ${start.toLocaleString('pt-BR')}\nFim: ${end.toLocaleString('pt-BR')}\nTempo: ${diffMin} minuto(s).`
    const ok = window.confirm(msg)
    if (ok) {
      // Atualiza o campo 'Fim' com o horário atual no formato datetime-local
      const pad = (n) => String(n).padStart(2, '0')
      const Y = end.getFullYear()
      const M = pad(end.getMonth() + 1)
      const D = pad(end.getDate())
      const H = pad(end.getHours())
      const Min = pad(end.getMinutes())
      const endInput = `${Y}-${M}-${D}T${H}:${Min}`
      setFormData(prev => ({ ...prev, fim: endInput }))
    }
    setTimerOn(false)
    setTimerStart(null)
  }
  const [draftLoaded, setDraftLoaded] = useState(false)
  const [buscaAberta, setBuscaAberta] = useState(false)
  const [buscaTexto, setBuscaTexto] = useState('')
  // Confirmação de apontamento
  const [confirmarAberto, setConfirmarAberto] = useState(false)
  const [rackOuPallet, setRackOuPallet] = useState('')
  const [qtdConfirmada, setQtdConfirmada] = useState('')
  // Modal de listagem de apontamentos da ordem selecionada
  const [listarApontAberto, setListarApontAberto] = useState(false)
  const [showTimerModal, setShowTimerModal] = useState(false)
  // Modal pós-sucesso: continuar no mesmo item?
  const [continuarMesmoItemAberto, setContinuarMesmoItemAberto] = useState(false)
  // Modal para imprimir formulário de identificação
  const [imprimirAberto, setImprimirAberto] = useState(false)
  const [ultimoLote, setUltimoLote] = useState('')
  // Modal para romaneio e lote externo (fluxo antigo – mantendo disponível se necessário)
  const [romaneioAberto, setRomaneioAberto] = useState(false)
  const [tmpRomaneio, setTmpRomaneio] = useState('')
  const [tmpLotesExt, setTmpLotesExt] = useState([''])
  // Modal de seleção de Rack!Embalagem e lotes (novo fluxo ao selecionar Pedido/Seq)
  const [rackModalAberto, setRackModalAberto] = useState(false)
  const [pedidoSeqSelecionado, setPedidoSeqSelecionado] = useState('')
  const [rackDigitado, setRackDigitado] = useState('')
  const [lotesEncontrados, setLotesEncontrados] = useState([]) // [{id?, lote}]
  const [lotesSelecionados, setLotesSelecionados] = useState([]) // [lote]
  // Inspeção de amarrados do Rack
  const [inspAberto, setInspAberto] = useState(false)
  const [amarradosRack, setAmarradosRack] = useState([])
  const [amarradosSelecionados, setAmarradosSelecionados] = useState([]) // array de indices
  const [marcarTodosAmarrados, setMarcarTodosAmarrados] = useState(false)
  const [filtroPedidoInsp, setFiltroPedidoInsp] = useState('')
  const [filtroRomaneioInsp, setFiltroRomaneioInsp] = useState('')
  const amarradosFiltrados = useMemo(() => {
    const ped = String(filtroPedidoInsp || '').replace(/\D/g, '')
    const rom = String(filtroRomaneioInsp || '').replace(/\D/g, '')
    return amarradosRack.filter(a => {
      const pedOk = ped ? String(a.pedido_seq || '').replace(/\D/g, '').startsWith(ped) : true
      const romOk = rom ? String(a.romaneio || '').replace(/\D/g, '').startsWith(rom) : true
      return pedOk && romOk
    })
  }, [filtroPedidoInsp, filtroRomaneioInsp, amarradosRack])
  
  // Lê um campo do dados_originais do lote de forma case-insensitive
  const getCampoOriginalLote = (loteObj, campo) => {
    try {
      const dados = loteObj?.dados_originais || {}
      const alvo = String(campo).toLowerCase().replace(/[^a-z0-9]/g, '')
      for (const k of Object.keys(dados)) {
        const nk = String(k).toLowerCase().replace(/[^a-z0-9]/g, '')
        if (nk === alvo) return dados[k]
      }
      return ''
    } catch { return '' }
  }

  // Busca lotes na store 'lotes' conforme Rack informado (sem vincular ao Pedido/Seq neste momento)
  const buscarLotesPorRack = () => {
    const rack = String(rackDigitado || '').trim()
    if (!rack) { setLotesEncontrados([]); return }
    try {
      const lista = (lotesDB || []).filter(l => String(l.rack_embalagem || '').trim() === rack)
      // Agregar por número do lote (usando SOMENTE dados da base "Dados • Lotes")
      const map = new Map()
      for (const l of lista) {
        const num = String(l.lote || '').trim()
        if (!num) continue
        const pedidoSeq = String(l.pedido_seq || '').trim()
        const p = pedidoSeq.includes('/') ? pedidoSeq.split('/') : ['', '']
        const pedido = p[0] || ''
        const seq = p[1] || ''
        const produtoPlanilha = String(l.produto || getCampoOriginalLote(l, 'Produto') || l.codigo || '').trim() // preferir 'Produto' da planilha
        const ferramentaPlanilha = extrairFerramenta(produtoPlanilha || '')
        if (!map.has(num)) {
          map.set(num, {
            lote: num,
            produto: produtoPlanilha,
            ferramenta: ferramentaPlanilha,
            romaneios: new Set(),
            pedido,
            seq
          })
        }
        const entry = map.get(num)
        // Se em registros subsequentes houver produto não vazio, mantém o primeiro não vazio
        if (!entry.produto && produtoPlanilha) entry.produto = produtoPlanilha
        if (!entry.ferramenta && ferramentaPlanilha) entry.ferramenta = ferramentaPlanilha
        const rom = String(l.romaneio || '').trim()
        if (rom) entry.romaneios.add(rom)
      }
      // Converter para array e mesclar romaneios únicos
      const unicos = Array.from(map.values()).map(e => ({
        lote: e.lote,
        produto: e.produto,
        ferramenta: e.ferramenta,
        romaneio: Array.from(e.romaneios).join(', '),
        pedido: e.pedido,
        seq: e.seq
      }))
      setLotesEncontrados(unicos)
      setLotesSelecionados(prev => prev.filter(v => unicos.some(x => x.lote === v)))
    } catch { setLotesEncontrados([]) }
  }

  // Marca/desmarca um número de lote
  const toggleLoteSelecionado = (num) => {
    setLotesSelecionados(prev => prev.includes(num) ? prev.filter(x => x !== num) : [...prev, num])
  }

  // Salva Rack e lotes escolhidos no formulário principal
  const salvarRackELotes = () => {
    const rack = String(rackDigitado || '').trim()
    if (!rack) { alert('Informe o Rack!Embalagem.'); return }
    if (!lotesSelecionados.length) { if (!window.confirm('Nenhum lote selecionado. Deseja continuar assim mesmo?')) return }
    setFormData(prev => ({
      ...prev,
      rack_ou_pallet: rack,
      rackOuPallet: rack,
      lotesExternos: [...lotesSelecionados]
    }))
    setRackModalAberto(false)
  }
  
  // Lista simulada de operadores (máquinas virão do IndexedDB)
  const operadores = [
    { id: 1, nome: 'João Silva' },
    { id: 2, nome: 'Maria Oliveira' },
    { id: 3, nome: 'Carlos Santos' }
  ]
  // Máquinas reais cadastradas em Configurações (IndexedDB)
  const { items: maquinas } = useDatabase('maquinas', true)
  
  // Extrai o comprimento do acabado a partir do código do produto
  const extrairComprimentoAcabado = (produto) => {
    if (!produto) return ''
    const resto = String(produto).slice(8) // a partir do 9º dígito (index 8)
    const match = resto.match(/^\d+/)
    const valor = match ? parseInt(match[0], 10) : null
    return Number.isFinite(valor) ? `${valor} mm` : ''
  }

  // Converte um valor datetime-local (YYYY-MM-DDTHH:MM) para Date local
  const parseLocalInputToDate = (val) => {
    try {
      const [datePart, timePart] = String(val || '').split('T')
      if (!datePart || !timePart) return null
      const [yy, mm, dd] = datePart.split('-').map(Number)
      const [hh, mi] = timePart.split(':').map(Number)
      return new Date(yy, (mm || 1) - 1, dd || 1, hh || 0, mi || 0)
    } catch { return null }
  }

  // Converte datetime-local (YYYY-MM-DDTHH:MM) para ISO (UTC) esperado pelo Supabase
  const localInputToISO = (val) => {
    const d = parseLocalInputToDate(val)
    return d && !isNaN(d.getTime()) ? d.toISOString() : null
  }

  // Formata duração em HH:MM:SS
  const formatHMS = (ms) => {
    const total = Math.max(0, Math.floor((ms || 0) / 1000))
    const hh = String(Math.floor(total / 3600)).padStart(2, '0')
    const mm = String(Math.floor((total % 3600) / 60)).padStart(2, '0')
    const ss = String(total % 60).padStart(2, '0')
    return `${hh}:${mm}:${ss}`
  }

  // Limpa o formulário e o rascunho salvo
  const clearForm = () => {
    try { if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEY) } catch {}
    setFormData({
      operador: user ? user.nome : '',
      maquina: '',
      codigoPerfil: '',
      ordemTrabalho: '',
      inicio: '',
      fim: '',
      quantidade: '',
      qtdPedido: '',
      perfilLongo: '',
      separado: '',
      cliente: '',
      pedidoCliente: '',
      dtFatura: '',
      unidade: '',
      comprimentoAcabado: '',
      nroOp: '',
      observacoes: '',
      romaneioNumero: '',
      loteExterno: '',
      lotesExternos: []
    })
  }

  // Extrai o código da ferramenta a partir do produto
  // Regras:
  // - Se iniciar com 3 letras: 3 letras + '-' + 3 dígitos seguintes
  // - Se iniciar com 2 letras: 2 letras + '-' + 4 dígitos seguintes
  // Observação: tratar a letra 'O' como dígito '0' nos blocos numéricos
  const extrairFerramenta = (produto) => {
    if (!produto) return ''
    const s = String(produto).toUpperCase()
    // Verificar 3 ou 2 letras no início (aceita vogais)
    const re3 = /^([A-Z]{3})([A-Z0-9]+)/
    const re2 = /^([A-Z]{2})([A-Z0-9]+)/
    let letras = ''
    let resto = ''
    let qtdDigitos = 0
    let m = s.match(re3)
    if (m) {
      letras = m[1]
      resto = m[2]
      qtdDigitos = 3
    } else {
      m = s.match(re2)
      if (m) {
        letras = m[1]
        resto = m[2]
        qtdDigitos = 4
      } else {
        return ''
      }
    }
    // Extrair dígitos do resto, convertendo 'O' -> '0'
    let nums = ''
    for (const ch of resto) {
      if (/[0-9]/.test(ch)) {
        nums += ch
      } else if (ch === 'O') {
        nums += '0'
      }
      if (nums.length === qtdDigitos) break
    }
    // Se ainda faltaram dígitos, completa com zeros à direita
    if (nums.length < qtdDigitos) {
      nums = nums.padEnd(qtdDigitos, '0')
    }
    return `${letras}-${nums}`
  }

  // Obtém um campo de dados_originais com busca case-insensitive e ignorando pontuação
  const getCampoOriginal = (pedido, campo) => {
    try {
      const dados = pedido?.dados_originais || {}
      const alvo = String(campo).toLowerCase().replace(/[^a-z0-9]/g, '')
      for (const k of Object.keys(dados)) {
        const nk = String(k).toLowerCase().replace(/[^a-z0-9]/g, '')
        if (nk === alvo) return dados[k]
      }
      return ''
    } catch {
      return ''
    }
  }

  // Formata data/hora atual no padrão aceito por inputs type="datetime-local"
  // Saída: YYYY-MM-DDTHH:MM (hora local)
  const getNowLocalInput = () => {
    const pad = (n) => String(n).padStart(2, '0')
    const d = new Date()
    const y = d.getFullYear()
    const m = pad(d.getMonth() + 1)
    const day = pad(d.getDate())
    const hh = pad(d.getHours())
    const mm = pad(d.getMinutes())
    return `${y}-${m}-${day}T${hh}:${mm}`
  }

  // Soma minutos a um valor no formato datetime-local e retorna no mesmo formato
  const addMinutesToInput = (inputValue, minutes) => {
    try {
      const pad = (n) => String(n).padStart(2, '0')
      const [datePart, timePart] = String(inputValue || getNowLocalInput()).split('T')
      const [yy, mm, dd] = datePart.split('-').map(Number)
      const [hh, mi] = (timePart || '00:00').split(':').map(Number)
      const d = new Date(yy, (mm || 1) - 1, dd || 1, hh || 0, mi || 0)
      d.setMinutes(d.getMinutes() + (Number.isFinite(minutes) ? minutes : 0))
      const Y = d.getFullYear()
      const M = pad(d.getMonth() + 1)
      const D = pad(d.getDate())
      const H = pad(d.getHours())
      const Min = pad(d.getMinutes())
      return `${Y}-${M}-${D}T${H}:${Min}`
    } catch {
      return inputValue
    }
  }

  // Ordens de trabalho derivadas da Carteira (pedidos importados)
  const ordensTrabalho = pedidosDB.map(p => {
    const comp = extrairComprimentoAcabado(p.produto)
    const ferramenta = extrairFerramenta(p.produto)
    return {
      id: p.pedido_seq,                  // Ex.: "82594/10"
      codigoPerfil: p.produto || '',     // Código do produto
      descricao: p.descricao || '',      // Descrição do produto
      qtdPedido: p.qtd_pedido || 0,      // Quantidade pedida
      perfilLongo: p.item_perfil || '',  // Item/Perfil
      separado: p.separado || 0,         // Quantidade separada
      cliente: getCampoOriginal(p, 'CLIENTE') || p.cliente || '',
      pedidoCliente: p.pedido_cliente || '',
      dtFatura: p.dt_fatura || '',
      unidade: p.unidade || '',
      comprimentoAcabado: comp,
      ferramenta,
      nroOp: p.nro_op || ''
    }
  })

  // Caminhos base para PDFs salvos em Configurações
  const pdfBasePath = typeof window !== 'undefined' ? (localStorage.getItem('pdfBasePath') || '') : ''
  const processBasePath = typeof window !== 'undefined' ? (localStorage.getItem('processBasePath') || '') : ''
  const ferramentaAtual = extrairFerramenta(formData.codigoPerfil)
  const BACKEND_URL = (import.meta?.env?.VITE_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '')
  const buildHttpPdfUrl = (basePath, fileName) => {
    // Usa o backend para servir o arquivo via HTTP
    const params = new URLSearchParams({ base: basePath || '' })
    const fname = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`
    return `${BACKEND_URL}/api/files/pdf/${encodeURIComponent(fname)}?${params.toString()}`
  }

  const abrirDesenho = () => {
    if (!ferramentaAtual) {
      alert('Não foi possível identificar a ferramenta a partir do Produto.')
      return
    }
    if (!pdfBasePath) {
      alert('Defina o caminho base dos PDFs em Configurações > Arquivos.')
      return
    }
    const arquivo = `${ferramentaAtual}.pdf`
    const url = buildFileUrl(pdfBasePath, arquivo)
    // Tenta abrir via window.open
    const w = window.open(encodeURI(url), '_blank')
    // Fallback silencioso via <a>
    if (!w) {
      const a = document.createElement('a')
      a.href = encodeURI(url)
      a.target = '_blank'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => {
        alert(`Tentei abrir o arquivo:\n${url}\n\nSe o navegador bloqueou a abertura de arquivos locais (file:///), habilite a permissão ou solicite que disponibilizemos via servidor.`)
      }, 150)
    }
  }

  // Lista filtrada para modal de busca
  const ordensFiltradas = ordensTrabalho.filter(o => {
    if (!buscaTexto) return true
    const t = buscaTexto.toString().trim().toLowerCase()
    const tDigits = t.replace(/\D/g, '')
    const comprimentoNum = (o.comprimentoAcabado || '').replace(/\D/g, '')
    let match = false
    // Se o usuário digitou números, priorizar correspondência no comprimento (início)
    if (tDigits) {
      match = comprimentoNum.startsWith(tDigits)
    }
    // Demais campos por inclusão
    if (!match && (o.id || '').toLowerCase().includes(t)) match = true
    if (!match && (o.ferramenta || '').toLowerCase().includes(t)) match = true
    if (!match && (o.codigoPerfil || '').toLowerCase().includes(t)) match = true
    if (!match && (o.pedidoCliente || '').toLowerCase().includes(t)) match = true
    if (!match && (o.cliente || '').toLowerCase().includes(t)) match = true
    return match
  })
  
  // Atualizar o operador quando o usuário for carregado
  useEffect(() => {
    if (user) {
      setFormData(prevData => ({
        ...prevData,
        operador: user.nome
      }))
    }
  }, [user])

  // Carrega rascunho salvo ao montar
  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
      if (raw) {
        const saved = JSON.parse(raw)
        if (saved && typeof saved === 'object') {
          setFormData(prev => ({
            ...prev,
            ...saved,
            // garante operador do usuário atual quando disponível
            operador: (user && user.nome) ? user.nome : (saved.operador || prev.operador)
          }))
        }
      }
    } catch {}
    setDraftLoaded(true)
  }, [])

  // Salva rascunho automaticamente sempre que o form mudar (após carregar)
  useEffect(() => {
    if (!draftLoaded) return
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(formData))
      }
    } catch {}
  }, [formData, draftLoaded])

  const handleChange = (e) => {
    const { name, value } = e.target
    
    // Se selecionou uma ordem de trabalho, preenche os campos relacionados automaticamente
    if (name === 'ordemTrabalho') {
      const ordem = ordensTrabalho.find(o => o.id === value)
      if (ordem) {
        const inicioAuto = formData.inicio || getNowLocalInput()
        setFormData({
          ...formData,
          ordemTrabalho: value,
          codigoPerfil: ordem.codigoPerfil,
          qtdPedido: ordem.qtdPedido,
          perfilLongo: ordem.perfilLongo,
          separado: ordem.separado,
          cliente: ordem.cliente,
          pedidoCliente: ordem.pedidoCliente,
          dtFatura: ordem.dtFatura,
          unidade: ordem.unidade,
          comprimentoAcabado: ordem.comprimentoAcabado,
          nroOp: ordem.nroOp,
          // Preenche início automaticamente se ainda não houver valor
          inicio: inicioAuto,
          // Define fim como 1 hora após o início, caso ainda esteja vazio
          fim: formData.fim || addMinutesToInput(inicioAuto, 60)
        })
        // Abre novo modal: Rack!Embalagem e lotes relacionados
        setPedidoSeqSelecionado(value)
        setRackDigitado('')
        setLotesEncontrados([])
        setLotesSelecionados([])
        setRackModalAberto(true)
        return
      }
    }
    
    setFormData({
      ...formData,
      [name]: value
    })
  }
  
  const handleSubmit = (e) => {
    e.preventDefault()
    // Abrir modal de confirmação antes de registrar
    setQtdConfirmada(String(formData.quantidade || ''))
    setRackOuPallet('')
    setConfirmarAberto(true)
  }

  const concluirRegistro = async () => {
    const qtdForm = Number(formData.quantidade || 0)
    const qtdConf = Number(qtdConfirmada || 0)
    if (!rackOuPallet) {
      alert('Informe o Número do Rack ou Pallet.')
      return
    }
    if (qtdForm <= 0) {
      alert('Quantidade Produzida deve ser maior que zero.')
      return
    }
    if (qtdForm !== qtdConf) {
      alert('A quantidade confirmada deve ser igual à Quantidade Produzida.')
      return
    }
    // Mapeia para as colunas existentes na tabela public.apontamentos
    const lote = gerarCodigoLote()
    const payloadDB = {
      operador: formData.operador || (user ? user.nome : ''),
      maquina: formData.maquina || '',
      produto: formData.codigoPerfil || '',
      cliente: formData.cliente || '',
      inicio: localInputToISO(formData.inicio),
      fim: formData.fim ? localInputToISO(formData.fim) : null,
      quantidade: qtdForm,
      qtd_pedido: formData.qtdPedido ? Number(formData.qtdPedido) : null,
      nro_op: formData.nroOp || '',
      perfil_longo: formData.perfilLongo || '',
      comprimento_acabado_mm: Number(String(formData.comprimentoAcabado || '').replace(/\D/g, '')) || null,
      ordem_trabalho: formData.ordemTrabalho || '',
      observacoes: formData.observacoes || '',
      rack_ou_pallet: rackOuPallet || '',
      pedido_cliente: formData.pedidoCliente || '',
      lote,
      romaneio_numero: formData.romaneioNumero || null,
      lote_externo: (formData.lotesExternos && formData.lotesExternos.length > 0
        ? formData.lotesExternos[0]
        : (formData.loteExterno || null)),
      lotes_externos: formData.lotesExternos && formData.lotesExternos.length ? [...formData.lotesExternos] : (formData.loteExterno ? [formData.loteExterno] : []),
      separado: formData.separado ? Number(formData.separado) : 0,
      // Campos espelhados para compatibilidade com relatórios legados
      pedido_seq: formData.ordemTrabalho || '',
      qtd_separado: formData.separado ? Number(formData.separado) : 0
    }
    await addApont(payloadDB)
    console.log('Apontamento confirmado:', payloadDB)
    // Fecha modal de confirmação e abre o pop-up customizado
    setConfirmarAberto(false)
    setUltimoLote(lote)
    // Primeiro pergunta sobre impressão
    setImprimirAberto(true)
  }

  // Handlers do pop-up customizado
  const handleContinuarMesmoItem = () => {
    setContinuarMesmoItemAberto(false)
    setFormData(prev => ({ ...prev, quantidade: '' }))
    try {
      if (typeof window !== 'undefined') {
        const draft = { ...formData, quantidade: '' }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
      }
    } catch {}
  }

  const handleNovoItem = () => {
    setContinuarMesmoItemAberto(false)
    try { if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEY) } catch {}
    clearForm()
  }

  // Ações do modal de imprimir
  const handleImprimirAgora = () => {
    setImprimirAberto(false)
    imprimirDocumentoIdentificacao(ultimoLote, formData.quantidade, rackOuPallet)
    // Depois que escolher imprimir ou não, segue para a decisão de continuar no mesmo item
    setContinuarMesmoItemAberto(true)
  }
  const handleNaoImprimir = () => {
    setImprimirAberto(false)
    setContinuarMesmoItemAberto(true)
  }

  // ===== Romaneio/Lote Externo (modal ao selecionar pedido) =====
  const salvarRomaneioELote = () => {
    const r = String(tmpRomaneio || '').trim()
    const list = (tmpLotesExt || []).map(v => String(v || '').trim()).filter(v => v)
    if (!r || list.length === 0) {
      alert('Informe o Número do Romaneio e pelo menos um Número de Lote (externo).')
      return
    }
    setFormData(prev => ({ ...prev, romaneioNumero: r, lotesExternos: list, loteExterno: list[0] }))
    setRomaneioAberto(false)
  }
  const cancelarRomaneioELote = () => {
    // Mantém modal aberto até preencher, pois é obrigatório para rastreabilidade
    if (!String(tmpRomaneio || '').trim() || !(tmpLotesExt || []).some(v => String(v || '').trim())) {
      alert('Essas informações são obrigatórias para rastreabilidade.')
      return
    }
    salvarRomaneioELote()
  }
  
  // Atualiza listagem de lotes conforme rack/pedido mudar (quando modal está aberto)
  useEffect(() => {
    if (rackModalAberto) buscarLotesPorRack()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rackDigitado, rackModalAberto, pedidoSeqSelecionado, lotesDB])

  // Total apontado para a ordem selecionada
  const totalApontado = useMemo(() => {
    const chave = String(formData.ordemTrabalho || '')
    if (!chave) return 0
    try {
      return (apontamentosDB || []).reduce((acc, a) => {
        const seq = String(a.ordemTrabalho || a.pedido_seq || '')
        const qtd = Number(a.quantidade || a.quantidadeProduzida || 0)
        return acc + (seq === chave ? (isNaN(qtd) ? 0 : qtd) : 0)
      }, 0)
    } catch {
      return 0
    }
  }, [apontamentosDB, formData.ordemTrabalho])

  // Saldo para cortar = Qtd.Pedido - Qtd. Apontada
  const saldoParaCortar = useMemo(() => {
    const qtdPed = Number(formData.qtdPedido || 0)
    const saldo = qtdPed - Number(totalApontado || 0)
    return Number.isFinite(saldo) ? saldo : 0
  }, [formData.qtdPedido, totalApontado])

  // Apontamentos filtrados da ordem em tela
  const apontamentosDaOrdem = useMemo(() => {
    const chave = String(formData.ordemTrabalho || '')
    if (!chave) return []
    try {
      return (apontamentosDB || []).filter(a => String(a.ordemTrabalho || a.pedido_seq || '') === chave)
    } catch {
      return []
    }
  }, [apontamentosDB, formData.ordemTrabalho])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Apontamentos de Usinagem</h1>
      
      <div className="bg-white rounded-lg shadow p-4 form-compact">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-700">Novo Apontamento</h2>
          {formData.ordemTrabalho && (
            <div className="flex items-center gap-2">
              <div
                className="px-3 py-1 rounded-md bg-primary-50 text-primary-700 text-sm font-semibold border border-primary-200"
                title="Soma de apontamentos desta ordem"
              >
                Qtd. Apontada: {totalApontado}
              </div>
              <div
                className="px-3 py-1 rounded-md bg-amber-50 text-amber-700 text-sm font-semibold border border-amber-200"
                title="Saldo para cortar = Qtd.Pedido - Qtd. Apontada"
              >
                Saldo p/ Cortar: {saldoParaCortar}
              </div>
              <button
                type="button"
                className="p-2 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                title="Ver apontamentos deste pedido"
                onClick={() => setListarApontAberto(true)}
                aria-label="Ver apontamentos do pedido"
              >
                <FaListUl />
              </button>
            </div>
          )}
      {/* Modal: Inspecionar Amarrados do Rack */}
      {inspAberto && (
        <div className="fixed inset-0 z-[67] flex items-center justify-center">
          <div className="absolute inset-0 bg-black bg-opacity-30" onClick={()=>setInspAberto(false)}></div>
          <div className="relative bg-white rounded-lg shadow-lg w-full max-w-3xl p-6 form-compact">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-800">Amarrados no Rack {rackDigitado}</h3>
              <div className="text-xs text-gray-500">Total: {amarradosFiltrados.length}</div>
            </div>
            <div className="mb-2 flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700">Filtro Pedido:</label>
                <input
                  type="text"
                  className="input-field input-field-sm w-36"
                  placeholder="ex.: 82647"
                  value={filtroPedidoInsp}
                  onChange={(e)=>{ setFiltroPedidoInsp(e.target.value); setMarcarTodosAmarrados(false) }}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700">Filtro Romaneio:</label>
                <input
                  type="text"
                  className="input-field input-field-sm w-36"
                  placeholder="ex.: 124784"
                  value={filtroRomaneioInsp}
                  onChange={(e)=>{ setFiltroRomaneioInsp(e.target.value); setMarcarTodosAmarrados(false) }}
                />
              </div>
              {(filtroPedidoInsp || filtroRomaneioInsp) && (
                <button
                  type="button"
                  className="px-2 py-1 text-xs border rounded bg-white hover:bg-gray-50"
                  onClick={()=>{ setFiltroPedidoInsp(''); setFiltroRomaneioInsp(''); setMarcarTodosAmarrados(false) }}
                >
                  Limpar filtros
                </button>
              )}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={marcarTodosAmarrados}
                  onChange={(e)=>{
                    const on = e.target.checked
                    setMarcarTodosAmarrados(on)
                    const idxs = amarradosFiltrados.map(a => a.idx)
                    setAmarradosSelecionados(on ? Array.from(new Set([...(amarradosSelecionados||[]), ...idxs])) : (amarradosSelecionados||[]).filter(i => !idxs.includes(i)))
                  }}
                />
                Selecionar todos
              </label>
            </div>
            <div className="max-h-[60vh] overflow-auto border rounded">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="p-2 w-8"></th>
                    <th className="p-2 text-left">Codigo</th>
                    <th className="p-2 text-left">Produto</th>
                    <th className="p-2 text-left">Lote</th>
                    <th className="p-2 text-left">Romaneio</th>
                    <th className="p-2 text-left">Pedido/Seq</th>
                    <th className="p-2 text-right">Qt Kg</th>
                    <th className="p-2 text-right">Qtd PC</th>
                  </tr>
                </thead>
                <tbody>
                  {amarradosFiltrados.map((a, i) => (
                    <tr key={a.idx} className="border-t">
                      <td className="p-2 text-center">
                        <input
                          type="checkbox"
                          checked={amarradosSelecionados.includes(a.idx)}
                          onChange={()=>setAmarradosSelecionados(prev => prev.includes(a.idx) ? prev.filter(x=>x!==a.idx) : [...prev, a.idx])}
                        />
                      </td>
                      <td className="p-2">{a.codigo || '-'}</td>
                      <td className="p-2">{a.produto || '-'}</td>
                      <td className="p-2">{a.lote || '-'}</td>
                      <td className="p-2">{a.romaneio || '-'}</td>
                      <td className="p-2">{a.pedido_seq || '-'}</td>
                      <td className="p-2 text-right">{Number.isFinite(a.qt_kg) ? a.qt_kg : '-'}</td>
                      <td className="p-2 text-right">{Number.isFinite(a.qtd_pc) ? a.qtd_pc : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="btn-outline" onClick={()=>setInspAberto(false)}>Fechar</button>
              <button
                type="button"
                className="btn-primary"
                onClick={()=>{
                  // aplica seleção de amarrados gerando seleção de lotes únicos
                  const selecionados = amarradosSelecionados.map(i => amarradosRack[i])
                  const lotes = Array.from(new Set(selecionados.map(a => String(a.lote || '').trim()).filter(Boolean)))
                  setLotesSelecionados(prev => Array.from(new Set([...prev, ...lotes])))
                  setInspAberto(false)
                }}
              >
                Aplicar seleção
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal: Romaneio e Lote Externo (obrigatório ao selecionar pedido) */}
      {romaneioAberto && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center">
          <div className="absolute inset-0 bg-black bg-opacity-30"></div>
          <div className="relative bg-white rounded-lg shadow-lg w-full max-w-md p-5 form-compact">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold text-gray-800">Dados para Rastreabilidade</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">Informe o <strong>Número do Romaneio</strong> e o <strong>Número do Lote (externo)</strong> do material recebido.</p>
            <div className="space-y-3">
              <div>
                <label className="block label-sm font-medium text-gray-700 mb-1">Número do Romaneio</label>
                <input type="text" className="input-field input-field-sm" value={tmpRomaneio} onChange={(e)=>setTmpRomaneio(e.target.value)} autoFocus />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block label-sm font-medium text-gray-700">Número do Lote (externo)</label>
                  <button type="button" title="Adicionar outro lote" className="p-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-100" onClick={() => setTmpLotesExt(prev => [...prev, ''])}>
                    <FaPlus />
                  </button>
                </div>
                <div className="space-y-2">
                  {(tmpLotesExt || []).map((val, idx) => (
                    <input key={idx} type="text" className="input-field input-field-sm" value={val} onChange={(e)=>{
                      const v = e.target.value; setTmpLotesExt(prev => { const arr = [...prev]; arr[idx] = v; return arr })
                    }} placeholder={`Lote externo ${idx+1}`} />
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="btn-primary" onClick={salvarRomaneioELote}>Salvar</button>
            </div>
          </div>
        </div>
      )}
      {/* Modal: Rack!Embalagem e Lotes (novo fluxo) */}
      {rackModalAberto && (
        <div className="fixed inset-0 z-[66] flex items-center justify-center">
          <div className="absolute inset-0 bg-black bg-opacity-30"></div>
          <div className="relative bg-white rounded-lg shadow-lg w-full max-w-2xl p-6 form-compact">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold text-gray-800">Selecionar Rack!Embalagem e Lotes</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block label-sm font-medium text-gray-700 mb-1">Pedido/Seq</label>
                <input type="text" className="input-field input-field-sm" value={pedidoSeqSelecionado} readOnly />
              </div>
              <div>
                <label className="block label-sm font-medium text-gray-700 mb-1">Rack!Embalagem</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input-field input-field-sm flex-1"
                    value={rackDigitado}
                    onChange={(e)=>setRackDigitado(e.target.value)}
                    placeholder="Informe o código do Rack/Embalagem"
                    autoFocus
                  />
                  <button
                    type="button"
                    className="px-3 py-1.5 text-xs rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
                    title="Inspecionar amarrados do Rack"
                    onClick={() => {
                      const r = String(rackDigitado || '').trim()
                      if (!r) { alert('Informe o Rack!Embalagem primeiro.'); return }
                      const lista = (lotesDB || []).filter(l => String(l.rack_embalagem || '').trim() === r)
                      const rows = lista.map((l, idx) => ({
                        idx,
                        codigo: String(l.codigo || '').trim(),
                        produto: String(l.produto || getCampoOriginalLote(l, 'Produto') || '').trim(),
                        lote: String(l.lote || '').trim(),
                        romaneio: String(l.romaneio || '').trim(),
                        pedido_seq: String(l.pedido_seq || '').trim(),
                        qt_kg: Number(l.qt_kg || 0),
                        qtd_pc: Number(l.qtd_pc || 0)
                      }))
                      setAmarradosRack(rows)
                      setAmarradosSelecionados([])
                      setMarcarTodosAmarrados(false)
                      setInspAberto(true)
                    }}
                  >
                    Inspecionar
                  </button>
                </div>
              </div>
              <div>
                <label className="block label-sm font-medium text-gray-700 mb-1">Lotes encontrados</label>
                <div className="max-h-72 overflow-auto border rounded p-3 space-y-2">
                  {lotesEncontrados.length === 0 && (
                    <div className="text-sm text-gray-500">Nenhum lote encontrado para este Rack.</div>
                  )}
                  {lotesEncontrados.map((l) => (
                    <div key={l.lote} className="flex items-start gap-3 text-sm py-1">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={lotesSelecionados.includes(l.lote)}
                        onChange={()=>toggleLoteSelecionado(l.lote)}
                      />
                      <div className="flex-1">
                        <div className="font-semibold whitespace-nowrap">Lote: {l.lote}</div>
                        <div className="text-gray-700 text-xs mt-1">
                          <div>Produto: {l.produto || '-'}</div>
                          <div>
                            Ferramenta: {l.ferramenta ? (
                              <span className="inline-block px-2 py-0.5 rounded bg-primary-50 text-primary-700 font-semibold">{l.ferramenta}</span>
                            ) : '-'}
                          </div>
                          <div>Romaneio: {l.romaneio || '-'}</div>
                          <div>Pedido: {l.pedido || '-'}</div>
                          <div>Seq: {l.seq || '-'}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="btn-outline" onClick={()=>setRackModalAberto(false)}>Cancelar</button>
              <button type="button" className="btn-primary" onClick={salvarRackELotes}>Salvar</button>
            </div>
          </div>
        </div>
      )}
      {/* Modal: Imprimir identificação? */}
      {imprimirAberto && (
        <div className="fixed inset-0 z-[68] flex items-center justify-center">
          <div className="absolute inset-0 bg-black bg-opacity-30" onClick={handleNaoImprimir}></div>
          <div className="relative bg-white rounded-lg shadow-lg w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold text-gray-800">Imprimir identificação do material?</h3>
              <button className="text-sm text-gray-600 hover:text-gray-900" onClick={handleNaoImprimir}>Fechar</button>
            </div>
            <div className="text-sm text-gray-700 space-y-2">
              <p>Apontamento registrado com sucesso.</p>
              <p><strong>Lote gerado:</strong> {ultimoLote}</p>
              <p>Deseja imprimir o formulário de identificação em Word agora?</p>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="btn-outline" onClick={handleNaoImprimir}>Agora não</button>
              <button type="button" className="btn-primary" onClick={handleImprimirAgora}>Imprimir</button>
            </div>
          </div>
        </div>
      )}
      {/* Modal: Continuar no mesmo item? */}
      {continuarMesmoItemAberto && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
          <div className="absolute inset-0 bg-black bg-opacity-30" onClick={handleContinuarMesmoItem}></div>
          <div className="relative bg-white rounded-lg shadow-lg w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold text-gray-800">Continuar cortando o mesmo item?</h3>
              <button className="text-sm text-gray-600 hover:text-gray-900" onClick={handleContinuarMesmoItem}>Fechar</button>
            </div>
            <div className="text-sm text-gray-700 space-y-3">
              <p>Apontamento registrado com sucesso.</p>
              <p>Você deseja continuar cortando o <strong>mesmo item</strong>?</p>
              <ul className="list-disc ml-5 space-y-1">
                <li>Se escolher <strong>Continuar</strong>, manterei todos os campos e vou limpar apenas "Quantidade Produzida".</li>
                <li>Se escolher <strong>Novo item</strong>, vou limpar todos os campos para você selecionar o próximo pedido.</li>
              </ul>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="btn-outline" onClick={handleNovoItem}>Novo item</button>
              <button type="button" className="btn-primary" onClick={handleContinuarMesmoItem}>Continuar</button>
            </div>
          </div>
        </div>
      )}
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-3 form-compact">
          <div className="grid grid-cols-1 md:grid-cols-3 grid-compact">
            <div>
              <label className="block label-sm font-medium text-gray-700 mb-1">
                Operador
              </label>
              <input
                type="text"
                name="operador"
                value={formData.operador}
                readOnly
                className="input-field input-field-sm bg-gray-100"
              />
            </div>
            
            <div>
              <label className="block label-sm font-medium text-gray-700 mb-1">
                Máquina
              </label>
              <select
                name="maquina"
                value={formData.maquina}
                onChange={handleChange}
                required
                className="input-field input-field-sm"
              >
                <option value="">Selecione a máquina</option>
                {(maquinas || []).map(maq => (
                  <option key={maq.id} value={maq.id}>{maq.nome || maq.codigo || `Máquina ${maq.id}`}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block label-sm font-medium text-gray-700 mb-1">
                Pedido/Seq
              </label>
              <div className="flex items-center gap-2">
                <select
                  name="ordemTrabalho"
                  value={formData.ordemTrabalho}
                  onChange={handleChange}
                  required
                  className="input-field input-field-sm flex-1"
                >
                  <option value="">{carregandoPedidos ? 'Carregando pedidos...' : 'Selecione o pedido'}</option>
                  {ordensTrabalho.map(ordem => (
                    <option key={ordem.id} value={ordem.id}>
                      {ordem.id} - {ordem.ferramenta} - {ordem.comprimentoAcabado || ''}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="p-2 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  title="Buscar pedido"
                  onClick={() => setBuscaAberta(true)}
                  aria-label="Buscar pedido"
                >
                  <FaSearch />
                </button>
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between">
                <label className="block label-sm font-medium text-gray-700 mb-1">
                  Produto
                </label>
                {ferramentaAtual ? (
                  <div className="flex items-center gap-2">
                    {pdfBasePath ? (
                      <a
                        href={buildHttpPdfUrl(pdfBasePath, `${ferramentaAtual}.pdf`)}
                        target="_blank"
                        rel="noreferrer noopener"
                        title={`Abrir desenho: ${ferramentaAtual}.pdf`}
                        className="text-red-600 hover:text-red-800"
                      >
                        <FaFilePdf />
                      </a>
                    ) : (
                      <span title="Defina o caminho em Configurações > Arquivos" className="text-red-600 opacity-50">
                        <FaFilePdf />
                      </span>
                    )}
                    {/* Copiar caminho local */}
                    {pdfBasePath && (
                      <button type="button" title="Copiar caminho local" className="p-1 rounded border text-gray-600 hover:bg-gray-100"
                        onClick={() => copyToClipboard(`${String(pdfBasePath).replace(/[\\/]+$/,'')}\\${ferramentaAtual}.pdf`)}>
                        <FaCopy />
                      </button>
                    )}
                    
                    {processBasePath ? (
                      <a
                        href={buildHttpPdfUrl(processBasePath, `${ferramentaAtual}.pdf`)}
                        target="_blank"
                        rel="noreferrer noopener"
                        title={`Abrir ficha de processo: ${ferramentaAtual}.pdf`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {/* reutilizando ícone de PDF com cor diferente para ficha de processo */}
                        <FaFilePdf />
                      </a>
                    ) : (
                      <span title="Defina o caminho das fichas em Configurações > Arquivos" className="text-blue-600 opacity-50">
                        <FaFilePdf />
                      </span>
                    )}
                    {/* Copiar caminho local (processo) */}
                    {processBasePath && (
                      <button type="button" title="Copiar caminho local (processo)" className="p-1 rounded border text-gray-600 hover:bg-gray-100"
                        onClick={() => copyToClipboard(`${String(processBasePath).replace(/[\\/]+$/,'')}\\${ferramentaAtual}.pdf`)}>
                        <FaCopy />
                      </button>
                    )}
                    
                  </div>
                ) : (
                  <span
                    title="Selecione um pedido para habilitar"
                    className="text-red-600 opacity-50"
                  >
                    <FaFilePdf />
                  </span>
                )}
              </div>
              <input
                type="text"
                name="codigoPerfil"
                value={formData.codigoPerfil}
                readOnly
                className="input-field input-field-sm bg-gray-100"
              />
              {ferramentaAtual && (
                <p className="text-[11px] text-gray-500 mt-1">Ferramenta: {ferramentaAtual}{pdfBasePath ? '' : ' • Defina o caminho em Configurações > Arquivos'}</p>
              )}
            </div>

            <div>
              <label className="block label-sm font-medium text-gray-700 mb-1">
                Cliente
              </label>
              <input
                type="text"
                name="cliente"
                value={formData.cliente}
                readOnly
                className="input-field input-field-sm bg-gray-100"
              />
            </div>

            <div>
              <label className="block label-sm font-medium text-gray-700 mb-1">
                Pedido.Cliente
              </label>
              <input
                type="text"
                name="pedidoCliente"
                value={formData.pedidoCliente}
                readOnly
                className="input-field input-field-sm bg-gray-100"
              />
            </div>
            
            <div>
              <label className="block label-sm font-medium text-gray-700 mb-1">
                Início
              </label>
              <input
                type="datetime-local"
                name="inicio"
                value={formData.inicio}
                onChange={handleChange}
                required
                className="input-field input-field-sm"
              />
            </div>
            
            <div>
              <label className="block label-sm font-medium text-gray-700 mb-1">
                Fim
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="datetime-local"
                  name="fim"
                  value={formData.fim}
                  onChange={handleChange}
                  className="input-field input-field-sm flex-1"
                />
                {timerOn && (
                  <button type="button" className="btn-primary" onClick={handleStopTimer} title="Finalizar contador">Finalizar contador</button>
                )}
              </div>
            </div>

            <div>
              <label className="block label-sm font-medium text-gray-700 mb-1">
                Dt.Fatura (Entrega)
              </label>
              <input
                type="text"
                name="dtFatura"
                value={formData.dtFatura ? new Date(formData.dtFatura).toLocaleDateString('pt-BR') : ''}
                readOnly
                className="input-field input-field-sm bg-gray-100"
              />
            </div>
            
            <div>
              <label className="block label-sm font-medium text-gray-700 mb-1">
                Quantidade Produzida
              </label>
              <input
                type="number"
                name="quantidade"
                value={formData.quantidade}
                onChange={handleChange}
                required
                min="1"
                className="input-field input-field-sm"
              />
            </div>
            
            <div>
              <label className="block label-sm font-medium text-gray-700 mb-1">
                Qtd.Pedido
              </label>
              <input
                type="number"
                name="qtdPedido"
                value={formData.qtdPedido}
                readOnly
                className="input-field input-field-sm bg-gray-100"
              />
            </div>

            <div>
              <label className="block label-sm font-medium text-gray-700 mb-1">
                Unidade
              </label>
              <input
                type="text"
                name="unidade"
                value={formData.unidade}
                readOnly
                className="input-field input-field-sm bg-gray-100"
              />
            </div>

            <div>
              <label className="block label-sm font-medium text-gray-700 mb-1">
                Nº OP
              </label>
              <input
                type="text"
                name="nroOp"
                value={formData.nroOp}
                readOnly
                className="input-field input-field-sm bg-gray-100"
              />
              <div className="mt-2">
                <label className="block label-sm font-medium text-gray-700 mb-1">
                  Comprimento do Acabado
                </label>
                <input
                  type="text"
                  name="comprimentoAcabado"
                  value={formData.comprimentoAcabado}
                  readOnly
                  className="input-field input-field-sm bg-gray-100"
                />
              </div>
            </div>
            
            <div>
              <label className="block label-sm font-medium text-gray-700 mb-1">
                Perfil Longo
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  name="perfilLongo"
                  value={formData.perfilLongo}
                  readOnly
                  className="input-field input-field-sm bg-gray-100"
                />
                <div>
                  <label className="block label-sm font-medium text-gray-700 mb-1 invisible">Ações</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn-primary flex-1 h-[38px] disabled:opacity-60 disabled:cursor-not-allowed"
                      onClick={() => { if (!formData.ordemTrabalho) { alert('Selecione um Pedido/Seq antes de abrir o contador.'); return } setShowTimerModal(true) }}
                      disabled={!formData.ordemTrabalho}
                      title={formData.ordemTrabalho ? 'Abrir contador em tela grande' : 'Selecione um Pedido/Seq para habilitar'}
                    >
                      Abrir Contador
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <label className="block label-sm font-medium text-gray-700 mb-1">
                Separado
              </label>
              <input
                type="number"
                name="separado"
                value={formData.separado}
                readOnly
                className="input-field input-field-sm bg-gray-100"
              />
              <div className="mt-2">
                <label className="block label-sm font-medium text-gray-700 mb-1 invisible">Ações</label>
                <div className="flex">
                  <button
                    type="button"
                    className="btn-secondary flex items-center justify-center gap-2 h-[38px] px-3 disabled:opacity-60 disabled:cursor-not-allowed"
                    onClick={() => {
                      if (!formData.ordemTrabalho) { alert('Selecione um Pedido/Seq antes de informar romaneio/lote.'); return }
                      setTmpRomaneio(formData.romaneioNumero || '')
                      setTmpLotesExt((formData.lotesExternos && formData.lotesExternos.length) ? [...formData.lotesExternos] : [formData.loteExterno || ''])
                      setRomaneioAberto(true)
                    }}
                    disabled={!formData.ordemTrabalho}
                    title="Adicionar/editar Romaneio e Lotes"
                  >
                    <FaPlus />
                    <span>Romaneio/Lote</span>
                  </button>
                </div>
              </div>
            </div>

            
          </div>
          
          <div>
            <label className="block label-sm font-medium text-gray-700 mb-1">
              Observações
            </label>
            <textarea
              name="observacoes"
              value={formData.observacoes}
              onChange={handleChange}
              className="input-field input-field-sm"
            />
          </div>
          <div className="flex justify-end pt-2 gap-2">
            <button
              type="button"
              className="btn-outline flex items-center gap-2"
              onClick={() => { if (confirm('Deseja realmente limpar o formulário?')) clearForm() }}
              title="Limpar todos os campos e começar do zero"
            >
              <FaBroom />
              <span>Limpar</span>
            </button>
            <button type="submit" className="btn-primary">Registrar Apontamento</button>
          </div>
        </form>
      </div>

      {/* Modal de confirmação do apontamento */}
      {confirmarAberto && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="relative bg-white rounded-lg shadow-lg w-full max-w-md p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-800">Confirmar Apontamento</h3>
              <button className="text-sm text-gray-600 hover:text-gray-900" onClick={() => setConfirmarAberto(false)}>Fechar</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Quantidade Produzida</label>
                <input type="number" className="input-field input-field-sm bg-gray-100" value={formData.quantidade} readOnly />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Confirmar Quantidade</label>
                <input type="number" className="input-field input-field-sm" value={qtdConfirmada} onChange={(e)=>setQtdConfirmada(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Número do Rack ou Pallet</label>
                <input type="text" className="input-field input-field-sm" placeholder="Ex.: RACK-12 ou P-07" value={rackOuPallet} onChange={(e)=>setRackOuPallet(e.target.value)} />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="btn-outline" onClick={()=>setConfirmarAberto(false)}>Cancelar</button>
              <button type="button" className="btn-primary" onClick={concluirRegistro}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
      {/* Modal: Listar apontamentos da ordem atual */}
      {listarApontAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black bg-opacity-30" onClick={() => setListarApontAberto(false)}></div>
          <div className="relative bg-white rounded-lg shadow-lg w-full max-w-4xl p-4 form-compact">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-800">Apontamentos do Pedido {formData.ordemTrabalho}</h3>
              <button className="text-sm text-gray-600 hover:text-gray-900" onClick={() => setListarApontAberto(false)}>Fechar</button>
            </div>
            <div className="max-h-96 overflow-auto border rounded">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2">Início</th>
                    <th className="text-left px-3 py-2">Fim</th>
                    <th className="text-left px-3 py-2">Quantidade</th>
                    <th className="text-left px-3 py-2">Operador</th>
                    <th className="text-left px-3 py-2">Rack/Pallet</th>
                    <th className="text-left px-3 py-2">Obs.</th>
                  </tr>
                </thead>
                <tbody>
                  {apontamentosDaOrdem.map((a, idx) => (
                    <tr key={idx} className="border-t hover:bg-gray-50">
                      <td className="px-3 py-2">{a.inicio ? new Date(a.inicio).toLocaleString('pt-BR') : ''}</td>
                      <td className="px-3 py-2">{a.fim ? new Date(a.fim).toLocaleString('pt-BR') : ''}</td>
                      <td className="px-3 py-2">{a.quantidade}</td>
                      <td className="px-3 py-2">{a.operador || ''}</td>
                      <td className="px-3 py-2">{a.rackOuPallet || ''}</td>
                      <td className="px-3 py-2">{a.observacoes || ''}</td>
                    </tr>
                  ))}
                  {apontamentosDaOrdem.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-3 py-6 text-center text-gray-500">Nenhum apontamento encontrado para este pedido</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {/* Modal: Contador grande */}
      {showTimerModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowTimerModal(false)}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">Contador de Produção</h3>
              <button className="text-sm text-gray-600 hover:text-gray-900" onClick={() => setShowTimerModal(false)}>Fechar</button>
            </div>
            <div className="flex flex-col items-center gap-4">
              <div className="text-7xl font-mono font-extrabold tracking-widest text-gray-900">
                {formatHMS((timerOn ? nowTick : Date.now()) - (timerStart ? timerStart.getTime() : Date.now()))}
              </div>
              <div className="text-gray-600 text-sm">
                {timerStart ? `Iniciado em ${timerStart.toLocaleString('pt-BR')}` : 'Aguardando início'}
              </div>
              <div className="flex items-center gap-3 mt-2">
                {!timerOn ? (
                  <button type="button" className="btn-primary text-lg px-6 py-3" onClick={handleStartTimer}>
                    Iniciar
                  </button>
                ) : (
                  <button type="button" className="btn-danger text-lg px-6 py-3" onClick={handleStopTimer}>
                    Finalizar contador
                  </button>
                )}
                {timerOn && (
                  <button type="button" className="btn-outline text-lg px-6 py-3" onClick={() => setShowTimerModal(false)}>
                    Minimizar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {buscaAberta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black bg-opacity-30" onClick={() => setBuscaAberta(false)}></div>
          <div className="relative bg-white rounded-lg shadow-lg w-full max-w-5xl p-4 form-compact">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-800">Buscar Pedido</h3>
              <button className="text-sm text-gray-600 hover:text-gray-900" onClick={() => setBuscaAberta(false)}>Fechar</button>
            </div>
            <div className="mb-3">
              <input
                type="text"
                placeholder="Digite Pedido/Seq, Ferramenta (ex.: TP-0192, EXP-910) ou Comprimento (ex.: 1100)"
                className="input-field input-field-sm"
                value={buscaTexto}
                onChange={(e) => setBuscaTexto(e.target.value)}
                autoFocus
              />
            </div>
            <div className="max-h-80 overflow-auto border rounded">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2">Pedido/Seq</th>
                    <th className="text-left px-3 py-2">Ferramenta</th>
                    <th className="text-left px-3 py-2">Produto</th>
                    <th className="text-left px-3 py-2">Comprimento</th>
                    <th className="text-left px-3 py-2">Cliente</th>
                    <th className="text-left px-3 py-2">Pedido.Cliente</th>
                    <th className="text-left px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {ordensFiltradas.map((o) => (
                    <tr key={o.id} className="border-t hover:bg-gray-50">
                      <td className="px-3 py-2">{o.id}</td>
                      <td className="px-3 py-2">{o.ferramenta}</td>
                      <td className="px-3 py-2">{o.codigoPerfil}</td>
                      <td className="px-3 py-2">{o.comprimentoAcabado}</td>
                      <td className="px-3 py-2">{o.cliente}</td>
                      <td className="px-3 py-2">{o.pedidoCliente}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          className="btn-secondary py-1 px-2"
                          onClick={() => {
                            // Seleciona e preenche o formulário
                            setFormData(prev => ({
                              ...prev,
                              ordemTrabalho: o.id,
                              codigoPerfil: o.codigoPerfil,
                              qtdPedido: o.qtdPedido,
                              perfilLongo: o.perfilLongo,
                              separado: o.separado,
                              cliente: o.cliente,
                              pedidoCliente: o.pedidoCliente,
                              dtFatura: o.dtFatura,
                              unidade: o.unidade,
                              comprimentoAcabado: o.comprimentoAcabado,
                              nroOp: o.nroOp,
                              // Preenche início automaticamente se vazio
                              inicio: (prev.inicio || getNowLocalInput()),
                              // Define fim automaticamente como 1h após o início se ainda vazio
                              fim: prev.fim || addMinutesToInput((prev.inicio || getNowLocalInput()), 60)
                            }))
                            setBuscaAberta(false)
                            // Abrir modal de romaneio/lote externo
                            setTmpRomaneio(formData.romaneioNumero || '')
                            setTmpLotesExt((formData.lotesExternos && formData.lotesExternos.length)
                              ? [...formData.lotesExternos]
                              : [formData.loteExterno || ''])
                            setRomaneioAberto(true)
                          }}
                        >
                          Selecionar
                        </button>
                      </td>
                    </tr>)
                  )}
                  {ordensFiltradas.length === 0 && (
                    <tr>
                      <td colSpan="7" className="px-3 py-6 text-center text-gray-500">Nenhum pedido encontrado</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ApontamentosUsinagem
