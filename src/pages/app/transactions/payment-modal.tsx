import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  Clock,
  DollarSign,
  Paperclip,
  Plus,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { getAccounts } from '@/api/get-accounts'
import { uploadFileTransaction } from '@/api/upload-file'
import { CreateAccountDialog } from '@/components/create-account-dialog'
import { FileUpload } from '@/components/file-upload'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SimpleCalendar } from '@/components/ui/simple-calendar'
import { cn } from '@/lib/utils'

// --- SCHEMA E INTERFACES ---

const paymentSchema = z.object({
  accountId: z.string().min(1, 'Conta é obrigatória'),
  interest: z.string().optional(), // Juros (R$)
  fine: z.string().optional(),     // Multa (R$)
  discounts: z.string().optional(), // Descontos (R$)
  paidAmount: z
    .string()
    .min(1, 'Valor é obrigatório')
    .refine((val) => {
      const num = parseFloat(val.replace(',', '.'))
      return !isNaN(num) && num >= 0
    }, 'Valor deve ser maior ou igual a zero'),
  paymentDate: z.date({
    required_error: 'Data do pagamento é obrigatória',
  }),
  remainingDueDate: z.date().optional(),
})

type PaymentFormData = z.infer<typeof paymentSchema>

interface Transaction {
  id: string
  data_vencimento: Date
  data_emissao: Date
  description: string
  confirmed: boolean
  operation: 'income' | 'expense'
  amount: number
  sectorId: string | null
  accountId: string
  sectors: { name: string } | null
  accounts: { name: string }
  attachment_url?: string
  suggestedInterest?: number
  suggestedFine?: number
  suggestedDiscount?: number
}

interface PaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction: Transaction
  onConfirm: (data: {
    id: string
    amount: number
    interest?: number
    fine?: number
    discount?: number
    data_vencimento: Date
    data_emissao?: Date
    remainingDate?: Date
    accountId?: string
  }) => Promise<void>
}

