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
  const { continueOnSubmit, setContinueOnSubmit } = useState(false)
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
  })

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
        navigate('/treatments')
      }
    }
  }

  return (
    <DialogContent className="w-720p">
      <DialogHeader>
        <DialogTitle>Cadastro Interação do Atendimento</DialogTitle>
        <DialogDescription>{treatmentId}</DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form
          className="flex flex-col items-start justify-center gap-8"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <FormField
            control={form.control}
            name="status"
            render={({ field: { onChange, value, disabled } }) => (
              <FormItem className="flex w-full flex-col">
                <FormLabel className="text-left">
                  Qual o estado do atendimento?
                </FormLabel>
                <Popover>
                  <FormControl>
                    <Select
                      defaultValue={status}
                      value={value}
                      onValueChange={onChange}
                      disabled={disabled}
                    >
                      <SelectTrigger className="h-8 w-1/2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="in_progress">
                          Em Andamento
                        </SelectItem>
                        <SelectItem value="follow_up">
                          Acompanhamento
                        </SelectItem>
                        <SelectItem value="canceled">Cancelado</SelectItem>
                        <SelectItem value="on_hold">Em espera</SelectItem>
                        <SelectItem value="in_workbench">Em Bancada</SelectItem>
                        <SelectItem value="resolved">Resolvido</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                </Popover>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="flex w-full flex-col">
                <FormLabel className="text-left">
                  Descreva a interação com o cliente:
                </FormLabel>
                <Popover>
                  <FormControl>
                    <Textarea value={field.value} {...field}></Textarea>
                  </FormControl>
                </Popover>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dateTime"
            render={({ field }) => (
              <FormItem className="flex w-full flex-col ">
                <FormLabel className="text-left">
                  Data e hora da interação
                </FormLabel>
                <div className="flex flex-row">
                  <Popover>
                    <FormControl>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !field.value && 'text-muted-foreground',
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 " />
                          {field.value ? (
                            format(field.value, 'PPP HH:mm:ss')
                          ) : (
                            <span>
                              Selecione uma data ou deixe em branco para data
                              atual
                            </span>
                          )}
                        </Button>
                      </PopoverTrigger>
                    </FormControl>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />

                      <div className="flex flex-row border-t border-border p-3">
                        <TimePickerDemo
                          setDate={field.onChange}
                          date={field.value}
                        />
                        <PopoverClose asChild className="ml-4 mt-4">
                          <Button className="bg-minsk-400 text-white hover:bg-minsk-500">
                            <ArrowBigRightDash></ArrowBigRightDash>
                          </Button>
                        </PopoverClose>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </FormItem>
            )}
          />
          <div className="flex w-full justify-end space-x-2">
            <Button
              type="submit"
              className="justify-self-end bg-minsk-500 text-white hover:bg-minsk-600"
              onClick={() => changeSubmitContinue(true)}
            >
              Gravar e Continuar
            </Button>
            <Button
              type="submit"
              className="justify-self-end border-2 border-minsk-400 bg-white font-bold text-minsk-500 hover:bg-minsk-100"
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
