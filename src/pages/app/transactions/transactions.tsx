import { useQuery } from '@tanstack/react-query'
import { ArrowRightLeft, Plus, TrendingDown, TrendingUp, Clock, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { MonthPicker } from '@/components/MonthPicker'

import { getTransactions } from '@/api/get-transactions'
import { Pagination } from '@/components/pagination'
import { Button } from '@/components/ui/button'
import {
  ResponsiveDialog,
} from '@/components/ui/responsive-dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TransactionExpense } from './transaction-expense'
import { TransactionIncome } from './transaction-income'
import { TransactionTransfer } from './transaction-transfer'
import { TransactionTableRow, TransactionMobileCard } from './transaction-table-row'
import { TransactionTableFilters } from './TransactionTableFilters'
import { PageHeader } from '@/components/page-header'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/custom-tabs'
import { TransactionTableBulkActions } from './components/transaction-table-bulk-actions'
import { bulkPayTransactions } from '@/api/bulk-pay-transactions'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export function Transactions() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isExpenseOpen, setIsExpenseOpen] = useState(false)
  const [isIncomeOpen, setIsIncomeOpen] = useState(false)
  const [isTransferOpen, setIsTransferOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Tab State: 'payable' | 'history' | 'transfers'
  const [activeTab, setActiveTab] = useState<'payable' | 'history' | 'transfers'>('payable')

  // History Month Navigation
  const [historyDate, setHistoryDate] = useState<Date>(new Date())

  // Time Horizon State
  const [timeHorizon, setTimeHorizon] = useState<'7' | '15' | '30' | 'custom'>('7')
  const [customDate] = useState<Date | undefined>(undefined)

  const description = searchParams.get('description')
  const value = searchParams.get('value')
  const sectorId = searchParams.get('sectorId')
  const accountId = searchParams.get('accountId')
  const supplierId = searchParams.get('supplierId')
  const type = searchParams.get('type')
  const perPage = searchParams.get('per_page') ? Number(searchParams.get('per_page')) : 6

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
    }
  })

  function handleBulkPay() {
    bulkPay({ transactionIds: selectedIds })
      .catch((error) => {
        console.error("Failed to bulk pay", error)
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

  const currentPage = z.coerce
    .number()
    .parse(searchParams.get('page') ?? '1')

  // Calculate toDate based on horizon
  let toDate = undefined;
  if (activeTab === 'payable') {
    const now = new Date();
    if (timeHorizon === '7') {
      now.setDate(now.getDate() + 7);
      toDate = now;
    } else if (timeHorizon === '15') {
      now.setDate(now.getDate() + 15);
      toDate = now;
    } else if (timeHorizon === '30') {
      now.setDate(now.getDate() + 30);
      toDate = now;
    } else if (timeHorizon === 'custom' && customDate) {
      toDate = customDate;
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
      historyDate // Re-fetch when history month changes
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
        month: activeTab === 'history' ? historyDate.toISOString() : undefined // Pass month only for history
      }),
    refetchOnWindowFocus: 'always',
    enabled: activeTab !== 'transfers'
  })

  // Query for Transfers
  const { data: transfersResult } = useQuery({
    queryKey: ['transfers'],
    queryFn: () => import('@/api/get-transfer-transactions').then(mod => mod.getTransferTransactions()),
    enabled: activeTab === 'transfers'
  })

  function handlePaginate(newPageIndex: number) {
    setSearchParams((state) => {
      state.set('page', (newPageIndex + 1).toString())
      return state
    })
  }

  return (
    <>
      <Helmet title="Transações" />
      <div className="flex flex-col gap-6 font-manrope px-5 md:px-0">
        <PageHeader title="Transações" description="Gerencie suas receitas, despesas e transferências.">
          <Popover open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <PopoverTrigger asChild>
              <Button
                aria-label="Adicionar"
                className="w-full md:w-auto h-12 md:h-10 px-6 py-2 rounded-2xl md:rounded-xl bg-slate-900 text-white shadow-xl hover:bg-slate-800 transition-all font-bold mb-8 md:mb-0"
              >
                <Plus className="h-5 w-5 mr-2" />
                <span>Nova Transação</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-2 rounded-2xl shadow-2xl border-none bg-white/95 backdrop-blur-md" side="bottom" align="end">
              <Button
                aria-label="Adicionar Despesa"
                variant="ghost"
                className="flex w-full items-center justify-start p-3 rounded-xl transition-colors hover:bg-rose-50 hover:text-rose-600 font-bold"
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
                className="flex w-full items-center justify-start p-3 rounded-xl transition-colors hover:bg-emerald-50 hover:text-emerald-600 font-bold"
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
                className="flex w-full items-center justify-start p-3 rounded-xl transition-colors hover:bg-blue-50 hover:text-blue-600 font-bold"
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

          <ResponsiveDialog open={isExpenseOpen} onOpenChange={setIsExpenseOpen}>
            <TransactionExpense open={isExpenseOpen} />
          </ResponsiveDialog>

          <ResponsiveDialog open={isIncomeOpen} onOpenChange={setIsIncomeOpen}>
            <TransactionIncome open={isIncomeOpen} />
          </ResponsiveDialog>

          <ResponsiveDialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
            <TransactionTransfer open={isTransferOpen} />
          </ResponsiveDialog>
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
          <TabsList className="w-full h-auto p-1.5 bg-slate-100/50 dark:bg-slate-800/50 rounded-2xl flex border border-slate-200/50 dark:border-slate-700/50">
            <TabsTrigger 
              value="payable" 
              className="flex-1 py-3 text-[11px] md:text-sm rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-amber-600 data-[state=active]:shadow-sm transition-all font-bold tracking-tight"
            >
              <Clock className="w-4 h-4 mr-1 md:mr-2" />
              Pendência
            </TabsTrigger>
            <TabsTrigger 
              value="history" 
              className="flex-1 py-3 text-[11px] md:text-sm rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm transition-all font-bold tracking-tight"
            >
              <CheckCircle2 className="w-4 h-4 mr-1 md:mr-2" />
              Histórico
            </TabsTrigger>
            <TabsTrigger 
              value="transfers" 
              className="flex-1 py-3 text-[11px] md:text-sm rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all font-bold tracking-tight"
            >
              <ArrowRightLeft className="w-4 h-4 mr-1 md:mr-2 hidden sm:block" />
              Transferência
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-4">
          {activeTab !== 'transfers' && (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-2">
              <div className="flex-1">
                <TransactionTableFilters />
              </div>

              {/* HORIZON SELECTOR - Only visible in Payable Tab */}
              {activeTab === 'payable' && (
                <div className="flex items-center gap-3 bg-white dark:bg-slate-900 py-1.5 pl-4 pr-1.5 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Ciclo:</span>
                  <Select value={timeHorizon} onValueChange={(val: any) => setTimeHorizon(val)}>
                    <SelectTrigger className="h-8 w-full sm:w-[180px] border-none shadow-none rounded-full text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-xs font-black uppercase tracking-tight">
                      <SelectValue placeholder="Selecione o período" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-2xl">
                      <SelectItem value="7" className="text-xs font-bold">Próximos 7 dias</SelectItem>
                      <SelectItem value="15" className="text-xs font-bold">Próximos 15 dias</SelectItem>
                      <SelectItem value="30" className="text-xs font-bold">Próximos 30 dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* MONTH PICKER - Only visible in History Tab */}
              {activeTab === 'history' && (
                <MonthPicker date={historyDate} setDate={setHistoryDate} />
              )}
            </div>
          )}

          <div className="md:rounded-3xl border-none bg-transparent md:bg-white dark:md:bg-slate-900 overflow-hidden md:shadow-sm md:px-2">
            {/* DESKTOP TABLE */}
            <div className="hidden md:block overflow-x-auto">
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="bg-slate-50/50 dark:bg-slate-800/50 border-none hover:bg-slate-50/50">
                    {/* Different Headers for Transfers */}
                    {activeTab === 'transfers' ? (
                      <>
                        <TableHead className="w-1/6 text-[11px] text-slate-500 font-bold uppercase tracking-widest pl-8 py-5">Data</TableHead>
                        <TableHead className="w-2/6 text-[11px] text-slate-500 font-bold uppercase tracking-widest">Descrição</TableHead>
                        <TableHead className="w-1/6 text-[11px] text-slate-500 font-bold uppercase tracking-widest">Origem</TableHead>
                        <TableHead className="w-1/6 text-[11px] text-slate-500 font-bold uppercase tracking-widest">Destino</TableHead>
                        <TableHead className="w-1/6 text-right text-[11px] text-slate-500 font-bold uppercase tracking-widest pr-8">Valor</TableHead>
                      </>
                    ) : (
                      <>
                        <TableHead className="w-[60px] pl-8 py-5">
                          <Checkbox
                            checked={
                              transactionsResult?.data.transactions.transactions.length! > 0 &&
                              selectedIds.length === transactionsResult?.data.transactions.transactions.length
                            }
                            onCheckedChange={(checked) => handleSelectAll(!!checked, transactionsResult?.data.transactions.transactions || [])}
                            className="rounded-md border-slate-300"
                          />
                        </TableHead>
                        <TableHead className="w-[140px] text-center text-[11px] text-slate-500 font-bold uppercase tracking-widest">
                          Controle
                        </TableHead>
                        <TableHead className="w-[120px] text-center text-[11px] text-slate-500 font-bold uppercase tracking-widest">
                          Vencimento
                        </TableHead>
                        <TableHead className="text-[11px] text-slate-500 font-bold uppercase tracking-widest px-6">
                          Descrição da Transação
                        </TableHead>
                        <TableHead className="w-[140px] text-center text-[11px] text-slate-500 font-bold uppercase tracking-widest hidden md:table-cell">
                          Setor
                        </TableHead>
                        <TableHead className="w-[140px] text-center text-[11px] text-slate-500 font-bold uppercase tracking-widest hidden md:table-cell">
                          Conta Fluxo
                        </TableHead>
                        <TableHead className="text-right text-[12px] text-slate-700 font-black uppercase tracking-widest pr-8">
                          Montante
                        </TableHead>
                        <TableHead className="w-[60px] pr-8"></TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeTab !== 'transfers' && transactionsResult &&
                    transactionsResult.data.transactions.transactions.map(
                      (transaction: any) => {
                        return (
                          <TransactionTableRow
                            key={transaction.id}
                            transactions={transaction}
                            customPrefix={
                              <TableCell className="text-center px-4 w-[50px]">
                                <Checkbox
                                  checked={selectedIds.includes(transaction.id)}
                                  onCheckedChange={(checked) => handleSelectOne(!!checked, transaction.id)}
                                />
                              </TableCell>
                            }
                          />
                        )
                      },
                    )}

                  {/* TRANSFERS LIST */}
                  {activeTab === 'transfers' && transfersResult &&
                    transfersResult.transferTransactions.slice((currentPage - 1) * perPage, currentPage * perPage).map((transfer: any) => {
                      return (
                        <TableRow key={transfer.id}>
                          <TableCell className="font-mono text-xs font-medium">
                            {new Date(transfer.transaction.data_vencimento ?? transfer.transaction.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-foreground/80 font-medium">
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
                            {transfer.transaction.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  }

                  {/* EMPTY STATES */}
                  {activeTab !== 'transfers' && transactionsResult && transactionsResult.data.transactions.transactions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center text-muted-foreground text-sm font-medium">
                        Nenhuma transação encontrada nesta categoria.
                      </TableCell>
                    </TableRow>
                  )}
                  {activeTab === 'transfers' && transfersResult && transfersResult.transferTransactions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground text-sm font-medium">
                        Nenhuma transferência realizada.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* MOBILE CARD LIST */}
            <div className="md:hidden flex flex-col gap-4">
              {activeTab !== 'transfers' && transactionsResult &&
                transactionsResult.data.transactions.transactions.map((transaction: any) => (
                  <TransactionMobileCard key={transaction.id} transactions={transaction} />
                ))
              }
            </div>
          </div>

          <div className="flex justify-end">
            <Pagination
              onPageChange={handlePaginate}
              onPerPageChange={handlePerPageChange}
              pageIndex={currentPage - 1}
              totalCount={
                activeTab === 'transfers'
                  ? (transfersResult ? transfersResult.transferTransactions.length : 0)
                  : (transactionsResult ? transactionsResult.data.transactions.totalCount : 0)
              }
              perPage={
                activeTab === 'transfers'
                  ? perPage
                  : (transactionsResult ? transactionsResult.data.transactions.perPage : perPage)
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
