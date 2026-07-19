import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Calendar as CalendarIcon,
  TrendingDown,
  ListChecks,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Camera } from 'lucide-react'

import { createTransaction } from '@/api/create-transaction'
import { extractTransaction } from '@/api/extract-transaction'
import { getAccounts } from '@/api/get-accounts'
import { API_BASE_URL } from '@/lib/axios'
import { getSectors } from '@/api/get-sectors'
import { getSuppliers } from '@/api/get-suppliers'
import { deleteSupplier } from '@/api/delete-supplier'

import { CreateAccountDialog } from '@/components/create-account-dialog'
import { CreateSectorDialog } from '@/components/create-sector-dialog'
import { CreateCreditCardDialog } from '@/components/create-credit-card-dialog'
import { SupplierFormDialog } from '@/pages/app/suppliers/supplier-form-dialog'
import { QuickAddSelect } from '@/components/ui/quick-add-select'
import { SupplierCombobox } from '@/components/supplier-combobox'
import { FileUpload } from '@/components/file-upload'
import { uploadFileTransaction } from '@/api/upload-file'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { InstallmentPreviewDialog, InstallmentItem } from '@/components/installment-preview-dialog'
import {
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogClose
} from '@/components/ui/responsive-dialog'
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
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/custom-tabs'
import { cn } from '@/lib/utils'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog } from '@/components/ui/dialog'
import { CameraScanner } from '@/components/camera-scanner'
import { ScannerConfirmationModal, ExtractedData } from '@/components/scanner-confirmation-modal'
import { ExtractionOverlay } from '@/components/extraction-overlay'
import { getCreditCards } from '@/api/credit-cards'
import { calculateCreditCardDueDate } from '@/lib/credit-card-due-date'
import { listHolidays } from '@/api/hr/holidays'
import { CreditCard } from 'lucide-react'

// Schema
const formSchema = z.object({
  data_vencimento: z.date({ required_error: "Vencimento é obrigatório" }),
  data_emissao: z.date({ required_error: "Emissão é obrigatória" }),
  description: z.string().optional(),
  account: z.string().optional(),
  sector: z.string().optional(),
  amount: z.string().min(1, "Valor é obrigatório").refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    "Valor deve ser maior que zero"
  ),
  supplier: z.string().optional(),
  payment_method: z.string().optional(),
  confirmed: z.boolean().default(false),

  // Installments
  installments_count: z.string().optional(),
  interval_frequency: z.enum(['WEEKLY', 'MONTHLY', 'YEARLY']).optional(),

  custom_installments: z.array(z.object({
    data_vencimento: z.date(),
    data_emissao: z.date().optional(),
    amount: z.number()
  })).optional(),
  credit_card_id: z.string().optional(),
  interest: z.string().optional(),
})

type FormSchemaType = z.infer<typeof formSchema>

export interface TransactionExpenseProps {
  open: boolean
  initialReceipt?: any
  onOpenChange?: (open: boolean) => void
}

