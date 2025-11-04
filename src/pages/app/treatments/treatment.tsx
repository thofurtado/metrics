import { zodResolver } from '@hookform/resolvers/zod'
import { PopoverClose } from '@radix-ui/react-popover'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  ArrowBigRightDash,
  BookOpenCheck,
  BookOpenText,
  Building2,
  Calendar as CalendarIcon,
  CircleUserRound,
  Computer,
  Crosshair,
  FlagTriangleRight,
  Gem,
  NotebookText,
  UserPlus,
  BetweenHorizonalStart,
  Search,
} from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
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

// Componente personalizado para o select de clientes
function ClientSelect({ 
  value, 
  onValueChange, 
  clients = [] 
}: { 
  value: string
  onValueChange: (value: string) => void
  clients: Array<{
    id: string
    name: string
    contract: boolean
  }>
}) {
  const [searchTerm, setSearchTerm] = useState('')

  // Ordenar clientes: primeiro os com contrato, depois os sem contrato, tudo em ordem alfabética
  const sortedAndFilteredClients = useMemo(() => {
    if (!clients) return []
    
    // Filtrar por termo de pesquisa
    const filtered = clients.filter(client =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Ordenar: primeiro clientes com contrato, depois sem contrato, tudo em ordem alfabética
    return filtered.sort((a, b) => {
      // Primeiro ordena por contrato (clientes com contrato primeiro)
      if (a.contract && !b.contract) return -1
      if (!a.contract && b.contract) return 1
      
      // Depois ordena alfabeticamente por nome
      return a.name.localeCompare(b.name)
    })
  }, [clients, searchTerm])

  return (
    <Select value={value} onValueChange={onValueChange}>
      <FormControl>
        <SelectTrigger className="h-9 w-full border-minsk-200 text-xs dark:border-minsk-600 dark:bg-minsk-800 dark:text-minsk-300 sm:h-10 sm:text-sm">
          <SelectValue placeholder="Selecione um cliente" />
        </SelectTrigger>
      </FormControl>
      <SelectContent className="border-minsk-200 max-w-[95vw] dark:border-minsk-600 dark:bg-minsk-800">
        {/* Campo de pesquisa */}
        <div className="sticky top-0 z-10 bg-white dark:bg-minsk-800 p-2 border-b border-minsk-200 dark:border-minsk-600">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-minsk-400" />
            <Input
              placeholder="Pesquisar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-xs border-minsk-200 dark:border-minsk-600 dark:bg-minsk-700"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>

        {/* Lista de clientes ordenada */}
        <div className="max-h-60 overflow-y-auto">
          {sortedAndFilteredClients.length === 0 ? (
            <div className="px-2 py-4 text-center text-xs text-minsk-500 dark:text-minsk-400">
              {searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
            </div>
          ) : (
            sortedAndFilteredClients.map((client) => (
              <SelectItem 
                value={client.id} 
                key={client.id} 
                className="text-xs sm:text-sm"
              >
                <span className="flex items-center gap-2 truncate">
                  <span className="truncate flex-1">{client.name}</span>
                  {client.contract && (
                    <span className="shrink-0 text-[10px] bg-vida-loca-100 text-vida-loca-700 dark:bg-vida-loca-900/30 dark:text-vida-loca-300 px-1.5 py-0.5 rounded">
                      Contrato
                    </span>
                  )}
                </span>
              </SelectItem>
            ))
          )}
        </div>
      </SelectContent>
    </Select>
  )
}

export function Treatment() {
  const [openClientDialog, setOpenClientDialog] = useState(false)
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false)
  const [isClosedDateDisabled, setIsClosedDateDisabled] = useState(true)
  const [isEquipmentDisabled, setIsEquipmentDisabled] = useState(true)
  const [clientId, setClientId] = useState<string | null>(null)

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
  })

  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  const { mutateAsync: treatment } = useMutation({
    mutationFn: createTreatment,
  })

  const { data: clients, refetch: refetchClients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => getClients(),
  })

  // Refetch quando o dialog de cliente fechar
  useEffect(() => {
    if (!openClientDialog) {
      refetchClients()
    }
  }, [openClientDialog, refetchClients])

  // Refetch quando o dialog de equipamento fechar
  useEffect(() => {
    if (!isClientDialogOpen) {
      refetchClients()
    }
  }, [isClientDialogOpen, refetchClients])

  async function onSubmit(data: FormSchemaType) {
    const correctStatus = data.status || 'pending'
    const ending_date = data.endingDate || new Date()

    const response = await treatment({
      ...data,
      endingDate: ending_date,
      status: correctStatus,
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
      <div className="flex flex-col gap-3 p-0 sm:p-4 w-full overflow-x-hidden">
        
        <div className="flex flex-col gap-2 rounded-none sm:rounded-xl bg-gradient-to-r from-minsk-600 to-vida-loca-500 p-4 text-white shadow">
          <h1 className="text-lg font-bold sm:text-xl">
            Cadastro de Atendimento
          </h1>
          <p className="text-minsk-100 text-xs opacity-90">
            Preencha os dados do atendimento
          </p>
        </div>

        <Form {...form}>
          <form
            className="flex w-full flex-col gap-3 px-4 py-3 border-none shadow-none rounded-none 
                       sm:gap-4 sm:p-4 sm:border sm:border-minsk-200 sm:rounded-xl sm:bg-white sm:shadow-sm
                       dark:border-minsk-700 dark:bg-minsk-900"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            {/* DATAS E STATUS */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
              {/* Data de Abertura */}
              <FormField
                control={form.control}
                name="openingDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="flex items-center gap-1 text-xs font-semibold text-minsk-700 dark:text-minsk-300 sm:text-sm">
                      <BookOpenText className="h-3 w-3 text-vida-loca-500 sm:h-4 sm:w-4" />
                      Abertura
                    </FormLabel>
                    <Popover>
                      <FormControl>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              'h-9 w-full justify-start text-left text-xs font-normal dark:border-minsk-600 dark:bg-minsk-800 dark:text-minsk-300 sm:h-10 sm:text-sm',
                              !field.value && 'text-muted-foreground',
                            )}
                          >
                            <CalendarIcon className="mr-1 h-3 w-3 text-minsk-500 sm:mr-2 sm:h-4 sm:w-4" />
                            {field.value ? (
                              <span className="text-minsk-800 dark:text-minsk-200">
                                {format(field.value, 'dd/MM/yy HH:mm')}
                              </span>
                            ) : (
                              <span className="text-minsk-500">Data atual</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                      </FormControl>
                      <PopoverContent className="w-auto p-0 max-w-[95vw] dark:border-minsk-600 dark:bg-minsk-800" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          className="rounded-lg dark:bg-minsk-800"
                        />
                        <div className="border-t border-minsk-200 p-2 dark:border-minsk-600 sm:p-3">
                          <TimePickerDemo
                            setDate={field.onChange}
                            date={field.value}
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                  </FormItem>
                )}
              />
              {/* Status */}
              <FormField
                control={form.control}
                name="status"
                render={({ field: { onChange, value = 'pending' } }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="flex items-center gap-1 text-xs font-semibold text-minsk-700 dark:text-minsk-300 sm:text-sm">
                      <FlagTriangleRight className="h-3 w-3 text-vida-loca-500 sm:h-4 sm:w-4" />
                      Estado
                    </FormLabel>
                    <Select
                      defaultValue="pending"
                      value={value}
                      onValueChange={(newValue) => {
                        onChange(newValue)
                        if (newValue === 'resolved' || newValue === 'canceled') {
                          setIsClosedDateDisabled(false)
                        } else {
                          setIsClosedDateDisabled(true)
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger className="h-9 w-full border-minsk-200 text-xs dark:border-minsk-600 dark:bg-minsk-800 dark:text-minsk-300 sm:h-10 sm:text-sm">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="border-minsk-200 max-w-[95vw] dark:border-minsk-600 dark:bg-minsk-800">
                        <SelectItem value="pending" className="text-xs sm:text-sm">Pendente</SelectItem>
                        <SelectItem value="in_progress" className="text-xs sm:text-sm">Em Andamento</SelectItem>
                        <SelectItem value="follow_up" className="text-xs sm:text-sm">Acompanhamento</SelectItem>
                        <SelectItem value="canceled" className="text-xs sm:text-sm">Cancelado</SelectItem>
                        <SelectItem value="on_hold" className="text-xs sm:text-sm">Em espera</SelectItem>
                        <SelectItem value="in_workbench" className="text-xs sm:text-sm">Em Bancada</SelectItem>
                        <SelectItem value="resolved" className="text-xs sm:text-sm">Resolvido</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              {/* Data de Encerramento */}
              <FormField
                control={form.control}
                name="endingDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="flex items-center gap-1 text-xs font-semibold text-minsk-700 dark:text-minsk-300 sm:text-sm">
                      <BookOpenCheck className="h-3 w-3 text-vida-loca-500 sm:h-4 sm:w-4" />
                      Encerramento
                    </FormLabel>
                    <Popover>
                      <FormControl>
                        <PopoverTrigger asChild>
                          <Button
                            disabled={isClosedDateDisabled}
                            variant="outline"
                            className={cn(
                              'h-9 w-full justify-start text-left text-xs font-normal dark:border-minsk-600 dark:bg-minsk-800 dark:text-minsk-300 sm:h-10 sm:text-sm',
                              !field.value && 'text-muted-foreground',
                              isClosedDateDisabled 
                                ? 'bg-minsk-100 text-minsk-400 dark:bg-minsk-800 dark:text-minsk-500' 
                                : 'hover:border-minsk-300 dark:hover:border-minsk-500'
                            )}
                          >
                            <CalendarIcon className="mr-1 h-3 w-3 text-minsk-500 sm:mr-2 sm:h-4 sm:w-4" />
                            {field.value ? (
                              <span className="text-minsk-800 dark:text-minsk-200">
                                {format(field.value, 'dd/MM/yy HH:mm')}
                              </span>
                            ) : (
                              <span className="text-minsk-500">Caso finalizado</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                      </FormControl>
                      <PopoverContent className="w-auto p-0 max-w-[95vw] dark:border-minsk-600 dark:bg-minsk-800" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          className="rounded-lg dark:bg-minsk-800"
                        />
                        <div className="border-t border-minsk-200 p-2 dark:border-minsk-600 sm:p-3">
                          <TimePickerDemo
                            setDate={field.onChange}
                            date={field.value}
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                  </FormItem>
                )}
              />
            </div>

            {/* CLIENTE E EQUIPAMENTO */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              {/* Cliente - AGORA COM PESQUISA E ORDENAÇÃO */}
              <div className="flex items-end gap-2">
                <FormField
                  control={form.control}
                  name="client"
                  render={({ field: { onChange, value } }) => (
                    <FormItem className="flex-1 min-w-0">
                      <FormLabel className="flex items-center gap-1 text-xs font-semibold text-minsk-700 dark:text-minsk-300 sm:text-sm">
                        <Building2 className="h-3 w-3 text-vida-loca-500 sm:h-4 sm:w-4" />
                        Cliente
                      </FormLabel>
                      <ClientSelect
                        value={value || ''}
                        onValueChange={(newValue) => {
                          onChange(newValue)
                          setClientId(newValue)
                          setIsEquipmentDisabled(false)
                        }}
                        clients={clients?.data.clients || []}
                      />
                    </FormItem>
                  )}
                />
                
                <Dialog open={openClientDialog} onOpenChange={setOpenClientDialog}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-9 w-9 shrink-0 border-vida-loca-200 bg-vida-loca-50 text-vida-loca-600 dark:border-vida-loca-600 dark:bg-vida-loca-900/30 dark:text-vida-loca-400 sm:h-10 sm:w-10"
                    >
                      <UserPlus className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </DialogTrigger>
                  <TreatmentClient open={openClientDialog} />
                </Dialog>
              </div>

              {/* Equipamento */}
              <div className="flex items-end gap-2">
                <FormField
                  control={form.control}
                  name="equipment_id"
                  render={({ field: { onChange, value } }) => (
                    <FormItem className="flex-1 min-w-0">
                      <FormLabel className="flex items-center gap-1 text-xs font-semibold text-minsk-700 dark:text-minsk-300 sm:text-sm">
                        <Computer className="h-3 w-3 text-vida-loca-500 sm:h-4 sm:w-4" />
                        Equipamento
                      </FormLabel>
                      <Select
                        value={value}
                        onValueChange={onChange}
                        disabled={isEquipmentDisabled}
                      >
                        <FormControl>
                          <SelectTrigger className={cn(
                            "h-9 w-full border-minsk-200 text-xs dark:border-minsk-600 dark:bg-minsk-800 dark:text-minsk-300 sm:h-10 sm:text-sm",
                            isEquipmentDisabled && "bg-minsk-100 text-minsk-400 dark:bg-minsk-800/50 dark:text-minsk-500"
                          )}>
                            <SelectValue placeholder="Selecione o equipamento" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="border-minsk-200 max-w-[95vw] dark:border-minsk-600 dark:bg-minsk-800">
                          {clients?.data.clients
                            .find((client) => client.id === clientId)
                            ?.equipments.map((equipment) => (
                              <SelectItem value={equipment.id} key={equipment.id} className="text-xs sm:text-sm">
                                {`${equipment.type} - ${equipment.brand} - ${equipment.identification}`}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                
                <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className={cn(
                        "h-9 w-9 shrink-0 border-vida-loca-200 bg-vida-loca-50 text-vida-loca-600 dark:border-vida-loca-600 dark:bg-vida-loca-900/30 dark:text-vida-loca-400 sm:h-10 sm:w-10",
                        isEquipmentDisabled && "opacity-50"
                      )}
                      disabled={isEquipmentDisabled}
                    >
                      <BetweenHorizonalStart className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </DialogTrigger>
                  <TreatmentClientEquipment
                    open={isClientDialogOpen}
                    clientId={clientId}
                  />
                </Dialog>
              </div>
            </div>

            {/* CAMPOS INDIVIDUAIS */}
            <div className="space-y-3 sm:space-y-4">
              <FormField
                control={form.control}
                name="contact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1 text-xs font-semibold text-minsk-700 dark:text-minsk-300 sm:text-sm">
                      <CircleUserRound className="h-3 w-3 text-vida-loca-500 sm:h-4 sm:w-4" />
                      Contato
                    </FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        className="h-9 w-full border-minsk-200 text-xs dark:border-minsk-600 dark:bg-minsk-800 dark:text-minsk-300 dark:placeholder:text-minsk-500 sm:h-10 sm:text-sm" 
                        placeholder="Nome do contato"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="request"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1 text-xs font-semibold text-minsk-700 dark:text-minsk-300 sm:text-sm">
                      <Crosshair className="h-3 w-3 text-vida-loca-500 sm:h-4 sm:w-4" />
                      Requisição
                    </FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        className="h-9 w-full border-minsk-200 text-xs dark:border-minsk-600 dark:bg-minsk-800 dark:text-minsk-300 dark:placeholder:text-minsk-500 sm:h-10 sm:text-sm" 
                        placeholder="Descreva a requisição"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="observation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1 text-xs font-semibold text-minsk-700 dark:text-minsk-300 sm:text-sm">
                      <NotebookText className="h-3 w-3 text-vida-loca-500 sm:h-4 sm:w-4" />
                      Descrição Detalhada
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        className="min-h-24 w-full resize-vertical border-minsk-200 text-xs dark:border-minsk-600 dark:bg-minsk-800 dark:text-minsk-300 dark:placeholder:text-minsk-500 sm:min-h-28 sm:text-sm"
                        placeholder="Descreva detalhadamente o atendimento..."
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* BOTÃO CADASTRAR */}
            <Button
              type="submit"
              className="h-10 w-full bg-gradient-to-r from-vida-loca-500 to-vida-loca-600 text-sm font-semibold text-white shadow dark:from-vida-loca-600 dark:to-vida-loca-700 sm:h-11"
              size="lg"
            >
              Cadastrar Atendimento
            </Button>
          </form>
        </Form>
      </div>
    </>
  )
}