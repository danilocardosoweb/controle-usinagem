import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaCog, FaIndustry, FaSave, FaTimes, FaCheck } from 'react-icons/fa';
import { supabase } from '../config/supabase';

const TIPOS_MAQUINA = [
  { value: 'serra', label: 'Serra', icon: '🔧' },
  { value: 'cnc', label: 'CNC', icon: '🔩' },
  { value: 'prensagem', label: 'Prensagem', icon: '🔨' },
  { value: 'embalagem', label: 'Embalagem', icon: '📦' },
  { value: 'outros', label: 'Outros', icon: '⚙️' }
];

const STATUS_MAQUINA = [
  { value: 'ativa', label: 'Ativa', color: 'text-green-600 bg-green-50' },
  { value: 'inativa', label: 'Inativa', color: 'text-gray-600 bg-gray-50' },
  { value: 'manutencao', label: 'Manutenção', color: 'text-yellow-600 bg-yellow-50' }
];

const CHECKLIST_CATEGORIAS = [
  { value: 'serra_doppia', label: 'Serra Doppia' },
  { value: 'serra_emmegi', label: 'Serra Emmegi' },
  { value: 'cnc_alunica', label: 'CNC Alunica' },
  { value: 'paletizacao', label: 'Paletização' },
  { value: 'prensagem', label: 'Prensagem' }
];

