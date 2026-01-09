import React, { useState, useEffect } from 'react'
import { FaTimes, FaTrash, FaEdit, FaSpinner } from 'react-icons/fa'
import supabaseService from '../services/SupabaseService'

const CorrecaoLancamentoInsumoModal = ({ isOpen, onClose, onSuccess }) => {
  const [movimentos, setMovimentos] = useState([])
  const [loading, setLoading] = useState(false)
  const [filtro, setFiltro] = useState('')
  const [deletando, setDeletando] = useState(null)
  const [editando, setEditando] = useState(null)
  const [editForm, setEditForm] = useState({ quantidade: '', observacao: '' })
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (isOpen) {
      carregarMovimentos()
    }
  }, [isOpen])

  const carregarMovimentos = async () => {
    setLoading(true)
    try {
      const dados = await supabaseService.getAll('exp_insumos_mov')
      const ordenados = (dados || []).sort((a, b) => {
        const dataA = new Date(a.created_at || a.criado_em || 0)
        const dataB = new Date(b.created_at || b.criado_em || 0)
        return dataB - dataA
      })
      setMovimentos(ordenados)
    } catch (error) {
      console.error('Erro ao carregar movimentos:', error)
      alert('Erro ao carregar histórico de movimentos')
    } finally {
      setLoading(false)
    }
  }

  const movimentosFiltrados = movimentos.filter((m) => {
    const texto = `${m.nome || ''} ${m.categoria || ''} ${m.tipo || ''}`.toLowerCase()
    return texto.includes(filtro.toLowerCase())
  })

  const handleDeleteMovimento = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este lançamento? Esta ação não pode ser desfeita.')) {
      return
    }

    setDeletando(id)
    try {
      await supabaseService.remove('exp_insumos_mov', id)
      setMovimentos(movimentos.filter((m) => m.id !== id))
      alert('Lançamento excluído com sucesso')
      onSuccess?.()
    } catch (error) {
      console.error('Erro ao excluir movimento:', error)
      alert('Erro ao excluir lançamento')
    } finally {
      setDeletando(null)
    }
  }

  const handleEditMovimento = (movimento) => {
    setEditando(movimento.id)
    setEditForm({
      quantidade: movimento.quantidade || '',
      observacao: movimento.observacao || ''
    })
  }

  const handleSaveEdit = async () => {
    if (!editando) return

    setSalvando(true)
    try {
      const movimento = movimentos.find((m) => m.id === editando)
      if (!movimento) return

      const novaQuantidade = parseFloat(editForm.quantidade) || movimento.quantidade
      
      if (!Number.isFinite(novaQuantidade) || novaQuantidade <= 0) {
        alert('Quantidade deve ser um número maior que zero')
        setSalvando(false)
        return
      }

      await supabaseService.update('exp_insumos_mov', {
        id: editando,
        quantidade: novaQuantidade,
        observacao: editForm.observacao || null
      })

      setMovimentos(
        movimentos.map((m) =>
          m.id === editando
            ? {
                ...m,
                quantidade: novaQuantidade,
                observacao: editForm.observacao || null
              }
            : m
        )
      )

      setEditando(null)
      setEditForm({ quantidade: '', observacao: '' })
      alert('Lançamento atualizado com sucesso')
      onSuccess?.()
    } catch (error) {
      console.error('Erro ao atualizar movimento:', error)
      alert('Erro ao atualizar lançamento: ' + (error.message || 'Tente novamente'))
    } finally {
      setSalvando(false)
    }
  }

  const handleCancelEdit = () => {
    setEditando(null)
    setEditForm({ quantidade: '', observacao: '' })
  }

  const formatarData = (data) => {
    if (!data) return '-'
    try {
      return new Date(data).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return '-'
    }
  }

  const getTipoBadge = (tipo) => {
    const cores = {
      entrada: 'bg-green-100 text-green-800',
      saida: 'bg-red-100 text-red-800',
      ajuste: 'bg-blue-100 text-blue-800',
      devolucao: 'bg-yellow-100 text-yellow-800'
    }
    return cores[tipo] || 'bg-gray-100 text-gray-800'
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2" onClick={onClose}>
      <div
        className="relative bg-white rounded-lg shadow-2xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between bg-white border-b p-4 z-10">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Corrigir Lançamentos de Insumos</h3>
            <p className="text-sm text-gray-500">Edite ou exclua lançamentos incorretos</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition"
            title="Fechar"
          >
            <FaTimes className="h-6 w-6" />
          </button>
        </div>

        {/* Filtro */}
        <div className="border-b p-4 bg-gray-50">
          <input
            type="text"
            placeholder="Filtrar por nome, categoria ou tipo..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-gray-500">
              <FaSpinner className="mr-2 h-5 w-5 animate-spin" />
              Carregando histórico...
            </div>
          ) : movimentosFiltrados.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-500">
              {movimentos.length === 0 ? 'Nenhum lançamento encontrado' : 'Nenhum resultado para o filtro'}
            </div>
          ) : (
            <div className="w-full overflow-hidden">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-3 font-semibold text-gray-700 whitespace-nowrap w-32">Data</th>
                    <th className="text-left px-3 py-3 font-semibold text-gray-700 whitespace-nowrap w-20">Tipo</th>
                    <th className="text-left px-3 py-3 font-semibold text-gray-700 whitespace-nowrap flex-1">Insumo</th>
                    <th className="text-left px-3 py-3 font-semibold text-gray-700 whitespace-nowrap flex-1">Categoria</th>
                    <th className="text-right px-3 py-3 font-semibold text-gray-700 whitespace-nowrap w-28">Quantidade</th>
                    <th className="text-left px-3 py-3 font-semibold text-gray-700 whitespace-nowrap flex-1">Observação</th>
                    <th className="text-center px-3 py-3 font-semibold text-gray-700 whitespace-nowrap w-24">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {movimentosFiltrados.map((movimento) => (
                    <React.Fragment key={movimento.id}>
                      <tr className={editando === movimento.id ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                        <td className="px-3 py-3 text-gray-600 whitespace-nowrap text-xs">{formatarData(movimento.created_at || movimento.criado_em)}</td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${getTipoBadge(movimento.tipo)}`}>
                            {movimento.tipo || '-'}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-medium text-gray-900 truncate">{movimento.nome || '-'}</td>
                        <td className="px-3 py-3 text-gray-600 truncate">{movimento.categoria || '-'}</td>
                        <td className="px-3 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">
                          {editando === movimento.id ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editForm.quantidade}
                              onChange={(e) => setEditForm({ ...editForm, quantidade: e.target.value })}
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-right text-sm"
                            />
                          ) : (
                            `${Number(movimento.quantidade || 0).toLocaleString('pt-BR')} ${movimento.unidade || ''}`
                          )}
                        </td>
                        <td className="px-3 py-3 text-gray-600 truncate">
                          {editando === movimento.id ? (
                            <input
                              type="text"
                              value={editForm.observacao}
                              onChange={(e) => setEditForm({ ...editForm, observacao: e.target.value })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              placeholder="Observação..."
                            />
                          ) : (
                            movimento.observacao || '-'
                          )}
                        </td>
                        <td className="px-3 py-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            {editando === movimento.id ? (
                              <>
                                <button
                                  onClick={handleSaveEdit}
                                  disabled={salvando}
                                  className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50 transition"
                                >
                                  Salvar
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="px-2 py-1 bg-gray-400 text-white rounded text-xs hover:bg-gray-500 transition"
                                >
                                  X
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleEditMovimento(movimento)}
                                  className="text-blue-600 hover:text-blue-800 transition p-1"
                                  title="Editar"
                                >
                                  <FaEdit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteMovimento(movimento.id)}
                                  disabled={deletando === movimento.id}
                                  className="text-red-600 hover:text-red-800 disabled:opacity-50 transition p-1"
                                  title="Excluir"
                                >
                                  {deletando === movimento.id ? (
                                    <FaSpinner className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <FaTrash className="h-4 w-4" />
                                  )}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-end gap-3 bg-white border-t p-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition text-sm font-medium"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

export default CorrecaoLancamentoInsumoModal
