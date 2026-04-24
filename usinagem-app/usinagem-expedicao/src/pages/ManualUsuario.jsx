import { useEffect, useMemo, useState } from 'react'
import { FaBook, FaSearch, FaWrench, FaBoxOpen, FaClipboardList, FaTools, FaChartBar, FaWarehouse, FaInfoCircle } from 'react-icons/fa'

const ManualUsuario = () => {
  const [busca, setBusca] = useState('')
  const [secaoAtiva, setSecaoAtiva] = useState('')

  const secoes = useMemo(() => ([
    {
      id: 'visao-geral',
      titulo: 'Visão Geral do Sistema',
      icon: <FaInfoCircle />,
      conteudo: [
        'Este sistema foi criado para registrar e acompanhar produção, embalagem, paradas e estoque.',
        'Os principais módulos ficam no menu lateral: Apontamentos (Usinagem/Embalagem/Paradas), Relatórios, Estoque, PCP e Configurações (admin).'
      ]
    },
    {
      id: 'apontamentos-usinagem',
      titulo: 'Apontamentos de Usinagem (Como registrar)',
      icon: <FaClipboardList />,
      conteudo: [
        'Selecione Operador (automático) e Máquina.',
        'Escolha o Pedido/Seq e confira os campos preenchidos automaticamente.',
        'Informe Início/Fim (ou use o Contador).',
        'Informe Quantidade Produzida e Observações (se necessário).',
        'Clique em Registrar Apontamento e confirme os dados.'
      ]
    },
    {
      id: 'apontamentos-embalagem',
      titulo: 'Apontamentos de Embalagem (Fluxos e Etapas)',
      icon: <FaBoxOpen />,
      conteudo: [
        'O módulo de Embalagem possui dois fluxos: Somente Embalagem ou Rebarbar/Limpeza + Embalagem.',
        'Tipo de Processo define se o pedido terá 1 etapa (Somente Embalagem) ou 2 etapas (Rebarbar/Limpeza + Embalagem).',
        'Quando o processo tem 2 etapas, você escolhe a Etapa a apontar neste momento: Rebarbar/Limpeza ou Embalagem.',
        'Cada etapa é registrada como um apontamento separado, podendo ter operador, máquina e horários diferentes.',
        'Atenção: o Saldo e a Qtd. Apontada consideram apenas a etapa Embalagem (a etapa Rebarbar/Limpeza não impacta o saldo).'
      ]
    },
    {
      id: 'apontamentos-paradas',
      titulo: 'Apontamentos de Paradas (Como registrar)',
      icon: <FaTools />,
      conteudo: [
        'Selecione a Máquina e o Motivo da Parada.',
        'Informe a data/hora (Início/Fim, se aplicável).',
        'Registre observações para contextualizar o motivo.'
      ]
    },
    {
      id: 'relatorios',
      titulo: 'Relatórios (Como consultar)',
      icon: <FaChartBar />,
      conteudo: [
        'Acesse Relatórios no menu e selecione o tipo de relatório desejado.',
        'Ajuste o período (datas) e filtros (se disponíveis).',
        'Confira os indicadores e tabelas geradas para análise.'
      ]
    },
    {
      id: 'estoque',
      titulo: 'Estoque (Como consultar e atualizar)',
      icon: <FaWarehouse />,
      conteudo: [
        'Use os filtros para localizar itens rapidamente (buscar/somente com saldo/somente abaixo do mínimo).',
        'Atualize informações operacionais conforme permissões disponíveis.',
        'Para itens com foto, utilize o upload e confirme o preview antes de salvar.'
      ]
    },
    {
      id: 'correcao',
      titulo: 'Correção de Apontamentos (Admin)',
      icon: <FaWrench />,
      conteudo: [
        'Apenas administradores podem corrigir apontamentos.',
        'Ao corrigir, informe o motivo e revise o resumo das alterações antes de salvar.',
        'Use a aba de histórico para auditar alterações e reversões, quando aplicável.'
      ]
    }
  ]), [])

  const secoesFiltradas = useMemo(() => {
    const t = String(busca || '').trim().toLowerCase()
    if (!t) return secoes
    return secoes.filter(s => {
      if (String(s.titulo || '').toLowerCase().includes(t)) return true
      return (s.conteudo || []).some(l => String(l || '').toLowerCase().includes(t))
    })
  }, [busca, secoes])

  useEffect(() => {
    const applyHash = () => {
      const raw = typeof window !== 'undefined' ? window.location.hash : ''
      const id = raw ? raw.replace('#', '') : ''
      setSecaoAtiva(id)
    }
    applyHash()
    if (typeof window !== 'undefined') {
      window.addEventListener('hashchange', applyHash)
      return () => window.removeEventListener('hashchange', applyHash)
    }
  }, [])

  return (
    <div className="max-w-6xl mx-auto">
      <div className="rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 text-white p-5 md:p-6 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center">
              <FaBook className="text-xl" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold leading-tight">Manual do Usuário</h1>
              <p className="text-sm text-white/90 mt-1">Guia rápido para iniciantes e referência do uso do sistema.</p>
            </div>
          </div>

          <div className="w-full md:w-[380px]">
            <label className="block text-xs font-medium text-white/90 mb-1">Buscar no manual</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70">
                <FaSearch />
              </span>
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/60 px-10 py-2.5 outline-none focus:ring-2 focus:ring-white/40"
                placeholder="Ex.: embalagem, saldo, paradas"
              />
            </div>
            <div className="mt-2 text-xs text-white/80">
              {secoesFiltradas.length} seção(ões) encontrada(s)
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
        <aside className="lg:col-span-4 xl:col-span-3">
          <div className="lg:sticky lg:top-4 space-y-3">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-gray-600">Seções</div>
                <div className="text-xs text-gray-400">Clique para ir</div>
              </div>

              <div className="space-y-1">
                {secoesFiltradas.map((s) => {
                  const ativo = secaoAtiva === s.id
                  return (
                    <a
                      key={s.id}
                      href={`#${s.id}`}
                      onClick={() => setSecaoAtiva(s.id)}
                      className={`group flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors border ${
                        ativo
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : 'text-gray-700 border-transparent hover:bg-gray-50'
                      }`}
                    >
                      <span className={`text-base ${ativo ? 'text-blue-700' : 'text-gray-400 group-hover:text-gray-600'}`}>{s.icon}</span>
                      <span className="font-medium leading-snug">{s.titulo}</span>
                    </a>
                  )
                })}

                {secoesFiltradas.length === 0 && (
                  <div className="rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">
                    Nenhuma seção encontrada.
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="text-sm font-semibold text-gray-800">Dica rápida</div>
              <div className="mt-2 text-sm text-gray-600">
                Se você está começando agora, vá em <span className="font-semibold">Apontamentos de Embalagem</span> e leia a seção de <span className="font-semibold">Fluxos e Etapas</span>.
              </div>
            </div>
          </div>
        </aside>

        <section className="lg:col-span-8 xl:col-span-9">
          <div className="space-y-4">
            {secoesFiltradas.map((s) => (
              <div key={s.id} id={s.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 md:p-5 flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">{s.icon}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-base md:text-lg font-semibold text-gray-900">{s.titulo}</h2>
                      <a
                        href="#top"
                        onClick={(e) => {
                          e.preventDefault()
                          if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
                        }}
                        className="text-xs text-gray-400 hover:text-gray-600"
                      >
                        Voltar ao topo
                      </a>
                    </div>

                    {s.id === 'apontamentos-embalagem' && (
                      <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                        <span className="font-semibold">Importante:</span> Somente a etapa <span className="font-semibold">Embalagem</span> altera o saldo.
                      </div>
                    )}

                    <ul className="mt-3 space-y-2 text-sm text-gray-700">
                      {(s.conteudo || []).map((linha, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="mt-1 h-2 w-2 rounded-full bg-gray-300 flex-shrink-0" />
                          <span className="leading-relaxed">{linha}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {s.id === 'visao-geral' && (
                  <div className="border-t bg-gray-50 px-4 py-3 text-xs text-gray-600">
                    Se tiver dúvida, procure por palavras-chave na busca acima (ex.: <span className="font-semibold">embalagem</span>, <span className="font-semibold">saldo</span>, <span className="font-semibold">paradas</span>).
                  </div>
                )}
              </div>
            ))}

            {secoesFiltradas.length > 0 && (
              <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center flex-shrink-0">
                    <FaInfoCircle className="text-lg" />
                  </div>
                  <div className="text-sm text-gray-700">
                    Se você quiser, eu posso adaptar este manual com exemplos reais da sua fábrica (nomes de setores, exemplos de pedidos e um passo a passo por função).
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

export default ManualUsuario
