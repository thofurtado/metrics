import { useState, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import {
  ArrowLeft,
  RefreshCw,
  Plus,
  Search,
  Users,
  Monitor,
  Table as TableIcon,
  LayoutGrid,
  Filter,
  Sparkles,
  Printer,
  ExternalLink,
  Trash2,
  Edit3,
} from 'lucide-react'

import { getClients } from '@/api/get-clients'
import { getOrphans } from '@/api/get-orphans'
import { linkEquipment } from '@/api/link-equipment'
import { deleteEquipment } from '@/api/delete-equipment'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Dialog } from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

import { TreatmentClient } from '../treatments/treatment-client'
import { EquipmentDetailsModal } from './components/equipment-details-modal'
import { NiimbotLabelModal } from '../treatments/components/niimbot-label-modal'
import { CreateEquipmentModal } from './components/create-equipment-modal'
import { EditEquipmentModal } from './components/edit-equipment-modal'
import { ClientCard } from './components/client-card'
import { formatEquipmentTypeLabel } from './equipment-types'

export function checkIsOnline(equipment: any, maxInactiveMinutes = 6): boolean {
  if (!equipment || !equipment.last_seen_at) return false
  const lastSeenDate = new Date(equipment.last_seen_at)
  if (isNaN(lastSeenDate.getTime())) return false
  const diffMs = Date.now() - lastSeenDate.getTime()
  return diffMs > -120000 && diffMs < maxInactiveMinutes * 60 * 1000
}

