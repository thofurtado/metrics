import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  Barcode,
  Camera,
  ChefHat,
  HelpCircle,
  Image as ImageIcon,
  Layers,
  Plus,
  ReceiptText,
  Sliders,
  Trash2,
  Upload,
  Utensils,
  X,
  Zap,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { checkProductCode } from '@/api/check-product-code'
import { getComplementGroups, syncProductComplementGroups } from '@/api/complements'
import { createCategory } from '@/api/create-category'
import { createProduct } from '@/api/create-product'
import { getCategories } from '@/api/get-categories'
import { getNextProductId } from '@/api/get-next-product-id'
import { getSupplies } from '@/api/get-supplies'
import { getSubcategories } from '@/api/subcategories'
import { updateItem } from '@/api/update-item'
import { uploadFileProduct } from '@/api/upload-file'
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
import { CurrencyInput } from '@/components/ui/currency-input'
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
import { API_BASE_URL } from '@/lib/axios'
import { cn, resolveImageUrl } from '@/lib/utils'
import { compressImage } from '@/lib/image-compression'

const productSchema = z.object({
  name: z.string().min(1, 'Nome do produto é obrigatório'),
  description: z.string().optional(),
  category: z.string().optional(),
  subcategory_id: z.string().optional(),

  // Financeiro
  cost: z.coerce.number().min(0).optional().default(0),
  price: z.coerce.number().min(0, 'Preço de venda é obrigatório').default(0),

  // Estoque
  stock: z.coerce.number().optional().default(0),
  min_stock: z.coerce.number().optional().default(0),

  // Identificação e Códigos
  barcode: z.string().regex(/^\d*$/, 'Apenas números').optional().or(z.literal('')),
  display_id: z.preprocess((val) => {
    if (!val || val === '' || val === 'Auto') return undefined
    const parsed = Number(val)
    return isNaN(parsed) ? undefined : parsed
  }, z.number().optional()),

  measureUnit: z.enum(['UNITARY', 'FRACTIONAL']).default('UNITARY'),

  // Status & Operação
  active: z.boolean().default(true),
  show_on_menu: z.boolean().default(true),
  is_priority: z.boolean().default(false),

  // Dados Fiscais (NFC-e / SAT)
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

  // Ficha Técnica (Composição)
  is_composite: z.boolean().default(false),
  compositions: z.array(
    z.object({
      supply_id: z.string().min(1, 'Selecione o insumo'),
      quantity: z.coerce.number().min(0.0001, 'Qtd deve ser maior que 0'),
    })
  ).optional(),
})

type ProductSchema = z.infer<typeof productSchema>

interface ProductFormProps {
  initialData?: any
  onSuccess?: () => void
}

