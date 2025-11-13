import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'

import { createInteraction } from '@/api/create-interaction'
import { updateStatusTreatment } from '@/api/update-status-treatment'
import { Button } from '@/components/ui/button'
import {
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const formSchema = z.object({
  dateTime: z.date().nullish(),
  description: z.string(),
  status: z.string().nullish(),
})

type FormSchemaType = z.infer<typeof formSchema>

export interface TreatmentInteractionsProps {
  treatmentId: string
  open: boolean
  status: string
}

// Componente de Calendário Simples e Direto (MESMO das entradas/despesas)
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
          'w-full justify-start text-left font-normal text-sm h-9',
          !selected && 'text-muted-foreground',
        )}
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
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

// Componente de Seletor de Hora Simples
function SimpleTimePicker({
  selected,
  onSelect
}: {
  selected: Date | undefined
  onSelect: (date: Date) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [hours, setHours] = useState(selected?.getHours() || new Date().getHours())
  const [minutes, setMinutes] = useState(selected?.getMinutes() || new Date().getMinutes())

  const handleTimeSelect = () => {
    if (selected) {
      const newDate = new Date(selected)
      newDate.setHours(hours)
      newDate.setMinutes(minutes)
      onSelect(newDate)
    } else {
      const newDate = new Date()
      newDate.setHours(hours)
      newDate.setMinutes(minutes)
      onSelect(newDate)
    }
    setIsOpen(false)
  }

  const formatTime = (date: Date | undefined) => {
    if (!date) return 'Selecione a Hora'
    return format(date, 'HH:mm')
  }

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full justify-start text-left font-normal text-sm h-9',
          !selected && 'text-muted-foreground',
        )}
      >
        {formatTime(selected)}
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-2 w-48 rounded-lg border bg-white p-4 shadow-lg dark:bg-gray-800 dark:border-gray-700">
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-gray-500">Hora</label>
                <select
                  value={hours}
                  onChange={(e) => setHours(Number(e.target.value))}
                  className="w-full rounded border p-2 text-sm"
                >
                  {Array.from({ length: 24 }).map((_, i) => (
                    <option key={i} value={i}>
                      {i.toString().padStart(2, '0')}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500">Minuto</label>
                <select
                  value={minutes}
                  onChange={(e) => setMinutes(Number(e.target.value))}
                  className="w-full rounded border p-2 text-sm"
                >
                  {Array.from({ length: 60 }).map((_, i) => (
                    <option key={i} value={i}>
                      {i.toString().padStart(2, '0')}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const now = new Date()
                  setHours(now.getHours())
                  setMinutes(now.getMinutes())
                }}
                className="text-xs flex-1"
              >
                Agora
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleTimeSelect}
                className="text-xs flex-1 bg-minsk-500 hover:bg-minsk-600"
              >
                OK
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function TreatmentInteraction({
  treatmentId,
  status,
}: TreatmentInteractionsProps) {
  const [continueOnSubmit, setContinueOnSubmit] = useState(false)
  const navigate = useNavigate()
  const { mutateAsync: interaction } = useMutation({
    mutationFn: createInteraction,
  })
  const { mutateAsync: statusupdate } = useMutation({
    mutationFn: updateStatusTreatment,
  })

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dateTime: new Date(),
      description: '',
      status: status,
    }
  })

  useEffect(() => {
    if (form.formState.isSubmitSuccessful) {
      form.reset({
        dateTime: new Date(),
        description: '',
        status: status,
      })
    }
  }, [form.formState.isSubmitSuccessful, form, status])

  function changeSubmitContinue(keep: boolean) {
    setContinueOnSubmit(keep)
  }

  async function onSubmit(data: FormSchemaType) {
    try {
      if (status !== data.status && data.status !== undefined) {
        if (data.status === 'resolved' || data.status === 'canceled') {
          await statusupdate({
            id: treatmentId,
            status: data.status,
            endingDate: data.dateTime,
          })
        } else {
          await statusupdate({
            id: treatmentId,
            status: data.status,
          })
        }
      }

      const response = await interaction({
        id: treatmentId,
        date: data.dateTime ? data.dateTime : new Date(),
        description: data.description,
      })

      if (response !== undefined) {
        toast.success('Interação cadastrada', {
          position: 'top-center',
        })
        if (!continueOnSubmit) {
          navigate('/treatments')
        }
      }
    } catch (error) {
      console.error('Erro ao cadastrar interação:', error)
      toast.error('Erro ao cadastrar interação')
    }
  }

  return (
    <DialogContent className="w-full max-w-full p-4 sm:max-w-md md:max-w-lg lg:max-w-xl">
      <DialogHeader className="px-1 sm:px-0">
        <DialogTitle className="text-lg sm:text-xl">
          Cadastro Interação do Atendimento
        </DialogTitle>
        <DialogDescription className="text-sm">
          {treatmentId}
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form
          className="flex flex-col items-center justify-center gap-4 sm:gap-6"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <FormField
            control={form.control}
            name="status"
            render={({ field: { onChange, value, disabled } }) => (
              <FormItem className="mx-auto flex w-full max-w-[90%] flex-col sm:max-w-full">
                <FormLabel className="text-left text-sm sm:text-base">
                  Qual o estado do atendimento?
                </FormLabel>
                <FormControl>
                  <Select
                    defaultValue={status}
                    value={value}
                    onValueChange={onChange}
                    disabled={disabled}
                  >
                    <SelectTrigger className="h-9 w-full text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      <SelectItem value="pending" className="text-sm">
                        Pendente
                      </SelectItem>
                      <SelectItem value="in_progress" className="text-sm">
                        Em Andamento
                      </SelectItem>
                      <SelectItem value="follow_up" className="text-sm">
                        Acompanhamento
                      </SelectItem>
                      <SelectItem value="canceled" className="text-sm">
                        Cancelado
                      </SelectItem>
                      <SelectItem value="on_hold" className="text-sm">
                        Em espera
                      </SelectItem>
                      <SelectItem value="in_workbench" className="text-sm">
                        Em Bancada
                      </SelectItem>
                      <SelectItem value="resolved" className="text-sm">
                        Resolvido
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="mx-auto flex w-full max-w-[90%] flex-col sm:max-w-full">
                <FormLabel className="text-left text-sm sm:text-base">
                  Descreva a interação com o cliente:
                </FormLabel>
                <FormControl>
                  <Textarea
                    value={field.value}
                    {...field}
                    className="min-h-24 text-sm"
                    placeholder="Descreva o que foi feito no atendimento..."
                  ></Textarea>
                </FormControl>
              </FormItem>
            )}
          />

          {/* 🔥 DATA E HORA - MESMA ABORDAGEM DAS ENTRADAS/DESPESAS */}
          <div className="mx-auto flex w-full max-w-[90%] flex-col gap-3 sm:max-w-full sm:flex-row">
            <FormField
              control={form.control}
              name="dateTime"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel className="text-left text-sm sm:text-base">
                    Data da interação
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
              name="dateTime"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel className="text-left text-sm sm:text-base">
                    Hora da interação
                  </FormLabel>
                  <FormControl>
                    <SimpleTimePicker
                      selected={field.value}
                      onSelect={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          {/* Data/Hora selecionada - Preview */}
          <div className="mx-auto w-full max-w-[90%] text-center sm:max-w-full">
            <p className="text-sm text-muted-foreground">
              {form.watch('dateTime')
                ? `Data/hora selecionada: ${format(form.watch('dateTime')!, 'dd/MM/yyyy HH:mm')}`
                : 'Usando data/hora atual'
              }
            </p>
          </div>

          <div className="mx-auto flex w-full max-w-[90%] flex-col gap-2 sm:max-w-full sm:flex-row sm:justify-end sm:gap-3">
            <Button
              type="submit"
              className="w-full sm:w-auto bg-minsk-500 text-white hover:bg-minsk-600 text-sm h-9"
              onClick={() => changeSubmitContinue(true)}
            >
              Gravar e Continuar
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto border-2 border-minsk-400 bg-white font-bold text-minsk-500 hover:bg-minsk-100 text-sm h-9"
              onClick={() => changeSubmitContinue(false)}
            >
              Gravar
            </Button>
          </div>
        </form>
      </Form>
    </DialogContent>
  )
}