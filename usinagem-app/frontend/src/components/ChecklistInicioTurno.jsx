import React, { useState, useEffect, useMemo } from 'react';
import { 
  FaCheckCircle, 
  FaExclamationTriangle, 
  FaTimesCircle, 
  FaCamera, 
  FaWrench,
  FaChartLine,
  FaCog,
  FaClipboardCheck,
  FaChevronRight,
  FaBroom,
  FaTachometerAlt,
  FaTools,
  FaRuler,
  FaHardHat,
  FaMicrochip,
  FaServer,
  FaBox,
  FaListAlt
} from 'react-icons/fa';

// Categorias do checklist com seus itens - ESPECÍFICO PARA USINAGEM
const CHECKLIST_CATEGORIAS = [
  {
    id: 'limpeza',
    titulo: 'Limpeza e Organização',
    icon: FaBroom,
    cor: 'blue',
    itens: [
      { id: 'piso', texto: 'Piso limpo e sem obstáculos' },
      { id: 'bancada', texto: 'Bancada organizada e limpa' },
      { id: 'cavacos', texto: 'Cavacos e aparas removidos das máquinas' },
      { id: 'oleo', texto: 'Sem vazamentos de óleo ou fluidos' },
      { id: 'passagem', texto: 'Passagem entre máquinas liberada' },
    ]
  },
  {
    id: 'seguranca',
    titulo: 'Segurança do Operador',
    icon: FaHardHat,
    cor: 'rose',
    itens: [
      { id: 'epi', texto: 'EPIs completos (óculos, luvas, protetor auricular)' },
      { id: 'sapato', texto: 'Sapato de segurança com biqueira' },
      { id: 'cabelo', texto: 'Cabelo preso / touca de proteção' },
      { id: 'protecoes', texto: 'Proteções das máquinas instaladas' },
      { id: 'botao_emergencia', texto: 'Botões de emergência testados' },
    ]
  },
  {
    id: 'serra_doppia',
    titulo: 'Serra Doppia (2 Cabeças)',
    icon: FaTools,
    cor: 'amber',
    itens: [
      { id: 'doppia_lamina', texto: 'Lâminas afiadas sem dentes quebrados' },
      { id: 'doppia_cabeca1', texto: 'Cabeça 1 - Fixação e alinhamento OK' },
      { id: 'doppia_cabeca2', texto: 'Cabeça 2 - Fixação e alinhamento OK' },
      { id: 'doppia_lubrificacao', texto: 'Sistema de lubrificação funcionando' },
      { id: 'doppia_mesa', texto: 'Mesa de apoio limpa e alinhada' },
    ]
  },
  {
    id: 'serra_emmegi',
    titulo: 'Serra Emmegi Automática',
    icon: FaCog,
    cor: 'orange',
    itens: [
      { id: 'emmegi_lamina', texto: 'Lâmina afiada e tensionada corretamente' },
      { id: 'emmegi_guias', texto: 'Guias de corte alinhadas' },
      { id: 'emmegi_alimentacao', texto: 'Sistema de alimentação automática OK' },
      { id: 'emmegi_toque', texto: 'Sensor de toque/peça calibrado' },
      { id: 'emmegi_refrigeracao', texto: 'Refrigeração/lubrificação ativa' },
    ]
  },
  {
    id: 'cnc',
    titulo: 'CNC Centro de Usinagem',
    icon: FaServer,
    cor: 'indigo',
    itens: [
      { id: 'cnc_ligado', texto: 'Máquina ligada e sem alarmes' },
      { id: 'cnc_pressao', texto: 'Pressão pneumática adequada (6 bar)' },
      { id: 'cnc_oleo', texto: 'Nível de óleo hidráulico OK' },
      { id: 'cnc_refrigeracao', texto: 'Sistema de refrigeração ativo' },
      { id: 'cnc_ferramenta', texto: 'Ferramenta atual carregada e calibrada' },
      { id: 'cnc_mesa', texto: 'Mesa de trabalho limpa e fixada' },
    ]
  },
  {
    id: 'cnc_alunica',
    titulo: 'CNC Alumínio (Alunica)',
    icon: FaMicrochip,
    cor: 'purple',
    itens: [
      { id: 'alunica_ligado', texto: 'Máquina ligada e sem alarmes' },
      { id: 'alunica_aspiracao', texto: 'Sistema de aspiração de cavacos OK' },
      { id: 'alunica_refrigeracao', texto: 'Refrigeração para alumínio ativa' },
      { id: 'alunica_ferramenta', texto: 'Fresa/ferramenta para alumínio OK' },
      { id: 'alunica_velocidade', texto: 'Velocidade de rotação ajustada para Al' },
    ]
  },
  {
    id: 'embalagem',
    titulo: 'Estação Embalagem/Paletes',
    icon: FaBox,
    cor: 'teal',
    itens: [
      { id: 'emb_material', texto: 'Material de embalagem disponível' },
      { id: 'emb_fitilho', texto: 'Fitilho/fita de arquear disponível' },
      { id: 'emb_etiquetas', texto: 'Etiquetas e formulários em local correto' },
      { id: 'emb_balança', texto: 'Balança calibrada e zerada' },
      { id: 'emb_plastico', texto: 'Plástico filme/bolha disponível' },
    ]
  },
  {
    id: 'qualidade',
    titulo: 'Controle de Qualidade',
    icon: FaRuler,
    cor: 'emerald',
    itens: [
      { id: 'qual_paquimetro', texto: 'Paquímetro/relógio comparador calibrado' },
      { id: 'qual_escala', texto: 'Escala de medição disponível' },
      { id: 'qual_primeira', texto: 'Primeira peça do turno conferida' },
      { id: 'qual_desenho', texto: 'Desenho ou especificação disponível' },
    ]
  },
  {
    id: 'geral',
    titulo: 'Verificações Gerais',
    icon: FaListAlt,
    cor: 'cyan',
    itens: [
      { id: 'geral_energia', texto: 'Tensão elétrica estabilizada' },
      { id: 'geral_ar', texto: 'Compressor com pressão adequada' },
      { id: 'geral_iluminacao', texto: 'Iluminação adequada na área' },
      { id: 'geral_turno_ant', texto: 'Passagem de turno recebida' },
    ]
  },
];

