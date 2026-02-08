import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Package2, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { useEffect } from 'react'
import { cn } from '@/lib/utils'

import { registerStockMovement } from '@/api/register-stock-movement'
import { Button } from '@/components/ui/button'
import {
    ResponsiveDialogContent,
    ResponsiveDialogDescription,
    ResponsiveDialogHeader,
    ResponsiveDialogTitle,
    ResponsiveDialogFooter,
    ResponsiveDialogClose
} from '@/components/ui/responsive-dialog'
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

const stockAdjustmentSchema = z.object({
    quantity: z.coerce.number().min(0.01, 'Quantidade deve ser maior que 0'),
    operation: z.enum(['IN', 'OUT']),
    description: z.string().min(1, 'Motivo é obrigatório'),
    unit_cost: z.coerce.number().min(0, 'Custo não pode ser negativo').optional(),
})

type StockAdjustmentSchema = z.infer<typeof stockAdjustmentSchema>

interface StockAdjustmentDialogProps {
    itemId: string
    itemName: string
    currentCost?: number
    onSuccess?: () => void
}

const REASON_OPTIONS = {
    IN: [
        { value: 'COMPRA', label: 'Compra' },
        { value: 'AJUSTE_POSITIVO', label: 'Ajuste de Inventário (+)' },
        { value: 'DEVOLUCAO', label: 'Devolução' }
    ],
    OUT: [
        { value: 'QUEBRA', label: 'Quebra/Avaria' },
        { value: 'PERDA', label: 'Perda' },
        { value: 'CORTESIA', label: 'Cortesia' },
        { value: 'CONSUMO_INTERNO', label: 'Consumo Interno' },
        { value: 'VENDA', label: 'Venda' },
        { value: 'AJUSTE_NEGATIVO', label: 'Ajuste de Inventário (-)' }
    ]
}

export function StockAdjustmentDialog({
    itemId,
    itemName,
    currentCost,
    onSuccess,
}: StockAdjustmentDialogProps) {
    const queryClient = useQueryClient()

    const { mutateAsync: adjustStockFn, isPending } = useMutation({
        mutationFn: registerStockMovement,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['items'] })
            onSuccess?.()
        },
    })

    const form = useForm<StockAdjustmentSchema>({
        resolver: zodResolver(stockAdjustmentSchema),
        defaultValues: {
            operation: 'IN',
            quantity: 1,
            description: 'COMPRA',
            unit_cost: currentCost ?? 0
        },
    })

    const watchedOperation = form.watch('operation')

    // Effect to reset/set default description when operation changes
    useEffect(() => {
        if (watchedOperation === 'IN') {
            form.setValue('description', 'COMPRA')
        } else {
            form.setValue('description', '') // Force user to select for OUT logic
        }
    }, [watchedOperation, form])

    // Effect to auto-fill unit_cost with currentCost
    useEffect(() => {
        if (currentCost !== undefined) {
            form.setValue('unit_cost', currentCost)
        }
    }, [currentCost, form])

    async function handleAdjustStock(data: StockAdjustmentSchema) {
        try {
            await adjustStockFn({
                item_id: itemId,
                quantity: data.quantity,
                operation: data.operation,
                description: data.description,
                unit_cost: data.operation === 'IN' ? data.unit_cost : undefined,
                created_at: new Date(),
            })

            toast.success('Estoque atualizado com sucesso!')
            onSuccess?.(); // Close dialog on success
        } catch (err: any) {
            console.error('Erro ao ajustar estoque:', err)
            toast.error(err.response?.data?.message || 'Erro ao ajustar estoque.')
        }
    }

    const currentReasonOptions = REASON_OPTIONS[watchedOperation] || []
    const isEntry = watchedOperation === 'IN'

    return (
        <ResponsiveDialogContent className="sm:max-w-[425px] bg-background">
            <ResponsiveDialogHeader className="border-b pb-4">
                <ResponsiveDialogTitle className="flex items-center gap-2 text-xl">
                    <Package2 className="h-6 w-6 text-primary" />
                    Ajuste de Estoque
                </ResponsiveDialogTitle>
                <ResponsiveDialogDescription>
                    Movimentação para: <span className="font-semibold text-foreground">{itemName}</span>
                </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleAdjustStock)} className="flex flex-col gap-6 py-4">

                    {/* OPERATION TYPE */}
                    <FormField
                        control={form.control}
                        name="operation"
                        render={({ field }) => (
                            <FormItem>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => field.onChange('IN')}
                                        className={cn(
                                            "flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all",
                                            field.value === 'IN'
                                                ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400"
                                                : "border-muted hover:border-emerald-200 hover:bg-emerald-50/50 text-muted-foreground"
                                        )}
                                    >
                                        <ArrowUpCircle className="h-6 w-6" />
                                        <span className="font-bold text-sm">Entrada (+)</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => field.onChange('OUT')}
                                        className={cn(
                                            "flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all",
                                            field.value === 'OUT'
                                                ? "border-rose-500 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400"
                                                : "border-muted hover:border-rose-200 hover:bg-rose-50/50 text-muted-foreground"
                                        )}
                                    >
                                        <ArrowDownCircle className="h-6 w-6" />
                                        <span className="font-bold text-sm">Saída (-)</span>
                                    </button>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="flex gap-4">
                        {/* QUANTITY - HERO INPUT */}
                        <FormField
                            control={form.control}
                            name="quantity"
                            render={({ field }) => (
                                <FormItem className="text-center flex-1">
                                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Quantidade</FormLabel>
                                    <FormControl>
                                        <div className="relative mx-auto">
                                            <Input
                                                type="number"
                                                inputMode="decimal"
                                                step="0.01"
                                                {...field}
                                                className="text-center text-3xl h-16 font-bold border-2 border-primary/20 bg-muted/20 focus-visible:ring-0 focus-visible:border-primary rounded-xl tabular-nums shadow-sm"
                                            />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* COST - HERO INPUT (ONLY FOR IN) */}
                        {isEntry && (
                            <FormField
                                control={form.control}
                                name="unit_cost"
                                render={({ field }) => (
                                    <FormItem className="text-center flex-1">
                                        <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Custo Unit. (R$)</FormLabel>
                                        <FormControl>
                                            <div className="relative mx-auto">
                                                <Input
                                                    type="number"
                                                    inputMode="decimal"
                                                    step="0.01"
                                                    {...field}
                                                    className="text-center text-3xl h-16 font-bold border-2 border-emerald-500/20 bg-emerald-50/20 focus-visible:ring-0 focus-visible:border-emerald-500 rounded-xl tabular-nums shadow-sm text-emerald-700 dark:text-emerald-400"
                                                />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
                    </div>

                    {/* REASON */}
                    <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="font-semibold text-sm">Motivo da Movimentação</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger type="button" className="h-12 bg-muted/20 border-muted-foreground/20">
                                            <SelectValue placeholder="Selecione o motivo" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {currentReasonOptions.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <ResponsiveDialogFooter className="pt-4 flex-col gap-3 sm:flex-row">
                        <ResponsiveDialogClose asChild>
                            <Button type="button" variant="ghost" className="h-12 w-full sm:w-auto">Cancelar</Button>
                        </ResponsiveDialogClose>
                        <Button
                            type="submit"
                            className={cn("h-12 w-full sm:w-auto px-8 font-bold shadow-md", isEntry ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700")}
                            disabled={isPending}
                        >
                            {isPending ? 'Salvando...' : 'Confirmar Ajuste'}
                        </Button>
                    </ResponsiveDialogFooter>
                </form>
            </Form>
        </ResponsiveDialogContent>
    )
}
