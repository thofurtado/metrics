import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Banknote,
  Box,
  Check,
  CheckCircle2,
  CreditCard,
  Minus,
  Package,
  Percent,
  Plus,
  QrCode,
  Search,
  ShoppingCart,
  Trash2,
  User,
  Wallet,
  Wrench,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'

import { createTreatmentItem } from '@/api/create-treatment-item'
import { deleteTreatmentItem } from '@/api/delete-treatment-item'
import { finishTreatment } from '@/api/finish-treatment'
import { getPayments, Payment } from '@/api/get-payments'
import { getProducts } from '@/api/get-products'
import { getServices } from '@/api/get-services'
import { getTreatmentDetails } from '@/api/get-treatment-details'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useModules } from '@/context/module-context'
import { cn } from '@/lib/utils'

import { ProductItemDialog } from '../items/product-item-dialog'

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
      id?: string
      name: string
      isItem: boolean
    }
  }[]
  clients: {
    name: string
    contract: boolean
  }
}

interface PaymentMethodItem {
  id: string
  paymentId: string
  amount: number
  installments: number
  date?: string
  isPaid: boolean
  description: string
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

const formatBRL = (val: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(val || 0)
}

export function TreatmentItems({
  treatmentId,
  open,
  onOpenChange,
}: TreatmentItemsProps) {
  const { isModuleActive } = useModules()
  const isFinanceActive = isModuleActive('financial')
  const isStockActive = isModuleActive('merchandise')
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  // View steps: 'catalog' (items/cart) vs 'payment'
  const [currentStep, setCurrentStep] = useState<'catalog' | 'payment'>('catalog')

  // Mobile tab in catalog view
  const [mobileTab, setMobileTab] = useState<'products' | 'cart'>('products')

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'PRODUCT' | 'SERVICE'>('ALL')

  // Customizer state
  const [salesValue, setSalesValue] = useState(0)
  const [itemQuantity, setItemQuantity] = useState(1)
  const [itemDiscount, setItemDiscount] = useState(0)
  const [finalSalesValue, setFinalSalesValue] = useState(0)
  const [discountInputDisplay, setDiscountInputDisplay] = useState('0')
  const [isContractMode, setIsContractMode] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)

  // Fast registration dialog for products/services
  const [isCreateItemOpen, setIsCreateItemOpen] = useState(false)
  const [createItemType, setCreateItemType] = useState<'PRODUCT' | 'SERVICE'>('PRODUCT')

  // Payment step state
  const [paymentMethodsData, setPaymentMethodsData] = useState<PaymentMethodItem[]>([])
  const [currentPayment, setCurrentPayment] = useState<{
    paymentId: string
    amount: string
    installments: number
    date: string
    isPaid: boolean
    description: string
  }>({
    paymentId: '',
    amount: '',
    installments: 1,
    date: new Date().toISOString().split('T')[0],
    isPaid: true,
    description: '',
  })
  const [changeAlert, setChangeAlert] = useState<number | null>(null)
  const [isFinishing, setIsFinishing] = useState(false)

