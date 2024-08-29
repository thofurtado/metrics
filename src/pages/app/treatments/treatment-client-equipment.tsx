import { zodResolver } from '@hookform/resolvers/zod'
import { PopoverClose } from '@radix-ui/react-popover'
import { useMutation, useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { FilePen, FlagTriangleRight } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'

import { createClient } from '@/api/create-client'
import { createClientEquipment } from '@/api/create-client-equipment'
import { createInteraction } from '@/api/create-interaction'
import { getClients } from '@/api/get-clients'
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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
const formSchema = z.object({
  type: z.string().nullish(),
  brand: z.string().nullish(),
  identification: z.string().nullish(),
  details: z.string().nullish(),
})

type FormSchemaType = z.infer<typeof formSchema>

export function TreatmentClientEquipment(clientId: string) {
  const { mutateAsync: equipment } = useMutation({
    mutationFn: createClientEquipment,
  })
  const { refetch: clientRefetch } = useQuery({
    queryKey: ['clients'],
    queryFn: () => getClients(),
  })
  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
  })

  async function onSubmit(data: FormSchemaType) {
    console.log(data)
    console.log(clientId.clientId)
    const response = await equipment({
      client_id: clientId.clientId,
      identification: data.identification,
      brand: data.brand,
      type: data.type,
      details: data.details,
    })
    if (response !== undefined) {
      toast.success('Equipamento cadastrado', {
        position: 'top-center',
      })
    }
  }

  return (
    <DialogContent className="w-720p">
      <DialogHeader>
        <DialogTitle>Cadastro de Equipamento</DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form
          className="flex flex-col items-start justify-center gap-8"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <FormField
            control={form.control}
            name="type"
            render={({ field: { name, onChange, value, disabled } }) => (
              <FormItem className="flex w-full flex-col content-end items-start">
                <FormLabel className="text-left align-baseline">Tipo</FormLabel>
                <Popover>
                  <FormControl>
                    <Select
                      defaultValue="computer"
                      value={value}
                      onValueChange={onChange}
                      disabled={disabled}
                    >
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="computer">Computador</SelectItem>
                        <SelectItem value="notebook">Notebook</SelectItem>
                        <SelectItem value="printer">Impressora</SelectItem>
                        <SelectItem value="nobreak">Nobreak</SelectItem>
                        <SelectItem value="peripherals">Periféricos</SelectItem>
                        <SelectItem value="others">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                </Popover>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="identification"
            render={({ field }) => (
              <FormItem className="flex w-full flex-col">
                <FormLabel className="text-left">Identificação</FormLabel>
                <Popover>
                  <FormControl>
                    <Input value={field.value} {...field} />
                  </FormControl>
                </Popover>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="brand"
            render={({ field }) => (
              <FormItem className="flex w-full flex-col">
                <FormLabel className="text-left">Marca</FormLabel>
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
            name="details"
            render={({ field }) => (
              <FormItem className="flex w-full flex-col">
                <FormLabel className="text-left">Detalhes</FormLabel>
                <Popover>
                  <FormControl>
                    <Textarea value={field.value} {...field}></Textarea>
                  </FormControl>
                </Popover>
              </FormItem>
            )}
          />
          <div className="flex w-full justify-end">
            <Button
              type="submit"
              className="justify-self-end bg-minsk-400 text-white hover:bg-minsk-500"
            >
              Cadastrar
            </Button>
          </div>
        </form>
      </Form>
    </DialogContent>
  )
}
