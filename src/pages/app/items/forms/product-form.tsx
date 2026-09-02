import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Layers, Plus, ScanBarcode, Sliders, Trash, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { checkProductCode } from '@/api/check-product-code'
import { getComplementGroups, syncProductComplementGroups } from '@/api/complements'
import { createCategory } from '@/api/create-category'
import { createProduct } from '@/api/create-product'
import { getCategories } from '@/api/get-categories'
import { getNextProductId } from '@/api/get-next-product-id'
import { getSubcategories } from '@/api/subcategories'
import { updateItem } from '@/api/update-item'
import { uploadFileProduct } from '@/api/upload-file'
import { FileUpload } from '@/components/file-upload'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const productSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  category: z.string().optional(),
  subcategory_id: z.string().optional(),

  // Financial
  cost: z.coerce.number().min(0).optional().default(0),
  price: z.coerce.number().min(0).optional().default(0),

  // Stock
  stock: z.coerce.number().optional().default(0),
  min_stock: z.coerce.number().optional().default(0),

  // Details
  barcode: z.string().regex(/^\d*$/, 'Apenas números').optional(),
  ncm: z.string().regex(/^\d*$/, 'Apenas números').optional(),

  active: z.boolean().default(true),
  show_on_menu: z.boolean().default(true),
  is_priority: z.boolean().default(false),

  display_id: z.preprocess((val) => {
    if (!val || val === '' || val === 'Auto') return undefined
    const parsed = Number(val)
    return isNaN(parsed) ? undefined : parsed
  }, z.number().optional()),

  measureUnit: z.enum(['UNITARY', 'FRACTIONAL']).default('UNITARY'),
})

type ProductSchema = z.infer<typeof productSchema>

interface ProductFormProps {
  initialData?: any
  onSuccess?: () => void
}

