import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

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
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

const itemSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    description: z.string().optional(),
    cost: z.coerce.number().min(0).optional().default(0),
    price: z.coerce.number().min(0, 'Preço deve ser maior ou igual a 0'),
    stock: z.coerce.number().optional().default(0),
    min_stock: z.coerce.number().optional().default(0),
    barcode: z.string().optional(),
    category: z.string().optional(),
    isItem: z.boolean().default(true),
    display_id: z.preprocess((val) => val === '' ? undefined : Number(val), z.number().optional())
}).superRefine((data, ctx) => {
    if (data.isItem) {
        if (data.min_stock === undefined || data.min_stock === null || isNaN(data.min_stock)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Estoque mínimo é obrigatório para produtos",
                path: ["min_stock"]
            });
        }
    }
})

type ItemSchema = z.infer<typeof itemSchema>

interface ProductItemDialogProps {
    initialData?: {
        id: string
        name: string
        description?: string | null
        cost: number
        price: number
        stock?: number | null
        min_stock?: number | null
        barcode?: string | null
        category?: string | null
        isItem: boolean
        display_id?: number
    }
    onSuccess?: () => void
}

export function ProductItemDialog({ initialData, onSuccess }: ProductItemDialogProps) {
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

    const form = useForm<ItemSchema>({
        resolver: zodResolver(itemSchema),
        defaultValues: {
            name: initialData?.name ?? '',
            description: initialData?.description ?? '',
            cost: initialData?.cost ?? 0,
            price: initialData?.price ?? 0,
            stock: initialData?.stock ?? 0,
            min_stock: initialData?.min_stock ?? 0,
            barcode: initialData?.barcode ?? '',
            category: initialData?.category ?? '',
            isItem: initialData?.isItem ?? true,
            display_id: initialData?.display_id,
        },
    })

    const isProduct = form.watch('isItem')

    async function handleSubmitForm(data: ItemSchema) {
        try {
            if (isProduct && data.cost && data.price < data.cost) {
                toast.error('O preço de venda não pode ser menor que o custo.')
                return
            }

            const payload = {
                name: data.name,
                description: data.description || null,
                cost: isProduct ? (data.cost || 0) : 0,
                price: data.price,
                stock: isProduct ? data.stock : 0,
                min_stock: isProduct ? data.min_stock : 0,
                barcode: isProduct ? data.barcode : null,
                category: !isProduct ? data.category : null,
                isItem: data.isItem,
                display_id: data.display_id ? Number(data.display_id) : null
            }

            if (isEdit) {
                const response = await updateItemFn({ id: initialData!.id, ...payload })
                if (response.status === 200 || response.status === 201) {
                    toast.success('Mercadoria atualizada!')
                }
            } else {
                const response = await createItemFn(payload)
                if (response.status === 200 || response.status === 201) {
                    toast.success('Mercadoria cadastrada!')
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
        <DialogContent className="max-h-[85vh] flex flex-col p-0 gap-0 sm:max-w-[700px] overflow-hidden">
            <DialogHeader className="px-6 py-4 border-b shrink-0">
                <DialogTitle>{isEdit ? 'Editar Mercadoria' : 'Nova Mercadoria'}</DialogTitle>
                <DialogDescription>
                    {isEdit ? 'Atualize as informações do item selecionado.' : 'Cadastre um novo produto ou serviço no sistema.'}
                </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-4">
                <Form {...form}>
                    <form id="item-form" onSubmit={form.handleSubmit(handleSubmitForm)} className="space-y-6">
                        <div className="space-y-4">
                            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider border-l-4 border-minsk-500 pl-2">Informações Básicas</h4>
                            <div className="grid grid-cols-12 gap-6">
                                {/* Type Toggle */}
                                <div className="col-span-12 md:col-span-4 flex flex-col justify-end pb-2">
                                    <FormLabel className="mb-3 block">Tipo de Item</FormLabel>
                                    <div className="flex items-center space-x-2">
                                        <Label htmlFor="type-toggle" className={!isProduct ? "font-bold text-minsk-600 cursor-pointer" : "text-muted-foreground cursor-pointer"}>Serviço</Label>
                                        <FormField
                                            control={form.control}
                                            name="isItem"
                                            render={({ field }) => (
                                                <FormControl>
                                                    <Switch
                                                        id="type-toggle"
                                                        disabled={isEdit}
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                        className="data-[state=checked]:bg-minsk-500"
                                                    />
                                                </FormControl>
                                            )}
                                        />
                                        <Label htmlFor="type-toggle" className={isProduct ? "font-bold text-minsk-600 cursor-pointer" : "text-muted-foreground cursor-pointer"}>Produto</Label>
                                    </div>
                                </div>

                                {/* Display ID */}
                                <FormField
                                    control={form.control}
                                    name="display_id"
                                    render={({ field }) => (
                                        <FormItem className="col-span-12 md:col-span-4">
                                            <FormLabel>ID Numérico</FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="Auto" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Name */}
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem className="col-span-12">
                                            <FormLabel>Nome</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Nome do item" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Category (Service only) */}
                                {!isProduct && (
                                    <FormField
                                        control={form.control}
                                        name="category"
                                        render={({ field }) => (
                                            <FormItem className="col-span-12">
                                                <FormLabel>Categoria</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Ex: Manutenção, Consultoria" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Section: Pricing */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider border-l-4 border-minsk-500 pl-2">Financeiro</h4>
                            <div className="grid grid-cols-12 gap-6">
                                {isProduct && (
                                    <FormField
                                        control={form.control}
                                        name="cost"
                                        render={({ field }) => (
                                            <FormItem className="col-span-6">
                                                <FormLabel>Preço de Custo (R$)</FormLabel>
                                                <FormControl>
                                                    <Input type="number" step="0.01" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}
                                <FormField
                                    control={form.control}
                                    name="price"
                                    render={({ field }) => (
                                        <FormItem className={isProduct ? "col-span-6" : "col-span-12"}>
                                            <FormLabel>Preço de Venda (R$)</FormLabel>
                                            <FormControl>
                                                <Input type="number" step="0.01" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        {/* Section: Stock (Products Only) */}
                        {isProduct && (
                            <div className="space-y-4">
                                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider border-l-4 border-minsk-500 pl-2">Estoque</h4>
                                <div className="grid grid-cols-12 gap-6">
                                    {!isEdit && (
                                        <FormField
                                            control={form.control}
                                            name="stock"
                                            render={({ field }) => (
                                                <FormItem className="col-span-6">
                                                    <FormLabel>Estoque Inicial</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    )}
                                    <FormField
                                        control={form.control}
                                        name="min_stock"
                                        render={({ field }) => (
                                            <FormItem className={!isEdit ? "col-span-6" : "col-span-12"} >
                                                <FormLabel>Estoque Mínimo</FormLabel>
                                                <FormControl>
                                                    <Input type="number" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    {isProduct && (
                                        <FormField
                                            control={form.control}
                                            name="barcode"
                                            render={({ field }) => (
                                                <FormItem className="col-span-12">
                                                    <FormLabel>Código de Barras / SKU</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Ex: 789..." {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Section: Description */}
                        <div className="space-y-4 pb-4">
                            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider border-l-4 border-minsk-500 pl-2">Detalhes</h4>
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Descrição</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Breve descrição sobre o item..." className="resize-none min-h-[80px]" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </form>
                </Form>
            </div>

            <DialogFooter className="px-6 py-4 border-t bg-gray-50/50 shrink-0">
                <DialogClose asChild>
                    <Button type="button" variant="outline">Cancelar</Button>
                </DialogClose>
                <Button form="item-form" type="submit" disabled={form.formState.isSubmitting} className="bg-minsk-500 hover:bg-minsk-600">
                    {form.formState.isSubmitting ? 'Salvando...' : (isEdit ? 'Salvar Alterações' : 'Salvar Mercadoria')}
                </Button>
            </DialogFooter>
        </DialogContent>
    )
}
