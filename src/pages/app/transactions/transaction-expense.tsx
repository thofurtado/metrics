import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Calendar as CalendarIcon,
  TrendingDown,
  ListChecks,
} from 'lucide-react'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { createTransaction } from '@/api/create-transaction'
import { getAccounts } from '@/api/get-accounts'
import { getSectors } from '@/api/get-sectors'
import { getSuppliers } from '@/api/get-suppliers'

import { CreateAccountDialog } from '@/components/create-account-dialog'
import { CreateSectorDialog } from '@/components/create-sector-dialog'
import { SupplierFormDialog } from '@/pages/app/suppliers/supplier-form-dialog'
import { QuickAddSelect } from '@/components/ui/quick-add-select'
import { SupplierCombobox } from '@/components/supplier-combobox'
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

// Schema
const formSchema = z.object({
  date: z.date({ required_error: "Data é obrigatória" }),
  description: z.string().min(1, "Descrição é obrigatória"),
  account: z.string().min(1, "Conta é obrigatória"),
  sector: z.string().min(1, "Categoria é obrigatória"),
  amount: z.string().min(1, "Valor é obrigatório").refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    "Valor deve ser maior que zero"
  ),
  supplier: z.string().optional(),
  confirmed: z.boolean().default(true),

  // Installments
  installments_count: z.string().optional(),
  interval_frequency: z.enum(['WEEKLY', 'MONTHLY', 'YEARLY']).optional(),

  custom_installments: z.array(z.object({
    date: z.date(),
    amount: z.number()
  })).optional()
})

type FormSchemaType = z.infer<typeof formSchema>

export interface TransactionExpenseProps {
  open: boolean
}

