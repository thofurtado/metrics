import { useQuery } from '@tanstack/react-query'
import {
  Store,
  ShoppingBag,
  Plus,
  Minus,
  Info,
  Search,
  X,
  ChevronRight,
  UtensilsCrossed,
  Clock,
  Truck,
  MapPin,
  FileText,
  QrCode,
  Copy,
  Check,
  User,
  CheckCircle2,
} from 'lucide-react'
import { useState, useMemo, useEffect } from 'react'
import { api } from '@/lib/axios'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
}

interface CartItem {
  product: Product
  quantity: number
  observation?: string
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
  const response = await api.get<{ products: Product[] }>('/public/menu')
  return response.data.products
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
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean)) {
    return clean.toLowerCase()
  }

  const digitsOnly = clean.replace(/\D/g, '')

  // 3. Telefone sem código de país (+55): ex: 12992193644 -> +5512992193644
  if (digitsOnly.length === 10 || digitsOnly.length === 11) {
    return `+55${digitsOnly}`
  }

  // 4. Telefone com 55 mas sem o sinal de +: ex: 5512992193644 -> +5512992193644
  if ((digitsOnly.length === 12 || digitsOnly.length === 13) && digitsOnly.startsWith('55') && !clean.startsWith('+')) {
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
    '26' + merchantAccountInfo.length.toString().padStart(2, '0') + merchantAccountInfo +
    '52040000' +
    '5303986' +
    '54' + formattedAmount.length.toString().padStart(2, '0') + formattedAmount +
    '5802BR' +
    '59' + cleanName.length.toString().padStart(2, '0') + cleanName +
    '60' + cleanCity.length.toString().padStart(2, '0') + cleanCity +
    '62070503***' +
    '6304'

  const checksum = crc16(payload)
  return payload + checksum
}

// Utilitário para verificar se a loja está aberta no momento
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

  const businessHours = profile.businessHours || []
  const todaySchedule = businessHours.find(
    (bh: any) => bh.dayOfWeek === currentDayOfWeek
  )

  if (!todaySchedule || !todaySchedule.isOpen) {
    return { isOpen: false, reason: 'Fechado hoje' }
  }

  const { openTime, closeTime } = todaySchedule
  if (openTime && closeTime) {
    if (currentTime < openTime || currentTime > closeTime) {
      return { isOpen: false, reason: `Fechado (Abre às ${openTime})` }
    }
  }

  return { isOpen: true, reason: 'Aberto' }
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
      <div className="absolute inset-0 opacity-15 bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:28px_28px]" />

      {/* Orbes de Luz Flutuantes Animadas (Bokeh) */}
      <motion.div
        animate={{
          scale: [1, 1.25, 1],
          x: [0, 25, 0],
          y: [0, -15, 0],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-20 -right-20 h-80 w-80 rounded-full bg-white/30 blur-3xl pointer-events-none"
      />

      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          x: [0, -30, 0],
          y: [0, 20, 0],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -bottom-24 -left-20 h-96 w-96 rounded-full bg-black/40 blur-3xl pointer-events-none"
      />
    </div>
  )
}

