import { useQuery } from '@tanstack/react-query'
import {
  Banknote,
  CheckCircle2,
  ChefHat,
  ChevronRight,
  Clock,
  Copy,
  Info,
  MapPin,
  Minus,
  Phone,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Store,
  UtensilsCrossed,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { api } from '@/lib/axios'
import { formatCurrency, resolveImageUrl, toWhatsAppNumber } from '@/lib/utils'

// -------------------------------------------------------------
// Tipos
// -------------------------------------------------------------
interface ComplementOption {
  id: string
  name: string
  price: number
}

interface ComplementGroup {
  id: string
  name: string
  min_quantity: number
  max_quantity: number
  free_quantity: number
  options: ComplementOption[]
}

interface Product {
  id: string
  name: string
  price: number
  category: string
  display_id?: string
  description?: string
  imageUrl?: string
  show_on_menu?: boolean
  measureUnit?: string
  subcategory?: {
    id: string
    name: string
    accepts_fractions: boolean
    max_fractions: number
  } | null
  complementGroups?: ComplementGroup[]
}

interface CartItem {
  id: string
  product: Product
  quantity: number
  unitPrice: number
  observation?: string
  fractions?: string[]
  selectedOptions?: {
    groupId: string
    groupName: string
    optionId: string
    optionName: string
    price: number
    quantity: number
  }[]
}

interface MarujoMenuProps {
  tenantName?: string
  profile?: any
}

// -------------------------------------------------------------
// Marca d'água de Rosa dos Ventos Náutica Antiga (Rotativa e Sutil)
// -------------------------------------------------------------
function AntiqueCompassWatermark() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-0 flex items-center justify-center overflow-hidden opacity-10 select-none">
      <div className="relative flex h-[550px] w-[550px] items-center justify-center text-amber-500">
        <svg
          viewBox="0 0 100 100"
          className="absolute h-full w-full animate-[spin_240s_linear_infinite] fill-current"
        >
          <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="0.3" />
          <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="0.2" strokeDasharray="1 1.5" />
          <circle cx="50" cy="50" r="41" fill="none" stroke="currentColor" strokeWidth="0.1" />
          {Array.from({ length: 72 }).map((_, i) => (
            <line
              key={`c-tick-${i}`}
              x1="50"
              y1="2"
              x2="50"
              y2={i % 9 === 0 ? '6' : '4'}
              transform={`rotate(${i * 5} 50 50)`}
              stroke="currentColor"
              strokeWidth={i % 9 === 0 ? '0.5' : '0.2'}
            />
          ))}
          <text x="50" y="10" textAnchor="middle" fontSize="4.5" fontFamily="Cinzel, serif" fill="currentColor" fontWeight="bold">N</text>
          <text x="50" y="93" textAnchor="middle" fontSize="4.5" fontFamily="Cinzel, serif" fill="currentColor" fontWeight="bold">S</text>
          <text x="93" y="52" textAnchor="middle" fontSize="4.5" fontFamily="Cinzel, serif" fill="currentColor" fontWeight="bold">E</text>
          <text x="7" y="52" textAnchor="middle" fontSize="4.5" fontFamily="Cinzel, serif" fill="currentColor" fontWeight="bold">W</text>
        </svg>
        <svg
          viewBox="0 0 100 100"
          className="absolute h-[80%] w-[80%] animate-[spin_180s_linear_infinite_reverse] fill-current"
        >
          <g transform="translate(50, 50)">
            <path d="M0 -40 L4.5 -8 L0 0 Z" fill="currentColor" opacity="0.4" />
            <path d="M0 -40 L-4.5 -8 L0 0 Z" fill="currentColor" opacity="0.9" />
            <path d="M0 40 L4.5 8 L0 0 Z" fill="currentColor" opacity="0.9" />
            <path d="M0 40 L-4.5 8 L0 0 Z" fill="currentColor" opacity="0.4" />
            <path d="M40 0 L8 4.5 L0 0 Z" fill="currentColor" opacity="0.4" />
            <path d="M40 0 L8 -4.5 L0 0 Z" fill="currentColor" opacity="0.9" />
            <path d="M-40 0 L-8 4.5 L0 0 Z" fill="currentColor" opacity="0.9" />
            <path d="M-40 0 L-8 -4.5 L0 0 Z" fill="currentColor" opacity="0.4" />
          </g>
          <circle cx="50" cy="50" r="5" fill="none" stroke="currentColor" strokeWidth="0.5" />
          <circle cx="50" cy="50" r="2" fill="currentColor" opacity="0.8" />
        </svg>
      </div>
    </div>
  )
}

// Sugestão de Harmonização Sommelier
function getPairingSuggestion(category: string, name: string): string {
  const text = `${category} ${name}`.toLowerCase()
  if (text.includes('peixe') || text.includes('abadejo') || text.includes('camar') || text.includes('marisco') || text.includes('frutos do mar')) {
    return 'Chopp Artesanal IPA ou Vinho Verde'
  }
  if (text.includes('burger') || text.includes('carne') || text.includes('picanha') || text.includes('costela') || text.includes('angus')) {
    return 'Vinho Tinto Malbec ou Drink Old Fashioned'
  }
  if (text.includes('pizza') || text.includes('massa') || text.includes('risoto')) {
    return 'Chianti Clássico ou Cerveja Dunkel'
  }
  if (text.includes('batata') || text.includes('petisco') || text.includes('croquete') || text.includes('pastel')) {
    return 'Chopp Pilsen Extra Gelado ou Caipirinha Caiçara'
  }
  if (text.includes('sobremesa') || text.includes('chocolate') || text.includes('doce')) {
    return 'Vinho do Porto ou Licor 43'
  }
  return 'Chopp Artesanal IPA ou Vinho Verde'
}

// Formatador de tempo regressivo mm:ss
function formatTimer(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0')
  const s = (sec % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

// -------------------------------------------------------------
// Gerador de Pix Copia e Cola (BACEN)
// -------------------------------------------------------------
function generatePixBRCode({
  pixKey,
  merchantName,
  merchantCity,
  amount,
}: {
  pixKey: string
  merchantName: string
  merchantCity: string
  amount: number
}): string {
  if (!pixKey || !pixKey.trim()) return ''
  const cleanKey = pixKey.trim()
  const name = (merchantName || 'Marujo Gastro Bar').slice(0, 25).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const city = (merchantCity || 'Caraguatatuba').slice(0, 15).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const amtStr = amount.toFixed(2)

  const formatField = (id: string, val: string) => {
    const len = val.length.toString().padStart(2, '0')
    return `${id}${len}${val}`
  }

  const gui = formatField('00', 'br.gov.bcb.pix')
  const key = formatField('01', cleanKey)
  const mai = formatField('26', `${gui}${key}`)

  const payload = [
    formatField('00', '01'),
    mai,
    formatField('52', '0000'),
    formatField('53', '986'),
    formatField('54', amtStr),
    formatField('58', 'BR'),
    formatField('59', name),
    formatField('60', city),
    formatField('62', formatField('05', '***')),
  ].join('')

  const dataToCrc = `${payload}6304`
  let crc = 0xffff
  for (let i = 0; i < dataToCrc.length; i++) {
    crc ^= dataToCrc.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021
      } else {
        crc = crc << 1
      }
      crc = crc & 0xffff
    }
  }
  const crcStr = crc.toString(16).toUpperCase().padStart(4, '0')
  return `${dataToCrc}${crcStr}`
}


