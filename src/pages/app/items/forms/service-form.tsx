import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Clock } from 'lucide-react'
import { createService } from '@/api/create-service'
import { updateItem } from '@/api/update-item'
import { Button } from '@/components/ui/button'
import { ResponsiveDialogFooter, ResponsiveDialogClose } from '@/components/ui/responsive-dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'

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
            <form id="service-form" onSubmit={form.handleSubmit(onSubmit)} className="px-6 py-6 flex-1 overflow-y-auto flex flex-col gap-8">

                {/* --- HEADER: Name & Active --- */}
                <div className="grid grid-cols-12 gap-6">
                    <div className="col-span-12 sm:col-span-8 space-y-2">
                        <FormField control={form.control} name="name" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Nome do Serviço</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="Ex: Instalação Elétrica"
                                        {...field}
                                        className="h-12 text-lg font-medium"
                                        autoFocus
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
                                    Serviço Ativo
                                </FormLabel>
                            </FormItem>
                        )} />
                    </div>
                </div>

                {/* --- DETAILS: Category, Time, ID --- */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <FormField control={form.control} name="category" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Categoria</FormLabel>
                            <FormControl>
                                <Input placeholder="Ex: Mão de Obra" {...field} className="h-10" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="estimated_time" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="flex items-center gap-1 text-xs font-bold text-muted-foreground uppercase tracking-wide">
                                <Clock className="w-3 h-3" /> Tempo Est.
                            </FormLabel>
                            <FormControl>
                                <Input placeholder="Ex: 30 min" {...field} className="h-10" />
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
                                    placeholder="Automático"
                                    {...field}
                                    value={field.value ?? ''}
                                    className="h-10 font-mono text-sm bg-muted/50"
                                    disabled
                                />
                            </FormControl>
                        </FormItem>
                    )} />
                </div>

                {/* --- PRICING HERO --- */}
                <div className="bg-muted/10 rounded-2xl border p-4 sm:p-6 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-1 h-6 bg-primary rounded-full"></div>
                        <h4 className="text-lg font-bold tracking-tight">Valor do Serviço</h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <FormField control={form.control} name="price" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-bold text-primary uppercase tracking-wide">Preço de Venda</FormLabel>
                                <FormControl>
                                    <div className="relative shadow-sm rounded-md">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary font-bold">R$</span>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            inputMode="decimal"
                                            {...field}
                                            className="h-14 pl-10 text-2xl font-bold text-primary border-primary/30 bg-primary/5 focus-visible:ring-primary focus-visible:border-primary shadow-sm tabular-nums"
                                        />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <div className="hidden sm:flex items-center justify-center text-muted-foreground text-sm italic">
                            Defina o valor base para este serviço.
                        </div>
                    </div>
                </div>

                {/* --- DESCRIPTION --- */}
                <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Descrição / Observações</FormLabel>
                        <FormControl>
                            <Textarea placeholder="Detalhes do serviço..." className="resize-none min-h-[100px]" {...field} />
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
                    form="service-form"
                    type="submit"
                    disabled={form.formState.isSubmitting}
                    className="bg-primary hover:bg-primary/90 h-12 w-full sm:w-auto px-8 font-bold text-md shadow-lg"
                >
                    {form.formState.isSubmitting ? 'Salvando...' : 'Salvar Serviço'}
                </Button>
            </ResponsiveDialogFooter>
        </Form>
    )
}
