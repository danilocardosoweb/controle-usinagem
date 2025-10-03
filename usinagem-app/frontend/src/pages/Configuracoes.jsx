import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FaUserPlus, FaEdit, FaTrash, FaSave, FaTimes, FaTools, FaIndustry, FaWrench, FaOilCan, FaFileUpload, FaDatabase, FaSync, FaFilePdf, FaExternalLinkAlt } from 'react-icons/fa'
import * as XLSX from 'xlsx'
import axios from 'axios'
import { useDatabase } from '../hooks/useDatabase'
import SyncService from '../services/SyncService'
import dbService from '../services/DatabaseService'
import supabaseService from '../services/SupabaseService'

const Configuracoes = () => {
  // Banco de dados de pedidos (para aba Dados)
  const { items: pedidosDB, addItems, clearItems, loadItems } = useDatabase('pedidos', true)
  // Lotes local (IndexedDB somente)
  const { items: lotesDB, addItems: addLotes, clearItems: clearLotes } = useDatabase('lotes', false)
  const [arquivo, setArquivo] = useState(null)
  const [arquivoLotes, setArquivoLotes] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [carregandoLotes, setCarregandoLotes] = useState(false)
  const [sincronizando, setSincronizando] = useState(false)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [erroLotes, setErroLotes] = useState('')
  const [mensagemLotes, setMensagemLotes] = useState('')
  const [qtLotesImportados, setQtLotesImportados] = useState(0)
  // Estados para gerenciamento de usuários
  const [usuarios, setUsuarios] = useState([])
  const [novoUsuario, setNovoUsuario] = useState({
    nome: '',
    email: '',
    senha: '',
    nivel_acesso: 'operador'
  })

  // =====================
  // Expedição • Parâmetros por Ferramenta
  // =====================
  const {
    items: ferramentasCfg,
    addItem: addCfg,
    updateItem: updateCfg,
    removeItem: removeCfg
  } = useDatabase('ferramentas_cfg', true)
  const [novoCfg, setNovoCfg] = useState({
    ferramenta: '',
    peso_linear: '', // kg por metro (ou unidade adequada)
    comprimento_mm: '',
    pcs_por_pallet: '',
    ripas_por_pallet: '',
    embalagem: 'pallet', // pallet | caixa
    pcs_por_caixa: ''
  })
  const [editandoCfg, setEditandoCfg] = useState(null)
  const [modoEdicaoCfg, setModoEdicaoCfg] = useState(false)

  const adicionarCfg = async () => {
    try {
      if (!novoCfg.ferramenta) { alert('Informe o código da ferramenta'); return }
      const isCaixa = (novoCfg.embalagem || 'pallet') === 'caixa'
      const payload = {
        ferramenta: String(novoCfg.ferramenta).trim(),
        peso_linear: Number(novoCfg.peso_linear) || 0,
        comprimento_mm: parseInt(novoCfg.comprimento_mm) || 0,
        pcs_por_pallet: isCaixa ? 0 : (parseInt(novoCfg.pcs_por_pallet) || 0),
        ripas_por_pallet: isCaixa ? 0 : (parseInt(novoCfg.ripas_por_pallet) || 0),
        embalagem: novoCfg.embalagem || 'pallet',
        pcs_por_caixa: isCaixa ? (parseInt(novoCfg.pcs_por_caixa) || 0) : 0
      }
      await addCfg(payload)
      setNovoCfg({ ferramenta: '', peso_linear: '', comprimento_mm: '', pcs_por_pallet: '', ripas_por_pallet: '', embalagem: 'pallet', pcs_por_caixa: '' })
      alert('Parâmetros adicionados')
    } catch (e) {
      alert('Falha ao adicionar: ' + String(e?.message || e))
    }
  }

  // ===== Importação de Lotes (Dados • Lotes) =====
  const toNumberBR = (val) => {
    if (val == null || val === '') return 0
    if (typeof val === 'number') return val
    const s = String(val).trim()
    if (!s) return 0
    const norm = s.replace(/\./g, '').replace(/,/g, '.')
    const n = parseFloat(norm)
    return isNaN(n) ? 0 : n
  }

  const parseDataPossivel = (v) => {
    try {
      if (!v && v !== 0) return ''
      if (typeof v === 'number') {
        const d = XLSX.SSF.parse_date_code(v)
        if (d && d.y) return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`
        return ''
      }
      const s = String(v)
      if (s.includes('/')) {
        const p = s.split('/')
        if (p.length === 3) return `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`
      }
      const d = new Date(s)
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
      return ''
    } catch { return '' }
  }

  const importarLotes = async () => {
    if (!arquivoLotes) { setErroLotes('Selecione um arquivo para importar'); return }
    const extensao = arquivoLotes.name.split('.').pop().toLowerCase()
    if (!['xlsx','xls'].includes(extensao)) { setErroLotes('Formato não suportado (.xlsx/.xls)'); return }
    setCarregandoLotes(true)
    setErroLotes('')
    setMensagemLotes('')
    setQtLotesImportados(0)
    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result)
          const wb = XLSX.read(data, { type: 'array' })
          const primeira = wb.SheetNames[0]
          const plan = wb.Sheets[primeira]
          const dados = XLSX.utils.sheet_to_json(plan, { header: 1 })
          if (!dados || dados.length <= 1) throw new Error('A planilha não contém dados suficientes')
          const cab = dados[0].map(c => String(c || '').trim())
          const req = {
            codigo: 'Codigo',
            situacao: 'Situação',
            produto: 'Produto',
            lote: 'Lote',
            rackEmb: 'Rack!Embalagem',
            embalagem: 'Embalagem',
            romaneio: 'Romaneio',
            qtKg: 'Qt Kg',
            qtdPc: 'Qtd PC'
          }
          const idx = {}
          for (const k of Object.keys(req)) {
            idx[k] = cab.indexOf(req[k])
            if (idx[k] === -1) throw new Error(`Coluna obrigatória não encontrada: ${req[k]}`)
          }
          // Mapeamento flexível para Pedido/Seq
          const idxPedidoSeq = cab.indexOf('Pedido e Seq')
          const idxPedido = cab.indexOf('Pedido')
          const idxSeq = cab.indexOf('Seq')
          // Coluna opcional: Nota Fiscal
          const idxNotaFiscal = cab.indexOf('Nota Fiscal')
          const hasPedidoSeq = idxPedidoSeq !== -1
          const hasPedidoPair = idxPedido !== -1 && idxSeq !== -1
          if (!hasPedidoSeq && !hasPedidoPair) {
            throw new Error('Coluna obrigatória não encontrada: Pedido e Seq (ou as colunas Pedido e Seq)')
          }
          const novos = []
          for (let i = 1; i < dados.length; i++) {
            const linha = dados[i] || []
            // Determinar Pedido/Seq a partir de 'Pedido e Seq' OU 'Pedido' + 'Seq'
            let pedidoSeq = ''
            if (hasPedidoSeq) {
              pedidoSeq = String(linha[idxPedidoSeq] || '').trim()
            } else {
              const pedRaw = linha[idxPedido]
              const seqRaw = linha[idxSeq]
              const pedDigits = String(pedRaw ?? '').toString().replace(/[^0-9]/g, '')
              const seqDigits = String(seqRaw ?? '').toString().replace(/[^0-9]/g, '')
              if (pedDigits && seqDigits) {
                const seqNum = parseInt(seqDigits, 10)
                pedidoSeq = `${pedDigits}/${Number.isFinite(seqNum) ? seqNum : 0}`
              }
            }
            const rack = String(linha[idx.rackEmb] || '').trim()
            if (!pedidoSeq || !rack) continue
            const dadosOriginais = {}
            for (let j = 0; j < cab.length; j++) {
              if (cab[j] && linha[j] !== undefined) dadosOriginais[cab[j]] = linha[j]
            }
            novos.push({
              pedido_seq: pedidoSeq,
              codigo: String(linha[idx.codigo] || '').trim(),
              situacao: String(linha[idx.situacao] || '').trim(),
              produto: String(linha[idx.produto] || '').trim(),
              lote: String(linha[idx.lote] || '').trim(),
              rack_embalagem: rack,
              embalagem_data: parseDataPossivel(linha[idx.embalagem] || ''),
              romaneio: String(linha[idx.romaneio] || '').trim(),
              nota_fiscal: (idxNotaFiscal !== -1 ? String(linha[idxNotaFiscal] || '').trim() : ''),
              qt_kg: toNumberBR(linha[idx.qtKg]),
              qtd_pc: toNumberBR(linha[idx.qtdPc]),
              dados_originais: dadosOriginais
            })
          }
          if (novos.length === 0) throw new Error('Nenhuma linha válida encontrada (verifique Pedido e Seq e Rack!Embalagem)')
          try { await clearLotes() } catch {}
          await addLotes(novos)
          setQtLotesImportados(novos.length)
          setMensagemLotes(`Arquivo ${arquivoLotes.name} importado com sucesso! ${novos.length} lotes foram processados.`)
          setArquivoLotes(null)
        } catch (err) {
          setErroLotes('Erro ao processar o arquivo: ' + err.message)
        } finally {
          setCarregandoLotes(false)
        }
      }
      reader.onerror = () => { setErroLotes('Erro ao ler o arquivo'); setCarregandoLotes(false) }
      reader.readAsArrayBuffer(arquivoLotes)
    } catch (e) { setErroLotes('Erro ao importar arquivo: ' + (e?.message || 'desconhecido')); setCarregandoLotes(false) }
  }

  const iniciarEdicaoCfg = (cfg) => { setEditandoCfg({ ...cfg }); setModoEdicaoCfg(true) }
  const cancelarEdicaoCfg = () => { setEditandoCfg(null); setModoEdicaoCfg(false) }
  const salvarEdicaoCfg = async () => {
    if (!editandoCfg || !editandoCfg.ferramenta) { alert('Ferramenta é obrigatória'); return }
    try {
      const isCaixa = (editandoCfg.embalagem || 'pallet') === 'caixa'
      const payload = {
        ...editandoCfg,
        peso_linear: Number(editandoCfg.peso_linear) || 0,
        comprimento_mm: parseInt(editandoCfg.comprimento_mm) || 0,
        pcs_por_pallet: isCaixa ? 0 : (parseInt(editandoCfg.pcs_por_pallet) || 0),
        ripas_por_pallet: isCaixa ? 0 : (parseInt(editandoCfg.ripas_por_pallet) || 0),
        pcs_por_caixa: isCaixa ? (parseInt(editandoCfg.pcs_por_caixa) || 0) : 0
      }
      await updateCfg(payload)
      cancelarEdicaoCfg()
      alert('Alterações salvas')
    } catch (e) {
      alert('Falha ao salvar: ' + String(e?.message || e))
    }
  }
  const excluirCfg = async (id) => {
    if (!id) return
    if (window.confirm('Excluir este cadastro?')) {
      await removeCfg(id)
    }
  }
  const [editandoUsuario, setEditandoUsuario] = useState(null)
  const [modoEdicao, setModoEdicao] = useState(false)
  
  // Estados para configurações do processo
  const [configProcesso, setConfigProcesso] = useState({
    tempo_padrao_setup: 30,
    tempo_padrao_manutencao: 60,
    meta_oee: 85,
    horas_turno: 8,
    dias_uteis_mes: 22
  })
  
  // Motivos de parada (Supabase)
  const { items: motivosParada, addItem: addMotivo, updateItem: updMotivo, removeItem: delMotivo } = useDatabase('motivos_parada', true)
  const [novoMotivoParada, setNovoMotivoParada] = useState('')
  
  // Tipos de parada (Supabase)
  const { items: tiposParada, addItem: addTipo, updateItem: updTipo, removeItem: delTipo } = useDatabase('tipos_parada', true)
  const [novoTipoParada, setNovoTipoParada] = useState('')
  
  // Máquinas persistidas no IndexedDB
  const { items: maquinas, addItem: addMaquina, updateItem: updateMaquina, removeItem: removeMaquina } = useDatabase('maquinas', true)
  const [novaMaquina, setNovaMaquina] = useState({
    codigo: '',
    nome: '',
    modelo: '',
    fabricante: '',
    ano: new Date().getFullYear(),
    status: 'ativo'
  })
  const [editandoMaquina, setEditandoMaquina] = useState(null)
  const [modoEdicaoMaquina, setModoEdicaoMaquina] = useState(false)
  
  // Estados para insumos
  const [insumos, setInsumos] = useState([
    { id: 1, codigo: 'INS001', nome: 'Óleo Lubrificante', tipo: 'oleo', quantidade: 50, unidade: 'litros' },
    { id: 2, codigo: 'INS002', nome: 'Serra Circular', tipo: 'ferramenta', quantidade: 15, unidade: 'peças' },
    { id: 3, codigo: 'INS003', nome: 'Broca 10mm', tipo: 'ferramenta', quantidade: 30, unidade: 'peças' },
    { id: 4, codigo: 'INS004', nome: 'Inserto CNMG', tipo: 'ferramenta_cnc', quantidade: 100, unidade: 'peças' }
  ])
  const [novoInsumo, setNovoInsumo] = useState({
    codigo: '',
    nome: '',
    tipo: 'ferramenta',
    quantidade: 0,
    unidade: 'peças'
  })
  const [editandoInsumo, setEditandoInsumo] = useState(null)
  const [modoEdicaoInsumo, setModoEdicaoInsumo] = useState(false)
  
  // Abas de configuração
  const [abaAtiva, setAbaAtiva] = useState('usuarios')
  const [searchParams] = useSearchParams()
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab) setAbaAtiva(tab)
  }, [searchParams])

  // Caminhos base dos PDFs
  const [pdfBasePath, setPdfBasePath] = useState(localStorage.getItem('pdfBasePath') || '')
  const [processBasePath, setProcessBasePath] = useState(localStorage.getItem('processBasePath') || '')
  useEffect(() => {
    const saved = localStorage.getItem('pdfBasePath')
    if (saved && saved !== pdfBasePath) setPdfBasePath(saved)
    const savedProc = localStorage.getItem('processBasePath')
    if (savedProc && savedProc !== processBasePath) setProcessBasePath(savedProc)
  }, [])
  const salvarPdfBasePath = () => {
    localStorage.setItem('pdfBasePath', pdfBasePath || '')
    alert('Caminho salvo!')
  }
  const salvarProcessBasePath = () => {
    localStorage.setItem('processBasePath', processBasePath || '')
    alert('Caminho salvo!')
  }
  const buildLocalFileUrl = (basePath, fileName) => {
    const safeBase = String(basePath || '').replace(/[\\/]+$/, '')
    const full = `${safeBase}\\${fileName}`
    const asSlash = full.replace(/\\/g, '/')
    return `file:///${asSlash}`
  }
  const testarAbrirPdfExemplo = () => {
    if (!pdfBasePath) { alert('Defina o caminho base dos PDFs primeiro.'); return }
    const url = buildLocalFileUrl(pdfBasePath, 'TR-0000.pdf')
    window.open(url, '_blank')
  }
  const testarAbrirProcessoExemplo = () => {
    if (!processBasePath) { alert('Defina o caminho base das Fichas de Processo primeiro.'); return }
    const url = buildLocalFileUrl(processBasePath, 'TR-0000.pdf')
    window.open(url, '_blank')
  }
  // =====================
  // Status do Sistema
  // =====================
  const [checandoStatus, setChecandoStatus] = useState(false)
  const [statusServidor, setStatusServidor] = useState(null) // 'ok' | 'erro'
  const [statusBackendDB, setStatusBackendDB] = useState(null)
  const [statusIndexedDB, setStatusIndexedDB] = useState(null)
  const [lastSyncPedidos, setLastSyncPedidos] = useState(null)
  const [lastSyncApont, setLastSyncApont] = useState(null)

  const verificarStatus = async () => {
    setChecandoStatus(true)
    try {
      // Servidor
      try {
        const r = await fetch('/');
        setStatusServidor(r.ok ? 'ok' : 'erro')
      } catch { setStatusServidor('erro') }

      // Backend DB via endpoint de sync de pedidos
      try {
        const r2 = await fetch('/api/sync/pedidos/changes')
        setStatusBackendDB(r2.ok ? 'ok' : 'erro')
      } catch { setStatusBackendDB('erro') }

      // IndexedDB
      try {
        await dbService.init()
        setStatusIndexedDB('ok')
      } catch { setStatusIndexedDB('erro') }

      // Metas de sync
      setLastSyncPedidos(await dbService.getSyncMeta('last_sync_pedidos'))
      setLastSyncApont(await dbService.getSyncMeta('last_sync_apontamentos'))
    } finally {
      setChecandoStatus(false)
    }
  }

  const sincronizarAgora = async () => {
    setSincronizando(true)
    try {
      await SyncService.syncAll()
      await verificarStatus()
      setMensagem('Sincronização concluída')
    } catch (e) {
      setErro('Falha ao sincronizar: ' + String(e))
    } finally {
      setSincronizando(false)
    }
  }
  
  // Carregar dados simulados na inicialização
  useEffect(() => {
    // Dados simulados de usuários
    const usuariosSimulados = [
      { id: 1, nome: 'Administrador', email: 'admin@usinagem.com', nivel_acesso: 'admin' },
      { id: 2, nome: 'Supervisor Produção', email: 'supervisor@usinagem.com', nivel_acesso: 'supervisor' },
      { id: 3, nome: 'Operador 1', email: 'operador@usinagem.com', nivel_acesso: 'operador' }
    ]
    
    setUsuarios(usuariosSimulados)
  }, [])
  
  // Funções para gerenciamento de usuários
  const adicionarUsuario = () => {
    if (!novoUsuario.nome || !novoUsuario.email || !novoUsuario.senha) {
      alert('Preencha todos os campos obrigatórios')
      return
    }
    
    const novoId = usuarios.length > 0 ? Math.max(...usuarios.map(u => u.id)) + 1 : 1
    
    setUsuarios([
      ...usuarios,
      {
        id: novoId,
        nome: novoUsuario.nome,
        email: novoUsuario.email,
        nivel_acesso: novoUsuario.nivel_acesso
      }
    ])
    
    // Limpar formulário
    setNovoUsuario({
      nome: '',
      email: '',
      senha: '',
      nivel_acesso: 'operador'
    })
  }
  
  const iniciarEdicaoUsuario = (usuario) => {
    setEditandoUsuario({
      ...usuario,
      senha: '' // Não exibimos a senha atual por segurança
    })
    setModoEdicao(true)
  }
  
  const salvarEdicaoUsuario = () => {
    if (!editandoUsuario.nome || !editandoUsuario.email) {
      alert('Nome e email são obrigatórios')
      return
    }
    
    setUsuarios(usuarios.map(u => 
      u.id === editandoUsuario.id ? editandoUsuario : u
    ))
    
    cancelarEdicaoUsuario()
  }
  
  const cancelarEdicaoUsuario = () => {
    setEditandoUsuario(null)
    setModoEdicao(false)
  }
  
  const excluirUsuario = (id) => {
    if (window.confirm('Tem certeza que deseja excluir este usuário?')) {
      setUsuarios(usuarios.filter(u => u.id !== id))
    }
  }
  
  // Funções para configurações do processo
  const handleConfigProcessoChange = (e) => {
    const { name, value } = e.target
    setConfigProcesso({
      ...configProcesso,
      [name]: Number(value)
    })
  }
  
  // Funções para motivos de parada
  const adicionarMotivoParada = async () => {
    if (!novoMotivoParada.trim()) { alert('Digite uma descrição para o motivo de parada'); return }
    await addMotivo({ descricao: novoMotivoParada.trim(), tipo: null })
    setNovoMotivoParada('')
  }
  
  const excluirMotivoParada = async (id) => { if (id && window.confirm('Excluir este motivo?')) await delMotivo(id) }
  
  // Funções para tipos de parada
  const adicionarTipoParada = async () => {
    if (!novoTipoParada.trim()) { alert('Digite uma descrição para o tipo de parada'); return }
    await addTipo({ descricao: novoTipoParada.trim() })
    setNovoTipoParada('')
  }
  
  const excluirTipoParada = async (id) => { if (id && window.confirm('Excluir este tipo?')) await delTipo(id) }
  
  // Funções para gerenciamento de máquinas
  const adicionarMaquina = async () => {
    if (!novaMaquina.codigo || !novaMaquina.nome) {
      alert('Código e nome da máquina são obrigatórios')
      return
    }
    await addMaquina({
      codigo: String(novaMaquina.codigo).trim(),
      nome: String(novaMaquina.nome).trim(),
      modelo: String(novaMaquina.modelo || '').trim(),
      fabricante: String(novaMaquina.fabricante || '').trim(),
      ano: parseInt(novaMaquina.ano) || new Date().getFullYear(),
      status: novaMaquina.status || 'ativo'
    })
    
    // Limpar formulário
    setNovaMaquina({
      codigo: '',
      nome: '',
      modelo: '',
      fabricante: '',
      ano: new Date().getFullYear(),
      status: 'ativo'
    })
  }
  
  const iniciarEdicaoMaquina = (maquina) => {
    setEditandoMaquina({...maquina})
    setModoEdicaoMaquina(true)
  }
  
  const salvarEdicaoMaquina = async () => {
    if (!editandoMaquina.codigo || !editandoMaquina.nome) {
      alert('Código e nome da máquina são obrigatórios')
      return
    }
    await updateMaquina({
      ...editandoMaquina,
      ano: parseInt(editandoMaquina.ano) || new Date().getFullYear()
    })
    cancelarEdicaoMaquina()
  }
  
  const cancelarEdicaoMaquina = () => {
    setEditandoMaquina(null)
    setModoEdicaoMaquina(false)
  }
  
  const excluirMaquina = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta máquina?')) {
      await removeMaquina(id)
    }
  }
  
  // Funções para gerenciamento de insumos
  const adicionarInsumo = () => {
    if (!novoInsumo.codigo || !novoInsumo.nome) {
      alert('Código e nome do insumo são obrigatórios')
      return
    }
    
    const novoId = insumos.length > 0 ? Math.max(...insumos.map(i => i.id)) + 1 : 1
    
    setInsumos([
      ...insumos,
      {
        id: novoId,
        codigo: novoInsumo.codigo,
        nome: novoInsumo.nome,
        tipo: novoInsumo.tipo,
        quantidade: novoInsumo.quantidade,
        unidade: novoInsumo.unidade
      }
    ])
    
    // Limpar formulário
    setNovoInsumo({
      codigo: '',
      nome: '',
      tipo: 'ferramenta',
      quantidade: 0,
      unidade: 'peças'
    })
  }
  
  const iniciarEdicaoInsumo = (insumo) => {
    setEditandoInsumo({...insumo})
    setModoEdicaoInsumo(true)
  }
  
  const salvarEdicaoInsumo = () => {
    if (!editandoInsumo.codigo || !editandoInsumo.nome) {
      alert('Código e nome do insumo são obrigatórios')
      return
    }
    
    setInsumos(insumos.map(i => 
      i.id === editandoInsumo.id ? editandoInsumo : i
    ))
    
    cancelarEdicaoInsumo()
  }
  
  const cancelarEdicaoInsumo = () => {
    setEditandoInsumo(null)
    setModoEdicaoInsumo(false)
  }
  
  const excluirInsumo = (id) => {
    if (window.confirm('Tem certeza que deseja excluir este insumo?')) {
      setInsumos(insumos.filter(i => i.id !== id))
    }
  }
  
  const salvarConfiguracoes = () => {
    // Aqui seria feita a chamada para a API para salvar as configurações
    alert('Configurações salvas com sucesso!')
  }

  // Sincronizar pedidos com servidor
  const carregarPedidos = async () => {
    setSincronizando(true)
    setErro('')
    try {
      const response = await axios.get('http://localhost:8000/api/pedidos/')
      await clearItems()
      await addItems(response.data)
      setMensagem('Pedidos sincronizados com o servidor')
    } catch (error) {
      setErro('Erro ao sincronizar pedidos: ' + error.message)
    } finally {
      setSincronizando(false)
    }
  }

  // Importar pedidos via planilha (mesma lógica da página Pedidos)
  const importarPedidos = async () => {
    if (!arquivo) {
      setErro('Selecione um arquivo para importar')
      return
    }
    const extensao = arquivo.name.split('.').pop().toLowerCase()
    if (!['xlsx', 'xls'].includes(extensao)) {
      setErro('Formato de arquivo não suportado. Por favor, selecione um arquivo Excel (.xlsx ou .xls)')
      return
    }
    setCarregando(true)
    setErro('')
    setMensagem('')
    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const nomeArquivo = arquivo.name
          const data = new Uint8Array(e.target.result)
          const workbook = XLSX.read(data, { type: 'array' })
          const primeiraPlanilha = workbook.SheetNames[0]
          const planilha = workbook.Sheets[primeiraPlanilha]
          const dadosPlanilha = XLSX.utils.sheet_to_json(planilha, { header: 1 })
          if (!dadosPlanilha || dadosPlanilha.length <= 1) {
            throw new Error('A planilha não contém dados suficientes')
          }
          const cabecalhos = dadosPlanilha[0].map(c => String(c || '').trim())
          const todasColunas = {}
          cabecalhos.forEach((cabecalho, index) => { if (cabecalho) todasColunas[cabecalho] = index })
          const colunas = {}
          const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
          // Mapas essenciais
          colunas.pedido = todasColunas['PEDIDO/SEQ'] ?? todasColunas['PEDIDO'] ?? cabecalhos.findIndex(c => String(c).toLowerCase().includes('pedido') || String(c).toLowerCase().includes('seq'))
          // Cliente preferindo cabeçalho que normalize exatamente para 'cliente' e evitando 'pedido.cliente'
          {
            const idxClienteExato = cabecalhos.findIndex(c => norm(c) === 'cliente')
            if (idxClienteExato !== -1) colunas.cliente = idxClienteExato
            else if (todasColunas['CLIENTE'] !== undefined) colunas.cliente = todasColunas['CLIENTE']
            else {
              const idxClientePreferido = cabecalhos.findIndex(c => { const nc = norm(c); return nc.includes('cliente') && nc !== 'pedidocliente' })
              colunas.cliente = idxClientePreferido !== -1 ? idxClientePreferido : cabecalhos.findIndex(c => String(c).toLowerCase().includes('cliente'))
            }
          }
          colunas.pedidoCliente = cabecalhos.findIndex(c => String(c).toLowerCase().includes('pedido') && String(c).toLowerCase().includes('cliente'))
          colunas.data = todasColunas['DT.FATURA'] ?? todasColunas['DATA ENTREGA'] ?? todasColunas['DT ENTREGA'] ?? cabecalhos.findIndex(c => String(c).toLowerCase().includes('data') || String(c).toLowerCase().includes('entrega') || String(c).toLowerCase().includes('fatura'))
          colunas.produto = todasColunas['PRODUTO'] ?? cabecalhos.findIndex(c => String(c).toLowerCase().includes('produto'))
          colunas.descricao = todasColunas['DESCRIÇÃO'] ?? todasColunas['DESCRICAO'] ?? cabecalhos.findIndex(c => String(c).toLowerCase().includes('descri'))
          colunas.unidade = todasColunas['UNIDADE'] ?? todasColunas['UN'] ?? cabecalhos.findIndex(c => String(c).toLowerCase().includes('un'))
          colunas.quantidade = todasColunas['QTD.PEDIDO'] ?? todasColunas['QTD. PEDIDO'] ?? todasColunas['QUANTIDADE'] ?? cabecalhos.findIndex(c => String(c).toLowerCase().includes('qtd'))
          colunas.saldo = todasColunas['SALDO.À.PROD'] ?? todasColunas['SALDO A PROD.'] ?? todasColunas['SALDO'] ?? cabecalhos.findIndex(c => String(c).toLowerCase().includes('saldo'))
          colunas.estoque = todasColunas['ESTOQUE.ACA'] ?? todasColunas['ESTOQUE'] ?? cabecalhos.findIndex(c => String(c).toLowerCase().includes('estoque') || String(c).toLowerCase().includes('aca'))
          colunas.separado = todasColunas['SEPARADO'] ?? cabecalhos.findIndex(c => String(c).toLowerCase().includes('separado'))
          colunas.faturado = todasColunas['FATURADO'] ?? cabecalhos.findIndex(c => String(c).toLowerCase().includes('faturado'))
          colunas.perfil = todasColunas['ITEM.PERFIL'] ?? todasColunas['ITEM PERFIL'] ?? cabecalhos.findIndex(c => String(c).toLowerCase().includes('item') && String(c).toLowerCase().includes('perfil'))
          // Preferir 'Nro da OP'
          {
            const idxOpExato = cabecalhos.findIndex(c => norm(c) === 'nrodaop')
            if (idxOpExato !== -1) colunas.op = idxOpExato
            else colunas.op = todasColunas['NRO DA OP'] ?? todasColunas['Nº OP'] ?? todasColunas['OP'] ?? cabecalhos.findIndex(c => norm(c).includes('op'))
          }
          // Validar
          const colunasEssenciais = ['pedido', 'cliente', 'produto']
          const colunasNaoEncontradas = colunasEssenciais.filter(col => colunas[col] === -1)
          if (colunasNaoEncontradas.length > 0) throw new Error(`Colunas obrigatórias não encontradas: ${colunasNaoEncontradas.join(', ')}`)
          // Processar linhas
          const novosPedidos = []
          const ultimoId = pedidosDB.length > 0 ? Math.max(...pedidosDB.map(p => parseInt(p.id))) : 0
          for (let i = 1; i < dadosPlanilha.length; i++) {
            const linha = dadosPlanilha[i]
            if (!linha || linha.length === 0 || !linha[colunas.pedido]) continue
            const novoId = (ultimoId + novosPedidos.length + 1).toString()
            const pedidoSeq = linha[colunas.pedido] ? String(linha[colunas.pedido]).trim() : ''
            const pedidoCliente = colunas.pedidoCliente !== -1 && linha[colunas.pedidoCliente] ? String(linha[colunas.pedidoCliente]).trim() : ''
            const nomeCliente = linha[colunas.cliente] ? String(linha[colunas.cliente]).trim() : 'Cliente não especificado'
            const codigoProduto = linha[colunas.produto] ? String(linha[colunas.produto]).trim() : ''
            const descricaoProduto = linha[colunas.descricao] ? String(linha[colunas.descricao]).trim() : 'Sem descrição'
            const unidadeProduto = colunas.unidade !== -1 && linha[colunas.unidade] ? String(linha[colunas.unidade]).trim() : 'PC'
            const quantidade = linha[colunas.quantidade] !== undefined ? (typeof linha[colunas.quantidade] === 'number' ? linha[colunas.quantidade] : parseInt(String(linha[colunas.quantidade]).replace(/\D/g, '')) || 0) : 0
            const saldoAProd = linha[colunas.saldo] !== undefined ? (typeof linha[colunas.saldo] === 'number' ? linha[colunas.saldo] : parseInt(String(linha[colunas.saldo]).replace(/\D/g, '')) || 0) : quantidade
            const estoqueAca = colunas.estoque !== -1 && linha[colunas.estoque] !== undefined ? (typeof linha[colunas.estoque] === 'number' ? linha[colunas.estoque] : parseInt(String(linha[colunas.estoque]).replace(/\D/g, '')) || 0) : 0
            const separado = colunas.separado !== -1 && linha[colunas.separado] !== undefined ? (typeof linha[colunas.separado] === 'number' ? linha[colunas.separado] : parseInt(String(linha[colunas.separado]).replace(/\D/g, '')) || 0) : 0
            const faturado = colunas.faturado !== -1 && linha[colunas.faturado] !== undefined ? (typeof linha[colunas.faturado] === 'number' ? linha[colunas.faturado] : parseInt(String(linha[colunas.faturado]).replace(/\D/g, '')) || 0) : 0
            const dataStr = linha[colunas.data] || ''
            let dataFatura = ''
            if (dataStr) {
              try {
                if (typeof dataStr === 'number') {
                  const excelDate = XLSX.SSF.parse_date_code(dataStr)
                  dataFatura = `${excelDate.y}-${String(excelDate.m).padStart(2, '0')}-${String(excelDate.d).padStart(2, '0')}`
                } else if (typeof dataStr === 'string') {
                  if (dataStr.includes('/')) {
                    const partes = dataStr.split('/')
                    if (partes.length === 3) dataFatura = `${partes[2]}-${partes[1]}-${partes[0]}`
                    else {
                      const data = new Date(dataStr)
                      if (!isNaN(data.getTime())) dataFatura = data.toISOString().split('T')[0]
                    }
                  } else {
                    const data = new Date(dataStr)
                    if (!isNaN(data.getTime())) dataFatura = data.toISOString().split('T')[0]
                  }
                }
              } catch (err) { dataFatura = '' }
            }
            if (!dataFatura) {
              const dataAtual = new Date(); dataAtual.setDate(dataAtual.getDate() + 30)
              dataFatura = dataAtual.toISOString().split('T')[0]
            }
            const op = colunas.op !== -1 && linha[colunas.op] ? String(linha[colunas.op]).trim() : `OP${novoId.padStart(3, '0')}`
            const perfil = colunas.perfil !== -1 && linha[colunas.perfil] ? String(linha[colunas.perfil]).trim() : `PERF${novoId.padStart(3, '0')}`
            const dadosOriginais = {}
            cabecalhos.forEach((cabecalho, index) => { if (cabecalho && linha[index] !== undefined) dadosOriginais[cabecalho] = linha[index] })
            novosPedidos.push({
              id: novoId,
              pedido_seq: pedidoSeq.includes('/') ? pedidoSeq : `${pedidoSeq}/1`,
              pedido_cliente: pedidoCliente || pedidoSeq,
              cliente: nomeCliente,
              dt_fatura: dataFatura,
              produto: codigoProduto,
              descricao: descricaoProduto,
              unidade: unidadeProduto,
              qtd_pedido: quantidade,
              saldo_a_prod: saldoAProd,
              estoque_aca: estoqueAca || (quantidade - saldoAProd > 0 ? quantidade - saldoAProd : 0),
              separado: separado,
              faturado: faturado,
              item_perfil: perfil,
              nro_op: op,
              status: 'pendente',
              dados_originais: dadosOriginais
            })
          }
          if (novosPedidos.length === 0) throw new Error('Nenhum pedido válido encontrado na planilha')
          await addItems(novosPedidos)
          setMensagem(`Arquivo ${nomeArquivo} importado com sucesso! ${novosPedidos.length} pedidos foram processados.`)
          setCarregando(false)
          setArquivo(null)
          const inputArquivo = document.querySelector('input[type="file"]')
          if (inputArquivo) inputArquivo.value = ''
        } catch (err) {
          setErro('Erro ao processar o arquivo: ' + err.message)
          setCarregando(false)
        }
      }
      reader.onerror = () => { setErro('Erro ao ler o arquivo'); setCarregando(false) }
      reader.readAsArrayBuffer(arquivo)
    } catch (error) {
      setErro('Erro ao importar arquivo: ' + (error.response?.data?.detail || error.message))
      setCarregando(false)
    }
  }
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Configurações</h1>
      
      {/* Abas de navegação */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto pb-1">
          <button
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              abaAtiva === 'usuarios'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setAbaAtiva('usuarios')}
          >
            Usuários
          </button>
          <button
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              abaAtiva === 'processo'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setAbaAtiva('processo')}
          >
            Processo
          </button>
          <button
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              abaAtiva === 'maquinas'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setAbaAtiva('maquinas')}
          >
            Máquinas
          </button>
          <button
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              abaAtiva === 'insumos'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setAbaAtiva('insumos')}
          >
            Insumos
          </button>
          <button
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              abaAtiva === 'dados'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setAbaAtiva('dados')}
          >
            Dados
          </button>
          <button
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              abaAtiva === 'arquivos'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setAbaAtiva('arquivos')}
          >
            Arquivos
          </button>
          <button
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              abaAtiva === 'expedicao'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setAbaAtiva('expedicao')}
          >
            Expedição
          </button>
          <button
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              abaAtiva === 'status'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setAbaAtiva('status')}
          >
            Status
          </button>
        </nav>
      </div>
      
      {/* Conteúdo da aba de usuários */}
      {abaAtiva === 'usuarios' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Gerenciamento de Usuários</h2>
            
            {/* Formulário para adicionar/editar usuário */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="text-md font-medium text-gray-700 mb-3">
                {modoEdicao ? 'Editar Usuário' : 'Adicionar Novo Usuário'}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={modoEdicao ? editandoUsuario.nome : novoUsuario.nome}
                    onChange={(e) => modoEdicao 
                      ? setEditandoUsuario({...editandoUsuario, nome: e.target.value})
                      : setNovoUsuario({...novoUsuario, nome: e.target.value})
                    }
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    className="input-field"
                    value={modoEdicao ? editandoUsuario.email : novoUsuario.email}
                    onChange={(e) => modoEdicao 
                      ? setEditandoUsuario({...editandoUsuario, email: e.target.value})
                      : setNovoUsuario({...novoUsuario, email: e.target.value})
                    }
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Senha {modoEdicao && '(deixe em branco para manter a atual)'}
                  </label>
                  <input
                    type="password"
                    className="input-field"
                    value={modoEdicao ? editandoUsuario.senha : novoUsuario.senha}
                    onChange={(e) => modoEdicao 
                      ? setEditandoUsuario({...editandoUsuario, senha: e.target.value})
                      : setNovoUsuario({...novoUsuario, senha: e.target.value})
                    }
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nível de Acesso
                  </label>
                  <select
                    className="input-field"
                    value={modoEdicao ? editandoUsuario.nivel_acesso : novoUsuario.nivel_acesso}
                    onChange={(e) => modoEdicao 
                      ? setEditandoUsuario({...editandoUsuario, nivel_acesso: e.target.value})
                      : setNovoUsuario({...novoUsuario, nivel_acesso: e.target.value})
                    }
                  >
                    <option value="operador">Operador</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-4 flex justify-end space-x-3">
                {modoEdicao ? (
                  <>
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={cancelarEdicaoUsuario}
                    >
                      <FaTimes className="mr-1" /> Cancelar
                    </button>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={salvarEdicaoUsuario}
                    >
                      <FaSave className="mr-1" /> Salvar Alterações
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={adicionarUsuario}
                  >
                    <FaUserPlus className="mr-1" /> Adicionar Usuário
                  </button>
                )}
              </div>
            </div>
            
            {/* Lista de usuários */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nome
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nível de Acesso
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {usuarios.map(usuario => (
                    <tr key={usuario.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {usuario.nome}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {usuario.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {usuario.nivel_acesso === 'admin' && 'Administrador'}
                        {usuario.nivel_acesso === 'supervisor' && 'Supervisor'}
                        {usuario.nivel_acesso === 'operador' && 'Operador'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          className="text-primary-600 hover:text-primary-900 mr-3"
                          onClick={() => iniciarEdicaoUsuario(usuario)}
                        >
                          <FaEdit />
                        </button>
                        <button
                          className="text-red-600 hover:text-red-900"
                          onClick={() => excluirUsuario(usuario.id)}
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo da aba de expedição */}
      {abaAtiva === 'expedicao' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Parâmetros por Ferramenta (Expedição)</h2>
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="text-md font-medium text-gray-700 mb-3">{modoEdicaoCfg ? 'Editar' : 'Adicionar'}</h3>
              <div className={`grid grid-cols-1 ${((modoEdicaoCfg ? editandoCfg?.embalagem : novoCfg.embalagem) === 'caixa') ? 'md:grid-cols-7' : 'md:grid-cols-6'} gap-4`}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ferramenta *</label>
                  <input type="text" className="input-field" value={modoEdicaoCfg ? editandoCfg.ferramenta : novoCfg.ferramenta}
                    onChange={(e)=> modoEdicaoCfg ? setEditandoCfg({...editandoCfg, ferramenta: e.target.value}) : setNovoCfg({...novoCfg, ferramenta: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Peso Linear (kg)</label>
                  <input type="number" step="0.001" className="input-field" value={modoEdicaoCfg ? editandoCfg.peso_linear : novoCfg.peso_linear}
                    onChange={(e)=> modoEdicaoCfg ? setEditandoCfg({...editandoCfg, peso_linear: e.target.value}) : setNovoCfg({...novoCfg, peso_linear: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Comprimento (mm)</label>
                  <input type="number" className="input-field" value={modoEdicaoCfg ? editandoCfg.comprimento_mm : novoCfg.comprimento_mm}
                    onChange={(e)=> modoEdicaoCfg ? setEditandoCfg({...editandoCfg, comprimento_mm: e.target.value}) : setNovoCfg({...novoCfg, comprimento_mm: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pcs por Pallet</label>
                  <input type="number" className="input-field" value={modoEdicaoCfg ? editandoCfg.pcs_por_pallet : novoCfg.pcs_por_pallet}
                    disabled={modoEdicaoCfg ? (editandoCfg.embalagem === 'caixa') : (novoCfg.embalagem === 'caixa')}
                    onChange={(e)=> modoEdicaoCfg ? setEditandoCfg({...editandoCfg, pcs_por_pallet: e.target.value}) : setNovoCfg({...novoCfg, pcs_por_pallet: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ripas por Pallet</label>
                  <input type="number" className="input-field" value={modoEdicaoCfg ? editandoCfg.ripas_por_pallet : novoCfg.ripas_por_pallet}
                    disabled={modoEdicaoCfg ? (editandoCfg.embalagem === 'caixa') : (novoCfg.embalagem === 'caixa')}
                    onChange={(e)=> modoEdicaoCfg ? setEditandoCfg({...editandoCfg, ripas_por_pallet: e.target.value}) : setNovoCfg({...novoCfg, ripas_por_pallet: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Embalagem</label>
                  <select className="input-field" value={modoEdicaoCfg ? editandoCfg.embalagem : novoCfg.embalagem}
                    onChange={(e)=> {
                      const val = e.target.value
                      if (modoEdicaoCfg) {
                        const next = { ...editandoCfg, embalagem: val }
                        if (val === 'pallet') { next.pcs_por_caixa = '' }
                        if (val === 'caixa') { next.pcs_por_pallet = ''; next.ripas_por_pallet = '' }
                        setEditandoCfg(next)
                      } else {
                        const next = { ...novoCfg, embalagem: val }
                        if (val === 'pallet') { next.pcs_por_caixa = '' }
                        if (val === 'caixa') { next.pcs_por_pallet = ''; next.ripas_por_pallet = '' }
                        setNovoCfg(next)
                      }
                    }}>
                    <option value="pallet">Pallet</option>
                    <option value="caixa">Caixa de papelão</option>
                  </select>
                </div>
                {(modoEdicaoCfg ? editandoCfg?.embalagem === 'caixa' : novoCfg.embalagem === 'caixa') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pcs por Caixa</label>
                  <input type="number" className="input-field" value={modoEdicaoCfg ? editandoCfg.pcs_por_caixa : novoCfg.pcs_por_caixa}
                    onChange={(e)=> modoEdicaoCfg ? setEditandoCfg({...editandoCfg, pcs_por_caixa: e.target.value}) : setNovoCfg({...novoCfg, pcs_por_caixa: e.target.value})} />
                </div>
                )}
              </div>
              <div className="mt-4 flex justify-end space-x-3">
                {modoEdicaoCfg ? (
                  <>
                    <button type="button" className="btn-outline" onClick={cancelarEdicaoCfg}><FaTimes className="mr-1"/> Cancelar</button>
                    <button type="button" className="btn-primary" onClick={salvarEdicaoCfg}><FaSave className="mr-1"/> Salvar Alterações</button>
                  </>
                ) : (
                  <button type="button" className="btn-primary" onClick={adicionarCfg}><FaSave className="mr-1"/> Adicionar</button>
                )}
              </div>
            </div>

            {/* Lista */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ferramenta</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Peso Linear (kg)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comprimento (mm)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pcs/Pallet</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ripas/Pallet</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Embalagem</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pcs/Caixa</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(ferramentasCfg || []).map(cfg => (
                    <tr key={cfg.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{cfg.ferramenta}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{cfg.peso_linear}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{cfg.comprimento_mm}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{cfg.pcs_por_pallet}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{cfg.ripas_por_pallet}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{cfg.embalagem}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{cfg.pcs_por_caixa}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button className="text-primary-600 hover:text-primary-900 mr-3" onClick={()=>iniciarEdicaoCfg(cfg)}><FaEdit/></button>
                        <button className="text-red-600 hover:text-red-900" onClick={()=>excluirCfg(cfg.id)}><FaTrash/></button>
                      </td>
                    </tr>
                  ))}
                  {(ferramentasCfg || []).length === 0 && (
                    <tr>
                      <td className="px-6 py-6 text-center text-gray-500" colSpan="8">Nenhum cadastro</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Aba: Status */}
      {abaAtiva === 'status' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-700">Status do Sistema</h2>
              <div className="flex gap-2">
                <button type="button" className="btn-outline" onClick={verificarStatus} disabled={checandoStatus}>
                  <FaSync className="mr-1" /> Verificar
                </button>
                <button type="button" className="btn-primary" onClick={sincronizarAgora} disabled={sincronizando}>
                  <FaSync className="mr-1" /> Sincronizar
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-gray-500">Servidor (API)</p>
                <p className={`text-lg font-semibold ${statusServidor==='ok'?'text-green-600':'text-red-600'}`}>{statusServidor ? (statusServidor==='ok'?'Ativo':'Indisponível') : '-'}</p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-gray-500">Banco (SQLite - Backend)</p>
                <p className={`text-lg font-semibold ${statusBackendDB==='ok'?'text-green-600':'text-red-600'}`}>{statusBackendDB ? (statusBackendDB==='ok'?'Ativo':'Indisponível') : '-'}</p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-gray-500">IndexedDB (Local)</p>
                <p className={`text-lg font-semibold ${statusIndexedDB==='ok'?'text-green-600':'text-red-600'}`}>{statusIndexedDB ? (statusIndexedDB==='ok'?'Ativo':'Indisponível') : '-'}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-gray-500">Última sincronização - Pedidos</p>
                <p className="text-sm">{lastSyncPedidos || '-'}</p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-gray-500">Última sincronização - Apontamentos</p>
                <p className="text-sm">{lastSyncApont || '-'}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">Dica: se a estrutura local foi atualizada (IndexedDB), recarregue a página para garantir a reconexão.</p>
          </div>
        </div>
      )}

      {/* Conteúdo da aba de arquivos */}
      {abaAtiva === 'arquivos' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Desenhos de Ferramentas (PDF)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Caminho base dos PDFs</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ex.: C:\\Compartilhado\\FerramentasPDF"
                  value={pdfBasePath}
                  onChange={(e) => setPdfBasePath(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">O app abrirá arquivos pelo padrão: CAMINHO \\ CÓDIGO-DA-FERRAMENTA .pdf. Ex.: C:\\...\\TR-0018.pdf</p>
              </div>
            </div>
            <div className="mt-4 flex gap-2 justify-end">
              <button type="button" className="btn-outline" onClick={testarAbrirPdfExemplo}>
                <FaExternalLinkAlt className="mr-1"/> Testar abertura (exemplo)
              </button>
              <button type="button" className="btn-primary" onClick={salvarPdfBasePath}>
                <FaSave className="mr-1"/> Salvar Caminho
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Fichas de Processo (PDF)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Caminho base das Fichas</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ex.: C:\\Compartilhado\\FichasProcesso"
                  value={processBasePath}
                  onChange={(e) => setProcessBasePath(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">Padrão: CAMINHO \\ CÓDIGO-DA-FERRAMENTA .pdf. Ex.: C:\\...\\TR-0018.pdf</p>
              </div>
            </div>
            <div className="mt-4 flex gap-2 justify-end">
              <button type="button" className="btn-outline" onClick={testarAbrirProcessoExemplo}>
                <FaExternalLinkAlt className="mr-1"/> Testar abertura (exemplo)
              </button>
              <button type="button" className="btn-primary" onClick={salvarProcessBasePath}>
                <FaSave className="mr-1"/> Salvar Caminho
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Conteúdo da aba de dados */}
      {abaAtiva === 'dados' && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow p-4 form-compact">
            <h2 className="text-lg font-semibold text-gray-700 mb-3">Dados • Pedidos</h2>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setArquivo(e.target.files[0])}
                className="block w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
              />
              <button
                type="button"
                className="btn-primary text-xs px-3 py-2 flex items-center"
                onClick={importarPedidos}
                disabled={carregando || !arquivo}
              >
                <FaFileUpload className="mr-2" /> {carregando ? 'Importando...' : 'Importar Planilha'}
              </button>
            </div>
            <div className="flex justify-end gap-2 mb-2">
              <button type="button" className="text-xs px-3 py-1.5 border rounded bg-white hover:bg-gray-50 text-gray-700 flex items-center" onClick={loadItems} disabled={carregando || sincronizando}>
                <FaSync className="mr-1" /> Recarregar
              </button>
              <button type="button" className="text-xs px-3 py-1.5 border rounded bg-white hover:bg-gray-50 text-gray-700 flex items-center" onClick={carregarPedidos} disabled={carregando || sincronizando}>
                <FaDatabase className="mr-1" /> {sincronizando ? 'Sincronizando...' : 'Sincronizar'}
              </button>
              <button type="button" className="text-xs px-3 py-1.5 border rounded bg-white hover:bg-gray-50 text-gray-700 flex items-center" onClick={clearItems} disabled={carregando || sincronizando}>
                <FaTrash className="mr-1" /> Limpar Dados
              </button>
            </div>
            {erro && <div className="text-xs text-red-600 mb-1">{erro}</div>}
            {mensagem && <div className="text-xs text-green-600 mb-1">{mensagem}</div>}
            <div className="text-xs text-gray-500">
              <p>Total no banco: {pedidosDB.length}</p>
              <p>Suporta Excel (.xlsx, .xls)</p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 form-compact">
            <h2 className="text-lg font-semibold text-gray-700 mb-3">Dados • Lotes</h2>
            <div className="flex items-center gap-2 mb-2">
              <input
                id="input-lotes-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setArquivoLotes(e.target.files[0])}
                className="block w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
              />
              <button
                type="button"
                className="btn-primary text-xs px-3 py-2 flex items-center"
                onClick={importarLotes}
                disabled={carregandoLotes || !arquivoLotes}
              >
                <FaFileUpload className="mr-2" /> {carregandoLotes ? 'Importando...' : 'Importar Lotes'}
              </button>
            </div>
            {(erroLotes || mensagemLotes) && (
              <div className="text-xs mb-1">
                {erroLotes && <div className="text-red-600">{erroLotes}</div>}
                {mensagemLotes && <div className="text-green-600">{mensagemLotes}</div>}
              </div>
            )}
            <div className="text-xs text-gray-500">
              <p>Total de lotes (local): {lotesDB.length}</p>
              {qtLotesImportados > 0 && (
                <p><span className="font-semibold text-primary-700">Lotes importados: {qtLotesImportados}</span></p>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Conteúdo da aba de máquinas */}
      {abaAtiva === 'maquinas' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Gerenciamento de Máquinas</h2>
            
            {/* Formulário para adicionar/editar máquina */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="text-md font-medium text-gray-700 mb-3">
                {modoEdicaoMaquina ? 'Editar Máquina' : 'Adicionar Nova Máquina'}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Código *
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={modoEdicaoMaquina ? editandoMaquina.codigo : novaMaquina.codigo}
                    onChange={(e) => modoEdicaoMaquina 
                      ? setEditandoMaquina({...editandoMaquina, codigo: e.target.value})
                      : setNovaMaquina({...novaMaquina, codigo: e.target.value})
                    }
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome *
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={modoEdicaoMaquina ? editandoMaquina.nome : novaMaquina.nome}
                    onChange={(e) => modoEdicaoMaquina 
                      ? setEditandoMaquina({...editandoMaquina, nome: e.target.value})
                      : setNovaMaquina({...novaMaquina, nome: e.target.value})
                    }
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Modelo
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={modoEdicaoMaquina ? editandoMaquina.modelo : novaMaquina.modelo}
                    onChange={(e) => modoEdicaoMaquina 
                      ? setEditandoMaquina({...editandoMaquina, modelo: e.target.value})
                      : setNovaMaquina({...novaMaquina, modelo: e.target.value})
                    }
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fabricante
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={modoEdicaoMaquina ? editandoMaquina.fabricante : novaMaquina.fabricante}
                    onChange={(e) => modoEdicaoMaquina 
                      ? setEditandoMaquina({...editandoMaquina, fabricante: e.target.value})
                      : setNovaMaquina({...novaMaquina, fabricante: e.target.value})
                    }
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ano
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    value={modoEdicaoMaquina ? editandoMaquina.ano : novaMaquina.ano}
                    onChange={(e) => modoEdicaoMaquina 
                      ? setEditandoMaquina({...editandoMaquina, ano: parseInt(e.target.value) || new Date().getFullYear()})
                      : setNovaMaquina({...novaMaquina, ano: parseInt(e.target.value) || new Date().getFullYear()})
                    }
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    className="input-field"
                    value={modoEdicaoMaquina ? editandoMaquina.status : novaMaquina.status}
                    onChange={(e) => modoEdicaoMaquina 
                      ? setEditandoMaquina({...editandoMaquina, status: e.target.value})
                      : setNovaMaquina({...novaMaquina, status: e.target.value})
                    }
                  >
                    <option value="ativo">Ativo</option>
                    <option value="manutencao">Em Manutenção</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-4 flex justify-end space-x-3">
                {modoEdicaoMaquina ? (
                  <>
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={cancelarEdicaoMaquina}
                    >
                      <FaTimes className="mr-1" /> Cancelar
                    </button>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={salvarEdicaoMaquina}
                    >
                      <FaSave className="mr-1" /> Salvar Alterações
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={adicionarMaquina}
                  >
                    <FaIndustry className="mr-1" /> Adicionar Máquina
                  </button>
                )}
              </div>
            </div>
            
            {/* Lista de máquinas */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Código
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nome
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Modelo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fabricante
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ano
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {maquinas.map(maquina => (
                    <tr key={maquina.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {maquina.codigo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {maquina.nome}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {maquina.modelo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {maquina.fabricante}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {maquina.ano}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${maquina.status === 'ativo' ? 'bg-green-100 text-green-800' : 
                            maquina.status === 'manutencao' ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-red-100 text-red-800'}`}>
                          {maquina.status === 'ativo' ? 'Ativo' : 
                           maquina.status === 'manutencao' ? 'Em Manutenção' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          className="text-primary-600 hover:text-primary-900 mr-3"
                          onClick={() => iniciarEdicaoMaquina(maquina)}
                        >
                          <FaEdit />
                        </button>
                        <button
                          className="text-red-600 hover:text-red-900"
                          onClick={() => excluirMaquina(maquina.id)}
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      
      {/* Conteúdo da aba de insumos */}
      {abaAtiva === 'insumos' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Gerenciamento de Insumos</h2>
            
            {/* Formulário para adicionar/editar insumo */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="text-md font-medium text-gray-700 mb-3">
                {modoEdicaoInsumo ? 'Editar Insumo' : 'Adicionar Novo Insumo'}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Código *
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={modoEdicaoInsumo ? editandoInsumo.codigo : novoInsumo.codigo}
                    onChange={(e) => modoEdicaoInsumo 
                      ? setEditandoInsumo({...editandoInsumo, codigo: e.target.value})
                      : setNovoInsumo({...novoInsumo, codigo: e.target.value})
                    }
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome *
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={modoEdicaoInsumo ? editandoInsumo.nome : novoInsumo.nome}
                    onChange={(e) => modoEdicaoInsumo 
                      ? setEditandoInsumo({...editandoInsumo, nome: e.target.value})
                      : setNovoInsumo({...novoInsumo, nome: e.target.value})
                    }
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo
                  </label>
                  <select
                    className="input-field"
                    value={modoEdicaoInsumo ? editandoInsumo.tipo : novoInsumo.tipo}
                    onChange={(e) => modoEdicaoInsumo 
                      ? setEditandoInsumo({...editandoInsumo, tipo: e.target.value})
                      : setNovoInsumo({...novoInsumo, tipo: e.target.value})
                    }
                  >
                    <option value="ferramenta">Ferramenta</option>
                    <option value="ferramenta_cnc">Ferramenta CNC</option>
                    <option value="oleo">Lubrificante/Óleo</option>
                    <option value="consumivel">Consumível</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantidade
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    value={modoEdicaoInsumo ? editandoInsumo.quantidade : novoInsumo.quantidade}
                    onChange={(e) => modoEdicaoInsumo 
                      ? setEditandoInsumo({...editandoInsumo, quantidade: parseInt(e.target.value) || 0})
                      : setNovoInsumo({...novoInsumo, quantidade: parseInt(e.target.value) || 0})
                    }
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unidade
                  </label>
                  <select
                    className="input-field"
                    value={modoEdicaoInsumo ? editandoInsumo.unidade : novoInsumo.unidade}
                    onChange={(e) => modoEdicaoInsumo 
                      ? setEditandoInsumo({...editandoInsumo, unidade: e.target.value})
                      : setNovoInsumo({...novoInsumo, unidade: e.target.value})
                    }
                  >
                    <option value="peças">Peças</option>
                    <option value="litros">Litros</option>
                    <option value="kg">Quilogramas</option>
                    <option value="metros">Metros</option>
                    <option value="unidades">Unidades</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-4 flex justify-end space-x-3">
                {modoEdicaoInsumo ? (
                  <>
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={cancelarEdicaoInsumo}
                    >
                      <FaTimes className="mr-1" /> Cancelar
                    </button>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={salvarEdicaoInsumo}
                    >
                      <FaSave className="mr-1" /> Salvar Alterações
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={adicionarInsumo}
                  >
                    <FaTools className="mr-1" /> Adicionar Insumo
                  </button>
                )}
              </div>
            </div>
            
            {/* Lista de insumos */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Código
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nome
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantidade
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unidade
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {insumos.map(insumo => (
                    <tr key={insumo.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {insumo.codigo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {insumo.nome}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {insumo.tipo === 'ferramenta' ? 'Ferramenta' : 
                         insumo.tipo === 'ferramenta_cnc' ? 'Ferramenta CNC' : 
                         insumo.tipo === 'oleo' ? 'Lubrificante/Óleo' : 
                         insumo.tipo === 'consumivel' ? 'Consumível' : 'Outro'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {insumo.quantidade}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {insumo.unidade}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          className="text-primary-600 hover:text-primary-900 mr-3"
                          onClick={() => iniciarEdicaoInsumo(insumo)}
                        >
                          <FaEdit />
                        </button>
                        <button
                          className="text-red-600 hover:text-red-900"
                          onClick={() => excluirInsumo(insumo.id)}
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      
      {/* Conteúdo da aba de configurações do processo */}
      {abaAtiva === 'processo' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Configurações do Processo</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tempo Padrão de Setup (minutos)
                </label>
                <input
                  type="number"
                  name="tempo_padrao_setup"
                  className="input-field"
                  value={configProcesso.tempo_padrao_setup}
                  onChange={handleConfigProcessoChange}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tempo Padrão de Manutenção (minutos)
                </label>
                <input
                  type="number"
                  name="tempo_padrao_manutencao"
                  className="input-field"
                  value={configProcesso.tempo_padrao_manutencao}
                  onChange={handleConfigProcessoChange}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meta de OEE (%)
                </label>
                <input
                  type="number"
                  name="meta_oee"
                  className="input-field"
                  value={configProcesso.meta_oee}
                  onChange={handleConfigProcessoChange}
                  min="0"
                  max="100"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Horas por Turno
                </label>
                <input
                  type="number"
                  name="horas_turno"
                  className="input-field"
                  value={configProcesso.horas_turno}
                  onChange={handleConfigProcessoChange}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dias Úteis por Mês
                </label>
                <input
                  type="number"
                  name="dias_uteis_mes"
                  className="input-field"
                  value={configProcesso.dias_uteis_mes}
                  onChange={handleConfigProcessoChange}
                />
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                className="btn-primary"
                onClick={salvarConfiguracoes}
              >
                <FaSave className="mr-1" /> Salvar Configurações
              </button>
            </div>
          </div>
          
          {/* Motivos de Parada */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Motivos de Parada</h2>
            
            <div className="flex space-x-2 mb-4">
              <input
                type="text"
                className="input-field flex-grow"
                placeholder="Digite um novo motivo de parada"
                value={novoMotivoParada}
                onChange={(e) => setNovoMotivoParada(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && adicionarMotivoParada()}
              />
              <button
                type="button"
                className="btn-primary whitespace-nowrap"
                onClick={adicionarMotivoParada}
              >
                Adicionar
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descrição
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {motivosParada.map(motivo => (
                    <tr key={motivo.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {motivo.descricao}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          className="text-red-600 hover:text-red-900"
                          onClick={() => excluirMotivoParada(motivo.id)}
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Tipos de Parada */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Tipos de Parada</h2>
            
            <div className="flex space-x-2 mb-4">
              <input
                type="text"
                className="input-field flex-grow"
                placeholder="Digite um novo tipo de parada"
                value={novoTipoParada}
                onChange={(e) => setNovoTipoParada(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && adicionarTipoParada()}
              />
              <button
                type="button"
                className="btn-primary whitespace-nowrap"
                onClick={adicionarTipoParada}
              >
                Adicionar
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descrição
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tiposParada.map(tipo => (
                    <tr key={tipo.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {tipo.descricao}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          className="text-red-600 hover:text-red-900"
                          onClick={() => excluirTipoParada(tipo.id)}
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Configuracoes