// Verificação de Loja Aberta/Fechada (Alinhado rigorosamente com o White Label)
function checkIsOpen(profile: any) {
  if (!profile) return { isOpen: true, reason: 'Aberto' }
  if (profile.isOpenManual === false) {
    return { isOpen: false, reason: 'Pausa manual ativada' }
  }

  const now = new Date()
  const currentDayOfWeek = now.getDay()
  const currentHours = String(now.getHours()).padStart(2, '0')
  const currentMinutes = String(now.getMinutes()).padStart(2, '0')
  const currentTime = `${currentHours}:${currentMinutes}`

  const businessHours: any[] = profile.businessHours || []
  const todaySchedules = businessHours.filter(
    (bh: any) => bh.dayOfWeek === currentDayOfWeek && bh.isOpen,
  )

  if (!todaySchedules || todaySchedules.length === 0) {
    return { isOpen: false, reason: 'Fechado hoje' }
  }

  const activeShift = todaySchedules.find((schedule: any) => {
    const { openTime, closeTime } = schedule
    if (!openTime || !closeTime) return false
    if (closeTime > openTime) {
      return currentTime >= openTime && currentTime <= closeTime
    } else {
      return currentTime >= openTime || currentTime <= closeTime
    }
  })

  if (activeShift) {
    return { isOpen: true, reason: 'Aberto' }
  }

  const upcomingToday = todaySchedules
    .filter((s: any) => s.openTime && s.openTime > currentTime)
    .sort((a: any, b: any) => a.openTime.localeCompare(b.openTime))[0]

  if (upcomingToday) {
    return { isOpen: false, reason: `Fechado (Abre às ${upcomingToday.openTime})` }
  }

  return { isOpen: false, reason: 'Fechado no momento' }
}

