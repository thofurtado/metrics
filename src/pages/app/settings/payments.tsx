import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'

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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
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
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-2xl font-bold tracking-tight">Formas de Pagamento</h2>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button size="sm">
                            <Plus className="mr-2 h-4 w-4" /> Nova Forma
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Nova Forma de Pagamento</DialogTitle>
                            <DialogDescription>
                                Configure métodos de recebimento e vincule a contas.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleSubmit(handleRegisterPayment)} className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nome (Ex: Cartão Crédito)</Label>
                                <Input id="name" {...register('name')} />
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
                                    />
                                </div>
                                <div className="flex items-end pb-2">
                                    <div className="flex items-center space-x-2">
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
                                        <Label htmlFor="in_sight" className="cursor-pointer">À Vista / Entrada Imediata</Label>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="account_id">Conta Vinculada (Opcional)</Label>
                                <Controller
                                    name="account_id"
                                    control={control}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger>
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
                            </div>

                            <Button type="submit" className="w-full">
                                Criar
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="border rounded-md overflow-x-auto">
                <Table className="min-w-[500px]">
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Conta Vinculada</TableHead>
                            <TableHead>À Vista?</TableHead>
                            <TableHead className="text-right">Max. Parcelas</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-[50px]" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-4 w-[50px] ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : (
                            payments?.map((payment) => {
                                const linkedAccount = accountsResult?.accounts?.find(a => a.id === payment.account_id)
                                const isInstallmentEnabled = payment.installment_limit > 1

                                return (
                                    <TableRow key={payment.id}>
                                        <TableCell className="font-medium">{payment.name}</TableCell>
                                        <TableCell>{linkedAccount?.name || '-'}</TableCell>
                                        <TableCell>{payment.in_sight ? 'Sim' : 'Não'}</TableCell>
                                        <TableCell className="text-right">
                                            {isInstallmentEnabled ? `${payment.installment_limit}x` : <span className="text-muted-foreground">-</span>}
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
