'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Calendar as CalendarIcon } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
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
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/use-toast'

import { TimePickerDemo } from './time-picker-demo'

// 1. Definição do Schema
const formSchema = z.object({
  dateTime: z.date({
    required_error: "A data e hora são obrigatórias.",
  }),
})

// 2. CORREÇÃO DO ERRO: Criação do Tipo TypeScript baseado no Schema
type FormSchemaType = z.infer<typeof formSchema>

export function DateTimePickerForm() {
  const [open, setOpen] = useState(false)
  const [tempDate, setTempDate] = useState<Date | undefined>()

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
  })

  function onSubmit(data: FormSchemaType) {
    toast({
      title: 'Formulário enviado!',
      description: (
        <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
          <code className="text-white">{JSON.stringify(data, null, 2)}</code>
        </pre>
      ),
    })
  }

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) {
      // Ao abrir, pega o valor que já está salvo no formulário para editar
      const currentValue = form.getValues('dateTime')
      setTempDate(currentValue)
    }
  }

  const handleCancel = () => {
    setOpen(false)
    // Descarta alterações fechando o modal sem chamar o onChange do form
  }

  const handleConfirm = (onChange: (value: Date | undefined) => void) => {
    // Salva o estado temporário no estado real do formulário
    onChange(tempDate)
    setOpen(false)
  }

  const handleDateSelect = (newDate: Date | undefined) => {
    if (!newDate) {
      setTempDate(undefined)
      return
    }
    // Lógica para manter a hora ao trocar o dia no calendário
    if (tempDate) {
      const preservedTime = new Date(newDate)
      preservedTime.setHours(tempDate.getHours(), tempDate.getMinutes(), tempDate.getSeconds())
      setTempDate(preservedTime)
    } else {
      setTempDate(newDate)
    }
  }

  return (
    <Form {...form}>
      <form
        className="flex flex-col items-start gap-4 p-4"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <FormField
          control={form.control}
          name="dateTime"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Data e Hora do Agendamento</FormLabel>
              <Popover open={open} onOpenChange={handleOpen}>
                <FormControl>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        'w-[280px] justify-start text-left font-normal',
                        !field.value && 'text-muted-foreground',
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? (
                        format(field.value, "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })
                      ) : (
                        <span>Selecione data e hora</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                </FormControl>

                {/* w-auto e p-0 garantem que o popover se ajuste ao conteúdo */}
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    locale={ptBR}
                    mode="single"
                    selected={tempDate}
                    onSelect={handleDateSelect}
                    initialFocus
                  />

                  <div className="border-t border-border p-3 space-y-3">
                    <TimePickerDemo
                      setDate={setTempDate}
                      date={tempDate}
                    />

                    {/* Rodapé de Ações */}
                    <div className="flex justify-between items-center pt-2 gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCancel}
                        type="button" // IMPORTANTE: Impede submit do form
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleConfirm(field.onChange)}
                        type="button" // IMPORTANTE: Impede submit do form
                      >
                        Confirmar
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </FormItem>
          )}
        />

        {/* Botão para testar o envio real do formulário */}
        <Button type="submit">Enviar Formulário</Button>
      </form>
    </Form>
  )
}