export function ProductForm({ initialData, onSuccess }: ProductFormProps) {
  const queryClient = useQueryClient()
  const isEdit = !!initialData
  const [isNewCategoryOpen, setIsNewCategoryOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [profit, setProfit] = useState(0)
  const [margin, setMargin] = useState(0)
  const [productImage, setProductImage] = useState<File | null>(null)
  const [selectedComplementGroupIds, setSelectedComplementGroupIds] = useState<string[]>(
    initialData?.complementGroups?.map((cg: any) => cg.group_id || cg.group?.id) || []
  )

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  })

  const { data: complementGroupsData } = useQuery({
    queryKey: ['complement-groups'],
    queryFn: getComplementGroups,
  })

  const form = useForm<ProductSchema>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: initialData?.name ?? '',
      description: initialData?.description ?? '',
      category:
        initialData?.category?.id ??
        initialData?.category_id ??
        (typeof initialData?.category === 'string' ? initialData.category : ''),
      subcategory_id: initialData?.subcategory_id ?? initialData?.subcategory?.id ?? '',
      cost: initialData?.cost ?? 0,
      price: initialData?.price ?? 0,
      stock: initialData?.stock ?? 0,
      min_stock: initialData?.min_stock ?? 0,
      barcode: initialData?.barcode ?? '',
      ncm: initialData?.ncm ?? '',
      active: initialData?.active ?? true,
      show_on_menu: initialData?.show_on_menu ?? initialData?.product?.show_on_menu ?? true,
      is_priority: initialData?.is_priority ?? false,
      display_id: initialData?.display_id ?? undefined,
      measureUnit: initialData?.measureUnit ?? 'UNITARY',
    },
  })

  const selectedCategory = form.watch('category')

  const { data: subcategoriesData } = useQuery({
    queryKey: ['subcategories', selectedCategory],
    queryFn: () => getSubcategories(selectedCategory || undefined),
    enabled: !!selectedCategory,
  })

  const { mutateAsync: createCategoryFn } = useMutation({
    mutationFn: createCategory,
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setIsNewCategoryOpen(false)
      setNewCategoryName('')
      toast.success('Categoria criada!')
      if (data?.category?.id) {
        form.setValue('category', data.category.id)
      } else if (data?.id) {
        form.setValue('category', data.id)
      }
    },
    onError: () => toast.error('Erro ao criar categoria.'),
  })

  const { mutateAsync: createProductFn } = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['items'] })
      onSuccess?.()
    },
  })

  const { mutateAsync: updateItemFn } = useMutation({
    mutationFn: updateItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['items'] })
      onSuccess?.()
    },
  })

  useEffect(() => {
    const cost = form.getValues('cost') || 0
    const price = form.getValues('price') || 0
    const calculatedProfit = price - cost
    setProfit(calculatedProfit)
    setMargin(cost > 0 ? (calculatedProfit / cost) * 100 : 0)
  }, [form])

  async function handleCreateCategory() {
    if (!newCategoryName.trim()) return
    await createCategoryFn({ name: newCategoryName })
  }

  async function onSubmit(data: ProductSchema) {
    try {
      let savedProductId = initialData?.id
      if (isEdit) {
        await updateItemFn({
          id: initialData.id,
          type: 'PRODUCT',
          ...data,
          subcategory_id: data.subcategory_id || null,
          is_priority: data.is_priority,
          show_on_menu: data.show_on_menu,
        } as any)
        toast.success('Produto atualizado!')
      } else {
        const createRes = await createProductFn({
          name: data.name,
          description: data.description,
          price: data.price || 0,
          stock: data.stock,
          min_stock: data.min_stock,
          barcode: data.barcode,
          ncm: data.ncm,
          category: data.category,
          subcategory_id: data.subcategory_id || null,
          is_priority: data.is_priority,
          active: data.active,
          show_on_menu: data.show_on_menu,
          display_id: data.display_id,
          measureUnit: data.measureUnit,
          cost: data.cost || 0,
        })
        savedProductId = createRes?.data?.product?.id
        toast.success('Produto cadastrado!')
      }

      if (savedProductId && selectedComplementGroupIds) {
        try {
          await syncProductComplementGroups(savedProductId, selectedComplementGroupIds)
        } catch (syncErr) {
          console.error('Erro ao sincronizar adicionais:', syncErr)
        }
      }
    } catch {
      toast.error('Erro ao salvar produto.')
    }
  }

  return (
    <>
      <Form {...form}>
        <form
          id="product-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden text-left"
        >
          <div className="flex-1 space-y-6 overflow-y-auto overflow-x-hidden px-6 py-6 sm:px-8 sm:py-8">
            {/* Header: Nome, Prioridade KDS e Status */}
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12 space-y-2 sm:col-span-6 lg:col-span-7">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        Nome do Produto
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: Coca-Cola Lata 350ml, Cerveja Heineken..."
                          {...field}
                          className="h-12 text-lg font-medium"
                          autoFocus
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Switches de Cardápio, KDS e Ativo */}
              <div className="col-span-12 flex flex-wrap items-end gap-2.5 sm:col-span-6 lg:col-span-5">
                <FormField
                  control={form.control}
                  name="show_on_menu"
                  render={({ field }) => (
                    <FormItem className="flex h-12 flex-1 min-w-[130px] items-center space-x-2.5 space-y-0 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 dark:border-emerald-900/30">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="data-[state=checked]:bg-emerald-500"
                        />
                      </FormControl>
                      <FormLabel className="cursor-pointer text-xs font-bold text-emerald-700 dark:text-emerald-300">
                        Cardápio
                      </FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_priority"
                  render={({ field }) => (
                    <FormItem className="flex h-12 flex-1 items-center space-x-2.5 space-y-0 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 dark:border-amber-900/30">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="cursor-pointer text-xs font-bold text-amber-700 dark:text-amber-300">
                        ⚡ Prioridade KDS
                      </FormLabel>
                    </FormItem>
                  )}
                />

                {isEdit && (
                  <FormField
                    control={form.control}
                    name="active"
                    render={({ field }) => (
                      <FormItem className="flex h-12 flex-1 items-center space-x-2.5 space-y-0 rounded-xl border bg-muted/20 p-3">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="cursor-pointer text-xs font-medium">
                          Ativo
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </div>

            {/* Categoria, Subcategoria e Unidade */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="sm:col-span-1">
                <FormLabel className="mb-2 block text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Categoria
                </FormLabel>
                <div className="flex gap-2">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem className="flex-1 space-y-0">
                        <Select
                          onValueChange={(val) => {
                            field.onChange(val)
                            form.setValue('subcategory_id', '')
                          }}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="h-10">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent withPortal={false}>
                            {(categoriesData?.categories || []).map((cat: any) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 shrink-0"
                    onClick={() => setIsNewCategoryOpen(true)}
                    title="Nova Categoria"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="sm:col-span-1">
                <FormLabel className="mb-2 block text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Subcategoria
                </FormLabel>
                <FormField
                  control={form.control}
                  name="subcategory_id"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!selectedCategory || (subcategoriesData?.subcategories || []).length === 0}
                      >
                        <FormControl>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder={!selectedCategory ? "Escolha a categoria" : "Selecione subcategoria..."} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent withPortal={false}>
                          {(subcategoriesData?.subcategories || []).map((sub: any) => (
                            <SelectItem key={sub.id} value={sub.id}>
                              {sub.name} {sub.accepts_fractions ? `(Até ${sub.max_fractions} Sabores)` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="sm:col-span-1">
                <FormField
                  control={form.control}
                  name="measureUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        Unidade de Medida
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent withPortal={false}>
                          <SelectItem value="UNITARY">Unidade (UN)</SelectItem>
                          <SelectItem value="FRACTIONAL">Fracionado (KG/L/M)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="sm:col-span-1">
                <FormField
                  control={form.control}
                  name="barcode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        Código de Barras
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="EAN / GTIN"
                          {...field}
                          className="h-10 font-mono"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Valores Comerciais: Custo, Preço, Lucro e Margem */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-900/40">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <FormField
                  control={form.control}
                  name="cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        Custo de Compra
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-muted-foreground">
                            R$
                          </span>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            className="h-12 pl-8 font-mono text-base font-bold"
                            onChange={(e) => {
                              field.onChange(e)
                              const newCost = parseFloat(e.target.value) || 0
                              const price = form.getValues('price') || 0
                              const newProfit = price - newCost
                              setProfit(newProfit)
                              setMargin(newCost > 0 ? (newProfit / newCost) * 100 : 0)
                            }}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-black uppercase tracking-wide text-primary">
                        Preço de Venda
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-primary">
                            R$
                          </span>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            className="h-12 border-primary/30 bg-primary/5 pl-9 text-lg font-black text-primary"
                            onChange={(e) => {
                              field.onChange(e)
                              const newPrice = parseFloat(e.target.value) || 0
                              const cost = form.getValues('cost') || 0
                              const newProfit = newPrice - cost
                              setProfit(newProfit)
                              setMargin(cost > 0 ? (newProfit / cost) * 100 : 0)
                            }}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex flex-col justify-center rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                  <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                    Lucro Bruto (R$)
                  </span>
                  <span className="font-mono text-lg font-black text-emerald-600 dark:text-emerald-400">
                    R$ {profit.toFixed(2)}
                  </span>
                </div>

                <div className="flex flex-col justify-center rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                  <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                    Margem (%)
                  </span>
                  <span className="font-mono text-lg font-black text-emerald-600 dark:text-emerald-400">
                    +{margin.toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Estoque e NCM */}
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      {!isEdit ? 'Estoque Inicial' : 'Estoque Atual'}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        className="h-10 font-mono"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="min_stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      Estoque Mínimo
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        className="h-10 font-mono"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="col-span-2 sm:col-span-1">
                <FormField
                  control={form.control}
                  name="ncm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        NCM / Fiscal
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="0000.00.00"
                          {...field}
                          className="h-10 font-mono"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Grupos de Complementos & Adicionais Vinculados */}
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-5 dark:border-slate-800 dark:bg-slate-900/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Sliders className="h-5 w-5 text-orange-500" />
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">
                      Grupos de Adicionais & Opcionais
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Marque quais grupos de complementos se aplicam a este produto
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="border-slate-200 text-xs font-bold dark:border-slate-800">
                  {selectedComplementGroupIds.length} grupos selecionados
                </Badge>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(complementGroupsData?.groups || []).map((group: any) => {
                  const isChecked = selectedComplementGroupIds.includes(group.id)
                  return (
                    <div
                      key={group.id}
                      onClick={() => {
                        if (isChecked) {
                          setSelectedComplementGroupIds(
                            selectedComplementGroupIds.filter((id) => id !== group.id)
                          )
                        } else {
                          setSelectedComplementGroupIds([
                            ...selectedComplementGroupIds,
                            group.id,
                          ])
                        }
                      }}
                      className={cn(
                        'flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-all',
                        isChecked
                          ? 'border-orange-500/50 bg-orange-50/50 shadow-sm dark:border-orange-500/40 dark:bg-orange-950/20'
                          : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700'
                      )}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => {}}
                        className="mt-0.5"
                      />
                      <div className="flex-1 space-y-0.5">
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {group.name}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {group.options?.length || 0} opções • {group.min_quantity > 0 ? 'Obrigatório' : 'Opcional'}
                          {group.free_quantity > 0 ? ` • ${group.free_quantity} Grátis` : ''}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Descrição */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Descrição / Observações
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Informações adicionais..."
                      className="min-h-[80px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <ResponsiveDialogFooter className="border-t bg-muted/40 px-6 py-4">
            <ResponsiveDialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </ResponsiveDialogClose>
            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="bg-primary hover:bg-primary/90"
            >
              {form.formState.isSubmitting
                ? 'Salvando...'
                : isEdit
                  ? 'Salvar Alterações'
                  : 'Criar Produto'}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </Form>

      {/* Dialog para Nova Categoria */}
      <ResponsiveDialog
        open={isNewCategoryOpen}
        onOpenChange={setIsNewCategoryOpen}
      >
        <ResponsiveDialogContent className="max-w-md">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Nova Categoria</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Crie uma categoria para organizar seus produtos.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Nome da categoria"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleCreateCategory()
                }
              }}
            />
          </div>
          <ResponsiveDialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsNewCategoryOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={handleCreateCategory}>
              Criar Categoria
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  )
}
