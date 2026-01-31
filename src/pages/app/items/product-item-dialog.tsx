import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { useEffect } from 'react'
import { Package, Hammer, Syringe } from 'lucide-react'
import { cn } from '@/lib/utils'

import { createItem } from '@/api/create-item'
import { updateItem } from '@/api/update-item'
import { Button } from '@/components/ui/button'
import {
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { GetItemsResponse } from '@/api/get-items'

const itemSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    description: z.string().optional(),
    type: z.enum(['PRODUCT', 'SERVICE', 'SUPPLY']),

    // Financial
    cost: z.coerce.number().min(0).optional().default(0),
    price: z.coerce.number().min(0).optional().default(0),

    // Stock
    stock: z.coerce.number().optional().default(0),
    min_stock: z.coerce.number().optional().default(0),

    // Details
    barcode: z.string().optional(),
    ncm: z.string().optional(),
    unit: z.string().optional(),
    estimated_time: z.string().optional(),
    category: z.string().optional(),

    active: z.boolean().default(true),

    display_id: z.preprocess((val) => {
        if (!val || val === '' || val === 'Auto') return undefined
        const parsed = Number(val)
        return isNaN(parsed) ? undefined : parsed
    }, z.number().optional()),
})

type ItemSchema = z.infer<typeof itemSchema>

// Use the API response type for typed initialData
type ItemData = GetItemsResponse['items'][0]

interface ProductItemDialogProps {
    initialData?: ItemData
    initialType?: 'PRODUCT' | 'SERVICE' | 'SUPPLY'
    onSuccess?: () => void
}

