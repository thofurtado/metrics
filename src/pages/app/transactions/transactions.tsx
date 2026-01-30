
import { DialogContent } from '@radix-ui/react-dialog'
import { useQuery } from '@tanstack/react-query'
import { ArrowRightLeft, Plus, TrendingDown, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useSearchParams } from 'react-router-dom'
import { z } from 'zod'

import { getTransactions } from '@/api/get-transactions'
import { getTreatments } from '@/api/get-treatments'
import { Pagination } from '@/components/pagination'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TransactionExpense } from './transaction-expense'
import { TransactionIncome } from './transaction-income'
import { TransactionTransfer } from './transaction-transfer'
import { TransactionTableRow } from './transaction-table-row'
import { TransactionTableFilters } from './TransactionTableFilters'

export function Transactions() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isExpenseOpen, setIsExpenseOpen] = useState(false)
  const [isIncomeOpen, setIsIncomeOpen] = useState(false)
  const [isTransferOpen, setIsTransferOpen] = useState(false)
  const description = searchParams.get('description')
  const value = searchParams.get('value')
  const sectorId = searchParams.get('sectorId')
  const accountId = searchParams.get('accountId')

  const pageIndex = z.coerce
    .number()
    .transform((page) => page - 1)
    .parse(searchParams.get('page') ?? '1')

  const { data: result } = useQuery({
    queryKey: [
      'transactions',
      pageIndex,
      description,
      value,
      sectorId,
      accountId,
    ],
    queryFn: () =>
      getTransactions({
        page: pageIndex,
        description,
        value,
        sectorId: sectorId === 'all' ? null : sectorId,
        accountId,
      }),
    refetchOnWindowFocus: 'always',
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
      <div className="flex flex-col gap-4 font-gaba">
        <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="font-merienda text-2xl sm:text-4xl font-bold tracking-tight text-foreground">
            Transações
          </h1>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                aria-label="Adicionar"
                className="ml-auto h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-white p-2 shadow-lg hover:bg-minsk-200 dark:bg-minsk-400 dark:hover:bg-minsk-50"
              >
                <Plus className="h-5 w-5 font-semibold text-minsk-800"></Plus>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 bg-minsk-50" side="left">
              <Dialog open={isExpenseOpen} onOpenChange={setIsExpenseOpen}>
                <DialogTrigger asChild>
                  <Button
                    aria-label="Adicionar Despesa"
                    variant="link"
                    className="flex w-full items-center justify-start p-0 text-black hover:bg-minsk-100/50 rounded-md transition-colors"
                  >
                    <TrendingDown className="mr-3 h-4 w-4 text-stiletto-500" />
                    Despesa
                  </Button>
                </DialogTrigger>
                <TransactionExpense />
              </Dialog>
              <Dialog open={isIncomeOpen} onOpenChange={setIsIncomeOpen}>
                <DialogTrigger asChild>
                  <Button
                    aria-label="Adicionar Receita"
                    variant="link"
                    className="flex w-full items-center justify-start p-0 text-black hover:bg-minsk-100/50 rounded-md transition-colors"
                  >
                    <TrendingUp className="mr-3 h-4 w-4 text-vida-loca-500" />
                    Receita
                  </Button>
                </DialogTrigger>
                <TransactionIncome />
              </Dialog>

              <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="link"
                    className="flex w-full items-center justify-start p-0 text-black hover:bg-minsk-100/50 rounded-md transition-colors"
                    aria-label="Adicionar Transação"
                  >
                    <ArrowRightLeft className="mr-3 h-4 w-4 text-minsk-500" />
                    Transferência
                  </Button>
                </DialogTrigger>
                <TransactionTransfer />
              </Dialog>
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2.5">
          <div>
            <TransactionTableFilters />
          </div>
          <div className="rounded-md border bg-card overflow-x-auto">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-1/12 text-center text-muted-foreground">
                    Pago
                  </TableHead>
                  <TableHead className="w-1/12 text-center text-muted-foreground">
                    Data
                  </TableHead>
                  <TableHead className="w-4/12 text-muted-foreground">
                    Descrição
                  </TableHead>
                  <TableHead className="w-2/12 text-center text-muted-foreground">
                    Setor
                  </TableHead>
                  <TableHead className="w-2/12 text-center text-muted-foreground">
                    Conta
                  </TableHead>
                  <TableHead className="w-1/12 text-right text-muted-foreground">
                    Valor
                  </TableHead>

                  <TableHead className=" w-1/12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result &&
                  result.data.transactions.transactions.transactions.map(
                    (transaction) => {
                      return (
                        <TransactionTableRow
                          key={transaction.id}
                          transactions={transaction}
                        />
                      )
                    },
                  )}
              </TableBody>
            </Table>
          </div>
          <Pagination
            onPageChange={handlePaginate}
            pageIndex={
              result && result.data.transactions.transactions.pageIndex
            }
            totalCount={
              result && result.data.transactions.transactions.totalCount
            }
            perPage={result && result.data.transactions.transactions.perPage}
          />
        </div>
      </div>
    </>
  )
}
