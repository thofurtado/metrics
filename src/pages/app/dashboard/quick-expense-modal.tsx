import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { getSectors } from '@/api/get-sectors'
import { getAccounts } from '@/api/get-accounts'
import { createTransaction } from '@/api/create-transaction'
import { useEffect } from 'react'

const quickExpenseSchema = z.object({
    description: z.string().min(1, 'Informe a descrição'),
    amount: z.string().min(1, 'Informe o valor'),
    sectorId: z.string().min(1, 'Selecione a categoria'),
    accountId: z.string().min(1, 'Selecione a conta'),
})

type QuickExpenseForm = z.infer<typeof quickExpenseSchema>

interface QuickExpenseModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function QuickExpenseModal({ open, onOpenChange }: QuickExpenseModalProps) {
    const queryClient = useQueryClient()

    const { register, handleSubmit, formState: { errors, isSubmitting }, reset, setValue, watch } = useForm<QuickExpenseForm>({
        resolver: zodResolver(quickExpenseSchema),
        defaultValues: {
            amount: '',
            description: '',
            sectorId: '',
            accountId: '',
        },
    })

    const { data: sectorsData } = useQuery({
        queryKey: ['sectors'],
        queryFn: getSectors,
        staleTime: 1000 * 60 * 60, // 1 hour
    })

    // Filter only 'out' (expense) sectors
    // Safe access for sectors
    const expenseSectors = sectorsData?.data?.sectors?.filter(s => s.type === 'out') ?? []

    const { data: accountsData } = useQuery({
        queryKey: ['accounts'],
        queryFn: getAccounts,
        staleTime: 1000 * 60 * 60,
    })

    // Safe access for accounts (FIX: getAccounts returns data directly, so no .data property)
    const accounts = accountsData?.accounts ?? []

    // Auto-select first account if available and none selected
    useEffect(() => {
        if (open && accounts.length > 0 && !watch('accountId')) {
            setValue('accountId', accounts[0].id)
        }
    }, [open, accounts, setValue, watch])

    // ... (keep mutation code)

    const { mutateAsync: createTransactionFn } = useMutation({
        mutationFn: createTransaction,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['financial-summary'] })
            queryClient.invalidateQueries({ queryKey: ['transactions'] })
            queryClient.invalidateQueries({ queryKey: ['balance-projection'] })
            queryClient.invalidateQueries({ queryKey: ['expenses-by-sector'] })
            toast.success('Despesa lançada com sucesso!')
            reset()
            onOpenChange(false)
        },
        onError: () => {
            toast.error('Erro ao lançar despesa.')
        },
    })

    // ...

    async function handleQuickExpense(data: QuickExpenseForm) {
        await createTransactionFn({
            operation: 'expense',
            description: data.description,
            amount: Number(data.amount.replace(',', '.')),
            sector: data.sectorId,
            account: data.accountId,
            date: new Date(),
            confirmed: true, // Quick expense implies it's paid NOW
        })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    {/* ... */}
                    <DialogTitle>Despesa Rápida</DialogTitle>
                    <DialogDescription>
                        Lance um gasto em segundos.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(handleQuickExpense)} className="space-y-4">
                    {/* ... (inputs) ... */}
                    <div className="space-y-2">
                        <Label htmlFor="description">O que foi comprado?</Label>
                        <Input
                            id="description"
                            placeholder="Ex: Coca-cola, Combustível..."
                            autoFocus
                            {...register('description')}
                        />
                        {errors.description && (
                            <span className="text-xs text-red-500">{errors.description.message}</span>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="amount">Valor (R$)</Label>
                        <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            placeholder="0,00"
                            {...register('amount')}
                        />
                        {errors.amount && (
                            <span className="text-xs text-red-500">{errors.amount.message}</span>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Categoria</Label>
                            <Select onValueChange={(val) => setValue('sectorId', val)} defaultValue={watch('sectorId')}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                    {expenseSectors.map((sector) => (
                                        <SelectItem key={sector.id} value={sector.id}>
                                            {sector.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.sectorId && (
                                <span className="text-xs text-red-500">{errors.sectorId.message}</span>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Conta</Label>
                            <Select onValueChange={(val) => setValue('accountId', val)} value={watch('accountId')}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                    {accounts.map((account) => (
                                        <SelectItem key={account.id} value={account.id}>
                                            {account.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.accountId && (
                                <span className="text-xs text-red-500">{errors.accountId.message}</span>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        {/* ... */}
                        <Button type="submit" disabled={isSubmitting} className="w-full bg-red-500 hover:bg-red-600">
                            Lançar Despesa
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
