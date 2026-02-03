import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Plus, Trash, Hammer } from 'lucide-react'
import { createProduct } from '@/api/create-product'
import { updateItem } from '@/api/update-item'
import { getSupplies } from '@/api/get-supplies'
import { createCategory } from '@/api/create-category'
import { getCategories } from '@/api/get-categories'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
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
    barcode: z.string().optional(),
    ncm: z.string().optional(),

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
                <form id="product-form" onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-y-auto px-6 py-6 flex flex-col h-full gap-6">

                    {/* --- HEADER: Basic Info --- */}
                    <div className="grid grid-cols-12 gap-4 items-start">
                        {/* ID Field */}
                        <div className="col-span-2 sm:col-span-2">
                            <FormField control={form.control} name="display_id" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs text-muted-foreground font-normal">ID</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            placeholder="Auto"
                                            {...field}
                                            value={field.value ?? ''}
                                            className="bg-muted text-center font-mono text-xs h-9"
                                            disabled
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>

                        {/* Name Field */}
                        <div className="col-span-10 sm:col-span-7">
                            <FormField control={form.control} name="name" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs text-muted-foreground font-normal">Nome do Produto <span className="text-destructive">*</span></FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Ex: Torneira Esfera 1/2"
                                            {...field}
                                            className="h-9 focus-visible:ring-primary font-medium"
                                            autoFocus
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>

                        {/* Composite Switch - Compact */}
                        <div className="col-span-12 sm:col-span-3 flex items-center justify-end sm:justify-start h-full pt-6">
                            <FormField control={form.control} name="is_composite" render={({ field }) => (
                                <FormItem className="flex items-center space-x-2 space-y-0 rounded-md border px-3 py-2 bg-gray-50">
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={(val) => {
                                                field.onChange(val)
                                                if (val && fields.length === 0) append({ supply_id: '', quantity: 1 })
                                            }}
                                        />
                                    </FormControl>
                                    <FormLabel className="text-xs font-medium cursor-pointer">
                                        Composição
                                    </FormLabel>
                                </FormItem>
                            )} />
                        </div>
                    </div>


                    {/* --- ROW 2: Category & Barcode --- */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex gap-2 items-end">
                            <FormField control={form.control} name="category" render={({ field }) => (
                                <FormItem className="flex-1">
                                    <FormLabel className="text-xs text-muted-foreground font-normal">Categoria</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="h-9">
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
                                className="h-9 w-9 shrink-0"
                                onClick={() => setIsNewCategoryOpen(true)}
                                title="Nova Categoria"
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>

                        <FormField control={form.control} name="barcode" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs text-muted-foreground font-normal">Código de Barras (EAN)</FormLabel>
                                <FormControl>
                                    <Input placeholder="789..." {...field} className="h-9" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>


                    {/* --- GROUP: PRICING --- */}
                    <div className="rounded-lg border bg-gray-50/50 p-4 space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="p-1.5 bg-green-100 rounded text-green-700">
                                <span className="font-bold text-xs">R$</span>
                            </div>
                            <h4 className="text-sm font-semibold text-gray-700">Precificação</h4>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {/* Cost */}
                            <FormField control={form.control} name="cost" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs text-muted-foreground font-normal">Custo {isComposite && '(Auto)'}</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                step="0.01"
                                                {...field}
                                                value={isComposite ? calculatedCost.toFixed(2) : field.value}
                                                disabled={isComposite}
                                                className={cn("h-9", isComposite && "bg-muted font-mono text-muted-foreground")}
                                                onChange={(e) => {
                                                    field.onChange(e)
                                                    const newCost = parseFloat(e.target.value) || 0
                                                    const currentPrice = form.getValues('price') || 0
                                                    const profit = currentPrice - newCost
                                                    const margin = newCost > 0 ? (profit / newCost) * 100 : 0
                                                    setProfit(profit)
                                                    setMargin(margin)
                                                }}
                                            />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            {/* Profit */}
                            <div className="space-y-2">
                                <FormLabel className="text-xs text-muted-foreground font-normal">Lucro (R$)</FormLabel>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={profit.toFixed(2)}
                                    className="h-9"
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

                            {/* Margin */}
                            <div className="space-y-2">
                                <FormLabel className="text-xs text-muted-foreground font-normal">Margem (%)</FormLabel>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={margin.toFixed(2)}
                                        className="h-9 pr-7"
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
                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">%</span>
                                </div>
                            </div>

                            {/* Sale Price - Highlighted */}
                            <FormField control={form.control} name="price" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-bold text-primary">Venda (R$)</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            {...field}
                                            className="h-9 border-primary/50 focus-visible:ring-primary font-bold text-gray-900 bg-white shadow-sm"
                                            onChange={(e) => {
                                                field.onChange(e)
                                                const newPrice = parseFloat(e.target.value) || 0
                                                const currentCost = isComposite ? calculatedCost : (form.getValues('cost') || 0)
                                                const newProfit = newPrice - currentCost
                                                setProfit(newProfit)
                                                const newMargin = currentCost > 0 ? (newProfit / currentCost) * 100 : 0
                                                setMargin(newMargin)
                                            }}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                    </div>


                    {/* --- GROUP: STOCK & LOGISTICS --- */}
                    <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-12 sm:col-span-8 grid grid-cols-2 gap-4 p-3 border rounded-lg">
                            <FormField control={form.control} name="stock" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs text-muted-foreground font-normal">{!isEdit ? 'Estoque Inicial' : 'Estoque Atual'}</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field} disabled={isComposite} className={cn("h-9", isComposite && "bg-muted")} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="min_stock" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs text-muted-foreground font-normal">Estoque Mínimo</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field} disabled={isComposite} className={cn("h-9", isComposite && "bg-muted")} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>

                        <div className="col-span-12 sm:col-span-4 p-3 border rounded-lg">
                            <FormField control={form.control} name="ncm" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs text-muted-foreground font-normal">NCM / Fiscal</FormLabel>
                                    <FormControl>
                                        <Input placeholder="0000.00.00" {...field} className="h-9" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                    </div>


                    {/* --- DESCRIPTION --- */}
                    <FormField control={form.control} name="description" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs text-muted-foreground font-normal">Descrição Detalhada</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Informações adicionais..." className="resize-none min-h-[60px]" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />


                    {/* --- COMPOSITION SECTION (Conditional) --- */}
                    {isComposite && (
                        <div className="mt-2 space-y-3 pt-4 border-t border-dashed">
                            <div className="flex items-center gap-2 mb-2 text-primary">
                                <Hammer className="h-4 w-4" />
                                <h3 className="font-semibold text-sm">Composição (Insumos)</h3>
                            </div>

                            <div className="bg-muted/30 rounded-md border p-3 space-y-3">
                                <div className="space-y-2">
                                    {(fields || []).map((field, index) => (
                                        <div key={field.id} className="flex gap-2 items-center bg-white p-2 rounded border shadow-sm">
                                            <div className="flex-1">
                                                <FormField control={form.control} name={`compositions.${index}.supply_id`} render={({ field }) => (
                                                    <FormItem className="space-y-0">
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger className="h-8 text-xs">
                                                                    <SelectValue placeholder="Selecione o insumo..." />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {(suppliesData?.data.supplies || []).map(s => (
                                                                    <SelectItem key={s.id} value={s.id} className="text-xs">
                                                                        {s.name} (R$ {s.cost.toFixed(2)})
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )} />
                                            </div>
                                            <div className="w-20">
                                                <FormField control={form.control} name={`compositions.${index}.quantity`} render={({ field }) => (
                                                    <FormItem className="space-y-0">
                                                        <FormControl>
                                                            <Input type="number" step="0.001" {...field} className="h-8 text-xs text-center" placeholder="Qtd" />
                                                        </FormControl>
                                                    </FormItem>
                                                )} />
                                            </div>
                                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="h-8 w-8 text-destructive hover:bg-red-50">
                                                <Trash className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex justify-between items-center pt-2">
                                    <Button type="button" variant="outline" size="sm" onClick={() => append({ supply_id: '', quantity: 1 })} className="h-7 text-xs">
                                        <Plus className="h-3 w-3 mr-1" /> Adicionar Insumo
                                    </Button>
                                    <div className="text-right">
                                        <span className="text-xs text-muted-foreground mr-2">Custo Composição:</span>
                                        <span className="font-bold text-primary text-sm">
                                            {calculatedCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Spacer for sticky footer visual clearance */}
                    <div className="h-4"></div>

                </form>

                {/* --- STICKY FOOTER --- */}
                <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-3 z-10">
                    <DialogClose asChild>
                        <Button type="button" variant="ghost">Cancelar</Button>
                    </DialogClose>
                    <Button form="product-form" type="submit" disabled={form.formState.isSubmitting} className="bg-primary hover:bg-primary/90 px-8">
                        {form.formState.isSubmitting ? 'Salvando...' : 'Salvar Dados'}
                    </Button>
                </div>
            </Form>

            <Dialog open={isNewCategoryOpen} onOpenChange={setIsNewCategoryOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nova Categoria</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Nome</label>
                            <Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Ex: Hidráulica" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsNewCategoryOpen(false)}>Cancelar</Button>
                        <Button onClick={handleCreateCategory} disabled={!newCategoryName.trim()}>Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
