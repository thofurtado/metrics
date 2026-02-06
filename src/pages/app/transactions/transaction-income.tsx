import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Calendar as CalendarIcon,
  CircleCheckBig,
  Landmark,
  NotebookText,
  Tag,
  ListChecks,
} from 'lucide-react'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { createTransaction } from '@/api/create-transaction'
import { getAccounts } from '@/api/get-accounts'
import { getSectors } from '@/api/get-sectors'

import { CreateAccountDialog } from '@/components/create-account-dialog'
import { CreateSectorDialog } from '@/components/create-sector-dialog'
import { QuickAddSelect } from '@/components/ui/quick-add-select'
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

// Schema para Receitas (income)
const formSchema = z.object({
  date: z.date({
    required_error: "Data é obrigatória",
  }),
  description: z.string().min(1, "Descrição é obrigatória"),
  // account: z.string().min(1, "Conta é obrigatória"),
  account: z.string().min(1, "Conta é obrigatória"),
  sector: z.string().min(1, "Setor é obrigatório"),
  amount: z.string().min(1, "Valor é obrigatório").refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    "Valor deve ser maior que zero"
  ),
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

export function TransactionIncome() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'single' | 'installment'>('single')
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const [previewInstallmentsOpen, setPreviewInstallmentsOpen] = useState(false)
  const [installmentValue, setInstallmentValue] = useState<string>('')

  const [createAccountOpen, setCreateAccountOpen] = useState(false)
  const [createSectorOpen, setCreateSectorOpen] = useState(false)

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date(),
      description: '',
      account: '',
      sector: '',
      amount: '',
      confirmed: true, // Smart default: Receitas geralmente são lançadas quando recebidas
      installments_count: '',
      interval_frequency: 'MONTHLY'
    }
  })

  // getSectors retorna { data: { sectors: [...] } } (Axios Response)
  const { data: sectors } = useQuery({
    queryKey: ['sectors'],
    queryFn: () => getSectors(),
  })

  // getAccounts retorna { accounts: [...] } (Data Object)
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
    }
  })

  // Watching Amount and Count for Preview
  const watchedAmount = useWatch({ control: form.control, name: 'amount' })
  const watchedCount = useWatch({ control: form.control, name: 'installments_count' })

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

  async function onSubmit(data: FormSchemaType) {
    if (activeTab === 'installment' && (!data.custom_installments || data.custom_installments.length === 0)) {
      setPreviewInstallmentsOpen(true)
      return
    }

    try {
      const isInstallment = activeTab === 'installment'

      // Final Sanitization before sending to API
      const cleanInstallments = isInstallment && data.custom_installments
        ? data.custom_installments.map(i => ({
          date: i.date,
          amount: i.amount
        }))
        : undefined

      const transactionData = {
        operation: 'income' as const,
        amount: Number(data.amount),
        account: data.account,
        date: data.date,
        description: data.description,
        sector: data.sector,
        confirmed: data.confirmed,
        installments_count: isInstallment ? Number(data.installments_count) : undefined,
        interval_frequency: isInstallment ? data.interval_frequency : undefined,
        custom_installments: cleanInstallments
      }

      await transaction(transactionData)
      toast.success('Receita registrada com sucesso!')

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
      console.error('Erro ao cadastrar receita:', error)
      toast.error('Erro ao cadastrar receita')
    }
  }

  return (
    <ResponsiveDialogContent className="w-full sm:max-w-md bg-white dark:bg-zinc-950 p-6">
      <ResponsiveDialogHeader className="mb-6">
        <ResponsiveDialogTitle className="flex items-center gap-2 font-bold text-vida-loca-600 dark:text-vida-loca-500 text-xl">
          <CircleCheckBig className="h-6 w-6" />
          Nova Receita
        </ResponsiveDialogTitle>
        <ResponsiveDialogDescription>
          Registre uma entrada financeira abaixo.
        </ResponsiveDialogDescription>
      </ResponsiveDialogHeader>

      <Tabs value={activeTab} onValueChange={(v) => {
        setActiveTab(v as any)
        if (v === 'installment') {
          form.setValue('confirmed', false)
        } else if (v === 'single') {
          form.setValue('confirmed', true)
        }
      }} className="w-full mb-6">
        <TabsList className="grid w-full grid-cols-2 h-10">
          <TabsTrigger value="single" className="text-sm font-medium">À Vista</TabsTrigger>
          <TabsTrigger value="installment" className="text-sm font-medium">Recorrente</TabsTrigger>
        </TabsList>
      </Tabs>

      <Form {...form}>
        <form
          className="space-y-6"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          {/* Valor (Destaque) */}
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem className="relative bg-vida-loca-50/50 dark:bg-vida-loca-900/10 rounded-xl p-4 sm:p-6 border-2 border-vida-loca-100 dark:border-vida-loca-900">
                {activeTab === 'installment' && (
                  <div className="absolute top-2 left-0 w-full text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Valor Total do Contrato
                  </div>
                )}
                <div className="flex justify-center items-center mt-2">
                  <span className="text-3xl sm:text-4xl font-bold text-vida-loca-600 mr-2">R$</span>
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
                      className="border-none text-4xl sm:text-5xl font-bold text-vida-loca-600 placeholder:text-vida-loca-200 focus-visible:ring-0 p-0 h-14 sm:h-16 w-full text-center bg-transparent"
                      autoFocus
                    />
                  </FormControl>
                </div>
                {installmentPreview && (
                  <div className="mt-2 text-center text-sm font-medium text-vida-loca-700 dark:text-vida-loca-300">
                    <strong>{installmentPreview.count}x</strong> de <strong>{installmentPreview.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                  </div>
                )}
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Data */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data</FormLabel>
                  <Popover modal={true} open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          type="button"
                          className={cn(
                            "w-full pl-3 text-left font-normal h-11",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP", { locale: ptBR })
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
                      onInteractOutside={(e) => e.preventDefault()}
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

            {/* Recebido? */}
            {activeTab === 'single' && (
              <FormField
                control={form.control}
                name="confirmed"
                render={({ field }) => (
                  <FormItem className="flex flex-col justify-end h-full">
                    <FormLabel className="sr-only">Status Recebimento</FormLabel>
                    <div className="flex items-center justify-between sm:justify-start gap-4 border rounded-md px-3 h-11 bg-background">
                      <span className="text-sm font-medium">
                        {field.value ? 'Recebido' : 'A Receber'}
                      </span>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="data-[state=checked]:bg-vida-loca-500"
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-muted/20 p-4 pt-6 rounded-lg border border-dashed relative mt-4">
              <div className="absolute -top-3 left-4 bg-background px-2 text-xs text-muted-foreground font-medium border rounded-full">
                Ideal para contratos e assinaturas
              </div>

              <FormField
                control={form.control}
                name="installments_count"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nº de Ocorrências</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        inputMode="numeric"
                        placeholder="Ex: 12"
                        className="h-11"
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

              <FormItem>
                <FormLabel>Valor Mensal/Unitário</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={installmentValue}
                    className="h-11"
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
                  <FormItem>
                    <FormLabel>Frequência</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11">
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

          {/* Descrição */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Ex: Venda de serviço, Consultoria..."
                    className="h-11"
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Categoria/Setor */}
            <FormField
              control={form.control}
              name="sector"
              render={({ field: { onChange, value, disabled } }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <QuickAddSelect
                    value={value}
                    onValueChange={onChange}
                    disabled={disabled}
                    isLoading={!sectors}
                    placeholder="Selecione"
                    emptyMessage="Nenhuma categoria encontrada"
                    options={sectors?.data.sectors
                      .filter((sector) => sector.type === 'in') // Income sectors only
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

            {/* Conta */}
            <FormField
              control={form.control}
              name="account"
              render={({ field: { onChange, value, disabled } }) => (
                <FormItem>
                  <FormLabel>Conta</FormLabel>
                  <QuickAddSelect
                    value={value}
                    onValueChange={onChange}
                    disabled={disabled}
                    isLoading={!accounts}
                    placeholder="Selecione"
                    emptyMessage="Nenhuma conta encontrada"
                    options={accounts?.accounts.map((account) => ({
                      label: account.name,
                      value: account.id,
                      balance: account.balance
                    }))}
                    quickAddLabel="Nova Conta"
                    onQuickAddClick={() => setCreateAccountOpen(true)}
                  />
                </FormItem>
              )}
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 section-footer">
            <ResponsiveDialogClose asChild>
              <Button variant="ghost" type="button" className="w-full sm:w-auto h-11">
                Cancelar
              </Button>
            </ResponsiveDialogClose>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-vida-loca-600 text-white hover:bg-vida-loca-700 w-full sm:w-auto h-11 font-bold text-base shadow-sm gap-2"
            >
              {isPending ? 'Salvando...' : (
                activeTab === 'installment' ? (
                  <>
                    <ListChecks className="w-5 h-5" />
                    Conferir Recorrência
                  </>
                ) : 'Confirmar Receita'
              )}
            </Button>
          </div>
        </form>
      </Form>

      {/* PREVIEW DIALOG */}
      <InstallmentPreviewDialog
        open={previewInstallmentsOpen}
        onOpenChange={setPreviewInstallmentsOpen}
        totalAmount={Number(form.getValues('amount'))}
        installmentsCount={Number(form.getValues('installments_count'))}
        startDate={form.getValues('date')}
        frequency={form.getValues('interval_frequency') || 'MONTHLY'}
        onConfirm={handleConfirmInstallments}
      />

      {/* Dialogs at the end of component, relying on state */}
      <CreateSectorDialog
        open={createSectorOpen}
        onOpenChange={setCreateSectorOpen}
        defaultType='in'
        onSuccess={(newSector) => {
          form.setValue('sector', newSector.id)
        }}
      />
      <CreateAccountDialog
        open={createAccountOpen}
        onOpenChange={setCreateAccountOpen}
        onSuccess={(newAccount) => {
          // API returns { id: ... } even if inside a wrapper
          if (newAccount.id) form.setValue('account', newAccount.id)
        }}
      />
    </ResponsiveDialogContent>
  )
}