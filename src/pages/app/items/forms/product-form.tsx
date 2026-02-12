import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Plus, Trash, Hammer, ScanBarcode } from 'lucide-react'
import { createProduct } from '@/api/create-product'
import { updateItem } from '@/api/update-item'
import { getSupplies } from '@/api/get-supplies'
import { createCategory } from '@/api/create-category'
import { getCategories } from '@/api/get-categories'
import { getNextProductId } from '@/api/get-next-product-id'
import { checkProductCode } from '@/api/check-product-code'
import { Button } from '@/components/ui/button'
import {
    ResponsiveDialog,
    ResponsiveDialogContent,
    ResponsiveDialogHeader,
    ResponsiveDialogTitle,
    ResponsiveDialogFooter,
    ResponsiveDialogClose,
    ResponsiveDialogDescription
} from '@/components/ui/responsive-dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

const productSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    description: z.string().optional(),
    category: z.string().optional(),

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

    display_id: z.preprocess((val) => {
        if (!val || val === '' || val === 'Auto') return undefined
        const parsed = Number(val)
        return isNaN(parsed) ? undefined : parsed
    }, z.number().optional()),

    // Composition
    is_composite: z.boolean().default(false),
    compositions: z.array(z.object({
        supply_id: z.string().min(1, "Selecione um insumo"),
        quantity: z.coerce.number().min(0.0001, "Qtd deve ser maior que 0")
    })).optional()
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

    const { data: categoriesData } = useQuery({
        queryKey: ['categories'],
        queryFn: getCategories
    })

    const { mutateAsync: createCategoryFn } = useMutation({
        mutationFn: createCategory,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['categories'] })
            setIsNewCategoryOpen(false)
            setNewCategoryName('')
            toast.success('Categoria criada!')
            if (data?.category?.id) {
                form.setValue('category', data.category.id)
            }
        },
        onError: () => {
            toast.error('Erro ao criar categoria.')
        }
    })

    async function handleCreateCategory() {
        if (!newCategoryName.trim()) return
        await createCategoryFn({ name: newCategoryName })
    }

    const form = useForm<ProductSchema>({
        resolver: zodResolver(productSchema),
        defaultValues: {
            name: initialData?.name ?? '',
            description: initialData?.description ?? '',
            category: initialData?.category ?? '',

            cost: initialData?.product?.cost ?? 0,
            price: initialData?.product?.price ?? 0,
            stock: initialData?.product?.stock ?? 0,
            min_stock: initialData?.product?.min_stock ?? 0,

            barcode: initialData?.product?.barcode ?? '',
            ncm: initialData?.product?.ncm ?? '',

            display_id: initialData?.product?.display_id ?? undefined,
            active: initialData?.active ?? true,

            is_composite: Boolean(initialData?.product?.is_composite),
            compositions: initialData?.product?.compositions?.map((c: any) => ({
                supply_id: c.supply.id,
                quantity: c.quantity
            })) ?? []
        },
    })

    const isComposite = form.watch('is_composite')

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "compositions",
    });

    const { data: suppliesData } = useQuery({
        queryKey: ['supplies-list'],
        queryFn: ({ signal }) => getSupplies({ signal, perPage: 100 }),
        enabled: isComposite // Only fetch if composite tab is needed/active
    })

    const { mutateAsync: createProductFn } = useMutation({
        mutationFn: createProduct,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['items'] })
            onSuccess?.()
        },
    })

    const { mutateAsync: updateItemFn } = useMutation({
        mutationFn: updateItem,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['items'] })
            onSuccess?.()
        },
    })

    // Reset form when initialData changes to ensure fresh state for edit/new toggles
    useEffect(() => {
        if (initialData) {
            form.reset({
                name: initialData.name,
                description: initialData.description ?? '',
                category: initialData.category?.id ?? '',
                cost: initialData.product?.cost ?? 0,
                price: initialData.product?.price ?? 0,
                stock: initialData.product?.stock ?? 0,
                min_stock: initialData.product?.min_stock ?? 0,
                barcode: initialData.product?.barcode ?? '',
                ncm: initialData.product?.ncm ?? '',
                display_id: initialData.product?.display_id,
                active: initialData.active ?? true,
                is_composite: Boolean(initialData.product?.is_composite),
                compositions: initialData.product?.compositions?.map((c: any) => ({
                    supply_id: c.supply.id,
                    quantity: c.quantity
                })) ?? []
            })

            // Calc initial profit/margin
            const cost = initialData.product?.cost ?? 0
            const price = initialData.product?.price ?? 0
            const profit = price - cost
            setProfit(profit)
            setMargin(cost > 0 ? (profit / cost) * 100 : 0)

        } else {
            form.reset({
                name: '',
                description: '',
                category: '',
                cost: 0,
                price: 0,
                stock: 0,
                min_stock: 0,
                barcode: '',
                ncm: '',
                display_id: undefined,
                active: true,
                is_composite: false,
                compositions: []
            })
            setProfit(0)
            setMargin(0)
        }
    }, [initialData, form])

    // Fetch next ID only in Create mode
    const { data: nextIdData } = useQuery({
        queryKey: ['next-product-id'],
        queryFn: getNextProductId,
        enabled: !isEdit
    })

    // Set next ID if available and field is empty
    useEffect(() => {
        if (!isEdit && nextIdData?.nextId && !form.getValues('display_id')) {
            form.setValue('display_id', nextIdData.nextId)
        }
    }, [nextIdData, isEdit, form])

    async function onSubmit(data: ProductSchema) {
        if (data.is_composite && (!data.compositions || data.compositions.length === 0)) {
            toast.error('Produtos compostos devem ter pelo menos um insumo.')
            return
        }

        const finalCost = data.is_composite ? calculatedCost : data.cost

        try {
            if (isEdit) {
                await updateItemFn({
                    id: initialData.id,
                    type: 'PRODUCT',
                    ...data,
                    cost: finalCost
                } as any)
                toast.success('Produto atualizado!')
            } else {
                await createProductFn({
                    name: data.name,
                    description: data.description,
                    price: data.price || 0,
                    stock: data.stock,
                    min_stock: data.min_stock,
                    barcode: data.barcode,
                    ncm: data.ncm,
                    category: data.category,
                    active: data.active,
                    display_id: data.display_id,
                    is_composite: data.is_composite,
                    compositions: data.is_composite && data.compositions ? data.compositions : undefined,
                    cost: finalCost
                })
                toast.success('Produto cadastrado!')
            }
        } catch (err) {
            toast.error('Erro ao salvar produto.')
        }
    }

    // Calculate dynamic cost
    const calculatedCost = (form.watch('compositions') || []).reduce((acc, curr) => {
        const supply = suppliesData?.data.supplies.find(s => s.id === curr.supply_id)
        return acc + ((supply?.cost ?? 0) * (curr.quantity ?? 0))
    }, 0)

    return (
        <>
            <Form {...form}>
                <form id="product-form" onSubmit={form.handleSubmit(onSubmit)} className="px-6 py-6 flex-1 overflow-y-auto flex flex-col gap-8">

                    {/* --- HEADER: Basic Info --- */}
                    <div className="grid grid-cols-12 gap-6">

                        {/* Name Field - Hero */}
                        <div className="col-span-12 sm:col-span-8 space-y-2">
                            <FormField control={form.control} name="name" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Nome do Produto</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Ex: Torneira Esfera 1/2"
                                            {...field}
                                            className="h-12 text-lg font-medium"
                                            autoFocus
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>

                        {/* Active Switch - Only on Edit */}
                        {isEdit && (
                            <div className="col-span-12 sm:col-span-4 flex items-end pb-3">
                                <FormField control={form.control} name="active" render={({ field }) => (
                                    <FormItem className="flex items-center space-x-3 space-y-0 rounded-xl border p-3 w-full bg-muted/20">
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <FormLabel className="font-medium cursor-pointer">
                                            Produto Ativo
                                        </FormLabel>
                                    </FormItem>
                                )} />
                            </div>
                        )}
                    </div>


                    {/* --- DETAILS: Category, Barcode, ID --- */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-1">
                            <div className="flex gap-2 items-end">
                                <FormField control={form.control} name="category" render={({ field }) => (
                                    <FormItem className="flex-1">
                                        <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Categoria</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value}
                                            onOpenChange={(isOpen) => {
                                                if (isOpen) requestAnimationFrame(() => (document.activeElement as HTMLElement)?.blur())
                                            }}
                                        >
                                            <FormControl>
                                                <SelectTrigger className="h-10">
                                                    <SelectValue placeholder="Selecione..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {(categoriesData?.categories || []).map((cat: any) => (
                                                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
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

                        <FormField control={form.control} name="barcode" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="flex items-center gap-1 text-xs font-bold text-muted-foreground uppercase tracking-wide">
                                    <ScanBarcode className="w-3 h-3" /> Código de Barras
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="EAN / GTIN"
                                        {...field}
                                        className="h-10 font-mono text-sm"
                                        onFocus={(e) => e.target.select()}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <FormField control={form.control} name="display_id" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wide">ID Interno</FormLabel>
                                <FormControl>
                                    <Input
                                        type="number"
                                        placeholder={isEdit ? "ID" : (nextIdData?.nextId?.toString() ?? "Automático")}
                                        {...field}
                                        value={field.value ?? ''}
                                        className="h-10 font-mono text-sm bg-muted/50"
                                        onBlur={async (e) => {
                                            field.onBlur()
                                            const val = parseInt(e.target.value)
                                            if (val && val !== initialData?.product?.display_id) {
                                                const check = await checkProductCode({ code: val })
                                                if (!check.available) {
                                                    form.setError('display_id', { message: 'ID já em uso' })
                                                } else {
                                                    form.clearErrors('display_id')
                                                }
                                            }
                                        }}
                                        onFocus={(e) => e.target.select()}
                                    />
                                </FormControl>
                            </FormItem>
                        )} />
                    </div>


                    {/* --- GROUP: PRICING (HERO SECTION) --- */}
                    <div className="bg-muted/10 rounded-2xl border p-4 sm:p-6 space-y-6">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-1 h-6 bg-primary rounded-full"></div>
                            <h4 className="text-lg font-bold tracking-tight">Formação de Preço</h4>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">

                            {/* Cost - Hero Input */}
                            <FormField control={form.control} name="cost" render={({ field }) => (
                                <FormItem className="col-span-2 sm:col-span-1">
                                    <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Custo Unitário</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">R$</span>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                inputMode="decimal"
                                                {...field}
                                                value={isComposite ? calculatedCost.toFixed(2) : field.value}
                                                disabled={isComposite}
                                                className={cn("h-12 pl-10 text-lg font-bold tabular-nums", isComposite && "bg-muted text-muted-foreground")}
                                                onChange={(e) => {
                                                    field.onChange(e)
                                                    const newCost = parseFloat(e.target.value) || 0
                                                    const currentPrice = form.getValues('price') || 0
                                                    const profit = currentPrice - newCost
                                                    const margin = newCost > 0 ? (profit / newCost) * 100 : 0
                                                    setProfit(profit)
                                                    setMargin(margin)
                                                }}
                                                onFocus={(e) => e.target.select()}
                                            />
                                        </div>
                                    </FormControl>
                                    {isComposite && <FormMessage className="text-[10px]">Calculado via composição</FormMessage>}
                                </FormItem>
                            )} />

                            {/* Profit & Margin Indicators */}
                            <div className="col-span-2 sm:col-span-2 flex gap-4">
                                <div className="space-y-2 flex-1">
                                    <FormLabel className="text-xs font-bold text-emerald-600/70 uppercase tracking-wide">Lucro Estimado</FormLabel>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 font-semibold">R$</span>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={profit.toFixed(2)}
                                            className="h-12 pl-10 text-lg font-semibold text-emerald-700 bg-emerald-50/50 border-emerald-100"
                                            onChange={(e) => {
                                                const newProfit = parseFloat(e.target.value) || 0
                                                setProfit(newProfit)
                                                const currentCost = isComposite ? calculatedCost : (form.getValues('cost') || 0)
                                                const newPrice = currentCost + newProfit
                                                form.setValue('price', parseFloat(newPrice.toFixed(2)))
                                                const newMargin = currentCost > 0 ? (newProfit / currentCost) * 100 : 0
                                                setMargin(newMargin)
                                            }}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2 flex-1">
                                    <FormLabel className="text-xs font-bold text-blue-600/70 uppercase tracking-wide">Margem %</FormLabel>
                                    <div className="relative">
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={margin.toFixed(2)}
                                            className="h-12 pr-8 text-lg font-semibold text-blue-700 bg-blue-50/50 border-blue-100 text-right"
                                            onChange={(e) => {
                                                const newMargin = parseFloat(e.target.value) || 0
                                                setMargin(newMargin)
                                                const currentCost = isComposite ? calculatedCost : (form.getValues('cost') || 0)
                                                const newProfit = currentCost * (newMargin / 100)
                                                setProfit(newProfit)
                                                const newPrice = currentCost + newProfit
                                                form.setValue('price', parseFloat(newPrice.toFixed(2)))
                                            }}
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-600 font-bold">%</span>
                                    </div>
                                </div>
                            </div>

                            {/* Sale Price - MAIN HERO */}
                            <FormField control={form.control} name="price" render={({ field }) => (
                                <FormItem className="col-span-2 sm:col-span-1">
                                    <FormLabel className="text-xs font-bold text-primary uppercase tracking-wide">Preço de Venda</FormLabel>
                                    <FormControl>
                                        <div className="relative shadow-sm rounded-md">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary font-bold">R$</span>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                inputMode="decimal"
                                                {...field}
                                                className="h-12 pl-10 text-xl font-bold text-primary border-primary/30 bg-primary/5 focus-visible:ring-primary focus-visible:border-primary shadow-sm tabular-nums"
                                                onChange={(e) => {
                                                    field.onChange(e)
                                                    const newPrice = parseFloat(e.target.value) || 0
                                                    const currentCost = isComposite ? calculatedCost : (form.getValues('cost') || 0)
                                                    const newProfit = newPrice - currentCost
                                                    setProfit(newProfit)
                                                    const newMargin = currentCost > 0 ? (newProfit / currentCost) * 100 : 0
                                                    setMargin(newMargin)
                                                }}
                                                onFocus={(e) => e.target.select()}
                                            />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                    </div>


                    {/* --- STOCK & LOGISTICS --- */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                        <FormField control={form.control} name="stock" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{!isEdit ? 'Estoque Inicial' : 'Estoque Atual'}</FormLabel>
                                <FormControl>
                                    <Input
                                        type="number"
                                        {...field}
                                        disabled={isComposite}
                                        className={cn("h-10 font-mono", isComposite && "bg-muted")}
                                        onFocus={(e) => e.target.select()}
                                    />
                                </FormControl>
                                {isComposite && <span className="text-[10px] text-muted-foreground">Gerenciado pelos insumos</span>}
                                <FormMessage />
                            </FormItem>
                        )} />

                        <FormField control={form.control} name="min_stock" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Estoque Mínimo</FormLabel>
                                <FormControl>
                                    <Input
                                        type="number"
                                        {...field}
                                        disabled={isComposite}
                                        className={cn("h-10 font-mono", isComposite && "bg-muted")}
                                        onFocus={(e) => e.target.select()}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <div className="col-span-2 sm:col-span-1">
                            <FormField control={form.control} name="ncm" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wide">NCM / Fiscal</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="0000.00.00"
                                            {...field}
                                            className="h-10 font-mono"
                                            onFocus={(e) => e.target.select()}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                    </div>

                    {/* --- DESCRIPTION --- */}
                    <FormField control={form.control} name="description" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Descrição / Observações</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Informações adicionais..." className="resize-none min-h-[80px]" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />


                    {/* --- COMPOSITION SWITCH --- */}
                    <div className="border-t pt-4">
                        <FormField control={form.control} name="is_composite" render={({ field }) => (
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-base">Produto Composto / Kit</FormLabel>
                                        <p className="text-sm text-muted-foreground">
                                            Este produto é formado por outros insumos (ex: Burger = Pão + Carne).
                                        </p>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={(val) => {
                                                field.onChange(val)
                                                if (val && fields.length === 0) append({ supply_id: '', quantity: 1 })
                                            }}
                                        />
                                    </FormControl>
                                </div>

                                {isComposite && (
                                    <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="font-semibold text-sm flex items-center gap-2"><Hammer className="w-4 h-4" /> Lista de Insumos</h4>
                                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded font-bold">
                                                Custo Total: {calculatedCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </span>
                                        </div>

                                        <div className="space-y-3">
                                            {(fields || []).map((field, index) => (
                                                <div key={field.id} className="grid grid-cols-12 gap-2 items-center bg-background p-2 rounded-lg border shadow-sm">
                                                    <div className="col-span-8 sm:col-span-7">
                                                        <FormField control={form.control} name={`compositions.${index}.supply_id`} render={({ field }) => (
                                                            <FormItem className="space-y-0">
                                                                <Select
                                                                    onValueChange={field.onChange}
                                                                    value={field.value}
                                                                    onOpenChange={(isOpen) => {
                                                                        if (isOpen) requestAnimationFrame(() => (document.activeElement as HTMLElement)?.blur())
                                                                    }}
                                                                >
                                                                    <FormControl>
                                                                        <SelectTrigger className="h-9 text-sm">
                                                                            <SelectValue placeholder="Selecione..." />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent>
                                                                        {(suppliesData?.data.supplies || []).map(s => (
                                                                            <SelectItem key={s.id} value={s.id}>
                                                                                <span className="flex justify-between w-full gap-4">
                                                                                    <span>{s.name}</span>
                                                                                    <span className="text-muted-foreground font-mono">R$ {s.cost.toFixed(2)}</span>
                                                                                </span>
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </FormItem>
                                                        )} />
                                                    </div>

                                                    <div className="col-span-3 sm:col-span-4 relative">
                                                        <FormField control={form.control} name={`compositions.${index}.quantity`} render={({ field }) => (
                                                            <FormItem className="space-y-0">
                                                                <FormControl>
                                                                    <Input type="number" step="0.0001" {...field} className="h-9 text-center pl-8" />
                                                                </FormControl>
                                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold">Qtd</span>
                                                            </FormItem>
                                                        )} />
                                                    </div>

                                                    <div className="col-span-1 items-center flex justify-end">
                                                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="h-8 w-8 text-destructive hover:bg-destructive/10">
                                                            <Trash className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <Button type="button" variant="outline" size="sm" onClick={() => append({ supply_id: '', quantity: 1 })} className="w-full mt-2 border-dashed">
                                            <Plus className="h-3 w-3 mr-2" /> Adicionar Insumo
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )} />
                    </div>

                </form>

                {/* --- STICKY FOOTER --- */}
                <ResponsiveDialogFooter className="border-t bg-background p-6 z-20">
                    <ResponsiveDialogClose asChild>
                        <Button type="button" variant="ghost" className="h-12 w-full sm:w-auto">Cancelar</Button>
                    </ResponsiveDialogClose>
                    <Button
                        form="product-form"
                        type="submit"
                        disabled={form.formState.isSubmitting}
                        className="bg-primary hover:bg-primary/90 h-12 w-full sm:w-auto px-8 font-bold text-md shadow-lg"
                    >
                        {form.formState.isSubmitting ? 'Salvando...' : 'Salvar Produto'}
                    </Button>
                </ResponsiveDialogFooter>
            </Form>

            <ResponsiveDialog open={isNewCategoryOpen} onOpenChange={setIsNewCategoryOpen}>
                <ResponsiveDialogContent className="sm:max-w-md">
                    <ResponsiveDialogHeader>
                        <ResponsiveDialogTitle>Nova Categoria</ResponsiveDialogTitle>
                        <ResponsiveDialogDescription>Adicione uma nova categoria para organizar seus produtos.</ResponsiveDialogDescription>
                    </ResponsiveDialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-muted-foreground uppercase">Nome da Categoria</label>
                            <Input
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                placeholder="Ex: Hidráulica"
                                className="h-11"
                            />
                        </div>
                    </div>
                    <ResponsiveDialogFooter>
                        <ResponsiveDialogClose asChild>
                            <Button variant="ghost" type="button">Cancelar</Button>
                        </ResponsiveDialogClose>
                        <Button onClick={handleCreateCategory} disabled={!newCategoryName.trim()}>Salvar Categoria</Button>
                    </ResponsiveDialogFooter>
                </ResponsiveDialogContent>
            </ResponsiveDialog>
        </>
    )
}
