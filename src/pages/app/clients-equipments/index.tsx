import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Link2,
  MonitorSmartphone,
  MonitorPlay,
  Plus,
  RefreshCw,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { getClients } from '@/api/get-clients'
import { getOrphans } from '@/api/get-orphans'
import { linkEquipment } from '@/api/link-equipment'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { Dialog } from '@/components/ui/dialog'
import { TreatmentClient } from '../treatments/treatment-client'
import { EquipmentDetailsModal } from './components/equipment-details-modal'
import { NiimbotLabelModal } from '../treatments/components/niimbot-label-modal'
import { Printer } from 'lucide-react'

export function checkIsOnline(equipment: any, maxInactiveMinutes = 3): boolean {
  if (!equipment || !equipment.last_seen_at) return false
  const lastSeenDate = new Date(equipment.last_seen_at)
  if (isNaN(lastSeenDate.getTime())) return false
  const diffMs = Date.now() - lastSeenDate.getTime()
  return Boolean(equipment.is_online) && diffMs >= 0 && diffMs < maxInactiveMinutes * 60 * 1000
}

export function ClientsEquipments() {
  const queryClient = useQueryClient()

  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)
  const [isNewClientOpen, setIsNewClientOpen] = useState(false)
  const [labelModalOpen, setLabelModalOpen] = useState(false)
  const [selectedLabelEquipment, setSelectedLabelEquipment] = useState<any>(null)

  // Queries
  const { data: clients, isLoading: isLoadingClients } = useQuery({
    queryKey: ['clients-fleet'],
    queryFn: getClients,
    refetchInterval: 10000,
  })

  const { data: orphans, isLoading: isLoadingOrphans } = useQuery({
    queryKey: ['orphans-fleet'],
    queryFn: getOrphans,
    refetchInterval: 10000,
  })

  const { mutateAsync: handleLink, isPending: isLinking } = useMutation({
    mutationFn: linkEquipment,
    onSuccess: () => {
      toast.success('Equipamento vinculado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['clients-fleet'] })
      queryClient.invalidateQueries({ queryKey: ['orphans-fleet'] })
    },
    onError: () => toast.error('Erro ao vincular equipamento.'),
  })

  // Dados processados
  const vinculados =
    clients?.flatMap((client: any) =>
      (client.equipments || []).map((eq: any) => ({ ...eq, client })),
    ) || []

  const handleOpenDetails = (equipment: any) => {
    setSelectedEquipmentId(equipment.id)
    setDetailsModalOpen(true)
  }

  return (
    <>
      <Helmet title="Clientes e Equipamentos" />
      <div className="flex flex-col gap-4 px-2 pb-10 md:px-0">
        <PageHeader
          title="Central de Clientes & Equipamentos"
          description="Gestão completa de clientes e monitoramento de equipamentos em tempo real."
        >
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['clients-fleet'] })
                queryClient.invalidateQueries({ queryKey: ['orphans-fleet'] })
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
          </div>
        </PageHeader>

        <Tabs defaultValue="fleet" className="mt-2 w-full">
          <TabsList className="mb-4 flex h-auto w-full flex-wrap gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-900 sm:w-auto">
            <TabsTrigger value="fleet" className="flex-1 rounded-lg py-2.5 sm:flex-none">
              <MonitorSmartphone className="mr-2 h-4 w-4" />
              Equipamentos
            </TabsTrigger>
            <TabsTrigger value="clients" className="flex-1 rounded-lg py-2.5 sm:flex-none">
              <Users className="mr-2 h-4 w-4" />
              Clientes
            </TabsTrigger>
            <TabsTrigger value="orphans" className="flex-1 rounded-lg py-2.5 sm:flex-none">
              Aguardando Vínculo
              {orphans && orphans.length > 0 && (
                <span className="ml-2 animate-pulse rounded-full bg-indigo-500 px-2 py-0.5 text-xs text-white">
                  {orphans.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* TAB: EQUIPAMENTOS VINCULADOS */}
          <TabsContent value="fleet">
            <div className="mb-4 flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30">
              <div>
                <h3 className="font-bold text-emerald-900 dark:text-emerald-300">
                  Equipamentos Vinculados
                </h3>
                <p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-400/80 sm:text-sm">
                  Toque em um equipamento para abrir telemetria, diagnóstico e acesso remoto.
                </p>
              </div>
            </div>

            {/* DESKTOP TABLE */}
            <div className="hidden overflow-hidden rounded-xl border bg-white dark:bg-slate-950 md:block">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-900">
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Identificação do Computador</TableHead>
                    <TableHead>Cliente Dono</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Último Contato</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingClients ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        Buscando equipamentos...
                      </TableCell>
                    </TableRow>
                  ) : vinculados.length > 0 ? (
                    vinculados.map((eq: any) => {
                      const isOnline = checkIsOnline(eq)
                      const lastSeen = eq.last_seen_at
                        ? format(new Date(eq.last_seen_at), 'dd/MM HH:mm', {
                            locale: ptBR,
                          })
                        : 'Nunca'

                      return (
                        <TableRow
                          key={eq.id}
                          className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50"
                          onClick={() => handleOpenDetails(eq)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span
                                className={`h-3 w-3 rounded-full ${isOnline ? 'animate-pulse bg-emerald-500' : 'bg-slate-400'}`}
                              ></span>
                              <span
                                className={`text-xs font-bold uppercase ${isOnline ? 'text-emerald-600' : 'text-slate-500'}`}
                              >
                                {isOnline ? 'Online' : 'Offline'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="font-bold text-slate-800 dark:text-slate-200">
                            <div className="flex items-center gap-2">
                              <span>{eq.last_telemetry?.osInfo?.hostname || eq.identification || eq.type || 'Equipamento'}</span>
                              <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-bold text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300">
                                v{eq.last_telemetry?.windy?.version || '2.0.0'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium text-slate-600 dark:text-slate-400">
                            {eq.client?.name}
                          </TableCell>
                          <TableCell className="capitalize text-slate-500">
                            {eq.type}
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium text-slate-500">
                            {lastSeen}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-24 text-center text-muted-foreground"
                      >
                        Nenhum equipamento vinculado encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* MOBILE CARDS (Adaptive Design) */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {isLoadingClients ? (
                <div className="rounded-xl border bg-white p-6 text-center text-sm text-muted-foreground dark:bg-slate-950">
                  Buscando equipamentos...
                </div>
              ) : vinculados.length > 0 ? (
                vinculados.map((eq: any) => {
                  const isOnline = checkIsOnline(eq)
                  const lastSeen = eq.last_seen_at
                    ? format(new Date(eq.last_seen_at), 'dd/MM HH:mm', { locale: ptBR })
                    : 'Nunca'

                  return (
                    <div
                      key={eq.id}
                      onClick={() => handleOpenDetails(eq)}
                      className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all active:scale-[0.98] dark:border-slate-800 dark:bg-slate-950"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${isOnline ? 'animate-pulse bg-emerald-500' : 'bg-slate-400'}`} />
                          <span className={`text-xs font-bold uppercase tracking-wide ${isOnline ? 'text-emerald-600' : 'text-slate-500'}`}>
                            {isOnline ? 'Online' : 'Offline'}
                          </span>
                        </div>
                        <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-bold text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300">
                          v{eq.last_telemetry?.windy?.version || '2.0.0'}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center justify-between">
                        <div>
                          <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">
                            {eq.last_telemetry?.osInfo?.hostname || eq.identification || eq.type || 'Equipamento'}
                          </h4>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            {eq.client?.name || 'Sem cliente vinculado'}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-400" />
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-400 dark:border-slate-800">
                        <span>Tipo: <strong className="capitalize text-slate-600 dark:text-slate-300">{eq.type}</strong></span>
                        <span>Visto: <strong>{lastSeen}</strong></span>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="rounded-xl border bg-white p-6 text-center text-sm text-muted-foreground dark:bg-slate-950">
                  Nenhum equipamento vinculado encontrado.
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAB: CLIENTES */}
          <TabsContent value="clients">
            <div className="mb-4 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-200">
                  Gerenciamento de Clientes
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
                  Visualize e administre a carteira de clientes.
                </p>
              </div>
              <Button size="sm" onClick={() => setIsNewClientOpen(true)} className="bg-indigo-600 font-bold text-white hover:bg-indigo-700">
                <Plus className="mr-2 h-4 w-4" />
                Novo Cliente
              </Button>
            </div>

            {/* DESKTOP TABLE */}
            <div className="hidden overflow-hidden rounded-xl border bg-white dark:bg-slate-950 md:block">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-900">
                  <TableRow>
                    <TableHead>Nome Fantasia</TableHead>
                    <TableHead>Identificação</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead className="text-center">Equipamentos</TableHead>
                    <TableHead className="text-center">Contrato Ativo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingClients ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        Carregando clientes...
                      </TableCell>
                    </TableRow>
                  ) : clients && clients.length > 0 ? (
                    clients.map((client: any) => (
                      <TableRow
                        key={client.id}
                        className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50"
                      >
                        <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                          {client.name}
                        </TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-400">
                          {client.identification || '-'}
                        </TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-400">
                          {client.phone || '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="rounded-full bg-indigo-50 px-3 py-1 font-bold text-indigo-600 dark:bg-indigo-900/20">
                            {(client.equipments || []).length}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {client.contract ? (
                            <span className="rounded-full bg-emerald-50 px-3 py-1 font-bold text-emerald-600 dark:bg-emerald-900/20">
                              Sim
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-500 dark:bg-slate-800">
                              Não
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-24 text-center text-muted-foreground"
                      >
                        Nenhum cliente cadastrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* MOBILE CARDS FOR CLIENTS */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {isLoadingClients ? (
                <div className="rounded-xl border bg-white p-6 text-center text-sm text-muted-foreground dark:bg-slate-950">
                  Carregando clientes...
                </div>
              ) : clients && clients.length > 0 ? (
                clients.map((client: any) => (
                  <div
                    key={client.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950"
                  >
                    <div className="flex items-start justify-between">
                      <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">
                        {client.name}
                      </h4>
                      <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-600 dark:bg-indigo-900/20">
                        {(client.equipments || []).length} equip.
                      </span>
                    </div>

                    <div className="mt-2 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <div>Doc: <strong className="text-slate-700 dark:text-slate-300">{client.identification || '-'}</strong></div>
                      <div>Tel: <strong className="text-slate-700 dark:text-slate-300">{client.phone || '-'}</strong></div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border bg-white p-6 text-center text-sm text-muted-foreground dark:bg-slate-950">
                  Nenhum cliente cadastrado.
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAB: Ã“RFÃƒOS */}
          <TabsContent value="orphans">
            <div className="mb-4 flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/30">
              <div>
                <h3 className="font-bold text-indigo-900 dark:text-indigo-300">
                  Equipamentos Órfãos
                </h3>
                <p className="mt-1 text-xs text-indigo-700/80 dark:text-indigo-400/80 sm:text-sm">
                  Máquinas que se comunicaram com a API mas ainda não possuem um cliente associado.
                </p>
              </div>
            </div>

            {/* DESKTOP TABLE */}
            <div className="hidden overflow-hidden rounded-xl border bg-white dark:bg-slate-950 md:block">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-900">
                  <TableRow>
                    <TableHead>Identificação / Detalhes</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Entrada no Sistema</TableHead>
                    <TableHead className="w-[300px]">Vincular Cliente</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingOrphans ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        Buscando órfãos...
                      </TableCell>
                    </TableRow>
                  ) : orphans && orphans.length > 0 ? (
                    orphans.map((orphan: any) => (
                      <TableRow
                        key={orphan.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-900/50"
                      >
                        <TableCell>
                          <div
                            className="cursor-pointer font-bold text-slate-800 transition-colors hover:text-indigo-600 dark:text-slate-200"
                            onClick={() => handleOpenDetails(orphan)}
                            title="Clique para ver detalhes do equipamento"
                          >
                            {orphan.last_telemetry?.osInfo?.hostname || orphan.identification || orphan.type || 'Equipamento'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {orphan.ip_address} â€¢ CPU: {orphan.last_telemetry?.cpu?.currentLoad?.toFixed(0) || 0}%
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">{orphan.type}</TableCell>
                        <TableCell>
                          {orphan.created_at
                            ? format(new Date(orphan.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Select
                              disabled={isLinking}
                              onValueChange={(clientId) => handleLink({ id: orphan.id, client_id: clientId, equipmentId: orphan.id, clientId })}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Selecione um cliente..." />
                              </SelectTrigger>
                              <SelectContent>
                                {clients?.map((client: any) => (
                                  <SelectItem key={client.id} value={client.id}>
                                    {client.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        Nenhum equipamento aguardando vínculo.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* MOBILE CARDS FOR ORPHANS */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {isLoadingOrphans ? (
                <div className="rounded-xl border bg-white p-6 text-center text-sm text-muted-foreground dark:bg-slate-950">
                  Buscando órfãos...
                </div>
              ) : orphans && orphans.length > 0 ? (
                orphans.map((orphan: any) => (
                  <div
                    key={orphan.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950"
                  >
                    <div
                      className="cursor-pointer"
                      onClick={() => handleOpenDetails(orphan)}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">
                          {orphan.last_telemetry?.osInfo?.hostname || orphan.identification || orphan.type || 'Equipamento'}
                        </h4>
                        <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                          Órfão
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {orphan.ip_address} â€¢ CPU: {orphan.last_telemetry?.cpu?.currentLoad?.toFixed(0) || 0}%
                      </p>
                    </div>

                    <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                      <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                        Vincular ao Cliente:
                      </label>
                      <Select
                        disabled={isLinking}
                        onValueChange={(clientId) => handleLink({ id: orphan.id, client_id: clientId, equipmentId: orphan.id, clientId })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione um cliente..." />
                        </SelectTrigger>
                        <SelectContent>
                          {clients?.map((client: any) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border bg-white p-6 text-center text-sm text-muted-foreground dark:bg-slate-950">
                  Nenhum equipamento aguardando vínculo.
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <NiimbotLabelModal
        open={labelModalOpen}
        onOpenChange={setLabelModalOpen}
        equipment={selectedLabelEquipment}
      />
      <EquipmentDetailsModal
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
        equipment={selectedEquipmentId ? (vinculados.find((eq: any) => eq.id === selectedEquipmentId) || orphans?.find((eq: any) => eq.id === selectedEquipmentId)) : null}
      />

      <Dialog open={isNewClientOpen} onOpenChange={setIsNewClientOpen}>
        {isNewClientOpen && (
          <TreatmentClient
            onClose={() => {
              setIsNewClientOpen(false)
              queryClient.invalidateQueries({ queryKey: ['clients-fleet'] })
              queryClient.invalidateQueries({ queryKey: ['clients'] })
            }}
          />
        )}
      </Dialog>
    </>
  )
}

