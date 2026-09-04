import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  FileText,
  Inbox,
  Plus,
  Search,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'

import { bulkPayTransactions } from '@/api/bulk-pay-transactions'
import { getFinanceMetrics } from '@/api/get-finance-metrics'
import { getTransactions } from '@/api/get-transactions'
import { MonthPicker } from '@/components/MonthPicker'
import { PageHeader } from '@/components/page-header'
import { Pagination } from '@/components/pagination'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/custom-tabs'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'
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
import { api } from '@/lib/axios'
import { OverdueTransactionsModal } from '@/pages/app/dashboard/overdue-transactions-modal'

import { CashierBatchDetailsModal } from './components/cashier-batch-details-modal'
import { LinkReceiptModal } from './components/link-receipt-modal'
import { MonthlySummaryDialog } from './components/monthly-summary-dialog'
import { PendingReceiptsModal } from './components/pending-receipts-modal'
import { TransactionTableBulkActions } from './components/transaction-table-bulk-actions'
import { TransactionExpense } from './transaction-expense'
import { TransactionIncome } from './transaction-income'
import {
  TransactionMobileCard,
  TransactionTableRow,
} from './transaction-table-row'
import { TransactionTransfer } from './transaction-transfer'
import { TransactionTableFilters } from './TransactionTableFilters'