  const formRef = useRef<HTMLFormElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const paymentAmountInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      item: '',
      quantity: '1',
      discount: '0',
      observations: '',
    },
  })

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)
    return () => clearTimeout(handler)
  }, [searchTerm])

  // Fetch Treatment Details
  const { data: treatment, refetch: itemRefetch } = useQuery<TreatmentDetails>({
    queryKey: ['treatment', treatmentId],
    queryFn: async () => {
      const data = await getTreatmentDetails({ treatmentId })
      return data as unknown as TreatmentDetails
    },
    enabled: open,
  })

  // Fetch Payment Methods
  const { data: availablePayments = [] } = useQuery<Payment[]>({
    queryKey: ['payments'],
    queryFn: getPayments,
    enabled: open,
  })

  // Fetch Products & Services Catalog
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
              (p.compositions?.every((c: any) => (c.supply?.stock ?? 0) >= c.quantity) ??
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
    enabled: open,
  })

  // Mutations
  const { mutateAsync: mutateTreatmentItem } = useMutation({
    mutationFn: createTreatmentItem,
  })

  const { mutateAsync: mutateDeleteTreatmentItem } = useMutation({
    mutationFn: deleteTreatmentItem,
  })

  // Calculations for items and totals
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

  // Payment Calculations
  const totalPaid = paymentMethodsData.reduce((acc, item) => acc + item.amount, 0)
  const remainingAmount = Math.max(0, subtotal - totalPaid)
  const isFullyPaid = remainingAmount < 0.01
  const progressPercentage =
    subtotal > 0 ? Math.min(100, Math.round((totalPaid / subtotal) * 100)) : 100

  // Update default payment amount and description when switching to payment step
  useEffect(() => {
    if (currentStep === 'payment') {
      const defaultDesc = treatment
        ? `O.S. #${treatmentId.slice(0, 8)} - ${treatment?.clients?.name || 'Cliente'}`
        : `O.S. #${treatmentId.slice(0, 8)}`

      setCurrentPayment((prev) => ({
        ...prev,
        amount: remainingAmount > 0 ? remainingAmount.toFixed(2) : '',
        description: defaultDesc,
      }))
    }
  }, [currentStep, remainingAmount, treatment, treatmentId])

  function calculateFinalValue(baseValue: number, quantity: number, discount: number) {
    const totalBeforeDiscount = baseValue * quantity
    const discountAmount = totalBeforeDiscount * (discount / 100)
    const finalPrice = totalBeforeDiscount - discountAmount
    return finalPrice > 0 ? finalPrice : 0
  }

  // Fast 1-click Quick Add item to cart
  async function handleQuickAdd(item: any, e?: React.MouseEvent) {
    if (e) e.stopPropagation()
    try {
      let unitPrice = item.price || 0
      let discountVal = 0

      if (treatment?.clients?.contract && !item.isItem) {
        discountVal = unitPrice
      }

      await mutateTreatmentItem({
        treatmentId,
        itemId: item.id,
        quantity: 1,
        salesValue: unitPrice,
        discount: discountVal,
        observations: undefined,
      })

      await itemRefetch()
      toast.success(`"${item.name}" adicionado ao carrinho!`)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao adicionar item')
    }
  }

  // Increment or Decrement quantity directly in Cart
  async function handleCartQuantityChange(cartItem: any, delta: number) {
    try {
      const newQuantity = (cartItem.quantity || 1) + delta
      if (newQuantity <= 0) {
        await mutateDeleteTreatmentItem({ treatmentItemId: cartItem.id })
        await itemRefetch()
        toast.info('Item removido do carrinho')
        return
      }

      const unitSalesValue = cartItem.salesValue || 0
      let newDiscount = 0
      if (cartItem.discount && cartItem.quantity > 0) {
        const singleDiscount = cartItem.discount / cartItem.quantity
        newDiscount = singleDiscount * newQuantity
      }

      await mutateDeleteTreatmentItem({ treatmentItemId: cartItem.id })
      await mutateTreatmentItem({
        treatmentId,
        itemId: cartItem.item_id,
        quantity: newQuantity,
        salesValue: unitSalesValue,
        discount: newDiscount,
        observations: cartItem.observations,
      })

      await itemRefetch()
    } catch (error) {
      toast.error('Erro ao atualizar quantidade do item')
    }
  }

  // Remove item from cart
  async function handleCartItemDelete(id: string) {
    try {
      await mutateDeleteTreatmentItem({ treatmentItemId: id })
      await itemRefetch()
      toast.success('Item removido')
      if (editingItemId === id) {
        resetCustomizer()
      }
    } catch (error) {
      toast.error('Erro ao remover item')
    }
  }

  function resetCustomizer() {
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
    setDiscountInputDisplay('0')
    searchInputRef.current?.focus()
  }

  // Select item from catalog into customizer bar
  function onItemSelect(item: any) {
    setEditingItemId(null)
    form.setValue('item', item.id)
    const newSalesValue = item.price || 0
    setSalesValue(newSalesValue)
    setItemQuantity(1)
    form.setValue('quantity', '1')
    form.setValue('observations', '')
    setItemDiscount(0)
    setDiscountInputDisplay('0')
    form.setValue('discount', '0')

    if (treatment?.clients?.contract && !item.isItem) {
      setIsContractMode(true)
    } else {
      setIsContractMode(false)
    }

    const finalPrice = calculateFinalValue(newSalesValue, 1, 0)
    setFinalSalesValue(finalPrice)

    setTimeout(() => {
      document.getElementById('customizer-qty-input')?.focus()
    }, 100)
  }

  // Select item from cart to edit in customizer bar
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

    if (treatment?.clients?.contract && currentSalesValue === 0) {
      setIsContractMode(true)
    } else {
      setIsContractMode(false)
    }

    if (window.innerWidth < 768) {
      setMobileTab('products')
    }
  }

  function adjustQuantity(amount: number) {
    const newQuantity = Math.max(1, itemQuantity + amount)
    setItemQuantity(newQuantity)
    form.setValue('quantity', newQuantity.toString())
    const finalPrice = calculateFinalValue(salesValue, newQuantity, itemDiscount)
    setFinalSalesValue(finalPrice)
  }

  function onDiscountChange(newDiscountString: string | undefined) {
    setDiscountInputDisplay(newDiscountString ?? '')
    const newDiscount = parseFloat(newDiscountString || '') || 0
    const clampedDiscount = Math.max(0, Math.min(100, newDiscount))
    setItemDiscount(clampedDiscount)
    form.setValue('discount', newDiscountString ?? '0')
    const finalPrice = calculateFinalValue(salesValue, itemQuantity, clampedDiscount)
    setFinalSalesValue(finalPrice)
  }

  // Submit customizer form (Add or Edit)
  async function onSubmitCustomizer(data: FormSchemaType) {
    try {
      const quantity = data.quantity ? parseFloat(data.quantity) : 1
      let unitSalesValue = salesValue
      let discountValue = 0

      if (isFinanceActive) {
        if (isContractMode) {
          discountValue = salesValue * quantity
        } else {
          const gross = salesValue * quantity
          discountValue = gross - finalSalesValue
          if (discountValue < 0) discountValue = 0
        }
      }

      if (editingItemId) {
        await mutateDeleteTreatmentItem({ treatmentItemId: editingItemId })
        await mutateTreatmentItem({
          treatmentId,
          itemId: data.item,
          quantity,
          salesValue: unitSalesValue,
          discount: discountValue,
          observations: data.observations || undefined,
        })
        toast.success('Item atualizado com sucesso!')
      } else {
        await mutateTreatmentItem({
          treatmentId,
          itemId: data.item,
          quantity,
          salesValue: unitSalesValue,
          discount: discountValue,
          observations: data.observations || undefined,
        })
        toast.success('Item adicionado ao carrinho!')
      }

      await itemRefetch()
      resetCustomizer()
      if (window.innerWidth < 768) {
        setMobileTab('cart')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao processar item')
    }
  }

  // Payment registration
  const selectedPaymentMethodObj = availablePayments.find(
    (p) => p.id === currentPayment.paymentId,
  )
  const isCreditCard =
    selectedPaymentMethodObj?.name?.toLowerCase().includes('crÃ©dito') || false
  const maxInstallments = selectedPaymentMethodObj?.installment_limit || 1

  function handleAddPayment() {
    const inputAmount = parseFloat(currentPayment.amount)
    setChangeAlert(null)

    if (!currentPayment.paymentId) {
      toast.error('Selecione uma forma de pagamento.')
      return
    }
    if (isNaN(inputAmount) || inputAmount <= 0) {
      toast.error('Informe um valor vÃ¡lido.')
      return
    }

    let amountToRegister = inputAmount
    let changeToReturn = 0

    if (inputAmount > remainingAmount + 0.01) {
      changeToReturn = inputAmount - remainingAmount
      amountToRegister = remainingAmount
      setChangeAlert(changeToReturn)
    }

    const newItem: PaymentMethodItem = {
      id: crypto.randomUUID(),
      paymentId: currentPayment.paymentId,
      amount: amountToRegister,
      installments: isCreditCard ? currentPayment.installments : 1,
      date: currentPayment.date,
      isPaid: currentPayment.isPaid,
      description: currentPayment.description,
    }

    setPaymentMethodsData([...paymentMethodsData, newItem])

    const newRemaining = Math.max(0, remainingAmount - amountToRegister)
    setCurrentPayment((prev) => ({
      ...prev,
      paymentId: '',
      amount: newRemaining > 0 ? newRemaining.toFixed(2) : '',
      installments: 1,
    }))
  }

  function handleRemovePayment(id: string) {
    setPaymentMethodsData((prev) => prev.filter((item) => item.id !== id))
    setChangeAlert(null)
  }

  async function handleFinishSale() {
    if (isFinanceActive && remainingAmount > 0.01) {
      toast.error('Ainda resta valor a pagar. Registre os pagamentos.')
      return
    }

    setIsFinishing(true)
    try {
      const payloadPayments = paymentMethodsData.map((method) => ({
        payment_id: method.paymentId,
        amount: method.amount,
        occurrences: method.installments || 1,
        date: method.date ? `${method.date}T12:00:00.000Z` : undefined,
        is_paid: method.isPaid,
        description: method.description,
      }))

      await finishTreatment({
        treatmentId,
        payments: payloadPayments,
      })

      toast.success('Atendimento finalizado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['treatments'] })
      if (onOpenChange) {
        onOpenChange(false)
      }
      navigate('/treatments')
    } catch (error) {
      toast.error('Erro ao finalizar atendimento. Verifique os dados.')
    } finally {
      setIsFinishing(false)
    }
  }

  const filteredItems =
    items?.filter((item: any) => {
      const matchesSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase())
      if (!matchesSearch) return false
      if (categoryFilter === 'PRODUCT') return item.isItem
      if (categoryFilter === 'SERVICE') return !item.isItem
      return true
    }) || []

  if (!treatment) return null

  return (
    <DialogContent
      className="fixed inset-0 z-[9999] flex h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 flex-col overflow-hidden rounded-none border-none bg-slate-950 p-0 text-slate-100 shadow-2xl focus:outline-none"
      onOpenAutoFocus={(e) => e.preventDefault()}
      onPointerDownOutside={(e) => e.preventDefault()}
      onInteractOutside={(e) => e.preventDefault()}
    >
      <DialogHeader className="hidden">
        <DialogTitle>PDV do Atendimento</DialogTitle>
        <DialogDescription>GestÃ£o de itens, serviÃ§os e finalizaÃ§Ã£o de pagamento</DialogDescription>
      </DialogHeader>

      {/* TOPBAR HEADER */}
      <header className="z-30 flex flex-none items-center justify-between border-b border-slate-800/80 bg-slate-900/95 px-6 py-3.5 backdrop-blur-xl shadow-md">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-lg shadow-indigo-500/25">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-black tracking-tight text-white sm:text-lg">
                PDV & PeÃ§as da O.S.
              </h2>
              <Badge variant="outline" className="border-indigo-500/40 bg-indigo-500/10 font-mono text-xs text-indigo-300">
                #{treatmentId.slice(0, 8)}
              </Badge>
              {treatment.clients?.contract && (
                <Badge className="border-emerald-500/30 bg-emerald-500/15 text-emerald-400 text-xs font-bold">
                  Cliente Contrato / Mensalista
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <User className="h-3.5 w-3.5 text-slate-500" />
              <span>Cliente:</span>
              <span className="font-semibold text-slate-200">
                {treatment.clients?.name || 'Consumidor Final'}
              </span>
            </div>
          </div>
        </div>

        {/* STEP SWITCHER & CLOSE */}
        <div className="flex items-center gap-4">
          {/* Navigation Steps */}
          <div className="hidden sm:flex items-center rounded-xl border border-slate-800 bg-slate-950 p-1">
            <button
              onClick={() => setCurrentStep('catalog')}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all',
                currentStep === 'catalog'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200',
              )}
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              1. PeÃ§as & ServiÃ§os
              <span className="ml-1 rounded-full bg-slate-900/60 px-1.5 py-0.2 text-[10px]">
                {treatment.items?.length || 0}
              </span>
            </button>
            <button
              onClick={() => {
                if (treatment.items?.length > 0) setCurrentStep('payment')
                else toast.info('Adicione itens ao carrinho antes de prosseguir.')
              }}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all',
                currentStep === 'payment'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200',
              )}
            >
              <CreditCard className="h-3.5 w-3.5" />
              2. Pagamento & Fechamento
            </button>
          </div>

          {/* Total Value Pill */}
          {isFinanceActive && (
            <div className="hidden md:flex flex-col items-end border-l border-slate-800 pl-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Total Geral
              </span>
              <span className="font-mono text-xl font-black text-emerald-400">
                {formatBRL(subtotal)}
              </span>
            </div>
          )}

          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange?.(false)}
            className="h-10 w-10 rounded-xl border border-slate-800 bg-slate-950/80 text-slate-400 hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/40"
            title="Fechar Janela (ESC)"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* VIEW 1: CATALOG & CART */}
      {currentStep === 'catalog' && (
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Mobile Tab Switcher */}
          <div className="flex border-b border-slate-800 bg-slate-900 md:hidden">
            <button
              onClick={() => setMobileTab('products')}
              className={cn(
                'flex-1 border-b-2 py-3 text-xs font-bold transition-all',
                mobileTab === 'products'
                  ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                  : 'border-transparent text-slate-400',
              )}
            >
              CatÃ¡logo ({filteredItems.length})
            </button>
            <button
              onClick={() => setMobileTab('cart')}
              className={cn(
                'flex-1 border-b-2 py-3 text-xs font-bold transition-all',
                mobileTab === 'cart'
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                  : 'border-transparent text-slate-400',
              )}
            >
              Carrinho ({treatment.items?.length || 0}) â€¢ {formatBRL(subtotal)}
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden bg-slate-950">
            {/* LEFT COLUMN: CATALOG & DOCKED CUSTOMIZER */}
            <div
              className={cn(
                'flex h-full w-full flex-col overflow-hidden md:w-[62%] lg:w-[67%] xl:w-[72%]',
                mobileTab === 'products' ? 'flex' : 'hidden md:flex',
              )}
            >
              {/* Catalog Search & Filter Toolbar */}
              <div className="z-10 flex flex-none flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 bg-slate-900/60 p-3.5 backdrop-blur-md">
                <div className="relative min-w-[220px] flex-1">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Buscar por cÃ³digo, nome de peÃ§a, produto ou serviÃ§o..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-10 w-full rounded-xl border-slate-800 bg-slate-950/90 pl-10 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950 p-1">
                  <button
                    onClick={() => setCategoryFilter('ALL')}
                    className={cn(
                      'rounded-lg px-3 py-1 text-xs font-bold transition-all',
                      categoryFilter === 'ALL'
                        ? 'bg-slate-800 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200',
                    )}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setCategoryFilter('PRODUCT')}
                    className={cn(
                      'rounded-lg px-3 py-1 text-xs font-bold transition-all',
                      categoryFilter === 'PRODUCT'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200',
                    )}
                  >
                    Produtos
                  </button>
                  <button
                    onClick={() => setCategoryFilter('SERVICE')}
                    className={cn(
                      'rounded-lg px-3 py-1 text-xs font-bold transition-all',
                      categoryFilter === 'SERVICE'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200',
                    )}
                  >
                    ServiÃ§os
                  </button>
                </div>

                {/* Quick Item Creation */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="h-10 gap-1.5 rounded-xl bg-indigo-600 font-bold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500">
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">Cadastrar Item</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 border-slate-800 bg-slate-900 text-slate-100">
                    <DropdownMenuItem
                      onClick={() => {
                        setCreateItemType('PRODUCT')
                        setIsCreateItemOpen(true)
                      }}
                      className="cursor-pointer hover:bg-slate-800"
                    >
                      <Box className="mr-2 h-4 w-4 text-blue-400" />
                      Novo Produto
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setCreateItemType('SERVICE')
                        setIsCreateItemOpen(true)
                      }}
                      className="cursor-pointer hover:bg-slate-800"
                    >
                      <Wrench className="mr-2 h-4 w-4 text-amber-400" />
                      Novo ServiÃ§o
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Dialog open={isCreateItemOpen} onOpenChange={setIsCreateItemOpen}>
                  <ProductItemDialog
                    initialType={createItemType}
                    onSuccess={() => {
                      setIsCreateItemOpen(false)
                      queryClient.invalidateQueries({ queryKey: ['items-sales'] })
                      toast.success('Item cadastrado com sucesso!')
                    }}
                  />
                </Dialog>
              </div>

              {/* Catalog Items Grid (Clean, Readable, Generous Cards) */}
              <ScrollArea className="flex-1 p-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
                  {isItemsLoading ? (
                    Array.from({ length: 9 }).map((_, i) => (
                      <Skeleton key={i} className="h-28 w-full rounded-2xl bg-slate-900" />
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
                              'group relative cursor-pointer overflow-hidden rounded-2xl border transition-all duration-200 hover:shadow-xl hover:shadow-indigo-500/10 active:scale-[0.99]',
                              isSelected
                                ? 'border-indigo-500 bg-indigo-950/40 ring-2 ring-indigo-500'
                                : 'border-slate-800/80 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900',
                              !hasStock && 'opacity-65',
                            )}
                          >
                            <CardContent className="flex flex-col justify-between p-3.5">
                              <div>
                                <div className="mb-2 flex items-center justify-between gap-2">
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      'h-5 border-0 px-2 py-0 text-[10px] font-black uppercase tracking-wider',
                                      item.isItem
                                        ? 'bg-blue-500/15 text-blue-400'
                                        : 'bg-amber-500/15 text-amber-400',
                                    )}
                                  >
                                    {item.isItem ? 'Produto' : 'ServiÃ§o'}
                                  </Badge>

                                  {!hasStock && isStockActive && (
                                    <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[9px] font-bold text-rose-400">
                                      Sem Estoque
                                    </span>
                                  )}
                                </div>

                                <h3
                                  className="line-clamp-2 text-sm font-bold leading-tight text-slate-100 group-hover:text-white"
                                  title={item.name}
                                >
                                  {item.name}
                                </h3>
                              </div>

                              <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-2.5">
                                <div>
                                  <span className="text-[10px] font-semibold uppercase text-slate-500">
                                    Valor UnitÃ¡rio
                                  </span>
                                  <p className="font-mono text-base font-black text-emerald-400">
                                    {formatBRL(item.price || 0)}
                                  </p>
                                </div>

                                {/* 1-Click Fast Add Button */}
                                <Button
                                  size="sm"
                                  onClick={(e) => handleQuickAdd(item, e)}
                                  className="h-8 gap-1 rounded-xl bg-indigo-600/90 px-3 text-xs font-bold text-white shadow-md hover:bg-indigo-500 active:scale-95"
                                  title="Adicionar 1 unidade direto ao carrinho"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  <span>Adicionar</span>
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}

                      {filteredItems.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-500">
                          <Search className="mb-3 h-10 w-10 opacity-30" />
                          <p className="text-sm font-bold text-slate-400">Nenhum item encontrado</p>
                          <p className="text-xs text-slate-500">Tente buscar por outro termo ou cadastre um novo item.</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </ScrollArea>

              {/* DOCKED BOTTOM CUSTOMIZER BAR */}
              <div className="z-20 flex-none border-t border-slate-800 bg-slate-900/95 p-3.5 shadow-2xl backdrop-blur-xl">
                <Form {...form}>
                  <form
                    ref={formRef}
                    onSubmit={form.handleSubmit(onSubmitCustomizer)}
                    className="mx-auto flex flex-col gap-2.5"
                  >
                    {/* Selected Item Notification Header */}
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2">
                      <div className="flex items-center gap-2.5 truncate">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
                          <Box className="h-4 w-4" />
                        </div>
                        <span className="truncate text-xs font-bold text-slate-200 sm:text-sm">
                          {editingItemId
                            ? `Editando Item do Carrinho: ${treatment?.items?.find((i) => i.id === editingItemId)?.items?.name || ''}`
                            : items?.find((i: any) => i.id === form.watch('item'))?.name ||
                              'Selecione um item no catÃ¡logo acima ou clique em "+ Adicionar"'}
                        </span>
                      </div>

                      {form.watch('item') && (
                        <span className="shrink-0 font-mono text-xs font-bold text-emerald-400">
                          Unit: {formatBRL(salesValue)}
                        </span>
                      )}
                    </div>

                    {/* Inputs Row */}
                    <div className="grid grid-cols-2 items-end gap-2.5 sm:grid-cols-12">
                      {/* Observations */}
                      <div className="col-span-2 sm:col-span-4">
                        <FormField
                          control={form.control}
                          name="observations"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                ObservaÃ§Ãµes / Detalhes
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Ex: Troca na garantia, nÂ° sÃ©rie..."
                                  className="h-10 rounded-xl border-slate-800 bg-slate-950 text-xs text-slate-100 focus:border-indigo-500"
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
                              <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Quantidade
                              </FormLabel>
                              <div className="flex h-10 items-center overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
                                <button
                                  type="button"
                                  onClick={() => adjustQuantity(-1)}
                                  className="flex h-full w-9 items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-white"
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </button>
                                <Input
                                  id="customizer-qty-input"
                                  {...field}
                                  type="number"
                                  className="h-full border-none bg-transparent p-0 text-center font-mono text-sm font-bold text-white focus-visible:ring-0"
                                  onChange={(e) => {
                                    field.onChange(e)
                                    const q = parseFloat(e.target.value) || 1
                                    setItemQuantity(q)
                                    setFinalSalesValue(calculateFinalValue(salesValue, q, itemDiscount))
                                  }}
                                  value={field.value ?? 1}
                                />
                                <button
                                  type="button"
                                  onClick={() => adjustQuantity(1)}
                                  className="flex h-full w-9 items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-white"
                                >
                                  <Plus className="h-3.5 w-3.5" />
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
                                <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                  Desconto (%)
                                </FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input
                                      className="h-10 rounded-xl border-slate-800 bg-slate-950 pr-7 text-center font-mono text-sm font-bold text-rose-400 focus:border-rose-500"
                                      type="number"
                                      {...field}
                                      onChange={(e) => onDiscountChange(e.target.value)}
                                      value={discountInputDisplay}
                                    />
                                    <Percent className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                                  </div>
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      )}

                      {/* Action Button */}
                      <div className="col-span-2 sm:col-span-3 flex gap-2">
                        <Button
                          type="submit"
                          disabled={!form.watch('item')}
                          className={cn(
                            'h-10 flex-1 rounded-xl text-xs font-bold text-white shadow-lg transition-all active:scale-[0.98]',
                            editingItemId
                              ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'
                              : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20',
                          )}
                        >
                          {editingItemId ? 'SALVAR ALTERAÃ‡ÃƒO' : 'CONFIRMAR ITEM'}
                        </Button>

                        {editingItemId && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={resetCustomizer}
                            className="h-10 border-slate-800 bg-slate-900 px-3 text-slate-400 hover:text-white"
                            title="Cancelar ediÃ§Ã£o"
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
                'z-20 flex h-full w-full flex-col border-l border-slate-800 bg-slate-900 shadow-2xl md:w-[38%] lg:w-[33%] xl:w-[28%]',
                mobileTab === 'cart' ? 'flex' : 'hidden md:flex',
              )}
            >
              {/* Cart Header */}
              <div className="flex flex-none items-center justify-between border-b border-slate-800 bg-slate-950/80 p-3.5">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">Carrinho da O.S.</h3>
                </div>
                <Badge variant="secondary" className="border-slate-800 bg-slate-800 font-mono text-xs text-slate-300">
                  {treatment.items?.length || 0} {treatment.items?.length === 1 ? 'item' : 'itens'}
                </Badge>
              </div>

              {/* Cart Items List */}
              <ScrollArea className="flex-1 p-3">
                <div className="space-y-2.5">
                  {(treatment.items || []).map((item) => {
                    const itemSubtotal =
                      Number(item.quantity || 1) * Number(item.salesValue || 0) -
                      Number(item.discount || 0)

                    return (
                      <div
                        key={item.id}
                        onClick={() => onCartItemSelect(item)}
                        className={cn(
                          'group relative cursor-pointer rounded-xl border p-3 transition-all duration-200',
                          editingItemId === item.id
                            ? 'border-amber-500/80 bg-amber-950/25 ring-1 ring-amber-500'
                            : 'border-slate-800/90 bg-slate-950/80 hover:border-slate-700 hover:bg-slate-950',
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5 truncate">
                            <div
                              className={cn(
                                'mt-0.5 rounded-lg p-1.5 text-xs',
                                item.items?.isItem
                                  ? 'bg-blue-500/15 text-blue-400'
                                  : 'bg-amber-500/15 text-amber-400',
                              )}
                            >
                              {item.items?.isItem ? <Box className="h-3.5 w-3.5" /> : <Wrench className="h-3.5 w-3.5" />}
                            </div>
                            <div className="flex flex-col truncate">
                              <span className="truncate text-xs font-bold text-slate-100" title={item.items?.name}>
                                {item.items?.name}
                              </span>
                              {item.observations && (
                                <span className="truncate text-[11px] text-slate-400" title={item.observations}>
                                  Obs: {item.observations}
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCartItemDelete(item.id)
                            }}
                            className="p-1 text-slate-500 transition-colors hover:text-rose-400"
                            title="Remover item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Cart Item Row: Inline Stepper & Line Total */}
                        <div className="mt-2.5 flex items-center justify-between border-t border-slate-900 pt-2">
                          {/* Stepper directly inside cart item */}
                          <div className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-1 py-0.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handleCartQuantityChange(item, -1)}
                              className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-800 hover:text-white"
                              title="Diminuir"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="min-w-[20px] text-center font-mono text-xs font-bold text-slate-200">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCartQuantityChange(item, 1)}
                              className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-800 hover:text-white"
                              title="Aumentar"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>

                          <div className="text-right">
                            {Number(item.discount || 0) > 0 && (
                              <span className="block text-[10px] font-medium text-rose-400">
                                -{formatBRL(item.discount || 0)}
                              </span>
                            )}
                            <span className="font-mono text-sm font-black text-emerald-400">
                              {Number(item.salesValue || 0) === 0 ? (
                                <span className="text-xs text-blue-400 font-bold">CONTRATO</span>
                              ) : (
                                formatBRL(itemSubtotal)
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {treatment.items?.length === 0 && (
                    <div className="flex h-44 flex-col items-center justify-center text-center text-slate-500">
                      <ShoppingCart className="mb-2 h-8 w-8 opacity-30" />
                      <p className="text-xs font-bold text-slate-400">Carrinho Vazio</p>
                      <p className="text-[11px] text-slate-600">Selecione itens no catÃ¡logo ao lado para adicionar.</p>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Cart Sticky Breakdown & Advance Button */}
              <div className="flex-none space-y-3 border-t border-slate-800 bg-slate-950 p-4 shadow-2xl">
                {isFinanceActive && (
                  <div className="space-y-1.5 rounded-xl border border-slate-800/80 bg-slate-900/60 p-3 text-xs">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Subtotal Bruto:</span>
                      <span className="font-mono">{formatBRL(totalGross)}</span>
                    </div>
                    {totalDiscount > 0 && (
                      <div className="flex items-center justify-between text-rose-400 font-medium">
                        <span>Descontos Aplicados:</span>
                        <span className="font-mono">-{formatBRL(totalDiscount)}</span>
                      </div>
                    )}
                    <div className="border-t border-slate-800 pt-1.5 flex items-center justify-between text-sm font-black text-white">
                      <span>Total a Pagar:</span>
                      <span className="font-mono text-lg text-emerald-400">
                        {formatBRL(subtotal)}
                      </span>
                    </div>
                  </div>
                )}

                <Button
                  onClick={() => setCurrentStep('payment')}
                  disabled={treatment.items?.length === 0}
                  className="h-12 w-full gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 font-bold text-white shadow-xl shadow-emerald-600/25 transition-all hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98]"
                >
                  <CreditCard className="h-4 w-4" />
                  <span>AVANÃ‡AR PARA O PAGAMENTO</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: PAYMENT & CLOSING STEP */}
      {currentStep === 'payment' && (
        <div className="flex flex-1 flex-col overflow-hidden bg-slate-950">
          {/* Hero Financial Banner */}
          <div className="flex-none border-b border-slate-800 bg-slate-900/80 p-4 sm:p-6 backdrop-blur-md">
            <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentStep('catalog')}
                  className="mb-2 h-8 gap-1.5 text-xs text-slate-400 hover:text-white"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Voltar para PeÃ§as & ServiÃ§os
                </Button>
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-black text-white sm:text-2xl">
                    {isFullyPaid ? 'Pagamento Completo' : 'Recebimento do Atendimento'}
                  </h3>
                  {isFullyPaid && (
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 gap-1 text-xs">
                      <Check className="h-3.5 w-3.5" /> Pronto para finalizar
                    </Badge>
                  )}
                </div>
              </div>

              {/* Progress & Remaining Card */}
              <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-inner">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500">Total O.S.</span>
                  <p className="font-mono text-base font-bold text-slate-300">{formatBRL(subtotal)}</p>
                </div>
                <div className="h-8 w-px bg-slate-800" />
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500">Total Registrado</span>
                  <p className="font-mono text-base font-bold text-indigo-400">{formatBRL(totalPaid)}</p>
                </div>
                <div className="h-8 w-px bg-slate-800" />
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500">
                    {remainingAmount > 0 ? 'Falta Pagar' : 'Saldo Restante'}
                  </span>
                  <p
                    className={cn(
                      'font-mono text-xl font-black',
                      remainingAmount > 0 ? 'text-amber-400' : 'text-emerald-400',
                    )}
                  >
                    {formatBRL(remainingAmount)}
                  </p>
                </div>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="mx-auto mt-4 max-w-5xl">
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Body: Split Layout (Payment Form & Registered List) */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-12">
              {/* LEFT: PAYMENT REGISTRATION FORM */}
              <div className="space-y-4 md:col-span-6">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
                  <h4 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-300">
                    <Wallet className="h-4 w-4 text-indigo-400" />
                    Registrar Forma de Pagamento
                  </h4>

                  {changeAlert !== null && (
                    <div className="mb-4 flex items-center gap-2 rounded-xl bg-amber-500/15 border border-amber-500/30 p-3 text-xs font-bold text-amber-300">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>TROCO A DEVOLVER: {formatBRL(changeAlert)}</span>
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* Payment Method Select */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-400">Forma de Pagamento</Label>
                      <Select
                        value={currentPayment.paymentId}
                        onValueChange={(val) => {
                          setCurrentPayment((prev) => ({ ...prev, paymentId: val }))
                          setTimeout(() => paymentAmountInputRef.current?.focus(), 100)
                        }}
                        disabled={isFullyPaid}
                      >
                        <SelectTrigger className="h-11 border-slate-800 bg-slate-950 text-sm text-slate-100 focus:border-indigo-500">
                          <SelectValue placeholder="Selecione o mÃ©todo de pagamento..." />
                        </SelectTrigger>
                        <SelectContent className="border-slate-800 bg-slate-900 text-slate-100">
                          {availablePayments.map((p) => (
                            <SelectItem key={p.id} value={p.id} className="py-2.5 text-sm hover:bg-slate-800">
                              <div className="flex items-center gap-2.5">
                                {p.name.toLowerCase().includes('crÃ©dito') ? (
                                  <CreditCard className="h-4 w-4 text-blue-400" />
                                ) : p.name.toLowerCase().includes('pix') ? (
                                  <QrCode className="h-4 w-4 text-teal-400" />
                                ) : (
                                  <Banknote className="h-4 w-4 text-emerald-400" />
                                )}
                                <span>{p.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Amount & Installments */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-400">Valor (R$)</Label>
                        <Input
                          ref={paymentAmountInputRef}
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={currentPayment.amount}
                          onChange={(e) => setCurrentPayment({ ...currentPayment, amount: e.target.value })}
                          className="h-11 border-slate-800 bg-slate-950 font-mono text-base font-bold text-emerald-400 focus:border-emerald-500"
                        />
                      </div>

                      {isCreditCard ? (
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-slate-400">Parcelas</Label>
                          <Select
                            value={currentPayment.installments.toString()}
                            onValueChange={(val) =>
                              setCurrentPayment({ ...currentPayment, installments: parseInt(val) || 1 })
                            }
                          >
                            <SelectTrigger className="h-11 border-slate-800 bg-slate-950 text-sm">
                              <SelectValue placeholder="1x" />
                            </SelectTrigger>
                            <SelectContent className="border-slate-800 bg-slate-900 text-slate-100">
                              {Array.from({ length: maxInstallments }).map((_, i) => (
                                <SelectItem key={i + 1} value={(i + 1).toString()}>
                                  {i + 1}x {currentPayment.amount ? formatBRL(parseFloat(currentPayment.amount) / (i + 1)) : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-slate-400">Data de Vencimento</Label>
                          <Input
                            type="date"
                            value={currentPayment.date}
                            onChange={(e) => setCurrentPayment({ ...currentPayment, date: e.target.value })}
                            className="h-11 border-slate-800 bg-slate-950 text-xs text-slate-200"
                          />
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={handleAddPayment}
                      disabled={!currentPayment.paymentId || !currentPayment.amount}
                      className="h-11 w-full gap-2 rounded-xl bg-indigo-600 font-bold text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-500"
                    >
                      <Plus className="h-4 w-4" />
                      ADICIONAR PAGAMENTO
                    </Button>
                  </div>
                </div>
              </div>

              {/* RIGHT: REGISTERED PAYMENTS LIST */}
              <div className="space-y-4 md:col-span-6">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
                  <h4 className="mb-4 flex items-center justify-between text-sm font-bold uppercase tracking-wider text-slate-300">
                    <span className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-emerald-400" />
                      Pagamentos Registrados
                    </span>
                    <Badge variant="secondary" className="border-slate-800 bg-slate-800 font-mono text-xs">
                      {paymentMethodsData.length}
                    </Badge>
                  </h4>

                  <div className="space-y-2.5">
                    {paymentMethodsData.map((item) => {
                      const method = availablePayments.find((p) => p.id === item.paymentId)
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/80 p-3.5 shadow-sm"
                        >
                          <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-slate-800 p-2 text-slate-300">
                              <Banknote className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-100">{method?.name || 'Pagamento'}</p>
                              <span className="text-xs text-slate-400">
                                {item.installments > 1 ? `${item.installments}x de ${formatBRL(item.amount / item.installments)}` : 'Ã€ vista'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="font-mono text-base font-black text-emerald-400">
                              {formatBRL(item.amount)}
                            </span>
                            <button
                              onClick={() => handleRemovePayment(item.id)}
                              className="p-1 text-slate-500 hover:text-rose-400"
                              title="Remover pagamento"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )
                    })}

                    {paymentMethodsData.length === 0 && (
                      <div className="flex h-36 flex-col items-center justify-center text-center text-slate-500">
                        <Wallet className="mb-2 h-8 w-8 opacity-30" />
                        <p className="text-xs font-bold text-slate-400">Nenhum pagamento registrado</p>
                        <p className="text-[11px] text-slate-600">Selecione o mÃ©todo ao lado para registrar o recebimento.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Checkout Footer Bar */}
          <footer className="flex-none border-t border-slate-800 bg-slate-950 p-4 shadow-2xl">
            <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentStep('catalog')}
                className="h-12 rounded-xl border-slate-800 bg-slate-900 font-bold text-slate-300 hover:text-white"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                VOLTAR E AJUSTAR ITENS
              </Button>

              <Button
                onClick={handleFinishSale}
                disabled={isFinishing || (isFinanceActive && remainingAmount > 0.01)}
                className="h-14 gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-8 text-base font-black text-white shadow-xl shadow-emerald-600/30 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] disabled:opacity-50"
              >
                <CheckCircle2 className="h-5 w-5" />
                {isFinishing ? 'FINALIZANDO...' : 'CONCLUIR E FINALIZAR ATENDIMENTO'}
              </Button>
            </div>
          </footer>
        </div>
      )}
    </DialogContent>
  )
}