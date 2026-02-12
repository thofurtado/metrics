import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Banknote, CreditCard, Wallet } from 'lucide-react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { cn } from '@/lib/utils'

import { createPayment } from '@/api/create-payment'
import { getPayments } from '@/api/get-payments'
import { getAccounts } from '@/api/get-accounts'

import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'


const createPaymentSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    installment_limit: z.coerce.number().min(1),
    in_sight: z.boolean().default(false),
    account_id: z.string().optional(),
})

type CreatePaymentSchema = z.infer<typeof createPaymentSchema>

export function Payments() {
    const queryClient = useQueryClient()

    const { data: payments, isLoading } = useQuery({
        queryKey: ['payments'],
        queryFn: getPayments,
    })

    const { data: accountsResult } = useQuery({
        queryKey: ['accounts'],
        queryFn: getAccounts,
    })

    const { register, handleSubmit, control, reset, setValue } = useForm<CreatePaymentSchema>({
        resolver: zodResolver(createPaymentSchema),
        defaultValues: {
            in_sight: false,
            installment_limit: 12
        }
    })

    const inSight = useWatch({ control, name: 'in_sight' })

    useEffect(() => {
        if (inSight) {
            setValue('installment_limit', 1)
        }
    }, [inSight, setValue])

    const { mutateAsync: registerPayment } = useMutation({
        mutationFn: createPayment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payments'] })
            reset()
            toast.success('Forma de Pagamento criada!')
        },
        onError: () => {
            toast.error('Erro ao criar forma de pagamento.')
        }
    })

    async function handleRegisterPayment(data: CreatePaymentSchema) {
        await registerPayment({
            name: data.name,
            installment_limit: data.installment_limit,
            in_sight: data.in_sight,
            account_id: data.account_id === 'none' ? undefined : data.account_id
        })
    }

    return (
        <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Formas de Pagamento</h1>
                    <p className="text-muted-foreground text-lg">
                        Configure opções de recebimento e parcelamento.
                    </p>
                </div>

                <Dialog>
                    <DialogTrigger asChild>
                        <Button size="lg" className="shadow-lg shadow-primary/25 bg-gradient-to-r from-primary to-primary/90 hover:to-primary transition-all active:scale-95">
                            <Plus className="mr-2 h-5 w-5" /> Nova Forma
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Nova Forma de Pagamento</DialogTitle>
                            <DialogDescription>
                                Configure métodos de recebimento e vincule a contas.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleSubmit(handleRegisterPayment)} className="space-y-6 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nome (Ex: Cartão Crédito)</Label>
                                <Input id="name" placeholder="Digite o nome..." {...register('name')} className="h-11" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="installment_limit" className={inSight ? "text-muted-foreground" : ""}>
                                        Limite Parcelas
                                    </Label>
                                    <Input
                                        id="installment_limit"
                                        type="number"
                                        {...register('installment_limit')}
                                        disabled={inSight}
                                        className="h-11"
                                    />
                                </div>
                                <div className="flex items-center space-x-2 pt-8">
                                    <Controller
                                        control={control}
                                        name="in_sight"
                                        render={({ field }) => (
                                            <Checkbox
                                                id="in_sight"
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        )}
                                    />
                                    <Label htmlFor="in_sight" className="cursor-pointer font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                        À Vista / Entrada Imediata
                                    </Label>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="account_id">Conta Vinculada (Opcional)</Label>
                                <Controller
                                    name="account_id"
                                    control={control}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger className="h-11">
                                                <SelectValue placeholder="Selecione uma conta..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Nenhuma</SelectItem>
                                                {accountsResult?.accounts?.map((account) => (
                                                    <SelectItem key={account.id} value={account.id}>
                                                        {account.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                <p className="text-[0.8rem] text-muted-foreground">
                                    O valor entrará automaticamente nesta conta ao receber.
                                </p>
                            </div>

                            <Button type="submit" size="lg" className="w-full">
                                Criar Forma de Pagamento
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-32 rounded-xl border bg-card p-6 shadow-sm flex flex-col justify-between">
                            <div className="flex items-center gap-4">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-[120px]" />
                                    <Skeleton className="h-3 w-[80px]" />
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    payments?.map((payment) => {
                        const linkedAccount = accountsResult?.accounts?.find(a => a.id === payment.account_id)
                        const isInstallmentEnabled = payment.installment_limit > 1
                        const IsCash = payment.in_sight

                        return (
                            <div
                                key={payment.id}
                                className="group relative flex flex-col justify-between overflow-hidden rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:border-primary/20"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "flex h-10 w-10 items-center justify-center rounded-lg shadow-sm",
                                            IsCash ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400" : "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                                        )}>
                                            {IsCash ? <Banknote className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold tracking-tight">{payment.name}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                {linkedAccount ? (
                                                    <Badge variant="outline" className="text-xs bg-muted/50 font-normal">
                                                        <Wallet className="mr-1 h-3 w-3" />
                                                        {linkedAccount.name}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">Sem conta vinculada</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-5 flex items-center justify-between border-t pt-4">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Tipo</span>
                                        <span className="text-sm font-medium">
                                            {IsCash ? "À Vista" : "Crédito / Parcelado"}
                                        </span>
                                    </div>

                                    {!IsCash && (
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Parcelas</span>
                                            <Badge variant="secondary" className="mt-0.5">
                                                Até {payment.installment_limit}x
                                            </Badge>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
