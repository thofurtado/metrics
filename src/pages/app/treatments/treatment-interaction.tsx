import { zodResolver } from '@hookform/resolvers/zod'
import { PopoverClose } from '@radix-ui/react-popover'
import { useMutation } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ArrowBigRightDash, Calendar as CalendarIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'

import { createInteraction } from '@/api/create-interaction'
import { updateStatusTreatment } from '@/api/update-status-treatment'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { TimePickerDemo } from '@/components/ui/time-picker-demo'
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

export function TreatmentInteraction({
  treatmentId,
  status,
}: TreatmentInteractionsProps) {
  // CORREÇÃO: Usando `useState` corretamente
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
  })

  useEffect(() => {
    if (form.formState.isSubmitSuccessful) {
      form.reset({
        dateTime: null,
        description: '',
        status: '',
      })
    }
  }, [form.formState.isSubmitSuccessful, form]) // Adicionado 'form' como dependência para boas práticas

  function changeSubmitContinue(keep: boolean) {
    setContinueOnSubmit(keep)
  }

  async function onSubmit(data: FormSchemaType) {
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
        // CORREÇÃO: O ideal é fechar o Dialog, não navegar para outra rota
        // A navegação para '/treatments' só deve ocorrer se o diálogo estiver
        // sendo usado fora do contexto de tabela, o que parece ser o caso.
        // Se for um modal, mantenha a navegação ou use um `onOpenChange(false)`
        navigate('/treatments') 
      }
    }
  }

  return (
    // MODIFICAÇÃO AQUI: Garante largura total no mobile e max-w-lg em telas maiores
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
              // MODIFICAÇÃO AQUI: w-full e max-w-[90%] no mobile, centralizado (mx-auto)
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
              // MODIFICAÇÃO AQUI: w-full e max-w-[90%] no mobile, centralizado (mx-auto)
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

          <FormField
            control={form.control}
            name="dateTime"
            render={({ field }) => (
              // MODIFICAÇÃO AQUI: w-full e max-w-[90%] no mobile, centralizado (mx-auto)
              <FormItem className="mx-auto flex w-full max-w-[90%] flex-col sm:max-w-full">
                <FormLabel className="text-left text-sm sm:text-base">
                  Data e hora da interação
                </FormLabel>
                <FormControl>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal text-sm h-9',
                          !field.value && 'text-muted-foreground',
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? (
                          format(field.value, 'dd/MM/yy HH:mm')
                        ) : (
                          <span className="text-xs sm:text-sm">
                            Definir data/hora ou manter atual
                          </span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                      <div className="flex flex-col border-t border-border p-3 sm:flex-row gap-2">
                        <TimePickerDemo
                          setDate={field.onChange}
                          date={field.value}
                        />
                        <PopoverClose
                          asChild
                          className="mt-2 sm:ml-4 sm:mt-0"
                        >
                          <Button
                            size="sm"
                            className="w-full sm:w-auto bg-minsk-400 text-white hover:bg-minsk-500"
                          >
                            <ArrowBigRightDash className="h-4 w-4" />
                          </Button>
                        </PopoverClose>
                      </div>
                    </PopoverContent>
                  </Popover>
                </FormControl>
              </FormItem>
            )}
          />

          {/* MODIFICAÇÃO AQUI: w-full e max-w-[90%] no mobile, centralizado (mx-auto) */}
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