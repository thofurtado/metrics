import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Wallet, MoreVertical } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

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
        <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-10">
            <Dialog open={isAdjustModalOpen} onOpenChange={setIsAdjustModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Ajustar Saldo Manualmente</DialogTitle>
                        <DialogDescription>
                            Isso criará uma transação de ajuste para corrigir o saldo atual.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmitAdjust(handleAdjustBalance)} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="newBalance">Novo Saldo Real</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-muted-foreground">R$</span>
                                <Input
                                    id="newBalance"
                                    type="number"
                                    step="0.01"
                                    className="pl-9 text-lg font-medium"
                                    {...registerAdjust('newBalance')}
                                    autoFocus
                                />
                            </div>
                        </div>
                        <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
                            Confirmar Ajuste
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Contas Bancárias</h1>
                    <p className="text-muted-foreground text-lg">
                        Gerencie seus saldos e caixas.
                    </p>
                </div>

                <Dialog>
                    <DialogTrigger asChild>
                        <Button size="lg" className="shadow-lg shadow-primary/25 bg-gradient-to-r from-primary to-primary/90 hover:to-primary transition-all active:scale-95">
                            <Plus className="mr-2 h-5 w-5" /> Nova Conta
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Nova Conta Bancária</DialogTitle>
                            <DialogDescription>
                                Adicione uma conta para controlar entradas e saídas.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleSubmit(handleRegisterAccount)} className="space-y-6 py-4">
                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nome da Conta</Label>
                                    <Input id="name" placeholder="Ex: Nubank, Caixa 01..." {...register('name')} className="h-11" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description">Descrição (Opcional)</Label>
                                    <Input id="description" placeholder="Uso principal, reserva..." {...register('description')} className="h-11" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="balance">Saldo Inicial</Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-3 text-muted-foreground">R$</span>
                                            <Input id="balance" type="number" step="0.01" {...register('balance')} className="pl-9 h-11" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="goal">Meta (Opcional)</Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-3 text-muted-foreground">R$</span>
                                            <Input id="goal" type="number" step="0.01" {...register('goal')} className="pl-9 h-11" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <Button type="submit" size="lg" className="w-full">
                                Criar Conta
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-40 rounded-xl border bg-card p-6 shadow-sm">
                            <Skeleton className="h-6 w-1/3 mb-4" />
                            <Skeleton className="h-4 w-2/3 mb-8" />
                            <Skeleton className="h-8 w-1/2" />
                        </div>
                    ))
                ) : (
                    accountsResult?.accounts?.map((account) => {
                        const isPositive = account.balance >= 0
                        return (
                            <div
                                key={account.id}
                                className="group relative overflow-hidden rounded-2xl border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/20 aspect-video flex flex-col justify-between"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-2">
                                            <div className="rounded-lg bg-primary/10 p-2 text-primary">
                                                <Wallet className="h-5 w-5" />
                                            </div>
                                            <h3 className="font-semibold text-lg tracking-tight">{account.name}</h3>
                                        </div>
                                        {account.description && (
                                            <p className="text-sm text-muted-foreground line-clamp-1 pl-1">
                                                {account.description}
                                            </p>
                                        )}
                                    </div>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="-mr-2 -mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => openAdjustModal(account)}
                                        title="Ajustar Saldo"
                                    >
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </div>

                                <div className="mt-4">
                                    <span className="text-xs font-medium uppercase text-muted-foreground tracking-wider">Saldo Atual</span>
                                    <div className="flex items-baseline gap-1 mt-1">
                                        <span className="text-sm font-medium text-muted-foreground">R$</span>
                                        <span className={cn(
                                            "text-3xl font-bold tracking-tighter",
                                            isPositive ? "text-foreground" : "text-red-500"
                                        )}>
                                            {account.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>

                                {/* Background decoration */}
                                <div className="absolute -right-12 -bottom-12 h-32 w-32 rounded-full bg-primary/5 blur-3xl transition-all group-hover:bg-primary/10" />
                            </div>
                        )
                    })
                )}
                {/* Empty State / Add New Card visual cue */}
                {!isLoading && (
                    <Dialog>
                        <DialogTrigger asChild>
                            <button className="flex h-full min-h-[160px] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-muted-foreground/25 bg-muted/5 p-6 transition-all hover:bg-muted/10 hover:border-primary/50 text-muted-foreground hover:text-primary">
                                <div className="rounded-full bg-background p-3 shadow-sm">
                                    <Plus className="h-6 w-6" />
                                </div>
                                <span className="font-medium">Adicionar Nova Conta</span>
                            </button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                            {/* Reusing Form Logic would require refactoring to a component, but for now duplicating the Trigger/Content structure inside the button works or using a shared state for dialog open */}
                            <DialogHeader>
                                <DialogTitle>Nova Conta Bancária</DialogTitle>
                                <DialogDescription>
                                    Crie uma nova conta para gerenciar seu saldo.
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSubmit(handleRegisterAccount)} className="space-y-6 py-4">
                                <div className="grid gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name-card">Nome da Conta</Label>
                                        <Input id="name-card" {...register('name')} className="h-11" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="description-card">Descrição</Label>
                                        <Input id="description-card" {...register('description')} className="h-11" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="balance-card">Saldo Inicial</Label>
                                        <Input id="balance-card" type="number" step="0.01" {...register('balance')} className="h-11" />
                                    </div>
                                </div>
                                <Button type="submit" size="lg" className="w-full">Criar Conta</Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </div>
        </div>
    )
}
