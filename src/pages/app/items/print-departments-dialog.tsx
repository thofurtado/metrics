import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CheckSquare,
  Layers,
  Package,
  Plus,
  Printer,
  Save,
  Search,
  Tag,
  Trash2,
} from 'lucide-react'
import { useEffect, useState } from 'react'

import { getProducts } from '@/api/get-products'
import {
  createPrintDepartment,
  deletePrintDepartment,
  getPrintDepartments,
  updatePrintDepartmentProducts,
} from '@/api/print-departments'
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

export function PrintDepartmentsDialog() {
  const queryClient = useQueryClient()
  const [newDeptName, setNewDeptName] = useState('')
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null)
  const [productSearch, setProductSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [draftProductIds, setDraftProductIds] = useState<string[]>([])

  const { data: departmentsData, isLoading: isLoadingDepts } = useQuery({
    queryKey: ['print-departments'],
    queryFn: getPrintDepartments,
  })

  const { data: productsData, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products-all', productSearch],
    queryFn: () =>
      getProducts({ query: productSearch, pageIndex: 1, perPage: 1000 }),
  })

  const departments = departmentsData?.departments || []
  const selectedDept = departments.find((d) => d.id === selectedDeptId)

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

  // Safely extract category name whether it's a string or object {id, name}
  function getCategoryName(category: any): string {
    if (!category) return ''
    if (typeof category === 'string') return category
    return category.name || ''
  }

  const categories = Array.from(
    new Set(
      allProducts.map((p: any) => getCategoryName(p.category)).filter(Boolean),
    ),
  ) as string[]

  const filteredProducts = allProducts.filter((p: any) => {
    const catName = getCategoryName(p.category)
    if (selectedCategory !== 'all' && catName !== selectedCategory) return false
    return true
  })

  const createMutation = useMutation({
    mutationFn: createPrintDepartment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['print-departments'] })
      setNewDeptName('')
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
    const filteredIds = filteredProducts.map((p: any) => p.id)
    if (checked) {
      setDraftProductIds((prev) =>
        Array.from(new Set([...prev, ...filteredIds])),
      )
    } else {
      setDraftProductIds((prev) =>
        prev.filter((id) => !filteredIds.includes(id)),
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

  return (
    <DialogContent className="flex h-[85vh] max-w-6xl flex-col overflow-hidden rounded-2xl border border-border/50 bg-background/95 p-0 shadow-2xl backdrop-blur-xl">
      <DialogHeader className="border-b border-border/50 bg-gradient-to-r from-primary/10 via-background to-background px-8 py-5">
        <DialogTitle className="flex items-center gap-3 text-2xl font-bold tracking-tight text-foreground">
          <div className="rounded-xl bg-primary/20 p-2.5 shadow-inner">
            <Printer className="h-6 w-6 text-primary" />
          </div>
          Departamentos de Impressão
        </DialogTitle>
        <p className="ml-14 mt-1 text-sm text-muted-foreground">
          Organize e vincule seus produtos para impressão nos locais corretos
          (ex: Cozinha, Bar, Pizzaria).
        </p>
      </DialogHeader>

      <div className="flex flex-1 overflow-hidden">
        {/* Lado Esquerdo - Lista de Departamentos */}
        <div className="flex w-[380px] flex-col border-r border-border/50 bg-muted/20">
          <div className="border-b border-border/50 bg-background/50 p-5">
            <form onSubmit={handleCreate} className="flex gap-2">
              <Input
                placeholder="Ex: Cozinha Fria..."
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                disabled={createMutation.isPending}
                className="border-primary/20 bg-background shadow-sm focus-visible:ring-primary/50"
              />
              <Button
                size="icon"
                type="submit"
                disabled={createMutation.isPending || !newDeptName.trim()}
                className="shadow-md transition-transform hover:scale-105"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </form>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            <div className="mb-4 flex items-center gap-2 px-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              <Layers className="h-4 w-4" /> Seus Departamentos
            </div>

            {isLoadingDepts ? (
              <div className="flex flex-col items-center justify-center py-10 opacity-50">
                <div className="mb-3 h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                <p className="text-sm font-medium">Carregando...</p>
              </div>
            ) : departments.length === 0 ? (
              <div className="mx-2 rounded-xl border-2 border-dashed border-muted-foreground/20 px-4 py-12 text-center">
                <Printer className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm font-medium text-muted-foreground">
                  Nenhum departamento criado.
                </p>
                <p className="mt-1 text-xs text-muted-foreground/70">
                  Crie um acima para começar.
                </p>
              </div>
            ) : (
              departments.map((dept) => {
                const isSelected = selectedDeptId === dept.id
                return (
                  <div
                    key={dept.id}
                    onClick={() => setSelectedDeptId(dept.id)}
                    className={`group relative flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-all duration-300 ${
                      isSelected
                        ? 'scale-[1.02] border-primary bg-gradient-to-r from-primary/15 to-primary/5 shadow-sm'
                        : 'border-border bg-background hover:bg-muted hover:shadow-md'
                    }`}
                  >
                    <div className="flex flex-col gap-1">
                      <p
                        className={`font-semibold ${isSelected ? 'text-primary' : 'text-foreground'}`}
                      >
                        {dept.name}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Package className="h-3.5 w-3.5" />
                        <span>{dept.products?.length || 0} produto(s)</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-9 w-9 rounded-full transition-opacity ${isSelected ? 'text-destructive opacity-100 hover:bg-destructive hover:text-white' : 'text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100'}`}
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
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Lado Direito - Produtos do Departamento Selecionado */}
        <div className="relative flex flex-1 flex-col bg-background/50">
          {selectedDept ? (
            <>
              <div className="border-b border-border/50 bg-gradient-to-b from-background to-muted/20 p-6">
                <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
                      <span className="font-normal text-muted-foreground">
                        Vinculando à:
                      </span>
                      <span className="rounded-lg bg-primary/10 px-3 py-1 text-primary">
                        {selectedDept.name}
                      </span>
                    </h3>
                  </div>
                  <Button
                    onClick={handleSave}
                    disabled={updateProductsMutation.isPending}
                    className="h-11 gap-2.5 rounded-xl px-6 font-semibold shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 hover:shadow-primary/40"
                  >
                    <Save className="h-5 w-5" />
                    {updateProductsMutation.isPending
                      ? 'Salvando...'
                      : 'Salvar Vínculos'}
                  </Button>
                </div>
                <div className="flex gap-3">
                  <div className="group relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <Input
                      placeholder="Buscar pelo nome do produto..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="h-11 border-muted-foreground/20 bg-background pl-10 shadow-sm focus-visible:ring-primary/50"
                    />
                  </div>
                  <Select
                    value={selectedCategory}
                    onValueChange={setSelectedCategory}
                  >
                    <SelectTrigger className="h-11 w-[240px] border-muted-foreground/20 bg-background font-medium shadow-sm">
                      <SelectValue placeholder="Todas categorias" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <SelectItem
                        value="all"
                        className="font-semibold text-primary"
                      >
                        Todas categorias
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

              <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border/50 bg-muted/40 px-6 py-3 shadow-sm">
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
                  className="flex cursor-pointer select-none items-center gap-2 text-sm font-semibold"
                >
                  Selecionar Todos ({filteredProducts.length})
                </label>
                <div className="ml-auto flex items-center gap-2 text-sm font-medium">
                  <CheckSquare className="h-4 w-4 text-primary" />
                  <span className="text-foreground">
                    {draftProductIds.length}
                  </span>
                  <span className="text-muted-foreground">
                    selecionados no total
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto bg-muted/10 p-4">
                {isLoadingProducts ? (
                  <div className="flex flex-col items-center justify-center py-20 opacity-50">
                    <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                    <p className="text-lg font-medium">
                      Carregando catálogo...
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {filteredProducts.map((product: any) => {
                      const isChecked = draftProductIds.includes(product.id)
                      const catName = getCategoryName(product.category)
                      return (
                        <label
                          key={product.id}
                          className={`group flex cursor-pointer items-start gap-4 rounded-xl border-2 p-4 transition-all duration-200 ${
                            isChecked
                              ? 'border-primary bg-primary/5 shadow-sm hover:bg-primary/10'
                              : 'border-transparent bg-background hover:border-border hover:shadow-md'
                          }`}
                        >
                          <div className="mt-0.5">
                            <Checkbox
                              className="h-5 w-5 rounded transition-transform group-active:scale-90 data-[state=checked]:border-primary data-[state=checked]:bg-primary"
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
                              className={`truncate text-[15px] font-semibold ${isChecked ? 'text-foreground' : 'text-foreground/80'}`}
                            >
                              {product.name}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
                                ID: {product.display_id}
                              </span>
                              {catName && (
                                <span className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold tracking-wide text-primary">
                                  <Tag className="h-3 w-3" />
                                  {catName}
                                </span>
                              )}
                            </div>
                          </div>
                        </label>
                      )
                    })}
                    {filteredProducts.length === 0 && (
                      <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground">
                        <div className="mb-4 rounded-full bg-muted/50 p-4">
                          <Search className="h-8 w-8 opacity-50" />
                        </div>
                        <p className="text-lg font-medium text-foreground/70">
                          Nenhum produto encontrado.
                        </p>
                        <p className="mt-1 text-sm">
                          Tente mudar o termo de busca ou a categoria.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center bg-muted/10 text-muted-foreground">
              <div className="mb-6 rounded-full border border-border/50 bg-background p-6 shadow-sm">
                <Printer className="h-12 w-12 text-primary/40" />
              </div>
              <h4 className="mb-2 text-xl font-semibold text-foreground/80">
                Nenhum departamento selecionado
              </h4>
              <p className="max-w-sm text-center text-sm">
                Selecione um departamento na lista ao lado para começar a
                vincular os produtos que serão impressos nele.
              </p>
            </div>
          )}
        </div>
      </div>
    </DialogContent>
  )
}
