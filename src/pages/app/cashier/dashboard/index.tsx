import { useState, useMemo, useEffect } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  User,
  Banknote,
  Eye,
  AlertTriangle,
  X,
  ArrowRight,
  FileText,
  Printer,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import { getSessions, openSession, deleteSession, getMonthlyCashAudit, getCashierUsers } from '@/api/cashier/cashier'
import { getProfile } from '@/api/get-profile'
import { exportarRelatorioGeralPDF } from '@/utils/cashier/exportGeralPDF'
import { exportarLotePDF } from '@/utils/cashier/exportPDF'
import { DivergenceModal } from './components/divergence-modal'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export function CashierDashboard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const dataAtual = new Date()

  const [saldoAbertura, setSaldoAbertura] = useState('0.00')
  const [periodo, setPeriodo] = useState('Almoço')
  const [selectedUser, setSelectedUser] = useState('')
  const [dataAbertura, setDataAbertura] = useState(
    `${dataAtual.getFullYear()}-${String(dataAtual.getMonth() + 1).padStart(2, '0')}-${String(dataAtual.getDate()).padStart(2, '0')}`
  )
  const [mesVisualizacao, setMesVisualizacao] = useState(new Date().getMonth())
  const [anoVisualizacao, setAnoVisualizacao] = useState(new Date().getFullYear())

  const [divergenceModalSession, setDivergenceModalSession] = useState<any>(null)
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
  
  const possibleUsers = (usersData as any)?.users || (Array.isArray(usersData) ? usersData : [])

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

  const { mutateAsync: deleteSessionFn, isPending: isDeletingSession } = useMutation({
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

  // Formatação com fuso horário estrito de Brasília
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
        if (profile?.role === 'CASHIER' && s.user_id !== profile.id) {
          return false
        }
        if (!s.opened_at) return false
        const d = new Date(s.opened_at)
        const monthBRT = parseInt(new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', month: 'numeric' }).format(d), 10) - 1
        const yearBRT = parseInt(new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', year: 'numeric' }).format(d), 10)
        return monthBRT === mesVisualizacao && yearBRT === anoVisualizacao
      })
      .sort((a: any, b: any) => new Date(b.opened_at).getTime() - new Date(a.opened_at).getTime())
  }, [sessions, mesVisualizacao, anoVisualizacao, profile])

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
      let opened_at = undefined;
      if (dataAbertura) {
        const now = new Date();
        const [year, month, day] = dataAbertura.split('-');
        now.setFullYear(parseInt(year), parseInt(month) - 1, parseInt(day));
        opened_at = now.toISOString();
      }

      await openSessionFn({
        initial_balance: parseFloat(saldoAbertura) || 0,
        period: periodo,
        opened_at,
        ...(isAdmin && selectedUser ? { user_id: selectedUser } : {})
      } as any)
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
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
            <Clock size={11} /> Enviado P/ Conferência
          </span>
        )
      case 'CLOSED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
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

  const METHOD_ORDER = [
    'dinheiro', 'pix', 'débito', 'debito', 'crédito', 'credito',
    'voucher', 'funcionário', 'funcionario', 'pró-labore', 'pro-labore',
    'permuta', 'cortesia', 'a prazo'
  ]

  const getMethodOrder = (method: string) => {
    const m = (method || '').toLowerCase()
    const idx = METHOD_ORDER.findIndex(o => m.includes(o))
    return idx === -1 ? 99 : idx
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
      <div className={`grid grid-cols-1 gap-6 ${isAdmin ? 'lg:grid-cols-12' : 'w-full'}`}>
        {/* Formulário Horizontal Compacto para Abrir Caixa */}
        <div className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 flex flex-col justify-between ${isAdmin ? 'lg:col-span-5' : 'w-full'}`}>
          <div className="flex items-center gap-2 mb-3 text-xs font-black uppercase tracking-wider text-slate-500">
            <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
              <Plus size={13} />
            </div>
            <span>Abrir Novo Caixa</span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {isAdmin && (
              <div className="sm:col-span-3">
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 transition-all"
                >
                  <option value="">Selecione o Operador (Você mesmo)</option>
                  {possibleUsers.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            )}
            
            <div className="col-span-1">
              <input
                type="date"
                value={dataAbertura}
                onChange={(e) => setDataAbertura(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 transition-all"
              />
            </div>

            <div className="col-span-1">
              <select
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 transition-all"
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
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-mono text-xs font-bold text-emerald-600 outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-900 transition-all"
              />
            </div>

            <div className="sm:col-span-3 mt-1">
              <button
                onClick={handleCriar}
                className="w-full h-[40px] rounded-xl bg-blue-600 text-xs font-black uppercase text-white shadow-md shadow-blue-600/20 transition-all hover:bg-blue-700 active:scale-95 flex items-center justify-center gap-1.5"
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
            className="group relative cursor-pointer overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50/90 via-teal-50/60 to-emerald-100/40 p-4 shadow-sm transition-all hover:border-emerald-400 hover:shadow-md dark:border-emerald-900/40 dark:from-emerald-950/40 dark:to-teal-950/20 lg:col-span-6 lg:col-start-7 flex flex-col justify-between"
          >
            <Banknote
              size={70}
              className="absolute -right-3 -top-3 rotate-12 text-emerald-600 opacity-10 transition-transform group-hover:scale-110"
            />

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center justify-between">
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
                <p className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
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
      <div className="space-y-3">
        {/* Barra de Navegação de Mês */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <Calendar size={14} className="text-blue-500" /> Caixas do Mês
            </span>
            <button
              onClick={handleExportarGeralPDF}
              className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-black text-red-600 transition-colors hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400 cursor-pointer"
              title="Exportar relatório gerencial consolidado do mês em PDF"
            >
              <FileText size={14} />
              <span>PDF Relatório Gerencial</span>
            </button>
          </div>

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

        {/* Listagem Ultramoderna e Compacta */}
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
                } else if (e.type === 'SANGRIA_DESTINO') {
                  const dest = e.bank || 'Caixa Central'
                  totalsByMethod[dest] = (totalsByMethod[dest] || 0) + amt
                }
              }

              const valorAbertura = Number(s.initial_balance || 0)
              const valorFinalCaixa = valorAbertura + totalEntradasSemSaida + totalSuprimentos - totalSangrias
              const activeMethods = Object.entries(totalsByMethod)
                .filter(([_, val]) => val > 0)
                .sort(([a], [b]) => getMethodOrder(a) - getMethodOrder(b))

              return (
                <div
                  key={s.id}
                  onClick={() => navigate(`/cashier/session/${s.id}`)}
                  className="group flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition-all hover:border-blue-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-950 cursor-pointer"
                >
                  {/* Linha Principal Unificada */}
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
                    {/* Identificação do Caixa */}
                    <div className="flex flex-wrap items-center gap-2 min-w-[200px]">
                      <span className="text-sm font-black text-slate-900 dark:text-slate-100">
                        {formatDateBRT(s.opened_at)}
                      </span>
                      <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[9px] font-black uppercase text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                        {getPeriodoBRT(s.opened_at, s.period)}
                      </span>
                      {s.operator_name && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          <User size={11} />
                          {s.operator_name}
                        </span>
                      )}
                    </div>

                    {/* Resumo Financeiro Compacto */}
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

                    {/* Status Badge + Exportar PDF + Deletar Caixa (Admin) */}
                    <div className="shrink-0 flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleExportarSessaoPDF(s)
                        }}
                        title="Exportar PDF deste caixa"
                        className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
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
                          className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-bold text-red-600 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-900/60 cursor-pointer"
                        >
                          <Trash2 size={13} />
                          <span>Excluir</span>
                        </button>
                      )}

                      {renderStatusBadge(s.status)}
                    </div>
                  </div>

                  {/* Linha Secundária: Formas de Pagamento */}
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

      {/* MODAL DE AUDITORIA MENSAL COMPACTA DO DINHEIRO FÍSICO */}
      {modalAuditOpen && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            {/* Cabecalho Modal */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 p-6 dark:border-slate-800">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-slate-100">
                  <Banknote className="text-emerald-600" /> Auditoria Mensal do Dinheiro Físico em Espécie
                </h2>
                <p className="text-xs font-medium text-slate-500">
                  Validação contínua do saldo físico da gaveta e conferência entre fechamentos e aberturas sucessivas.
                </p>
              </div>
              
              <div className="flex items-center gap-3 self-end sm:self-auto">
                {/* Seletor de Mês da Auditoria */}
                <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-900">
                  <button
                    onClick={() => navegarMes(-1)}
                    className="rounded p-1 text-slate-400 hover:bg-white hover:text-slate-800 dark:hover:bg-slate-800 transition-colors"
                    title="Mês anterior"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="min-w-[120px] text-center text-xs font-black uppercase text-slate-800 dark:text-slate-100">
                    {nomesMeses[mesVisualizacao]} <span className="text-blue-600">{anoVisualizacao}</span>
                  </span>
                  <button
                    onClick={() => navegarMes(1)}
                    className="rounded p-1 text-slate-400 hover:bg-white hover:text-slate-800 dark:hover:bg-slate-800 transition-colors"
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
                      <th className="p-3 text-right text-emerald-600">+ Vendas Dinheiro</th>
                      <th className="p-3 text-right text-red-500">- Sangrias Depósito</th>
                      <th className="p-3 text-right text-blue-600">Saldo Físico Final</th>
                      <th className="p-3 text-right">Próxima Abertura</th>
                      <th className="p-3 text-center">Conferência</th>
                      <th className="p-3 text-center">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium dark:divide-slate-800">
                    {auditSessionsList.length > 0 ? (
                      auditSessionsList.map((item: any) => {
                        const isDivergent = item.statusComparacao === 'DIVERGENTE'
                        return (
                          <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
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
                              {item.hasNextSession || item.proximaAbertura !== null 
                                ? `R$ ${Number(item.proximaAbertura || 0).toFixed(2)}` 
                                : '-'}
                            </td>
                            <td className="p-3 text-center">
                              {item.hasNextSession || item.proximaAbertura !== null ? (
                                item.statusComparacao === 'RESOLVIDO' ? (
                                  <button
                                    onClick={() => setDivergenceModalSession(item)}
                                    className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-black text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 hover:bg-indigo-200 transition-colors cursor-pointer"
                                    title={item.resolutionDetails?.reason ? `Motivo: ${item.resolutionDetails.reason}` : 'Divergência tratada'}
                                  >
                                    <CheckCircle2 size={11} /> Resolvido ({item.resolutionDetails?.type === 'SANGRIA_DESTINO' ? item.resolutionDetails.bank || 'Destino' : 'Justificado'})
                                  </button>
                                ) : isDivergent ? (
                                  <button
                                    onClick={() => setDivergenceModalSession(item)}
                                    className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-black text-red-700 dark:bg-red-950/40 dark:text-red-400 hover:bg-red-200 transition-colors cursor-pointer"
                                  >
                                    <AlertTriangle size={11} /> Dif: R$ {item.divergencia.toFixed(2)}
                                  </button>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                                    <CheckCircle2 size={11} /> Batendo
                                  </span>
                                )
                              ) : (
                                <span className="text-[10px] font-bold text-slate-400">Último do Mês</span>
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
                        <td colSpan={9} className="p-8 text-center text-slate-400 font-bold">
                          Nenhum registro de caixa encontrado no mês.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Rodape Modal */}
            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900 rounded-b-3xl">
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
      <DivergenceModal
        isOpen={!!divergenceModalSession}
        onClose={() => setDivergenceModalSession(null)}
        session={divergenceModalSession}
      />

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
              Atenção: Esta ação excluirá permanentemente este caixa e <strong>todos os seus lançamentos, sangrias, suprimentos e caixinhas vinculadas</strong>. Esta ação é irreversível.
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
              onClick={() => sessionToDelete && deleteSessionFn(sessionToDelete)}
            >
              {isDeletingSession ? (
                'Excluindo...'
              ) : deleteCountdown > 0 ? (
                `Aguarde (${deleteCountdown}s)`
              ) : (
                'Sim, Deletar Caixa'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
