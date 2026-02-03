import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Hammer } from 'lucide-react'
import { createService } from '@/api/create-service'
import { updateItem } from '@/api/update-item'
import { Button } from '@/components/ui/button'
import { DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const serviceSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    description: z.string().optional(),
    category: z.string().optional(),
    price: z.coerce.number().min(0).optional().default(0),
    estimated_time: z.string().optional(),
    display_id: z.preprocess((val) => {
        if (!val || val === '' || val === 'Auto') return undefined
        const parsed = Number(val)
        return isNaN(parsed) ? undefined : parsed
    }, z.number().optional()),
    active: z.boolean().default(true),
})

type ServiceSchema = z.infer<typeof serviceSchema>

interface ServiceFormProps {
    initialData?: any
    onSuccess?: () => void
}

export function ServiceForm({ initialData, onSuccess }: ServiceFormProps) {
    const queryClient = useQueryClient()
    const isEdit = !!initialData

    const form = useForm<ServiceSchema>({
        resolver: zodResolver(serviceSchema),
        defaultValues: {
            name: initialData?.name ?? '',
            description: initialData?.description ?? '',
            category: initialData?.category ?? '',
            price: initialData?.service?.price ?? 0,
            estimated_time: initialData?.service?.estimated_time ?? '',
            display_id: initialData?.service?.display_id ?? undefined,
            active: initialData?.active ?? true,
        },
    })

    const { mutateAsync: createServiceFn } = useMutation({
        mutationFn: createService,
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

    async function onSubmit(data: ServiceSchema) {
        try {
            if (isEdit) {
                await updateItemFn({
                    id: initialData.id,
                    type: 'SERVICE',
                    ...data
                } as any)
                toast.success('Serviço atualizado!')
            } else {
                await createServiceFn({
                    name: data.name,
                    description: data.description,
                    category: data.category,
                    price: data.price || 0,
                    estimated_time: data.estimated_time,
                    display_id: data.display_id,
                    active: data.active
                })
                toast.success('Serviço cadastrado!')
            }
        } catch (err) {
            toast.error('Erro ao salvar serviço.')
        }
    }

    return (
        <Form {...form}>
            <form id="service-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 flex-1 overflow-y-auto px-6 py-4">
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4 text-muted-foreground">
                        <Hammer className="h-5 w-5" />
                        <h3 className="font-semibold text-lg">Dados do Serviço</h3>
                    </div>

                    <div className="grid grid-cols-12 gap-4">
                        <FormField control={form.control} name="display_id" render={({ field }) => (
                            <FormItem className="col-span-3">
                                <FormLabel>ID (Auto)</FormLabel>
                                <FormControl><Input type="number" placeholder="Auto" {...field} value={field.value ?? ''} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <FormField control={form.control} name="name" render={({ field }) => (
                            <FormItem className="col-span-9">
                                <FormLabel>Nome <span className="text-destructive">*</span></FormLabel>
                                <FormControl><Input placeholder="Nome do serviço" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>

                    <FormField control={form.control} name="category" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Categoria</FormLabel>
                            <FormControl><Input placeholder="Ex: Mão de Obra" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="price" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Preço de Venda (R$)</FormLabel>
                                <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <FormField control={form.control} name="estimated_time" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Tempo Estimado</FormLabel>
                                <FormControl><Input placeholder="Ex: 30 min" {...field} /></FormControl>
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
                <Button form="service-form" type="submit" disabled={form.formState.isSubmitting} className="bg-primary hover:bg-primary/90">
                    {form.formState.isSubmitting ? 'Salvando...' : 'Salvar'}
                </Button>
            </DialogFooter>
        </Form>
    )
}