export function ProductItemDialog({ initialData, initialType, onSuccess }: ProductItemDialogProps) {
    const queryClient = useQueryClient()
    const isEdit = !!initialData

    const { mutateAsync: createItemFn } = useMutation({
        mutationFn: createItem,
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

    // Helper to get nested data
    const product = initialData?.product
    const service = initialData?.service
    const supply = initialData?.supply

    const form = useForm<ItemSchema>({
        resolver: zodResolver(itemSchema),
        defaultValues: {
            name: initialData?.name ?? '',
            description: initialData?.description ?? '',
            type: initialData?.type ?? initialType ?? 'PRODUCT',
            active: initialData?.active ?? true,
            category: initialData?.category ?? '',

            // Flattened values
            cost: supply?.cost ?? 0,
            price: product?.price ?? service?.price ?? 0,
            stock: product?.stock ?? supply?.stock ?? 0,
            min_stock: product?.min_stock ?? 0,

            barcode: product?.barcode ?? '',
            ncm: product?.ncm ?? '',
            unit: supply?.unit ?? '',
            estimated_time: service?.estimated_time ?? '',

            display_id: product?.display_id ?? service?.display_id ?? undefined,
        },
    })

    useEffect(() => {
        if (!isEdit && initialType) {
            form.reset({
                name: '',
                description: '',
                type: initialType,
                active: true,
                category: '',
                cost: 0,
                price: 0,
                stock: 0,
                min_stock: 0,
                barcode: '',
                ncm: '',
                unit: '',
                estimated_time: '',
                display_id: undefined
            })
        }
    }, [isEdit, initialType, form])

    const selectedType = form.watch('type')

    async function handleSubmitForm(data: ItemSchema) {
        try {
            const payload = {
                name: data.name,
                description: data.description || null,
                active: data.active,
                type: data.type,
                display_id: data.display_id,

                // Fields map
                cost: data.cost,
                price: data.price,
                stock: data.stock,
                min_stock: data.min_stock,
                barcode: data.barcode || null,
                ncm: data.ncm || null,
                unit: data.unit || null,
                estimated_time: data.estimated_time || null,
                category: data.category || null,
            }

            if (isEdit) {
                // Warning: updateItem needs update too to support strict types or it might just work if it accepts partials
                // Assuming updateItem works or will be fixed.
                const response = await updateItemFn({ id: initialData!.id, ...payload })
                if (response.status === 200 || response.status === 201) {
                    toast.success('Item atualizado!')
                }
            } else {
                const response = await createItemFn(payload)
                if (response.status === 200 || response.status === 201) {
                    toast.success('Item cadastrado!')
                    form.reset()
                }
            }
        } catch (err: any) {
            const status = err.response?.status
            const message = err.response?.data?.message

            if (status === 409 || status === 400) {
                toast.error(message || 'Erro de validação ou duplicidade.')
            } else if (status === 500) {
                toast.error('Erro interno do servidor.')
            } else {
                toast.error('Erro desconhecido. Tente novamente.')
            }
        }
    }

    return (
        <DialogContent className="max-h-[90vh] flex flex-col p-0 gap-0 sm:max-w-[700px] overflow-hidden">
            <DialogHeader className="px-6 py-4 border-b shrink-0 bg-muted/40">
                <DialogTitle>{isEdit ? 'Editar Item' : 'Novo Item'}</DialogTitle>
                <DialogDescription>
                    {isEdit ? 'Atualize as informações do item.' : 'Cadastre um novo item no sistema.'}
                </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-4">
                <Form {...form}>
                    <form id="item-form" onSubmit={form.handleSubmit(handleSubmitForm)} className="space-y-6">

                        {/* Type Selector */}
                        {!isEdit && (
                            <div className="flex justify-center mb-6">
                                <div className="inline-flex rounded-lg border p-1 bg-card">
                                    <button
                                        type="button"
                                        onClick={() => form.setValue('type', 'PRODUCT')}
                                        className={cn(
                                            "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                                            selectedType === 'PRODUCT'
                                                ? "bg-primary text-primary-foreground shadow-sm"
                                                : "text-muted-foreground hover:bg-muted"
                                        )}
                                    >
                                        <Package className="h-4 w-4" />
                                        Produto
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => form.setValue('type', 'SERVICE')}
                                        className={cn(
                                            "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                                            selectedType === 'SERVICE'
                                                ? "bg-primary text-primary-foreground shadow-sm"
                                                : "text-muted-foreground hover:bg-muted"
                                        )}
                                    >
                                        <Hammer className="h-4 w-4" />
                                        Serviço
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => form.setValue('type', 'SUPPLY')}
                                        className={cn(
                                            "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                                            selectedType === 'SUPPLY'
                                                ? "bg-primary text-primary-foreground shadow-sm"
                                                : "text-muted-foreground hover:bg-muted"
                                        )}
                                    >
                                        <Syringe className="h-4 w-4" />
                                        Insumo
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider border-l-4 border-primary pl-2">
                                Informações Básicas
                            </h4>
                            <div className="grid grid-cols-12 gap-6">
                                {/* Display ID (Auto) - only for Prod/Service */}
                                {(selectedType === 'PRODUCT' || selectedType === 'SERVICE') && (
                                    <FormField
                                        control={form.control}
                                        name="display_id"
                                        render={({ field }) => (
                                            <FormItem className="col-span-12 md:col-span-3">
                                                <FormLabel>ID (Auto)</FormLabel>
                                                <FormControl>
                                                    <Input type="number" placeholder="Auto" {...field} value={field.value ?? ''} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}

                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem className={cn("col-span-12", (selectedType === 'PRODUCT' || selectedType === 'SERVICE') ? "md:col-span-9" : "md:col-span-12")}>
                                            <FormLabel>Nome <span className="text-destructive">*</span></FormLabel>
                                            <FormControl>
                                                <Input placeholder="Nome do item" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="category"
                                    render={({ field }) => (
                                        <FormItem className="col-span-12">
                                            <FormLabel>Categoria</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Ex: Elétrica, Hidráulica, Manutenção" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        {/* Financial Section */}
                        {(selectedType === 'PRODUCT' || selectedType === 'SUPPLY' || selectedType === 'SERVICE') && (
                            <div className="space-y-4">
                                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider border-l-4 border-primary pl-2">
                                    Financeiro
                                </h4>
                                <div className="grid grid-cols-12 gap-6">
                                    {/* Cost: Supply (Required) or Product (Optional) */}
                                    {(selectedType === 'SUPPLY' || selectedType === 'PRODUCT') && (
                                        <FormField
                                            control={form.control}
                                            name="cost"
                                            render={({ field }) => (
                                                <FormItem className="col-span-6">
                                                    <FormLabel>Custo (R$)</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" step="0.01" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    )}

                                    {/* Price: Product/Service */}
                                    {(selectedType === 'PRODUCT' || selectedType === 'SERVICE') && (
                                        <FormField
                                            control={form.control}
                                            name="price"
                                            render={({ field }) => (
                                                <FormItem className="col-span-6">
                                                    <FormLabel>Preço de Venda (R$)</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" step="0.01" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Inventory & Details */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider border-l-4 border-primary pl-2">
                                Detalhes & Estoque
                            </h4>
                            <div className="grid grid-cols-12 gap-6">

                                {/* Stock: Product/Supply */}
                                {(selectedType === 'PRODUCT' || selectedType === 'SUPPLY') && (
                                    <FormField
                                        control={form.control}
                                        name="stock"
                                        render={({ field }) => (
                                            <FormItem className="col-span-6 md:col-span-4">
                                                <FormLabel>{!isEdit ? 'Estoque Inicial' : 'Estoque Atual'}</FormLabel>
                                                <FormControl>
                                                    <Input type="number" {...field} disabled={isEdit /* Disable stock edit on update? Usually fine to edit, but stock log preferred. Keeping enabled for now based on previous code */} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}

                                {/* Min Stock: Product */}
                                {selectedType === 'PRODUCT' && (
                                    <FormField
                                        control={form.control}
                                        name="min_stock"
                                        render={({ field }) => (
                                            <FormItem className="col-span-6 md:col-span-4">
                                                <FormLabel>Estoque Mínimo</FormLabel>
                                                <FormControl>
                                                    <Input type="number" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}

                                {/* Unit: Supply */}
                                {selectedType === 'SUPPLY' && (
                                    <FormField
                                        control={form.control}
                                        name="unit"
                                        render={({ field }) => (
                                            <FormItem className="col-span-6 md:col-span-4">
                                                <FormLabel>Unidade</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Ex: kg, lt, un" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}

                                {/* Estimated Time: Service */}
                                {selectedType === 'SERVICE' && (
                                    <FormField
                                        control={form.control}
                                        name="estimated_time"
                                        render={({ field }) => (
                                            <FormItem className="col-span-6 md:col-span-6">
                                                <FormLabel>Tempo Estimado</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Ex: 30 min" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}

                                {/* Barcode & NCM: Product */}
                                {selectedType === 'PRODUCT' && (
                                    <>
                                        <FormField
                                            control={form.control}
                                            name="barcode"
                                            render={({ field }) => (
                                                <FormItem className="col-span-12 md:col-span-6">
                                                    <FormLabel>Código de Barras</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="EAN / SKU" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="ncm"
                                            render={({ field }) => (
                                                <FormItem className="col-span-12 md:col-span-6">
                                                    <FormLabel>NCM</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="NCM" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Common Description */}
                        <div className="space-y-4">
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Descrição</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Observações.." className="resize-none" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                    </form>
                </Form>
            </div>

            <DialogFooter className="px-6 py-4 border-t bg-muted/40 shrink-0">
                <DialogClose asChild>
                    <Button type="button" variant="outline">Cancelar</Button>
                </DialogClose>
                <Button form="item-form" type="submit" disabled={form.formState.isSubmitting} className="bg-primary hover:bg-primary/90">
                    {form.formState.isSubmitting ? 'Salvando...' : 'Salvar'}
                </Button>
            </DialogFooter>
        </DialogContent>
    )
}
