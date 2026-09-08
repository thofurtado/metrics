import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { HelpCircle, Layers, Plus, ReceiptText, Sliders, Trash, Zap } from 'lucide-react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
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

  // Barcode
  barcode: z.string().regex(/^\d*$/, 'Apenas números').optional(),

  // Fiscal Details (NFC-e / Tributação)
  ncm: z.string().regex(/^\d*$/, 'Apenas números (8 dígitos)').optional().or(z.literal('')),
  cest: z.string().regex(/^\d*$/, 'Apenas números (7 dígitos)').optional().or(z.literal('')),
  cfop: z.string().regex(/^\d*$/, 'Apenas números (4 dígitos)').optional().or(z.literal('')),
  csosn: z.string().optional().or(z.literal('')),
  cst_icms: z.string().optional().or(z.literal('')),
  origem: z.coerce.number().optional().default(0),
  cst_pis: z.string().optional().or(z.literal('')),
  aliquota_pis: z.coerce.number().optional().default(0),
  cst_cofins: z.string().optional().or(z.literal('')),
  aliquota_cofins: z.coerce.number().optional().default(0),

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
  const [activeTab, setActiveTab] = useState('general')
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
      cest: initialData?.cest ?? '',
      cfop: initialData?.cfop ?? '',
      csosn: initialData?.csosn ?? '',
      cst_icms: initialData?.cst_icms ?? '',
      origem: initialData?.origem ?? 0,
      cst_pis: initialData?.cst_pis ?? '',
      aliquota_pis: initialData?.aliquota_pis ?? 0,
      cst_cofins: initialData?.cst_cofins ?? '',
      aliquota_cofins: initialData?.aliquota_cofins ?? 0,
      active: initialData?.active ?? true,
      show_on_menu: initialData?.show_on_menu ?? initialData?.product?.show_on_menu ?? true,
      is_priority: initialData?.is_priority ?? false,
      display_id: initialData?.display_id ?? undefined,
      measureUnit: initialData?.measureUnit ?? 'UNITARY',
    },
  })

  const selectedCategory = form.watch('category')
  const watchedCsosn = form.watch('csosn')
  const watchedCest = form.watch('cest')

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

  // Presets fiscais inteligentes do Simples Nacional
  function applySimples102() {
    form.setValue('csosn', '102')
    form.setValue('cfop', '5102')
    form.setValue('cst_icms', '00')
    form.setValue('cst_pis', '49')
    form.setValue('aliquota_pis', 0)
    form.setValue('cst_cofins', '49')
    form.setValue('aliquota_cofins', 0)
    form.setValue('origem', 0)
    toast.info('Preset Simples 102 (Revenda Normal / Sem ST) aplicado!')
  }

  function applySimples500() {
    form.setValue('csosn', '500')
    form.setValue('cfop', '5405')
    form.setValue('cst_icms', '60')
    form.setValue('cst_pis', '49')
    form.setValue('aliquota_pis', 0)
    form.setValue('cst_cofins', '49')
    form.setValue('aliquota_cofins', 0)
    form.setValue('origem', 0)
    toast.info('Preset Simples 500 (Substituição Tributária / ST) aplicado! Lembre-se de preencher o CEST.')
  }

  function applyFabricacaoPropria() {
    form.setValue('csosn', '102')
    form.setValue('cfop', '5101')
    form.setValue('cst_icms', '00')
    form.setValue('cst_pis', '49')
    form.setValue('aliquota_pis', 0)
    form.setValue('cst_cofins', '49')
    form.setValue('aliquota_cofins', 0)
    form.setValue('origem', 0)
    toast.info('Preset Fabricação Própria (Cozinha / 5101) aplicado!')
  }

  function clearFiscalData() {
    form.setValue('ncm', '')
    form.setValue('cest', '')
    form.setValue('cfop', '')
    form.setValue('csosn', '')
    form.setValue('cst_icms', '')
    form.setValue('origem', 0)
    form.setValue('cst_pis', '')
    form.setValue('aliquota_pis', 0)
    form.setValue('cst_cofins', '')
    form.setValue('aliquota_cofins', 0)
    toast.info('Campos fiscais limpos.')
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
          ncm: data.ncm || null,
          cest: data.cest || null,
          cfop: data.cfop || null,
          csosn: data.csosn || null,
          cst_icms: data.cst_icms || null,
          origem: data.origem ?? 0,
          cst_pis: data.cst_pis || null,
          aliquota_pis: data.aliquota_pis || 0,
          cst_cofins: data.cst_cofins || null,
          aliquota_cofins: data.aliquota_cofins || 0,
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
          ncm: data.ncm || null,
          cest: data.cest || null,
          cfop: data.cfop || null,
          csosn: data.csosn || null,
          cst_icms: data.cst_icms || null,
          origem: data.origem ?? 0,
          cst_pis: data.cst_pis || null,
          aliquota_pis: data.aliquota_pis || 0,
          cst_cofins: data.cst_cofins || null,
          aliquota_cofins: data.aliquota_cofins || 0,
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
    <TooltipProvider delayDuration={200}>
      <Form {...form}>
        <form
          id="product-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden text-left"
        >
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex flex-1 flex-col overflow-hidden"
          >
            {/* Barra de Abas Elegante */}
            <div className="border-b bg-muted/20 px-6 py-2.5 sm:px-8">
              <TabsList className="grid w-full max-w-[400px] grid-cols-2">
                <TabsTrigger value="general" className="flex items-center gap-2 text-xs font-semibold">
                  <Layers className="h-3.5 w-3.5" />
                  <span>Geral & Venda</span>
                </TabsTrigger>
                <TabsTrigger value="fiscal" className="flex items-center gap-2 text-xs font-semibold">
                  <ReceiptText className="h-3.5 w-3.5 text-primary" />
                  <span>Dados Fiscais (NFC-e)</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* ── ABA 1: GERAL & VENDA ─────────────────────────────────────────── */}
            <TabsContent
              value="general"
              className="mt-0 flex-1 space-y-6 overflow-y-auto overflow-x-hidden px-6 py-6 sm:px-8 sm:py-8"
            >
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

              {/* Categoria, Subcategoria, Unidade e Código de Barras */}
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

              {/* Estoque */}
              <div className="grid grid-cols-2 gap-6 sm:grid-cols-2">
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
                        placeholder="Informações adicionais do produto..."
                        className="min-h-[80px] resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TabsContent>

            {/* ── ABA 2: DADOS FISCAIS (NFC-e / SAT) ────────────────────────────── */}
            <TabsContent
              value="fiscal"
              className="mt-0 flex-1 space-y-6 overflow-y-auto overflow-x-hidden px-6 py-6 sm:px-8 sm:py-8"
            >
              {/* Header Informativo */}
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
                <div className="flex items-start gap-3.5">
                  <div className="rounded-xl bg-primary/10 p-2 text-primary">
                    <ReceiptText className="h-5 w-5" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Configurações Fiscais para Emissão de NFC-e
                      </h4>
                      <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider">
                        100% Opcional
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Preencha estes dados caso seu PDV emita cupom fiscal eletrônico.
                      Para empresas do <strong>Simples Nacional</strong>, utilize os botões de atalho abaixo para preencher os campos automaticamente com as regras padrão.
                    </p>
                  </div>
                </div>
              </div>

              {/* Presets Rápidos */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <FormLabel className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    ⚡ Presets Rápidos (Simples Nacional)
                  </FormLabel>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearFiscalData}
                    className="h-7 text-xs text-muted-foreground hover:text-destructive"
                  >
                    Limpar campos fiscais
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={applySimples102}
                    className="flex flex-col items-start rounded-xl border border-slate-200 bg-white p-3.5 text-left transition-all hover:border-primary/50 hover:bg-primary/5 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-primary/40"
                  >
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      🛒 Tributação Normal
                    </span>
                    <span className="font-mono text-[11px] font-bold text-primary">
                      CSOSN 102 • CFOP 5102
                    </span>
                    <span className="mt-1 text-[11px] text-muted-foreground leading-tight">
                      Revenda geral sem substituição tributária (alimentos, doces, mercearia).
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={applySimples500}
                    className="flex flex-col items-start rounded-xl border border-slate-200 bg-white p-3.5 text-left transition-all hover:border-amber-500/50 hover:bg-amber-500/5 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-amber-500/40"
                  >
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                      🏷️ Substituição Tributária (ST)
                    </span>
                    <span className="font-mono text-[11px] font-bold text-amber-600 dark:text-amber-400">
                      CSOSN 500 • CFOP 5405
                    </span>
                    <span className="mt-1 text-[11px] text-muted-foreground leading-tight">
                      Bebidas frias, cervejas e refrigerantes (ICMS já retido na indústria/distribuidora).
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={applyFabricacaoPropria}
                    className="flex flex-col items-start rounded-xl border border-slate-200 bg-white p-3.5 text-left transition-all hover:border-emerald-500/50 hover:bg-emerald-500/5 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-emerald-500/40"
                  >
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      🍳 Fabricação Própria (Cozinha)
                    </span>
                    <span className="font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      CSOSN 102 • CFOP 5101
                    </span>
                    <span className="mt-1 text-[11px] text-muted-foreground leading-tight">
                      Pratos feitos, lanches, porções e pizzas produzidas no próprio estabelecimento.
                    </span>
                  </button>
                </div>
              </div>

              {/* Alerta de CEST Obrigatório se CSOSN 500 */}
              {watchedCsosn === '500' && !watchedCest && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-800 dark:text-amber-200">
                  ⚠️ <strong>Atenção:</strong> Produtos com Substituição Tributária (CSOSN 500 / CFOP 5405) exigem o preenchimento do código <strong>CEST</strong> para a emissão correta da NFC-e na SEFAZ.
                </div>
              )}

              {/* Campos Fiscais: NCM, CEST, CFOP e CSOSN */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {/* NCM */}
                <FormField
                  control={form.control}
                  name="ncm"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-1.5">
                        <FormLabel className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                          NCM (8 Dígitos)
                        </FormLabel>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help text-muted-foreground hover:text-foreground">
                              <HelpCircle className="h-3.5 w-3.5" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs text-xs">
                            Nomenclatura Comum do Mercosul. Código de 8 dígitos que identifica a categoria da mercadoria na SEFAZ. Obrigatório na emissão de NFC-e.
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <FormControl>
                        <Input
                          placeholder="Ex: 22021000"
                          maxLength={8}
                          {...field}
                          className="h-10 font-mono font-medium"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* CEST */}
                <FormField
                  control={form.control}
                  name="cest"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-1.5">
                        <FormLabel className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                          CEST (7 Dígitos)
                        </FormLabel>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help text-muted-foreground hover:text-foreground">
                              <HelpCircle className="h-3.5 w-3.5" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs text-xs">
                            Código Especificador da Substituição Tributária. Obrigatório quando o produto for sujeito ao regime de Substituição Tributária (CSOSN 500 / CFOP 5405).
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <FormControl>
                        <Input
                          placeholder="Ex: 0300100"
                          maxLength={7}
                          {...field}
                          className="h-10 font-mono font-medium"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* CFOP */}
                <FormField
                  control={form.control}
                  name="cfop"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-1.5">
                        <FormLabel className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                          CFOP de Saída
                        </FormLabel>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help text-muted-foreground hover:text-foreground">
                              <HelpCircle className="h-3.5 w-3.5" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs text-xs">
                            Código Fiscal de Operações. Para vendas estaduais no balcão/delivery:<br />
                            • <strong>5102</strong>: Revenda de mercadoria comum<br />
                            • <strong>5405</strong>: Revenda com ICMS retido por ST<br />
                            • <strong>5101</strong>: Produção própria da cozinha
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <FormControl>
                        <Input
                          placeholder="Ex: 5102"
                          maxLength={4}
                          {...field}
                          className="h-10 font-mono font-medium"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* CSOSN */}
                <FormField
                  control={form.control}
                  name="csosn"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-1.5">
                        <FormLabel className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                          CSOSN (Simples Nacional)
                        </FormLabel>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help text-muted-foreground hover:text-foreground">
                              <HelpCircle className="h-3.5 w-3.5" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs text-xs">
                            Código de Situação da Operação no Simples Nacional:<br />
                            • <strong>102</strong>: Tributada pelo Simples sem permissão de crédito (Padrão)<br />
                            • <strong>500</strong>: ICMS cobrado anteriormente por Substituição Tributária (ST)<br />
                            • <strong>101</strong>: Com permissão de crédito de ICMS
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent withPortal={false}>
                          <SelectItem value="102">102 - Tributada s/ crédito</SelectItem>
                          <SelectItem value="500">500 - ICMS cobrado por ST</SelectItem>
                          <SelectItem value="101">101 - Tributada c/ crédito</SelectItem>
                          <SelectItem value="400">400 - Não tributada</SelectItem>
                          <SelectItem value="900">900 - Outros</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Origem e CST ICMS */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {/* Origem da Mercadoria */}
                <FormField
                  control={form.control}
                  name="origem"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-1.5">
                        <FormLabel className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                          Origem da Mercadoria
                        </FormLabel>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help text-muted-foreground hover:text-foreground">
                              <HelpCircle className="h-3.5 w-3.5" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs text-xs">
                            Indica a procedência do produto (Nacional ou Importado). Na imensa maioria das lojas é <strong>0 - Nacional</strong>.
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Select
                        onValueChange={(val) => field.onChange(parseInt(val, 10))}
                        value={field.value?.toString() ?? '0'}
                      >
                        <FormControl>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="0 - Nacional" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent withPortal={false}>
                          <SelectItem value="0">0 - Nacional</SelectItem>
                          <SelectItem value="1">1 - Estrangeira (Importação direta)</SelectItem>
                          <SelectItem value="2">2 - Estrangeira (Adquirida no mercado interno)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* CST ICMS */}
                <FormField
                  control={form.control}
                  name="cst_icms"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-1.5">
                        <FormLabel className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                          CST ICMS (Regime Normal / Correlação)
                        </FormLabel>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help text-muted-foreground hover:text-foreground">
                              <HelpCircle className="h-3.5 w-3.5" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs text-xs">
                            Código de Tributação do ICMS do regime normal:<br />
                            • <strong>00</strong>: Tributada integralmente (correlação com 102)<br />
                            • <strong>60</strong>: Cobrado anteriormente por ST (correlação com 500)<br />
                            • <strong>20</strong>: Com redução de base de cálculo
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Selecione se aplicável..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent withPortal={false}>
                          <SelectItem value="00">00 - Tributada integralmente</SelectItem>
                          <SelectItem value="60">60 - ICMS cobrado anteriormente por ST</SelectItem>
                          <SelectItem value="20">20 - Com redução de base de cálculo</SelectItem>
                          <SelectItem value="90">90 - Outros</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* PIS e COFINS */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-900/40">
                <h5 className="mb-3 text-xs font-black uppercase tracking-wider text-muted-foreground">
                  PIS e COFINS
                </h5>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {/* CST PIS */}
                  <FormField
                    control={form.control}
                    name="cst_pis"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                          CST PIS
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: 49"
                            maxLength={2}
                            {...field}
                            className="h-10 font-mono"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Alíquota PIS */}
                  <FormField
                    control={form.control}
                    name="aliquota_pis"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                          Alíquota PIS (%)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            className="h-10 font-mono"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* CST COFINS */}
                  <FormField
                    control={form.control}
                    name="cst_cofins"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                          CST COFINS
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: 49"
                            maxLength={2}
                            {...field}
                            className="h-10 font-mono"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Alíquota COFINS */}
                  <FormField
                    control={form.control}
                    name="aliquota_cofins"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                          Alíquota COFINS (%)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
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
            </TabsContent>
          </Tabs>

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
    </TooltipProvider>
  )
}
