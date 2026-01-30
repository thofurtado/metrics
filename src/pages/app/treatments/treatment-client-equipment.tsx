import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { createClientEquipment } from '@/api/create-client-equipment'
import { getClients } from '@/api/get-clients'
import { Button } from '@/components/ui/button'
import {
  DialogContent,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

const formSchema = z.object({
  type: z.string().nullish(),
  brand: z.string().nullish(),
  identification: z.string().nullish(),
  details: z.string().nullish(),
})

type FormSchemaType = z.infer<typeof formSchema>

interface TreatmentClientEquipmentProps {
  open: boolean
  clientId: string | null
}

export function TreatmentClientEquipment({
  open,
  clientId,
}: TreatmentClientEquipmentProps) {
  const { mutateAsync: equipment } = useMutation({
    mutationFn: createClientEquipment,
  })
  const { refetch: clientRefetch } = useQuery({
    queryKey: ['clients'],
    queryFn: () => getClients(),
  })
  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: 'computer',
      brand: '',
      identification: '',
      details: '',
    }
  })

  async function onSubmit(data: FormSchemaType) {
    if (!clientId) return;
    
    const response = await equipment({
      client_id: clientId,
      identification: data.identification,
      brand: data.brand,
      type: data.type,
      details: data.details,
    })
    if (response !== undefined) {
      toast.success('Equipamento cadastrado', {
        position: 'top-center',
      })
      form.reset();
      clientRefetch();
    }
  }

  return (
    <DialogContent className="w-full max-w-lg">
      <DialogHeader>
        <DialogTitle>Cadastro de Equipamento</DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value ?? undefined}
                  value={field.value ?? undefined}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="computer">Computador</SelectItem>
                    <SelectItem value="notebook">Notebook</SelectItem>
                    <SelectItem value="printer">Impressora</SelectItem>
                    <SelectItem value="nobreak">Nobreak</SelectItem>
                    <SelectItem value="peripherals">Periféricos</SelectItem>
                    <SelectItem value="others">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="identification"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Identificação</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ''} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="brand"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Marca</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ''} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="details"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Detalhes</FormLabel>
                <FormControl>
                  <Textarea {...field} value={field.value ?? ''} />
                </FormControl>
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
