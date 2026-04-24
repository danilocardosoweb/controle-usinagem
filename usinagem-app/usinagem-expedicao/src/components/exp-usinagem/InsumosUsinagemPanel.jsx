import React, { useState, useEffect } from 'react'
import { FaPlus, FaEdit, FaTrash, FaSpinner, FaExclamationTriangle } from 'react-icons/fa'
import supabaseService from '../../services/SupabaseService'

const InsumosUsinagemPanel = ({ user }) => {
    const [insumos, setInsumos] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [modalOpen, setModalOpen] = useState(false)
    const [editingItem, setEditingItem] = useState(null)
    const [formData, setFormData] = useState({ nome: '', categoria: '', qtd_atual: 0, qtd_minima: 0, unidade: 'un' })
    const [saving, setSaving] = useState(false)

    const loadInsumos = async () => {
        setLoading(true)
        setError(null)
        try {
            const data = await supabaseService.getAll('exp_insumos')
            setInsumos(Array.isArray(data) ? data : [])
        } catch (err) {
            console.error('Erro ao carregar insumos:', err)
            // Se a tabela não existir, não mostrar erro fatal, apenas lista vazia e log
            if (err.message?.includes('relation "exp_insumos" does not exist')) {
                setError('Tabela de insumos não encontrada. Contate o administrador.')
            } else {
                setError('Erro ao carregar insumos.')
            }
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadInsumos()
    }, [])

    const handleOpenModal = (item = null) => {
        setEditingItem(item)
        setFormData(item ? { ...item } : { nome: '', categoria: '', qtd_atual: 0, qtd_minima: 0, unidade: 'un' })
        setModalOpen(true)
    }

    const handleCloseModal = () => {
        setModalOpen(false)
        setEditingItem(null)
    }

    const handleSave = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            if (editingItem) {
                await supabaseService.update('exp_insumos', editingItem.id, formData)
            } else {
                await supabaseService.add('exp_insumos', { ...formData, criado_por: user?.email })
            }
            await loadInsumos()
            handleCloseModal()
        } catch (err) {
            console.error('Erro ao salvar insumo:', err)
            alert('Erro ao salvar item. Verifique se a tabela existe.')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id) => {
        if (!window.confirm('Tem certeza que deseja excluir este item?')) return
        try {
            await supabaseService.remove('exp_insumos', id)
            await loadInsumos()
        } catch (err) {
            console.error('Erro ao excluir:', err)
            alert('Erro ao excluir item.')
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-semibold text-gray-800">Insumos e Ferramentas</h2>
                    <p className="text-sm text-gray-500">Gestão de estoque de materiais de consumo.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium shadow-sm transition"
                >
                    <FaPlus className="h-4 w-4" /> Novo Insumo
                </button>
            </div>

            {error && (
                <div className="rounded-md bg-yellow-50 p-4 border border-yellow-200 text-yellow-800 flex items-center gap-2">
                    <FaExclamationTriangle />
                    <span>{error}</span>
                </div>
            )}

            {loading ? (
                <div className="flex h-40 items-center justify-center text-gray-500">
                    <FaSpinner className="mr-2 h-5 w-5 animate-spin" />
                    Carregando estoque...
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qtd Atual</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Mínimo</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {insumos.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                        Nenhum insumo cadastrado.
                                    </td>
                                </tr>
                            ) : (
                                insumos.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.nome}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.categoria}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 font-semibold">
                                            {item.qtd_atual} <span className="text-xs font-normal text-gray-500">{item.unidade}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">{item.qtd_minima}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            {item.qtd_atual <= item.qtd_minima ? (
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                                    Baixo
                                                </span>
                                            ) : (
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                    Normal
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button onClick={() => handleOpenModal(item)} className="text-indigo-600 hover:text-indigo-900 mr-3">
                                                <FaEdit />
                                            </button>
                                            <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-900">
                                                <FaTrash />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                    <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
                        <div className="border-b px-6 py-4">
                            <h3 className="text-lg font-semibold text-gray-800">{editingItem ? 'Editar Insumo' : 'Novo Insumo'}</h3>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Nome</label>
                                <input
                                    type="text"
                                    required
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                                    value={formData.nome}
                                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Categoria</label>
                                    <input
                                        type="text"
                                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                                        value={formData.categoria}
                                        onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Unidade</label>
                                    <input
                                        type="text"
                                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                                        value={formData.unidade}
                                        onChange={(e) => setFormData({ ...formData, unidade: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Qtd Atual</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                                        value={formData.qtd_atual}
                                        onChange={(e) => setFormData({ ...formData, qtd_atual: parseFloat(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Qtd Mínima</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                                        value={formData.qtd_minima}
                                        onChange={(e) => setFormData({ ...formData, qtd_minima: parseFloat(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                                >
                                    {saving ? 'Salvando...' : 'Salvar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default InsumosUsinagemPanel
