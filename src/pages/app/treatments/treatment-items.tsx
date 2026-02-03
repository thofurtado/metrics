import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Minus,
  Trash2,
  Search,
  ShoppingCart,
  CreditCard,
  Box,
  Wrench,
  AlertTriangle,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { createTreatmentItem } from '@/api/create-treatment-item'
import { deleteTreatmentItem } from '@/api/delete-treatment-item'
import { getProducts } from '@/api/get-products'
import { getServices } from '@/api/get-services'
import { getTreatmentDetails } from '@/api/get-treatment-details'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { EmptyState } from '@/components/empty-state'
import { ErrorBoundary } from '@/components/error-boundary'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { TreatmentPaymentModal } from './treatment-payment-modal'

import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

interface TreatmentDetails {
  id: string
  items: {
    id: string
    quantity: number
    salesValue?: number
    discount?: number
    items: {
      name: string
      isItem: boolean
    }
  }[]
  clients: {
    name: string
    contract: boolean
  }
}

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
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [showPayment, setShowPayment] = useState(false)
  const [mobileView, setMobileView] = useState<'products' | 'cart'>('products')
  const [discountInputDisplay, setDiscountInputDisplay] = useState('0')
  const [isContractMode, setIsContractMode] = useState(false)

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantity: '1',
      discount: '0',
    }
  })

  useEffect(() => {
    if (form.formState.isSubmitSuccessful) {
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
      setDiscountInputDisplay('0')
    }
  }, [form.formState.isSubmitSuccessful, form])

  const { data: treatment, refetch: itemRefetch } = useQuery<TreatmentDetails>({
    queryKey: ['treatment', treatmentId],
    queryFn: async () => {
      const data = await getTreatmentDetails({ treatmentId })
      return data as TreatmentDetails
    },
    enabled: open,
  })

  useEffect(() => {
    if (treatment && !treatment.clients?.contract) {
      setIsContractMode(false)
    }
  }, [treatment])

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500)

    return () => {
      clearTimeout(handler)
    }
  }, [searchTerm])

  // New Combined Query
  const { data: items = [], isLoading: isItemsLoading } = useQuery({
    queryKey: ['items-sales', debouncedSearchTerm],
    queryFn: async () => {
      try {
        const [productsRes, servicesRes] = await Promise.all([
          getProducts({ query: debouncedSearchTerm, active: true, perPage: 100 }),
          getServices({ query: debouncedSearchTerm, active: true, perPage: 100 })
        ])

        const products = productsRes.data?.products?.map(p => ({
          ...p,
          type: 'PRODUCT',
          isItem: true,
          hasStock: !p.is_composite || (p.compositions?.every(c => (c.supply.stock >= c.quantity)) ?? true)
        })) || []

        const services = servicesRes.data?.services?.map(s => ({
          ...s,
          type: 'SERVICE',
          isItem: false,
          hasStock: true
        })) || []

        return [...products, ...services]
      } catch (error) {
        return []
      }
    },
  })

  const { mutateAsync: treatmentItem } = useMutation({
    mutationFn: createTreatmentItem,
  })

  const { mutateAsync: DeleteTreatmentItem } = useMutation({
    mutationFn: deleteTreatmentItem,
  })

  // Filter items by search term locally (as a fallback or for instant feel)
  const filteredItems = items?.filter((item: any) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  let subtotal = 0
  if (treatment) {
    subtotal = (treatment.items || []).reduce((accumulator: number, item: any) => {
      const currentSubtotal = (item.quantity * item.salesValue) - (item.discount || 0)
      return accumulator + currentSubtotal
    }, 0)
  }

  function calculateFinalValue(baseValue: number, quantity: number, discount: number) {
    const totalBeforeDiscount = baseValue * quantity
    const discountAmount = totalBeforeDiscount * (discount / 100)
    const finalPrice = totalBeforeDiscount - discountAmount
    return finalPrice > 0 ? finalPrice : 0
  }

  const queryClient = useQueryClient()

  async function onSubmit(data: FormSchemaType) {
    try {
      const quantity = data.quantity ? parseFloat(data.quantity) : 1
      let unitSalesValue = 0
      let discountValue = 0

      if (isContractMode) {
        unitSalesValue = salesValue
        discountValue = salesValue * quantity
      } else {
        unitSalesValue = salesValue
        const totalGross = salesValue * quantity
        discountValue = totalGross - finalSalesValue
        if (discountValue < 0) discountValue = 0
      }

      const response = await treatmentItem({
        treatmentId,
        itemId: data.item,
        quantity,
        salesValue: unitSalesValue,
        discount: discountValue,
      })

      // Manually update cache for instant feedback
      const selectedItemDetails = items?.find((i: any) => i.id === data.item)

      // Backend returns { treatmentItem: { ... } } or just { ... } depending on controller
      // We check both for robustness
      const createdItem = response.data.treatmentItem || response.data

      if (selectedItemDetails && createdItem && createdItem.id) {
        const newItem = {
          id: createdItem.id,
          quantity: quantity,
          salesValue: unitSalesValue,
          discount: discountValue,
          items: {
            name: selectedItemDetails.name,
            id: selectedItemDetails.id,
            isItem: selectedItemDetails.isItem
          }
        }

        queryClient.setQueryData(['treatment', treatmentId], (oldData: TreatmentDetails | undefined) => {
          if (!oldData) return oldData
          return {
            ...oldData,
            items: [...(oldData.items || []), newItem]
          }
        })
      }

      await itemRefetch()
      toast.success('Item adicionado com sucesso')
      setMobileView('cart')
    } catch (error: any) {
      if (error.response?.data?.message) {
        toast.error(error.response.data.message)
      } else {
        toast.error('Erro ao adicionar item')
      }
    }
  }

  function onItemSelect(item: any) {
    form.setValue('item', item.id)
    const newSalesValue = item.price
    setSalesValue(newSalesValue)

    setItemQuantity(1)
    form.setValue('quantity', '1')

    if (treatment && treatment.clients?.contract) {
      if (!item.isItem) { // Service
        setIsContractMode(true)
      } else {
        setIsContractMode(false)
      }
    }

    const finalPrice = calculateFinalValue(newSalesValue, 1, itemDiscount)
    setFinalSalesValue(finalPrice)
    setSearchTerm('')
  }

  function onQuantityChange(newQuantityString: string | undefined) {
    const newQuantity = parseFloat(newQuantityString || '') || 0
    if (newQuantity > 0) {
      setItemQuantity(newQuantity)
      const finalPrice = calculateFinalValue(salesValue, newQuantity, itemDiscount)
      setFinalSalesValue(finalPrice)
    }
  }

  function onDiscountChange(newDiscountString: string | undefined) {
    setDiscountInputDisplay(newDiscountString ?? '')
    const newDiscount = parseFloat(newDiscountString || '') || 0
    const clampedDiscount = Math.max(0, Math.min(100, newDiscount))
    setItemDiscount(clampedDiscount)
    form.setValue('discount', newDiscountString ?? '0', { shouldValidate: true })
    const finalPrice = calculateFinalValue(salesValue, itemQuantity, clampedDiscount)
    setFinalSalesValue(finalPrice)
  }

  function handleDiscountFocus(fieldValue: string | null | undefined) {
    if (fieldValue === '0' || fieldValue === undefined || fieldValue === null) {
      setDiscountInputDisplay('')
    } else {
      setDiscountInputDisplay(fieldValue)
    }
  }

  function handleDiscountBlur(fieldValue: string | null | undefined) {
    const trimmedValue = (fieldValue ?? '').trim()
    if (trimmedValue === '' || Number.isNaN(Number(trimmedValue))) {
      setDiscountInputDisplay('0')
      setItemDiscount(0)
      form.setValue('discount', '0', { shouldValidate: true })
      const finalPrice = calculateFinalValue(salesValue, itemQuantity, 0)
      setFinalSalesValue(finalPrice)
    } else {
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
    await DeleteTreatmentItem({
      treatmentItemId: id,
    })

    await itemRefetch()
    toast.success('Item removido com sucesso')
  }

  if (!treatment) {
    return null
  }

  return (
    <ErrorBoundary>
      <DialogContent
        className="max-w-[95vw] h-[90vh] p-0 sm:max-w-[1800px]"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>PDV - Controle de Itens do Atendimento</DialogTitle>
          <DialogDescription>
            Sistema de ponto de venda para gerenciar produtos e serviços do atendimento
          </DialogDescription>
        </DialogHeader>

        <div className="flex h-full flex-col bg-background">
          <div className="flex items-center justify-between border-b p-4">
            <div className="flex items-center gap-2">
              <div>
                <h2 className="text-xl font-bold text-foreground">PDV - Atendimento</h2>
                <p className="text-sm text-muted-foreground">ID: {treatmentId}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:hidden border-b">
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
            <button
              onClick={() => setMobileView('cart')}
              className={cn(
                "p-3 text-center text-sm font-medium border-b-2 transition-colors",
                mobileView === 'cart'
                  ? "border-primary text-primary bg-primary/10"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              Carrinho ({(treatment.items || []).length})
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden">
            <div className={cn(
              "flex flex-col w-full transition-all duration-300",
              "sm:w-2/3 sm:border-r",
              mobileView === 'products' ? "flex" : "hidden sm:flex"
            )}>
              <div className="border-b p-4 bg-gray-50/50">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar produtos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-10"
                  />
                </div>
              </div>

              <ScrollArea className="flex-1 p-8">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 m-1">
                  {isItemsLoading ? (
                    Array.from({ length: 15 }).map((_, i) => (
                      <Card key={i} className="animate-pulse">
                        <CardContent className="p-3 space-y-2">
                          <Skeleton className="h-10 w-full" />
                          <Skeleton className="h-4 w-2/3" />
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <>
                      {filteredItems.map((item: any) => {
                        const hasStock = item.hasStock !== false;
                        return (
                          <Card
                            key={item.id}
                            className={cn(
                              "cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 relative group",
                              form.watch('item') === item.id && "ring-4 ring-primary shadow-lg",
                              !hasStock && "opacity-80 border-orange-200 bg-orange-50/30"
                            )}
                            onClick={() => onItemSelect(item)}
                          >
                            <CardContent className="p-3">
                              <div className="space-y-2">
                                <p className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">{item.name}</p>
                                <p className="text-xs text-muted-foreground font-bold">
                                  R$ {(item.price || 0).toFixed(2)}
                                </p>
                                {!hasStock && (
                                  <div className="flex items-center text-[10px] font-bold text-orange-600 mt-1">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    Falta Insumo
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                      {filteredItems.length === 0 && (
                        <div className="col-span-full py-12">
                          <EmptyState
                            title="Nenhum item"
                            description="Tente buscar por outro termo ou categoria."
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </ScrollArea>

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
                              value={items?.find((i: any) => i.id === field.value)?.name || 'Nenhum produto selecionado'}
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
                                  step="0.01"
                                  min="0.01"
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
                                step="0.01"
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

                    {treatment && treatment.clients?.contract && (
                      <div className="flex items-center space-x-2 bg-blue-50 p-3 rounded-md border border-blue-200">
                        <Switch
                          id="contract-mode"
                          checked={isContractMode}
                          onCheckedChange={setIsContractMode}
                        />
                        <Label htmlFor="contract-mode" className="text-sm font-medium cursor-pointer">
                          Lançar via Contrato (Gratuito)
                        </Label>
                      </div>
                    )}

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

            <div className={cn(
              "flex flex-col w-full transition-all duration-300",
              "sm:w-1/3 bg-gray-50",
              mobileView === 'cart' ? "flex" : "hidden sm:flex"
            )}>
              <div className="border-b p-4 hidden sm:block">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-primary" />
                    Carrinho ({treatment.items.length})
                  </h3>
                  <p className="text-sm font-semibold">R$ {subtotal.toFixed(2)}</p>
                </div>
              </div>

              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {(treatment.items || []).map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-lg border p-3 bg-white shadow-sm">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {item.items.isItem ? (
                            <Box className="h-4 w-4 text-blue-500" />
                          ) : (
                            <Wrench className="h-4 w-4 text-amber-500" />
                          )}
                          <p className="text-sm font-medium truncate">{item.items.name}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity} x R$ {(item.salesValue || 0).toFixed(2)}
                        </p>
                        {(item.discount || 0) > 0 && (
                          <p className="text-[10px] text-red-500">
                            Desconto: -R$ {(item.discount || 0).toFixed(2)}
                          </p>
                        )}
                        {item.salesValue === 0 && (
                          <p className="text-[10px] text-green-600 font-medium">
                            Gratuito (Contrato)
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <p className="text-sm font-semibold whitespace-nowrap text-primary">
                          R$ {((item.quantity * (item.salesValue || 0)) - (item.discount || 0)).toFixed(2)}
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

              <div className="border-t p-4 bg-white sticky bottom-0 shadow-lg sm:shadow-none sm:static">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-lg font-bold">Total:</h4>
                    <p className="text-2xl font-bold text-green-600">
                      R$ {subtotal.toFixed(2)}
                    </p>
                  </div>

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
    </ErrorBoundary>
  )
}
