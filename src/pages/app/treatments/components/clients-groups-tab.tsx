import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Building2, 
  Plus, 
  Users, 
  Layers, 
  ShieldCheck, 
  Trash2, 
  ExternalLink,
  ChevronRight,
  Search,
  CheckCircle2,
  Store
} from 'lucide-react'
import { toast } from 'sonner'

import { getClientGroups, createClientGroup, deleteClientGroup, ClientGroup } from '@/api/client-groups'
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
  const [isNewGroupOpen, setIsNewGroupOpen] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [groupDesc, setGroupDesc] = useState('')
  const [selectedClients, setSelectedClients] = useState<string[]>([])

  const { data: groupsData, isLoading: isLoadingGroups } = useQuery({
    queryKey: ['client-groups'],
    queryFn: getClientGroups,
  })

  const { data: clientsData } = useQuery({
    queryKey: ['clients-all'],
    queryFn: () => getClients({}),
  })

  const createGroupMutation = useMutation({
    mutationFn: createClientGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-groups'] })
      queryClient.invalidateQueries({ queryKey: ['vpn-networks'] })
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

  const deleteGroupMutation = useMutation({
    mutationFn: deleteClientGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-groups'] })
      queryClient.invalidateQueries({ queryKey: ['vpn-networks'] })
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
      name: groupName,
      description: groupDesc,
      client_ids: selectedClients,
    })
  }

  const toggleClientSelection = (clientId: string) => {
    setSelectedClients(prev => 
      prev.includes(clientId) ? prev.filter(id => id !== clientId) : [...prev, clientId]
    )
  }

  const groups = groupsData?.groups || []
  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.description?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* HEADER DA ABA */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Grupos Empresariais & Multi-Lojas
          </h2>
          <p className="text-sm text-muted-foreground">
            Agrupe filiais e matrizes para faturamento consolidado, chamados unificados e interligação automática de VPN.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar grupos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-card/60"
            />
          </div>
          <Button onClick={() => setIsNewGroupOpen(true)} className="gap-2 shadow-lg shadow-primary/20">
            <Plus className="h-4 w-4" /> Novo Grupo Multi-Loja
          </Button>
        </div>
      </div>

      {/* GRID DE GRUPOS */}
      {isLoadingGroups ? (
        <div className="p-12 text-center text-muted-foreground animate-pulse">
          Carregando grupos empresariais...
        </div>
      ) : filteredGroups.length === 0 ? (
        <Card className="border-dashed bg-card/40 text-center py-12">
          <CardContent className="flex flex-col items-center justify-center gap-3">
            <Building2 className="h-12 w-12 text-muted-foreground/40" />
            <div className="space-y-1">
              <p className="font-semibold text-foreground">Nenhum grupo cadastrado</p>
              <p className="text-sm text-muted-foreground max-w-sm">
                Crie um grupo para reunir as lojas e filiais dos seus clientes e habilitar a comunicação direta de rede.
              </p>
            </div>
            <Button onClick={() => setIsNewGroupOpen(true)} variant="outline" className="mt-2">
              <Plus className="h-4 w-4 mr-2" /> Criar Primeiro Grupo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredGroups.map((group) => (
            <Card key={group.id} className="relative overflow-hidden border-border/60 bg-card/60 backdrop-blur-xl shadow-md hover:border-primary/50 transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                      <Store className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold">{group.name}</CardTitle>
                      <CardDescription className="text-xs truncate max-w-[200px]">
                        {group.description || 'Rede Corporativa Isolada'}
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      if (confirm(`Deseja realmente excluir o grupo "${group.name}"?`)) {
                        deleteGroupMutation.mutate(group.id)
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 pt-0">
                <div className="flex items-center justify-between text-xs py-1.5 px-3 rounded-lg bg-secondary/40 border border-border/40">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" /> Rede Headscale:
                  </span>
                  <Badge variant="outline" className="font-mono text-[10px] bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                    {group.headscale_user || 'Ativo'}
                  </Badge>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                    <Users className="h-3 w-3" /> Lojas / Empresas Vinculadas ({group.clients.length}):
                  </p>
                  {group.clients.length === 0 ? (
                    <p className="text-xs text-muted-foreground/60 italic">Nenhuma loja vinculada.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {group.clients.map((c) => (
                        <Badge key={c.id} variant="secondary" className="text-[11px] font-medium py-0.5">
                          {c.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* MODAL NOVO GRUPO */}
      <Dialog open={isNewGroupOpen} onOpenChange={setIsNewGroupOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleCreateGroup}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" /> Novo Grupo Multi-Loja
              </DialogTitle>
              <DialogDescription>
                Crie um grupo empresarial para conectar filiais em uma mesma malha segura de VPN e faturamento unificado.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="groupName">Nome do Grupo *</Label>
                <Input
                  id="groupName"
                  placeholder="Ex: Grupo Chilili, Padaria Katatau"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="groupDesc">Descrição / Observações</Label>
                <Input
                  id="groupDesc"
                  placeholder="Ex: Rede de 3 lojas + matriz"
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Selecione as Lojas / Empresas que fazem parte deste Grupo:</Label>
                <div className="max-h-48 overflow-y-auto space-y-1.5 border rounded-lg p-2 bg-secondary/20">
                  {clientsData?.clients?.map((client: any) => {
                    const isSelected = selectedClients.includes(client.id)
                    return (
                      <div
                        key={client.id}
                        onClick={() => toggleClientSelection(client.id)}
                        className={`flex items-center justify-between p-2 rounded-md cursor-pointer text-xs transition-colors ${
                          isSelected
                            ? 'bg-primary/15 border border-primary/40 text-primary font-semibold'
                            : 'hover:bg-secondary/60 text-foreground'
                        }`}
                      >
                        <span className="truncate">{client.name}</span>
                        {isSelected && <CheckCircle2 className="h-4 w-4 text-primary" />}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsNewGroupOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createGroupMutation.isPending}>
                {createGroupMutation.isPending ? 'Criando...' : 'Salvar Grupo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
