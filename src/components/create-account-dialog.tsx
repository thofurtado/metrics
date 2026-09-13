import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Wallet } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { createAccount } from '@/api/create-account'
import { Button } from '@/components/ui/button'
import {
  Dialog,
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
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'

export interface CreateAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (account: any) => void
}

const accountSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  balance: z.string().default('0'),
  goal: z.string().optional(),
})

type AccountForm = z.infer<typeof accountSchema>

export function CreateAccountDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateAccountDialogProps) {
  const queryClient = useQueryClient()

  const form = useForm<AccountForm>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: '',
      description: '',
      balance: '0',
      goal: '',
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        name: '',
        description: '',
        balance: '0',
        goal: '',
      })
    }
  }, [open, form])

  const { mutateAsync: createNewAccount, isPending } = useMutation({
    mutationFn: createAccount,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['general-balance'] })
      const normalized = (data as any)?.account ?? data
      if (onSuccess) onSuccess(normalized)
      onOpenChange(false)
      toast.success('Conta criada com sucesso!')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Erro ao criar conta'
      toast.error(msg)
    },
  })

  async function onSubmit(data: AccountForm) {
    const rawBalance = data.balance ? parseFloat(data.balance.toString().replace(',', '.')) : 0
    const rawGoal = data.goal && data.goal.trim() !== '' ? parseFloat(data.goal.toString().replace(',', '.')) : null

    await createNewAccount({
      name: data.name.trim(),
      description: data.description?.trim() || null,
      balance: isNaN(rawBalance) ? 0 : rawBalance,
      goal: rawGoal && !isNaN(rawGoal) ? rawGoal : null,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[480px]"
        onPointerDownOutside={(e) => {
          // Impede fechamento acidental de modais pais
          e.preventDefault()
        }}
      >
        <DialogHeader className="border-b border-border/50 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Nova Conta Bancária</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Adicione uma conta para controlar entradas, saídas e saldos.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={(e) => {
              e.stopPropagation()
              form.handleSubmit(onSubmit)(e)
            }}
            className="space-y-4 pt-2"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Nome da Conta <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Nubank, Caixa Central, Reserva..."
                      className="h-11 rounded-xl"
                      autoFocus
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Descrição (Opcional)
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Uso principal, reserva de emergência..."
                      className="h-11 rounded-xl"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="balance"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      Saldo Inicial
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                          R$
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          className="h-11 rounded-xl pl-9"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="goal"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      Meta (Opcional)
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                          R$
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          className="h-11 rounded-xl pl-9"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-border/40 pt-4">
              <Button
                variant="outline"
                type="button"
                className="h-10 rounded-xl"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="h-10 rounded-xl bg-primary px-5 font-bold shadow-md shadow-primary/20"
              >
                {isPending ? 'Salvando...' : 'Salvar Conta'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
