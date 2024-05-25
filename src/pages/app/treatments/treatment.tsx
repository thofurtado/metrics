import { zodResolver } from '@hookform/resolvers/zod'
import { PopoverClose } from '@radix-ui/react-popover'
import { useMutation, useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  ArrowBigRightDash,
  Calendar as CalendarIcon,
  Gem,
  Handshake,
  UserPlus,
} from 'lucide-react'
import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'

import { createTreatment } from '@/api/create-treatment'
import { getClients } from '@/api/get-clients'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Dialog, DialogTrigger } from '@/components/ui/dialog'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { TimePickerDemo } from '@/components/ui/time-picker-demo'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

import { TreatmentClient } from './treatment-client'

const formSchema = z.object({
  openingDate: z.date().nullish(),
  endingDate: z.date().nullish(),
  request: z.string(),
  observation: z.string(),
  client: z.string({
    required_error: 'Por favor, selecione um cliente',
  }),
  status: z.string().nullish(),
  contact: z.string().nullish(),
})

type FormSchemaType = z.infer<typeof formSchema>
export interface TreatmentInteractionsProps {
  openingDate: Date
  endingDate: Date
  request: string
  observation: string
  client: string
  status: string
  contact: string
}

export function Treatment() {
  const [openClientDialog, setOpenClientDialog] = useState(false)
  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
  })
  const navigate = useNavigate()
  const { mutateAsync: treatment } = useMutation({
    mutationFn: createTreatment,
  })

  const { data: result } = useQuery({
    queryKey: ['clients'],
    queryFn: () => getClients(),
  })

  async function onSubmit({
    openingDate,
    endingDate,
    request,
    observation,
    status,
    contact,
    client,
  }: FormSchemaType) {
    const correctStatus = status || 'pending'
    // eslint-disable-next-line camelcase
    const ending_date = endingDate || new Date()
    const response = await treatment({
      openingDate,
      // eslint-disable-next-line camelcase
      endingDate: ending_date,
      request,
      observation,
      status: correctStatus,
      contact,
      client,
    })
    if (response !== undefined) {
      toast.success('Atendimento cadastrado com sucesso')
      setTimeout(() => {
        navigate('/treatments')
      }, 1000)
    }
  }
  return (
    <>
      <Helmet title="Cadastro de Atendimentos" />
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold tracking-tight">
          Cadastro de Atendimento
        </h1>

        <div className="space-y-2.5">
          <Form {...form}>
            <form
              className="flex w-full flex-col place-content-center content-around items-center justify-center justify-items-center gap-8 rounded-md border p-8"
              onSubmit={form.handleSubmit(onSubmit)}
            >
              <div className="flex w-3/5 flex-row justify-between">
                <FormField
                  control={form.control}
                  name="openingDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col items-center">
                      <FormLabel className="text-left">Abertura</FormLabel>
                      <div className="flex flex-row">
                        <Popover>
                          <FormControl>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  'w-60 justify-start text-left font-normal',
                                  !field.value && 'text-muted-foreground',
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? (
                                  format(field.value, 'PPP HH:mm:ss')
                                ) : (
                                  <span>Deixe em branco (data atual)</span>
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
                                <Button>
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
                <FormField
                  control={form.control}
                  name="status"
                  render={({
                    field: { name, onChange, value = 'pending', disabled },
                  }) => (
                    <FormItem className="flex flex-col content-end items-center">
                      <FormLabel className="text-left align-baseline">
                        Estado
                      </FormLabel>
                      <Popover>
                        <FormControl>
                          <Select
                            defaultValue="pending"
                            value={value}
                            onValueChange={onChange}
                            disabled={disabled}
                          >
                            <SelectTrigger className="h-10 w-[180px]">
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
                              <SelectItem value="canceled">
                                Cancelado
                              </SelectItem>
                              <SelectItem value="on_hold">Em espera</SelectItem>
                              <SelectItem value="in_workbench">
                                Em Bancada
                              </SelectItem>
                              <SelectItem value="resolved">
                                Resolvido
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </Popover>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endingDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col items-center">
                      <FormLabel className="text-left">Encerramento</FormLabel>
                      <div className="flex flex-row">
                        <Popover>
                          <FormControl>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  'justify-start text-left font-normal',
                                  !field.value && 'text-muted-foreground',
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4 " />
                                {field.value ? (
                                  format(field.value, 'PPP HH:mm:ss')
                                ) : (
                                  <span>Escolha caso finalizado</span>
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
                                <Button>
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
              </div>
              <div className=" flex w-3/5 flex-row justify-between">
                <div className="flex w-full items-center">
                  <FormField
                    control={form.control}
                    name="client"
                    render={({
                      field: { name, onChange, value, disabled },
                    }) => (
                      <FormItem className="flex w-2/6 flex-col content-end items-start">
                        <FormLabel className="self-center text-left ">
                          Cliente
                        </FormLabel>
                        <Popover>
                          <FormControl>
                            <Select
                              defaultValue="Carregando..."
                              value={value}
                              onValueChange={onChange}
                              disabled={disabled}
                            >
                              <SelectTrigger className="h-10">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {result &&
                                  result.data.clients.map((client) => (
                                    <SelectItem
                                      value={client.id}
                                      key={client.id}
                                    >
                                      <span className="flex">
                                        {client.name}
                                        {client.contract ? (
                                          <Gem className="ml-2 h-4 w-4 text-yellow-500" />
                                        ) : null}
                                      </span>
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                        </Popover>
                      </FormItem>
                    )}
                  />

                  <Dialog
                    open={openClientDialog}
                    onOpenChange={setOpenClientDialog}
                  >
                    <DialogTrigger asChild>
                      <Button variant="ghost" className="hover:bg-white">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <UserPlus className="ml-2 mt-2 h-5 w-5 text-vida-loca-600" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Adicionar Cliente</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </Button>
                    </DialogTrigger>
                    <TreatmentClient open={openClientDialog} />
                  </Dialog>
                </div>
                <FormField
                  control={form.control}
                  name="contact"
                  render={({ field }) => (
                    <FormItem className="flex w-2/6 flex-col">
                      <FormLabel className="self-center text-left">
                        Contato
                      </FormLabel>
                      <FormControl>
                        <Input value={field.value} {...field}></Input>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex w-full flex-col items-center">
                <FormField
                  control={form.control}
                  name="request"
                  render={({ field }) => (
                    <FormItem className="flex w-3/5 flex-col">
                      <FormLabel className="text-left">Requisição</FormLabel>
                      <Popover>
                        <FormControl>
                          <Input value={field.value} {...field}></Input>
                        </FormControl>
                      </Popover>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="observation"
                  render={({ field }) => (
                    <FormItem className="mt-6 flex w-3/5 flex-col">
                      <FormLabel className="text-left">Observação</FormLabel>
                      <Popover>
                        <FormControl>
                          <Textarea
                            value={field.value}
                            {...field}
                            className="h-40"
                          ></Textarea>
                        </FormControl>
                      </Popover>
                    </FormItem>
                  )}
                />
              </div>
              <Button
                type="submit"
                className="bg-minsk-400 text-white hover:bg-minsk-500"
              >
                Cadastrar
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </>
  )
}
