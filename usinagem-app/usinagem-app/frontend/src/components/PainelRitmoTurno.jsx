import { useMemo, useState, useEffect } from 'react'
import { FaClock, FaChartLine, FaCheckCircle, FaExclamationTriangle, FaArrowUp, FaSkullCrossbones, FaInfoCircle, FaSmile } from 'react-icons/fa'

function totalMinutos(h, m) {
  return h * 60 + m
}

function getTurnoAtualInfo(agora = new Date()) {
  const totalMin = agora.getHours() * 60 + agora.getMinutes()

  // TB: 06:30 - 16:10
  const tbInicio = totalMinutos(6, 30)
  const tbFim = totalMinutos(16, 10)

  // TC: 16:11 - 01:30
  const tcInicio = totalMinutos(16, 11)
  const tcFim = totalMinutos(1, 30)

  if (totalMin >= tbInicio && totalMin <= tbFim) {
    const totalTurnoMin = tbFim - tbInicio
    const decorrMin = totalMin - tbInicio
    const restanteMin = totalTurnoMin - decorrMin
    return {
      id: 'TB',
      nome: 'Turno B',
      totalHoras: totalTurnoMin / 60,
      decorrMinutos: decorrMin,
      restanteMinutos: restanteMin,
      horaInicio: `06:30`,
      horaFim: `16:10`,
      inicioDia: new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 6, 30, 0),
      fimDia: new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 16, 10, 0)
    }
  } else if (totalMin >= tcInicio || totalMin <= tcFim) {
    const totalTurnoMin = (24 * 60 - tcInicio) + tcFim
    let decorrMin = totalMin >= tcInicio ? totalMin - tcInicio : (24 * 60 - tcInicio) + totalMin
    const restanteMin = totalTurnoMin - decorrMin

    const agora2 = new Date(agora)
    let diaInicio = new Date(agora2.getFullYear(), agora2.getMonth(), agora2.getDate(), 16, 11, 0)
    let diaFim = new Date(agora2.getFullYear(), agora2.getMonth(), agora2.getDate() + 1, 1, 30, 0)
    if (totalMin <= tcFim) {
      diaInicio = new Date(agora2.getFullYear(), agora2.getMonth(), agora2.getDate() - 1, 16, 11, 0)
      diaFim = new Date(agora2.getFullYear(), agora2.getMonth(), agora2.getDate(), 1, 30, 0)
    }
    return {
      id: 'TC',
      nome: 'Turno C',
      totalHoras: totalTurnoMin / 60,
      decorrMinutos: decorrMin,
      restanteMinutos: restanteMin,
      horaInicio: `16:11`,
      horaFim: `01:30`,
      inicioDia: diaInicio,
      fimDia: diaFim
    }
  }
  return null
}

