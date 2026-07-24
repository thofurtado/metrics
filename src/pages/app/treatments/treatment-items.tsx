import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Box,
  CreditCard,
  Minus,
  Package,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  Wrench,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { createTreatmentItem } from '@/api/create-treatment-item'
import { deleteTreatmentItem } from '@/api/delete-treatment-item'
import { getProducts } from '@/api/get-products'
import { getServices } from '@/api/get-services'
import { getTreatmentDetails } from '@/api/get-treatment-details'
import { updateTreatmentItem } from '@/api/update-treatment-item'
import { EmptyState } from '@/components/empty-state'
import { ErrorBoundary } from '@/components/error-boundary'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { useModules } from '@/context/module-context'
import { cn } from '@/lib/utils'

import { ProductItemDialog } from '../items/product-item-dialog'
import { TreatmentPaymentModal } from './treatment-payment-modal'

interface TreatmentDetails {
  id: string
  items: {
    id: string
    item_id: string
    quantity: number
    salesValue?: number
    discount?: number
    observations?: string
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
  observations: z.string().nullish(),
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

  const [isCreateItemOpen, setIsCreateItemOpen] = useState(false)
  const [createItemType, setCreateItemType] = useState<'PRODUCT' | 'SERVICE'>(
    'PRODUCT',
  )

  function handleOpenCreateItem(type: 'PRODUCT' | 'SERVICE') {
    setCreateItemType(type)
    setIsCreateItemOpen(true)
  }

  function handleCreateItemSuccess() {
    setIsCreateItemOpen(false)
    queryClient.invalidateQueries({ queryKey: ['items-sales'] })
    toast.success('Item cadastrado com sucesso!')
  }

  // Ref for scrolling to form on item select (mobile primarily)
  const formRef = useRef<HTMLFormElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const [editingItemId, setEditingItemId] = useState<string | null>(null)

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantity: '1',
      discount: '0',
      observations: '',
    },
  })

  useEffect(() => {
    if (form.formState.isSubmitSuccessful) {
      form.reset({
        item: '',
        quantity: '1',
        discount: '0',
        observations: '',
      })
      setSalesValue(0)
      setItemQuantity(1)
      setItemDiscount(0)
      setFinalSalesValue(0)
      setSearchTerm('')
      setDiscountInputDisplay('0')
      setEditingItemId(null)
      // Return focus to search input
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 100)
    }
  }, [form.formState.isSubmitSuccessful, form])

  const { data: treatment, refetch: itemRefetch } = useQuery<TreatmentDetails>({
    queryKey: ['treatment', treatmentId],
    queryFn: async () => {
      const data = await getTreatmentDetails({ treatmentId })
      return data as unknown as TreatmentDetails
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
          promises.push(
            getProducts({
              query: debouncedSearchTerm,
              active: true,
              perPage: 100,
            }),
          )
        } else {
          promises.push(Promise.resolve({ data: { products: [] } }))
        }

        // Services always fetched (core)
        promises.push(
          getServices({
            query: debouncedSearchTerm,
            active: true,
            perPage: 100,
          }),
        )

        const [productsRes, servicesRes] = await Promise.all(promises)

        const products =
          productsRes.data?.products?.map((p) => ({
            ...p,
            type: 'PRODUCT',
            isItem: true,
            hasStock:
              !p.is_composite ||
              (p.compositions?.every((c) => c.supply.stock >= c.quantity) ??
                true),
          })) || []

        const services =
          servicesRes.data?.services?.map((s) => ({
            ...s,
            type: 'SERVICE',
            isItem: false,
            hasStock: true,
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

  const { mutateAsync: UpdateTreatmentItem } = useMutation({
    mutationFn: updateTreatmentItem,
  })

  const { mutateAsync: DeleteTreatmentItem } = useMutation({
    mutationFn: deleteTreatmentItem,
  })

  const filteredItems =
    items?.filter((item: any) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()),
    ) || []

  let subtotal = 0
  if (treatment) {
    subtotal = (treatment.items || []).reduce(
      (accumulator: number, item: any) => {
        const quantity = item.quantity || 0
        const value = item.salesValue || 0
        const discount = item.discount || 0
        const currentSubtotal = quantity * value - discount
        return accumulator + currentSubtotal
      },
      0,
    )
  }

  function calculateFinalValue(
    baseValue: number,
    quantity: number,
    discount: number,
  ) {
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

      if (editingItemId) {
        // Since backend doesn't have a PATCH route for treatment items,
        // we simulate the edit by deleting the old item and creating a new one.
        await DeleteTreatmentItem({ treatmentItemId: editingItemId })

        const response = await treatmentItem({
          treatmentId,
          itemId: data.item,
          quantity,
          salesValue: unitSalesValue,
          discount: discountValue,
          observations: data.observations || undefined,
        })
        const updatedItem = response.data.treatmentItem || response.data

        if (updatedItem && updatedItem.id) {
          queryClient.setQueryData(
            ['treatment', treatmentId],
            (oldData: TreatmentDetails | undefined) => {
              if (!oldData) return oldData
              return {
                ...oldData,
                items: (oldData.items || []).map((i) => {
                  if (i.id === editingItemId) {
                    return {
                      ...i,
                      id: updatedItem.id, // Update to the new treatment item ID
                      quantity,
                      salesValue: unitSalesValue,
                      discount: discountValue,
                      observations: data.observations || '',
                    }
                  }
                  return i
                }),
              }
            },
          )
        }

        await itemRefetch()
        toast.success('Item atualizado com sucesso')
      } else {
        const response = await treatmentItem({
          treatmentId,
          itemId: data.item,
          quantity,
          salesValue: unitSalesValue,
          discount: discountValue,
          observations: data.observations || undefined,
        })

        const selectedItemDetails = items?.find((i: any) => i.id === data.item)
        const createdItem = response.data.treatmentItem || response.data

        if (selectedItemDetails && createdItem && createdItem.id) {
          const newItem = {
            id: createdItem.id,
            quantity,
            salesValue: unitSalesValue,
            discount: discountValue,
            observations: data.observations || '',
            item_id: data.item,
            items: {
              name: selectedItemDetails.name,
              id: selectedItemDetails.id,
              isItem: selectedItemDetails.isItem,
            },
          }

          queryClient.setQueryData(
            ['treatment', treatmentId],
            (oldData: TreatmentDetails | undefined) => {
              if (!oldData) return oldData
              return {
                ...oldData,
                items: [...(oldData.items || []), newItem],
              }
            },
          )
        }

        await itemRefetch()
        toast.success('Item adicionado com sucesso')
        // Switch to cart on mobile after add to show feedback
        if (window.innerWidth < 768) {
          setActiveTab('cart')
        }
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Erro ao adicionar item'
      toast.error(msg)
    }
  }

  function onItemSelect(item: any) {
    setEditingItemId(null)
    form.setValue('item', item.id)
    const newSalesValue = item.price
    setSalesValue(newSalesValue)

    setItemQuantity(1)
    form.setValue('quantity', '1')
    form.setValue('observations', '')
    setItemDiscount(0)
    setDiscountInputDisplay('0')
    form.setValue('discount', '0')

    if (treatment && treatment.clients?.contract) {
      // Logic for auto-selecting contract mode based on item type could go here
      // limiting to just Services for now as standard practice
      if (!item.isItem) {
        setIsContractMode(true)
      } else {
        setIsContractMode(false)
      }
    }

    const finalPrice = calculateFinalValue(newSalesValue, 1, 0)
    setFinalSalesValue(finalPrice)
    setSearchTerm('')

    // Smooth scroll to form area
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    // Focus quantity input for quick editing
    setTimeout(() => {
      document.getElementById('quantity-input')?.focus()
    }, 100)
  }

  function onCartItemSelect(cartItem: any) {
    setEditingItemId(cartItem.id)

    // Make sure 'item' is set to something so the form is valid and button is enabled
    const productId =
      cartItem.product_id ||
      cartItem.service_id ||
      cartItem.supply_id ||
      cartItem.item_id ||
      cartItem.itemId ||
      cartItem.id
    form.setValue('item', productId)

    // Fallback if salesValue doesn't exist on the cart item
    const newSalesValue = cartItem.salesValue || 0
    setSalesValue(newSalesValue)

    const qty = cartItem.quantity || 1
    setItemQuantity(qty)
    form.setValue('quantity', String(qty))

    const obs = cartItem.observations || ''
    form.setValue('observations', obs)

    const disc = cartItem.discount || 0
    setItemDiscount(disc)
    setDiscountInputDisplay(String(disc))
    form.setValue('discount', String(disc))

    if (treatment && treatment.clients?.contract) {
      if (!cartItem.items.isItem) {
        setIsContractMode(true)
      } else {
        setIsContractMode(false)
      }
    }

    const finalPrice = calculateFinalValue(newSalesValue, qty, disc)
    setFinalSalesValue(finalPrice)

    // Scroll to form and focus quantity
    if (window.innerWidth < 768) {
      setActiveTab('products') // ensure form is visible on mobile
    }
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      document.getElementById('quantity-input')?.focus()
    }, 150)
  }

  function onQuantityChange(newQuantityString: string | undefined) {
    const newQuantity = parseFloat(newQuantityString || '') || 0
    if (newQuantity > 0) {
      setItemQuantity(newQuantity)
      const finalPrice = calculateFinalValue(
        salesValue,
        newQuantity,
        itemDiscount,
      )
      setFinalSalesValue(finalPrice)
    }
  }

  function onDiscountChange(newDiscountString: string | undefined) {
    setDiscountInputDisplay(newDiscountString ?? '')
    const newDiscount = parseFloat(newDiscountString || '') || 0
    const clampedDiscount = Math.max(0, Math.min(100, newDiscount))
    setItemDiscount(clampedDiscount)
    form.setValue('discount', newDiscountString ?? '0', {
      shouldValidate: true,
    })
    const finalPrice = calculateFinalValue(
      salesValue,
      itemQuantity,
      clampedDiscount,
    )
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
    const finalPrice = calculateFinalValue(
      salesValue,
      newQuantity,
      itemDiscount,
    )
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
        className="flex h-[100dvh] max-w-[100vw] flex-col overflow-hidden bg-slate-50 p-0 dark:bg-slate-950 sm:h-[95vh] sm:max-w-[95vw] md:max-w-5xl lg:max-w-7xl"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="hidden">
          <DialogTitle>PDV</DialogTitle>
        </DialogHeader>

        {/* HEADER */}
        <div className="z-20 flex-none border-b bg-white p-4 shadow-sm dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <h2 className="flex items-center gap-2 text-xl font-bold text-minsk-900 dark:text-minsk-100">
                <Package className="h-6 w-6 text-minsk-600" />
                PDV do Atendimento
              </h2>
              <p className="text-sm font-medium text-minsk-500">
                Protocolo: # {treatmentId.slice(0, 8)}
              </p>
            </div>
            {/* Total Badge visible on Desktop Header */}
            {isFinanceActive && (
              <div className="hidden flex-col items-end md:flex">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Total
                </span>
                <span className="text-2xl font-bold text-vida-loca-600">
                  R$ {subtotal.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* MOBILE TABS */}
        <div className="sticky top-0 z-10 flex border-b bg-white dark:bg-slate-900 md:hidden">
          <button
            onClick={() => setActiveTab('products')}
            className={cn(
              'flex-1 border-b-2 py-3 text-sm font-semibold transition-all duration-200',
              activeTab === 'products'
                ? 'border-minsk-500 bg-minsk-50/50 text-minsk-600'
                : 'border-transparent text-slate-500 hover:text-slate-700',
            )}
          >
            Produtos & Serviços
          </button>
          <button
            onClick={() => setActiveTab('cart')}
            className={cn(
              'flex-1 border-b-2 py-3 text-sm font-semibold transition-all duration-200',
              activeTab === 'cart'
                ? 'border-vida-loca-500 bg-vida-loca-50/50 text-vida-loca-600'
                : 'border-transparent text-slate-500 hover:text-slate-700',
            )}
          >
            Carrinho ({treatment.items?.length || 0})
          </button>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="flex flex-1 flex-col overflow-hidden bg-slate-50/50 md:flex-row">
          {/* LEFT COLUMN: PRODUCTS & SERVICES */}
          <div
            className={cn(
              'h-full w-full flex-col overflow-hidden bg-slate-50 dark:bg-slate-950 md:w-[60%] lg:w-[65%] xl:w-[70%]',
              activeTab === 'products' ? 'flex' : 'hidden md:flex',
            )}
          >
            {/* Search Bar & Add Button */}
            <div className="sticky top-0 z-10 flex flex-none items-center gap-3 border-b bg-white p-4 dark:bg-slate-900">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <Input
                  ref={searchInputRef}
                  placeholder="Buscar produtos ou serviços..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-12 w-full rounded-xl border-slate-200 bg-slate-50 pl-10 text-base shadow-sm transition-all focus:bg-white"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex h-12 flex-shrink-0 items-center gap-2 rounded-xl border-minsk-200 bg-minsk-50/50 px-4 text-minsk-700 hover:bg-minsk-50"
                  >
                    <Plus className="h-5 w-5" />
                    <span className="hidden font-semibold sm:inline">
                      Novo Item
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-[10100] w-48">
                  <DropdownMenuItem
                    onClick={() => handleOpenCreateItem('PRODUCT')}
                    className="cursor-pointer"
                  >
                    Novo Produto
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleOpenCreateItem('SERVICE')}
                    className="cursor-pointer"
                  >
                    Novo Serviço
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Dialog
                open={isCreateItemOpen}
                onOpenChange={setIsCreateItemOpen}
              >
                <ProductItemDialog
                  initialType={createItemType}
                  onSuccess={handleCreateItemSuccess}
                />
              </Dialog>
            </div>

            {/* Grid */}
            <ScrollArea className="flex-1 p-2 sm:p-4">
              <div className="grid grid-cols-2 gap-3 pb-24 sm:grid-cols-3 md:pb-0 lg:grid-cols-3 xl:grid-cols-4">
                {isItemsLoading ? (
                  Array.from({ length: 12 }).map((_, i) => (
                    <Skeleton key={i} className="h-32 w-full rounded-xl" />
                  ))
                ) : (
                  <>
                    {filteredItems.map((item: any) => {
                      const hasStock = item.hasStock !== false
                      const isSelected = form.watch('item') === item.id

                      return (
                        <Card
                          key={item.id}
                          onClick={() => onItemSelect(item)}
                          className={cn(
                            'group relative cursor-pointer overflow-hidden rounded-xl border-slate-200 shadow-sm transition-all hover:border-minsk-300 hover:shadow-md',
                            isSelected &&
                              'border-minsk-500 bg-minsk-50/10 ring-2 ring-minsk-500',
                            !hasStock &&
                              'bg-slate-100 opacity-70 grayscale-[0.5]',
                          )}
                        >
                          <CardContent className="flex h-full flex-col justify-between gap-2 p-3">
                            <div>
                              <div className="mb-1 flex items-start justify-between gap-1">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'h-5 border-0 px-1.5 py-0 text-[10px] font-bold',
                                    item.isItem
                                      ? 'bg-blue-100 text-blue-700'
                                      : 'bg-amber-100 text-amber-700',
                                  )}
                                >
                                  {item.isItem
                                    ? isStockActive
                                      ? 'PROD'
                                      : 'ITEM'
                                    : 'SERV'}
                                </Badge>
                                {!hasStock && isStockActive && (
                                  <Badge
                                    variant="destructive"
                                    className="h-5 px-1 text-[10px]"
                                  >
                                    Sem Estoque
                                  </Badge>
                                )}
                              </div>
                              <h3
                                className="line-clamp-2 text-sm font-semibold leading-tight text-slate-800 dark:text-slate-100"
                                title={item.name}
                              >
                                {item.name}
                              </h3>
                            </div>

                            {isFinanceActive && (
                              <div className="mt-auto border-t border-slate-100 pt-2 dark:border-slate-800">
                                <p className="text-xs font-medium text-slate-400">
                                  Valor Unit.
                                </p>
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
                      <div className="col-span-full flex flex-col items-center justify-center py-10 text-slate-400">
                        <Search className="mb-3 h-12 w-12 opacity-20" />
                        <p>Nenhum item encontrado.</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </ScrollArea>

            {/* Add Item Form Area (Fixed at bottom on desktop, scrollable on mobile) */}
            <div className="z-20 flex-none border-t bg-white p-4 shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.05)] dark:bg-slate-900">
              <Form {...form}>
                <form
                  ref={formRef}
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="mx-auto max-w-4xl space-y-4"
                >
                  {/* Selected Item Display */}
                  <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <Box className="h-5 w-5 shrink-0 text-slate-400" />
                    <span className="flex-1 truncate text-sm font-medium text-slate-700">
                      {editingItemId
                        ? `Editando o item: ${treatment?.items?.find((i) => i.id === editingItemId)?.items?.name || ''}`
                        : items?.find((i: any) => i.id === form.watch('item'))
                            ?.name || 'Selecione um item acima'}
                    </span>
                  </div>

                  <FormField
                    control={form.control}
                    name="observations"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase text-slate-500">
                          Observações (Opcional)
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: Posição do cabo, destino da mercadoria..."
                            className="rounded-xl border-slate-200 bg-white shadow-sm focus-visible:ring-minsk-500"
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 items-end gap-4 md:grid-cols-4">
                    {/* QTD */}
                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem className="col-span-1">
                          <FormLabel className="text-xs font-bold uppercase text-slate-500">
                            Qtd.
                          </FormLabel>
                          <div className="flex h-12 items-center overflow-hidden rounded-xl border bg-white ring-minsk-500/20 transition-all focus-within:ring-2 active:scale-[0.99]">
                            <button
                              type="button"
                              onClick={() => adjustQuantity(-1)}
                              className="h-full px-3 text-slate-500 hover:bg-slate-50"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <Input
                              id="quantity-input"
                              {...field}
                              type="number"
                              className="h-full border-none p-0 text-center text-lg font-bold shadow-none focus-visible:ring-0"
                              onChange={(e) => {
                                field.onChange(e)
                                onQuantityChange(e.target.value)
                              }}
                              value={field.value ?? 1}
                            />
                            <button
                              type="button"
                              onClick={() => adjustQuantity(1)}
                              className="h-full px-3 text-slate-500 hover:bg-slate-50"
                            >
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
                            <FormLabel className="text-xs font-bold uppercase text-slate-500">
                              Desc. (%)
                            </FormLabel>
                            <FormControl>
                              <Input
                                className="h-12 rounded-xl border-slate-200 text-center text-lg font-bold text-red-500 shadow-sm"
                                type="number"
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e)
                                  onDiscountChange(e.target.value)
                                }}
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
                      <div className="col-span-2 flex h-12 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 px-2 md:col-span-1 lg:px-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            id="contract-mode"
                            checked={isContractMode}
                            onCheckedChange={setIsContractMode}
                            className="data-[state=checked]:bg-blue-600"
                          />
                          <Label
                            htmlFor="contract-mode"
                            className="cursor-pointer whitespace-nowrap text-xs font-bold text-blue-700"
                          >
                            CONTRATO
                          </Label>
                        </div>
                      </div>
                    )}

                    {/* Add/Save Button */}
                    <div className="col-span-2 flex gap-2 md:col-span-1">
                      <Button
                        type="submit"
                        disabled={!form.watch('item')}
                        className={cn(
                          'h-12 w-full rounded-xl text-base font-bold text-white shadow-lg transition-all active:scale-95',
                          editingItemId
                            ? 'bg-amber-500 shadow-amber-200 hover:bg-amber-600'
                            : 'bg-minsk-600 shadow-minsk-200 hover:bg-minsk-700',
                        )}
                      >
                        {editingItemId ? (
                          <>SALVAR</>
                        ) : (
                          <>
                            <Plus className="mr-2 h-5 w-5" />
                            ADICIONAR
                          </>
                        )}
                      </Button>

                      {editingItemId && (
                        <Button
                          type="button"
                          onClick={() => {
                            setEditingItemId(null)
                            form.reset({
                              item: '',
                              quantity: '1',
                              discount: '0',
                              observations: '',
                            })
                            setSalesValue(0)
                            setItemQuantity(1)
                            setItemDiscount(0)
                            setFinalSalesValue(0)
                            setSearchTerm('')
                            setDiscountInputDisplay('0')
                            searchInputRef.current?.focus()
                          }}
                          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-700 hover:bg-slate-300"
                          title="Cancelar edição"
                        >
                          <Minus className="h-5 w-5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </form>
              </Form>
            </div>
          </div>

          {/* RIGHT COLUMN: CART (STICKY ON DESKTOP) */}
          <div
            className={cn(
              'z-30 h-full w-full flex-col border-l border-slate-200 bg-white shadow-xl dark:bg-slate-900 md:w-[40%] lg:w-[35%] xl:w-[30%]',
              activeTab === 'cart' ? 'flex' : 'hidden md:flex',
            )}
          >
            {/* Header for Cart Desktop */}
            <div className="hidden items-center justify-between border-b bg-slate-50/50 p-4 md:flex">
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                <ShoppingCart className="h-5 w-5 text-vida-loca-600" />
                Carrinho
              </h3>
              <Badge
                variant="secondary"
                className="border-slate-200 bg-white text-slate-600"
              >
                {treatment.items?.length || 0} itens
              </Badge>
            </div>

            {/* Cart List */}
            <ScrollArea className="flex-1 bg-slate-50/30">
              <div className="space-y-3 p-4">
                {(treatment.items || []).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onCartItemSelect(item)}
                    className={cn(
                      'group relative cursor-pointer rounded-xl border bg-white p-3 shadow-sm transition-all',
                      editingItemId === item.id
                        ? 'border-amber-400 bg-amber-50/10 ring-1 ring-amber-400'
                        : 'border-slate-100 hover:border-slate-300 hover:shadow-md',
                    )}
                  >
                    <div className="mb-2 flex items-start justify-between">
                      <div className="flex max-w-[85%] items-center gap-2">
                        <div
                          className={cn(
                            'rounded-lg p-1.5',
                            item.items.isItem
                              ? 'bg-blue-50 text-blue-600'
                              : 'bg-amber-50 text-amber-600',
                          )}
                        >
                          {item.items.isItem ? (
                            <Box className="h-4 w-4" />
                          ) : (
                            <Wrench className="h-4 w-4" />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span
                            className="line-clamp-1 text-sm font-semibold text-slate-800"
                            title={item.items.name}
                          >
                            {item.items.name}
                          </span>
                          {item.observations && (
                            <span
                              className="mt-0.5 line-clamp-2 text-xs text-slate-500"
                              title={item.observations}
                            >
                              Obs: {item.observations}
                            </span>
                          )}
                        </div>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 text-slate-300 transition-colors hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover Item?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Deseja remover este item do atendimento?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onItemDelete(item.id)}
                              className="bg-red-500"
                            >
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>

                    <div className="flex items-end justify-between">
                      <div className="text-xs font-medium text-slate-500">
                        {item.quantity} x{' '}
                        {isFinanceActive
                          ? `R$ ${(item.salesValue || 0).toFixed(2)}`
                          : 'Item'}
                        {isFinanceActive && (item.discount || 0) > 0 && (
                          <span className="block font-semibold text-red-500">
                            Desc: -R$ {(item.discount || 0).toFixed(2)}
                          </span>
                        )}
                      </div>
                      {isFinanceActive && (
                        <div className="text-right">
                          <Badge
                            className={cn(
                              'pointer-events-none px-2 py-0.5 text-sm font-bold',
                              item.salesValue === 0
                                ? 'bg-green-100 text-green-700 hover:bg-green-100'
                                : 'bg-slate-900 text-white hover:bg-slate-800',
                            )}
                          >
                            {item.salesValue === 0
                              ? 'GRÁTIS'
                              : `R$ ${(item.quantity * (item.salesValue || 0) - (item.discount || 0)).toFixed(2)}`}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {treatment.items?.length === 0 && (
                  <div className="flex h-full flex-col items-center justify-center py-10 text-slate-400 opacity-60">
                    <ShoppingCart className="mb-2 h-12 w-12" />
                    <p className="text-sm">Carrinho vazio</p>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Sticky Footer Cart Actions */}
            <div className="flex-none space-y-3 border-t bg-white p-4 shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.1)]">
              {isFinanceActive && (
                <div className="flex items-end justify-between">
                  <span className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Total a Pagar
                  </span>
                  <span className="text-3xl font-bold leading-none text-vida-loca-600">
                    R$ {subtotal.toFixed(2)}
                  </span>
                </div>
              )}

              <Button
                onClick={() => setShowPayment(true)}
                disabled={treatment.items.length === 0}
                className="h-14 w-full rounded-xl bg-emerald-500 text-lg font-bold text-white shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-600 active:scale-[0.98]"
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
