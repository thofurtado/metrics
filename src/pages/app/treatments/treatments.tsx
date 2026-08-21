import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import {
  ClipboardList,
  MonitorSmartphone,
  Layers,
  ShieldCheck,
  FolderSync,
  Plus,
  LayoutList,
  History,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'

import { PageHeader } from '@/components/page-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { ErrorBoundary } from '@/components/error-boundary'
import { EmptyState } from '@/components/empty-state'
import { Pagination } from '@/components/pagination'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TableSkeleton } from '@/components/table-skeleton'

import { TreatmentTableFilters } from './TreatmentTableFilters'
import { TreatmentTableRow } from './treatment-table-row'
import { ClientsEquipments } from '../clients-equipments'
import { ClientsGroupsTab } from './components/clients-groups-tab'
import { VpnNocTab } from './components/vpn-noc-tab'
import { SyncthingTab } from './components/syncthing-tab'
import { getTreatments } from '@/api/get-treatments'

export function Treatments() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const currentTab = searchParams.get('tab') || 'treatments'

  // Filtros da aba de atendimentos
  const treatmentId = searchParams.get('treatmentId')
  const clientName = searchParams.get('clientName')
  const activeSubTab = searchParams.get('subtab') ?? 'open'
  const filterStatus = searchParams.get('status')
  const queryStatus = filterStatus && filterStatus !== 'all' ? filterStatus : activeSubTab

  const currentPage = z.coerce.number().parse(searchParams.get('page') ?? '1')

  const handleTabChange = (tab: string) => {
    setSearchParams((prev) => {
      prev.set('tab', tab)
      return prev
    })
  }

  const handleSubTabChange = (subtab: string) => {
    setSearchParams((prev) => {
      prev.set('subtab', subtab)
      prev.set('page', '1')
      prev.delete('status')
      return prev
    })
  }

  const handlePaginate = (newPageIndex: number) => {
    setSearchParams((state) => {
      state.set('page', (newPageIndex + 1).toString())
      return state
    })
  }

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

  return (
    <ErrorBoundary>
      <Helmet title="Central de Atendimento" />
      <div className="flex flex-col gap-6 font-manrope p-2 sm:p-6">
        <PageHeader
          title="Gestão de Atendimento & Clientes"
          description="Central unificada de atendimentos, ordens de serviço, equipamentos, grupos multi-lojas e redes VPN corporativas."
        >
          <div className="flex items-center gap-3">
            <Button
              onClick={() => navigate('/treatment/new')}
              className="h-10 w-auto rounded-xl bg-slate-900 px-6 py-2 font-bold text-white shadow-xl transition-all hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-900"
            >
              <Plus className="mr-2 h-5 w-5" />
              <span className="hidden sm:inline">Novo Atendimento</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          </div>
        </PageHeader>

        <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
          <div className="border-b border-border/60 pb-1">
            <TabsList className="bg-secondary/40 p-1 rounded-xl h-auto gap-1 flex-wrap">
              <TabsTrigger
                value="treatments"
                className="gap-2 py-2 px-4 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-md font-bold"
              >
                <ClipboardList className="h-4 w-4 text-primary" />
                Atendimentos & O.S.
              </TabsTrigger>
              <TabsTrigger
                value="equipments"
                className="gap-2 py-2 px-4 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-md font-bold"
              >
                <MonitorSmartphone className="h-4 w-4 text-sky-400" />
                Equipamentos & Telemetria
              </TabsTrigger>
              <TabsTrigger
                value="groups"
                className="gap-2 py-2 px-4 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-md font-bold"
              >
                <Layers className="h-4 w-4 text-amber-400" />
                Clientes & Grupos Multi-Lojas
              </TabsTrigger>
              <TabsTrigger
                value="vpn"
                className="gap-2 py-2 px-4 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-md font-bold"
              >
                <ShieldCheck className="h-4 w-4 text-indigo-400" />
                Rede VPN (NOC)
              </TabsTrigger>
              <TabsTrigger
                value="syncthing"
                className="gap-2 py-2 px-4 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-md font-bold"
              >
                <FolderSync className="h-4 w-4 text-teal-400" />
                Sincronização P2P
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ABA 1: ATENDIMENTOS & O.S. */}
          <TabsContent value="treatments" className="space-y-6">
            <Tabs
              value={activeSubTab}
              onValueChange={handleSubTabChange}
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

            <TreatmentTableFilters activeTab={activeSubTab} />

            <div
              className={`space-y-4 transition-opacity duration-200 ${isFetching && !isLoading ? 'pointer-events-none opacity-60' : 'opacity-100'}`}
            >
              <div className="overflow-hidden rounded-3xl border border-border/40 bg-card/70 backdrop-blur-xl shadow-sm">
                <div className="overflow-x-auto">
                  <Table className="w-full">
                    <TableHeader>
                      <TableRow className="border-border/40 bg-muted/30">
                        <TableHead className="w-[60px] py-5 pl-8"></TableHead>
                        <TableHead className="w-[120px] py-5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                          Tempo de OS
                        </TableHead>
                        <TableHead className="hidden w-[120px] py-5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground sm:table-cell">
                          Status Atual
                        </TableHead>
                        <TableHead className="hidden py-5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground sm:table-cell">
                          Contato
                        </TableHead>
                        <TableHead className="py-5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                          Solicitante (Cliente)
                        </TableHead>
                        <TableHead className="px-6 py-5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                          Requisição / Problema
                        </TableHead>
                        <TableHead className="hidden w-[140px] py-5 pr-8 text-right text-[12px] font-black uppercase tracking-widest text-foreground sm:table-cell">
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
                          {result.data.treatments.map((treatment: any) => (
                            <TreatmentTableRow
                              key={treatment.id}
                              treatments={{
                                ...treatment,
                                clients: treatment.clients ?? {
                                  name: 'Desconhecido',
                                },
                                items: (treatment.items || []) as any,
                                interactions: (treatment.interactions || []) as any,
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
          </TabsContent>

          {/* ABA 2: EQUIPAMENTOS & TELEMETRIA */}
          <TabsContent value="equipments" className="space-y-4">
            <ClientsEquipments />
          </TabsContent>

          {/* ABA 3: CLIENTES & GRUPOS MULTI-LOJAS */}
          <TabsContent value="groups" className="space-y-4">
            <ClientsGroupsTab />
          </TabsContent>

          {/* ABA 4: REDE VPN (NOC HEADSCALE) */}
          <TabsContent value="vpn" className="space-y-4">
            <VpnNocTab />
          </TabsContent>

          {/* ABA 5: SINCRONIZAÇÃO P2P (SYNCTHING) */}
          <TabsContent value="syncthing" className="space-y-4">
            <SyncthingTab />
          </TabsContent>
        </Tabs>
      </div>
    </ErrorBoundary>
  )
}
