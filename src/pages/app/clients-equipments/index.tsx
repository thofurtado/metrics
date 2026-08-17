import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ArrowLeft,
  CheckCircle2,
  Link2,
  MonitorSmartphone,
  MonitorPlay,
  Plus,
  RefreshCw,
  Users,
} from 'lucide-react'
import { useEffect, useState } from 'react'
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
import { api } from '@/lib/axios'

import { EquipmentDetailsModal } from './components/equipment-details-modal'

export function ClientsEquipments() {
  const queryClient = useQueryClient()

  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)

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
      <div className="flex flex-col gap-4 px-5 pb-10 md:px-0">
        <PageHeader
          title="Central de Clientes & Equipamentos"
          description="Gestão completa de clientes e monitoramento de equipamentos em tempo real."
        >
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Link>
            </Button>
            <Button
              variant="outline"
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

        <Tabs defaultValue="clients" className="mt-2 w-full">
          <TabsList className="mb-4 h-auto rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
            <TabsTrigger value="clients" className="rounded-lg py-2.5">
              <Users className="mr-2 h-4 w-4" />
              Clientes
            </TabsTrigger>
            <TabsTrigger value="fleet" className="rounded-lg py-2.5">
              <MonitorSmartphone className="mr-2 h-4 w-4" />
              Equipamentos (Vinculados)
            </TabsTrigger>
            <TabsTrigger value="orphans" className="rounded-lg py-2.5">
              Órfãos (Aguardando Vínculo)
              {orphans && orphans.length > 0 && (
                <span className="ml-2 animate-pulse rounded-full bg-indigo-500 px-2 py-0.5 text-xs text-white">
                  {orphans.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* TAB: CLIENTES */}
          <TabsContent value="clients">
            <div className="mb-4 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-200">
                  Gerenciamento de Clientes
                </h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Visualize e administre a carteira de clientes.
                </p>
              </div>
              <Button className="bg-indigo-600 font-bold text-white hover:bg-indigo-700">
                <Plus className="mr-2 h-4 w-4" />
                Novo Cliente
              </Button>
            </div>

            <div className="overflow-hidden rounded-xl border bg-white dark:bg-slate-950">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-900">
                  <TableRow>
                    <TableHead>Nome Fantasia</TableHead>
                    <TableHead>Identificação</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead className="text-center">Equipamentos</TableHead>
                    <TableHead className="text-center">
                      Contrato Ativo
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingClients ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
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
                        colSpan={6}
                        className="h-24 text-center text-muted-foreground"
                      >
                        Nenhum cliente cadastrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* TAB: EQUIPAMENTOS VINCULADOS */}
          <TabsContent value="fleet">
            <div className="mb-4 flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30">
              <div>
                <h3 className="font-bold text-emerald-900 dark:text-emerald-300">
                  Equipamentos Vinculados
                </h3>
                <p className="mt-1 text-sm text-emerald-700/80 dark:text-emerald-400/80">
                  Clique em um equipamento para abrir os detalhes de telemetria
                  e manutenção.
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border bg-white dark:bg-slate-950">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-900">
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Identificação</TableHead>
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
                      const isOnline = eq.is_online
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
                            {eq.last_telemetry?.osInfo?.hostname || eq.identification || eq.type || 'Equipamento'}
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
          </TabsContent>

          {/* TAB: ÓRFÃOS */}
          <TabsContent value="orphans">
            <div className="mb-4 flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/30">
              <div>
                <h3 className="font-bold text-indigo-900 dark:text-indigo-300">
                  Equipamentos Órfãos
                </h3>
                <p className="mt-1 text-sm text-indigo-700/80 dark:text-indigo-400/80">
                  Máquinas que se comunicaram com a API mas ainda não possuem um
                  cliente associado.
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border bg-white dark:bg-slate-950">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-900">
                  <TableRow>
                    <TableHead>Identificação / Detalhes</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Entrada no Sistema</TableHead>
                    <TableHead className="w-[300px]">
                      Vincular Cliente
                    </TableHead>
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
                            {orphan.last_telemetry?.osInfo?.hostname || orphan.details ||
                              orphan.identification ||
                              'Desconhecido'}
                          </div>
                        </TableCell>
                        <TableCell className="capitalize text-slate-500">
                          {orphan.type}
                        </TableCell>
                        <TableCell className="text-sm font-medium text-slate-500">
                          {format(
                            new Date(
                              orphan.entry || orphan.created_at || new Date(),
                            ),
                            'dd/MM/yyyy HH:mm',
                            { locale: ptBR },
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Select
                              onValueChange={(val) => {
                                if (val) {
                                  handleLink({ id: orphan.id, client_id: val })
                                }
                              }}
                            >
                              <SelectTrigger className="h-9 bg-white dark:bg-slate-900">
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
                      <TableCell
                        colSpan={4}
                        className="h-24 text-center text-muted-foreground"
                      >
                        Nenhum equipamento aguardando vínculo.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <EquipmentDetailsModal
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
        equipment={selectedEquipmentId ? (vinculados.find((eq: any) => eq.id === selectedEquipmentId) || orphans?.find((eq: any) => eq.id === selectedEquipmentId)) : null}
      />
    </>
  )
}