export function ProductForm({ initialData, onSuccess }: ProductFormProps) {
  const queryClient = useQueryClient()
  const isEdit = !!initialData
  const [activeTab, setActiveTab] = useState('general')
  const [isNewCategoryOpen, setIsNewCategoryOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')

  // Foto do Produto
  const [productImage, setProductImage] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const existingImageUrl =
    initialData?.product?.image_url || initialData?.image_url || null

  // Grupos de adicionais selecionados
  const [selectedComplementGroupIds, setSelectedComplementGroupIds] = useState<string[]>(() => {
    if (initialData?.complementGroups && Array.isArray(initialData.complementGroups)) {
      return initialData.complementGroups.map((cg: any) => cg.group_id || cg.group?.id || cg.id)
    }
    if (initialData?.product?.complementGroups && Array.isArray(initialData.product.complementGroups)) {
      return initialData.product.complementGroups.map((cg: any) => cg.group_id || cg.group?.id || cg.id)
    }
    return []
  })

  // Queries
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  })

  const { data: complementGroupsData } = useQuery({
    queryKey: ['complement-groups'],
    queryFn: getComplementGroups,
  })

  const { data: suppliesData } = useQuery({
    queryKey: ['supplies-all'],
    queryFn: () => getSupplies({ pageIndex: 1, perPage: 500 }),
  })

  const supplies = suppliesData?.data?.supplies || []
  const complementGroups = complementGroupsData?.groups || []

  // Sincroniza complementos caso venham da query de complementos
  useEffect(() => {
    if (isEdit && complementGroups.length > 0 && selectedComplementGroupIds.length === 0) {
      const prodId = initialData?.product?.id || initialData?.id
      if (prodId) {
        const matchingGroupIds = complementGroups
          .filter((g) => g.products?.some((p: any) => p.product_id === prodId))
          .map((g) => g.id)
        if (matchingGroupIds.length > 0) {
          setSelectedComplementGroupIds(matchingGroupIds)
        }
      }
    }
  }, [complementGroups, initialData, isEdit])

  // Inicialização de composições
  const initialCompositions = useMemo(() => {
    const rawComps = initialData?.product?.compositions || initialData?.compositions || []
    if (Array.isArray(rawComps) && rawComps.length > 0) {
      return rawComps.map((c: any) => ({
        supply_id: c.supply?.id || c.supply_id || '',
        quantity: c.quantity || 1,
      }))
    }
    return []
  }, [initialData])

  const form = useForm<ProductSchema>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: initialData?.name ?? initialData?.product?.name ?? '',
      description: initialData?.description ?? initialData?.product?.description ?? '',
      category:
        initialData?.category?.id ??
        initialData?.category_id ??
        initialData?.product?.category_id ??
        (typeof initialData?.category === 'string' ? initialData.category : ''),
      subcategory_id:
        initialData?.subcategory_id ??
        initialData?.subcategory?.id ??
        initialData?.product?.subcategory_id ??
        '',
      cost: initialData?.cost ?? initialData?.product?.cost ?? 0,
      price: initialData?.price ?? initialData?.product?.price ?? 0,
      stock: initialData?.stock ?? initialData?.product?.stock ?? 0,
      min_stock: initialData?.min_stock ?? initialData?.product?.min_stock ?? 0,
      barcode: initialData?.barcode ?? initialData?.product?.barcode ?? '',
      display_id: initialData?.display_id ?? initialData?.product?.display_id ?? undefined,
      measureUnit:
        initialData?.measureUnit ?? initialData?.product?.measureUnit ?? 'UNITARY',

      active: initialData?.active ?? initialData?.product?.active ?? true,
      show_on_menu:
        initialData?.show_on_menu ??
        initialData?.product?.show_on_menu ??
        true,
      is_priority:
        initialData?.is_priority ?? initialData?.product?.is_priority ?? false,

      // Fiscais
      ncm: initialData?.ncm ?? initialData?.product?.ncm ?? '',
      cest: initialData?.cest ?? initialData?.product?.cest ?? '',
      cfop: initialData?.cfop ?? initialData?.product?.cfop ?? '',
      csosn: initialData?.csosn ?? initialData?.product?.csosn ?? '',
      cst_icms: initialData?.cst_icms ?? initialData?.product?.cst_icms ?? '',
      origem: initialData?.origem ?? initialData?.product?.origem ?? 0,
      cst_pis: initialData?.cst_pis ?? initialData?.product?.cst_pis ?? '',
      aliquota_pis: initialData?.aliquota_pis ?? initialData?.product?.aliquota_pis ?? 0,
      cst_cofins: initialData?.cst_cofins ?? initialData?.product?.cst_cofins ?? '',
      aliquota_cofins: initialData?.aliquota_cofins ?? initialData?.product?.aliquota_cofins ?? 0,

      is_composite:
        initialData?.is_composite ??
        initialData?.product?.is_composite ??
        initialCompositions.length > 0,
      compositions: initialCompositions,
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'compositions',
  })

  const selectedCategory = form.watch('category')
  const watchedCsosn = form.watch('csosn')
  const watchedCest = form.watch('cest')
  const watchedPrice = form.watch('price') || 0
  const watchedCost = form.watch('cost') || 0
  const watchedCompositions = form.watch('compositions') || []

  // Subcategorias filtradas
  const { data: subcategoriesData } = useQuery({
    queryKey: ['subcategories', selectedCategory],
    queryFn: () => getSubcategories(selectedCategory || undefined),
    enabled: !!selectedCategory,
  })

  // Cálculo automático do CMV e da Margem
  const calculatedCMV = useMemo(() => {
    if (!watchedCompositions || watchedCompositions.length === 0) return 0
    return watchedCompositions.reduce((acc, curr) => {
      if (!curr.supply_id) return acc
      const supply = supplies.find((s) => s.id === curr.supply_id)
      return acc + (supply?.cost ?? 0) * (Number(curr.quantity) || 0)
    }, 0)
  }, [watchedCompositions, supplies])

  // Se houver insumos na receita, sincroniza o Custo da Aba Geral com o CMV calculado
  useEffect(() => {
    if (watchedCompositions.length > 0 && calculatedCMV > 0) {
      form.setValue('cost', Number(calculatedCMV.toFixed(2)))
      form.setValue('is_composite', true)
    }
  }, [calculatedCMV, watchedCompositions.length, form])

  const effectiveCost = watchedCompositions.length > 0 && calculatedCMV > 0 ? calculatedCMV : watchedCost
  const profit = watchedPrice - effectiveCost
  const margin = effectiveCost > 0 ? (profit / effectiveCost) * 100 : 0

  // Processamento unificado de imagem (Upload, Drag&Drop e Ctrl+V com compressão ultra-rápida)
  const processImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('O arquivo precisa ser uma imagem válida (JPG, PNG ou WEBP)')
      return
    }

    try {
      // Otimiza no cliente para ~80KB-180KB com resolução 1200x1200px (upload em <0.2s)
      const optimized = await compressImage(file)
      setProductImage(optimized)
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl)
      }
      setImagePreviewUrl(URL.createObjectURL(optimized))
      setActiveTab('general')
      toast.success('Foto carregada e otimizada!')
    } catch {
      setProductImage(file)
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl)
      }
      setImagePreviewUrl(URL.createObjectURL(file))
      setActiveTab('general')
      toast.success('Foto carregada!')
    }
  }

  // Tratamento da imagem via input de arquivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImageFile(e.target.files[0])
    }
  }

  const handleRemovePhoto = () => {
    setProductImage(null)
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl)
    }
    setImagePreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Listener global para capturar Ctrl + V com imagem na área de transferência
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const clipboardData = e.clipboardData
      if (!clipboardData) return

      // 1. Prioriza arquivos de imagem diretos no clipboard (ex: arquivo copiado do Explorer)
      if (clipboardData.files && clipboardData.files.length > 0) {
        for (let i = 0; i < clipboardData.files.length; i++) {
          const file = clipboardData.files[i]
          if (file.type.startsWith('image/')) {
            e.preventDefault()
            e.stopPropagation()
            processImageFile(file)
            return
          }
        }
      }

      // 2. Verifica itens da área de transferência (ex: print screen, copiar imagem da web / snipping tool)
      if (clipboardData.items && clipboardData.items.length > 0) {
        for (let i = 0; i < clipboardData.items.length; i++) {
          const item = clipboardData.items[i]
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile()
            if (file) {
              e.preventDefault()
              e.stopPropagation()
              processImageFile(file)
              return
            }
          }
        }
      }
    }

    // Captura no modo capture (true) para interceptar o Ctrl+V mesmo com campos focados
    window.addEventListener('paste', handlePaste, true)
    return () => {
      window.removeEventListener('paste', handlePaste, true)
    }
  }, [imagePreviewUrl])

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

  // Criação de categoria inline
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

  async function handleCreateCategory() {
    if (!newCategoryName.trim()) return
    await createCategoryFn({ name: newCategoryName })
  }

  // Mutations de criação e atualização
  const { mutateAsync: createProductFn } = useMutation({
    mutationFn: createProduct,
  })

  const { mutateAsync: updateItemFn } = useMutation({
    mutationFn: updateItem,
  })

  async function onSubmit(data: ProductSchema) {
    try {
      let savedProductId = initialData?.product?.id || initialData?.id
      const validCompositions = (data.compositions || []).filter(
        (c) => c.supply_id && Number(c.quantity) > 0
      )
      const isComposite = validCompositions.length > 0

      const finalCost = isComposite ? calculatedCMV : data.cost || 0

      if (isEdit) {
        await updateItemFn({
          id: savedProductId,
          type: 'PRODUCT',
          name: data.name,
          description: data.description || null,
          category: data.category || null,
          subcategory_id: data.subcategory_id || null,
          cost: finalCost,
          price: data.price || 0,
          stock: data.stock,
          min_stock: data.min_stock,
          barcode: data.barcode || null,
          display_id: data.display_id,
          measureUnit: data.measureUnit,
          active: data.active,
          show_on_menu: data.show_on_menu,
          is_priority: data.is_priority,
          is_composite: isComposite,
          compositions: validCompositions,

          // Fiscais
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
        toast.success('Produto atualizado com sucesso!')
      } else {
        const createRes = await createProductFn({
          name: data.name,
          description: data.description,
          price: data.price || 0,
          cost: finalCost,
          stock: data.stock,
          min_stock: data.min_stock,
          barcode: data.barcode || null,
          display_id: data.display_id,
          measureUnit: data.measureUnit,
          category: data.category || null,
          subcategory_id: data.subcategory_id || null,
          active: data.active,
          show_on_menu: data.show_on_menu,
          is_priority: data.is_priority,
          is_composite: isComposite,
          compositions: validCompositions,

          // Fiscais
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
        })
        savedProductId = createRes?.data?.product?.id || createRes?.data?.id
        toast.success('Produto cadastrado com sucesso!')
      }

      // Upload de imagem se foi selecionado um novo arquivo
      if (productImage && savedProductId) {
        try {
          await uploadFileProduct(savedProductId, productImage)
          toast.success('Foto do produto enviada!')
        } catch (imgErr) {
          console.error('Erro no upload da foto:', imgErr)
          toast.warning('Produto salvo, mas houve falha ao enviar a foto.')
        }
      }

      // Sincronização dos grupos de complementos
      if (savedProductId && selectedComplementGroupIds) {
        try {
          await syncProductComplementGroups(savedProductId, selectedComplementGroupIds)
        } catch (syncErr) {
          console.error('Erro ao vincular adicionais:', syncErr)
        }
      }

      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['items'] })
      queryClient.invalidateQueries({ queryKey: ['composite-products'] })
      queryClient.invalidateQueries({ queryKey: ['complement-groups'] })
      onSuccess?.()
    } catch (err: any) {
      console.error('Erro ao salvar produto:', err)
      toast.error('Erro ao salvar produto. Verifique os campos.')
    }
  }

  // URL final da imagem atual (seja preview local ou URL remota)
  const currentDisplayImageUrl = useMemo(() => {
    if (imagePreviewUrl) return imagePreviewUrl
    if (existingImageUrl) {
      return resolveImageUrl(existingImageUrl)
    }
    return null
  }, [imagePreviewUrl, existingImageUrl])

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
            {/* ── BARRA DE ABAS REFINADA ────────────────────────── */}
            <div className="border-b border-slate-200 bg-slate-50/50 px-6 py-2 dark:border-slate-800 dark:bg-slate-900/30 sm:px-8">
              <TabsList className="grid h-10 w-full max-w-[560px] grid-cols-3 rounded-xl bg-slate-200/70 p-1 dark:bg-slate-800/80">
                <TabsTrigger
                  value="general"
                  className="flex items-center justify-center gap-2 rounded-lg text-xs font-bold transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-950 dark:data-[state=active]:text-white"
                >
                  <Layers className="h-4 w-4" />
                  <span>Geral & Venda</span>
                </TabsTrigger>

                <TabsTrigger
                  value="fiscal"
                  className="flex items-center justify-center gap-2 rounded-lg text-xs font-bold transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-950 dark:data-[state=active]:text-white"
                >
                  <ReceiptText className="h-4 w-4" />
                  <span>Dados Fiscais (NFC-e)</span>
                </TabsTrigger>

                <TabsTrigger
                  value="complements"
                  className="flex items-center justify-center gap-2 rounded-lg text-xs font-bold transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-950 dark:data-[state=active]:text-white"
                >
                  <ChefHat className="h-4 w-4" />
                  <span>Complementos & Ficha</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* ── ABA 1: GERAL & VENDA ─────────────────────────────────────────── */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            <TabsContent
              value="general"
              className="mt-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-6 py-5 sm:px-8 sm:py-5"
            >
              {/* 1. NOME DO PRODUTO E CÓDIGO DE BARRAS */}
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12 sm:col-span-8">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <div className="flex h-5 items-center justify-between">
                          <FormLabel className="truncate whitespace-nowrap text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Nome do Produto *
                          </FormLabel>
                          <span className="text-[10px] text-muted-foreground">
                            Exibido em cupons e cardápio
                          </span>
                        </div>
                        <FormControl>
                          <Input
                            placeholder="Ex: Pizza Calabresa Nobre Especial..."
                            {...field}
                            className="h-10 rounded-xl text-sm font-semibold"
                            autoFocus
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="col-span-12 sm:col-span-4">
                  <FormField
                    control={form.control}
                    name="barcode"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <div className="flex h-5 items-center justify-between">
                          <FormLabel className="truncate whitespace-nowrap text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Código de Barras
                          </FormLabel>
                          <span className="text-[10px] text-muted-foreground">
                            EAN / GTIN
                          </span>
                        </div>
                        <FormControl>
                          <div className="relative">
                            <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="7898357410012"
                              {...field}
                              className="h-10 rounded-xl pl-9 font-mono text-xs font-bold"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* 2. CATEGORIA, SUBCATEGORIA E UNIDADE DE MEDIDA (3 COLUNAS BALANCEADAS) */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {/* Categoria */}
                <div>
                  <div className="mb-1.5 flex h-5 items-center">
                    <FormLabel className="truncate whitespace-nowrap text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Categoria *
                    </FormLabel>
                  </div>
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
                              <SelectTrigger className="h-10 rounded-xl font-semibold text-xs">
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
                      className="h-10 w-10 shrink-0 rounded-xl border-slate-200 dark:border-slate-800"
                      onClick={() => setIsNewCategoryOpen(true)}
                      title="Nova Categoria"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Subcategoria */}
                <div>
                  <div className="mb-1.5 flex h-5 items-center">
                    <FormLabel className="truncate whitespace-nowrap text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Subcategoria
                    </FormLabel>
                  </div>
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
                            <SelectTrigger className="h-10 rounded-xl font-semibold text-xs">
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

                {/* Unidade de Medida */}
                <div>
                  <div className="mb-1.5 flex h-5 items-center">
                    <FormLabel className="truncate whitespace-nowrap text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Unidade Medida
                    </FormLabel>
                  </div>
                  <FormField
                    control={form.control}
                    name="measureUnit"
                    render={({ field }) => (
                      <FormItem className="space-y-0">
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-10 rounded-xl font-semibold text-xs">
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
              </div>

              {/* 3. PREÇO, CUSTO & RENTABILIDADE (4 CARDS DE ALTURA UNIFICADA E IDENTICA) */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/30">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Preço, Custo & Rentabilidade
                    </h4>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {watchedCompositions.length > 0
                      ? 'CMV calculado automaticamente pela Ficha Técnica'
                      : 'Cálculo automático de margem'}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {/* Card 1: Custo de Compra (CMV) */}
                  <FormField
                    control={form.control}
                    name="cost"
                    render={({ field }) => (
                      <div className="flex h-[84px] flex-col justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-950">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Custo de Compra (CMV)
                        </span>
                        <div className="flex items-center">
                          <span className="mr-1.5 font-mono text-xs font-bold text-muted-foreground">
                            R$
                          </span>
                          <CurrencyInput
                            value={field.value}
                            onValueChange={(val) => field.onChange(val)}
                            disabled={watchedCompositions.length > 0}
                            className="w-full bg-transparent font-mono text-base font-bold text-slate-800 focus:outline-none disabled:cursor-not-allowed dark:text-slate-200 border-none shadow-none focus-visible:ring-0 p-0 h-auto"
                            placeholder="0,00"
                          />
                        </div>
                      </div>
                    )}
                  />

                  {/* Card 2: Preço de Venda (Destaque Principal) */}
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <div className="flex h-[84px] flex-col justify-between rounded-xl border-2 border-primary/50 bg-primary/5 p-3 shadow-sm">
                        <span className="text-[10px] font-black uppercase tracking-wider text-primary">
                          Preço de Venda *
                        </span>
                        <div className="flex items-center">
                          <span className="mr-1.5 font-mono text-sm font-bold text-primary">
                            R$
                          </span>
                          <CurrencyInput
                            value={field.value}
                            onValueChange={(val) => field.onChange(val)}
                            className="w-full bg-transparent font-mono text-lg font-black text-primary focus:outline-none border-none shadow-none focus-visible:ring-0 p-0 h-auto"
                            placeholder="0,00"
                          />
                        </div>
                      </div>
                    )}
                  />

                  {/* Card 3: Lucro Bruto */}
                  <div className="flex h-[84px] flex-col justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-950">
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                      Lucro Bruto
                    </span>
                    <div>
                      <div
                        className={cn(
                          'truncate font-mono text-base font-black',
                          profit >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-500'
                        )}
                      >
                        R$ {profit.toFixed(2)}
                      </div>
                      <span className="block text-[10px] text-muted-foreground">
                        Líquido unitário
                      </span>
                    </div>
                  </div>

                  {/* Card 4: Margem Líquida */}
                  <div className="flex h-[84px] flex-col justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-950">
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                      Margem Líquida
                    </span>
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={cn(
                            'truncate font-mono text-base font-black',
                            margin >= 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-500'
                          )}
                        >
                          {margin >= 0 ? `+${margin.toFixed(1)}%` : `${margin.toFixed(1)}%`}
                        </span>
                        <span
                          className={cn(
                            'shrink-0 rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide',
                            margin >= 50
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : margin > 0
                                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                : 'bg-red-500/10 text-red-600 dark:text-red-400'
                          )}
                        >
                          {margin >= 50
                            ? 'Alta'
                            : margin > 0
                              ? 'Normal'
                              : 'Negativa'}
                        </span>
                      </div>
                      <span className="block text-[10px] text-muted-foreground">
                        Rentabilidade calculada
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. ESTOQUE & CÓDIGO PDV (3 COLUNAS BALANCEADAS COM LABELS EM 1 LINHA) */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {/* Estoque Inicial */}
                <FormField
                  control={form.control}
                  name="stock"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <div className="flex h-5 items-center justify-between">
                        <FormLabel className="truncate whitespace-nowrap text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          {!isEdit ? 'Estoque Inicial' : 'Estoque Atual'}
                        </FormLabel>
                        <span className="text-[10px] text-muted-foreground">
                          Saldo abertura
                        </span>
                      </div>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          className="h-10 rounded-xl font-mono text-xs font-bold"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Estoque Mínimo */}
                <FormField
                  control={form.control}
                  name="min_stock"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <div className="flex h-5 items-center justify-between">
                        <FormLabel className="truncate whitespace-nowrap text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Estoque Mínimo
                        </FormLabel>
                        <span className="text-[10px] text-muted-foreground">
                          Alerta reposição
                        </span>
                      </div>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          className="h-10 rounded-xl font-mono text-xs font-bold"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Código PDV Rápido */}
                <FormField
                  control={form.control}
                  name="display_id"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <div className="flex h-5 items-center justify-between">
                        <FormLabel className="truncate whitespace-nowrap text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Código PDV
                        </FormLabel>
                        <span className="text-[10px] text-muted-foreground">
                          ID Rápido Caixa
                        </span>
                      </div>
                      <FormControl>
                        <Input
                          placeholder="Automático"
                          value={field.value ?? ''}
                          onChange={field.onChange}
                          className="h-10 rounded-xl font-mono text-xs font-bold"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* 5. CARD COMPACTO: 3 STATUS ALINHADOS EM COLUNAS PADRONIZADAS */}
              <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-2 dark:border-slate-800 dark:bg-slate-900/40 sm:grid-cols-3">
                {/* Status Ativo */}
                <div className="flex h-10 items-center justify-between rounded-lg border border-slate-200/60 bg-white px-3 shadow-2xs dark:border-slate-800/60 dark:bg-slate-950">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Status:{' '}
                    <strong
                      className={
                        form.watch('active')
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-400'
                      }
                    >
                      {form.watch('active') ? 'Ativo' : 'Inativo'}
                    </strong>
                  </span>
                  <Switch
                    checked={form.watch('active')}
                    onCheckedChange={(val) => form.setValue('active', val)}
                    className="scale-85 data-[state=checked]:bg-emerald-500"
                  />
                </div>

                {/* Cardápio */}
                <div className="flex h-10 items-center justify-between rounded-lg border border-slate-200/60 bg-white px-3 shadow-2xs dark:border-slate-800/60 dark:bg-slate-950">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Cardápio:{' '}
                    <strong
                      className={
                        form.watch('show_on_menu')
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-slate-400'
                      }
                    >
                      {form.watch('show_on_menu') ? 'Visível' : 'Oculto'}
                    </strong>
                  </span>
                  <Switch
                    checked={form.watch('show_on_menu')}
                    onCheckedChange={(val) => form.setValue('show_on_menu', val)}
                    className="scale-85 data-[state=checked]:bg-blue-500"
                  />
                </div>

                {/* Prioridade KDS */}
                <div className="flex h-10 items-center justify-between rounded-lg border border-slate-200/60 bg-white px-3 shadow-2xs dark:border-slate-800/60 dark:bg-slate-950">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <Zap className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                    Prioridade KDS
                  </span>
                  <Switch
                    checked={form.watch('is_priority')}
                    onCheckedChange={(val) => form.setValue('is_priority', val)}
                    className="scale-85 data-[state=checked]:bg-amber-500"
                  />
                </div>
              </div>

              {/* 6. IMAGEM DO PRODUTO NO CARDÁPIO (OPCIONAL E COMPACTA NO FINAL) */}
              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-950">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {currentDisplayImageUrl ? (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setIsDragging(true)
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setIsDragging(false)
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setIsDragging(false)
                      const file = e.dataTransfer.files?.[0]
                      if (file) processImageFile(file)
                    }}
                    className={cn(
                      'flex flex-col gap-3 rounded-lg border p-2.5 transition-all sm:flex-row sm:items-center',
                      isDragging
                        ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                        : 'border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/40'
                    )}
                  >
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-inner dark:border-slate-800 dark:bg-slate-950">
                      <img
                        src={currentDisplayImageUrl}
                        alt="Preview"
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute bottom-0.5 right-0.5 rounded bg-black/70 px-1 text-[8px] font-black uppercase text-white">
                        HD
                      </span>
                    </div>

                    <div className="flex-1 space-y-0.5 truncate">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-xs font-bold text-slate-900 dark:text-slate-100">
                          {productImage?.name || 'foto-produto-cardapio.jpg'}
                        </p>
                        <span className="inline-flex items-center rounded border border-slate-200 bg-white px-1.5 py-0.2 text-[9px] font-bold text-slate-600 shadow-2xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          Ctrl + V para trocar
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {productImage
                          ? `${(productImage.size / (1024 * 1024)).toFixed(2)} MB • Pronto para salvar`
                          : 'Imagem vinculada ao produto'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-8 gap-1.5 rounded-lg border-slate-200 text-xs font-bold dark:border-slate-800"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        Alterar
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleRemovePhoto}
                        className="h-8 w-8 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                        title="Remover foto"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setIsDragging(true)
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setIsDragging(false)
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setIsDragging(false)
                      const file = e.dataTransfer.files?.[0]
                      if (file) processImageFile(file)
                    }}
                    className={cn(
                      'flex cursor-pointer items-center justify-between rounded-lg border border-dashed px-3.5 py-2.5 transition-all',
                      isDragging
                        ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                        : 'border-slate-200 bg-slate-50/50 hover:border-primary/50 hover:bg-primary/5 dark:border-slate-800 dark:bg-slate-900/30 dark:hover:border-primary/40'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Camera className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            Foto do Cardápio (Opcional)
                          </p>
                          <span className="inline-flex items-center rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] font-bold text-slate-600 shadow-2xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            Ctrl + V
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          JPG, PNG ou WEBP até 5MB • Cole com Ctrl+V de qualquer lugar ou arraste
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 rounded-lg border-slate-200 px-2.5 text-xs font-bold dark:border-slate-800"
                    >
                      <Plus className="mr-1 h-3 w-3" /> Selecionar
                    </Button>
                  </div>
                )}
              </div>

              {/* 7. DESCRIÇÃO / OBSERVAÇÕES DO CARDÁPIO */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <div className="flex h-5 items-center justify-between">
                      <FormLabel className="truncate whitespace-nowrap text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Descrição / Observações do Cardápio
                      </FormLabel>
                      <span className="text-[10px] text-muted-foreground">
                        Opcional
                      </span>
                    </div>
                    <FormControl>
                      <Textarea
                        placeholder="Ingredientes, detalhes da receita, notas de alérgenos..."
                        className="min-h-[60px] resize-none rounded-xl text-xs"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TabsContent>

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* ── ABA 2: DADOS FISCAIS (NFC-e / SAT) ────────────────────────────── */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            <TabsContent
              value="fiscal"
              className="mt-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-6 py-5 sm:px-8 sm:py-5"
            >
              {/* Header Informativo */}
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-4.5">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-primary/10 p-2 text-primary">
                    <ReceiptText className="h-4.5 w-4.5" />
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
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
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
                    className="flex flex-col items-start rounded-xl border border-slate-200 bg-white p-3 text-left transition-all hover:border-primary/50 hover:bg-primary/5 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-primary/40"
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
                    className="flex flex-col items-start rounded-xl border border-slate-200 bg-white p-3 text-left transition-all hover:border-amber-500/50 hover:bg-amber-500/5 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-amber-500/40"
                  >
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                      🏷️ Substituição Tributária (ST)
                    </span>
                    <span className="font-mono text-[11px] font-bold text-amber-600 dark:text-amber-400">
                      CSOSN 500 • CFOP 5405
                    </span>
                    <span className="mt-1 text-[11px] text-muted-foreground leading-tight">
                      Bebidas frias, cervejas e refrigerantes (ICMS retido na indústria/distribuidora).
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={applyFabricacaoPropria}
                    className="flex flex-col items-start rounded-xl border border-slate-200 bg-white p-3 text-left transition-all hover:border-emerald-500/50 hover:bg-emerald-500/5 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-emerald-500/40"
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
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
                  ⚠️ <strong>Atenção:</strong> Produtos com Substituição Tributária (CSOSN 500 / CFOP 5405) exigem o preenchimento do código <strong>CEST</strong> para a emissão correta da NFC-e na SEFAZ.
                </div>
              )}

              {/* Campos Fiscais: NCM, CEST, CFOP e CSOSN */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* NCM */}
                <FormField
                  control={form.control}
                  name="ncm"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex h-5 items-center gap-1.5 overflow-hidden">
                        <FormLabel className="truncate whitespace-nowrap text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          NCM (8 dígitos)
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
                          className="h-10 font-mono font-medium rounded-xl"
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
                      <div className="flex h-5 items-center gap-1.5 overflow-hidden">
                        <FormLabel className="truncate whitespace-nowrap text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          CEST (7 dígitos)
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
                          className="h-10 font-mono font-medium rounded-xl"
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
                      <div className="flex h-5 items-center gap-1.5 overflow-hidden">
                        <FormLabel className="truncate whitespace-nowrap text-xs font-bold uppercase tracking-wider text-muted-foreground">
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
                          className="h-10 font-mono font-medium rounded-xl"
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
                      <div className="flex h-5 items-center gap-1.5 overflow-hidden">
                        <FormLabel className="truncate whitespace-nowrap text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          CSOSN (Simples)
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
                          <SelectTrigger className="h-10 rounded-xl">
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Origem da Mercadoria */}
                <FormField
                  control={form.control}
                  name="origem"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex h-5 items-center gap-1.5 overflow-hidden">
                        <FormLabel className="truncate whitespace-nowrap text-xs font-bold uppercase tracking-wider text-muted-foreground">
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
                          <SelectTrigger className="h-10 rounded-xl">
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
                      <div className="flex h-5 items-center gap-1.5 overflow-hidden">
                        <FormLabel className="truncate whitespace-nowrap text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          CST ICMS (Regime Normal)
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
                          <SelectTrigger className="h-10 rounded-xl">
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
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                <h5 className="mb-2.5 text-xs font-black uppercase tracking-wider text-muted-foreground">
                  PIS e COFINS
                </h5>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {/* CST PIS */}
                  <FormField
                    control={form.control}
                    name="cst_pis"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          CST PIS
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: 49"
                            maxLength={2}
                            {...field}
                            className="h-10 font-mono rounded-xl"
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
                      <FormItem className="space-y-1">
                        <FormLabel className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          Alíq. PIS (%)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            className="h-10 font-mono rounded-xl"
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
                      <FormItem className="space-y-1">
                        <FormLabel className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          CST COFINS
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: 49"
                            maxLength={2}
                            {...field}
                            className="h-10 font-mono rounded-xl"
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
                      <FormItem className="space-y-1">
                        <FormLabel className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          Alíq. COFINS (%)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            className="h-10 font-mono rounded-xl"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </TabsContent>

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* ── ABA 3: COMPLEMENTOS & FICHA TÉCNICA (ESTILO STITCH) ─────────── */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            <TabsContent
              value="complements"
              className="mt-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-6 py-5 sm:px-8 sm:py-5"
            >
              {/* 1. SEÇÃO DE GRUPOS DE ADICIONAIS & OPCIONAIS */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="mb-3.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500 dark:bg-orange-500/20">
                      <Sliders className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                          Grupos de Adicionais & Opcionais
                        </h4>
                        <span className="rounded-full bg-orange-500/10 px-2 py-0.2 text-[10px] font-black text-orange-600 dark:text-orange-400">
                          {selectedComplementGroupIds.length} selecionados
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Marque quais grupos de complementos se aplicam a este produto
                      </p>
                    </div>
                  </div>

                  <Badge
                    variant="outline"
                    className="border-slate-200 text-xs font-semibold dark:border-slate-800"
                  >
                    Cardápio & Delivery
                  </Badge>
                </div>

                {complementGroups.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-muted-foreground dark:border-slate-800">
                    Nenhum grupo de adicionais cadastrado ainda no sistema.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {complementGroups.map((group: any) => {
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
                            'flex cursor-pointer items-start gap-3.5 rounded-xl border p-3.5 transition-all',
                            isChecked
                              ? 'border-primary/50 bg-primary/5 shadow-sm dark:border-primary/40 dark:bg-primary/10'
                              : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/30 dark:hover:border-slate-700'
                          )}
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => {}}
                            className="mt-0.5 rounded-md"
                          />
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-black text-slate-900 dark:text-slate-100">
                                {group.name}
                              </p>
                              <span
                                className={cn(
                                  'h-2 w-2 rounded-full',
                                  isChecked ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'
                                )}
                              />
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                              <span>{group.options?.length || 0} opções</span>
                              <span>•</span>
                              <span>{group.min_quantity > 0 ? 'Obrigatório' : 'Opcional'}</span>
                              {group.free_quantity > 0 && (
                                <>
                                  <span>•</span>
                                  <span className="rounded bg-emerald-500/10 px-1 py-0.2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                    {group.free_quantity} Grátis
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* 2. SEÇÃO DE FICHA TÉCNICA (COMPOSIÇÃO & CMV) */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="mb-3.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
                      <ChefHat className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                          Ficha Técnica (Composição & CMV)
                        </h4>
                        <span className="rounded-full bg-purple-500/10 px-2 py-0.2 text-[10px] font-black text-purple-600 dark:text-purple-400">
                          {fields.length} {fields.length === 1 ? 'Insumo' : 'Insumos'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Componha a receita com os insumos para cálculo automático do CMV e baixa no estoque a cada venda.
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ supply_id: '', quantity: 1 })}
                    className="h-8 gap-1.5 rounded-xl border-purple-200 bg-purple-50/50 text-xs font-bold text-purple-700 hover:bg-purple-100 dark:border-purple-900/50 dark:bg-purple-950/30 dark:text-purple-300"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar Insumo
                  </Button>
                </div>

                {fields.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center dark:border-slate-800 dark:bg-slate-900/20">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Nenhum insumo adicionado a este produto.
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Se este produto for produzido na cozinha (prato, pizza, hambúrguer), adicione os insumos para compor o custo real e automatizar as baixas de estoque.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => append({ supply_id: '', quantity: 1 })}
                      className="mt-2.5 gap-1.5 rounded-xl text-xs font-bold"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Começar Ficha Técnica
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {/* Cabeçalho da Tabela de Insumos */}
                    <div className="hidden grid-cols-12 gap-3 px-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground sm:grid">
                      <span className="col-span-6">Insumo Selecionado</span>
                      <span className="col-span-3 text-center">Quantidade</span>
                      <span className="col-span-2 text-right">Custo Prop.</span>
                      <span className="col-span-1 text-center"></span>
                    </div>

                    {/* Linhas de Insumos */}
                    <div className="space-y-2">
                      {fields.map((field, index) => {
                        const selectedSupplyId = form.watch(`compositions.${index}.supply_id`)
                        const selectedQuantity = Number(form.watch(`compositions.${index}.quantity`)) || 0
                        const currentSupply = supplies.find((s) => s.id === selectedSupplyId)
                        const propCost = (currentSupply?.cost || 0) * selectedQuantity

                        return (
                          <div
                            key={field.id}
                            className="grid grid-cols-12 items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 dark:border-slate-800 dark:bg-slate-900/30"
                          >
                            {/* Insumo Dropdown */}
                            <div className="col-span-12 sm:col-span-6">
                              <FormField
                                control={form.control}
                                name={`compositions.${index}.supply_id`}
                                render={({ field: subField }) => (
                                  <Select
                                    value={subField.value}
                                    onValueChange={subField.onChange}
                                  >
                                    <FormControl>
                                      <SelectTrigger className="h-9.5 rounded-xl bg-white text-xs font-semibold dark:bg-slate-950">
                                        <SelectValue placeholder="Selecione o insumo..." />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent withPortal={false} className="max-h-60">
                                      {supplies.map((s) => (
                                        <SelectItem key={s.id} value={s.id}>
                                          <div className="flex items-center justify-between gap-3">
                                            <span className="font-semibold">{s.name}</span>
                                            <span className="font-mono text-[11px] text-muted-foreground">
                                              (R$ {Number(s.cost || 0).toFixed(2)} / {s.unit || 'UN'})
                                            </span>
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                            </div>

                            {/* Quantidade com Unidade */}
                            <div className="col-span-6 sm:col-span-3">
                              <FormField
                                control={form.control}
                                name={`compositions.${index}.quantity`}
                                render={({ field: qtyField }) => (
                                  <div className="relative">
                                    <Input
                                      type="number"
                                      step="0.0001"
                                      placeholder="Qtd"
                                      {...qtyField}
                                      className="h-9.5 rounded-xl bg-white pr-10 text-center font-mono text-xs font-bold dark:bg-slate-950"
                                    />
                                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-muted-foreground">
                                      {currentSupply?.unit || 'UN'}
                                    </span>
                                  </div>
                                )}
                              />
                            </div>

                            {/* Custo Proporcional */}
                            <div className="col-span-4 text-right sm:col-span-2">
                              <span className="font-mono text-xs font-black text-slate-800 dark:text-slate-200">
                                R$ {propCost.toFixed(2)}
                              </span>
                            </div>

                            {/* Botão Remover */}
                            <div className="col-span-2 flex justify-end sm:col-span-1 sm:justify-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => remove(index)}
                                className="h-8 w-8 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                                title="Remover insumo"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Resumo Rodapé da Ficha Técnica */}
                    <div className="mt-3 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900/40 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-center gap-6">
                        <div>
                          <span className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                            Custo Total (CMV):
                          </span>
                          <span className="font-mono text-base font-black text-slate-900 dark:text-slate-100">
                            R$ {calculatedCMV.toFixed(2)}
                          </span>
                        </div>

                        <div>
                          <span className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                            Margem Estimada:
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-black text-emerald-600 dark:text-emerald-400">
                              {margin >= 0 ? `+${margin.toFixed(1)}%` : `${margin.toFixed(1)}%`}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              (Venda R$ {watchedPrice.toFixed(2)})
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 rounded-lg border border-blue-500/20 bg-blue-500/10 px-2.5 py-1.5 text-xs font-bold text-blue-700 dark:border-blue-500/30 dark:text-blue-300">
                        <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-500 text-[9px] text-white">
                          ✓
                        </span>
                        <span>Baixa automática de estoque acionada a cada venda</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* ── FOOTER FIXO (CANCELAR & SALVAR PRODUTO) ────────────────────────── */}
          <ResponsiveDialogFooter className="border-t border-slate-200 bg-slate-50/80 px-6 py-3.5 dark:border-slate-800 dark:bg-slate-900/80 sm:px-8">
            <ResponsiveDialogClose asChild>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl px-5 font-semibold"
              >
                Cancelar
              </Button>
            </ResponsiveDialogClose>
            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="h-10 rounded-xl bg-primary px-8 font-bold text-white shadow-md hover:bg-primary/90"
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
        <ResponsiveDialogContent className="max-w-md rounded-2xl">
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
              className="h-11 rounded-xl"
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
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleCreateCategory}
              className="rounded-xl bg-primary"
            >
              Criar Categoria
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </TooltipProvider>
  )
}
