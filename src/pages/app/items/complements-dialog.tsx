import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  Check,
  Layers,
  Plus,
  Save,
  Sliders,
  Trash2,
  UtensilsCrossed,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import {
  ComplementGroup,
  ComplementOption,
  createComplementGroup,
  deleteComplementGroup,
  getComplementGroups,
  updateComplementGroup,
} from '@/api/complements'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

export function ComplementsDialog() {
  const queryClient = useQueryClient()
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [isCreatingNew, setIsCreatingNew] = useState(false)

  // Form State
  const [groupName, setGroupName] = useState('')
  const [minQty, setMinQty] = useState(0)
  const [maxQty, setMaxQty] = useState(1)
  const [freeQty, setFreeQty] = useState(0)
  const [options, setOptions] = useState<ComplementOption[]>([])

  // Fetch groups
  const { data: groupsData, isLoading } = useQuery({
    queryKey: ['complement-groups'],
    queryFn: getComplementGroups,
  })

  const groups = groupsData?.groups || []
  const selectedGroup = groups.find((g) => g.id === selectedGroupId)

  const handleSelectGroup = (group: ComplementGroup) => {
    setIsCreatingNew(false)
    setSelectedGroupId(group.id)
    setGroupName(group.name)
    setMinQty(group.min_quantity)
    setMaxQty(group.max_quantity)
    setFreeQty(group.free_quantity)
    setOptions(group.options || [])
  }

  const handleStartNew = () => {
    setSelectedGroupId(null)
    setIsCreatingNew(true)
    setGroupName('')
    setMinQty(0)
    setMaxQty(1)
    setFreeQty(0)
    setOptions([])
  }

  // Mutations
  const { mutateAsync: createGroup, isPending: isCreating } = useMutation({
    mutationFn: createComplementGroup,
    onSuccess: (data) => {
      toast.success('Grupo de adicionais criado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['complement-groups'] })
      handleSelectGroup(data.group)
    },
    onError: () => toast.error('Erro ao criar grupo de adicionais.'),
  })

  const { mutateAsync: updateGroup, isPending: isUpdating } = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      updateComplementGroup(id, data),
    onSuccess: () => {
      toast.success('Grupo de adicionais atualizado!')
      queryClient.invalidateQueries({ queryKey: ['complement-groups'] })
    },
    onError: () => toast.error('Erro ao atualizar grupo de adicionais.'),
  })

  const { mutateAsync: deleteGroup, isPending: isDeleting } = useMutation({
    mutationFn: deleteComplementGroup,
    onSuccess: () => {
      toast.success('Grupo de adicionais removido!')
      queryClient.invalidateQueries({ queryKey: ['complement-groups'] })
      setSelectedGroupId(null)
      setIsCreatingNew(false)
    },
    onError: () => toast.error('Erro ao remover grupo de adicionais.'),
  })

  const handleAddOption = () => {
    setOptions([
      ...options,
      {
        name: '',
        price: 0,
      },
    ])
  }

  const handleUpdateOption = (
    index: number,
    field: keyof ComplementOption,
    value: any,
  ) => {
    const updated = [...options]
    updated[index] = { ...updated[index], [field]: value }
    setOptions(updated)
  }

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (!groupName.trim()) {
      toast.error('Informe o nome do grupo.')
      return
    }

    const payload = {
      name: groupName.trim(),
      min_quantity: Number(minQty),
      max_quantity: Math.max(1, Number(maxQty)),
      free_quantity: Number(freeQty),
      options: options
        .filter((opt) => opt.name.trim() !== '')
        .map((opt) => ({
          id: opt.id,
          name: opt.name.trim(),
          price: Number(opt.price || 0),
        })),
    }

    if (isCreatingNew) {
      await createGroup(payload)
    } else if (selectedGroupId) {
      await updateGroup({ id: selectedGroupId, data: payload })
    }
  }

  return (
    <DialogContent className="max-w-4xl overflow-hidden border border-slate-200 bg-white p-0 shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:rounded-2xl">
      {/* Header */}
      <DialogHeader className="flex flex-row items-center justify-between border-b border-slate-200 bg-slate-50/80 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400">
            <Sliders className="h-5 w-5" />
          </div>
          <div>
            <DialogTitle className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">
              Grupos de Complementos & Adicionais
            </DialogTitle>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Gerencie opcionais, pontos de carne, bordas e adicionais estilo iFood
            </p>
          </div>
        </div>
        <Button
          onClick={handleStartNew}
          size="sm"
          className="h-9 rounded-xl bg-orange-600 px-3.5 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-orange-600/20 hover:bg-orange-700"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Novo Grupo
        </Button>
      </DialogHeader>

      <div className="grid grid-cols-1 divide-y divide-slate-200 md:grid-cols-12 md:divide-x md:divide-y-0 dark:divide-slate-800">
        {/* Coluna Esquerda: Lista de Grupos */}
        <div className="flex max-h-[60vh] flex-col p-4 md:col-span-4">
          <span className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Grupos Cadastrados ({groups.length})
          </span>
          <div className="space-y-2 overflow-y-auto pr-1">
            {isLoading && (
              <p className="py-6 text-center text-xs text-slate-400">Carregando...</p>
            )}
            {!isLoading && groups.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500 dark:border-slate-800">
                Nenhum grupo cadastrado.
              </div>
            )}
            {groups.map((group) => {
              const isSelected = group.id === selectedGroupId
              return (
                <div
                  key={group.id}
                  onClick={() => handleSelectGroup(group)}
                  className={cn(
                    'flex cursor-pointer flex-col gap-1 rounded-xl border p-3 transition-all',
                    isSelected
                      ? 'border-orange-500/50 bg-orange-50/60 shadow-sm dark:border-orange-500/40 dark:bg-orange-950/20'
                      : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {group.name}
                    </span>
                    <Badge
                      variant="outline"
                      className="border-slate-200 text-[10px] dark:border-slate-800"
                    >
                      {group.options?.length || 0} opções
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <span>
                      {group.min_quantity > 0
                        ? `Obrigatório (mín: ${group.min_quantity})`
                        : 'Opcional'}
                    </span>
                    <span>•</span>
                    <span>Máx: {group.max_quantity}</span>
                    {group.free_quantity > 0 && (
                      <>
                        <span>•</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {group.free_quantity} Grátis
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Coluna Direita: Editor do Grupo */}
        <div className="flex max-h-[60vh] flex-col justify-between overflow-y-auto p-6 md:col-span-8">
          {selectedGroupId || isCreatingNew ? (
            <div className="space-y-5">
              {/* Nome do Grupo */}
              <div className="space-y-1.5">
                <Label className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Nome do Grupo de Adicionais
                </Label>
                <Input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Ex: Ponto da Carne, Borda Recheada, Adicionais..."
                  className="h-11 rounded-xl border-slate-200 bg-white font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>

              {/* Regras de Quantidade (Estilo iFood) */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-900/40">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Mínimo Obrigatório
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={minQty}
                    onChange={(e) => setMinQty(Number(e.target.value))}
                    className="h-9 rounded-lg border-slate-200 bg-white font-mono text-xs font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  />
                  <p className="text-[10px] text-slate-400">0 = Seleção opcional</p>
                </div>

                <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-900/40">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Máximo Permitido
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    value={maxQty}
                    onChange={(e) => setMaxQty(Number(e.target.value))}
                    className="h-9 rounded-lg border-slate-200 bg-white font-mono text-xs font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  />
                  <p className="text-[10px] text-slate-400">Limite de escolhas</p>
                </div>

                <div className="space-y-1 rounded-xl border border-emerald-500/20 bg-emerald-50/30 p-3 dark:border-emerald-950 dark:bg-emerald-950/20">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    Qtd. Grátis (iFood)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={freeQty}
                    onChange={(e) => setFreeQty(Number(e.target.value))}
                    className="h-9 rounded-lg border-slate-200 bg-white font-mono text-xs font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  />
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                    Cobrar apenas excedente
                  </p>
                </div>
              </div>

              {/* Tabela de Opções */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Opções do Grupo ({options.length})
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddOption}
                    className="h-7 rounded-lg border-slate-200 px-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <Plus className="mr-1 h-3 w-3" /> Adicionar Opção
                  </Button>
                </div>

                <div className="space-y-2">
                  {options.length === 0 && (
                    <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400 dark:border-slate-800">
                      Nenhuma opção adicionada. Clique em "+ Adicionar Opção".
                    </p>
                  )}
                  {options.map((opt, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/50 p-2 dark:border-slate-800 dark:bg-slate-900/50"
                    >
                      <Input
                        placeholder="Nome da opção (ex: Bacon Extra)"
                        value={opt.name}
                        onChange={(e) =>
                          handleUpdateOption(idx, 'name', e.target.value)
                        }
                        className="h-9 flex-1 rounded-lg border-slate-200 bg-white text-xs font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                      />
                      <div className="relative w-32">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-xs text-slate-400">
                          R$
                        </span>
                        <Input
                          type="number"
                          step="0.50"
                          placeholder="0,00"
                          value={opt.price}
                          onChange={(e) =>
                            handleUpdateOption(idx, 'price', Number(e.target.value))
                          }
                          className="h-9 rounded-lg border-slate-200 bg-white pl-8 font-mono text-xs font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveOption(idx)}
                        className="h-9 w-9 text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-800">
                {selectedGroupId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isDeleting}
                    onClick={() => deleteGroup(selectedGroupId)}
                    className="text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Excluir Grupo
                  </Button>
                )}
                <div className="ml-auto flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={handleSave}
                    disabled={isCreating || isUpdating}
                    className="h-10 rounded-xl bg-slate-900 px-5 text-xs font-black uppercase tracking-wider text-white shadow-md hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                  >
                    <Save className="mr-1.5 h-4 w-4" /> Salvar Grupo
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-10 text-center text-slate-400">
              <Sliders className="mb-2 h-10 w-10 stroke-1 text-slate-300 dark:text-slate-700" />
              <p className="font-bold text-slate-600 dark:text-slate-300">
                Selecione ou crie um grupo
              </p>
              <p className="text-xs text-slate-400">
                Configure opcionais, valores adicionais e limites de escolha.
              </p>
            </div>
          )}
        </div>
      </div>
    </DialogContent>
  )
}
