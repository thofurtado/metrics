import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar
} from 'lucide-react'

import { getSessions, openSession } from '@/api/cashier/cashier'
import { getProfile } from '@/api/get-profile'
import { PageHeader } from '@/components/page-header'
import { CashierLoginDialog } from '../components/cashier-login-dialog'

export function CashierDashboard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const dataAtual = new Date()

  const [saldoAbertura, setSaldoAbertura] = useState('0.00')
  const [periodo, setPeriodo] = useState('Almoço')
  const [mesVisualizacao, setMesVisualizacao] = useState(dataAtual.getMonth())
  const [anoVisualizacao, setAnoVisualizacao] = useState(dataAtual.getFullYear())

  const { data: profile, isLoading: isLoadingProfile, isError: isErrorProfile } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
    retry: false,
  })

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['cashier-sessions'],
    queryFn: getSessions,
    enabled: !!profile,
  })

  const { mutateAsync: openSessionFn } = useMutation({
    mutationFn: openSession,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cashier-sessions'] })
      navigate(`/cashier/session/${data.id}`)
    },
  })

  const nomesMeses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]

  const navegarMes = (direcao: number) => {
    let novoMes = mesVisualizacao + direcao
    let novoAno = anoVisualizacao
    if (novoMes < 0) {
      novoMes = 11
      novoAno--
    } else if (novoMes > 11) {
      novoMes = 0
      novoAno++
    }
    setMesVisualizacao(novoMes)
    setAnoVisualizacao(novoAno)
  }

  // Formatação com fuso horário estrito de Brasília (America/Sao_Paulo)
  const formatDateBRT = (dateString: string) => {
    if (!dateString) return ''
    try {
      const d = new Date(dateString)
      return new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(d)
    } catch {
      return dateString
    }
  }

  const getPeriodoBRT = (dateString: string, periodFallback?: string) => {
    if (periodFallback) return periodFallback
    try {
      const d = new Date(dateString)
      const hourStr = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        hour12: false
      }).format(d)
      const hour = parseInt(hourStr, 10)
      return hour < 16 ? 'Almoço' : 'Jantar'
    } catch {
      return 'Almoço'
    }
  }

  const sessionsFiltradas = useMemo(() => {
    return sessions
      .filter((s: any) => {
        if (!s.opened_at) return false
        const d = new Date(s.opened_at)
        const monthBRT = parseInt(new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', month: 'numeric' }).format(d), 10) - 1
        const yearBRT = parseInt(new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', year: 'numeric' }).format(d), 10)
        return monthBRT === mesVisualizacao && yearBRT === anoVisualizacao
      })
      .sort((a: any, b: any) => new Date(b.opened_at).getTime() - new Date(a.opened_at).getTime())
  }, [sessions, mesVisualizacao, anoVisualizacao])

  const handleCriar = async () => {
    try {
      await openSessionFn({
        initial_balance: parseFloat(saldoAbertura) || 0,
        period: periodo,
      })
    } catch (error) {
      alert('Erro ao abrir caixa.')
    }
  }

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'AUDITED':
      case 'CONFERIDO':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
            <CheckCircle2 size={11} /> Conferido
          </span>
        )
      case 'CLOSED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
            <AlertCircle size={11} /> Fechado
          </span>
        )
      case 'OPEN':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
            <Clock size={11} /> Aberto
          </span>
        )
    }
  }

  const getMethodBadgeStyle = (method: string) => {
    const m = (method || '').toLowerCase()
    if (m.includes('dinheiro')) return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: '💵' }
    if (m.includes('pix')) return { bg: 'bg-teal-50 text-teal-700 border-teal-200', icon: '⚡' }
    if (m.includes('débito') || m.includes('debito')) return { bg: 'bg-blue-50 text-blue-700 border-blue-200', icon: '💳' }
    if (m.includes('crédito') || m.includes('credito')) return { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: '💳' }
    if (m.includes('voucher')) return { bg: 'bg-purple-50 text-purple-700 border-purple-200', icon: '🎟️' }
    if (m.includes('funcionário') || m.includes('funcionario')) return { bg: 'bg-orange-50 text-orange-700 border-orange-200', icon: '👤' }
    if (m.includes('pró-labore') || m.includes('pro-labore')) return { bg: 'bg-rose-50 text-rose-700 border-rose-200', icon: '💼' }
    if (m.includes('cortesia')) return { bg: 'bg-pink-50 text-pink-700 border-pink-200', icon: '🎁' }
    if (m.includes('permuta')) return { bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: '🔄' }
    return { bg: 'bg-slate-50 text-slate-700 border-slate-200', icon: '💰' }
  }

  if (!profile && !isLoadingProfile) {
    return (
      <div className="relative min-h-[calc(100vh-6rem)]">
        <CashierLoginDialog />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4 pb-8 text-slate-900 dark:text-slate-100">
      {/* Topo Padrão Metrics */}
      <PageHeader
        title="Conferência de Caixa"
        description="Gerencie a abertura, fechamento e conferência de lotes de caixa."
      />

      {/* Formulário Horizontal Compacto para Abrir Caixa */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-3 md:flex-row md:items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
              <Plus size={14} />
            </div>
            <span>Abrir Novo Caixa</span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 flex-1 md:max-w-xl">
            <div>
              <select
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-900"
              >
                <option value="Almoço">Período: Almoço</option>
                <option value="Jantar">Período: Jantar</option>
              </select>
            </div>

            <div>
              <input
                type="number"
                step="0.01"
                value={saldoAbertura}
                onChange={(e) => setSaldoAbertura(e.target.value)}
                placeholder="Abertura R$ 0.00"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 font-mono text-xs font-bold text-emerald-600 outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-900"
              />
            </div>

            <div>
              <button
                onClick={handleCriar}
                className="w-full h-[34px] rounded-lg bg-blue-600 text-xs font-black uppercase text-white shadow-md shadow-blue-600/20 transition-all hover:bg-blue-700 active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Plus size={14} /> Iniciar Expediente
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Seção Principal: Caixas do Mês */}
      <div className="space-y-3">
        {/* Barra de Navegação de Mês */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <span className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
            <Calendar size={14} className="text-blue-500" /> Caixas do Mês
          </span>

          <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 dark:border-slate-800 dark:bg-slate-900">
            <button
              onClick={() => navegarMes(-1)}
              className="rounded p-0.5 text-slate-400 hover:bg-white hover:text-slate-800 dark:hover:bg-slate-800"
              title="Mês anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="min-w-[110px] text-center text-xs font-black uppercase text-slate-800 dark:text-slate-100">
              {nomesMeses[mesVisualizacao]} <span className="text-blue-600">{anoVisualizacao}</span>
            </span>
            <button
              onClick={() => navegarMes(1)}
              className="rounded p-0.5 text-slate-400 hover:bg-white hover:text-slate-800 dark:hover:bg-slate-800"
              title="Próximo mês"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Listagem Ultramoderna e Compacta: Mínimo 10 Caixas por Tela */}
        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs font-bold text-slate-400 dark:border-slate-800 dark:bg-slate-950">
            Carregando caixas...
          </div>
        ) : sessionsFiltradas.length > 0 ? (
          <div className="grid grid-cols-1 gap-2">
            {sessionsFiltradas.map((s: any) => {
              const entries = s.entries || []
              
              let totalSangrias = 0
              let totalSuprimentos = 0
              let totalCaixinhas = 0
              let totalEntradasSemSaida = 0

              const totalsByMethod: Record<string, number> = {}

              for (const e of entries) {
                const amt = Number(e.amount || 0)
                if (e.is_withdrawal) {
                  totalSangrias += amt
                } else if (e.is_addition) {
                  totalSuprimentos += amt
                } else if (e.is_tip) {
                  totalCaixinhas += amt
                  totalEntradasSemSaida += amt
                } else {
                  totalEntradasSemSaida += amt
                }

                if (!e.is_withdrawal) {
                  const method = e.payment_method || 'Dinheiro'
                  totalsByMethod[method] = (totalsByMethod[method] || 0) + amt
                }
              }

              const valorAbertura = Number(s.initial_balance || 0)
              const valorFinalCaixa = valorAbertura + totalEntradasSemSaida + totalSuprimentos - totalSangrias
              const activeMethods = Object.entries(totalsByMethod).filter(([_, val]) => val > 0)

              return (
                <div
                  key={s.id}
                  onClick={() => navigate(`/cashier/session/${s.id}`)}
                  className="group flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition-all hover:border-blue-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-950 cursor-pointer"
                >
                  {/* Linha Principal Unificada: Data, Período, Valores em Razão e Status */}
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
                    {/* Identificação do Caixa */}
                    <div className="flex items-center gap-2 min-w-[170px]">
                      <span className="text-sm font-black text-slate-900 dark:text-slate-100">
                        {formatDateBRT(s.opened_at)}
                      </span>
                      <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[9px] font-black uppercase text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                        {getPeriodoBRT(s.opened_at, s.period)}
                      </span>
                    </div>

                    {/* Resumo Financeiro Compacto em Linha */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] font-black uppercase text-slate-400">Abertura:</span>
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                          R$ {valorAbertura.toFixed(2)}
                        </span>
                      </div>

                      {totalSangrias > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] font-black uppercase text-red-500">Sangrias:</span>
                          <span className="font-mono font-bold text-red-600">
                            R$ -{totalSangrias.toFixed(2)}
                          </span>
                        </div>
                      )}

                      {totalSuprimentos > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] font-black uppercase text-emerald-500">Suprimentos:</span>
                          <span className="font-mono font-bold text-emerald-600">
                            R$ +{totalSuprimentos.toFixed(2)}
                          </span>
                        </div>
                      )}

                      {totalCaixinhas > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] font-black uppercase text-pink-500">Caixinhas:</span>
                          <span className="font-mono font-bold text-pink-600">
                            R$ {totalCaixinhas.toFixed(2)}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-1">
                        <span className="text-[9px] font-black uppercase text-blue-600">Final em Caixa:</span>
                        <span className="font-mono font-black text-blue-700 dark:text-blue-400">
                          R$ {valorFinalCaixa.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0">{renderStatusBadge(s.status)}</div>
                  </div>

                  {/* Linha Secundária: Formas de Pagamento em Mini-Pills Ultracompactas */}
                  {activeMethods.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5 border-t border-dashed border-slate-100 dark:border-slate-850">
                      {activeMethods.map(([method, total]) => {
                        const badgeStyle = getMethodBadgeStyle(method)
                        return (
                          <div
                            key={method}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-extrabold ${badgeStyle.bg}`}
                          >
                            <span className="text-[11px]">{badgeStyle.icon}</span>
                            <span>{method}:</span>
                            <span className="font-mono font-black">R$ {total.toFixed(2)}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-950">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">
              Nenhum caixa registrado em {nomesMeses[mesVisualizacao]} de {anoVisualizacao}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
