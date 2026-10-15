import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Pencil, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { getSectors } from '@/api/get-sectors'
import { deleteSector, updateSector } from '@/api/update-sector'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

function serverMessage(err: unknown, fallback: string) {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data
      ?.message || fallback
  )
}

// Fase 4 do Mergulho (17:U9): os setores (categorias de receita e despesa) só podiam ser criados. Aqui o administrador
// corrige o nome e exclui o que não se usa mais (a nuvem só exclui setor sem nenhum lançamento).
export function Sectors() {
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['sectors'],
    queryFn: getSectors,
  })
  const sectors = [...(data?.data?.sectors ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name, 'pt-BR'),
  )

  const { mutateAsync: rename, isPending: isRenaming } = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      updateSector(id, { name }),
  })
  const { mutateAsync: remove, isPending: isDeleting } = useMutation({
    mutationFn: (id: string) => deleteSector(id),
  })

  async function handleRename(id: string) {
    const name = editingName.trim()
    if (!name) {
      toast.error('Informe o nome do setor.')
      return
    }
    try {
      await rename({ id, name })
      toast.success('Setor renomeado.')
      setEditingId(null)
      queryClient.invalidateQueries({ queryKey: ['sectors'] })
    } catch (err) {
      toast.error(serverMessage(err, 'Não foi possível renomear o setor.'))
    }
  }

  async function handleDelete(id: string) {
    try {
      await remove(id)
      toast.success('Setor excluído.')
      setConfirmDeleteId(null)
      queryClient.invalidateQueries({ queryKey: ['sectors'] })
    } catch (err) {
      toast.error(serverMessage(err, 'Não foi possível excluir o setor.'))
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          Setores (categorias)
        </h2>
        <p className="text-sm text-muted-foreground">
          Corrija o nome de um setor ou exclua o que não se usa mais. Setor com
          lançamentos não pode ser excluído: renomeie.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : sectors.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum setor cadastrado.
        </p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {sectors.map((sector) => (
            <li
              key={sector.id}
              className="flex flex-wrap items-center gap-3 px-4 py-3"
            >
              {editingId === sector.id ? (
                <>
                  <Input
                    className="h-9 min-w-0 flex-1"
                    value={editingName}
                    autoFocus
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename(sector.id)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={() => handleRename(sector.id)}
                    disabled={isRenaming}
                  >
                    <Check className="mr-1 h-4 w-4" />
                    Salvar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingId(null)}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Cancelar</span>
                  </Button>
                </>
              ) : (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {sector.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {sector.type === 'in' ? 'Receita' : 'Despesa'}
                    </p>
                  </div>
                  {confirmDeleteId === sector.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Excluir?</span>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(sector.id)}
                        disabled={isDeleting}
                      >
                        Excluir
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setConfirmDeleteId(null)}
                      >
                        Voltar
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(sector.id)
                          setEditingName(sector.name)
                        }}
                      >
                        <Pencil className="mr-1 h-4 w-4" />
                        Renomear
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-rose-600 hover:text-rose-700"
                        onClick={() => setConfirmDeleteId(sector.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Excluir {sector.name}</span>
                      </Button>
                    </div>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
