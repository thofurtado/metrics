import { zodResolver } from '@hookform/resolvers/zod'
import { PopoverClose } from '@radix-ui/react-popover'
import { useMutation, useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  ArrowBigRightDash,
  Calculator,
  Calendar as CalendarIcon,
  CalendarDays,
  CircleCheckBig,
  Landmark,
  NotebookText,
  Tag,
} from 'lucide-react'
import { MouseEventHandler, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'

import { createInteraction } from '@/api/create-interaction'
import { createTransaction } from '@/api/create-transaction'
import { getAccounts } from '@/api/get-accounts'
import { getSectors } from '@/api/get-sectors'
import { updateStatusTreatment } from '@/api/update-status-treatment'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  DialogClose,
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
  date: z.date().nullish(),
  description: z.string().nullish(),
  account: z.string().nullish(),
  sector: z.string().nullish(),
  amount: z.string().nullish(),
  confirmed: z.boolean().nullish(),
})
type FormSchemaType = z.infer<typeof formSchema>
export interface TransactionInteractionsProps {
  description?: string
  value?: number
  sector_id?: string
  account_id?: string
}
export interface TransactionExpenseProps {
  open: boolean
}

export function TransactionIncome() {
  const { mutateAsync: transaction } = useMutation({
    mutationFn: createTransaction,
  })
  async function onSubmit(data: FormSchemaType) {
    const response = await transaction({
      operation: 'income',
      amount: Number(data.amount),
      account: data.account,
      date: data.date || new Date(),
      description: data.description || null,
      sector: data.sector || null,
      confirmed: data.confirmed || false,
    })
    if (response !== undefined) {
      toast.success('Receita cadastrada')
    }
  }
  const { data: sectors } = useQuery({
    queryKey: ['sectors'],
    queryFn: () => getSectors(),
  })
  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => getAccounts(),
  })
  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
  })

  return (
    <DialogContent className="w-720p">
      <DialogHeader>
        <DialogTitle className="font-semibold text-vida-loca-600">
          Nova Receita
        </DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form
          className="flex flex-col items-start justify-center gap-8"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem className="flex w-full flex-row items-center space-x-2 border-b-2">
                <FormLabel className="text-left">
                  <Calculator className="h-5 w-5" />
                </FormLabel>
                <Popover>
                  <FormControl>
                    <Input
                      value={field.value}
                      {...field}
                      type="number"
                      className="border-none text-lg font-semibold text-vida-loca-600"
                    ></Input>
                  </FormControl>
                </Popover>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmed"
            render={({ field }) => (
              <FormItem className="flex w-full flex-row content-around items-center space-x-2 ">
                <div className="flex w-1/2 flex-row items-center space-x-2">
                  <FormLabel className="text-left">
                    <CircleCheckBig className="h-5 w-5" />
                  </FormLabel>
                  <FormLabel className="text-left font-light text-gray-400">
                    Foi paga
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
            name="date"
            render={({ field }) => (
              <FormItem className="flex w-full flex-row items-center !space-x-2 border-b-2 !pb-2">
                <FormLabel className="text-left">
                  <CalendarDays className="h-5 w-5" />
                </FormLabel>
                <Popover>
                  <FormControl>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-30 !m-0 mb-4 h-8 justify-start rounded-lg text-left font-normal',
                          !field.value && 'text-muted-foreground',
                        )}
                      >
                        {field.value ? (
                          format(field.value, 'MM/dd/yyyy')
                        ) : (
                          <span>Selecione a Data</span>
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
                  </PopoverContent>
                </Popover>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="flex w-full flex-row items-center space-x-2 border-b-2">
                <FormLabel className="text-left">
                  <NotebookText className="h-5 w-5" />
                </FormLabel>
                <Popover>
                  <FormControl>
                    <Input
                      value={field.value}
                      {...field}
                      type="text"
                      placeholder="Descrição"
                      className="text-md border-none font-semibold"
                    ></Input>
                  </FormControl>
                </Popover>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="sector"
            render={({ field: { onChange, value, disabled } }) => (
              <FormItem className="flex w-full flex-row items-center space-x-2 border-b-2">
                <FormLabel className="mt-2 w-1/12 text-left">
                  <Tag className="h-5 w-5" />
                </FormLabel>
                <Popover>
                  <FormControl>
                    <Select
                      defaultValue="carregando..."
                      value={value}
                      onValueChange={onChange}
                      disabled={disabled}
                    >
                      <SelectTrigger className="h-8 w-11/12 border-none">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="m-0">
                        {sectors &&
                          sectors.data.sectors.map((sector) => (
                            <SelectItem value={sector.id} key={sector.id}>
                              {sector.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                </Popover>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="account"
            render={({ field: { onChange, value, disabled } }) => (
              <FormItem className="flex w-full flex-row items-center space-x-2 border-b-2">
                <FormLabel className="mt-2 w-1/12 text-left">
                  <Landmark className="h-5 w-5" />
                </FormLabel>
                <Popover>
                  <FormControl>
                    <Select
                      defaultValue="carregando..."
                      value={value}
                      onValueChange={onChange}
                      disabled={disabled}
                    >
                      <SelectTrigger className="h-8 w-11/12 border-none">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts &&
                          accounts.data.accounts.map((account) => (
                            <SelectItem value={account.id} key={account.id}>
                              {account.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                </Popover>
              </FormItem>
            )}
          />
          <div className="flex w-full justify-end">
            <Button
              type="submit"
              className="justify-self-end bg-minsk-500 text-white hover:bg-minsk-600"
            >
              Salvar
            </Button>
            <DialogClose></DialogClose>
          </div>
        </form>
      </Form>
    </DialogContent>
  )
}
