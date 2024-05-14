import { useQuery } from '@tanstack/react-query'
import { DiamondIcon, Plus } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'

import { getTreatments } from '@/api/get-treatments'
import { Pagination } from '@/components/pagination'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { TreatmentTableRow } from './treatment-table-row'
import { TreatmentTableFilters } from './TreatmentTableFilters'

export function Transactions() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const treatmentId = searchParams.get('treatmentId')
  const clientName = searchParams.get('clientName')
  const status = searchParams.get('status')

  const pageIndex = z.coerce
    .number()
    .transform((page) => page - 1)
    .parse(searchParams.get('page') ?? '1')

  const { data: result } = useQuery({
    queryKey: ['treatments', pageIndex, treatmentId, clientName, status],
    queryFn: () =>
      getTreatments({
        page: pageIndex,
        treatmentId,
        clientName,
        status: status === 'all' ? null : status,
      }),
    refetchOnWindowFocus: 'always',
  })

  function handleCreateTreatment() {
    navigate('/treatment/new')
  }

  function handlePaginate(pageIndex: number) {
    setSearchParams((state) => {
      state.set('page', (pageIndex + 1).toString())
      return state
    })
  }

  return (
    <>
      <Helmet title="Transações" />
      <div className="flex flex-col gap-4">
        <div className="flex-start  flex w-full flex-row place-content-between">
          <h1 className="text-3xl font-bold tracking-tight">Transações</h1>
          <Button
            onClick={handleCreateTreatment}
            className="ml-3 mt-auto h-12 w-12 rounded-full bg-minsk-600 p-4 hover:bg-minsk-700 dark:bg-vida-loca-500 dark:hover:bg-vida-loca-400 "
          >
            <Plus className="h-8 w-8"></Plus>
          </Button>
        </div>
        <div className="space-y-2.5">
          <TreatmentTableFilters />
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">Situação</TableHead>
                  <TableHead className="w-[120px]">Data</TableHead>
                  <TableHead className="w-[280px]">Descrição</TableHead>
                  <TableHead className="w-[240px]">Setor</TableHead>
                  <TableHead className="w-[240px]">Conta</TableHead>
                  <TableHead className="w-[80px]">Valor</TableHead>
                  <TableHead className="w-[16px]"></TableHead>
                  <TableHead className="w-[16px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result &&
                  result.data.treatments.treatments.treatments.map(
                    (treatment) => {
                      return (
                        <TreatmentTableRow
                          key={treatment.id}
                          treatments={treatment}
                        />
                      )
                    },
                  )}
              </TableBody>
            </Table>
          </div>
          <Pagination
            onPageChange={handlePaginate}
            pageIndex={result && result.data.treatments.treatments.pageIndex}
            totalCount={result && result.data.treatments.treatments.totalCount}
            perPage={result && result.data.treatments.treatments.perPage}
          />
        </div>
      </div>
    </>
  )
}