export default function GerenciamentoMaquinas() {
  const [maquinas, setMaquinas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMaquina, setEditingMaquina] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    codigo: '',
    tipo: 'outros',
    descricao: '',
    localizacao: '',
    capacidade: '',
    status: 'ativa',
    checklist_categoria_id: '',
    checklist_itens: [],
    // Novos campos técnicos
    ano_fabricacao: '',
    numero_serie: '',
    fabricante: '',
    voltagem: '',
    potencia: '',
    peso_kg: '',
    manual_tecnico: '',
    data_ultima_manutencao: '',
    proxima_manutencao: '',
    responsavel_manutencao: '',
    observacoes_tecnicas: ''
  });

  useEffect(() => {
    carregarMaquinas();
  }, []);

  const carregarMaquinas = async () => {
    try {
      const { data, error } = await supabase
        .from('maquinas')
        .select('*')
        .order('nome');

      if (error) throw error;
      setMaquinas(data || []);
    } catch (error) {
      console.error('Erro ao carregar máquinas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const submitData = {
        ...formData,
        updated_at: new Date().toISOString()
      };

      if (editingMaquina) {
        const { error } = await supabase
          .from('maquinas')
          .update(submitData)
          .eq('id', editingMaquina.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('maquinas')
          .insert(submitData);

        if (error) throw error;
      }

      await carregarMaquinas();
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar máquina:', error);
      alert('Erro ao salvar máquina. Verifique os dados e tente novamente.');
    }
  };

  const handleEdit = (maquina) => {
    setEditingMaquina(maquina);
    setFormData({
      nome: maquina.nome || '',
      codigo: maquina.codigo || '',
      tipo: maquina.tipo || 'outros',
      descricao: maquina.descricao || '',
      localizacao: maquina.localizacao || '',
      capacidade: maquina.capacidade || '',
      status: maquina.status || 'ativa',
      checklist_categoria_id: maquina.checklist_categoria_id || '',
      checklist_itens: maquina.checklist_itens || [],
      // Novos campos técnicos
      ano_fabricacao: maquina.ano_fabricacao || '',
      numero_serie: maquina.numero_serie || '',
      fabricante: maquina.fabricante || '',
      voltagem: maquina.voltagem || '',
      potencia: maquina.potencia || '',
      peso_kg: maquina.peso_kg || '',
      manual_tecnico: maquina.manual_tecnico || '',
      data_ultima_manutencao: maquina.data_ultima_manutencao || '',
      proxima_manutencao: maquina.proxima_manutencao || '',
      responsavel_manutencao: maquina.responsavel_manutencao || '',
      observacoes_tecnicas: maquina.observacoes_tecnicas || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (maquina) => {
    if (!window.confirm(`Tem certeza que deseja excluir a máquina "${maquina.nome}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('maquinas')
        .delete()
        .eq('id', maquina.id);

      if (error) throw error;
      await carregarMaquinas();
    } catch (error) {
      console.error('Erro ao excluir máquina:', error);
      alert('Erro ao excluir máquina.');
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      codigo: '',
      tipo: 'outros',
      descricao: '',
      localizacao: '',
      capacidade: '',
      status: 'ativa',
      checklist_categoria_id: '',
      checklist_itens: [],
      // Novos campos técnicos
      ano_fabricacao: '',
      numero_serie: '',
      fabricante: '',
      voltagem: '',
      potencia: '',
      peso_kg: '',
      manual_tecnico: '',
      data_ultima_manutencao: '',
      proxima_manutencao: '',
      responsavel_manutencao: '',
      observacoes_tecnicas: ''
    });
    setEditingMaquina(null);
    setShowForm(false);
  };

  const addChecklistItem = () => {
    setFormData(prev => ({
      ...prev,
      checklist_itens: [...prev.checklist_itens, { id: Date.now().toString(), texto: '', obrigatorio: false }]
    }));
  };

  const updateChecklistItem = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      checklist_itens: prev.checklist_itens.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const removeChecklistItem = (index) => {
    setFormData(prev => ({
      ...prev,
      checklist_itens: prev.checklist_itens.filter((_, i) => i !== index)
    }));
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
          <FaIndustry className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Gerenciamento de Máquinas</h1>
            <p className="text-gray-600">Adicione e configure as máquinas e áreas de produção</p>
          </div>
        </div>
        
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
        >
          <FaPlus className="w-4 h-4" />
          Nova Máquina
        </button>
      </div>

      {/* Lista de Máquinas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-24">
        {maquinas.map((maquina) => {
          const tipoInfo = TIPOS_MAQUINA.find(t => t.value === maquina.tipo);
          const statusInfo = STATUS_MAQUINA.find(s => s.value === maquina.status);
          
          return (
            <div key={maquina.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{tipoInfo?.icon || '⚙️'}</span>
                  <div>
                    <h3 className="font-semibold text-gray-800">{maquina.nome}</h3>
                    {maquina.codigo && (
                      <p className="text-xs text-gray-500">Código: {maquina.codigo}</p>
                    )}
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo?.color}`}>
                  {statusInfo?.label}
                </span>
              </div>

              <div className="space-y-1 text-sm text-gray-600 mb-3">
                {maquina.localizacao && (
                  <p><span className="font-medium">Local:</span> {maquina.localizacao}</p>
                )}
                {maquina.capacidade && (
                  <p><span className="font-medium">Capacidade:</span> {maquina.capacidade}</p>
                )}
                {maquina.descricao && (
                  <p className="text-xs italic">{maquina.descricao}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(maquina)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded text-sm font-medium transition-colors"
                >
                  <FaEdit className="w-3 h-3" />
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(maquina)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded text-sm font-medium transition-colors"
                >
                  <FaTrash className="w-3 h-3" />
                  Excluir
                </button>
              </div>
            </div>
          );
        })}

        {maquinas.length === 0 && (
          <div className="col-span-full text-center py-12">
            <FaIndustry className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nenhuma máquina cadastrada ainda.</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
            >
              Cadastrar primeira máquina →
            </button>
          </div>
        )}
      </div>

      {/* Modal de Formulário */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">
                {editingMaquina ? 'Editar Máquina' : 'Nova Máquina'}
              </h2>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome da Máquina *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nome}
                    onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ex: Serra Doppia (2 Cabeças)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Código
                  </label>
                  <input
                    type="text"
                    value={formData.codigo}
                    onChange={(e) => setFormData(prev => ({ ...prev, codigo: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ex: SD-001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo *
                  </label>
                  <select
                    required
                    value={formData.tipo}
                    onChange={(e) => setFormData(prev => ({ ...prev, tipo: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {TIPOS_MAQUINA.map(tipo => (
                      <option key={tipo.value} value={tipo.value}>
                        {tipo.icon} {tipo.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status *
                  </label>
                  <select
                    required
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {STATUS_MAQUINA.map(status => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Localização
                  </label>
                  <input
                    type="text"
                    value={formData.localizacao}
                    onChange={(e) => setFormData(prev => ({ ...prev, localizacao: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ex: Área de Corte"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Capacidade
                  </label>
                  <input
                    type="text"
                    value={formData.capacidade}
                    onChange={(e) => setFormData(prev => ({ ...prev, capacidade: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ex: Até 6m"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Descrição detalhada da máquina..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoria do Checklist
                </label>
                <select
                  value={formData.checklist_categoria_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, checklist_categoria_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Selecione...</option>
                  {CHECKLIST_CATEGORIAS.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Campos Técnicos */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <FaCog className="w-5 h-5" />
                  Informações Técnicas
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fabricante
                    </label>
                    <input
                      type="text"
                      value={formData.fabricante}
                      onChange={(e) => setFormData(prev => ({ ...prev, fabricante: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ex: Siemens"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Número de Série
                    </label>
                    <input
                      type="text"
                      value={formData.numero_serie}
                      onChange={(e) => setFormData(prev => ({ ...prev, numero_serie: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ex: SN123456789"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ano de Fabricação
                    </label>
                    <input
                      type="number"
                      value={formData.ano_fabricacao}
                      onChange={(e) => setFormData(prev => ({ ...prev, ano_fabricacao: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ex: 2020"
                      min="1900"
                      max={new Date().getFullYear()}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Voltagem
                    </label>
                    <input
                      type="text"
                      value={formData.voltagem}
                      onChange={(e) => setFormData(prev => ({ ...prev, voltagem: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ex: 220V / 380V"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Potência
                    </label>
                    <input
                      type="text"
                      value={formData.potencia}
                      onChange={(e) => setFormData(prev => ({ ...prev, potencia: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ex: 15 HP"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Peso (kg)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.peso_kg}
                      onChange={(e) => setFormData(prev => ({ ...prev, peso_kg: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ex: 1500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Última Manutenção
                    </label>
                    <input
                      type="date"
                      value={formData.data_ultima_manutencao}
                      onChange={(e) => setFormData(prev => ({ ...prev, data_ultima_manutencao: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Próxima Manutenção
                    </label>
                    <input
                      type="date"
                      value={formData.proxima_manutencao}
                      onChange={(e) => setFormData(prev => ({ ...prev, proxima_manutencao: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Responsável Manutenção
                    </label>
                    <input
                      type="text"
                      value={formData.responsavel_manutencao}
                      onChange={(e) => setFormData(prev => ({ ...prev, responsavel_manutencao: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ex: João Silva"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Manual Técnico (Link)
                    </label>
                    <input
                      type="url"
                      value={formData.manual_tecnico}
                      onChange={(e) => setFormData(prev => ({ ...prev, manual_tecnico: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="https://exemplo.com/manual.pdf"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observações Técnicas
                  </label>
                  <textarea
                    value={formData.observacoes_tecnicas}
                    onChange={(e) => setFormData(prev => ({ ...prev, observacoes_tecnicas: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Informações técnicas adicionais..."
                  />
                </div>
              </div>

              {/* Checklist Itens Personalizados */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Itens do Checklist Personalizados
                  </label>
                  <button
                    type="button"
                    onClick={addChecklistItem}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    + Adicionar Item
                  </button>
                </div>

                <div className="space-y-2">
                  {formData.checklist_itens.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={item.texto}
                        onChange={(e) => updateChecklistItem(index, 'texto', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Descrição do item do checklist..."
                      />
                      <label className="flex items-center gap-1 text-sm">
                        <input
                          type="checkbox"
                          checked={item.obrigatorio}
                          onChange={(e) => updateChecklistItem(index, 'obrigatorio', e.target.checked)}
                          className="rounded border-gray-300"
                        />
                        Obrigatório
                      </label>
                      <button
                        type="button"
                        onClick={() => removeChecklistItem(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <FaTrash className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <FaSave className="w-4 h-4" />
                  {editingMaquina ? 'Atualizar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
