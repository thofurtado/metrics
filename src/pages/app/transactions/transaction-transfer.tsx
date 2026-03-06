import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
    ArrowRightLeft,
    Calendar as CalendarIcon,
    ArrowRight,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { createTransaction } from '@/api/create-transaction'
import { getAccounts } from '@/api/get-accounts'
import { CreateAccountDialog } from '@/components/create-account-dialog'
import { QuickAddSelect } from '@/components/ui/quick-add-select'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
    ResponsiveDialogContent,
    ResponsiveDialogHeader,
    ResponsiveDialogTitle,
    ResponsiveDialogDescription,
    ResponsiveDialogClose
} from '@/components/ui/responsive-dialog'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

// Schema para Transferência
const formSchema = z.object({
    date: z.date({
        required_error: "Data é obrigatória",
    }),
    description: z.string().optional(),
    account_origin: z.string().min(1, "Conta de origem é obrigatória"),
    account_destination: z.string().min(1, "Conta de destino é obrigatória"),
    amount: z.string().min(1, "Valor é obrigatório").refine(
        (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
        "Valor deve ser maior que zero"
    ),
}).refine(data => data.account_origin !== data.account_destination, {
    message: "A conta de destino deve ser diferente da origem",
    path: ["account_destination"],
})

type FormSchemaType = z.infer<typeof formSchema>

export function TransactionTransfer() {
    const queryClient = useQueryClient()
    const [isPopoverOpen, setIsPopoverOpen] = useState(false)
    const [createAccountTarget, setCreateAccountTarget] = useState<'origin' | 'destination' | null>(null)

    const form = useForm<FormSchemaType>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            date: new Date(),
            description: '',
            account_origin: '',
            account_destination: '',
            amount: '',
        }
    })

    // Watch accounts for filtering
    const originAccount = form.watch("account_origin")

    const { data: accounts } = useQuery({
        queryKey: ['accounts'],
        queryFn: () => getAccounts(),
    })

    const { mutateAsync: transaction, isPending } = useMutation({
        mutationFn: createTransaction,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounts'] })
            queryClient.invalidateQueries({ queryKey: ['transactions'] })
            queryClient.invalidateQueries({ queryKey: ['metrics'] })
        }
    })

    // Dialogs handle mutation internally


    useEffect(() => {
        if (form.formState.isSubmitSuccessful) {
            form.reset({
                date: new Date(),
                description: '',
                account_origin: '',
                account_destination: '',
                amount: '',
            })
        }
    }, [form.formState.isSubmitSuccessful, form])

    async function onSubmit(data: FormSchemaType) {
        try {
            const transactionData = {
                operation: 'transfer' as const,
                amount: Number(data.amount),
                account: data.account_origin,
                destination_account: data.account_destination,
                date: data.date,
                description: data.description || "Transferência entre contas",
                confirmed: true, // Transferências são imediatas por padrão
            }

            await transaction(transactionData)
            toast.success('Transferência realizada com sucesso!')
        } catch (error) {
            console.error('Erro ao realizar transferência:', error)
            toast.error('Erro ao realizar transferência')
        }
    }

    return (
        <ResponsiveDialogContent>
            {/* ─── HEADER ─── */}
            <ResponsiveDialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                        <ArrowRightLeft className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <ResponsiveDialogTitle className="font-bold text-xl text-foreground leading-tight">
                            Transferência
                        </ResponsiveDialogTitle>
                        <ResponsiveDialogDescription className="text-slate-600 dark:text-slate-400 text-sm mt-0.5">
                            Mover valor entre suas contas bancárias.
                        </ResponsiveDialogDescription>
                    </div>
                </div>
            </ResponsiveDialogHeader>

            <div className="px-6 pb-2 pt-6 flex-1 overflow-y-auto">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">

                        {/* ─── GRUPO 1: VALOR ─── */}
                        <FormField
                            control={form.control}
                            name="amount"
                            render={({ field }) => (
                                <FormItem className="space-y-1.5">
                                    <FormLabel className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-0.5">
                                        Valor da Transferência
                                    </FormLabel>
                                    <div className="flex items-center gap-3 rounded-xl border-2 border-border/60 bg-background px-5 py-4 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all duration-200 w-full sm:w-3/4 mx-auto sm:mx-0">
                                        <span className="text-xl font-semibold text-slate-400 dark:text-slate-500 flex-shrink-0 select-none">R$</span>
                                        <FormControl>
                                            <input
                                                {...field}
                                                type="number"
                                                inputMode="decimal"
                                                step="0.01"
                                                placeholder="0,00"
                                                className="text-4xl font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-200 dark:placeholder:text-slate-700 focus:outline-none w-full bg-transparent tabular-nums tracking-tight caret-indigo-500"
                                                autoFocus
                                            />
                                        </FormControl>
                                    </div>
                                </FormItem>
                            )}
                        />

                        {/* ─── GRUPO 2: CONTAS (ORIGEM E DESTINO) ─── */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center bg-muted/20 p-5 rounded-2xl border border-border/50 relative mt-2">
                            <span className="absolute -top-3 left-4 bg-background px-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest border rounded-full">
                                Contas Envolvidas
                            </span>

                            {/* Origin */}
                            <FormField
                                control={form.control}
                                name="account_origin"
                                render={({ field: { onChange, value, disabled } }) => (
                                    <FormItem className="space-y-1.5">
                                        <FormLabel className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">De (Origem)</FormLabel>
                                        <QuickAddSelect
                                            value={value}
                                            onValueChange={onChange}
                                            disabled={disabled}
                                            isLoading={!accounts}
                                            placeholder="Conta de saída"
                                            emptyMessage="Nenhuma conta encontrada"
                                            options={accounts?.accounts.map((account) => ({
                                                label: account.name,
                                                value: account.id,
                                            }))}
                                            quickAddLabel="Nova Conta"
                                            onQuickAddClick={() => setCreateAccountTarget('origin')}
                                        />
                                    </FormItem>
                                )}
                            />

                            {/* Destination */}
                            <FormField
                                control={form.control}
                                name="account_destination"
                                render={({ field: { onChange, value, disabled } }) => (
                                    <FormItem className="space-y-1.5">
                                        <FormLabel className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Para (Destino)</FormLabel>
                                        <QuickAddSelect
                                            value={value}
                                            onValueChange={onChange}
                                            disabled={disabled}
                                            isLoading={!accounts}
                                            placeholder="Conta de entrada"
                                            emptyMessage="Nenhuma conta encontrada"
                                            options={accounts?.accounts
                                                .filter(acc => acc.id !== originAccount)
                                                .map((account) => ({
                                                    label: account.name,
                                                    value: account.id,
                                                }))}
                                            quickAddLabel="Nova Conta"
                                            onQuickAddClick={() => setCreateAccountTarget('destination')}
                                        />
                                    </FormItem>
                                )}
                            />

                            <div className="hidden sm:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 mt-3 pointer-events-none">
                                <div className="h-8 w-8 rounded-full bg-background border flex items-center justify-center shadow-sm">
                                    <ArrowRight className="h-3 w-3 text-indigo-500" />
                                </div>
                            </div>
                        </div>

                        {/* ─── GRUPO 3: DATA E DESCRIÇÃO ─── */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {/* Data */}
                            <FormField
                                control={form.control}
                                name="date"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col gap-1.5">
                                        <FormLabel className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Data</FormLabel>
                                        <Popover modal={false} open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant="outline"
                                                        type="button"
                                                        className={cn(
                                                            "w-full justify-start text-left font-medium h-11 rounded-xl border-border/70 bg-background hover:bg-muted/30 hover:border-border transition-colors text-sm",
                                                            !field.value && "text-muted-foreground"
                                                        )}
                                                    >
                                                        <CalendarIcon className="mr-2 h-4 w-4 text-slate-400 flex-shrink-0" />
                                                        {field.value ? format(field.value, "dd/MM/yyyy") : <span>Selecione</span>}
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0 z-[9999]" align="start" style={{ pointerEvents: 'auto' }}>
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value}
                                                    onSelect={(date) => { if (date) { field.onChange(date); setIsPopoverOpen(false) } }}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </FormItem>
                                )}
                            />

                            {/* Descrição */}
                            <div className="sm:col-span-2">
                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem className="space-y-1.5">
                                            <FormLabel className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Descrição</FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    placeholder="Ex: Reserva de emergência..."
                                                    className="h-11 rounded-xl border-border/70 bg-background text-sm font-medium placeholder:text-muted-foreground/50 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500"
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        {/* ─── AÇÕES ─── */}
                        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 mt-2 border-t border-border/40">
                            <ResponsiveDialogClose asChild>
                                <Button
                                    variant="outline"
                                    type="button"
                                    className="w-full sm:w-auto h-11 rounded-xl text-sm font-semibold border-border/70 text-slate-600 dark:text-slate-400 hover:text-foreground hover:bg-muted/50"
                                >
                                    Cancelar
                                </Button>
                            </ResponsiveDialogClose>
                            <Button
                                type="submit"
                                disabled={isPending}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white w-full sm:w-auto h-11 rounded-xl font-bold text-sm shadow-md shadow-indigo-500/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
                            >
                                {isPending ? 'Processando...' : 'Confirmar Transferência'}
                            </Button>
                        </div>
                    </form>
                </Form>

                <CreateAccountDialog
                    open={!!createAccountTarget}
                    onOpenChange={(open) => {
                        if (!open) setCreateAccountTarget(null)
                    }}
                    onSuccess={(newAccount) => {
                        if (newAccount.id && createAccountTarget) {
                            if (createAccountTarget === 'origin') {
                                form.setValue('account_origin', newAccount.id)
                            } else {
                                form.setValue('account_destination', newAccount.id)
                            }
                        }
                    }}
                />
            </div>
        </ResponsiveDialogContent>
    )
}
