import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { ArrowLeft, RefreshCw, Users, MonitorSmartphone, Plus, CheckCircle2, Link2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { api } from '@/lib/axios'
import { getClients } from '@/api/get-clients'
import { getOrphans } from '@/api/get-orphans'
import { linkEquipment } from '@/api/link-equipment'

import { PageHeader } from '@/components/page-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EquipmentDetailsModal } from './components/equipment-details-modal'

export function ClientsEquipments() {
  const queryClient = useQueryClient()
  
  const [selectedEquipment, setSelectedEquipment] = useState<any>(null)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)

  // Queries
  const { data: clients, isLoading: isLoadingClients } = useQuery({
    queryKey: ['clients-fleet'],
    queryFn: getClients,
  })

  const { data: orphans, isLoading: isLoadingOrphans } = useQuery({
    queryKey: ['orphans-fleet'],
    queryFn: getOrphans,
    refetchInterval: 10000
  })

  const { mutateAsync: handleLink, isPending: isLinking } = useMutation({
    mutationFn: linkEquipment,
    onSuccess: () => {
      toast.success('Equipamento vinculado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['clients-fleet'] })
      queryClient.invalidateQueries({ queryKey: ['orphans-fleet'] })
    },
    onError: () => toast.error('Erro ao vincular equipamento.')
  })

  // Dados processados
  const vinculados = clients?.flatMap((client: any) => 
    (client.equipments || []).map((eq: any) => ({ ...eq, client }))
  ) || []

  const handleOpenDetails = (equipment: any) => {
    setSelectedEquipment(equipment)
    setDetailsModalOpen(true)
  }

  return (
    <>
      <Helmet title="Clientes e Equipamentos" />
      <div className="flex flex-col gap-4 px-5 md:px-0 pb-10">
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
            <Button variant="outline" onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['clients-fleet'] })
              queryClient.invalidateQueries({ queryKey: ['orphans-fleet'] })
            }}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
          </div>
        </PageHeader>

        <Tabs defaultValue="clients" className="w-full mt-2">
          <TabsList className="mb-4 bg-slate-100 dark:bg-slate-900 rounded-xl p-1 h-auto">
            <TabsTrigger value="clients" className="rounded-lg py-2.5">
              <Users className="w-4 h-4 mr-2" />
              Clientes
            </TabsTrigger>
            <TabsTrigger value="fleet" className="rounded-lg py-2.5">
              <MonitorSmartphone className="w-4 h-4 mr-2" />
              Equipamentos (Vinculados)
            </TabsTrigger>
            <TabsTrigger value="orphans" className="rounded-lg py-2.5">
              Órfãos (Aguardando Vínculo)
              {orphans && orphans.length > 0 && (
                <span className="ml-2 bg-indigo-500 text-white text-xs px-2 py-0.5 rounded-full animate-pulse">
                  {orphans.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* TAB: CLIENTES */}
          <TabsContent value="clients">
            <div className="flex justify-between items-center mb-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-200">Gerenciamento de Clientes</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Visualize e administre a carteira de clientes.
                </p>
              </div>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                <Plus className="w-4 h-4 mr-2" />
                Novo Cliente
              </Button>
            </div>

            <div className="rounded-xl border bg-white dark:bg-slate-950 overflow-hidden">
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
                      <TableCell colSpan={5} className="text-center h-24">Carregando clientes...</TableCell>
                    </TableRow>
                  ) : clients && clients.length > 0 ? (
                    clients.map((client: any) => (
                      <TableRow key={client.id} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50">
                        <TableCell className="font-medium text-slate-900 dark:text-slate-100">{client.name}</TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-400">{client.identification || '-'}</TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-400">{client.phone || '-'}</TableCell>
                        <TableCell className="text-center">
                          <span className="font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1 rounded-full">
                            {(client.equipments || []).length}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {client.contract ? (
                            <span className="text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 rounded-full">Sim</span>
                          ) : (
                            <span className="text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">Não</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
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
            <div className="flex justify-between items-center mb-4 bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
              <div>
                <h3 className="font-bold text-emerald-900 dark:text-emerald-300">Equipamentos Vinculados</h3>
                <p className="text-sm text-emerald-700/80 dark:text-emerald-400/80 mt-1">
                  Clique em um equipamento para abrir os detalhes de telemetria e manutenção.
                </p>
              </div>
            </div>

            <div className="rounded-xl border bg-white dark:bg-slate-950 overflow-hidden">
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
                      <TableCell colSpan={5} className="text-center h-24">Buscando equipamentos...</TableCell>
                    </TableRow>
                  ) : vinculados.length > 0 ? (
                    vinculados.map((eq: any) => {
                      const isOnline = eq.is_online
                      const lastSeen = eq.last_seen_at ? format(new Date(eq.last_seen_at), "dd/MM HH:mm", { locale: ptBR }) : 'Nunca'

                      return (
                        <TableRow 
                          key={eq.id} 
                          className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50"
                          onClick={() => handleOpenDetails(eq)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className={`h-3 w-3 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                              <span className={`font-bold text-xs uppercase ${isOnline ? 'text-emerald-600' : 'text-slate-500'}`}>
                                {isOnline ? 'Online' : 'Offline'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="font-bold text-slate-800 dark:text-slate-200">
                            {eq.identification || eq.type || 'Equipamento'}
                          </TableCell>
                          <TableCell className="font-medium text-slate-600 dark:text-slate-400">
                            {eq.client?.name}
                          </TableCell>
                          <TableCell className="capitalize text-slate-500">
                            {eq.type}
                          </TableCell>
                          <TableCell className="text-right text-slate-500 text-sm font-medium">
                            {lastSeen}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
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
            <div className="flex justify-between items-center mb-4 bg-indigo-50 dark:bg-indigo-950/30 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
              <div>
                <h3 className="font-bold text-indigo-900 dark:text-indigo-300">Equipamentos Órfãos</h3>
                <p className="text-sm text-indigo-700/80 dark:text-indigo-400/80 mt-1">
                  Máquinas que se comunicaram com a API mas ainda não possuem um cliente associado.
                </p>
              </div>
            </div>

            <div className="rounded-xl border bg-white dark:bg-slate-950 overflow-hidden">
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
                      <TableCell colSpan={4} className="text-center h-24">Buscando órfãos...</TableCell>
                    </TableRow>
                  ) : orphans && orphans.length > 0 ? (
                    orphans.map((orphan: any) => (
                      <TableRow key={orphan.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                        <TableCell>
                          <div 
                            className="font-bold text-slate-800 dark:text-slate-200 cursor-pointer hover:text-indigo-600 transition-colors"
                            onClick={() => handleOpenDetails(orphan)}
                            title="Clique para ver detalhes do equipamento"
                          >
                            {orphan.details || orphan.identification || 'Desconhecido'}
                          </div>
                        </TableCell>
                        <TableCell className="capitalize text-slate-500">
                          {orphan.type}
                        </TableCell>
                        <TableCell className="text-slate-500 text-sm font-medium">
                          {format(new Date(orphan.entry || orphan.created_at || new Date()), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Select onValueChange={(val) => {
                              if (val) {
                                handleLink({ id: orphan.id, client_id: val })
                              }
                            }}>
                              <SelectTrigger className="bg-white dark:bg-slate-900 h-9">
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
                      <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
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
        equipment={selectedEquipment} 
      />
    </>
  )
}

