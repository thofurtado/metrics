import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { Users, Save, Plus, Trash2, Pencil, Loader2, ShieldAlert } from 'lucide-react'

import { getUsersWithModules, UserWithModules } from '@/api/get-users-with-modules'
import { getModules } from '@/api/get-modules'
import { createUser, updateUser, deleteUser } from '@/api/manage-users'
import { useModules } from '@/context/module-context'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function Permissions() {
  const queryClient = useQueryClient()
  const [selectedUser, setSelectedUser] = useState<UserWithModules | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  
  // States for forms
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'MEMBER' as 'ADMIN' | 'MEMBER',
    modules: [] as string[]
  })

  // Nível 1: slugs que a instância permite — filtra o que aparece no modal
  const { availableForPermissions } = useModules()

  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['users-with-modules'],
    queryFn: getUsersWithModules,
  })

  const { data: allModules, isLoading: isLoadingModules } = useQuery({
    queryKey: ['available-modules'],
    queryFn: getModules,
  })

  const availableModules = allModules?.filter(mod => availableForPermissions.includes(mod.slug))

  // Mutations
  const { mutateAsync: saveUser, isPending: isSaving } = useMutation({
    mutationFn: async () => {
      if (isCreating) {
        return createUser(formData)
      } else if (selectedUser) {
        return updateUser({ id: selectedUser.id, ...formData })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-modules'] })
      toast.success(isCreating ? 'Usuário criado com sucesso!' : 'Usuário atualizado com sucesso!')
      closeModal()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Erro ao salvar usuário.')
    }
  })

  const { mutateAsync: removeUser, isPending: isDeleting } = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-modules'] })
      toast.success('Usuário excluído com sucesso.')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Erro ao excluir usuário.')
    }
  })

  function openCreateModal() {
    setFormData({ name: '', email: '', password: '', role: 'MEMBER', modules: [] })
    setIsCreating(true)
  }

  function openEditModal(user: UserWithModules) {
    setSelectedUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      modules: user.modules
    })
    setIsCreating(false)
  }

  function closeModal() {
    setIsCreating(false)
    setSelectedUser(null)
  }

  function toggleModule(moduleName: string, isChecked: boolean) {
    if (isChecked) {
      setFormData(prev => ({ ...prev, modules: [...prev.modules, moduleName] }))
    } else {
      setFormData(prev => ({ ...prev, modules: prev.modules.filter(m => m !== moduleName) }))
    }
  }

  async function handleDelete(id: string) {
    if (window.confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) {
      await removeUser(id)
    }
  }

  if (isLoadingUsers || isLoadingModules) {
    return (
      <div className="flex h-96 items-center justify-center">
        <span className="text-sm text-muted-foreground animate-pulse">Carregando usuários...</span>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-minsk-950 dark:text-minsk-50 flex items-center gap-2">
            <Users className="h-8 w-8 text-minsk-600" />
            Usuários e Permissões
          </h1>
          <p className="text-muted-foreground text-lg">
            Gerencie os usuários do sistema e controle os acessos de cada um.
          </p>
        </div>
        
        <Button onClick={openCreateModal} className="bg-minsk-600 hover:bg-minsk-700 text-white">
          <Plus className="mr-2 h-4 w-4" /> Novo Usuário
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {users?.map(user => (
          <Card key={user.id} className="relative group hover:shadow-md transition-shadow flex flex-col justify-between">
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-minsk-600" onClick={() => openEditModal(user)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => handleDelete(user.id)} disabled={isDeleting}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            
            <CardContent className="pt-6">
              <div className="font-semibold text-lg pr-16">{user.name}</div>
              <div className="text-sm text-muted-foreground mb-1">{user.email}</div>
              <Badge variant="outline" className={user.role === 'ADMIN' ? 'text-amber-600 border-amber-600/30 bg-amber-500/10 mb-4' : 'text-slate-500 mb-4'}>
                {user.role === 'ADMIN' ? 'Administrador' : 'Membro'}
              </Badge>
              
              <div className="flex flex-wrap gap-1.5 mt-auto">
                {user.modules.length === 0 ? (
                  <span className="text-xs text-muted-foreground italic flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" /> Sem acessos
                  </span>
                ) : (
                  user.modules.map(slug => (
                    <Badge key={slug} variant="secondary" className="text-xs bg-minsk-100 text-minsk-800 border-none">
                      {allModules?.find(m => m.slug === slug)?.name || slug}
                    </Badge>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* DIALOG DE CRIAÇÃO E EDIÇÃO */}
      <Dialog open={isCreating || selectedUser !== null} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isCreating ? 'Cadastrar Novo Usuário' : 'Editar Usuário'}</DialogTitle>
            <DialogDescription>
              {isCreating ? 'Preencha os dados abaixo para criar o acesso.' : 'Altere as informações e as permissões de acesso do usuário.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-5 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input id="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="João Silva" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="joao@empresa.com" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">{isCreating ? 'Senha de Acesso' : 'Nova Senha (opcional)'}</Label>
                <Input id="password" type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder={isCreating ? '******' : 'Deixe em branco para não alterar'} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Nível de Acesso Global</Label>
                <select 
                  id="role"
                  value={formData.role} 
                  onChange={e => setFormData({...formData, role: e.target.value as any})}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="MEMBER">Membro Padrão</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
            </div>

            <div className="pt-2 border-t mt-2">
              <Label className="text-base font-semibold">Permissões de Módulos</Label>
              <p className="text-sm text-muted-foreground mb-4">
                Selecione quais áreas do sistema este usuário poderá acessar.
              </p>
              
              <div className="grid gap-3 max-h-[300px] overflow-y-auto pr-2">
                {availableModules && availableModules.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum módulo habilitado na configuração do sistema.
                  </p>
                )}
                {availableModules?.map((mod) => (
                  <div key={mod.id} className="flex items-start space-x-3 rounded-md border p-3 hover:bg-muted/50 transition-colors">
                    <Checkbox 
                      id={`mod-${mod.id}`} 
                      checked={formData.modules.includes(mod.slug)}
                      onCheckedChange={(checked) => toggleModule(mod.slug, checked as boolean)}
                    />
                    <div className="space-y-1 leading-none mt-0.5">
                      <Label htmlFor={`mod-${mod.id}`} className="font-medium cursor-pointer">
                        {mod.name}
                      </Label>
                      {mod.description && (
                        <p className="text-xs text-muted-foreground">{mod.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeModal} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={() => saveUser()} disabled={isSaving || (isCreating && (!formData.name || !formData.email || !formData.password))} className="bg-minsk-600 hover:bg-minsk-700 text-white">
              {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</> : (
                <><Save className="w-4 h-4 mr-2" /> Salvar Usuário</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
