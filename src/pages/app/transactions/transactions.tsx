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

import { TreatmentItems } from '../treatments/treatment-items'
import { TransactionExpense } from './transaction-expense'
import { TransactionIncome } from './transaction-income'
import { TransactionTableRow, TreatmentTableRow } from './transaction-table-row'
import { TreatmentTableFilters } from './TreatmentTableFilters'

export function Transactions() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isExpenseOpen, setIsExpenseOpen] = useState(false)
  const [isIncomeOpen, setIsIncomeOpen] = useState(false)
  const description = searchParams.get('description')
  const sectorId = searchParams.get('sectorId')
  const accountId = searchParams.get('accountId')

  const pageIndex = z.coerce
    .number()
    .transform((page) => page - 1)
    .parse(searchParams.get('page') ?? '1')

  // const { data: result } = useQuery({
  //   queryKey: ['treatments', pageIndex, treatmentId, clientName, status],
  //   queryFn: () =>
  //     getTreatments({
  //       page: pageIndex,
  //       treatmentId,
  //       clientName,
  //       status: status === 'all' ? null : status,
  //     }),
  //   refetchOnWindowFocus: 'always',
  // })
  const { data: result } = useQuery({
    queryKey: ['transactions', pageIndex, description, sectorId, accountId],
    queryFn: () =>
      getTransactions({
        page: pageIndex,
        description,
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
  console.log(result)
  return (
    <>
      <Helmet title="Transações" />
      <div className="flex flex-col gap-4">
        <div className="flex-start  flex w-full flex-row place-content-between">
          <h1 className="text-3xl font-bold tracking-tight">Transações</h1>
          <Popover>
            <PopoverTrigger asChild>
              <Button className="ml-3 mt-auto h-12 w-12 rounded-full bg-minsk-600 p-4 hover:bg-minsk-700 dark:bg-vida-loca-500 dark:hover:bg-vida-loca-400 ">
                <Plus className="h-8 w-8"></Plus>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 bg-minsk-50" side="left">
              <Dialog open={isExpenseOpen} onOpenChange={setIsExpenseOpen}>
                <DialogTrigger asChild>
                  <Button
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
              >
                <ArrowRightLeft className="mr-3 h-4 w-4 text-minsk-500" />
                Transferência
              </Button>
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2.5">
          <div>
            <TreatmentTableFilters />
          </div>
          <div className="rounded-md border bg-slate-100">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/12 text-center">Pago</TableHead>
                  <TableHead className="w-1/12 text-center">Data</TableHead>
                  <TableHead className="w-3/12">Descrição</TableHead>
                  <TableHead className="w-2/12 text-center">Setor</TableHead>
                  <TableHead className="w-2/12 text-center">Conta</TableHead>
                  <TableHead className="w-1/12 text-left">Valor</TableHead>
                  <TableHead className="w-1/12"></TableHead>
                  <TableHead className="w-1/12"></TableHead>
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
