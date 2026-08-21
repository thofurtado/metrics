import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { 
  ClipboardList, 
  MonitorSmartphone, 
  Layers, 
  ShieldCheck, 
  FolderSync, 
  Plus, 
  Filter 
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'

import { PageHeader } from '@/components/page-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Dialog, DialogTrigger } from '@/components/ui/dialog'

// Abas Especializadas
import { TreatmentTableFilters } from './TreatmentTableFilters'
import { TreatmentTableRow } from './treatment-table-row'
import { Treatment } from './treatment'
import { ClientsEquipments } from '../clients-equipments'
import { ClientsGroupsTab } from './components/clients-groups-tab'
import { VpnNocTab } from './components/vpn-noc-tab'
import { SyncthingTab } from './components/syncthing-tab'

import { getTreatments } from '@/api/get-treatments'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TreatmentClient } from './treatment-client'
import { TreatmentItems } from './treatment-items'

export function Treatments() {
  const [searchParams, setSearchParams] = useSearchParams()
  const currentTab = searchParams.get('tab') || 'treatments'

  const [isNewTreatmentOpen, setIsNewTreatmentOpen] = useState(false)
  const [selectedTreatmentId, setSelectedTreatmentId] = useState<string | null>(null)

  const handleTabChange = (tab: string) => {
    setSearchParams(prev => {
      prev.set('tab', tab)
      return prev
    })
  }

  // Query dos tratamentos
  const { data: result } = useQuery({
    queryKey: ['treatments', searchParams.toString()],
    queryFn: () =>
      getTreatments({
        status: searchParams.get('status'),
        client_name: searchParams.get('client_name'),
        request: searchParams.get('request'),
      }),
  })

  return (
    <>
      <Helmet title="Gestão de Clientes & Atendimento" />
      <div className="flex flex-col gap-6 p-2 sm:p-6">
        <PageHeader
          title="Gestão de Clientes"
          description="Central unificada de atendimentos, ordens de serviço, equipamentos, grupos multi-lojas e redes VPN corporativas."
        />

        <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
          <div className="border-b border-border/60 pb-1">
            <TabsList className="bg-secondary/40 p-1 rounded-xl h-auto gap-1">
              <TabsTrigger value="treatments" className="gap-2 py-2 px-4 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-md">
                <ClipboardList className="h-4 w-4 text-primary" />
                Atendimentos & O.S.
              </TabsTrigger>
              <TabsTrigger value="equipments" className="gap-2 py-2 px-4 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-md">
                <MonitorSmartphone className="h-4 w-4 text-sky-400" />
                Equipamentos & Telemetria
              </TabsTrigger>
              <TabsTrigger value="groups" className="gap-2 py-2 px-4 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-md">
                <Layers className="h-4 w-4 text-amber-400" />
                Clientes & Grupos Multi-Lojas
              </TabsTrigger>
              <TabsTrigger value="vpn" className="gap-2 py-2 px-4 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-md">
                <ShieldCheck className="h-4 w-4 text-indigo-400" />
                Rede VPN (NOC)
              </TabsTrigger>
              <TabsTrigger value="syncthing" className="gap-2 py-2 px-4 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-md">
                <FolderSync className="h-4 w-4 text-teal-400" />
                Sincronização P2P
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ABA 1: ATENDIMENTOS / O.S. */}
          <TabsContent value="treatments" className="space-y-4">
            <div className="flex items-center justify-between">
              <TreatmentTableFilters />
              <Dialog open={isNewTreatmentOpen} onOpenChange={setIsNewTreatmentOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2 shadow-lg shadow-primary/20">
                    <Plus className="h-4 w-4" /> Novo Atendimento
                  </Button>
                </DialogTrigger>
                <Treatment onClose={() => setIsNewTreatmentOpen(false)} />
              </Dialog>
            </div>

            <div className="rounded-xl border border-border/60 bg-card/60 backdrop-blur-xl shadow-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead className="w-28">Status</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Solicitação / Defeito</TableHead>
                    <TableHead>Equipamento</TableHead>
                    <TableHead className="w-36">Abertura</TableHead>
                    <TableHead className="w-20 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result &&
                    result.treatments.map((treatment: any) => (
                      <TreatmentTableRow key={treatment.id} treatment={treatment} />
                    ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ABA 2: EQUIPAMENTOS & TELEMETRIA */}
          <TabsContent value="equipments">
            <ClientsEquipments />
          </TabsContent>

          {/* ABA 3: CLIENTES & GRUPOS MULTI-LOJAS */}
          <TabsContent value="groups">
            <ClientsGroupsTab />
          </TabsContent>

          {/* ABA 4: REDE VPN (NOC HEADSCALE) */}
          <TabsContent value="vpn">
            <VpnNocTab />
          </TabsContent>

          {/* ABA 5: SINCRONIZAÇÃO P2P (SYNCTHING) */}
          <TabsContent value="syncthing">
            <SyncthingTab />
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
