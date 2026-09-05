import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  Calendar,
  CheckCircle2,
  CreditCard,
  FileText,
  Percent,
  Plus,
  RefreshCw,
  Rocket,
  Search,
  Undo2,
  User,
  Users,
  Wallet,
  Zap,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { getAccounts } from '@/api/get-accounts'
import { getClients } from '@/api/get-clients'
import { getPendingSettlements } from '@/api/get-pending-settlements'
import { getSettlements } from '@/api/get-settlements'
import { getEmployees } from '@/api/hr/employees'
import { revertSettlement } from '@/api/revert-settlement'
import { settleTermDebt } from '@/api/settle-term-debt'
import { MonthPicker } from '@/components/MonthPicker'
import { PageHeader } from '@/components/page-header'
import { Pagination } from '@/components/pagination'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api } from '@/lib/axios'
import { cn } from '@/lib/utils'

import { TermReportModal } from './components/term-report-modal'

export function Settlements() {
  const queryClient = useQueryClient()

  // Selected Month (Default: current month)
  const [selectedMonthDate, setSelectedMonthDate] = useState<Date>(new Date())
  const selectedMonth = selectedMonthDate.getMonth() + 1
  const selectedYear = selectedMonthDate.getFullYear()

  const [activeTab, setActiveTab] = useState<string>('automatic')

  // Pagination per tab
  const [pendingCardPageIndex, setPendingCardPageIndex] = useState(0)
  const [receivedCardPageIndex, setReceivedCardPageIndex] = useState(0)
  const [pendingTermPageIndex, setPendingTermPageIndex] = useState(0)
  const [receivedTermPageIndex, setReceivedTermPageIndex] = useState(0)

  // Modals state
  const [triggerModalOpen, setTriggerModalOpen] = useState(false)
  const [termModalOpen, setTermModalOpen] = useState(false)
  const [selectedTermTx, setSelectedTermTx] = useState<any>(null)
  const [reportModalOpen, setReportModalOpen] = useState(false)

  // Selection for batch settlements
  const [selectedTxIds, setSelectedTxIds] = useState<string[]>([])

  // Term Debt Form state
  const [targetAccountId, setTargetAccountId] = useState('')
  const [actualMethod, setActualMethod] = useState('PIX')

  // Sorting
  const [sortFieldPendingCard, setSortFieldPendingCard] =
    useState('data_vencimento')
  const [sortDirPendingCard, setSortDirPendingCard] = useState('asc')

  const [sortFieldReceivedCard, setSortFieldReceivedCard] =
    useState('data_vencimento')
  const [sortDirReceivedCard, setSortDirReceivedCard] = useState('desc')

  // Search filter inside Term tab
  const [termSearchQuery, setTermSearchQuery] = useState('')

  // 1. Query: Cartões à Receber no Mês Selecionado (Vendas do mês ou com vencimento no mês)
  const { data: pendingCardsResult, isLoading: isLoadingPendingCards } =
    useQuery({
      queryKey: [
        'pending-settlements-cards',
        pendingCardPageIndex,
        sortFieldPendingCard,
        sortDirPendingCard,
        selectedMonth,
        selectedYear,
      ],
      queryFn: () =>
        getPendingSettlements({
          pageIndex: pendingCardPageIndex,
          sortBy: sortFieldPendingCard,
          sortDir: sortDirPendingCard,
          month: selectedMonth,
          year: selectedYear,
          type: 'automatic',
        }),
    })
  const pendingCards = pendingCardsResult?.data || []
  const pendingCardsSummary = pendingCardsResult?.summary || {
    totalGross: 0,
    totalNet: 0,
    totalFees: 0,
    count: 0,
  }

  // 2. Query: Cartões à Receber GERAL (Futuro Total em Aberto)
  const { data: allPendingCardsResult } = useQuery({
    queryKey: ['pending-settlements-cards-all'],
    queryFn: () =>
      getPendingSettlements({
        type: 'automatic',
      }),
  })
  const totalAllPendingCardsGross =
    allPendingCardsResult?.summary?.totalGross || 0
  const totalAllPendingCardsNet = allPendingCardsResult?.summary?.totalNet || 0

  // 3. Query: Cartões Recebidos / Liquidados no Mês
  const { data: receivedCardsResult, isLoading: isLoadingReceivedCards } =
    useQuery({
      queryKey: [
        'settlements-cards',
        receivedCardPageIndex,
        sortFieldReceivedCard,
        sortDirReceivedCard,
        selectedMonth,
        selectedYear,
      ],
      queryFn: () =>
        getSettlements({
          pageIndex: receivedCardPageIndex,
          sortBy: sortFieldReceivedCard,
          sortDir: sortDirReceivedCard,
          month: selectedMonth,
          year: selectedYear,
          type: 'automatic',
        }),
    })
  const receivedCards = receivedCardsResult?.data || []
  const receivedCardsSummary = receivedCardsResult?.summary || {
    totalGross: 0,
    totalNet: 0,
    totalFees: 0,
    count: 0,
  }

  // 4. Query: A Prazo a Receber (Clientes e Funcionários) no Mês
  const { data: pendingTermsResult, isLoading: isLoadingPendingTerms } =
    useQuery({
      queryKey: [
        'pending-settlements-terms',
        selectedMonth,
        selectedYear,
        pendingTermPageIndex,
      ],
      queryFn: () =>
        getPendingSettlements({
          pageIndex: pendingTermPageIndex,
          month: selectedMonth,
          year: selectedYear,
          type: 'term',
        }),
    })
  const pendingTerms = pendingTermsResult?.data || []

  // 5. Query: A Prazo a Receber GERAL (Todos os débitos em aberto para o modal de relatório e total)
  const { data: allPendingTermsResult } = useQuery({
    queryKey: ['pending-settlements-terms-all'],
    queryFn: () =>
      getPendingSettlements({
        type: 'term',
      }),
  })
  const allPendingTerms = allPendingTermsResult?.data || []

  // 6. Query: A Prazo Recebidos no Mês
  const { data: receivedTermsResult, isLoading: isLoadingReceivedTerms } =
    useQuery({
      queryKey: [
        'settlements-terms',
        selectedMonth,
        selectedYear,
        receivedTermPageIndex,
      ],
      queryFn: () =>
        getSettlements({
          pageIndex: receivedTermPageIndex,
          month: selectedMonth,
          year: selectedYear,
          type: 'term',
        }),
    })
  const receivedTerms = receivedTermsResult?.data || []
  const receivedTermsSummary = receivedTermsResult?.summary || {
    totalGross: 0,
    totalNet: 0,
    totalFees: 0,
    count: 0,
  }

  // Auxiliary data: Contas, Clientes e Funcionários
  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: getAccounts,
  })

  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: getClients,
  })
  const clients =
    (clientsData as any)?.clients ||
    (Array.isArray(clientsData) ? clientsData : [])

  const { data: employeesData } = useQuery({
    queryKey: ['employees-all'],
    queryFn: () => getEmployees({ limit: 1000 }),
  })
  const employees =
    (employeesData as any)?.employees ||
    (Array.isArray(employeesData) ? employeesData : [])

  // Auto-Settle on mount
  useEffect(() => {
    const autoSettle = async () => {
      try {
        await api.post('/trigger-settlement', undefined, {
          params: { onlyToday: 'true' },
        })
        queryClient.invalidateQueries({ queryKey: ['settlements-cards'] })
        queryClient.invalidateQueries({
          queryKey: ['pending-settlements-cards'],
        })
        queryClient.invalidateQueries({ queryKey: ['finance-metrics'] })
      } catch (e) {
        console.error('Failed to auto-settle', e)
      }
    }
    autoSettle()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Mutations
  const { mutateAsync: revert } = useMutation({
    mutationFn: revertSettlement,
    onSuccess: () => {
      toast.success('Liquidação revertida com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['settlements-cards'] })
      queryClient.invalidateQueries({ queryKey: ['pending-settlements-cards'] })
      queryClient.invalidateQueries({ queryKey: ['finance-metrics'] })
    },
    onError: () => toast.error('Erro ao reverter liquidação.'),
  })

  const { mutateAsync: triggerSettlement, isPending: isTriggering } =
    useMutation({
      mutationFn: async (ids?: string[]) => {
        const payload =
          ids && ids.length > 0 ? { transactionIds: ids } : undefined
        const res = await api.post('/trigger-settlement', payload)
        return res.data
      },
      onSuccess: (data) => {
        toast.success(data.message || 'Liquidação processada com sucesso!')
        queryClient.invalidateQueries({ queryKey: ['settlements-cards'] })
        queryClient.invalidateQueries({
          queryKey: ['pending-settlements-cards'],
        })
        queryClient.invalidateQueries({
          queryKey: ['pending-settlements-cards-all'],
        })
        queryClient.invalidateQueries({ queryKey: ['finance-metrics'] })
        setTriggerModalOpen(false)
        setSelectedTxIds([])
      },
      onError: (err: any) =>
        toast.error(
          err?.response?.data?.message || 'Erro ao processar liquidações.',
        ),
    })

  const { mutateAsync: handleSettleTerm, isPending: isSettlingTerm } =
    useMutation({
      mutationFn: (isWriteOff: boolean) =>
        settleTermDebt({
          transactionId: selectedTermTx.id,
          targetAccountId: isWriteOff ? null : targetAccountId,
          actualPaymentMethod: isWriteOff ? null : actualMethod,
          isWriteOff,
        }),
      onSuccess: () => {
        toast.success('Baixa realizada com sucesso!')
        queryClient.invalidateQueries({
          queryKey: ['pending-settlements-terms'],
        })
        queryClient.invalidateQueries({
          queryKey: ['pending-settlements-terms-all'],
        })
        queryClient.invalidateQueries({ queryKey: ['settlements-terms'] })
        queryClient.invalidateQueries({ queryKey: ['finance-metrics'] })
        setTermModalOpen(false)
        setSelectedTermTx(null)
      },
      onError: (err: any) =>
        toast.error(err?.response?.data?.message || 'Erro ao realizar baixa.'),
    })

  // Multi-select for card settlements
  const allAutomaticIds = pendingCards.map((t) => t.id)
  const isAllSelected =
    allAutomaticIds.length > 0 &&
    selectedTxIds.length === allAutomaticIds.length

  const handleSelectAll = () => {
    if (isAllSelected) setSelectedTxIds([])
    else setSelectedTxIds(allAutomaticIds)
  }

  const toggleSelection = (id: string) => {
    setSelectedTxIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    )
  }

  // Selected cards financial summary
  const selectedCardsSummary = useMemo(() => {
    if (!selectedTxIds.length) {
      return {
        count: 0,
        gross: 0,
        net: 0,
        fees: 0,
        items: [] as typeof pendingCards,
      }
    }

    const allAvailable = [
      ...pendingCards,
      ...(allPendingCardsResult?.data || []),
    ]
    const map = new Map<string, (typeof pendingCards)[0]>()
    allAvailable.forEach((item) => map.set(item.id, item))

    const selectedItems: typeof pendingCards = []
    let gross = 0
    let net = 0
    let fees = 0

    selectedTxIds.forEach((id) => {
      const tx = map.get(id)
      if (tx) {
        selectedItems.push(tx)
        const b = Number(tx.amount || 0)
        const n = Number(tx.totalValue ?? tx.amount ?? 0)
        const f = Math.max(0, b - n)

        gross += b
        net += n
        fees += f
      }
    })

    return {
      count: selectedTxIds.length,
      gross,
      net,
      fees,
      items: selectedItems,
    }
  }, [selectedTxIds, pendingCards, allPendingCardsResult])

  // Today's pending cards summary (vencidas até hoje)
  const todayPendingSummary = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    const todayItems = pendingCards.filter((tx) => {
      try {
        const dueStr = format(new Date(tx.data_vencimento), 'yyyy-MM-dd')
        return dueStr <= todayStr
      } catch {
        return false
      }
    })
    const count = todayItems.length
    const gross = todayItems.reduce(
      (acc, tx) => acc + Number(tx.amount || 0),
      0,
    )
    const net = todayItems.reduce(
      (acc, tx) => acc + Number(tx.totalValue ?? tx.amount ?? 0),
      0,
    )
    const fees = Math.max(0, gross - net)
    return { count, gross, net, fees, items: todayItems }
  }, [pendingCards])

  // Month names in Portuguese
  const monthNames = [
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

  // KPI Calculations for Term Debts (A Prazo)
  const termKpis = useMemo(() => {
    let mesFuncionarios = 0
    let mesClientes = 0
    let geralFuncionarios = 0
    let geralClientes = 0

    pendingTerms.forEach((item) => {
      const amt = Number(item.amount || 0)
      if (
        item.isEmployeeVale ||
        (item.payment_method || '').toUpperCase().includes('FUNCIONARIO')
      ) {
        mesFuncionarios += amt
      } else {
        mesClientes += amt
      }
    })

    allPendingTerms.forEach((item) => {
      const amt = Number(item.amount || 0)
      if (
        item.isEmployeeVale ||
        (item.payment_method || '').toUpperCase().includes('FUNCIONARIO')
      ) {
        geralFuncionarios += amt
      } else {
        geralClientes += amt
      }
    })

    return {
      mesTotal: mesFuncionarios + mesClientes,
      mesFuncionarios,
      mesClientes,
      geralTotal: geralFuncionarios + geralClientes,
      geralFuncionarios,
      geralClientes,
    }
  }, [pendingTerms, allPendingTerms])

  // Filtered term items by search
  const filteredPendingTerms = useMemo(() => {
    if (!termSearchQuery.trim()) return pendingTerms
    const q = termSearchQuery.toLowerCase()
    return pendingTerms.filter(
      (item) =>
        (item.description || '').toLowerCase().includes(q) ||
        (item.employeeName || '').toLowerCase().includes(q) ||
        (item.payment_method || '').toLowerCase().includes(q),
    )
  }, [pendingTerms, termSearchQuery])

  return (
    <>
      <Helmet title="Recebíveis & Liquidações" />

      <div className="flex flex-col gap-6 px-5 font-manrope md:px-0">
        {/* HEADER PRINCIPAL PADRÃO COM SELETOR DE MÊS */}
        <PageHeader
          title="Recebíveis & Liquidações"
          description="Gestão de recebimentos de cartões, liquidações de adquirentes e controle de contas a prazo."
        >
          <div className="mb-8 flex w-full flex-row items-center justify-between gap-2 md:mb-0 md:w-auto md:justify-end md:gap-3">
            <MonthPicker
              date={selectedMonthDate}
              setDate={setSelectedMonthDate}
            />

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-xl border-slate-200 bg-white text-xs font-bold dark:border-slate-800 dark:bg-slate-900"
              onClick={() => {
                queryClient.invalidateQueries({
                  queryKey: ['settlements-cards'],
                })
                queryClient.invalidateQueries({
                  queryKey: ['pending-settlements-cards'],
                })
                queryClient.invalidateQueries({
                  queryKey: ['pending-settlements-cards-all'],
                })
                queryClient.invalidateQueries({
                  queryKey: ['pending-settlements-terms'],
                })
                queryClient.invalidateQueries({
                  queryKey: ['pending-settlements-terms-all'],
                })
                queryClient.invalidateQueries({
                  queryKey: ['settlements-terms'],
                })
                toast.success('Dados atualizados com sucesso!')
              }}
            >
              <RefreshCw size={14} />
              <span>Atualizar</span>
            </Button>
          </div>
        </PageHeader>

        {/* 4 ABAS DA TELA DE RECEBÍVEIS */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full space-y-4"
        >
          <TabsList className="grid h-auto w-full grid-cols-2 rounded-2xl border border-slate-200/80 bg-slate-100 p-1.5 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-4">
            <TabsTrigger
              value="automatic"
              className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-black uppercase tracking-wider transition-all data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-blue-400"
            >
              <CreditCard size={15} />
              <span>Cartões à Receber</span>
            </TabsTrigger>

            <TabsTrigger
              value="card_history"
              className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-black uppercase tracking-wider transition-all data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-emerald-400"
            >
              <CheckCircle2 size={15} />
              <span>Cartões Recebidos</span>
            </TabsTrigger>

            <TabsTrigger
              value="term"
              className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-black uppercase tracking-wider transition-all data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-orange-400"
            >
              <Users size={15} />
              <span>A Prazo a Receber</span>
            </TabsTrigger>

            <TabsTrigger
              value="term_history"
              className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-black uppercase tracking-wider transition-all data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-purple-400"
            >
              <Banknote size={15} />
              <span>A Prazo Recebidos</span>
            </TabsTrigger>
          </TabsList>

          {/* ========================================================================= */}
          {/* ABA 1: CARTÕES À RECEBER */}
          {/* ========================================================================= */}
          <TabsContent value="automatic" className="space-y-4">
            {/* CARDS DE KPIS */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="shadow-xs rounded-2xl border border-blue-200/70 bg-gradient-to-br from-blue-50/80 to-white p-4 dark:border-blue-900/40 dark:from-slate-900 dark:to-slate-900">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-400">
                    A Receber (Vendas de {monthNames[selectedMonth - 1]})
                  </span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                    <CreditCard size={15} />
                  </div>
                </div>
                <p className="mt-2 font-mono text-2xl font-black tracking-tight text-blue-950 dark:text-blue-100">
                  {pendingCardsSummary.totalNet.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </p>
                <div className="mt-1 flex items-center justify-between border-t border-blue-100 pt-1 text-[11px] font-semibold text-slate-500 dark:border-slate-800">
                  <span>
                    Bruto:{' '}
                    {pendingCardsSummary.totalGross.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </span>
                  <span>{pendingCardsSummary.count} lançamentos</span>
                </div>
              </div>

              <div className="shadow-xs rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Total Futuro em Aberto (Geral)
                  </span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                    <Wallet size={15} />
                  </div>
                </div>
                <p className="mt-2 font-mono text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                  {totalAllPendingCardsNet.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </p>
                <div className="mt-1 flex items-center justify-between border-t border-slate-100 pt-1 text-[11px] font-semibold text-slate-500 dark:border-slate-800">
                  <span>
                    Bruto Total:{' '}
                    {totalAllPendingCardsGross.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </span>
                  <span>Todos os Meses</span>
                </div>
              </div>

              <div className="shadow-xs rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Taxas MDR Retidas ({monthNames[selectedMonth - 1]})
                  </span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                    <Percent size={15} />
                  </div>
                </div>
                <p className="mt-2 font-mono text-2xl font-black tracking-tight text-amber-600 dark:text-amber-400">
                  -{' '}
                  {pendingCardsSummary.totalFees.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </p>
                <span className="mt-1 block border-t border-slate-100 pt-1 text-[11px] font-semibold text-slate-500 dark:border-slate-800">
                  Retenção Stone / PagBank
                </span>
              </div>
            </div>

            {/* BANNER DINÂMICO DE SELEÇÃO DE ADIANTAMENTO */}
            {selectedTxIds.length > 0 && (
              <div className="flex flex-col gap-4 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-blue-50/90 p-4 shadow-sm animate-in fade-in-50 slide-in-from-top-2 dark:border-blue-900/60 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-blue-950/40 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-600/30">
                      <Rocket size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-200">
                          {selectedCardsSummary.count}{' '}
                          {selectedCardsSummary.count === 1
                            ? 'Cartão Selecionado'
                            : 'Cartões Selecionados'}
                        </span>
                        <span className="rounded-full bg-blue-200/80 px-2 py-0.5 text-[10px] font-extrabold uppercase text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                          Adiantamento Ativo
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Valores que serão creditados na sua conta bancária
                        imediatamente
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 border-t border-blue-200/80 pt-2 dark:border-blue-800/60 sm:gap-6 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Valor Bruto
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 sm:text-sm">
                        {selectedCardsSummary.gross.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Taxas MDR
                      </span>
                      <span className="font-mono text-xs font-bold text-red-500 sm:text-sm">
                        -{' '}
                        {selectedCardsSummary.fees.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </span>
                    </div>

                    <div className="shadow-xs rounded-xl border border-blue-200/80 bg-white px-3.5 py-1.5 dark:border-blue-800/60 dark:bg-slate-900">
                      <span className="block text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                        Total Líquido a Adiantar
                      </span>
                      <span className="font-mono text-base font-black text-emerald-600 dark:text-emerald-400 sm:text-lg">
                        {selectedCardsSummary.net.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedTxIds([])}
                    className="h-10 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    Desmarcar
                  </Button>

                  <Button
                    onClick={() => setTriggerModalOpen(true)}
                    className="h-11 gap-2 rounded-xl bg-blue-600 px-5 text-xs font-black uppercase text-white shadow-md shadow-blue-600/30 hover:bg-blue-700 active:scale-95"
                  >
                    <Rocket size={15} />
                    <span>
                      Adiantar{' '}
                      {selectedCardsSummary.net.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </span>
                  </Button>
                </div>
              </div>
            )}

            {/* BARRA DE AÇÕES DA TABELA */}
            <div className="shadow-xs flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <Select
                  value={`${sortFieldPendingCard}-${sortDirPendingCard}`}
                  onValueChange={(val) => {
                    const [field, dir] = val.split('-')
                    setSortFieldPendingCard(field)
                    setSortDirPendingCard(dir)
                  }}
                >
                  <SelectTrigger className="w-[210px] rounded-xl bg-slate-50 text-xs font-bold dark:bg-slate-950">
                    <SelectValue placeholder="Ordenar por..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="data_vencimento-asc">
                      Vencimento (Próximos)
                    </SelectItem>
                    <SelectItem value="data_vencimento-desc">
                      Vencimento (Distantes)
                    </SelectItem>
                    <SelectItem value="data_emissao-desc">
                      Venda Mais Recente
                    </SelectItem>
                    <SelectItem value="amount-desc">Maior Valor</SelectItem>
                    <SelectItem value="amount-asc">Menor Valor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setTriggerModalOpen(true)}
                  className="gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black uppercase text-white shadow-md shadow-blue-600/25 hover:bg-blue-700 active:scale-95"
                >
                  <Rocket size={15} />
                  <span>
                    {selectedTxIds.length > 0
                      ? `Adiantar ${selectedTxIds.length} Selecionados (${selectedCardsSummary.net.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})`
                      : todayPendingSummary.count > 0
                        ? `Adiantar Hoje (${todayPendingSummary.count} • ${todayPendingSummary.net.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})`
                        : 'Adiantar Liquidações de Hoje'}
                  </span>
                </Button>
              </div>
            </div>

            {/* TABELA DE CARTÕES A RECEBER */}
            <div className="shadow-xs overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-950">
                  <TableRow>
                    <TableHead className="w-[50px] text-center">
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={handleSelectAll}
                        disabled={pendingCards.length === 0}
                      />
                    </TableHead>
                    <TableHead className="text-xs font-black uppercase">
                      Vencimento Previsto
                    </TableHead>
                    <TableHead className="text-xs font-black uppercase">
                      Data da Venda
                    </TableHead>
                    <TableHead className="text-xs font-black uppercase">
                      Venda / Descrição
                    </TableHead>
                    <TableHead className="text-xs font-black uppercase">
                      Forma / Bandeira
                    </TableHead>
                    <TableHead className="text-right text-xs font-black uppercase">
                      Bruto (R$)
                    </TableHead>
                    <TableHead className="text-right text-xs font-black uppercase">
                      Taxa MDR
                    </TableHead>
                    <TableHead className="text-right text-xs font-black uppercase">
                      Líquido a Receber
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingPendingCards ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="h-28 text-center text-xs font-bold text-slate-500"
                      >
                        Carregando recebíveis de cartões...
                      </TableCell>
                    </TableRow>
                  ) : pendingCards.length > 0 ? (
                    pendingCards.map((tx) => {
                      const taxPerc = tx.interest || 0
                      const bruto = tx.amount
                      const liquido = tx.totalValue || tx.amount

                      return (
                        <TableRow
                          key={tx.id}
                          className={cn(
                            'transition-colors',
                            selectedTxIds.includes(tx.id)
                              ? 'bg-blue-50/70 hover:bg-blue-100/60 dark:bg-blue-950/40 dark:hover:bg-blue-950/60'
                              : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/50',
                          )}
                        >
                          <TableCell className="text-center">
                            <Checkbox
                              checked={selectedTxIds.includes(tx.id)}
                              onCheckedChange={() => toggleSelection(tx.id)}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                            {format(
                              new Date(tx.data_vencimento),
                              'dd/MM/yyyy',
                              { locale: ptBR },
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs font-medium text-slate-500">
                            {format(new Date(tx.data_emissao), 'dd/MM/yyyy', {
                              locale: ptBR,
                            })}
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {tx.description}
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold uppercase text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              {tx.payment_method}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-medium text-slate-600 dark:text-slate-400">
                            {bruto.toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            })}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-bold text-red-500">
                            {taxPerc}%
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-black text-emerald-600 dark:text-emerald-400">
                            {liquido.toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            })}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="h-28 text-center text-xs font-semibold text-slate-400"
                      >
                        Nenhum cartão ou voucher aguardando liquidação para o
                        mês de {monthNames[selectedMonth - 1]}.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {pendingCardsResult?.meta &&
              pendingCardsResult.meta.totalPages > 1 && (
                <Pagination
                  pageIndex={pendingCardPageIndex}
                  totalCount={pendingCardsResult.meta.total}
                  perPage={pendingCardsResult.meta.limit}
                  onPageChange={setPendingCardPageIndex}
                />
              )}
          </TabsContent>

          {/* ========================================================================= */}
          {/* ABA 2: CARTÕES RECEBIDOS (SEPARADOS POR MÊS) */}
          {/* ========================================================================= */}
          <TabsContent value="card_history" className="space-y-4">
            {/* CARDS DE KPIS DO MÊS */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="shadow-xs rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50/80 to-white p-4 dark:border-emerald-900/40 dark:from-slate-900 dark:to-slate-900">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    Líquido Depositado ({monthNames[selectedMonth - 1]})
                  </span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                    <CheckCircle2 size={15} />
                  </div>
                </div>
                <p className="mt-2 font-mono text-2xl font-black tracking-tight text-emerald-950 dark:text-emerald-300">
                  {receivedCardsSummary.totalNet.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </p>
                <span className="mt-1 block border-t border-emerald-100 pt-1 text-[11px] font-semibold text-slate-500 dark:border-slate-800">
                  Saldo Real Efetivado
                </span>
              </div>

              <div className="shadow-xs rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Bruto Original Faturado
                  </span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                    <Wallet size={15} />
                  </div>
                </div>
                <p className="mt-2 font-mono text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                  {receivedCardsSummary.totalGross.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </p>
                <span className="mt-1 block border-t border-slate-100 pt-1 text-[11px] font-semibold text-slate-500 dark:border-slate-800">
                  Valor de Venda no Balcão
                </span>
              </div>

              <div className="shadow-xs rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Taxas MDR Descontadas
                  </span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                    <Percent size={15} />
                  </div>
                </div>
                <p className="mt-2 font-mono text-2xl font-black tracking-tight text-amber-600 dark:text-amber-400">
                  -{' '}
                  {receivedCardsSummary.totalFees.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </p>
                <span className="mt-1 block border-t border-slate-100 pt-1 text-[11px] font-semibold text-slate-500 dark:border-slate-800">
                  Retenção das Maquininhas
                </span>
              </div>

              <div className="shadow-xs rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Liquidações no Mês
                  </span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-500/10 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400">
                    <CheckCircle2 size={15} />
                  </div>
                </div>
                <p className="mt-2 font-mono text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                  {receivedCardsSummary.count}
                </p>
                <span className="mt-1 block border-t border-slate-100 pt-1 text-[11px] font-semibold text-slate-500 dark:border-slate-800">
                  Lotes Efetivados no Banco
                </span>
              </div>
            </div>

            {/* TABELA DE HISTÓRICO DE CARTÕES */}
            <div className="shadow-xs overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-950">
                  <TableRow>
                    <TableHead className="text-xs font-black uppercase">
                      Data da Baixa
                    </TableHead>
                    <TableHead className="text-xs font-black uppercase">
                      Data da Venda
                    </TableHead>
                    <TableHead className="text-xs font-black uppercase">
                      Descrição / Maquininha
                    </TableHead>
                    <TableHead className="text-xs font-black uppercase">
                      Conta Destino
                    </TableHead>
                    <TableHead className="text-right text-xs font-black uppercase">
                      Bruto Original
                    </TableHead>
                    <TableHead className="text-right text-xs font-black uppercase">
                      Líquido Depositado
                    </TableHead>
                    <TableHead className="w-[80px] text-center"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingReceivedCards ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="h-28 text-center text-xs font-bold text-slate-500"
                      >
                        Carregando histórico de liquidações...
                      </TableCell>
                    </TableRow>
                  ) : receivedCards && receivedCards.length > 0 ? (
                    receivedCards.map((settlement) => (
                      <TableRow
                        key={settlement.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50"
                      >
                        <TableCell className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          {format(
                            new Date(settlement.data_vencimento),
                            'dd/MM/yyyy',
                            { locale: ptBR },
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs font-medium text-slate-500">
                          {format(
                            new Date(settlement.data_emissao),
                            'dd/MM/yyyy',
                            { locale: ptBR },
                          )}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {settlement.description || 'Liquidação'}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-slate-600 dark:text-slate-400">
                          {settlement.accounts?.name || 'Conta Padrão'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-medium text-slate-600 dark:text-slate-400">
                          {(
                            settlement.amount || settlement.totalValue
                          ).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-black text-emerald-600 dark:text-emerald-400">
                          {(
                            settlement.totalValue || settlement.amount
                          ).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </TableCell>
                        <TableCell className="text-center">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-orange-500 hover:bg-orange-50 hover:text-orange-600"
                                title="Desfazer e voltar para pendentes"
                              >
                                <Undo2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-3xl">
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Reverter liquidação?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação marcará esta transação como Pendente
                                  novamente, e ela sairá dos relatórios de saldo
                                  atual.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-xl">
                                  Cancelar
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => revert({ id: settlement.id })}
                                  className="rounded-xl bg-orange-500 font-bold hover:bg-orange-600"
                                >
                                  Sim, Reverter
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="h-28 text-center text-xs font-semibold text-slate-400"
                      >
                        Nenhuma liquidação de cartão efetivada em{' '}
                        {monthNames[selectedMonth - 1]} de {selectedYear}.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {receivedCardsResult?.meta &&
              receivedCardsResult.meta.totalPages > 1 && (
                <Pagination
                  pageIndex={receivedCardPageIndex}
                  totalCount={receivedCardsResult.meta.total}
                  perPage={receivedCardsResult.meta.limit}
                  onPageChange={setReceivedCardPageIndex}
                />
              )}
          </TabsContent>

          {/* ========================================================================= */}
          {/* ABA 3: A PRAZO A RECEBER (CLIENTES E FUNCIONÁRIOS) */}
          {/* ========================================================================= */}
          <TabsContent value="term" className="space-y-4">
            {/* CARDS DE KPIS DE A PRAZO */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="shadow-xs rounded-2xl border border-orange-200/70 bg-gradient-to-br from-orange-50/80 to-white p-4 dark:border-orange-900/40 dark:from-slate-900 dark:to-slate-900">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-orange-700 dark:text-orange-400">
                    A Prazo no Mês ({monthNames[selectedMonth - 1]})
                  </span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400">
                    <Users size={15} />
                  </div>
                </div>
                <p className="mt-2 font-mono text-2xl font-black tracking-tight text-orange-950 dark:text-orange-100">
                  {termKpis.mesTotal.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </p>
                <div className="mt-1 flex items-center justify-between border-t border-orange-100 pt-1 text-[11px] font-semibold text-slate-500 dark:border-slate-800">
                  <span>{pendingTerms.length} débitos</span>
                  <span>{monthNames[selectedMonth - 1]}</span>
                </div>
              </div>

              <div className="shadow-xs rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Débitos: Funcionários (Vales)
                  </span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                    <User size={15} />
                  </div>
                </div>
                <p className="mt-2 font-mono text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                  {termKpis.mesFuncionarios.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </p>
                <span className="mt-1 block border-t border-slate-100 pt-1 text-[11px] font-semibold text-slate-500 dark:border-slate-800">
                  Consumos em Folha no Mês
                </span>
              </div>

              <div className="shadow-xs rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Débitos: Clientes (Fiado/Permuta)
                  </span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
                    <Users size={15} />
                  </div>
                </div>
                <p className="mt-2 font-mono text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                  {termKpis.mesClientes.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </p>
                <span className="mt-1 block border-t border-slate-100 pt-1 text-[11px] font-semibold text-slate-500 dark:border-slate-800">
                  Contas de Clientes no Mês
                </span>
              </div>

              <div className="shadow-xs rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Total Geral em Aberto
                  </span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">
                    <Wallet size={15} />
                  </div>
                </div>
                <p className="mt-2 font-mono text-2xl font-black tracking-tight text-rose-600 dark:text-rose-400">
                  {termKpis.geralTotal.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </p>
                <span className="mt-1 block border-t border-slate-100 pt-1 text-[11px] font-semibold text-slate-500 dark:border-slate-800">
                  Acumulado de Todos os Meses
                </span>
              </div>
            </div>

            {/* BARRA DE AÇÕES: RELATÓRIO PDF + BUSCA */}
            <div className="shadow-xs flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center">
              <div className="relative max-w-md flex-1">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Buscar cliente, funcionário ou descrição..."
                  value={termSearchQuery}
                  onChange={(e) => setTermSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs font-semibold text-slate-800 outline-none transition-all focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setReportModalOpen(true)}
                  className="gap-1.5 rounded-xl bg-orange-600 px-4 py-2 text-xs font-black uppercase text-white shadow-md shadow-orange-600/25 hover:bg-orange-700 active:scale-95"
                >
                  <FileText size={14} />
                  <span>Relatório / Cobrança em PDF</span>
                </Button>
              </div>
            </div>

            {/* TABELA DE A PRAZO A RECEBER */}
            <div className="shadow-xs overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-950">
                  <TableRow>
                    <TableHead className="text-xs font-black uppercase">
                      Data / Vencimento
                    </TableHead>
                    <TableHead className="text-xs font-black uppercase">
                      Devedor / Nome
                    </TableHead>
                    <TableHead className="text-xs font-black uppercase">
                      Categoria / Tipo
                    </TableHead>
                    <TableHead className="text-xs font-black uppercase">
                      Descrição / Turno
                    </TableHead>
                    <TableHead className="text-right text-xs font-black uppercase">
                      Valor a Receber
                    </TableHead>
                    <TableHead className="w-[140px] text-center text-xs font-black uppercase">
                      Ações
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingPendingTerms ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-28 text-center text-xs font-bold text-slate-500"
                      >
                        Carregando débitos a prazo...
                      </TableCell>
                    </TableRow>
                  ) : filteredPendingTerms.length > 0 ? (
                    filteredPendingTerms.map((tx) => {
                      const isEmployee =
                        tx.isEmployeeVale ||
                        (tx.payment_method || '')
                          .toUpperCase()
                          .includes('FUNCIONARIO')
                      let personName = tx.employeeName || ''
                      if (!personName) {
                        const match =
                          tx.description?.match(/:s*([^[]+)/) ||
                          tx.description?.match(/-s*([^-]+)$/)
                        personName = match ? match[1].trim() : 'Cliente'
                      }

                      return (
                        <TableRow
                          key={tx.id}
                          className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50"
                        >
                          <TableCell className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                            {format(
                              new Date(tx.data_vencimento || tx.data_emissao),
                              'dd/MM/yyyy',
                              { locale: ptBR },
                            )}
                          </TableCell>
                          <TableCell className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {personName}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                                isEmployee
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400'
                                  : tx.payment_method === 'PERMUTA'
                                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400'
                                    : 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400'
                              }`}
                            >
                              {isEmployee
                                ? 'Funcionário'
                                : tx.payment_method === 'PERMUTA'
                                  ? 'Permuta'
                                  : 'Cliente A Prazo'}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs font-medium text-slate-600 dark:text-slate-400">
                            {tx.description}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm font-black text-emerald-600 dark:text-emerald-400">
                            {tx.amount.toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            })}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              size="sm"
                              className="shadow-xs gap-1 rounded-xl bg-emerald-600 px-3 text-xs font-black uppercase text-white hover:bg-emerald-700"
                              onClick={() => {
                                setSelectedTermTx(tx)
                                setTermModalOpen(true)
                              }}
                            >
                              <CheckCircle2 size={13} />
                              <span>Receber</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-28 text-center text-xs font-semibold text-slate-400"
                      >
                        Nenhum débito a prazo de clientes ou funcionários
                        encontrado em {monthNames[selectedMonth - 1]}.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ========================================================================= */}
          {/* ABA 4: A PRAZO RECEBIDOS (HISTÓRICO MENSAL) */}
          {/* ========================================================================= */}
          <TabsContent value="term_history" className="space-y-4">
            {/* CARDS DE KPIS */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="shadow-xs rounded-2xl border border-purple-200/70 bg-gradient-to-br from-purple-50/80 to-white p-4 dark:border-purple-900/40 dark:from-slate-900 dark:to-slate-900">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-400">
                    Total Acertado / Baixado ({monthNames[selectedMonth - 1]})
                  </span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
                    <CheckCircle2 size={15} />
                  </div>
                </div>
                <p className="mt-2 font-mono text-2xl font-black tracking-tight text-purple-950 dark:text-purple-100">
                  {receivedTermsSummary.totalGross.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </p>
                <div className="mt-1 flex items-center justify-between border-t border-purple-100 pt-1 text-[11px] font-semibold text-slate-500 dark:border-slate-800">
                  <span>{receivedTermsSummary.count} acertos realizados</span>
                  <span>{monthNames[selectedMonth - 1]}</span>
                </div>
              </div>

              <div className="shadow-xs rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Recebidos de Clientes
                  </span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                    <Wallet size={15} />
                  </div>
                </div>
                <p className="mt-2 font-mono text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                  {receivedTermsSummary.totalNet.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </p>
                <span className="mt-1 block border-t border-slate-100 pt-1 text-[11px] font-semibold text-slate-500 dark:border-slate-800">
                  Acertos Depositados no Mês
                </span>
              </div>

              <div className="shadow-xs rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Status das Baixas
                  </span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-500/10 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400">
                    <Banknote size={15} />
                  </div>
                </div>
                <p className="mt-2 font-mono text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                  100% Conciliado
                </p>
                <span className="mt-1 block border-t border-slate-100 pt-1 text-[11px] font-semibold text-slate-500 dark:border-slate-800">
                  Integrado com Contas Bancárias
                </span>
              </div>
            </div>

            {/* TABELA DE A PRAZO RECEBIDOS */}
            <div className="shadow-xs overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-950">
                  <TableRow>
                    <TableHead className="text-xs font-black uppercase">
                      Data da Baixa
                    </TableHead>
                    <TableHead className="text-xs font-black uppercase">
                      Descrição / Acerto
                    </TableHead>
                    <TableHead className="text-xs font-black uppercase">
                      Forma Recebida
                    </TableHead>
                    <TableHead className="text-xs font-black uppercase">
                      Conta Destino
                    </TableHead>
                    <TableHead className="text-right text-xs font-black uppercase">
                      Valor Recebido
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingReceivedTerms ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-28 text-center text-xs font-bold text-slate-500"
                      >
                        Carregando histórico de acertos...
                      </TableCell>
                    </TableRow>
                  ) : receivedTerms && receivedTerms.length > 0 ? (
                    receivedTerms.map((settlement) => (
                      <TableRow
                        key={settlement.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50"
                      >
                        <TableCell className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          {format(
                            new Date(settlement.data_vencimento),
                            'dd/MM/yyyy',
                            { locale: ptBR },
                          )}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {settlement.description || 'Acerto de Conta'}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold uppercase text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {settlement.payment_method || 'Acerto'}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs font-medium text-slate-600 dark:text-slate-400">
                          {settlement.accounts?.name || 'Caixa Central'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-black text-emerald-600 dark:text-emerald-400">
                          {settlement.amount.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-28 text-center text-xs font-semibold text-slate-400"
                      >
                        Nenhum acerto de contas a prazo registrado em{' '}
                        {monthNames[selectedMonth - 1]} de {selectedYear}.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {receivedTermsResult?.meta &&
              receivedTermsResult.meta.totalPages > 1 && (
                <Pagination
                  pageIndex={receivedTermPageIndex}
                  totalCount={receivedTermsResult.meta.total}
                  perPage={receivedTermsResult.meta.limit}
                  onPageChange={setReceivedTermPageIndex}
                />
              )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ADIANTAR LIQUIDAÇÕES DE CARTÕES */}
      {/* ========================================================================= */}
      <Dialog open={triggerModalOpen} onOpenChange={setTriggerModalOpen}>
        <DialogContent className="rounded-3xl p-6 sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <div className="shadow-xs flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
                <Rocket size={18} />
              </div>
              <div>
                <span className="text-base font-black">
                  {selectedTxIds.length > 0
                    ? `Adiantar ${selectedCardsSummary.count} ${selectedCardsSummary.count === 1 ? 'Liquidação' : 'Liquidações'}`
                    : todayPendingSummary.count > 0
                      ? `Liquidações de Hoje (${todayPendingSummary.count})`
                      : 'Liquidações Pendentes de Hoje'}
                </span>
                <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">
                  {selectedTxIds.length > 0
                    ? 'Confira os valores que serão creditados imediatamente na sua conta bancária.'
                    : 'Efetivação de cartões vencidos até hoje.'}
                </span>
              </div>
            </DialogTitle>
          </DialogHeader>

          {/* CARD DE RESUMO FINANCEIRO DO ADIANTAMENTO */}
          {(() => {
            const currentSummary =
              selectedTxIds.length > 0
                ? selectedCardsSummary
                : todayPendingSummary
            const items = currentSummary.items

            return (
              <div className="flex flex-col gap-4 py-2">
                <div className="shadow-xs rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50/80 to-white p-4 dark:border-slate-800 dark:from-slate-900 dark:to-slate-900">
                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                    <span className="font-semibold">Valor Bruto Total:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {currentSummary.gross.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                    <span className="font-semibold">Desconto Taxas MDR:</span>
                    <span className="font-mono font-bold text-red-500">
                      -{' '}
                      {currentSummary.fees.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </span>
                  </div>

                  <div className="my-3 border-t border-dashed border-slate-200 dark:border-slate-800" />

                  <div className="flex items-end justify-between">
                    <div>
                      <span className="block text-[11px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                        Total Líquido a Receber Agora
                      </span>
                      <p className="font-mono text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400 sm:text-3xl">
                        {currentSummary.net.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-black uppercase text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      Crédito Imediato
                    </span>
                  </div>
                </div>

                {/* LISTAGEM DAS CONTAS/TRANSAÇÕES SELECIONADAS */}
                {items.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Transações Selecionadas ({items.length})
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400">
                        Vencimento Original
                      </span>
                    </div>

                    <div className="max-h-44 divide-y divide-slate-200/60 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-2 dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-950/40">
                      {items.map((tx: any) => {
                        const bruto = Number(tx.amount || 0)
                        const liquido = Number(tx.totalValue ?? tx.amount ?? 0)

                        return (
                          <div
                            key={tx.id}
                            className="flex items-center justify-between py-2 text-xs first:pt-1 last:pb-1"
                          >
                            <div className="flex flex-col overflow-hidden pr-2">
                              <span className="truncate font-semibold text-slate-800 dark:text-slate-200">
                                {tx.description || 'Venda de Cartão'}
                              </span>
                              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                <span className="rounded bg-slate-200/70 px-1.5 py-0.5 font-bold uppercase text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                  {tx.payment_method}
                                </span>
                                <span>
                                  Venc:{' '}
                                  {format(
                                    new Date(tx.data_vencimento),
                                    'dd/MM/yyyy',
                                  )}
                                </span>
                              </div>
                            </div>

                            <div className="shrink-0 text-right">
                              <span className="block font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                {liquido.toLocaleString('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL',
                                })}
                              </span>
                              {bruto !== liquido && (
                                <span className="block font-mono text-[10px] text-slate-400 line-through">
                                  {bruto.toLocaleString('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL',
                                  })}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-[11px] text-slate-600 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-slate-400">
                  💡 Os valores líquidos serão integrados instantaneamente ao
                  saldo disponível das contas financeiras vinculadas.
                </div>

                <div className="mt-2 flex flex-col gap-2">
                  <Button
                    onClick={() =>
                      triggerSettlement(
                        selectedTxIds.length > 0 ? selectedTxIds : undefined,
                      )
                    }
                    disabled={isTriggering}
                    className="h-12 w-full gap-2 rounded-xl bg-blue-600 text-xs font-black uppercase text-white shadow-md shadow-blue-600/25 hover:bg-blue-700 active:scale-95"
                  >
                    {isTriggering ? (
                      'Processando...'
                    ) : (
                      <>
                        <Rocket size={16} />
                        <span>
                          Confirmar Adiantamento (
                          {currentSummary.net.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                          )
                        </span>
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setTriggerModalOpen(false)}
                    disabled={isTriggering}
                    className="h-10 rounded-xl text-xs font-bold"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 2: RECEBER / DAR BAIXA EM A PRAZO OU PERMUTA */}
      {/* ========================================================================= */}
      <Dialog
        open={termModalOpen}
        onOpenChange={(open) => {
          setTermModalOpen(open)
          if (!open) setSelectedTermTx(null)
        }}
      >
        <DialogContent className="rounded-3xl sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-black text-emerald-700 dark:text-emerald-400">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                <CheckCircle2 size={18} />
              </div>
              <span>Acerto de Débito A Prazo</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Registrar o recebimento em dinheiro/conta ou dar baixa por
              permuta/perdão.
            </DialogDescription>
          </DialogHeader>

          {selectedTermTx && (
            <div className="flex flex-col gap-4 py-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Referência do Débito
                </p>
                <p className="mt-1 text-xs font-bold text-slate-900 dark:text-slate-100">
                  {selectedTermTx.description}
                </p>
                <div className="mt-3 flex items-end justify-between border-t border-slate-200/60 pt-2 dark:border-slate-800">
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-500">
                      Valor Total
                    </p>
                    <p className="font-mono text-2xl font-black text-emerald-600 dark:text-emerald-400">
                      {selectedTermTx.amount.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </p>
                  </div>
                  <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-[10px] font-black uppercase text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                    Pendente
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="mb-1 block text-xs font-black uppercase text-slate-500">
                    Forma de Pagamento Recebida
                  </Label>
                  <Select value={actualMethod} onValueChange={setActualMethod}>
                    <SelectTrigger className="rounded-xl bg-white text-xs font-bold dark:bg-slate-950">
                      <SelectValue placeholder="Selecione o método" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PIX">⚡ Pix</SelectItem>
                      <SelectItem value="DINHEIRO">💵 Dinheiro Vivo</SelectItem>
                      <SelectItem value="CARTÃO DE CRÉDITO">
                        💳 Cartão de Crédito
                      </SelectItem>
                      <SelectItem value="CARTÃO DE DÉBITO">
                        💳 Cartão de Débito
                      </SelectItem>
                      <SelectItem value="TRANSFERÊNCIA">
                        🏦 Transferência Bancária
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="mb-1 block text-xs font-black uppercase text-slate-500">
                    Conta Bancária de Destino
                  </Label>
                  <Select
                    value={targetAccountId}
                    onValueChange={setTargetAccountId}
                  >
                    <SelectTrigger className="rounded-xl bg-white text-xs font-bold dark:bg-slate-950">
                      <SelectValue placeholder="Selecione a conta destino" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts
                        ?.filter((a) => !a.is_transit)
                        .map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-2 flex flex-col gap-2">
                <Button
                  onClick={() => handleSettleTerm(false)}
                  disabled={!targetAccountId || isSettlingTerm}
                  className="h-11 w-full gap-1.5 rounded-xl bg-emerald-600 text-xs font-black uppercase text-white shadow-md shadow-emerald-600/25 hover:bg-emerald-700"
                >
                  {isSettlingTerm
                    ? 'Processando...'
                    : 'Confirmar Recebimento (Gerar Saldo)'}
                </Button>

                <div className="relative my-1">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-200 dark:border-slate-800" />
                  </div>
                  <div className="relative flex justify-center text-[10px] font-black uppercase">
                    <span className="bg-white px-2 text-slate-400 dark:bg-slate-900">
                      Ou
                    </span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={() => handleSettleTerm(true)}
                  disabled={isSettlingTerm}
                  className="w-full rounded-xl border-orange-200 text-xs font-black uppercase text-orange-700 hover:bg-orange-50 dark:border-orange-900/50 dark:text-orange-400"
                  title="Remove da lista sem somar dinheiro real no saldo da empresa"
                >
                  Baixar Sem Gerar Saldo (Permuta / Perdão)
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 3: GERAR RELATÓRIO / COBRANÇA EM PDF (A PRAZO) */}
      {/* ========================================================================= */}
      <TermReportModal
        open={reportModalOpen}
        onOpenChange={setReportModalOpen}
        currentMonthDate={selectedMonthDate}
        pendingItems={allPendingTerms}
        clients={clients}
        employees={employees}
      />
    </>
  )
}
