import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  FileText,
  Info,
  MapPin,
  Minus,
  Plus,
  QrCode,
  Search,
  ShoppingBag,
  Store,
  Truck,
  User,
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/axios'
import { ItemCustomizerDialog, ProductItem, CustomizedItemResult } from './components/ItemCustomizerDialog'

interface GenericMenuProps {
  tenantName: string
  profile?: any
}

interface Product {
  id: string
  name: string
  price: number
  description: string | null
  measureUnit: string
  category: string
  imageUrl?: string
  is_priority?: boolean
  subcategory?: {
    id: string
    name: string
    accepts_fractions: boolean
    max_fractions: number
  } | null
  complementGroups?: {
    id: string
    name: string
    min_quantity: number
    max_quantity: number
    free_quantity: number
    options: {
      id: string
      name: string
      price: number
    }[]
  }[]
}

interface CartItem {
  id: string
  product: Product
  displayName?: string
  unitPrice: number
  quantity: number
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

const DAYS_OF_WEEK = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
]

async function fetchMenu() {
  try {
    const response = await api.get<any>('/public/menu')
    if (Array.isArray(response.data)) {
      return response.data
    }
    if (response.data && Array.isArray(response.data.products)) {
      return response.data.products
    }
    return []
  } catch (error) {
    console.error('Erro ao buscar cardápio público:', error)
    return []
  }
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0)
}

// Gerador Oficial do Padrão BR Code Pix BACEN (EMV QRCPS-MPM) com Valor Exato
function crc16(str: string): string {
  let crc = 0xffff
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021
      } else {
        crc = crc << 1
      }
      crc = crc & 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

// Normalizador de Chaves Pix segundo o padrão do Banco Central (BACEN / DICT)
function normalizePixKey(key: string): string {
  if (!key) return ''
  const clean = key.trim()

  // 1. E-mail: minúsculo
  if (clean.includes('@')) {
    return clean.toLowerCase()
  }

  // 2. Chave Aleatória (EVP / UUID): 36 caracteres
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      clean,
    )
  ) {
    return clean.toLowerCase()
  }

  const digitsOnly = clean.replace(/\D/g, '')

  // 3. Telefone sem código de país (+55): ex: 12992193644 -> +5512992193644
  if (digitsOnly.length === 10 || digitsOnly.length === 11) {
    return `+55${digitsOnly}`
  }

  // 4. Telefone com 55 mas sem o sinal de +: ex: 5512992193644 -> +5512992193644
  if (
    (digitsOnly.length === 12 || digitsOnly.length === 13) &&
    digitsOnly.startsWith('55') &&
    !clean.startsWith('+')
  ) {
    return `+${digitsOnly}`
  }

  // 5. CPF (11 dig) ou CNPJ (14 dig)
  if (digitsOnly.length === 11 || digitsOnly.length === 14) {
    return digitsOnly
  }

  return clean
}

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

  const cleanKey = normalizePixKey(pixKey)
  const rawName = (merchantName || 'METRICS LOJA')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .toUpperCase()
  const cleanName = (rawName || 'LOJA').substring(0, 25)
  const rawCity = (merchantCity || 'SAO PAULO')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .toUpperCase()
  const cleanCity = (rawCity || 'SAO PAULO').substring(0, 15)
  const formattedAmount = (amount || 0).toFixed(2)

  const merchantAccountInfo =
    '0014br.gov.bcb.pix' +
    '01' +
    cleanKey.length.toString().padStart(2, '0') +
    cleanKey

  const payload =
    '000201' +
    '26' +
    merchantAccountInfo.length.toString().padStart(2, '0') +
    merchantAccountInfo +
    '52040000' +
    '5303986' +
    '54' +
    formattedAmount.length.toString().padStart(2, '0') +
    formattedAmount +
    '5802BR' +
    '59' +
    cleanName.length.toString().padStart(2, '0') +
    cleanName +
    '60' +
    cleanCity.length.toString().padStart(2, '0') +
    cleanCity +
    '62070503***' +
    '6304'

  const checksum = crc16(payload)
  return payload + checksum
}

// Utilitário para verificar se a loja está aberta no momento (suporte a múltiplos turnos por dia)
function checkIsOpen(profile: any) {
  if (!profile) return { isOpen: true, reason: 'Aberto' }
  if (profile.isOpenManual === false) {
    return { isOpen: false, reason: 'Pausa manual ativada' }
  }

  const now = new Date()
  const currentDayOfWeek = now.getDay() // 0 = Dom, 1 = Seg...
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

  // Verifica se o horário atual está dentro de algum dos turnos ativos hoje
  const activeShift = todaySchedules.find((schedule: any) => {
    const { openTime, closeTime } = schedule
    if (!openTime || !closeTime) return false
    if (closeTime > openTime) {
      return currentTime >= openTime && currentTime <= closeTime
    } else {
      // Turno que vira a madrugada (ex: 18:00 às 02:00)
      return currentTime >= openTime || currentTime <= closeTime
    }
  })

  if (activeShift) {
    return { isOpen: true, reason: 'Aberto' }
  }

  // Se não está aberto agora, busca o próximo turno de hoje (se houver)
  const upcomingToday = todaySchedules
    .filter((s: any) => s.openTime && s.openTime > currentTime)
    .sort((a: any, b: any) => a.openTime.localeCompare(b.openTime))[0]

  if (upcomingToday) {
    return { isOpen: false, reason: `Fechado (Abre às ${upcomingToday.openTime})` }
  }

  return { isOpen: false, reason: 'Fechado no momento' }
}

// Subcomponente: Dynamic Hero Background (Preenchimento Absoluto)
const DynamicHero = ({ profile }: { profile: any }) => {
  if (profile?.banner_url) {
    return (
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={profile.banner_url}
          className="h-full w-full object-cover object-center"
          alt="Banner do Estabelecimento"
        />
      </div>
    )
  }

  // Generative Ultra-Premium Animated Mesh Banner (Modo Cor Sem Imagem)
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ backgroundColor: 'var(--primary-color, #FF5722)' }}
    >
      {/* Sobreposição de Gradientes Radiais Mesh */}
      <div
        className="absolute inset-0 opacity-50 mix-blend-overlay"
        style={{
          backgroundImage: `
            radial-gradient(circle at 15% 20%, rgba(255, 255, 255, 0.95) 0%, transparent 45%),
            radial-gradient(circle at 85% 80%, rgba(0, 0, 0, 0.8) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.3) 0%, transparent 60%)
          `,
        }}
      />

      {/* Padrão Geométrico Sutil */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:28px_28px] opacity-15" />

      {/* Orbes de Luz Flutuantes Animadas (Bokeh) */}
      <motion.div
        animate={{
          scale: [1, 1.25, 1],
          x: [0, 25, 0],
          y: [0, -15, 0],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/30 blur-3xl"
      />

      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          x: [0, -30, 0],
          y: [0, 20, 0],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute -bottom-24 -left-20 h-96 w-96 rounded-full bg-black/40 blur-3xl"
      />
    </div>
  )
}

