import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Calendar as CalendarIcon,
  Camera,
  CircleCheckBig,
  ListChecks,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { createTransaction } from '@/api/create-transaction'
import { extractTransaction } from '@/api/extract-transaction'
import { getAccounts } from '@/api/get-accounts'
import { getSectors } from '@/api/get-sectors'
import { uploadFileTransaction } from '@/api/upload-file'
import { CameraScanner } from '@/components/camera-scanner'
import { CreateAccountDialog } from '@/components/create-account-dialog'
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
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/custom-tabs'
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
import { cn } from '@/lib/utils'

// Schema para Receitas (income)
const formSchema = z.object({
  data_vencimento: z.date({
    required_error: 'Vencimento é obrigatório',
  }),
  data_emissao: z.date({
    required_error: 'Emissão é obrigatória',
  }),
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
})

type FormSchemaType = z.infer<typeof formSchema>

export interface TransactionIncomeProps {
  open: boolean
}

export function TransactionIncome({ open }: TransactionIncomeProps) {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'single' | 'installment'>('single')
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const [isEmissaoPopoverOpen, setIsEmissaoPopoverOpen] = useState(false)
  const [previewInstallmentsOpen, setPreviewInstallmentsOpen] = useState(false)
  const [installmentValue, setInstallmentValue] = useState<string>('')
  const [scannerOpen, setScannerOpen] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null)
  const [confirmationOpen, setConfirmationOpen] = useState(false)

  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const [createAccountOpen, setCreateAccountOpen] = useState(false)
  const [createSectorOpen, setCreateSectorOpen] = useState(false)

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
      installments_count: '',
      interval_frequency: 'MONTHLY',
    },
  })

  useEffect(() => {
    if (!open) {
      form.reset()
      setActiveTab('single')
      setInstallmentValue('')
      setReceiptFile(null)
    }
  }, [open, form])

  const { data: sectors } = useQuery({
    queryKey: ['sectors'],
    queryFn: () => getSectors(),
  })

  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => getAccounts(),
  })

  const { mutateAsync: transaction, isPending } = useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sectors'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['metrics'] })
    },
  })

  const watchedAmount = useWatch({ control: form.control, name: 'amount' })
  const watchedCount = useWatch({
    control: form.control,
    name: 'installments_count',
  })

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

  function handleConfirmInstallments(installments: InstallmentItem[]) {
    const cleanInstallments = installments.map((i) => ({
      data_vencimento: i.date,
      data_emissao: new Date(),
      amount: i.amount,
    }))

    form.setValue('custom_installments', cleanInstallments)
    setPreviewInstallmentsOpen(false)
    form.handleSubmit(onSubmit)()
  }

  async function onSubmit(data: FormSchemaType) {
    if (
      activeTab === 'installment' &&
      (!data.custom_installments || data.custom_installments.length === 0)
    ) {
      setPreviewInstallmentsOpen(true)
      return
    }

    try {
      const isInstallment = activeTab === 'installment'
      const cleanInstallments =
        isInstallment && data.custom_installments
          ? data.custom_installments.map((i) => ({
              data_vencimento: i.data_vencimento,
              data_emissao: data.data_emissao,
              amount: i.amount,
            }))
          : undefined

      const transactionData = {
        operation: 'income' as const,
        amount: Number(data.amount),
        account: data.account,
        data_vencimento: data.data_vencimento,
        data_emissao: data.data_emissao,
        description: data.description,
        sector: data.sector,
        confirmed: data.confirmed,
        installments_count: isInstallment
          ? Number(data.installments_count)
          : undefined,
        interval_frequency: isInstallment ? data.interval_frequency : undefined,
        custom_installments: cleanInstallments,
      }

      const response = await transaction(transactionData)

      const transactionId = response.data?.transaction?.id || response.data?.id
      if (receiptFile && activeTab === 'single' && transactionId) {
        setIsUploading(true)
        try {
          await uploadFileTransaction(transactionId, receiptFile)
          queryClient.invalidateQueries({ queryKey: ['transactions'] })
        } catch (uploadErr) {
          console.error('Erro no upload', uploadErr)
          toast.error('Receita salva, mas falha ao enviar comprovante.')
        } finally {
          setIsUploading(false)
        }
      }

      toast.success('Receita registrada com sucesso!')

      form.reset({
        data_vencimento: new Date(),
        data_emissao: new Date(),
        description: '',
        account: localStorage.getItem('metrics-default-account') || '',
        sector: '',
        amount: '',
        confirmed: false,
        installments_count: '',
        interval_frequency: 'MONTHLY',
      })
      setActiveTab('single')
      setInstallmentValue('')
      setReceiptFile(null)
    } catch (error) {
      console.error('Erro ao cadastrar receita:', error)
      toast.error('Erro ao cadastrar receita')
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

    setConfirmationOpen(false)
    toast.success(`Dados de ${data.type} aplicados ao formulário!`)
  }

  return (
    <ResponsiveDialogContent onInteractOutside={(e) => e.preventDefault()}>
      <ResponsiveDialogHeader className="border-b border-border/50 px-6 pb-4 pt-4 md:pt-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
            <CircleCheckBig className="h-5 w-5 text-emerald-600 dark:text-emerald-500" />
          </div>
          <div>
            <ResponsiveDialogTitle className="text-xl font-bold leading-tight text-foreground">
              Nova Receita
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
              Registre o recebimento de valores.
            </ResponsiveDialogDescription>
          </div>
        </div>
      </ResponsiveDialogHeader>

      <ExtractionOverlay isLoading={isExtracting} />

      <div className="flex-1 overflow-y-auto scroll-smooth px-6 pb-40 pt-4">
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
                  if (nextElement) {
                    nextElement.focus()
                    if (nextElement instanceof HTMLInputElement) {
                      nextElement.select()
                    }
                  }
                }
              }
            }}
            className="flex flex-col gap-5"
          >
            {activeTab === 'single' ? (
              <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-[1fr,200px]">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem className="flex-1 space-y-1.5">
                      <FormLabel className="ml-0.5 flex items-center text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                        <span>Valor da Receita</span>
                        <span className="ml-1 font-bold text-red-500">*</span>
                      </FormLabel>
                      <div className="flex w-full items-center gap-3 rounded-2xl border-2 border-border/60 bg-background px-5 py-8 transition-all duration-200 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/10 md:py-3.5">
                        <span className="flex-shrink-0 select-none text-xl font-semibold text-slate-400 dark:text-slate-500">
                          R$
                        </span>
                        <FormControl>
                          <input
                            {...field}
                            onFocus={(e) => e.target.select()}
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
                            className="w-full bg-transparent text-4xl font-extrabold tabular-nums tracking-tight text-slate-800 caret-emerald-500 placeholder:text-slate-200 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-700"
                            autoFocus
                          />
                        </FormControl>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-14 w-14 rounded-2xl bg-emerald-50/50 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 lg:hidden"
                          onClick={handleOpenScanner}
                        >
                          <Camera className="h-7 w-7" />
                        </Button>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmed"
                  render={({ field }) => (
                    <FormItem className="flex h-[72px] flex-row items-center justify-between space-y-0 rounded-xl border border-border/60 bg-muted/20 px-4 sm:mb-0">
                      <FormLabel className="cursor-pointer text-sm font-bold uppercase tracking-tight text-slate-600 dark:text-slate-400">
                        {field.value ? '✓ Já Recebi' : 'A Receber'}
                      </FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="data-[state=checked]:bg-emerald-600"
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
              <div className="relative mt-2 grid grid-cols-1 gap-4 rounded-xl border border-dashed border-emerald-200/50 bg-emerald-50/30 p-5 dark:border-emerald-900/30 dark:bg-emerald-900/10 sm:grid-cols-2 lg:grid-cols-4">
                <span className="absolute -top-3.5 left-4 rounded-full border border-emerald-100 bg-background px-2 text-[11px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                  Condição de Pagamento
                </span>

                {/* 1º: VALOR TOTAL */}
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
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-medium text-slate-400">
                            R$
                          </span>
                          <Input
                            {...field}
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            placeholder="0.00"
                            className="h-12 rounded-xl border-border/70 bg-background pl-9 text-base font-medium"
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              field.onChange(e)
                              const val = parseFloat(e.target.value) || 0
                              const count =
                                parseInt(
                                  form.getValues('installments_count') || '1',
                                ) || 1
                              if (!isNaN(val) && val > 0 && !isNaN(count) && count > 0) {
                                setInstallmentValue((val / count).toFixed(2))
                              } else if (val === 0) {
                                setInstallmentValue('')
                              }
                            }}
                          />
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* 2º: NÚMERO DE PARCELAS */}
                <FormField
                  control={form.control}
                  name="installments_count"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">
                        Nº de Parcelas <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          inputMode="numeric"
                          placeholder="12"
                          className="h-12 rounded-xl border-border/70 bg-background text-center text-base font-medium"
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            field.onChange(e)
                            const count = parseInt(e.target.value) || 1
                            const total =
                              parseFloat(form.getValues('amount') || '0') || 0
                            if (!isNaN(total) && total > 0 && !isNaN(count) && count > 0) {
                              setInstallmentValue((total / count).toFixed(2))
                            }
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* 3º: VALOR DA PARCELA */}
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">
                    Valor da Parcela
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-medium text-slate-400">
                        R$
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={installmentValue}
                        className="h-12 rounded-xl border-border/70 bg-background pl-9 text-base font-medium"
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const val = e.target.value
                          setInstallmentValue(val)
                          const instVal = parseFloat(val) || 0
                          const count =
                            parseInt(
                              form.getValues('installments_count') || '1',
                            ) || 1
                          if (!isNaN(instVal) && instVal > 0 && !isNaN(count) && count > 0) {
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
                            const trigger =
                              document.activeElement as HTMLElement
                            if (
                              trigger &&
                              trigger.getAttribute('role') === 'combobox'
                            ) {
                              const form = trigger.closest('form')
                              if (form) {
                                const inputs = Array.from(
                                  form.querySelectorAll(
                                    'input:not([type="hidden"]):not([disabled]), select:not([disabled]), button[role="combobox"]:not([disabled]), button[aria-haspopup="dialog"]:not([disabled]), button[role="switch"]:not([disabled]), button[type="submit"]:not([disabled])',
                                  ),
                                ) as HTMLElement[]
                                const index = inputs.indexOf(trigger)
                                if (index > -1 && index < inputs.length - 1) {
                                  const nextElement = inputs[index + 1]
                                  if (nextElement) nextElement.focus()
                                }
                              }
                            }
                          }, 0)
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger
                            className="h-12 rounded-xl border-border/70 bg-background text-base font-medium"
                            onKeyUp={(e) => {
                              if (
                                (e.key === 'Tab' || e.key === 'Enter') &&
                                e.currentTarget.getAttribute(
                                  'aria-expanded',
                                ) === 'false'
                              ) {
                                e.currentTarget.click()
                              }
                            }}
                          >
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
                      onFocus={(e) => e.target.select()}
                      placeholder="Ex: Venda de serviço, Consultoria..."
                      className="h-14 rounded-2xl border-border/70 bg-background text-base font-medium placeholder:text-muted-foreground/50 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/30 md:h-12 md:rounded-xl"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="-mx-1 border-t border-border/40" />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                      modal={true}
                      open={isEmissaoPopoverOpen}
                      onOpenChange={setIsEmissaoPopoverOpen}
                    >
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            type="button"
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
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="data_vencimento"
                render={({ field }) => (
                  <FormItem className="flex flex-col gap-1.5">
                    <FormLabel className="flex items-center text-sm font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">
                      <span>Vencimento</span>
                      <span className="ml-1 font-bold text-red-500">*</span>
                    </FormLabel>
                    <Popover
                      modal={true}
                      open={isPopoverOpen}
                      onOpenChange={setIsPopoverOpen}
                    >
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            type="button"
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
                              setIsPopoverOpen(false)
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </FormItem>
                )}
              />
            </div>

            <div className="-mx-1 border-t border-border/40" />

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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
                        ?.filter((sector) => sector.type === 'in')
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
                        balance: account.balance,
                      }))}
                      quickAddLabel="Nova Conta"
                      onQuickAddClick={() => setCreateAccountOpen(true)}
                    />
                  </FormItem>
                )}
              />
            </div>

            {/* ─── FILE UPLOAD (Anexo) ─── */}
            {activeTab === 'single' && (
              <div className="mt-2">
                <FormLabel className="mb-2 block text-sm font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">
                  Comprovante
                </FormLabel>
                <FileUpload onFileSelect={setReceiptFile} />
              </div>
            )}

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
                disabled={isPending || isUploading}
                className="h-11 w-full rounded-xl bg-emerald-600 text-sm font-bold text-white shadow-md shadow-emerald-500/20 transition-all hover:scale-[1.01] hover:bg-emerald-700 active:scale-[0.99] sm:w-auto"
              >
                {isPending || isUploading ? (
                  'Processando...'
                ) : activeTab === 'installment' ? (
                  <>
                    <ListChecks className="mr-2 h-4 w-4" />
                    Conferir Recorrência
                  </>
                ) : (
                  'Confirmar Receita'
                )}
              </Button>
            </div>
          </form>
        </Form>

        <InstallmentPreviewDialog
          open={previewInstallmentsOpen}
          onOpenChange={setPreviewInstallmentsOpen}
          totalAmount={Number(form.getValues('amount'))}
          installmentsCount={Number(form.getValues('installments_count'))}
          startDate={form.getValues('data_vencimento')}
          frequency={form.getValues('interval_frequency') || 'MONTHLY'}
          variant="income"
          onConfirm={handleConfirmInstallments}
        />

        <CreateSectorDialog
          open={createSectorOpen}
          onOpenChange={setCreateSectorOpen}
          defaultType="in"
          onSuccess={(newSector) => {
            form.setValue('sector', newSector.id)
          }}
        />
        <CreateAccountDialog
          open={createAccountOpen}
          onOpenChange={setCreateAccountOpen}
          onSuccess={(newAccount) => {
            if (newAccount.id) form.setValue('account', newAccount.id)
          }}
        />

        {scannerOpen && (
          <CameraScanner
            open={scannerOpen}
            onOpenChange={setScannerOpen}
            onScanSuccess={handleScanSuccess}
            defaultMode="qrcode"
            forceLandscape={false}
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
      </div>
    </ResponsiveDialogContent>
  )
}
