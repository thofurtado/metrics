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
  X,
  Sparkles,
  Layers,
  CheckCircle2,
  FileText,
  DollarSign,
  Percent,
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
  onOpenChange?: (open: boolean) => void
}

export function TreatmentItems({ treatmentId, open, onOpenChange }: TreatmentItemsProps) {
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
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'PRODUCT' | 'SERVICE'>('ALL')
  const [discountInputDisplay, setDiscountInputDisplay] = useState('0')
  const [isContractMode, setIsContractMode] = useState(false)

  const [isCreateItemOpen, setIsCreateItemOpen] = useState(false)
  const [createItemType, setCreateItemType] = useState<'PRODUCT' | 'SERVICE'>('PRODUCT')

  function handleOpenCreateItem(type: 'PRODUCT' | 'SERVICE') {
    setCreateItemType(type)
    setIsCreateItemOpen(true)
  }

  function handleCreateItemSuccess() {
    setIsCreateItemOpen(false)
    queryClient.invalidateQueries({ queryKey: ['items-sales'] })
    toast.success('Item cadastrado com sucesso!')
  }

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
    }, 400)

    return () => {
      clearTimeout(handler)
    }
  }, [searchTerm])

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

        promises.push(
          getServices({
            query: debouncedSearchTerm,
            active: true,
            perPage: 100,
          }),
        )

        const [productsRes, servicesRes] = await Promise.all(promises)

        const products =
          productsRes.data?.products?.map((p: any) => ({
            ...p,
            type: 'PRODUCT',
            isItem: true,
            hasStock:
              !p.is_composite ||
              (p.compositions?.every((c: any) => c.supply.stock >= c.quantity) ??
                true),
          })) || []

        const services =
          servicesRes.data?.services?.map((s: any) => ({
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

  const { mutateAsync: DeleteTreatmentItem } = useMutation({
    mutationFn: deleteTreatmentItem,
  })

  const filteredItems = items
    ?.filter((item: any) => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase())
      if (!matchesSearch) return false
      if (categoryFilter === 'PRODUCT') return item.isItem
      if (categoryFilter === 'SERVICE') return !item.isItem
      return true
    }) || []

  let subtotal = 0
  let totalGross = 0
  let totalDiscount = 0
  if (treatment) {
    (treatment.items || []).forEach((item: any) => {
      const quantity = item.quantity || 0
      const value = item.salesValue || 0
      const discount = item.discount || 0
      totalGross += quantity * value
      totalDiscount += discount
      subtotal += quantity * value - discount
    })
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
          const gross = salesValue * quantity
          discountValue = gross - finalSalesValue
          if (discountValue < 0) discountValue = 0
        }
      }

      if (editingItemId) {
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
                      id: updatedItem.id,
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
      if (!item.isItem) {
        setIsContractMode(true)
      } else {
        setIsContractMode(false)
      }
    }

    const finalPrice = calculateFinalValue(newSalesValue, 1, 0)
    setFinalSalesValue(finalPrice)

    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setTimeout(() => {
      document.getElementById('quantity-input')?.focus()
    }, 100)
  }

  function onCartItemSelect(cartItem: any) {
    setEditingItemId(cartItem.id)

    form.setValue('item', cartItem.item_id)
    const currentSalesValue = cartItem.salesValue || 0
    setSalesValue(currentSalesValue)

    const qty = cartItem.quantity || 1
    setItemQuantity(qty)
    form.setValue('quantity', qty.toString())

    form.setValue('observations', cartItem.observations || '')

    const discountVal = cartItem.discount || 0
    const totalGrossItem = currentSalesValue * qty
    let discPercent = 0
    if (totalGrossItem > 0) {
      discPercent = (discountVal / totalGrossItem) * 100
    }
    setItemDiscount(discPercent)
    setDiscountInputDisplay(discPercent.toFixed(0))
    form.setValue('discount', discPercent.toFixed(0))

    const finalPrice = totalGrossItem - discountVal
    setFinalSalesValue(finalPrice)

    if (treatment && treatment.clients?.contract && currentSalesValue === 0) {
      setIsContractMode(true)
    } else {
      setIsContractMode(false)
    }

    if (window.innerWidth < 768) {
      setActiveTab('products')
    }

    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 100)
  }

  function onQuantityChange(newQuantityString: string | undefined) {
    const newQuantity = parseFloat(newQuantityString || '')
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
        className="fixed inset-0 z-50 flex h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 flex-col overflow-hidden rounded-none border-none bg-slate-950 p-0 text-slate-100 shadow-2xl focus:outline-none"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="hidden">
          <DialogTitle>PDV do Atendimento</DialogTitle>
          <DialogDescription>Gestão de peças, serviços e finalização de venda</DialogDescription>
        </DialogHeader>

        {/* TOP FULLSCREEN BAR */}
        <header className="z-30 flex flex-none items-center justify-between border-b border-slate-800 bg-slate-900/90 px-6 py-3.5 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-lg shadow-indigo-500/30">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-black tracking-tight text-white">
                  PDV & Peças do Atendimento
                </h2>
                <Badge variant="outline" className="border-indigo-500/40 bg-indigo-500/10 font-mono text-xs text-indigo-300">
                  #{treatmentId.slice(0, 8)}
                </Badge>
                {treatment.clients?.contract && (
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">
                    Cliente Mensalista
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Cliente: <span className="font-semibold text-slate-200">{treatment.clients?.name || 'Cliente'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {isFinanceActive && (
              <div className="hidden flex-col items-end sm:flex">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Total Geral
                </span>
                <span className="font-mono text-2xl font-black text-emerald-400">
                  R$ {subtotal.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </header>

        {/* MOBILE NAVIGATION TABS */}
        <div className="flex border-b border-slate-800 bg-slate-900 md:hidden">
          <button
            onClick={() => setActiveTab('products')}
            className={cn(
              'flex-1 border-b-2 py-3 text-sm font-bold transition-all',
              activeTab === 'products'
                ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200',
            )}
          >
            Catálogo ({items.length})
          </button>
          <button
            onClick={() => setActiveTab('cart')}
            className={cn(
              'flex-1 border-b-2 py-3 text-sm font-bold transition-all',
              activeTab === 'cart'
                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200',
            )}
          >
            Carrinho ({treatment.items?.length || 0}) • R$ {subtotal.toFixed(2)}
          </button>
        </div>

        {/* FULLSCREEN BODY (2-COLUMN MODERN LAYOUT) */}
        <div className="flex flex-1 overflow-hidden bg-slate-950">
          
          {/* LEFT COLUMN: CATALOG & DOCKED ADD FORM */}
          <div
            className={cn(
              'flex h-full w-full flex-col overflow-hidden md:w-[65%] lg:w-[70%] xl:w-[74%]',
              activeTab === 'products' ? 'flex' : 'hidden md:flex',
            )}
          >
            {/* Catalog Toolbar */}
            <div className="z-10 flex flex-none flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 bg-slate-900/60 p-4 backdrop-blur-md">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  ref={searchInputRef}
                  placeholder="Buscar peças, produtos ou serviços..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-11 w-full rounded-xl border-slate-800 bg-slate-950/80 pl-10 text-sm text-slate-100 placeholder:text-slate-500 shadow-inner focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950 p-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setCategoryFilter('ALL')}
                  className={cn(
                    'h-8 rounded-lg px-3 text-xs font-bold',
                    categoryFilter === 'ALL'
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200',
                  )}
                >
                  Todos
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setCategoryFilter('PRODUCT')}
                  className={cn(
                    'h-8 rounded-lg px-3 text-xs font-bold',
                    categoryFilter === 'PRODUCT'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200',
                  )}
                >
                  Produtos
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setCategoryFilter('SERVICE')}
                  className={cn(
                    'h-8 rounded-lg px-3 text-xs font-bold',
                    categoryFilter === 'SERVICE'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200',
                  )}
                >
                  Serviços
                </Button>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    className="h-11 gap-2 rounded-xl bg-indigo-600 font-bold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Cadastrar Item</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 border-slate-800 bg-slate-900 text-slate-100">
                  <DropdownMenuItem
                    onClick={() => handleOpenCreateItem('PRODUCT')}
                    className="cursor-pointer hover:bg-slate-800"
                  >
                    <Box className="mr-2 h-4 w-4 text-blue-400" />
                    Novo Produto
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleOpenCreateItem('SERVICE')}
                    className="cursor-pointer hover:bg-slate-800"
                  >
                    <Wrench className="mr-2 h-4 w-4 text-amber-400" />
                    Novo Serviço
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Dialog open={isCreateItemOpen} onOpenChange={setIsCreateItemOpen}>
                <ProductItemDialog
                  initialType={createItemType}
                  onSuccess={handleCreateItemSuccess}
                />
              </Dialog>
            </div>

            {/* Catalog Grid Scroll Area */}
            <ScrollArea className="flex-1 p-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {isItemsLoading ? (
                  Array.from({ length: 15 }).map((_, i) => (
                    <Skeleton key={i} className="h-32 w-full rounded-2xl bg-slate-900" />
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
                            'group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 transition-all duration-200 hover:border-indigo-500/60 hover:bg-slate-900 hover:shadow-lg hover:shadow-indigo-500/10 active:scale-[0.98]',
                            isSelected && 'border-indigo-500 bg-indigo-950/30 ring-2 ring-indigo-500/60',
                            !hasStock && 'opacity-60 grayscale-[0.6]',
                          )}
                        >
                          <CardContent className="flex h-full flex-col justify-between p-3.5">
                            <div>
                              <div className="mb-2 flex items-center justify-between">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'h-5 border-0 px-2 py-0 text-[10px] font-black uppercase tracking-wider',
                                    item.isItem
                                      ? 'bg-blue-500/15 text-blue-400'
                                      : 'bg-amber-500/15 text-amber-400',
                                  )}
                                >
                                  {item.isItem ? 'Produto' : 'Serviço'}
                                </Badge>
                                {!hasStock && isStockActive && (
                                  <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[9px] font-bold text-rose-400">
                                    Sem Estoque
                                  </span>
                                )}
                              </div>
                              <h3
                                className="line-clamp-2 text-sm font-bold text-slate-100 group-hover:text-white"
                                title={item.name}
                              >
                                {item.name}
                              </h3>
                            </div>

                            {isFinanceActive && (
                              <div className="mt-3 border-t border-slate-800/80 pt-2">
                                <span className="text-[10px] font-medium uppercase text-slate-500">
                                  Valor Unitário
                                </span>
                                <p className="font-mono text-base font-black text-emerald-400">
                                  R$ {Number(item.price || 0).toFixed(2)}
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )
                    })}

                    {filteredItems.length === 0 && (
                      <div className="col-span-full flex flex-col items-center justify-center py-16 text-slate-500">
                        <Search className="mb-3 h-10 w-10 opacity-30" />
                        <p className="text-sm font-medium">Nenhum item encontrado.</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </ScrollArea>

            {/* DOCKED BOTTOM FORM BAR */}
            <div className="z-20 flex-none border-t border-slate-800 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-xl">
              <Form {...form}>
                <form
                  ref={formRef}
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="mx-auto flex flex-col gap-3"
                >
                  {/* Selected Item Notification Banner */}
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5">
                    <div className="flex items-center gap-2.5 truncate">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
                        <Box className="h-4 w-4" />
                      </div>
                      <span className="truncate text-sm font-bold text-slate-200">
                        {editingItemId
                          ? 'Editando Item: ' + (treatment?.items?.find((i) => i.id === editingItemId)?.items?.name || '')
                          : (items?.find((i: any) => i.id === form.watch('item'))?.name || 'Selecione um produto ou serviço acima para adicionar')}
                      </span>
                    </div>

                    {form.watch('item') && (
                      <span className="shrink-0 font-mono text-xs font-bold text-slate-400">
                        Unit: R$ {salesValue.toFixed(2)}
                      </span>
                    )}
                  </div>

                  {/* Form Inputs Grid */}
                  <div className="grid grid-cols-2 items-end gap-3 sm:grid-cols-12">
                    {/* Observations */}
                    <div className="col-span-2 sm:col-span-4">
                      <FormField
                        control={form.control}
                        name="observations"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                              Observações / Detalhes
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Ex: Substituição na garantia, n° série..."
                                className="h-11 rounded-xl border-slate-800 bg-slate-950 text-sm text-slate-100 focus:border-indigo-500"
                                {...field}
                                value={field.value || ''}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Quantity Stepper */}
                    <div className="col-span-1 sm:col-span-3">
                      <FormField
                        control={form.control}
                        name="quantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                              Quantidade
                            </FormLabel>
                            <div className="flex h-11 items-center overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
                              <button
                                type="button"
                                onClick={() => adjustQuantity(-1)}
                                className="flex h-full w-10 items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-white"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <Input
                                id="quantity-input"
                                {...field}
                                type="number"
                                className="h-full border-none bg-transparent p-0 text-center font-mono text-base font-bold text-white focus-visible:ring-0"
                                onChange={(e) => {
                                  field.onChange(e)
                                  onQuantityChange(e.target.value)
                                }}
                                value={field.value ?? 1}
                              />
                              <button
                                type="button"
                                onClick={() => adjustQuantity(1)}
                                className="flex h-full w-10 items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-white"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Discount % */}
                    {isFinanceActive && (
                      <div className="col-span-1 sm:col-span-2">
                        <FormField
                          control={form.control}
                          name="discount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                Desconto (%)
                              </FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    className="h-11 rounded-xl border-slate-800 bg-slate-950 pr-8 text-center font-mono text-base font-bold text-rose-400 focus:border-rose-500"
                                    type="number"
                                    {...field}
                                    onChange={(e) => {
                                      field.onChange(e)
                                      onDiscountChange(e.target.value)
                                    }}
                                    value={discountInputDisplay}
                                  />
                                  <Percent className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                                </div>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {/* Add/Save Button */}
                    <div className="col-span-2 sm:col-span-3 flex gap-2">
                      <Button
                        type="submit"
                        disabled={!form.watch('item')}
                        className={cn(
                          'h-11 flex-1 rounded-xl text-sm font-bold text-white shadow-lg transition-all active:scale-[0.98]',
                          editingItemId
                            ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'
                            : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20',
                        )}
                      >
                        {editingItemId ? (
                          'SALVAR ALTERAÇÃO'
                        ) : (
                          <>
                            <Plus className="mr-1.5 h-4 w-4" />
                            ADICIONAR ITEM
                          </>
                        )}
                      </Button>

                      {editingItemId && (
                        <Button
                          type="button"
                          variant="outline"
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
                          className="h-11 border-slate-800 bg-slate-900 px-3 text-slate-400 hover:text-white"
                          title="Cancelar edição"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </form>
              </Form>
            </div>
          </div>

          {/* RIGHT COLUMN: CART & SALE SUMMARY */}
          <div
            className={cn(
              'z-20 flex h-full w-full flex-col border-l border-slate-800 bg-slate-900 shadow-2xl md:w-[35%] lg:w-[30%] xl:w-[26%]',
              activeTab === 'cart' ? 'flex' : 'hidden md:flex',
            )}
          >
            {/* Cart Header */}
            <div className="flex flex-none items-center justify-between border-b border-slate-800 bg-slate-950/60 p-4">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Carrinho da O.S.</h3>
              </div>
              <Badge variant="secondary" className="border-slate-800 bg-slate-800 font-mono text-xs text-slate-300">
                {treatment.items?.length || 0} {treatment.items?.length === 1 ? 'item' : 'itens'}
              </Badge>
            </div>

            {/* Cart Items List */}
            <ScrollArea className="flex-1 p-3">
              <div className="space-y-2.5">
                {(treatment.items || []).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onCartItemSelect(item)}
                    className={cn(
                      'group relative cursor-pointer rounded-xl border p-3 transition-all duration-200',
                      editingItemId === item.id
                        ? 'border-amber-500/80 bg-amber-950/20 ring-1 ring-amber-500'
                        : 'border-slate-800 bg-slate-950/70 hover:border-slate-700 hover:bg-slate-950',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 truncate">
                        <div
                          className={cn(
                            'mt-0.5 rounded-lg p-1.5 text-xs',
                            item.items.isItem
                              ? 'bg-blue-500/15 text-blue-400'
                              : 'bg-amber-500/15 text-amber-400',
                          )}
                        >
                          {item.items.isItem ? <Box className="h-3.5 w-3.5" /> : <Wrench className="h-3.5 w-3.5" />}
                        </div>
                        <div className="flex flex-col truncate">
                          <span className="truncate text-sm font-bold text-slate-100" title={item.items.name}>
                            {item.items.name}
                          </span>
                          {item.observations && (
                            <span className="truncate text-xs text-slate-500" title={item.observations}>
                              Obs: {item.observations}
                            </span>
                          )}
                        </div>
                      </div>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 text-slate-500 transition-colors hover:text-rose-400"
                            title="Remover item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="border-slate-800 bg-slate-900 text-slate-100">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover Item do Atendimento?</AlertDialogTitle>
                            <AlertDialogDescription className="text-slate-400">
                              Deseja excluir "{item.items.name}" desta ordem de serviço?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="border-slate-700 bg-slate-800 hover:bg-slate-700">Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onItemDelete(item.id)}
                              className="bg-rose-600 hover:bg-rose-500 text-white"
                            >
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>

                    <div className="mt-2.5 flex items-end justify-between border-t border-slate-900 pt-2">
                      <div className="text-xs text-slate-400 font-mono">
                        {item.quantity}x R$ {Number(item.salesValue || 0).toFixed(2)}
                        {Number(item.discount || 0) > 0 && (
                          <span className="block text-[11px] font-semibold text-rose-400">
                            Desc: -R$ {Number(item.discount || 0).toFixed(2)}
                          </span>
                        )}
                      </div>

                      <div className="font-mono text-sm font-black text-emerald-400">
                        {Number(item.salesValue || 0) === 0 ? (
                          <span className="text-xs text-blue-400 font-bold">CONTRATO</span>
                        ) : (
                          'R$ ' + (Number(item.quantity || 1) * Number(item.salesValue || 0) - Number(item.discount || 0)).toFixed(2)
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {treatment.items?.length === 0 && (
                  <div className="flex h-48 flex-col items-center justify-center text-center text-slate-500">
                    <ShoppingCart className="mb-2 h-10 w-10 opacity-30" />
                    <p className="text-sm font-medium">Carrinho vazio</p>
                    <p className="text-xs text-slate-600">Selecione itens no catálogo ao lado.</p>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Cart Sticky Breakdown & Checkout */}
            <div className="flex-none space-y-3 border-t border-slate-800 bg-slate-950 p-4 shadow-2xl">
              {isFinanceActive && (
                <div className="space-y-1.5 rounded-xl border border-slate-800/80 bg-slate-900/60 p-3 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Subtotal Bruto:</span>
                    <span className="font-mono">R$ {totalGross.toFixed(2)}</span>
                  </div>
                  {totalDiscount > 0 && (
                    <div className="flex items-center justify-between text-rose-400 font-medium">
                      <span>Descontos Aplicados:</span>
                      <span className="font-mono">-R$ {totalDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-800 pt-1.5 flex items-center justify-between text-sm font-black text-white">
                    <span>Total a Pagar:</span>
                    <span className="font-mono text-lg text-emerald-400">
                      R$ {subtotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <Button
                onClick={() => setShowPayment(true)}
                disabled={treatment.items.length === 0}
                className="h-14 w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 font-bold text-white shadow-xl shadow-emerald-600/25 transition-all hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98]"
              >
                <CreditCard className="mr-2 h-5 w-5" />
                {isFinanceActive ? 'FINALIZAR VENDA (PAGAMENTO)' : 'CONCLUIR ATENDIMENTO'}
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
              if (onOpenChange) {
                onOpenChange(false)
              }
            }}
          />
        )}
      </DialogContent>
    </ErrorBoundary>
  )
}