const STATUS = {
  OK: 'ok',
  ATENCAO: 'atencao',
  PROBLEMA: 'problema',
  PENDENTE: 'pendente'
};

const CORES_STATUS = {
  [STATUS.OK]: 'bg-emerald-500 hover:bg-emerald-600',
  [STATUS.ATENCAO]: 'bg-amber-500 hover:bg-amber-600',
  [STATUS.PROBLEMA]: 'bg-rose-500 hover:bg-rose-600',
  [STATUS.PENDENTE]: 'bg-gray-200 hover:bg-gray-300'
};

const ICONES_STATUS = {
  [STATUS.OK]: FaCheckCircle,
  [STATUS.ATENCAO]: FaExclamationTriangle,
  [STATUS.PROBLEMA]: FaTimesCircle,
  [STATUS.PENDENTE]: () => null
};

export default function ChecklistInicioTurno({ 
  maquina = 'Corte 01', 
  operador = 'Operador', 
  turno = '1º Turno',
  onConcluir,
  onCancelar,
  onAcionarManutencao
}) {
  const [respostas, setRespostas] = useState({});
  const [observacoes, setObservacoes] = useState({});
  const [problemaAberto, setProblemaAberto] = useState(null);
  const [concluido, setConcluido] = useState(false);
  const [horaAtual, setHoraAtual] = useState(new Date());

  // Atualiza hora a cada minuto
  useEffect(() => {
    const timer = setInterval(() => setHoraAtual(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Calcula progresso
  const totalItens = useMemo(() => 
    CHECKLIST_CATEGORIAS.reduce((acc, cat) => acc + cat.itens.length, 0),
  []);

  const itensRespondidos = useMemo(() => 
    Object.values(respostas).filter(r => r && r !== STATUS.PENDENTE).length,
  [respostas]);

  const progresso = Math.round((itensRespondidos / totalItens) * 100);
  const todosRespondidos = itensRespondidos === totalItens;

  const marcarTodosOK = () => {
    const novasRespostas = {};
    CHECKLIST_CATEGORIAS.forEach(cat => {
      cat.itens.forEach(item => {
        novasRespostas[item.id] = STATUS.OK;
      });
    });
    setRespostas(novasRespostas);
  };

  const desmarcarTodos = () => {
    setRespostas({});
  };

  const marcarItem = (itemId, status) => {
    setRespostas(prev => ({ ...prev, [itemId]: status }));
    
    // Abre campo de observação para Atenção ou Problema
    if (status === STATUS.PROBLEMA || status === STATUS.ATENCAO) {
      setProblemaAberto(itemId);
    } else {
      // Limpa se for OK
      if (problemaAberto === itemId) {
        setProblemaAberto(null);
      }
    }
  };

  const adicionarObservacao = (itemId, texto) => {
    setObservacoes(prev => ({ ...prev, [itemId]: texto }));
  };

  const cancelarChecklist = () => {
    if (window.confirm('Deseja realmente cancelar o checklist? Todas as respostas serão perdidas.')) {
      setRespostas({});
      setObservacoes({});
      if (onCancelar) {
        onCancelar();
      }
    }
  };

  const finalizarChecklist = () => {
    setConcluido(true);
    if (onConcluir) {
      onConcluir({
        maquina,
        operador,
        turno,
        data: new Date().toISOString(),
        respostas,
        observacoes,
        progresso
      });
    }
  };

  const getSaudacao = () => {
    const hora = horaAtual.getHours();
    if (hora < 12) return 'Bom dia';
    if (hora < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const getMensagemProgresso = () => {
    if (progresso === 0) return 'Vamos começar! 🚀';
    if (progresso < 50) return 'Bom começo! Continue assim 💪';
    if (progresso < 100) return 'Quase lá! 🎯';
    return 'Excelente! Checklist completo ✅';
  };

  if (concluido) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center animate-in fade-in zoom-in duration-500">
          <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
            <FaCheckCircle className="w-14 h-14 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Checklist concluído!
          </h2>
          <p className="text-gray-600 mb-6 text-lg">
            Área de Usinagem pronta para produção! 🚀
          </p>
          <div className="bg-emerald-50 rounded-2xl p-4 mb-6">
            <p className="text-emerald-700 font-medium">
              {progresso}% dos itens verificados
            </p>
            <p className="text-sm text-emerald-600 mt-1">
              Todas as máquinas liberadas para operação
            </p>
          </div>
          <button
            onClick={() => setConcluido(false)}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold transition-all"
          >
            Novo Checklist
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Aviso de Checklist Obrigatório */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-1.5 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-center gap-2">
          <FaExclamationTriangle className="w-3.5 h-3.5 animate-pulse" />
          <span className="font-bold text-xs md:text-sm uppercase tracking-wider">
            Checklist obrigatório de início de turno
          </span>
          <FaExclamationTriangle className="w-3.5 h-3.5 animate-pulse" />
        </div>
      </div>

      {/* Header Moderno - MAIS COMPACTO */}
      <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-2">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <FaChartLine className="w-5 h-5 text-blue-600" />
                <h1 className="text-lg font-bold text-gray-800">Checklist Início de Turno</h1>
                <span className="text-gray-400 text-xs hidden sm:block">|</span>
                <p className="text-gray-500 text-xs hidden sm:block">
                  {getSaudacao()}! Vamos garantir um turno seguro e produtivo 🚀
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <div className="bg-blue-50 px-2 py-1 rounded-lg flex items-center gap-2 border border-blue-100">
                <span className="text-[10px] text-blue-500 uppercase font-bold">Máquina:</span>
                <p className="font-bold text-xs text-blue-800">{maquina}</p>
              </div>
              <div className="bg-indigo-50 px-2 py-1 rounded-lg flex items-center gap-2 border border-indigo-100">
                <span className="text-[10px] text-indigo-500 uppercase font-bold">Operador:</span>
                <p className="font-bold text-xs text-indigo-800">{operador}</p>
              </div>
              <div className="bg-emerald-50 px-2 py-1 rounded-lg flex items-center gap-2 border border-emerald-100">
                <span className="text-[10px] text-emerald-500 uppercase font-bold">Turno:</span>
                <p className="font-bold text-xs text-emerald-800">{turno}</p>
              </div>
              <div className="bg-gray-50 px-2 py-1 rounded-lg flex items-center gap-2 border border-gray-200">
                <span className="text-[10px] text-gray-500 uppercase font-bold">Data:</span>
                <p className="font-bold text-xs text-gray-700">
                  {horaAtual.toLocaleDateString('pt-BR')} {horaAtual.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </div>

          {/* Barra de Progresso Compacta */}
          <div className="mt-3 flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium text-gray-500 italic">
                  {getMensagemProgresso()}
                </span>
                <span className="text-xs font-bold text-blue-600">
                  {progresso}% ({itensRespondidos}/{totalItens})
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden border border-gray-100">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500 ease-out shadow-sm"
                  style={{ width: `${progresso}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Botões Marcar/Desmarcar Tudo - Compactos */}
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={marcarTodosOK}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold shadow-md shadow-emerald-100 transition-all flex items-center gap-2 active:scale-95 text-sm"
          >
            <FaCheckCircle className="w-4 h-4" />
            Marcar tudo como OK
            <span className="text-[10px] bg-emerald-600 px-1.5 py-0.5 rounded-full">
              {CHECKLIST_CATEGORIAS.reduce((acc, cat) => acc + cat.itens.length, 0)} itens
            </span>
          </button>
          <button
            onClick={desmarcarTodos}
            className="px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded-lg font-bold shadow-md shadow-gray-100 transition-all flex items-center gap-2 active:scale-95 text-sm"
          >
            <FaTimesCircle className="w-4 h-4" />
            Desmarcar todos
          </button>
        </div>
      </div>

      {/* Cards do Checklist */}
      <main className="max-w-6xl mx-auto px-4 pb-32">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {CHECKLIST_CATEGORIAS.map((categoria) => {
            const Icon = categoria.icon;
            const itensRespondidosCat = categoria.itens.filter(
              item => respostas[item.id] && respostas[item.id] !== STATUS.PENDENTE
            ).length;
            const totalCat = categoria.itens.length;
            const concluidoCat = itensRespondidosCat === totalCat;
            
            return (
              <div 
                key={categoria.id}
                className={`bg-white rounded-2xl shadow-sm border-2 transition-all duration-300 overflow-hidden ${
                  concluidoCat ? 'border-emerald-200 shadow-emerald-100' : 'border-gray-100'
                }`}
              >
                {/* Header do Card Compacto */}
                <div className={`px-4 py-2.5 border-b border-gray-100 flex items-center justify-between ${
                  concluidoCat ? 'bg-emerald-50/50' : 'bg-gray-50/50'
                }`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      concluidoCat ? 'bg-emerald-100 text-emerald-600' : `bg-${categoria.cor}-100 text-${categoria.cor}-600`
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-gray-800 tracking-tight">
                        {categoria.titulo}
                      </h3>
                      <p className="text-[10px] text-gray-500 font-medium uppercase">
                        {itensRespondidosCat}/{totalCat} verificados
                      </p>
                    </div>
                  </div>
                  {concluidoCat && (
                    <div className="bg-emerald-500 text-white rounded-full p-1 shadow-sm animate-in zoom-in duration-300">
                      <FaCheckCircle className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>

                {/* Lista de Itens Compacta */}
                <div className="p-3 space-y-1.5">
                  {categoria.itens.map((item) => {
                    const status = respostas[item.id] || STATUS.PENDENTE;
                    const StatusIcon = ICONES_STATUS[status];
                    const temProblema = status === STATUS.PROBLEMA;
                    const isAberto = problemaAberto === item.id;

                    return (
                      <div key={item.id} className="space-y-1">
                        <div className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-100/50">
                          <span className={`flex-1 font-medium text-[13px] leading-tight min-w-0 ${
                            status !== STATUS.PENDENTE ? 'text-gray-700' : 'text-gray-500'
                          }`}>
                            {item.texto}
                          </span>
                          
                          {/* Botões de Status Compactos */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => marcarItem(item.id, STATUS.OK)}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                                status === STATUS.OK 
                                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-100 scale-105' 
                                  : 'bg-white text-gray-400 hover:bg-emerald-50 border border-gray-100'
                              }`}
                              title="OK"
                            >
                              <FaCheckCircle className="w-4 h-4" />
                            </button>
                            
                            <button
                              onClick={() => marcarItem(item.id, STATUS.ATENCAO)}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                                status === STATUS.ATENCAO 
                                  ? 'bg-amber-500 text-white shadow-md shadow-amber-100 scale-105' 
                                  : 'bg-white text-gray-400 hover:bg-amber-50 border border-gray-100'
                              }`}
                              title="Atenção"
                            >
                              <FaExclamationTriangle className="w-4 h-4" />
                            </button>
                            
                            <button
                              onClick={() => marcarItem(item.id, STATUS.PROBLEMA)}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                                status === STATUS.PROBLEMA 
                                  ? 'bg-rose-500 text-white shadow-md shadow-rose-100 scale-105' 
                                  : 'bg-white text-gray-400 hover:bg-rose-50 border border-gray-100'
                              }`}
                              title="Problema"
                            >
                              <FaTimesCircle className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Campo de Observação para Atenção e Problemas */}
                        {(temProblema || status === STATUS.ATENCAO) && isAberto && (
                          <div className="animate-in slide-in-from-top-2 duration-200">
                            <div className={`border rounded-xl p-4 space-y-3 ${
                              temProblema 
                                ? 'bg-rose-50 border-rose-200' 
                                : 'bg-amber-50 border-amber-200'
                            }`}>
                              <p className={`text-sm font-medium flex items-center gap-2 ${
                                temProblema ? 'text-rose-700' : 'text-amber-700'
                              }`}>
                                <FaExclamationTriangle className="w-4 h-4" />
                                {temProblema ? 'Descreva a NÃO CONFORMIDADE:' : 'Descreva a ATENÇÃO necessária:'}
                              </p>
                              <textarea
                                value={observacoes[item.id] || ''}
                                onChange={(e) => adicionarObservacao(item.id, e.target.value)}
                                placeholder={temProblema 
                                  ? "Descreva detalhadamente o problema encontrado..." 
                                  : "Descreva o que precisa de atenção..."
                                }
                                className={`w-full px-3 py-3 bg-white border rounded-lg text-sm focus:outline-none focus:ring-2 resize-none ${
                                  temProblema 
                                    ? 'border-rose-200 focus:ring-rose-500' 
                                    : 'border-amber-200 focus:ring-amber-500'
                                }`}
                                rows={3}
                              />
                              <div className="flex gap-2">
                                <button 
                                  className="flex-1 py-3 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2"
                                  onClick={() => alert('Funcionalidade de câmera em desenvolvimento')}
                                >
                                  <FaCamera className="w-4 h-4" />
                                  Anexar Foto
                                </button>
                                {temProblema && (
                                  <button 
                                    className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                                    onClick={() => {
                                      if (onAcionarManutencao) {
                                        onAcionarManutencao({
                                          item: item.texto,
                                          observacao: observacoes[item.id],
                                          maquina,
                                          operador
                                        });
                                      }
                                      alert('Manutenção acionada!');
                                    }}
                                  >
                                    <FaWrench className="w-4 h-4" />
                                    Acionar Manut.
                                  </button>
                                )}
                              </div>
                              
                              {/* Mostrar observação salva */}
                              {observacoes[item.id] && (
                                <div className={`p-3 rounded-lg text-sm ${
                                  temProblema ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                  <p className="font-medium mb-1">Registro salvo:</p>
                                  <p>{observacoes[item.id]}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Footer Fixo com Botões - MAIS COMPACTO */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 shadow-lg z-20">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="hidden md:block">
            <p className="text-xs text-gray-500 font-medium italic">
              {todosRespondidos 
                ? 'Tudo pronto para finalizar! ✅' 
                : `Faltam ${totalItens - itensRespondidos} itens para concluir...`
              }
            </p>
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            {/* Botão Cancelar Compacto */}
            <button
              onClick={cancelarChecklist}
              className="px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg font-bold transition-all flex items-center justify-center gap-2 border border-gray-200 text-sm"
            >
              <FaTimesCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Cancelar</span>
            </button>
            
            {/* Botão Finalizar Compacto */}
            <button
              onClick={finalizarChecklist}
              disabled={!todosRespondidos}
              className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg font-bold text-base transition-all flex items-center justify-center gap-2 ${
                todosRespondidos
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md shadow-emerald-100 active:scale-95'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <FaCheckCircle className="w-5 h-5" />
              Finalizar Checklist
              {todosRespondidos && <FaChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
