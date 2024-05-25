import { zodResolver } from '@hookform/resolvers/zod'
import { PopoverClose } from '@radix-ui/react-popover'
import { useMutation } from '@tanstack/react-query'
import { format } from 'date-fns'
import { FilePen } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'

import { createClient } from '@/api/create-client'
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
import { TimePickerDemo } from '@/components/ui/time-picker-demo'
import { cn } from '@/lib/utils'
const formSchema = z.object({
  name: z.string().nullish(),
  identification: z.string().nullish(),
  phone: z.string().nullish(),
  contract: z.boolean(),
  email: z.string().nullish(),
})

type FormSchemaType = z.infer<typeof formSchema>

export function TreatmentClient() {
  const navigate = useNavigate()
  const { mutateAsync: client } = useMutation({
    mutationFn: createClient,
  })
  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
  })

  async function onSubmit(data: FormSchemaType) {
    console.log(data)
    const response = await client({
      name: data.name,
      identification: data.identification,
      email: data.email,
      phone: data.phone,
      contract: data.contract,
    })
    if (response !== undefined) {
      toast.success('Cliente cadastrada', {
        position: 'top-center',
      })
      setTimeout(() => {
        navigate(window.location.pathname)
      }, 1000)
    }
  }

  return (
    <DialogContent className="w-720p">
      <DialogHeader>
        <DialogTitle>Cadastro de Cliente</DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form
          className="flex flex-col items-start justify-center gap-8"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <FormField
            control={form.control}
            name="contract"
            render={({ field }) => (
              <FormItem className="flex w-full flex-row content-around items-center space-x-2 ">
                <div className="flex w-1/2 flex-row items-center space-x-2">
                  <FormLabel className="text-left">
                    <FilePen className="h-5 w-5" />
                  </FormLabel>
                  <FormLabel className="font-base text-left text-gray-600">
                    Contrato
                  </FormLabel>
                </div>
                <div className="flex w-1/2 flex-row items-center justify-end space-x-2">
                  <Popover>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="data-[state=checked]:bg-minsk-500 data-[state=unchecked]:bg-gray-300"
                      ></Switch>
                    </FormControl>
                  </Popover>
                </div>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="flex w-full flex-col">
                <FormLabel className="text-left">Nome</FormLabel>
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
            name="identification"
            render={({ field }) => (
              <FormItem className="flex w-full flex-col">
                <FormLabel className="text-left">CPF/CNPJ</FormLabel>
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
            name="email"
            render={({ field }) => (
              <FormItem className="flex w-full flex-col">
                <FormLabel className="text-left">E-mail</FormLabel>
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
            name="phone"
            render={({ field }) => (
              <FormItem className="flex w-full flex-col">
                <FormLabel className="text-left">Telefone</FormLabel>
                <Popover>
                  <FormControl>
                    <Input value={field.value} {...field}></Input>
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
