import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Check,
  CheckSquare,
  Filter,
  Layers,
  Package,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Tag,
  Trash2,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { getProducts } from '@/api/get-products'
import {
  createPrintDepartment,
  deletePrintDepartment,
  getPrintDepartments,
  updatePrintDepartmentProducts,
} from '@/api/print-departments'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/components/ui/use-toast'

type SelectionFilterMode = 'all' | 'selected' | 'unselected'

export function PrintDepartmentsDialog() {
  const queryClient = useQueryClient()
  const [newDeptName, setNewDeptName] = useState('')
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null)
  const [productSearch, setProductSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectionFilter, setSelectionFilter] = useState<SelectionFilterMode>('all')
  const [draftProductIds, setDraftProductIds] = useState<string[]>([])

  const { data: departmentsData, isLoading: isLoadingDepts } = useQuery({
    queryKey: ['print-departments'],
    queryFn: getPrintDepartments,
  })

  // Carrega catálogo completo sem travar em 1000 itens (suporta lojas com 5.000+ itens)
  const { data: productsData, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products-all-departments'],
    queryFn: () => getProducts({ pageIndex: 1, perPage: 10000 }),
  })

  const departments = departmentsData?.departments || []
  const selectedDept = departments.find((d) => d.id === selectedDeptId)

  // Ao abrir o diálogo ou receber departamentos, seleciona o primeiro se nenhum selecionado
  useEffect(() => {
    if (!selectedDeptId && departments.length > 0) {
      setSelectedDeptId(departments[0].id)
    }
  }, [departments, selectedDeptId])

  useEffect(() => {
    const dept = departments.find((d) => d.id === selectedDeptId)
    if (dept) {
      setDraftProductIds(
        dept.products?.map((p: any) =>
          typeof p === 'string' ? p : p.product_id || p.id,
        ) || [],
      )
    } else {
      setDraftProductIds([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDeptId])

  const allProducts = productsData?.data?.products || []

  // Extrai nome de categoria com segurança (seja string ou objeto {id, name})
  function getCategoryName(category: any): string {
    if (!category) return ''
    if (typeof category === 'string') return category
    return category.name || ''
  }

  const categories = useMemo(() => {
    return Array.from(
      new Set(
        allProducts
          .map((p: any) => getCategoryName(p.category))
          .filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b)) as string[]
  }, [allProducts])

  // Filtra produtos por busca de texto instantânea, categoria e modo de seleção
  // E ordena: SELECIONADOS NO TOPO, seguidos de ordem alfabética/ID
  const filteredProducts = useMemo(() => {
    const draftSet = new Set(draftProductIds)
    const search = productSearch.trim().toLowerCase()

    return allProducts
      .filter((p: any) => {
        if (search) {
          const matchName = (p.name || '').toLowerCase().includes(search)
          const matchId = p.display_id
            ? p.display_id.toString().toLowerCase().includes(search)
            : false
          if (!matchName && !matchId) return false
        }

        const catName = getCategoryName(p.category)
        if (selectedCategory !== 'all' && catName !== selectedCategory) {
          return false
        }

        const isChecked = draftSet.has(p.id)
        if (selectionFilter === 'selected' && !isChecked) return false
        if (selectionFilter === 'unselected' && isChecked) return false

        return true
      })
      .sort((a: any, b: any) => {
        const aChecked = draftSet.has(a.id)
        const bChecked = draftSet.has(b.id)

        // 1º critério: Selecionados primeiro (no topo)
        if (aChecked && !bChecked) return -1
        if (!aChecked && bChecked) return 1

        // 2º critério: Se ambos estão no mesmo estado, ordena por display_id ou nome
        const aId = Number(a.display_id) || 0
        const bId = Number(b.display_id) || 0
        if (aId !== bId) return aId - bId

        return (a.name || '').localeCompare(b.name || '')
      })
  }, [allProducts, productSearch, selectedCategory, selectionFilter, draftProductIds])

  // Contagens para os chips de visão rápida
  const counts = useMemo(() => {
    const draftSet = new Set(draftProductIds)
    let selectedCount = 0
    allProducts.forEach((p: any) => {
      if (draftSet.has(p.id)) selectedCount++
    })
    return {
      total: allProducts.length,
      selected: selectedCount,
      unselected: Math.max(0, allProducts.length - selectedCount),
    }
  }, [allProducts, draftProductIds])

  const createMutation = useMutation({
    mutationFn: createPrintDepartment,
    onSuccess: (newDept: any) => {
      queryClient.invalidateQueries({ queryKey: ['print-departments'] })
      setNewDeptName('')
      if (newDept?.id) {
        setSelectedDeptId(newDept.id)
      }
      toast({
        title: 'Departamento criado com sucesso!',
        className: 'bg-green-500 text-white',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deletePrintDepartment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['print-departments'] })
      setSelectedDeptId(null)
      toast({ title: 'Departamento excluído.', variant: 'destructive' })
    },
  })

  const updateProductsMutation = useMutation({
    mutationFn: updatePrintDepartmentProducts,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['print-departments'] })
      toast({
        title: 'Produtos vinculados com sucesso!',
        className: 'bg-green-500 text-white',
      })
    },
  })

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newDeptName.trim()) return
    createMutation.mutate({ name: newDeptName.trim() })
  }

  function toggleProductCheckbox(productId: string, checked: boolean) {
    if (checked) {
      setDraftProductIds((prev) => [...prev, productId])
    } else {
      setDraftProductIds((prev) => prev.filter((id) => id !== productId))
    }
  }

  function toggleSelectAll(checked: boolean) {
    const currentFilteredIds = filteredProducts.map((p: any) => p.id)
    if (checked) {
      setDraftProductIds((prev) =>
        Array.from(new Set([...prev, ...currentFilteredIds])),
      )
    } else {
      setDraftProductIds((prev) =>
        prev.filter((id) => !currentFilteredIds.includes(id)),
      )
    }
  }

  function handleSave() {
    if (!selectedDeptId) return
    updateProductsMutation.mutate({
      id: selectedDeptId,
      productIds: draftProductIds,
    })
  }

  const isAllSelected =
    filteredProducts.length > 0 &&
    filteredProducts.every((p: any) => draftProductIds.includes(p.id))
  const isIndeterminate =
    !isAllSelected &&
    filteredProducts.some((p: any) => draftProductIds.includes(p.id))

  // Verifica se há alterações não salvas no rascunho em relação ao salvo no banco
  const hasUnsavedChanges = useMemo(() => {
    if (!selectedDept) return false
    const originalIds = new Set(
      selectedDept.products?.map((p: any) =>
        typeof p === 'string' ? p : p.product_id || p.id,
      ) || [],
    )
    if (originalIds.size !== draftProductIds.length) return true
    return draftProductIds.some((id) => !originalIds.has(id))
  }, [selectedDept, draftProductIds])

  return (
    <DialogContent className="flex h-[92vh] max-h-[92vh] w-[95vw] max-w-[95vw] flex-col overflow-hidden rounded-2xl border border-border/50 bg-background/95 p-0 shadow-2xl backdrop-blur-xl md:max-w-[92vw] lg:max-w-[90vw] xl:max-w-7xl 2xl:max-w-[1600px]">
      {/* Header com Design Premium e Respiro */}
      <DialogHeader className="border-b border-border/50 bg-gradient-to-r from-primary/10 via-background to-background px-6 py-4 sm:px-8 sm:py-5">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/20 p-2.5 shadow-inner">
              <Printer className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Departamentos de Impressão
              </DialogTitle>
              <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                Organize e vincule seus produtos para impressão nos pontos da loja (Cozinha, Bar, Pizzaria, Chapa).
              </p>
            </div>
          </div>

          {selectedDept && (
            <div className="flex items-center gap-3 self-end sm:self-auto">
              {hasUnsavedChanges && (
                <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  Alterações não salvas
                </Badge>
              )}
              <Button
                onClick={handleSave}
                disabled={updateProductsMutation.isPending}
                size="sm"
                className="h-10 gap-2 rounded-xl px-5 font-semibold shadow-md shadow-primary/20 transition-all hover:scale-[1.02] sm:h-11 sm:px-6"
              >
                <Save className="h-4 w-4" />
                {updateProductsMutation.isPending ? 'Salvando...' : 'Salvar Vínculos'}
              </Button>
            </div>
          )}
        </div>
      </DialogHeader>

      <div className="flex flex-1 overflow-hidden">
        {/* Lado Esquerdo - Lista de Departamentos (Largura Compacta e Inteligente) */}
        <div className="flex w-64 shrink-0 flex-col border-r border-border/50 bg-muted/20 sm:w-72 lg:w-80">
          <div className="border-b border-border/50 bg-background/50 p-4">
            <form onSubmit={handleCreate} className="flex gap-2">
              <Input
                placeholder="Novo departamento..."
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                disabled={createMutation.isPending}
                className="h-10 border-primary/20 bg-background text-sm shadow-sm focus-visible:ring-primary/50"
              />
              <Button
                size="icon"
                type="submit"
                disabled={createMutation.isPending || !newDeptName.trim()}
                className="h-10 w-10 shrink-0 shadow-md transition-transform hover:scale-105"
                title="Criar novo departamento"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </form>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto p-3 sm:p-4">
            <div className="mb-2 flex items-center justify-between px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" /> Seus Departamentos
              </span>
              <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                {departments.length}
              </Badge>
            </div>

            {isLoadingDepts ? (
              <div className="flex flex-col items-center justify-center py-10 opacity-50">
                <div className="mb-3 h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                <p className="text-xs font-medium">Carregando...</p>
              </div>
            ) : departments.length === 0 ? (
              <div className="mx-1 rounded-xl border-2 border-dashed border-muted-foreground/20 px-3 py-10 text-center">
                <Printer className="mx-auto mb-2.5 h-8 w-8 text-muted-foreground/40" />
                <p className="text-xs font-medium text-muted-foreground">
                  Nenhum departamento criado.
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground/70">
                  Digite o nome acima para começar.
                </p>
              </div>
            ) : (
              departments.map((dept) => {
                const isSelected = selectedDeptId === dept.id
                const deptCount = dept.products?.length || 0

                return (
                  <div
                    key={dept.id}
                    onClick={() => setSelectedDeptId(dept.id)}
                    className={`group relative flex cursor-pointer items-center justify-between rounded-xl border p-3 transition-all duration-200 ${
                      isSelected
                        ? 'border-primary bg-primary/10 shadow-sm'
                        : 'border-border/60 bg-background/80 hover:border-primary/40 hover:bg-muted/60'
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p
                        className={`truncate text-sm font-semibold ${
                          isSelected ? 'text-primary' : 'text-foreground'
                        }`}
                      >
                        {dept.name}
                      </p>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Package className="h-3 w-3" />
                        <span>{deptCount} produto(s)</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {isSelected && (
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg text-muted-foreground opacity-0 transition-opacity hover:bg-destructive hover:text-white group-hover:opacity-100"
                        title={`Excluir departamento ${dept.name}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (
                            confirm(
                              `Tem certeza que deseja excluir '${dept.name}'? Todos os vínculos serão perdidos.`,
                            )
                          ) {
                            deleteMutation.mutate({ id: dept.id })
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Lado Direito - Catálogo Amplo com Grid Dinâmico e Ordenação Inteligente */}
        <div className="relative flex flex-1 flex-col overflow-hidden bg-background/50">
          {selectedDept ? (
            <>
              {/* Barra de Filtros, Categorias e Pesquisa */}
              <div className="border-b border-border/50 bg-background/80 p-4 sm:p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  {/* Campo de Busca de Produtos */}
                  <div className="group relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <Input
                      placeholder="Buscar por nome, código ou ID..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="h-10 border-muted-foreground/20 bg-background pl-10 text-sm shadow-sm focus-visible:ring-primary/50"
                    />
                    {productSearch && (
                      <button
                        onClick={() => setProductSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Select de Categoria */}
                  <div className="w-full sm:w-64">
                    <Select
                      value={selectedCategory}
                      onValueChange={setSelectedCategory}
                    >
                      <SelectTrigger className="h-10 border-muted-foreground/20 bg-background text-sm font-medium shadow-sm">
                        <SelectValue placeholder="Todas categorias" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        <SelectItem
                          value="all"
                          className="font-semibold text-primary"
                        >
                          Todas categorias ({counts.total})
                        </SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Chips de Visão Rápida (Todos / Selecionados / Não Selecionados) */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-3">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="font-semibold text-muted-foreground">
                      Exibir:
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectionFilter('all')}
                      className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                        selectionFilter === 'all'
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      Todos ({counts.total})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectionFilter('selected')}
                      className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-medium transition-colors ${
                        selectionFilter === 'selected'
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <Check className="h-3 w-3" />
                      Selecionados ({counts.selected})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectionFilter('unselected')}
                      className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                        selectionFilter === 'unselected'
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      Não vinculados ({counts.unselected})
                    </button>
                  </div>

                  {draftProductIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setDraftProductIds([])}
                      className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Limpar seleção
                    </button>
                  )}
                </div>
              </div>

              {/* Barra de Ação em Lote (Sticky) */}
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/50 bg-muted/40 px-4 py-2.5 text-sm sm:px-6">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="select-all"
                    className="h-5 w-5 rounded data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                    checked={
                      isAllSelected
                        ? true
                        : isIndeterminate
                          ? 'indeterminate'
                          : false
                    }
                    onCheckedChange={(checked) =>
                      toggleSelectAll(checked === true)
                    }
                  />
                  <label
                    htmlFor="select-all"
                    className="flex cursor-pointer select-none items-center gap-1.5 text-xs font-semibold sm:text-sm"
                  >
                    Selecionar todos os {filteredProducts.length} itens visíveis
                  </label>
                </div>

                <div className="flex items-center gap-2 text-xs font-medium sm:text-sm">
                  <CheckSquare className="h-4 w-4 text-primary" />
                  <span className="font-bold text-foreground">
                    {draftProductIds.length}
                  </span>
                  <span className="text-muted-foreground">
                    vinculado(s) à {selectedDept.name}
                  </span>
                </div>
              </div>

              {/* Grid Responsivo de Produtos: Ocupa toda a tela com 1 a 5 colunas */}
              <div className="flex-1 overflow-y-auto bg-muted/10 p-3 sm:p-5">
                {isLoadingProducts ? (
                  <div className="flex flex-col items-center justify-center py-24 opacity-60">
                    <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                    <p className="text-base font-medium">Carregando catálogo completo...</p>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <div className="mb-3 rounded-full bg-muted/50 p-4">
                      <Search className="h-8 w-8 opacity-40" />
                    </div>
                    <p className="text-base font-semibold text-foreground/80">
                      Nenhum produto encontrado.
                    </p>
                    <p className="mt-1 text-xs">
                      Tente alterar a busca, categoria ou o filtro de seleção.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                    {filteredProducts.map((product: any) => {
                      const isChecked = draftProductIds.includes(product.id)
                      const catName = getCategoryName(product.category)

                      return (
                        <label
                          key={product.id}
                          className={`group relative flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all duration-150 ${
                            isChecked
                              ? 'border-primary/80 bg-primary/10 shadow-sm hover:border-primary hover:bg-primary/15'
                              : 'border-border/60 bg-background hover:border-primary/40 hover:bg-muted/40 hover:shadow-sm'
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">
                            <Checkbox
                              className="h-4 w-4 rounded transition-transform group-active:scale-90 data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                              checked={isChecked}
                              onCheckedChange={(checked) =>
                                toggleProductCheckbox(
                                  product.id,
                                  checked === true,
                                )
                              }
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p
                              className={`truncate text-xs font-semibold sm:text-sm ${
                                isChecked
                                  ? 'font-bold text-foreground'
                                  : 'text-foreground/90'
                              }`}
                              title={product.name}
                            >
                              {product.name}
                            </p>

                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                              <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                                ID: {product.display_id || product.id?.slice(0, 6)}
                              </span>
                              {catName && (
                                <span className="flex max-w-[140px] items-center gap-1 truncate rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                                  <Tag className="h-2.5 w-2.5 shrink-0" />
                                  <span className="truncate">{catName}</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {isChecked && (
                            <div className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" />
                          )}
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <Printer className="mb-4 h-12 w-12 text-muted-foreground/30" />
              <p className="text-base font-semibold text-foreground/80">
                Selecione ou crie um departamento à esquerda
              </p>
              <p className="mt-1 max-w-sm text-xs">
                Para vincular produtos que serão impressos na Cozinha, Bar, Pizzaria, etc.
              </p>
            </div>
          )}
        </div>
      </div>
    </DialogContent>
  )
}
