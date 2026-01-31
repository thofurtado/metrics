import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Calendar, DollarSign, Clock, AlertTriangle, ArrowRight, Plus } from 'lucide-react'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'

import { getAccounts } from '@/api/get-accounts'

// Importa o calendário
import { SimpleCalendar } from '@/components/ui/simple-calendar'
import { CreateAccountDialog } from '@/components/create-account-dialog'

import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// --- SCHEMA E INTERFACES ---

const paymentSchema = z.object({
    accountId: z.string().min(1, "Conta é obrigatória"),
    additions: z.string().optional(), // Juros/Multa
    discounts: z.string().optional(), // Descontos
    paidAmount: z.string().min(1, "Valor é obrigatório").refine(
        (val) => {
            const num = parseFloat(val.replace(',', '.'))
            return !isNaN(num) && num >= 0
        },
        "Valor deve ser maior ou igual a zero"
    ),
    paymentDate: z.date({
        required_error: "Data do pagamento é obrigatória",
    }),
    remainingDueDate: z.date().optional(),
})

type PaymentFormData = z.infer<typeof paymentSchema>

interface Transaction {
    id: string
    date: Date
    description: string
    confirmed: boolean
    operation: 'income' | 'expense'
    amount: number
    sectorId: string | null
    accountId: string
    sectors: { name: string } | null
    accounts: { name: string }
}

interface PaymentModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    transaction: Transaction
    onConfirm: (data: { id: string, amount: number, date: Date, remainingDate?: Date, accountId?: string }) => Promise<void>
}

