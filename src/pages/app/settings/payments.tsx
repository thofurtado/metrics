import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Banknote,
  CreditCard,
  Pencil,
  Plus,
  ShoppingBag,
  Wallet,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'

import { createPayment } from '@/api/create-payment'
import { getAccounts } from '@/api/get-accounts'
import { getPayments, Payment } from '@/api/get-payments'
import { updatePayment } from '@/api/update-payment'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

import { PaymentShortcutsOrganizer } from './components/payment-shortcuts-organizer'

const createPaymentSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  installment_limit: z.coerce.number().min(1),
  in_sight: z.boolean().default(false),
  account_id: z.string().optional(),
  sefaz_tPag: z.string().nullable().optional(),
  // Tipo da forma (15/10/2026): 'COMUM' ou 'PLATAFORMA' (paga no app do iFood/99; não exige conta)
  kind: z.enum(['COMUM', 'PLATAFORMA']).default('COMUM'),
})

type CreatePaymentSchema = z.infer<typeof createPaymentSchema>

type TipoDaForma = 'COMUM' | 'PLATAFORMA'

const ehPlataforma = (p: Pick<Payment, 'kind'>) =>
  (p.kind || '').toUpperCase() === 'PLATAFORMA'

/**
 * Escolha do tipo da forma (15/10/2026): comum ou "pago na plataforma" (o cliente pagou no app do iFood/99; a plataforma
 * repassa depois, com a comissão descontada, na conta cadastrada em Plataformas).
 */
function EscolhaDoTipo({
  value,
  onChange,
  idBase,
}: {
  value: TipoDaForma
  onChange: (v: TipoDaForma) => void
  idBase: string
}) {
  return (
    <div className="space-y-2">
      <Label>Tipo</Label>
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as TipoDaForma)}
        className="gap-2"
      >
        <label
          htmlFor={`${idBase}-comum`}
          className={cn(
            'flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border p-3',
            value === 'COMUM' && 'border-primary bg-primary/5',
          )}
        >
          <RadioGroupItem value="COMUM" id={`${idBase}-comum`} className="mt-0.5" />
          <span>
            <span className="block text-sm font-semibold">Comum</span>
            <span className="block text-xs text-muted-foreground">
              Dinheiro, cartão, Pix, vale... Entra na conta vinculada.
            </span>
          </span>
        </label>
        <label
          htmlFor={`${idBase}-plataforma`}
          className={cn(
            'flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border p-3',
            value === 'PLATAFORMA' && 'border-primary bg-primary/5',
          )}
        >
          <RadioGroupItem
            value="PLATAFORMA"
            id={`${idBase}-plataforma`}
            className="mt-0.5"
          />
          <span>
            <span className="block text-sm font-semibold">
              Pago na plataforma (iFood, 99Food)
            </span>
            <span className="block text-xs text-muted-foreground">
              Não precisa de conta: o repasse cai na conta da plataforma. Ligue
              os identificadores iFood e 99Food a esta forma.
            </span>
          </span>
        </label>
      </RadioGroup>
    </div>
  )
}