export default function GenericMenu({ tenantName, profile }: GenericMenuProps) {
  const [cart, setCart] = useState<Record<string, CartItem>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const [isCartModalOpen, setIsCartModalOpen] = useState(false)
  const [isStoreInfoOpen, setIsStoreInfoOpen] = useState(false)

  // Estados do Modal de Checkout Robusto (iFood / Anota AI / Marujo Standard)
  const [isCheckoutStepOpen, setIsCheckoutStepOpen] = useState(false)
  const [fulfillmentType, setFulfillmentType] = useState<'DELIVERY' | 'TAKEOUT'>('DELIVERY')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [street, setStreet] = useState('')
  const [number, setNumber] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zipcode, setZipcode] = useState('')
  const [complement, setComplement] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'CREDIT' | 'DEBIT' | 'CASH'>('PIX')
  const [changeAmount, setChangeAmount] = useState('')
  const [isSearchingCEPCheckout, setIsSearchingCEPCheckout] = useState(false)
  const [isCopiedPix, setIsCopiedPix] = useState(false)

  // Estados de Busca do Cliente Marujo & Múltiplos Endereços
  const [clientFound, setClientFound] = useState(false)
  const [isLoadingPhone, setIsLoadingPhone] = useState(false)
  const [hasSearchedPhone, setHasSearchedPhone] = useState(false)
  const [savedAddresses, setSavedAddresses] = useState<any[]>([])
  const [addressReadonly, setAddressReadonly] = useState(false)
  const [isNewAddress, setIsNewAddress] = useState(false)
  const [isAddressesModalOpen, setIsAddressesModalOpen] = useState(false)

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
    setHasSearchedPhone(false)
    const raw = formatted.replace(/\D/g, '')
    if (raw.length >= 10) {
      handlePhoneSearch(raw)
    }
  }

  const handlePhoneSearch = async (overrideRawPhone?: string) => {
    const rawPhone = (overrideRawPhone || customerPhone).replace(/\D/g, '')
    if (rawPhone.length < 10) return

    setIsLoadingPhone(true)
    try {
      const res = await api.get(`/public/clients/phone/${rawPhone}`)
      if (res.data.client) {
        const client = res.data.client
        setCustomerName(client.name || '')
        setClientFound(true)

        if (client.addresses && client.addresses.length > 0) {
          setSavedAddresses(client.addresses)
          const addr = client.addresses[0]
          setZipcode(addr.zipcode ? formatCep(addr.zipcode.toString().padStart(8, '0')) : '')
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
      } else {
        setClientFound(false)
        setSavedAddresses([])
        setAddressReadonly(false)
        setIsNewAddress(true)
      }
    } catch {
      setClientFound(false)
      setSavedAddresses([])
      setAddressReadonly(false)
      setIsNewAddress(true)
    } finally {
      setIsLoadingPhone(false)
      setHasSearchedPhone(true)
    }
  }

  const handleSelectSavedAddress = (addr: any) => {
    setZipcode(addr.zipcode ? formatCep(addr.zipcode.toString().padStart(8, '0')) : '')
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
        setNeighborhood(data.neighborhood || '')
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

  const categories = useMemo(() => {
    if (!products) return []
    const cats = Array.from(new Set(products.map((p) => p.category || 'Geral')))
    return ['All', ...cats]
  }, [products])

  useEffect(() => {
    if (categories.length > 1 && activeCategory === 'All') {
      setActiveCategory('All')
    }
  }, [categories, activeCategory])

  const filteredProducts = useMemo(() => {
    if (!products) return []
    let filtered = products

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q))
      )
    } else if (activeCategory !== 'All') {
      filtered = filtered.filter((p) => (p.category || 'Geral') === activeCategory)
    }
    return filtered
  }, [products, searchQuery, activeCategory])

  const groupedProducts = useMemo(() => {
    return filteredProducts.reduce(
      (acc, product) => {
        const cat = product.category || 'Geral'
        if (!acc[cat]) acc[cat] = []
        acc[cat].push(product)
        return acc
      },
      {} as Record<string, Product[]>
    )
  }, [filteredProducts])

  const handleAddToCart = (product: Product, obs?: string) => {
    setCart((prev) => {
      const existing = prev[product.id]
      if (existing) {
        return {
          ...prev,
          [product.id]: {
            ...existing,
            quantity: existing.quantity + 1,
            observation: obs !== undefined ? obs : existing.observation,
          },
        }
      }
      return { ...prev, [product.id]: { product, quantity: 1, observation: obs || '' } }
    })
  }

  const handleUpdateItemObs = (productId: string, obs: string) => {
    setCart((prev) => {
      const existing = prev[productId]
      if (!existing) return prev
      return { ...prev, [productId]: { ...existing, observation: obs } }
    })
  }

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => {
      const existing = prev[productId]
      if (!existing) return prev
      if (existing.quantity === 1) {
        const newCart = { ...prev }
        delete newCart[productId]
        return newCart
      }
      return { ...prev, [productId]: { ...existing, quantity: existing.quantity - 1 } }
    })
  }

  const cartItems = Object.values(cart)
  const cartSubtotal = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  )
  const deliveryFee = fulfillmentType === 'DELIVERY' ? Number(profile?.deliveryFee || 0) : 0
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
    setIsCheckoutStepOpen(true)
  }

  const handleFinalizeOrder = async () => {
    if (!customerName.trim() || !customerPhone.trim()) {
      alert('Por favor, preencha seu nome e WhatsApp.')
      return
    }

    if (fulfillmentType === 'DELIVERY' && (!street.trim() || !number.trim() || !neighborhood.trim())) {
      alert('Por favor, preencha o endereço completo de entrega.')
      return
    }

    try {
      // Registra dados do cliente no backend via API publica
      if (fulfillmentType === 'DELIVERY') {
        try {
          const rawPhone = customerPhone.replace(/\D/g, '')
          const rawZipcode = zipcode.replace(/\D/g, '')
          const parsedNumber = parseInt(number.replace(/\D/g, ''), 10) || 0

          await api.post('/public/checkout/client', {
            name: customerName,
            phone: rawPhone,
            street,
            number: parsedNumber,
            neighborhood,
            city: city || profile?.city || '',
            state: state || profile?.state || '',
            zipcode: rawZipcode ? parseInt(rawZipcode, 10) : undefined,
          })
        } catch (clientErr) {
          console.warn('Aviso ao sincronizar cliente com backend:', clientErr)
        }
      }

      // Formata mensagem estruturada padrão iFood / Anota AI para o WhatsApp
      let text = `🛒 *NOVO PEDIDO - ${tenantName.toUpperCase()}*\n`
      text += `─────────────────────────\n`
      text += `👤 *Cliente:* ${customerName}\n`
      text += `📞 *Contato:* ${customerPhone}\n`
      text += `📌 *Tipo de Pedido:* ${
        fulfillmentType === 'DELIVERY'
          ? '🚀 Entrega (Delivery)'
          : fulfillmentType === 'TAKEOUT'
          ? '🛍️ Retirada no Balcão'
          : '🍽️ Consumo no Local'
      }\n`

      if (fulfillmentType === 'DELIVERY') {
        text += `📍 *Endereço:* ${street}, ${number} - ${neighborhood}`
        if (complement) text += ` (${complement})`
        text += `\n`
      }

      text += `─────────────────────────\n`
      text += `📦 *ITENS DO PEDIDO:*\n\n`

      cartItems.forEach((item) => {
        text += `• *${item.quantity}x* ${item.product.name} - ${formatCurrency(item.product.price * item.quantity)}\n`
        if (item.observation) {
          text += `   ↳ _Obs: ${item.observation}_\n`
        }
      })

      text += `─────────────────────────\n`
      text += `💵 *Subtotal:* ${formatCurrency(cartSubtotal)}\n`
      if (fulfillmentType === 'DELIVERY' && deliveryFee > 0) {
        text += `🛵 *Taxa de Entrega:* ${formatCurrency(deliveryFee)}\n`
      }
      text += `💰 *TOTAL FINAL:* ${formatCurrency(cartTotal)}\n\n`

      text += `💳 *Forma de Pagamento:* ${
        paymentMethod === 'PIX'
          ? 'Pix'
          : paymentMethod === 'CREDIT'
          ? 'Cartão de Crédito (na entrega)'
          : paymentMethod === 'DEBIT'
          ? 'Cartão de Débito (na entrega)'
          : `Dinheiro ${changeAmount ? `(Troco para R$ ${changeAmount})` : '(Sem troco)'}`
      }\n`

      const targetPhone = (profile?.whatsappNumber || '').replace(/\D/g, '')
      const url = `https://wa.me/55${targetPhone}?text=${encodeURIComponent(text)}`
      window.open(url, '_blank')
    } catch (err) {
      console.error('Erro ao enviar pedido:', err)
      alert('Ocorreu um problema ao registrar seu pedido, tente novamente.')
    }
  }

  const renderCartSection = () => (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 p-6">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Seu Pedido</h2>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-[13px] font-bold text-slate-600">
          {cartCount} itens
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {cartItems.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-slate-400">
            <ShoppingBag className="mb-4 h-16 w-16 opacity-20" />
            <p className="text-center font-medium">Sua sacola está vazia.</p>
            <p className="mt-1 text-[13px]">Adicione deliciosos itens ao seu pedido.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <AnimatePresence>
              {cartItems.map((item) => (
                <motion.div
                  key={item.product.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-slate-50/50 p-3.5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-800 text-[15px] leading-snug">
                        {item.product.name}
                      </h4>
                      <p className="font-black mt-0.5 text-[14px]" style={{ color: 'var(--primary-color)' }}>
                        {formatCurrency(item.product.price * item.quantity)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-inner shrink-0">
                      <button
                        onClick={() => handleRemoveFromCart(item.product.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-600 shadow-sm transition-transform active:scale-90"
                      >
                        <Minus className="h-4 w-4 stroke-[3]" />
                      </button>
                      <span className="w-6 text-center text-[14px] font-bold text-slate-800">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleAddToCart(item.product)}
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
                      onChange={(e) => handleUpdateItemObs(item.product.id, e.target.value)}
                      className="h-8 text-xs bg-white/80"
                    />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div className="border-t border-slate-100 bg-slate-50 p-6 space-y-4">
        {minOrderValue > 0 && (
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Pedido mínimo:</span>
            <span className={isMinOrderSatisfied ? 'font-bold text-emerald-600' : 'font-bold text-amber-600'}>
              {formatCurrency(minOrderValue)}
            </span>
          </div>
        )}

        <div className="flex items-end justify-between text-slate-900">
          <span className="text-[15px] font-bold text-slate-500 uppercase tracking-wide">Subtotal</span>
          <span className="text-2xl font-black tracking-tight">{formatCurrency(cartSubtotal)}</span>
        </div>

        <button
          onClick={handleOpenCheckout}
          disabled={cartCount === 0 || !storeStatus.isOpen || !isMinOrderSatisfied}
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
      <main className="flex flex-1 flex-col overflow-x-hidden pb-24 lg:pb-0 relative">
        <header className="relative z-10 shrink-0 bg-[#F8FAFC]">
          {/* Banner Hero Container com Conteúdo 100% Sobreposto */}
          <div className="relative min-h-[220px] sm:min-h-[250px] md:min-h-[270px] w-full overflow-hidden flex flex-col justify-end p-5 lg:p-10 shadow-lg">
            {/* Fundo do Banner (Imagem ou Mesh Gerativo Animado) */}
            <DynamicHero profile={profile} />

            {/* Máscara de Gradiente para Leitura Perfeita dos Textos */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-black/20 z-10 pointer-events-none" />

            {/* Conteúdo Posicionado Sobre o Banner */}
            <div className="relative z-20 flex flex-col sm:flex-row items-start sm:items-end gap-4 text-white">
              {/* Box do Logo */}
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-[3px] border-white/90 bg-white shadow-2xl lg:h-24 lg:w-24 transition-transform hover:scale-105">
                {profile?.logo_url ? (
                  <img src={profile.logo_url} alt="Logo" className="h-full w-full object-cover" />
                ) : (
                  <Store className="h-full w-full p-4" style={{ color: 'var(--primary-color, #FF5722)' }} />
                )}
              </div>

              {/* Título e Badges da Loja */}
              <div className="flex flex-col gap-2 flex-1 drop-shadow-md">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
                    {profile?.tradeName || tenantName}
                  </h1>
                  <button
                    onClick={() => setIsStoreInfoOpen(true)}
                    className="flex items-center gap-1.5 text-xs font-bold text-white/90 hover:text-white bg-white/20 hover:bg-white/30 backdrop-blur-md px-3 py-1 rounded-full border border-white/30 transition-all"
                  >
                    <Info className="h-3.5 w-3.5" /> Informações
                  </button>
                </div>

                {/* Badges de Atendimento */}
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  {!storeStatus.isOpen ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/90 px-3 py-1 text-[11px] font-bold text-white uppercase tracking-wider backdrop-blur-md border border-white/20 shadow-sm">
                      <span className="h-2 w-2 rounded-full bg-white animate-pulse"></span> {storeStatus.reason}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/90 px-3 py-1 text-[11px] font-bold text-white uppercase tracking-wider backdrop-blur-md border border-white/20 shadow-sm">
                      <span className="h-2 w-2 rounded-full bg-white animate-pulse"></span> Aberto agora
                    </span>
                  )}

                  {profile?.deliveryTimeMin && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white/90 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
                      <Clock className="h-3.5 w-3.5 text-indigo-300" />
                      {profile.deliveryTimeMin}-{profile.deliveryTimeMax || 60} min
                    </span>
                  )}

                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white/90 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
                    <Truck className="h-3.5 w-3.5 text-indigo-300" />
                    {profile?.deliveryFee > 0 ? formatCurrency(profile.deliveryFee) : 'Entrega Grátis'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Barra de Pesquisa (Abaixo do Banner) */}
          <div className="px-5 lg:px-12 pt-4 pb-2">
            <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5 shadow-sm ring-1 ring-slate-200/60 focus-within:ring-2 focus-within:ring-[var(--primary-color)] transition-all">
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
                  className="text-slate-400 hover:text-slate-600 rounded-full p-1 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Categorias Navegáveis */}
        {!searchQuery && categories.length > 0 && (
          <div className="sticky top-0 z-30 shrink-0 border-b border-slate-200/60 bg-white/80 px-5 pt-4 pb-0 backdrop-blur-xl lg:px-12 mt-4">
            <div className="flex gap-6 overflow-x-auto no-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`relative whitespace-nowrap pb-3 text-[15px] font-bold transition-colors ${
                    activeCategory === cat ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <span>{cat === 'All' ? 'Menu Completo' : cat}</span>
                  {activeCategory === cat && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      className="absolute bottom-0 left-0 right-0 h-[3px] rounded-t-full"
                      style={{ backgroundColor: 'var(--primary-color)' }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
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
              <h3 className="text-lg font-bold text-slate-600">Nenhum produto cadastrado</h3>
            </div>
          ) : Object.keys(groupedProducts).length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-center text-slate-400">
              <Search className="mb-4 h-12 w-12 opacity-20" />
              <p className="font-medium text-slate-600">Nenhum resultado para "{searchQuery}"</p>
            </div>
          ) : (
            <div className="space-y-12">
              {Object.entries(groupedProducts).map(([catName, prods]) => (
                <section key={catName}>
                  {!searchQuery && (
                    <h2 className="mb-5 flex items-center gap-2 text-[20px] font-black tracking-tight text-slate-900">
                      {catName}
                      <span className="text-[13px] font-bold text-slate-400 bg-slate-200/50 px-2 py-0.5 rounded-full">
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
                          <h3 className="text-[17px] font-bold text-slate-900 leading-tight">
                            {product.name}
                          </h3>
                          {product.description && (
                            <p className="mt-2 text-[14px] leading-snug text-slate-500 line-clamp-2">
                              {product.description}
                            </p>
                          )}

                          <div className="mt-6 flex items-end justify-between gap-4">
                            <div className="flex flex-col">
                              {product.measureUnit && product.measureUnit !== 'UN' && (
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                                  {product.measureUnit}
                                </span>
                              )}
                              <p className="text-lg font-black tracking-tight text-slate-900">
                                {formatCurrency(product.price)}
                              </p>
                            </div>

                            <div>
                              {cart[product.id] ? (
                                <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 p-1 shadow-inner">
                                  <button
                                    onClick={() => handleRemoveFromCart(product.id)}
                                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm transition-transform active:scale-90"
                                  >
                                    <Minus className="h-4 w-4 stroke-[3]" />
                                  </button>
                                  <span className="w-6 text-center text-[15px] font-bold text-slate-800">
                                    {cart[product.id].quantity}
                                  </span>
                                  <button
                                    onClick={() => handleAddToCart(product)}
                                    className="flex h-8 w-8 items-center justify-center rounded-full text-white shadow-sm transition-transform active:scale-90"
                                    style={{ backgroundColor: 'var(--primary-color)' }}
                                  >
                                    <Plus className="h-4 w-4 stroke-[3]" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleAddToCart(product)}
                                  className="flex items-center gap-2 rounded-full px-4 py-2.5 text-[14px] font-bold text-white shadow-md transition-transform hover:-translate-y-0.5 active:scale-95"
                                  style={{ backgroundColor: 'var(--primary-color)' }}
                                >
                                  <Plus className="h-4 w-4 stroke-[3]" />
                                  Adicionar
                                </button>
                              )}
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
      <aside className="hidden w-[400px] shrink-0 border-l border-slate-200 bg-white shadow-2xl lg:block z-30">
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
              <span className="text-[15px] font-bold tracking-wide">Ver Pedido</span>
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
              <div className="flex items-center justify-between border-b border-slate-100 p-6 pt-8 relative">
                <div className="absolute top-3 left-1/2 -translate-x-1/2 h-1.5 w-12 rounded-full bg-slate-200" />
                <h2 className="text-2xl font-black tracking-tight text-slate-900">Seu Pedido</h2>
                <button
                  onClick={() => setIsCartModalOpen(false)}
                  className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 transition-colors"
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
                <MapPin className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
                <div>
                  <p className="font-semibold">Endereço:</p>
                  <p>
                    {profile.street}, {profile.number} - {profile.neighborhood}
                  </p>
                  <p>
                    {profile.city} - {profile.state} {profile.zipcode ? `(CEP: ${profile.zipcode})` : ''}
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
              <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" /> Horários de Funcionamento
              </h4>
              <div className="space-y-1 text-xs">
                {DAYS_OF_WEEK.map((dayName, idx) => {
                  const bh = (profile?.businessHours || []).find((b: any) => b.dayOfWeek === idx)
                  return (
                    <div key={dayName} className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="font-medium text-slate-600">{dayName}</span>
                      {bh && bh.isOpen ? (
                        <span className="font-bold text-emerald-600">{bh.openTime} - {bh.closeTime}</span>
                      ) : (
                        <span className="text-slate-400">Fechado</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Checkout Robusto (iFood / Anota AI / Marujo Standard) */}
      <Dialog open={isCheckoutStepOpen} onOpenChange={setIsCheckoutStepOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <ShoppingBag className="h-5 w-5 text-primary" />
              Finalizar Pedido
            </DialogTitle>
            <DialogDescription>
              Identifique-se e preencha as informações para concluir seu pedido.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2 text-sm">
            {/* Opções de Atendimento (Entrega vs Retirada no Balcão) */}
            <div className="space-y-2">
              <Label className="font-bold">Como deseja receber seu pedido?</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFulfillmentType('DELIVERY')}
                  className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border-2 font-bold text-xs gap-1.5 transition-all ${
                    fulfillmentType === 'DELIVERY'
                      ? 'border-primary bg-primary/5 text-primary shadow-sm'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <Truck className="h-5 w-5" />
                  Entrega Delivery
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFulfillmentType('TAKEOUT')
                    setPaymentMethod('PIX')
                  }}
                  className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border-2 font-bold text-xs gap-1.5 transition-all ${
                    fulfillmentType === 'TAKEOUT'
                      ? 'border-primary bg-primary/5 text-primary shadow-sm'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <Store className="h-5 w-5" />
                  Retirada no Balcão (Pix Antecipado)
                </button>
              </div>
            </div>

            {/* Cadastro e Identificação do Cliente (Padrão Marujo 2 Etapas) */}
            <div className="space-y-4 border-t pt-4">
              {/* Etapa 1: Telefone / WhatsApp com Botão de Busca */}
              <div className="space-y-2 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <Label htmlFor="customerPhone" className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <User className="h-4 w-4 text-primary" />
                    <span>1. Seu Telefone / WhatsApp *</span>
                  </Label>
                  {clientFound && (
                    <span className="flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-100/90 border border-emerald-300 px-2.5 py-0.5 rounded-full shadow-sm">
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
                    className="flex-1 bg-white border-slate-300 focus-visible:ring-primary font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => handlePhoneSearch()}
                    disabled={customerPhone.replace(/\D/g, '').length < 10 || isLoadingPhone}
                    className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 transition-colors disabled:opacity-50 shadow-sm"
                  >
                    {isLoadingPhone ? (
                      <span className="animate-spin text-sm">⏳</span>
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    <span>Buscar</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Digite seu WhatsApp e clique em Buscar para auto-preencher seus dados e endereços salvos.
                </p>
              </div>

              {/* Etapa 2: Dados Pessoais & Endereço (Exibido após buscar telefone ou digitar) */}
              {(hasSearchedPhone || customerPhone.replace(/\D/g, '').length >= 10 || customerName) && (
                <div className="space-y-3 pt-1 duration-300 animate-in fade-in slide-in-from-top-3">
                  <div className="space-y-1">
                    <Label htmlFor="customerName" className="text-xs font-bold text-slate-800">
                      2. Seu Nome Completo *
                    </Label>
                    <Input
                      id="customerName"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      disabled={addressReadonly}
                      placeholder="Ex: João Silva"
                      className="bg-white border-slate-300 focus-visible:ring-primary disabled:bg-slate-100 disabled:text-slate-700 font-medium"
                    />
                  </div>

                  {/* Endereço de Entrega (se Delivery) */}
                  {fulfillmentType === 'DELIVERY' && (
                    <div className="space-y-3 border-t pt-3">
                      <div className="flex items-center justify-between">
                        <Label className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                          <MapPin className="h-4 w-4 text-primary" /> Endereço de Entrega *
                        </Label>

                        {/* Ações de Endereço Salvo (Padrão Marujo) */}
                        <div className="flex items-center gap-3">
                          {savedAddresses.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setIsAddressesModalOpen(true)}
                              className="text-xs font-bold text-primary hover:underline flex items-center gap-1 bg-primary/5 px-2.5 py-1 rounded-lg border border-primary/20"
                            >
                              <MapPin className="h-3.5 w-3.5" /> Escolher entre meus {savedAddresses.length} endereços
                            </button>
                          )}
                          {addressReadonly && (
                            <button
                              type="button"
                              onClick={handleNewAddress}
                              className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
                            >
                              <Plus className="h-3.5 w-3.5" /> Novo Endereço
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Exibição do Endereço Selecionado em Cartão Destacado */}
                      {savedAddresses.length > 0 && !isNewAddress && (
                        <div className="p-3.5 rounded-2xl border-2 border-primary/30 bg-primary/5 space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="text-[10px] font-black uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                Endereço Selecionado
                              </span>
                              <p className="font-bold text-sm text-slate-900 mt-1">
                                {street}, {number}
                              </p>
                              <p className="text-xs text-slate-600 font-medium">
                                {neighborhood} - {city}/{state} {zipcode ? `(CEP: ${zipcode})` : ''}
                              </p>
                              {complement && (
                                <p className="text-xs text-slate-500 italic mt-0.5">
                                  Comp: {complement}
                                </p>
                              )}
                            </div>
                            <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-1" />
                          </div>

                          <div className="flex items-center gap-3 pt-1 border-t border-primary/10">
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
                            <Label htmlFor="zipcode" className="text-xs flex items-center justify-between">
                              <span>Buscar CEP</span>
                              {isSearchingCEPCheckout && <span className="text-[10px] text-emerald-600 font-bold animate-pulse">Buscando endereço...</span>}
                            </Label>
                            <Input
                              id="zipcode"
                              value={zipcode}
                              onChange={handleCepChange}
                              disabled={addressReadonly}
                              placeholder="00000-000"
                              className="bg-white border-slate-300 focus-visible:ring-primary disabled:bg-slate-100 font-medium"
                            />
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <div className="col-span-2 space-y-1">
                              <Label htmlFor="street" className="text-xs">Rua / Logradouro *</Label>
                              <Input
                                id="street"
                                value={street}
                                onChange={(e) => setStreet(e.target.value)}
                                disabled={addressReadonly}
                                placeholder="Ex: Av. Paulista"
                                className="bg-white border-slate-300 focus-visible:ring-primary disabled:bg-slate-100 font-medium"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="number" className="text-xs">Número *</Label>
                              <Input
                                id="number-input"
                                value={number}
                                onChange={(e) => setNumber(e.target.value)}
                                disabled={addressReadonly}
                                placeholder="Ex: 1000"
                                className="bg-white border-slate-300 focus-visible:ring-primary disabled:bg-slate-100 font-medium"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label htmlFor="neighborhood" className="text-xs">Bairro *</Label>
                              <Input
                                id="neighborhood"
                                value={neighborhood}
                                onChange={(e) => setNeighborhood(e.target.value)}
                                disabled={addressReadonly}
                                placeholder="Bairro"
                                className="bg-white border-slate-300 focus-visible:ring-primary disabled:bg-slate-100 font-medium"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="complement" className="text-xs">Complemento / Ref.</Label>
                              <Input
                                id="complement"
                                value={complement}
                                onChange={(e) => setComplement(e.target.value)}
                                disabled={addressReadonly}
                                placeholder="Apto, Bloco, etc."
                                className="bg-white border-slate-300 focus-visible:ring-primary disabled:bg-slate-100 font-medium"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <div className="col-span-2 space-y-1">
                              <Label htmlFor="city" className="text-xs">Cidade *</Label>
                              <Input
                                id="city"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                disabled={addressReadonly}
                                placeholder="Cidade"
                                className="bg-white border-slate-300 focus-visible:ring-primary disabled:bg-slate-100 font-medium"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="state" className="text-xs">Estado *</Label>
                              <Input
                                id="state"
                                value={state}
                                onChange={(e) => setState(e.target.value)}
                                disabled={addressReadonly}
                                maxLength={2}
                                placeholder="UF"
                                className="bg-white border-slate-300 focus-visible:ring-primary uppercase disabled:bg-slate-100 font-medium"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Forma de Pagamento */}
            <div className="space-y-3 border-t pt-3">
              <Label className="font-bold">Forma de Pagamento</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('PIX')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    paymentMethod === 'PIX'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  ⚡ Pix
                </button>

                {fulfillmentType === 'DELIVERY' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('CREDIT')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        paymentMethod === 'CREDIT'
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      💳 Cartão Crédito
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('DEBIT')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        paymentMethod === 'DEBIT'
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      💳 Cartão Débito
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('CASH')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        paymentMethod === 'CASH'
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      💵 Dinheiro
                    </button>
                  </>
                )}
              </div>

              {/* Caixa da Chave Pix & QR Code Oficial (Retirada ou Opção Pix) */}
              {(paymentMethod === 'PIX' || fulfillmentType === 'TAKEOUT') && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                      <QrCode className="h-4 w-4 text-emerald-600" />
                      <span>QR Code Pix & Copia e Cola Oficial</span>
                    </div>
                    <span className="text-[11px] font-black text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                      {formatCurrency(cartTotal)}
                    </span>
                  </div>

                  {/* Renderização do QR Code Visual Oficial BACEN */}
                  {pixBRCodePayload && (
                    <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-emerald-200 shadow-sm">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(pixBRCodePayload)}`}
                        alt="QR Code Pix do Pedido"
                        className="h-44 w-44 object-contain rounded-lg"
                      />
                      <p className="text-[11px] text-slate-500 font-semibold mt-2 text-center">
                        Abra o app do seu banco e escaneie o QR Code acima
                      </p>
                    </div>
                  )}

                  <p className="text-[11px] text-emerald-700 leading-snug">
                    Ou copie o código <strong>Pix Copia e Cola</strong> abaixo. Ao colar no seu banco, o valor exato de <strong>{formatCurrency(cartTotal)}</strong> será preenchido automaticamente!
                  </p>

                  <div className="flex items-center gap-2 rounded-xl bg-white border border-emerald-200 p-2.5 shadow-sm">
                    <span className="flex-1 font-mono text-[11px] text-slate-800 truncate font-semibold">
                      {pixBRCodePayload || profile?.pixKey || profile?.whatsappNumber || 'Contate a loja'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyPixKey(pixBRCodePayload || profile?.pixKey || profile?.whatsappNumber || '')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shrink-0 transition-colors shadow-sm"
                    >
                      {isCopiedPix ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {isCopiedPix ? 'Pix Copiado!' : 'Copiar Pix Copia e Cola'}
                    </button>
                  </div>
                </div>
              )}

              {paymentMethod === 'CASH' && fulfillmentType === 'DELIVERY' && (
                <div className="space-y-1 pt-1">
                  <Label htmlFor="changeAmount" className="text-xs">Precisa de troco para quanto?</Label>
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
            <div className="rounded-xl border bg-slate-50 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Subtotal dos itens</span>
                <span>{formatCurrency(cartSubtotal)}</span>
              </div>
              {fulfillmentType === 'DELIVERY' && (
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Taxa de Entrega</span>
                  <span>{deliveryFee > 0 ? formatCurrency(deliveryFee) : 'Grátis'}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-base font-black text-slate-900 border-t pt-2">
                <span>Total a Pagar</span>
                <span style={{ color: 'var(--primary-color)' }}>{formatCurrency(cartTotal)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleFinalizeOrder}
              className="w-full py-4 rounded-2xl font-bold text-white shadow-lg transition-transform active:scale-98"
              style={{ backgroundColor: 'var(--primary-color)' }}
            >
              Confirmar e Enviar Pedido via WhatsApp
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Dialog de Meus Endereços Cadastrados (Padrão Marujo) */}
      <Dialog open={isAddressesModalOpen} onOpenChange={setIsAddressesModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <MapPin className="h-5 w-5 text-primary" /> Meus Endereços Cadastrados
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Selecione em qual endereço deseja receber seu pedido:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2.5 max-h-[60vh] overflow-y-auto py-2 pr-1">
            {savedAddresses.map((addr, index) => {
              const isSelected = addressReadonly && street === addr.street && number === addr.number?.toString()
              return (
                <div
                  key={index}
                  onClick={() => handleSelectSavedAddress(addr)}
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-start justify-between gap-3 ${
                    isSelected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-slate-900">
                        {addr.street}, {addr.number}
                      </p>
                      {addr.is_main && (
                        <span className="bg-primary/10 text-primary text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                          Principal
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 font-medium">
                      {addr.neighborhood} - {addr.city}/{addr.state}
                    </p>
                    {addr.zipcode && (
                      <p className="text-[11px] text-slate-400">
                        CEP: {formatCep(addr.zipcode.toString().padStart(8, '0'))}
                      </p>
                    )}
                  </div>
                  {isSelected && <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />}
                </div>
              )
            })}
          </div>

          <div className="pt-2 border-t flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                handleNewAddress()
                setIsAddressesModalOpen(false)
              }}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
            >
              <Plus className="h-4 w-4" /> Cadastrar novo endereço
            </button>
            <button
              type="button"
              onClick={() => setIsAddressesModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
            >
              Fechar
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
