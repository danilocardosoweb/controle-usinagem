import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { FaFilter, FaSearch, FaSort, FaSortUp, FaSortDown, FaEye, FaEdit, FaTrash, FaDatabase, FaSync, FaList, FaStar, FaFileExcel } from 'react-icons/fa'
import axios from 'axios'
import * as XLSX from 'xlsx'
import { useSupabase } from '../hooks/useSupabase'
import supabaseService from '../services/SupabaseService'
import { useAuth } from '../contexts/AuthContext'

const Pedidos = () => {
  // Usar o hook de banco de dados para pedidos
  const { 
    items: pedidosDB, 
    loading: carregandoDB, 
    error: erroDB,
    addItems,
    clearItems,
    loadItems
  } = useSupabase('pedidos')
  // Apontamentos para consolidar quantidade apontada por pedido
  const { items: apontamentosDB } = useSupabase('apontamentos')
  // Catálogo de máquinas para mapear ID → nome
  const { items: maquinasCat } = useSupabase('maquinas')
  // Mapa id->nome de máquina para exibições (modal 'Apontamentos do Pedido')
  const maqMap = useMemo(() => {
    const map = {}
    for (const m of (maquinasCat || [])) {
      if (!m) continue
      map[String(m.id)] = m.nome || m.codigo || `Máquina ${m.id}`
    }
    return map
  }, [maquinasCat])

  // Prioridades do PCP
  const [prioridades, setPrioridades] = useState([])
  const [pedidosPrioritarios, setPedidosPrioritarios] = useState(new Set())
  // Usuário logado
  const { user } = useAuth()
  
  // Estados para gerenciamento de pedidos
  const [pedidosFiltrados, setPedidosFiltrados] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [sincronizando, setSincronizando] = useState(false)
  const [detalhesAberto, setDetalhesAberto] = useState(false)
  const [pedidoSelecionado, setPedidoSelecionado] = useState(null)
  const [listaApontAberta, setListaApontAberta] = useState(false)
  
  // Estados para filtros
  const [filtros, setFiltros] = useState({
    cliente: '',
    pedidoCliente: '',
    produto: '',
    status: '',
    ferramenta: '',
    comprimento: '',
    prioridade: 'todos' // 'todos' | 'prioritarios'
  })
  
  // Estado para ordenação
  const [ordenacao, setOrdenacao] = useState({
    campo: 'pedido_seq',
    direcao: 'asc'
  })
  
  // Estado para paginação
  const [paginacao, setPaginacao] = useState({
    pagina: 1,
    itensPorPagina: 10,
    total: 0
  })
  
  // Estado para arquivo de importação de Pedidos
  const [arquivo, setArquivo] = useState(null)
  
  
  // Carregar prioridades do PCP
  useEffect(() => {
    carregarPrioridades()
  }, [])

  const carregarPrioridades = async () => {
    try {
      const prioridadesData = await supabaseService.getAll('pcp_prioridades')
      setPrioridades(prioridadesData || [])
      // Criar Set com pedido_seq dos itens prioritários
      const setPrioritarios = new Set(
        (prioridadesData || [])
          .map(p => p.pedido_numero)
          .filter(Boolean)
      )
      setPedidosPrioritarios(setPrioritarios)
    } catch (error) {
      console.warn('Não foi possível carregar prioridades do PCP:', error)
      setPrioridades([])
      setPedidosPrioritarios(new Set())
    }
  }

  // Verificar se um pedido é prioritário
  const isPrioritario = (pedidoSeq) => {
    return pedidosPrioritarios.has(pedidoSeq)
  }

  // Obter dados da prioridade de um pedido
  const getPrioridadeDoPedido = (pedidoSeq) => {
    return prioridades.find(p => p.pedido_numero === pedidoSeq)
  }
  
  // Aplicar filtros quando os filtros mudarem ou quando os pedidos do banco de dados mudarem
  useEffect(() => {
    aplicarFiltros()
  }, [filtros, pedidosDB, pedidosPrioritarios])
  
  // Removida a função de dados de exemplo
  
  // Funções auxiliares para extrair ferramenta e comprimento do acabado a partir do código do produto
  const extrairFerramenta = (produto) => {
    if (!produto) return ''
    const s = String(produto).toUpperCase()
    // Aceitar quaisquer letras (vogais e consoantes) no prefixo
    const re3 = /^([A-Z]{3})([A-Z0-9]+)/
    const re2 = /^([A-Z]{2})([A-Z0-9]+)/
    let letras = '', resto = '', qtd = 0
    let m = s.match(re3)
    if (m) { letras = m[1]; resto = m[2]; qtd = 3 }
    else {
      m = s.match(re2)
      if (!m) return ''
      letras = m[1]; resto = m[2]; qtd = 4
    }

  // ====== Importação de Lotes (Dados • Lotes) ======
  const handleArquivoLotesChange = (e) => {
    setArquivoLotes(e.target.files[0])
  }

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
        // Excel serial date
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
    if (!arquivoLotes) {
      setErroLotes('Selecione um arquivo para importar')
      return
    }
    const extensao = arquivoLotes.name.split('.').pop().toLowerCase()
    if (!['xlsx', 'xls'].includes(extensao)) {
      setErroLotes('Formato de arquivo não suportado. Selecione um Excel (.xlsx ou .xls)')
      return
    }
    setCarregandoLotes(true)
    setErroLotes('')
    setMensagemLotes('')
    setQtLotesImportados(0)

    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result)
          const workbook = XLSX.read(data, { type: 'array' })
          const primeira = workbook.SheetNames[0]
          const plan = workbook.Sheets[primeira]
          const dados = XLSX.utils.sheet_to_json(plan, { header: 1 })
          if (!dados || dados.length <= 1) throw new Error('A planilha não contém dados suficientes')
          const cab = dados[0].map(c => String(c || '').trim())

          // Cabeçalhos fixos
          const req = {
            codigo: 'Codigo',
            situacao: 'Situação',
            lote: 'Lote',
            rackEmb: 'Rack!Embalagem',
            embalagem: 'Embalagem',
            romaneio: 'Romaneio',
            pedidoSeq: 'Pedido e Seq',
            qtKg: 'Qt Kg',
            qtdPc: 'Qtd PC'
          }
          const idx = {}
          for (const k of Object.keys(req)) {
            idx[k] = cab.indexOf(req[k])
            if (idx[k] === -1) throw new Error(`Coluna obrigatória não encontrada: ${req[k]}`)
          }

          // Preparar lotes
          const novos = []
          for (let i = 1; i < dados.length; i++) {
            const linha = dados[i] || []
            const pedidoSeq = String(linha[idx.pedidoSeq] || '').trim()
            const rack = String(linha[idx.rackEmb] || '').trim()
            if (!pedidoSeq || !rack) continue // essenciais

            const dadosOriginais = {}
            for (let j = 0; j < cab.length; j++) {
              if (cab[j] && linha[j] !== undefined) dadosOriginais[cab[j]] = linha[j]
            }

            const reg = {
              pedido_seq: pedidoSeq,
              codigo: String(linha[idx.codigo] || '').trim(),
              situacao: String(linha[idx.situacao] || '').trim(),
              lote: String(linha[idx.lote] || '').trim(),
              rack_embalagem: rack,
              embalagem_data: parseDataPossivel(linha[idx.embalagem] || ''),
              romaneio: String(linha[idx.romaneio] || '').trim(),
              qt_kg: toNumberBR(linha[idx.qtKg]),
              qtd_pc: toNumberBR(linha[idx.qtdPc]),
              dados_originais: dadosOriginais
            }
            novos.push(reg)
          }

          if (novos.length === 0) throw new Error('Nenhuma linha válida encontrada (verifique Pedido e Seq e Rack!Embalagem)')

          // Respeitar "chave" por pedido_seq: substitui import anterior limpando store
          try {
            await clearLotes()
          } catch {}
          await addLotes(novos)
          setQtLotesImportados(novos.length)
          setMensagemLotes(`Arquivo ${arquivoLotes.name} importado com sucesso! ${novos.length} lotes foram processados.`)
          setArquivoLotes(null)
          const input = document.getElementById('input-lotes-file')
          if (input) input.value = ''
        } catch (err) {
          console.error('Erro ao processar lotes:', err)
          setErroLotes('Erro ao processar o arquivo: ' + err.message)
        } finally {
          setCarregandoLotes(false)
        }
      }
      reader.onerror = (e) => {
        console.error('Erro na leitura do arquivo (lotes):', e)
        setErroLotes('Erro ao ler o arquivo')
        setCarregandoLotes(false)
      }
      reader.readAsArrayBuffer(arquivoLotes)
    } catch (e) {
      setErroLotes('Erro ao importar arquivo: ' + (e?.message || 'desconhecido'))
      setCarregandoLotes(false)
    }
  }

    let nums = ''
    for (const ch of resto) {
      if (/[0-9]/.test(ch)) nums += ch
      else if (ch === 'O') nums += '0'
      if (nums.length === qtd) break
    }
    if (nums.length < qtd) nums = nums.padEnd(qtd, '0')
    return `${letras}-${nums}`
  }

  const extrairComprimento = (produto) => {
    if (!produto) return ''
    const resto = String(produto).slice(8)
    const m = resto.match(/^\d+/)
    return m ? String(parseInt(m[0], 10)) : ''
  }

  const formatarData = (data) => {
    if (!data) return ''
    try {
      const d = new Date(data)
      if (isNaN(d.getTime())) return ''
      return d.toLocaleDateString('pt-BR')
    } catch {
      return ''
    }
  }

  // Pré-agrega apontamentos do usuário por (Pedido/Seq + Nº OP) e por (Pedido/Seq) para fallback
  const mapasApontUsuario = useMemo(() => {
    const porSeqOp = {}
    const porSeq = {}
    try {
      if (!user?.nome) return { porSeqOp, porSeq }
      for (const a of (apontamentosDB || [])) {
        if (String(a.operador || '') !== String(user.nome)) continue
        const seq = String(a.ordem_trabalho || a.ordemTrabalho || a.pedido_seq || '')
        if (!seq) continue
        const q = Number(a.quantidade || a.quantidadeProduzida || 0)
        const add = isNaN(q) ? 0 : q
        const op = String(a.nro_op || a.nroOp || '')
        if (op) {
          const k = `${seq}__${op}`
          porSeqOp[k] = (porSeqOp[k] || 0) + add
        } else {
          porSeq[seq] = (porSeq[seq] || 0) + add
        }
      }
    } catch {}
    return { porSeqOp, porSeq }
  }, [apontamentosDB, user])

  // Soma de apontamentos do usuário logado para um pedido específico (sem duplicidade)
  const somaApontadoPeloUsuario = (pedido) => {
    try {
      const seq = String(pedido.pedido_seq || '')
      if (!seq) return 0
      const op = String(pedido.nro_op || '')
      if (op) {
        const k = `${seq}__${op}`
        if (mapasApontUsuario.porSeqOp[k] != null) return mapasApontUsuario.porSeqOp[k]
        // Fallback: considerar apontamentos sem OP deste mesmo Pedido/Seq
        if (mapasApontUsuario.porSeq[seq] != null) return mapasApontUsuario.porSeq[seq]
        return 0
      }
      // Sem Nº OP no pedido: usar total por seq (apontamentos sem OP)
      return mapasApontUsuario.porSeq[seq] || 0
    } catch {
      return 0
    }
  }

  // Retorna lista de apontamentos do pedido e soma apontada
  const obterApontamentosDoPedido = (pedido) => {
    if (!pedido) return { lista: [], total: 0 }
    const chave = String(pedido.pedido_seq || '')
    const lista = (apontamentosDB || []).filter(a => {
      const seq = String(a.ordem_trabalho || a.ordemTrabalho || a.pedido_seq || '')
      return seq === chave
    })
    const total = lista.reduce((acc, a) => {
      const q = Number(a.quantidade || a.quantidadeProduzida || 0)
      return acc + (isNaN(q) ? 0 : q)
    }, 0)
    return { lista, total }
  }

  // Status calculado: 
  // - Pendente: separado == 0
  // - Finalizado: separado >= qtd_pedido
  // - Em Produção: separado > 0 e < qtd_pedido
  const calcularStatus = (pedido) => {
    if (pedido?.finalizado_manual) return 'Finalizado'

    const sep = Number(pedido?.separado || 0)
    const qtd = Number(pedido?.qtd_pedido || 0)
    if (sep === 0) return 'Pendente'
    if (qtd > 0 && sep >= qtd) return 'Finalizado'
    return 'Em Produção'
  }

  const classeBadgeStatus = (status) => {
    if (status === 'Pendente') return 'bg-yellow-100 text-yellow-800'
    if (status === 'Finalizado') return 'bg-green-100 text-green-800'
    return 'bg-blue-100 text-blue-800'
  }

  // Converte o texto do status calculado para a chave usada no filtro (select)
  // 'Pendente' -> 'pendente'
  // 'Em Produção' -> 'em_producao'
  // 'Finalizado' -> 'finalizado'
  const statusToKey = (statusTxt) => {
    const s = (statusTxt || '').toLowerCase()
    if (s.includes('pendente')) return 'pendente'
    if (s.includes('finalizado')) return 'finalizado'
    return 'em_producao'
  }

  // Função para aplicar filtros
  const aplicarFiltros = () => {
    let resultado = [...pedidosDB]
    
    // Filtro por cliente
    if (filtros.cliente) {
      resultado = resultado.filter(p => 
        p.cliente && p.cliente.toLowerCase().includes(filtros.cliente.toLowerCase())
      )
    }
    // Filtro por Pedido Cliente
    if (filtros.pedidoCliente) {
      const alvo = filtros.pedidoCliente.toLowerCase()
      resultado = resultado.filter(p => 
        (p.pedido_cliente || '') && String(p.pedido_cliente).toLowerCase().includes(alvo)
      )
    }
    
    // Filtro por produto
    if (filtros.produto) {
      resultado = resultado.filter(p => 
        (p.produto && p.produto.toLowerCase().includes(filtros.produto.toLowerCase())) ||
        (p.descricao && p.descricao.toLowerCase().includes(filtros.produto.toLowerCase()))
      )
    }

    // Filtro por ferramenta (derivada do produto)
    if (filtros.ferramenta) {
      const f = filtros.ferramenta.toLowerCase()
      resultado = resultado.filter(p => extrairFerramenta(p.produto).toLowerCase().includes(f))
    }

    // Filtro por comprimento do acabado (numérico derivado do produto)
    if (filtros.comprimento) {
      const alvo = String(filtros.comprimento).replace(/\D/g, '')
      resultado = resultado.filter(p => extrairComprimento(p.produto).includes(alvo))
    }
    
    // Filtro por status (usar status calculado e mapeado para chave)
    if (filtros.status) {
      resultado = resultado.filter(p => statusToKey(calcularStatus(p)) === filtros.status)
    }
    
    // Filtro por prioridade
    if (filtros.prioridade === 'prioritarios') {
      resultado = resultado.filter(p => isPrioritario(p.pedido_seq))
    }
    
    // Aplicar ordenação
    resultado.sort((a, b) => {
      const valorA = a[ordenacao.campo] !== undefined ? a[ordenacao.campo] : ''
      const valorB = b[ordenacao.campo] !== undefined ? b[ordenacao.campo] : ''
      
      // Tratamento especial para datas
      if (ordenacao.campo === 'dt_fatura') {
        const dataA = valorA ? new Date(valorA) : new Date(0)
        const dataB = valorB ? new Date(valorB) : new Date(0)
        if (ordenacao.direcao === 'asc') {
          return dataA - dataB
        } else {
          return dataB - dataA
        }
      }
      
      // Tratamento para valores numéricos
      if (typeof valorA === 'number' && typeof valorB === 'number') {
        return ordenacao.direcao === 'asc' ? valorA - valorB : valorB - valorA
      }
      
      // Tratamento para strings
      const strA = String(valorA).toLowerCase()
      const strB = String(valorB).toLowerCase()
      
      if (strA < strB) {
        return ordenacao.direcao === 'asc' ? -1 : 1
      }
      if (strA > strB) {
        return ordenacao.direcao === 'asc' ? 1 : -1
      }
      return 0
    })
    
    setPedidosFiltrados(resultado)
    setPaginacao({...paginacao, total: resultado.length})
  }
  
  // Função para alterar ordenação
  const alterarOrdenacao = (campo) => {
    if (ordenacao.campo === campo) {
      // Inverte a direção se o campo for o mesmo
      setOrdenacao({
        ...ordenacao,
        direcao: ordenacao.direcao === 'asc' ? 'desc' : 'asc'
      })
    } else {
      // Define o novo campo e direção ascendente
      setOrdenacao({
        campo,
        direcao: 'asc'
      })
    }
  }
  
  // Função para lidar com a mudança de arquivo
  const handleArquivoChange = (e) => {
    setArquivo(e.target.files[0])
  }
  
  // Função para importar pedidos
  const importarPedidos = async () => {
    if (!arquivo) {
      setErro('Selecione um arquivo para importar')
      return
    }
    
    // Verificar extensão do arquivo
    const extensao = arquivo.name.split('.').pop().toLowerCase()
    if (!['xlsx', 'xls'].includes(extensao)) {
      setErro('Formato de arquivo não suportado. Por favor, selecione um arquivo Excel (.xlsx ou .xls)')
      return
    }
    
    setCarregando(true)
    setErro('')
    setMensagem('')
    
    try {
      // Processar o arquivo Excel selecionado usando FileReader e xlsx
      const reader = new FileReader()
      
      reader.onload = async (e) => {
        try {
          const nomeArquivo = arquivo.name
          console.log('Processando arquivo Excel:', nomeArquivo)
          
          // Processar o arquivo Excel
          const data = new Uint8Array(e.target.result)
          const workbook = XLSX.read(data, { type: 'array' })
          
          // Pegar a primeira planilha
          const primeiraPlanilha = workbook.SheetNames[0]
          const planilha = workbook.Sheets[primeiraPlanilha]
          
          // Converter para JSON
          const dadosPlanilha = XLSX.utils.sheet_to_json(planilha, { header: 1 })
          
          // Verificar se há dados na planilha
          if (!dadosPlanilha || dadosPlanilha.length <= 1) {
            throw new Error('A planilha não contém dados suficientes')
          }
          
          console.log('Dados da planilha:', dadosPlanilha)
          
          // Extrair cabeçalhos (primeira linha)
          const cabecalhos = dadosPlanilha[0].map(c => String(c || '').trim())
          console.log('Cabeçalhos originais encontrados:', cabecalhos)
          
          // Criar um mapeamento de todas as colunas encontradas
          const todasColunas = {}
          cabecalhos.forEach((cabecalho, index) => {
            if (cabecalho) {
              todasColunas[cabecalho] = index
            }
          })
          
          console.log('Todas as colunas encontradas:', todasColunas)
          
          // Mapear índices de colunas importantes - usando os nomes exatos das colunas
          const colunas = {}
          
          // Mapeamento para PEDIDO/SEQ
          if (todasColunas['PEDIDO/SEQ'] !== undefined) {
            colunas.pedido = todasColunas['PEDIDO/SEQ']
          } else if (todasColunas['PEDIDO'] !== undefined) {
            colunas.pedido = todasColunas['PEDIDO']
          } else {
            colunas.pedido = cabecalhos.findIndex(c => 
              String(c).toLowerCase().includes('pedido') || 
              String(c).toLowerCase().includes('seq'))
          }
          
          // Mapeamento para PEDIDO.CLIENTE
          if (todasColunas['PEDIDO.CLIENTE'] !== undefined) {
            colunas.pedidoCliente = todasColunas['PEDIDO.CLIENTE']
          } else if (todasColunas['PEDIDO CLIENTE'] !== undefined) {
            colunas.pedidoCliente = todasColunas['PEDIDO CLIENTE']
          } else {
            colunas.pedidoCliente = cabecalhos.findIndex(c => 
              String(c).toLowerCase().includes('pedido') && String(c).toLowerCase().includes('cliente'))
          }
          
          // Função para normalizar cabeçalhos (ignora pontuação e case)
          const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
          
          // Mapeamento para CLIENTE (preferir a coluna cujo cabeçalho normalize para 'cliente')
          {
            const idxClienteExato = cabecalhos.findIndex(c => norm(c) === 'cliente')
            if (idxClienteExato !== -1) {
              colunas.cliente = idxClienteExato
            } else if (todasColunas['CLIENTE'] !== undefined) {
              colunas.cliente = todasColunas['CLIENTE']
            } else {
              // Fallback: tentar encontrar por inclusão, mas evitando 'PEDIDO.CLIENTE'
              const idxClientePreferido = cabecalhos.findIndex(c => {
                const nc = norm(c)
                return nc.includes('cliente') && nc !== 'pedidocliente'
              })
              colunas.cliente = idxClientePreferido !== -1 ? idxClientePreferido : 
                cabecalhos.findIndex(c => String(c).toLowerCase().includes('cliente'))
            }
          }
          
          // Mapeamento para DATA ENTREGA (DT.FATURA)
          if (todasColunas['DT.FATURA'] !== undefined) {
            colunas.data = todasColunas['DT.FATURA']
          } else if (todasColunas['DATA ENTREGA'] !== undefined) {
            colunas.data = todasColunas['DATA ENTREGA']
          } else if (todasColunas['DT ENTREGA'] !== undefined) {
            colunas.data = todasColunas['DT ENTREGA']
          } else {
            colunas.data = cabecalhos.findIndex(c => 
              String(c).toLowerCase().includes('data') || 
              String(c).toLowerCase().includes('entrega') ||
              String(c).toLowerCase().includes('fatura'))
          }
          
          // Mapeamento para PRODUTO
          if (todasColunas['PRODUTO'] !== undefined) {
            colunas.produto = todasColunas['PRODUTO']
          } else {
            colunas.produto = cabecalhos.findIndex(c => 
              String(c).toLowerCase().includes('produto'))
          }
          
          // Mapeamento para DESCRIÇÃO
          if (todasColunas['DESCRIÇÃO'] !== undefined) {
            colunas.descricao = todasColunas['DESCRIÇÃO']
          } else if (todasColunas['DESCRICAO'] !== undefined) {
            colunas.descricao = todasColunas['DESCRICAO']
          } else {
            colunas.descricao = cabecalhos.findIndex(c => 
              String(c).toLowerCase().includes('descri'))
          }
          
          // Mapeamento para UNIDADE
          if (todasColunas['UNIDADE'] !== undefined) {
            colunas.unidade = todasColunas['UNIDADE']
          } else if (todasColunas['UN'] !== undefined) {
            colunas.unidade = todasColunas['UN']
          } else {
            colunas.unidade = cabecalhos.findIndex(c => 
              String(c).toLowerCase().includes('un') || 
              String(c).toLowerCase().includes('unidade'))
          }
          
          // Mapeamento para QTD. PEDIDO
          if (todasColunas['QTD.PEDIDO'] !== undefined) {
            colunas.quantidade = todasColunas['QTD.PEDIDO']
          } else if (todasColunas['QTD. PEDIDO'] !== undefined) {
            colunas.quantidade = todasColunas['QTD. PEDIDO']
          } else if (todasColunas['QUANTIDADE'] !== undefined) {
            colunas.quantidade = todasColunas['QUANTIDADE']
          } else {
            colunas.quantidade = cabecalhos.findIndex(c => 
              String(c).toLowerCase().includes('qtd') || 
              (String(c).toLowerCase().includes('pedido') && String(c).toLowerCase().includes('qtd')))
          }
          
          // Mapeamento para SALDO A PROD.
          if (todasColunas['SALDO.À.PROD'] !== undefined) {
            colunas.saldo = todasColunas['SALDO.À.PROD']
          } else if (todasColunas['SALDO A PROD.'] !== undefined) {
            colunas.saldo = todasColunas['SALDO A PROD.']
          } else if (todasColunas['SALDO'] !== undefined) {
            colunas.saldo = todasColunas['SALDO']
          } else {
            colunas.saldo = cabecalhos.findIndex(c => 
              String(c).toLowerCase().includes('saldo') || 
              (String(c).toLowerCase().includes('a') && String(c).toLowerCase().includes('prod')))
          }
          
          // Mapeamento para ESTOQUE.ACA
          if (todasColunas['ESTOQUE.ACA'] !== undefined) {
            colunas.estoque = todasColunas['ESTOQUE.ACA']
          } else if (todasColunas['ESTOQUE'] !== undefined) {
            colunas.estoque = todasColunas['ESTOQUE']
          } else {
            colunas.estoque = cabecalhos.findIndex(c => 
              String(c).toLowerCase().includes('estoque') || 
              String(c).toLowerCase().includes('aca'))
          }
          
          // Mapeamento para SEPARADO
          if (todasColunas['SEPARADO'] !== undefined) {
            colunas.separado = todasColunas['SEPARADO']
          } else {
            colunas.separado = cabecalhos.findIndex(c => 
              String(c).toLowerCase().includes('separado'))
          }
          
          // Mapeamento para FATURADO
          if (todasColunas['FATURADO'] !== undefined) {
            colunas.faturado = todasColunas['FATURADO']
          } else {
            colunas.faturado = cabecalhos.findIndex(c => 
              String(c).toLowerCase().includes('faturado'))
          }
          
          // Mapeamento para ITEM PERFIL
          if (todasColunas['ITEM.PERFIL'] !== undefined) {
            colunas.perfil = todasColunas['ITEM.PERFIL']
          } else if (todasColunas['ITEM PERFIL'] !== undefined) {
            colunas.perfil = todasColunas['ITEM PERFIL']
          } else {
            colunas.perfil = cabecalhos.findIndex(c => 
              String(c).toLowerCase().includes('item') && String(c).toLowerCase().includes('perfil'))
          }
          
          // Mapeamento para Nº OP (preferir exatamente 'Nro da OP')
          {
            const target = 'nrodaop'
            const idxOpExato = cabecalhos.findIndex(c => norm(c) === target)
            if (idxOpExato !== -1) {
              colunas.op = idxOpExato
            } else if (todasColunas['NRO DA OP'] !== undefined) {
              colunas.op = todasColunas['NRO DA OP']
            } else if (todasColunas['Nº OP'] !== undefined) {
              colunas.op = todasColunas['Nº OP']
            } else if (todasColunas['OP'] !== undefined) {
              colunas.op = todasColunas['OP']
            } else {
              // Fallback: tentar encontrar por inclusão de 'op'
              colunas.op = cabecalhos.findIndex(c => {
                const nc = norm(c)
                return nc.includes('op')
              })
            }
          }
          
          // Mapeamento para STATUS
          if (todasColunas['STATUS'] !== undefined) {
            colunas.status = todasColunas['STATUS']
          } else {
            colunas.status = cabecalhos.findIndex(c => 
              String(c).toLowerCase().includes('status'))
          }
          
          console.log('Mapeamento de colunas:', colunas)
          
          console.log('Mapeamento de colunas:', colunas)
          
          // Verificar se encontrou as colunas essenciais
          const colunasEssenciais = ['pedido', 'cliente', 'produto']
          const colunasNaoEncontradas = colunasEssenciais.filter(col => colunas[col] === -1)
          
          if (colunasNaoEncontradas.length > 0) {
            throw new Error(`Colunas obrigatórias não encontradas: ${colunasNaoEncontradas.join(', ')}. Verifique o formato da planilha.`)
          }
          
          // Processar linhas de dados (pular cabeçalho)
          const novosPedidos = []
          const ultimoId = pedidosDB.length > 0 ? Math.max(...pedidosDB.map(p => parseInt(p.id))) : 0
          
          // Guardar todas as colunas originais para cada linha
          const colunasOriginais = {}
          
          for (let i = 1; i < dadosPlanilha.length; i++) {
            const linha = dadosPlanilha[i]
            
            // Pular linhas vazias
            if (!linha || linha.length === 0 || !linha[colunas.pedido]) continue
            
            const novoId = (ultimoId + novosPedidos.length + 1).toString()
            
            // Guardar todas as colunas originais
            cabecalhos.forEach((cabecalho, index) => {
              if (cabecalho && linha[index] !== undefined) {
                colunasOriginais[cabecalho] = linha[index]
              }
            })
            
            console.log(`Linha ${i} - Colunas originais:`, colunasOriginais)
            
            // Extrair valores das colunas conforme o mapeamento
            const pedidoSeq = linha[colunas.pedido] ? String(linha[colunas.pedido]).trim() : ''
            const pedidoCliente = colunas.pedidoCliente !== undefined && colunas.pedidoCliente !== -1 && linha[colunas.pedidoCliente] ? 
              String(linha[colunas.pedidoCliente]).trim() : ''
            const nomeCliente = linha[colunas.cliente] ? String(linha[colunas.cliente]).trim() : 'Cliente não especificado'
            const codigoProduto = linha[colunas.produto] ? String(linha[colunas.produto]).trim() : ''
            const descricaoProduto = linha[colunas.descricao] ? String(linha[colunas.descricao]).trim() : 'Sem descrição'
            const unidadeProduto = colunas.unidade !== undefined && colunas.unidade !== -1 && linha[colunas.unidade] ? 
              String(linha[colunas.unidade]).trim() : 'PC'
            
            // Extrair quantidade e saldo
            const quantidade = linha[colunas.quantidade] !== undefined ? 
              (typeof linha[colunas.quantidade] === 'number' ? linha[colunas.quantidade] : parseInt(String(linha[colunas.quantidade]).replace(/\D/g, '')) || 0) : 0
            
            const saldoAProd = linha[colunas.saldo] !== undefined ? 
              (typeof linha[colunas.saldo] === 'number' ? linha[colunas.saldo] : parseInt(String(linha[colunas.saldo]).replace(/\D/g, '')) || 0) : quantidade
            
            // Extrair estoque, separado e faturado
            const estoqueAca = colunas.estoque !== undefined && colunas.estoque !== -1 && linha[colunas.estoque] !== undefined ? 
              (typeof linha[colunas.estoque] === 'number' ? linha[colunas.estoque] : parseInt(String(linha[colunas.estoque]).replace(/\D/g, '')) || 0) : 0
            
            const separado = colunas.separado !== undefined && colunas.separado !== -1 && linha[colunas.separado] !== undefined ? 
              (typeof linha[colunas.separado] === 'number' ? linha[colunas.separado] : parseInt(String(linha[colunas.separado]).replace(/\D/g, '')) || 0) : 0
            
            const faturado = colunas.faturado !== undefined && colunas.faturado !== -1 && linha[colunas.faturado] !== undefined ? 
              (typeof linha[colunas.faturado] === 'number' ? linha[colunas.faturado] : parseInt(String(linha[colunas.faturado]).replace(/\D/g, '')) || 0) : 0
            
            // Valores opcionais
            const dataStr = linha[colunas.data] || ''
            let dataFatura = ''
            
            // Tentar converter a data para o formato correto
            if (dataStr) {
              try {
                // Verificar se é um número (Excel armazena datas como números)
                if (typeof dataStr === 'number') {
                  const excelDate = XLSX.SSF.parse_date_code(dataStr)
                  dataFatura = `${excelDate.y}-${String(excelDate.m).padStart(2, '0')}-${String(excelDate.d).padStart(2, '0')}`
                } else if (typeof dataStr === 'string') {
                  // Tentar converter string de data no formato DD/MM/YYYY
                  if (dataStr.includes('/')) {
                    const partes = dataStr.split('/')
                    if (partes.length === 3) {
                      dataFatura = `${partes[2]}-${partes[1]}-${partes[0]}`
                    } else {
                      const data = new Date(dataStr)
                      if (!isNaN(data.getTime())) {
                        dataFatura = data.toISOString().split('T')[0]
                      } else {
                        dataFatura = ''
                      }
                    }
                  } else {
                    const data = new Date(dataStr)
                    if (!isNaN(data.getTime())) {
                      dataFatura = data.toISOString().split('T')[0]
                    } else {
                      dataFatura = ''
                    }
                  }
                }
              } catch (err) {
                console.error('Erro ao processar data:', err)
                dataFatura = ''
              }
            }
            
            // Se não conseguiu extrair a data, usar a data atual + 30 dias
            if (!dataFatura) {
              const dataAtual = new Date()
              dataAtual.setDate(dataAtual.getDate() + 30)
              dataFatura = dataAtual.toISOString().split('T')[0]
            }
            
            // Extrair outros campos
            const op = linha[colunas.op] ? String(linha[colunas.op]).trim() : `OP${novoId.padStart(3, '0')}`
            const perfil = linha[colunas.perfil] ? String(linha[colunas.perfil]).trim() : `PERF${novoId.padStart(3, '0')}`
            const unidade = linha[colunas.unidade] ? String(linha[colunas.unidade]).trim() : 'PC'
            
            // Determinar status com base na coluna de status ou calcular com base no saldo
            let statusPedido = 'pendente'
            if (colunas.status !== -1 && linha[colunas.status]) {
              const statusStr = String(linha[colunas.status]).trim().toLowerCase()
              if (statusStr.includes('conclu') || statusStr.includes('finaliz')) {
                statusPedido = 'concluido'
              } else if (statusStr.includes('prod') || statusStr.includes('andamento')) {
                statusPedido = 'em_producao'
              }
            } else {
              // Determinar status com base no saldo
              if (saldoAProd === 0) {
                statusPedido = 'concluido'
              } else if (saldoAProd < quantidade) {
                statusPedido = 'em_producao'
              }
            }
            
            // Criar objeto com todas as colunas originais
            const dadosOriginais = {}
            for (let j = 0; j < cabecalhos.length; j++) {
              if (cabecalhos[j] && linha[j] !== undefined) {
                dadosOriginais[cabecalhos[j]] = linha[j]
              }
            }
            
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
              separado: separado || (statusPedido === 'concluido' ? quantidade : 0),
              faturado: faturado || 0,
              item_perfil: perfil,
              nro_op: op,
              status: statusPedido,
              // Adicionar todas as colunas originais
              dados_originais: dadosOriginais
            })
          }
          
          if (novosPedidos.length === 0) {
            throw new Error('Nenhum pedido válido encontrado na planilha')
          }
          
          // Salvar os novos pedidos no IndexedDB
          try {
            await addItems(novosPedidos)
            setPedidosFiltrados([...pedidosDB, ...novosPedidos])
            setPaginacao({...paginacao, total: pedidosDB.length + novosPedidos.length, pagina: 1})
            
            setMensagem(`Arquivo ${nomeArquivo} importado com sucesso! ${novosPedidos.length} pedidos foram processados.`)
            setCarregando(false)
            setArquivo(null) // Limpar o arquivo selecionado
            
            // Limpar o campo de arquivo
            const inputArquivo = document.querySelector('input[type="file"]')
            if (inputArquivo) inputArquivo.value = ''
          } catch (err) {
            console.error('Erro ao salvar pedidos no banco de dados:', err)
            setErro('Erro ao salvar pedidos no banco de dados: ' + err.message)
            setCarregando(false)
          }
          
          // Estas operações foram movidas para dentro do bloco try/catch acima
        } catch (err) {
          console.error('Erro ao processar planilha:', err)
          setErro('Erro ao processar o arquivo: ' + err.message)
          setCarregando(false)
        }
      }
      
      reader.onerror = (e) => {
        console.error('Erro na leitura do arquivo:', e)
        setErro('Erro ao ler o arquivo')
        setCarregando(false)
      }
      
      // Iniciar a leitura do arquivo como ArrayBuffer (necessário para xlsx)
      reader.readAsArrayBuffer(arquivo)
      
      /* 
      // Código para envio real para API
      const formData = new FormData()
      formData.append('arquivo', arquivo)
      
      const response = await axios.post('http://localhost:8000/api/pedidos/importar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      
      setMensagem(response.data.mensagem)
      // Recarregar os pedidos
      carregarPedidos()
      */
      
    } catch (error) {
      setErro('Erro ao importar arquivo: ' + (error.response?.data?.detail || error.message))
      setCarregando(false)
    }
  }
  
  // Função para carregar pedidos da API e sincronizar com o banco de dados local
  const carregarPedidos = async () => {
    setSincronizando(true)
    setErro('')
    
    try {
      const response = await axios.get('http://localhost:8000/api/pedidos/')
      
      // Limpar banco de dados local e adicionar os novos dados
      await clearItems()
      await addItems(response.data)
      
      setMensagem('Pedidos sincronizados com o servidor')
    } catch (error) {
      setErro('Erro ao sincronizar pedidos: ' + error.message)
    } finally {
      setSincronizando(false)
    }
  }
  
  // Função para limpar todos os pedidos do banco de dados local
  const limparPedidos = async () => {
    try {
      setCarregando(true)
      await clearItems()
      setMensagem('Todos os pedidos foram removidos do banco de dados local')
    } catch (error) {
      setErro('Erro ao limpar pedidos: ' + error.message)
    } finally {
      setCarregando(false)
    }
  }
  
  // Função para lidar com mudanças nos filtros
  const handleFiltroChange = (e) => {
    const { name, value } = e.target
    setFiltros({
      ...filtros,
      [name]: value
    })
    
    // Resetar para a primeira página quando filtrar
    setPaginacao(prev => ({
      ...prev,
      pagina: 1
    }))
  }
  
  // Função para limpar filtros
  const limparFiltros = () => {
    setFiltros({
      cliente: '',
      pedidoCliente: '',
      produto: '',
      status: '',
      ferramenta: '',
      comprimento: '',
      prioridade: 'todos'
    })
    setPaginacao(prev => ({
      ...prev,
      pagina: 1
    }))
  }

  // Função para exportar dados para Excel
  const exportarParaExcel = (usarFiltrados = true) => {
    try {
      const dados = usarFiltrados ? pedidosFiltrados : pedidosDB
      
      if (!dados || dados.length === 0) {
        alert('Nenhum dado para exportar')
        return
      }

      // Preparar dados para exportação
      const dadosExportacao = dados.map(p => ({
        'Nº OP': p.nro_op || '',
        'Pedido/Seq': p.pedido_seq || '',
        'Pedido Cliente': p.pedido_cliente || '',
        'Cliente': p.cliente || '',
        'Data Entrega': p.dt_fatura ? new Date(p.dt_fatura).toLocaleDateString('pt-BR') : '',
        'Ferramenta': extrairFerramenta(p.produto) || '',
        'Produto': p.produto || '',
        'Descrição': p.descricao || '',
        'Unidade': p.unidade || '',
        'Qtd. Pedido': p.qtd_pedido || 0,
        'Saldo a Prod.': p.saldo_a_prod || 0,
        'Estoque': p.estoque_aca || 0,
        'Separado': p.separado || 0
      }))

      // Criar workbook
      const ws = XLSX.utils.json_to_sheet(dadosExportacao)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Pedidos')

      // Ajustar largura das colunas
      const colWidths = [
        { wch: 12 }, // Nº OP
        { wch: 15 }, // Pedido/Seq
        { wch: 15 }, // Pedido Cliente
        { wch: 20 }, // Cliente
        { wch: 15 }, // Data Entrega
        { wch: 12 }, // Ferramenta
        { wch: 20 }, // Produto
        { wch: 30 }, // Descrição
        { wch: 10 }, // Unidade
        { wch: 12 }, // Qtd. Pedido
        { wch: 12 }, // Saldo a Prod.
        { wch: 10 }, // Estoque
        { wch: 10 }  // Separado
      ]
      ws['!cols'] = colWidths

      // Gerar nome do arquivo
      const dataAtual = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')
      const nomeArquivo = usarFiltrados 
        ? `Pedidos_Filtrados_${dataAtual}.xlsx`
        : `Pedidos_Completo_${dataAtual}.xlsx`

      // Salvar arquivo
      XLSX.writeFile(wb, nomeArquivo)
    } catch (err) {
      console.error('Erro ao exportar para Excel:', err)
      alert('Erro ao exportar dados para Excel')
    }
  }
  
  // Função para renderizar ícone de ordenação
  const renderIconeOrdenacao = (campo) => {
    if (ordenacao.campo !== campo) {
      return <FaSort className="ml-1 text-gray-400" />
    }
    
    return ordenacao.direcao === 'asc' 
      ? <FaSortUp className="ml-1 text-primary-600" />
      : <FaSortDown className="ml-1 text-primary-600" />
  }
  
  // Calcula os pedidos da página atual
  const pedidosPaginados = pedidosFiltrados.slice(
    (paginacao.pagina - 1) * paginacao.itensPorPagina,
    paginacao.pagina * paginacao.itensPorPagina
  )
  
  // Calcula o número total de páginas
  const totalPaginas = Math.ceil(pedidosFiltrados.length / paginacao.itensPorPagina)
  
  // Total de Qtd. Pedido dos itens filtrados (para exibição de resumo)
  const totalQtdPedidoFiltrados = useMemo(() => {
    try {
      return pedidosFiltrados.reduce((acc, p) => {
        const v = Number(p.qtd_pedido ?? 0)
        return acc + (Number.isFinite(v) ? v : 0)
      }, 0)
    } catch {
      return 0
    }
  }, [pedidosFiltrados])

  const totalSaldoAProdFiltrados = useMemo(() => {
    try {
      return pedidosFiltrados.reduce((acc, p) => {
        const v = Number(p.saldo_a_prod ?? 0)
        return acc + (Number.isFinite(v) ? v : 0)
      }, 0)
    } catch {
      return 0
    }
  }, [pedidosFiltrados])
  
  // Exibe mensagem de carregamento quando estiver buscando dados do IndexedDB
  if (carregandoDB) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600 mb-2"></div>
          <p className="text-gray-600">Carregando dados do banco local...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Pedidos e Produtos</h1>

      {/* Seção de filtros compactos */}
      <div className="bg-white rounded-lg shadow p-3 mb-4">
        <h2 className="text-base font-semibold text-gray-700 mb-2">Filtros</h2>
        
        {/* Grid: 1 linha em md+ com 8 colunas (7 filtros + botão) */}
        <div className="grid grid-cols-1 md:grid-cols-8 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Cliente</label>
            <input
              type="text"
              name="cliente"
              value={filtros.cliente}
              onChange={handleFiltroChange}
              placeholder="Filtrar por cliente"
              className="w-full h-8 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Pedido Cliente</label>
            <input
              type="text"
              name="pedidoCliente"
              value={filtros.pedidoCliente}
              onChange={handleFiltroChange}
              placeholder="Filtrar por pedido do cliente"
              className="w-full h-8 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Produto/Descrição</label>
            <input
              type="text"
              name="produto"
              value={filtros.produto}
              onChange={handleFiltroChange}
              placeholder="Filtrar por produto"
              className="w-full h-8 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
            <select
              name="status"
              value={filtros.status}
              onChange={handleFiltroChange}
              className="w-full h-8 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="">Todos</option>
              <option value="pendente">Pendente</option>
              <option value="em_producao">Em Produção</option>
              <option value="concluido">Concluído</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Prioridade</label>
            <select
              name="prioridade"
              value={filtros.prioridade}
              onChange={handleFiltroChange}
              className="w-full h-8 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="todos">Todos</option>
              <option value="prioritarios">Apenas Prioritários</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Ferramenta</label>
            <input
              type="text"
              name="ferramenta"
              value={filtros.ferramenta}
              onChange={handleFiltroChange}
              placeholder="Ex.: TP-0192"
              className="w-full h-8 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Comprimento (mm)</label>
            <input
              type="text"
              name="comprimento"
              value={filtros.comprimento}
              onChange={handleFiltroChange}
              placeholder="Ex.: 1100"
              className="w-full h-8 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
          {/* Botão na mesma linha */}
          <div className="md:col-auto justify-self-end">
            <button
              type="button"
              className="px-3 h-8 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              onClick={limparFiltros}
            >
              Limpar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Resumo dos itens filtrados e botões de exportação */}
      <div className="flex justify-between items-center text-sm text-gray-600">
        <div className="flex gap-2">
          <span className="px-2 py-1 bg-white rounded border border-gray-200 shadow-sm">
            Total Qtd. Pedido (itens filtrados):{' '}
            <span className="font-semibold">
              {totalQtdPedidoFiltrados.toLocaleString('pt-BR')}
            </span>
          </span>
          <span className="px-2 py-1 bg-white rounded border border-gray-200 shadow-sm">
            Saldo a produzir (itens filtrados):{' '}
            <span className="font-semibold">
              {totalSaldoAProdFiltrados.toLocaleString('pt-BR')}
            </span>
          </span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => exportarParaExcel(true)}
            className="flex items-center gap-1 px-3 py-1 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 transition-colors"
            title="Exportar dados filtrados para Excel"
          >
            <FaFileExcel />
            Exportar Filtrado
          </button>
          <button
            type="button"
            onClick={() => exportarParaExcel(false)}
            className="flex items-center gap-1 px-3 py-1 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
            title="Exportar todos os dados para Excel"
          >
            <FaFileExcel />
            Exportar Completo
          </button>
        </div>
      </div>

      {/* Tabela de pedidos */}
      <div className="bg-white rounded-lg shadow overflow-hidden mt-2">
        <div className="overflow-x-auto pb-6">
          <table className="min-w-full divide-y divide-gray-200 table-compact">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => alterarOrdenacao('nro_op')}
                >
                  <div className="flex items-center">
                    Nº OP
                    {renderIconeOrdenacao('nro_op')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => alterarOrdenacao('pedido_seq')}
                >
                  <div className="flex items-center">
                    Pedido/Seq
                    {renderIconeOrdenacao('pedido_seq')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => alterarOrdenacao('pedido_cliente')}
                >
                  <div className="flex items-center">
                    Pedido Cliente
                    {renderIconeOrdenacao('pedido_cliente')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => alterarOrdenacao('cliente')}
                >
                  <div className="flex items-center">
                    Cliente
                    {renderIconeOrdenacao('cliente')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => alterarOrdenacao('dt_fatura')}
                >
                  <div className="flex items-center">
                    Data Entrega
                    {renderIconeOrdenacao('dt_fatura')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Ferramenta
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => alterarOrdenacao('produto')}
                >
                  <div className="flex items-center">
                    Produto
                    {renderIconeOrdenacao('produto')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Descrição
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Unidade
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => alterarOrdenacao('qtd_pedido')}
                >
                  <div className="flex items-center">
                    Qtd. Pedido
                    {renderIconeOrdenacao('qtd_pedido')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-primary-700 uppercase tracking-wider"
                  title="Soma de apontamentos registrados para este pedido (total de todos operadores)"
                >
                  Apontado
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => alterarOrdenacao('saldo_a_prod')}
                >
                  <div className="flex items-center">
                    Saldo a Prod.
                    {renderIconeOrdenacao('saldo_a_prod')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => alterarOrdenacao('estoque_aca')}
                >
                  <div className="flex items-center">
                    Estoque
                    {renderIconeOrdenacao('estoque_aca')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => alterarOrdenacao('separado')}
                >
                  <div className="flex items-center">
                    Separado
                    {renderIconeOrdenacao('separado')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => alterarOrdenacao('faturado')}
                >
                  <div className="flex items-center">
                    Faturado
                    {renderIconeOrdenacao('faturado')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Item Perfil
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => alterarOrdenacao('status')}
                >
                  <div className="flex items-center">
                    Status
                    {renderIconeOrdenacao('status')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pedidosPaginados.length > 0 ? (
                pedidosPaginados.map((pedido) => {
                  const ehPrioritario = isPrioritario(pedido.pedido_seq)
                  const dadosPrioridade = ehPrioritario ? getPrioridadeDoPedido(pedido.pedido_seq) : null
                  return (
                  <tr key={pedido.id} className={`hover:bg-gray-50 ${ehPrioritario ? 'bg-yellow-50 border-l-4 border-l-yellow-500' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {pedido.nro_op}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        {ehPrioritario && (
                          <FaStar className="text-yellow-500" title={`Prioridade #${dadosPrioridade?.prioridade || '-'}`} />
                        )}
                        <span>{pedido.pedido_seq}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {pedido.pedido_cliente}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {pedido.cliente}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatarData(pedido.dt_fatura)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {extrairFerramenta(pedido.produto)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 col-truncate">
                      {pedido.produto}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 col-truncate">
                      {pedido.descricao}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {pedido.unidade}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {pedido.qtd_pedido}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {(() => {
                        const { total } = obterApontamentosDoPedido(pedido)
                        return (
                          <span className="px-2 py-1 rounded bg-primary-50 text-primary-800 font-bold" title="Total apontado (todos)">
                            {total}
                          </span>
                        )
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {pedido.saldo_a_prod}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {pedido.estoque_aca}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {pedido.separado}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {pedido.faturado}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {pedido.item_perfil}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {(() => {
                        const st = calcularStatus(pedido)
                        return (
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${classeBadgeStatus(st)}`}>
                            {st}
                          </span>
                        )
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        className="text-primary-600 hover:text-primary-900"
                        title="Visualizar detalhes"
                        onClick={() => { setPedidoSelecionado(pedido); setDetalhesAberto(true) }}
                      >
                        <FaEye />
                      </button>
                    </td>
                  </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan="17" className="px-6 py-4 text-center text-sm text-gray-500">
                    {carregando ? 'Carregando pedidos...' : 'Nenhum pedido encontrado'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Paginação */}
        {pedidosFiltrados.length > 0 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setPaginacao({...paginacao, pagina: Math.max(1, paginacao.pagina - 1)})}
                disabled={paginacao.pagina === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Anterior
              </button>
              <button
                onClick={() => setPaginacao({...paginacao, pagina: Math.min(totalPaginas, paginacao.pagina + 1)})}
                disabled={paginacao.pagina === totalPaginas}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Próximo
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Mostrando <span className="font-medium">{(paginacao.pagina - 1) * paginacao.itensPorPagina + 1}</span> a <span className="font-medium">
                    {Math.min(paginacao.pagina * paginacao.itensPorPagina, pedidosFiltrados.length)}
                  </span> de <span className="font-medium">{pedidosFiltrados.length}</span> resultados
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setPaginacao({...paginacao, pagina: Math.max(1, paginacao.pagina - 1)})}
                    disabled={paginacao.pagina === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                  >
                    <span className="sr-only">Anterior</span>
                    &lt;
                  </button>
                  
                  {[...Array(totalPaginas).keys()].map(i => (
                    <button
                      key={i}
                      onClick={() => setPaginacao({...paginacao, pagina: i + 1})}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium
                        ${paginacao.pagina === i + 1
                          ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => setPaginacao({...paginacao, pagina: Math.min(totalPaginas, paginacao.pagina + 1)})}
                    disabled={paginacao.pagina === totalPaginas}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                  >
                    <span className="sr-only">Próximo</span>
                    &gt;
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de detalhes */}
      {detalhesAberto && pedidoSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black bg-opacity-30" onClick={() => { setDetalhesAberto(false); setPedidoSelecionado(null) }}></div>
          <div className="relative bg-white rounded-lg shadow-lg w-full max-w-4xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Detalhes do Pedido</h3>
              <div className="flex items-center gap-3">
                {(() => { const { total } = obterApontamentosDoPedido(pedidoSelecionado); return (
                  <div className="px-3 py-1 rounded-md bg-primary-50 text-primary-700 text-sm font-semibold border border-primary-200" title="Total apontado (todos)">
                    Qtd. Apontada: {total}
                  </div>
                ) })()}
                <button className="btn-secondary py-1 px-2 flex items-center gap-2" title="Ver apontamentos" onClick={() => setListaApontAberta(true)}>
                  <FaList />
                  Ver apontamentos
                </button>
                <button className="text-sm text-gray-600 hover:text-gray-900" onClick={() => { setDetalhesAberto(false); setPedidoSelecionado(null) }}>Fechar</button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-500">Pedido/Seq</div>
                <div className="font-medium">{pedidoSelecionado.pedido_seq}</div>
              </div>
              <div>
                <div className="text-gray-500">Pedido Cliente</div>
                <div className="font-medium">{pedidoSelecionado.pedido_cliente}</div>
              </div>
              <div>
                <div className="text-gray-500">Cliente</div>
                <div className="font-medium">{pedidoSelecionado.cliente}</div>
              </div>
              <div>
                <div className="text-gray-500">Data Entrega</div>
                <div className="font-medium">{formatarData(pedidoSelecionado.dt_fatura)}</div>
              </div>
              <div>
                <div className="text-gray-500">Produto</div>
                <div className="font-medium break-all">{pedidoSelecionado.produto}</div>
              </div>
              <div>
                <div className="text-gray-500">Descrição</div>
                <div className="font-medium">{pedidoSelecionado.descricao}</div>
              </div>
              <div>
                <div className="text-gray-500">Unidade</div>
                <div className="font-medium">{pedidoSelecionado.unidade}</div>
              </div>
              <div>
                <div className="text-gray-500">Qtd. Pedido</div>
                <div className="font-medium">{pedidoSelecionado.qtd_pedido}</div>
              </div>
              <div>
                <div className="text-gray-500">Saldo a Prod.</div>
                <div className="font-medium">{pedidoSelecionado.saldo_a_prod}</div>
              </div>
              <div>
                <div className="text-gray-500">Estoque</div>
                <div className="font-medium">{pedidoSelecionado.estoque_aca}</div>
              </div>
              <div>
                <div className="text-gray-500">Separado</div>
                <div className="font-medium">{pedidoSelecionado.separado}</div>
              </div>
              <div>
                <div className="text-gray-500">Faturado</div>
                <div className="font-medium">{pedidoSelecionado.faturado}</div>
              </div>
              <div>
                <div className="text-gray-500">Item Perfil</div>
                <div className="font-medium">{pedidoSelecionado.item_perfil}</div>
              </div>
              <div>
                <div className="text-gray-500">Nº OP</div>
                <div className="font-medium">{pedidoSelecionado.nro_op}</div>
              </div>
              <div>
                <div className="text-gray-500">Status</div>
                <div className="font-medium">{calcularStatus(pedidoSelecionado)}</div>
              </div>
              <div>
                <div className="text-gray-500">Ferramenta</div>
                <div className="font-medium">{extrairFerramenta(pedidoSelecionado.produto)}</div>
              </div>
              <div>
                <div className="text-gray-500">Comprimento do Acabado</div>
                <div className="font-medium">{(() => { const c = extrairComprimento(pedidoSelecionado.produto); return c ? `${c} mm` : '' })()}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Lista de Apontamentos do Pedido */}
      {listaApontAberta && pedidoSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black bg-opacity-30" onClick={() => setListaApontAberta(false)}></div>
          <div className="relative bg-white rounded-lg shadow-lg w-full max-w-5xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Apontamentos do Pedido {pedidoSelecionado.pedido_seq}</h3>
              <button className="text-sm text-gray-600 hover:text-gray-900" onClick={() => setListaApontAberta(false)}>Fechar</button>
            </div>
            {(() => { const { lista, total } = obterApontamentosDoPedido(pedidoSelecionado); return (
              <>
                <div className="mb-3 text-sm text-gray-600">Total apontado: <span className="font-semibold text-primary-700">{total}</span></div>
                <div className="max-h-96 overflow-auto border rounded">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-2">Início</th>
                        <th className="text-left px-3 py-2">Fim</th>
                        <th className="text-left px-3 py-2">Máquina</th>
                        <th className="text-left px-3 py-2">Operador</th>
                        <th className="text-left px-3 py-2">Código</th>
                        <th className="text-right px-3 py-2">Quantidade</th>
                        <th className="text-left px-3 py-2">Rack/Pallet</th>
                        <th className="text-left px-3 py-2">Obs.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lista.map((a, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="px-3 py-2">{a.inicio ? new Date(a.inicio).toLocaleString('pt-BR') : '-'}</td>
                          <td className="px-3 py-2">{a.fim ? new Date(a.fim).toLocaleString('pt-BR') : '-'}</td>
                          <td className="px-3 py-2">{(() => { const id = a.maquina ?? a.maquina_id ?? a.maquinaId; const nome = a.maquina_nome ?? a.maquinaNome; return maqMap[String(id)] || nome || id || '-'; })()}</td>
                          <td className="px-3 py-2">{a.operador || '-'}</td>
                          <td className="px-3 py-2">{(a.produto || a.codigoPerfil || '-') }</td>
                          <td className="px-3 py-2 text-right">{a.quantidade || a.quantidadeProduzida || 0}</td>
                          <td className="px-3 py-2">{(a.rack_ou_pallet || a.rackOuPallet || '-') }</td>
                          <td className="px-3 py-2">{a.observacoes || '-'}</td>
                        </tr>
                      ))}
                      {lista.length === 0 && (
                        <tr><td colSpan="8" className="px-3 py-6 text-center text-gray-500">Nenhum apontamento para este pedido</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) })()}
          </div>
        </div>
      )}
    </div>
  )
}

export default Pedidos

// Modal de detalhes
{/* O modal é renderizado dentro do retorno principal acima. Adicionando bloco antes do fechamento do container principal. */}
