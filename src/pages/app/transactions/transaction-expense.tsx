import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Calendar as CalendarIcon,
  Camera,
  CreditCard,
  ListChecks,
  TrendingDown,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { createTransaction } from '@/api/create-transaction'
import { getCreditCards } from '@/api/credit-cards'
import { deleteSupplier } from '@/api/delete-supplier'
import { extractTransaction } from '@/api/extract-transaction'
import { getAccounts } from '@/api/get-accounts'
import { getSectors } from '@/api/get-sectors'
import { getSuppliers } from '@/api/get-suppliers'
import { listHolidays } from '@/api/hr/holidays'
import { uploadFileTransaction } from '@/api/upload-file'
import { CameraScanner } from '@/components/camera-scanner'
import { CreateAccountDialog } from '@/components/create-account-dialog'
import { CreateCreditCardDialog } from '@/components/create-credit-card-dialog'
import { CreateSectorDialog } from '@/components/create-sector-dialog'
import { ExtractionOverlay } from '@/components/extraction-overlay'
import { FileUpload } from '@/components/file-upload'
import {
  InstallmentItem,
  InstallmentPreviewDialog,
} from '@/components/installment-preview-dialog'
import {
  ExtractedData,
  ScannerConfirmationModal,
} from '@/components/scanner-confirmation-modal'
import { SupplierCombobox } from '@/components/supplier-combobox'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/custom-tabs'
import { Dialog } from '@/components/ui/dialog'
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
import { QuickAddSelect } from '@/components/ui/quick-add-select'
import {
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { API_BASE_URL } from '@/lib/axios'
import { calculateCreditCardDueDate } from '@/lib/credit-card-due-date'
import { cn } from '@/lib/utils'
import { SupplierFormDialog } from '@/pages/app/suppliers/supplier-form-dialog'

// Schema
const formSchema = z.object({
  data_vencimento: z.date({ required_error: 'Vencimento é obrigatório' }),
  data_emissao: z.date({ required_error: 'Emissão é obrigatória' }),
  description: z.string().optional(),
  account: z.string().optional(),
  sector: z.string().optional(),
  amount: z
    .string()
    .min(1, 'Valor é obrigatório')
    .refine(
      (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
      'Valor deve ser maior que zero',
    ),
  supplier: z.string().optional(),
  payment_method: z.string().optional(),
  confirmed: z.boolean().default(false),

  // Installments
  installments_count: z.string().optional(),
  interval_frequency: z.enum(['WEEKLY', 'MONTHLY', 'YEARLY']).optional(),

  custom_installments: z
    .array(
      z.object({
        data_vencimento: z.date(),
        data_emissao: z.date().optional(),
        amount: z.number(),
      }),
    )
    .optional(),
  credit_card_id: z.string().optional(),
  interest: z.string().optional(),
})

type FormSchemaType = z.infer<typeof formSchema>

export interface TransactionExpenseProps {
  open: boolean
  initialReceipt?: any
  onOpenChange?: (open: boolean) => void
}

export function TransactionExpense({
  open,
  initialReceipt,
  onOpenChange,
}: TransactionExpenseProps) {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'single' | 'installment'>('single')
  const [localReceipt, setLocalReceipt] = useState<any>(null)

  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const [isEmissaoPopoverOpen, setIsEmissaoPopoverOpen] = useState(false)
  const paymentMethodTriggerRef = useRef<HTMLButtonElement>(null)
  const frequencyTriggerRef = useRef<HTMLButtonElement>(null)
  const [previewInstallmentsOpen, setPreviewInstallmentsOpen] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null)
  const [confirmationOpen, setConfirmationOpen] = useState(false)

  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  // Bidirectional Calculator State
  const [installmentValue, setInstallmentValue] = useState<string>('')
  // Credit Card: label do mês de fatura calculado
  const [billingMonthLabel, setBillingMonthLabel] = useState<string | null>(
    null,
  )

  // Boleto Holiday Alert
  const [boletoAlertOpen, setBoletoAlertOpen] = useState(false)
  const [nextBusinessDay, setNextBusinessDay] = useState<Date | null>(null)
  const [lastAlertedDate, setLastAlertedDate] = useState<string | null>(null)

  function handleConfirmInstallments(installments: InstallmentItem[]) {
    // Sanitization: Remove visual/unique IDs from component, send only clean data
    const cleanInstallments = installments.map((i) => ({
      data_vencimento: i.date,
      data_emissao: new Date(),
      amount: i.amount,
    }))

    form.setValue('custom_installments', cleanInstallments)

    setPreviewInstallmentsOpen(false)
    // Trigger submit again with the data
    form.handleSubmit(onSubmit)()
  }

  // Quick Add Dialogs
  const [createAccountOpen, setCreateAccountOpen] = useState(false)
  const [createSectorOpen, setCreateSectorOpen] = useState(false)
  const [createCreditCardOpen, setCreateCreditCardOpen] = useState(false)
  const [supplierDialogOpen, setSupplierDialogOpen] = useState<{
    open: boolean
    id?: string
  }>({ open: false })

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      data_vencimento: new Date(),
      data_emissao: new Date(),
      description: '',
      account: localStorage.getItem('metrics-default-account') || '',
      sector: '',
      amount: '',
      confirmed: false,
      payment_method:
        localStorage.getItem('metrics-default-payment-method') || 'BOLETO',
      installments_count: '',
      interval_frequency: 'MONTHLY',
    },
  })

  // Reset on modal close
  useEffect(() => {
    if (!open) {
      form.reset()
      setActiveTab('single')
      setInstallmentValue('')
      setReceiptFile(null)
      setBillingMonthLabel(null)
      setLocalReceipt(null)
    } else if (initialReceipt) {
      form.setValue('description', initialReceipt.description)
      if (initialReceipt.value) {
        form.setValue('amount', initialReceipt.value.toString())
      }
      setLocalReceipt(initialReceipt)
    }
  }, [open, form, initialReceipt])

  // Queries
  const { data: sectors } = useQuery({
    queryKey: ['sectors'],
    queryFn: () => getSectors(),
  })

  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => getAccounts(),
  })

  const { data: suppliersResult } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => getSuppliers({ page: 1, perPage: 100 }), // Basic fetch for select
  })

  const { data: creditCardsData } = useQuery({
    queryKey: ['credit-cards'],
    queryFn: getCreditCards,
    staleTime: 10 * 60 * 1000,
  })

  const { data: holidaysData } = useQuery({
    queryKey: ['holidays', new Date().getFullYear()],
    queryFn: () => listHolidays(new Date().getFullYear()),
    staleTime: 10 * 60 * 1000,
  })

  // Watching Amount and Count for Preview
  const watchedAmount = useWatch({ control: form.control, name: 'amount' })
  const watchedCount = useWatch({
    control: form.control,
    name: 'installments_count',
  })
  const watchedPaymentMethod = useWatch({
    control: form.control,
    name: 'payment_method',
  })
  const watchedCreditCardId = useWatch({
    control: form.control,
    name: 'credit_card_id',
  })
  const watchedEmissao = useWatch({
    control: form.control,
    name: 'data_emissao',
  })
  const watchedVencimento = useWatch({
    control: form.control,
    name: 'data_vencimento',
  })

  const isCreditCard = watchedPaymentMethod === 'CREDIT_CARD'

  // Boleto Holiday Effect (Removed - agora fica no onSubmit)

  // Auto-calcular vencimento quando cartão, emissão ou método mudar
  useEffect(() => {
    if (!isCreditCard || !watchedCreditCardId || !watchedEmissao) {
      if (!isCreditCard) setBillingMonthLabel(null)
      return
    }
    const card = creditCardsData?.creditCards?.find(
      (c) => c.id === watchedCreditCardId,
    )
    if (!card) return

    const holidayStrings = (holidaysData?.holidays ?? [])
      .map((h: any) =>
        typeof h.date === 'string' ? h.date.substring(0, 10) : '',
      )
      .filter(Boolean)

    const result = calculateCreditCardDueDate(
      watchedEmissao,
      card,
      holidayStrings,
    )
    form.setValue('data_vencimento', result.due_date, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    })
    setBillingMonthLabel(result.billing_month_label)

    const matchingAccount = accounts?.accounts?.find(
      (acc) =>
        acc.id === card.account_id ||
        acc.name?.toLowerCase() === card.bank?.toLowerCase() ||
        acc.name?.toLowerCase() === card.name?.toLowerCase(),
    )

    if (matchingAccount) {
      form.setValue('account', matchingAccount.id, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      })
    }
  }, [
    isCreditCard,
    watchedCreditCardId,
    watchedEmissao,
    creditCardsData,
    holidaysData,
    accounts,
    form,
  ])

  // Sync Logic handled in Inputs onChange directly.

  const installmentPreview = (() => {
    if (activeTab === 'installment' && watchedAmount && watchedCount) {
      const amt = parseFloat(watchedAmount)
      const cnt = parseInt(watchedCount)
      if (!isNaN(amt) && !isNaN(cnt) && cnt > 0) {
        const val = amt / cnt
        return { count: cnt, value: val }
      }
    }
    return null
  })()

  // Mutations
  const { mutateAsync: createTransactionFn, isPending: isTransactionPending } =
    useMutation({
      mutationFn: createTransaction,
      onSuccess: () => {
        invalidateKeys()
      },
    })

  function invalidateKeys() {
    queryClient.invalidateQueries({ queryKey: ['sectors'] })
    queryClient.invalidateQueries({ queryKey: ['accounts'] })
    queryClient.invalidateQueries({ queryKey: ['transactions'] })
    queryClient.invalidateQueries({ queryKey: ['metrics'] })
    queryClient.invalidateQueries({ queryKey: ['payables'] })
  }

  const { mutateAsync: deleteSupplierFn } = useMutation({
    mutationFn: deleteSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })

  const handleDeleteSupplier = async (id: string) => {
    if (
      window.confirm(
        'Tem certeza que deseja excluir este fornecedor? As transações vinculadas perderão a referência, mas não serão apagadas.',
      )
    ) {
      try {
        await deleteSupplierFn(id)
        if (form.getValues('supplier') === id) {
          form.setValue('supplier', undefined)
        }
        toast.success('Fornecedor excluído com sucesso!')
      } catch (error) {
        toast.error('Erro ao excluir fornecedor.')
      }
    }
  }

  // Handle Submit
  async function onSubmit(data: FormSchemaType) {
    if (
      activeTab === 'installment' &&
      (!data.custom_installments || data.custom_installments.length === 0)
    ) {
      setPreviewInstallmentsOpen(true)
      return
    }

    // --- BOLETO HOLIDAY INTERCEPTOR ---
    const dateString = format(data.data_vencimento, 'yyyy-MM-dd')
    const isBoleto = data.payment_method === 'BOLETO'
    const holidaysList = (holidaysData?.holidays ?? [])
      .map((h: any) =>
        typeof h.date === 'string' ? h.date.substring(0, 10) : '',
      )
      .filter(Boolean)

    if (isBoleto && lastAlertedDate !== dateString) {
      const day = data.data_vencimento.getDay()
      const isWeekend = day === 0 || day === 6
      const isHoliday = holidaysList.includes(dateString)

      if (isWeekend || isHoliday) {
        setLastAlertedDate(dateString) // Evita loop infinito se o usuario manter

        const current = new Date(data.data_vencimento)
        while (true) {
          current.setDate(current.getDate() + 1)
          const d = current.getDay()
          const isWknd = d === 0 || d === 6
          const dStr = format(current, 'yyyy-MM-dd')
          if (!isWknd && !holidaysList.includes(dStr)) {
            setNextBusinessDay(new Date(current))
            setBoletoAlertOpen(true)
            return // Bloqueia este submit, aguardando resposta do modal
          }
        }
      }
    }
    // -----------------------------------

    try {
      const commonData = {
        description: data.description,
        amount: Number(data.amount),
        operation: 'expense' as const,
        account: data.account, // mapped to account_id or account generic
        sector: data.sector, // mapped to sector_id
        supplier: data.supplier,
        payment_method: data.payment_method,
        data_vencimento: data.data_vencimento,
        data_emissao: data.data_emissao,
      }

      // Single or Installment
      const isInstallment = activeTab === 'installment'

      // Final Sanitization before sending to API
      const cleanInstallments =
        isInstallment && data.custom_installments
          ? data.custom_installments.map((i) => ({
              data_vencimento: i.data_vencimento, // the InstallmentItem component is keeping it named 'date' under the hood
              data_emissao: data.data_emissao,
              amount: i.amount,
            }))
          : undefined

      const response = await createTransactionFn({
        ...commonData,
        confirmed: data.confirmed,
        installments_count: isInstallment
          ? Number(data.installments_count)
          : undefined,
        interval_frequency: isInstallment ? data.interval_frequency : undefined,
        custom_installments: cleanInstallments,
        credit_card_id: data.credit_card_id || null,
        interest: data.interest ? Number(data.interest) : undefined,
      })

      const transactionId = response.data?.transaction?.id || response.data?.id
      // Upload do arquivo pendente (vinculação)
      if (localReceipt && transactionId) {
        setIsUploading(true)
        try {
          await import('@/lib/axios').then((m) =>
            m.api.patch(
              `/uploads/receipts/${encodeURIComponent(localReceipt.filename)}/link/${transactionId}`,
              {},
            ),
          )
          invalidateKeys()
          queryClient.invalidateQueries({ queryKey: ['pending-receipts'] })
        } catch (uploadErr) {
          console.error('Erro ao vincular comprovante', uploadErr)
          toast.error('Despesa salva, mas falha ao vincular comprovante.')
        } finally {
          setIsUploading(false)
        }
      }
      // Upload de um novo arquivo, se houver
      else if (receiptFile && activeTab === 'single' && transactionId) {
        setIsUploading(true)
        try {
          await uploadFileTransaction(transactionId, receiptFile)
          invalidateKeys() // Revalidate to fetch the new attachment_url
        } catch (uploadErr) {
          console.error('Erro no upload', uploadErr)
          toast.error('Despesa salva, mas falha ao enviar comprovante.')
        } finally {
          setIsUploading(false)
        }
      }

      toast.success('Despesa registrada com sucesso!')

      // Reset
      form.reset({
        data_vencimento: new Date(),
        data_emissao: new Date(),
        description: '',
        account: localStorage.getItem('metrics-default-account') || '',
        sector: '',
        amount: '',
        confirmed: false,
        payment_method:
          localStorage.getItem('metrics-default-payment-method') || 'BOLETO',
        installments_count: '',
        interval_frequency: 'MONTHLY',
      })
      setActiveTab('single')
      setInstallmentValue('')
      setReceiptFile(null)

      onOpenChange?.(false)
    } catch (error) {
      console.error(error)
      toast.error('Erro ao registrar despesa.')
    }
  }

  const handleOpenScanner = () => {
    setExtractedData(null)
    setIsExtracting(false)
    setConfirmationOpen(false)
    setScannerOpen(true)
  }

  const handleScanSuccess = async (code: string) => {
    setIsExtracting(true)
    try {
      const result = await extractTransaction({ code })
      if (result.success) {
        setExtractedData(result.payload)
        setConfirmationOpen(true)
      } else {
        toast.error(
          'Não foi possível ler este código. Tente enquadrar melhor ou verifique a iluminação.',
          {
            duration: 4000,
          },
        )
      }
    } catch (error) {
      console.error(error)
      toast.error(
        'Não foi possível ler este código. Tente enquadrar melhor ou verifique a iluminação.',
        {
          duration: 4000,
        },
      )
    } finally {
      setIsExtracting(false)
    }
  }

  const applyExtractedData = (data: ExtractedData) => {
    if (data.amount > 0) {
      form.setValue('amount', data.amount.toString())
      const count = parseInt(form.getValues('installments_count') || '1')
      setInstallmentValue((data.amount / count).toFixed(2))
    }

    if (data.dueDate) {
      form.setValue('data_vencimento', new Date(data.dueDate))
    }

    if (data.description) {
      form.setValue('description', data.description)
    }

    if (data.type === 'PIX') {
      form.setValue('payment_method', 'PIX')
    } else if (data.type === 'BOLETO') {
      form.setValue('payment_method', 'BOLETO')
    }

    setConfirmationOpen(false)
    toast.success(`Dados de ${data.type} aplicados ao formulário!`)
  }

  const isPending = isTransactionPending || isUploading

  return (
    <ResponsiveDialogContent onInteractOutside={(e) => e.preventDefault()}>
      {/* ─── HEADER ─── */}
      <ResponsiveDialogHeader className="border-b border-border/50 px-6 pb-4 pt-4 md:pt-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/30">
            <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-500" />
          </div>
          <div>
            <ResponsiveDialogTitle className="text-xl font-bold leading-tight text-foreground">
              Nova Despesa
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
              Preencha os detalhes do pagamento.
            </ResponsiveDialogDescription>
          </div>
        </div>
      </ResponsiveDialogHeader>

      {/* ─── OVERLAY DE LOADING ─── */}
      <ExtractionOverlay isLoading={isExtracting} />

      <div className="flex-1 overflow-y-auto scroll-smooth px-6 pb-40 pt-4">
        {/* ─── TAB SELECTOR ─── */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            setActiveTab(v as any)
            if (v === 'installment') {
              form.setValue('confirmed', false)
            } else if (v === 'single') {
              form.setValue('confirmed', false)
            }
          }}
          className="mb-6 w-full"
        >
          <TabsList className="grid h-auto w-full grid-cols-2 rounded-2xl bg-muted/40 p-1.5">
            <TabsTrigger
              value="single"
              className="rounded-xl py-3 text-sm font-bold transition-all duration-200 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              À Vista
            </TabsTrigger>
            <TabsTrigger
              value="installment"
              className="rounded-xl py-3 text-sm font-bold transition-all duration-200 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              Recorrente
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            onKeyDown={(e) => {
              if (
                e.key === 'Enter' &&
                (e.target instanceof HTMLInputElement ||
                  e.target instanceof HTMLSelectElement ||
                  (e.target as HTMLElement).getAttribute('role') ===
                    'combobox' ||
                  (e.target as HTMLElement).getAttribute('aria-haspopup') ===
                    'dialog' ||
                  (e.target as HTMLElement).getAttribute('role') === 'switch')
              ) {
                e.preventDefault()
                const inputs = Array.from(
                  e.currentTarget.querySelectorAll(
                    'input:not([type="hidden"]):not([disabled]):not([tabindex="-1"]), select:not([disabled]):not([tabindex="-1"]), button[role="combobox"]:not([disabled]):not([tabindex="-1"]), button[aria-haspopup="dialog"]:not([disabled]):not([tabindex="-1"]), button[role="switch"]:not([disabled]):not([tabindex="-1"]), button[type="submit"]:not([disabled]):not([tabindex="-1"])',
                  ),
                ) as HTMLElement[]
                const index = inputs.indexOf(e.target as HTMLElement)
                if (index > -1 && index < inputs.length - 1) {
                  const nextElement = inputs[index + 1]
                  if (nextElement) nextElement.focus()
                }
              }
            }}
            className="flex flex-col gap-5"
          >
            {/* ─── GRUPO 1: VALOR E STATUS / RECORRÊNCIA ─── */}
            {activeTab === 'single' ? (
              <div
                className={cn(
                  'grid grid-cols-1 items-end gap-4',
                  localReceipt
                    ? 'sm:grid-cols-[1fr,150px,200px]'
                    : 'sm:grid-cols-[1fr,200px]',
                )}
              >
                {/* VALOR */}
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem className="flex-1 space-y-1.5">
                      <FormLabel className="ml-0.5 flex items-center text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                        <span>Valor da Despesa</span>
                        <span className="ml-1 font-bold text-red-500">*</span>
                      </FormLabel>
                      <div className="flex w-full items-center gap-3 rounded-2xl border-2 border-border/60 bg-background px-5 py-8 transition-all duration-200 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-500/10 md:py-3.5">
                        <span className="flex-shrink-0 select-none text-xl font-semibold text-slate-400 dark:text-slate-500">
                          R$
                        </span>
                        <FormControl>
                          <input
                            {...field}
                            onChange={(e) => {
                              field.onChange(e)
                              const val = parseFloat(e.target.value) || 0
                              const count =
                                parseInt(
                                  form.getValues('installments_count') || '1',
                                ) || 1
                              if (!isNaN(val) && !isNaN(count) && count > 0) {
                                setInstallmentValue((val / count).toFixed(2))
                              } else {
                                setInstallmentValue('')
                              }
                            }}
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            placeholder="0,00"
                            className="w-full bg-transparent text-4xl font-extrabold tabular-nums tracking-tight text-slate-800 caret-red-500 placeholder:text-slate-200 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-700"
                            autoFocus
                          />
                        </FormControl>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-14 w-14 rounded-2xl bg-red-50/50 text-red-600 hover:bg-red-50 hover:text-red-700 dark:bg-red-900/20 dark:text-red-500 dark:hover:bg-red-900/40 dark:hover:text-red-400 lg:hidden"
                          onClick={handleOpenScanner}
                        >
                          <Camera className="h-7 w-7" />
                        </Button>
                      </div>
                    </FormItem>
                  )}
                />

                {localReceipt && (
                  <FormField
                    control={form.control}
                    name="interest"
                    render={({ field }) => (
                      <FormItem className="flex-1 space-y-1.5">
                        <FormLabel className="ml-0.5 text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                          Juros
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-medium text-slate-400 dark:text-slate-500">
                              R$
                            </span>
                            <Input
                              {...field}
                              type="number"
                              inputMode="decimal"
                              step="0.01"
                              placeholder="0,00"
                              className="h-[72px] rounded-xl border-border/70 bg-background pl-9 text-base font-medium"
                            />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="confirmed"
                  render={({ field }) => (
                    <FormItem className="flex h-[72px] flex-row items-center justify-between space-y-0 rounded-xl border border-border/60 bg-muted/20 px-4 sm:mb-0">
                      <FormLabel className="flex cursor-pointer items-center text-sm font-bold uppercase tracking-tight text-slate-600 dark:text-slate-400">
                        <span>{field.value ? '✓ Já Paguei' : 'A Pagar'}</span>
                      </FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="data-[state=checked]:bg-red-600"
                          onKeyDown={(e) => {
                            if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                              e.preventDefault()
                              field.onChange(false)
                            } else if (
                              e.key === 'ArrowRight' ||
                              e.key === 'ArrowDown'
                            ) {
                              e.preventDefault()
                              field.onChange(true)
                            }
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            ) : (
              <div className="relative mt-2 grid grid-cols-1 gap-4 rounded-xl border border-dashed border-border/60 bg-slate-50 p-5 dark:bg-slate-800/40 sm:grid-cols-2 lg:grid-cols-4">
                <span className="absolute -top-3.5 left-4 rounded-full border bg-background px-2 text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Condição de Pagamento
                </span>

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">
                        Valor Total <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-medium text-slate-400 dark:text-slate-500">
                            R$
                          </span>
                          <Input
                            {...field}
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            placeholder="0.00"
                            className="h-12 rounded-xl border-border/70 bg-background pl-9 text-base font-medium"
                            onChange={(e) => {
                              field.onChange(e)
                              const val = parseFloat(e.target.value) || 0
                              const count =
                                parseInt(
                                  form.getValues('installments_count') || '1',
                                ) || 1
                              if (!isNaN(val) && !isNaN(count) && count > 0) {
                                setInstallmentValue((val / count).toFixed(2))
                              } else {
                                setInstallmentValue('')
                              }
                            }}
                          />
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormItem className="space-y-1.5">
                  <FormLabel className="text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">
                    Valor / Parcela
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-medium text-slate-400 dark:text-slate-500">
                        R$
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={installmentValue}
                        className="h-12 rounded-xl border-border/70 bg-background pl-9 text-base font-medium"
                        onChange={(e) => {
                          const val = e.target.value
                          setInstallmentValue(val)
                          const instVal = parseFloat(val) || 0
                          const count =
                            parseInt(
                              form.getValues('installments_count') || '1',
                            ) || 1
                          if (!isNaN(instVal) && !isNaN(count) && count > 0) {
                            form.setValue(
                              'amount',
                              (instVal * count).toFixed(2),
                              { shouldValidate: true },
                            )
                          }
                        }}
                      />
                    </div>
                  </FormControl>
                </FormItem>

                <FormField
                  control={form.control}
                  name="installments_count"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">
                        Repetições
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          inputMode="numeric"
                          placeholder="12"
                          className="h-12 rounded-xl border-border/70 bg-background text-center text-base font-medium"
                          onChange={(e) => {
                            field.onChange(e)
                            const count = parseInt(e.target.value) || 1
                            const total =
                              parseFloat(form.getValues('amount') || '0') || 0
                            if (!isNaN(total) && !isNaN(count) && count > 0) {
                              setInstallmentValue((total / count).toFixed(2))
                            }
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="interval_frequency"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">
                        Frequência
                      </FormLabel>
                      <Select
                        onValueChange={(val) => {
                          field.onChange(val)
                          setTimeout(() => {
                            if (frequencyTriggerRef.current) {
                              const form = frequencyTriggerRef.current.closest('form')
                              if (form) {
                                const inputs = Array.from(
                                  form.querySelectorAll(
                                    'input:not([type="hidden"]):not([disabled]):not([tabindex="-1"]), select:not([disabled]):not([tabindex="-1"]), button[role="combobox"]:not([disabled]):not([tabindex="-1"]), button[aria-haspopup="dialog"]:not([disabled]):not([tabindex="-1"]), button[role="switch"]:not([disabled]):not([tabindex="-1"]), button[type="submit"]:not([disabled]):not([tabindex="-1"])',
                                  ),
                                ) as HTMLElement[]
                                const index = inputs.indexOf(frequencyTriggerRef.current)
                                if (index > -1 && index < inputs.length - 1) {
                                  const nextElement = inputs[index + 1]
                                  if (nextElement) nextElement.focus()
                                }
                              }
                            }
                          }, 50)
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger ref={frequencyTriggerRef} className="h-12 rounded-xl border-border/70 bg-background text-base font-medium">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent withPortal={false}>
                          <SelectItem value="WEEKLY">Semanal</SelectItem>
                          <SelectItem value="MONTHLY">Mensal</SelectItem>
                          <SelectItem value="YEARLY">Anual</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* ─── GRUPO 2: DETALHES (Descrição / Observação) ─── */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="flex items-center text-sm font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">
                    <span>Descrição / Observação</span>
                    <span className="ml-1 font-bold text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Ex: Aluguel do escritório..."
                      className="h-14 rounded-2xl border-border/70 bg-background text-base font-medium placeholder:text-muted-foreground/50 focus-visible:border-red-500 focus-visible:ring-red-500/30 md:h-12 md:rounded-xl"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* ─── SEPARADOR ─── */}
            <div className="-mx-1 border-t border-border/40" />

            {/* ─── GRUPO 3: DATAS ─── */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Emissão */}
              <FormField
                control={form.control}
                name="data_emissao"
                render={({ field }) => (
                  <FormItem className="flex flex-col gap-1.5">
                    <FormLabel className="flex items-center text-sm font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">
                      <span>Emissão</span>
                      <span className="ml-1 font-bold text-red-500">*</span>
                    </FormLabel>
                    <Popover
                      modal={false}
                      open={isEmissaoPopoverOpen}
                      onOpenChange={setIsEmissaoPopoverOpen}
                    >
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            type="button"
                            onFocus={() => setIsEmissaoPopoverOpen(true)}
                            className={cn(
                              'h-14 w-full justify-start rounded-2xl border-border/70 bg-background text-left text-base font-medium transition-colors hover:border-border hover:bg-muted/30 md:h-12 md:rounded-xl',
                              !field.value && 'text-muted-foreground',
                            )}
                            onKeyDown={(e) => {
                              if (e.key === 'ArrowUp') {
                                e.preventDefault()
                                const d = field.value
                                  ? new Date(field.value)
                                  : new Date()
                                d.setDate(d.getDate() - 1)
                                field.onChange(d)
                              } else if (e.key === 'ArrowDown') {
                                e.preventDefault()
                                const d = field.value
                                  ? new Date(field.value)
                                  : new Date()
                                d.setDate(d.getDate() + 1)
                                field.onChange(d)
                              }
                            }}
                          >
                            <CalendarIcon className="mr-2 h-5 w-5 flex-shrink-0 text-slate-400" />
                            {field.value ? (
                              format(field.value, 'dd/MM/yyyy')
                            ) : (
                              <span>Selecione</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent
                        className="z-[9999] w-auto p-0"
                        align="start"
                        style={{ pointerEvents: 'auto' }}
                      >
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            if (date) {
                              field.onChange(date)
                              setIsEmissaoPopoverOpen(false)
                            }
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </FormItem>
                )}
              />

              {/* Vencimento */}
              <FormField
                control={form.control}
                name="data_vencimento"
                render={({ field }) => (
                  <FormItem className="flex flex-col gap-1.5">
                    <FormLabel className="flex items-center justify-between text-sm font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">
                      <span className="flex items-center">
                        <span>Vencimento</span>
                        <span className="ml-1 font-bold text-red-500">*</span>
                      </span>
                      {isCreditCard && billingMonthLabel && (
                        <span className="text-xs font-semibold lowercase tracking-normal text-red-600">
                          Fatura {billingMonthLabel}
                        </span>
                      )}
                    </FormLabel>
                    <Popover
                      modal={false}
                      open={isPopoverOpen}
                      onOpenChange={setIsPopoverOpen}
                    >
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            type="button"
                            disabled={isCreditCard}
                            onFocus={() => setIsPopoverOpen(true)}
                            className={cn(
                              'h-14 w-full justify-start rounded-2xl border-border/70 bg-background text-left text-base font-medium transition-colors hover:border-border hover:bg-muted/30 md:h-12 md:rounded-xl',
                              !field.value && 'text-muted-foreground',
                              isCreditCard &&
                                'border-dashed bg-slate-50 text-slate-700 opacity-80 dark:bg-slate-900/40 dark:text-slate-300',
                            )}
                            onKeyDown={(e) => {
                              if (isCreditCard) return
                              if (e.key === 'ArrowUp') {
                                e.preventDefault()
                                const d = field.value
                                  ? new Date(field.value)
                                  : new Date()
                                d.setDate(d.getDate() - 1)
                                field.onChange(d)
                              } else if (e.key === 'ArrowDown') {
                                e.preventDefault()
                                const d = field.value
                                  ? new Date(field.value)
                                  : new Date()
                                d.setDate(d.getDate() + 1)
                                field.onChange(d)
                              }
                            }}
                          >
                            <CalendarIcon className="mr-2 h-5 w-5 flex-shrink-0 text-slate-400" />
                            {field.value ? (
                              format(field.value, 'dd/MM/yyyy')
                            ) : (
                              <span>Selecione</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent
                        className="z-[9999] w-auto p-0"
                        align="start"
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
                        />
                      </PopoverContent>
                    </Popover>
                  </FormItem>
                )}
              />
            </div>

            {/* ─── SEPARADOR ─── */}
            <div className="-mx-1 border-t border-border/40" />

            {/* ─── GRUPO 4: ENTIDADES (Fornecedor, Categoria, Conta) ─── */}
            <div className="grid grid-cols-1 gap-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {/* Supplier */}
                <FormField
                  control={form.control}
                  name="supplier"
                  render={({ field: { onChange, value } }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-sm font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">
                        Fornecedor
                      </FormLabel>
                      <SupplierCombobox
                        value={value}
                        onSelect={onChange}
                        suppliers={suppliersResult?.suppliers}
                        isLoading={!suppliersResult}
                        onQuickAdd={() => setSupplierDialogOpen({ open: true })}
                        onEditInfo={(id) =>
                          setSupplierDialogOpen({ open: true, id })
                        }
                        onDeleteInfo={handleDeleteSupplier}
                      />
                    </FormItem>
                  )}
                />

                {/* Payment Method */}
                <div className="flex flex-col gap-4">
                  <FormField
                    control={form.control}
                    name="payment_method"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-sm font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">
                          Forma de Pagamento
                        </FormLabel>
                        <Select
                          onValueChange={(val) => {
                            field.onChange(val)
                            setTimeout(() => {
                              if (paymentMethodTriggerRef.current) {
                                const form = paymentMethodTriggerRef.current.closest('form')
                                if (form) {
                                  const inputs = Array.from(
                                    form.querySelectorAll(
                                      'input:not([type="hidden"]):not([disabled]):not([tabindex="-1"]), select:not([disabled]):not([tabindex="-1"]), button[role="combobox"]:not([disabled]):not([tabindex="-1"]), button[aria-haspopup="dialog"]:not([disabled]):not([tabindex="-1"]), button[role="switch"]:not([disabled]):not([tabindex="-1"]), button[type="submit"]:not([disabled]):not([tabindex="-1"])',
                                    ),
                                  ) as HTMLElement[]
                                  const index = inputs.indexOf(paymentMethodTriggerRef.current)
                                  if (index > -1 && index < inputs.length - 1) {
                                    const nextElement = inputs[index + 1]
                                    if (nextElement) nextElement.focus()
                                  }
                                }
                              }
                            }, 50)
                          }}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger ref={paymentMethodTriggerRef} className="h-12 rounded-xl border-border/70 bg-background text-base font-medium">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="BOLETO">Boleto</SelectItem>
                            <SelectItem value="PIX">Pix</SelectItem>
                            <SelectItem value="CREDIT_CARD">
                              Cartão de Crédito
                            </SelectItem>
                            <SelectItem value="DEBIT_CARD">
                              Cartão de Débito
                            </SelectItem>
                            <SelectItem value="CASH">Dinheiro</SelectItem>
                            <SelectItem value="CHECK">Cheque</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  {isCreditCard && (
                    <FormField
                      control={form.control}
                      name="credit_card_id"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-sm font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">
                            Cartão de Crédito
                          </FormLabel>
                          <QuickAddSelect
                            value={field.value || ''}
                            onValueChange={(val) => {
                              field.onChange(val)
                              const card = creditCardsData?.creditCards?.find(
                                (c) => c.id === val,
                              )
                              if (card) {
                                const matchingAccount =
                                  accounts?.accounts?.find(
                                    (acc) =>
                                      acc.id === card.account_id ||
                                      acc.name?.toLowerCase() ===
                                        card.bank?.toLowerCase() ||
                                      acc.name?.toLowerCase() ===
                                        card.name?.toLowerCase(),
                                  )
                                if (matchingAccount) {
                                  form.setValue('account', matchingAccount.id, {
                                    shouldValidate: true,
                                    shouldDirty: true,
                                    shouldTouch: true,
                                  })
                                }
                                if (watchedEmissao) {
                                  const holidayStrings = (
                                    holidaysData?.holidays ?? []
                                  )
                                    .map((h: any) =>
                                      typeof h.date === 'string'
                                        ? h.date.substring(0, 10)
                                        : '',
                                    )
                                    .filter(Boolean)
                                  const result = calculateCreditCardDueDate(
                                    watchedEmissao,
                                    card,
                                    holidayStrings,
                                  )
                                  form.setValue(
                                    'data_vencimento',
                                    result.due_date,
                                    {
                                      shouldValidate: true,
                                      shouldDirty: true,
                                      shouldTouch: true,
                                    },
                                  )
                                  setBillingMonthLabel(
                                    result.billing_month_label,
                                  )
                                }
                              }
                            }}
                            isLoading={!creditCardsData}
                            placeholder="Selecione o cartão..."
                            emptyMessage="Nenhum cartão cadastrado"
                            options={creditCardsData?.creditCards?.map(
                              (card) => ({
                                label: `${card.name} (${card.bank})`,
                                value: card.id,
                              }),
                            )}
                            quickAddLabel="Novo Cartão de Crédito"
                            onQuickAddClick={() =>
                              setCreateCreditCardOpen(true)
                            }
                          />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {/* Sector */}
                <FormField
                  control={form.control}
                  name="sector"
                  render={({ field: { onChange, value, disabled } }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="flex items-center text-sm font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">
                        <span>Categoria</span>
                        <span className="ml-1 font-bold text-red-500">*</span>
                      </FormLabel>
                      <QuickAddSelect
                        value={value || ''}
                        onValueChange={onChange}
                        disabled={disabled}
                        isLoading={!sectors}
                        placeholder="Selecione..."
                        emptyMessage="Nenhuma categoria encontrada"
                        options={sectors?.data?.sectors
                          ?.filter((sector) => sector.type === 'out')
                          .map((sector) => ({
                            label: sector.name,
                            value: sector.id,
                          }))}
                        quickAddLabel="Nova Categoria"
                        onQuickAddClick={() => setCreateSectorOpen(true)}
                      />
                    </FormItem>
                  )}
                />

                {/* Account */}
                <FormField
                  control={form.control}
                  name="account"
                  render={({ field: { onChange, value, disabled } }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="flex items-center text-sm font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">
                        <span>Conta</span>
                        <span className="ml-1 font-bold text-red-500">*</span>
                      </FormLabel>
                      <QuickAddSelect
                        value={value || ''}
                        onValueChange={onChange}
                        disabled={disabled}
                        isLoading={!accounts}
                        placeholder="Selecione..."
                        emptyMessage="Nenhuma conta encontrada"
                        options={accounts?.accounts?.map((account) => ({
                          label: account.name,
                          value: account.id,
                        }))}
                        quickAddLabel="Nova Conta"
                        onQuickAddClick={() => setCreateAccountOpen(true)}
                      />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* ─── FILE UPLOAD (Anexo) ─── */}
            {activeTab === 'single' && (
              <div className="mt-2">
                <FormLabel className="mb-2 block text-sm font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">
                  Comprovante
                </FormLabel>
                <FileUpload
                  onFileSelect={setReceiptFile}
                  currentFileUrl={
                    localReceipt ? `${API_BASE_URL}${localReceipt.url}` : null
                  }
                  onRemoveExistingFile={() => {
                    setLocalReceipt(null)
                  }}
                />
              </div>
            )}

            {/* ─── AÇÕES ─── */}
            <div className="mt-2 flex flex-col-reverse gap-3 border-t border-border/40 pt-4 sm:flex-row sm:justify-end">
              <ResponsiveDialogClose asChild>
                <Button
                  variant="outline"
                  type="button"
                  className="h-11 w-full rounded-xl border-border/70 text-sm font-semibold text-slate-600 hover:bg-muted/50 hover:text-foreground dark:text-slate-400 sm:w-auto"
                >
                  Cancelar
                </Button>
              </ResponsiveDialogClose>
              <Button
                type="submit"
                disabled={isPending}
                className="h-11 w-full rounded-xl bg-red-600 text-sm font-bold text-white shadow-md shadow-red-500/20 transition-all hover:scale-[1.01] hover:bg-red-700 active:scale-[0.99] sm:w-auto"
              >
                {isPending ? (
                  'Salvando...'
                ) : activeTab === 'installment' ? (
                  <>
                    <ListChecks className="mr-2 h-4 w-4" />
                    Conferir Recorrência
                  </>
                ) : (
                  'Confirmar Despesa'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>

      {/* ─── DIALOGS AUXILIARES ─── */}
      <InstallmentPreviewDialog
        open={previewInstallmentsOpen}
        onOpenChange={setPreviewInstallmentsOpen}
        totalAmount={Number(form.getValues('amount')) || 0}
        installmentsCount={Number(form.getValues('installments_count')) || 1}
        frequency={form.getValues('interval_frequency') || 'MONTHLY'}
        startDate={form.getValues('data_vencimento') || new Date()}
        originalEmissao={form.getValues('data_emissao') || new Date()}
        creditCard={
          isCreditCard
            ? creditCardsData?.creditCards?.find(
                (c: any) => c.id === watchedCreditCardId,
              )
            : undefined
        }
        holidays={(holidaysData?.holidays ?? [])
          .map((h: any) =>
            typeof h.date === 'string' ? h.date.substring(0, 10) : '',
          )
          .filter(Boolean)}
        variant="expense"
        onConfirm={handleConfirmInstallments}
      />

      <CreateAccountDialog
        open={createAccountOpen}
        onOpenChange={setCreateAccountOpen}
      />

      <CreateSectorDialog
        open={createSectorOpen}
        onOpenChange={setCreateSectorOpen}
      />

      <CreateCreditCardDialog
        open={createCreditCardOpen}
        onOpenChange={setCreateCreditCardOpen}
        onSuccess={(card) => {
          form.setValue('credit_card_id', card.id, { shouldValidate: true })
        }}
      />

      <Dialog
        open={supplierDialogOpen.open}
        onOpenChange={(open) =>
          setSupplierDialogOpen({
            open,
            id: open ? supplierDialogOpen.id : undefined,
          })
        }
      >
        <SupplierFormDialog
          supplierToEdit={
            supplierDialogOpen.id
              ? suppliersResult?.suppliers?.find(
                  (s) => s.id === supplierDialogOpen.id,
                )
              : null
          }
          onOpenChange={(open) =>
            setSupplierDialogOpen({
              open,
              id: open ? supplierDialogOpen.id : undefined,
            })
          }
        />
      </Dialog>

      {scannerOpen && (
        <CameraScanner
          open={scannerOpen}
          onOpenChange={setScannerOpen}
          onScanSuccess={handleScanSuccess}
          defaultMode="boleto"
          forceLandscape={true}
        />
      )}

      {confirmationOpen && extractedData && (
        <ScannerConfirmationModal
          open={confirmationOpen}
          onOpenChange={setConfirmationOpen}
          data={extractedData}
          onConfirm={applyExtractedData}
        />
      )}

      {/* BOLETO HOLIDAY ALERT */}
      <AlertDialog open={boletoAlertOpen} onOpenChange={setBoletoAlertOpen}>
        <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-extrabold tracking-tight">
              Vencimento em dia não útil
            </AlertDialogTitle>
            <AlertDialogDescription>
              O vencimento deste boleto cai em um fim de semana ou feriado.
              Deseja alterar o vencimento para o próximo dia útil (
              {nextBusinessDay ? format(nextBusinessDay, 'dd/MM/yyyy') : ''})?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="rounded-xl font-bold"
              onClick={() => {
                // Ao cancelar (manter), chama o submit de novo pois lastAlertedDate já autoriza
                setTimeout(() => form.handleSubmit(onSubmit)(), 0)
              }}
            >
              Manter Vencimento
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-slate-900 font-bold text-white hover:bg-slate-800"
              onClick={() => {
                if (nextBusinessDay) {
                  form.setValue('data_vencimento', nextBusinessDay, {
                    shouldValidate: true,
                  })
                  setLastAlertedDate(format(nextBusinessDay, 'yyyy-MM-dd'))
                  setTimeout(() => form.handleSubmit(onSubmit)(), 0)
                }
              }}
            >
              Alterar para dia útil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ResponsiveDialogContent>
  )
}
