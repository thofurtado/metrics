import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'

import { createAccount } from '@/api/create-account'
import { getAccounts } from '@/api/get-accounts'
import { adjustAccountBalance } from '@/api/adjust-account-balance'

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
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'

const createAccountSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    description: z.string().optional(),
    balance: z.coerce.number(),
    goal: z.coerce.number().optional().nullable(),
})

const adjustBalanceSchema = z.object({
    newBalance: z.coerce.number(),
})

type CreateAccountSchema = z.infer<typeof createAccountSchema>
type AdjustBalanceSchema = z.infer<typeof adjustBalanceSchema>

export function Accounts() {
    const queryClient = useQueryClient()
    const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false)
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)

    const { data: accountsResult, isLoading } = useQuery({
        queryKey: ['accounts'],
        queryFn: getAccounts,
    })

    const { register, handleSubmit, reset } = useForm<CreateAccountSchema>({
        resolver: zodResolver(createAccountSchema),
    })

    const {
        register: registerAdjust,
        handleSubmit: handleSubmitAdjust,
        reset: resetAdjust,
        setValue: setValueAdjust
    } = useForm<AdjustBalanceSchema>({
        resolver: zodResolver(adjustBalanceSchema),
    })

    const { mutateAsync: registerAccount } = useMutation({
        mutationFn: createAccount,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounts'] })
            reset()
            toast.success('Conta criada com sucesso!')
        },
        onError: () => {
            toast.error('Erro ao criar conta.')
        }
    })

    const { mutateAsync: adjustBalance } = useMutation({
        mutationFn: adjustAccountBalance,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounts'] })
            // Também invalidar resumo financeiro e transações, pois gerou transação
            queryClient.invalidateQueries({ queryKey: ['summary'] })
            queryClient.invalidateQueries({ queryKey: ['transactions'] })

            setIsAdjustModalOpen(false)
            resetAdjust()
            toast.success('Saldo ajustado com sucesso!')
        },
        onError: () => {
            toast.error('Erro ao ajustar saldo.')
        }
    })

    async function handleRegisterAccount(data: CreateAccountSchema) {
        try {
            await registerAccount({
                name: data.name,
                description: data.description || null,
                balance: data.balance,
                goal: data.goal || null
            })
        } catch {
            // handled in onError
        }
    }

    async function handleAdjustBalance(data: AdjustBalanceSchema) {
        if (!selectedAccountId) return

        try {
            await adjustBalance({
                id: selectedAccountId,
                newBalance: data.newBalance,
            })
        } catch {
            // handled in onError
        }
    }

    function openAdjustModal(account: { id: string, balance: number }) {
        setSelectedAccountId(account.id)
        setValueAdjust('newBalance', account.balance)
        setIsAdjustModalOpen(true)
    }

    return (
        <div className="flex flex-col gap-4">
            <Dialog open={isAdjustModalOpen} onOpenChange={setIsAdjustModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Ajustar Saldo</DialogTitle>
                        <DialogDescription>
                            Informe o novo saldo real da conta. Uma transação de ajuste será gerada automaticamente.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmitAdjust(handleAdjustBalance)} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="newBalance">Novo Saldo</Label>
                            <Input
                                id="newBalance"
                                type="number"
                                step="0.01"
                                {...registerAdjust('newBalance')}
                                autoFocus
                            />
                        </div>
                        <Button type="submit" className="w-full">
                            Confirmar Ajuste
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-2xl font-bold tracking-tight">Contas Bancárias</h2>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button size="sm">
                            <Plus className="mr-2 h-4 w-4" /> Nova Conta
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Nova Conta Bancária</DialogTitle>
                            <DialogDescription>
                                Crie uma nova conta para gerenciar seu saldo.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleSubmit(handleRegisterAccount)} className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nome da Conta</Label>
                                <Input id="name" {...register('name')} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Descrição</Label>
                                <Input id="description" {...register('description')} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="balance">Saldo Inicial</Label>
                                    <Input id="balance" type="number" step="0.01" {...register('balance')} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="goal">Meta (Opcional)</Label>
                                    <Input id="goal" type="number" step="0.01" {...register('goal')} />
                                </div>
                            </div>
                            <Button type="submit" className="w-full">
                                Criar Conta
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
                            <TableHead>Descrição</TableHead>
                            <TableHead className="text-right">Saldo Atual</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-4 w-[80px] ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : (
                            accountsResult?.accounts?.map((account) => (
                                <TableRow key={account.id}>
                                    <TableCell className="font-medium">{account.name}</TableCell>
                                    <TableCell>{account.description}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {new Intl.NumberFormat('pt-BR', {
                                                style: 'currency',
                                                currency: 'BRL',
                                            }).format(account.balance)}

                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={() => openAdjustModal(account)}
                                            >
                                                <Pencil className="h-3 w-3" />
                                                <span className="sr-only">Editar Saldo</span>
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
