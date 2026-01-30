
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
    ArrowRightLeft,
    Calendar as CalendarIcon,
    Landmark,
    NotebookText,
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
    DialogClose,
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
        <DialogContent className="w-full max-w-sm sm:max-w-md bg-white dark:bg-zinc-950">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2 font-bold text-minsk-600 dark:text-minsk-500">
                    <ArrowRightLeft className="h-5 w-5" />
                    Transferência
                </DialogTitle>
                <DialogDescription className="">
                    Mover valor entre contas.
                </DialogDescription>
            </DialogHeader>

            <Form {...form}>
                <form
                    className="flex flex-col gap-4 py-2"
                    onSubmit={form.handleSubmit(onSubmit)}
                >
                    {/* Valor (Destaque Indigo/Minsk) */}
                    <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                            <FormItem className="relative">
                                <div className="flex items-center border-b-2 border-minsk-100 dark:border-minsk-900 pb-1">
                                    <span className="text-2xl font-bold text-minsk-600 mr-2">R$</span>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            type="number"
                                            step="0.01"
                                            placeholder="0,00"
                                            className="border-none text-3xl font-bold text-minsk-600 placeholder:text-minsk-200 focus-visible:ring-0 p-0 h-10"
                                            autoFocus
                                        />
                                    </FormControl>
                                </div>
                            </FormItem>
                        )}
                    />

                    <div className="grid grid-cols-1 gap-4 pt-2">

                        {/* Conta Origem */}
                        <FormField
                            control={form.control}
                            name="account_origin"
                            render={({ field: { onChange, value, disabled } }) => (
                                <FormItem>
                                    <FormLabel className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Landmark className="h-3 w-3" /> De (Origem)
                                    </FormLabel>
                                    <QuickAddSelect
                                        value={value}
                                        onValueChange={onChange}
                                        disabled={disabled}
                                        isLoading={!accounts}
                                        placeholder="Selecione a conta de saída"
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

                        <div className="flex justify-center -my-2 z-10">
                            <div className="bg-muted rounded-full p-1 border border-background">
                                <ArrowRight className="h-4 w-4 text-muted-foreground rotate-90 sm:rotate-0" />
                            </div>
                        </div>

                        {/* Conta Destino */}
                        <FormField
                            control={form.control}
                            name="account_destination"
                            render={({ field: { onChange, value, disabled } }) => (
                                <FormItem>
                                    <FormLabel className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Landmark className="h-3 w-3" /> Para (Destino)
                                    </FormLabel>
                                    <QuickAddSelect
                                        value={value}
                                        onValueChange={onChange}
                                        disabled={disabled}
                                        isLoading={!accounts}
                                        placeholder="Selecione a conta de entrada"
                                        emptyMessage="Nenhuma conta encontrada"
                                        options={accounts?.accounts
                                            .filter(acc => acc.id !== originAccount) // Filter out origin
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
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {/* Data */}
                        <FormField
                            control={form.control}
                            name="date"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel className="text-xs text-muted-foreground">Data da Transferência</FormLabel>
                                    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full pl-3 text-left font-normal h-10",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    {field.value ? (
                                                        format(field.value, "PPP", { locale: ptBR })
                                                    ) : (
                                                        <span>Selecione</span>
                                                    )}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent
                                            className="w-auto p-0 z-[9999]"
                                            align="start"
                                            onInteractOutside={(e) => e.preventDefault()}
                                            onOpenAutoFocus={(e) => e.preventDefault()}
                                            style={{ pointerEvents: 'auto' }}
                                        >
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={(date) => {
                                                    if (date) {
                                                        field.onChange(date)
                                                        setIsPopoverOpen(false)
                                                    }
                                                }}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* Descrição */}
                    <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs text-muted-foreground flex items-center gap-1">
                                    <NotebookText className="h-3 w-3" /> Observação (Opcional)
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        {...field}
                                        placeholder="Ex: Reserva de emergência, Pagamento fatura..."
                                        className="h-10"
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />

                    <div className="flex w-full justify-end gap-2 pt-4">
                        <DialogClose asChild>
                            <Button variant="ghost" type="button">
                                Cancelar
                            </Button>
                        </DialogClose>
                        <Button
                            type="submit"
                            disabled={isPending}
                            className="bg-minsk-600 text-white hover:bg-minsk-700 w-full sm:w-auto font-semibold shadow-sm"
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
        </DialogContent>
    )
}
