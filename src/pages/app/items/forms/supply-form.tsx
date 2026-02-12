import { useEffect, useRef } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Package } from 'lucide-react'
import { createSupply } from '@/api/create-supply'
import { updateItem } from '@/api/update-item'
import { Button } from '@/components/ui/button'
import { ResponsiveDialogFooter, ResponsiveDialogClose } from '@/components/ui/responsive-dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'

const supplySchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    description: z.string().optional(),
    category: z.string().optional(),
    unit: z.string().optional(),
    cost: z.coerce.number().min(0).optional().default(0),
    stock: z.coerce.number().optional().default(0),
    active: z.boolean().default(true),
})

type SupplySchema = z.infer<typeof supplySchema>

interface SupplyFormProps {
    initialData?: any
    onSuccess?: () => void
}

export function SupplyForm({ initialData, onSuccess }: SupplyFormProps) {
    const queryClient = useQueryClient()
    const isEdit = !!initialData

    const form = useForm<SupplySchema>({
        resolver: zodResolver(supplySchema),
        defaultValues: {
            name: initialData?.name ?? '',
            description: initialData?.description ?? '',
            category: initialData?.category ?? '',
            unit: initialData?.supply?.unit ?? '',
            cost: initialData?.supply?.cost ?? 0,
            stock: initialData?.supply?.stock ?? 0,
            active: initialData?.active ?? true,
        },
    })

    const isMounted = useRef(true)

    useEffect(() => {
        isMounted.current = true
        return () => {
            isMounted.current = false
        }
    }, [])

    const { mutateAsync: createSupplyFn } = useMutation({
        mutationFn: createSupply,
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

    async function onSubmit(data: SupplySchema) {
        if (!isMounted.current) return

        try {
            if (isEdit) {
                // If cost changed, backend will trigger cascade update. Warn user.
                const costChanged = initialData?.supply?.cost !== data.cost
                if (costChanged) {
                    toast.loading('Salvando e atualizando produtos dependentes...', { id: 'save-supply' })
                }

                await updateItemFn({
                    id: initialData.id,
                    type: 'SUPPLY',
                    ...data
                } as any)

                if (!isMounted.current) return

                if (costChanged) toast.dismiss('save-supply')
                toast.success('Insumo atualizado!')
            } else {
                await createSupplyFn({
                    name: data.name,
                    description: data.description,
                    category: data.category,
                    unit: data.unit,
                    cost: data.cost || 0,
                    stock: data.stock,
                    active: data.active
                })

                if (!isMounted.current) return

                toast.success('Insumo cadastrado!')
            }
        } catch (err) {
            if (!isMounted.current) return
            toast.dismiss('save-supply')
            toast.error('Erro ao salvar insumo. Verifique a conexão.')
            console.error(err)
        }
    }

    return (
        <Form {...form}>
            <form id="supply-form" onSubmit={form.handleSubmit(onSubmit)} className="px-6 py-6 flex-1 overflow-y-auto flex flex-col gap-8">

                {/* --- HEADER: Name & Active --- */}
                <div className="grid grid-cols-12 gap-6">
                    <div className="col-span-12 sm:col-span-8 space-y-2">
                        <FormField control={form.control} name="name" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Nome do Insumo</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="Ex: Cimento CP-II"
                                        {...field}
                                        className="h-12 text-lg font-medium"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>

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
                                    Insumo Ativo
                                </FormLabel>
                            </FormItem>
                        )} />
                    </div>
                </div>

                {/* --- DETAILS: Category, Unit, Stock --- */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <FormField control={form.control} name="category" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Categoria</FormLabel>
                            <FormControl>
                                <Input placeholder="Ex: Construção" {...field} className="h-10" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="unit" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="flex items-center gap-1 text-xs font-bold text-muted-foreground uppercase tracking-wide">
                                <Package className="w-3 h-3" /> Unidade
                            </FormLabel>
                            <FormControl>
                                <Input placeholder="Ex: kg, m, un" {...field} className="h-10" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="stock" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{!isEdit ? 'Estoque Inicial' : 'Estoque Atual'}</FormLabel>
                            <FormControl>
                                <Input type="number" {...field} disabled={isEdit} className={isEdit ? "bg-muted" : ""} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>


                {/* --- COST HERO --- */}
                <div className="bg-muted/10 rounded-2xl border p-4 sm:p-6 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-1 h-6 bg-red-500 rounded-full"></div>
                        <h4 className="text-lg font-bold tracking-tight">Custo do Insumo</h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <FormField control={form.control} name="cost" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-bold text-red-600/70 uppercase tracking-wide">Preço de Custo</FormLabel>
                                <FormControl>
                                    <div className="relative shadow-sm rounded-md">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-red-600 font-bold">R$</span>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            inputMode="decimal"
                                            {...field}
                                            className="h-14 pl-10 text-2xl font-bold text-red-600 border-red-200 bg-red-50/20 focus-visible:ring-red-500 focus-visible:border-red-500 shadow-sm tabular-nums"
                                        />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <div className="flex flex-col justify-center gap-1 text-sm text-muted-foreground bg-white rounded-lg p-3 border">
                            <span className="font-semibold text-xs uppercase">Nota Importante:</span>
                            <span>Alterar este custo impactará automaticamente o custo de produtos compostos.</span>
                        </div>
                    </div>
                </div>

                {/* --- DESCRIPTION --- */}
                <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Descrição / Observações</FormLabel>
                        <FormControl>
                            <Textarea placeholder="Detalhes do insumo..." className="resize-none min-h-[100px]" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )} />

            </form>
            <ResponsiveDialogFooter className="border-t bg-background p-6 z-20">
                <ResponsiveDialogClose asChild>
                    <Button type="button" variant="ghost" className="h-12 w-full sm:w-auto">Cancelar</Button>
                </ResponsiveDialogClose>
                <Button
                    form="supply-form"
                    type="submit"
                    disabled={form.formState.isSubmitting}
                    className="bg-primary hover:bg-primary/90 h-12 w-full sm:w-auto px-8 font-bold text-md shadow-lg"
                >
                    {form.formState.isSubmitting ? 'Salvando...' : 'Salvar Insumo'}
                </Button>
            </ResponsiveDialogFooter>
        </Form>
    )
}