export function ClientsEquipments() {
  const queryClient = useQueryClient()

  // Filtros principais (com "Apenas Contrato" ativo por padrão!)
  const [onlyContracts, setOnlyContracts] = useState<boolean>(true)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all')

  // Modais de controle
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)
  const [isNewClientOpen, setIsNewClientOpen] = useState(false)
  const [labelModalOpen, setLabelModalOpen] = useState(false)
  const [selectedLabelEquipment, setSelectedLabelEquipment] = useState<any>(null)

  // Modais de Criação / Edição / Exclusão de Equipamento
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [preselectedClientId, setPreselectedClientId] = useState<string | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingEquipment, setEditingEquipment] = useState<any | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deletingEquipment, setDeletingEquipment] = useState<any | null>(null)

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

  // Mutação para vincular órfão
  const { mutateAsync: handleLink, isPending: isLinking } = useMutation({
    mutationFn: linkEquipment,
    onSuccess: () => {
      toast.success('Equipamento vinculado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['clients-fleet'] })
      queryClient.invalidateQueries({ queryKey: ['orphans-fleet'] })
    },
    onError: () => toast.error('Erro ao vincular equipamento.'),
  })

  // Mutação para excluir equipamento
  const { mutateAsync: handleDeleteEquipment, isPending: isDeleting } = useMutation({
    mutationFn: deleteEquipment,
    onSuccess: () => {
      toast.success('Equipamento removido com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['clients-fleet'] })
      queryClient.invalidateQueries({ queryKey: ['orphans-fleet'] })
      setDeleteConfirmOpen(false)
      setDeletingEquipment(null)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Erro ao excluir equipamento.')
    },
  })

  // Todos os equipamentos vinculados (flattened)
  const allVinculados = useMemo(() => {
    return (
      clients?.flatMap((client: any) =>
        (client.equipments || []).map((eq: any) => ({ ...eq, client }))
      ) || []
    )
  }, [clients])

  // Métricas gerais calculadas
  const totalEquipmentsCount = allVinculados.length
  const totalOnlineCount = allVinculados.filter((eq: any) => checkIsOnline(eq)).length

  // Filtragem inteligente de Clientes e Equipamentos
  const filteredClients = useMemo(() => {
    if (!clients) return []

    const term = searchTerm.toLowerCase().trim()

    return clients
      .filter((client: any) => {
        // Filtro de contrato (ativo por padrão!)
        if (onlyContracts && !client.contract) {
          return false
        }
        return true
      })
      .map((client: any) => {
        const clientMatches =
          !term ||
          client.name.toLowerCase().includes(term) ||
          (client.identification && client.identification.toLowerCase().includes(term))

        // Filtra equipamentos do cliente de acordo com o termo de busca e status
        const clientEquipments = (client.equipments || []).filter((eq: any) => {
          const isOnline = checkIsOnline(eq)

          // Filtro de status online/offline
          if (statusFilter === 'online' && !isOnline) return false
          if (statusFilter === 'offline' && isOnline) return false

          // Se o cliente deu match geral no nome/doc e não há busca específica
          if (clientMatches && !term) return true

          // Se há termo de busca, verifica campos do equipamento
          if (term) {
            const hostname = (eq.last_telemetry?.osInfo?.hostname || '').toLowerCase()
            const identification = (eq.identification || '').toLowerCase()
            const type = (eq.type || '').toLowerCase()
            const brand = (eq.brand || '').toLowerCase()

            const eqMatches =
              hostname.includes(term) ||
              identification.includes(term) ||
              type.includes(term) ||
              brand.includes(term)

            return clientMatches || eqMatches
          }

          return true
        })

        return {
          ...client,
          filteredEquipments: clientEquipments,
        }
      })
      .filter((client: any) => {
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase().trim()
          const clientMatches =
            client.name.toLowerCase().includes(term) ||
            (client.identification && client.identification.toLowerCase().includes(term))
          return clientMatches || client.filteredEquipments.length > 0
        }
        return true
      })
  }, [clients, onlyContracts, searchTerm, statusFilter])

  // Handlers de Ações
  const handleOpenDetails = (equipment: any) => {
    setSelectedEquipmentId(equipment.id)
    setDetailsModalOpen(true)
  }

  const handleOpenEdit = (equipment: any) => {
    setEditingEquipment(equipment)
    setEditModalOpen(true)
  }

  const handleOpenDelete = (equipment: any) => {
    setDeletingEquipment(equipment)
    setDeleteConfirmOpen(true)
  }

  const handlePrintLabel = (equipment: any) => {
    setSelectedLabelEquipment({
      id: equipment.id,
      identification:
        equipment.identification ||
        equipment.last_telemetry?.osInfo?.hostname ||
        equipment.type,
      clientName: equipment.client?.name,
      type: equipment.type,
    })
    setLabelModalOpen(true)
  }

  const handleAddEquipmentForClient = (clientId: string) => {
    setPreselectedClientId(clientId)
    setCreateModalOpen(true)
  }

  return (
    <>
      <Helmet title="Clientes e Equipamentos" />

      <div className="flex flex-col gap-5 px-2 pb-16 md:px-0">
        {/* Header Principal */}
        <PageHeader
          title="Central de Clientes & Equipamentos"
          description="Gestão inteligente de equipamentos avulsos, telemetria Windy em tempo real e administração de clientes."
        >
          <div className="flex flex-wrap items-center gap-2">
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

            <Button
              size="sm"
              onClick={() => {
                setPreselectedClientId(null)
                setCreateModalOpen(true)
              }}
              className="bg-indigo-600 font-bold text-white shadow-sm hover:bg-indigo-700"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Novo Equipamento
            </Button>

            <Button
              size="sm"
              variant="secondary"
              onClick={() => setIsNewClientOpen(true)}
              className="font-semibold"
            >
              <Users className="mr-1.5 h-4 w-4" />
              Novo Cliente
            </Button>
          </div>
        </PageHeader>

        {/* Toolbar de Filtros e Resumo de Métricas */}
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Esquerda: Filtro de Contrato Ativo + Busca */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              {/* Switch de Contrato (Ativo por Padrão!) */}
              <div className="flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2 dark:border-slate-800 dark:bg-slate-950">
                <Switch
                  id="only-contracts-toggle"
                  checked={onlyContracts}
                  onCheckedChange={setOnlyContracts}
                  className="data-[state=checked]:bg-emerald-600"
                />
                <Label
                  htmlFor="only-contracts-toggle"
                  className="cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-200 sm:text-sm"
                >
                  Apenas Clientes de Contrato
                </Label>
                {onlyContracts && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    Padrão
                  </span>
                )}
              </div>

              {/* Input de Busca Rápida */}
              <div className="relative min-w-[240px] flex-1 sm:w-80">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Buscar cliente, máquina, hostname..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-10 rounded-2xl pl-9 text-xs sm:text-sm"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    Limpar
                  </button>
                )}
              </div>

              {/* Filtro Online/Offline */}
              <Select
                value={statusFilter}
                onValueChange={(val: any) => setStatusFilter(val)}
              >
                <SelectTrigger className="h-10 w-[140px] rounded-2xl text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="online">Apenas Online</SelectItem>
                  <SelectItem value="offline">Apenas Offline</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Direita: Contadores / Métricas Rápidas */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <Users className="h-3.5 w-3.5 text-indigo-500" />
                <span>
                  <strong>{filteredClients.length}</strong> clientes
                </span>
              </div>

              <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <Monitor className="h-3.5 w-3.5 text-slate-500" />
                <span>
                  <strong>{totalEquipmentsCount}</strong> máquinas
                </span>
              </div>

              <div className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1.5 font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                <span className="h-2 w-2 rounded-full animate-pulse bg-emerald-500" />
                <span>
                  <strong>{totalOnlineCount}</strong> online
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Abas: Visão em Cards Inteligentes (Padrão) / Tabela Geral / Órfãos */}
        <Tabs defaultValue="cards" className="w-full">
          <TabsList className="mb-4 flex h-auto w-full flex-wrap gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-slate-900 sm:w-auto">
            <TabsTrigger value="cards" className="flex-1 rounded-xl py-2.5 sm:flex-none">
              <LayoutGrid className="mr-2 h-4 w-4" />
              Visão por Clientes (Cards)
            </TabsTrigger>

            <TabsTrigger value="table" className="flex-1 rounded-xl py-2.5 sm:flex-none">
              <TableIcon className="mr-2 h-4 w-4" />
              Tabela Geral
            </TabsTrigger>

            <TabsTrigger value="orphans" className="flex-1 rounded-xl py-2.5 sm:flex-none">
              <Sparkles className="mr-2 h-4 w-4 text-amber-500" />
              Aguardando Vínculo
              {orphans && orphans.length > 0 && (
                <span className="ml-2 animate-pulse rounded-full bg-indigo-500 px-2 py-0.5 text-xs text-white">
                  {orphans.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: VISÃO INTELIGENTE POR CARDS (PADRÃO) */}
          <TabsContent value="cards" className="space-y-4">
            {isLoadingClients ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-16 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
                <p className="mt-4 text-sm font-semibold text-slate-600 dark:text-slate-400">
                  Carregando clientes e frota de computadores...
                </p>
              </div>
            ) : filteredClients.length > 0 ? (
              filteredClients.map((client: any) => (
                <ClientCard
                  key={client.id}
                  client={client}
                  equipments={client.filteredEquipments || []}
                  checkIsOnline={checkIsOnline}
                  onAddEquipment={handleAddEquipmentForClient}
                  onEditEquipment={handleOpenEdit}
                  onDeleteEquipment={handleOpenDelete}
                  onOpenDetails={handleOpenDetails}
                  onPrintLabel={handlePrintLabel}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <Filter className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                <h3 className="mt-3 text-base font-bold text-slate-800 dark:text-slate-200">
                  Nenhum cliente encontrado com os filtros atuais
                </h3>
                <p className="mt-1 max-w-md text-xs text-slate-500 dark:text-slate-400">
                  {onlyContracts
                    ? 'O filtro "Apenas Clientes de Contrato" está ativo por padrão. Você pode desativá-lo acima para visualizar todos os clientes avulsos.'
                    : 'Tente alterar os termos de busca para encontrar clientes ou equipamentos.'}
                </p>
                <div className="mt-4 flex gap-2">
                  {onlyContracts && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setOnlyContracts(false)}
                      className="rounded-xl"
                    >
                      Mostrar Todos os Clientes
                    </Button>
                  )}
                  {searchTerm && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSearchTerm('')}
                      className="rounded-xl"
                    >
                      Limpar Busca
                    </Button>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          {/* TAB 2: TABELA GERAL */}
          <TabsContent value="table">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-900/80">
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Identificação / Computador</TableHead>
                    <TableHead>Cliente Dono</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>CPU / RAM</TableHead>
                    <TableHead className="text-right">Último Contato</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingClients ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center">
                        Buscando equipamentos...
                      </TableCell>
                    </TableRow>
                  ) : allVinculados.length > 0 ? (
                    allVinculados.map((eq: any) => {
                      const isOnline = checkIsOnline(eq)
                      const lastSeen = eq.last_seen_at
                        ? format(new Date(eq.last_seen_at), 'dd/MM HH:mm', { locale: ptBR })
                        : 'Nunca'
                      const typeLabel = formatEquipmentTypeLabel(eq.type)
                      const windyVer = eq.last_telemetry?.windy?.version
                      const cpuLoad = eq.last_telemetry?.cpu?.currentLoad

                      return (
                        <TableRow
                          key={eq.id}
                          className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50"
                          onClick={() => handleOpenDetails(eq)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span
                                className={`h-2.5 w-2.5 rounded-full ${
                                  isOnline ? 'animate-pulse bg-emerald-500' : 'bg-slate-400'
                                }`}
                              />
                              <span
                                className={`text-xs font-bold uppercase ${
                                  isOnline ? 'text-emerald-600' : 'text-slate-500'
                                }`}
                              >
                                {isOnline ? 'Online' : 'Offline'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="font-bold text-slate-800 dark:text-slate-200">
                            <div>
                              <span>{eq.identification || eq.last_telemetry?.osInfo?.hostname || typeLabel}</span>
                              {eq.brand && (
                                <span className="block text-xs font-normal text-slate-400">
                                  {eq.brand}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium text-slate-600 dark:text-slate-400">
                            {eq.client?.name || '-'}
                          </TableCell>
                          <TableCell>
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              {typeLabel}
                            </span>
                          </TableCell>
                          <TableCell>
                            {windyVer ? (
                              <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-bold text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300">
                                v{windyVer}
                              </span>
                            ) : (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                Manual
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                            {cpuLoad !== undefined ? `CPU ${Math.round(cpuLoad)}%` : '--'}
                          </TableCell>
                          <TableCell className="text-right text-xs font-medium text-slate-500">
                            {lastSeen}
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-slate-600 hover:text-indigo-600"
                                onClick={() => handleOpenEdit(eq)}
                                title="Editar equipamento"
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-indigo-600 hover:bg-indigo-50"
                                onClick={() => handlePrintLabel(eq)}
                                title="Imprimir Etiqueta Niimbot"
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-emerald-600 hover:bg-emerald-50"
                                onClick={() => window.open(`/equipamento/${eq.id}`, '_blank')}
                                title="Visualizar Prontuário Público"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                                onClick={() => handleOpenDelete(eq)}
                                title="Excluir equipamento"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                        Nenhum equipamento encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* TAB 3: ÓRFÃOS (AGUARDANDO VÍNCULO) */}
          <TabsContent value="orphans">
            <div className="mb-4 flex items-center justify-between rounded-3xl border border-indigo-100 bg-indigo-50/80 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/30">
              <div>
                <h3 className="font-bold text-indigo-900 dark:text-indigo-300">
                  Equipamentos Aguardando Vínculo (Órfãos)
                </h3>
                <p className="mt-1 text-xs text-indigo-700/80 dark:text-indigo-400/80 sm:text-sm">
                  Máquinas com o agente Windy instalado que se comunicaram com a API mas ainda não possuem um cliente associado.
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-900">
                  <TableRow>
                    <TableHead>Identificação / Hostname</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Entrada no Sistema</TableHead>
                    <TableHead className="w-[320px]">Vincular ao Cliente</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingOrphans ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        Buscando órfãos...
                      </TableCell>
                    </TableRow>
                  ) : orphans && orphans.length > 0 ? (
                    orphans.map((orphan: any) => (
                      <TableRow key={orphan.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                        <TableCell>
                          <div
                            className="cursor-pointer font-bold text-slate-800 transition-colors hover:text-indigo-600 dark:text-slate-200"
                            onClick={() => handleOpenDetails(orphan)}
                            title="Clique para ver detalhes do equipamento"
                          >
                            {orphan.last_telemetry?.osInfo?.hostname || orphan.identification || orphan.type || 'Equipamento'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {orphan.ip_address} • CPU: {orphan.last_telemetry?.cpu?.currentLoad?.toFixed(0) || 0}%
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {formatEquipmentTypeLabel(orphan.type)}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {orphan.created_at
                            ? format(new Date(orphan.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Select
                            disabled={isLinking}
                            onValueChange={(clientId) =>
                              handleLink({
                                id: orphan.id,
                                client_id: clientId,
                                equipmentId: orphan.id,
                                clientId,
                              })
                            }
                          >
                            <SelectTrigger className="w-full rounded-xl">
                              <SelectValue placeholder="Selecione um cliente..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                              {clients?.map((client: any) => (
                                <SelectItem key={client.id} value={client.id}>
                                  {client.name} {client.contract ? '⭐' : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-rose-500 hover:bg-rose-50"
                            onClick={() => handleOpenDelete(orphan)}
                            title="Excluir órfão duplicado"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
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

      {/* Modal: Criar Equipamento Avulso */}
      <CreateEquipmentModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        clients={clients || []}
        preselectedClientId={preselectedClientId}
      />

      {/* Modal: Editar Equipamento */}
      <EditEquipmentModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        equipment={editingEquipment}
        clients={clients || []}
      />

      {/* Diálogo de Confirmação de Exclusão */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
              <Trash2 className="h-5 w-5" />
              Excluir Equipamento da Base
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-sm">
              <p>
                Tem certeza que deseja excluir o equipamento{' '}
                <strong className="text-foreground">
                  {deletingEquipment?.identification ||
                    deletingEquipment?.last_telemetry?.osInfo?.hostname ||
                    deletingEquipment?.type ||
                    'selecionado'}
                </strong>
                ?
              </p>
              <p className="text-xs text-muted-foreground">
                Esta ação removerá o cadastro do equipamento da base. É ideal para limpar duplicatas causadas por atualizações de versão do Windy ou máquinas desativadas. O histórico de atendimentos e ordens de serviço anteriores permanecerá preservado.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="rounded-xl">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={() => deletingEquipment?.id && handleDeleteEquipment(deletingEquipment.id)}
              className="rounded-xl bg-rose-600 font-bold text-white hover:bg-rose-700"
            >
              {isDeleting ? 'Excluindo...' : 'Excluir Definitivamente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal: Etiqueta Niimbot */}
      <NiimbotLabelModal
        open={labelModalOpen}
        onOpenChange={setLabelModalOpen}
        equipment={selectedLabelEquipment}
      />

      {/* Modal: Detalhes / Telemetria / Terminal Windy */}
      <EquipmentDetailsModal
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
        equipment={
          selectedEquipmentId
            ? allVinculados.find((eq: any) => eq.id === selectedEquipmentId) ||
              orphans?.find((eq: any) => eq.id === selectedEquipmentId)
            : null
        }
      />

      {/* Modal: Novo Cliente */}
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
