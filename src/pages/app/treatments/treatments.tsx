
import { useQuery } from '@tanstack/react-query'
import { Plus, Headset } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'

import { getTreatments } from '@/api/get-treatments'
import { Pagination } from '@/components/pagination'
import { Button } from '@/components/ui/button'
import { TableSkeleton } from '@/components/table-skeleton'

import {
  Table,
  TableBody,
  TableCell,
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

  const { data: result, isLoading } = useQuery({
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
          <h1 className="font-merienda text-2xl sm:text-4xl font-bold tracking-tight text-foreground">
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
          <div className="overflow-x-auto rounded-md border bg-card">
            <div className="min-w-[600px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50 text-base">
                    <TableHead className="w-[48px]"></TableHead>
                    <TableHead className="hidden w-[200px] text-muted-foreground xl:table-cell">
                      Identificador
                    </TableHead>
                    <TableHead className="w-[80px] text-muted-foreground">
                      Aberto há
                    </TableHead>
                    {/* Status - Oculto apenas no mobile */}
                    <TableHead className="hidden w-[100px] text-muted-foreground sm:table-cell">
                      Status
                    </TableHead>
                    {/* Contato - Oculto apenas no mobile */}
                    <TableHead className="hidden text-muted-foreground sm:table-cell">
                      Contato
                    </TableHead>
                    <TableHead className="text-center text-muted-foreground">
                      Cliente
                    </TableHead>
                    <TableHead className="text-muted-foreground">
                      Requisição
                    </TableHead>
                    {/* Valor - Oculto apenas no mobile */}
                    <TableHead className="hidden w-[100px] text-muted-foreground sm:table-cell">
                      Valor
                    </TableHead>
                    {/* Itens - Largura responsiva */}
                    <TableHead className="w-[60px] text-muted-foreground sm:w-[100px]"></TableHead>
                    {/* Atender - Largura responsiva */}
                    <TableHead className="w-[60px] text-muted-foreground sm:w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && <TableSkeleton />}

                  {!isLoading && result && result.data.treatments.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={9} // Span across all columns
                        className="h-24 text-center text-muted-foreground"
                      >
                        Nenhum atendimento encontrado.
                      </TableCell>
                    </TableRow>
                  )}

                  {!isLoading &&
                    result &&
                    result.data.treatments.map(
                      (treatment) => {
                        return (
                          <TreatmentTableRow
                            key={treatment.id}
                            treatments={{
                              ...treatment,
                              clients: treatment.clients ?? { name: 'Desconhecido' },
                              items: treatment.items as any,
                              interactions: treatment.interactions as any,
                            }}
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
            pageIndex={result?.data.pageIndex ?? 0}
            totalCount={result?.data.totalCount ?? 0}
            perPage={result?.data.perPage ?? 10}
          />
        </div>
      </div>
    </>
  )
}