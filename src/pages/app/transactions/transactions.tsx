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
import { TransactionTableRow } from './transaction-table-row'
import { TransactionTableFilters } from './TransactionTableFilters'

export function Transactions() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isExpenseOpen, setIsExpenseOpen] = useState(false)
  const [isIncomeOpen, setIsIncomeOpen] = useState(false)
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
        <div className="flex-start  flex w-full flex-row place-content-between">
          <h1 className="font-merienda text-4xl font-bold tracking-tight text-minsk-900">
            Transações
          </h1>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                aria-label="Adicionar"
                className="ml-3 mt-auto h-12 w-12 rounded-full bg-white p-2 shadow-lg hover:bg-minsk-200 dark:bg-minsk-400 dark:hover:bg-minsk-50"
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
                    className="flex w-full items-center justify-start p-0 text-black"
                  >
                    <TrendingDown className="mr-3 h-4 w-4 text-stiletto-500" />
                    Despesa
                  </Button>
                </DialogTrigger>
                <TransactionExpense open={isExpenseOpen} />
              </Dialog>
              <Dialog open={isIncomeOpen} onOpenChange={setIsIncomeOpen}>
                <DialogTrigger asChild>
                  <Button
                    aria-label="Adicionar Receita"
                    variant="link"
                    className="flex w-full items-center justify-start p-0 text-black"
                  >
                    <TrendingUp className="mr-3 h-4 w-4 text-vida-loca-500" />
                    Receita
                  </Button>
                </DialogTrigger>
                <TransactionIncome />
              </Dialog>

              <Button
                variant="link"
                className="flex w-full items-center justify-start p-0 text-black"
                disabled
                aria-label="Adicionar Transação"
              >
                <ArrowRightLeft className="mr-3 h-4 w-4 text-minsk-500" />
                Transferência
              </Button>
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2.5">
          <div>
            <TransactionTableFilters />
          </div>
          <div className="rounded-md border ">
            <Table className="overflow-hidden">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/12 rounded-tl-md bg-minsk-200 text-center text-stone-700 dark:bg-minsk-700 dark:text-white">
                    Pago
                  </TableHead>
                  <TableHead className="w-1/12 bg-minsk-200 text-center text-stone-800 dark:bg-stone-700 dark:text-white">
                    Data
                  </TableHead>
                  <TableHead className="w-4/12 bg-minsk-200 text-stone-900 dark:bg-stone-700 dark:text-white">
                    Descrição
                  </TableHead>
                  <TableHead className="w-2/12 bg-minsk-200 text-center text-stone-800 dark:bg-stone-700 dark:text-white">
                    Setor
                  </TableHead>
                  <TableHead className="w-2/12 bg-minsk-200 text-center text-stone-800 dark:bg-stone-700 dark:text-white">
                    Conta
                  </TableHead>
                  <TableHead className="w-1/12 bg-minsk-200 text-right text-stone-800 dark:bg-stone-700 dark:text-white">
                    Valor
                  </TableHead>

                  <TableHead className=" w-1/12 rounded-tr-md bg-minsk-200 dark:bg-stone-800"></TableHead>
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