export function TransactionExpense() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'single' | 'installment'>('single')

  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const [previewInstallmentsOpen, setPreviewInstallmentsOpen] = useState(false)

  // Bidirectional Calculator State
  const [installmentValue, setInstallmentValue] = useState<string>('')

  function handleConfirmInstallments(installments: InstallmentItem[]) {
    // Sanitization: Remove visual/unique IDs from component, send only clean data
    const cleanInstallments = installments.map(i => ({
      date: i.date,
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
  const [createSupplierOpen, setCreateSupplierOpen] = useState(false)

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date(),
      description: '',
      account: '',
      sector: '',
      amount: '',
      confirmed: true,
      installments_count: '',
      interval_frequency: 'MONTHLY'
    }
  })

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
        date: data.date,
      }

      // Single or Installment
      const isInstallment = activeTab === 'installment'

      // Final Sanitization before sending to API
      const cleanInstallments = isInstallment && data.custom_installments
        ? data.custom_installments.map(i => ({
          date: i.date,
          amount: i.amount
        }))
        : undefined

      await createTransactionFn({
        ...commonData,
        confirmed: data.confirmed, // Only for non-recurring? Recurring active is true by default.
        installments_count: isInstallment ? Number(data.installments_count) : undefined,
        interval_frequency: isInstallment ? data.interval_frequency : undefined,
        custom_installments: cleanInstallments
      })
      toast.success('Despesa registrada com sucesso!')

      // Reset
      form.reset({
        date: new Date(),
        description: '',
        account: '',
        sector: '',
        amount: '',
        confirmed: true,
        installments_count: '',
        interval_frequency: 'MONTHLY'
      })
      setActiveTab('single')
      setInstallmentValue('')

    } catch (error) {
      console.error(error)
      toast.error('Erro ao registrar despesa.')
    }
  }

  const isPending = isTransactionPending

  return (
    <ResponsiveDialogContent>
      <ResponsiveDialogHeader className="p-6 pb-2 border-b-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-500" />
          </div>
          <div>
            <ResponsiveDialogTitle className="font-bold text-2xl text-foreground">
              Nova Despesa
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription className="text-muted-foreground/80 mt-1">
              Preencha os detalhes do pagamento.
            </ResponsiveDialogDescription>
          </div>
        </div>
      </ResponsiveDialogHeader>

      <div className="p-6 pt-2 flex-1 overflow-y-auto">
        <Tabs value={activeTab} onValueChange={(v) => {
          setActiveTab(v as any)
          if (v === 'installment') {
            form.setValue('confirmed', false)
          } else if (v === 'single') {
            form.setValue('confirmed', true)
          }
        }} className="w-full mb-8">
          <TabsList className="grid w-full grid-cols-2 p-1 bg-muted/40 rounded-xl h-auto">
            <TabsTrigger value="single" className="text-sm font-semibold py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200">
              À Vista
            </TabsTrigger>
            <TabsTrigger value="installment" className="text-sm font-semibold py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200">
              Recorrente
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Amount Hero Input */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem className="relative bg-red-50/50 dark:bg-red-950/10 rounded-3xl p-8 pb-10 transition-all duration-300 hover:bg-red-50/80 dark:hover:bg-red-950/20">
                  {activeTab === 'installment' && (
                    <div className="absolute top-4 left-0 w-full text-center text-xs font-semibold text-red-600/60 uppercase tracking-widest">
                      Valor Total do Contrato
                    </div>
                  )}
                  <div className="flex justify-center items-end gap-1 mt-2">
                    <span className="text-2xl font-medium text-muted-foreground/40 mb-3 pb-0.5">R$</span>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => {
                          field.onChange(e)
                          // When Total changes, update Installment Value View
                          const val = parseFloat(e.target.value)
                          const count = parseInt(form.getValues('installments_count') || '1')
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
                        className="border-none text-6xl font-bold text-red-600 dark:text-red-500 placeholder:text-red-200/50 dark:placeholder:text-red-900/20 focus-visible:ring-0 p-0 h-auto w-full text-center bg-transparent tabular-nums tracking-tighter caret-red-500 shadow-none"
                        autoFocus
                      />
                    </FormControl>
                  </div>
                  {installmentPreview && (
                    <div className="absolute bottom-3 left-0 w-full text-center text-sm font-medium text-red-600/80 dark:text-red-400">
                      <strong>{installmentPreview.count}x</strong> de <strong>{installmentPreview.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                    </div>
                  )}
                </FormItem>
              )}
            />

            <div className="col-span-1 flex flex-col gap-6 justify-center">
              {/* Date / Start Date */}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col gap-1">
                    <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1">Data</FormLabel>
                    <Popover modal={true} open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            type="button"
                            className={cn(
                              "w-full pl-4 text-left font-normal h-14 rounded-xl border-input/60 bg-background/50 hover:bg-background hover:border-input transition-colors",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              <span className="text-base text-foreground font-medium">{format(field.value, "PPP", { locale: ptBR })}</span>
                            ) : (
                              <span>Selecione</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-auto p-0 z-[9999]"
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

              {/* Confirmed (Only Single) */}
              {activeTab === 'single' && (
                <FormField
                  control={form.control}
                  name="confirmed"
                  render={({ field }) => (
                    <FormItem className="flex flex-col gap-1 justify-end">
                      <FormLabel className="sr-only">Status Pagamento</FormLabel>
                      <div className="flex items-center justify-between px-4 h-14 rounded-xl border border-input/60 bg-background/50">
                        <span className="text-sm font-medium text-muted-foreground">
                          {field.value ? 'Já Paguei' : 'A Pagar'}
                        </span>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="data-[state=checked]:bg-red-600"
                          />
                        </FormControl>
                      </div>
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* INSTALLMENT SPECIFIC */}
            {activeTab === 'installment' && (
              <div className="col-span-1 lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-6 bg-muted/30 p-6 rounded-2xl border border-dashed border-border/60 relative mt-2">
                <div className="absolute -top-3 left-6 bg-background px-3 text-xs text-muted-foreground font-semibold uppercase tracking-wider border rounded-full shadow-sm">
                  Configuração de Recorrência
                </div>

                <FormField
                  control={form.control}
                  name="installments_count"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1">Repetições</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          inputMode="numeric"
                          placeholder="12"
                          className="h-12 rounded-xl border-input/60 bg-background/50 text-base font-medium placeholder:text-muted-foreground/30 text-center"
                          onChange={(e) => {
                            field.onChange(e)
                            const count = parseInt(e.target.value)
                            const total = parseFloat(form.getValues('amount') || '0')
                            if (!isNaN(total) && !isNaN(count) && count > 0) {
                              setInstallmentValue((total / count).toFixed(2))
                            }
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Visual Installment Value Input */}
                <FormItem className="sm:col-span-1 space-y-1">
                  <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1">Valor Parcela</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={installmentValue}
                      className="h-12 rounded-xl border-input/60 bg-background/50 text-base font-medium placeholder:text-muted-foreground/30 text-center"
                      onChange={(e) => {
                        const val = e.target.value
                        setInstallmentValue(val)
                        const instVal = parseFloat(val)
                        const count = parseInt(form.getValues('installments_count') || '1')
                        if (!isNaN(instVal) && !isNaN(count) && count > 0) {
                          const newTotal = instVal * count
                          form.setValue('amount', newTotal.toFixed(2))
                        }
                      }}
                    />
                  </FormControl>
                </FormItem>
                <FormField
                  control={form.control}
                  name="interval_frequency"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1">Frequência</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 rounded-xl border-input/60 bg-background/50 font-medium text-base">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
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

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1">Descrição</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Ex: Aluguel do escritório, Conta de Luz..."
                      className="h-14 rounded-xl border-input/60 bg-background/50 text-base font-medium placeholder:text-muted-foreground/40"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Supplier */}
            <FormField
              control={form.control}
              name="supplier"
              render={({ field: { onChange, value, disabled } }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1">Fornecedor</FormLabel>
                  <SupplierCombobox
                    value={value}
                    onSelect={onChange}
                    suppliers={suppliersResult?.suppliers}
                    isLoading={!suppliersResult}
                    onQuickAdd={() => setCreateSupplierOpen(true)}
                  />
                </FormItem>
              )}
            />

            <div className="col-span-1 lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Sector */}
              <FormField
                control={form.control}
                name="sector"
                render={({ field: { onChange, value, disabled } }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1">Categoria</FormLabel>
                    <QuickAddSelect
                      value={value}
                      onValueChange={onChange}
                      disabled={disabled}
                      isLoading={!sectors}
                      placeholder="Selecione..."
                      emptyMessage="Nenhuma categoria encontrada"
                      options={sectors?.data.sectors
                        .filter((sector) => sector.type === 'out')
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
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1">Conta</FormLabel>
                    <QuickAddSelect
                      value={value}
                      onValueChange={onChange}
                      disabled={disabled}
                      isLoading={!accounts}
                      placeholder="Selecione..."
                      emptyMessage="Nenhuma conta encontrada"
                      options={accounts?.accounts.map((account) => ({
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

            <div className="col-span-1 lg:col-span-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-8 mt-4 section-footer border-t border-border/40">
              <ResponsiveDialogClose asChild>
                <Button variant="ghost" type="button" className="w-full sm:w-auto h-12 rounded-xl text-base font-medium text-muted-foreground hover:text-foreground">Cancelar</Button>
              </ResponsiveDialogClose>
              <Button type="submit" disabled={isPending} className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto h-12 rounded-xl font-bold text-base shadow-lg shadow-red-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
                {isPending ? 'Salvando...' : (
                  activeTab === 'installment' ? (
                    <>
                      <ListChecks className="w-5 h-5 mr-2" />
                      Conferir Recorrência
                    </>
                  ) : 'Confirmar Despesa'
                )}
              </Button>
            </div>
          </form>
        </Form>

        {/* Dialogs */}
        <CreateSectorDialog
          open={createSectorOpen}
          onOpenChange={setCreateSectorOpen}
          defaultType='out'
          onSuccess={(newSector) => form.setValue('sector', newSector.id)}
        />
        <CreateAccountDialog
          open={createAccountOpen}
          onOpenChange={setCreateAccountOpen}
          onSuccess={(newAccount) => { if (newAccount.id) form.setValue('account', newAccount.id) }}
        />
        <Dialog open={createSupplierOpen} onOpenChange={setCreateSupplierOpen}>
          <SupplierFormDialog
            onOpenChange={(v) => {
              setCreateSupplierOpen(v)
              queryClient.invalidateQueries({ queryKey: ['suppliers'] }) // Refetch suppliers
            }}
          />
        </Dialog>

        <InstallmentPreviewDialog
          open={previewInstallmentsOpen}
          onOpenChange={setPreviewInstallmentsOpen}
          totalAmount={Number(watchedAmount) || 0}
          installmentsCount={Number(watchedCount) || 1}
          frequency={form.getValues('interval_frequency') || 'MONTHLY'}
          startDate={form.getValues('date') || new Date()}
          variant="expense"
          onConfirm={handleConfirmInstallments}
        />
      </div>
    </ResponsiveDialogContent>
  )
}