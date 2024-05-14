import { zodResolver } from '@hookform/resolvers/zod'
import { PopoverClose } from '@radix-ui/react-popover'
import { useMutation, useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  ArrowBigRightDash,
  Calendar as CalendarIcon,
  Check,
  ChevronsUpDown,
  Command,
  Pencil,
  SendHorizonal,
  Trash2,
} from 'lucide-react'
import { MouseEventHandler, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'

import { createTreatmentItem } from '@/api/create-treatment-item'
import { deleteTreatmentItem } from '@/api/delete-treatment-item'
import { getItems } from '@/api/get-items'
import { getTreatmentDetails } from '@/api/get-treatment-details'
import { updateStatusTreatment } from '@/api/update-status-treatment'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
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
import { Label } from '@/components/ui/label'
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
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { TimePickerDemo } from '@/components/ui/time-picker-demo'
import { cn } from '@/lib/utils'

const formSchema = z.object({
  item: z.string(),
  quantity: z.string().nullish(),
  salesValue: z.string().nullish(),
  discount: z.string().nullish(),
  finalSalesValue: z.string().nullish(),
})

type FormSchemaType = z.infer<typeof formSchema>

export interface TreatmentItemsProps {
  treatmentId: string
  open: boolean
}

export function TreatmentItems({ treatmentId, open }: TreatmentItemsProps) {
  const navigate = useNavigate()
  const [finalSalesValue, setFinalSalesValue] = useState(0)
  const [salesValue, setSalesValue] = useState(0)
  const [itemQuantity, setItemQuantity] = useState(1)
  const [itemDiscount, setItemDiscount] = useState(0)
  const [openCombobox, setComboboxOpen] = useState(false)
  const [valueCombobox, setValueCombobox] = useState('')

  const { data: items } = useQuery({
    queryKey: ['items'],
    queryFn: () => getItems(),
  })
  const { data: treatment, refetch: itemRefetch } = useQuery({
    queryKey: ['treatment', treatmentId],
    queryFn: () => getTreatmentDetails({ treatmentId }),
    enabled: open,
  })
  const { mutateAsync: treatmentItem } = useMutation({
    mutationFn: createTreatmentItem,
  })

  const { mutateAsync: DeleteTreatmentItem } = useMutation({
    mutationFn: deleteTreatmentItem,
  })
  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
  })

  let subtotal = 0
  if (!treatment) {
    return null
  } else {
    subtotal = treatment.items.reduce((accumulator, item) => {
      const currentSubtotal = item.quantity * item.salesValue
      return accumulator + currentSubtotal
    }, 0)
  }

  async function onSubmit(data: FormSchemaType) {
    const response = await treatmentItem({
      treatmentId,
      itemId: data.item,
      quantity: data.quantity ? Number(data.quantity) : 1,
      salesValue: finalSalesValue / data.quantity,
    })

    if (response !== undefined) {
      await itemRefetch()

      toast.success('Item cadastrado com sucesso')
    }
  }

  function onItemSelectChange(value: string) {
    const selectSalesValue = items?.data.items.find((item) => item.id === value)
    if (selectSalesValue) {
      setSalesValue(selectSalesValue.price)
    }
  }

  function onQuantityChange(quantity: number) {
    if (quantity > 0) setItemQuantity(quantity)
  }

  function onDiscountChange(discount: string) {
    if (discount !== undefined) setItemDiscount(discount)
    else setItemDiscount(0)
    const finalPrice =
      (((100 - itemDiscount) * salesValue) / 100) * itemQuantity

    if (finalPrice > 0) setFinalSalesValue(finalPrice)
  }
  async function onItemDelete(id: string) {
    const response = await DeleteTreatmentItem({
      treatmentItemId: id,
    })

    if (response !== undefined) {
      await itemRefetch()
      toast.success('Item Removido com sucesso')
    }
  }

  return (
    <DialogContent className="w-720p">
      <DialogHeader>
        <DialogTitle>
          Controle dos produtos e serviços do atendimento
        </DialogTitle>
        <DialogDescription>{treatmentId}</DialogDescription>
      </DialogHeader>
      {(treatment?.items.length > 0 && (
        <Table>
          <TableHeader>
            <TableHead className="w-full text-base	font-bold text-violet-400">
              Mercadorias do Atendimento
            </TableHead>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Qtd.</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Subtotal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {treatment?.items.map((item) => {
              return (
                <TableRow key={item.item_id}>
                  <TableCell>{item.items.name}</TableCell>
                  <TableCell className="text-center">{item.quantity}</TableCell>
                  <TableCell className="text-center">
                    {item.salesValue}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.salesValue * item.quantity}
                  </TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Trash2 className="h-4 w-4 cursor-pointer" />
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Tem certeza que deseja remover este item do
                            atendimento?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onItemDelete(item.id)}
                          >
                            Continuar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={3}>Valor total do atendimento:</TableCell>
              <TableCell className="text-right font-medium">
                R$ {subtotal}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      )) || (
        <span className="text-desert-600">
          Ainda não à itens vinculados a este atendimento
        </span>
      )}

      <Form {...form}>
        <div className="flex w-full flex-row items-center space-x-2">
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex w-full items-center space-x-4"
          >
            <div className="flex w-5/6 flex-col items-center gap-2 rounded-md bg-jacarta-100 py-4">
              <FormField
                control={form.control}
                name="item"
                render={({ field: { name, onChange, value, disabled } }) => (
                  <FormItem className="flex w-4/6 flex-col">
                    <FormLabel className="text-left">Adicionar item:</FormLabel>
                    <Popover open={openCombobox} onOpenChange={setComboboxOpen}>
                      <FormControl>
                        <Select
                          value={value}
                          onValueChange={onChange}
                          disabled={disabled}
                        >
                          <SelectTrigger className="h-8 w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent onSelect={onItemSelectChange(value)}>
                            {items.data.items.length > 0 &&
                              items.data.items.map((item) => (
                                <SelectItem value={item.id} key={item.id}>
                                  {item.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </Popover>
                  </FormItem>
                )}
              />
              <div className="flex w-2/3 flex-row">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem className="flex w-full flex-col items-start">
                      <FormLabel className="w-20 text-left text-center">
                        Quantidade
                      </FormLabel>
                      <Popover>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            defaultValue={1}
                            onChange={onQuantityChange(field.value)}
                            className="w-20 pl-6 text-center"
                            value={field.value}
                            {...field}
                          ></Input>
                        </FormControl>
                      </Popover>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="discount"
                  render={({ field }) => (
                    <FormItem className="flex w-full flex-col items-end">
                      <FormLabel className="w-20 text-center ">
                        Desconto
                      </FormLabel>
                      <Popover>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            defaultValue={0}
                            onChange={onDiscountChange(field.value)}
                            className="w-20 pl-8"
                            value={field.value}
                            {...field}
                          ></Input>
                        </FormControl>
                      </Popover>
                    </FormItem>
                  )}
                />
              </div>
              <div className="mt-2 flex w-2/3 flex-row justify-normal">
                <div className="flex w-1/2 flex-col">
                  <Label className="mb-5 w-full border-none p-0 text-left">
                    Valor de Venda
                  </Label>
                  <Label className="w-full border-none pl-9 text-left font-bold">
                    {salesValue}
                  </Label>
                </div>
                <div className="flex w-1/2 flex-col">
                  <Label className="mb-5 w-full border-none p-0 pr-2 text-right">
                    Valor Final
                  </Label>
                  <Label className="w-full border-none pr-10 text-right font-bold">
                    {finalSalesValue}
                  </Label>
                </div>
              </div>
            </div>
            <Button
              type="submit"
              className="justify-self-end bg-violet-400 hover:bg-violet-500"
            >
              <SendHorizonal className="h-4 w-4 font-bold" />
            </Button>
          </form>
        </div>
      </Form>
    </DialogContent>
  )
}
