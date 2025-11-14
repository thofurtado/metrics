import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Calculator, FileText, CreditCard, Calendar, DollarSign, Clock, ListChecks, AlertTriangle } from 'lucide-react'
import { z } from 'zod'

// Importa o calendário (assume que o path e o componente estão corretos)
import { SimpleCalendar } from '@/components/ui/simple-calendar'

import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
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
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// --- SCHEMA E INTERFACES ---

const paymentSchema = z.object({
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
    onConfirm: (data: { id: string, amount: number, date: Date, remainingDate?: Date }) => Promise<void>
}

export function PaymentModal({
    open,
    onOpenChange,
    transaction,
    onConfirm
}: PaymentModalProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [apiError, setApiError] = useState<string | null>(null) // NOVO: Estado para erro de API

    const form = useForm<PaymentFormData>({
        resolver: zodResolver(paymentSchema),
        defaultValues: {
            paidAmount: transaction.amount.toFixed(2),
            paymentDate: new Date(),
            remainingDueDate: undefined,
        }
    })

    const watchPaidAmount = form.watch('paidAmount')

    const transactionAmount = transaction.amount
    const paidAmountNum = parseFloat(watchPaidAmount.replace(',', '.')) || 0
    const remainingAmount = Math.max(0, transactionAmount - paidAmountNum)

    const isPartialActive = paidAmountNum > 0.01 && paidAmountNum < transactionAmount

    // --- LÓGICA DE VALIDAÇÃO E EFEITOS ---
    useEffect(() => {
        if (!isPartialActive) {
            form.setValue('remainingDueDate', undefined)
        }
    }, [isPartialActive, form])

    useEffect(() => {
        if (paidAmountNum > transactionAmount) {
            form.setError('paidAmount', { message: `Máx: R$ ${transactionAmount.toFixed(2)}` })
        } else {
            form.clearErrors('paidAmount')
        }
    }, [paidAmountNum, transactionAmount, form])
    // -----------------------------------------------------------

    const onSubmit = async (data: PaymentFormData) => {
        // Validações de pré-submissão
        if (paidAmountNum <= 0.01) {
            form.setError('paidAmount', { message: 'O valor de liquidação deve ser maior que zero.' })
            return
        }

        if (isPartialActive && remainingAmount > 0.01 && !data.remainingDueDate) {
            form.setError('remainingDueDate', { message: 'Defina a data de vencimento para o valor restante.' })
            return
        }

        if (paidAmountNum > transactionAmount) {
            return
        }

        setApiError(null) // Resetar erro ao tentar submeter
        setIsLoading(true)
        try {
            const confirmationPayload = {
                id: transaction.id,
                amount: paidAmountNum,
                date: data.paymentDate,
                remainingDate: isPartialActive ? data.remainingDueDate : undefined,
            }

            console.log("PAYLOAD ENVIADO:", confirmationPayload);

            // A chamada 'onConfirm' deve fazer a conversão da data para ISO string antes de chamar a API
            await onConfirm(confirmationPayload)

            // Sucesso
            form.reset({
                paidAmount: transaction.amount.toFixed(2),
                paymentDate: new Date(),
                remainingDueDate: undefined,
            })
            onOpenChange(false)
        } catch (error) {
            console.error('ERRO DETALHADO AO PROCESSAR PAGAMENTO:', error);

            // Tenta extrair a mensagem de erro do objeto Axios/fetch
            const errorMessage = (error as any).response?.data?.message
                || (error as Error).message
                || 'Erro desconhecido ao comunicar com o servidor. Verifique o console.';

            setApiError(errorMessage); // Define o erro para exibição na UI
        } finally {
            setIsLoading(false)
        }
    }

    // Desabilita dias futuros para a data de pagamento
    const disableFutureDays = (date: Date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date.getTime() > today.getTime();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="sm:max-w-xl w-full max-w-lg mx-auto p-0 gap-0 flex flex-col h-auto max-h-[90vh]"
            >
                {/* 1. Header Fixo */}
                <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-slate-50 to-gray-50 flex-shrink-0">
                    {/* ... (Header Omitido por brevidade) ... */}
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "p-2 rounded-lg",
                            transaction.operation === 'income'
                                ? 'bg-vida-loca-100 text-vida-loca-600'
                                : 'bg-stiletto-100 text-stiletto-600'
                        )}>
                            <CreditCard className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <DialogTitle className="text-lg font-semibold truncate">
                                {transaction.operation === 'income' ? 'Confirmar Recebimento' : 'Confirmar Pagamento'}
                            </DialogTitle>
                            <p className="text-sm text-muted-foreground truncate">
                                {transaction.description}
                            </p>
                        </div>
                        <Badge variant={transaction.operation === 'income' ? 'default' : 'destructive'}>
                            {transaction.operation === 'income' ? 'Entrada' : 'Saída'}
                        </Badge>
                    </div>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-grow">

                        {/* 2. Conteúdo Rolável */}
                        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">

                            {/* NOVO: Alerta de Erro da API */}
                            {apiError && (
                                <div className="p-4 bg-red-50 border border-red-300 text-red-700 rounded-xl font-medium">
                                    <strong className='flex items-center gap-2 mb-1 text-red-800'>
                                        <AlertTriangle className='h-5 w-5 flex-shrink-0' /> Erro no Processamento:
                                    </strong>
                                    <p className="text-sm">{apiError}</p>
                                    <p className="text-xs mt-1 text-red-600 italic">
                                        Verifique o console para detalhes da requisição de rede.
                                    </p>
                                </div>
                            )}

                            {/* PAINEL DE RESUMO INTELIGENTE (Omitido por brevidade) */}
                            <div className={cn(
                                "rounded-xl p-4 border shadow-md transition-all duration-300",
                                isPartialActive ? 'bg-amber-50 border-amber-200' : 'bg-slate-50'
                            )}>
                                <div className={cn(
                                    "grid gap-4",
                                    isPartialActive ? 'sm:grid-cols-3' : 'grid-cols-1'
                                )}>

                                    {/* COLUNA 1: Valor Total da Transação */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-slate-600">Valor Total da Transação</span>
                                            <DollarSign className="h-4 w-4 text-slate-400" />
                                        </div>
                                        <div className={cn(
                                            "text-2xl font-bold",
                                            transaction.operation === 'income' ? 'text-vida-loca-600' : 'text-stiletto-600'
                                        )}>
                                            R$ {transaction.amount.toFixed(2)}
                                        </div>
                                    </div>

                                    {/* COLUNAS 2 E 3 (CONDICIONAIS): Detalhes do Restante */}
                                    {isPartialActive && (
                                        <>
                                            {/* COLUNA 2: Valor Restante Pendente (Display) */}
                                            <div className="pt-2 border-t sm:border-t-0 sm:pt-0 sm:border-l sm:pl-4 border-amber-300">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-medium text-amber-800">Valor Restante Pendente</span>
                                                    <FileText className="h-4 w-4 text-amber-500" />
                                                </div>
                                                <div className="text-2xl font-bold text-amber-600">
                                                    R$ {remainingAmount.toFixed(2)}
                                                </div>
                                                <div className="text-xs text-amber-700 mt-2">
                                                    ⚠️ Nova transação pendente será criada.
                                                </div>
                                            </div>

                                            {/* COLUNA 3: Vencimento para o Restante (Campo de Data) */}
                                            <FormField
                                                control={form.control}
                                                name="remainingDueDate"
                                                render={({ field }) => (
                                                    <FormItem className="flex flex-col pt-2 border-t sm:border-t-0 sm:pt-0 sm:border-l sm:pl-4 border-amber-300">
                                                        <FormLabel className="text-sm font-semibold flex items-center gap-2 text-amber-800">
                                                            <Clock className="h-4 w-4" />
                                                            Vencimento Restante <span className="text-red-500">*</span>
                                                        </FormLabel>
                                                        <FormControl>
                                                            <SimpleCalendar
                                                                selected={field.value}
                                                                onSelect={field.onChange}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </>
                                    )}
                                </div>
                            </div>
                            {/* FIM: PAINEL DE RESUMO INTELIGENTE */}


                            <hr className="my-6 border-slate-200" />

                            {/* AGRUPAMENTO DE CAMPOS PRINCIPAIS DE 2 COLUNAS (Omitido por brevidade) */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <ListChecks className="h-5 w-5 text-gray-600" />
                                    Detalhes da Liquidação
                                </h3>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Coluna 1: Valor de Liquidação */}
                                    <FormField
                                        control={form.control}
                                        name="paidAmount"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-base font-semibold flex items-center gap-2">
                                                    <Calculator className="h-4 w-4" />
                                                    Valor de Liquidação
                                                </FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 font-semibold">
                                                            R$
                                                        </span>
                                                        <Input
                                                            {...field}
                                                            type="text"
                                                            inputMode="decimal"
                                                            onChange={(e) => field.onChange(e.target.value.replace(',', '.'))}
                                                            onBlur={() => {
                                                                const num = parseFloat(field.value.replace(',', '.'));
                                                                if (!isNaN(num)) {
                                                                    field.onChange(num.toFixed(2));
                                                                }
                                                            }}
                                                            className={cn(
                                                                "pl-12 pr-4 py-6 text-lg font-semibold border-2",
                                                                form.formState.errors.paidAmount ? 'border-red-500' : 'focus:border-primary'
                                                            )}
                                                        />
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Coluna 2: Data de Confirmação */}
                                    <FormField
                                        control={form.control}
                                        name="paymentDate"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                                <FormLabel className="text-base font-semibold flex items-center gap-2">
                                                    <Calendar className="h-4 w-4" />
                                                    Data de Confirmação
                                                </FormLabel>
                                                <div className="text-xs text-muted-foreground -mt-1 mb-1">
                                                    Hoje (Padrão)
                                                </div>
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
                            </div>
                        </div>
                        {/* FIM: Conteúdo Rolável */}


                        {/* 3. Footer Fixo */}
                        <div className="border-t bg-white p-4 flex-shrink-0">
                            <div className="flex gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => onOpenChange(false)}
                                    className="flex-1 py-3 text-base font-semibold border-2"
                                    disabled={isLoading}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isLoading}
                                    className={cn(
                                        "flex-1 py-3 text-base font-semibold",
                                        transaction.operation === 'income'
                                            ? 'bg-vida-loca-500 hover:bg-vida-loca-600'
                                            : 'bg-stiletto-500 hover:bg-stiletto-600'
                                    )}
                                >
                                    {isLoading ? (
                                        <div className="flex items-center gap-2">
                                            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Processando...
                                        </div>
                                    ) : (
                                        `Confirmar ${transaction.operation === 'income' ? 'Recebimento' : 'Pagamento'}`
                                    )}
                                </Button>
                            </div>
                        </div>
                        {/* FIM: Footer Fixo */}

                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}