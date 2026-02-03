
import { useQuery } from '@tanstack/react-query'
import { Headset, Plus, LayoutList, History } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'

import { getTreatments } from '@/api/get-treatments'
import { EmptyState } from '@/components/empty-state'
import { ErrorBoundary } from '@/components/error-boundary'
import { Pagination } from '@/components/pagination'
import { TableSkeleton } from '@/components/table-skeleton'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/page-header'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/custom-tabs'

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

  // Tab handling
  const activeTab = searchParams.get('tab') ?? 'open'

  // Status handling: if explicit filter exists, use it; otherwise use tab group
  const filterStatus = searchParams.get('status')
  const queryStatus = filterStatus && filterStatus !== 'all' ? filterStatus : activeTab

  const pageIndex = z.coerce
    .number()
    .transform((page) => page - 1)
    .parse(searchParams.get('page') ?? '1')

  const { data: result = { data: { treatments: [], totalCount: 0, perPage: 10, pageIndex: 0 } }, isLoading, isFetching } = useQuery({
    queryKey: ['treatments', pageIndex, treatmentId, clientName, queryStatus],
    queryFn: async () => {
      try {
        const res = await getTreatments({
          page: pageIndex,
          treatmentId,
          clientName,
          status: queryStatus,
        })
        return {
          data: {
            treatments: res.data?.treatments || [],
            totalCount: res.data?.totalCount || 0,
            perPage: res.data?.perPage || 10,
            pageIndex: res.data?.pageIndex || 0,
          }
        }
      } catch (error) {
        return { data: { treatments: [], totalCount: 0, perPage: 10, pageIndex: 0 } }
      }
    },
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

  function handleTabChange(value: string) {
    setSearchParams((state) => {
      state.set('tab', value)
      state.set('page', '1')
      state.delete('status') // Clear specific status filter when switching tabs
      return state
    })
  }

  return (
    <ErrorBoundary>
      <Helmet title="Atendimentos" />
      <div className="flex flex-col gap-6">
        <PageHeader title="Atendimentos" description="Gerencie seus atendimentos e suporte ao cliente.">
          <Button
            onClick={handleCreateTreatment}
            className="h-10 w-auto px-4 py-2 rounded-md bg-primary text-primary-foreground shadow-lg hover:bg-primary/90"
          >
            <Plus className="h-5 w-5 mr-2" />
            <span className="hidden sm:inline">Novo Atendimento</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        </PageHeader>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="open" className="flex-1">
              <LayoutList className="mr-2 h-4 w-4" />
              Em Aberto
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1">
              <History className="mr-2 h-4 w-4" />
              Histórico
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <TreatmentTableFilters activeTab={activeTab} />

        <div className={`space-y-4 transition-opacity duration-200 ${isFetching && !isLoading ? 'opacity-60 pointer-events-none' : 'opacity-100'} `}>
          <div className="rounded-md border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50 text-base">
                    <TableHead className="w-[48px]"></TableHead>
                    <TableHead className="w-[80px] text-muted-foreground">
                      Aberto há
                    </TableHead>
                    <TableHead className="hidden w-[100px] text-muted-foreground sm:table-cell">
                      Status
                    </TableHead>
                    <TableHead className="hidden text-muted-foreground sm:table-cell">
                      Contato
                    </TableHead>
                    <TableHead className="text-center text-muted-foreground">
                      Cliente
                    </TableHead>
                    <TableHead className="text-muted-foreground">
                      Requisição
                    </TableHead>
                    <TableHead className="hidden w-[100px] text-muted-foreground sm:table-cell">
                      Valor
                    </TableHead>
                    <TableHead className="w-[60px] text-muted-foreground sm:w-[100px]"></TableHead>
                    <TableHead className="w-[60px] text-muted-foreground sm:w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableSkeleton />
                  ) : (
                    <>
                      {result.data.treatments.map((treatment) => (
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
                      )}

                      {result.data.treatments.length === 0 && (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={11} className="h-24 text-center py-10">
                            <EmptyState
                              title="Nenhum atendimento encontrado"
                              description="Não encontramos nenhum registro de atendimento com os filtros atuais."
                            />
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex justify-end">
            <Pagination
              onPageChange={handlePaginate}
              pageIndex={result.data.pageIndex}
              totalCount={result.data.totalCount}
              perPage={result.data.perPage}
            />
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}
