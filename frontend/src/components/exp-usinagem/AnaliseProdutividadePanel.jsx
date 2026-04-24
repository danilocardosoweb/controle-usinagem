import { useState, useEffect, useMemo } from 'react'
import { FaUpload, FaCalendarAlt, FaClock, FaChartLine, FaFilter } from 'react-icons/fa'
import * as XLSX from 'xlsx'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
} from 'chart.js'
import supabaseService from '../../services/SupabaseService'
import { formatDateBR, formatInteger, formatNumber, toIntegerRound, toDecimal } from '../../utils/expUsinagem'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

/**
 * Painel de Análise de Produtividade
 * Exibe métricas de produtividade por hora, dia e semana
 * Permite exportar relatórios detalhados
 * 
 * @created 18/11/2024
 * @author Cascade AI
 */
const AnaliseProdutividadePanel = () => {
  // Estados
  const [apontamentos, setApontamentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroUnidade, setFiltroUnidade] = useState('todas') // todas, tecnoperfil, alunica
  const [filtroPeriodo, setFiltroPeriodo] = useState('7') // dias
  const [exportando, setExportando] = useState(false)

  // Carregar apontamentos
  useEffect(() => {
    loadApontamentos()
  }, [])

  const loadApontamentos = async () => {
    setLoading(true)
    try {
      const data = await supabaseService.getAll('apontamentos')
      setApontamentos(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Erro ao carregar apontamentos:', error)
      setApontamentos([])
    } finally {
      setLoading(false)
    }
  }

  // Filtrar apontamentos
  const apontamentosFiltrados = useMemo(() => {
    let filtrados = apontamentos.filter(a => a && a.quantidade)

    // Filtro por unidade
    if (filtroUnidade !== 'todas') {
      filtrados = filtrados.filter(a => {
        if (filtroUnidade === 'tecnoperfil') return a.exp_unidade !== 'alunica'
        if (filtroUnidade === 'alunica') return a.exp_unidade === 'alunica'
        return true
      })
    }

    // Filtro por período
    const diasAtras = parseInt(filtroPeriodo) || 0
    if (diasAtras > 0) {
      const dataLimite = new Date()
      dataLimite.setDate(dataLimite.getDate() - diasAtras)

      filtrados = filtrados.filter(a => {
        if (!a.created_at) return false
        const dataApont = new Date(a.created_at)
        return dataApont >= dataLimite
      })
    }

    return filtrados
  }, [apontamentos, filtroUnidade, filtroPeriodo])

  // Calcular métricas de produtividade
  const metricas = useMemo(() => {
    if (!apontamentosFiltrados.length) {
      return {
        totalPecas: 0,
        totalHoras: 0,
        pecasPorHora: 0,
        apontamentosPorDia: [],
        apontamentosPorSemana: [],
        mediaHorasDia: 0,
        mediaPecasDia: 0,
        usinagem: {
          totalPecas: 0,
          totalHoras: 0,
          pecasPorHora: 0
        },
        inspecao: {
          totalPecas: 0,
          totalHoras: 0,
          pecasPorHora: 0
        },
        embalagem: {
          totalPecas: 0,
          totalHoras: 0,
          pecasPorHora: 0
        }
      }
    }

    let totalPecas = 0
    let totalMinutos = 0
    const porDia = {}
    const porSemana = {}

    let totalPecasUsinagem = 0
    let totalMinUsinagem = 0
    let totalPecasInspecao = 0
    let totalMinInspecao = 0
    let totalPecasEmbalagem = 0
    let totalMinEmbalagem = 0

    apontamentosFiltrados.forEach(a => {
      const qtd = toIntegerRound(a.quantidade) || 0
      totalPecas += qtd

      // Calcular tempo trabalhado por apontamento
      let diffMin = 0
      if (a.inicio && a.fim) {
        try {
          const inicio = new Date(a.inicio)
          const fim = new Date(a.fim)
          const diffMs = fim - inicio
          diffMin = Math.max(0, diffMs / (1000 * 60))
          totalMinutos += diffMin
        } catch (e) {
          console.warn('Erro ao calcular tempo:', e)
        }
      }

      // Segmentos principais: Usinagem geral (sem EXP), Inspeção e Embalagem (Alúnica)
      const isUsinagemGeral = !a.exp_fluxo_id && !a.exp_unidade && !a.exp_stage
      if (isUsinagemGeral) {
        totalPecasUsinagem += qtd
        totalMinUsinagem += diffMin
      }

      const isInspecaoAlunica = a.exp_unidade === 'alunica' && a.exp_stage === 'para-inspecao'
      if (isInspecaoAlunica) {
        totalPecasInspecao += qtd
        totalMinInspecao += diffMin
      }

      const isEmbalagemAlunica = a.exp_unidade === 'alunica' && a.exp_stage === 'para-embarque'
      if (isEmbalagemAlunica) {
        totalPecasEmbalagem += qtd
        totalMinEmbalagem += diffMin
      }

      // Agrupar por dia
      if (a.created_at) {
        const data = new Date(a.created_at)
        const diaKey = data.toISOString().split('T')[0] // YYYY-MM-DD

        if (!porDia[diaKey]) {
          porDia[diaKey] = {
            data: diaKey,
            pecas: 0,
            minutos: 0,
            apontamentos: 0
          }
        }

        porDia[diaKey].pecas += qtd
        porDia[diaKey].apontamentos += 1
        porDia[diaKey].minutos += diffMin

        // Agrupar por semana (ISO week)
        const semana = getISOWeek(data)
        const ano = data.getFullYear()
        const semanaKey = `${ano}-S${semana}`

        if (!porSemana[semanaKey]) {
          porSemana[semanaKey] = {
            semana: semanaKey,
            pecas: 0,
            minutos: 0,
            apontamentos: 0
          }
        }

        porSemana[semanaKey].pecas += qtd
        porSemana[semanaKey].apontamentos += 1
        porSemana[semanaKey].minutos += diffMin
      }
    })

    const totalHoras = totalMinutos / 60
    const pecasPorHora = totalHoras > 0 ? totalPecas / totalHoras : 0

    // Converter para arrays e ordenar
    const apontamentosPorDia = Object.values(porDia)
      .map(d => ({
        ...d,
        horas: d.minutos / 60,
        pecasPorHora: d.minutos > 0 ? (d.pecas / (d.minutos / 60)) : 0
      }))
      .sort((a, b) => b.data.localeCompare(a.data))

    const apontamentosPorSemana = Object.values(porSemana)
      .map(s => ({
        ...s,
        horas: s.minutos / 60,
        pecasPorHora: s.minutos > 0 ? (s.pecas / (s.minutos / 60)) : 0
      }))
      .sort((a, b) => b.semana.localeCompare(a.semana))

    // Médias
    const diasComDados = apontamentosPorDia.length
    const mediaHorasDia = diasComDados > 0 ? totalHoras / diasComDados : 0
    const mediaPecasDia = diasComDados > 0 ? totalPecas / diasComDados : 0

    // Métricas segmentadas
    const usinagemHoras = totalMinUsinagem / 60
    const inspecaoHoras = totalMinInspecao / 60
    const embalagemHoras = totalMinEmbalagem / 60

    const usinagem = {
      totalPecas: totalPecasUsinagem,
      totalHoras: usinagemHoras,
      pecasPorHora: usinagemHoras > 0 ? totalPecasUsinagem / usinagemHoras : 0
    }

    const inspecao = {
      totalPecas: totalPecasInspecao,
      totalHoras: inspecaoHoras,
      pecasPorHora: inspecaoHoras > 0 ? totalPecasInspecao / inspecaoHoras : 0
    }

    const embalagem = {
      totalPecas: totalPecasEmbalagem,
      totalHoras: embalagemHoras,
      pecasPorHora: embalagemHoras > 0 ? totalPecasEmbalagem / embalagemHoras : 0
    }

    return {
      totalPecas,
      totalHoras,
      pecasPorHora,
      apontamentosPorDia,
      apontamentosPorSemana,
      mediaHorasDia,
      mediaPecasDia,
      usinagem,
      inspecao,
      embalagem
    }
  }, [apontamentosFiltrados])

  // Função para calcular semana ISO
  function getISOWeek(date) {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + 4 - (d.getDay() || 7))
    const yearStart = new Date(d.getFullYear(), 0, 1)
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
    return weekNo
  }

  const chartDataProdDia = useMemo(() => {
    if (!metricas.apontamentosPorDia.length) {
      return { labels: [], datasets: [] }
    }

    const ordered = [...metricas.apontamentosPorDia].slice().reverse()

    return {
      labels: ordered.map((d) => formatDateBR(d.data)),
      datasets: [
        {
          label: 'Peças/Hora',
          data: ordered.map((d) => d.pecasPorHora || 0),
          borderColor: 'rgb(37,99,235)',
          backgroundColor: 'rgba(37,99,235,0.15)',
          tension: 0.3,
          fill: true,
          pointRadius: 3
        }
      ]
    }
  }, [metricas.apontamentosPorDia])

  const chartOptionsProdDia = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const value = ctx.parsed.y || 0
            try {
              return `${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)} peças/h`
            } catch {
              return `${value} peças/h`
            }
          }
        }
      }
    },
    scales: {
      x: {
        ticks: {
          autoSkip: true,
          maxTicksLimit: 10
        }
      },
      y: {
        beginAtZero: true
      }
    }
  }

  // Exportar relatório
  const handleExportarRelatorio = () => {
    if (exportando) return
    setExportando(true)

    try {
      const wb = XLSX.utils.book_new()

      // Aba 1: Resumo Geral
      const resumo = [
        ['ANÁLISE DE PRODUTIVIDADE - RESUMO GERAL'],
        [''],
        ['Período', filtroPeriodo === '7' ? 'Últimos 7 dias' : filtroPeriodo === '30' ? 'Últimos 30 dias' : 'Todo o período'],
        ['Unidade', filtroUnidade === 'todas' ? 'Todas' : filtroUnidade === 'tecnoperfil' ? 'TecnoPerfil' : 'Alúnica'],
        [''],
        ['MÉTRICAS GERAIS'],
        ['Total de Peças', formatInteger(metricas.totalPecas)],
        ['Total de Horas', formatNumber(metricas.totalHoras)],
        ['Peças por Hora (Média)', formatNumber(metricas.pecasPorHora)],
        ['Média de Horas por Dia', formatNumber(metricas.mediaHorasDia)],
        ['Média de Peças por Dia', formatNumber(metricas.mediaPecasDia)],
        ['Total de Apontamentos', apontamentosFiltrados.length],
        [''],
        ['MÉTRICAS POR ETAPA'],
        ['Usinagem (Geral) - Peças', formatInteger(metricas.usinagem.totalPecas)],
        ['Usinagem (Geral) - Horas', formatNumber(metricas.usinagem.totalHoras)],
        ['Usinagem (Geral) - Peças/Hora', formatNumber(metricas.usinagem.pecasPorHora)],
        ['Inspeção (Alúnica) - Peças', formatInteger(metricas.inspecao.totalPecas)],
        ['Inspeção (Alúnica) - Horas', formatNumber(metricas.inspecao.totalHoras)],
        ['Inspeção (Alúnica) - Peças/Hora', formatNumber(metricas.inspecao.pecasPorHora)],
        ['Embalagem (Alúnica) - Peças', formatInteger(metricas.embalagem.totalPecas)],
        ['Embalagem (Alúnica) - Horas', formatNumber(metricas.embalagem.totalHoras)],
        ['Embalagem (Alúnica) - Peças/Hora', formatNumber(metricas.embalagem.pecasPorHora)]
      ]
      const wsResumo = XLSX.utils.aoa_to_sheet(resumo)
      XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo')

      // Aba 2: Produtividade por Dia
      const porDia = [
        ['Data', 'Peças', 'Horas', 'Peças/Hora', 'Apontamentos']
      ]
      metricas.apontamentosPorDia.forEach(d => {
        porDia.push([
          formatDateBR(d.data),
          d.pecas,
          formatNumber(d.horas),
          formatNumber(d.pecasPorHora),
          d.apontamentos
        ])
      })
      const wsPorDia = XLSX.utils.aoa_to_sheet(porDia)
      XLSX.utils.book_append_sheet(wb, wsPorDia, 'Por Dia')

      // Aba 3: Produtividade por Semana
      const porSemana = [
        ['Semana', 'Peças', 'Horas', 'Peças/Hora', 'Apontamentos']
      ]
      metricas.apontamentosPorSemana.forEach(s => {
        porSemana.push([
          s.semana,
          s.pecas,
          formatNumber(s.horas),
          formatNumber(s.pecasPorHora),
          s.apontamentos
        ])
      })
      const wsPorSemana = XLSX.utils.aoa_to_sheet(porSemana)
      XLSX.utils.book_append_sheet(wb, wsPorSemana, 'Por Semana')

      // Aba 4: Produtividade por Etapa
      const porEtapa = [
        ['Etapa', 'Peças', 'Horas', 'Peças/Hora']
      ]
      porEtapa.push([
        'Usinagem (Geral)',
        metricas.usinagem.totalPecas,
        formatNumber(metricas.usinagem.totalHoras),
        formatNumber(metricas.usinagem.pecasPorHora)
      ])
      porEtapa.push([
        'Inspeção (Alúnica)',
        metricas.inspecao.totalPecas,
        formatNumber(metricas.inspecao.totalHoras),
        formatNumber(metricas.inspecao.pecasPorHora)
      ])
      porEtapa.push([
        'Embalagem (Alúnica)',
        metricas.embalagem.totalPecas,
        formatNumber(metricas.embalagem.totalHoras),
        formatNumber(metricas.embalagem.pecasPorHora)
      ])
      const wsPorEtapa = XLSX.utils.aoa_to_sheet(porEtapa)
      XLSX.utils.book_append_sheet(wb, wsPorEtapa, 'Por Etapa')

      // Aba 5: Apontamentos Detalhados
      const detalhes = [
        ['ID', 'Data', 'Pedido', 'Unidade', 'Estágio', 'Lote', 'Quantidade', 'Início', 'Fim', 'Tempo (min)', 'Observações']
      ]
      apontamentosFiltrados.forEach(a => {
        let tempoMin = 0
        if (a.inicio && a.fim) {
          try {
            const inicio = new Date(a.inicio)
            const fim = new Date(a.fim)
            tempoMin = Math.max(0, (fim - inicio) / (1000 * 60))
          } catch (e) {
            // ignorar
          }
        }

        detalhes.push([
          a.id || '',
          a.created_at ? formatDateBR(a.created_at) : '',
          a.exp_fluxo_id || '',
          a.exp_unidade || '',
          a.exp_stage || '',
          a.lote || '',
          a.quantidade || 0,
          a.inicio ? new Date(a.inicio).toLocaleString('pt-BR') : '',
          a.fim ? new Date(a.fim).toLocaleString('pt-BR') : '',
          formatNumber(tempoMin),
          a.observacoes || ''
        ])
      })
      const wsDetalhes = XLSX.utils.aoa_to_sheet(detalhes)
      XLSX.utils.book_append_sheet(wb, wsDetalhes, 'Apontamentos Detalhados')

      // Salvar arquivo
      const filename = `analise-produtividade-${new Date().toISOString().split('T')[0]}.xlsx`
      XLSX.writeFile(wb, filename)
    } catch (error) {
      console.error('Erro ao exportar:', error)
      alert('Erro ao exportar relatório')
    } finally {
      setExportando(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-sm text-gray-600">Carregando apontamentos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <FaFilter className="text-gray-500" />
            <span className="text-sm font-semibold text-gray-700">Filtros:</span>
          </div>

          <select
            value={filtroUnidade}
            onChange={(e) => setFiltroUnidade(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="todas">Todas as unidades</option>
            <option value="tecnoperfil">TecnoPerfil</option>
            <option value="alunica">Alúnica</option>
          </select>

          <select
            value={filtroPeriodo}
            onChange={(e) => setFiltroPeriodo(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="7">Últimos 7 dias</option>
            <option value="15">Últimos 15 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="60">Últimos 60 dias</option>
            <option value="90">Últimos 90 dias</option>
            <option value="0">Todo o período</option>
          </select>

          <button
            type="button"
            onClick={handleExportarRelatorio}
            disabled={exportando || !apontamentosFiltrados.length}
            className="ml-auto inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            <FaUpload className="h-3.5 w-3.5" />
            {exportando ? 'Exportando...' : 'Exportar Relatório'}
          </button>
        </div>
      </div>

      {/* Cards de Métricas Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">Total de Peças</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatInteger(metricas.totalPecas)}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <FaChartLine className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">Peças por Hora</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(metricas.pecasPorHora)}</p>
              <p className="text-xs text-gray-500 mt-1">Média geral</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <FaClock className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">Horas Trabalhadas</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(metricas.totalHoras)}</p>
              <p className="text-xs text-gray-500 mt-1">{formatNumber(metricas.mediaHorasDia)} h/dia</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
              <FaClock className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">Apontamentos</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatInteger(apontamentosFiltrados.length)}</p>
              <p className="text-xs text-gray-500 mt-1">{formatNumber(metricas.mediaPecasDia)} peças/dia</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
              <FaCalendarAlt className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Produtividade por Etapa (Usinagem, Inspeção, Embalagem) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow p-4">
          <p className="text-xs font-semibold uppercase opacity-80">Usinagem (Geral)</p>
          <p className="mt-2 text-2xl font-bold">{formatNumber(metricas.usinagem.pecasPorHora)}</p>
          <p className="mt-1 text-xs opacity-80">
            {formatInteger(metricas.usinagem.totalPecas)} peças
            {' · '}
            {formatNumber(metricas.usinagem.totalHoras)} h
          </p>
        </div>

        <div className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow p-4">
          <p className="text-xs font-semibold uppercase opacity-80">Inspeção (Alúnica)</p>
          <p className="mt-2 text-2xl font-bold">{formatNumber(metricas.inspecao.pecasPorHora)}</p>
          <p className="mt-1 text-xs opacity-80">
            {formatInteger(metricas.inspecao.totalPecas)} peças
            {' · '}
            {formatNumber(metricas.inspecao.totalHoras)} h
          </p>
        </div>

        <div className="rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow p-4">
          <p className="text-xs font-semibold uppercase opacity-80">Embalagem (Alúnica)</p>
          <p className="mt-2 text-2xl font-bold">{formatNumber(metricas.embalagem.pecasPorHora)}</p>
          <p className="mt-1 text-xs opacity-80">
            {formatInteger(metricas.embalagem.totalPecas)} peças
            {' · '}
            {formatNumber(metricas.embalagem.totalHoras)} h
          </p>
        </div>
      </div>

      {/* Gráfico de tendência de produtividade */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-800">Tendência de Produtividade (Peças/Hora)</h3>
          <span className="text-xs text-gray-500">
            {metricas.apontamentosPorDia.length > 0
              ? `${metricas.apontamentosPorDia.length} dia(s) com dados`
              : 'Sem dados para o período selecionado'}
          </span>
        </div>
        <div className="h-64">
          {chartDataProdDia.labels.length ? (
            <Line data={chartDataProdDia} options={chartOptionsProdDia} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              Nenhum dado suficiente para montar o gráfico.
            </div>
          )}
        </div>
      </div>

      {/* Tabela: Produtividade por Dia */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b px-6 py-4">
          <h3 className="text-base font-semibold text-gray-800">Produtividade por Dia</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr className="text-xs uppercase tracking-wide text-gray-500">
                <th className="px-6 py-3 text-left">Data</th>
                <th className="px-6 py-3 text-right">Peças</th>
                <th className="px-6 py-3 text-right">Horas</th>
                <th className="px-6 py-3 text-right">Peças/Hora</th>
                <th className="px-6 py-3 text-right">Apontamentos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {metricas.apontamentosPorDia.slice(0, 10).map((d, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-semibold text-gray-800">{formatDateBR(d.data)}</td>
                  <td className="px-6 py-3 text-right">{formatInteger(d.pecas)}</td>
                  <td className="px-6 py-3 text-right">{formatNumber(d.horas)}</td>
                  <td className="px-6 py-3 text-right font-semibold text-green-600">{formatNumber(d.pecasPorHora)}</td>
                  <td className="px-6 py-3 text-right text-gray-600">{d.apontamentos}</td>
                </tr>
              ))}
              {metricas.apontamentosPorDia.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    Nenhum dado disponível para o período selecionado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabela: Produtividade por Semana */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b px-6 py-4">
          <h3 className="text-base font-semibold text-gray-800">Produtividade por Semana</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr className="text-xs uppercase tracking-wide text-gray-500">
                <th className="px-6 py-3 text-left">Semana</th>
                <th className="px-6 py-3 text-right">Peças</th>
                <th className="px-6 py-3 text-right">Horas</th>
                <th className="px-6 py-3 text-right">Peças/Hora</th>
                <th className="px-6 py-3 text-right">Apontamentos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {metricas.apontamentosPorSemana.map((s, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-semibold text-gray-800">{s.semana}</td>
                  <td className="px-6 py-3 text-right">{formatInteger(s.pecas)}</td>
                  <td className="px-6 py-3 text-right">{formatNumber(s.horas)}</td>
                  <td className="px-6 py-3 text-right font-semibold text-green-600">{formatNumber(s.pecasPorHora)}</td>
                  <td className="px-6 py-3 text-right text-gray-600">{s.apontamentos}</td>
                </tr>
              ))}
              {metricas.apontamentosPorSemana.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    Nenhum dado disponível para o período selecionado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default AnaliseProdutividadePanel
