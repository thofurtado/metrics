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
import { TreatmentPaymentModal } from './treatment-payment-modal'

const formSchema = z.object({
  dateTime: z.date().nullish(),
  description: z.string().min(1, "A descrição é obrigatória"),
  status: z.string().nullish(),
})

type FormSchemaType = z.infer<typeof formSchema>

export interface TreatmentInteractionsProps {
  treatmentId: string
  open: boolean
  status: string
  amount: number
}

// Componente de Calendário Simples
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

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay()

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      direction === 'prev' ? newDate.setMonth(prev.getMonth() - 1) : newDate.setMonth(prev.getMonth() + 1)
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
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className={cn('w-full justify-start text-left font-normal text-sm h-9', !selected && 'text-muted-foreground')}
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        {selected ? format(selected, 'dd/MM/yyyy') : 'Selecione a Data'}
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-2 w-64 rounded-lg border bg-white p-4 shadow-lg dark:bg-gray-800 dark:border-gray-700">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Button type="button" variant="ghost" size="sm" onClick={() => navigateMonth('prev')} className="h-8 w-8 p-0"><ChevronLeft className="h-4 w-4" /></Button>
              <div className="text-sm font-medium">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</div>
              <Button type="button" variant="ghost" size="sm" onClick={() => navigateMonth('next')} className="h-8 w-8 p-0"><ChevronRight className="h-4 w-4" /></Button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {weekDays.map(day => <div key={day} className="font-medium text-gray-500">{day}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} className="h-8" />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                return (
                  <Button
                    key={day}
                    type="button"
                    variant={isSelected(day) ? "default" : "ghost"}
                    className={cn("h-8 w-8 p-0 text-xs", isToday(day) && !isSelected(day) && "border-2 border-blue-500", isSelected(day) && "bg-blue-500 text-white")}
                    onClick={() => handleDateSelect(day)}
                  >
                    {day}
                  </Button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Componente de Seletor de Hora
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
    const newDate = selected ? new Date(selected) : new Date()
    newDate.setHours(hours)
    newDate.setMinutes(minutes)
    onSelect(newDate)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className={cn('w-full justify-start text-left font-normal text-sm h-9', !selected && 'text-muted-foreground')}
      >
        {selected ? format(selected, 'HH:mm') : 'Selecione a Hora'}
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-2 w-48 rounded-lg border bg-white p-4 shadow-lg dark:bg-gray-800">
          <div className="flex gap-2 mb-4">
            <select value={hours} onChange={(e) => setHours(Number(e.target.value))} className="flex-1 rounded border p-1 text-sm">
              {Array.from({ length: 24 }).map((_, i) => <option key={i} value={i}>{i.toString().padStart(2, '0')}</option>)}
            </select>
            <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className="flex-1 rounded border p-1 text-sm">
              {Array.from({ length: 60 }).map((_, i) => <option key={i} value={i}>{i.toString().padStart(2, '0')}</option>)}
            </select>
          </div>
          <Button type="button" className="w-full bg-minsk-500 text-white" onClick={handleTimeSelect}>OK</Button>
        </div>
      )}
    </div>
  )
}

export function TreatmentInteraction({
  treatmentId,
  status,
  amount,
}: TreatmentInteractionsProps) {
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [pendingInteractionData, setPendingInteractionData] = useState<FormSchemaType | null>(null)
  const [continueOnSubmit, setContinueOnSubmit] = useState(false)
  const navigate = useNavigate()

  const { mutateAsync: interaction } = useMutation({ mutationFn: createInteraction })
  const { mutateAsync: statusupdate } = useMutation({ mutationFn: updateStatusTreatment })

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
      form.reset({ dateTime: new Date(), description: '', status: status })
    }
  }, [form.formState.isSubmitSuccessful, form, status])

  async function processSubmission(data: FormSchemaType) {
    try {
      if (status !== data.status && data.status !== undefined) {
        if (data.status === 'resolved' || data.status === 'canceled') {
          await statusupdate({ id: treatmentId, status: data.status, endingDate: data.dateTime || undefined })
        } else {
          await statusupdate({ id: treatmentId, status: data.status || 'pending' })
        }
      }

      const response = await interaction({
        id: treatmentId,
        date: data.dateTime || new Date(),
        description: data.description,
      })

      if (response !== undefined) {
        toast.success('Interação cadastrada', { position: 'top-center' })
        if (!continueOnSubmit) navigate('/treatments')
      }
    } catch (error) {
      toast.error('Erro ao cadastrar interação')
    }
  }

  async function onSubmit(data: FormSchemaType) {
    // Check if status is changing to 'resolved' which usually triggers payment
    if (data.status === 'resolved' && status !== 'resolved') {
      // Conditional Logic: Only open payment modal if there is a positive amount to pay.
      // If amount is 0 (e.g. Warranty, Doubt, or Contract), skip payment and finish directly.
      if (amount && amount > 0) {
        setPendingInteractionData(data)
        setIsPaymentModalOpen(true)
        return
      }
    }
    await processSubmission(data)
  }

  return (
    <>
      <TreatmentPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSuccess={() => { setIsPaymentModalOpen(false); if (pendingInteractionData) processSubmission(pendingInteractionData); }}
        totalAmount={amount}
        treatmentId={treatmentId}
      />
      <DialogContent className="w-full max-w-full p-4 sm:max-w-md md:max-w-lg lg:max-w-xl">
        <DialogHeader>
          <DialogTitle>Cadastro Interação do Atendimento</DialogTitle>
          <DialogDescription>{treatmentId}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="status"
              render={({ field: { onChange, value, disabled } }) => (
                <FormItem>
                  <FormLabel>Qual o estado do atendimento?</FormLabel>
                  <FormControl>
                    <Select value={value ?? undefined} onValueChange={onChange} disabled={disabled}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="in_progress">Em Andamento</SelectItem>
                        <SelectItem value="follow_up">Acompanhamento</SelectItem>
                        <SelectItem value="canceled">Cancelado</SelectItem>
                        <SelectItem value="on_hold">Em espera</SelectItem>
                        <SelectItem value="in_workbench">Em Bancada</SelectItem>
                        <SelectItem value="resolved">Resolvido</SelectItem>
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
                <FormItem>
                  <FormLabel>Descreva a interação:</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="O que foi feito no atendimento..." />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex flex-col gap-3 sm:flex-row">
              <FormField
                control={form.control}
                name="dateTime"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Data</FormLabel>
                    <SimpleCalendar selected={field.value || undefined} onSelect={field.onChange} />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dateTime"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Hora</FormLabel>
                    <SimpleTimePicker selected={field.value || undefined} onSelect={field.onChange} />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button type="submit" onClick={() => setContinueOnSubmit(true)} className="bg-minsk-500 text-white">Gravar e Continuar</Button>
              <Button type="submit" onClick={() => setContinueOnSubmit(false)} variant="outline" className="border-minsk-400 text-minsk-500">Gravar</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </>
  )
}