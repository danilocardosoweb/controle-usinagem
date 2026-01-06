import React from 'react'
import { FaIndustry, FaClipboardCheck, FaBoxOpen, FaTruck, FaSpinner } from 'react-icons/fa'

const DashboardPanel = ({
    resumoTecnoPerfil,
    resumoAlunica,
    alunicaHeaderTotals,
    alunicaBuckets,
    fluxoLoading
}) => {
    if (fluxoLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-gray-500">
                    <FaSpinner className="h-8 w-8 animate-spin text-blue-500" />
                    <span>Carregando dados do dashboard...</span>
                </div>
            </div>
        )
    }

    const formatNumber = (num) => {
        return new Intl.NumberFormat('pt-BR').format(num || 0)
    }

    const cards = [
        {
            title: 'Aguardando Produção',
            count: alunicaBuckets?.['para-usinar']?.length || 0,
            pieces: alunicaHeaderTotals?.['para-usinar'] || 0,
            icon: FaIndustry,
            color: 'blue',
            bgColor: 'bg-blue-50',
            textColor: 'text-blue-700',
            borderColor: 'border-blue-200',
            iconColor: 'text-blue-500'
        },
        {
            title: 'Em Inspeção',
            count: alunicaBuckets?.['para-inspecao']?.length || 0,
            pieces: alunicaHeaderTotals?.['para-inspecao'] || 0,
            icon: FaClipboardCheck,
            color: 'purple',
            bgColor: 'bg-purple-50',
            textColor: 'text-purple-700',
            borderColor: 'border-purple-200',
            iconColor: 'text-purple-500'
        },
        {
            title: 'Fila de Embalagem',
            count: alunicaBuckets?.['para-embarque']?.length || 0,
            pieces: alunicaHeaderTotals?.['para-embarque'] || 0,
            icon: FaBoxOpen,
            color: 'orange',
            bgColor: 'bg-orange-50',
            textColor: 'text-orange-700',
            borderColor: 'border-orange-200',
            iconColor: 'text-orange-500'
        }
    ]

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-semibold text-gray-800">Visão Geral - Alúnica</h2>
                <p className="text-sm text-gray-500">Monitoramento em tempo real do fluxo de produção.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {cards.map((card) => (
                    <div
                        key={card.title}
                        className={`relative overflow-hidden rounded-lg border ${card.borderColor} ${card.bgColor} p-5 shadow-sm transition-all hover:shadow-md`}
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <p className={`text-sm font-medium ${card.textColor}`}>{card.title}</p>
                                <div className="mt-2 flex items-baseline gap-2">
                                    <span className="text-3xl font-bold text-gray-900">{card.count}</span>
                                    <span className="text-sm text-gray-600">pedidos</span>
                                </div>
                                <div className="mt-1 text-xs font-medium text-gray-500">
                                    {formatNumber(card.pieces)} peças
                                </div>
                            </div>
                            <div className={`rounded-full bg-white p-3 shadow-sm ${card.iconColor}`}>
                                <card.icon className="h-6 w-6" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Seção TecnoPerfil (Resumo Simplificado) */}
            <div className="mt-8 rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-200 px-6 py-4">
                    <h3 className="text-base font-semibold text-gray-800">Resumo TecnoPerfil</h3>
                </div>
                <div className="grid grid-cols-2 divide-x divide-gray-200 sm:grid-cols-4">
                    <div className="p-4 text-center">
                        <p className="text-xs font-medium uppercase text-gray-500">Total Pedidos</p>
                        <p className="mt-1 text-xl font-bold text-gray-900">{resumoTecnoPerfil?.totalCount || 0}</p>
                    </div>
                    <div className="p-4 text-center">
                        <p className="text-xs font-medium uppercase text-gray-500">Peso Total</p>
                        <p className="mt-1 text-xl font-bold text-gray-900">{formatNumber(resumoTecnoPerfil?.totalKg)} kg</p>
                    </div>
                    <div className="p-4 text-center">
                        <p className="text-xs font-medium uppercase text-gray-500">Peças Total</p>
                        <p className="mt-1 text-xl font-bold text-gray-900">{formatNumber(resumoTecnoPerfil?.totalPc)}</p>
                    </div>
                    <div className="p-4 text-center">
                        <p className="text-xs font-medium uppercase text-gray-500">Estágios Ativos</p>
                        <p className="mt-1 text-xl font-bold text-gray-900">{Object.keys(resumoTecnoPerfil?.stages || {}).length}</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default DashboardPanel
