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
}

export default function GenericMenu({ tenantName, profile }: GenericMenuProps) {
  const [cart, setCart] = useState<Record<string, CartItem>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const [isCartModalOpen, setIsCartModalOpen] = useState(false)
  const [isStoreInfoOpen, setIsStoreInfoOpen] = useState(false)

  // Estados do Modal de Checkout Robusto (iFood / Anota AI)
  const [isCheckoutStepOpen, setIsCheckoutStepOpen] = useState(false)
  const [fulfillmentType, setFulfillmentType] = useState<'DELIVERY' | 'TAKEOUT' | 'DINE_IN'>('DELIVERY')
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

  const handleSearchCEPCheckout = async () => {
    const cleaned = zipcode.replace(/\D/g, '')
    if (cleaned.length !== 8) {
      alert('Informe um CEP válido com 8 dígitos para buscar.')
      return
    }

    setIsSearchingCEPCheckout(true)
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${cleaned}`)
      if (!res.ok) throw new Error()
      const data = await res.json()

      if (data.street) setStreet(data.street)
      if (data.neighborhood) setNeighborhood(data.neighborhood)
      if (data.city) setCity(data.city)
      if (data.state) setState(data.state)
    } catch {
      try {
        const resVia = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`)
        const data = await resVia.json()
        if (data.erro) throw new Error()
        if (data.logradouro) setStreet(data.logradouro)
        if (data.bairro) setNeighborhood(data.bairro)
        if (data.localidade) setCity(data.localidade)
        if (data.uf) setState(data.uf)
      } catch {
        alert('Erro ao buscar CEP. Por favor, preencha o endereço manualmente.')
      }
    } finally {
      setIsSearchingCEPCheckout(false)
    }
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
        await api.post('/public/checkout/client', {
          name: customerName,
          phone: customerPhone,
          street,
          number,
          neighborhood,
          city: city || profile?.city || '',
          state: state || profile?.state || '',
          zipcode,
        })
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

  const CartContent = () => (
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
        <CartContent />
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
                <CartContent />
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

      {/* Modal de Checkout Robusto (iFood / Anota AI Standard) */}
      <Dialog open={isCheckoutStepOpen} onOpenChange={setIsCheckoutStepOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <ShoppingBag className="h-5 w-5 text-primary" />
              Finalizar Pedido
            </DialogTitle>
            <DialogDescription>
              Preencha seus dados de entrega e forma de pagamento para concluir.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2 text-sm">
            {/* Opções de Atendimento */}
            <div className="space-y-2">
              <Label className="font-bold">Como deseja receber seu pedido?</Label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setFulfillmentType('DELIVERY')}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 font-bold text-xs gap-1.5 transition-all ${
                    fulfillmentType === 'DELIVERY'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <Truck className="h-4 w-4" />
                  Entrega
                </button>
                <button
                  type="button"
                  onClick={() => setFulfillmentType('TAKEOUT')}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 font-bold text-xs gap-1.5 transition-all ${
                    fulfillmentType === 'TAKEOUT'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <Store className="h-4 w-4" />
                  Retirada
                </button>
                <button
                  type="button"
                  onClick={() => setFulfillmentType('DINE_IN')}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 font-bold text-xs gap-1.5 transition-all ${
                    fulfillmentType === 'DINE_IN'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <UtensilsCrossed className="h-4 w-4" />
                  No Local
                </button>
              </div>
            </div>

            {/* Dados do Cliente */}
            <div className="space-y-3 border-t pt-3">
              <Label className="font-bold">Seus Dados</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="customerName" className="text-xs">Seu Nome Completo *</Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Ex: João Silva"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="customerPhone" className="text-xs">WhatsApp / Telefone *</Label>
                  <Input
                    id="customerPhone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="11999999999"
                  />
                </div>
              </div>
            </div>

            {/* Endereço de Entrega (se Delivery) */}
            {fulfillmentType === 'DELIVERY' && (
              <div className="space-y-3 border-t pt-3">
                <Label className="font-bold flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-primary" /> Endereço de Entrega
                </Label>

                <div className="space-y-1">
                  <Label htmlFor="zipcode" className="text-xs">Buscar CEP</Label>
                  <div className="flex gap-2">
                    <Input
                      id="zipcode"
                      value={zipcode}
                      onChange={(e) => setZipcode(e.target.value)}
                      placeholder="00000-000"
                    />
                    <button
                      type="button"
                      onClick={handleSearchCEPCheckout}
                      disabled={isSearchingCEPCheckout}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 hover:bg-slate-100 shrink-0 flex items-center gap-1"
                    >
                      <Search className="h-3.5 w-3.5 text-primary" />
                      {isSearchingCEPCheckout ? 'Buscando...' : 'Buscar CEP'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2 space-y-1">
                    <Label htmlFor="street" className="text-xs">Logradouro / Rua *</Label>
                    <Input
                      id="street"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="Rua Exemplo"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="number" className="text-xs">Número *</Label>
                    <Input
                      id="number"
                      value={number}
                      onChange={(e) => setNumber(e.target.value)}
                      placeholder="123"
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
                      placeholder="Bairro"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="complement" className="text-xs">Complemento / Ref.</Label>
                    <Input
                      id="complement"
                      value={complement}
                      onChange={(e) => setComplement(e.target.value)}
                      placeholder="Apto 12, Bloco B"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2 space-y-1">
                    <Label htmlFor="city" className="text-xs">Cidade</Label>
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Cidade"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="state" className="text-xs">UF</Label>
                    <Input
                      id="state"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="UF"
                      maxLength={2}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Forma de Pagamento */}
            <div className="space-y-3 border-t pt-3">
              <Label className="font-bold">Forma de Pagamento</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('PIX')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                    paymentMethod === 'PIX'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  ⚡ Pix
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CREDIT')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
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
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
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
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                    paymentMethod === 'CASH'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  💵 Dinheiro
                </button>
              </div>

              {paymentMethod === 'CASH' && (
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
    </div>
  )
}
