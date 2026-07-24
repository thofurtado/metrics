import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FileText,
  MoreVertical,
  Pencil,
  Plus,
  Star,
  Wallet,
} from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { adjustAccountBalance } from '@/api/adjust-account-balance'
import { createAccount } from '@/api/create-account'
import { getAccountHistory } from '@/api/get-account-history'
import { getAccounts } from '@/api/get-accounts'
import { getGeneralBalance } from '@/api/get-general-balance'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { exportAccountHistoryPDF } from '@/utils/export-account-history-pdf'

import { AccountHistoryDialog } from './account-history-dialog'

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
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  )
  const [selectedAccountForHistory, setSelectedAccountForHistory] = useState<{
    id: string
    name: string
    balance: number
  } | null>(null)
  const [defaultAccountId, setDefaultAccountId] = useState<string | null>(() =>
    localStorage.getItem('metrics-default-account'),
  )

  function handleSetDefaultAccount(id: string) {
    localStorage.setItem('metrics-default-account', id)
    setDefaultAccountId(id)
    toast.success('Conta definida como principal!')
  }

  const { data: accountsResult, isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: getAccounts,
  })

  const { data: generalBalance = 0 } = useQuery({
    queryKey: ['general-balance'],
    queryFn: getGeneralBalance,
  })

  const { register, handleSubmit, reset } = useForm<CreateAccountSchema>({
    resolver: zodResolver(createAccountSchema),
  })

  const {
    register: registerAdjust,
    handleSubmit: handleSubmitAdjust,
    reset: resetAdjust,
    setValue: setValueAdjust,
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
    },
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
    },
  })

  async function handleRegisterAccount(data: CreateAccountSchema) {
    try {
      await registerAccount({
        name: data.name,
        description: data.description || null,
        balance: data.balance,
        goal: data.goal || null,
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

  function openAdjustModal(account: { id: string; balance: number }) {
    setSelectedAccountId(account.id)
    setValueAdjust('newBalance', account.balance)
    setIsAdjustModalOpen(true)
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 pb-10">
      <AccountHistoryDialog
        isOpen={!!selectedAccountForHistory}
        onOpenChange={(open) => !open && setSelectedAccountForHistory(null)}
        account={selectedAccountForHistory}
        onExportPDF={exportAccountHistoryPDF}
      />

      <Dialog open={isAdjustModalOpen} onOpenChange={setIsAdjustModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Ajustar Saldo Manualmente</DialogTitle>
            <DialogDescription>
              Isso criará uma transação de ajuste para corrigir o saldo atual.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleSubmitAdjust(handleAdjustBalance)}
            className="space-y-4 py-4"
          >
            <div className="space-y-2">
              <Label htmlFor="newBalance">Novo Saldo Real</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground">
                  R$
                </span>
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
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90"
            >
              Confirmar Ajuste
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Contas Bancárias
          </h1>
          <p className="text-lg text-muted-foreground">
            Gerencie seus saldos e caixas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="lg"
            className="bg-background text-foreground shadow-sm transition-all hover:shadow-md active:scale-95"
            onClick={() =>
              setSelectedAccountForHistory({
                id: 'all',
                name: 'Visão Consolidada (Todas as Contas)',
                balance: generalBalance,
              })
            }
          >
            <FileText className="mr-2 h-5 w-5" /> Ver Histórico Geral
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button
                size="lg"
                className="bg-gradient-to-r from-primary to-primary/90 shadow-lg shadow-primary/25 transition-all hover:to-primary active:scale-95"
              >
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

              <form
                onSubmit={handleSubmit(handleRegisterAccount)}
                className="space-y-6 py-4"
              >
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome da Conta</Label>
                    <Input
                      id="name"
                      placeholder="Ex: Nubank, Caixa 01..."
                      {...register('name')}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição (Opcional)</Label>
                    <Input
                      id="description"
                      placeholder="Uso principal, reserva..."
                      {...register('description')}
                      className="h-11"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="balance">Saldo Inicial</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-3 text-muted-foreground">
                          R$
                        </span>
                        <Input
                          id="balance"
                          type="number"
                          step="0.01"
                          {...register('balance')}
                          className="h-11 pl-9"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="goal">Meta (Opcional)</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-3 text-muted-foreground">
                          R$
                        </span>
                        <Input
                          id="goal"
                          type="number"
                          step="0.01"
                          {...register('goal')}
                          className="h-11 pl-9"
                        />
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
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 2xl:grid-cols-3">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-40 rounded-xl border bg-white/90 p-6 shadow-sm dark:bg-card/60"
              >
                <Skeleton className="mb-4 h-6 w-1/3" />
                <Skeleton className="mb-8 h-4 w-2/3" />
                <Skeleton className="h-8 w-1/2" />
              </div>
            ))
          : accountsResult?.accounts?.map((account) => {
              const isPositive = account.balance >= 0
              return (
                <div
                  key={account.id}
                  className="group relative flex min-h-[200px] flex-col justify-between overflow-hidden rounded-2xl border bg-white/90 p-6 shadow-md backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:bg-white hover:shadow-xl dark:bg-card/60 dark:hover:bg-card/90"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 rounded-xl bg-primary/10 p-2.5 text-primary">
                          <Wallet className="h-5 w-5" />
                        </div>
                        <h3
                          className="truncate text-lg font-semibold tracking-tight"
                          title={account.name}
                        >
                          {account.name}
                        </h3>
                      </div>
                      {account.description && (
                        <p
                          className="line-clamp-2 pl-1 text-sm text-muted-foreground"
                          title={account.description}
                        >
                          {account.description}
                        </p>
                      )}
                      {defaultAccountId === account.id && (
                        <div className="mt-1 flex w-fit items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          <Star className="h-3 w-3 fill-primary" />
                          Principal
                        </div>
                      )}
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="-mr-2 -mt-2 opacity-50 transition-opacity focus:opacity-100 group-hover:opacity-100 sm:opacity-0"
                          title="Opções"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleSetDefaultAccount(account.id)}
                        >
                          <Star className="mr-2 h-4 w-4" />
                          Tornar Principal
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => openAdjustModal(account)}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Ajustar Saldo
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setSelectedAccountForHistory(account)}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          Visualizar Histórico
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="mt-4">
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Saldo Atual
                    </span>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-sm font-medium text-muted-foreground">
                        R$
                      </span>
                      <span
                        className={cn(
                          'text-3xl font-bold tracking-tighter',
                          isPositive ? 'text-foreground' : 'text-red-500',
                        )}
                      >
                        {account.balance.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Background decoration */}
                  <div className="absolute -bottom-12 -right-12 h-32 w-32 rounded-full bg-primary/5 blur-3xl transition-all group-hover:bg-primary/10" />
                </div>
              )
            })}
        {/* Empty State / Add New Card visual cue */}
        {!isLoading && (
          <Dialog>
            <DialogTrigger asChild>
              <button className="flex h-full min-h-[200px] flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-muted-foreground/30 bg-white/50 p-6 text-muted-foreground transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:bg-white hover:text-primary hover:shadow-lg dark:bg-muted/10 dark:hover:bg-muted/30">
                <div className="rounded-xl bg-background p-4 shadow-sm transition-transform group-hover:scale-110">
                  <Plus className="h-6 w-6" />
                </div>
                <span className="font-semibold tracking-wide">
                  Adicionar Nova Conta
                </span>
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
              <form
                onSubmit={handleSubmit(handleRegisterAccount)}
                className="space-y-6 py-4"
              >
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name-card">Nome da Conta</Label>
                    <Input
                      id="name-card"
                      {...register('name')}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description-card">Descrição</Label>
                    <Input
                      id="description-card"
                      {...register('description')}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="balance-card">Saldo Inicial</Label>
                    <Input
                      id="balance-card"
                      type="number"
                      step="0.01"
                      {...register('balance')}
                      className="h-11"
                    />
                  </div>
                </div>
                <Button type="submit" size="lg" className="w-full">
                  Criar Conta
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  )
}
