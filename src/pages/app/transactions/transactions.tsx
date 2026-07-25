import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  ChevronRight,
  Clock,
  Inbox,
  Plus,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useSearchParams } from 'react-router-dom'
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

  // Limpar todos os filtros ao entrar na página (mount)
  useEffect(() => {
    setSearchParams(
      (state) => {
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
  const [isOverdueExpanded, setIsOverdueExpanded] = useState(true)

  useEffect(() => {
    let timeout: NodeJS.Timeout
    if (isOverdueExpanded) {
      timeout = setTimeout(() => {
        setIsOverdueExpanded(false)
      }, 5000)
    }
    return () => clearTimeout(timeout)
  }, [isOverdueExpanded])

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
        const cleanDesc = item.description ? item.description.replace(/\s*-\s*[^-]+$/, '') : 'Fechamento de Caixa'
        result.push({
          ...item,
          description: cleanDesc,
          accounts: item.accounts?.name ? item.accounts : { name: 'Caixa / Bancos' }
        })
      } else {
        const first = groupItems[0]
        const totalSum = groupItems.reduce((acc, curr) => acc + Number(curr.amount || 0), 0)
        const cleanDesc = first.description ? first.description.replace(/\s*-\s*[^-]+$/, '') : 'Fechamento de Caixa'
        
        result.push({
          ...first,
          id: `cashier-group-${sessionId}`,
          description: `Lote de Caixa — ${cleanDesc}`,
          amount: totalSum,
          totalValue: totalSum,
          accounts: { name: 'Vários Bancos' },
          childTransactions: groupItems,
          isCashierGroup: true,
          cashier_session_id: sessionId
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
      <Helmet title="Transações" />
      <div className="flex flex-col gap-6 px-5 font-manrope md:px-0">
        <PageHeader
          title="Transações"
          description="Gerencie suas receitas, despesas e transferências."
        >
          <div className="mb-8 flex w-full flex-col items-center gap-3 sm:flex-row md:mb-0 md:w-auto">
            <Button
              variant="outline"
              className="relative h-12 w-full rounded-2xl px-6 py-2 font-bold shadow-sm transition-all hover:bg-slate-100 dark:hover:bg-slate-800 md:h-10 md:w-auto md:rounded-xl"
              onClick={() => setIsPendingReceiptsOpen(true)}
            >
              <Inbox className="mr-2 h-5 w-5" />
              <span>Caixa de Comprovantes</span>
              {pendingCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 animate-pulse items-center justify-center rounded-full bg-rose-500 text-xs font-black text-white ring-2 ring-background">
                  {pendingCount}
                </span>
              )}
            </Button>

            <Popover open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <PopoverTrigger asChild>
                <Button
                  aria-label="Adicionar"
                  className="h-12 w-full rounded-2xl bg-slate-900 px-6 py-2 font-bold text-white shadow-xl transition-all hover:bg-slate-800 md:h-10 md:w-auto md:rounded-xl"
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
          <TabsList className="flex h-auto w-full rounded-2xl border border-slate-200/50 bg-slate-100/50 p-1.5 dark:border-slate-700/50 dark:bg-slate-800/50">
            <TabsTrigger
              value="payable"
              className="flex-1 rounded-xl py-3 text-xs font-bold tracking-tight transition-all data-[state=active]:bg-white data-[state=active]:text-amber-600 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-900 sm:text-sm md:text-base"
            >
              <Clock className="mr-1 h-4 w-4 md:mr-2" />
              Pendência {payableCount !== null ? `(${payableCount})` : ''}
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="flex-1 rounded-xl py-3 text-xs font-bold tracking-tight transition-all data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-900 sm:text-sm md:text-base"
            >
              <CheckCircle2 className="mr-1 h-4 w-4 md:mr-2" />
              Histórico {historyCount !== null ? `(${historyCount})` : ''}
            </TabsTrigger>
            <TabsTrigger
              value="transfers"
              className="flex-1 rounded-xl py-3 text-xs font-bold tracking-tight transition-all data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-900 sm:text-sm md:text-base"
            >
              <ArrowRightLeft className="mr-1 hidden h-4 w-4 sm:block md:mr-2" />
              Transferência
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-4">
          {activeTab === 'payable' && overdueTotal > 0 && (
            <AnimatePresence mode="wait">
              {isOverdueExpanded ? (
                <motion.div
                  key="expanded"
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50, height: 0, overflow: 'hidden' }}
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
                  <Button
                    className="w-full shrink-0 rounded-xl bg-amber-600 font-bold text-white shadow-lg shadow-amber-600/20 hover:bg-amber-700 sm:w-auto"
                    onClick={() => setIsOverdueModalOpen(true)}
                  >
                    Visualizar Vencidos
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="collapsed"
                  layout
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="w-fit"
                >
                  <Button
                    variant="outline"
                    className="flex h-10 items-center gap-2 rounded-full border-amber-200 bg-amber-50 pl-3 pr-4 text-amber-700 shadow-sm hover:bg-amber-100 hover:text-amber-800"
                    onClick={() => setIsOverdueExpanded(true)}
                  >
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-bold">Contas em Atraso</span>
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {activeTab !== 'transfers' && (
            <div className="w-full">
              <TransactionTableFilters>
                {activeTab === 'payable' && (
                  <div className="flex w-full items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 py-1.5 pl-4 pr-1.5 transition-all focus-within:ring-2 focus-within:ring-indigo-500/20 dark:border-slate-700/50 dark:bg-slate-800/50">
                    <span className="hidden shrink-0 text-xs font-black uppercase tracking-widest text-slate-400 sm:inline">
                      Ciclo
                    </span>
                    <Select
                      value={timeHorizon}
                      onValueChange={(val: any) => setTimeHorizon(val)}
                    >
                      <SelectTrigger className="h-8 w-full min-w-0 rounded-xl border-none text-sm font-bold text-slate-700 shadow-none focus:ring-0 dark:text-slate-300">
                        <SelectValue placeholder="Selecione o período" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-none shadow-2xl">
                        <SelectItem value="7" className="text-sm font-bold">
                          Próximos 7 dias
                        </SelectItem>
                        <SelectItem value="15" className="text-sm font-bold">
                          Próximos 15 dias
                        </SelectItem>
                        <SelectItem value="30" className="text-sm font-bold">
                          Próximos 30 dias
                        </SelectItem>
                        <SelectItem value="all" className="text-sm font-bold">
                          Todas as Pendentes
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {activeTab === 'history' && (
                  <div className="flex w-full items-center gap-3">
                    <MonthPicker date={historyDate} setDate={setHistoryDate} />
                    <Button
                      variant="outline"
                      className="h-10 flex-1 rounded-2xl border-indigo-200 px-4 font-bold text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 sm:flex-none md:h-11"
                      onClick={() => setIsSummaryOpen(true)}
                    >
                      Resumo Consolidado
                    </Button>
                    <MonthlySummaryDialog
                      open={isSummaryOpen}
                      onOpenChange={setIsSummaryOpen}
                      month={historyDate}
                    />
                  </div>
                )}
              </TransactionTableFilters>
            </div>
          )}

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
                        <TableHead className="w-[60px] py-5 pl-8">
                          <Checkbox
                            checked={
                              transactionsResult?.data.transactions.transactions
                                .length! > 0 &&
                              selectedIds.length ===
                                transactionsResult?.data.transactions
                                  .transactions.length
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
                    displayTransactions.map(
                      (transaction: any) => {
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
                      },
                    )}

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
                                {transfer.transaction.accounts?.name ||
                                  'Origem'}
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
      </div>
    </>
  )
}
