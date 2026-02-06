
import { useQuery } from '@tanstack/react-query'
import { ArrowRightLeft, Plus, TrendingDown, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useSearchParams } from 'react-router-dom'
import { z } from 'zod'

import { getTransactions } from '@/api/get-transactions'
import { Pagination } from '@/components/pagination'
import { Button } from '@/components/ui/button'
import {
  ResponsiveDialog,
  ResponsiveDialogTrigger,
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
import { TransactionTableRow } from './transaction-table-row'
import { TransactionTableFilters } from './TransactionTableFilters'
import { PageHeader } from '@/components/page-header'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/custom-tabs'

export function Transactions() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isExpenseOpen, setIsExpenseOpen] = useState(false)
  const [isIncomeOpen, setIsIncomeOpen] = useState(false)
  const [isTransferOpen, setIsTransferOpen] = useState(false)

  // Tab State: 'payable' | 'history' | 'transfers'
  const [activeTab, setActiveTab] = useState<'payable' | 'history' | 'transfers'>('payable')

  // Time Horizon State
  const [timeHorizon, setTimeHorizon] = useState<'7' | '15' | '30' | 'custom'>('7')
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined)

  const description = searchParams.get('description')
  const value = searchParams.get('value')
  const sectorId = searchParams.get('sectorId')
  const accountId = searchParams.get('accountId')

  const pageIndex = z.coerce
    .number()
    .transform((page) => page - 1)
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
      pageIndex,
      description,
      value,
      sectorId,
      accountId,
      activeTab, // Re-fetch when tab changes
      timeHorizon,
      customDate
    ],
    queryFn: () =>
      getTransactions({
        page: pageIndex,
        description,
        value: value ? Number(value) : null,
        sectorId: sectorId === 'all' ? null : sectorId,
        accountId,
        status: activeTab === 'payable' ? 'pending' : 'completed',
        toDate: activeTab === 'payable' ? toDate?.toISOString() : undefined // Pass toDate only for payable
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

  function handlePaginate(pageIndex: number) {
    setSearchParams((state) => {
      state.set('page', (pageIndex + 1).toString())
      return state
    })
  }

  return (
    <>
      <Helmet title="Transações" />
      <div className="flex flex-col gap-6 font-gaba">
        <PageHeader title="Transações" description="Gerencie suas receitas, despesas e transferências.">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                aria-label="Adicionar"
                className="h-10 w-10 sm:h-auto sm:w-auto sm:px-4 sm:py-2 rounded-full sm:rounded-md bg-primary text-primary-foreground shadow-lg hover:bg-primary/90"
              >
                <Plus className="h-5 w-5 sm:mr-2" />
                <span className="hidden sm:inline">Nova Transação</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" side="bottom" align="end">
              <ResponsiveDialog open={isExpenseOpen} onOpenChange={setIsExpenseOpen}>
                <ResponsiveDialogTrigger asChild>
                  <Button
                    aria-label="Adicionar Despesa"
                    variant="ghost"
                    className="flex w-full items-center justify-start p-2 rounded-md transition-colors"
                  >
                    <TrendingDown className="mr-3 h-4 w-4 text-red-500" />
                    Despesa
                  </Button>
                </ResponsiveDialogTrigger>
                <TransactionExpense />
              </ResponsiveDialog>
              <ResponsiveDialog open={isIncomeOpen} onOpenChange={setIsIncomeOpen}>
                <ResponsiveDialogTrigger asChild>
                  <Button
                    aria-label="Adicionar Receita"
                    variant="ghost"
                    className="flex w-full items-center justify-start p-2 rounded-md transition-colors"
                  >
                    <TrendingUp className="mr-3 h-4 w-4 text-green-500" />
                    Receita
                  </Button>
                </ResponsiveDialogTrigger>
                <TransactionIncome />
              </ResponsiveDialog>

              <ResponsiveDialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
                <ResponsiveDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex w-full items-center justify-start p-2 rounded-md transition-colors"
                    aria-label="Adicionar Transação"
                  >
                    <ArrowRightLeft className="mr-3 h-4 w-4 text-blue-500" />
                    Transferência
                  </Button>
                </ResponsiveDialogTrigger>
                <TransactionTransfer />
              </ResponsiveDialog>
            </PopoverContent>
          </Popover>
        </PageHeader>

        {/* TABS HEADER */}
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
          <TabsList className="w-full">
            <TabsTrigger value="payable" className="flex-1">A Pagar / Receber</TabsTrigger>
            <TabsTrigger value="history" className="flex-1">Histórico</TabsTrigger>
            <TabsTrigger value="transfers" className="flex-1">Transferências</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-4">
          {activeTab !== 'transfers' && (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <TransactionTableFilters />
              </div>

              {/* HORIZON SELECTOR - Only visible in Payable Tab */}
              {activeTab === 'payable' && (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="hidden sm:inline text-sm text-muted-foreground whitespace-nowrap">Visão:</span>
                  <Select value={timeHorizon} onValueChange={(val: any) => setTimeHorizon(val)}>
                    <SelectTrigger className="w-full sm:w-[180px] h-9">
                      <SelectValue placeholder="Selecione o período" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">Próximos 7 dias</SelectItem>
                      <SelectItem value="15">Próximos 15 dias</SelectItem>
                      <SelectItem value="30">Próximos 30 dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          <div className="rounded-md border bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    {/* Different Headers for Transfers */}
                    {activeTab === 'transfers' ? (
                      <>
                        <TableHead className="w-1/6 text-muted-foreground font-semibold">Data</TableHead>
                        <TableHead className="w-2/6 text-muted-foreground font-semibold">Descrição (Opcional)</TableHead>
                        <TableHead className="w-1/6 text-muted-foreground font-semibold">Origem</TableHead>
                        <TableHead className="w-1/6 text-muted-foreground font-semibold">Destino</TableHead>
                        <TableHead className="w-1/6 text-right text-muted-foreground font-semibold">Valor</TableHead>
                      </>
                    ) : (
                      <>
                        <TableHead className="w-1/12 text-center text-muted-foreground font-semibold">
                          Pago
                        </TableHead>
                        <TableHead className="w-1/12 text-center text-muted-foreground font-semibold">
                          Data
                        </TableHead>
                        <TableHead className="w-4/12 text-muted-foreground font-semibold">
                          Descrição
                        </TableHead>
                        <TableHead className="w-2/12 text-center text-muted-foreground font-semibold">
                          Setor
                        </TableHead>
                        <TableHead className="w-2/12 text-center text-muted-foreground font-semibold">
                          Conta
                        </TableHead>
                        <TableHead className="w-1/12 text-right text-muted-foreground font-semibold">
                          Valor
                        </TableHead>
                        <TableHead className=" w-1/12"></TableHead>
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
                          />
                        )
                      },
                    )}

                  {/* TRANSFERS LIST */}
                  {activeTab === 'transfers' && transfersResult &&
                    transfersResult.transferTransactions.map((transfer: any) => {
                      return (
                        <TableRow key={transfer.id}>
                          <TableCell className="font-mono text-xs font-medium">
                            {new Date(transfer.transaction.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {transfer.transaction.description || '-'}
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
                              {transfer.transaction.accounts?.name || 'Origem'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/10">
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
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                        Nenhuma transação encontrada nesta categoria.
                      </TableCell>
                    </TableRow>
                  )}
                  {activeTab === 'transfers' && transfersResult && transfersResult.transferTransactions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        Nenhuma transferência realizada.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {activeTab !== 'transfers' && (
            <div className="flex justify-end">
              <Pagination
                onPageChange={handlePaginate}
                pageIndex={
                  transactionsResult && transactionsResult.data.transactions.pageIndex
                }
                totalCount={
                  transactionsResult && transactionsResult.data.transactions.totalCount
                }
                perPage={transactionsResult && transactionsResult.data.transactions.perPage}
              />
            </div>
          )}
        </div>
      </div>
    </>
  )
}
