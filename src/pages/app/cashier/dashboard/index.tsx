import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Banknote,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  Grid as GridIcon,
  List as ListIcon,
  Plus,
  Printer,
  Trash2,
  User,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import {
  deleteSession,
  getCashierUsers,
  getMonthlyCashAudit,
  getSessions,
  openSession,
} from '@/api/cashier/cashier'
import { getProfile } from '@/api/get-profile'
import { PageHeader } from '@/components/page-header'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { exportarRelatorioGeralPDF } from '@/utils/cashier/exportGeralPDF'
import { exportarLotePDF } from '@/utils/cashier/exportPDF'

import { DivergenceModal } from './components/divergence-modal'

export function CashierDashboard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const dataAtual = new Date()

  const [saldoAbertura, setSaldoAbertura] = useState('0.00')
  const [periodo, setPeriodo] = useState('Almoço')
  const [selectedUser, setSelectedUser] = useState('')
  const [dataAbertura, setDataAbertura] = useState(
    `${dataAtual.getFullYear()}-${String(dataAtual.getMonth() + 1).padStart(2, '0')}-${String(dataAtual.getDate()).padStart(2, '0')}`,
  )
  const [mesVisualizacao, setMesVisualizacao] = useState(new Date().getMonth())
  const [anoVisualizacao, setAnoVisualizacao] = useState(
    new Date().getFullYear(),
  )
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const [divergenceModalSession, setDivergenceModalSession] =
    useState<any>(null)
  const [modalAuditOpen, setModalAuditOpen] = useState(false)

  const token = localStorage.getItem('token')

  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
    retry: false,
    enabled: !!token,
  })

  const isAdmin = profile?.role === 'ADMIN'

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['cashier-sessions'],
    queryFn: getSessions,
    enabled: !!profile,
  })

  const { data: monthlyAudit } = useQuery({
    queryKey: ['monthly-cash-audit', mesVisualizacao, anoVisualizacao],
    queryFn: () => getMonthlyCashAudit(mesVisualizacao, anoVisualizacao),
    enabled: !!profile && isAdmin,
  })

  const { data: usersData } = useQuery({
    queryKey: ['cashier-users'],
    queryFn: getCashierUsers,
    enabled: !!profile && isAdmin,
  })

  const possibleUsers =
    (usersData as any)?.users || (Array.isArray(usersData) ? usersData : [])

  const { mutateAsync: openSessionFn } = useMutation({
    mutationFn: openSession,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cashier-sessions'] })
      queryClient.invalidateQueries({ queryKey: ['monthly-cash-audit'] })
      navigate(`/cashier/session/${data.id}`)
    },
  })

  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null)
  const [deleteCountdown, setDeleteCountdown] = useState<number>(5)

  useEffect(() => {
    let timer: any
    if (sessionToDelete !== null && deleteCountdown > 0) {
      timer = setInterval(() => {
        setDeleteCountdown((prev) => prev - 1)
      }, 1000)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [sessionToDelete, deleteCountdown])

  const handleOpenDeleteSessionModal = (sessionId: string) => {
    setSessionToDelete(sessionId)
    setDeleteCountdown(5)
  }

  const handleCloseDeleteSessionModal = () => {
    setSessionToDelete(null)
    setDeleteCountdown(5)
  }

  const { mutateAsync: deleteSessionFn, isPending: isDeletingSession } =
    useMutation({
      mutationFn: deleteSession,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['cashier-sessions'] })
        queryClient.invalidateQueries({ queryKey: ['monthly-cash-audit'] })
        toast.success('Caixa excluído com sucesso!')
        handleCloseDeleteSessionModal()
      },
      onError: () => {
        toast.error('Erro ao excluir o caixa.')
      },
    })

  const nomesMeses = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
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

  // Formatação com fuso horário estrito de Brasília

  const getWeekdayBRT = (dateString: string) => {
    if (!dateString) return ''
    try {
      const d = new Date(dateString)
      const raw = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        weekday: 'long',
      }).format(d)
      return raw.charAt(0).toUpperCase() + raw.slice(1)
    } catch {
      return ''
    }
  }

  const formatDateBRT = (dateString: string) => {
    if (!dateString) return ''
    try {
      const d = new Date(dateString)
      return new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
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
        hour12: false,
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
        if (profile?.role === 'CASHIER' && s.user_id !== profile.id) {
          return false
        }
        if (!s.opened_at) return false
        const d = new Date(s.opened_at)
        const monthBRT =
          parseInt(
            new Intl.DateTimeFormat('pt-BR', {
              timeZone: 'America/Sao_Paulo',
              month: 'numeric',
            }).format(d),
            10,
          ) - 1
        const yearBRT = parseInt(
          new Intl.DateTimeFormat('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            year: 'numeric',
          }).format(d),
          10,
        )
        return monthBRT === mesVisualizacao && yearBRT === anoVisualizacao
      })
      .sort(
        (a: any, b: any) =>
          new Date(b.opened_at).getTime() - new Date(a.opened_at).getTime(),
      )
  }, [sessions, mesVisualizacao, anoVisualizacao, profile])


  // Agrupamento Semanal Dinâmico
  const sessionsByWeek = useMemo(() => {
    const weeks: {
      weekNumber: number
      title: string
      range: string
      sessions: any[]
      totalCaixas: number
      totalFinal: number
      totalVendas: number
      totalSangrias: number
    }[] = []

    const weekDefs = [
      { num: 1, start: 1, end: 7 },
      { num: 2, start: 8, end: 14 },
      { num: 3, start: 15, end: 21 },
      { num: 4, start: 22, end: 31 },
    ]

    weekDefs.forEach((def) => {
      const items = sessionsFiltradas.filter((s: any) => {
        const d = new Date(s.opened_at)
        const day = parseInt(
          new Intl.DateTimeFormat('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            day: 'numeric',
          }).format(d),
          10,
        )
        return day >= def.start && day <= def.end
      })

      if (items.length > 0) {
        let totalFinal = 0
        let totalVendas = 0
        let totalSangrias = 0

        items.forEach((s: any) => {
          const entries = s.entries || []
          const valorAbertura = Number(s.initial_balance || 0)
          let sSangrias = 0
          let sEntradas = 0
          let sSuprimentos = 0

          entries.forEach((e: any) => {
            const amt = Number(e.amount || 0)
            if (e.is_withdrawal) sSangrias += amt
            else if (e.is_addition) sSuprimentos += amt
            else sEntradas += amt
          })

          totalSangrias += sSangrias
          totalVendas += sEntradas
          totalFinal += valorAbertura + sEntradas + sSuprimentos - sSangrias
        })

        weeks.push({
          weekNumber: def.num,
          title: 'Semana ' + def.num,
          range: String(def.start).padStart(2, '0') + ' a ' + String(def.end).padStart(2, '0') + ' de ' + nomesMeses[mesVisualizacao],
          sessions: items,
          totalCaixas: items.length,
          totalFinal,
          totalVendas,
          totalSangrias,
        })
      }
    })

    return weeks.reverse()
  }, [sessionsFiltradas, mesVisualizacao, nomesMeses])

  const handleExportarGeralPDF = () => {
    try {
      if (sessionsFiltradas.length === 0) {
        toast.error('Nenhum caixa disponível para exportação neste mês.')
        return
      }
      const lotesParaExportar = sessionsFiltradas.map((s: any) => ({
        id: s.id,
        dataReferencia: s.opened_at,
        periodo: getPeriodoBRT(s.opened_at, s.period),
        valorAbertura: Number(s.initial_balance || 0),
        status: s.status,
        lancamentos: (s.entries || []).map((e: any) => ({
          isSaida: e.is_withdrawal || false,
          isSuprimento: e.is_addition || false,
          isCaixinha: e.is_tip || false,
          valor: Number(e.amount || 0),
          formaPagamento: e.payment_method || 'Dinheiro',
          identificacao: e.identification || '',
          valorCaixinha: e.is_tip ? Number(e.amount || 0) : 0,
        })),
      }))
      exportarRelatorioGeralPDF(lotesParaExportar)
      toast.success('Relatório Gerencial PDF gerado com sucesso!')
    } catch (err: any) {
      console.error('Erro ao exportar PDF gerencial:', err)
      toast.error('Erro ao gerar relatório gerencial PDF.')
    }
  }

  const handleExportarSessaoPDF = (s: any) => {
    try {
      const lote = {
        dataReferencia: s.opened_at,
        periodo: getPeriodoBRT(s.opened_at, s.period),
        valorAbertura: Number(s.initial_balance || 0),
        status: s.status,
        lancamentos: (s.entries || []).map((e: any) => ({
          isSaida: e.is_withdrawal || false,
          isSuprimento: e.is_addition || false,
          isCaixinha: e.is_tip || false,
          valor: Number(e.amount || 0),
          formaPagamento: e.payment_method || 'Dinheiro',
          identificacao: e.identification || '',
          valorCaixinha: e.is_tip ? Number(e.amount || 0) : 0,
        })),
      }
      exportarLotePDF(lote)
      toast.success('Relatório do caixa gerado em PDF com sucesso!')
    } catch (err: any) {
      console.error('Erro ao exportar PDF do turno:', err)
      toast.error('Erro ao gerar PDF do turno.')
    }
  }

  const handleCriar = async () => {
    try {
      let opened_at
      if (dataAbertura) {
        const now = new Date()
        const [year, month, day] = dataAbertura.split('-')
        now.setFullYear(parseInt(year), parseInt(month) - 1, parseInt(day))
        opened_at = now.toISOString()
      }

      await openSessionFn({
        initial_balance: parseFloat(saldoAbertura) || 0,
        period: periodo,
        opened_at,
        ...(isAdmin && selectedUser ? { user_id: selectedUser } : {}),
      } as any)
    } catch (error) {
      alert('Erro ao abrir caixa.')
    }
  }

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'AUDITED':
      case 'CHECKED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
            <CheckCircle2 size={11} /> Conferido
          </span>
        )
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
            <Clock size={11} /> Enviado P/ Conferência
          </span>
        )
      case 'CLOSED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-black text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <AlertCircle size={11} /> Fechado
          </span>
        )
      case 'OPEN':
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
            <Clock size={11} /> Aberto
          </span>
        )
    }
  }

  const METHOD_ORDER = [
    'dinheiro',
    'pix',
    'débito',
    'debito',
    'crédito',
    'credito',
    'voucher',
    'funcionário',
    'funcionario',
    'pró-labore',
    'pro-labore',
    'permuta',
    'cortesia',
    'a prazo',
  ]

  const getMethodOrder = (method: string) => {
    const m = (method || '').toLowerCase()
    const idx = METHOD_ORDER.findIndex((o) => m.includes(o))
    return idx === -1 ? 99 : idx
  }

  const getMethodBadgeStyle = (method: string) => {
    const m = (method || '').toLowerCase()
    if (m.includes('dinheiro'))
      return {
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/40',
        icon: '💵',
      }
    if (m.includes('pix'))
      return { bg: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-900/40', icon: '⚡' }
    if (m.includes('débito') || m.includes('debito'))
      return { bg: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/40', icon: '💳' }
    if (m.includes('crédito') || m.includes('credito'))
      return {
        bg: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900/40',
        icon: '💳',
      }
    if (m.includes('voucher'))
      return {
        bg: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/40',
        icon: '🎟️',
      }
    if (m.includes('funcionário') || m.includes('funcionario'))
      return {
        bg: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900/40',
        icon: '👤',
      }
    if (m.includes('pró-labore') || m.includes('pro-labore'))
      return { bg: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/40', icon: '💼' }
    if (m.includes('cortesia'))
      return { bg: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-900/40', icon: '🎁' }
    if (m.includes('permuta'))
      return { bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/40', icon: '🔄' }
    return { bg: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800', icon: '💰' }
  }

  if ((!token || !profile) && !isLoadingProfile) {
    return <Navigate to="/cashier/sign-in" replace />
  }

  const summary = monthlyAudit?.summary || {
    totalAberturaInicial: 0,
    totalVendasDinheiroMes: 0,
    totalSangriasMes: 0,
    saldoFisicoAtualMes: 0,
    totalCaixasMes: 0,
  }

  const auditSessionsList = monthlyAudit?.sessions || []

  return (
    <div className="mx-auto max-w-7xl space-y-4 pb-8 text-slate-900 dark:text-slate-100">
      {/* Topo Padrão Metrics */}
      <PageHeader
        title="Conferência de Caixa"
        description="Gerencie a abertura, fechamento e conferência de lotes de caixa."
      />

      {/* PAINEL DE CONTROLE SUPERIOR (LADO A LADO) */}
      <div
        className={`grid grid-cols-1 gap-6 ${isAdmin ? 'lg:grid-cols-12' : 'w-full'}`}
      >
        {/* Formulário Horizontal Compacto para Abrir Caixa */}
        <div
          className={`flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 ${isAdmin ? 'lg:col-span-5' : 'w-full'}`}
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-blue-50 font-bold text-blue-600">
                <Plus size={13} />
              </div>
              <span>Abrir Novo Caixa</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {isAdmin && (
              <div className="sm:col-span-3">
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold text-slate-700 outline-none transition-all focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                >
                  <option value="">Selecione o Operador (Você mesmo)</option>
                  {possibleUsers.map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="col-span-1">
              <input
                type="date"
                value={dataAbertura}
                onChange={(e) => setDataAbertura(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold text-slate-700 outline-none transition-all focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
              />
            </div>

            <div className="col-span-1">
              <select
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold text-slate-700 outline-none transition-all focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
              >
                <option value="Almoço">Período: Almoço</option>
                <option value="Jantar">Período: Jantar</option>
                <option value="Dia Todo">Período: Dia Todo</option>
              </select>
            </div>

            <div className="col-span-1">
              <input
                type="number"
                step="0.01"
                value={saldoAbertura}
                onChange={(e) => setSaldoAbertura(e.target.value)}
                placeholder="Abertura R$ 0.00"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-mono text-xs font-bold text-emerald-600 outline-none transition-all focus:ring-2 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-900"
              />
            </div>

            <div className="mt-1 sm:col-span-3">
              <button
                onClick={handleCriar}
                className="flex h-[40px] w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 text-xs font-black uppercase text-white shadow-md shadow-blue-600/20 transition-all hover:bg-blue-700 active:scale-95"
              >
                <Plus size={14} /> Iniciar Expediente
              </button>
            </div>
          </div>
        </div>

        {/* CARD DE AUDITORIA DO DINHEIRO EM ESPÉCIE DO MÊS (EXCLUSIVO ADMIN) */}
        {isAdmin && (
          <div
            onClick={() => setModalAuditOpen(true)}
            className="group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50/90 via-teal-50/60 to-emerald-100/40 p-4 shadow-sm transition-all hover:border-emerald-400 hover:shadow-md dark:border-emerald-900/40 dark:from-emerald-950/40 dark:to-teal-950/20 lg:col-span-6 lg:col-start-7"
          >
            <Banknote
              size={70}
              className="absolute -right-3 -top-3 rotate-12 text-emerald-600 opacity-10 transition-transform group-hover:scale-110"
            />

            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[9px] font-black uppercase text-white shadow-sm">
                    <Banknote size={10} /> Saldo Espécie
                  </span>
                  <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                    ({summary.totalCaixasMes} caixas)
                  </span>
                </div>
                <p className="text-2xl font-black tracking-tight text-emerald-950 dark:text-emerald-100">
                  R$ {summary.saldoFisicoAtualMes.toFixed(2)}
                </p>
                <p className="flex items-center gap-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                  <Eye size={11} /> Clique para auditoria comparativa
                </p>
              </div>

              <div className="flex items-center gap-5 rounded-xl border border-emerald-200/60 bg-emerald-50/50 px-4 py-2 dark:border-emerald-900/40 dark:bg-emerald-950/30">
                <div>
                  <span className="block text-[8px] font-black uppercase text-emerald-700/70 dark:text-emerald-400/70">
                    Abertura
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                    R$ {summary.totalAberturaInicial.toFixed(2)}
                  </span>
                </div>
                <div className="h-6 w-px bg-emerald-200/70 dark:bg-emerald-800/50" />
                <div>
                  <span className="block text-[8px] font-black uppercase text-emerald-700/70 dark:text-emerald-400/70">
                    + Vendas
                  </span>
                  <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    R$ {summary.totalVendasDinheiroMes.toFixed(2)}
                  </span>
                </div>
                <div className="h-6 w-px bg-emerald-200/70 dark:bg-emerald-800/50" />
                <div>
                  <span className="block text-[8px] font-black uppercase text-red-500/80">
                    - Sangrias
                  </span>
                  <span className="font-mono text-xs font-bold text-red-600">
                    R$ {summary.totalSangriasMes.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      
      {/* Seção Principal: Caixas do Mês */}
      <div className="space-y-4">
        {/* Barra de Navegação de Mês + Toggle Grid/List */}
        <div className="flex flex-col items-stretch justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
              <Calendar size={15} className="text-blue-500" /> Caixas de {nomesMeses[mesVisualizacao]}
            </span>
            <button
              onClick={handleExportarGeralPDF}
              className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-600 transition-colors hover:bg-red-500/20 dark:text-red-400"
              title="Exportar relatório gerencial consolidado do mês em PDF"
            >
              <FileText size={14} />
              <span>PDF Relatório Gerencial</span>
            </button>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            {/* Toggle de Visualização (Grade vs Lista) */}
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950">
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-800 dark:text-blue-400' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                title="Visualização em Cards"
              >
                <GridIcon size={14} />
                <span className="hidden sm:inline">Cards</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-800 dark:text-blue-400' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                title="Visualização em Lista"
              >
                <ListIcon size={14} />
                <span className="hidden sm:inline">Lista</span>
              </button>
            </div>

            {/* Seletor de Mês */}
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-950">
              <button
                onClick={() => navegarMes(-1)}
                className="rounded p-0.5 text-slate-400 hover:bg-white hover:text-slate-800 dark:hover:bg-slate-800"
                title="Mês anterior"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="min-w-[110px] text-center text-xs font-black uppercase text-slate-800 dark:text-slate-200">
                {nomesMeses[mesVisualizacao]}{' '}
                <span className="text-blue-600 dark:text-blue-400">{anoVisualizacao}</span>
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
        </div>

        {/* Listagem de Caixas Agrupados por Semana */}
        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs font-bold text-slate-400 dark:border-slate-800 dark:bg-slate-900/60">
            Carregando caixas...
          </div>
        ) : sessionsByWeek.length > 0 ? (
          <div className="space-y-6">
            {sessionsByWeek.map((week) => (
              <div key={week.weekNumber} className="space-y-3">
                {/* Header da Semana */}
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-slate-100/70 px-4 py-2.5 dark:border-slate-800/80 dark:bg-slate-900/60">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-500/20 text-xs font-black text-blue-600 dark:text-blue-400">
                      {week.weekNumber}
                    </span>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      {week.title} <span className="font-semibold text-slate-400">({week.range})</span>
                    </h3>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-bold text-slate-500 dark:text-slate-400">
                    <span>{week.totalCaixas} {week.totalCaixas === 1 ? 'caixa' : 'caixas'}</span>
                    <span>•</span>
                    <span>Vendas: <strong className="text-emerald-600 dark:text-emerald-400">R$ {week.totalVendas.toFixed(2)}</strong></span>
                    {week.totalSangrias > 0 && (
                      <>
                        <span>•</span>
                        <span>Sangrias: <strong className="text-red-500 dark:text-red-400">-R$ {week.totalSangrias.toFixed(2)}</strong></span>
                      </>
                    )}
                  </div>
                </div>

                {/* VISUALIZAÇÃO EM GRID DE CARDS COM EQUAÇÃO E LIQUIDEZ (GAVETA + PIX) */}
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {week.sessions.map((s) => {
                      const entries = s.entries || []
                      let totalSangrias = 0
                      let totalSuprimentos = 0
                      let totalCaixinhas = 0
                      let totalEntradasSemSaida = 0
                      let totalDinheiro = 0
                      let totalPix = 0

                      const totalsByMethod = {}

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
                          totalsByMethod[method] =
                            (totalsByMethod[method] || 0) + amt

                          const mNorm = method.toLowerCase()
                          if (mNorm.includes('dinheiro')) totalDinheiro += amt
                          else if (mNorm.includes('pix')) totalPix += amt
                        } else if (e.type === 'SANGRIA_DESTINO') {
                          const dest = e.bank || 'Caixa Central'
                          totalsByMethod[dest] =
                            (totalsByMethod[dest] || 0) + amt
                        }
                      }

                      const valorAbertura = Number(s.initial_balance || 0)
                      const valorFinalCaixa =
                        valorAbertura +
                        totalEntradasSemSaida +
                        totalSuprimentos -
                        totalSangrias
                      const saldoGaveta =
                        valorAbertura +
                        totalDinheiro +
                        totalSuprimentos -
                        totalSangrias

                      const activeMethods = Object.entries(totalsByMethod)
                        .filter(([_, val]) => val > 0)
                        .sort(
                          ([a], [b]) => getMethodOrder(a) - getMethodOrder(b),
                        )

                      return (
                        <div
                          key={s.id}
                          onClick={() => navigate(`/cashier/session/${s.id}`)}
                          className="group relative flex cursor-pointer flex-col justify-between rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-500 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/95 dark:hover:border-blue-500/60"
                        >
                          <div>
                            {/* Topo do Card: Data com Dia da Semana & Status */}
                            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5 dark:border-slate-800/80">
                              <div>
                                <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">
                                  {getWeekdayBRT(s.opened_at)}, {formatDateBRT(s.opened_at)}
                                </h4>
                                <div className="mt-1 flex items-center gap-1.5">
                                  <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-[11px] font-black uppercase text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                                    {getPeriodoBRT(s.opened_at, s.period)}
                                  </span>
                                  {s.operator_name && (
                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300">
                                      <User size={12} className="text-slate-400" />
                                      {s.operator_name}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {renderStatusBadge(s.status)}
                            </div>

                            {/* Bloco Central: Equação no Topo -> Linha -> Saldo Total -> Liquidez Imediata */}
                            <div className="my-2.5 space-y-2 rounded-xl border border-slate-100 bg-slate-50/90 p-3 dark:border-slate-800/80 dark:bg-slate-950/80">
                              {/* 1. Linha Superior: Abertura + Entradas - Sangrias */}
                              <div className="flex items-center justify-between text-center text-[10px]">
                                <div>
                                  <span className="block font-black uppercase text-slate-400">Abertura</span>
                                  <span className="font-mono text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                                    {valorAbertura.toFixed(2)}
                                  </span>
                                </div>
                                <span className="text-xs font-black text-emerald-500">➕</span>
                                <div>
                                  <span className="block font-black uppercase text-emerald-600 dark:text-emerald-400">Entradas</span>
                                  <span className="font-mono text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400">
                                    +{totalEntradasSemSaida.toFixed(2)}
                                  </span>
                                </div>
                                <span className="text-xs font-black text-red-500">➖</span>
                                <div>
                                  <span className="block font-black uppercase text-red-500 dark:text-red-400">Sangrias</span>
                                  <span className="font-mono text-xs sm:text-sm font-black text-red-500 dark:text-red-400">
                                    -{totalSangrias.toFixed(2)}
                                  </span>
                                </div>
                              </div>

                              {/* 2. Traço / Linha Divisória com o Saldo Total Resultante */}
                              <div className="flex items-center justify-between border-t border-slate-200/80 pt-2 dark:border-slate-800/80">
                                <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                                  Saldo Total
                                </span>
                                <span className="font-mono text-2xl font-black tracking-tight text-blue-600 dark:text-blue-400">
                                  R$ {valorFinalCaixa.toFixed(2)}
                                </span>
                              </div>

                              {/* 3. Indicadores de Liquidez Imediata (Gaveta + PIX) */}
                              <div className="grid grid-cols-2 gap-1.5 border-t border-dashed border-slate-200/60 pt-2 dark:border-slate-800/60">
                                <div className="flex items-center justify-between rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2 py-1">
                                  <span className="flex items-center gap-1 text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-300">
                                    <span>💵</span> Gaveta
                                  </span>
                                  <span className="font-mono text-xs sm:text-sm font-black text-emerald-700 dark:text-emerald-300">
                                    R$ {saldoGaveta.toFixed(2)}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between rounded-lg border border-teal-500/25 bg-teal-500/10 px-2 py-1">
                                  <span className="flex items-center gap-1 text-[10px] font-black uppercase text-teal-700 dark:text-teal-300">
                                    <span>⚡</span> PIX
                                  </span>
                                  <span className="font-mono text-xs sm:text-sm font-black text-teal-700 dark:text-teal-300">
                                    R$ {totalPix.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Formas de Pagamento em 2 Colunas */}
                            {activeMethods.length > 0 && (
                              <div className="grid grid-cols-2 gap-1.5">
                                {activeMethods.map(([method, total]) => {
                                  const badgeStyle = getMethodBadgeStyle(method)
                                  return (
                                    <div
                                      key={method}
                                      title={`${method}: R$ ${total.toFixed(2)}`}
                                      className={`flex items-center justify-between gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-black shadow-xs transition-colors ${badgeStyle.bg}`}
                                    >
                                      <span className="text-sm shrink-0">{badgeStyle.icon}</span>
                                      <span className="font-mono text-xs sm:text-sm font-black tracking-tight">
                                        R$ {total.toFixed(2)}
                                      </span>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>

                          {/* Footer de Ações Otimizado */}
                          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 dark:border-slate-800/80">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleExportarSessaoPDF(s)
                                }}
                                title="Exportar PDF deste caixa"
                                className="flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                              >
                                <FileText size={13} className="text-red-500" />
                                <span>PDF</span>
                              </button>

                              {isAdmin && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleOpenDeleteSessionModal(s.id)
                                  }}
                                  title="Excluir este caixa completo"
                                  className="flex cursor-pointer items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/10 px-2 py-1 text-xs font-bold text-red-600 transition-colors hover:bg-red-500/20 dark:text-red-400"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>

                            <span className="flex items-center gap-1 text-xs font-black uppercase text-blue-600 transition-transform group-hover:translate-x-0.5 dark:text-blue-400">
                              Conferir <ArrowRight size={14} />
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  /* VISUALIZAÇÃO EM LISTA DETALHADA */
                  <div className="grid grid-cols-1 gap-2">
                    {week.sessions.map((s) => {
                      const entries = s.entries || []
                      let totalSangrias = 0
                      let totalSuprimentos = 0
                      let totalCaixinhas = 0
                      let totalEntradasSemSaida = 0
                      let totalDinheiro = 0
                      let totalPix = 0

                      const totalsByMethod = {}

                      for (const e of entries) {
                        const amt = Number(e.amount || 0)
                        if (e.is_withdrawal) totalSangrias += amt
                        else if (e.is_addition) totalSuprimentos += amt
                        else if (e.is_tip) {
                          totalCaixinhas += amt
                          totalEntradasSemSaida += amt
                        } else totalEntradasSemSaida += amt

                        if (!e.is_withdrawal) {
                          const method = e.payment_method || 'Dinheiro'
                          totalsByMethod[method] =
                            (totalsByMethod[method] || 0) + amt

                          const mNorm = method.toLowerCase()
                          if (mNorm.includes('dinheiro')) totalDinheiro += amt
                          else if (mNorm.includes('pix')) totalPix += amt
                        } else if (e.type === 'SANGRIA_DESTINO') {
                          const dest = e.bank || 'Caixa Central'
                          totalsByMethod[dest] =
                            (totalsByMethod[dest] || 0) + amt
                        }
                      }

                      const valorAbertura = Number(s.initial_balance || 0)
                      const valorFinalCaixa =
                        valorAbertura +
                        totalEntradasSemSaida +
                        totalSuprimentos -
                        totalSangrias
                      const saldoGaveta =
                        valorAbertura +
                        totalDinheiro +
                        totalSuprimentos -
                        totalSangrias

                      const activeMethods = Object.entries(totalsByMethod)
                        .filter(([_, val]) => val > 0)
                        .sort(
                          ([a], [b]) => getMethodOrder(a) - getMethodOrder(b),
                        )

                      return (
                        <div
                          key={s.id}
                          onClick={() => navigate(`/cashier/session/${s.id}`)}
                          className="group flex cursor-pointer flex-col gap-2.5 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:border-blue-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/90"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                            <div className="flex min-w-[240px] flex-wrap items-center gap-2">
                              <span className="text-sm font-black text-slate-900 dark:text-slate-100">
                                {getWeekdayBRT(s.opened_at)}, {formatDateBRT(s.opened_at)}
                              </span>
                              <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-[9px] font-black uppercase text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                                {getPeriodoBRT(s.opened_at, s.period)}
                              </span>
                              {s.operator_name && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                  <User size={11} />
                                  {s.operator_name}
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                              <div className="flex items-center gap-1 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5">
                                <span className="text-[9px] font-black uppercase text-emerald-700 dark:text-emerald-300">
                                  💵 Gaveta:
                                </span>
                                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                                  R$ {saldoGaveta.toFixed(2)}
                                </span>
                              </div>

                              {totalPix > 0 && (
                                <div className="flex items-center gap-1 rounded-lg border border-teal-500/25 bg-teal-500/10 px-2 py-0.5">
                                  <span className="text-[9px] font-black uppercase text-teal-700 dark:text-teal-300">
                                    ⚡ PIX:
                                  </span>
                                  <span className="font-mono font-bold text-teal-700 dark:text-teal-300">
                                    R$ {totalPix.toFixed(2)}
                                  </span>
                                </div>
                              )}

                              <div className="flex items-center gap-1">
                                <span className="text-[9px] font-black uppercase text-blue-600 dark:text-blue-400">
                                  Total:
                                </span>
                                <span className="font-mono text-sm font-black text-blue-600 dark:text-blue-400">
                                  R$ {valorFinalCaixa.toFixed(2)}
                                </span>
                              </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleExportarSessaoPDF(s)
                                }}
                                title="Exportar PDF deste caixa"
                                className="flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                              >
                                <FileText size={13} className="text-red-500" />
                                <span>PDF</span>
                              </button>

                              {isAdmin && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleOpenDeleteSessionModal(s.id)
                                  }}
                                  title="Excluir este caixa completo"
                                  className="flex cursor-pointer items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/10 px-2 py-1 text-[10px] font-bold text-red-600 hover:bg-red-500/20 dark:text-red-400"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}

                              {renderStatusBadge(s.status)}
                            </div>
                          </div>

                          {activeMethods.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 border-t border-dashed border-slate-100 pt-1 dark:border-slate-800">
                              {activeMethods.map(([method, total]) => {
                                const badgeStyle = getMethodBadgeStyle(method)
                                return (
                                  <div
                                    key={method}
                                    className={`flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-extrabold ${badgeStyle.bg}`}
                                  >
                                    <span>{badgeStyle.icon}</span>
                                    <span>{method}:</span>
                                    <span className="font-mono font-black">
                                      R$ {total.toFixed(2)}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900/60">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">
              Nenhum caixa registrado em {nomesMeses[mesVisualizacao]} de{' '}
              {anoVisualizacao}
            </p>
          </div>
        )}
      </div>

      {/* MODAL DE AUDITORIA MENSAL COMPACTA DO DINHEIRO FÍSICO */}
      {modalAuditOpen && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            {/* Cabecalho Modal */}
            <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-6 dark:border-slate-800 sm:flex-row sm:items-center">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-slate-100">
                  <Banknote className="text-emerald-600" /> Auditoria Mensal do
                  Dinheiro Físico em Espécie
                </h2>
                <p className="text-xs font-medium text-slate-500">
                  Validação contínua do saldo físico da gaveta e conferência
                  entre fechamentos e aberturas sucessivas.
                </p>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto">
                {/* Seletor de Mês da Auditoria */}
                <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-900">
                  <button
                    onClick={() => navegarMes(-1)}
                    className="rounded p-1 text-slate-400 transition-colors hover:bg-white hover:text-slate-800 dark:hover:bg-slate-800"
                    title="Mês anterior"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="min-w-[120px] text-center text-xs font-black uppercase text-slate-800 dark:text-slate-100">
                    {nomesMeses[mesVisualizacao]}{' '}
                    <span className="text-blue-600">{anoVisualizacao}</span>
                  </span>
                  <button
                    onClick={() => navegarMes(1)}
                    className="rounded p-1 text-slate-400 transition-colors hover:bg-white hover:text-slate-800 dark:hover:bg-slate-800"
                    title="Próximo mês"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                <button
                  onClick={() => setModalAuditOpen(false)}
                  className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-900"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Corpo com Tabela Ultramoderna de Caixas */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 font-black uppercase tracking-wider text-slate-500 dark:bg-slate-900">
                    <tr>
                      <th className="p-3">Data / Turno</th>
                      <th className="p-3">Operador</th>
                      <th className="p-3 text-right">Abertura</th>
                      <th className="p-3 text-right text-emerald-600">
                        + Vendas Dinheiro
                      </th>
                      <th className="p-3 text-right text-red-500">
                        - Sangrias Depósito
                      </th>
                      <th className="p-3 text-right text-blue-600">
                        Saldo Físico Final
                      </th>
                      <th className="p-3 text-right">Próxima Abertura</th>
                      <th className="p-3 text-center">Conferência</th>
                      <th className="p-3 text-center">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium dark:divide-slate-800">
                    {auditSessionsList.length > 0 ? (
                      auditSessionsList.map((item: any) => {
                        const isDivergent =
                          item.statusComparacao === 'DIVERGENTE'
                        return (
                          <tr
                            key={item.id}
                            className="hover:bg-slate-50 dark:hover:bg-slate-900/50"
                          >
                            <td className="p-3 font-bold text-slate-900 dark:text-slate-100">
                              {formatDateBRT(item.opened_at)} ({item.period})
                            </td>
                            <td className="p-3 font-semibold text-slate-600 dark:text-slate-300">
                              {item.operator_name}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                              R$ {item.abertura.toFixed(2)}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-emerald-600">
                              R$ {item.vendasDinheiro.toFixed(2)}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-red-500">
                              R$ -{item.sangrias.toFixed(2)}
                            </td>
                            <td className="p-3 text-right font-mono font-black text-blue-600">
                              R$ {item.saldoFisicoFinal.toFixed(2)}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                              {item.hasNextSession ||
                              item.proximaAbertura !== null
                                ? `R$ ${Number(item.proximaAbertura || 0).toFixed(2)}`
                                : '-'}
                            </td>
                            <td className="p-3 text-center">
                              {item.hasNextSession ||
                              item.proximaAbertura !== null ? (
                                item.statusComparacao === 'RESOLVIDO' ? (
                                  <button
                                    onClick={() =>
                                      setDivergenceModalSession(item)
                                    }
                                    className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-black text-indigo-700 transition-colors hover:bg-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400"
                                    title={
                                      item.resolutionDetails?.reason
                                        ? `Motivo: ${item.resolutionDetails.reason}`
                                        : 'Divergência tratada'
                                    }
                                  >
                                    <CheckCircle2 size={11} /> Resolvido (
                                    {item.resolutionDetails?.type ===
                                    'SANGRIA_DESTINO'
                                      ? item.resolutionDetails.bank || 'Destino'
                                      : 'Justificado'}
                                    )
                                  </button>
                                ) : isDivergent ? (
                                  <button
                                    onClick={() =>
                                      setDivergenceModalSession(item)
                                    }
                                    className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-black text-red-700 transition-colors hover:bg-red-200 dark:bg-red-950/40 dark:text-red-400"
                                  >
                                    <AlertTriangle size={11} /> Dif: R${' '}
                                    {item.divergencia.toFixed(2)}
                                  </button>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                                    <CheckCircle2 size={11} /> Batendo
                                  </span>
                                )
                              ) : (
                                <span className="text-[10px] font-bold text-slate-400">
                                  Último do Mês
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => {
                                  setModalAuditOpen(false)
                                  navigate(`/cashier/session/${item.id}`)
                                }}
                                className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-600 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400"
                              >
                                <span>Ver</span> <ArrowRight size={12} />
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan={9}
                          className="p-8 text-center font-bold text-slate-400"
                        >
                          Nenhum registro de caixa encontrado no mês.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Rodape Modal */}
            <div className="flex items-center justify-between rounded-b-3xl border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs font-bold text-slate-500">
                Auditoria em tempo real das aberturas e fechamentos de espécie.
              </span>
              <button
                onClick={() => setModalAuditOpen(false)}
                className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold uppercase text-white shadow hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
              >
                Fechar Auditoria
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE RESOLUÇÃO DE DIVERGÊNCIA */}
      {divergenceModalSession && (
        <DivergenceModal
          isOpen={!!divergenceModalSession}
          onClose={() => setDivergenceModalSession(null)}
          session={divergenceModalSession}
        />
      )}

      {/* MODAL DE CONFIRMAÇÃO DE DELETAR CAIXA COMPLETO (COM TIMER DE 5s) */}
      <AlertDialog
        open={!!sessionToDelete}
        onOpenChange={(open) => {
          if (!open) handleCloseDeleteSessionModal()
        }}
      >
        <AlertDialogContent className="max-w-md rounded-3xl p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-slate-100">
              <AlertTriangle className="h-6 w-6 text-red-500" />
              Deletar Caixa Completo?
            </AlertDialogTitle>
            <AlertDialogDescription className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Atenção: Esta ação excluirá permanentemente este caixa e{' '}
              <strong>
                todos os seus lançamentos, sangrias, suprimentos e caixinhas
                vinculadas
              </strong>
              . Esta ação é irreversível.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex flex-col-reverse justify-end gap-2 sm:flex-row sm:gap-3">
            <AlertDialogCancel
              onClick={handleCloseDeleteSessionModal}
              disabled={isDeletingSession}
              className="rounded-xl border-slate-200 text-xs font-bold dark:border-slate-800"
            >
              Cancelar
            </AlertDialogCancel>
            <Button
              variant="destructive"
              className="rounded-xl font-bold"
              disabled={deleteCountdown > 0 || isDeletingSession}
              onClick={() =>
                sessionToDelete && deleteSessionFn(sessionToDelete)
              }
            >
              {isDeletingSession
                ? 'Excluindo...'
                : deleteCountdown > 0
                  ? `Aguarde (${deleteCountdown}s)`
                  : 'Sim, Deletar Caixa'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
