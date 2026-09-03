import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Boxes,
  Check,
  CheckSquare,
  Package,
  Plus,
  Save,
  Search,
  Sliders,
  Square,
  Trash2,
  UtensilsCrossed,
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
import { getProducts } from '@/api/get-products'
import { getSupplies } from '@/api/get-supplies'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export function ComplementsTab() {
  const queryClient = useQueryClient()
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [search, setSearch] = useState('')
  const [productSearch, setProductSearch] = useState('')

  // Form State
  const [groupName, setGroupName] = useState('')
  const [minQty, setMinQty] = useState(0)
  const [maxQty, setMaxQty] = useState(1)
  const [freeQty, setFreeQty] = useState(0)
  const [options, setOptions] = useState<ComplementOption[]>([])
  const [linkedProductIds, setLinkedProductIds] = useState<string[]>([])

  // Fetch groups
  const { data: groupsData, isLoading } = useQuery({
    queryKey: ['complement-groups'],
    queryFn: getComplementGroups,
  })

  // Fetch supplies for stock deduction binding
  const { data: suppliesData } = useQuery({
    queryKey: ['supplies-for-complements'],
    queryFn: () => getSupplies({ perPage: 500 }),
  })
  const supplies = suppliesData?.data?.supplies || []

  // Fetch products for group assignment
  const [onlySelectedProducts, setOnlySelectedProducts] = useState(false)

  const { data: productsData, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products-for-complements'],
    queryFn: () => getProducts({ perPage: 1000 }),
  })
  const allProducts: any[] =
    productsData?.data?.products ||
    (productsData as any)?.products ||
    (Array.isArray(productsData?.data) ? (productsData.data as any) : []) ||
    []

  const groups = (groupsData?.groups || []).filter((g) =>
    (g.name || '').toLowerCase().includes(search.toLowerCase()),
  )

  const filteredProducts = allProducts.filter((p: any) => {
    const matchesSearch = (p.name || '').toLowerCase().includes(productSearch.toLowerCase()) ||
      String(p.display_id || '').includes(productSearch)
    if (!matchesSearch) return false
    if (onlySelectedProducts) {
      return linkedProductIds.includes(p.id)
    }
    return true
  })

  const handleSelectGroup = (group: ComplementGroup) => {
    setIsCreatingNew(false)
    setSelectedGroupId(group.id)
    setGroupName(group.name)
    setMinQty(group.min_quantity)
    setMaxQty(group.max_quantity)
    setFreeQty(group.free_quantity)
    setOptions(group.options || [])
    setLinkedProductIds(group.products?.map((p) => p.product_id) || [])
    setProductSearch('')
  }

  const handleStartNew = () => {
    setSelectedGroupId(null)
    setIsCreatingNew(true)
    setGroupName('')
    setMinQty(0)
    setMaxQty(1)
    setFreeQty(0)
    setOptions([])
    setLinkedProductIds([])
    setProductSearch('')
  }

  // Mutations
  const { mutateAsync: createGroup, isPending: isCreating } = useMutation({
    mutationFn: createComplementGroup,
    onSuccess: (data) => {
      toast.success('Grupo de adicionais criado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['complement-groups'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      handleSelectGroup(data.group)
    },
    onError: () => toast.error('Erro ao criar grupo.'),
  })

  const { mutateAsync: updateGroup, isPending: isUpdating } = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      updateComplementGroup(id, data),
    onSuccess: () => {
      toast.success('Grupo de adicionais atualizado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['complement-groups'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
    onError: () => toast.error('Erro ao atualizar grupo.'),
  })

  const { mutateAsync: deleteGroup, isPending: isDeleting } = useMutation({
    mutationFn: deleteComplementGroup,
    onSuccess: () => {
      toast.success('Grupo de adicionais excluído!')
      queryClient.invalidateQueries({ queryKey: ['complement-groups'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setSelectedGroupId(null)
      setIsCreatingNew(false)
    },
    onError: () => toast.error('Erro ao excluir grupo.'),
  })

  const handleAddOption = () => {
    setOptions([...options, { name: '', price: 0, linked_supply_id: null }])
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

  const toggleProductLink = (productId: string) => {
    if (linkedProductIds.includes(productId)) {
      setLinkedProductIds(linkedProductIds.filter((id) => id !== productId))
    } else {
      setLinkedProductIds([...linkedProductIds, productId])
    }
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
          linked_supply_id: opt.linked_supply_id || null,
        })),
      product_ids: linkedProductIds,
    }

    if (isCreatingNew) {
      await createGroup(payload)
    } else if (selectedGroupId) {
      await updateGroup({ id: selectedGroupId, data: payload })
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-12 text-left">
      {/* Coluna Esquerda: Lista de Grupos */}
      <div className="space-y-3 md:col-span-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-slate-500">
            Grupos ({groups.length})
          </span>
          <Button
            onClick={handleStartNew}
            size="sm"
            className="h-8 rounded-xl bg-orange-600 px-3 text-xs font-bold text-white hover:bg-orange-700 shadow-sm"
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Novo Grupo
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Filtrar grupos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 rounded-xl border-slate-200 bg-white pl-8 text-xs font-semibold dark:border-slate-800 dark:bg-slate-900"
          />
        </div>

        <div className="space-y-2 overflow-y-auto pr-1 max-h-[70vh]">
          {isLoading && (
            <p className="py-6 text-center text-xs text-slate-400">Carregando grupos...</p>
          )}
          {!isLoading && groups.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500 dark:border-slate-800">
              Nenhum grupo de adicionais encontrado.
            </div>
          )}
          {groups.map((group) => {
            const isSelected = group.id === selectedGroupId
            const productCount = group.products?.length ?? group._count?.products ?? 0
            return (
              <div
                key={group.id}
                onClick={() => handleSelectGroup(group)}
                className={cn(
                  'flex cursor-pointer flex-col gap-1.5 rounded-2xl border p-4 transition-all',
                  isSelected
                    ? 'border-orange-500/60 bg-orange-50/60 shadow-sm ring-1 ring-orange-500/30 dark:border-orange-500/40 dark:bg-orange-950/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-slate-700',
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {group.name}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {productCount > 0 && (
                      <Badge
                        variant="secondary"
                        className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold"
                      >
                        {productCount} {productCount === 1 ? 'produto' : 'produtos'}
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className="border-slate-200 text-[10px] dark:border-slate-800"
                    >
                      {group.options?.length || 0} opções
                    </Badge>
                  </div>
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
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:col-span-8 overflow-y-auto max-h-[85vh]">
        {selectedGroupId || isCreatingNew ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                  {isCreatingNew ? 'Novo Grupo de Adicionais' : `Editar: ${groupName}`}
                </h3>
                <p className="text-xs text-slate-500">
                  Defina o nome, limites de escolha, opções com baixa de insumo e produtos vinculados.
                </p>
              </div>
              <Button
                type="button"
                onClick={handleSave}
                disabled={isCreating || isUpdating}
                className="h-9 rounded-xl bg-orange-600 px-4 text-xs font-bold text-white hover:bg-orange-700 shadow-sm"
              >
                <Save className="mr-1.5 h-4 w-4" /> Salvar Grupo
              </Button>
            </div>

            {/* Nome do Grupo */}
            <div className="space-y-1.5">
              <Label className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Nome do Grupo *
              </Label>
              <Input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Ex: Ponto da Carne, Borda Recheada, Adicionais de Hambúrguer, Acompanhamentos do Açaí..."
                className="h-11 rounded-xl border-slate-200 bg-white font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>

            {/* Regras de Quantidade */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1 rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-950/40">
                <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Mínimo Obrigatório
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={minQty}
                  onChange={(e) => setMinQty(Number(e.target.value))}
                  className="h-9 rounded-xl font-mono text-xs font-bold"
                />
                <p className="text-[10px] text-slate-400">0 = Seleção opcional</p>
              </div>

              <div className="space-y-1 rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-950/40">
                <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Máximo Permitido
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={maxQty}
                  onChange={(e) => setMaxQty(Number(e.target.value))}
                  className="h-9 rounded-xl font-mono text-xs font-bold"
                />
                <p className="text-[10px] text-slate-400">Limite de escolhas</p>
              </div>

              <div className="space-y-1 rounded-2xl border border-emerald-500/20 bg-emerald-50/30 p-3.5 dark:border-emerald-950 dark:bg-emerald-950/20">
                <Label className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Qtd. Grátis (iFood)
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={freeQty}
                  onChange={(e) => setFreeQty(Number(e.target.value))}
                  className="h-9 rounded-xl font-mono text-xs font-bold"
                />
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                  Cobrar apenas excedente
                </p>
              </div>
            </div>

            {/* SEÇÃO 1: OPÇÕES DO GRUPO */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Opções do Grupo ({options.length})
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Cadastre cada adicional e vincule ao insumo correspondente para baixa automática de estoque.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddOption}
                  className="h-8 rounded-xl border-slate-200 px-3 text-xs font-bold dark:border-slate-800"
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar Opção
                </Button>
              </div>

              <div className="space-y-2.5">
                {options.length === 0 && (
                  <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400 dark:border-slate-800">
                    Nenhuma opção cadastrada. Clique em "+ Adicionar Opção".
                  </p>
                )}
                {options.map((opt, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-950/50"
                  >
                    {/* Nome da Opção */}
                    <div className="flex-1">
                      <Input
                        placeholder="Nome da opção (ex: Bacon Extra, Catupiry, Mal Passada)"
                        value={opt.name}
                        onChange={(e) =>
                          handleUpdateOption(idx, 'name', e.target.value)
                        }
                        className="h-10 rounded-xl border-slate-200 bg-white text-xs font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                      />
                    </div>

                    {/* Preço Adicional */}
                    <div className="relative w-full sm:w-32">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-slate-400 font-bold">
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
                        className="h-10 rounded-xl border-slate-200 bg-white pl-9 font-mono text-xs font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                      />
                    </div>

                    {/* Insumo Vinculado para Baixa de Estoque */}
                    <div className="w-full sm:w-56">
                      <select
                        value={opt.linked_supply_id || ''}
                        onChange={(e) =>
                          handleUpdateOption(idx, 'linked_supply_id', e.target.value || null)
                        }
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                      >
                        <option value="">📦 Sem baixa de estoque</option>
                        {supplies.map((s: any) => (
                          <option key={s.id} value={s.id}>
                            Baixar: {s.name} ({s.unit || 'UN'})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Remover Opção */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveOption(idx)}
                      className="h-9 w-9 text-slate-400 hover:text-red-500 shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* SEÇÃO 2: PRODUTOS VINCULADOS A ESTE GRUPO */}
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/40 p-4 dark:border-slate-800 dark:bg-slate-950/40">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <UtensilsCrossed className="h-4 w-4 text-orange-600" /> Produtos Vinculados a este Grupo ({linkedProductIds.length})
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Selecione quais produtos terão estas opções disponíveis no PDV e Cardápio.
                  </p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    type="button"
                    variant={onlySelectedProducts ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setOnlySelectedProducts(!onlySelectedProducts)}
                    className="h-8 rounded-xl text-xs font-bold shrink-0"
                  >
                    {onlySelectedProducts ? 'Ver Todos' : `Apenas Selecionados (${linkedProductIds.length})`}
                  </Button>
                  <div className="w-full sm:w-48">
                    <Input
                      placeholder="Buscar produto por nome ou código..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="h-8 rounded-xl text-xs bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                {isLoadingProducts ? (
                  <div className="col-span-full py-8 text-center text-xs text-slate-400 font-medium">
                    Carregando catálogo de produtos...
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="col-span-full py-8 text-center text-xs text-slate-400">
                    {productSearch ? `Nenhum produto encontrado para "${productSearch}".` : onlySelectedProducts ? 'Nenhum produto vinculado ainda neste grupo.' : 'Nenhum produto cadastrado no sistema.'}
                  </div>
                ) : (
                  filteredProducts.map((p: any) => {
                    const isChecked = linkedProductIds.includes(p.id)
                    return (
                      <div
                        key={p.id}
                        onClick={() => toggleProductLink(p.id)}
                        className={cn(
                          'flex cursor-pointer items-center gap-2.5 rounded-xl border p-2.5 transition-all text-xs select-none',
                          isChecked
                            ? 'border-orange-500/50 bg-orange-50 text-orange-950 dark:border-orange-500/40 dark:bg-orange-950/30 dark:text-orange-100 font-bold shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50/50',
                        )}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => {}}
                          className="pointer-events-none"
                        />
                        <span className="truncate flex-1">{p.name}</span>
                        {p.display_id && (
                          <span className="text-[10px] text-slate-400 font-mono">#{p.display_id}</span>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Footer com Exclusão */}
            {selectedGroupId && (
              <div className="border-t border-slate-100 pt-4 dark:border-slate-800 flex justify-between items-center">
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

                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={isCreating || isUpdating}
                  className="h-9 rounded-xl bg-orange-600 px-4 text-xs font-bold text-white hover:bg-orange-700 shadow-sm"
                >
                  <Save className="mr-1.5 h-4 w-4" /> Salvar Grupo
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-96 flex-col items-center justify-center p-10 text-center text-slate-400">
            <Sliders className="mb-3 h-12 w-12 stroke-1 text-slate-300 dark:text-slate-700" />
            <p className="text-base font-bold text-slate-700 dark:text-slate-300">
              Selecione um grupo para editar ou crie um novo
            </p>
            <p className="max-w-md text-xs text-slate-400">
              Configure adicionais, valores extras, baixa automática de insumo por opção e produtos vinculados.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
