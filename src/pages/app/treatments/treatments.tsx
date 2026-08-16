import { useQuery } from '@tanstack/react-query'
import { History, LayoutList, Plus } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'

import { getTreatments } from '@/api/get-treatments'
import { EmptyState } from '@/components/empty-state'
import { ErrorBoundary } from '@/components/error-boundary'
import { PageHeader } from '@/components/page-header'
import { Pagination } from '@/components/pagination'
import { TableSkeleton } from '@/components/table-skeleton'
import { Button } from '@/components/ui/button'
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
import { ClientsEquipmentsModal } from './components/clients-equipments-modal'

export function Treatments() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const treatmentId = searchParams.get('treatmentId')
  const clientName = searchParams.get('clientName')

  // Tab handling
  const activeTab = searchParams.get('tab') ?? 'open'

  // Status handling: if explicit filter exists, use it; otherwise use tab group
  const filterStatus = searchParams.get('status')
  const queryStatus =
    filterStatus && filterStatus !== 'all' ? filterStatus : activeTab

  const currentPage = z.coerce.number().parse(searchParams.get('page') ?? '1')

  const {
    data: result = {
      data: { treatments: [], totalCount: 0, perPage: 10, pageIndex: 0 },
    },
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ['treatments', currentPage, treatmentId, clientName, queryStatus],
    queryFn: async () => {
      try {
        const res = await getTreatments({
          page: currentPage,
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
          },
        }
      } catch (error) {
        return {
          data: { treatments: [], totalCount: 0, perPage: 10, pageIndex: 0 },
        }
      }
    },
    refetchOnWindowFocus: 'always',
  })

  function handleCreateTreatment() {
    navigate('/treatment/new')
  }

  function handlePaginate(newPageIndex: number) {
    setSearchParams((state) => {
      state.set('page', (newPageIndex + 1).toString())
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
      <div className="flex flex-col gap-6 font-manrope">
        <PageHeader
          title="Atendimentos"
          description="Gerencie seus atendimentos e suporte ao cliente."
        >
          <div className="flex items-center gap-3">
            <ClientsEquipmentsModal />
            <Button
              onClick={handleCreateTreatment}
              className="h-10 w-auto rounded-xl bg-slate-900 px-6 py-2 font-bold text-white shadow-xl transition-all hover:bg-slate-800"
            >
              <Plus className="mr-2 h-5 w-5" />
              <span className="hidden sm:inline">Novo Atendimento</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          </div>
        </PageHeader>

        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <TabsList className="flex h-auto w-full rounded-2xl border border-slate-200/50 bg-slate-100/50 p-1.5 dark:border-slate-700/50 dark:bg-slate-800/50">
            <TabsTrigger
              value="open"
              className="flex-1 rounded-xl py-3 text-sm font-bold tracking-tight transition-all data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-900"
            >
              <LayoutList className="mr-2 h-4 w-4" />
              Ordens em Aberto
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="flex-1 rounded-xl py-3 text-sm font-bold tracking-tight transition-all data-[state=active]:bg-white data-[state=active]:text-slate-600 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-900"
            >
              <History className="mr-2 h-4 w-4" />
              Histórico de OS
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <TreatmentTableFilters activeTab={activeTab} />

        <div
          className={`space-y-4 px-2 transition-opacity duration-200 ${isFetching && !isLoading ? 'pointer-events-none opacity-60' : 'opacity-100'} `}
        >
          <div className="overflow-hidden rounded-3xl border-none bg-white shadow-sm dark:bg-slate-900">
            <div className="overflow-x-auto">
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="border-none bg-slate-50/50 hover:bg-slate-50/50 dark:bg-slate-800/50">
                    <TableHead className="w-[60px] py-5 pl-8"></TableHead>
                    <TableHead className="w-[120px] py-5 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                      Tempo de OS
                    </TableHead>
                    <TableHead className="hidden w-[120px] py-5 text-[11px] font-bold uppercase tracking-widest text-slate-500 sm:table-cell">
                      Status Atual
                    </TableHead>
                    <TableHead className="hidden py-5 text-[11px] font-bold uppercase tracking-widest text-slate-500 sm:table-cell">
                      Contato
                    </TableHead>
                    <TableHead className="py-5 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                      Solicitante (Cliente)
                    </TableHead>
                    <TableHead className="px-6 py-5 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                      Requisição / Problema
                    </TableHead>
                    <TableHead className="hidden w-[140px] py-5 pr-8 text-right text-[12px] font-black uppercase tracking-widest text-slate-700 sm:table-cell">
                      Orçamento
                    </TableHead>
                    <TableHead className="w-[100px] py-5"></TableHead>
                    <TableHead className="w-[100px] py-5 pr-8"></TableHead>
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
                            clients: treatment.clients ?? {
                              name: 'Desconhecido',
                            },
                            items: treatment.items as any,
                            interactions: treatment.interactions as any,
                          }}
                        />
                      ))}

                      {result.data.treatments.length === 0 && (
                        <TableRow className="hover:bg-transparent">
                          <TableCell
                            colSpan={11}
                            className="h-24 py-10 text-center"
                          >
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

          <Pagination
            onPageChange={handlePaginate}
            onPerPageChange={(val) => {
              setSearchParams((state) => {
                state.set('per_page', val)
                state.set('page', '1')
                return state
              })
            }}
            pageIndex={currentPage - 1}
            totalCount={result.data.totalCount}
            perPage={result.data.perPage}
          />
        </div>
      </div>
    </ErrorBoundary>
  )
}