export default function GenericMenu({ tenantName, profile }: GenericMenuProps) {
  const [cart, setCart] = useState<Record<string, CartItem>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [customizingProduct, setCustomizingProduct] = useState<ProductItem | null>(null)
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const [isCartModalOpen, setIsCartModalOpen] = useState(false)
  const [isStoreInfoOpen, setIsStoreInfoOpen] = useState(false)

  // Estados do Modal de Checkout Robusto (iFood / Anota AI / Marujo Standard)
  const [isCheckoutStepOpen, setIsCheckoutStepOpen] = useState(false)
  const [checkoutWizardStep, setCheckoutWizardStep] = useState<1 | 2 | 3 | 4>(1)
  const [lastOrderText, setLastOrderText] = useState('')
  const [fulfillmentType, setFulfillmentType] = useState<
    'DELIVERY' | 'TAKEOUT'
  >('DELIVERY')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [street, setStreet] = useState('')
  const [number, setNumber] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zipcode, setZipcode] = useState('')
  const [complement, setComplement] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<
    'PIX' | 'CREDIT' | 'DEBIT' | 'CASH'
  >('PIX')
  const [changeAmount, setChangeAmount] = useState('')
  const [isSearchingCEPCheckout, setIsSearchingCEPCheckout] = useState(false)
  const [isCopiedPix, setIsCopiedPix] = useState(false)

  // Estados de Busca do Cliente Marujo & Múltiplos Endereços
  const [clientFound, setClientFound] = useState(false)
  const [isLoadingPhone, setIsLoadingPhone] = useState(false)
  const [savedAddresses, setSavedAddresses] = useState<any[]>([])
  const [addressReadonly, setAddressReadonly] = useState(false)
  const [isNewAddress, setIsNewAddress] = useState(false)
  const [isAddressesModalOpen, setIsAddressesModalOpen] = useState(false)
  const [phoneSearchToast, setPhoneSearchToast] = useState<{
    type: 'success' | 'info' | 'error'
    message: string
  } | null>(null)

  const formatPhone = (val: string) => {
    const v = val.replace(/\D/g, '').substring(0, 11)
    if (v.length > 10) {
      return v.replace(/^(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
    } else if (v.length > 6) {
      return v.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3')
    } else if (v.length > 2) {
      return v.replace(/^(\d{2})(\d{0,5})/, '($1) $2')
    } else if (v.length > 0) {
      return v.replace(/^(\d{0,2})/, '($1')
    }
    return v
  }

  const formatCep = (val: string) => {
    const v = val.replace(/\D/g, '').substring(0, 8)
    if (v.length > 5) {
      return v.replace(/^(\d{5})(\d{1,3})/, '$1-$2')
    }
    return v
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value)
    setCustomerPhone(formatted)
    const raw = formatted.replace(/\D/g, '')
    if (raw.length >= 10) {
      handlePhoneSearch(raw)
    }
  }

  const handlePhoneSearch = async (overrideRawPhone?: string) => {
    const rawPhone = (overrideRawPhone || customerPhone).replace(/\D/g, '')
    if (rawPhone.length < 10) return

    setIsLoadingPhone(true)
    setPhoneSearchToast(null)

    try {
      const res = await api.get(`/public/clients/phone/${rawPhone}`)
      if (res.data && res.data.client) {
        const client = res.data.client
        setCustomerName(client.name || '')
        setClientFound(true)

        if (client.addresses && client.addresses.length > 0) {
          setSavedAddresses(client.addresses)
          const addr = client.addresses[0]
          setZipcode(
            addr.zipcode
              ? formatCep(addr.zipcode.toString().padStart(8, '0'))
              : '',
          )
          setStreet(addr.street || '')
          setNumber(addr.number ? addr.number.toString() : '')
          setNeighborhood(addr.neighborhood || '')
          setCity(addr.city || '')
          setState(addr.state || '')
          setAddressReadonly(true)
          setIsNewAddress(false)
        } else {
          setSavedAddresses([])
          setAddressReadonly(false)
          setIsNewAddress(true)
        }

        setPhoneSearchToast({
          type: 'success',
          message: `Cliente ${client.name || ''} localizado!`,
        })
      } else {
        throw new Error('Cliente não encontrado')
      }
    } catch {
      setClientFound(false)
      setSavedAddresses([])
      setAddressReadonly(false)
      setIsNewAddress(true)
      setCustomerName('')
      setZipcode('')
      setStreet('')
      setNumber('')
      setNeighborhood('')
      setCity('')
      setState('')

      setPhoneSearchToast({
        type: 'info',
        message:
          'Cliente não cadastrado. Preencha seus dados abaixo para se cadastrar!',
      })

      // Pula para o campo Nome automaticamente
      setTimeout(() => {
        document.getElementById('name-input')?.focus()
      }, 150)
    } finally {
      setIsLoadingPhone(false)
      setTimeout(() => setPhoneSearchToast(null), 4000)
    }
  }

  const handleSelectSavedAddress = (addr: any) => {
    setZipcode(
      addr.zipcode ? formatCep(addr.zipcode.toString().padStart(8, '0')) : '',
    )
    setStreet(addr.street || '')
    setNumber(addr.number ? addr.number.toString() : '')
    setNeighborhood(addr.neighborhood || '')
    setCity(addr.city || '')
    setState(addr.state || '')
    setAddressReadonly(true)
    setIsNewAddress(false)
    setIsAddressesModalOpen(false)
  }

  const handleNewAddress = () => {
    setAddressReadonly(false)
    setIsNewAddress(true)
    setZipcode('')
    setStreet('')
    setNumber('')
    setNeighborhood('')
    setCity('')
    setState('')
    setTimeout(() => {
      document.getElementById('zipcode-input')?.focus()
    }, 100)
  }

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawCep = e.target.value.replace(/\D/g, '')
    setZipcode(formatCep(rawCep))

    if (rawCep.length === 8) {
      setIsSearchingCEPCheckout(true)
      try {
        const res = await fetch(`https://brasilapi.com.br/api/cep/v1/${rawCep}`)
        if (!res.ok) throw new Error('CEP não encontrado')

        const data = await res.json()
        setStreet(data.street || '')
        const matched = matchNeighborhoodWithConfig(data.neighborhood || '')
        setNeighborhood(matched)
        setCity(data.city || '')
        setState(data.state || '')

        setTimeout(() => {
          document.getElementById('number-input')?.focus()
        }, 100)
      } catch (err) {
        console.error(err)
      } finally {
        setIsSearchingCEPCheckout(false)
      }
    }
  }

  const handleCopyPixKey = (key: string) => {
    navigator.clipboard.writeText(key)
    setIsCopiedPix(true)
    setTimeout(() => setIsCopiedPix(false), 3000)
  }

  const { data: products, isLoading } = useQuery({
    queryKey: ['public-menu'],
    queryFn: fetchMenu,
    staleTime: 1000 * 60 * 5,
  })

  const storeStatus = useMemo(() => checkIsOpen(profile), [profile])

  const normalizeText = (text: string) => {
    return (text || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
  }

  const availableNeighborhoodsList = useMemo(() => {
    const sectors = profile?.deliverySectors || []
    const fromSectors = sectors.flatMap((s: any) => s.neighborhoods || [])
    const fromAvailable = profile?.availableNeighborhoods || []
    const unique = Array.from(
      new Set([...fromSectors, ...fromAvailable]),
    ).filter(Boolean) as string[]
    return unique.sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [profile])

  const matchNeighborhoodWithConfig = (cepNeighborhood: string) => {
    if (!cepNeighborhood || !availableNeighborhoodsList.length) {
      return cepNeighborhood || ''
    }
    const target = normalizeText(cepNeighborhood)
    const exact = availableNeighborhoodsList.find(
      (n) => normalizeText(n) === target,
    )
    if (exact) return exact

    const partial = availableNeighborhoodsList.find((n) => {
      const norm = normalizeText(n)
      return norm.includes(target) || target.includes(norm)
    })
    if (partial) return partial

    return cepNeighborhood
  }

  const rawProducts = useMemo(() => {
    return Array.isArray(products) ? products : []
  }, [products])

  const categories = useMemo(() => {
    if (!rawProducts.length) return ['All']
    const cats = Array.from(new Set(rawProducts.map((p) => p.category || 'Geral')))
    return ['All', ...cats]
  }, [rawProducts])

  useEffect(() => {
    if (categories.length > 1 && activeCategory === 'All') {
      setActiveCategory('All')
    }
  }, [categories, activeCategory])

  const filteredProducts = useMemo(() => {
    let filtered = rawProducts

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (p) =>
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.description && p.description.toLowerCase().includes(q)),
      )
    } else if (activeCategory !== 'All') {
      filtered = filtered.filter(
        (p) => (p.category || 'Geral') === activeCategory,
      )
    }
    return filtered
  }, [rawProducts, searchQuery, activeCategory])

  const groupedProducts = useMemo(() => {
    return filteredProducts.reduce(
      (acc, product) => {
        const cat = product.category || 'Geral'
        if (!acc[cat]) acc[cat] = []
        acc[cat].push(product)
        return acc
      },
      {} as Record<string, Product[]>,
    )
  }, [filteredProducts])

  const handleProductClick = (product: Product) => {
    const hasComplements =
      product.complementGroups && product.complementGroups.length > 0
    const acceptsFractions = Boolean(product.subcategory?.accepts_fractions)

    if (hasComplements || acceptsFractions) {
      setCustomizingProduct(product as ProductItem)
      setIsCustomizerOpen(true)
    } else {
      handleAddToCart(product)
    }
  }

  const handleConfirmCustomizedItem = (result: CustomizedItemResult) => {
    setCart((prev) => {
      const existing = prev[result.customKey]
      if (existing) {
        return {
          ...prev,
          [result.customKey]: {
            ...existing,
            quantity: existing.quantity + result.quantity,
            observation: result.observation || existing.observation,
          },
        }
      }
      return {
        ...prev,
        [result.customKey]: {
          id: result.customKey,
          product: result.product as Product,
          displayName: result.displayName,
          unitPrice: result.unitPrice,
          quantity: result.quantity,
          observation: result.observation,
          fractions: result.fractions,
          selectedOptions: result.selectedOptions,
        },
      }
    })
  }

  const handleAddToCart = (product: Product, obs?: string) => {
    const customKey = product.id
    setCart((prev) => {
      const existing = prev[customKey]
      if (existing) {
        return {
          ...prev,
          [customKey]: {
            ...existing,
            quantity: existing.quantity + 1,
            observation: obs !== undefined ? obs : existing.observation,
          },
        }
      }
      return {
        ...prev,
        [customKey]: {
          id: customKey,
          product,
          displayName: product.name,
          unitPrice: product.price,
          quantity: 1,
          observation: obs || '',
        },
      }
    })
  }

  const handleIncrementCartItem = (cartItemId: string) => {
    setCart((prev) => {
      const existing = prev[cartItemId]
      if (!existing) return prev
      return {
        ...prev,
        [cartItemId]: {
          ...existing,
          quantity: existing.quantity + 1,
        },
      }
    })
  }

  const handleRemoveFromCart = (cartItemId: string) => {
    setCart((prev) => {
      const existing = prev[cartItemId]
      if (!existing) return prev
      if (existing.quantity <= 1) {
        const newCart = { ...prev }
        delete newCart[cartItemId]
        return newCart
      }
      return {
        ...prev,
        [cartItemId]: { ...existing, quantity: existing.quantity - 1 },
      }
    })
  }

  const handleUpdateItemObs = (cartItemId: string, obs: string) => {
    setCart((prev) => {
      const existing = prev[cartItemId]
      if (!existing) return prev
      return { ...prev, [cartItemId]: { ...existing, observation: obs } }
    })
  }

  const getProductCartCount = (productId: string) => {
    return Object.values(cart)
      .filter((item) => item.product.id === productId)
      .reduce((sum, item) => sum + item.quantity, 0)
  }

  const resolvedDeliveryFee = useMemo(() => {
    if (fulfillmentType !== 'DELIVERY') return 0

    if (neighborhood && neighborhood.trim()) {
      const cleanNeighborhood = neighborhood.trim().toLowerCase()
      const sectors = profile?.deliverySectors || []
      const foundSector = sectors.find((s: any) =>
        (s.neighborhoods || []).some(
          (n: string) => n.trim().toLowerCase() === cleanNeighborhood,
        ),
      )
      if (foundSector) {
        return Number(foundSector.fee) || 0
      }
    }

    return Number(profile?.deliveryFee || 0)
  }, [fulfillmentType, neighborhood, profile])

  const cartItems = Object.values(cart)
  const cartSubtotal = cartItems.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  )
  const deliveryFee = resolvedDeliveryFee
  const cartTotal = cartSubtotal + deliveryFee
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)

  const minOrderValue = Number(profile?.minOrderValue || 0)
  const isMinOrderSatisfied = cartSubtotal >= minOrderValue

  const pixBRCodePayload = useMemo(() => {
    const key = profile?.pixKey || profile?.whatsappNumber || ''
    if (!key) return ''
    return generatePixBRCode({
      pixKey: key,
      merchantName: profile?.tradeName || tenantName,
      merchantCity: profile?.city || 'SAO PAULO',
      amount: cartTotal,
    })
  }, [profile, tenantName, cartTotal])

  const handleOpenCheckout = () => {
    if (!storeStatus.isOpen) {
      alert(`O estabelecimento está fechado no momento: ${storeStatus.reason}`)
      return
    }
    if (!isMinOrderSatisfied) {
      alert(`O valor mínimo para pedido é de ${formatCurrency(minOrderValue)}.`)
      return
    }
    setCheckoutWizardStep(1)
    setIsCheckoutStepOpen(true)
  }

  const registerClientInBackend = async () => {
    if (!customerName.trim() || !customerPhone.trim()) return
    try {
      const rawPhone = customerPhone.replace(/\D/g, '')
      const rawZipcode = zipcode.replace(/\D/g, '')

      const payload = {
        name: customerName,
        phone: rawPhone,
        street: fulfillmentType === 'DELIVERY' ? street : 'Retirada no Balcão',
        number: fulfillmentType === 'DELIVERY' ? number || '0' : '0',
        neighborhood: fulfillmentType === 'DELIVERY' ? neighborhood : 'Balcão',
        city:
          fulfillmentType === 'DELIVERY'
            ? city || profile?.city || 'Local'
            : profile?.city || 'Local',
        state:
          fulfillmentType === 'DELIVERY'
            ? state || profile?.state || 'SP'
            : profile?.state || 'SP',
        zipcode:
          fulfillmentType === 'DELIVERY' && rawZipcode ? rawZipcode : undefined,
        complement: complement || undefined,
        isNewAddress,
      }

      const res = await api.post('/public/checkout/client', payload)
      if (res.data && res.data.client) {
        setClientFound(true)
        if (res.data.client.addresses) {
          setSavedAddresses(res.data.client.addresses)
        }
      }
    } catch (clientErr) {
      console.warn('Aviso ao sincronizar cliente com backend:', clientErr)
    }
  }

  const handleFinalizeOrder = async () => {
    if (!customerName.trim() || !customerPhone.trim()) {
      alert('Por favor, preencha seu nome e WhatsApp.')
      setCheckoutWizardStep(2)
      return
    }

    if (
      fulfillmentType === 'DELIVERY' &&
      (!street.trim() || !number.trim() || !neighborhood.trim())
    ) {
      alert('Por favor, preencha o endereço completo de entrega.')
      setCheckoutWizardStep(2)
      return
    }

    try {
      // 1. Registra dados do cliente no backend via API publica
      await registerClientInBackend()

      // 2. Envia pedido para fila de sincronização do PDV
      try {
        await api.post('/public/orders', {
          client_name: customerName,
          client_phone: customerPhone,
          street: street || 'Retirada no Balcão',
          number: number || 'S/N',
          neighborhood: neighborhood || 'Geral',
          city: city || 'Local',
          state: state || 'UF',
          zipcode: zipcode || undefined,
          complement: complement || undefined,
          payment_method_name:
            paymentMethod === 'PIX'
              ? 'PIX'
              : paymentMethod === 'CREDIT'
                ? 'Cartão de Crédito'
                : paymentMethod === 'DEBIT'
                  ? 'Cartão de Débito'
                  : 'Dinheiro',
          change_for: changeAmount ? Number(changeAmount) : undefined,
          delivery_fee: fulfillmentType === 'DELIVERY' ? resolvedDeliveryFee : 0,
          total_amount: cartTotal,
          notes: `${fulfillmentType === 'DELIVERY' ? 'Entrega (Delivery)' : 'Retirada no Balcão'}`,
          items: cartItems.map((item) => ({
            product_id: item.product.id,
            name: item.displayName || item.product.name,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            notes: item.observation || undefined,
            complements: (item.selectedOptions || []).map((c) => ({
              name: c.optionName,
              price: c.price,
              quantity: c.quantity,
            })),
            fractions: (item.fractions || []).map((f) => ({
              product_id: item.product.id,
              name: f,
              fraction: 1 / Math.max(1, (item.fractions || []).length),
            })),
          })),
        })
      } catch (orderApiErr) {
        console.warn('Aviso: envio direto ao PDV falhou, continuando para WhatsApp:', orderApiErr)
      }

      // 3. Formata mensagem estruturada ultra-profissional para o WhatsApp
      const now = new Date()
      const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`
      const formattedTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

      let text = `🧾 *NOVO PEDIDO - ${(profile?.tradeName || tenantName).toUpperCase()}*\n`
      text += `📅 _${formattedDate} às ${formattedTime}_\n`
      text += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`
      text += `👤 *Cliente:* ${customerName}\n`
      text += `📱 *WhatsApp:* ${customerPhone}\n`
      text += `🛵 *Tipo:* ${
        fulfillmentType === 'DELIVERY'
          ? 'Entrega (Delivery)'
          : fulfillmentType === 'TAKEOUT'
            ? 'Retirada no Balcão'
            : 'Consumo no Local'
      }\n`

      if (fulfillmentType === 'DELIVERY') {
        text += `\n📍 *Endereço de Entrega:*\n`
        text += `> ${street}, ${number || 'S/N'}\n`
        if (complement) text += `> Complemento: ${complement}\n`
        text += `> ${neighborhood} - ${city || profile?.city || 'Local'}/${state || profile?.state || 'SP'}\n`
        if (zipcode) text += `> CEP: ${zipcode}\n`
      }

      text += `\n━━━━━━━━━━━━━━━━━━━━━━━━\n`
      text += `📋 *ITENS DO PEDIDO:*\n\n`

      cartItems.forEach((item) => {
        const itemTitle = item.displayName || item.product.name
        const itemTotal = item.unitPrice * item.quantity
        text += `▪️ *${item.quantity}x* ${itemTitle}\n`
        text += `   _${formatCurrency(itemTotal)}_\n`
        if (item.observation) {
          text += `   ↳ 💬 _Obs: ${item.observation}_\n`
        }
        if (item.selectedOptions && item.selectedOptions.length > 0) {
          item.selectedOptions.forEach((opt) => {
            text += `   ↳ ➕ ${opt.quantity > 1 ? `${opt.quantity}x ` : ''}${opt.optionName} (${formatCurrency(opt.price * opt.quantity)})\n`
          })
        }
        if (item.fractions && item.fractions.length > 0) {
          text += `   ↳ 🍕 Sabores: ${item.fractions.join(' / ')}\n`
        }
        text += `\n`
      })

      text += `━━━━━━━━━━━━━━━━━━━━━━━━\n`
      text += `💵 Subtotal: *${formatCurrency(cartSubtotal)}*\n`
      if (fulfillmentType === 'DELIVERY' && resolvedDeliveryFee > 0) {
        text += `🛵 Taxa de Entrega: *${formatCurrency(resolvedDeliveryFee)}*\n`
      } else if (fulfillmentType === 'DELIVERY') {
        text += `🛵 Taxa de Entrega: *Grátis*\n`
      }
      text += `💰 *TOTAL: ${formatCurrency(cartTotal)}*\n\n`

      if (paymentMethod === 'PIX') {
        text += `💳 *Forma de Pagamento:* Pix\n`
      } else if (paymentMethod === 'CREDIT') {
        text += `💳 *Forma de Pagamento:* Cartão de Crédito (na entrega)\n`
      } else if (paymentMethod === 'DEBIT') {
        text += `💳 *Forma de Pagamento:* Cartão de Débito (na entrega)\n`
      } else {
        const trocoNum = parseFloat((changeAmount || '0').replace(',', '.'))
        if (trocoNum > cartTotal) {
          const levarTroco = trocoNum - cartTotal
          text += `💳 *Forma de Pagamento:* Dinheiro\n`
          text += `💵 *Troco para:* ${formatCurrency(trocoNum)} _(Levar ${formatCurrency(levarTroco)} de troco)_\n`
        } else if (changeAmount) {
          text += `💳 *Forma de Pagamento:* Dinheiro (Troco para R$ ${changeAmount})\n`
        } else {
          text += `💳 *Forma de Pagamento:* Dinheiro (Sem troco)\n`
        }
      }

      text += `━━━━━━━━━━━━━━━━━━━━━━━━\n`
      text += `_✅ Pedido gerado via Cardápio Digital Metrics_`

      const targetPhone = (profile?.whatsappNumber || '').replace(/\D/g, '')
      const url = `https://wa.me/55${targetPhone}?text=${encodeURIComponent(text)}`
      window.open(url, '_blank')

      setLastOrderText(text)
      setCheckoutWizardStep(4)
    } catch (err) {
      console.error('Erro ao enviar pedido:', err)
      alert('Ocorreu um problema ao registrar seu pedido, tente novamente.')
    }
  }

  const handleFinishAndReset = () => {
    setCart({})
    setIsCheckoutStepOpen(false)
    setIsCartModalOpen(false)
    setCheckoutWizardStep(1)
    setLastOrderText('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const renderCartSection = () => (
    <div className="flex h-full flex-col bg-white overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 p-6">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          Seu Pedido
        </h2>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-[13px] font-bold text-slate-600">
          {cartCount} itens
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-6">
        {cartItems.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-slate-400">
            <ShoppingBag className="mb-4 h-16 w-16 opacity-20" />
            <p className="text-center font-medium">Sua sacola está vazia.</p>
            <p className="mt-1 text-[13px]">
              Adicione deliciosos itens ao seu pedido.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <AnimatePresence>
              {cartItems.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-slate-50/50 p-3.5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="text-[15px] font-bold leading-snug text-slate-800">
                        {item.displayName || item.product.name}
                      </h4>
                      <p
                        className="mt-0.5 text-[14px] font-black"
                        style={{ color: 'var(--primary-color)' }}
                      >
                        {formatCurrency(item.unitPrice * item.quantity)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-inner">
                      <button
                        onClick={() => handleRemoveFromCart(item.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-600 shadow-sm transition-transform active:scale-90"
                      >
                        <Minus className="h-4 w-4 stroke-[3]" />
                      </button>
                      <span className="w-6 text-center text-[14px] font-bold text-slate-800">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleIncrementCartItem(item.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-white shadow-sm transition-transform active:scale-90"
                        style={{ backgroundColor: 'var(--primary-color)' }}
                      >
                        <Plus className="h-4 w-4 stroke-[3]" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-1">
                    <Input
                      placeholder="Observação (ex: Sem cebola)..."
                      value={item.observation || ''}
                      onChange={(e) =>
                        handleUpdateItemObs(item.id, e.target.value)
                      }
                      className="h-8 bg-white/80 text-xs"
                    />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div className="shrink-0 space-y-4 border-t border-slate-100 bg-slate-50 p-6">
        {minOrderValue > 0 && (
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Pedido mínimo:</span>
            <span
              className={
                isMinOrderSatisfied
                  ? 'font-bold text-emerald-600'
                  : 'font-bold text-amber-600'
              }
            >
              {formatCurrency(minOrderValue)}
            </span>
          </div>
        )}

        <div className="flex items-end justify-between text-slate-900">
          <span className="text-[15px] font-bold uppercase tracking-wide text-slate-500">
            Subtotal
          </span>
          <span className="text-2xl font-black tracking-tight">
            {formatCurrency(cartSubtotal)}
          </span>
        </div>

        <button
          onClick={handleOpenCheckout}
          disabled={
            cartCount === 0 || !storeStatus.isOpen || !isMinOrderSatisfied
          }
          className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-bold text-white shadow-lg transition-all hover:shadow-xl active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          style={{ backgroundColor: 'var(--primary-color)' }}
        >
          {!storeStatus.isOpen
            ? 'Restaurante Fechado'
            : !isMinOrderSatisfied
              ? `Mínimo ${formatCurrency(minOrderValue)}`
              : 'Avançar para o Checkout'}
          {storeStatus.isOpen && isMinOrderSatisfied && (
            <ChevronRight className="h-5 w-5 stroke-[3]" />
          )}
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-[#F8FAFC] font-sans text-slate-800 lg:flex-row">
      <main className="relative flex flex-1 flex-col overflow-x-hidden pb-24 lg:pb-0">
        <header className="relative z-10 shrink-0 bg-[#F8FAFC]">
          {/* Banner Hero Container com Conteúdo 100% Sobreposto */}
          <div className="relative flex min-h-[220px] w-full flex-col justify-end overflow-hidden p-5 shadow-lg sm:min-h-[250px] md:min-h-[270px] lg:p-10">
            {/* Fundo do Banner (Imagem ou Mesh Gerativo Animado) */}
            <DynamicHero profile={profile} />

            {/* Máscara de Gradiente para Leitura Perfeita dos Textos */}
            <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-black/20" />

            {/* Conteúdo Posicionado Sobre o Banner */}
            <div className="relative z-20 flex flex-col items-start gap-4 text-white sm:flex-row sm:items-end">
              {/* Box do Logo */}
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-[3px] border-white/90 bg-white shadow-2xl transition-transform hover:scale-105 lg:h-24 lg:w-24">
                {profile?.logo_url ? (
                  <img
                    src={profile.logo_url}
                    alt="Logo"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Store
                    className="h-full w-full p-4"
                    style={{ color: 'var(--primary-color, #FF5722)' }}
                  />
                )}
              </div>

              {/* Título e Badges da Loja */}
              <div className="flex flex-1 flex-col gap-2 drop-shadow-md">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-black leading-tight tracking-tight text-white sm:text-3xl">
                    {profile?.tradeName || tenantName}
                  </h1>
                  <button
                    onClick={() => setIsStoreInfoOpen(true)}
                    className="flex items-center gap-1.5 rounded-full border border-white/30 bg-white/20 px-3 py-1 text-xs font-bold text-white/90 backdrop-blur-md transition-all hover:bg-white/30 hover:text-white"
                  >
                    <Info className="h-3.5 w-3.5" /> Informações
                  </button>
                </div>

                {/* Badges de Atendimento */}
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  {!storeStatus.isOpen ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-rose-500/90 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm backdrop-blur-md">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-white"></span>{' '}
                      {storeStatus.reason}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-emerald-500/90 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm backdrop-blur-md">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-white"></span>{' '}
                      Aberto agora
                    </span>
                  )}

                  {profile?.deliveryTimeMin && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/40 px-3 py-1 text-[11px] font-semibold text-white/90 backdrop-blur-md">
                      <Clock className="h-3.5 w-3.5 text-indigo-300" />
                      {profile.deliveryTimeMin}-{profile.deliveryTimeMax || 60}{' '}
                      min
                    </span>
                  )}

                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/40 px-3 py-1 text-[11px] font-semibold text-white/90 backdrop-blur-md">
                    <Truck className="h-3.5 w-3.5 text-indigo-300" />
                    {profile?.deliveryFee > 0
                      ? formatCurrency(profile.deliveryFee)
                      : 'Entrega Grátis'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Barra de Pesquisa (Abaixo do Banner) */}
          <div className="px-5 pb-2 pt-4 lg:px-12">
            <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5 shadow-sm ring-1 ring-slate-200/60 transition-all focus-within:ring-2 focus-within:ring-[var(--primary-color)]">
              <Search className="h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="O que você está desejando hoje?"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-[15px] font-medium text-slate-800 placeholder-slate-400 outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Categorias Navegáveis */}
        {!searchQuery && categories.length > 0 && (
          <div className="sticky top-0 z-30 mt-4 shrink-0 border-b border-slate-200/60 bg-white/80 px-5 pb-0 pt-4 backdrop-blur-xl lg:px-12">
            <div className="no-scrollbar flex gap-6 overflow-x-auto">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`relative whitespace-nowrap pb-3 text-[15px] font-bold transition-colors ${
                    activeCategory === cat
                      ? 'text-slate-900'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <span>{cat === 'All' ? 'Menu Completo' : cat}</span>
                  {activeCategory === cat && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      className="absolute bottom-0 left-0 right-0 h-[3px] rounded-t-full"
                      style={{ backgroundColor: 'var(--primary-color)' }}
                      transition={{
                        type: 'spring',
                        stiffness: 300,
                        damping: 30,
                      }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Listagem de Produtos */}
        <div className="flex-1 px-5 py-8 lg:px-12">
          {isLoading ? (
            <div className="flex h-64 flex-col items-center justify-center space-y-4">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[var(--primary-color)]" />
            </div>
          ) : !products?.length ? (
            <div className="flex h-64 flex-col items-center justify-center text-center text-slate-400">
              <UtensilsCrossed className="mb-4 h-16 w-16 opacity-20" />
              <h3 className="text-lg font-bold text-slate-600">
                Nenhum produto cadastrado
              </h3>
            </div>
          ) : Object.keys(groupedProducts).length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-center text-slate-400">
              <Search className="mb-4 h-12 w-12 opacity-20" />
              <p className="font-medium text-slate-600">
                Nenhum resultado para "{searchQuery}"
              </p>
            </div>
          ) : (
            <div className="space-y-12">
              {(Object.entries(groupedProducts) as [string, Product[]][]).map(
                ([catName, prods]) => (
                <section key={catName}>
                  {!searchQuery && (
                    <h2 className="mb-5 flex items-center gap-2 text-[20px] font-black tracking-tight text-slate-900">
                      {catName}
                      <span className="rounded-full bg-slate-200/50 px-2 py-0.5 text-[13px] font-bold text-slate-400">
                        {prods.length}
                      </span>
                    </h2>
                  )}
                  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {prods.map((product) => (
                      <div
                        key={product.id}
                        className="group relative flex flex-col overflow-hidden rounded-[24px] bg-white shadow-sm ring-1 ring-slate-200/60 transition-all hover:shadow-xl hover:shadow-slate-200/50 hover:ring-slate-300"
                      >
                        {product.imageUrl && (
                          <div className="h-40 w-full overflow-hidden bg-slate-50">
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          </div>
                        )}
                        <div className="flex flex-1 flex-col p-5">
                          <h3 className="text-[17px] font-bold leading-tight text-slate-900">
                            {product.name}
                          </h3>
                          {product.description && (
                            <p className="mt-2 line-clamp-2 text-[14px] leading-snug text-slate-500">
                              {product.description}
                            </p>
                          )}

                          <div className="mt-6 flex items-end justify-between gap-4">
                            <div className="flex flex-col">
                              {product.measureUnit &&
                                product.measureUnit !== 'UN' && (
                                  <span className="mb-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                    {product.measureUnit}
                                  </span>
                                )}
                              <p className="text-lg font-black tracking-tight text-slate-900">
                                {formatCurrency(product.price)}
                              </p>
                            </div>

                            <div>
                              {(() => {
                                const isCustomizable =
                                  (product.complementGroups &&
                                    product.complementGroups.length > 0) ||
                                  Boolean(product.subcategory?.accepts_fractions)
                                const totalInCart = getProductCartCount(
                                  product.id,
                                )

                                if (isCustomizable) {
                                  return (
                                    <button
                                      onClick={() =>
                                        handleProductClick(product)
                                      }
                                      className="flex items-center gap-2 rounded-full px-4 py-2.5 text-[14px] font-bold text-white shadow-md transition-transform hover:-translate-y-0.5 active:scale-95"
                                      style={{
                                        backgroundColor: 'var(--primary-color)',
                                      }}
                                    >
                                      {totalInCart > 0 ? (
                                        <>
                                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs font-black">
                                            {totalInCart}
                                          </span>
                                          Personalizar
                                        </>
                                      ) : (
                                        <>
                                          <Plus className="h-4 w-4 stroke-[3]" />
                                          Personalizar
                                        </>
                                      )}
                                    </button>
                                  )
                                }

                                if (cart[product.id]) {
                                  return (
                                    <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 p-1 shadow-inner">
                                      <button
                                        onClick={() =>
                                          handleRemoveFromCart(product.id)
                                        }
                                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm transition-transform active:scale-90"
                                      >
                                        <Minus className="h-4 w-4 stroke-[3]" />
                                      </button>
                                      <span className="w-6 text-center text-[15px] font-bold text-slate-800">
                                        {cart[product.id].quantity}
                                      </span>
                                      <button
                                        onClick={() =>
                                          handleAddToCart(product)
                                        }
                                        className="flex h-8 w-8 items-center justify-center rounded-full text-white shadow-sm transition-transform active:scale-90"
                                        style={{
                                          backgroundColor:
                                            'var(--primary-color)',
                                        }}
                                      >
                                        <Plus className="h-4 w-4 stroke-[3]" />
                                      </button>
                                    </div>
                                  )
                                }

                                return (
                                  <button
                                    onClick={() => handleAddToCart(product)}
                                    className="flex items-center gap-2 rounded-full px-4 py-2.5 text-[14px] font-bold text-white shadow-md transition-transform hover:-translate-y-0.5 active:scale-95"
                                    style={{
                                      backgroundColor: 'var(--primary-color)',
                                    }}
                                  >
                                    <Plus className="h-4 w-4 stroke-[3]" />
                                    Adicionar
                                  </button>
                                )
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Sidebar Carrinho Desktop */}
      <aside className="z-30 hidden w-[400px] shrink-0 self-start border-l border-slate-200 bg-white shadow-2xl lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:overflow-hidden">
        {renderCartSection()}
      </aside>

      {/* Botão Flutuante Mobile */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-5 lg:hidden">
          <motion.button
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', bounce: 0.3 }}
            onClick={() => setIsCartModalOpen(true)}
            className="flex w-full items-center justify-between rounded-full p-4 px-6 font-bold text-white shadow-2xl transition-transform active:scale-[0.98]"
            style={{ backgroundColor: 'var(--primary-color)' }}
          >
            <div className="flex items-center gap-3">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-black/20">
                <ShoppingBag className="h-4 w-4" />
                <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[var(--primary-color)] bg-white text-[11px] font-black text-slate-900 shadow-sm">
                  {cartCount}
                </span>
              </div>
              <span className="text-[15px] font-bold tracking-wide">
                Ver Pedido
              </span>
            </div>
            <span className="text-[17px] font-black tracking-tight">
              {formatCurrency(cartTotal)}
            </span>
          </motion.button>
        </div>
      )}

      {/* Drawer Carrinho Mobile */}
      <AnimatePresence>
        {isCartModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartModalOpen(false)}
              className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              className="fixed bottom-0 left-0 right-0 z-50 flex h-[85vh] flex-col overflow-hidden rounded-t-[32px] bg-white shadow-2xl lg:hidden"
            >
              <div className="relative flex items-center justify-between border-b border-slate-100 p-6 pt-8">
                <div className="absolute left-1/2 top-3 h-1.5 w-12 -translate-x-1/2 rounded-full bg-slate-200" />
                <h2 className="text-2xl font-black tracking-tight text-slate-900">
                  Seu Pedido
                </h2>
                <button
                  onClick={() => setIsCartModalOpen(false)}
                  className="rounded-full bg-slate-100 p-2 text-slate-500 transition-colors hover:bg-slate-200"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                {renderCartSection()}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ItemCustomizerDialog
        key={customizingProduct ? customizingProduct.id : 'empty'}
        open={isCustomizerOpen}
        onOpenChange={setIsCustomizerOpen}
        product={customizingProduct}
        allProducts={products || []}
        onConfirm={handleConfirmCustomizedItem}
        primaryColor="var(--primary-color, #10B981)"
      />

      {/* Modal de Informações da Loja */}
      <Dialog open={isStoreInfoOpen} onOpenChange={setIsStoreInfoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              {profile?.tradeName || tenantName}
            </DialogTitle>
            <DialogDescription>
              Informações do estabelecimento e horários de atendimento.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            {profile?.street && (
              <div className="flex items-start gap-2.5 text-slate-700">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div>
                  <p className="font-semibold">Endereço:</p>
                  <p>
                    {profile.street}, {profile.number} - {profile.neighborhood}
                  </p>
                  <p>
                    {profile.city} - {profile.state}{' '}
                    {profile.zipcode ? `(CEP: ${profile.zipcode})` : ''}
                  </p>
                </div>
              </div>
            )}

            {profile?.document && (
              <div className="flex items-center gap-2 text-slate-700">
                <FileText className="h-4 w-4 text-slate-400" />
                <span>CNPJ/CPF: {profile.document}</span>
              </div>
            )}

            <div className="border-t pt-3">
              <h4 className="mb-2 flex items-center gap-2 font-bold text-slate-900">
                <Clock className="h-4 w-4 text-primary" /> Horários de
                Funcionamento
              </h4>
              <div className="space-y-1.5 text-xs">
                {DAYS_OF_WEEK.map((dayName, idx) => {
                  const daySchedules = (profile?.businessHours || []).filter(
                    (b: any) => b.dayOfWeek === idx && b.isOpen,
                  )
                  return (
                    <div
                      key={dayName}
                      className="flex items-start justify-between border-b border-slate-100 py-1.5"
                    >
                      <span className="font-medium text-slate-600">
                        {dayName}
                      </span>
                      <div className="text-right">
                        {daySchedules.length > 0 ? (
                          daySchedules.map((bh: any, sIdx: number) => (
                            <div key={sIdx} className="font-bold text-emerald-600">
                              {bh.openTime} - {bh.closeTime}
                            </div>
                          ))
                        ) : (
                          <span className="text-slate-400 font-medium">Fechado</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Checkout Robusto em Etapas (Padrão iFood / Anota AI / Marujo Sliding Wizard) */}
      <Dialog open={isCheckoutStepOpen} onOpenChange={setIsCheckoutStepOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2 text-xl font-bold">
              <span className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-primary" />
                Finalizar Pedido
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                Etapa {checkoutWizardStep} de 3
              </span>
            </DialogTitle>

            {/* Barra de Progresso das Etapas */}
            <div className="grid grid-cols-3 gap-1.5 pt-2">
              <div
                className={`h-1.5 rounded-full transition-all ${checkoutWizardStep >= 1 ? 'bg-primary' : 'bg-slate-200'}`}
              />
              <div
                className={`h-1.5 rounded-full transition-all ${checkoutWizardStep >= 2 ? 'bg-primary' : 'bg-slate-200'}`}
              />
              <div
                className={`h-1.5 rounded-full transition-all ${checkoutWizardStep >= 3 ? 'bg-primary' : 'bg-slate-200'}`}
              />
            </div>
          </DialogHeader>

          {/* PASSO 1: Tipo de Atendimento (Entrega vs Retirada) */}
          {checkoutWizardStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5 py-4 text-sm"
            >
              <div className="space-y-1 py-2 text-center">
                <h3 className="text-base font-black text-slate-900">
                  Como deseja receber seu pedido?
                </h3>
                <p className="text-xs text-slate-500">
                  Selecione uma das opções abaixo para continuar:
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setFulfillmentType('DELIVERY')
                    setCheckoutWizardStep(2)
                  }}
                  className={`flex flex-col items-center justify-center gap-3 rounded-3xl border-2 p-6 font-bold transition-all hover:scale-[1.02] ${
                    fulfillmentType === 'DELIVERY'
                      ? 'border-primary bg-primary/5 text-primary shadow-md ring-2 ring-primary/20'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Truck className="h-7 w-7" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-extrabold">
                      🚀 Entrega Delivery
                    </p>
                    <p className="mt-1 text-[11px] font-normal text-slate-500">
                      Receba no seu endereço
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFulfillmentType('TAKEOUT')
                    setPaymentMethod('PIX')
                    setCheckoutWizardStep(2)
                  }}
                  className={`flex flex-col items-center justify-center gap-3 rounded-3xl border-2 p-6 font-bold transition-all hover:scale-[1.02] ${
                    fulfillmentType === 'TAKEOUT'
                      ? 'border-primary bg-primary/5 text-primary shadow-md ring-2 ring-primary/20'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Store className="h-7 w-7" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-extrabold">
                      🛍️ Retirada no Balcão
                    </p>
                    <p className="mt-1 text-[11px] font-normal text-slate-500">
                      Retire na loja (Pix Antecipado)
                    </p>
                  </div>
                </button>
              </div>
            </motion.div>
          )}

          {/* PASSO 2: Identificação do Cliente & Endereço de Entrega */}
          {checkoutWizardStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4 py-2 text-sm"
            >
              {/* Etapa 1: Telefone / WhatsApp com Botão de Busca Marujo */}
              <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="customerPhone"
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-900"
                  >
                    <User className="h-4 w-4 text-primary" />
                    <span>1. Seu Telefone / WhatsApp *</span>
                  </Label>
                  {clientFound && (
                    <span className="flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-100/90 px-2.5 py-0.5 text-[11px] font-black text-emerald-700 shadow-sm">
                      <CheckCircle2 className="h-3 w-3" /> Cliente Identificado
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <Input
                    id="customerPhone"
                    value={customerPhone}
                    onChange={handlePhoneChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handlePhoneSearch()
                      }
                    }}
                    placeholder="(11) 99999-9999"
                    className="flex-1 border-slate-300 bg-white font-medium focus-visible:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => handlePhoneSearch()}
                    disabled={
                      customerPhone.replace(/\D/g, '').length < 10 ||
                      isLoadingPhone
                    }
                    className="flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
                  >
                    {isLoadingPhone ? (
                      <span className="animate-spin text-sm">⏳</span>
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    <span>Buscar</span>
                  </button>
                </div>

                {/* Banner de Notificação Toast (Busca de Cliente) */}
                {phoneSearchToast && (
                  <div
                    className={`flex items-center gap-2 rounded-xl border p-3 text-xs font-bold shadow-sm ${
                      phoneSearchToast.type === 'success'
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                        : phoneSearchToast.type === 'info'
                          ? 'border-amber-300 bg-amber-50 text-amber-900'
                          : 'border-rose-300 bg-rose-50 text-rose-800'
                    }`}
                  >
                    <span className="text-sm">
                      {phoneSearchToast.type === 'success'
                        ? '✅'
                        : phoneSearchToast.type === 'info'
                          ? 'ℹ️'
                          : '⚠️'}
                    </span>
                    <span>{phoneSearchToast.message}</span>
                  </div>
                )}

                <p className="text-[11px] text-slate-500">
                  Digite seu WhatsApp e aperte Enter ou clique em Buscar para
                  recuperar seus dados e endereços salvos.
                </p>
              </div>

              {/* Formulário de Nome e Endereço */}
              <div className="space-y-3 pt-1">
                <div className="space-y-1">
                  <Label
                    htmlFor="name-input"
                    className="text-xs font-bold text-slate-800"
                  >
                    2. Seu Nome Completo *
                  </Label>
                  <Input
                    id="name-input"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    disabled={addressReadonly}
                    placeholder="Ex: João Silva"
                    className="border-slate-300 bg-white font-medium focus-visible:ring-primary disabled:bg-slate-100 disabled:text-slate-700"
                  />
                </div>

                {/* Endereço de Entrega (se Delivery) */}
                {fulfillmentType === 'DELIVERY' && (
                  <div className="space-y-3 border-t pt-3">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                        <MapPin className="h-4 w-4 text-primary" /> Endereço de
                        Entrega *
                      </Label>

                      <div className="flex items-center gap-3">
                        {savedAddresses.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setIsAddressesModalOpen(true)}
                            className="flex items-center gap-1 rounded-lg border border-primary/20 bg-primary/5 px-2 py-0.5 text-xs font-bold text-primary hover:underline"
                          >
                            <MapPin className="h-3.5 w-3.5" />{' '}
                            {savedAddresses.length} Endereços
                          </button>
                        )}
                        {addressReadonly && (
                          <button
                            type="button"
                            onClick={handleNewAddress}
                            className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline"
                          >
                            <Plus className="h-3.5 w-3.5" /> Novo Endereço
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Exibição do Endereço Selecionado */}
                    {savedAddresses.length > 0 && !isNewAddress && (
                      <div className="space-y-2 rounded-2xl border-2 border-primary/30 bg-primary/5 p-3.5">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-primary">
                              Endereço Selecionado
                            </span>
                            <p className="mt-1 text-sm font-bold text-slate-900">
                              {street}, {number}
                            </p>
                            <p className="text-xs font-medium text-slate-600">
                              {neighborhood} - {city}/{state}{' '}
                              {zipcode ? `(CEP: ${zipcode})` : ''}
                            </p>
                            {complement && (
                              <p className="mt-0.5 text-xs italic text-slate-500">
                                Comp: {complement}
                              </p>
                            )}
                          </div>
                          <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-primary" />
                        </div>

                        <div className="flex items-center gap-3 border-t border-primary/10 pt-1">
                          {savedAddresses.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setIsAddressesModalOpen(true)}
                              className="text-xs font-bold text-primary hover:underline"
                            >
                              Trocar endereço
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={handleNewAddress}
                            className="text-xs font-bold text-slate-600 hover:underline"
                          >
                            + Digitar outro endereço
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Formulário de Digitação de Endereço */}
                    {(savedAddresses.length === 0 || isNewAddress) && (
                      <div className="space-y-3 pt-1">
                        <div className="space-y-1">
                          <Label
                            htmlFor="zipcode-input"
                            className="flex items-center justify-between text-xs"
                          >
                            <span>Buscar CEP</span>
                            {isSearchingCEPCheckout && (
                              <span className="animate-pulse text-[10px] font-bold text-emerald-600">
                                Buscando endereço...
                              </span>
                            )}
                          </Label>
                          <Input
                            id="zipcode-input"
                            value={zipcode}
                            onChange={handleCepChange}
                            disabled={addressReadonly}
                            placeholder="00000-000"
                            className="border-slate-300 bg-white font-medium focus-visible:ring-primary disabled:bg-slate-100"
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-2 space-y-1">
                            <Label htmlFor="street" className="text-xs">
                              Rua / Logradouro *
                            </Label>
                            <Input
                              id="street"
                              value={street}
                              onChange={(e) => setStreet(e.target.value)}
                              disabled={addressReadonly}
                              placeholder="Ex: Av. Paulista"
                              className="border-slate-300 bg-white font-medium focus-visible:ring-primary disabled:bg-slate-100"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="number" className="text-xs">
                              Número *
                            </Label>
                            <Input
                              id="number-input"
                              value={number}
                              onChange={(e) => setNumber(e.target.value)}
                              disabled={addressReadonly}
                              placeholder="Ex: 1000"
                              className="border-slate-300 bg-white font-medium focus-visible:ring-primary disabled:bg-slate-100"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label htmlFor="neighborhood" className="text-xs font-bold text-slate-800">
                              Bairro *
                            </Label>
                            {availableNeighborhoodsList.length > 0 ? (
                              <select
                                id="neighborhood"
                                value={neighborhood}
                                onChange={(e) => setNeighborhood(e.target.value)}
                                disabled={addressReadonly}
                                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:bg-slate-100"
                              >
                                <option value="">Selecione o Bairro...</option>
                                {availableNeighborhoodsList.map((b) => {
                                  const sectors = profile?.deliverySectors || []
                                  const foundSec = sectors.find((s: any) =>
                                    (s.neighborhoods || []).some(
                                      (nb: string) => normalizeText(nb) === normalizeText(b),
                                    ),
                                  )
                                  const feeStr = foundSec
                                    ? Number(foundSec.fee) > 0
                                      ? ` (+ ${formatCurrency(foundSec.fee)})`
                                      : ' (Taxa Grátis)'
                                    : ''
                                  return (
                                    <option key={b} value={b}>
                                      {b}{feeStr}
                                    </option>
                                  )
                                })}
                                {neighborhood &&
                                  !availableNeighborhoodsList.some(
                                    (n) => normalizeText(n) === normalizeText(neighborhood),
                                  ) && (
                                    <option value={neighborhood}>
                                      {neighborhood} (Não tabelado)
                                    </option>
                                  )}
                              </select>
                            ) : (
                              <Input
                                id="neighborhood"
                                value={neighborhood}
                                onChange={(e) => setNeighborhood(e.target.value)}
                                disabled={addressReadonly}
                                placeholder="Bairro"
                                className="border-slate-300 bg-white font-medium focus-visible:ring-primary disabled:bg-slate-100"
                              />
                            )}
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="complement" className="text-xs">
                              Complemento / Ref.
                            </Label>
                            <Input
                              id="complement"
                              value={complement}
                              onChange={(e) => setComplement(e.target.value)}
                              disabled={addressReadonly}
                              placeholder="Apto, Bloco, etc."
                              className="border-slate-300 bg-white font-medium focus-visible:ring-primary disabled:bg-slate-100"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-2 space-y-1">
                            <Label htmlFor="city" className="text-xs">
                              Cidade *
                            </Label>
                            <Input
                              id="city"
                              value={city}
                              onChange={(e) => setCity(e.target.value)}
                              disabled={addressReadonly}
                              placeholder="Cidade"
                              className="border-slate-300 bg-white font-medium focus-visible:ring-primary disabled:bg-slate-100"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="state" className="text-xs">
                              Estado *
                            </Label>
                            <Input
                              id="state"
                              value={state}
                              onChange={(e) => setState(e.target.value)}
                              disabled={addressReadonly}
                              maxLength={2}
                              placeholder="UF"
                              className="border-slate-300 bg-white font-medium uppercase focus-visible:ring-primary disabled:bg-slate-100"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 border-t pt-4">
                <button
                  type="button"
                  onClick={() => setCheckoutWizardStep(1)}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  ← Voltar
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    if (!customerName.trim() || !customerPhone.trim()) {
                      alert('Por favor, preencha seu nome e telefone.')
                      return
                    }
                    if (
                      fulfillmentType === 'DELIVERY' &&
                      (!street.trim() || !number.trim() || !neighborhood.trim())
                    ) {
                      alert(
                        'Por favor, preencha o endereço completo de entrega.',
                      )
                      return
                    }
                    await registerClientInBackend()
                    setCheckoutWizardStep(3)
                  }}
                  className="rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-primary/90"
                >
                  {isNewAddress || !clientFound
                    ? 'Cadastrar e Avançar para Pagamento →'
                    : 'Avançar para Pagamento →'}
                </button>
              </div>
            </motion.div>
          )}

          {/* PASSO 3: Forma de Pagamento & Confirmação Final */}
          {checkoutWizardStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4 py-2 text-sm"
            >
              {/* Forma de Pagamento */}
              <div className="space-y-3 border-t pt-3">
                <Label className="font-bold">Forma de Pagamento</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(() => {
                    const availablePayments = Array.isArray(profile?.paymentMethods) && profile.paymentMethods.length > 0
                      ? profile.paymentMethods
                      : [
                          { id: 'pix', name: 'Pix' },
                          { id: 'credit', name: 'Cartão de Crédito' },
                          { id: 'debit', name: 'Cartão de Débito' },
                          { id: 'cash', name: 'Dinheiro' },
                        ];

                    const filtered = fulfillmentType === 'TAKEOUT'
                      ? availablePayments.filter((p: any) => p.name.toLowerCase().includes('pix'))
                      : availablePayments;

                    const listToRender = filtered.length > 0 ? filtered : availablePayments;

                    return listToRender.map((p: any) => {
                      const lower = p.name.toLowerCase();
                      const key = lower.includes('pix') ? 'PIX' : lower.includes('crédit') || lower.includes('credit') ? 'CREDIT' : lower.includes('débit') || lower.includes('debit') ? 'DEBIT' : lower.includes('dinheiro') ? 'CASH' : p.name;
                      const icon = lower.includes('pix') ? '⚡' : lower.includes('crédit') || lower.includes('credit') || lower.includes('débit') || lower.includes('debit') ? '💳' : lower.includes('dinheiro') ? '💵' : '🏷️';
                      const isSelected = paymentMethod === key || (key === 'PIX' && paymentMethod === 'PIX') || paymentMethod === p.name;

                      return (
                        <button
                          key={p.id || p.name}
                          type="button"
                          onClick={() => setPaymentMethod(key)}
                          className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-bold transition-all ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm ring-1 ring-emerald-400'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {icon} {p.name}
                        </button>
                      );
                    });
                  })()}
                </div>

                {/* Caixa da Chave Pix & QR Code Oficial (Retirada ou Opção Pix) */}
                {(paymentMethod === 'PIX' || fulfillmentType === 'TAKEOUT') && (
                  <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                        <QrCode className="h-4 w-4 text-emerald-600" />
                        <span>QR Code Pix & Copia e Cola Oficial</span>
                      </div>
                      <span className="rounded-full border border-emerald-300 bg-emerald-100/90 px-2.5 py-0.5 text-[11px] font-black text-emerald-800">
                        {formatCurrency(cartTotal)}
                      </span>
                    </div>

                    {/* Renderização do QR Code Visual Oficial BACEN */}
                    {pixBRCodePayload && (
                      <div className="flex flex-col items-center justify-center rounded-xl border border-emerald-200 bg-white p-3 shadow-sm">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(pixBRCodePayload)}`}
                          alt="QR Code Pix do Pedido"
                          className="h-44 w-44 rounded-lg object-contain"
                        />
                        <p className="mt-2 text-center text-[11px] font-semibold text-slate-500">
                          Abra o app do seu banco e escaneie o QR Code acima
                        </p>
                      </div>
                    )}

                    <p className="text-[11px] leading-snug text-emerald-700">
                      Ou copie o código <strong>Pix Copia e Cola</strong>{' '}
                      abaixo. Ao colar no seu banco, o valor exato de{' '}
                      <strong>{formatCurrency(cartTotal)}</strong> será
                      preenchido automaticamente!
                    </p>

                    <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-white p-2.5 shadow-sm">
                      <span className="flex-1 truncate font-mono text-[11px] font-semibold text-slate-800">
                        {pixBRCodePayload ||
                          profile?.pixKey ||
                          profile?.whatsappNumber ||
                          'Contate a loja'}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyPixKey(
                            pixBRCodePayload ||
                              profile?.pixKey ||
                              profile?.whatsappNumber ||
                              '',
                          )
                        }
                        className="flex shrink-0 items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-emerald-700"
                      >
                        {isCopiedPix ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        {isCopiedPix
                          ? 'Pix Copiado!'
                          : 'Copiar Pix Copia e Cola'}
                      </button>
                    </div>
                  </div>
                )}

                {paymentMethod === 'CASH' && fulfillmentType === 'DELIVERY' && (
                  <div className="space-y-1 pt-1">
                    <Label htmlFor="changeAmount" className="text-xs">
                      Precisa de troco para quanto?
                    </Label>
                    <Input
                      id="changeAmount"
                      value={changeAmount}
                      onChange={(e) => setChangeAmount(e.target.value)}
                      placeholder="Ex: 50.00 (Deixe em branco se não precisar)"
                    />
                  </div>
                )}
              </div>

              {/* Resumo de Valores */}
              <div className="space-y-2 rounded-xl border bg-slate-50 p-4">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Subtotal dos itens</span>
                  <span>{formatCurrency(cartSubtotal)}</span>
                </div>
                {fulfillmentType === 'DELIVERY' && (
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>Taxa de Entrega</span>
                    <span>
                      {deliveryFee > 0 ? formatCurrency(deliveryFee) : 'Grátis'}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t pt-2 text-base font-black text-slate-900">
                  <span>Total a Pagar</span>
                  <span style={{ color: 'var(--primary-color)' }}>
                    {formatCurrency(cartTotal)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCheckoutWizardStep(2)}
                  className="rounded-xl border border-slate-300 px-4 py-3 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  ← Voltar
                </button>

                <button
                  type="button"
                  onClick={handleFinalizeOrder}
                  className="active:scale-98 flex-1 rounded-xl py-3.5 text-sm font-black text-white shadow-lg transition-transform"
                  style={{ backgroundColor: 'var(--primary-color)' }}
                >
                  Confirmar e Enviar Pedido via WhatsApp 🚀
                </button>
              </div>
            </motion.div>
          )}

          {/* PASSO 4: Sucesso e Parabéns pelo Pedido */}
          {checkoutWizardStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center py-4 text-center"
            >
              <div className="relative mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-inner">
                <CheckCircle2 className="h-12 w-12 text-emerald-600" />
              </div>

              <h3 className="text-2xl font-black tracking-tight text-slate-900">
                Parabéns pelo seu Pedido! 🎉
              </h3>
              <p className="mt-2 max-w-md text-sm font-medium text-slate-600">
                Seu pedido foi registrado e enviado com sucesso para o nosso WhatsApp! Já estamos prontos para preparar tudo com muito carinho.
              </p>

              {/* Resumo do Pedido Confirmado */}
              <div className="mt-5 w-full space-y-2.5 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-left">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Cliente:</span>
                  <span className="font-bold text-slate-900">{customerName}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>WhatsApp:</span>
                  <span className="font-bold text-slate-900">{customerPhone}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Modalidade:</span>
                  <span className="font-bold text-slate-900">
                    {fulfillmentType === 'DELIVERY' ? '🛵 Entrega (Delivery)' : '🥡 Retirada no Balcão'}
                  </span>
                </div>
                {fulfillmentType === 'DELIVERY' && (
                  <div className="flex items-start justify-between text-xs text-slate-600">
                    <span>Endereço:</span>
                    <span className="font-bold text-slate-900 text-right max-w-[240px]">
                      {street}, {number}{complement ? ` (${complement})` : ''} - {neighborhood}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Forma de Pagamento:</span>
                  <span className="font-bold text-slate-900">
                    {paymentMethod === 'PIX'
                      ? '⚡ Pix'
                      : paymentMethod === 'CREDIT'
                        ? '💳 Cartão de Crédito'
                        : paymentMethod === 'DEBIT'
                          ? '💳 Cartão de Débito'
                          : '💵 Dinheiro'}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-sm">
                  <span className="font-bold text-slate-800">Total:</span>
                  <span className="text-base font-black text-emerald-600">
                    {formatCurrency(cartTotal)}
                  </span>
                </div>
              </div>

              {/* Reenviar WhatsApp caso necessário */}
              {lastOrderText && (
                <p className="mt-4 text-xs text-slate-400">
                  Não abriu o WhatsApp automaticamente?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      const targetPhone = (profile?.whatsappNumber || '').replace(/\D/g, '')
                      const url = `https://wa.me/55${targetPhone}?text=${encodeURIComponent(lastOrderText)}`
                      window.open(url, '_blank')
                    }}
                    className="font-bold text-emerald-600 hover:underline"
                  >
                    Clique aqui para abrir
                  </button>
                </p>
              )}

              {/* Botão de Concluir */}
              <button
                type="button"
                onClick={handleFinishAndReset}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-black text-white shadow-xl transition-all hover:opacity-95 active:scale-[0.98]"
                style={{ backgroundColor: 'var(--primary-color, #10B981)' }}
              >
                OK, Voltar ao Cardápio ✨
              </button>
            </motion.div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Dialog de Meus Endereços Cadastrados (Padrão Marujo) */}
      <Dialog
        open={isAddressesModalOpen}
        onOpenChange={setIsAddressesModalOpen}
      >
        <DialogContent className="rounded-3xl p-6 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <MapPin className="h-5 w-5 text-primary" /> Meus Endereços
              Cadastrados
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Selecione em qual endereço deseja receber seu pedido:
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] space-y-2.5 overflow-y-auto py-2 pr-1">
            {savedAddresses.map((addr, index) => {
              const isSelected =
                addressReadonly &&
                street === addr.street &&
                number === addr.number?.toString()
              return (
                <div
                  key={index}
                  onClick={() => handleSelectSavedAddress(addr)}
                  className={`flex cursor-pointer items-start justify-between gap-3 rounded-2xl border-2 p-3.5 transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-900">
                        {addr.street}, {addr.number}
                      </p>
                      {addr.is_main && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black uppercase text-primary">
                          Principal
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-slate-600">
                      {addr.neighborhood} - {addr.city}/{addr.state}
                    </p>
                    {addr.zipcode && (
                      <p className="text-[11px] text-slate-400">
                        CEP:{' '}
                        {formatCep(addr.zipcode.toString().padStart(8, '0'))}
                      </p>
                    )}
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  )}
                </div>
              )
            })}
          </div>

          <div className="flex items-center justify-between border-t pt-2">
            <button
              type="button"
              onClick={() => {
                handleNewAddress()
                setIsAddressesModalOpen(false)
              }}
              className="flex items-center gap-1 text-xs font-bold text-primary hover:underline"
            >
              <Plus className="h-4 w-4" /> Cadastrar novo endereço
            </button>
            <button
              type="button"
              onClick={() => setIsAddressesModalOpen(false)}
              className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200"
            >
              Fechar
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
