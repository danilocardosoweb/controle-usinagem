import React, { useState, useEffect, useMemo } from 'react';
import { FaPrint, FaDownload, FaCalendarAlt, FaCheckCircle, FaExclamationTriangle, FaTimesCircle, FaFilter, FaChartLine, FaClock, FaUser, FaCog } from 'react-icons/fa';
import { supabase } from '../config/supabase';
import * as XLSX from 'xlsx';
import { DOCUMENT_VERSION_LABEL } from '../config/documentVersion';

const formatarDataLocal = (dataIso) => {
  if (!dataIso) return '-';
  const [ano, mes, dia] = String(dataIso).slice(0, 10).split('-');
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : dataIso;
};

const dataInputLocal = (data) => {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
};

const RelatorioChecklist = () => {
  const [checklists, setChecklists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({
    dataInicio: '',
    dataFim: '',
    maquina: '',
    operador: '',
    turno: '',
    status: '',
    periodo: 'hoje' // hoje, semana, mes, personalizado
  });
  const [mostrarFiltros, setMostrarFiltros] = useState(true);

  useEffect(() => {
    carregarChecklists();
  }, [filtros]);

  const carregarChecklists = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('checklist_inicio_turno')
        .select('*')
        .order('data_checklist', { ascending: false })
        .order('hora_checklist', { ascending: false });

      // Aplicar filtros de data
      const { dataInicio, dataFim } = getDataFiltro();
      if (dataInicio) {
        query = query.gte('data_checklist', dataInicio);
      }
      if (dataFim) {
        query = query.lte('data_checklist', dataFim);
      }

      // Aplicar outros filtros
      if (filtros.maquina) {
        query = query.ilike('maquina', `%${filtros.maquina}%`);
      }
      if (filtros.operador) {
        query = query.ilike('operador_nome', `%${filtros.operador}%`);
      }
      if (filtros.turno && filtros.turno !== '') {
        query = query.eq('turno', filtros.turno);
      }
      if (filtros.status && filtros.status !== '') {
        query = query.eq('status', filtros.status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro na query Supabase:', error);
        throw error;
      }
      
      console.log(`✅ Checklists carregados: ${data?.length || 0} registros`, {
        periodo: filtros.periodo,
        dataInicio,
        dataFim,
        filtros
      });
      
      setChecklists(data || []);
    } catch (error) {
      console.error('Erro ao carregar checklists:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDataFiltro = () => {
    const hoje = new Date();
    let dataInicio = '';
    let dataFim = '';

    switch (filtros.periodo) {
      case 'hoje':
        dataInicio = dataFim = dataInputLocal(hoje);
        break;
      case 'semana':
        const inicioSemana = new Date(hoje);
        inicioSemana.setDate(hoje.getDate() - 7);
        dataInicio = dataInputLocal(inicioSemana);
        dataFim = dataInputLocal(hoje);
        break;
      case 'mes':
        const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        dataInicio = dataInputLocal(inicioMes);
        dataFim = dataInputLocal(hoje);
        break;
      case 'personalizado':
        dataInicio = filtros.dataInicio;
        dataFim = filtros.dataFim;
        break;
    }

    return { dataInicio, dataFim };
  };

  const estatisticas = useMemo(() => {
    const total = checklists.length;
    const concluidos = checklists.filter(c => c.status === 'concluido').length;
    const pendentes = checklists.filter(c => c.status === 'pendente').length;
    const incompletos = checklists.filter(c => c.status === 'incompleto').length;
    const comOcorrencias = checklists.filter(c =>
      (Number(c.itens_atencao) || 0) > 0 || (Number(c.itens_problema) || 0) > 0
    ).length;
    
    // Conformidade mede os itens aprovados, não apenas o encerramento do checklist.
    const totalItens = checklists.reduce((sum, c) => sum + (Number(c.total_itens) || 0), 0);
    const totalItensOk = checklists.reduce((sum, c) => sum + (Number(c.itens_ok) || 0), 0);
    const taxaConformidade = totalItens > 0 ? ((totalItensOk / totalItens) * 100).toFixed(1) : 0;
    
    // Distribuição por turno
    const porTurno = checklists.reduce((acc, c) => {
      acc[c.turno] = (acc[c.turno] || 0) + 1;
      return acc;
    }, {});

    // Distribuição por máquina
    const porMaquina = checklists.reduce((acc, c) => {
      acc[c.maquina] = (acc[c.maquina] || 0) + 1;
      return acc;
    }, {});

    // Média de itens OK por checklist
    const mediaItensOK = total > 0 
      ? (checklists.reduce((sum, c) => sum + (c.itens_ok || 0), 0) / total).toFixed(1)
      : 0;

    return {
      total,
      concluidos,
      pendentes,
      incompletos,
      comOcorrencias,
      taxaConformidade,
      porTurno,
      porMaquina,
      mediaItensOK
    };
  }, [checklists]);

  const exportarExcel = () => {
    const periodo = getDataFiltro();
    const turnosEsperados = filtros.turno ? [filtros.turno] : ['1º Turno', '2º Turno'];
    const cobertura = [];
    if (periodo.dataInicio && periodo.dataFim) {
      const cursor = new Date(`${periodo.dataInicio}T12:00:00`);
      const limite = new Date(`${periodo.dataFim}T12:00:00`);
      let diasProcessados = 0;
      while (cursor <= limite && diasProcessados < 366) {
        const dataIso = dataInputLocal(cursor);
        turnosEsperados.forEach(turno => {
          const registros = checklists.filter(c => c.data_checklist === dataIso && c.turno === turno);
          cobertura.push({
            'Data': formatarDataLocal(dataIso),
            'Turno': turno,
            'Situação': registros.length > 0 ? 'REALIZADO' : 'SEM CHECKLIST',
            'Quantidade de registros': registros.length,
            'Operadores': [...new Set(registros.map(c => c.operador_nome).filter(Boolean))].join(', ') || '-',
            'Máquinas': [...new Set(registros.map(c => c.maquina).filter(Boolean))].join(', ') || '-',
            'Com ocorrências': registros.filter(c =>
              (Number(c.itens_atencao) || 0) > 0 || (Number(c.itens_problema) || 0) > 0
            ).length
          });
        });
        cursor.setDate(cursor.getDate() + 1);
        diasProcessados += 1;
      }
    }
    const turnosSemChecklist = cobertura.filter(item => item['Situação'] === 'SEM CHECKLIST').length;
    const dados = checklists.map(c => ({
      'Data': formatarDataLocal(c.data_checklist),
      'Hora': c.hora_checklist,
      'Máquina': c.maquina,
      'Operador': c.operador_nome,
      'Turno': c.turno,
      'Status': c.status,
      'Total Itens': c.total_itens,
      'Itens OK': c.itens_ok,
      'Itens Atenção': c.itens_atencao,
      'Itens Problema': c.itens_problema,
      'Taxa Conformidade': c.total_itens > 0 ? `${((c.itens_ok / c.total_itens) * 100).toFixed(1)}%` : '0%',
      'Observações': c.observacoes || '',
      'Não Conformidades': c.nao_conformidades || '',
      'Ações Corretivas': c.acoes_corretivas || ''
    }));

    const wb = XLSX.utils.book_new();

    const statsData = [
      ['RELATÓRIO DE VALIDAÇÃO DO CHECKLIST DE INÍCIO DE TURNO'],
      [DOCUMENT_VERSION_LABEL],
      ['Período', formatarDataLocal(periodo.dataInicio) || 'Início', 'até', formatarDataLocal(periodo.dataFim) || 'Fim'],
      ['Gerado em', new Date().toLocaleString('pt-BR')],
      [],
      ['Estatísticas Gerais'],
      ['Total de Checklists', estatisticas.total],
      ['Concluídos', estatisticas.concluidos],
      ['Pendentes', estatisticas.pendentes],
      ['Incompletos', estatisticas.incompletos],
      ['Com ocorrências', estatisticas.comOcorrencias],
      ['Datas/turnos sem checklist', turnosSemChecklist],
      ['Taxa de Conformidade', `${estatisticas.taxaConformidade}%`],
      ['Média Itens OK', estatisticas.mediaItensOK],
      [],
      ['Distribuição por Turno'],
      ...Object.entries(estatisticas.porTurno).map(([turno, qtd]) => [turno, qtd]),
      [],
      ['Distribuição por Máquina'],
      ...Object.entries(estatisticas.porMaquina).map(([maquina, qtd]) => [maquina, qtd])
    ];

    const wsStats = XLSX.utils.aoa_to_sheet(statsData);
    wsStats['!cols'] = [{ wch: 32 }, { wch: 20 }, { wch: 10 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsStats, 'Resumo');

    const ws = XLSX.utils.json_to_sheet(dados);
    const colunas = Object.keys(dados[0] || {
      Data: '', Hora: '', Máquina: '', Operador: '', Turno: '', Status: '',
      'Total Itens': '', 'Itens OK': '', 'Itens Atenção': '', 'Itens Problema': '',
      'Taxa Conformidade': '', Observações: '', 'Não Conformidades': '', 'Ações Corretivas': ''
    });
    ws['!cols'] = colunas.map(coluna => ({
      wch: Math.min(55, Math.max(12, coluna.length + 2, ...dados.map(linha => String(linha[coluna] ?? '').length + 2)))
    }));
    if (dados.length > 0) {
      ws['!autofilter'] = { ref: `A1:${XLSX.utils.encode_col(colunas.length - 1)}${dados.length + 1}` };
    }
    ws['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft', state: 'frozen' };
    XLSX.utils.book_append_sheet(wb, ws, 'Detalhamento');

    const wsCobertura = XLSX.utils.json_to_sheet(cobertura);
    wsCobertura['!cols'] = [
      { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 24 },
      { wch: 32 }, { wch: 32 }, { wch: 18 }
    ];
    if (cobertura.length > 0) {
      wsCobertura['!autofilter'] = { ref: `A1:G${cobertura.length + 1}` };
    }
    wsCobertura['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft', state: 'frozen' };
    XLSX.utils.book_append_sheet(wb, wsCobertura, 'Cobertura por Turno');

    const inicioArquivo = periodo.dataInicio || 'inicio';
    const fimArquivo = periodo.dataFim || 'fim';
    const fileName = `validacao_checklist_${inicioArquivo}_a_${fimArquivo}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const imprimirRelatorio = () => {
    const printContent = `
      <html>
        <head>
          <title>Relatório de Checklists</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .stats { display: flex; justify-content: space-around; margin-bottom: 30px; }
            .stat-card { border: 1px solid #ddd; padding: 15px; text-align: center; min-width: 120px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; }
            .status-ok { color: green; }
            .status-pendente { color: orange; }
            .status-problema { color: red; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Relatório de Checklists de Início de Turno</h1>
            <p>Período: ${getDataFiltro().dataInicio || 'Início'} até ${getDataFiltro().dataFim || 'Fim'}</p>
            <p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
          </div>
          
          <div class="stats">
            <div class="stat-card">
              <h3>${estatisticas.total}</h3>
              <p>Total</p>
            </div>
            <div class="stat-card">
              <h3 class="status-ok">${estatisticas.concluidos}</h3>
              <p>Concluídos</p>
            </div>
            <div class="stat-card">
              <h3 class="status-pendente">${estatisticas.comOcorrencias}</h3>
              <p>Com ocorrências</p>
            </div>
            <div class="stat-card">
              <h3>${estatisticas.taxaConformidade}%</h3>
              <p>Conformidade</p>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Hora</th>
                <th>Máquina</th>
                <th>Operador</th>
                <th>Turno</th>
                <th>Status</th>
                <th>Itens OK</th>
                <th>Atenções</th>
                <th>Problemas</th>
                <th>Total</th>
                <th>% OK</th>
              </tr>
            </thead>
            <tbody>
              ${checklists.map(c => `
                <tr>
                  <td>${formatarDataLocal(c.data_checklist)}</td>
                  <td>${c.hora_checklist}</td>
                  <td>${c.maquina}</td>
                  <td>${c.operador_nome}</td>
                  <td>${c.turno}</td>
                  <td class="status-${c.status}">${c.status}</td>
                  <td>${c.itens_ok}</td>
                  <td>${c.itens_atencao || 0}</td>
                  <td>${c.itens_problema || 0}</td>
                  <td>${c.total_itens}</td>
                  <td>${c.total_itens > 0 ? ((c.itens_ok / c.total_itens) * 100).toFixed(1) : 0}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FaCheckCircle className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Relatório de Checklists</h1>
            <p className="text-gray-600">Controle e análise dos checklists de início de turno</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={carregarChecklists}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
            title="Recarregar dados do servidor"
          >
            <FaFilter className="w-4 h-4" />
            Recarregar
          </button>
          <button
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
          >
            <FaFilter className="w-4 h-4" />
            Filtros
          </button>
          <button
            onClick={exportarExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
          >
            <FaDownload className="w-4 h-4" />
            Exportar Excel
          </button>
          <button
            onClick={imprimirRelatorio}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <FaPrint className="w-4 h-4" />
            Imprimir
          </button>
        </div>
      </div>

      {/* Filtros */}
      {mostrarFiltros && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FaFilter className="w-5 h-5" />
            Filtros do Relatório
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Período
              </label>
              <select
                value={filtros.periodo}
                onChange={(e) => setFiltros(prev => ({ ...prev, periodo: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="hoje">Hoje</option>
                <option value="semana">Últimos 7 dias</option>
                <option value="mes">Este mês</option>
                <option value="personalizado">Personalizado</option>
              </select>
            </div>

            {filtros.periodo === 'personalizado' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Início
                  </label>
                  <input
                    type="date"
                    value={filtros.dataInicio}
                    onChange={(e) => setFiltros(prev => ({ ...prev, dataInicio: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Fim
                  </label>
                  <input
                    type="date"
                    value={filtros.dataFim}
                    onChange={(e) => setFiltros(prev => ({ ...prev, dataFim: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Máquina
              </label>
              <input
                type="text"
                value={filtros.maquina}
                onChange={(e) => setFiltros(prev => ({ ...prev, maquina: e.target.value }))}
                placeholder="Filtrar por máquina..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Operador
              </label>
              <input
                type="text"
                value={filtros.operador}
                onChange={(e) => setFiltros(prev => ({ ...prev, operador: e.target.value }))}
                placeholder="Filtrar por operador..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Turno
              </label>
              <select
                value={filtros.turno}
                onChange={(e) => setFiltros(prev => ({ ...prev, turno: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todos</option>
                <option value="1º Turno">1º Turno</option>
                <option value="2º Turno">2º Turno</option>
                <option value="3º Turno">3º Turno</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filtros.status}
                onChange={(e) => setFiltros(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todos</option>
                <option value="pendente">Pendente</option>
                <option value="concluido">Concluído</option>
                <option value="incompleto">Incompleto</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Checklists</p>
              <p className="text-2xl font-bold text-gray-800">{estatisticas.total}</p>
            </div>
            <FaChartLine className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Concluídos</p>
              <p className="text-2xl font-bold text-green-600">{estatisticas.concluidos}</p>
            </div>
            <FaCheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Com ocorrências</p>
              <p className="text-2xl font-bold text-yellow-600">{estatisticas.comOcorrencias}</p>
            </div>
            <FaExclamationTriangle className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Taxa Conformidade</p>
              <p className="text-2xl font-bold text-blue-600">{estatisticas.taxaConformidade}%</p>
            </div>
            <FaCog className="w-8 h-8 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Tabela de Resultados */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hora
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Máquina
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Operador
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Turno
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Itens OK
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Atenções
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Problemas
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  % OK
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Observações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {checklists.map((checklist) => (
                <tr key={checklist.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {formatarDataLocal(checklist.data_checklist)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {checklist.hora_checklist}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {checklist.maquina}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {checklist.operador_nome}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {checklist.turno}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      checklist.status === 'concluido' 
                        ? 'bg-green-100 text-green-800'
                        : checklist.status === 'pendente'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {checklist.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {checklist.itens_ok}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-amber-700">
                    {checklist.itens_atencao || 0}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-red-700">
                    {checklist.itens_problema || 0}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {checklist.total_itens}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {checklist.total_itens > 0 
                      ? `${((checklist.itens_ok / checklist.total_itens) * 100).toFixed(1)}%`
                      : '0%'
                    }
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                    {checklist.observacoes || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {checklists.length === 0 && (
          <div className="text-center py-8">
            <FaCheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nenhum checklist encontrado no período selecionado.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RelatorioChecklist;
