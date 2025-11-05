import { useQuery } from '@tanstack/react-query'
import { Plus, Headset } from 'lucide-react'
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

export function Treatments() {
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
        status: status === 'all' ? 'all' : status,
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
      <Helmet title="Atendimentos" />
      <div className="flex flex-col gap-4 font-gaba">
        {/* Header com título e botão lado a lado */}
        <div className="flex items-center justify-between">
          <h1 className="font-merienda text-2xl font-bold tracking-tight text-minsk-900 sm:text-3xl lg:text-4xl">
            Atendimentos
          </h1>

          <Button
            onClick={handleCreateTreatment}
            className="bg-vida-loca-500 hover:bg-vida-loca-600 dark:bg-vida-loca-500 dark:hover:bg-vida-loca-400"
            size="sm"
          >
            <span className="hidden sm:inline">Novo</span>
            <Headset className="h-4 w-4 sm:ml-1" />
          </Button>
        </div>

        <div className="space-y-2.5">
          <TreatmentTableFilters />

          {/* Container da tabela com scroll horizontal em mobile */}
          <div className="overflow-x-auto rounded-md border">
            <div className="min-w-[600px]">
              <Table>
                <TableHeader>
                  <TableRow className="text-base">
                    <TableHead className="w-[48px] rounded-tl-md bg-minsk-200 text-minsk-950"></TableHead>
                    <TableHead className="hidden w-[200px] bg-minsk-200 text-minsk-950 xl:table-cell">
                      Identificador
                    </TableHead>
                    <TableHead className="w-[80px] bg-minsk-200 text-minsk-950">
                      Aberto há
                    </TableHead>
                    {/* Status - Oculto apenas no mobile */}
                    <TableHead className="hidden w-[100px] bg-minsk-200 text-minsk-950 sm:table-cell">
                      Status
                    </TableHead>
                    {/* Contato - Oculto apenas no mobile */}
                    <TableHead className="hidden bg-minsk-200 text-minsk-950 sm:table-cell">
                      Contato
                    </TableHead>
                    <TableHead className="bg-minsk-200 text-center text-minsk-950">
                      Cliente
                    </TableHead>
                    <TableHead className="bg-minsk-200 text-minsk-950">
                      Requisição
                    </TableHead>
                    {/* Valor - Oculto apenas no mobile */}
                    <TableHead className="hidden w-[100px] bg-minsk-200 text-minsk-950 sm:table-cell">
                      Valor
                    </TableHead>
                    {/* Itens - Largura responsiva */}
                    <TableHead className="w-[60px] bg-minsk-200 text-minsk-950 sm:w-[100px]"></TableHead>
                    {/* Atender - Largura responsiva */}
                    <TableHead className="w-[60px] rounded-tr-md bg-minsk-200 sm:w-[100px]"></TableHead>
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