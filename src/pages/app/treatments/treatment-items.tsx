import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  Plus,
  Minus,
  Trash2,
  Search,
  ShoppingCart,
  CreditCard,
  ArrowLeft,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { createTreatmentItem } from '@/api/create-treatment-item'
import { deleteTreatmentItem } from '@/api/delete-treatment-item'
import { getItems } from '@/api/get-items'
import { getTreatmentDetails } from '@/api/get-treatment-details'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { TreatmentPaymentModal } from './treatment-payment-modal'

interface TreatmentDetails {
  id: string
  items: {
    id: string
    quantity: number
    salesValue: number
    items: {
      name: string
      id: string
    }
  }[]
  // Adicione outras propriedades que você usa
  opening_date?: Date
  ending_date?: Date | null
  contact?: string | null
  request?: string
  status?: string
  amount?: number
  observations?: string | null
}

// O restante do seu código (FormSchema, Types, Props)
const formSchema = z.object({
  item: z.string(),
  quantity: z.string().nullish(),
  discount: z.string().nullish(),
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
  const [searchTerm, setSearchTerm] = useState('')
  const [showPayment, setShowPayment] = useState(false)
  // O estado `mobileView` é usado para controlar qual seção é visível no mobile
  const [mobileView, setMobileView] = useState<'products' | 'cart'>('products')

  // NOVO ESTADO: Controla se o campo de desconto deve mostrar '' em vez de '0'
  const [discountInputDisplay, setDiscountInputDisplay] = useState('0') // Inicialmente '0'

  useEffect(() => {
    if (form.formState.isSubmitSuccessful) {
      form.reset({
        item: '',
        quantity: '1',
        discount: '0', // O estado interno do form-hook deve ser '0' para cálculos
      })
      setSalesValue(0)
      setItemQuantity(1)
      setItemDiscount(0)
      setFinalSalesValue(0)
      setSearchTerm('')
      setDiscountInputDisplay('0') // Resetar o display também
    }
  })

  // 3. Tipagem no useQuery de Treatment
  const { data: treatment, refetch: itemRefetch } = useQuery<TreatmentDetails>({
    queryKey: ['treatment', treatmentId],
    queryFn: () => getTreatmentDetails({ treatmentId }),
    enabled: open,
  })

  const { data: items } = useQuery<any>({ // Mantido o 'any' aqui por não ter o tipo de retorno de getItems
    queryKey: ['items'],
    queryFn: () => getItems(),
  })

  const { mutateAsync: treatmentItem } = useMutation({
    mutationFn: createTreatmentItem,
  })

  const { mutateAsync: DeleteTreatmentItem } = useMutation({
    mutationFn: deleteTreatmentItem,
  })

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    // Valor padrão inicial para o desconto deve ser '0'
    defaultValues: {
      quantity: '1',
      discount: '0',
    }
  })

  // Filtrar itens por pesquisa
  const filteredItems = items?.data.items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    item.active
  ) || []

  // Cálculo do subtotal
  let subtotal = 0
  if (treatment) {
    subtotal = treatment.items.reduce((accumulator, item) => {
      const currentSubtotal = item.quantity * item.salesValue
      return accumulator + currentSubtotal
    }, 0)
  }

  function calculateFinalValue(baseValue: number, quantity: number, discount: number) {
    const totalBeforeDiscount = baseValue * quantity
    const discountAmount = totalBeforeDiscount * (discount / 100)
    const finalPrice = totalBeforeDiscount - discountAmount
    return finalPrice > 0 ? finalPrice : 0
  }

  async function onSubmit(data: FormSchemaType) {
    // A lógica de conversão para Number está mantida, pois é a essência do seu código.
    const unitSalesValue = finalSalesValue / (data.quantity ? Number(data.quantity) : 1)

    const response = await treatmentItem({
      treatmentId,
      itemId: data.item,
      quantity: data.quantity ? Number(data.quantity) : 1,
      salesValue: unitSalesValue,
    })

    if (response !== undefined) {
      await itemRefetch()
      toast.success('Item adicionado com sucesso')
      form.reset({
        item: '',
        quantity: '1',
        discount: '0',
      })
      setSalesValue(0)
      setItemQuantity(1)
      setItemDiscount(0)
      setFinalSalesValue(0)
      setSearchTerm('')
      setDiscountInputDisplay('0') // Resetar o display
      setMobileView('cart') // Vai para o carrinho após adicionar item (como antes)
    }
  }

  function onItemSelect(item: any) {
    form.setValue('item', item.id)
    const newSalesValue = item.price
    setSalesValue(newSalesValue)
    // Usar itemDiscount, que é 0 por padrão, para calcular
    const finalPrice = calculateFinalValue(newSalesValue, itemQuantity, itemDiscount)
    setFinalSalesValue(finalPrice)
    setSearchTerm('')
  }

  function onQuantityChange(newQuantityString: string | undefined) {
    const newQuantity = Number(newQuantityString) || 1
    if (newQuantity > 0) {
      setItemQuantity(newQuantity)
      const finalPrice = calculateFinalValue(salesValue, newQuantity, itemDiscount)
      setFinalSalesValue(finalPrice)
    }
  }

  // Função adaptada para gerenciar o display e o cálculo do desconto
  function onDiscountChange(newDiscountString: string | undefined) {
    // 1. Atualiza o valor de display para o que o usuário está digitando
    setDiscountInputDisplay(newDiscountString ?? '')

    // 2. Calcula o novo desconto (usando 0 se a string for vazia/undefined)
    const newDiscount = Number(newDiscountString) || 0
    const clampedDiscount = Math.max(0, Math.min(100, newDiscount))

    // 3. Atualiza o estado para cálculo
    setItemDiscount(clampedDiscount)

    // 4. Garante que o `react-hook-form` tenha o valor numérico (como string) para submissão
    // NOTA: É importante que o campo não contenha '0' durante a digitação,
    // mas o `react-hook-form` precisa de um valor para o `zod` e para o `onSubmit`.
    // Vamos confiar no `itemDiscount` e no `onBlur` para o cálculo e no `form.setValue`
    // para a validação, se necessário.
    // Para simplificar, vamos manter o `form.setValue` atualizado com o valor digitado (ou '0' se não for número válido)
    form.setValue('discount', newDiscountString ?? '0', { shouldValidate: true })

    // 5. Recalcula o valor final
    const finalPrice = calculateFinalValue(salesValue, itemQuantity, clampedDiscount)
    setFinalSalesValue(finalPrice)
  }

  function handleDiscountFocus(fieldValue: string | null | undefined) {
    // Ao focar, se o valor for '0', seta o display para vazio.
    if (fieldValue === '0' || fieldValue === undefined || fieldValue === null) {
      setDiscountInputDisplay('')
    } else {
      setDiscountInputDisplay(fieldValue)
    }
  }

  function handleDiscountBlur(fieldValue: string | null | undefined) {
    // Ao desfocar, se o campo estiver vazio, retorna a '0', refaz o cálculo.
    const trimmedValue = (fieldValue ?? '').trim()
    if (trimmedValue === '' || Number.isNaN(Number(trimmedValue))) {
      // 1. Atualiza o estado de exibição para '0'
      setDiscountInputDisplay('0')

      // 2. Atualiza o estado de cálculo para 0
      setItemDiscount(0)

      // 3. Atualiza o valor do formulário para '0'
      form.setValue('discount', '0', { shouldValidate: true })

      // 4. Refaz o cálculo com desconto zero
      const finalPrice = calculateFinalValue(salesValue, itemQuantity, 0)
      setFinalSalesValue(finalPrice)
    } else {
      // Se houver valor, atualiza o display para garantir que, por exemplo, '5.0' vira '5'
      setDiscountInputDisplay(trimmedValue)
    }
  }

  function adjustQuantity(amount: number) {
    const newQuantity = Math.max(1, itemQuantity + amount)
    setItemQuantity(newQuantity)
    form.setValue('quantity', newQuantity.toString())
    const finalPrice = calculateFinalValue(salesValue, newQuantity, itemDiscount)
    setFinalSalesValue(finalPrice)
  }

  async function onItemDelete(id: string) {
    const response = await DeleteTreatmentItem({
      treatmentItemId: id,
    })

    if (response !== undefined) {
      await itemRefetch()
      toast.success('Item removido com sucesso')
    }
  }

  if (!treatment) {
    return null
  }

  return (
    <DialogContent className="max-w-[95vw] h-[90vh] p-0 sm:max-w-[1800px]">
      <DialogHeader className="sr-only">
        <DialogTitle>PDV - Controle de Itens do Atendimento</DialogTitle>
        <DialogDescription>
          Sistema de ponto de venda para gerenciar produtos e serviços do atendimento
        </DialogDescription>
      </DialogHeader>

      <div className="flex h-full flex-col bg-background">
        {/* Header Principal */}
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-2">
            <div>
              <h2 className="text-xl font-bold text-foreground">PDV - Atendimento</h2>
              <p className="text-sm text-muted-foreground">ID: {treatmentId}</p>
            </div>
          </div>
        </div>

        {/* NOVO: Tabs de Navegação (Mobile) - Representa as áreas 1 e 2 da imagem */}
        <div className="grid grid-cols-2 sm:hidden border-b">
          {/* Aba Produtos */}
          <button
            onClick={() => setMobileView('products')}
            className={cn(
              "p-3 text-center text-sm font-medium border-b-2 transition-colors",
              mobileView === 'products'
                ? "border-primary text-primary bg-primary/10"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            Produtos
          </button>
          {/* Aba Carrinho */}
          <button
            onClick={() => setMobileView('cart')}
            className={cn(
              "p-3 text-center text-sm font-medium border-b-2 transition-colors",
              mobileView === 'cart'
                ? "border-primary text-primary bg-primary/10"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            Carrinho ({treatment.items.length})
          </button>
        </div>

        {/* Conteúdo Principal */}
        <div className="flex flex-1 overflow-hidden">
          {/* Página 1: Seleção de Produtos (Mobile) / Coluna Esquerda (Desktop) */}
          <div className={cn(
            "flex flex-col w-full transition-all duration-300",
            "sm:w-2/3 sm:border-r",
            mobileView === 'products' ? "flex" : "hidden sm:flex"
          )}>
            {/* Busca */}
            <div className="border-b p-4 bg-gray-50/50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar produtos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Grid de Produtos */}
            <ScrollArea className="flex-1 p-8">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 m-1">
                {filteredItems.map((item: any) => (
                  <Card
                    key={item.id}
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-lg hover:border-primary/50",
                      form.watch('item') === item.id && "ring-4 ring-primary shadow-lg"
                    )}
                    onClick={() => onItemSelect(item)}
                  >
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        <p className="text-sm font-medium line-clamp-2">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          R$ {item.price.toFixed(2)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>

            {/* Controles do Item Selecionado - Mobile (Visível apenas em Mobile) E Desktop (Visível apenas em Desktop) */}
            <div className="border-t p-4 bg-muted/50 sm:bg-white">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="item"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Produto Selecionado</FormLabel>
                        <FormControl>
                          <Input
                            disabled
                            value={items?.data.items.find((i: any) => i.id === field.value)?.name || 'Nenhum produto selecionado'}
                            className="bg-muted text-sm text-primary font-semibold"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Quantidade</FormLabel>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => adjustQuantity(-1)}
                              disabled={itemQuantity <= 1}
                              className="h-8 w-8 hover:bg-primary/10"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e)
                                  onQuantityChange(e.target.value)
                                }}
                                value={field.value ?? 1}
                                className="text-center h-8 text-sm font-bold"
                              />
                            </FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => adjustQuantity(1)}
                              className="h-8 w-8 hover:bg-primary/10"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="discount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Desconto (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e)
                                onDiscountChange(e.target.value)
                              }}
                              value={discountInputDisplay}
                              onFocus={() => handleDiscountFocus(field.value)}
                              onBlur={() => handleDiscountBlur(field.value)}
                              className="h-8 text-sm text-red-600 font-semibold"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Valores */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-sm font-medium">Valor Unitário</p>
                      <p className="text-sm font-semibold text-muted-foreground">
                        R$ {salesValue.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Total</p>
                      <p className="text-lg font-bold text-green-600">
                        R$ {finalSalesValue.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-none">
                    <Button
                      type="submit"
                      disabled={!form.watch('item')}
                      className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground sm:col-span-2"
                    >
                      <Plus className="h-4 w-4" />
                      Adicionar Item
                    </Button>

                    {/* Botão Ver Carrinho só faz sentido no mobile */}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setMobileView('cart')}
                      className="flex items-center justify-center gap-2 sm:hidden"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Ver Carrinho
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </div>

          {/* Página 2: Carrinho (Mobile) / Coluna Direita (Desktop) */}
          <div className={cn(
            "flex flex-col w-full transition-all duration-300",
            "sm:w-1/3 bg-gray-50",
            mobileView === 'cart' ? "flex" : "hidden sm:flex"
          )}>
            {/* Header do Carrinho (apenas para desktop, pois o header mobile é coberto pelas tabs) */}
            <div className="border-b p-4 hidden sm:block">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-primary" />
                  Carrinho ({treatment.items.length})
                </h3>
                {/* Subtotal do Carrinho */}
                <p className="text-sm font-semibold">R$ {subtotal.toFixed(2)}</p>
              </div>
            </div>

            {/* Lista de Itens do Carrinho */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {treatment.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg border p-3 bg-white shadow-sm">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.items.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity} x R$ {item.salesValue.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <p className="text-sm font-semibold whitespace-nowrap text-primary">
                        R$ {(item.quantity * item.salesValue).toFixed(2)}
                      </p>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-red-100">
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="max-w-[95vw] w-full">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover item?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja remover {item.items.name} do atendimento?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onItemDelete(item.id)} className="bg-red-500 hover:bg-red-600">
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
                {treatment.items.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground opacity-80">
                    <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Nenhum item adicionado</p>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Footer do Carrinho - Mobile e Desktop */}
            <div className="border-t p-4 bg-white sticky bottom-0 shadow-lg sm:shadow-none sm:static">
              <div className="space-y-3">
                {/* Resumo do Total */}
                <div className="flex justify-between items-center">
                  <h4 className="text-lg font-bold">Total:</h4>
                  <p className="text-2xl font-bold text-green-600">
                    R$ {subtotal.toFixed(2)}
                  </p>
                </div>

                {/* Botão Finalizar Venda - Visível em todas as telas */}
                <Button
                  onClick={() => setShowPayment(true)}
                  disabled={treatment.items.length === 0}
                  className="w-full bg-green-500 hover:bg-green-600 text-white shadow-lg"
                  size="lg"
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Finalizar Venda
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showPayment && (
        <TreatmentPaymentModal
          treatmentId={treatmentId}
          totalAmount={subtotal || 0}
          isOpen={showPayment}
          onClose={() => setShowPayment(false)}
          onSuccess={() => {
            itemRefetch()
            setShowPayment(false)
          }}
        />
      )}
    </DialogContent>
  )
}