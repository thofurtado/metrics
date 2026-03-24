import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { Shield, Save } from 'lucide-react'

import { getUsersWithModules, UserWithModules } from '@/api/get-users-with-modules'
import { getModules, ModuleData } from '@/api/get-modules'
import { updateUserModules } from '@/api/update-user-modules'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function Permissions() {
  const queryClient = useQueryClient()
  const [selectedUser, setSelectedUser] = useState<UserWithModules | null>(null)
  const [editingModules, setEditingModules] = useState<string[]>([])

  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['users-with-modules'],
    queryFn: getUsersWithModules,
  })

  const { data: availableModules, isLoading: isLoadingModules } = useQuery({
    queryKey: ['available-modules'],
    queryFn: getModules,
  })

  const { mutateAsync: saveModules, isPending } = useMutation({
    mutationFn: updateUserModules,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-modules'] })
      toast.success('Permissões atualizadas com sucesso.')
      setSelectedUser(null)
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || 'Erro ao atualizar permissões.'
      toast.error(message)
    }
  })

  function handleOpenUser(user: UserWithModules) {
    setSelectedUser(user)
    setEditingModules(user.modules) // Set initial state
  }

  function handlePreSave() {
    if (!selectedUser) return
    saveModules({ userId: selectedUser.id, modules: editingModules })
  }

  function toggleModule(moduleName: string, isChecked: boolean) {
    if (isChecked) {
      setEditingModules(prev => [...prev, moduleName])
    } else {
      setEditingModules(prev => prev.filter(m => m !== moduleName))
    }
  }

  if (isLoadingUsers || isLoadingModules) {
    return (
      <div className="flex h-96 items-center justify-center">
        <span className="text-sm text-muted-foreground animate-pulse">Carregando permissões...</span>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-minsk-950 dark:text-minsk-50 flex items-center gap-2">
           <Shield className="h-8 w-8 text-minsk-600" />
           Permissões de Acesso
        </h1>
        <p className="text-muted-foreground text-lg">
          Controle rigidamente os módulos que cada usuário pode visualizar ou operar.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {users?.map(user => (
          <Card key={user.id} className="hover:shadow-md transition-shadow cursor-pointer flex flex-col justify-between" onClick={() => handleOpenUser(user)}>
             <CardContent className="pt-6">
                <div className="font-semibold text-lg">{user.name}</div>
                <div className="text-sm text-muted-foreground mb-4">{user.email}</div>
                
                <div className="flex flex-wrap gap-1.5 mt-auto">
                    {user.modules.length === 0 ? (
                        <span className="text-xs text-muted-foreground italic">Sem acessos configurados</span>
                    ) : (
                        user.modules.map(mod => (
                            <Badge key={mod} variant="secondary" className="text-xs bg-minsk-100 text-minsk-800 hover:bg-minsk-200 border-none transition-colors">
                                {mod}
                            </Badge>
                        ))
                    )}
                </div>
             </CardContent>
          </Card>
        ))}
      </div>

      {/* DIALOG DE EDIÇÃO */}
      <Dialog open={selectedUser !== null} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Acessos</DialogTitle>
            <DialogDescription>
              Marque os Módulos que <strong>{selectedUser?.name}</strong> pode acessar no sistema.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {availableModules?.map((mod) => (
               <div key={mod.id} className="flex items-start space-x-3 rounded-md border p-4 hover:bg-muted/50 transition-colors">
                  <Checkbox 
                     id={`mod-${mod.id}`} 
                     checked={editingModules.includes(mod.name)}
                     onCheckedChange={(checked) => toggleModule(mod.name, checked as boolean)}
                  />
                  <div className="space-y-1 leading-none">
                     <Label htmlFor={`mod-${mod.id}`} className="font-medium cursor-pointer">
                        {mod.name}
                     </Label>
                     {mod.description && (
                        <p className="text-sm text-muted-foreground">{mod.description}</p>
                     )}
                  </div>
               </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedUser(null)} disabled={isPending}>
               Cancelar
            </Button>
            <Button onClick={handlePreSave} disabled={isPending} className="bg-minsk-600 hover:bg-minsk-700 text-white">
               {isPending ? 'Salvando...' : (
                   <><Save className="w-4 h-4 mr-2" /> Salvar Alterações</>
               )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
