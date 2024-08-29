import { zodResolver } from '@hookform/resolvers/zod'
import { PopoverClose } from '@radix-ui/react-popover'
import { useMutation, useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  ArrowBigRightDash,
  ArrowDownToLine,
  ArrowUpToLine,
  BetweenHorizonalStart,
  BookOpenCheck,
  BookOpenText,
  Building2,
  Calendar as CalendarIcon,
  ChevronDown,
  CircleUserRound,
  Computer,
  Crosshair,
  FlagTriangleRight,
  Gem,
  Handshake,
  LandPlot,
  NotebookText,
  UserPlus,
} from 'lucide-react'
import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { object, z } from 'zod'

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
import { TreatmentClientEquipment } from './treatment-client-equipment'

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
  equipment_id: z.string().nullish(),
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
  equipment_id: string
}

export function Treatment() {
  const [openClientDialog, setOpenClientDialog] = useState(false)
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false)
  const [isClosedDateDisabled, setIsClosedDateDisabled] = useState(true)
  const [isEquipmentDisabled, setIsEquipmentDisabled] = useState(true)

  const [clientId, setClienId] = useState(String(null))
  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
  })
  const navigate = useNavigate()
  const { mutateAsync: treatment } = useMutation({
    mutationFn: createTreatment,
  })

  const { data: clients } = useQuery({
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
    equipment_id,
  }: FormSchemaType) {
    const correctStatus = status || 'pending'
    // eslint-disable-next-line camelcase
    const ending_date = endingDate || new Date()
    console.log(equipment_id)
    const response = await treatment({
      openingDate,
      // eslint-disable-next-line camelcase
      endingDate: ending_date,
      request,
      observation,
      status: correctStatus,
      contact,
      client,
      equipment_id,
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
        <h1 className="font-eletro text-4xl font-bold tracking-tight text-minsk-900">
          Cadastro de Atendimento
        </h1>

        <div className="flex justify-center space-y-2">
          <Form {...form}>
            <form
              className="flex w-full flex-col place-content-center content-around items-center justify-center justify-items-center gap-6 rounded-md border bg-minsk-200 p-6 lg:w-2/3"
              onSubmit={form.handleSubmit(onSubmit)}
            >
              <div className="flex w-5/6 flex-row justify-between">
                <FormField
                  control={form.control}
                  name="openingDate"
                  render={({ field }) => (
                    <FormItem className="flex w-[240px] flex-col items-center">
                      <div className="flex flex-row">
                        <FormLabel className="text-left">Abertura</FormLabel>
                        <BookOpenText className="ml-2 h-4 w-4" />
                      </div>
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
                    <FormItem className="flex w-full flex-col content-end items-center">
                      <div className="flex w-[240px] flex-row justify-center">
                        <FormLabel className="text-left align-baseline">
                          Estado
                        </FormLabel>
                        <FlagTriangleRight className="ml-2 h-4 w-4" />
                      </div>
                      <Popover>
                        <FormControl>
                          <Select
                            defaultValue="pending"
                            value={value}
                            onValueChange={(newValue) => {
                              onChange(newValue)
                              if (
                                newValue === 'resolved' ||
                                newValue === 'canceled'
                              )
                                setIsClosedDateDisabled(false)
                              else setIsClosedDateDisabled(true)
                            }}
                            disabled={disabled}
                          >
                            <SelectTrigger className="h-10 w-[200px]">
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
                      <div className="flex flex-row">
                        <FormLabel className="text-left">
                          Encerramento
                        </FormLabel>
                        <BookOpenCheck className="ml-2 h-4 w-4" />
                      </div>
                      <div className="flex flex-row">
                        <Popover>
                          <FormControl>
                            <PopoverTrigger asChild>
                              <Button
                                disabled={isClosedDateDisabled}
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
              <div className="flex w-5/6 flex-row justify-between">
                <div className="flex w-1/3 items-center">
                  <FormField
                    control={form.control}
                    name="client"
                    render={({
                      field: { name, onChange, value, disabled },
                    }) => (
                      <FormItem className="flex w-[250px] flex-col content-end items-start">
                        <div className="flex w-full flex-row justify-center">
                          <FormLabel className="self-center text-left ">
                            Cliente
                          </FormLabel>
                          <Building2 className="ml-2 h-4 w-4" />
                        </div>
                        <Popover>
                          <FormControl>
                            <Select
                              defaultValue="Carregando..."
                              value={value}
                              onValueChange={(newValue) => {
                                onChange(newValue)
                                setClienId(newValue)
                                setIsEquipmentDisabled(false)
                              }}
                              disabled={disabled}
                            >
                              <SelectTrigger className="h-10">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {clients &&
                                  clients.data.clients.map((client) => (
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
                      <Button
                        variant="ghost"
                        className="!p-0 hover:bg-minsk-200 "
                      >
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <UserPlus className="ml-2 mt-5 h-6 w-6 text-vida-loca-600 hover:text-vida-loca-500" />
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
                <div className="flex w-1/3 items-center">
                  <FormField
                    control={form.control}
                    name="equipment_id"
                    render={({
                      field: {
                        name,
                        onChange,
                        value = 'Selecione o cliente',
                        disabled,
                      },
                    }) => (
                      <FormItem className="flex w-[240px] flex-col content-end items-center">
                        <div className="flex flex-row">
                          <FormLabel className="text-left align-baseline">
                            Equipamento
                          </FormLabel>
                          <Computer className="ml-2 h-4 w-4" />
                        </div>
                        <Popover>
                          <FormControl>
                            <Select
                              value={value}
                              onValueChange={onChange}
                              disabled={disabled}
                            >
                              <SelectTrigger
                                className="h-10 w-[200px]"
                                disabled={isEquipmentDisabled}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {clients?.data.clients.find(
                                  (client) => client.id === clientId,
                                )?.equipments.length > 0 &&
                                  clients?.data.clients
                                    .find((client) => client.id === clientId)
                                    ?.equipments.map((equipment) => (
                                      <SelectItem
                                        value={equipment.id}
                                        key={equipment.id}
                                      >
                                        <span className="flex">
                                          {`${equipment.type} - ${equipment.brand} - ${equipment.identification}`}
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
                    open={isClientDialogOpen}
                    onOpenChange={setIsClientDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        className="!p-0 hover:bg-white"
                        disabled={isEquipmentDisabled}
                      >
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <BetweenHorizonalStart className="ml-1 mt-5 h-5 w-5 text-vida-loca-600" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Adicionar Equipamento</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </Button>
                    </DialogTrigger>
                    <TreatmentClientEquipment
                      open={isClientDialogOpen}
                      clientId={clientId}
                    />
                  </Dialog>
                </div>
                <FormField
                  control={form.control}
                  name="contact"
                  render={({ field }) => (
                    <FormItem className="flex w-[200px] flex-col">
                      <div className="flex flex-row justify-center ">
                        <FormLabel className="self-center text-left">
                          Contato
                        </FormLabel>
                        <CircleUserRound className="ml-2 h-4 w-4" />
                      </div>
                      <FormControl>
                        <Input value={field.value} {...field}></Input>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex w-5/6 flex-col items-center">
                <FormField
                  control={form.control}
                  name="request"
                  render={({ field }) => (
                    <FormItem className="flex w-full flex-col">
                      <div className="flex flex-row">
                        <FormLabel className="text-left">Requisição</FormLabel>
                        <Crosshair className="ml-2 h-4 w-4" />
                      </div>
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
                    <FormItem className="mt-6 flex w-full flex-col">
                      <div className="flex flex-row">
                        <FormLabel className="text-left">
                          Descrição Detalhada
                        </FormLabel>
                        <NotebookText className="ml-2 h-4 w-4" />
                      </div>
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
                aria-label="Cadastrar Atendimento"
                type="submit"
                className="bg-vida-loca-900 text-white hover:bg-vida-loca-700"
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
