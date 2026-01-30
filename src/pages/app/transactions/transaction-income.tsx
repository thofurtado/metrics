
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
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
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
import {
  DialogClose,
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
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

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
})

type FormSchemaType = z.infer<typeof formSchema>

export function TransactionIncome() {
  const queryClient = useQueryClient()
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
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

  // Dialogs handle mutation internally now


  useEffect(() => {
    if (form.formState.isSubmitSuccessful) {
      form.reset({
        date: new Date(),
        description: '',
        account: '',
        sector: '',
        amount: '',
        confirmed: true,
      })
    }
  }, [form.formState.isSubmitSuccessful, form])

  async function onSubmit(data: FormSchemaType) {
    try {
      const transactionData = {
        operation: 'income' as const,
        amount: Number(data.amount),
        account: data.account,
        date: data.date,
        description: data.description,
        sector: data.sector,
        confirmed: data.confirmed,
      }

      await transaction(transactionData)
      toast.success('Receita registrada com sucesso!')
    } catch (error) {
      console.error('Erro ao cadastrar receita:', error)
      toast.error('Erro ao cadastrar receita')
    }
  }

  return (
    <DialogContent className="w-full max-w-sm sm:max-w-md bg-white dark:bg-zinc-950">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 font-bold text-vida-loca-600 dark:text-vida-loca-500">
          <CircleCheckBig className="h-5 w-5" />
          Nova Receita
        </DialogTitle>
        <DialogDescription className="">
          Registre uma entrada financeira.
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form
          className="flex flex-col gap-4 py-2"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          {/* Valor (Destaque) */}
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem className="relative">
                <div className="flex items-center border-b-2 border-vida-loca-100 dark:border-vida-loca-900 pb-1">
                  <span className="text-2xl font-bold text-vida-loca-600 mr-2">R$</span>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      className="border-none text-3xl font-bold text-vida-loca-600 placeholder:text-vida-loca-200 focus-visible:ring-0 p-0 h-10"
                      autoFocus
                    />
                  </FormControl>
                </div>
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            {/* Data */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="text-xs text-muted-foreground">Data</FormLabel>
                  <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal h-10",
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
                      onOpenAutoFocus={(e) => e.preventDefault()}
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
            <FormField
              control={form.control}
              name="confirmed"
              render={({ field }) => (
                <FormItem className="flex flex-col items-start justify-end pb-2">
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="data-[state=checked]:bg-vida-loca-500"
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-medium cursor-pointer">
                      {field.value ? 'Recebido' : 'A Receber'}
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />
          </div>

          {/* Descrição */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-muted-foreground flex items-center gap-1">
                  <NotebookText className="h-3 w-3" /> Descrição
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Ex: Venda de serviço, Consultoria..."
                    className="h-10"
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            {/* Categoria/Setor */}
            <FormField
              control={form.control}
              name="sector"
              render={({ field: { onChange, value, disabled } }) => (
                <FormItem>
                  <FormLabel className="text-xs text-muted-foreground flex items-center gap-1">
                    <Tag className="h-3 w-3" /> Categoria
                  </FormLabel>
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
                  <FormLabel className="text-xs text-muted-foreground flex items-center gap-1">
                    <Landmark className="h-3 w-3" /> Conta
                  </FormLabel>
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
                    }))}
                    quickAddLabel="Nova Conta"
                    onQuickAddClick={() => setCreateAccountOpen(true)}
                  />
                </FormItem>
              )}
            />
          </div>

          <div className="flex w-full justify-end gap-2 pt-4">
            <DialogClose asChild>
              <Button variant="ghost" type="button">
                Cancelar
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-vida-loca-600 text-white hover:bg-vida-loca-700 w-full sm:w-auto font-semibold shadow-sm"
            >
              {isPending ? 'Salvando...' : 'Confirmar Receita'}
            </Button>
          </div>
        </form>
      </Form>

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
    </DialogContent>
  )
}