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
  const [salesValue, setSalesValue] = useState(0) // Valor unitário de venda do item selecionado
  const [itemQuantity, setItemQuantity] = useState(1) // Quantidade atual
  const [itemDiscount, setItemDiscount] = useState(0) // Desconto atual
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
      // Resetar estados locais após o envio
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
    // 1. Calcula o valor total antes do desconto
    const totalBeforeDiscount = baseValue * quantity;
    
    // 2. Aplica o desconto
    const discountAmount = totalBeforeDiscount * (discount / 100);
    
    // 3. Calcula o valor final
    const finalPrice = totalBeforeDiscount - discountAmount;
    
    // Garante que o valor não é negativo
    return finalPrice > 0 ? finalPrice : 0;
  }

  async function onSubmit(data: FormSchemaType) {
    // O valor unitário final deve ser o Valor Final (finalSalesValue) / Quantidade
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
      
      // Recalcula o valor final ao mudar o item
      const finalPrice = calculateFinalValue(newSalesValue, itemQuantity, itemDiscount);
      setFinalSalesValue(finalPrice)
    } else {
        // Se deselecionar ou item não for encontrado
        setSalesValue(0)
        setFinalSalesValue(0)
    }
  }

  function onQuantityChange(newQuantityString: string | undefined) {
    const newQuantity = Number(newQuantityString) || 1; 
    
    if (newQuantity > 0) {
        setItemQuantity(newQuantity);
        
        // Recalcula usando o novo estado de quantidade
        const finalPrice = calculateFinalValue(salesValue, newQuantity, itemDiscount);
        setFinalSalesValue(finalPrice);
    }
  }

  function onDiscountChange(newDiscountString: string | undefined) {
    const newDiscount = Number(newDiscountString) || 0; 
    
    // Limita o desconto entre 0 e 100
    const clampedDiscount = Math.max(0, Math.min(100, newDiscount)); 
    setItemDiscount(clampedDiscount);
    
    // Recalcula usando o novo estado de desconto
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
    <DialogContent className="sm:max-w-[480px]">
      <DialogHeader>
        <DialogTitle>
          Controle dos produtos e serviços do atendimento
        </DialogTitle>
        <DialogDescription className="text-xs text-muted-foreground">
          {treatmentId}
        </DialogDescription>
      </DialogHeader>
      
      {/* Tabela de Itens (se houver) - mantida a estrutura anterior */}
      {(treatment?.items.length > 0 && (
        <Table>
          {/* ... Tabela (mantida) ... */}
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
          {/* Estrutura do "CARD" de Adicionar Item */}
          <div className="flex w-full flex-row items-end space-x-2"> 
                {/* Agrupa todos os campos em um container principal para o "card" */}
                <div className="bg-muted/30 flex w-full flex-col gap-2 rounded-md p-4">
                    
                    <h3 className="text-sm font-medium leading-none">Adicionar Item:</h3>

                    {/* Linha 1: Item/Serviço */}
                    <FormField
                      control={form.control}
                      name="item"
                      render={({ field: { name, onChange, value, disabled } }) => (
                        <FormItem>
                          <FormLabel>Produto/Serviço</FormLabel>
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

                    {/* Linha 2: Campos de Input/Visualização */}
                    <div className="flex w-full gap-2">
                        {/* Quantidade */}
                        <FormField
                            control={form.control}
                            name="quantity"
                            render={({ field }) => (
                                <FormItem className="w-1/4">
                                    <FormLabel>Qtd.</FormLabel>
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
                        
                        {/* Desconto */}
                        <FormField
                            control={form.control}
                            name="discount"
                            render={({ field }) => (
                                <FormItem className="w-1/4">
                                    <FormLabel>Desc. (%)</FormLabel>
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

                        {/* Valor de Venda (Visualização) - AGORA USANDO FormItem */}
                        <FormItem className="w-1/4">
                            <FormLabel>Venda Un.</FormLabel>
                            <Input
                                disabled
                                value={`R$ ${salesValue.toFixed(2)}`}
                                className="h-9 text-center bg-white/70 font-semibold"
                            />
                        </FormItem>

                        {/* Valor Final (Visualização) - AGORA USANDO FormItem */}
                        <FormItem className="w-1/4">
                            <FormLabel>Total</FormLabel>
                            {/* Input desabilitado para o Valor Final */}
                            <Input
                                disabled
                                value={`R$ ${finalSalesValue.toFixed(2)}`}
                                className="h-9 text-center bg-violet-50 text-violet-700 font-bold"
                            />
                        </FormItem>

                    </div>
                    {/* Fim da Linha 2 */}
                </div>
                {/* Fim do Card de Adicionar Item */}

            {/* Botão de Envio (ao lado do card) */}
            <Button
              type="submit"
              size="icon"
              className="h-9 w-9 bg-violet-400 hover:bg-violet-500 flex-shrink-0" 
             style={{ alignSelf: 'flex-end' }} // Garante que fica alinhado com a parte inferior dos inputs
            >
              <SendHorizonal className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </Form>
    </DialogContent>
  )
}