export default function MarujoMenu({ tenantName, profile }: MarujoMenuProps) {
  const storeStatus = useMemo(() => checkIsOpen(profile), [profile])
  // Ativa dark mode permanente para a experiência Haute Coastal
  useEffect(() => {
    const root = document.documentElement
    root.classList.add('dark')
    root.classList.add('theme-marujo')
    root.classList.remove('light')
    return () => {
      root.classList.remove('theme-marujo')
    }
  }, [])

  // Estados principais
  const [cart, setCart] = useState<Record<string, CartItem>>({})
  const [activeCategory, setActiveCategory] = useState<string>('Todos')
  const [searchQuery, setSearchQuery] = useState('')
  const [isStoreInfoOpen, setIsStoreInfoOpen] = useState(false)

  // Estado do Customizador de Item
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null)
  const [customizerQuantity, setCustomizerQuantity] = useState(1)
  const [customizerFraction, setCustomizerFraction] = useState<'FULL' | 'HALF'>('FULL')
  const [customizerSelectedOptions, setCustomizerSelectedOptions] = useState<Record<string, number>>({})
  const [customizerObservation, setCustomizerObservation] = useState('')

  // Estado do Checkout
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [checkoutStep, setCheckoutStep] = useState<1 | 2 | 3 | 4>(1)
  const [fulfillmentType, setFulfillmentType] = useState<'DELIVERY' | 'TAKEOUT'>('DELIVERY')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [street, setStreet] = useState('')
  const [number, setNumber] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [city, setCity] = useState('Caraguatatuba')
  const [state, setState] = useState('SP')
  const [zipcode, setZipcode] = useState('')
  const [complement, setComplement] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'CARD_DELIVERY' | 'CARD_ONLINE' | 'CASH' | 'VR'>('PIX')
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false)
  const [pixCopied, setPixCopied] = useState(false)
  const [pixTimer, setPixTimer] = useState(900) // 15 minutos

  // Estado do Pedido Concluído (Etapa 4 - Rastreamento Náutico)
  const [createdOrderId, setCreatedOrderId] = useState<string>('')
  const [createdDisplayId, setCreatedDisplayId] = useState<number | string>(7)
  const [liveOrderStatus, setLiveOrderStatus] = useState<'pending' | 'in_preparation' | 'dispatched' | 'delivered'>('in_preparation')
  const [lastOrderText, setLastOrderText] = useState<string>('')
  const [lastOrderTotal, setLastOrderTotal] = useState<number>(0)

  // Timer regressivo do Pix
  useEffect(() => {
    if (!isCheckoutOpen || checkoutStep !== 3 || paymentMethod !== 'PIX') return
    const timer = setInterval(() => {
      setPixTimer((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [isCheckoutOpen, checkoutStep, paymentMethod])

  // Busca do Cardápio Público
  const { data: menuData, isLoading } = useQuery<{ products: Product[] }>({
    queryKey: ['public-menu-marujo'],
    queryFn: async () => {
      const res = await api.get('/public/menu')
      return res.data
    },
    staleTime: 1000 * 60 * 5,
  })

  const rawProducts = Array.isArray(menuData?.products)
    ? menuData.products
    : Array.isArray(menuData)
      ? (menuData as any)
      : []

  const availableProducts: Product[] = useMemo(() => {
    return rawProducts.filter((p: any) => p.show_on_menu !== false)
  }, [rawProducts])

  // Agrupamento por Categoria
  const groupedProducts = useMemo(() => {
    const map: Record<string, Product[]> = {}
    availableProducts.forEach((p) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const match = p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q))
        if (!match) return
      }
      if (activeCategory !== 'Todos' && p.category !== activeCategory) {
        return
      }
      if (!map[p.category]) {
        map[p.category] = []
      }
      map[p.category].push(p)
    })
    return map
  }, [availableProducts, searchQuery, activeCategory])

  const categories = useMemo(() => {
    const set = new Set<string>()
    availableProducts.forEach((p) => {
      if (p.category) set.add(p.category)
    })
    return ['Todos', ...Array.from(set).sort()]
  }, [availableProducts])

  // Pratos Premiados & Assinatura (Edição Ouro)
  const signatureDishes = useMemo(() => {
    return availableProducts.slice(0, 6)
  }, [availableProducts])

  // Cálculos do Carrinho
  const cartItems = useMemo(() => Object.values(cart), [cart])
  const cartCount = useMemo(() => cartItems.reduce((acc, item) => acc + item.quantity, 0), [cartItems])
  const cartSubtotal = useMemo(() => cartItems.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0), [cartItems])
  const deliveryFee = fulfillmentType === 'DELIVERY' ? 5.0 : 0.0
  const cartTotal = cartSubtotal + deliveryFee

  // Chave Pix
  const pixKey = profile?.pixKey || 'marujogastrobar@gmail.com'
  const dynamicPixCode = useMemo(() => {
    return generatePixBRCode({
      pixKey,
      merchantName: profile?.tradeName || tenantName || 'Marujo Gastro Bar',
      merchantCity: 'Caraguatatuba',
      amount: cartTotal > 0 ? cartTotal : 66.4,
    })
  }, [pixKey, profile?.tradeName, tenantName, cartTotal])

  // Abertura do Customizador de Item
  const handleOpenCustomizer = (product: Product) => {
    setCustomizingProduct(product)
    setCustomizerQuantity(1)
    setCustomizerFraction('FULL')
    setCustomizerSelectedOptions({})
    setCustomizerObservation('')
  }

  // Adição Rápida
  const handleQuickAdd = (product: Product) => {
    if (product.complementGroups && product.complementGroups.length > 0) {
      handleOpenCustomizer(product)
      return
    }
    setCart((prev) => {
      const existing = prev[product.id]
      if (existing) {
        return {
          ...prev,
          [product.id]: {
            ...existing,
            quantity: existing.quantity + 1,
          },
        }
      }
      return {
        ...prev,
        [product.id]: {
          id: product.id,
          product,
          quantity: 1,
          unitPrice: product.price,
        },
      }
    })
  }

  // Confirmação no Customizador
  const handleCustomizerConfirm = () => {
    if (!customizingProduct) return

    let price = customizerFraction === 'HALF' ? customizingProduct.price * 0.65 : customizingProduct.price

    const selectedPayload: {
      groupId: string
      groupName: string
      optionId: string
      optionName: string
      price: number
      quantity: number
    }[] = []

    if (customizingProduct.complementGroups) {
      for (const group of customizingProduct.complementGroups) {
        let totalSelectedInGroup = 0
        for (const opt of group.options) {
          const qty = customizerSelectedOptions[opt.id] || 0
          if (qty > 0) {
            totalSelectedInGroup += qty
            const freeQty = group.free_quantity || 0
            const chargeable = Math.max(0, totalSelectedInGroup - freeQty)
            const optCharge = chargeable > 0 ? Math.min(qty, chargeable) : 0
            price += opt.price * optCharge

            selectedPayload.push({
              groupId: group.id,
              groupName: group.name,
              optionId: opt.id,
              optionName: opt.name,
              price: opt.price,
              quantity: qty,
            })
          }
        }
      }
    }

    const uniqueId = `${customizingProduct.id}-${customizerFraction}-${Date.now()}`
    setCart((prev) => ({
      ...prev,
      [uniqueId]: {
        id: uniqueId,
        product: customizingProduct,
        quantity: customizerQuantity,
        unitPrice: price,
        observation: customizerObservation,
        fractions: customizerFraction === 'HALF' ? ['1/2 Porção'] : undefined,
        selectedOptions: selectedPayload,
      },
    }))

    setCustomizingProduct(null)
  }

  // Finalização do Pedido
  
  // Escuta em tempo real o status do pedido criado
  useEffect(() => {
    if (!createdOrderId || checkoutStep !== 4) return

    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/public/orders/${createdOrderId}/status`)
        if (res.data?.status) {
          setLiveOrderStatus(res.data.status)
        }
      } catch (e) {
        // Silencioso
      }
    }, 4000)

    return () => clearInterval(interval)
  }, [createdOrderId, checkoutStep])

  const handleConfirmOrder = async () => {
    if (!storeStatus.isOpen) {
      alert(storeStatus.reason)
      return
    }

    setIsSubmittingOrder(true)
    try {
      const isTakeout = fulfillmentType === 'TAKEOUT'
      const resolvedPaymentMethod =
        paymentMethod === 'PIX'
          ? 'PIX'
          : paymentMethod === 'CARD'
            ? 'Cartão'
            : 'Dinheiro'

      let orderId = `marujo-${Date.now()}`
      let displayId = Math.floor(Math.random() * 900) + 100

      try {
        const res = await api.post('/public/orders', {
          client_name: customerName,
          client_phone: customerPhone,
          origin: isTakeout ? 'Balcão' : 'Delivery',
          street: isTakeout ? '' : street,
          number: isTakeout ? '' : (number || 'S/N'),
          neighborhood: isTakeout ? '' : neighborhood,
          city: isTakeout ? '' : (city || 'Local'),
          state: isTakeout ? '' : (state || 'SP'),
          zipcode: isTakeout ? undefined : (zipcode || undefined),
          complement: isTakeout ? undefined : (complement || undefined),
          payment_method_name: resolvedPaymentMethod,
          delivery_fee: isTakeout ? 0 : deliveryFee,
          total_amount: cartTotal,
          notes: isTakeout ? 'Retirada na Marina (Balcão)' : 'Entrega Expressa Gourmet (Delivery)',
          items: cartItems.map((item) => ({
            product_id: item.product.id,
            name: item.product.name,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            notes: item.observation || undefined,
            complements: (item.selectedOptions || []).map((o) => ({
              name: o.name,
              price: o.price,
              quantity: 1,
            })),
          })),
        })

        const orderData = res.data?.order || res.data
        if (orderData?.id) orderId = orderData.id
        if (orderData?.display_id) displayId = orderData.display_id
      } catch (err: any) {
        console.error('Erro ao enviar pedido para o caixa:', err)
        const errorMsg = err?.response?.data?.message || 'Erro ao registrar pedido no caixa.'
        alert(`Não foi possível registrar o pedido no caixa: ${errorMsg}`)
        return
      }

      setCreatedOrderId(orderId)
      setCreatedDisplayId(displayId)
      setLastOrderTotal(cartTotal)
      setLiveOrderStatus('pending')

      const itemsText = cartItems.map((i) => `• ${i.quantity}x ${i.product.name} (R$ ${(i.unitPrice * i.quantity).toFixed(2)})`).join('\n')
      const msg = `*⚓ NOVO PEDIDO #${displayId} - MARUJO GASTRO BAR*\n\n*Cliente:* ${customerName}\n*Telefone:* ${customerPhone}\n*Modalidade:* ${isTakeout ? 'Retirada na Marina' : 'Entrega Expressa Gourmet'}\n${!isTakeout ? `*Endereço:* ${street}, ${number || 'S/N'} - ${neighborhood}${complement ? ` (${complement})` : ''}\n` : ''}*Pagamento:* ${resolvedPaymentMethod}\n\n*Itens do Pedido:*\n${itemsText}\n\n*Total:* R$ ${cartTotal.toFixed(2)}\n\n_✅ Pedido registrado no sistema Metrics_`
      setLastOrderText(msg)

      setCart({})
      setCheckoutStep(4)
    } finally {
      setIsSubmittingOrder(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#080E18] text-[#DDE2F1] font-jakarta antialiased selection:bg-amber-500/30 selection:text-amber-200">
      {/* ------------------------------------------------------------- */}
      {/* 1. FAIXA SUPERIOR: 8x CAMPEÃO */}
      {/* ------------------------------------------------------------- */}
      <div className="sticky top-0 z-50 w-full bg-gradient-to-r from-[#140b02] via-[#2a1705] to-[#140b02] border-b border-[#d97707]/40 py-2.5 px-4 text-center shadow-lg">
        <span className="text-[11px] sm:text-xs font-bold tracking-widest text-[#ffb77d] uppercase flex items-center justify-center gap-2">
          <span className="text-amber-400">👑</span> ★ 8X CAMPEÃO DO CARAGUÁ A GOSTO • ALTA GASTRONOMIA LITORÂNEA
        </span>
      </div>

      <div className="flex flex-col lg:flex-row w-full max-w-[1600px] mx-auto">
        <main className="flex-1 min-w-0 pb-28 lg:pb-12">
          {/* ------------------------------------------------------------- */}
          {/* 2. HEADER DA MARCA COM BÚSSOLA NÁUTICA */}
          {/* ------------------------------------------------------------- */}
          <header className="relative overflow-hidden border-b border-white/5 bg-gradient-to-b from-[#0E141E] to-[#080E18] px-4 pt-6 pb-8 sm:px-8 sm:pt-8 sm:pb-10">
            <AntiqueCompassWatermark />

            <div className="relative z-10 mx-auto max-w-4xl">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 overflow-hidden rounded-full border-2 border-amber-500/80 bg-black/60 p-0.5 shadow-xl shadow-amber-950/40">
                    <img
                      src="/assets/marujo/novo_logo2-removebg-preview.png"
                      alt="Logo Marujo Gastro Bar"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div>
                    <span className="block text-[10px] font-extrabold tracking-[0.2em] text-[#ffb77d] uppercase">
                      Alta Cozinha Caiçara
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-extrabold font-playfair tracking-tight text-white">
                      {tenantName || 'Marujo Gastro Bar'}
                    </h1>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsStoreInfoOpen(true)}
                    className="flex items-center gap-1.5 rounded-full border border-white/10 bg-[#161C26]/80 px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:border-amber-500/40 hover:text-white transition-all backdrop-blur-md cursor-pointer"
                  >
                    <Info className="h-3.5 w-3.5 text-amber-400" />
                    <span>Casa</span>
                  </button>
                </div>
              </div>

              {/* Status Pills */}
              <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/30 px-3 py-1 font-bold text-emerald-400 backdrop-blur-md">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                  Aberto até 23:00
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#161C26]/90 px-3 py-1 font-medium text-slate-300">
                  <Clock className="h-3.5 w-3.5 text-amber-400" />
                  35 - 45 min
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#161C26]/90 px-3 py-1 font-medium text-slate-300">
                  <span>⛵</span>
                  Orla & Marina: Cortesia
                </span>
              </div>

              {/* Campo de Busca Dark */}
              <div className="mt-6 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar iguarias do mar, risotos ou vinho..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-[#161C26]/90 pl-11 pr-10 py-3.5 text-sm text-white placeholder-slate-400 outline-none transition-all focus:border-[#d97707] focus:ring-2 focus:ring-[#d97707]/20 shadow-inner"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </header>

          {/* ------------------------------------------------------------- */}
          {/* 3. SEÇÃO: PRATOS PREMIADOS & ASSINATURA (EDIÇÃO OURO) */}
          {/* ------------------------------------------------------------- */}
          {!searchQuery && signatureDishes.length > 0 && (
            <section className="px-4 pt-6 pb-2 sm:px-8 max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="h-5 w-1 rounded-full bg-[#d97707]" />
                  <h2 className="text-xl sm:text-2xl font-bold font-playfair tracking-wide text-white">
                    Pratos Premiados & Assinatura
                  </h2>
                </div>
                <span className="rounded-full bg-[#d97707]/20 border border-[#d97707]/40 px-2.5 py-0.5 text-[10px] font-bold text-[#ffb77d] uppercase tracking-wider">
                  Edição Ouro
                </span>
              </div>

              {/* Carrossel Snap Sem Barras Feias */}
              <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {signatureDishes.map((dish, idx) => {
                  const badgeText = idx === 0 ? 'CAMPEÃO 2023' : idx === 1 ? 'GRAND PRIX' : idx === 2 ? 'EDIÇÃO LIMITADA' : 'DESTAQUE DO CHEF'
                  return (
                    <div
                      key={`sig-${dish.id}`}
                      onClick={() => handleQuickAdd(dish)}
                      className="group relative w-72 sm:w-80 shrink-0 cursor-pointer snap-start overflow-hidden rounded-2xl border border-white/10 bg-[#161C26] p-3 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-[#d97707]/60 hover:shadow-[0_0_24px_rgba(217,119,7,0.25)]"
                    >
                      <div className="relative h-44 w-full overflow-hidden rounded-xl bg-[#0E141E]">
                        {dish.imageUrl ? (
                          <img
                            src={resolveImageUrl(dish.imageUrl)}
                            alt={dish.name}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-[#0E141E] text-amber-500/40">
                            <ChefHat className="h-12 w-12" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0E141E] via-transparent to-transparent opacity-90" />
                        <span className="absolute top-2.5 left-2.5 rounded-full bg-[#d97707] px-2.5 py-0.5 text-[10px] font-extrabold text-slate-950 uppercase tracking-wider shadow-md">
                          ★ {badgeText}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-col justify-between">
                        <h3 className="text-base font-bold font-playfair text-white line-clamp-1 group-hover:text-amber-300 transition-colors">
                          {dish.name}
                        </h3>
                        <p className="mt-1 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {dish.description || 'Culinária caiçara refinada com frutos do mar frescos e toques do chef.'}
                        </p>
                        <div className="mt-3.5 flex items-center justify-between pt-2.5 border-t border-white/5">
                          <span className="text-base font-extrabold font-playfair text-[#ffb77d]">
                            {formatCurrency(dish.price)}
                          </span>
                          <button
                            type="button"
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-[#d97707] to-[#ee9800] text-slate-950 font-bold shadow-md transition-transform group-hover:scale-110 cursor-pointer"
                          >
                            <Plus className="h-4 w-4 stroke-[3]" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* ------------------------------------------------------------- */}
          {/* 4. ABAS DE CATEGORIAS (STICKY GLASSMORPHISM) */}
          {/* ------------------------------------------------------------- */}
          <nav className="sticky top-[37px] z-30 border-b border-white/10 bg-[#080E18]/95 px-4 py-3 backdrop-blur-md">
            <div className="flex items-center gap-2.5 overflow-x-auto max-w-4xl mx-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {categories.map((cat) => {
                const isActive = activeCategory === cat
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-[#d97707] to-[#ee9800] text-slate-950 shadow-[0_0_15px_rgba(217,119,7,0.35)] scale-105'
                        : 'bg-[#161C26] text-slate-300 border border-white/5 hover:border-amber-500/30 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                )
              })}
            </div>
          </nav>

          {/* ------------------------------------------------------------- */}
          {/* 5. LISTAGEM DE PRODUTOS (CARDS OBSIDIAN ESPECÍFICOS) */}
          {/* ------------------------------------------------------------- */}
          <div className="px-4 py-6 sm:px-8 max-w-4xl mx-auto">
            {isLoading ? (
              <div className="flex h-64 flex-col items-center justify-center gap-3">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-amber-500/30 border-t-amber-500" />
                <span className="text-xs font-medium text-slate-400">Carregando iguarias...</span>
              </div>
            ) : Object.keys(groupedProducts).length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center text-center text-slate-400">
                <UtensilsCrossed className="h-12 w-12 text-amber-500/30 mb-3" />
                <h3 className="text-lg font-bold font-playfair text-white">Nenhum prato encontrado</h3>
                <p className="text-xs text-slate-400 mt-1">Tente buscar por outro termo ou categoria.</p>
              </div>
            ) : (
              <div className="space-y-10">
                {Object.entries(groupedProducts).map(([catName, prods]) => (
                  <section key={catName}>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="h-4 w-1 rounded-full bg-[#d97707]" />
                      <h2 className="text-lg sm:text-xl font-bold font-playfair text-white">
                        {catName}
                      </h2>
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#161C26] text-[10px] font-bold text-amber-400 border border-white/5">
                        {prods.length}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {prods.map((product) => {
                        const inCartCount = cart[product.id]?.quantity || 0
                        return (
                          <div
                            key={product.id}
                            className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#161C26]/90 shadow-xl transition-all duration-300 hover:border-[#d97707]/40 hover:shadow-[0_0_24px_rgba(0,0,0,0.7)]"
                          >
                            {product.imageUrl && (
                              <div className="relative h-48 w-full overflow-hidden bg-[#0E141E] shrink-0">
                                <img
                                  src={resolveImageUrl(product.imageUrl)}
                                  alt={product.name}
                                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#161C26] via-transparent to-transparent opacity-80" />
                              </div>
                            )}

                            <div className="flex flex-1 flex-col p-4 justify-between">
                              <div>
                                <h3 className="text-base font-bold font-playfair text-white leading-snug">
                                  {product.name}
                                </h3>

                                {/* Tag de Harmonização Sommelier */}
                                <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-[#0E141E] border border-amber-500/20 px-2.5 py-1 text-[11px] text-amber-200/90 font-medium">
                                  <span>🍷</span>
                                  <span>Harmoniza com {getPairingSuggestion(product.category, product.name)}</span>
                                </div>

                                {product.description && (
                                  <p className="mt-2 text-xs text-slate-300/80 leading-relaxed line-clamp-3">
                                    {product.description}
                                  </p>
                                )}
                              </div>

                              <div className="mt-4 flex items-center justify-between pt-3 border-t border-white/5">
                                <div className="flex flex-col">
                                  <span className="text-[9px] font-extrabold tracking-wider text-slate-400 uppercase">
                                    Porção Gastro
                                  </span>
                                  <span className="text-base font-extrabold font-playfair text-[#ffb77d]">
                                    {formatCurrency(product.price)}
                                  </span>
                                </div>

                                <div>
                                  {inCartCount > 0 ? (
                                    <div className="flex items-center gap-2 rounded-full border border-amber-500/40 bg-[#0E141E] p-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setCart((prev) => {
                                            const cur = prev[product.id]
                                            if (!cur) return prev
                                            if (cur.quantity <= 1) {
                                              const copy = { ...prev }
                                              delete copy[product.id]
                                              return copy
                                            }
                                            return {
                                              ...prev,
                                              [product.id]: { ...cur, quantity: cur.quantity - 1 },
                                            }
                                          })
                                        }}
                                        className="flex h-7 w-7 items-center justify-center rounded-full bg-[#161C26] text-amber-400 hover:bg-amber-500 hover:text-black transition-colors cursor-pointer"
                                      >
                                        <Minus className="h-3.5 w-3.5 stroke-[3]" />
                                      </button>
                                      <span className="w-5 text-center text-xs font-bold text-white">
                                        {inCartCount}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleQuickAdd(product)}
                                        className="flex h-7 w-7 items-center justify-center rounded-full bg-[#d97707] text-slate-950 font-bold hover:brightness-110 transition-colors cursor-pointer"
                                      >
                                        <Plus className="h-3.5 w-3.5 stroke-[3]" />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleQuickAdd(product)}
                                      className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#d97707] to-[#ee9800] px-4 py-2 text-xs font-extrabold text-slate-950 shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                                    >
                                      <Plus className="h-3.5 w-3.5 stroke-[3]" />
                                      <span>Adicionar</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        </main>

        {/* ------------------------------------------------------------- */}
        {/* 6. SIDEBAR DESKTOP DE PEDIDO (OBSIDIAN DARK) */}
        {/* ------------------------------------------------------------- */}
        <aside className="hidden lg:flex w-[400px] shrink-0 border-l border-white/10 bg-[#0E141E] p-6 flex-col justify-between sticky top-[37px] h-[calc(100vh-37px)]">
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-amber-400" />
                <h2 className="text-lg font-bold font-playfair text-white">Seu Pedido</h2>
              </div>
              <span className="rounded-full bg-[#161C26] px-2.5 py-0.5 text-xs font-bold text-amber-400 border border-white/5">
                {cartCount} itens
              </span>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 py-12">
                  <ShoppingBag className="h-12 w-12 stroke-[1.5] mb-3 text-slate-600" />
                  <p className="font-bold font-playfair text-slate-400">Sua sacola está vazia.</p>
                  <p className="text-xs text-slate-500 mt-1">Adicione deliciosas iguarias do Marujo ao seu pedido.</p>
                </div>
              ) : (
                cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-white/5 bg-[#161C26] p-3 shadow-md"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold font-playfair text-white line-clamp-1">
                        {item.product.name}
                      </p>
                      {item.fractions && (
                        <p className="text-[11px] text-amber-400 font-medium">{item.fractions.join(', ')}</p>
                      )}
                      {item.selectedOptions?.map((opt) => (
                        <p key={opt.optionId} className="text-[11px] text-slate-400">
                          + {opt.quantity}x {opt.optionName}
                        </p>
                      ))}
                      <p className="mt-1 text-xs font-extrabold text-[#ffb77d]">
                        {formatCurrency(item.unitPrice * item.quantity)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-[#0E141E] p-1">
                      <button
                        type="button"
                        onClick={() => {
                          setCart((prev) => {
                            const cur = prev[item.id]
                            if (cur.quantity <= 1) {
                              const copy = { ...prev }
                              delete copy[item.id]
                              return copy
                            }
                            return { ...prev, [item.id]: { ...cur, quantity: cur.quantity - 1 } }
                          })
                        }}
                        className="flex h-6 w-6 items-center justify-center rounded-full text-slate-400 hover:text-white cursor-pointer"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-4 text-center text-xs font-bold text-white">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setCart((prev) => ({
                            ...prev,
                            [item.id]: { ...prev[item.id], quantity: prev[item.id].quantity + 1 },
                          }))
                        }}
                        className="flex h-6 w-6 items-center justify-center rounded-full text-amber-400 hover:text-amber-300 cursor-pointer"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Subtotal e Botão Avançar */}
          <div className="pt-4 border-t border-white/10 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Subtotal</span>
              <span className="font-bold text-white">{formatCurrency(cartSubtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-slate-300">Total</span>
              <span className="text-xl font-extrabold font-playfair text-[#ffb77d]">
                {formatCurrency(cartTotal)}
              </span>
            </div>

            <button
              type="button"
              disabled={cartItems.length === 0}
              onClick={() => {
                setIsCheckoutOpen(true)
                setCheckoutStep(1)
              }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#d97707] to-[#ee9800] py-3.5 text-sm font-extrabold text-slate-950 shadow-lg hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
            >
              <span>Avançar para o Checkout</span>
              <ChevronRight className="h-4 w-4 stroke-[3]" />
            </button>
          </div>
        </aside>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 7. BOTÃO FLUTUANTE MOBILE: VER PEDIDO */}
      {/* ------------------------------------------------------------- */}
      {cartCount > 0 && (
        <div className="fixed bottom-5 left-0 right-0 z-40 px-4 lg:hidden">
          <button
            type="button"
            onClick={() => {
              setIsCheckoutOpen(true)
              setCheckoutStep(1)
            }}
            className="flex w-full items-center justify-between rounded-2xl border border-amber-500/40 bg-gradient-to-r from-[#161C26] via-[#242A35] to-[#161C26] p-4 text-white shadow-2xl backdrop-blur-xl transition-transform active:scale-98 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-[#d97707] text-slate-950 font-bold shadow-md">
                <ShoppingBag className="h-5 w-5" />
                <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white">
                  {cartCount}
                </span>
              </div>
              <div className="text-left">
                <p className="text-sm font-bold font-playfair text-white">Ver Pedido do Marujo</p>
                <p className="text-[11px] text-amber-200/80">Iguarias selecionadas</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold font-playfair text-[#ffb77d]">
                {formatCurrency(cartTotal)}
              </span>
              <ChevronRight className="h-5 w-5 text-amber-400" />
            </div>
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 8. MODAL DE INFORMAÇÕES DA CASA */}
      {/* ------------------------------------------------------------- */}
      <Dialog open={isStoreInfoOpen} onOpenChange={setIsStoreInfoOpen}>
        <DialogContent className="max-w-md border border-white/10 bg-[#0E141E] text-white p-6 rounded-3xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-playfair text-white flex items-center gap-2">
              <Store className="h-5 w-5 text-amber-400" />
              <span>Marujo Gastro Bar</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Informações da Casa & Tradição Caiçara
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4 text-xs text-slate-300">
            <div className="flex items-start gap-3 rounded-xl bg-[#161C26] p-3 border border-white/5">
              <MapPin className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white">Localização Privilegiada</p>
                <p className="text-[11px] text-slate-400">Av. Dr. Arthur da Costa Filho, 1080 - Centro, Caraguatatuba - SP</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl bg-[#161C26] p-3 border border-white/5">
              <Clock className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white">Horário de Atendimento</p>
                <p className="text-[11px] text-slate-400">Terça a Domingo: 12:00 às 23:30 • Almoço e Jantar Gourmet</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl bg-[#161C26] p-3 border border-white/5">
              <Phone className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white">Contato & Reservas</p>
                <p className="text-[11px] text-slate-400">(12) 99219-3644 • WhatsApp Oficial</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl bg-[#161C26] p-3 border border-white/5">
              <Sparkles className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white">8x Campeão do Caraguá a Gosto</p>
                <p className="text-[11px] text-slate-400">Reconhecido pela excelência em frutos do mar nobres, carnes na brasa e coquetelaria autoral.</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------- */}
      {/* 9. MODAL DE CUSTOMIZAÇÃO DE ITEM (PROTÓTIPO 3) */}
      {/* ------------------------------------------------------------- */}
      <Dialog open={!!customizingProduct} onOpenChange={(open) => !open && setCustomizingProduct(null)}>
        <DialogContent className="max-w-lg border border-white/10 bg-[#0E141E] text-white p-0 overflow-hidden rounded-3xl shadow-2xl">
          {customizingProduct && (
            <div className="flex flex-col max-h-[90vh]">
              {/* Imagem de Topo */}
              <div className="relative h-56 w-full bg-black shrink-0">
                {customizingProduct.imageUrl ? (
                  <img
                    src={resolveImageUrl(customizingProduct.imageUrl)}
                    alt={customizingProduct.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[#161C26] text-amber-500/40">
                    <ChefHat className="h-16 w-16" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0E141E] via-transparent to-black/60" />

                <span className="absolute bottom-3 right-3 rounded-full bg-black/80 border border-amber-500/40 px-3 py-1 text-xs font-bold font-playfair text-[#ffb77d] backdrop-blur-md">
                  A PARTIR DE {formatCurrency(customizingProduct.price)}
                </span>
              </div>

              {/* Corpo com Scroll */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#ffb77d]">
                    ● {customizingProduct.category}
                  </span>
                  <DialogTitle className="text-xl sm:text-2xl font-bold font-playfair text-white mt-1">
                    {customizingProduct.name}
                  </DialogTitle>
                  <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                    {customizingProduct.description || 'Culinária refinada com ingredientes frescos e selecionados.'}
                  </p>
                </div>

                {/* Tamanho da Porção */}
                <div className="space-y-2.5">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-amber-400">
                    Tamanho da Porção
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setCustomizerFraction('FULL')}
                      className={`rounded-xl p-3 text-left border transition-all cursor-pointer ${
                        customizerFraction === 'FULL'
                          ? 'border-[#d97707] bg-[#161C26] shadow-[0_0_15px_rgba(217,119,7,0.2)]'
                          : 'border-white/10 bg-[#0E141E] text-slate-400 hover:border-white/20'
                      }`}
                    >
                      <p className="text-xs font-bold text-white">Porção Inteira</p>
                      <p className="text-sm font-extrabold font-playfair text-[#ffb77d] mt-0.5">
                        {formatCurrency(customizingProduct.price)}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomizerFraction('HALF')}
                      className={`rounded-xl p-3 text-left border transition-all cursor-pointer ${
                        customizerFraction === 'HALF'
                          ? 'border-[#d97707] bg-[#161C26] shadow-[0_0_15px_rgba(217,119,7,0.2)]'
                          : 'border-white/10 bg-[#0E141E] text-slate-400 hover:border-white/20'
                      }`}
                    >
                      <p className="text-xs font-bold text-white">1/2 Porção</p>
                      <p className="text-sm font-extrabold font-playfair text-[#ffb77d] mt-0.5">
                        {formatCurrency(customizingProduct.price * 0.65)}
                      </p>
                    </button>
                  </div>
                </div>

                {/* Grupos de Complementos / Molhos Especiais */}
                {customizingProduct.complementGroups?.map((group) => (
                  <div key={group.id} className="space-y-3 rounded-2xl border border-white/10 bg-[#161C26]/60 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-white">
                          {group.name}
                        </h4>
                        <p className="text-[11px] text-slate-400">Escolha até {group.max_quantity} complementos</p>
                      </div>
                      {group.free_quantity > 0 && (
                        <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                          {group.free_quantity}º GRÁTIS
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 pt-1">
                      {group.options.map((opt) => {
                        const qty = customizerSelectedOptions[opt.id] || 0
                        return (
                          <div
                            key={opt.id}
                            className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                          >
                            <div>
                              <p className="text-xs font-medium text-slate-200">{opt.name}</p>
                              <p className="text-[11px] text-amber-400 font-bold">
                                {opt.price > 0 ? `+ ${formatCurrency(opt.price)}` : 'Grátis'}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-[#0E141E] p-1">
                              <button
                                type="button"
                                onClick={() => {
                                  if (qty > 0) {
                                    setCustomizerSelectedOptions((prev) => ({ ...prev, [opt.id]: qty - 1 }))
                                  }
                                }}
                                className="flex h-6 w-6 items-center justify-center rounded-full text-slate-400 hover:text-white cursor-pointer"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-4 text-center text-xs font-bold text-white">{qty}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setCustomizerSelectedOptions((prev) => ({ ...prev, [opt.id]: qty + 1 }))
                                }}
                                className="flex h-6 w-6 items-center justify-center rounded-full text-amber-400 hover:text-amber-300 cursor-pointer"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}

                {/* Observações para a Cozinha */}
                <div className="space-y-2">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-amber-400">
                    Observações para a Cozinha (Opcional):
                  </label>
                  <textarea
                    rows={2}
                    value={customizerObservation}
                    onChange={(e) => setCustomizerObservation(e.target.value)}
                    placeholder="Ex: Molho servido à parte, sem sal adicional..."
                    className="w-full rounded-xl border border-white/10 bg-[#161C26] p-3 text-xs text-white placeholder-slate-500 outline-none focus:border-[#d97707]"
                  />
                </div>
              </div>

              {/* Rodapé Fixo */}
              <div className="p-4 border-t border-white/10 bg-[#0E141E] flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-[#161C26] p-1">
                  <button
                    type="button"
                    onClick={() => setCustomizerQuantity((q) => Math.max(1, q - 1))}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:text-white cursor-pointer"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-5 text-center text-sm font-bold text-white">{customizerQuantity}</span>
                  <button
                    type="button"
                    onClick={() => setCustomizerQuantity((q) => q + 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-amber-400 hover:text-amber-300 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleCustomizerConfirm}
                  className="flex-1 rounded-2xl bg-gradient-to-r from-[#d97707] to-[#ee9800] py-3 text-xs font-extrabold text-slate-950 shadow-lg hover:brightness-110 active:scale-95 transition-all text-center cursor-pointer"
                >
                  Adicionar ao Pedido • {formatCurrency(customizingProduct.price * customizerQuantity)}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------- */}
      {/* 10. MODAL DE CHECKOUT & RASTREIO (PROTÓTIPOS 1 E 4) */}
      {/* ------------------------------------------------------------- */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="max-w-md border border-white/10 bg-[#0E141E] text-white p-6 overflow-hidden rounded-3xl shadow-2xl">
          {checkoutStep < 4 ? (
            <div className="space-y-6">
              {/* Header do Modal */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <span className="text-[10px] font-bold tracking-widest text-[#ffb77d] uppercase">
                    Marujo Gastro Bar
                  </span>
                  <DialogTitle className="text-xl font-bold font-playfair text-white">
                    Finalizar Pedido
                  </DialogTitle>
                </div>
                <span className="rounded-full bg-[#161C26] border border-amber-500/30 px-3 py-1 text-[11px] font-bold text-amber-300">
                  Etapa {checkoutStep} de 3 • Pagamento Seguro
                </span>
              </div>

              {/* Wizard Steps */}
              {checkoutStep === 1 && (
                <div className="space-y-4">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                    Seus Dados de Contato
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400">Seu Nome</label>
                      <input
                        type="text"
                        placeholder="Ex: Thomás Furtado"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-white/10 bg-[#161C26] px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#d97707]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-400">WhatsApp (com DDD)</label>
                      <input
                        type="text"
                        placeholder="(12) 99219-3643"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-white/10 bg-[#161C26] px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#d97707]"
                      />
                    </div>
                    <div className="pt-2">
                      <label className="text-[11px] font-bold text-slate-400">Como prefere receber?</label>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setFulfillmentType('DELIVERY')}
                          className={`rounded-xl p-3 text-xs font-bold border transition-all cursor-pointer ${
                            fulfillmentType === 'DELIVERY'
                              ? 'border-[#d97707] bg-[#161C26] text-amber-300'
                              : 'border-white/10 bg-[#0E141E] text-slate-400'
                          }`}
                        >
                          🛵 Entrega (+ R$ 5,00)
                        </button>
                        <button
                          type="button"
                          onClick={() => setFulfillmentType('TAKEOUT')}
                          className={`rounded-xl p-3 text-xs font-bold border transition-all cursor-pointer ${
                            fulfillmentType === 'TAKEOUT'
                              ? 'border-[#d97707] bg-[#161C26] text-amber-300'
                              : 'border-white/10 bg-[#0E141E] text-slate-400'
                          }`}
                        >
                          🥡 Retirada na Marina
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!customerName || !customerPhone}
                    onClick={() => setCheckoutStep(fulfillmentType === 'DELIVERY' ? 2 : 3)}
                    className="w-full mt-4 rounded-xl bg-gradient-to-r from-[#d97707] to-[#ee9800] py-3 text-xs font-extrabold text-slate-950 disabled:opacity-40 cursor-pointer"
                  >
                    Continuar
                  </button>
                </div>
              )}

              {/* Etapa 2: Endereço (se delivery) */}
              {checkoutStep === 2 && (
                <div className="space-y-4">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                    Endereço de Entrega
                  </h3>
                  <div className="space-y-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400">Rua / Avenida</label>
                      <input
                        type="text"
                        placeholder="Ex: Av. Giuseppe Carmino Aulicino"
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-white/10 bg-[#161C26] px-3.5 py-2 text-xs text-white outline-none focus:border-[#d97707]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-bold text-slate-400">Número</label>
                        <input
                          type="text"
                          placeholder="1000"
                          value={number}
                          onChange={(e) => setNumber(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-white/10 bg-[#161C26] px-3.5 py-2 text-xs text-white outline-none focus:border-[#d97707]"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-400">Bairro</label>
                        <input
                          type="text"
                          placeholder="Balneário Copacabana"
                          value={neighborhood}
                          onChange={(e) => setNeighborhood(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-white/10 bg-[#161C26] px-3.5 py-2 text-xs text-white outline-none focus:border-[#d97707]"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-bold text-slate-400">Complemento (Apto, Marina)</label>
                        <input
                          type="text"
                          placeholder="Ex: Bloco B / Pier 3"
                          value={complement}
                          onChange={(e) => setComplement(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-white/10 bg-[#161C26] px-3.5 py-2 text-xs text-white outline-none focus:border-[#d97707]"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-400">Cidade / UF</label>
                        <input
                          type="text"
                          value={`${city} - ${state}`}
                          onChange={(e) => {
                            const [c, s] = e.target.value.split('-')
                            if (c) setCity(c.trim())
                            if (s) setState(s.trim())
                          }}
                          className="mt-1 w-full rounded-xl border border-white/10 bg-[#161C26] px-3.5 py-2 text-xs text-white outline-none focus:border-[#d97707]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setCheckoutStep(1)}
                      className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-slate-400 cursor-pointer"
                    >
                      Voltar
                    </button>
                    <button
                      type="button"
                      disabled={!street || !number || !neighborhood}
                      onClick={() => setCheckoutStep(3)}
                      className="flex-1 rounded-xl bg-gradient-to-r from-[#d97707] to-[#ee9800] py-3 text-xs font-extrabold text-slate-950 disabled:opacity-40 cursor-pointer"
                    >
                      Ir para Pagamento
                    </button>
                  </div>
                </div>
              )}

              {/* Etapa 3: Pagamento (com PIX QR Code idêntico ao protótipo) */}
              {checkoutStep === 3 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <Banknote className="h-4 w-4" /> Forma de Pagamento
                    </h3>
                    <span className="text-[11px] text-slate-400 italic">Selecione para concluir</span>
                  </div>

                  {/* Grid de Formas de Pagamento */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('PIX')}
                      className={`relative rounded-xl p-3 text-left border transition-all cursor-pointer ${
                        paymentMethod === 'PIX'
                          ? 'border-[#d97707] bg-[#161C26] shadow-[0_0_15px_rgba(217,119,7,0.25)]'
                          : 'border-white/10 bg-[#0E141E] text-slate-400'
                      }`}
                    >
                      <span className="absolute -top-2 right-2 rounded-full bg-gradient-to-r from-amber-600 to-amber-500 px-1.5 py-0.2 text-[8px] font-black text-slate-950 uppercase">
                        Aprovação Imediata
                      </span>
                      <p className="text-xs font-bold text-white flex items-center gap-1">⚡ Pix</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Pagamento instantâneo</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('CARD_DELIVERY')}
                      className={`rounded-xl p-3 text-left border transition-all cursor-pointer ${
                        paymentMethod === 'CARD_DELIVERY'
                          ? 'border-[#d97707] bg-[#161C26] text-amber-300'
                          : 'border-white/10 bg-[#0E141E] text-slate-400'
                      }`}
                    >
                      <p className="text-xs font-bold text-white">💳 Cartão na Entrega</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Débito ou Crédito</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('CARD_ONLINE')}
                      className={`rounded-xl p-3 text-left border transition-all cursor-pointer ${
                        paymentMethod === 'CARD_ONLINE'
                          ? 'border-[#d97707] bg-[#161C26] text-amber-300'
                          : 'border-white/10 bg-[#0E141E] text-slate-400'
                      }`}
                    >
                      <p className="text-xs font-bold text-white">💳 Cartão Online</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Pagar agora no app</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('CASH')}
                      className={`rounded-xl p-3 text-left border transition-all cursor-pointer ${
                        paymentMethod === 'CASH'
                          ? 'border-[#d97707] bg-[#161C26] text-amber-300'
                          : 'border-white/10 bg-[#0E141E] text-slate-400'
                      }`}
                    >
                      <p className="text-xs font-bold text-white">💵 Dinheiro</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Com opção de troco</p>
                    </button>
                  </div>

                  {/* Detalhes do Pix com QR Code */}
                  {paymentMethod === 'PIX' && (
                    <div className="rounded-2xl border border-white/10 bg-[#161C26] p-4 text-center space-y-3 shadow-inner">
                      <div className="flex items-center justify-between text-xs pb-2 border-b border-white/5">
                        <span className="font-serif italic text-amber-300">Chave Pix Oficial • Marujo Gastro Bar</span>
                        <span className="font-playfair font-extrabold text-[#ffb77d]">{formatCurrency(cartTotal)}</span>
                      </div>

                      {/* Caixa com QR Code */}
                      <div className="relative mx-auto my-2 flex h-48 w-48 items-center justify-center rounded-2xl border border-[#d97707]/30 bg-white p-2.5 shadow-2xl">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(dynamicPixCode || pixKey)}`}
                          alt="QR Code Pix"
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Abra o app do seu banco e escaneie o QR Code acima
                      </p>

                      {/* Botão Copia e Cola */}
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(dynamicPixCode || pixKey)
                            setPixCopied(true)
                            setTimeout(() => setPixCopied(false), 3000)
                          }}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#d97707] to-[#ee9800] py-2.5 text-xs font-extrabold text-slate-950 shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                        >
                          <Copy className="h-4 w-4" />
                          <span>{pixCopied ? 'Código Pix Copiado!' : 'Copiar Chave Pix'}</span>
                        </button>
                        <p className="text-[10px] text-amber-300/80 mt-1.5 flex items-center justify-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>Código válido por {formatTimer(pixTimer)}</span>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Resumo Financeiro */}
                  <div className="rounded-xl border border-white/5 bg-[#161C26]/60 p-3 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Subtotal dos itens</span>
                      <span className="text-white">{formatCurrency(cartSubtotal)}</span>
                    </div>
                    {fulfillmentType === 'DELIVERY' && (
                      <div className="flex justify-between text-slate-400">
                        <span>Taxa de Entrega Marítima Expressa</span>
                        <span className="text-white">{formatCurrency(deliveryFee)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-bold pt-2 border-t border-white/5">
                      <span className="text-white">Total a Pagar</span>
                      <span className="text-lg font-playfair font-extrabold text-[#ffb77d]">
                        {formatCurrency(cartTotal)}
                      </span>
                    </div>
                  </div>

                  {/* Botão Confirmar Pedido */}
                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={isSubmittingOrder}
                      onClick={handleConfirmOrder}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#d97707] to-[#ee9800] py-3.5 text-xs font-extrabold text-slate-950 shadow-xl hover:brightness-110 active:scale-98 transition-all cursor-pointer"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{isSubmittingOrder ? 'Processando...' : 'Confirmar e Enviar Pedido via WhatsApp'}</span>
                      <span>🚀</span>
                    </button>
                    <p className="text-[10px] text-center text-slate-500 mt-2 flex items-center justify-center gap-1">
                      <span>🔒</span> Ambiente de alta gastronomia seguro e autenticado
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ------------------------------------------------------------- */
            /* 11. TELA DE RASTREAMENTO NÁUTICO (PROTÓTIPO 4) */
            /* ------------------------------------------------------------- */
            <div className="space-y-6 text-center">
              <div>
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-amber-500/80 bg-black/60 shadow-xl shadow-amber-950/40 mb-3">
                  <img
                    src="/assets/marujo/novo_logo2-removebg-preview.png"
                    alt="Marujo Crest"
                    className="h-10 w-10 object-contain"
                  />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold font-playfair text-white">
                  Parabéns pela Escolha Gastronômica!
                </h3>
                <p className="mt-1 text-xs text-slate-300">
                  Seu pedido foi ancorado em nossa cozinha e está sob os cuidados do <strong className="text-amber-300">Chef executivo</strong>.
                </p>
              </div>

              {/* Card de Acompanhamento Náutico */}
              <div className="rounded-2xl border border-[#d97707]/30 bg-[#161C26] p-4 text-left space-y-4 shadow-xl">
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <span className="text-xs font-extrabold font-playfair uppercase text-amber-300 flex items-center gap-1.5">
                    <span className="h-3 w-1 rounded-full bg-[#d97707]" />
                    Acompanhamento Náutico #{createdDisplayId || '007'}
                  </span>
                  <span className="rounded-full bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                    Em Tempo Real
                  </span>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-white">Pedido Recebido (Ancorado)</p>
                      <p className="text-[11px] text-slate-400">Comanda validada e impressa no posto culinário.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="h-4 w-4 rounded-full bg-amber-500/20 border border-amber-500 text-amber-400 flex items-center justify-center text-[10px] shrink-0 mt-0.5">●</span>
                    <div>
                      <p className="font-bold text-amber-300">Preparando na Cozinha (Ao Fogo do Chef)</p>
                      <p className="text-[11px] text-slate-400">Os mestres artesãos estão lapidando seu prato especial.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 opacity-60">
                    <span className="text-xs shrink-0 mt-0.5">⛵</span>
                    <div>
                      <p className="font-bold text-slate-300">Saiu para Entrega (Navegando até Você)</p>
                      <p className="text-[11px] text-slate-500">Previsão estimada: 25 - 35 min.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 opacity-40">
                    <span className="text-xs shrink-0 mt-0.5">⚓</span>
                    <div>
                      <p className="font-bold text-slate-400">Pedido Entregue (No Porto)</p>
                      <p className="text-[11px] text-slate-500">Desfrute da alta gastronomia marítima!</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Resumo das Informações */}
              <div className="rounded-2xl border border-white/5 bg-[#161C26]/70 p-4 text-left space-y-2 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <span className="font-bold uppercase tracking-wider text-[#ffb77d]">Resumo das Informações</span>
                  <span className="text-slate-400">#{createdDisplayId}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Cliente Convidado:</span>
                  <span className="font-bold text-white">{customerName || 'Thomás'}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Contato Direto:</span>
                  <span className="font-medium text-amber-300">{customerPhone || '(12) 99219-3643'}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Modalidade:</span>
                  <span className="font-medium text-white">{fulfillmentType === 'DELIVERY' ? 'Entrega Expressa Gourmet' : 'Retirada na Marina'}</span>
                </div>
                {fulfillmentType === 'DELIVERY' && street && (
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Endereço:</span>
                    <span className="font-medium text-white text-right line-clamp-1">{street}, {number} - {neighborhood}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-300 pt-1 border-t border-white/5">
                  <span className="text-slate-400">Total do Pedido:</span>
                  <span className="font-extrabold font-playfair text-[#ffb77d] text-base">
                    {formatCurrency(lastOrderTotal || cartTotal)}
                  </span>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="space-y-2 pt-2">
                {lastOrderText && (
                  <button
                    type="button"
                    onClick={() => {
                      const url = `https://wa.me/${toWhatsAppNumber(profile?.whatsappNumber || '12992193644')}?text=${encodeURIComponent(lastOrderText)}`
                      window.open(url, '_blank')
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 text-xs font-extrabold text-white shadow-lg hover:bg-emerald-500 transition-all cursor-pointer"
                  >
                    <span>💬 Enviar Comprovante no WhatsApp</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsCheckoutOpen(false)
                    setCheckoutStep(1)
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[#161C26] py-3 text-xs font-bold text-slate-300 hover:text-white transition-all cursor-pointer"
                >
                  <span>⚓ Voltar ao Cardápio Marujo</span>
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
