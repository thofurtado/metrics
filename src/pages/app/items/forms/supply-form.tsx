import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Syringe } from 'lucide-react'
import { createSupply } from '@/api/create-supply'
import { updateItem } from '@/api/update-item'
import { Button } from '@/components/ui/button'
import { DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

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
                toast.success('Insumo cadastrado!')
            }
        } catch (err) {
            toast.dismiss('save-supply')
            toast.error('Erro ao salvar insumo. Verifique a conexão.')
            console.error(err)
        }
    }

    return (
        <Form {...form}>
            <form id="supply-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 flex-1 overflow-y-auto px-6 py-4">
                {/* ... form fields ... */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4 text-muted-foreground">
                        <Syringe className="h-5 w-5" />
                        <h3 className="font-semibold text-lg">Dados do Insumo</h3>
                    </div>

                    <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nome <span className="text-destructive">*</span></FormLabel>
                            <FormControl><Input placeholder="Nome do insumo" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="category" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Categoria</FormLabel>
                                <FormControl><Input placeholder="Ex: Limpeza" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <FormField control={form.control} name="unit" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Unidade</FormLabel>
                                <FormControl><Input placeholder="Ex: kg, un, l" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="cost" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Preço de Custo (R$)</FormLabel>
                                <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <FormField control={form.control} name="stock" render={({ field }) => (
                            <FormItem>
                                <FormLabel>{!isEdit ? 'Estoque Inicial' : 'Estoque Atual'}</FormLabel>
                                <FormControl><Input type="number" {...field} disabled={isEdit} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>

                    <FormField control={form.control} name="description" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Descrição</FormLabel>
                            <FormControl><Textarea placeholder="Observações..." className="resize-none" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>
            </form>
            <DialogFooter className="px-6 py-4 border-t bg-muted/40 shrink-0">
                <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
                <Button form="supply-form" type="submit" disabled={form.formState.isSubmitting} className="bg-primary hover:bg-primary/90">
                    {form.formState.isSubmitting ? 'Salvando...' : 'Salvar'}
                </Button>
            </DialogFooter>
        </Form>
    )
}
