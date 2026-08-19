import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  FileCheck,
  Paperclip,
  Plus,
  Trash2,
  UploadCloud,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { getAccounts } from '@/api/get-accounts'
import { uploadFileTransaction } from '@/api/upload-file'
import { CreateAccountDialog } from '@/components/create-account-dialog'
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
  interest: z.string().optional(),
  fine: z.string().optional(),
  discounts: z.string().optional(),
  paidAmount: z
    .string()
    .min(1, 'Valor é obrigatório')
    .refine((val) => {
      const num = parseFloat(val.replace(',', '.'))
      return !isNaN(num) && num >= 0
    }, 'Valor deve ser maior ou igual a zero'),
  paymentDate: z.date({
    required_error: 'Data é obrigatória',
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
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isIncome = transaction.operation === 'income'

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

  // Total Calculado = Base + Juros + Multa - Descontos
  const calculatedTotal = Math.max(
    0,
    transactionAmount + interestNum + fineNum - discountsNum,
  )

  // Saldo Restante
  const remainingAmount = Math.max(0, calculatedTotal - paidAmountNum)
  const isPartialActive = remainingAmount > 0.01

  useEffect(() => {
    if (!isPartialActive) {
      form.setValue('remainingDueDate', undefined)
    }
  }, [isPartialActive, form])

  // Sincronização: se o usuário altera juros/multa/desconto, o valor pago acompanha o calculado
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
          toast.warning('Baixa realizada, mas falha ao enviar o comprovante.')
        } finally {
          setIsUploading(false)
        }
      }

      await onConfirm(confirmationPayload)
      form.reset()
      onOpenChange(false)
    } catch (error: any) {
      console.error('🔴 ERRO AO PROCESSAR BAIXA:', error)
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

  // Navegação intuitiva por tecla Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter') {
      const target = e.target as HTMLElement
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLSelectElement ||
        target.getAttribute('role') === 'combobox'
      ) {
        e.preventDefault()
        const formEl = e.currentTarget
        const inputs = Array.from(
          formEl.querySelectorAll(
            'input:not([type="hidden"]):not([disabled]), select:not([disabled]), button[role="combobox"]:not([disabled]), button[type="submit"]:not([disabled])',
          ),
        ) as HTMLElement[]
        const index = inputs.indexOf(target)
        if (index > -1 && index < inputs.length - 1) {
          inputs[index + 1].focus()
        }
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl overflow-hidden border border-slate-200 bg-white p-0 shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:rounded-2xl">
        {/* HEADER LIMPO */}
        <div
          className={cn(
            'flex items-center justify-between border-b px-6 py-4 transition-colors dark:border-slate-800',
            isIncome
              ? 'bg-emerald-500/10 dark:bg-emerald-950/20'
              : 'bg-red-500/10 dark:bg-red-950/20',
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-xl shadow-sm',
                isIncome
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  : 'bg-red-500/20 text-red-600 dark:text-red-400',
              )}
            >
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">
                {isIncome ? 'Confirmar Recebimento' : 'Confirmar Pagamento'}
              </DialogTitle>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {isIncome ? 'Recebimento de título e baixa em conta' : 'Baixa e liquidação financeira do título'}
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              'border px-3 py-1 text-[11px] font-black uppercase tracking-wider',
              isIncome
                ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                : 'border-red-500/30 bg-red-500/15 text-red-700 dark:text-red-300',
            )}
          >
            {isIncome ? 'Receita' : 'Despesa'}
          </Badge>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            onKeyDown={handleKeyDown}
            className="flex flex-col"
          >
            <div className="p-6">
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
                {/* ═════════════════════════════════════════════════════════════ */}
                {/* COLUNA ESQUERDA: CARD ÚNICO DE RESUMO & CÁLCULO UNIFICADO    */}
                {/* ═════════════════════════════════════════════════════════════ */}
                <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/80 p-4.5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 lg:col-span-5">
                  <div className="space-y-3.5">
                    {/* Título & Descrição */}
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Título
                      </span>
                      <p className="mt-0.5 line-clamp-2 text-sm font-bold leading-tight text-slate-900 dark:text-slate-100" title={transaction.description || ''}>
                        {transaction.description || 'Sem descrição'}
                      </p>
                    </div>

                    {/* Vencimento Original */}
                    <div className="flex items-center justify-between rounded-xl bg-white/70 px-3 py-2 text-xs font-semibold dark:bg-slate-800/60">
                      <span className="text-slate-500 dark:text-slate-400">Vencimento:</span>
                      <span className="flex items-center gap-1 font-bold text-slate-800 dark:text-slate-200">
                        <Calendar size={13} className="text-slate-400" />
                        {new Date(transaction.data_vencimento).toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    {/* Decomposição Contábil Compacta */}
                    <div className="space-y-1.5 border-t border-slate-200 pt-3 text-xs dark:border-slate-800">
                      <div className="flex items-center justify-between font-semibold text-slate-600 dark:text-slate-400">
                        <span>Valor Base:</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                          R$ {transactionAmount.toFixed(2)}
                        </span>
                      </div>

                      {interestNum > 0 && (
                        <div className="flex items-center justify-between font-semibold text-amber-600 dark:text-amber-400">
                          <span className="flex items-center gap-0.5"><ArrowUpRight size={12} /> Juros:</span>
                          <span className="font-mono font-bold">+ R$ {interestNum.toFixed(2)}</span>
                        </div>
                      )}

                      {fineNum > 0 && (
                        <div className="flex items-center justify-between font-semibold text-rose-600 dark:text-rose-400">
                          <span className="flex items-center gap-0.5"><ArrowUpRight size={12} /> Multa:</span>
                          <span className="font-mono font-bold">+ R$ {fineNum.toFixed(2)}</span>
                        </div>
                      )}

                      {discountsNum > 0 && (
                        <div className="flex items-center justify-between font-semibold text-emerald-600 dark:text-emerald-400">
                          <span className="flex items-center gap-0.5"><ArrowDownRight size={12} /> Desconto:</span>
                          <span className="font-mono font-bold">- R$ {discountsNum.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Total Calculado (Reflexo Visual Principal) */}
                  <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Total a {isIncome ? 'Receber' : 'Pagar'}
                    </span>
                    <p className={cn(
                      "mt-0.5 font-mono text-2xl font-black tracking-tight",
                      isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-slate-100"
                    )}>
                      R$ {calculatedTotal.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* ═════════════════════════════════════════════════════════════ */}
                {/* COLUNA DIREITA: FORMULÁRIO DE BAIXA HIERARQUIZADO            */}
                {/* ═════════════════════════════════════════════════════════════ */}
                <div className="flex flex-col justify-between gap-4 lg:col-span-7">
                  {/* LINHA 1: CONTA E DATA DO PAGAMENTO */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {/* Conta */}
                    <FormField
                      control={form.control}
                      name="accountId"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <div className="flex items-center justify-between">
                            <FormLabel className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                              Conta / Caixa
                            </FormLabel>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault()
                                setOpenNewAccountModal(true)
                              }}
                              className="text-[11px] font-bold text-blue-600 hover:underline dark:text-blue-400"
                            >
                              + Nova
                            </button>
                          </div>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white font-semibold text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
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

                    {/* Data do Pagamento */}
                    <FormField
                      control={form.control}
                      name="paymentDate"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                            Data da Operação
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

                  {/* LINHA 2: ACRÉSCIMOS E DEDUÇÕES (GRADE DE 3 COLUNAS PERFEITAS) */}
                  <div className="grid grid-cols-3 gap-2.5 rounded-2xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                    {/* Juros */}
                    <FormField
                      control={form.control}
                      name="interest"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="truncate text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400" title="Juros (R$)">
                            Juros (+)
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="0,00"
                              className="h-9 rounded-lg border-slate-200 bg-white font-mono text-xs font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
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
                        <FormItem className="space-y-1">
                          <FormLabel className="truncate text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400" title="Multa (R$)">
                            Multa (+)
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="0,00"
                              className="h-9 rounded-lg border-slate-200 bg-white font-mono text-xs font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {/* Desconto */}
                    <FormField
                      control={form.control}
                      name="discounts"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="truncate text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400" title="Desconto (R$)">
                            Desconto (-)
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="0,00"
                              className="h-9 rounded-lg border-slate-200 bg-white font-mono text-xs font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* LINHA 3: VALOR PAGO EFETIVO (O REFLEXO DO CÁLCULO) */}
                  <div className="space-y-2">
                    <FormField
                      control={form.control}
                      name="paidAmount"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <div className="flex items-center justify-between">
                            <FormLabel className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                              Valor {isIncome ? 'Recebido' : 'Pago'} Efetivo
                            </FormLabel>
                            {Math.abs(paidAmountNum - calculatedTotal) < 0.01 && calculatedTotal > 0 && (
                              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 size={13} /> 100% Liquidado
                              </span>
                            )}
                          </div>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-base font-bold text-slate-400">
                                R$
                              </span>
                              <Input
                                {...field}
                                className="h-12 rounded-xl border-2 border-slate-200 bg-white pl-11 font-mono text-xl font-black text-slate-900 transition-colors focus:border-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-400"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Alerta de Parcela Restante */}
                    {isPartialActive && (
                      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 dark:border-amber-900/40">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Clock size={16} className="text-amber-600 dark:text-amber-400" />
                            <span className="text-xs font-bold text-amber-900 dark:text-amber-300">
                              Restará <strong className="font-mono">R$ {remainingAmount.toFixed(2)}</strong>
                            </span>
                          </div>

                          <FormField
                            control={form.control}
                            name="remainingDueDate"
                            render={({ field }) => (
                              <FormItem className="max-w-[150px] space-y-0">
                                <FormControl>
                                  <SimpleCalendar
                                    selected={field.value}
                                    onSelect={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* LINHA 4: COMPROVANTE ULTRA COMPACTO (1 LINHA - ZERO DESPERDÍCIO DE ESPAÇO) */}
                  <div className="flex items-center justify-between rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-3.5 py-2 dark:border-slate-800 dark:bg-slate-900/40">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Paperclip size={14} className="shrink-0 text-slate-400" />
                      {receiptFile ? (
                        <span className="truncate text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          {receiptFile.name}
                        </span>
                      ) : transaction.attachment_url ? (
                        <span className="truncate text-xs font-semibold text-slate-600 dark:text-slate-400">
                          Comprovante já anexado
                        </span>
                      ) : (
                        <span className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                          Nenhum comprovante anexado
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*,.pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) setReceiptFile(file)
                        }}
                      />
                      {receiptFile ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setReceiptFile(null)}
                          className="h-7 px-2 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                        >
                          <Trash2 size={13} className="mr-1" /> Remover
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          className="h-7 rounded-lg border-slate-200 px-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          <UploadCloud size={13} className="mr-1" /> Anexar
                        </Button>
                      )}
                    </div>
                  </div>

                  {apiError && (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-2.5 text-xs font-bold text-red-600 dark:text-red-400">
                      <AlertTriangle className="mr-1.5 inline h-3.5 w-3.5" />
                      {apiError}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* FOOTER */}
            <div className="flex justify-end gap-2.5 border-t border-slate-100 bg-slate-50/80 px-6 py-3.5 dark:border-slate-800 dark:bg-slate-900/80">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-10 rounded-xl border-slate-200 px-4 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                disabled={isLoading || isUploading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading || isUploading}
                className={cn(
                  'h-10 rounded-xl px-5 text-xs font-black uppercase tracking-wider text-white shadow-md transition-all active:scale-95',
                  isIncome
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
                    : 'bg-red-600 hover:bg-red-700 shadow-red-600/25',
                )}
              >
                {isLoading || isUploading
                  ? 'Processando...'
                  : `Confirmar ${isIncome ? 'Recebimento' : 'Pagamento'}`}
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
