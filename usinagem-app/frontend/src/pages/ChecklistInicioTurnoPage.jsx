import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ChecklistInicioTurno from '../components/ChecklistInicioTurno';
import { useAuth } from '../contexts/AuthContext';

/**
 * Página de Checklist de Início de Turno
 * 
 * Esta página demonstra a implementação do checklist moderno
 * para uso em tablets fixados nas máquinas da usinagem.
 */
export default function ChecklistInicioTurnoPage() {
  const [ultimoChecklist, setUltimoChecklist] = useState(null);
  const { user, marcarChecklistFeito } = useAuth();
  const navigate = useNavigate();

  // Detectar turno baseado na hora atual
  const getTurnoAtual = () => {
    const hora = new Date().getHours();
    if (hora >= 6 && hora < 14) return '1º Turno';
    if (hora >= 14 && hora < 22) return '2º Turno';
    return '3º Turno';
  };

  // Usar dados reais do usuário logado
  const dadosOperador = {
    maquina: user?.maquina || 'Máquina não definida',
    operador: user?.nome || user?.username || 'Operador',
    turno: getTurnoAtual()
  };

  const handleConcluir = (dados) => {
    console.log('Checklist concluído:', dados);
    setUltimoChecklist(dados);
    
    // Marcar checklist como feito no AuthContext (libera acesso ao sistema)
    marcarChecklistFeito();
    
    // Redirecionar para dashboard após 2 segundos
    setTimeout(() => {
      navigate('/dashboard', { replace: true });
    }, 2000);
    
    // Aqui você enviaria para o backend
    // api.salvarChecklist(dados);
  };

  const handleAcionarManutencao = (dados) => {
    console.log('Acionando manutenção:', dados);
    
    // Aqui você integraria com o sistema de manutenção
    // api.criarOrdemManutencao(dados);
  };

  const handleCancelar = () => {
    // Redirecionar para dashboard ao cancelar
    navigate('/dashboard', { replace: true });
  };

  return (
    <ChecklistInicioTurno
      maquina={dadosOperador.maquina}
      operador={dadosOperador.operador}
      turno={dadosOperador.turno}
      onConcluir={handleConcluir}
      onCancelar={handleCancelar}
      onAcionarManutencao={handleAcionarManutencao}
    />
  );
}