export function TransactionExpense({ open, initialReceipt, onOpenChange }: TransactionExpenseProps) {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'single' | 'installment'>('single')
  const [localReceipt, setLocalReceipt] = useState<any>(null)

  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const [isEmissaoPopoverOpen, setIsEmissaoPopoverOpen] = useState(false)
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
  const [billingMonthLabel, setBillingMonthLabel] = useState<string | null>(null)

  // Boleto Holiday Alert
  const [boletoAlertOpen, setBoletoAlertOpen] = useState(false)
  const [nextBusinessDay, setNextBusinessDay] = useState<Date | null>(null)
  const [lastAlertedDate, setLastAlertedDate] = useState<string | null>(null)

  function handleConfirmInstallments(installments: InstallmentItem[]) {
    // Sanitization: Remove visual/unique IDs from component, send only clean data
    const cleanInstallments = installments.map(i => ({
      data_vencimento: i.date,
      data_emissao: new Date(),
      amount: i.amount
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
  const [supplierDialogOpen, setSupplierDialogOpen] = useState<{ open: boolean, id?: string }>({ open: false })

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
      payment_method: localStorage.getItem('metrics-default-payment-method') || 'BOLETO',
      installments_count: '',
      interval_frequency: 'MONTHLY'
    }
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
    staleTime: 10 * 60 * 1000
  })

  const { data: holidaysData } = useQuery({
    queryKey: ['holidays', new Date().getFullYear()],
    queryFn: () => listHolidays(new Date().getFullYear()),
    staleTime: 10 * 60 * 1000
  })

  // Watching Amount and Count for Preview
  const watchedAmount = useWatch({ control: form.control, name: 'amount' })
  const watchedCount = useWatch({ control: form.control, name: 'installments_count' })
  const watchedPaymentMethod = useWatch({ control: form.control, name: 'payment_method' })
  const watchedCreditCardId = useWatch({ control: form.control, name: 'credit_card_id' })
  const watchedEmissao = useWatch({ control: form.control, name: 'data_emissao' })
  const watchedVencimento = useWatch({ control: form.control, name: 'data_vencimento' })

  const isCreditCard = watchedPaymentMethod === 'CREDIT_CARD'

  // Boleto Holiday Effect (Removed - agora fica no onSubmit)

  // Auto-calcular vencimento quando cartão, emissão ou método mudar
  useEffect(() => {
    if (!isCreditCard || !watchedCreditCardId || !watchedEmissao) {
      if (!isCreditCard) setBillingMonthLabel(null)
      return
    }
    const card = creditCardsData?.creditCards?.find(c => c.id === watchedCreditCardId)
    if (!card) return

    const holidayStrings = (holidaysData?.holidays ?? []).map((h: any) =>
      typeof h.date === 'string' ? h.date.substring(0, 10) : ''
    ).filter(Boolean)

    const result = calculateCreditCardDueDate(watchedEmissao, card, holidayStrings)
    form.setValue('data_vencimento', result.due_date, { shouldValidate: true, shouldDirty: true, shouldTouch: true })
    setBillingMonthLabel(result.billing_month_label)
    
    const matchingAccount = accounts?.accounts?.find(acc => 
      acc.id === card.account_id || 
      acc.name?.toLowerCase() === card.bank?.toLowerCase() || 
      acc.name?.toLowerCase() === card.name?.toLowerCase()
    )

    if (matchingAccount) {
      form.setValue('account', matchingAccount.id, { shouldValidate: true, shouldDirty: true, shouldTouch: true })
    }
  }, [isCreditCard, watchedCreditCardId, watchedEmissao, creditCardsData, holidaysData, accounts, form])

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
  const { mutateAsync: createTransactionFn, isPending: isTransactionPending } = useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      invalidateKeys()
    }
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
    }
  })

  const handleDeleteSupplier = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este fornecedor? As transações vinculadas perderão a referência, mas não serão apagadas.')) {
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
    if (activeTab === 'installment' && (!data.custom_installments || data.custom_installments.length === 0)) {
      setPreviewInstallmentsOpen(true)
      return
    }

    // --- BOLETO HOLIDAY INTERCEPTOR ---
    const dateString = format(data.data_vencimento, 'yyyy-MM-dd')
    const isBoleto = data.payment_method === 'BOLETO'
    const holidaysList = (holidaysData?.holidays ?? []).map((h: any) =>
      typeof h.date === 'string' ? h.date.substring(0, 10) : ''
    ).filter(Boolean)

    if (isBoleto && lastAlertedDate !== dateString) {
      const day = data.data_vencimento.getDay()
      const isWeekend = day === 0 || day === 6
      const isHoliday = holidaysList.includes(dateString)

      if (isWeekend || isHoliday) {
        setLastAlertedDate(dateString) // Evita loop infinito se o usuario manter
        
        let current = new Date(data.data_vencimento)
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
      const cleanInstallments = isInstallment && data.custom_installments
        ? data.custom_installments.map(i => ({
          data_vencimento: i.data_vencimento, // the InstallmentItem component is keeping it named 'date' under the hood
          data_emissao: data.data_emissao,
          amount: i.amount
        }))
        : undefined

      const response = await createTransactionFn({
        ...commonData,
        confirmed: data.confirmed,
        installments_count: isInstallment ? Number(data.installments_count) : undefined,
        interval_frequency: isInstallment ? data.interval_frequency : undefined,
        custom_installments: cleanInstallments,
        credit_card_id: data.credit_card_id || null,
        interest: data.interest ? Number(data.interest) : undefined,
      })
      
      const transactionId = response.data?.transaction?.id || response.data?.id;
      // Upload do arquivo pendente (vinculação)
      if (localReceipt && transactionId) {
         setIsUploading(true)
         try {
            await import('@/lib/axios').then(m => m.api.patch(`/uploads/receipts/${encodeURIComponent(localReceipt.filename)}/link/${transactionId}`, {}))
            invalidateKeys()
            queryClient.invalidateQueries({ queryKey: ['pending-receipts'] })
         } catch(uploadErr) {
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
         } catch(uploadErr) {
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
        payment_method: localStorage.getItem('metrics-default-payment-method') || 'BOLETO',
        installments_count: '',
        interval_frequency: 'MONTHLY'
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
        toast.error('Não foi possível ler este código. Tente enquadrar melhor ou verifique a iluminação.', {
          duration: 4000
        })
      }
    } catch (error) {
      console.error(error)
      toast.error('Não foi possível ler este código. Tente enquadrar melhor ou verifique a iluminação.', {
        duration: 4000
      })
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
    <ResponsiveDialogContent>
      {/* ─── HEADER ─── */}
      <ResponsiveDialogHeader className="px-6 pt-4 md:pt-6 pb-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
            <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-500" />
          </div>
          <div>
            <ResponsiveDialogTitle className="font-bold text-xl text-foreground leading-tight">
              Nova Despesa
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription className="text-slate-600 dark:text-slate-400 text-sm mt-0.5">
              Preencha os detalhes do pagamento.
            </ResponsiveDialogDescription>
          </div>
        </div>
      </ResponsiveDialogHeader>
      
      {/* ─── OVERLAY DE LOADING ─── */}
      <ExtractionOverlay isLoading={isExtracting} />

      <div className="px-6 pb-40 pt-4 flex-1 overflow-y-auto scroll-smooth">
        {/* ─── TAB SELECTOR ─── */}
        <Tabs value={activeTab} onValueChange={(v) => {
          setActiveTab(v as any)
          if (v === 'installment') {
            form.setValue('confirmed', false)
          } else if (v === 'single') {
            form.setValue('confirmed', false)
          }
        }} className="w-full mb-6">
          <TabsList className="grid w-full grid-cols-2 p-1.5 bg-muted/40 rounded-2xl h-auto">
            <TabsTrigger value="single" className="text-sm font-bold py-3 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200">
              À Vista
            </TabsTrigger>
            <TabsTrigger value="installment" className="text-sm font-bold py-3 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200">
              Recorrente
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Form {...form}>
          <form 
            onSubmit={form.handleSubmit(onSubmit)} 
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (
                e.target instanceof HTMLInputElement || 
                e.target instanceof HTMLSelectElement || 
                (e.target as HTMLElement).getAttribute('role') === 'combobox' ||
                (e.target as HTMLElement).getAttribute('role') === 'switch'
              )) {
                e.preventDefault()
                const inputs = Array.from(e.currentTarget.querySelectorAll('input:not([type="hidden"]):not([disabled]), select:not([disabled]), button[role="combobox"]:not([disabled]), button[role="switch"]:not([disabled])')) as HTMLElement[]
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
              <div className={cn("grid gap-4 items-end grid-cols-1", localReceipt ? "sm:grid-cols-[1fr,150px,200px]" : "sm:grid-cols-[1fr,200px]")}>
                {/* VALOR */}
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5 flex-1">
                      <FormLabel className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-0.5 flex items-center">
                        <span>Valor da Despesa</span>
                        <span className="text-red-500 font-bold ml-1">*</span>
                      </FormLabel>
                      <div className="flex items-center gap-3 rounded-2xl border-2 border-border/60 bg-background px-5 py-8 md:py-3.5 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-500/10 transition-all duration-200 w-full">
                        <span className="text-xl font-semibold text-slate-400 dark:text-slate-500 flex-shrink-0 select-none">R$</span>
                        <FormControl>
                          <input
                            {...field}
                            onChange={(e) => {
                              field.onChange(e)
                              const val = parseFloat(e.target.value) || 0
                              const count = parseInt(form.getValues('installments_count') || '1') || 1
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
                            className="w-full text-4xl font-extrabold text-slate-800 dark:text-slate-100 placeholder:text-slate-200 dark:placeholder:text-slate-700 focus:outline-none bg-transparent tabular-nums tracking-tight caret-red-500"
                            autoFocus
                          />
                        </FormControl>
                        
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="lg:hidden h-14 w-14 rounded-2xl text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/40 hover:text-red-700 dark:hover:text-red-400 bg-red-50/50 dark:bg-red-900/20"
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
                      <FormItem className="space-y-1.5 flex-1">
                        <FormLabel className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-0.5">Juros</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-medium">R$</span>
                            <Input
                              {...field}
                              type="number"
                              inputMode="decimal"
                              step="0.01"
                              placeholder="0,00"
                              className="h-[72px] pl-9 rounded-xl border-border/70 bg-background text-base font-medium"
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
                    <FormItem className="flex flex-row items-center justify-between px-4 h-[72px] rounded-xl border border-border/60 bg-muted/20 space-y-0 sm:mb-0">
                      <FormLabel className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight cursor-pointer flex items-center">
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
                            } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50 dark:bg-slate-800/40 p-5 rounded-xl border border-dashed border-border/60 relative mt-2">
                <span className="absolute -top-3.5 left-4 bg-background px-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest border rounded-full">
                  Condição de Pagamento
                </span>

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                        Valor Total <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-medium">R$</span>
                          <Input
                            {...field}
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            placeholder="0.00"
                            className="h-12 pl-9 rounded-xl border-border/70 bg-background text-base font-medium"
                            onChange={(e) => {
                              field.onChange(e)
                              const val = parseFloat(e.target.value) || 0
                              const count = parseInt(form.getValues('installments_count') || '1') || 1
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
                  <FormLabel className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Valor / Parcela</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-medium">R$</span>
                      <Input
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={installmentValue}
                        className="h-12 pl-9 rounded-xl border-border/70 bg-background text-base font-medium"
                        onChange={(e) => {
                          const val = e.target.value
                          setInstallmentValue(val)
                          const instVal = parseFloat(val) || 0
                          const count = parseInt(form.getValues('installments_count') || '1') || 1
                          if (!isNaN(instVal) && !isNaN(count) && count > 0) {
                            form.setValue('amount', (instVal * count).toFixed(2), { shouldValidate: true })
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
                      <FormLabel className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Repetições</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          inputMode="numeric"
                          placeholder="12"
                          className="h-12 rounded-xl border-border/70 bg-background text-base font-medium text-center"
                          onChange={(e) => {
                            field.onChange(e)
                            const count = parseInt(e.target.value) || 1
                            const total = parseFloat(form.getValues('amount') || '0') || 0
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
                      <FormLabel className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Frequência</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 rounded-xl border-border/70 bg-background font-medium text-base">
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
                  <FormLabel className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest flex items-center">
                    <span>Descrição / Observação</span>
                    <span className="text-red-500 font-bold ml-1">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Ex: Aluguel do escritório..."
                      className="h-14 md:h-12 rounded-2xl md:rounded-xl border-border/70 bg-background text-base font-medium placeholder:text-muted-foreground/50 focus-visible:ring-red-500/30 focus-visible:border-red-500"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* ─── SEPARADOR ─── */}
            <div className="border-t border-border/40 -mx-1" />

            {/* ─── GRUPO 3: DATAS ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Emissão */}
              <FormField
                control={form.control}
                name="data_emissao"
                render={({ field }) => (
                  <FormItem className="flex flex-col gap-1.5">
                    <FormLabel className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest flex items-center">
                      <span>Emissão</span>
                      <span className="text-red-500 font-bold ml-1">*</span>
                    </FormLabel>
                    <Popover modal={true} open={isEmissaoPopoverOpen} onOpenChange={setIsEmissaoPopoverOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            type="button"
                            className={cn(
                              "w-full justify-start text-left font-medium h-14 md:h-12 rounded-2xl md:rounded-xl border-border/70 bg-background hover:bg-muted/30 hover:border-border transition-colors text-base",
                              !field.value && "text-muted-foreground"
                            )}
                            onKeyDown={(e) => {
                              if (e.key === 'ArrowUp') {
                                e.preventDefault()
                                const d = field.value ? new Date(field.value) : new Date()
                                d.setDate(d.getDate() - 1)
                                field.onChange(d)
                              } else if (e.key === 'ArrowDown') {
                                e.preventDefault()
                                const d = field.value ? new Date(field.value) : new Date()
                                d.setDate(d.getDate() + 1)
                                field.onChange(d)
                              }
                            }}
                          >
                            <CalendarIcon className="mr-2 h-5 w-5 text-slate-400 flex-shrink-0" />
                            {field.value ? format(field.value, "dd/MM/yyyy") : <span>Selecione</span>}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-[9999]" align="start" style={{ pointerEvents: 'auto' }}>
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => { if (date) { field.onChange(date); setIsEmissaoPopoverOpen(false) } }}
                          initialFocus
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
                    <FormLabel className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest flex items-center justify-between">
                      <span className="flex items-center">
                        <span>Vencimento</span>
                        <span className="text-red-500 font-bold ml-1">*</span>
                      </span>
                      {isCreditCard && billingMonthLabel && (
                        <span className="text-xs font-semibold text-red-600 lowercase tracking-normal">
                          Fatura {billingMonthLabel}
                        </span>
                      )}
                    </FormLabel>
                    <Popover modal={true} open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            type="button"
                            disabled={isCreditCard}
                            className={cn(
                              "w-full justify-start text-left font-medium h-14 md:h-12 rounded-2xl md:rounded-xl border-border/70 bg-background hover:bg-muted/30 hover:border-border transition-colors text-base",
                              !field.value && "text-muted-foreground",
                              isCreditCard && "opacity-80 bg-slate-50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 border-dashed"
                            )}
                            onKeyDown={(e) => {
                              if (isCreditCard) return;
                              if (e.key === 'ArrowUp') {
                                e.preventDefault()
                                const d = field.value ? new Date(field.value) : new Date()
                                d.setDate(d.getDate() - 1)
                                field.onChange(d)
                              } else if (e.key === 'ArrowDown') {
                                e.preventDefault()
                                const d = field.value ? new Date(field.value) : new Date()
                                d.setDate(d.getDate() + 1)
                                field.onChange(d)
                              }
                            }}
                          >
                            <CalendarIcon className="mr-2 h-5 w-5 text-slate-400 flex-shrink-0" />
                            {field.value ? format(field.value, "dd/MM/yyyy") : <span>Selecione</span>}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-[9999]" align="start" style={{ pointerEvents: 'auto' }}>
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => { if (date) { field.onChange(date); setIsPopoverOpen(false) } }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </FormItem>
                )}
              />
            </div>

            {/* ─── SEPARADOR ─── */}
            <div className="border-t border-border/40 -mx-1" />

            {/* ─── GRUPO 4: ENTIDADES (Fornecedor, Categoria, Conta) ─── */}
            <div className="grid grid-cols-1 gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Supplier */}
              <FormField
                control={form.control}
                name="supplier"
                render={({ field: { onChange, value } }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Fornecedor</FormLabel>
                    <SupplierCombobox
                      value={value}
                      onSelect={onChange}
                      suppliers={suppliersResult?.suppliers}
                      isLoading={!suppliersResult}
                      onQuickAdd={() => setSupplierDialogOpen({ open: true })}
                      onEditInfo={(id) => setSupplierDialogOpen({ open: true, id })}
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
                            <FormLabel className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Forma de Pagamento</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                <FormControl>
                                    <SelectTrigger className="h-12 rounded-xl border-border/70 bg-background font-medium text-base">
                                        <SelectValue placeholder="Selecione" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="BOLETO">Boleto</SelectItem>
                                    <SelectItem value="PIX">Pix</SelectItem>
                                    <SelectItem value="CREDIT_CARD">Cartão de Crédito</SelectItem>
                                    <SelectItem value="DEBIT_CARD">Cartão de Débito</SelectItem>
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
                        <FormLabel className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Cartão de Crédito</FormLabel>
                        <QuickAddSelect
                          value={field.value || ''}
                          onValueChange={(val) => {
                            field.onChange(val)
                            const card = creditCardsData?.creditCards?.find(c => c.id === val)
                            if (card) {
                              const matchingAccount = accounts?.accounts?.find(acc => 
                                acc.id === card.account_id || 
                                acc.name?.toLowerCase() === card.bank?.toLowerCase() || 
                                acc.name?.toLowerCase() === card.name?.toLowerCase()
                              )
                              if (matchingAccount) {
                                form.setValue('account', matchingAccount.id, { shouldValidate: true, shouldDirty: true, shouldTouch: true })
                              }
                              if (watchedEmissao) {
                                const holidayStrings = (holidaysData?.holidays ?? []).map((h: any) =>
                                  typeof h.date === 'string' ? h.date.substring(0, 10) : ''
                                ).filter(Boolean)
                                const result = calculateCreditCardDueDate(watchedEmissao, card, holidayStrings)
                                form.setValue('data_vencimento', result.due_date, { shouldValidate: true, shouldDirty: true, shouldTouch: true })
                                setBillingMonthLabel(result.billing_month_label)
                              }
                            }
                          }}
                          isLoading={!creditCardsData}
                          placeholder="Selecione o cartão..."
                          emptyMessage="Nenhum cartão cadastrado"
                          options={creditCardsData?.creditCards?.map((card) => ({
                            label: `${card.name} (${card.bank})`,
                            value: card.id,
                          }))}
                          quickAddLabel="Novo Cartão de Crédito"
                          onQuickAddClick={() => setCreateCreditCardOpen(true)}
                        />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Sector */}
                <FormField
                  control={form.control}
                  name="sector"
                  render={({ field: { onChange, value, disabled } }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest flex items-center">
                        <span>Categoria</span>
                        <span className="text-red-500 font-bold ml-1">*</span>
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
                      <FormLabel className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest flex items-center">
                        <span>Conta</span>
                        <span className="text-red-500 font-bold ml-1">*</span>
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
                <FormLabel className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest block mb-2">Comprovante</FormLabel>
                <FileUpload 
                  onFileSelect={setReceiptFile}
                  currentFileUrl={localReceipt ? `${API_BASE_URL}${localReceipt.url}` : null}
                  onRemoveExistingFile={() => {
                    setLocalReceipt(null)
                  }}
                />
              </div>
            )}

            {/* ─── AÇÕES ─── */}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 mt-2 border-t border-border/40">
              <ResponsiveDialogClose asChild>
                <Button
                  variant="outline"
                  type="button"
                  className="w-full sm:w-auto h-11 rounded-xl text-sm font-semibold border-border/70 text-slate-600 dark:text-slate-400 hover:text-foreground hover:bg-muted/50"
                >
                  Cancelar
                </Button>
              </ResponsiveDialogClose>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto h-11 rounded-xl font-bold text-sm shadow-md shadow-red-500/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                {isPending ? 'Salvando...' : (
                  activeTab === 'installment' ? (
                    <>
                      <ListChecks className="w-4 h-4 mr-2" />
                      Conferir Recorrência
                    </>
                  ) : 'Confirmar Despesa'
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
        creditCard={isCreditCard ? creditCardsData?.creditCards?.find((c: any) => c.id === watchedCreditCardId) : undefined}
        holidays={(holidaysData?.holidays ?? []).map((h: any) => typeof h.date === 'string' ? h.date.substring(0, 10) : '').filter(Boolean)}
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

      <Dialog open={supplierDialogOpen.open} onOpenChange={(open) => setSupplierDialogOpen({ open, id: open ? supplierDialogOpen.id : undefined })}>
        <SupplierFormDialog 
          supplierToEdit={supplierDialogOpen.id ? suppliersResult?.suppliers?.find(s => s.id === supplierDialogOpen.id) : null}
          onOpenChange={(open) => setSupplierDialogOpen({ open, id: open ? supplierDialogOpen.id : undefined })} 
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
            <AlertDialogTitle className="text-xl font-extrabold tracking-tight">Vencimento em dia não útil</AlertDialogTitle>
            <AlertDialogDescription>
              O vencimento deste boleto cai em um fim de semana ou feriado. Deseja alterar o vencimento para o próximo dia útil ({nextBusinessDay ? format(nextBusinessDay, "dd/MM/yyyy") : ''})?
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
              className="rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800"
              onClick={() => {
                if (nextBusinessDay) {
                  form.setValue('data_vencimento', nextBusinessDay, { shouldValidate: true })
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
