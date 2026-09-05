import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Building2, 
  Plus, 
  Users, 
  Layers, 
  ShieldCheck, 
  Trash2, 
  Search, 
  Store,
  Edit3,
  Check,
  Building,
} from 'lucide-react'
import { toast } from 'sonner'

import { getClientGroups, createClientGroup, updateClientGroup, deleteClientGroup, ClientGroup } from '@/api/client-groups'
import { getClients } from '@/api/get-clients'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

export function ClientsGroupsTab() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')

  // Modal Novo Grupo
  const [isNewGroupOpen, setIsNewGroupOpen] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [groupDesc, setGroupDesc] = useState('')
  const [selectedClients, setSelectedClients] = useState<string[]>([])
  const [clientSearchNew, setClientSearchNew] = useState('')

  // Modal Editar Grupo / Vincular Empresas
  const [isEditGroupOpen, setIsEditGroupOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<ClientGroup | null>(null)
  const [editGroupName, setEditGroupName] = useState('')
  const [editGroupDesc, setEditGroupDesc] = useState('')
  const [editSelectedClients, setEditSelectedClients] = useState<string[]>([])
  const [clientSearchEdit, setClientSearchEdit] = useState('')

  const { data: groupsData, isLoading: isLoadingGroups } = useQuery({
    queryKey: ['client-groups'],
    queryFn: getClientGroups,
  })

  const { data: clientsData } = useQuery({
    queryKey: ['clients-all'],
    queryFn: getClients,
  })

  const clientList: any[] = Array.isArray(clientsData)
    ? clientsData
    : (clientsData as any)?.clients || []

  // Criar grupo
  const createGroupMutation = useMutation({
    mutationFn: createClientGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-groups'] })
      queryClient.invalidateQueries({ queryKey: ['vpn-networks'] })
      queryClient.invalidateQueries({ queryKey: ['clients-fleet'] })
      toast.success('Grupo de Empresas criado com sucesso!')
      setIsNewGroupOpen(false)
      setGroupName('')
      setGroupDesc('')
      setSelectedClients([])
    },
    onError: (err: any) => {
      toast.error('Erro ao criar grupo: ' + (err.response?.data?.message || err.message))
    },
  })

  // Atualizar grupo / vincular empresas
  const updateGroupMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateClientGroup(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-groups'] })
      queryClient.invalidateQueries({ queryKey: ['vpn-networks'] })
      queryClient.invalidateQueries({ queryKey: ['clients-fleet'] })
      toast.success('Empresas vinculadas e grupo atualizado com sucesso!')
      setIsEditGroupOpen(false)
      setEditingGroup(null)
    },
    onError: (err: any) => {
      toast.error('Erro ao atualizar grupo: ' + (err.response?.data?.message || err.message))
    },
  })

  // Excluir grupo
  const deleteGroupMutation = useMutation({
    mutationFn: deleteClientGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-groups'] })
      queryClient.invalidateQueries({ queryKey: ['vpn-networks'] })
      queryClient.invalidateQueries({ queryKey: ['clients-fleet'] })
      toast.success('Grupo removido com sucesso.')
    },
  })

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault()
    if (!groupName.trim()) {
      toast.warning('Informe o nome do grupo.')
      return
    }
    createGroupMutation.mutate({
      name: groupName.trim(),
      description: groupDesc.trim() || undefined,
      client_ids: selectedClients,
    })
  }

  const handleOpenEdit = (group: ClientGroup) => {
    setEditingGroup(group)
    setEditGroupName(group.name)
    setEditGroupDesc(group.description || '')
    setEditSelectedClients(group.clients.map((c) => c.id))
    setClientSearchEdit('')
    setIsEditGroupOpen(true)
  }

  const handleUpdateGroup = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingGroup) return
    if (!editGroupName.trim()) {
      toast.warning('Informe o nome do grupo.')
      return
    }
    updateGroupMutation.mutate({
      id: editingGroup.id,
      data: {
        name: editGroupName.trim(),
        description: editGroupDesc.trim() || undefined,
        client_ids: editSelectedClients,
      },
    })
  }

  const toggleClientSelectionNew = (clientId: string) => {
    setSelectedClients((prev) =>
      prev.includes(clientId) ? prev.filter((id) => id !== clientId) : [...prev, clientId]
    )
  }

  const toggleClientSelectionEdit = (clientId: string) => {
    setEditSelectedClients((prev) =>
      prev.includes(clientId) ? prev.filter((id) => id !== clientId) : [...prev, clientId]
    )
  }

  const groups = groupsData?.groups || []
  const filteredGroups = groups.filter(
    (g) =>
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.description?.toLowerCase().includes(search.toLowerCase())
  )

  const filteredClientsForNew = clientList.filter((c) =>
    c.name.toLowerCase().includes(clientSearchNew.toLowerCase()) ||
    (c.identification && c.identification.toLowerCase().includes(clientSearchNew.toLowerCase()))
  )

  const filteredClientsForEdit = clientList.filter((c) =>
    c.name.toLowerCase().includes(clientSearchEdit.toLowerCase()) ||
    (c.identification && c.identification.toLowerCase().includes(clientSearchEdit.toLowerCase()))
  )

  return (
    <div className="space-y-5">
      {/* HEADER DA ABA */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Layers className="h-5 w-5 text-indigo-600" />
            Grupos Empresariais & Multi-Lojas
          </h2>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Agrupe filiais e matrizes para faturamento consolidado, chamados unificados e interligação automática de VPN corporativa.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-56 sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar grupos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-8 text-xs bg-card/60 rounded-xl"
            />
          </div>
          <Button
            size="sm"
            onClick={() => {
              setGroupName('')
              setGroupDesc('')
              setSelectedClients([])
              setClientSearchNew('')
              setIsNewGroupOpen(true)
            }}
            className="h-9 gap-1.5 rounded-xl bg-indigo-600 font-bold text-white shadow-sm hover:bg-indigo-700 text-xs"
          >
            <Plus className="h-4 w-4" /> Novo Grupo Multi-Loja
          </Button>
        </div>
      </div>

      {/* GRID DE GRUPOS */}
      {isLoadingGroups ? (
        <div className="p-12 text-center text-muted-foreground animate-pulse text-xs">
          Carregando grupos empresariais...
        </div>
      ) : filteredGroups.length === 0 ? (
        <Card className="border-dashed bg-card/40 text-center py-12 rounded-2xl">
          <CardContent className="flex flex-col items-center justify-center gap-3">
            <Building2 className="h-12 w-12 text-muted-foreground/40" />
            <div className="space-y-1">
              <p className="font-semibold text-foreground">Nenhum grupo cadastrado</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                Crie um grupo para reunir as lojas e filiais dos seus clientes e habilitar a comunicação direta de rede via VPN.
              </p>
            </div>
            <Button
              onClick={() => setIsNewGroupOpen(true)}
              variant="outline"
              size="sm"
              className="mt-2 rounded-xl text-xs"
            >
              <Plus className="h-4 w-4 mr-1.5" /> Criar Primeiro Grupo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGroups.map((group) => (
            <Card
              key={group.id}
              className="relative flex flex-col justify-between overflow-hidden rounded-2xl border-border/70 bg-card/80 backdrop-blur-xl shadow-sm hover:border-indigo-400/50 transition-all duration-200"
            >
              <div>
                <CardHeader className="pb-2.5 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-100 dark:border-indigo-900/40">
                        <Store className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {group.name}
                        </CardTitle>
                        <CardDescription className="text-[11px] truncate max-w-[180px]">
                          {group.description || 'Rede Corporativa Isolada'}
                        </CardDescription>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Botão Editar / Vincular Lojas */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40 gap-1 rounded-lg"
                        onClick={() => handleOpenEdit(group)}
                        title="Vincular ou remover lojas deste grupo"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Vincular
                      </Button>

                      {/* Excluir grupo */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive rounded-lg"
                        onClick={() => {
                          if (confirm(`Deseja realmente excluir o grupo "${group.name}"?`)) {
                            deleteGroupMutation.mutate(group.id)
                          }
                        }}
                        title="Excluir grupo"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 p-4 pt-0">
                  {/* Informação Headscale */}
                  <div className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3 text-indigo-500" /> Rede Headscale:
                    </span>
                    <Badge variant="outline" className="font-mono text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20">
                      {group.headscale_user || `group_${group.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`}
                    </Badge>
                  </div>

                  {/* Lojas / Empresas Vinculadas */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <Building className="h-3.5 w-3.5 text-slate-400" />
                        Lojas / Empresas Vinculadas ({group.clients.length}):
                      </p>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(group)}
                        className="text-[11px] font-bold text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        + Gerenciar
                      </button>
                    </div>

                    {group.clients.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-3 text-center dark:border-slate-800 dark:bg-slate-900/30">
                        <p className="text-xs text-muted-foreground italic">Nenhuma loja vinculada a este grupo.</p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-1.5 h-6 rounded-lg text-[10px] font-semibold text-indigo-600 hover:bg-indigo-50"
                          onClick={() => handleOpenEdit(group)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Vincular Lojas Agora
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {group.clients.map((c) => (
                          <Badge
                            key={c.id}
                            variant="secondary"
                            className="text-[11px] font-medium py-0.5 px-2 bg-indigo-50/80 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/40"
                          >
                            {c.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* MODAL: EDITAR GRUPO E VINCULAR EMPRESAS */}
      <Dialog open={isEditGroupOpen} onOpenChange={setIsEditGroupOpen}>
        <DialogContent className="sm:max-w-[550px] rounded-2xl">
          <form onSubmit={handleUpdateGroup}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Store className="h-5 w-5 text-indigo-600" />
                Vincular Empresas ao Grupo: <strong className="text-indigo-600">{editingGroup?.name}</strong>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Selecione as filiais e empresas que compartilharão a mesma malha privada VPN e chamados.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="editGroupName" className="text-xs font-semibold">Nome do Grupo *</Label>
                  <Input
                    id="editGroupName"
                    value={editGroupName}
                    onChange={(e) => setEditGroupName(e.target.value)}
                    required
                    className="h-8 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="editGroupDesc" className="text-xs font-semibold">Descrição / Observações</Label>
                  <Input
                    id="editGroupDesc"
                    value={editGroupDesc}
                    onChange={(e) => setEditGroupDesc(e.target.value)}
                    className="h-8 text-xs rounded-xl"
                  />
                </div>
              </div>

              {/* Lista de Clientes / Empresas para Vincular */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">
                    Lojas / Empresas Selecionadas ({editSelectedClients.length})
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    Marque para vincular à rede corporativa
                  </span>
                </div>

                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Filtrar lojas e empresas..."
                    value={clientSearchEdit}
                    onChange={(e) => setClientSearchEdit(e.target.value)}
                    className="h-8 pl-8 text-xs rounded-xl"
                  />
                </div>

                <div className="max-h-60 overflow-y-auto space-y-1 rounded-xl border border-slate-200 bg-slate-50/50 p-2 dark:border-slate-800 dark:bg-slate-900/50">
                  {filteredClientsForEdit.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      Nenhuma empresa encontrada com este nome.
                    </p>
                  ) : (
                    filteredClientsForEdit.map((client) => {
                      const isSelected = editSelectedClients.includes(client.id)
                      return (
                        <div
                          key={client.id}
                          onClick={() => toggleClientSelectionEdit(client.id)}
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-indigo-50 border border-indigo-200 dark:bg-indigo-950/50 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 font-semibold'
                              : 'bg-white hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <div
                              className={`h-4 w-4 rounded flex items-center justify-center border ${
                                isSelected
                                  ? 'bg-indigo-600 border-indigo-600 text-white'
                                  : 'border-slate-300 dark:border-slate-600'
                              }`}
                            >
                              {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                            </div>
                            <span className="text-xs truncate">{client.name}</span>
                            {client.contract && (
                              <span className="text-[9px] rounded bg-emerald-100 text-emerald-800 px-1 py-0.2 font-bold dark:bg-emerald-950 dark:text-emerald-300">
                                Contrato
                              </span>
                            )}
                          </div>

                          <span className="text-[10px] text-muted-foreground">
                            {client.identification || ''}
                          </span>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditGroupOpen(false)}
                className="h-8 rounded-xl text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={updateGroupMutation.isPending}
                className="h-8 rounded-xl bg-indigo-600 font-bold text-white hover:bg-indigo-700 text-xs"
              >
                {updateGroupMutation.isPending ? 'Salvando...' : 'Salvar Vínculos'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: NOVO GRUPO */}
      <Dialog open={isNewGroupOpen} onOpenChange={setIsNewGroupOpen}>
        <DialogContent className="sm:max-w-[550px] rounded-2xl">
          <form onSubmit={handleCreateGroup}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Building2 className="h-5 w-5 text-indigo-600" />
                Novo Grupo Multi-Loja
              </DialogTitle>
              <DialogDescription className="text-xs">
                Crie um grupo empresarial para conectar filiais em uma mesma malha segura de VPN e faturamento unificado.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="space-y-1">
                <Label htmlFor="groupName" className="text-xs font-semibold">Nome do Grupo *</Label>
                <Input
                  id="groupName"
                  placeholder="Ex: Grupo Chilili, Padaria Katatau"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  required
                  className="h-8 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="groupDesc" className="text-xs font-semibold">Descrição / Observações</Label>
                <Input
                  id="groupDesc"
                  placeholder="Ex: Rede de 3 lojas + matriz"
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                  className="h-8 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">
                    Lojas / Empresas Vinculadas ({selectedClients.length})
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    Selecione as empresas que fazem parte
                  </span>
                </div>

                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Filtrar empresas..."
                    value={clientSearchNew}
                    onChange={(e) => setClientSearchNew(e.target.value)}
                    className="h-8 pl-8 text-xs rounded-xl"
                  />
                </div>

                <div className="max-h-56 overflow-y-auto space-y-1 rounded-xl border border-slate-200 bg-slate-50/50 p-2 dark:border-slate-800 dark:bg-slate-900/50">
                  {filteredClientsForNew.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      Nenhuma empresa encontrada.
                    </p>
                  ) : (
                    filteredClientsForNew.map((client) => {
                      const isSelected = selectedClients.includes(client.id)
                      return (
                        <div
                          key={client.id}
                          onClick={() => toggleClientSelectionNew(client.id)}
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-indigo-50 border border-indigo-200 dark:bg-indigo-950/50 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 font-semibold'
                              : 'bg-white hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <div
                              className={`h-4 w-4 rounded flex items-center justify-center border ${
                                isSelected
                                  ? 'bg-indigo-600 border-indigo-600 text-white'
                                  : 'border-slate-300 dark:border-slate-600'
                              }`}
                            >
                              {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                            </div>
                            <span className="text-xs truncate">{client.name}</span>
                            {client.contract && (
                              <span className="text-[9px] rounded bg-emerald-100 text-emerald-800 px-1 py-0.2 font-bold dark:bg-emerald-950 dark:text-emerald-300">
                                Contrato
                              </span>
                            )}
                          </div>

                          <span className="text-[10px] text-muted-foreground">
                            {client.identification || ''}
                          </span>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsNewGroupOpen(false)}
                className="h-8 rounded-xl text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createGroupMutation.isPending}
                className="h-8 rounded-xl bg-indigo-600 font-bold text-white hover:bg-indigo-700 text-xs"
              >
                {createGroupMutation.isPending ? 'Criando...' : 'Criar Grupo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
