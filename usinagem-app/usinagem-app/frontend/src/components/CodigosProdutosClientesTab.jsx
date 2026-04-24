import React, { useState, useEffect } from 'react'
import { FaPlus, FaEdit, FaTrash, FaSearch, FaSave, FaTimes } from 'react-icons/fa'
import CodigosProdutosClientesService from '../services/CodigosProdutosClientesService'

const CodigosProdutosClientesTab = () => {
  const [codigos, setCodigos] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingCodigo, setEditingCodigo] = useState(null)
  const [formData, setFormData] = useState({
    codigo_tecno: '',
    codigo_cliente: '',
    nome_cliente: '',
    descricao_produto: ''
  })
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')

  useEffect(() => {
    carregarCodigos()
  }, [])

  const carregarCodigos = async () => {
    try {
      setLoading(true)
      const data = await CodigosProdutosClientesService.listarTodos()
      setCodigos(data)
    } catch (error) {
      showMessage('Erro ao carregar códigos de produtos', 'error')
    } finally {
      setLoading(false)
    }
  }

  const showMessage = (text, type = 'info') => {
    setMessage(text)
    setMessageType(type)
    setTimeout(() => setMessage(''), 5000)
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.codigo_tecno.trim()) {
      newErrors.codigo_tecno = 'Código Tecno é obrigatório'
    }
    
    if (!formData.codigo_cliente.trim()) {
      newErrors.codigo_cliente = 'Código Cliente é obrigatório'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return

    try {
      setLoading(true)
      
      // Verificar se já existe combinação
      const existingId = await CodigosProdutosClientesService.verificarExistencia(
        formData.codigo_tecno,
        formData.codigo_cliente
      )
      
      if (existingId && existingId !== editingCodigo?.id) {
        showMessage('Esta combinação de código Tecno e Cliente já existe', 'error')
        return
      }

      if (editingCodigo) {
        await CodigosProdutosClientesService.atualizar(editingCodigo.id, formData)
        showMessage('Código atualizado com sucesso', 'success')
      } else {
        await CodigosProdutosClientesService.criar(formData)
        showMessage('Código criado com sucesso', 'success')
      }

      resetForm()
      carregarCodigos()
    } catch (error) {
      showMessage('Erro ao salvar código', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (codigo) => {
    setEditingCodigo(codigo)
    setFormData({
      codigo_tecno: codigo.codigo_tecno,
      codigo_cliente: codigo.codigo_cliente,
      nome_cliente: codigo.nome_cliente || '',
      descricao_produto: codigo.descricao_produto || ''
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este código?')) return

    try {
      setLoading(true)
      await CodigosProdutosClientesService.excluir(id)
      showMessage('Código excluído com sucesso', 'success')
      carregarCodigos()
    } catch (error) {
      showMessage('Erro ao excluir código', 'error')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      codigo_tecno: '',
      codigo_cliente: '',
      nome_cliente: '',
      descricao_produto: ''
    })
    setEditingCodigo(null)
    setShowForm(false)
    setErrors({})
  }

  const filteredCodigos = codigos.filter(codigo => 
    codigo.codigo_tecno.toLowerCase().includes(searchTerm.toLowerCase()) ||
    codigo.codigo_cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (codigo.nome_cliente && codigo.nome_cliente.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">Códigos de Produtos dos Clientes</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          <FaPlus />
          Novo Código
        </button>
      </div>

      {/* Mensagens */}
      {message && (
        <div className={`mb-4 p-3 rounded flex items-center gap-2 ${
          messageType === 'success' ? 'bg-green-50 border border-green-200 text-green-800' :
          messageType === 'error' ? 'bg-red-50 border border-red-200 text-red-800' :
          'bg-blue-50 border border-blue-200 text-blue-800'
        }`}>
          {message}
        </div>
      )}

      {/* Formulário */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              {editingCodigo ? 'Editar Código' : 'Novo Código'}
            </h3>
            <button
              onClick={resetForm}
              className="text-gray-400 hover:text-gray-600"
            >
              <FaTimes />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Código do Produto (Tecno) *
              </label>
              <input
                type="text"
                value={formData.codigo_tecno}
                onChange={(e) => setFormData({...formData, codigo_tecno: e.target.value})}
                className={`w-full px-3 py-2 border rounded ${
                  errors.codigo_tecno ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Ex: SER-001"
              />
              {errors.codigo_tecno && (
                <p className="text-red-500 text-xs mt-1">{errors.codigo_tecno}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Código do Produto (Cliente) *
              </label>
              <input
                type="text"
                value={formData.codigo_cliente}
                onChange={(e) => setFormData({...formData, codigo_cliente: e.target.value})}
                className={`w-full px-3 py-2 border rounded ${
                  errors.codigo_cliente ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Ex: CLI-001"
              />
              {errors.codigo_cliente && (
                <p className="text-red-500 text-xs mt-1">{errors.codigo_cliente}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome do Cliente
              </label>
              <input
                type="text"
                value={formData.nome_cliente}
                onChange={(e) => setFormData({...formData, nome_cliente: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded"
                placeholder="Ex: Cliente ABC Ltda"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição do Produto
              </label>
              <input
                type="text"
                value={formData.descricao_produto}
                onChange={(e) => setFormData({...formData, descricao_produto: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded"
                placeholder="Descrição adicional do produto"
              />
            </div>

            <div className="md:col-span-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                <FaSave />
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Busca */}
      <div className="mb-4">
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por código Tecno, código Cliente ou nome do cliente..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded"
          />
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Código Tecno
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Código Cliente
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Nome do Cliente
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Descrição
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Criado em
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                    Carregando...
                  </td>
                </tr>
              ) : filteredCodigos.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                    {searchTerm ? 'Nenhum código encontrado' : 'Nenhum código cadastrado'}
                  </td>
                </tr>
              ) : (
                filteredCodigos.map((codigo) => (
                  <tr key={codigo.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-sm">
                      {codigo.codigo_tecno}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm">
                      {codigo.codigo_cliente}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {codigo.nome_cliente || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {codigo.descricao_produto || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {new Date(codigo.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(codigo)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Editar"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDelete(codigo.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Excluir"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default CodigosProdutosClientesTab
