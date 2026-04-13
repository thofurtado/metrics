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
import { getSectors } from '@/api/get-sectors'
import { getSuppliers } from '@/api/get-suppliers'
import { deleteSupplier } from '@/api/delete-supplier'

import { CreateAccountDialog } from '@/components/create-account-dialog'
import { CreateSectorDialog } from '@/components/create-sector-dialog'
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
  })).optional()
})

type FormSchemaType = z.infer<typeof formSchema>

export interface TransactionExpenseProps {
  open: boolean
}

export function TransactionExpense({ open }: TransactionExpenseProps) {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'single' | 'installment'>('single')

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
  const [supplierDialogOpen, setSupplierDialogOpen] = useState<{ open: boolean, id?: string }>({ open: false })

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      data_vencimento: new Date(),
      data_emissao: new Date(),
      description: '',
      account: '',
      sector: '',
      amount: '',
      confirmed: false,
      payment_method: 'BOLETO',
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
    }
  }, [open, form])

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

  // Watching Amount and Count for Preview
  const watchedAmount = useWatch({ control: form.control, name: 'amount' })
  const watchedCount = useWatch({ control: form.control, name: 'installments_count' })

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
        confirmed: data.confirmed, // Only for non-recurring? Recurring active is true by default.
        installments_count: isInstallment ? Number(data.installments_count) : undefined,
        interval_frequency: isInstallment ? data.interval_frequency : undefined,
        custom_installments: cleanInstallments
      })
      
      // Upload do arquivo, se houver, no caso de despesa única (não recorrente)
      if (receiptFile && activeTab === 'single' && response.data?.id) {
         setIsUploading(true)
         try {
            await uploadFileTransaction(response.data.id, receiptFile)
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
        account: '',
        sector: '',
        amount: '',
        confirmed: false,
        payment_method: 'BOLETO',
        installments_count: '',
        interval_frequency: 'MONTHLY'
      })
      setActiveTab('single')
      setInstallmentValue('')
      setReceiptFile(null)

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
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">

            {/* ─── GRUPO 1: VALOR E STATUS ─── */}
            <div className={cn(
              "grid gap-4 items-end",
              activeTab === 'single' ? "grid-cols-1 sm:grid-cols-[1fr,200px]" : "grid-cols-1"
            )}>
              {/* VALOR */}
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem className="space-y-1.5 flex-1">
                    <FormLabel className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-0.5">
                      {activeTab === 'installment' ? 'Valor Total do Contrato' : 'Valor da Despesa'}
                    </FormLabel>
                    <div className={cn(
                      "flex items-center gap-3 rounded-2xl border-2 border-border/60 bg-background px-5 py-8 md:py-3.5 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-500/10 transition-all duration-200",
                      activeTab === 'single' ? "w-full" : "w-full justify-center"
                    )}>
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
                          className={cn(
                            "text-4xl font-extrabold text-slate-800 dark:text-slate-100 placeholder:text-slate-200 dark:placeholder:text-slate-700 focus:outline-none bg-transparent tabular-nums tracking-tight caret-red-500",
                            activeTab === 'single' ? "w-full" : "w-full text-center"
                          )}
                          autoFocus
                        />
                      </FormControl>
                      
                      {/* BOTAO CAMERA - MOBILE ONLY */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="lg:hidden h-14 w-14 rounded-2xl text-red-600 hover:bg-red-50 hover:text-red-700 bg-red-50/50"
                        onClick={handleOpenScanner}
                      >
                        <Camera className="h-7 w-7" />
                      </Button>
                    </div>
                    {installmentPreview && activeTab === 'installment' && (
                      <p className="text-sm font-medium text-red-600/80 dark:text-red-400 ml-1">
                        <strong>{installmentPreview.count}×</strong> de <strong>{installmentPreview.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                      </p>
                    )}
                  </FormItem>
                )}
              />

              {/* STATUS (Aparece na mesma linha do valor no Desktop se for 'single') */}
              {activeTab === 'single' && (
                <FormField
                  control={form.control}
                  name="confirmed"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between px-4 h-[72px] rounded-xl border border-border/60 bg-muted/20 space-y-0 sm:mb-0">
                      <FormLabel className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight cursor-pointer">
                        {field.value ? '✓ Já Paguei' : 'A Pagar'}
                      </FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="data-[state=checked]:bg-red-600"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* ─── GRUPO 2: DATAS ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Emissão */}
              <FormField
                control={form.control}
                name="data_emissao"
                render={({ field }) => (
                  <FormItem className="flex flex-col gap-1.5">
                    <FormLabel className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Emissão</FormLabel>
                    <Popover modal={false} open={isEmissaoPopoverOpen} onOpenChange={setIsEmissaoPopoverOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            type="button"
                            className={cn(
                              "w-full justify-start text-left font-medium h-14 md:h-12 rounded-2xl md:rounded-xl border-border/70 bg-background hover:bg-muted/30 hover:border-border transition-colors text-base",
                              !field.value && "text-muted-foreground"
                            )}
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
                    <FormLabel className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Vencimento</FormLabel>
                    <Popover modal={false} open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            type="button"
                            className={cn(
                              "w-full justify-start text-left font-medium h-14 md:h-12 rounded-2xl md:rounded-xl border-border/70 bg-background hover:bg-muted/30 hover:border-border transition-colors text-base",
                              !field.value && "text-muted-foreground"
                            )}
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

            {/* ─── GRUPO 3: DETALHES ─── */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Descrição</FormLabel>
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
                                  <SelectItem value="CHECK">Cheque</SelectItem>
                              </SelectContent>
                          </Select>
                      </FormItem>
                  )}
              />
            </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Sector */}
                <FormField
                  control={form.control}
                  name="sector"
                  render={({ field: { onChange, value, disabled } }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Categoria</FormLabel>
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
                      <FormLabel className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Conta</FormLabel>
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

            {/* ─── GRUPO 5: RECORRÊNCIA (só no tab recorrente) ─── */}
            {activeTab === 'installment' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-800/40 p-5 rounded-xl border border-dashed border-border/60 relative mt-2">
                <span className="absolute -top-3.5 left-4 bg-background px-2 text-[11px] font-bold text-slate-500 uppercase tracking-widest border rounded-full">
                  Recorrência
                </span>

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

                {/* Visual Installment Value */}
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Valor / Parcela</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={installmentValue}
                      className="h-12 rounded-xl border-border/70 bg-background text-base font-medium text-center"
                      onChange={(e) => {
                        const val = e.target.value
                        setInstallmentValue(val)
                        const instVal = parseFloat(val) || 0
                        const count = parseInt(form.getValues('installments_count') || '1') || 1
                        if (!isNaN(instVal) && !isNaN(count) && count > 0) {
                          form.setValue('amount', (instVal * count).toFixed(2))
                        }
                      }}
                    />
                  </FormControl>
                </FormItem>

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
            
            {/* ─── FILE UPLOAD (Anexo) ─── */}
            {activeTab === 'single' && (
              <div className="mt-2">
                <FormLabel className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest block mb-2">Comprovante</FormLabel>
                <FileUpload onFileSelect={setReceiptFile} />
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
        totalAmount={parseFloat(form.getValues('amount') || '0')}
        installmentsCount={parseInt(form.getValues('installments_count') || '1') || 1}
        frequency={form.getValues('interval_frequency') || 'MONTHLY'}
        startDate={form.getValues('data_vencimento')}
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
    </ResponsiveDialogContent>
  )
}