export function PaymentModal({
    open,
    onOpenChange,
    transaction,
    onConfirm
}: PaymentModalProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [apiError, setApiError] = useState<string | null>(null)
    const [openNewAccountModal, setOpenNewAccountModal] = useState(false)

    // Fetch Accounts
    const { data: accountsData } = useQuery({
        queryKey: ['accounts'],
        queryFn: getAccounts,
        enabled: open, // Fetch only when modal is open
    })

    const form = useForm<PaymentFormData>({
        resolver: zodResolver(paymentSchema),
        defaultValues: {
            accountId: transaction.accountId,
            additions: '',
            discounts: '',
            paidAmount: transaction.amount.toFixed(2),
            paymentDate: new Date(),
            remainingDueDate: undefined,
        }
    })

    const watchAdditions = form.watch('additions')
    const watchDiscounts = form.watch('discounts')
    const watchPaidAmount = form.watch('paidAmount')

    const transactionAmount = transaction.amount

    // Parse values
    const additionsNum = parseFloat(watchAdditions?.replace(',', '.') || '0')
    const discountsNum = parseFloat(watchDiscounts?.replace(',', '.') || '0')
    const paidAmountNum = parseFloat(watchPaidAmount?.replace(',', '.') || '0')

    // Calculated Final Total (Base + Additions - Discounts)
    const calculatedTotal = Math.max(0, transactionAmount + additionsNum - discountsNum)

    // Remaining calculation: Calculated Total - Paid Amount
    const remainingAmount = Math.max(0, calculatedTotal - paidAmountNum)

    const isPartialActive = remainingAmount > 0.01

    // --- LÓGICA DE VALIDAÇÃO E EFEITOS ---
    useEffect(() => {
        if (!isPartialActive) {
            form.setValue('remainingDueDate', undefined)
        }
    }, [isPartialActive, form])

    // Auto-update Paid Amount when default Adjustments change (optional behavior, but helpful)
    // Actually, usually adjustments directly affect what NEEDS to be paid.
    // So if I add interest, the "Paid Amount" should probably default to the NEW total?
    // Let's NOT auto-change input user might be typing, but we could initialize or suggest.
    // Better: If paidAmount == calculatedTotal (previous), update it? Complex.
    // Let's stick to: User enters additions/discounts -> Calculated Total shows up.
    // User sees "Total a Pagar: R$ X". User inputs "Valor Pago: R$ Y".
    // If user wants to pay FULL, they match X and Y.
    // We can add a button "Pay Full" or just let them type. 
    // OR: bind paidAmount to calculatedTotal unless manually changed?
    // Let's keep it manual to avoid interrupting user.

    // Wait, simpler UX: "Valor Pago" vs "Valor Original".
    // If I add Interest, the "Valor Pago" effectively increases.
    // Let's update `paidAmount` automatically ONLY IF it was matching the previous total.
    // Implementation: simple Effect.
    /*
    useEffect(() => {
         const currentTotal = transactionAmount + additionsNum - discountsNum
         if (Math.abs(paidAmountNum - (currentTotal - additionsNum + discountsNum)) < 0.01) {
             // If previously matching, keep matching
             // form.setValue('paidAmount', currentTotal.toFixed(2))
         }
    }, [additionsNum, discountsNum]) 
    */
    // Too risky for UX glitches. User can type.

    const onSubmit = async (data: PaymentFormData) => {
        // Validações
        if (paidAmountNum <= 0.01) {
            form.setError('paidAmount', { message: 'O valor deve ser maior que zero.' })
            return
        }

        if (isPartialActive && !data.remainingDueDate) {
            form.setError('remainingDueDate', { message: 'Defina a data para o restante.' })
            return
        }

        if (paidAmountNum > calculatedTotal + 0.01) {
            form.setError('paidAmount', { message: `Valor não pode exceder o total calculado (R$ ${calculatedTotal.toFixed(2)})` })
            return
        }

        setApiError(null)
        setIsLoading(true)

        try {
            const confirmationPayload = {
                id: transaction.id,
                amount: paidAmountNum, // We send the FINAL paid amount (which includes interest/discount implicit)
                date: data.paymentDate,
                remainingDate: isPartialActive ? data.remainingDueDate : undefined,
                accountId: data.accountId // Send selected account
            }

            console.log({ "Payload: ": confirmationPayload })

            await onConfirm(confirmationPayload)

            // Sucesso
            form.reset()
            onOpenChange(false)
        } catch (error: any) {
            console.error('🔴 ERRO AO PROCESSAR:', error)
            const errorMessage = error.response?.data?.message || error.message || 'Erro desconhecido.'
            setApiError(errorMessage)
        } finally {
            setIsLoading(false)
        }
    }

    // Desabilita dias futuros
    const disableFutureDays = (date: Date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date.getTime() > today.getTime();
    };

    // Reset loop
    useEffect(() => {
        if (open) {
            form.reset({
                accountId: transaction.accountId, // Fixed: Use accountId directly
                additions: '',
                discounts: '',
                paidAmount: transaction.amount.toFixed(2),
                paymentDate: new Date(),
                remainingDueDate: undefined,
            })
            setApiError(null)
        }
    }, [open, transaction, form])

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="sm:max-w-4xl w-full p-0 gap-0 overflow-hidden h-auto max-h-[90vh] flex flex-col"
            >
                {/* HEADLINE / HEADER */}
                <div className={cn(
                    "px-6 py-5 border-b flex items-center justify-between",
                    transaction.operation === 'income' ? 'bg-green-50/50' : 'bg-red-50/50'
                )}>
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "p-3 rounded-full shadow-sm",
                            transaction.operation === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                        )}>
                            <DollarSign className="h-6 w-6" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-bold text-slate-800">
                                {transaction.operation === 'income' ? 'Confirmar Recebimento' : 'Confirmar Pagamento'}
                            </DialogTitle>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                Finalize a transação financeira abaixo
                            </p>
                        </div>
                    </div>
                    <Badge
                        variant="outline"
                        className={cn(
                            "px-3 py-1 text-sm font-semibold border-0",
                            transaction.operation === 'income' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                        )}
                    >
                        {transaction.operation === 'income' ? 'Receita' : 'Despesa'}
                    </Badge>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">

                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">

                                {/* COLUNA ESQUERDA: RESUMO VISUAL */}
                                <div className="lg:col-span-4 space-y-6">
                                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 shadow-inner">
                                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Resumo da Conta</h3>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-xs text-slate-400 font-medium">Descrição</label>
                                                <p className="text-lg font-semibold text-slate-800 leading-tight">
                                                    {transaction.description || "Sem descrição"}
                                                </p>
                                            </div>

                                            <div>
                                                <label className="text-xs text-slate-400 font-medium">Vencimento Original</label>
                                                <div className="flex items-center gap-2 text-slate-700 font-medium">
                                                    <Calendar className="h-4 w-4 text-slate-400" />
                                                    {new Date(transaction.date).toLocaleDateString("pt-BR")}
                                                </div>
                                            </div>

                                            <div className="pt-4 border-t border-slate-200/60">
                                                <label className="text-xs text-slate-400 font-medium">Valor Original</label>
                                                <p className={cn(
                                                    "text-3xl font-bold tracking-tight",
                                                    transaction.operation === 'income' ? 'text-green-600' : 'text-red-600'
                                                )}>
                                                    R$ {transactionAmount.toFixed(2)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Calculated Final Display */}
                                    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm text-slate-500">Juros / Multa</span>
                                            <span className="text-sm font-medium text-red-500">+ R$ {additionsNum.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-sm text-slate-500">Descontos</span>
                                            <span className="text-sm font-medium text-green-500">- R$ {discountsNum.toFixed(2)}</span>
                                        </div>
                                        <div className="pt-3 border-t flex justify-between items-center">
                                            <span className="font-semibold text-slate-700">Total Calculado</span>
                                            <span className="font-bold text-xl text-slate-900">R$ {calculatedTotal.toFixed(2)}</span>
                                        </div>
                                    </div>

                                    {apiError && (
                                        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
                                            <AlertTriangle className="h-4 w-4 inline mr-2" />
                                            {apiError}
                                        </div>
                                    )}
                                </div>

                                {/* COLUNA DIREITA: AÇÕES DE PAGAMENTO */}
                                <div className="lg:col-span-8 flex flex-col gap-6">

                                    {/* ROW 1: Conta e Data */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <FormField
                                            control={form.control}
                                            name="accountId"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <div className="flex items-center justify-between">
                                                        <FormLabel>Conta / Caixa</FormLabel>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-6 px-2 text-xs text-primary hover:text-primary/80"
                                                            onClick={(e) => {
                                                                e.preventDefault(); // Prevent submit
                                                                setOpenNewAccountModal(true);
                                                            }}
                                                        >
                                                            <Plus className="h-3 w-3 mr-1" />
                                                            Nova
                                                        </Button>
                                                    </div>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger className="h-11">
                                                                <SelectValue placeholder="Selecione a conta" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {accountsData?.accounts.map((acc) => (
                                                                <SelectItem key={acc.id} value={acc.id} className="flex items-center justify-between">
                                                                    <span>{acc.name}</span>
                                                                    {/* <span className="text-xs text-muted-foreground ml-2">R$ {acc.balance.toFixed(2)}</span> */}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="paymentDate"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Data do Pagamento</FormLabel>
                                                    <FormControl>
                                                        <SimpleCalendar
                                                            selected={field.value}
                                                            onSelect={field.onChange}
                                                            disabledDays={disableFutureDays}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    {/* ROW 2: Ajustes */}
                                    <div className="grid grid-cols-2 gap-5 p-4 bg-slate-50/50 rounded-lg border border-slate-100">
                                        <FormField
                                            control={form.control}
                                            name="additions"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-slate-600 flex items-center gap-1">
                                                        Juros / Multa
                                                        <span className="text-xs text-muted-foreground font-normal">(R$)</span>
                                                    </FormLabel>
                                                    <FormControl>
                                                        <div className="relative">
                                                            <ArrowRight className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-400 rotate-[-45deg]" />
                                                            <Input
                                                                {...field}
                                                                className="pl-9 bg-white border-slate-200 focus:border-red-300 focus:ring-red-100"
                                                                placeholder="0,00"
                                                            />
                                                        </div>
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="discounts"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-slate-600 flex items-center gap-1">
                                                        Descontos
                                                        <span className="text-xs text-muted-foreground font-normal">(R$)</span>
                                                    </FormLabel>
                                                    <FormControl>
                                                        <div className="relative">
                                                            <ArrowRight className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-400 rotate-[45deg]" />
                                                            <Input
                                                                {...field}
                                                                className="pl-9 bg-white border-slate-200 focus:border-green-300 focus:ring-green-100"
                                                                placeholder="0,00"
                                                            />
                                                        </div>
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <hr className="border-slate-100" />

                                    {/* ROW 3: Pagamento e Restante */}
                                    <div className="space-y-4">
                                        <FormField
                                            control={form.control}
                                            name="paidAmount"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-lg font-bold text-slate-800">
                                                        Valor Pago (Efetivo)
                                                    </FormLabel>
                                                    <FormControl>
                                                        <div className="relative">
                                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">R$</span>
                                                            <Input
                                                                {...field}
                                                                className="pl-12 h-14 text-2xl font-bold border-slate-300 focus:border-slate-500 shadow-sm"
                                                            />
                                                        </div>
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        {/* Partial Warning */}
                                        {isPartialActive && (
                                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 animate-in fade-in slide-in-from-top-2">
                                                <div className="flex items-start gap-3">
                                                    <Clock className="h-5 w-5 text-amber-600 mt-0.5" />
                                                    <div className="flex-1 space-y-3">
                                                        <div>
                                                            <h4 className="font-medium text-amber-900">Pagamento Parcial Detectado</h4>
                                                            <p className="text-sm text-amber-700">
                                                                Restará <strong>R$ {remainingAmount.toFixed(2)}</strong> pendente.
                                                            </p>
                                                        </div>

                                                        <FormField
                                                            control={form.control}
                                                            name="remainingDueDate"
                                                            render={({ field }) => (
                                                                <FormItem className="max-w-[240px]">
                                                                    <FormLabel className="text-xs text-amber-800 uppercase font-bold">Vencimento do Restante</FormLabel>
                                                                    <FormControl>
                                                                        <SimpleCalendar selected={field.value} onSelect={field.onChange} />
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* FOOTER */}
                        <div className="p-6 border-t bg-slate-50 flex justify-end gap-3 pointer-events-auto z-50 relative">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                className="h-12 px-6"
                                disabled={isLoading}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={isLoading}
                                className={cn(
                                    "h-12 px-8 text-base font-bold shadow-md transition-all hover:scale-[1.02]",
                                    transaction.operation === 'income'
                                        ? 'bg-gradient-to-r from-green-600 to-green-500 hover:to-green-400 text-white'
                                        : 'bg-gradient-to-r from-red-600 to-red-500 hover:to-red-400 text-white'
                                )}
                            >
                                {isLoading ? 'Processando...' : `Confirmar ${transaction.operation === 'income' ? 'Recebimento' : 'Pagamento'}`}
                            </Button>
                        </div>
                    </form>
                </Form>

                <CreateAccountDialog
                    open={openNewAccountModal}
                    onOpenChange={setOpenNewAccountModal}
                    onSuccess={(newAccount: any) => {
                        // Seleciona a nova conta automaticamente
                        if (newAccount?.id) {
                            form.setValue('accountId', newAccount.id)
                        }
                    }}
                />
            </DialogContent>
        </Dialog>
    )
}