export function PaymentModal({
  open,
  onOpenChange,
  transaction,
  onConfirm,
}: PaymentModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [openNewAccountModal, setOpenNewAccountModal] = useState(false)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  // Fetch Accounts
  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: getAccounts,
    enabled: open,
  })

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      accountId: transaction.accountId,
      interest: transaction.suggestedInterest ? transaction.suggestedInterest.toFixed(2) : '',
      fine: transaction.suggestedFine ? transaction.suggestedFine.toFixed(2) : '',
      discounts: transaction.suggestedDiscount ? transaction.suggestedDiscount.toFixed(2) : '',
      paidAmount: transaction.amount.toFixed(2),
      paymentDate: new Date(),
      remainingDueDate: undefined,
    },
  })

  const watchInterest = form.watch('interest')
  const watchFine = form.watch('fine')
  const watchDiscounts = form.watch('discounts')
  const watchPaidAmount = form.watch('paidAmount')

  const transactionAmount = transaction.amount

  // Parse values
  const interestNum = parseFloat(watchInterest?.replace(',', '.') || '0')
  const fineNum = parseFloat(watchFine?.replace(',', '.') || '0')
  const discountsNum = parseFloat(watchDiscounts?.replace(',', '.') || '0')
  const paidAmountNum = parseFloat(watchPaidAmount?.replace(',', '.') || '0')

  // Calculated Final Total (Base + Interest + Fine - Discounts)
  const calculatedTotal = Math.max(
    0,
    transactionAmount + interestNum + fineNum - discountsNum,
  )

  // Remaining calculation: Calculated Total - Paid Amount
  const remainingAmount = Math.max(0, calculatedTotal - paidAmountNum)
  const isPartialActive = remainingAmount > 0.01

  useEffect(() => {
    if (!isPartialActive) {
      form.setValue('remainingDueDate', undefined)
    }
  }, [isPartialActive, form])

  // Sincronização Reativa: Atualiza o Valor Pago quando o Total Calculado muda
  useEffect(() => {
    form.setValue('paidAmount', calculatedTotal.toFixed(2))
  }, [calculatedTotal, form])

  const onSubmit = async (data: PaymentFormData) => {
    if (paidAmountNum <= 0.01) {
      form.setError('paidAmount', {
        message: 'O valor deve ser maior que zero.',
      })
      return
    }

    if (isPartialActive && !data.remainingDueDate) {
      form.setError('remainingDueDate', {
        message: 'Defina a data para o restante.',
      })
      return
    }

    if (paidAmountNum > calculatedTotal + 0.01) {
      form.setError('paidAmount', {
        message: `Valor não pode exceder o total calculado (R$ ${calculatedTotal.toFixed(2)})`,
      })
      return
    }

    setApiError(null)
    setIsLoading(true)

    try {
      const confirmationPayload = {
        id: transaction.id,
        amount: paidAmountNum,
        interest: interestNum,
        fine: fineNum,
        discount: discountsNum,
        data_vencimento: data.paymentDate,
        remainingDate: isPartialActive ? data.remainingDueDate : undefined,
        accountId: data.accountId,
      }

      if (receiptFile) {
        setIsUploading(true)
        try {
          await uploadFileTransaction(transaction.id, receiptFile)
        } catch (uploadErr) {
          console.error('Erro no upload do comprovante:', uploadErr)
          toast.warning(
            'Pagamento confirmado, mas falha ao enviar comprovante.',
          )
        } finally {
          setIsUploading(false)
        }
      }

      await onConfirm(confirmationPayload)

      form.reset()
      onOpenChange(false)
    } catch (error: any) {
      console.error('🔴 ERRO AO PROCESSAR:', error)
      const errorMessage =
        error?.response?.data?.message || error?.message || 'Erro desconhecido.'
      setApiError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const disableFutureDays = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date.getTime() > today.getTime()
  }

  useEffect(() => {
    if (open) {
      form.reset({
        accountId: transaction.accountId,
        interest: '',
        fine: '',
        discounts: '',
        paidAmount: transaction.amount.toFixed(2),
        paymentDate: new Date(),
        remainingDueDate: undefined,
      })
      setApiError(null)
      setReceiptFile(null)
    }
  }, [open, transaction, form])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] max-w-3xl flex-col overflow-hidden border-border/80 bg-background p-0 shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:rounded-2xl">
        {/* HEADER */}
        <div
          className={cn(
            'flex items-center justify-between border-b p-6 transition-colors dark:border-slate-800',
            transaction.operation === 'income'
              ? 'bg-emerald-500/10 dark:bg-emerald-950/20'
              : 'bg-red-500/10 dark:bg-red-950/20',
          )}
        >
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'rounded-2xl p-3 shadow-sm',
                transaction.operation === 'income'
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  : 'bg-red-500/20 text-red-600 dark:text-red-400',
              )}
            >
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black text-slate-900 dark:text-slate-100">
                {transaction.operation === 'income'
                  ? 'Confirmar Recebimento'
                  : 'Confirmar Pagamento'}
              </DialogTitle>
              <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                Baixa e liquidação financeira autoexplicativa
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              'border px-3 py-1 text-xs font-black uppercase tracking-wider',
              transaction.operation === 'income'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                : 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300',
            )}
          >
            {transaction.operation === 'income' ? 'Receita' : 'Despesa'}
          </Badge>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid h-full grid-cols-1 gap-6 lg:grid-cols-12">
                {/* COLUNA ESQUERDA: RESUMO CONTÁBIL (AUTOEXPLICATIVO) */}
                <div className="space-y-4 lg:col-span-5">
                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/70">
                    <h3 className="mb-3 text-[11px] font-black uppercase tracking-wider text-slate-400">
                      Resumo do Título
                    </h3>

                    <div className="space-y-3">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-400">
                          Descrição
                        </label>
                        <p className="text-base font-bold leading-tight text-slate-900 dark:text-slate-100">
                          {transaction.description || 'Sem descrição'}
                        </p>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-400">
                          Vencimento Original
                        </label>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          {new Date(
                            transaction.data_vencimento,
                          ).toLocaleDateString('pt-BR')}
                        </div>
                      </div>

                      <div className="border-t border-slate-200 pt-3 dark:border-slate-800">
                        <label className="text-[11px] font-semibold text-slate-400">
                          Valor Base
                        </label>
                        <p
                          className={cn(
                            'font-mono text-2xl font-black tracking-tight',
                            transaction.operation === 'income'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400',
                          )}
                        >
                          R$ {transactionAmount.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Demonstração Matemática Autoexplicativa */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
                    <div className="space-y-1.5 text-xs font-semibold">
                      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span>Valor Base:</span>
                        <span className="font-mono text-slate-900 dark:text-slate-100">
                          R$ {transactionAmount.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
                        <span>(+) Juros:</span>
                        <span className="font-mono font-bold">+ R$ {interestNum.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between text-red-600 dark:text-red-400">
                        <span>(+) Multa:</span>
                        <span className="font-mono font-bold">+ R$ {fineNum.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                        <span>(-) Descontos:</span>
                        <span className="font-mono font-bold">- R$ {discountsNum.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                        Total Calculado:
                      </span>
                      <span className="font-mono text-xl font-black text-slate-900 dark:text-slate-100">
                        R$ {calculatedTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {apiError && (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-bold text-red-600 dark:text-red-400">
                      <AlertTriangle className="mr-1.5 inline h-4 w-4" />
                      {apiError}
                    </div>
                  )}
                </div>

                {/* COLUNA DIREITA: FORMULÁRIO DE BAIXA */}
                <div className="flex flex-col gap-4 lg:col-span-7">
                  {/* ROW 1: Conta e Data */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="accountId"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                              Conta / Caixa
                            </FormLabel>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-5 px-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                              onClick={(e) => {
                                e.preventDefault()
                                setOpenNewAccountModal(true)
                              }}
                            >
                              <Plus className="mr-0.5 h-3 w-3" />
                              Nova
                            </Button>
                          </div>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white font-semibold text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
                                <SelectValue placeholder="Selecione a conta" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="border-slate-200 dark:border-slate-800 dark:bg-slate-900">
                              {accountsData?.accounts.map((acc) => (
                                <SelectItem
                                  key={acc.id}
                                  value={acc.id}
                                  className="font-medium text-slate-900 dark:text-slate-100"
                                >
                                  {acc.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="paymentDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                            Data do Pagamento
                          </FormLabel>
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

                  {/* ROW 2: Acréscimos e Descontos (JUROS, MULTA E DESCONTOS INDEPENDENTES) */}
                  <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-900/60 sm:grid-cols-3">
                    {/* Juros */}
                    <FormField
                      control={form.control}
                      name="interest"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                            Juros (R$)
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="0,00"
                              className="h-10 rounded-xl border-slate-200 bg-white font-mono text-xs font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {/* Multa */}
                    <FormField
                      control={form.control}
                      name="fine"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[11px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                            Multa (R$)
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="0,00"
                              className="h-10 rounded-xl border-slate-200 bg-white font-mono text-xs font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {/* Descontos */}
                    <FormField
                      control={form.control}
                      name="discounts"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                            Descontos (R$)
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="0,00"
                              className="h-10 rounded-xl border-slate-200 bg-white font-mono text-xs font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* ROW 3: Valor Efetivamente Pago */}
                  <div className="space-y-3">
                    <FormField
                      control={form.control}
                      name="paidAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                            Valor Pago (Efetivo)
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-base font-bold text-slate-400">
                                R$
                              </span>
                              <Input
                                {...field}
                                className="h-13 rounded-2xl border-slate-300 bg-white pl-12 font-mono text-2xl font-black text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Alerta de Pagamento Parcial */}
                    {isPartialActive && (
                      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 dark:border-amber-900/40">
                        <div className="flex items-start gap-3">
                          <Clock className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-400" />
                          <div className="flex-1 space-y-2">
                            <div>
                              <h4 className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-300">
                                Pagamento Parcial Detectado
                              </h4>
                              <p className="text-xs font-semibold text-amber-800 dark:text-amber-400">
                                Restará <strong className="font-mono">R$ {remainingAmount.toFixed(2)}</strong> pendente em nova parcela.
                              </p>
                            </div>

                            <FormField
                              control={form.control}
                              name="remainingDueDate"
                              render={({ field }) => (
                                <FormItem className="max-w-[240px]">
                                  <FormLabel className="text-[10px] font-black uppercase tracking-wider text-amber-900 dark:text-amber-300">
                                    Vencimento do Restante
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
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* SEÇÃO COMPROVANTE */}
            <div className="border-t border-slate-100 px-6 py-3 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                <Paperclip className="h-3.5 w-3.5 text-slate-400" />
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Comprovante Anexo (Opcional)
                </label>
              </div>
              <div className="mt-1.5">
                <FileUpload
                  onFileSelect={setReceiptFile}
                  currentFileUrl={transaction.attachment_url}
                />
              </div>
            </div>

            {/* FOOTER */}
            <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-900/90">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-11 rounded-xl border-slate-200 px-5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                disabled={isLoading || isUploading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading || isUploading}
                className={cn(
                  'h-11 rounded-xl px-6 text-xs font-black uppercase tracking-wider text-white shadow-md transition-all active:scale-95',
                  transaction.operation === 'income'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
                    : 'bg-red-600 hover:bg-red-700 shadow-red-600/25',
                )}
              >
                {isLoading || isUploading
                  ? 'Processando...'
                  : `Confirmar ${transaction.operation === 'income' ? 'Recebimento' : 'Pagamento'}`}
              </Button>
            </div>
          </form>
        </Form>

        <CreateAccountDialog
          open={openNewAccountModal}
          onOpenChange={setOpenNewAccountModal}
          onSuccess={(newAccount: any) => {
            if (newAccount?.id) {
              form.setValue('accountId', newAccount.id)
            }
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
