import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  Building2,
  Calendar as CalendarIcon,
  FlagTriangleRight,
  NotebookText,
  UserPlus,
  BetweenHorizonalStart,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'

import { ClientSelectCombobox } from './client-select-combobox'
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



export function Treatment() {
  const [openClientDialog, setOpenClientDialog] = useState(false)
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false)
  const [isEquipmentDisabled, setIsEquipmentDisabled] = useState(true)
  const [clientId, setClientId] = useState<string | null>(null)
  const [showContact, setShowContact] = useState(false)

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      openingDate: null,
      request: '',
      observation: '',
      client: undefined, // client string required but can start undefined if valid
      status: 'pending',
      contact: '',
      equipment_id: undefined,
    },
  })

  const navigate = useNavigate()

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

    const response = await treatment({
      ...data,
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
            className="flex flex-col gap-6"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            {/* SEÇÃO 1: STATUS E TEMPO */}
            <div className="space-y-4 rounded-xl bg-white p-4 shadow-sm border border-minsk-200 dark:bg-minsk-900 dark:border-minsk-700">
              <div className="flex items-center gap-2 border-b border-minsk-100 pb-2 dark:border-minsk-800">
                <FlagTriangleRight className="h-4 w-4 text-vida-loca-500" />
                <h2 className="text-sm font-semibold text-minsk-800 dark:text-minsk-100">Situação e Agendamento</h2>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Status */}
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field: { onChange, value = 'pending' } }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-xs font-medium text-minsk-600 dark:text-minsk-400">Estado Atual</FormLabel>
                      <Select
                        defaultValue="pending"
                        value={value || undefined}
                        onValueChange={onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="h-10 w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pending">Pendente (Aguardando)</SelectItem>
                          <SelectItem value="in_progress">Em Andamento</SelectItem>
                          <SelectItem value="follow_up">Acompanhamento</SelectItem>
                          <SelectItem value="in_workbench">Em Bancada</SelectItem>
                          <SelectItem value="resolved">Resolvido (Concluído)</SelectItem>
                          <SelectItem value="canceled">Cancelado</SelectItem>
                          <SelectItem value="on_hold">Em espera</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                {/* Data de Abertura */}
                <FormField
                  control={form.control}
                  name="openingDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-xs font-medium text-minsk-600 dark:text-minsk-400">Data de Abertura</FormLabel>
                      <Popover>
                        <FormControl>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                'h-10 w-full justify-start text-left font-normal',
                                !field.value && 'text-muted-foreground',
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4 text-minsk-500" />
                              {field.value ? (
                                format(field.value, 'dd/MM/yy HH:mm')
                              ) : (
                                <span>Hoje (Automático)</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                        </FormControl>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value || undefined}
                            onSelect={field.onChange}
                            initialFocus
                          />
                          <div className="border-t p-3">
                            <TimePickerDemo
                              setDate={field.onChange}
                              date={field.value || undefined}
                            />
                          </div>
                        </PopoverContent>
                      </Popover>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* SEÇÃO 2: CLIENTE E EQUIPAMENTO */}
            <div className="space-y-4 rounded-xl bg-white p-4 shadow-sm border border-minsk-200 dark:bg-minsk-900 dark:border-minsk-700">
              <div className="flex items-center gap-2 border-b border-minsk-100 pb-2 dark:border-minsk-800">
                <Building2 className="h-4 w-4 text-vida-loca-500" />
                <h2 className="text-sm font-semibold text-minsk-800 dark:text-minsk-100">Cliente e Ativo</h2>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Cliente */}
                <div className="flex items-end gap-2">
                  <FormField
                    control={form.control}
                    name="client"
                    render={({ field: { onChange, value } }) => (
                      <FormItem className="flex-1 w-full">
                        <FormLabel className="text-xs font-medium text-minsk-600 dark:text-minsk-400">Cliente Solicitante</FormLabel>
                        <ClientSelectCombobox
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
                      <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 bg-vida-loca-50 text-vida-loca-600 border-vida-loca-200">
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <TreatmentClient onClose={() => setOpenClientDialog(false)} />
                  </Dialog>
                </div>

                {/* Equipamento */}
                <div className="flex items-end gap-2">
                  <FormField
                    control={form.control}
                    name="equipment_id"
                    render={({ field: { onChange, value } }) => (
                      <FormItem className="flex-1 w-full">
                        <FormLabel className="text-xs font-medium text-minsk-600 dark:text-minsk-400">Equipamento / Ativo</FormLabel>
                        <Select
                          value={value || undefined}
                          onValueChange={onChange}
                          disabled={isEquipmentDisabled}
                        >
                          <FormControl>
                            <SelectTrigger className={cn("h-10 w-full", isEquipmentDisabled && "bg-gray-50 opacity-70")}>
                              <SelectValue placeholder={isEquipmentDisabled ? "Selecione um cliente..." : "Selecione o equipamento"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {clients?.data.clients
                              .find((client) => client.id === clientId)
                              ?.equipments.map((equipment) => (
                                <SelectItem value={equipment.id} key={equipment.id}>
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
                        className="h-10 w-10 shrink-0"
                        disabled={isEquipmentDisabled}
                      >
                        <BetweenHorizonalStart className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <TreatmentClientEquipment
                      open={isClientDialogOpen}
                      clientId={clientId}
                    />
                  </Dialog>
                </div>
              </div>


              {/* Contato Específico para este Atendimento (Toggle Opcional) */}
              {!showContact ? (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => setShowContact(true)}
                    className="text-xs text-minsk-500 underline h-auto p-0"
                  >
                    + Adicionar responsável pelo acompanhamento (se diferente do cliente)
                  </Button>
                </div>
              ) : (
                <div className="space-y-1 animate-in fade-in slide-in-from-top-1">
                  <div className="flex justify-between items-center">
                    <FormLabel className="text-xs font-medium text-minsk-600 dark:text-minsk-400">Responsável pelo Acompanhamento</FormLabel>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowContact(false)
                        form.setValue('contact', '')
                      }}
                      className="h-6 px-2 text-[10px] text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      Remover
                    </Button>
                  </div>
                  <FormField
                    control={form.control}
                    name="contact"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ''}
                            className="h-10"
                            placeholder="Nome de quem está acompanhando este chamado"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            {/* SEÇÃO 3: DETALHES */}
            <div className="space-y-4 rounded-xl bg-white p-4 shadow-sm border border-minsk-200 dark:bg-minsk-900 dark:border-minsk-700">
              <div className="flex items-center gap-2 border-b border-minsk-100 pb-2 dark:border-minsk-800">
                <NotebookText className="h-4 w-4 text-vida-loca-500" />
                <h2 className="text-sm font-semibold text-minsk-800 dark:text-minsk-100">Detalhes da Solicitação</h2>
              </div>

              <FormField
                control={form.control}
                name="request"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-minsk-600 dark:text-minsk-400">Assunto Principal *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="h-10"
                        placeholder="Ex: Manutenção Preventiva, Formatação, Troca de Peça..."
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
                    <FormLabel className="text-xs font-medium text-minsk-600 dark:text-minsk-400">Descrição Técnica / Observações</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        className="min-h-32 resize-y"
                        placeholder="Descreva o problema relatado, testes iniciais ou detalhes importantes..."
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* BOTÃO CADASTRAR */}
            <div className="pt-2 sticky bottom-4 z-10">
              <Button
                type="submit"
                className="h-12 w-full bg-gradient-to-r from-vida-loca-600 to-vida-loca-500 hover:to-vida-loca-600 text-white font-bold shadow-lg text-base rounded-xl transition-all active:scale-95"
              >
                Salvar Atendimento
              </Button>
            </div>

          </form>
        </Form>
      </div>
    </>
  )
}