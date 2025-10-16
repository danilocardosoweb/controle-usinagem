import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext' // Importando o contexto de autenticação
import { useSupabase } from '../hooks/useSupabase'
import supabaseService from '../services/SupabaseService'
import { FaSearch, FaFilePdf, FaBroom, FaListUl, FaPlus, FaCopy, FaStar } from 'react-icons/fa'
import { getConfiguracaoImpressoras, getCaminhoImpressora, isImpressoraAtiva } from '../utils/impressoras'

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
  // Fallback: se não houver lotesExternos selecionados, mas houver rack informado,
  // e temos o produto do apontamento, considera que todos os amarrados daquele rack
  // e daquele item foram processados e grava na rastreabilidade.
  if (amarradosDetalhados.length === 0) {
    const rackAlvo = String(rackOuPallet || formData.rack_ou_pallet || '').trim()
    const produtoAlvo = String(formData.codigoPerfil || '').trim()
    if (rackAlvo && produtoAlvo) {
      const candidatos = (lotesDB || []).filter(l => {
        const rackEq = String(l.rack_embalagem || '').trim() === rackAlvo
        const prodL = String(l.produto || getCampoOriginalLote(l, 'Produto') || '').trim()
        const prodEq = !!prodL && prodL === produtoAlvo
        return rackEq && prodEq
      })
      for (const loteDetalhado of candidatos) {
        amarradosDetalhados.push({
          codigo: String(loteDetalhado.codigo || '').trim(),
          rack: String(loteDetalhado.rack_embalagem || '').trim(),
          lote: String(loteDetalhado.lote || '').trim(),
          produto: String(loteDetalhado.produto || getCampoOriginalLote(loteDetalhado, 'Produto') || '').trim(),
          pedido_seq: String(loteDetalhado.pedido_seq || '').trim(),
          romaneio: String(loteDetalhado.romaneio || '').trim(),
          qt_kg: Number(loteDetalhado.qt_kg || 0),
          qtd_pc: Number(loteDetalhado.qtd_pc || 0),
          situacao: String(loteDetalhado.situacao || '').trim(),
          embalagem_data: loteDetalhado.embalagem_data || null,
          nota_fiscal: String(loteDetalhado.nota_fiscal || '').trim()
        })
      }
    }
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
  const { items: pedidosDB, loading: carregandoPedidos } = useSupabase('pedidos')
  const { items: apontamentosDB, addItem: addApont, loadItems: recarregarApontamentos } = useSupabase('apontamentos')
  // Lotes importados (Dados • Lotes) via Supabase
  const { items: lotesDB } = useSupabase('lotes')
  
  // Filtro de prioridades
  const [filtrarPrioridades, setFiltrarPrioridades] = useState(false)
  const [pedidosPrioritarios, setPedidosPrioritarios] = useState(new Set())
  
  // Carregar prioridades do PCP
  useEffect(() => {
    carregarPrioridades()
  }, [])

  const carregarPrioridades = async () => {
    try {
      const prioridadesData = await supabaseService.getAll('pcp_prioridades')
      const setPrioritarios = new Set(
        (prioridadesData || [])
          .map(p => p.pedido_numero)
          .filter(Boolean)
      )
      setPedidosPrioritarios(setPrioritarios)
    } catch (error) {
      console.warn('Não foi possível carregar prioridades do PCP:', error)
      setPedidosPrioritarios(new Set())
    }
  }

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

  // Cria etiqueta térmica compacta 100x45mm para impressora térmica
  const imprimirEtiquetaTermica = (lote, quantidade, rackOuPalletValor, dureza) => {
    // Verificar configuração da impressora térmica
    const impressoraTermica = getConfiguracaoImpressoras().termica
    
    if (!isImpressoraAtiva('termica')) {
      alert(`Impressora térmica não está configurada ou ativa.\nVá em Configurações > Impressoras para configurar.`)
      return
    }
    
    const caminhoImpressora = getCaminhoImpressora('termica')
    console.log(`🖨️ Imprimindo etiqueta térmica via: ${impressoraTermica.nome} (${caminhoImpressora})`)
    
    const cliente = formData.cliente || ''
    const pedidoSeq = formData.ordemTrabalho || ''
    const perfil = formData.codigoPerfil || ''
    const comprimento = formData.comprimentoAcabado || ''
    const qtde = quantidade || ''
    const pallet = rackOuPalletValor || ''
    const durezaVal = dureza || 'N/A'
    
    // Extrai ferramenta do código do produto
    const extrairFerramenta = (prod) => {
      if (!prod) return ''
      const s = String(prod).toUpperCase()
      const re3 = /^([A-Z]{3})([A-Z0-9]+)/
      const re2 = /^([A-Z]{2})([A-Z0-9]+)/
      let letras = '', resto = '', qtdDigitos = 0
      let m = s.match(re3)
      if (m) { letras = m[1]; resto = m[2]; qtdDigitos = 3 }
      else { m = s.match(re2); if (m) { letras = m[1]; resto = m[2]; qtdDigitos = 4 } else return '' }
      let nums = ''
      for (const ch of resto) {
        if (/[0-9]/.test(ch)) nums += ch
        else if (ch === 'O') nums += '0'
        if (nums.length === qtdDigitos) break
      }
      if (nums.length < qtdDigitos) nums = nums.padEnd(qtdDigitos, '0')
      return `${letras}-${nums}`
    }
    
    const ferramenta = extrairFerramenta(perfil)

    const html = `<!DOCTYPE html>
    <html><head><meta charset="utf-8" />
    <style>
      @page { size: 100mm 45mm; margin: 1mm; }
      body { 
        font-family: Arial, sans-serif; 
        color: #000; 
        margin: 0; 
        padding: 1mm;
        font-size: 13pt;
        line-height: 1.3;
        -webkit-print-color-adjust: exact; 
        print-color-adjust: exact;
      }
      .header { 
        background: #000; 
        color: #fff; 
        text-align: center; 
        font-weight: bold; 
        font-size: 14pt;
        padding: 1.5mm 0;
        margin-bottom: 1.5mm;
      }
      .content {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1mm 3mm;
        margin-bottom: 1.5mm;
      }
      .info-item {
        margin-bottom: 1mm;
      }
      .label { 
        font-size: 10pt;
        color: #666;
        display: block;
        margin-bottom: 0.3mm;
      }
      .value { 
        font-weight: bold;
        font-size: 14pt;
        color: #000;
        display: block;
      }
      .barcode-section {
        text-align: center;
        margin-top: 1mm;
        padding-top: 1mm;
        border-top: 1px solid #ccc;
      }
      .barcode-text {
        font-family: 'Libre Barcode 128', 'Courier New', monospace;
        font-size: 32pt;
        letter-spacing: -1px;
        line-height: 1;
        font-weight: bold;
      }
    </style>
    </head><body>
      <div class="header">TECNOPERFIL ALUMÍNIO</div>
      <div class="content">
        <div class="col-left">
          <div class="info-item">
            <span class="label">Cliente:</span>
            <span class="value">${cliente}</span>
          </div>
          <div class="info-item">
            <span class="label">Pedido:</span>
            <span class="value">${pedidoSeq}</span>
          </div>
          <div class="info-item">
            <span class="label">Perfil:</span>
            <span class="value">${ferramenta}</span>
          </div>
          <div class="info-item">
            <span class="label">Dureza:</span>
            <span class="value">${durezaVal}</span>
          </div>
        </div>
        <div class="col-right">
          <div class="info-item">
            <span class="label">Comprimento:</span>
            <span class="value">${comprimento} mm</span>
          </div>
          <div class="info-item">
            <span class="label">Turno:</span>
            <span class="value">TB</span>
          </div>
          <div class="info-item">
            <span class="label">Quantidade:</span>
            <span class="value">${qtde} PC</span>
          </div>
        </div>
      </div>
      <div class="barcode-section">
        <div class="barcode-text">${lote.replace(/-/g, '')}</div>
      </div>
    </body></html>`

    // Criar blob HTML para impressão direta
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const printWindow = window.open(url, '_blank', 'width=400,height=200')
    if (printWindow) {
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print()
        }, 250)
      }
    }
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  // Cria conteúdo HTML estilizado para o formulário e dispara download .doc
  const imprimirDocumentoIdentificacao = (lote, quantidade, rackOuPalletValor, dureza) => {
    // Verificar configuração da impressora comum
    const impressoraComum = getConfiguracaoImpressoras().comum
    
    if (!isImpressoraAtiva('comum')) {
      alert(`Impressora comum não está configurada ou ativa.\nVá em Configurações > Impressoras para configurar.`)
      return
    }
    
    const caminhoImpressora = getCaminhoImpressora('comum')
    console.log(`🖨️ Imprimindo documento via: ${impressoraComum.nome} (${caminhoImpressora})`)
    
    const cliente = formData.cliente || ''
    const item = formData.codigoPerfil || ''
    const itemCli = formData.perfilLongo || '' // se existir no futuro 'item_do_cliente', trocar aqui
    const medida = formData.comprimentoAcabado || ''
    const pedidoTecno = formData.ordemTrabalho || ''
    const pedidoCli = formData.pedidoCliente || ''
    const qtde = quantidade || ''
    const pallet = rackOuPalletValor || ''
    const durezaVal = dureza || ''

    const html = `<!DOCTYPE html>
    <html><head><meta charset="utf-8" />
    <style>
      @page { 
        size: A4 landscape; 
        margin: 12.7mm; /* Margens estreitas padrão */
      }
      @media print {
        @page {
          size: landscape;
          margin: 12.7mm;
        }
        body {
          margin: 0;
        }
      }
      body { 
        font-family: 'Segoe UI', Arial, sans-serif; 
        color: #000; 
        margin: 0;
        padding: 10mm;
        background: #fff;
        -webkit-print-color-adjust: exact; 
        print-color-adjust: exact; 
      }
      .container {
        max-width: 100%;
        margin: 0 auto;
        background: #fff;
        border: 2px solid #000;
        padding: 8mm;
      }
      .header { 
        text-align: center; 
        margin-bottom: 8mm;
        border-bottom: 3px solid #000;
        padding-bottom: 4mm;
      }
      .titulo { 
        font-size: 24pt; 
        font-weight: 800; 
        text-transform: uppercase;
        letter-spacing: 1pt;
        margin: 0;
      }
      .sub { 
        margin-top: 4mm; 
        font-size: 11pt; 
        font-weight: 600; 
        color: #333;
      }
      .form-grid { 
        display: grid;
        grid-template-columns: 25% 75%;
        gap: 5mm 0;
        margin-bottom: 5mm;
      }
      .form-row {
        display: contents;
      }
      .form-row.dupla {
        display: grid;
        grid-column: 1 / -1;
        grid-template-columns: 12.5% 37.5% 12.5% 37.5%;
        gap: 0 4mm;
        align-items: end;
      }
      .label { 
        font-weight: 700; 
        font-size: 14pt; 
        text-transform: uppercase;
        letter-spacing: 0.5pt;
        color: #000;
        padding-right: 4mm;
        align-self: end;
        padding-bottom: 2mm;
      }
      .valor { 
        border-bottom: 2px solid #000; 
        font-size: 16pt; 
        font-weight: 600;
        padding: 2mm 4mm; 
        min-height: 8mm; 
        text-align: center;
        background: #f9f9f9;
        position: relative;
      }
      .valor:empty::after {
        content: '';
        display: inline-block;
        width: 100%;
        height: 8mm;
      }
    </style>
    </head><body>
      <div class="container">
        <div class="header">
          <div class="titulo">Formulário de Identificação do Material Cortado</div>
          <div class="sub">Lote: ${lote}</div>
        </div>
        
        <div class="form-grid">
          <div class="form-row">
            <div class="label">Cliente:</div>
            <div class="valor">${cliente}</div>
          </div>
          
          <div class="form-row">
            <div class="label">Item:</div>
            <div class="valor">${item}</div>
          </div>
          
          <div class="form-row">
            <div class="label">Medida:</div>
            <div class="valor">${medida}</div>
          </div>
          
          <div class="form-row">
            <div class="label">Pedido Tecno:</div>
            <div class="valor">${pedidoTecno}</div>
          </div>
          
          <div class="form-row dupla">
            <div class="label">Qtde:</div>
            <div class="valor">${qtde}</div>
            <div class="label">Palet:</div>
            <div class="valor">${pallet}</div>
          </div>
          
          <div class="form-row">
            <div class="label">Pedido Cli:</div>
            <div class="valor">${pedidoCli}</div>
          </div>
          
          <div class="form-row">
            <div class="label">Dureza:</div>
            <div class="valor">${durezaVal}</div>
          </div>
        </div>
      </div>
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
  const [qtdRefugo, setQtdRefugo] = useState('')
  const [comprimentoRefugo, setComprimentoRefugo] = useState('')
  const [durezaMaterial, setDurezaMaterial] = useState('')
  // Modal de listagem de apontamentos da ordem selecionada
  const [listarApontAberto, setListarApontAberto] = useState(false)
  const [showTimerModal, setShowTimerModal] = useState(false)
  // Modal pós-sucesso: continuar no mesmo item?
  const [continuarMesmoItemAberto, setContinuarMesmoItemAberto] = useState(false)
  // Modal para imprimir formulário de identificação
  const [imprimirAberto, setImprimirAberto] = useState(false)
  const [ultimoLote, setUltimoLote] = useState('')
  const [tipoImpressao, setTipoImpressao] = useState('documento') // 'documento' | 'etiqueta'
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
  const [amarradosSelecionadosRack, setAmarradosSelecionadosRack] = useState([]) // [{lote, codigo, ...}]
  const [lotesExpandidos, setLotesExpandidos] = useState([]) // [lote] - controla quais lotes estão expandidos
  // Digitar Lote de Extrusão manualmente
  const [manualAberto, setManualAberto] = useState(false)
  const [manualLotesTxt, setManualLotesTxt] = useState('')
  // Inspeção de amarrados do Rack
  const [inspAberto, setInspAberto] = useState(false)
  const [amarradosRack, setAmarradosRack] = useState([])
  const [amarradosSelecionados, setAmarradosSelecionados] = useState([]) // array de indices
  const [marcarTodosAmarrados, setMarcarTodosAmarrados] = useState(false)
  const [filtroPedidoInsp, setFiltroPedidoInsp] = useState('')
  const [filtroRomaneioInsp, setFiltroRomaneioInsp] = useState('')
  // Buscar por Amarrado (encontrar Rack/Embalagem pelo nº do amarrado)
  const [buscarAmarradoAberto, setBuscarAmarradoAberto] = useState(false)
  const [numeroAmarrado, setNumeroAmarrado] = useState('')
  const [resultadosAmarrado, setResultadosAmarrado] = useState([]) // [{rack, lote, produto, pedido_seq, romaneio, codigo, qt_kg, qtd_pc}]
  const [amarradosSelecionadosBusca, setAmarradosSelecionadosBusca] = useState([]) // indices dos amarrados selecionados na busca
  const [amarradosAcumulados, setAmarradosAcumulados] = useState([]) // todos os amarrados já selecionados nas buscas anteriores
  const amarradosFiltrados = useMemo(() => {
    const ped = String(filtroPedidoInsp || '').replace(/\D/g, '')
    const rom = String(filtroRomaneioInsp || '').replace(/\D/g, '')
    return amarradosRack.filter(a => {
      const pedOk = ped ? String(a.pedido_seq || '').replace(/\D/g, '').startsWith(ped) : true
      const romOk = rom ? String(a.romaneio || '').replace(/\D/g, '').startsWith(rom) : true
      return pedOk && romOk
    })
  }, [filtroPedidoInsp, filtroRomaneioInsp, amarradosRack])
  
  // Normaliza identificadores de Rack/Embalagem para números (remove tudo que não seja dígito)
  const normalizeRackId = (val) => {
    const s = String(val || '')
    const digits = s.replace(/\D/g, '')
    return digits
  }

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
      // Busca exata primeiro (como na versão que funcionava)
      let lista = (lotesDB || []).filter(l => String(l.rack_embalagem || '').trim() === rack)
      
      // Se não encontrou nada, tenta busca normalizada
      if (lista.length === 0) {
        const rackNorm = normalizeRackId(rack)
        if (rackNorm) {
          lista = (lotesDB || []).filter(l => {
            const lr = normalizeRackId(l.rack_embalagem)
            if (!lr) return false
            return lr === rackNorm || (lr.endsWith(rackNorm) && rackNorm.length >= 3)
          })
        }
      }
      
      // Agregar por número do lote, incluindo amarrados
      const map = new Map()
      for (const l of lista) {
        const num = String(l.lote || '').trim()
        if (!num) continue
        const pedidoSeq = String(l.pedido_seq || '').trim()
        const p = pedidoSeq.includes('/') ? pedidoSeq.split('/') : ['', '']
        const pedido = p[0] || ''
        const seq = p[1] || ''
        const produtoPlanilha = String(l.produto || getCampoOriginalLote(l, 'Produto') || l.codigo || '').trim()
        const ferramentaPlanilha = extrairFerramenta(produtoPlanilha || '')
        const amarradoCodigo = String(l.codigo || getCampoOriginalLote(l, 'Amarrado') || '').trim()
        
        if (!map.has(num)) {
          map.set(num, {
            lote: num,
            produto: produtoPlanilha,
            ferramenta: ferramentaPlanilha,
            romaneios: new Set(),
            pedido,
            seq,
            amarrados: []
          })
        }
        const entry = map.get(num)
        // Se em registros subsequentes houver produto não vazio, mantém o primeiro não vazio
        if (!entry.produto && produtoPlanilha) entry.produto = produtoPlanilha
        if (!entry.ferramenta && ferramentaPlanilha) entry.ferramenta = ferramentaPlanilha
        const rom = String(l.romaneio || '').trim()
        if (rom) entry.romaneios.add(rom)
        
        // Adicionar amarrado se não existir já
        if (amarradoCodigo && !entry.amarrados.some(a => a.codigo === amarradoCodigo)) {
          entry.amarrados.push({
            codigo: amarradoCodigo,
            rack: String(l.rack_embalagem || '').trim(),
            lote: num,
            produto: produtoPlanilha,
            pedido_seq: pedidoSeq,
            romaneio: rom,
            qt_kg: Number(l.qt_kg || 0),
            qtd_pc: Number(l.qtd_pc || 0),
            situacao: String(l.situacao || '').trim(),
            embalagem_data: l.embalagem_data || null,
            nota_fiscal: String(l.nota_fiscal || '').trim()
          })
        }
      }
      
      // Converter para array e mesclar romaneios únicos
      const unicos = Array.from(map.values()).map(e => ({
        lote: e.lote,
        produto: e.produto,
        ferramenta: e.ferramenta,
        romaneio: Array.from(e.romaneios).join(', '),
        pedido: e.pedido,
        seq: e.seq,
        amarrados: e.amarrados
      }))
      setLotesEncontrados(unicos)
      setLotesSelecionados(prev => prev.filter(v => unicos.some(x => x.lote === v)))
    } catch { setLotesEncontrados([]) }
  }

  // Busca o Rack/Embalagem a partir do número do Amarrado informado
  const procurarRackPorAmarrado = () => {
    const raw = String(numeroAmarrado || '').trim()
    const digits = raw.replace(/\D/g, '')
    if (!digits) { setResultadosAmarrado([]); setAmarradosSelecionadosBusca([]); return }
    try {
      const achados = []
      for (const l of (lotesDB || [])) {
        const loteStr = String(l.lote || '').replace(/\D/g, '')
        const codigoStr = String(l.codigo || '').replace(/\D/g, '')
        const origAmarr = String(getCampoOriginalLote(l, 'Amarrado') || '').replace(/\D/g, '')
        const match = (loteStr && loteStr.includes(digits)) || (codigoStr && codigoStr.includes(digits)) || (origAmarr && origAmarr.includes(digits))
        if (match) {
          achados.push({
            rack: String(l.rack_embalagem || '').trim(),
            lote: String(l.lote || '').trim(),
            produto: String(l.produto || getCampoOriginalLote(l, 'Produto') || '').trim(),
            pedido_seq: String(l.pedido_seq || '').trim(),
            romaneio: String(l.romaneio || '').trim(),
            codigo: String(l.codigo || '').trim(),
            qt_kg: Number(l.qt_kg || 0),
            qtd_pc: Number(l.qtd_pc || 0)
          })
        }
      }
      setResultadosAmarrado(achados)
      setAmarradosSelecionadosBusca([])
    } catch { 
      setResultadosAmarrado([])
      setAmarradosSelecionadosBusca([])
    }
  }

  // Salva apenas os amarrados selecionados como lotes externos
  const salvarAmarradosSelecionados = () => {
    const selecionados = amarradosSelecionadosBusca.map(idx => resultadosAmarrado[idx])
    if (!selecionados.length) {
      alert('Selecione pelo menos um amarrado.')
      return
    }
    
    // Extrai os números dos lotes dos amarrados selecionados
    const novosLotes = selecionados.map(a => a.lote).filter(Boolean)
    
    // Coleta todos os racks únicos dos amarrados selecionados
    const racksUnicos = Array.from(new Set(selecionados.map(a => a.rack).filter(Boolean)))
    
    // Adiciona os novos lotes aos já existentes (sem duplicar)
    const lotesExistentes = lotesSelecionados || []
    const lotesUnicos = Array.from(new Set([...lotesExistentes, ...novosLotes]))
    
    // Atualiza os lotes selecionados no modal principal
    setLotesSelecionados(lotesUnicos)
    
    // Não preenche o campo Rack!Embalagem quando usar "Procurar por Amarrado"
    // Deixa vazio para evitar conflitos, já que os amarrados podem vir de racks diferentes
    
    // Cria objetos de lote para exibição na lista "Lotes encontrados"
    const novosLotesObj = selecionados.map(a => ({
      lote: a.lote,
      produto: a.produto,
      ferramenta: extrairFerramenta(a.produto || ''),
      romaneio: a.romaneio,
      pedido: a.pedido_seq ? a.pedido_seq.split('/')[0] : '',
      seq: a.pedido_seq ? a.pedido_seq.split('/')[1] : '',
      rack: a.rack // Adiciona informação do rack para cada lote
    }))
    
    // Adiciona aos lotes encontrados (sem duplicar)
    setLotesEncontrados(prev => {
      const existentes = prev.filter(l => !novosLotes.includes(l.lote))
      return [...existentes, ...novosLotesObj]
    })
    
    // Adiciona aos amarrados acumulados para mostrar na lateral
    setAmarradosAcumulados(prev => {
      const existentes = prev.filter(a => !novosLotes.includes(a.lote))
      return [...existentes, ...selecionados]
    })
    
    // Limpa a seleção atual da busca
    setAmarradosSelecionadosBusca([])
    setResultadosAmarrado([])
    setNumeroAmarrado('')
    
    alert(`${selecionados.length} amarrado(s) adicionado(s) à seleção. Total: ${lotesUnicos.length} lote(s) selecionado(s).`)
  }

  // Marca/desmarca um número de lote
  const toggleLoteSelecionado = (num) => {
    setLotesSelecionados(prev => prev.includes(num) ? prev.filter(x => x !== num) : [...prev, num])
  }

  // Marca/desmarca um amarrado específico
  const toggleAmarradoSelecionado = (amarrado) => {
    setAmarradosSelecionadosRack(prev => {
      const existe = prev.some(a => a.codigo === amarrado.codigo && a.lote === amarrado.lote)
      if (existe) {
        return prev.filter(a => !(a.codigo === amarrado.codigo && a.lote === amarrado.lote))
      } else {
        return [...prev, amarrado]
      }
    })
  }

  // Seleciona todos os amarrados de um lote
  const selecionarTodosAmarradosDoLote = (lote) => {
    const loteObj = lotesEncontrados.find(l => l.lote === lote)
    if (!loteObj || !loteObj.amarrados) return
    
    setAmarradosSelecionadosRack(prev => {
      // Remove amarrados existentes deste lote
      const semEsteL = prev.filter(a => a.lote !== lote)
      // Adiciona todos os amarrados do lote
      return [...semEsteL, ...loteObj.amarrados]
    })
  }

  // Desmarca todos os amarrados de um lote
  const desmarcarTodosAmarradosDoLote = (lote) => {
    setAmarradosSelecionadosRack(prev => prev.filter(a => a.lote !== lote))
  }

  // Verifica se todos os amarrados de um lote estão selecionados
  const todoAmarradosDoLoteSelecionados = (lote) => {
    const loteObj = lotesEncontrados.find(l => l.lote === lote)
    if (!loteObj || !loteObj.amarrados || loteObj.amarrados.length === 0) return false
    return loteObj.amarrados.every(a => 
      amarradosSelecionadosRack.some(sel => sel.codigo === a.codigo && sel.lote === a.lote)
    )
  }

  // Toggle expandir/recolher lote
  const toggleLoteExpandido = (lote) => {
    setLotesExpandidos(prev => 
      prev.includes(lote) ? prev.filter(l => l !== lote) : [...prev, lote]
    )
  }

  // Salva Rack e lotes escolhidos no formulário principal
  const salvarRackELotes = () => {
    const rack = String(rackDigitado || '').trim()
    
    // Prioriza amarrados selecionados individualmente
    if (amarradosSelecionadosRack.length > 0) {
      const lotesUnicos = Array.from(new Set(amarradosSelecionadosRack.map(a => a.lote)))
      const racksUnicos = Array.from(new Set(amarradosSelecionadosRack.map(a => a.rack).filter(Boolean)))
      const rackFinal = racksUnicos.length > 1 ? 'MÚLTIPLOS RACKS' : (racksUnicos[0] || rack)
      
      setFormData(prev => ({
        ...prev,
        rack_ou_pallet: rackFinal,
        rackOuPallet: rackFinal,
        lotesExternos: lotesUnicos,
        amarradosDetalhados: amarradosSelecionadosRack
      }))
      setRackModalAberto(false)
      setAmarradosSelecionadosRack([])
      setLotesExpandidos([])
      return
    }
    
    // Verifica se há lotes selecionados
    if (!lotesSelecionados.length) { 
      if (!window.confirm('Nenhum lote selecionado. Deseja continuar assim mesmo?')) return 
    }
    
    // Se não há rack definido mas há lotes selecionados (vindos da busca por amarrado)
    if (!rack && lotesSelecionados.length > 0) {
      // Verifica se os lotes têm informação de rack individual
      const lotesComRack = lotesEncontrados.filter(l => lotesSelecionados.includes(l.lote) && l.rack)
      
      if (lotesComRack.length > 0) {
        // Usa "MÚLTIPLOS RACKS" se há lotes de racks diferentes, senão usa o rack único
        const racksUnicos = Array.from(new Set(lotesComRack.map(l => l.rack)))
        const rackFinal = racksUnicos.length > 1 ? 'MÚLTIPLOS RACKS' : racksUnicos[0]
        
        setFormData(prev => ({
          ...prev,
          rack_ou_pallet: rackFinal,
          rackOuPallet: rackFinal,
          lotesExternos: [...lotesSelecionados]
        }))
        setRackModalAberto(false)
        setAmarradosSelecionadosRack([])
        return
      }
    }
    
    // Fluxo normal: exige rack quando não há lotes ou quando rack foi digitado
    if (!rack) { 
      alert('Informe o Rack!Embalagem ou use "Procurar por Amarrado" para selecionar lotes.'); 
      return 
    }
    
    setFormData(prev => ({
      ...prev,
      rack_ou_pallet: rack,
      rackOuPallet: rack,
      lotesExternos: [...lotesSelecionados]
    }))
    setRackModalAberto(false)
    setAmarradosSelecionadosRack([])
  }
  
  // Lista simulada de operadores (máquinas virão do IndexedDB)
  const operadores = [
    { id: 1, nome: 'João Silva' },
    { id: 2, nome: 'Maria Oliveira' },
    { id: 3, nome: 'Carlos Santos' }
  ]
  // Máquinas reais cadastradas em Configurações (IndexedDB)
  const { items: maquinas } = useSupabase('maquinas')
  
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
  const ordensTrabalhoTodas = pedidosDB.map(p => {
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
  
  // Aplicar filtro de prioridades se ativo
  const ordensTrabalho = filtrarPrioridades 
    ? ordensTrabalhoTodas.filter(o => pedidosPrioritarios.has(o.id))
    : ordensTrabalhoTodas

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
    const idStr = String(o.id || '').toLowerCase()
    const idDigits = idStr.replace(/\D/g, '')
    const pedCliStr = String(o.pedidoCliente || '').toLowerCase()
    const pedCliDigits = pedCliStr.replace(/\D/g, '')

    // 1) Busca numérica: tenta comprimento (prefixo) e Pedido/Seq por dígitos
    if (tDigits) {
      if (comprimentoNum.startsWith(tDigits)) return true
      if (idDigits.includes(tDigits)) return true
      if (pedCliDigits && pedCliDigits.includes(tDigits)) return true
    }

    // 2) Busca textual (case-insensitive)
    if (idStr.includes(t)) return true
    if ((o.ferramenta || '').toLowerCase().includes(t)) return true
    if ((o.codigoPerfil || '').toLowerCase().includes(t)) return true
    if (pedCliStr.includes(t)) return true
    if ((o.cliente || '').toLowerCase().includes(t)) return true

    return false
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
    setQtdRefugo('')
    setComprimentoRefugo('')
    setDurezaMaterial('')
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
    
    // Prepara detalhes completos dos amarrados para rastreabilidade
    const amarradosDetalhados = []
    if (formData.lotesExternos && formData.lotesExternos.length > 0) {
      // Busca detalhes completos de cada lote selecionado na base de dados
      for (const loteNum of formData.lotesExternos) {
        const loteDetalhado = (lotesDB || []).find(l => String(l.lote || '').trim() === loteNum)
        if (loteDetalhado) {
          amarradosDetalhados.push({
            codigo: String(loteDetalhado.codigo || '').trim(),
            rack: String(loteDetalhado.rack_embalagem || '').trim(),
            lote: String(loteDetalhado.lote || '').trim(),
            produto: String(loteDetalhado.produto || getCampoOriginalLote(loteDetalhado, 'Produto') || '').trim(),
            pedido_seq: String(loteDetalhado.pedido_seq || '').trim(),
            romaneio: String(loteDetalhado.romaneio || '').trim(),
            qt_kg: Number(loteDetalhado.qt_kg || 0),
            qtd_pc: Number(loteDetalhado.qtd_pc || 0),
            situacao: String(loteDetalhado.situacao || '').trim(),
            embalagem_data: loteDetalhado.embalagem_data || null,
            nota_fiscal: String(loteDetalhado.nota_fiscal || '').trim()
          })
        }
      }
    }

    const payloadDB = {
      operador: formData.operador || (user ? user.nome : ''),
      maquina: formData.maquina || '',
      produto: formData.codigoPerfil || '',
      cliente: formData.cliente || '',
      inicio: localInputToISO(formData.inicio),
      fim: formData.fim ? localInputToISO(formData.fim) : null,
      quantidade: qtdForm,
      qtd_refugo: Number(qtdRefugo || 0),
      comprimento_refugo: Number(comprimentoRefugo || 0),
      qtd_pedido: formData.qtdPedido ? Number(formData.qtdPedido) : null,
      nro_op: formData.nroOp || '',
      perfil_longo: formData.perfilLongo || '',
      comprimento_acabado_mm: Number(String(formData.comprimentoAcabado || '').replace(/\D/g, '')) || null,
      ordem_trabalho: formData.ordemTrabalho || '',
      observacoes: formData.observacoes || '',
      rack_ou_pallet: rackOuPallet || '',
      dureza_material: durezaMaterial || '',
      // Guardar seleção de lotes internos/externos na coluna padronizada
      lotes_externos: (formData.lotesExternos && formData.lotesExternos.length ? [...formData.lotesExternos] : []),
      lote: lote,
      romaneio_numero: formData.romaneioNumero || '',
      lote_externo: formData.loteExterno || '',
      // NOVO: Detalhes completos dos amarrados para rastreabilidade
      amarrados_detalhados: amarradosDetalhados.length > 0 ? amarradosDetalhados : null,
    }
    try {
      await addApont(payloadDB)
      console.log('Apontamento confirmado (Supabase):', payloadDB)
      
      // Força atualização dos apontamentos para garantir que o cálculo seja atualizado
      setTimeout(() => {
        recarregarApontamentos()
      }, 500)
      
    } catch (err) {
      console.error('Falha ao registrar apontamento no Supabase:', err)
      alert('Não foi possível registrar o apontamento no Supabase. Verifique a conexão e o schema.\nDetalhes: ' + (err?.message || 'erro desconhecido'))
      return
    }
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
    if (tipoImpressao === 'etiqueta') {
      imprimirEtiquetaTermica(ultimoLote, formData.quantidade, rackOuPallet, durezaMaterial)
    } else {
      imprimirDocumentoIdentificacao(ultimoLote, formData.quantidade, rackOuPallet, durezaMaterial)
    }
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
      console.log('Calculando totalApontado para:', chave)
      console.log('ApontamentosDB:', apontamentosDB?.length || 0, 'registros')
      
      const total = (apontamentosDB || []).reduce((acc, a) => {
        const seq = String(a.ordem_trabalho || a.ordemTrabalho || a.pedido_seq || '')
        const qtd = Number(a.quantidade || a.quantidadeProduzida || 0)
        const match = seq === chave
        
        if (match) {
          console.log('Match encontrado:', { seq, qtd, apontamento: a })
        }
        
        return acc + (match ? (isNaN(qtd) ? 0 : qtd) : 0)
      }, 0)
      
      console.log('Total calculado:', total)
      return total
    } catch (e) {
      console.error('Erro ao calcular totalApontado:', e)
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
      {/* Modal: Procurar por Amarrado */}
      {buscarAmarradoAberto && (
        <div className="fixed inset-0 z-[67] flex items-center justify-center">
          <div className="absolute inset-0 bg-black bg-opacity-30" onClick={() => setBuscarAmarradoAberto(false)}></div>
          <div className="relative bg-white rounded-lg shadow-lg w-full max-w-7xl h-[90vh] p-5 form-compact flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold text-gray-800">Procurar Amarrados</h3>
              <button className="text-sm text-gray-600 hover:text-gray-900" onClick={() => setBuscarAmarradoAberto(false)}>Fechar</button>
            </div>
            {/* Layout em duas colunas */}
            <div className="flex-1 flex gap-4 min-h-0">
              {/* Coluna esquerda - Busca */}
              <div className="flex-1 flex flex-col space-y-3">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="block label-sm font-medium text-gray-700 mb-1">Número do Amarrado</label>
                    <input
                      type="text"
                      className="input-field input-field-sm w-full"
                      value={numeroAmarrado}
                      onChange={(e)=> setNumeroAmarrado(e.target.value)}
                      placeholder="Digite o nº do amarrado (pode colar parcial)"
                      onKeyPress={(e) => e.key === 'Enter' && procurarRackPorAmarrado()}
                    />
                  </div>
                  <button type="button" className="btn-primary" onClick={procurarRackPorAmarrado}>Procurar</button>
                  <button 
                    type="button" 
                    className="btn-outline" 
                    onClick={() => { setNumeroAmarrado(''); setResultadosAmarrado([]); setAmarradosSelecionadosBusca([]) }}
                  >
                    Limpar
                  </button>
                </div>
                
                {resultadosAmarrado.length > 0 && (
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      {resultadosAmarrado.length} amarrado(s) encontrado(s) • {amarradosSelecionadosBusca.length} selecionado(s)
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={amarradosSelecionadosBusca.length === resultadosAmarrado.length && resultadosAmarrado.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAmarradosSelecionadosBusca(resultadosAmarrado.map((_, idx) => idx))
                          } else {
                            setAmarradosSelecionadosBusca([])
                          }
                        }}
                      />
                      Selecionar todos
                    </label>
                  </div>
                )}

                <div className="border rounded flex-1 overflow-auto">
                  {(!resultadosAmarrado || resultadosAmarrado.length === 0) && (
                    <div className="text-sm text-gray-500 p-4 text-center">
                      {numeroAmarrado ? 'Nenhum amarrado encontrado.' : 'Informe o número do amarrado e clique em Procurar.'}
                    </div>
                  )}
                  
                  {resultadosAmarrado.length > 0 && (
                    <table className="min-w-full text-xs">
                      <thead className="bg-gray-50 text-gray-600 sticky top-0">
                        <tr>
                          <th className="p-2 w-8"></th>
                          <th className="p-2 text-left">Rack/Embalagem</th>
                          <th className="p-2 text-left">Código</th>
                          <th className="p-2 text-left">Lote</th>
                          <th className="p-2 text-left">Produto</th>
                          <th className="p-2 text-left">Pedido/Seq</th>
                          <th className="p-2 text-left">Romaneio</th>
                          <th className="p-2 text-right">Qt Kg</th>
                          <th className="p-2 text-right">Qtd PC</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resultadosAmarrado.map((amarrado, idx) => (
                          <tr key={idx} className="border-t hover:bg-gray-50">
                            <td className="p-2 text-center">
                              <input
                                type="checkbox"
                                checked={amarradosSelecionadosBusca.includes(idx)}
                                onChange={() => {
                                  setAmarradosSelecionadosBusca(prev => 
                                    prev.includes(idx) 
                                      ? prev.filter(i => i !== idx)
                                      : [...prev, idx]
                                  )
                                }}
                              />
                            </td>
                            <td className="p-2 font-semibold">{amarrado.rack || '-'}</td>
                            <td className="p-2">{amarrado.codigo || '-'}</td>
                            <td className="p-2">{amarrado.lote || '-'}</td>
                            <td className="p-2">{amarrado.produto || '-'}</td>
                            <td className="p-2">{amarrado.pedido_seq || '-'}</td>
                            <td className="p-2">{amarrado.romaneio || '-'}</td>
                            <td className="p-2 text-right">{Number.isFinite(amarrado.qt_kg) ? amarrado.qt_kg : '-'}</td>
                            <td className="p-2 text-right">{Number.isFinite(amarrado.qtd_pc) ? amarrado.qtd_pc : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Coluna direita - Amarrados Selecionados */}
              <div className="w-80 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-800">Amarrados Selecionados ({amarradosAcumulados.length})</h4>
                  {amarradosAcumulados.length > 0 && (
                    <button
                      type="button"
                      className="text-xs text-red-600 hover:text-red-800"
                      onClick={() => {
                        if (window.confirm('Deseja limpar todos os amarrados selecionados?')) {
                          setAmarradosAcumulados([])
                          setLotesEncontrados([])
                          setLotesSelecionados([])
                        }
                      }}
                    >
                      Limpar todos
                    </button>
                  )}
                </div>
                <div className="border rounded bg-gray-50 flex-1 overflow-auto p-3">
                  {amarradosAcumulados.length === 0 && (
                    <div className="text-sm text-gray-500 text-center py-8">
                      Nenhum amarrado selecionado ainda.
                    </div>
                  )}
                  <div className="space-y-2">
                    {amarradosAcumulados.map((amarrado, idx) => (
                      <div key={idx} className="bg-white border rounded p-2 text-xs">
                        <div className="font-semibold">Lote: {amarrado.lote}</div>
                        <div className="text-gray-600 mt-1">
                          <div>Rack: <span className="font-semibold text-blue-600">{amarrado.rack}</span></div>
                          <div>Produto: {amarrado.produto}</div>
                          <div>Pedido/Seq: {amarrado.pedido_seq}</div>
                          <div>Romaneio: {amarrado.romaneio}</div>
                        </div>
                        <button
                          type="button"
                          className="mt-1 text-red-500 hover:text-red-700 text-xs"
                          onClick={() => {
                            // Remove este amarrado específico
                            const novoAcumulados = amarradosAcumulados.filter((_, i) => i !== idx)
                            setAmarradosAcumulados(novoAcumulados)
                            
                            // Remove dos lotes selecionados também
                            setLotesSelecionados(prev => prev.filter(l => l !== amarrado.lote))
                            setLotesEncontrados(prev => prev.filter(l => l.lote !== amarrado.lote))
                          }}
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-4 flex justify-between">
              <div className="flex gap-2">
                <button 
                  type="button" 
                  className="btn-outline" 
                  onClick={() => setBuscarAmarradoAberto(false)}
                >
                  Cancelar
                </button>
              </div>
              <div className="flex gap-2">
                <button 
                  type="button" 
                  className="btn-primary"
                  onClick={salvarAmarradosSelecionados}
                  disabled={amarradosSelecionadosBusca.length === 0}
                >
                  Adicionar à Seleção ({amarradosSelecionadosBusca.length})
                </button>
                <button 
                  type="button" 
                  className="btn-success"
                  onClick={() => setBuscarAmarradoAberto(false)}
                  disabled={amarradosAcumulados.length === 0}
                >
                  Finalizar ({amarradosAcumulados.length} lotes)
                </button>
              </div>
            </div>
          </div>
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
      {/* Modal: Digitar Lote de Extrusão (manual) */}
      {manualAberto && (
        <div className="fixed inset-0 z-[67] flex items-center justify-center">
          <div className="absolute inset-0 bg-black bg-opacity-30" onClick={()=>setManualAberto(false)}></div>
          <div className="relative bg-white rounded-lg shadow-lg w-full max-w-md p-5 form-compact">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold text-gray-800">Digitar Lote de Extrusão</h3>
            </div>
            <div className="text-sm text-gray-600 mb-3">Informe um ou mais lotes, separados por vírgula, espaço ou quebra de linha.</div>
            <textarea
              className="w-full border rounded p-2 text-sm h-32"
              placeholder="Ex.: 125210022, 225390040"
              value={manualLotesTxt}
              onChange={(e)=>setManualLotesTxt(e.target.value)}
            ></textarea>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="btn-outline" onClick={()=>setManualAberto(false)}>Cancelar</button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  const tokens = String(manualLotesTxt || '')
                    .split(/[^0-9]+/)
                    .map(s => s.trim())
                    .filter(Boolean)
                  if (!tokens.length) { alert('Nenhum número de lote informado.'); return }
                  // adiciona na seleção do modal principal
                  setLotesSelecionados(prev => Array.from(new Set([...(prev||[]), ...tokens])))
                  setManualAberto(false)
                }}
              >
                Adicionar à seleção
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
                      
                      // Busca exata primeiro (como na versão que funcionava)
                      let lista = (lotesDB || []).filter(l => String(l.rack_embalagem || '').trim() === r)
                      
                      // Se não encontrou nada, tenta busca normalizada
                      if (lista.length === 0) {
                        const rNorm = normalizeRackId(r)
                        if (rNorm) {
                          lista = (lotesDB || []).filter(l => {
                            const lr = normalizeRackId(l.rack_embalagem)
                            if (!lr) return false
                            return lr === rNorm || (lr.endsWith(rNorm) && rNorm.length >= 3)
                          })
                        }
                      }
                      
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
                  <button
                    type="button"
                    className="px-3 py-1.5 text-xs rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
                    title="Procurar o Rack pelo número do Amarrado"
                    onClick={() => { 
                      setBuscarAmarradoAberto(true); 
                      setNumeroAmarrado(''); 
                      setResultadosAmarrado([]);
                      setAmarradosSelecionadosBusca([]);
                      // Inicializa amarrados acumulados com os lotes já encontrados
                      const lotesJaEncontrados = lotesEncontrados.filter(l => l.rack).map(l => ({
                        rack: l.rack,
                        lote: l.lote,
                        produto: l.produto,
                        pedido_seq: `${l.pedido}/${l.seq}`,
                        romaneio: l.romaneio
                      }));
                      setAmarradosAcumulados(lotesJaEncontrados);
                    }}
                  >
                    Procurar por Amarrado
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1.5 text-xs rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
                    title="Digitar Lote de Extrusão manualmente"
                    onClick={() => { setManualAberto(true); setManualLotesTxt('') }}
                  >
                    Digitar Lote
                  </button>
                </div>
              </div>
              <div>
                <label className="block label-sm font-medium text-gray-700 mb-1">Lotes encontrados</label>
                <div className="max-h-72 overflow-auto border rounded p-3 space-y-2">
                  {lotesEncontrados.length === 0 && (
                    <div className="text-sm text-gray-500">
                      {rackDigitado 
                        ? 'Nenhum lote encontrado para este Rack.'
                        : 'Informe o Rack!Embalagem ou use "Procurar por Amarrado" para adicionar lotes.'
                      }
                    </div>
                  )}
                  {lotesEncontrados.map((l) => (
                    <div key={l.lote} className="border rounded p-3 bg-gray-50">
                      <div className="flex items-start gap-3 text-sm">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={todoAmarradosDoLoteSelecionados(l.lote)}
                          onChange={() => {
                            if (todoAmarradosDoLoteSelecionados(l.lote)) {
                              desmarcarTodosAmarradosDoLote(l.lote)
                            } else {
                              selecionarTodosAmarradosDoLote(l.lote)
                            }
                          }}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="font-semibold whitespace-nowrap">
                              Lote: {l.lote} ({l.amarrados?.length || 0} amarrados)
                            </div>
                            {l.amarrados && l.amarrados.length > 0 && (
                              <button
                                type="button"
                                className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded border border-blue-200 hover:bg-blue-50"
                                onClick={() => toggleLoteExpandido(l.lote)}
                              >
                                {lotesExpandidos.includes(l.lote) ? 'Recolher' : 'Expandir'}
                              </button>
                            )}
                          </div>
                          <div className="text-gray-700 text-xs mt-1">
                            <div>Produto: {l.produto || '-'}</div>
                            <div>
                              Ferramenta: {l.ferramenta ? (
                                <span className="inline-block px-2 py-0.5 rounded bg-primary-50 text-primary-700 font-semibold">{l.ferramenta}</span>
                              ) : '-'}
                            </div>
                            {l.rack && (
                              <div>Rack: <span className="font-semibold text-blue-600">{l.rack}</span></div>
                            )}
                            <div>Romaneio: {l.romaneio || '-'}</div>
                            <div>Pedido: {l.pedido || '-'}</div>
                            <div>Seq: {l.seq || '-'}</div>
                          </div>
                          
                          {/* Lista de amarrados - só mostra se expandido */}
                          {l.amarrados && l.amarrados.length > 0 && lotesExpandidos.includes(l.lote) && (
                            <div className="mt-2 border-t pt-2">
                              <div className="text-xs font-medium text-gray-600 mb-1">Amarrados:</div>
                              <div className="space-y-1 max-h-32 overflow-y-auto">
                                {l.amarrados.map((amarrado, idx) => (
                                  <div key={`${amarrado.lote}-${amarrado.codigo}`} className="flex items-center gap-2 text-xs">
                                    <input
                                      type="checkbox"
                                      className="text-xs"
                                      checked={amarradosSelecionadosRack.some(a => a.codigo === amarrado.codigo && a.lote === amarrado.lote)}
                                      onChange={() => toggleAmarradoSelecionado(amarrado)}
                                    />
                                    <span className="font-mono text-blue-600">{amarrado.codigo}</span>
                                    <span className="text-gray-500">
                                      {amarrado.qt_kg > 0 && `${amarrado.qt_kg}kg`}
                                      {amarrado.qtd_pc > 0 && ` ${amarrado.qtd_pc}pcs`}
                                    </span>
                                    {amarrado.romaneio && (
                                      <span className="text-gray-400">Rom: {amarrado.romaneio}</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="btn-outline" onClick={()=>{setRackModalAberto(false); setAmarradosSelecionadosRack([]); setLotesExpandidos([])}}>Cancelar</button>
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
            <div className="text-sm text-gray-700 space-y-3">
              <p>Apontamento registrado com sucesso.</p>
              <p><strong>Lote gerado:</strong> {ultimoLote}</p>
              <p>Escolha o tipo de impressão:</p>
              <div className="space-y-2">
                {(() => {
                  const configImpressoras = getConfiguracaoImpressoras()
                  return (
                    <>
                      <label className={`flex items-center gap-2 p-3 border rounded cursor-pointer hover:bg-gray-50 ${!configImpressoras.comum.ativa ? 'opacity-50' : ''}`}>
                        <input 
                          type="radio" 
                          name="tipoImpressao" 
                          value="documento" 
                          checked={tipoImpressao === 'documento'} 
                          onChange={(e) => setTipoImpressao(e.target.value)}
                          className="w-4 h-4"
                          disabled={!configImpressoras.comum.ativa}
                        />
                        <div className="flex-1">
                          <div className="font-semibold">🖨️ Formulário Completo (A4)</div>
                          <div className="text-xs text-gray-500">Documento A4 para identificação do rack</div>
                          <div className="text-xs text-blue-600 mt-1">
                            {configImpressoras.comum.ativa 
                              ? `📍 ${configImpressoras.comum.nome}` 
                              : '⚠️ Impressora não configurada'}
                          </div>
                        </div>
                      </label>
                      <label className={`flex items-center gap-2 p-3 border rounded cursor-pointer hover:bg-gray-50 ${!configImpressoras.termica.ativa ? 'opacity-50' : ''}`}>
                        <input 
                          type="radio" 
                          name="tipoImpressao" 
                          value="etiqueta" 
                          checked={tipoImpressao === 'etiqueta'} 
                          onChange={(e) => setTipoImpressao(e.target.value)}
                          className="w-4 h-4"
                          disabled={!configImpressoras.termica.ativa}
                        />
                        <div className="flex-1">
                          <div className="font-semibold">🏷️ Etiqueta Térmica (100x45mm)</div>
                          <div className="text-xs text-gray-500">Etiqueta compacta para impressora térmica</div>
                          <div className="text-xs text-blue-600 mt-1">
                            {configImpressoras.termica.ativa 
                              ? `📍 ${configImpressoras.termica.nome}` 
                              : '⚠️ Impressora não configurada'}
                          </div>
                        </div>
                      </label>
                    </>
                  )
                })()}
              </div>
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
          <div className="grid grid-cols-1 md:grid-cols-5 grid-compact">
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
              <div className="flex items-center justify-between mb-1">
                <label className="block label-sm font-medium text-gray-700">
                  Pedido/Seq
                </label>
                <button
                  type="button"
                  onClick={() => setFiltrarPrioridades(!filtrarPrioridades)}
                  className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded transition-colors ${
                    filtrarPrioridades 
                      ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' 
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                  title={filtrarPrioridades ? 'Mostrando apenas prioritários' : 'Mostrar apenas prioritários'}
                >
                  <FaStar className={filtrarPrioridades ? 'text-yellow-500' : 'text-gray-400'} />
                  <span>{filtrarPrioridades ? 'Prioritários' : 'Todos'}</span>
                </button>
              </div>
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
              {/* Mensagem de ferramenta removida para reduzir ruído visual */}
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
                      className="btn-primary flex-1 h-9 disabled:opacity-60 disabled:cursor-not-allowed"
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
                    className="btn-secondary flex items-center justify-center gap-2 h-9 px-3 disabled:opacity-60 disabled:cursor-not-allowed"
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

            
            {/* Linha extra dentro da mesma grid para reduzir espaçamento vertical */}
            <div className="md:col-start-1">
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
          
          <div className="md:col-span-5">
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

          {/* Seção de Amarrados/Lotes Selecionados */}
          {((formData.lotesExternos && formData.lotesExternos.length > 0) || (formData.amarradosDetalhados && formData.amarradosDetalhados.length > 0)) && (
            <div className="col-span-full">
              <div className="flex items-center justify-between mb-2">
                <label className="block label-sm font-medium text-gray-700">
                  {formData.amarradosDetalhados && formData.amarradosDetalhados.length > 0 
                    ? `Amarrados Selecionados (${formData.amarradosDetalhados.length})`
                    : `Lotes Selecionados (${formData.lotesExternos?.length || 0})`
                  }
                </label>
                <div className="flex items-center gap-2">
                  {formData.rack_ou_pallet && (
                    <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                      Rack: {formData.rack_ou_pallet}
                    </span>
                  )}
                  <button
                    type="button"
                    className="text-xs text-red-600 hover:text-red-800"
                    onClick={() => {
                      if (window.confirm('Deseja remover todos os amarrados/lotes selecionados?')) {
                        setFormData(prev => ({
                          ...prev,
                          lotesExternos: [],
                          loteExterno: '',
                          rack_ou_pallet: '',
                          rackOuPallet: '',
                          amarradosDetalhados: []
                        }))
                      }
                    }}
                    title="Remover todos os amarrados/lotes"
                  >
                    Limpar todos
                  </button>
                </div>
              </div>
              <div className="border rounded p-3 bg-gray-50 max-h-32 overflow-auto">
                <div className="flex flex-wrap gap-2">
                  {/* Mostra amarrados detalhados se existirem */}
                  {formData.amarradosDetalhados && formData.amarradosDetalhados.length > 0 ? (
                    formData.amarradosDetalhados.map((amarrado, idx) => (
                      <div key={idx} className="flex items-center gap-1 bg-white border rounded px-2 py-1 text-sm">
                        <span className="font-mono text-blue-600">{amarrado.codigo}</span>
                        <span className="text-xs text-gray-500">({amarrado.lote})</span>
                        {amarrado.qt_kg > 0 && (
                          <span className="text-xs text-gray-400">{amarrado.qt_kg}kg</span>
                        )}
                        <button
                          type="button"
                          className="text-red-500 hover:text-red-700 ml-1"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              amarradosDetalhados: prev.amarradosDetalhados.filter((_, i) => i !== idx)
                            }))
                          }}
                          title="Remover este amarrado"
                        >
                          ×
                        </button>
                      </div>
                    ))
                  ) : (
                    /* Fallback para lotes simples */
                    formData.lotesExternos?.map((lote, idx) => (
                      <div key={idx} className="flex items-center gap-1 bg-white border rounded px-2 py-1 text-sm">
                        <span className="font-mono">{lote}</span>
                        <button
                          type="button"
                          className="text-red-500 hover:text-red-700 ml-1"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              lotesExternos: prev.lotesExternos.filter((_, i) => i !== idx),
                              loteExterno: prev.lotesExternos.length === 1 ? '' : prev.loteExterno
                            }))
                          }}
                          title="Remover este lote"
                        >
                          ×
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

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
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Refugos/Sucata (PCs)</label>
                  <input type="number" className="input-field input-field-sm" placeholder="0" value={qtdRefugo} onChange={(e)=>setQtdRefugo(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Compr (mm)</label>
                  <input type="number" className="input-field input-field-sm" placeholder="0" value={comprimentoRefugo} onChange={(e)=>setComprimentoRefugo(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Número do Rack ou Pallet</label>
                <input type="text" className="input-field input-field-sm" placeholder="Ex.: RACK-12 ou P-07" value={rackOuPallet} onChange={(e)=>setRackOuPallet(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Dureza do Material</label>
                <input type="text" className="input-field input-field-sm" placeholder="Ex.: HRC 45-50" value={durezaMaterial} onChange={(e)=>setDurezaMaterial(e.target.value)} />
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
                            // Abrir modal de Rack!Embalagem e Lotes (novo fluxo)
                            setPedidoSeqSelecionado(o.id)
                            setRackDigitado('')
                            setLotesEncontrados([])
                            setLotesSelecionados([])
                            setRackModalAberto(true)
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
