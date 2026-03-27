
import { useQuery } from '@tanstack/react-query'
import { Plus, LayoutList, History } from 'lucide-react'
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

  const currentPage = z.coerce
    .number()
    .parse(searchParams.get('page') ?? '1')

  const { data: result = { data: { treatments: [], totalCount: 0, perPage: 10, pageIndex: 0 } }, isLoading, isFetching } = useQuery({
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
        <PageHeader title="Atendimentos" description="Gerencie seus atendimentos e suporte ao cliente.">
          <Button
            onClick={handleCreateTreatment}
            className="h-10 w-auto px-6 py-2 rounded-xl bg-slate-900 text-white shadow-xl hover:bg-slate-800 transition-all font-bold"
          >
            <Plus className="h-5 w-5 mr-2" />
            <span className="hidden sm:inline">Novo Atendimento</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        </PageHeader>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="w-full h-auto p-1.5 bg-slate-100/50 dark:bg-slate-800/50 rounded-2xl flex border border-slate-200/50 dark:border-slate-700/50">
            <TabsTrigger 
              value="open" 
              className="flex-1 py-3 text-sm rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm transition-all font-bold tracking-tight"
            >
              <LayoutList className="mr-2 h-4 w-4" />
              Ordens em Aberto
            </TabsTrigger>
            <TabsTrigger 
              value="history" 
              className="flex-1 py-3 text-sm rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-slate-600 data-[state=active]:shadow-sm transition-all font-bold tracking-tight"
            >
              <History className="mr-2 h-4 w-4" />
              Histórico de OS
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <TreatmentTableFilters activeTab={activeTab} />

        <div className={`space-y-4 px-2 transition-opacity duration-200 ${isFetching && !isLoading ? 'opacity-60 pointer-events-none' : 'opacity-100'} `}>
          <div className="rounded-3xl border-none bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="bg-slate-50/50 dark:bg-slate-800/50 border-none hover:bg-slate-50/50">
                    <TableHead className="w-[60px] pl-8 py-5"></TableHead>
                    <TableHead className="w-[120px] text-[11px] text-slate-500 font-bold uppercase tracking-widest py-5">
                      Tempo de OS
                    </TableHead>
                    <TableHead className="hidden w-[120px] text-[11px] text-slate-500 font-bold uppercase tracking-widest sm:table-cell py-5">
                      Status Atual
                    </TableHead>
                    <TableHead className="hidden text-[11px] text-slate-500 font-bold uppercase tracking-widest sm:table-cell py-5">
                      Contato
                    </TableHead>
                    <TableHead className="text-[11px] text-slate-500 font-bold uppercase tracking-widest py-5">
                      Solicitante (Cliente)
                    </TableHead>
                    <TableHead className="text-[11px] text-slate-500 font-bold uppercase tracking-widest py-5 px-6">
                      Requisição / Problema
                    </TableHead>
                    <TableHead className="hidden w-[140px] text-right text-[12px] text-slate-700 font-black uppercase tracking-widest sm:table-cell py-5 pr-8">
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

          <Pagination
            onPageChange={handlePaginate}
            onPerPageChange={(val) => {
              setSearchParams(state => {
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
