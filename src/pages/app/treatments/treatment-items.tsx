import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
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
import { MouseEventHandler, useEffect, useState } from 'react'
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
  const [finalSalesValue, setFinalSalesValue] = useState(0)
  const [salesValue, setSalesValue] = useState(0)
  const [itemQuantity, setItemQuantity] = useState(1)
  const [itemDiscount, setItemDiscount] = useState(0)
  const [openCombobox, setComboboxOpen] = useState(false)

  useEffect(() => {
    if (form.formState.isSubmitSuccessful) {
      form.reset({
        item: '',
        quantity: '1',
        salesValue: '',
        discount: '0',
        finalSalesValue: '',
      })
      setSalesValue(0)
      setItemQuantity(1)
      setItemDiscount(0)
      setFinalSalesValue(0)
    }
  })
  
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
  
  function calculateFinalValue(
    baseValue: number,
    quantity: number,
    discount: number,
  ) {
    const totalBeforeDiscount = baseValue * quantity;
    const discountAmount = totalBeforeDiscount * (discount / 100);
    const finalPrice = totalBeforeDiscount - discountAmount;
    return finalPrice > 0 ? finalPrice : 0;
  }

  async function onSubmit(data: FormSchemaType) {
    const unitSalesValue = finalSalesValue / (data.quantity ? Number(data.quantity) : 1);
    
    const response = await treatmentItem({
      treatmentId,
      itemId: data.item,
      quantity: data.quantity ? Number(data.quantity) : 1,
      salesValue: unitSalesValue,
    })

    if (response !== undefined) {
      await itemRefetch()
      toast.success('Item cadastrado com sucesso')
    }
  }
  
  function onItemSelectChange(value: string) {
    const selectSalesValue = items?.data.items.find((item) => item.id === value)
    if (selectSalesValue) {
      const newSalesValue = selectSalesValue.price
      setSalesValue(newSalesValue)
      const finalPrice = calculateFinalValue(newSalesValue, itemQuantity, itemDiscount);
      setFinalSalesValue(finalPrice)
    } else {
        setSalesValue(0)
        setFinalSalesValue(0)
    }
  }

  function onQuantityChange(newQuantityString: string | undefined) {
    const newQuantity = Number(newQuantityString) || 1; 
    
    if (newQuantity > 0) {
        setItemQuantity(newQuantity);
        const finalPrice = calculateFinalValue(salesValue, newQuantity, itemDiscount);
        setFinalSalesValue(finalPrice);
    }
  }

  function onDiscountChange(newDiscountString: string | undefined) {
    const newDiscount = Number(newDiscountString) || 0; 
    const clampedDiscount = Math.max(0, Math.min(100, newDiscount)); 
    setItemDiscount(clampedDiscount);
    const finalPrice = calculateFinalValue(salesValue, itemQuantity, clampedDiscount);
    setFinalSalesValue(finalPrice);
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
    <DialogContent className="sm:max-w-[600px]">
      <DialogHeader>
        <DialogTitle>
          Controle dos produtos e serviços do atendimento
        </DialogTitle>
        <DialogDescription className="text-xs text-muted-foreground">
          {treatmentId}
        </DialogDescription>
      </DialogHeader>
      
      {(treatment?.items.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-2/5">Produto</TableHead>
              <TableHead className="w-1/6 text-center">Qtd.</TableHead>
              <TableHead className="w-1/5 text-right">Valor Un.</TableHead>
              <TableHead className="w-1/5 text-right">Subtotal</TableHead>
              <TableHead className="w-[40px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {treatment?.items.map((item) => {
              return (
                <TableRow key={item.item_id}>
                  <TableCell>{item.items.name}</TableCell>
                  <TableCell className="text-center">{item.quantity}</TableCell>
                  <TableCell className="text-right">
                    R$ {item.salesValue.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    R$ {(item.salesValue * item.quantity).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Trash2 className="h-4 w-4 cursor-pointer text-red-500 hover:text-red-700" />
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Tem certeza que deseja remover este item do atendimento?
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
              <TableCell colSpan={3} className="text-right">Valor total do atendimento:</TableCell>
              <TableCell className="text-right font-semibold text-violet-600">
                R$ {subtotal.toFixed(2)}
              </TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      )) || (
        <span className="text-muted-foreground italic">
          Ainda não há itens vinculados a este atendimento
        </span>
      )}
      
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <div className="flex w-full gap-3 items-end">
            <div className="bg-muted/30 flex-1 flex flex-col gap-3 rounded-lg p-4 border">
              <h3 className="text-sm font-medium leading-none text-foreground">
                Adicionar Item
              </h3>

              <div className="grid grid-cols-1 gap-3">
                <FormField
                  control={form.control}
                  name="item"
                  render={({ field: { name, onChange, value, disabled } }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Produto/Serviço</FormLabel>
                      <Select
                        value={value}
                        onValueChange={(v) => {
                          onChange(v)
                          onItemSelectChange(v)
                        }}
                        disabled={disabled}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Selecione um item..." />
                        </SelectTrigger>
                        <SelectContent>
                          {items?.data.items.length > 0 &&
                            items.data.items.map((item) => (
                              <SelectItem value={item.id} key={item.id}>
                                {item.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-4 gap-2">
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Qtd.</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            placeholder="1"
                            onChange={(e) => {
                              field.onChange(e)
                              onQuantityChange(e.target.value)
                            }}
                            value={field.value ?? 1}
                            className="h-9 text-center"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="discount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Desc. (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            placeholder="0"
                            onChange={(e) => {
                              field.onChange(e)
                              onDiscountChange(e.target.value)
                            }}
                            value={field.value ?? 0}
                            className="h-9 text-center"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormItem>
                    <FormLabel className="text-xs">Venda Un.</FormLabel>
                    <Input
                      disabled
                      value={`R$ ${salesValue.toFixed(2)}`}
                      className="h-9 text-center bg-background font-medium text-muted-foreground"
                    />
                  </FormItem>

                  <FormItem>
                    <FormLabel className="text-xs">Total</FormLabel>
                    <Input
                      disabled
                      value={`R$ ${finalSalesValue.toFixed(2)}`}
                      className="h-9 text-center bg-violet-50 text-violet-700 font-bold border-violet-200"
                    />
                  </FormItem>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              size="icon"
              className="h-[86px] w-12 bg-violet-500 hover:bg-violet-600 flex-shrink-0 mb-4"
              disabled={!form.watch('item')}
            >
              <SendHorizonal className="h-5 w-5" />
            </Button>
          </div>
        </form>
      </Form>
    </DialogContent>
  )
}