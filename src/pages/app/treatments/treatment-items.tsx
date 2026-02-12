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
  Package,
} from 'lucide-react'
import { useEffect, useState, useRef } from 'react'
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
import { useModules } from '@/context/module-context'
import { Badge } from '@/components/ui/badge'

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
  const { isModuleActive } = useModules()
  const isFinanceActive = isModuleActive('financial')
  const isStockActive = isModuleActive('merchandise')

  const [finalSalesValue, setFinalSalesValue] = useState(0)
  const [salesValue, setSalesValue] = useState(0)
  const [itemQuantity, setItemQuantity] = useState(1)
  const [itemDiscount, setItemDiscount] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [showPayment, setShowPayment] = useState(false)
  const [activeTab, setActiveTab] = useState<'products' | 'cart'>('products')
  const [discountInputDisplay, setDiscountInputDisplay] = useState('0')
  const [isContractMode, setIsContractMode] = useState(false)

  // Ref for scrolling to form on item select (mobile primarily)
  const formRef = useRef<HTMLFormElement>(null)

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
    queryKey: ['items-sales', debouncedSearchTerm, isStockActive],
    queryFn: async () => {
      try {
        const promises = []
        if (isStockActive) {
          promises.push(getProducts({ query: debouncedSearchTerm, active: true, perPage: 100 }))
        } else {
          promises.push(Promise.resolve({ data: { products: [] } }))
        }

        // Services always fetched (core)
        promises.push(getServices({ query: debouncedSearchTerm, active: true, perPage: 100 }))

        const [productsRes, servicesRes] = await Promise.all(promises)

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

  const filteredItems = items?.filter((item: any) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  let subtotal = 0
  if (treatment) {
    subtotal = (treatment.items || []).reduce((accumulator: number, item: any) => {
      const quantity = item.quantity || 0
      const value = item.salesValue || 0
      const discount = item.discount || 0
      const currentSubtotal = (quantity * value) - discount
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

      if (isFinanceActive) {
        if (isContractMode) {
          unitSalesValue = salesValue
          discountValue = salesValue * quantity
        } else {
          unitSalesValue = salesValue
          const totalGross = salesValue * quantity
          discountValue = totalGross - finalSalesValue
          if (discountValue < 0) discountValue = 0
        }
      }

      const response = await treatmentItem({
        treatmentId,
        itemId: data.item,
        quantity,
        salesValue: unitSalesValue,
        discount: discountValue,
      })

      const selectedItemDetails = items?.find((i: any) => i.id === data.item)
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
      // Switch to cart on mobile after add to show feedback
      if (window.innerWidth < 768) {
        setActiveTab('cart')
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Erro ao adicionar item'
      toast.error(msg)
    }
  }

  function onItemSelect(item: any) {
    form.setValue('item', item.id)
    const newSalesValue = item.price
    setSalesValue(newSalesValue)

    setItemQuantity(1)
    form.setValue('quantity', '1')

    if (treatment && treatment.clients?.contract) {
      // Logic for auto-selecting contract mode based on item type could go here
      // limiting to just Services for now as standard practice
      if (!item.isItem) {
        setIsContractMode(true)
      } else {
        setIsContractMode(false)
      }
    }

    const finalPrice = calculateFinalValue(newSalesValue, 1, itemDiscount)
    setFinalSalesValue(finalPrice)
    setSearchTerm('')

    // Smooth scroll to form area
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
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
    await DeleteTreatmentItem({ treatmentItemId: id })
    await itemRefetch()
    toast.success('Item removido com sucesso')
  }

  if (!treatment) return null

  return (
    <ErrorBoundary>
      <DialogContent
        className="max-w-[100vw] h-[100dvh] sm:h-[95vh] p-0 sm:max-w-[95vw] md:max-w-5xl lg:max-w-7xl overflow-hidden flex flex-col bg-slate-50 dark:bg-slate-950"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="hidden">
          <DialogTitle>PDV</DialogTitle>
        </DialogHeader>

        {/* HEADER */}
        <div className="flex-none p-4 border-b bg-white dark:bg-slate-900 shadow-sm z-20">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <h2 className="text-xl font-bold text-minsk-900 dark:text-minsk-100 flex items-center gap-2">
                <Package className="h-6 w-6 text-minsk-600" />
                PDV do Atendimento
              </h2>
              <p className="text-sm text-minsk-500 font-medium">Protocolo: # {treatmentId.slice(0, 8)}</p>
            </div>
            {/* Total Badge visible on Desktop Header */}
            {isFinanceActive && (
              <div className="hidden md:flex flex-col items-end">
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Total</span>
                <span className="text-2xl font-bold text-vida-loca-600">
                  R$ {subtotal.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* MOBILE TABS */}
        <div className="flex md:hidden border-b bg-white dark:bg-slate-900 sticky top-0 z-10">
          <button
            onClick={() => setActiveTab('products')}
            className={cn(
              "flex-1 py-3 text-sm font-semibold border-b-2 transition-all duration-200",
              activeTab === 'products'
                ? "border-minsk-500 text-minsk-600 bg-minsk-50/50"
                : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            Produtos & Serviços
          </button>
          <button
            onClick={() => setActiveTab('cart')}
            className={cn(
              "flex-1 py-3 text-sm font-semibold border-b-2 transition-all duration-200",
              activeTab === 'cart'
                ? "border-vida-loca-500 text-vida-loca-600 bg-vida-loca-50/50"
                : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            Carrinho ({treatment.items?.length || 0})
          </button>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-slate-50/50">

          {/* LEFT COLUMN: PRODUCTS & SERVICES */}
          <div className={cn(
            "flex-col w-full h-full md:w-[60%] lg:w-[65%] xl:w-[70%] bg-slate-50 dark:bg-slate-950 overflow-hidden",
            activeTab === 'products' ? "flex" : "hidden md:flex"
          )}>
            {/* Search Bar */}
            <div className="p-4 bg-white dark:bg-slate-900 border-b flex-none sticky top-0 z-10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Buscar produtos ou serviços..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12 text-base shadow-sm border-slate-200 bg-slate-50 focus:bg-white transition-all rounded-xl"
                />
              </div>
            </div>

            {/* Grid */}
            <ScrollArea className="flex-1 p-2 sm:p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 pb-24 md:pb-0">
                {isItemsLoading ? (
                  Array.from({ length: 12 }).map((_, i) => (
                    <Skeleton key={i} className="h-32 w-full rounded-xl" />
                  ))
                ) : (
                  <>
                    {filteredItems.map((item: any) => {
                      const hasStock = item.hasStock !== false;
                      const isSelected = form.watch('item') === item.id;

                      return (
                        <Card
                          key={item.id}
                          onClick={() => onItemSelect(item)}
                          className={cn(
                            "cursor-pointer transition-all border-slate-200 shadow-sm hover:shadow-md hover:border-minsk-300 relative group overflow-hidden rounded-xl",
                            isSelected && "ring-2 ring-minsk-500 border-minsk-500 bg-minsk-50/10",
                            !hasStock && "opacity-70 grayscale-[0.5] bg-slate-100"
                          )}
                        >
                          <CardContent className="p-3 flex flex-col h-full justify-between gap-2">
                            <div>
                              <div className="flex items-start justify-between gap-1 mb-1">
                                <Badge variant="outline" className={cn(
                                  "text-[10px] px-1.5 py-0 h-5 font-bold border-0",
                                  item.isItem ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                                )}>
                                  {item.isItem ? (isStockActive ? 'PROD' : 'ITEM') : 'SERV'}
                                </Badge>
                                {!hasStock && isStockActive && (
                                  <Badge variant="destructive" className="text-[10px] px-1 h-5">Sem Estoque</Badge>
                                )}
                              </div>
                              <h3 className="text-sm font-semibold leading-tight text-slate-800 dark:text-slate-100 line-clamp-2" title={item.name}>
                                {item.name}
                              </h3>
                            </div>

                            {isFinanceActive && (
                              <div className="mt-auto pt-2 border-t border-slate-100 dark:border-slate-800">
                                <p className="text-xs text-slate-400 font-medium">Valor Unit.</p>
                                <p className="text-base font-bold text-slate-900 dark:text-white">
                                  R$ {item.price.toFixed(2)}
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )
                    })}
                    {filteredItems.length === 0 && (
                      <div className="col-span-full py-10 flex flex-col items-center justify-center text-slate-400">
                        <Search className="h-12 w-12 mb-3 opacity-20" />
                        <p>Nenhum item encontrado.</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </ScrollArea>

            {/* Add Item Form Area (Fixed at bottom on desktop, scrollable on mobile) */}
            <div className="flex-none border-t bg-white dark:bg-slate-900 p-4 shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.05)] z-20">
              <Form {...form}>
                <form ref={formRef} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-4xl mx-auto">

                  {/* Selected Item Display */}
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <Box className="h-5 w-5 text-slate-400 shrink-0" />
                    <span className="text-sm font-medium text-slate-700 truncate flex-1">
                      {items?.find((i: any) => i.id === form.watch('item'))?.name || 'Selecione um item acima'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                    {/* QTD */}
                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem className="col-span-1">
                          <FormLabel className="text-xs font-bold text-slate-500 uppercase">Qtd.</FormLabel>
                          <div className="flex items-center h-12 border rounded-xl overflow-hidden bg-white focus-within:ring-2 ring-minsk-500/20 active:scale-[0.99] transition-all">
                            <button type="button" onClick={() => adjustQuantity(-1)} className="h-full px-3 hover:bg-slate-50 text-slate-500">
                              <Minus className="h-4 w-4" />
                            </button>
                            <Input
                              {...field}
                              type="number"
                              className="h-full border-none shadow-none text-center font-bold text-lg p-0 focus-visible:ring-0"
                              onChange={(e) => { field.onChange(e); onQuantityChange(e.target.value); }}
                              value={field.value ?? 1}
                            />
                            <button type="button" onClick={() => adjustQuantity(1)} className="h-full px-3 hover:bg-slate-50 text-slate-500">
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        </FormItem>
                      )}
                    />

                    {/* Discount */}
                    {isFinanceActive && (
                      <FormField
                        control={form.control}
                        name="discount"
                        render={({ field }) => (
                          <FormItem className="col-span-1">
                            <FormLabel className="text-xs font-bold text-slate-500 uppercase">Desc. (%)</FormLabel>
                            <FormControl>
                              <Input
                                className="h-12 border-slate-200 rounded-xl text-center font-bold text-red-500 text-lg shadow-sm"
                                type="number"
                                {...field}
                                onChange={(e) => { field.onChange(e); onDiscountChange(e.target.value); }}
                                value={discountInputDisplay}
                                onFocus={() => handleDiscountFocus(field.value)}
                                onBlur={() => handleDiscountBlur(field.value)}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Contract Toggle */}
                    {isContractMode && isFinanceActive && (
                      <div className="col-span-2 md:col-span-1 flex items-center justify-center h-12 bg-blue-50 rounded-xl border border-blue-100 px-2 lg:px-4">
                        <div className="flex items-center gap-2">
                          <Switch id="contract-mode" checked={isContractMode} onCheckedChange={setIsContractMode} className="data-[state=checked]:bg-blue-600" />
                          <Label htmlFor="contract-mode" className="text-xs font-bold text-blue-700 cursor-pointer whitespace-nowrap">CONTRATO</Label>
                        </div>
                      </div>
                    )}

                    {/* Add Button */}
                    <Button
                      type="submit"
                      disabled={!form.watch('item')}
                      className="h-12 col-span-2 md:col-span-1 bg-minsk-600 hover:bg-minsk-700 text-white font-bold rounded-xl shadow-lg shadow-minsk-200 active:scale-95 transition-all text-base"
                    >
                      <Plus className="mr-2 h-5 w-5" />
                      ADICIONAR
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </div>

          {/* RIGHT COLUMN: CART (STICKY ON DESKTOP) */}
          <div className={cn(
            "flex-col w-full h-full md:w-[40%] lg:w-[35%] xl:w-[30%] bg-white dark:bg-slate-900 border-l border-slate-200 shadow-xl z-30",
            activeTab === 'cart' ? "flex" : "hidden md:flex"
          )}>
            {/* Header for Cart Desktop */}
            <div className="hidden md:flex items-center justify-between p-4 border-b bg-slate-50/50">
              <h3 className="font-bold text-lg flex items-center gap-2 text-slate-800">
                <ShoppingCart className="h-5 w-5 text-vida-loca-600" />
                Carrinho
              </h3>
              <Badge variant="secondary" className="bg-white border-slate-200 text-slate-600">
                {treatment.items?.length || 0} itens
              </Badge>
            </div>

            {/* Cart List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
              {(treatment.items || []).map((item) => (
                <div key={item.id} className="relative group bg-white border border-slate-100 rounded-xl p-3 shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2 max-w-[85%]">
                      <div className={cn("p-1.5 rounded-lg", item.items.isItem ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600")}>
                        {item.items.isItem ? <Box className="h-4 w-4" /> : <Wrench className="h-4 w-4" />}
                      </div>
                      <span className="font-semibold text-sm text-slate-800 line-clamp-1" title={item.items.name}>
                        {item.items.name}
                      </span>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="text-slate-300 hover:text-red-500 transition-colors p-1">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover Item?</AlertDialogTitle>
                          <AlertDialogDescription>Deseja remover este item do atendimento?</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onItemDelete(item.id)} className="bg-red-500">Remover</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>

                  <div className="flex items-end justify-between">
                    <div className="text-xs text-slate-500 font-medium">
                      {item.quantity} x {isFinanceActive ? `R$ ${(item.salesValue || 0).toFixed(2)}` : 'Item'}
                      {isFinanceActive && (item.discount || 0) > 0 && (
                        <span className="block text-red-500 font-semibold">Desc: -R$ {(item.discount || 0).toFixed(2)}</span>
                      )}
                    </div>
                    {isFinanceActive && (
                      <div className="text-right">
                        <Badge className={cn(
                          "text-sm font-bold px-2 py-0.5 pointer-events-none",
                          item.salesValue === 0 ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-slate-900 text-white hover:bg-slate-800"
                        )}>
                          {item.salesValue === 0
                            ? 'GRÁTIS'
                            : `R$ ${((item.quantity * (item.salesValue || 0)) - (item.discount || 0)).toFixed(2)}`
                          }
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {treatment.items?.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10 opacity-60">
                  <ShoppingCart className="h-12 w-12 mb-2" />
                  <p className="text-sm">Carrinho vazio</p>
                </div>
              )}
            </div>

            {/* Sticky Footer Cart Actions */}
            <div className="flex-none p-4 bg-white border-t space-y-3 shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.1)]">
              {isFinanceActive && (
                <div className="flex justify-between items-end">
                  <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Total a Pagar</span>
                  <span className="text-3xl font-bold text-vida-loca-600 leading-none">
                    R$ {subtotal.toFixed(2)}
                  </span>
                </div>
              )}

              <Button
                onClick={() => setShowPayment(true)}
                disabled={treatment.items.length === 0}
                className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg rounded-xl shadow-lg shadow-emerald-200 active:scale-[0.98] transition-all"
              >
                <CreditCard className="mr-2 h-5 w-5" />
                {isFinanceActive ? 'FINALIZAR VENDA' : 'CONCLUIR ATENDIMENTO'}
              </Button>
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
