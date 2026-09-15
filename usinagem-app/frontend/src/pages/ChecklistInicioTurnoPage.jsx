import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ChecklistInicioTurno from '../components/ChecklistInicioTurno';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';

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
    const agora = new Date();
    const minutos = agora.getHours() * 60 + agora.getMinutes();
    if (minutos >= 390 && minutos < 970) return '1º Turno'; // 06:30 às 16:10
    if (minutos >= 970 || minutos < 80) return '2º Turno'; // 16:10 às 01:20
    return 'Fora de turno';
  };

  const getDataLocal = (data) => {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  };

  // Usar dados reais do usuário logado
  const dadosOperador = {
    maquina: user?.maquina || 'Máquina não definida',
    operador: user?.nome || user?.username || 'Operador',
    turno: getTurnoAtual()
  };

  const handleConcluir = async (dados) => {
    console.log('Checklist concluído:', dados);
    setUltimoChecklist(dados);
    
    try {
      // Preparar dados para salvar no Supabase
      const dataAtual = new Date();
      const checklistData = {
        data_checklist: getDataLocal(dataAtual),
        hora_checklist: dataAtual.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        maquina: dados.maquina || 'Máquina não definida',
        operador_nome: dados.operador || user?.nome || 'Operador',
        turno: dados.turno || getTurnoAtual(),
        status: 'concluido',
        total_itens: Object.keys(dados.respostas || {}).length,
        itens_ok: Object.values(dados.respostas || {}).filter(v => v === 'ok').length,
        itens_atencao: Object.values(dados.respostas || {}).filter(v => v === 'atencao').length,
        itens_problema: Object.values(dados.respostas || {}).filter(v => v === 'problema').length,
        observacoes: Object.entries(dados.observacoes || {})
          .map(([item, texto]) => `${item}: ${texto}`)
          .join(' | '),
        nao_conformidades: Object.entries(dados.respostas || {})
          .filter(([, status]) => status === 'problema')
          .map(([item]) => `${item}: ${dados.observacoes?.[item] || 'Sem descrição'}`)
          .join(' | '),
        acoes_corretivas: dados.observacoes?.acoes || ''
      };

      console.log('💾 Salvando checklist no Supabase:', checklistData);

      // Salvar no Supabase
      const { data, error } = await supabase
        .from('checklist_inicio_turno')
        .insert([checklistData]);

      if (error) {
        console.error('❌ Erro ao salvar checklist:', error);
        alert('Erro ao salvar checklist: ' + error.message);
        return false;
      }

      console.log('✅ Checklist salvo com sucesso:', data);
      
      // Marcar checklist como feito no AuthContext (libera acesso ao sistema)
      marcarChecklistFeito();
      
      // Redirecionar para dashboard após 2 segundos
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 2000);
      return true;
      
    } catch (error) {
      console.error('❌ Erro ao processar checklist:', error);
      alert('Erro ao processar checklist: ' + error.message);
      return false;
    }
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
