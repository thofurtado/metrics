import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Package2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { useEffect } from 'react'

import { createStock } from '@/api/create-stock'
import { Button } from '@/components/ui/button'
import {
    DialogContent,
    DialogDescription,
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
})

type StockAdjustmentSchema = z.infer<typeof stockAdjustmentSchema>

interface StockAdjustmentDialogProps {
    itemId: string
    itemName: string
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
    onSuccess,
}: StockAdjustmentDialogProps) {
    const queryClient = useQueryClient()

    const { mutateAsync: adjustStockFn, isPending } = useMutation({
        mutationFn: createStock,
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

    async function handleAdjustStock(data: StockAdjustmentSchema) {
        try {
            await adjustStockFn({
                item_id: itemId,
                quantity: data.quantity,
                operation: data.operation,
                description: data.description,
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

    return (
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    <Package2 className="h-5 w-5 text-minsk-500" />
                    Ajuste de Estoque
                </DialogTitle>
                <DialogDescription>
                    Informe a movimentação para o item: <strong className="text-minsk-900">{itemName}</strong>
                </DialogDescription>
            </DialogHeader>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleAdjustStock)} className="space-y-4 pt-4">
                    <FormField
                        control={form.control}
                        name="operation"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Tipo de Movimentação</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione o tipo" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="IN" className="text-emerald-600 font-medium whitespace-nowrap">Entrada (+)</SelectItem>
                                        <SelectItem value="OUT" className="text-rose-600 font-medium whitespace-nowrap">Saída (-)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="quantity"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Quantidade</FormLabel>
                                <FormControl>
                                    <Input type="number" step="0.01" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Motivo</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
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

                    <div className="flex justify-end pt-4">
                        <Button
                            type="submit"
                            className="bg-minsk-500 hover:bg-minsk-600 w-full"
                            disabled={isPending}
                        >
                            {isPending ? 'Salvando...' : 'Confirmar Ajuste'}
                        </Button>
                    </div>
                </form>
            </Form>
        </DialogContent>
    )
}