/** Editar uma forma: nome, tipo e conta (15/10/2026: para virar "Pago na plataforma" sem recriar a forma). */
function EditarFormaDialog({
  payment,
  open,
  onOpenChange,
  accounts,
}: {
  payment: Payment | null
  open: boolean
  onOpenChange: (open: boolean) => void
  accounts: { id: string; name: string }[]
}) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [kind, setKind] = useState<TipoDaForma>('COMUM')
  const [accountId, setAccountId] = useState('')

  useEffect(() => {
    if (payment && open) {
      setName(payment.name)
      setKind(ehPlataforma(payment) ? 'PLATAFORMA' : 'COMUM')
      setAccountId(payment.account_id || '')
    }
  }, [payment, open])

  const { mutate: save, isPending } = useMutation({
    mutationFn: updatePayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      toast.success('Forma de pagamento atualizada.')
      onOpenChange(false)
    },
    onError: (err: any) =>
      toast.error(
        err?.response?.data?.message || 'Não deu para salvar a forma.',
      ),
  })

  if (!payment) return null
  const precisaConta = kind === 'COMUM' && !accountId
  const falta = !name.trim()
    ? 'Informe o nome'
    : precisaConta
      ? 'Escolha a conta'
      : ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar {payment.name}</DialogTitle>
          <DialogDescription>Nome, tipo e conta da forma.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label htmlFor="edit-pay-name">Nome</Label>
            <Input
              id="edit-pay-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 text-base"
            />
          </div>
          <EscolhaDoTipo value={kind} onChange={setKind} idBase="edit-pay" />
          {kind === 'COMUM' && (
            <div className="space-y-2">
              <Label htmlFor="edit-pay-account">Conta vinculada</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger id="edit-pay-account" className="h-11 text-base">
                  <SelectValue placeholder="Escolha a conta..." />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button
            size="lg"
            className="min-h-11 w-full"
            disabled={isPending || Boolean(falta)}
            onClick={() =>
              save({
                id: payment.id,
                data: {
                  name: name.trim(),
                  kind: kind === 'PLATAFORMA' ? 'PLATAFORMA' : null,
                  // A forma da plataforma não é à vista: o dinheiro chega no repasse
                  ...(kind === 'PLATAFORMA'
                    ? { in_sight: false, installment_limit: 1 }
                    : {}),
                  ...(kind === 'COMUM' && accountId
                    ? { account_id: accountId }
                    : {}),
                },
              })
            }
          >
            {isPending ? 'Salvando...' : falta || 'Salvar alterações'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function Payments() {
  const queryClient = useQueryClient()
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState(
    () => localStorage.getItem('metrics-default-payment-method') || 'BOLETO',
  )

  function handleDefaultMethodChange(value: string) {
    localStorage.setItem('metrics-default-payment-method', value)
    setDefaultPaymentMethod(value)
    toast.success('Forma de pagamento principal atualizada!')
  }

  const { data: payments, isLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: getPayments,
  })

  const { data: accountsResult } = useQuery({
    queryKey: ['accounts'],
    queryFn: getAccounts,
  })

  const { register, handleSubmit, control, reset, setValue } =
    useForm<CreatePaymentSchema>({
      resolver: zodResolver(createPaymentSchema),
      defaultValues: {
        in_sight: false,
        installment_limit: 12,
        kind: 'COMUM',
      },
    })

  const inSight = useWatch({ control, name: 'in_sight' })
  const kindNova = useWatch({ control, name: 'kind' })
  const contaNova = useWatch({ control, name: 'account_id' })
  const nomeNova = useWatch({ control, name: 'name' })
  const novaEhPlataforma = kindNova === 'PLATAFORMA'
  // A forma comum continua exigindo a conta na nuvem; só a Plataforma vai sem
  const faltaNaNova = !(nomeNova || '').trim()
    ? 'Informe o nome'
    : !novaEhPlataforma && (!contaNova || contaNova === 'none')
      ? 'Escolha a conta'
      : ''
  const [paraEditar, setParaEditar] = useState<Payment | null>(null)

  useEffect(() => {
    if (inSight) {
      setValue('installment_limit', 1)
    }
  }, [inSight, setValue])

  // A forma da plataforma não é à vista nem parcelada: o dinheiro chega no repasse
  useEffect(() => {
    if (novaEhPlataforma) {
      setValue('in_sight', false)
      setValue('installment_limit', 1)
    }
  }, [novaEhPlataforma, setValue])

  const { mutateAsync: registerPayment } = useMutation({
    mutationFn: createPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      reset()
      toast.success('Forma de Pagamento criada!')
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || 'Erro ao criar forma de pagamento.',
      )
    },
  })

  async function handleRegisterPayment(data: CreatePaymentSchema) {
    const plataforma = data.kind === 'PLATAFORMA'
    await registerPayment({
      name: data.name,
      installment_limit: plataforma ? 1 : data.installment_limit,
      in_sight: plataforma ? false : data.in_sight,
      account_id:
        !data.account_id || data.account_id === 'none' || plataforma
          ? null
          : data.account_id,
      sefaz_tPag: data.sefaz_tPag === 'none' ? null : data.sefaz_tPag,
      kind: plataforma ? 'PLATAFORMA' : null,
    })
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 pb-10">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Formas de Pagamento
          </h1>
          <p className="text-lg text-muted-foreground">
            Configure opções de recebimento e parcelamento.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <PaymentShortcutsOrganizer />
          <Dialog>
            <DialogTrigger asChild>
              <Button
                size="lg"
                className="bg-gradient-to-r from-primary to-primary/90 shadow-lg shadow-primary/25 transition-all hover:to-primary active:scale-95"
              >
                <Plus className="mr-2 h-5 w-5" /> Nova Forma
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Nova Forma de Pagamento</DialogTitle>
                <DialogDescription>
                  Configure métodos de recebimento e vincule a contas.
                </DialogDescription>
              </DialogHeader>

              <form
                onSubmit={handleSubmit(handleRegisterPayment)}
                className="space-y-6 py-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="name">Nome (Ex: Cartão Crédito)</Label>
                  <Input
                    id="name"
                    placeholder="Digite o nome..."
                    {...register('name')}
                    className="h-11"
                  />
                </div>

                <Controller
                  control={control}
                  name="kind"
                  render={({ field }) => (
                    <EscolhaDoTipo
                      value={field.value as TipoDaForma}
                      onChange={field.onChange}
                      idBase="new-pay"
                    />
                  )}
                />

                {!novaEhPlataforma && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="installment_limit"
                      className={inSight ? 'text-muted-foreground' : ''}
                    >
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
                    <Label
                      htmlFor="in_sight"
                      className="cursor-pointer font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      À Vista / Entrada Imediata
                    </Label>
                  </div>
                </div>
                )}

                {!novaEhPlataforma && (
                <div className="space-y-2">
                  <Label htmlFor="account_id">Conta vinculada</Label>
                  <Controller
                    name="account_id"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Selecione uma conta..." />
                        </SelectTrigger>
                        <SelectContent>
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
                )}

                {novaEhPlataforma && (
                  <p className="rounded-xl bg-muted/40 p-3 text-sm">
                    As taxas e a conta do repasse ficam em{' '}
                    <Link
                      to="/settings/delivery-platforms"
                      className="font-semibold text-primary underline underline-offset-2"
                    >
                      Plataformas
                    </Link>
                    .
                  </p>
                )}

                <Button
                  type="submit"
                  size="lg"
                  className="min-h-11 w-full"
                  disabled={Boolean(faltaNaNova)}
                >
                  {faltaNaNova || 'Criar Forma de Pagamento'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-col items-start justify-between gap-4 rounded-xl border bg-muted/20 p-4 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <h3 className="font-medium text-foreground">
            Forma de Pagamento Principal
          </h3>
          <p className="text-sm text-muted-foreground">
            Selecionada por padrão em novas transações.
          </p>
        </div>
        <Select
          value={defaultPaymentMethod}
          onValueChange={handleDefaultMethodChange}
        >
          <SelectTrigger className="h-10 w-[200px] bg-background">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="BOLETO">Boleto</SelectItem>
            <SelectItem value="PIX">Pix</SelectItem>
            <SelectItem value="CREDIT_CARD">Cartão de Crédito</SelectItem>
            <SelectItem value="DEBIT_CARD">Cartão de Débito</SelectItem>
            <SelectItem value="CASH">Dinheiro</SelectItem>
            <SelectItem value="CHECK">Cheque</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 2xl:grid-cols-3">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex h-32 flex-col justify-between rounded-xl border bg-white/90 p-6 shadow-sm dark:bg-card/60"
              >
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[120px]" />
                    <Skeleton className="h-3 w-[80px]" />
                  </div>
                </div>
              </div>
            ))
          : payments?.map((payment) => {
              const linkedAccount = accountsResult?.accounts?.find(
                (a) => a.id === payment.account_id,
              )
              const isInstallmentEnabled = payment.installment_limit > 1
              const IsCash = payment.in_sight
              const plataforma = ehPlataforma(payment)

              return (
                <div
                  key={payment.id}
                  className="group relative flex min-h-[200px] flex-col justify-between overflow-hidden rounded-2xl border bg-white/90 p-6 shadow-md backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:bg-white hover:shadow-xl dark:bg-card/60 dark:hover:bg-card/90"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-lg shadow-sm',
                          plataforma
                            ? 'bg-violet-100 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400'
                            : IsCash
                              ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
                              : 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
                        )}
                      >
                        {plataforma ? (
                          <ShoppingBag className="h-5 w-5" />
                        ) : IsCash ? (
                          <Banknote className="h-5 w-5" />
                        ) : (
                          <CreditCard className="h-5 w-5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3
                          className="truncate text-lg font-semibold tracking-tight"
                          title={payment.name}
                        >
                          {payment.name}
                        </h3>
                        <div className="mt-1 flex items-center gap-2">
                          {plataforma ? (
                            <span className="text-xs text-muted-foreground">
                              Repasse na conta da plataforma
                            </span>
                          ) : linkedAccount ? (
                            <Badge
                              variant="outline"
                              className="bg-muted/50 text-xs font-normal"
                            >
                              <Wallet className="mr-1 h-3 w-3" />
                              {linkedAccount.name}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Sem conta vinculada
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t pt-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Tipo
                      </span>
                      <span className="text-sm font-medium">
                        {plataforma
                          ? 'Pago na plataforma'
                          : IsCash
                            ? 'À Vista'
                            : 'Crédito / Parcelado'}
                      </span>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="min-h-11 gap-1.5"
                      onClick={() => setParaEditar(payment)}
                      aria-label={`Editar ${payment.name}`}
                    >
                      <Pencil className="h-4 w-4" /> Editar
                    </Button>

                    {!IsCash && !plataforma && (
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Parcelas
                        </span>
                        <Badge variant="secondary" className="mt-0.5">
                          Até {payment.installment_limit}x
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
      </div>
      <EditarFormaDialog
        payment={paraEditar}
        open={Boolean(paraEditar)}
        onOpenChange={(open) => !open && setParaEditar(null)}
        accounts={accountsResult?.accounts || []}
      />
    </div>
  )
}
