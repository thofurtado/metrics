import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  Calculator,
  CalendarDays,
  CircleCheckBig,
  Landmark,
  NotebookText,
  Tag,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { createTransaction } from '@/api/create-transaction'
import { getAccounts } from '@/api/get-accounts'
import { getSectors } from '@/api/get-sectors'
import { Button } from '@/components/ui/button'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

// CORREÇÃO: Schema mais restritivo com validações
const formSchema = z.object({
  date: z.date({
    required_error: "Data é obrigatória",
  }),
  description: z.string().min(1, "Descrição é obrigatória"),
  account: z.string().min(1, "Conta é obrigatória"),
  sector: z.string().min(1, "Setor é obrigatório"),
  amount: z.string().min(1, "Valor é obrigatório").refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    "Valor deve ser maior que zero"
  ),
  confirmed: z.boolean().default(false),
})

type FormSchemaType = z.infer<typeof formSchema>

export interface TransactionExpenseProps {
  open: boolean
}

// Componente de Calendário Simples e Direto
function SimpleCalendar({
  selected,
  onSelect
}: {
  selected: Date | undefined
  onSelect: (date: Date) => void
}) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isOpen, setIsOpen] = useState(false)

  const today = new Date()

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const handleDateSelect = (day: number) => {
    const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    onSelect(selectedDate)
    setIsOpen(false)
  }

  const isToday = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    return date.toDateString() === today.toDateString()
  }

  const isSelected = (day: number) => {
    if (!selected) return false
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    return date.toDateString() === selected.toDateString()
  }

  const daysInMonth = getDaysInMonth(currentDate)
  const firstDay = getFirstDayOfMonth(currentDate)

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  return (
    <div className="relative">
      {/* Botão para abrir o calendário */}
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-48 justify-start text-left font-normal',
          !selected && 'text-muted-foreground',
        )}
      >
        {selected ? format(selected, 'dd/MM/yyyy') : 'Selecione a Data'}
      </Button>

      {/* Calendário Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-2 w-64 rounded-lg border bg-white p-4 shadow-lg dark:bg-gray-800 dark:border-gray-700">
          <div className="space-y-4">
            {/* Header do Calendário */}
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => navigateMonth('prev')}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="text-sm font-medium">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => navigateMonth('next')}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Dias da semana */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {weekDays.map(day => (
                <div key={day} className="font-medium text-gray-500 dark:text-gray-400">
                  {day}
                </div>
              ))}
            </div>

            {/* Dias do mês */}
            <div className="grid grid-cols-7 gap-1">
              {/* Espaços vazios antes do primeiro dia */}
              {Array.from({ length: firstDay }).map((_, index) => (
                <div key={`empty-${index}`} className="h-8" />
              ))}

              {/* Dias do mês */}
              {Array.from({ length: daysInMonth }).map((_, index) => {
                const day = index + 1
                const isTodayDate = isToday(day)
                const isSelectedDate = isSelected(day)

                return (
                  <Button
                    type="button"
                    key={day}
                    variant={isSelectedDate ? "default" : "ghost"}
                    size="sm"
                    className={cn(
                      "h-8 w-8 p-0 text-xs font-normal",
                      isTodayDate && !isSelectedDate && "border-2 border-blue-500",
                      isSelectedDate && "bg-blue-500 text-white hover:bg-blue-600"
                    )}
                    onClick={() => handleDateSelect(day)}
                  >
                    {day}
                  </Button>
                )
              })}
            </div>

            {/* Botões de ação */}
            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onSelect(today)
                  setIsOpen(false)
                }}
                className="text-xs"
              >
                Hoje
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="text-xs"
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function TransactionExpense({ open }: TransactionExpenseProps) {
  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date(),
      description: '',
      account: '',
      sector: '',
      amount: '',
      confirmed: false,
    }
  })

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
  })

  useEffect(() => {
    if (form.formState.isSubmitSuccessful) {
      form.reset({
        date: new Date(),
        description: '',
        account: '',
        sector: '',
        amount: '',
        confirmed: false,
      })
    }
  }, [form.formState.isSubmitSuccessful, form])

  async function onSubmit(data: FormSchemaType) {
    try {
      console.log('Dados enviados:', {
        date: data.date,
        description: data.description,
        account: data.account,
        sector: data.sector,
        amount: data.amount,
        confirmed: data.confirmed,
        operation: 'expense'
      })

      // CORREÇÃO: Garantir que todos os campos estejam preenchidos
      const transactionData = {
        operation: 'expense' as const,
        amount: Number(data.amount),
        account: data.account,
        date: data.date,
        description: data.description,
        sector: data.sector,
        confirmed: data.confirmed,
      }

      console.log('Dados processados:', transactionData)

      const response = await transaction(transactionData)

      if (response !== undefined) {
        toast.success('Despesa cadastrada')
      }
    } catch (error) {
      console.error('Erro ao cadastrar despesa:', error)
      toast.error('Erro ao cadastrar despesa')
    }
  }

  return (
    <DialogContent className="w-96 max-w-[95vw]">
      <DialogHeader>
        <DialogTitle className="font-semibold text-stiletto-400">
          Nova Despesa
        </DialogTitle>
        <DialogDescription className="sr-only">
          Formulário para cadastrar uma nova despesa
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form
          className="flex flex-col items-start justify-center gap-6"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem className="flex w-full flex-row items-center space-x-2 border-b-2">
                <FormLabel className="text-left">
                  <Calculator className="h-5 w-5" />
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    className="border-none text-center text-lg font-semibold text-stiletto-600 focus:!ring-transparent"
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmed"
            render={({ field }) => (
              <FormItem className="flex w-full flex-row items-center justify-between">
                <div className="flex flex-row items-center space-x-2">
                  <CircleCheckBig className="h-5 w-5" />
                  <FormLabel className="font-light text-gray-400">
                    Foi paga
                  </FormLabel>
                </div>
                <FormControl>
                  <Switch
                    aria-label="Conta paga"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="data-[state=checked]:bg-minsk-500 data-[state=unchecked]:bg-gray-300"
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex w-full flex-row items-center space-x-2">
                <FormLabel className="text-left">
                  <CalendarDays className="h-5 w-5" />
                </FormLabel>
                <FormControl>
                  <SimpleCalendar
                    selected={field.value}
                    onSelect={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="flex w-full flex-row items-center space-x-2 border-b-2">
                <FormLabel className="text-left">
                  <NotebookText className="h-5 w-5" />
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="text"
                    placeholder="Descrição"
                    className="border-none font-semibold"
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sector"
            render={({ field: { onChange, value, disabled } }) => (
              <FormItem className="flex w-full flex-row items-center space-x-2 border-b-2">
                <FormLabel className="text-left">
                  <Tag className="h-5 w-5" />
                </FormLabel>
                <FormControl>
                  <Select
                    value={value}
                    onValueChange={onChange}
                    disabled={disabled}
                  >
                    <SelectTrigger className="border-none">
                      <SelectValue placeholder="Selecione o setor" />
                    </SelectTrigger>
                    <SelectContent>
                      {sectors &&
                        sectors.data.sectors
                          .filter((sector) => sector.type === 'out')
                          .map((sector) => (
                            <SelectItem value={sector.id} key={sector.id}>
                              {sector.name}
                            </SelectItem>
                          ))}
                    </SelectContent>
                  </Select>
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="account"
            render={({ field: { onChange, value, disabled } }) => (
              <FormItem className="flex w-full flex-row items-center space-x-2 border-b-2">
                <FormLabel className="text-left">
                  <Landmark className="h-5 w-5" />
                </FormLabel>
                <FormControl>
                  <Select
                    value={value}
                    onValueChange={onChange}
                    disabled={disabled}
                  >
                    <SelectTrigger className="border-none">
                      <SelectValue placeholder="Selecione a conta" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts &&
                        accounts.data.accounts.map((account) => (
                          <SelectItem value={account.id} key={account.id}>
                            {account.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </FormControl>
              </FormItem>
            )}
          />

          <div className="flex w-full justify-end gap-2 pt-4">
            <DialogClose asChild>
              <Button variant="outline" type="button">
                Cancelar
              </Button>
            </DialogClose>
            <Button
              aria-label="Cadastrar transação"
              type="submit"
              disabled={isPending}
              className="bg-minsk-500 text-white hover:bg-minsk-600"
            >
              {isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </Form>
    </DialogContent>
  )
}