export default function PainelRitmoTurno({ apontamentos = [], metaDiaria = 20000, turnos = [], teoricoPcsHora = 0 }) {
  const [agora, setAgora] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setAgora(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const turnoAtual = useMemo(() => getTurnoAtualInfo(agora), [agora])

  const turnosAtivos = useMemo(() => {
    if (Array.isArray(turnos) && turnos.length > 0) return turnos.filter(t => t.ativo !== false)
    return [{ id: 'TB' }, { id: 'TC' }]
  }, [turnos])

  const metaTurno = useMemo(() => Math.round(metaDiaria / (turnosAtivos.length || 2)), [metaDiaria, turnosAtivos])

  const apontamentosTurno = useMemo(() => {
    if (!turnoAtual || !turnoAtual.inicioDia) return []
    return (apontamentos || []).filter(a => {
      if (!a.inicio) return false
      const dt = new Date(a.inicio)
      return dt >= turnoAtual.inicioDia && dt <= turnoAtual.fimDia
    })
  }, [apontamentos, turnoAtual])

  const pecasProduzidasTurno = useMemo(() => {
    return apontamentosTurno.reduce((acc, a) => acc + Number(a.quantidade || 0), 0)
  }, [apontamentosTurno])

  const formatQtd = (valor) => {
    const num = Math.max(0, Math.round(Number(valor) || 0))
    return num.toLocaleString('pt-BR')
  }

  const formatPcsHInteiro = (valor) => {
    if (!Number.isFinite(valor)) return '—'
    return formatQtd(valor)
  }

  const formatCapacidadeTeorica = (valor) => {
    if (!Number.isFinite(valor)) return 'não configurada'
    if (valor >= 100) return `${Math.round(valor).toLocaleString('pt-BR')} pcs/h`
    const arredondado = Math.max(1, Math.round(valor))
    return `${valor.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} pcs/h (≈${arredondado.toLocaleString('pt-BR')} pcs/h)`
  }

  // Cálculos Avançados
  const { 
    ritmoAtualPcsH, 
    ritmoNecessarioPcsH, 
    status, 
    sugestao, 
    percentualMeta, 
    fechamentoEstimado, 
    metaImpossivel,
    bateMetaPorProjecao 
  } = useMemo(() => {
    if (!turnoAtual) return { ritmoAtualPcsH: 0, ritmoNecessarioPcsH: 0, status: 'fora_turno', sugestao: '', percentualMeta: 0, fechamentoEstimado: 0, metaImpossivel: false, bateMetaPorProjecao: false }

    const horasDecorridas = turnoAtual.decorrMinutos / 60
    const horasRestantes = turnoAtual.restanteMinutos / 60
    const pecasFaltam = Math.max(0, metaTurno - pecasProduzidasTurno)

    const ritmoAtual = horasDecorridas > 0.05 ? Math.round(pecasProduzidasTurno / horasDecorridas) : 0
    const ritmoNecessario = horasRestantes > 0.05 ? Math.round(pecasFaltam / horasRestantes) : (pecasFaltam > 0 ? Infinity : 0)
    
    // Projeção de como vai terminar o turno se continuar exatamente nesse ritmo
    const fechamentoEstimado = Math.round(pecasProduzidasTurno + (ritmoAtual * horasRestantes))
    const percentual = metaTurno > 0 ? Math.min(100, Math.round((pecasProduzidasTurno / metaTurno) * 100)) : 0
    
    // Validar capacidade da máquina
    const teoricoValido = Number(teoricoPcsHora) > 0 ? Number(teoricoPcsHora) : Infinity
    const metaImpossivel = ritmoNecessario > teoricoValido
    const vaiBaterMeta = fechamentoEstimado >= metaTurno

    let status = 'no_ritmo'
    let sugestao = ''

    if (pecasProduzidasTurno >= metaTurno) {
      status = 'meta_atingida'
      const excedente = Math.max(0, pecasProduzidasTurno - metaTurno)
      sugestao = excedente > 0
        ? `Meta atingida! +${excedente.toLocaleString('pt-BR')} pcs`
        : 'Meta atingida! Continue nesse ritmo.'
    } else if (vaiBaterMeta) {
      status = 'meta_atingida'
      const excedenteProj = Math.max(0, fechamentoEstimado - metaTurno)
      sugestao = excedenteProj > 0
        ? `Vai bater a meta! Projeção de ${fechamentoEstimado.toLocaleString('pt-BR')} pcs (+${excedenteProj.toLocaleString('pt-BR')} pcs).`
        : `Mantendo ${formatPcsHInteiro(ritmoAtual)} pcs/h você baterá a meta.`
    } else if (ritmoAtual === 0 && horasDecorridas < 0.5) {
      status = 'iniciando'
      sugestao = `Começando o turno! Mantenha ${formatPcsHInteiro(ritmoNecessario)} pcs/h.`
    } else if (metaImpossivel) {
      status = 'impossivel'
      sugestao = `O ritmo necessário (${formatPcsHInteiro(ritmoNecessario)} pcs/h) excede a capacidade teórica configurada (${formatCapacidadeTeorica(teoricoValido)}).`
    } else if (ritmoAtual >= ritmoNecessario) {
      status = 'no_ritmo'
      sugestao = `Excelente! O ritmo de ${formatPcsHInteiro(ritmoAtual)} pcs/h é suficiente para bater a meta.`
    } else {
      const percaDeRitmo = ritmoAtual / ritmoNecessario
      if (percaDeRitmo >= 0.85) {
        status = 'atencao'
        sugestao = `Ritmo um pouco baixo. Aumente para ${formatPcsHInteiro(ritmoNecessario)} pcs/h (+${formatPcsHInteiro(ritmoNecessario - ritmoAtual)})`
      } else {
        status = 'critico'
        sugestao = `Ritmo muito baixo! Você precisará de ${formatPcsHInteiro(ritmoNecessario)} pcs/h para recuperar a meta.`
      }
    }

    return { ritmoAtualPcsH: ritmoAtual, ritmoNecessarioPcsH: ritmoNecessario, status, sugestao, percentualMeta: percentual, fechamentoEstimado, metaImpossivel, bateMetaPorProjecao: vaiBaterMeta && pecasProduzidasTurno < metaTurno }
  }, [turnoAtual, pecasProduzidasTurno, metaTurno, teoricoPcsHora])

  if (!turnoAtual) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-md p-2 flex items-center gap-2 text-xs text-gray-400 w-full mb-2">
        <FaClock className="shrink-0" />
        <span>Fora do horário de turno (TB: 06:30–16:10 | TC: 16:11–01:30)</span>
      </div>
    )
  }

  // Definição de Cores/Zonas
  const corStatus = {
    meta_atingida: { bg: 'bg-green-50', border: 'border-green-300', badge: 'bg-green-600', texto: 'text-green-700', barra: 'bg-green-500', icon: <FaSmile className="text-green-600 shrink-0 mt-0.5" /> },
    no_ritmo: { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-600', texto: 'text-blue-700', barra: 'bg-blue-500', icon: <FaArrowUp className="text-blue-600 shrink-0 mt-0.5" /> },
    iniciando: { bg: 'bg-gray-50', border: 'border-gray-200', badge: 'bg-gray-500', texto: 'text-gray-600', barra: 'bg-gray-400', icon: <FaClock className="text-gray-500 shrink-0 mt-0.5" /> },
    atencao: { bg: 'bg-amber-50', border: 'border-amber-300', badge: 'bg-amber-600', texto: 'text-amber-700', barra: 'bg-amber-500', icon: <FaExclamationTriangle className="text-amber-500 shrink-0 mt-0.5" /> },
    critico: { bg: 'bg-red-50', border: 'border-red-300', badge: 'bg-red-600', texto: 'text-red-700', barra: 'bg-red-500', icon: <FaExclamationTriangle className="text-red-600 shrink-0 mt-0.5" /> },
    impossivel: { bg: 'bg-red-100', border: 'border-red-400', badge: 'bg-red-700', texto: 'text-red-800', barra: 'bg-red-700', icon: <FaSkullCrossbones className="text-red-700 shrink-0 mt-0.5" /> }
  }[status] || {}

  const horasRest = (turnoAtual.restanteMinutos / 60).toFixed(1)

  return (
    <div className={`border ${corStatus.border} ${corStatus.bg} rounded-md w-full mb-2 transition-colors`}>
      <div className="p-3">
        {/* Header e métricas em uma linha */}
        <div className="flex items-center gap-4 mb-2">
          {/* Título e Badge */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
              <FaChartLine className="text-blue-600" /> Monitoramento de Ritmo
            </span>
            <span className={`text-xs font-bold text-white px-2.5 py-0.5 rounded-full ${corStatus.badge} shadow-sm`}>
              {turnoAtual.nome} • {turnoAtual.horaInicio}–{turnoAtual.horaFim}
            </span>
          </div>

          {/* Métricas em linha */}
          <div className="flex items-center gap-3 flex-1">
            <div className="bg-white rounded px-3 py-1.5 border border-gray-200 shadow-sm flex items-center gap-2">
              <span className="text-xs text-gray-400 font-semibold">Produzido:</span>
              <span className="text-lg font-black text-gray-800">{pecasProduzidasTurno.toLocaleString('pt-BR')} / {metaTurno.toLocaleString('pt-BR')}</span>
            </div>

            <div className="bg-white rounded px-3 py-1.5 border border-gray-200 shadow-sm flex items-center gap-2">
              <span className="text-xs text-gray-400 font-semibold">Ritmo Atual:</span>
              <span className={`text-lg font-black ${corStatus.texto}`}>{Math.round(ritmoAtualPcsH).toLocaleString('pt-BR')} pcs/h</span>
            </div>

            <div className={`rounded px-3 py-1.5 border shadow-sm flex items-center gap-2 ${metaImpossivel && !bateMetaPorProjecao ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200'}`}>
              <span className="text-xs text-gray-400 font-semibold">Necessário:</span>
              <span className={`text-lg font-black ${metaImpossivel ? 'text-red-700' : 'text-orange-600'}`}>
                {isFinite(ritmoNecessarioPcsH) ? Math.round(ritmoNecessarioPcsH).toLocaleString('pt-BR') : '—'} pcs/h
              </span>
            </div>

            <div className="bg-white rounded px-3 py-1.5 border border-gray-200 shadow-sm flex items-center gap-2">
              <span className="text-xs text-gray-400 font-semibold">Tempo:</span>
              <span className="text-lg font-black text-gray-700">{horasRest}h</span>
            </div>

            {/* Barra e % */}
            <div className="flex items-center gap-2 flex-1">
              <div className="flex-1 bg-gray-200/80 rounded-full h-2 overflow-hidden shadow-inner border border-black/5">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${corStatus.barra}`}
                  style={{ width: `${percentualMeta}%` }}
                />
              </div>
              <span className={`text-sm font-black ${corStatus.texto} shrink-0`}>{percentualMeta}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Alertas e Projeção Textual na Borda Inferior */}
      <div className={`px-3 py-2 border-t border-black/5 ${status === 'meta_atingida' ? 'bg-green-100/50' : 'bg-white/40'}`}>
        <div className="flex items-center gap-3">
          {/* Sugestão principal / Ação */}
          <div className={`flex items-center gap-2 text-sm font-semibold ${corStatus.texto}`}>
            {corStatus.icon}
            <span>{sugestao}</span>
          </div>

          {/* Projeção de Fechamento */}
          {(status !== 'iniciando') && (status !== 'meta_atingida' || bateMetaPorProjecao) && (
            <div className="flex items-center gap-1 text-sm text-gray-600 font-medium">
              <span>
                Projeção: <strong>~{fechamentoEstimado.toLocaleString('pt-BR')} pcs</strong> 
                {fechamentoEstimado < metaTurno 
                  ? <span className="text-red-500 font-bold"> (Faltarão {(metaTurno - fechamentoEstimado).toLocaleString('pt-BR')})</span> 
                  : <span className="text-green-600 font-bold"> (Baterá a meta)</span>}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