export function Transactions() {
  const [searchParams, setSearchParams] = useSearchParams()

  const [openBatchId, setOpenBatchId] = useState<string | null>(null)

  // Limpar todos os filtros ao entrar na página (mount)
  useEffect(() => {
    const batchId = searchParams.get('openBatch')
    if (batchId) {
      setOpenBatchId(batchId)
    }

    setSearchParams(
      (state) => {
        state.delete('openBatch')
        state.delete('description')
        state.delete('value')
        state.delete('sectorId')
        state.delete('accountId')
        state.delete('supplierId')
        state.delete('type')
        state.delete('sortBy')
        state.delete('sortDirection')
        state.delete('checked')
        state.set('page', '1')
        return state
      },
      { replace: true },
    )
  }, [])

  const [isExpenseOpen, setIsExpenseOpen] = useState(false)
  const [isIncomeOpen, setIsIncomeOpen] = useState(false)
  const [isTransferOpen, setIsTransferOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const [isPendingReceiptsOpen, setIsPendingReceiptsOpen] = useState(false)
  const [selectedReceiptForExpense, setSelectedReceiptForExpense] =
    useState<any>(null)

  const [isLinkReceiptOpen, setIsLinkReceiptOpen] = useState(false)
  const [selectedReceiptForLink, setSelectedReceiptForLink] =
    useState<any>(null)

  const [isOverdueModalOpen, setIsOverdueModalOpen] = useState(false)
  const [isSummaryOpen, setIsSummaryOpen] = useState(false)
  const [isOverdueExpanded, setIsOverdueExpanded] = useState(false)
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false)

  // Query to fetch pending receipts count
  const { data: receiptsData } = useQuery({
    queryKey: ['pending-receipts'],
    queryFn: async () => {
      const response = await api.get('/uploads/receipts')
      return response.data
    },
  })
  const pendingCount = receiptsData?.receipts?.length ?? 0

  const [payableCount, setPayableCount] = useState<number | null>(null)
  const [historyCount, setHistoryCount] = useState<number | null>(null)

  const { data: metricsData } = useQuery({
    queryKey: ['finance-metrics-overdue'],
    queryFn: () => getFinanceMetrics(),
  })
  const overdueExpenses = metricsData?.despesaVencida ?? 0
  const overdueIncomes = metricsData?.receitaVencida ?? 0
  const overdueTotal = overdueExpenses + overdueIncomes

  let overdueText = ''
  if (overdueIncomes > 0 && overdueExpenses > 0) {
    overdueText = `Você possui ${overdueIncomes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} a receber e ${overdueExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} a pagar.`
  } else if (overdueIncomes > 0) {
    overdueText = `Você possui ${overdueIncomes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} a receber.`
  } else if (overdueExpenses > 0) {
    overdueText = `Você possui ${overdueExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} a pagar.`
  }

  // Tab State: 'payable' | 'history' | 'transfers'
  const [activeTab, setActiveTab] = useState<
    'payable' | 'history' | 'transfers'
  >('payable')

  // History Month Navigation
  const [historyDate, setHistoryDate] = useState<Date>(new Date())

  // Time Horizon State
  const [timeHorizon, setTimeHorizon] = useState<
    '7' | '15' | '30' | 'all' | 'custom'
  >('7')
  const [customDate] = useState<Date | undefined>(undefined)

  const description = searchParams.get('description')
  const value = searchParams.get('value')
  const sectorId = searchParams.get('sectorId')
  const accountId = searchParams.get('accountId')
  const supplierId = searchParams.get('supplierId')
  const type = searchParams.get('type')
  const sortBy = searchParams.get('sortBy')
  const sortDirection = searchParams.get('sortDirection')
  const checked = searchParams.get('checked')
  const perPage = searchParams.get('per_page')
    ? Number(searchParams.get('per_page'))
    : 6

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const queryClient = useQueryClient()

  const { mutateAsync: bulkPay, isPending: isBulkPaying } = useMutation({
    mutationFn: bulkPayTransactions,
    onSuccess: () => {
      toast.success('Transações marcadas como pagas!')
      setSelectedIds([])
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['summary'] })
    },
    onError: () => {
      toast.error('Erro ao processar pagamentos em massa.')
    },
  })

  function handleBulkPay() {
    bulkPay({ transactionIds: selectedIds }).catch((error) => {
      console.error('Failed to bulk pay', error)
    })
  }

  function handleSelectAll(checked: boolean, transactions: any[]) {
    if (checked) {
      const allIds = transactions.map((t: any) => t.id)
      setSelectedIds(allIds)
    } else {
      setSelectedIds([])
    }
  }

  function handleSelectOne(checked: boolean, id: string) {
    if (checked) {
      setSelectedIds((prev) => [...prev, id])
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id))
    }
  }

  function handlePerPageChange(value: string) {
    setSearchParams((state) => {
      state.set('per_page', value)
      state.set('page', '1')
      return state
    })
  }

  const currentPage = z.coerce.number().parse(searchParams.get('page') ?? '1')

  // Calculate toDate and fromDate based on horizon
  let toDate
  let fromDate
  if (activeTab === 'payable') {
    const now = new Date()
    // Set fromDate to the start of today for upcoming cycle limits
    const startOfToday = new Date(now)
    startOfToday.setHours(0, 0, 0, 0)

    if (timeHorizon === '7') {
      fromDate = startOfToday
      const targetDate = new Date(startOfToday)
      targetDate.setDate(targetDate.getDate() + 7)
      targetDate.setHours(23, 59, 59, 999)
      toDate = targetDate
    } else if (timeHorizon === '15') {
      fromDate = startOfToday
      const targetDate = new Date(startOfToday)
      targetDate.setDate(targetDate.getDate() + 15)
      targetDate.setHours(23, 59, 59, 999)
      toDate = targetDate
    } else if (timeHorizon === '30') {
      fromDate = startOfToday
      const targetDate = new Date(startOfToday)
      targetDate.setDate(targetDate.getDate() + 30)
      targetDate.setHours(23, 59, 59, 999)
      toDate = targetDate
    } else if (timeHorizon === 'all') {
      fromDate = undefined
      toDate = undefined
    } else if (timeHorizon === 'custom' && customDate) {
      fromDate = startOfToday
      toDate = customDate
    }
  }

  // Query for Transactions (Payable/History)
  const { data: transactionsResult } = useQuery({
    queryKey: [
      'transactions',
      currentPage,
      description,
      value,
      sectorId,
      accountId,
      activeTab, // Re-fetch when tab changes
      timeHorizon,
      customDate,
      perPage,
      supplierId,
      type,
      historyDate, // Re-fetch when history month changes
      sortBy,
      sortDirection,
      checked,
    ],
    queryFn: () =>
      getTransactions({
        page: currentPage,
        perPage,
        description,
        value: value ? Number(value) : null,
        sectorId: sectorId === 'all' ? null : sectorId,
        accountId,
        supplierId: supplierId === 'all' ? null : supplierId,
        type: type === 'all' ? null : type,
        status: activeTab === 'payable' ? 'pending' : 'completed',
        toDate: activeTab === 'payable' ? toDate?.toISOString() : undefined, // Pass toDate only for payable
        fromDate: activeTab === 'payable' ? fromDate?.toISOString() : undefined, // Pass fromDate only for payable
        month: activeTab === 'history' ? historyDate.toISOString() : undefined, // Pass month only for history
        sortBy: sortBy || undefined,
        sortDirection: sortDirection || undefined,
        checked: checked || undefined,
      }),
    refetchOnWindowFocus: 'always',
    enabled: activeTab !== 'transfers',
  })

  // Synchronize Tab counters
  useEffect(() => {
    if (transactionsResult?.data?.transactions) {
      const count = transactionsResult.data.transactions.totalCount
      if (activeTab === 'payable') {
        setPayableCount(count)
      } else if (activeTab === 'history') {
        setHistoryCount(count)
      }
    }
  }, [transactionsResult, activeTab])

  // Query for Transfers
  const { data: transfersResult } = useQuery({
    queryKey: ['transfers'],
    queryFn: () =>
      import('@/api/get-transfer-transactions').then((mod) =>
        mod.getTransferTransactions(),
      ),
    enabled: activeTab === 'transfers',
  })

  const displayTransactions = useMemo(() => {
    const list = transactionsResult?.data?.transactions?.transactions || []
    if (!list.length) return []

    const cashierMap = new Map<string, any[]>()
    const result: any[] = []

    for (const item of list) {
      if (item.cashier_session_id) {
        const group = cashierMap.get(item.cashier_session_id) || []
        group.push(item)
        cashierMap.set(item.cashier_session_id, group)
      } else {
        result.push(item)
      }
    }

    for (const [sessionId, groupItems] of cashierMap.entries()) {
      if (groupItems.length === 1) {
        const item = groupItems[0]
        const cleanDesc = item.description
          ? item.description.replace(/\s*-\s*[^-]+$/, '')
          : 'Fechamento de Caixa'
        result.push({
          ...item,
          description: cleanDesc,
          accounts: item.accounts?.name
            ? item.accounts
            : { name: 'Caixa / Bancos' },
        })
      } else {
        const first = groupItems[0]
        const totalSum = groupItems.reduce(
          (acc, curr) => acc + Number(curr.amount || 0),
          0,
        )
        const cleanDesc = first.description
          ? first.description.replace(/\s*-\s*[^-]+$/, '')
          : 'Fechamento de Caixa'

        result.push({
          ...first,
          id: `cashier-group-${sessionId}`,
          description: `Lote de Caixa — ${cleanDesc}`,
          amount: totalSum,
          totalValue: totalSum,
          accounts: { name: 'Vários Bancos' },
          childTransactions: groupItems,
          isCashierGroup: true,
          cashier_session_id: sessionId,
        })
      }
    }

    return result
  }, [transactionsResult])

  function handlePaginate(newPageIndex: number) {
    setSearchParams((state) => {
      state.set('page', (newPageIndex + 1).toString())
      return state
    })
  }

  return (
    <>
      <Helmet title="Transações Financeiras" />
      <div className="flex flex-col gap-3.5 px-5 font-manrope md:px-0">
        <PageHeader
          title="Transações Financeiras"
          description="Gerencie suas receitas, despesas e transferências."
        >
          <div className="mb-8 flex w-full flex-row items-center justify-between gap-2 md:mb-0 md:w-auto md:justify-end md:gap-3">
            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="relative h-12 w-12 rounded-2xl px-0 shadow-sm transition-all hover:bg-slate-100 dark:hover:bg-slate-800 sm:w-auto sm:px-4 md:h-10 md:rounded-xl"
                onClick={() => setIsPendingReceiptsOpen(true)}
                title="Comprovantes"
              >
                <Inbox className="h-5 w-5 sm:mr-2" />
                <span className="hidden font-bold sm:inline">Comprovantes</span>
                {pendingCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 animate-pulse items-center justify-center rounded-full bg-rose-500 text-xs font-black text-white ring-2 ring-background">
                    {pendingCount}
                  </span>
                )}
              </Button>

              <Button
                variant="ghost"
                className="h-12 w-12 rounded-2xl px-0 shadow-sm transition-all hover:bg-slate-100 dark:hover:bg-slate-800 sm:w-auto sm:px-4 md:h-10 md:rounded-xl"
                asChild
                title="Recebíveis"
              >
                <Link to="/transactions/settlements">
                  <CreditCard className="h-5 w-5 sm:mr-2" />
                  <span className="hidden font-bold sm:inline">Recebíveis</span>
                </Link>
              </Button>
            </div>

            <Popover open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <PopoverTrigger asChild>
                <Button
                  aria-label="Adicionar"
                  className="h-12 flex-1 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 py-2 font-bold text-white shadow-xl shadow-indigo-500/30 transition-all hover:from-indigo-700 hover:to-indigo-600 md:h-10 md:flex-none md:rounded-xl"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  <span>Nova Transação</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-80 rounded-2xl border-none bg-white/95 p-2 shadow-2xl backdrop-blur-md dark:bg-slate-900/95"
                side="bottom"
                align="end"
              >
                <Button
                  aria-label="Adicionar Despesa"
                  variant="ghost"
                  className="flex w-full items-center justify-start rounded-xl p-3 font-bold text-slate-800 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-slate-100 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
                  onClick={() => {
                    setIsMenuOpen(false)
                    setIsExpenseOpen(true)
                  }}
                >
                  <TrendingDown className="mr-3 h-5 w-5 text-rose-500" />
                  Despesa
                </Button>
                <Button
                  aria-label="Adicionar Receita"
                  variant="ghost"
                  className="flex w-full items-center justify-start rounded-xl p-3 font-bold text-slate-800 transition-colors hover:bg-emerald-50 hover:text-emerald-600 dark:text-slate-100 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-400"
                  onClick={() => {
                    setIsMenuOpen(false)
                    setIsIncomeOpen(true)
                  }}
                >
                  <TrendingUp className="mr-3 h-5 w-5 text-emerald-500" />
                  Receita
                </Button>
                <Button
                  variant="ghost"
                  className="flex w-full items-center justify-start rounded-xl p-3 font-bold text-slate-800 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:text-slate-100 dark:hover:bg-blue-950/50 dark:hover:text-blue-400"
                  aria-label="Adicionar Transação"
                  onClick={() => {
                    setIsMenuOpen(false)
                    setIsTransferOpen(true)
                  }}
                >
                  <ArrowRightLeft className="mr-3 h-5 w-5 text-blue-500" />
                  Transferência
                </Button>
              </PopoverContent>
            </Popover>
          </div>

          <ResponsiveDialog
            open={isExpenseOpen}
            onOpenChange={(open) => {
              setIsExpenseOpen(open)
              if (!open) setSelectedReceiptForExpense(null)
            }}
          >
            <TransactionExpense
              open={isExpenseOpen}
              initialReceipt={selectedReceiptForExpense}
              onOpenChange={(open) => {
                setIsExpenseOpen(open)
                if (!open) setSelectedReceiptForExpense(null)
              }}
            />
          </ResponsiveDialog>

          <PendingReceiptsModal
            open={isPendingReceiptsOpen}
            onOpenChange={setIsPendingReceiptsOpen}
            onLinkToExisting={(receipt) => {
              setSelectedReceiptForLink(receipt)
              setIsLinkReceiptOpen(true)
            }}
            onCreateNew={(receipt) => {
              setSelectedReceiptForExpense(receipt)
              setIsExpenseOpen(true)
            }}
          />

          {selectedReceiptForLink && (
            <LinkReceiptModal
              open={isLinkReceiptOpen}
              onOpenChange={setIsLinkReceiptOpen}
              receipt={selectedReceiptForLink}
            />
          )}

          <ResponsiveDialog open={isIncomeOpen} onOpenChange={setIsIncomeOpen}>
            <TransactionIncome open={isIncomeOpen} />
          </ResponsiveDialog>

          <ResponsiveDialog
            open={isTransferOpen}
            onOpenChange={setIsTransferOpen}
          >
            <TransactionTransfer open={isTransferOpen} />
          </ResponsiveDialog>

          <OverdueTransactionsModal
            open={isOverdueModalOpen}
            onOpenChange={setIsOverdueModalOpen}
          />
        </PageHeader>

        {/* CARDS DE RESUMO FINANCEIRO (COCKPIT) */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {/* Card 1: A Pagar */}
          <div className="rounded-2xl border border-rose-200/80 bg-gradient-to-br from-rose-50/70 to-white p-3.5 shadow-xs dark:border-rose-950/40 dark:from-rose-950/25 dark:to-slate-900 sm:p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-400">
                A Pagar (Pendente)
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">
                <TrendingDown size={16} />
              </div>
            </div>
            <p className="mt-2 text-xl font-black tabular-nums tracking-tight text-rose-950 dark:text-rose-100 sm:text-2xl">
              {(metricsData?.aPagar ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
            <div className="mt-1 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 border-t border-rose-100/80 pt-1 dark:border-slate-800">
              <span>{payableCount ?? 0} pendências</span>
              <span>Saídas</span>
            </div>
          </div>

          {/* Card 2: A Receber */}
          <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/70 to-white p-3.5 shadow-xs dark:border-emerald-950/40 dark:from-emerald-950/25 dark:to-slate-900 sm:p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                A Receber (Previsão)
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                <TrendingUp size={16} />
              </div>
            </div>
            <p className="mt-2 text-xl font-black tabular-nums tracking-tight text-emerald-950 dark:text-emerald-100 sm:text-2xl">
              {(metricsData?.aReceber ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
            <div className="mt-1 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 border-t border-emerald-100/80 pt-1 dark:border-slate-800">
              <span>Entradas a confirmar</span>
              <span>Receitas</span>
            </div>
          </div>

          {/* Card 3: Atrasado */}
          <div
            className={cn(
              "rounded-2xl border p-3.5 shadow-xs transition-all sm:p-4",
              overdueTotal > 0
                ? "border-amber-300/90 bg-gradient-to-br from-amber-50/80 to-white dark:border-amber-900/50 dark:from-amber-950/30 dark:to-slate-900 cursor-pointer hover:shadow-sm"
                : "border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900"
            )}
            onClick={() => overdueTotal > 0 && setIsOverdueModalOpen(true)}
          >
            <div className="flex items-center justify-between">
              <span className={cn(
                "text-[11px] font-black uppercase tracking-wider",
                overdueTotal > 0 ? "text-amber-700 dark:text-amber-400" : "text-slate-500 dark:text-slate-400"
              )}>
                Contas Vencidas
              </span>
              <div className={cn(
                "flex h-7 w-7 items-center justify-center rounded-xl",
                overdueTotal > 0 ? "bg-amber-500/15 text-amber-600 dark:bg-amber-500/25 dark:text-amber-400" : "bg-slate-100 text-slate-500 dark:bg-slate-800"
              )}>
                <AlertTriangle size={16} />
              </div>
            </div>
            <p className={cn(
              "mt-2 text-xl font-black tabular-nums tracking-tight sm:text-2xl",
              overdueTotal > 0 ? "text-amber-950 dark:text-amber-200" : "text-slate-900 dark:text-slate-100"
            )}>
              {overdueTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
            <div className="mt-1 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 border-t border-amber-100/80 pt-1 dark:border-slate-800">
              <span>{overdueTotal > 0 ? 'Clique para auditar' : 'Sem atrasos'}</span>
              <span>Atenção</span>
            </div>
          </div>

          {/* Card 4: Saldo Disponível */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Saldo Disponível
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                <Wallet size={16} />
              </div>
            </div>
            <p className="mt-2 text-xl font-black tabular-nums tracking-tight text-slate-900 dark:text-slate-100 sm:text-2xl">
              {(metricsData?.saldoDisponivel ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
            <div className="mt-1 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 border-t border-slate-100 pt-1 dark:border-slate-800">
              <span>Bancos e Caixas</span>
              <span>Total</span>
            </div>
          </div>
        </div>

        {/* TABS HEADER */}
        <Tabs
          value={activeTab}
          onValueChange={(val) => {
            setActiveTab(val as any)
            setSearchParams((state) => {
              state.set('page', '1')
              return state
            })
          }}
          className="w-full"
        >
          <TabsList className="flex h-10 w-full rounded-xl border border-slate-200/50 bg-slate-100/50 p-1 dark:border-slate-700/50 dark:bg-slate-800/50">
            <TabsTrigger
              value="payable"
              className="flex-1 rounded-lg py-1.5 text-xs font-bold tracking-tight transition-all data-[state=active]:bg-white data-[state=active]:text-amber-600 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-900 sm:text-sm"
            >
              <Clock className="mr-1 h-4 w-4 md:mr-2" />
              Pendência {payableCount !== null ? `(${payableCount})` : ''}
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="flex-1 rounded-lg py-1.5 text-xs font-bold tracking-tight transition-all data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-900 sm:text-sm"
            >
              <CheckCircle2 className="mr-1 h-4 w-4 md:mr-2" />
              Histórico {historyCount !== null ? `(${historyCount})` : ''}
            </TabsTrigger>
            <TabsTrigger
              value="transfers"
              className="flex-1 rounded-lg py-1.5 text-xs font-bold tracking-tight transition-all data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-900 sm:text-sm"
            >
              <ArrowRightLeft className="mr-1 hidden h-4 w-4 sm:block md:mr-2" />
              Transferência
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <AnimatePresence>
              {activeTab === 'payable' &&
                overdueTotal > 0 &&
                !isOverdueExpanded && (
                  <motion.div
                    key="collapsed-overdue"
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Button
                      variant="outline"
                      className="flex h-10 items-center gap-2 rounded-full border-amber-200 bg-amber-50 pl-3 pr-4 text-amber-700 shadow-sm hover:bg-amber-100 hover:text-amber-800"
                      onClick={() => setIsOverdueExpanded(true)}
                    >
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm font-bold">
                        Atrasado:{' '}
                        {overdueTotal.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </span>
                    </Button>
                  </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
              {activeTab !== 'transfers' && !isFiltersExpanded && (
                <motion.div
                  key="collapsed-filters"
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <Button
                    variant="outline"
                    className="flex h-10 items-center gap-2 rounded-full border-slate-200 bg-slate-50 pl-3 pr-4 text-slate-700 shadow-sm hover:bg-slate-100 hover:text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                    onClick={() => setIsFiltersExpanded(true)}
                  >
                    <Search className="h-4 w-4 shrink-0" />
                    <span className="text-sm font-bold">Filtros e Buscas</span>
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {activeTab === 'history' && !isFiltersExpanded && (
                <motion.div
                  key="pdf-summary"
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <Button
                    variant="outline"
                    className="flex h-10 items-center gap-2 rounded-full border-indigo-200 bg-indigo-50 pl-3 pr-4 text-indigo-700 shadow-sm hover:bg-indigo-100 hover:text-indigo-800"
                    onClick={() => setIsSummaryOpen(true)}
                  >
                    <FileText className="h-4 w-4 shrink-0" />
                    <span className="text-sm font-bold">Resumo em PDF</span>
                  </Button>
                  <MonthlySummaryDialog
                    open={isSummaryOpen}
                    onOpenChange={setIsSummaryOpen}
                    month={historyDate}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {activeTab === 'payable' &&
              overdueTotal > 0 &&
              isOverdueExpanded && (
                <motion.div
                  key="expanded-overdue"
                  layout
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -10, height: 0, overflow: 'hidden' }}
                  transition={{ duration: 0.3 }}
                  className="flex w-full flex-col items-start justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm sm:flex-row sm:items-center"
                >
                  <div className="flex w-full min-w-0 flex-1 items-start gap-3 text-amber-700 sm:items-center">
                    <AlertTriangle
                      className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer sm:mt-0 sm:h-6 sm:w-6"
                      onClick={() => setIsOverdueExpanded(false)}
                      title="Ocultar aviso"
                    />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="break-words text-sm font-bold leading-tight sm:text-base">
                        Atenção: Existem transações em atraso!
                      </span>
                      <span className="mt-0.5 break-words text-xs font-medium text-amber-700/80">
                        {overdueText}
                      </span>
                    </div>
                  </div>
                  <div className="flex w-full gap-2 sm:w-auto">
                    <Button
                      variant="ghost"
                      className="h-10 flex-1 rounded-xl text-amber-700 hover:bg-amber-200/50 sm:flex-none"
                      onClick={() => setIsOverdueExpanded(false)}
                    >
                      Ocultar
                    </Button>
                    <Button
                      className="h-10 flex-1 shrink-0 rounded-xl bg-amber-600 font-bold text-white shadow-lg shadow-amber-600/20 hover:bg-amber-700 sm:w-auto sm:flex-none"
                      onClick={() => setIsOverdueModalOpen(true)}
                    >
                      Visualizar Vencidos
                    </Button>
                  </div>
                </motion.div>
              )}
          </AnimatePresence>

          <AnimatePresence>
            {activeTab !== 'transfers' && isFiltersExpanded && (
              <motion.div
                key="expanded-filters"
                layout
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -10, height: 0, overflow: 'hidden' }}
                transition={{ duration: 0.3 }}
                className="relative w-full"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute -right-3 -top-3 z-10 h-8 w-8 rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:text-slate-800 dark:border-slate-800 dark:bg-slate-900"
                  onClick={() => setIsFiltersExpanded(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
                <TransactionTableFilters>
                  {activeTab === 'payable' && (
                    <div className="flex w-full items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 py-1.5 pl-4 pr-1.5 transition-all focus-within:ring-2 focus-within:ring-indigo-500/20 dark:border-slate-700/50 dark:bg-slate-800/50">
                      <span className="hidden shrink-0 text-[10px] font-black uppercase tracking-widest text-slate-400 sm:inline">
                        Ciclo
                      </span>
                      <div className="flex w-full items-center gap-1 rounded-xl bg-slate-100 p-0.5 dark:bg-slate-900/50">
                        {[
                          { value: '7', label: '7d' },
                          { value: '15', label: '15d' },
                          { value: '30', label: '30d' },
                          { value: 'all', label: '∞' },
                        ].map((item) => (
                          <button
                            key={item.value}
                            onClick={() => setTimeHorizon(item.value as any)}
                            className={`flex h-7 flex-1 items-center justify-center rounded-lg text-xs font-bold transition-all ${
                              timeHorizon === item.value
                                ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-400'
                                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {activeTab === 'history' && (
                    <div className="flex w-full items-center gap-3">
                      <MonthPicker
                        date={historyDate}
                        setDate={setHistoryDate}
                      />
                    </div>
                  )}
                </TransactionTableFilters>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="overflow-hidden border-none bg-transparent md:rounded-3xl md:bg-white md:px-2 md:shadow-sm dark:md:bg-slate-900">
          {/* DESKTOP TABLE */}
          <div className="hidden overflow-x-auto md:block">
            <Table className="w-full">
              <TableHeader>
                <TableRow className="border-none bg-slate-50/50 hover:bg-slate-50/50 dark:bg-slate-800/50">
                  {/* Different Headers for Transfers */}
                  {activeTab === 'transfers' ? (
                    <>
                      <TableHead className="w-1/6 py-5 pl-8 text-xs font-bold uppercase tracking-widest text-slate-500 sm:text-sm">
                        Data
                      </TableHead>
                      <TableHead className="w-2/6 text-xs font-bold uppercase tracking-widest text-slate-500 sm:text-sm">
                        Descrição
                      </TableHead>
                      <TableHead className="w-1/6 text-xs font-bold uppercase tracking-widest text-slate-500 sm:text-sm">
                        Origem
                      </TableHead>
                      <TableHead className="w-1/6 text-xs font-bold uppercase tracking-widest text-slate-500 sm:text-sm">
                        Destino
                      </TableHead>
                      <TableHead className="w-1/6 pr-8 text-right text-xs font-bold uppercase tracking-widest text-slate-500 sm:text-sm">
                        Valor
                      </TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead className="w-[60px] py-2.5 pl-8">
                        <Checkbox
                          checked={
                            transactionsResult?.data.transactions.transactions
                              .length! > 0 &&
                            selectedIds.length ===
                              transactionsResult?.data.transactions.transactions
                                .length
                          }
                          onCheckedChange={(checked) =>
                            handleSelectAll(
                              !!checked,
                              transactionsResult?.data.transactions
                                .transactions || [],
                            )
                          }
                          className="rounded-md border-slate-300"
                        />
                      </TableHead>
                      <TableHead className="w-[140px] text-center text-xs font-bold uppercase tracking-widest text-slate-500 md:text-sm">
                        Controle
                      </TableHead>
                      <TableHead className="w-[120px] text-center text-xs font-bold uppercase tracking-widest text-slate-500 md:text-sm">
                        Vencimento
                      </TableHead>
                      <TableHead className="px-6 text-xs font-bold uppercase tracking-widest text-slate-500 md:text-sm">
                        Descrição da Transação
                      </TableHead>
                      <TableHead className="hidden w-[160px] text-center text-xs font-bold uppercase tracking-widest text-slate-500 md:text-sm lg:table-cell">
                        Fornecedor
                      </TableHead>
                      <TableHead className="hidden w-[140px] text-center text-xs font-bold uppercase tracking-widest text-slate-500 md:text-sm lg:table-cell">
                        Setor
                      </TableHead>
                      <TableHead className="hidden w-[140px] text-center text-xs font-bold uppercase tracking-widest text-slate-500 md:text-sm xl:table-cell">
                        Conta Fluxo
                      </TableHead>
                      <TableHead className="pr-8 text-right text-sm font-black uppercase tracking-widest text-slate-700 md:text-base">
                        Montante
                      </TableHead>
                      <TableHead className="w-[60px] pr-8"></TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeTab !== 'transfers' &&
                  displayTransactions.map((transaction: any) => {
                    return (
                      <TransactionTableRow
                        key={transaction.id}
                        transactions={transaction}
                        customPrefix={
                          <TableCell className="w-[50px] px-4 text-center">
                            <Checkbox
                              checked={selectedIds.includes(transaction.id)}
                              onCheckedChange={(checked) =>
                                handleSelectOne(!!checked, transaction.id)
                              }
                            />
                          </TableCell>
                        }
                      />
                    )
                  })}

                {/* TRANSFERS LIST */}
                {activeTab === 'transfers' &&
                  transfersResult &&
                  transfersResult.transferTransactions
                    .slice((currentPage - 1) * perPage, currentPage * perPage)
                    .map((transfer: any) => {
                      return (
                        <TableRow key={transfer.id}>
                          <TableCell className="font-mono text-xs font-medium">
                            {new Date(
                              transfer.transaction.data_vencimento ??
                                transfer.transaction.date,
                            ).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-medium text-foreground/80">
                            {transfer.transaction.description || '-'}
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-sm font-semibold text-red-700 ring-1 ring-inset ring-red-600/10">
                              {transfer.transaction.accounts?.name || 'Origem'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-sm font-semibold text-green-700 ring-1 ring-inset ring-green-600/10">
                              {transfer.accounts?.name || 'Destino'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {transfer.transaction.amount.toLocaleString(
                              'pt-BR',
                              { style: 'currency', currency: 'BRL' },
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}

                {/* EMPTY STATES */}
                {activeTab !== 'transfers' &&
                  transactionsResult &&
                  transactionsResult.data.transactions.transactions.length ===
                    0 && (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="h-24 text-center text-sm font-medium text-muted-foreground"
                      >
                        Nenhuma transação encontrada nesta categoria.
                      </TableCell>
                    </TableRow>
                  )}
                {activeTab === 'transfers' &&
                  transfersResult &&
                  transfersResult.transferTransactions.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-24 text-center text-sm font-medium text-muted-foreground"
                      >
                        Nenhuma transferência realizada.
                      </TableCell>
                    </TableRow>
                  )}
              </TableBody>
            </Table>
          </div>

          {/* MOBILE CARD LIST */}
          <div className="flex flex-col gap-4 md:hidden">
            {activeTab !== 'transfers' &&
              transactionsResult &&
              transactionsResult.data.transactions.transactions.map(
                (transaction: any) => (
                  <TransactionMobileCard
                    key={transaction.id}
                    transactions={transaction}
                  />
                ),
              )}
          </div>
        </div>

        <div className="flex justify-end">
          <Pagination
            onPageChange={handlePaginate}
            onPerPageChange={handlePerPageChange}
            pageIndex={currentPage - 1}
            totalCount={
              activeTab === 'transfers'
                ? transfersResult
                  ? transfersResult.transferTransactions.length
                  : 0
                : transactionsResult
                  ? transactionsResult.data.transactions.totalCount
                  : 0
            }
            perPage={
              activeTab === 'transfers'
                ? perPage
                : transactionsResult
                  ? transactionsResult.data.transactions.perPage
                  : perPage
            }
          />

          {activeTab !== 'transfers' && (
            <TransactionTableBulkActions
              selectedCount={selectedIds.length}
              onBulkPay={handleBulkPay}
              isPending={isBulkPaying}
              onClearSelection={() => setSelectedIds([])}
            />
          )}
        </div>
      </div>

      <CashierBatchDetailsModal
        open={!!openBatchId}
        onOpenChange={(open) => !open && setOpenBatchId(null)}
        sessionId={openBatchId}
      />
    </>
  )
}
