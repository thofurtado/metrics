import { useQuery } from '@tanstack/react-query'
import { Store, ShoppingBag, Plus, Minus, Info, Search, X, ChevronRight, UtensilsCrossed } from 'lucide-react'
import { useState, useMemo, useEffect } from 'react'
import { api } from '@/lib/axios'
import { motion, AnimatePresence } from 'framer-motion'

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
}

async function fetchMenu() {
  const response = await api.get<{ products: Product[] }>('/public/menu')
  return response.data.products
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

// Subcomponent: Dynamic Hero Header
const DynamicHero = ({ profile }: { profile: any }) => {
  if (profile?.banner_url) {
    return (
      <div className="relative h-40 w-full lg:h-56">
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent z-10" />
        <img src={profile.banner_url} className="h-full w-full object-cover" alt="Banner" />
      </div>
    )
  }

  // Generative elegant background based on primary color
  return (
    <div 
      className="relative h-32 w-full lg:h-48 overflow-hidden" 
      style={{ backgroundColor: 'var(--primary-color)' }}
    >
      <div className="absolute inset-0 opacity-20 mix-blend-overlay" style={{
        backgroundImage: `radial-gradient(circle at 20% 150%, rgba(255,255,255,0.8) 0%, transparent 50%), radial-gradient(circle at 80% -50%, rgba(0,0,0,0.5) 0%, transparent 50%)`
      }} />
      <motion.div 
        animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/10 blur-3xl pointer-events-none"
      />
      <motion.div 
        animate={{ scale: [1, 1.5, 1] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-black/10 blur-3xl pointer-events-none"
      />
    </div>
  )
}

export default function GenericMenu({ tenantName, profile }: GenericMenuProps) {
  const [cart, setCart] = useState<Record<string, CartItem>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const [isCartModalOpen, setIsCartModalOpen] = useState(false)

  const { data: products, isLoading } = useQuery({
    queryKey: ['public-menu'],
    queryFn: fetchMenu,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

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
          (p.description && p.description.toLowerCase().includes(q)),
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
      {} as Record<string, Product[]>,
    )
  }, [filteredProducts])

  const handleAddToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev[product.id]
      if (existing) {
        return { ...prev, [product.id]: { ...existing, quantity: existing.quantity + 1 } }
      }
      return { ...prev, [product.id]: { product, quantity: 1 } }
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
  const cartTotal = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)

  const handleCheckout = () => {
    if (!profile?.whatsappNumber) {
      alert('Número de WhatsApp não configurado por este estabelecimento.')
      return
    }

    let text = `Olá, gostaria de fazer um pedido no *${tenantName}*:\n\n`
    cartItems.forEach((item) => {
      text += `${item.quantity}x ${item.product.name} - ${formatCurrency(item.product.price * item.quantity)}\n`
    })
    text += `\n*Total:* ${formatCurrency(cartTotal)}`

    const phone = profile.whatsappNumber.replace(/\D/g, '')
    const url = `https://wa.me/55${phone}?text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
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
                  className="flex items-start justify-between gap-4"
                >
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-800 text-[15px] leading-snug">{item.product.name}</h4>
                    <p className="font-black mt-1" style={{ color: 'var(--primary-color)' }}>
                      {formatCurrency(item.product.price * item.quantity)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-1 shadow-inner shrink-0">
                    <button
                      onClick={() => handleRemoveFromCart(item.product.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm transition-transform active:scale-90"
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
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div className="border-t border-slate-100 bg-slate-50 p-6">
        <div className="mb-5 flex items-end justify-between text-slate-900">
          <span className="text-[15px] font-bold text-slate-500 uppercase tracking-wide">Subtotal</span>
          <span className="text-2xl font-black tracking-tight">{formatCurrency(cartTotal)}</span>
        </div>
        <button
          onClick={handleCheckout}
          disabled={cartCount === 0 || profile?.isOpenManual === false}
          className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-bold text-white shadow-lg transition-all hover:shadow-xl active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          style={{ backgroundColor: 'var(--primary-color)' }}
        >
          {profile?.isOpenManual === false ? 'Restaurante Fechado' : 'Avançar para o Checkout'}
          {profile?.isOpenManual !== false && <ChevronRight className="h-5 w-5 stroke-[3]" />}
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-[#F8FAFC] font-sans text-slate-800 lg:flex-row">
      <main className="flex flex-1 flex-col overflow-x-hidden pb-24 lg:pb-0 relative">
        <header className="relative z-10 shrink-0 bg-[#F8FAFC]">
          <DynamicHero profile={profile} />

          <div className="relative z-20 -mt-10 px-5 lg:px-12 flex flex-col gap-5">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-[3px] border-white bg-white shadow-md lg:h-24 lg:w-24">
                {profile?.logo_url ? (
                  <img src={profile.logo_url} alt="Logo" className="h-full w-full object-cover" />
                ) : (
                  <Store className="h-full w-full p-4" style={{ color: 'var(--primary-color)' }} />
                )}
              </div>
              <div className="flex flex-col pt-8">
                <h1 className="text-[22px] font-black tracking-tight text-slate-900 leading-none">
                  {tenantName}
                </h1>
                <div className="mt-2">
                  {profile?.isOpenManual === false ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100/80 px-2.5 py-1 text-[11px] font-bold text-red-700 uppercase tracking-wider backdrop-blur-sm">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span> Fechado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/80 px-2.5 py-1 text-[11px] font-bold text-emerald-700 uppercase tracking-wider backdrop-blur-sm">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Aberto
                    </span>
                  )}
                </div>
              </div>
            </div>

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
                <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600 rounded-full p-1 hover:bg-slate-100">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </header>

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
                      <span className="text-[13px] font-bold text-slate-400 bg-slate-200/50 px-2 py-0.5 rounded-full">{prods.length}</span>
                    </h2>
                  )}
                  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {prods.map((product) => (
                      <div
                        key={product.id}
                        className="group relative flex flex-col overflow-hidden rounded-[24px] bg-white shadow-sm ring-1 ring-slate-200/60 transition-all hover:shadow-xl hover:shadow-slate-200/50 hover:ring-slate-300"
                      >
                        {product.imageUrl ? (
                          <div className="h-40 w-full overflow-hidden bg-slate-50">
                            <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                          </div>
                        ) : null}
                        <div className="flex flex-1 flex-col p-5">
                          <h3 className="text-[17px] font-bold text-slate-900 leading-tight">{product.name}</h3>
                          {product.description && (
                            <p className="mt-2 text-[14px] leading-snug text-slate-500 line-clamp-2">
                              {product.description}
                            </p>
                          )}
                          
                          <div className="mt-6 flex items-end justify-between gap-4">
                            <div className="flex flex-col">
                              {product.measureUnit && product.measureUnit !== 'UN' && (
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">{product.measureUnit}</span>
                              )}
                              <p className="text-lg font-black tracking-tight text-slate-900">
                                {formatCurrency(product.price)}
                              </p>
                            </div>
                            
                            <div>
                              {cart[product.id] ? (
                                <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 p-1 shadow-inner">
                                  <button onClick={() => handleRemoveFromCart(product.id)} className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm transition-transform active:scale-90">
                                    <Minus className="h-4 w-4 stroke-[3]" />
                                  </button>
                                  <span className="w-6 text-center text-[15px] font-bold text-slate-800">{cart[product.id].quantity}</span>
                                  <button onClick={() => handleAddToCart(product)} className="flex h-8 w-8 items-center justify-center rounded-full text-white shadow-sm transition-transform active:scale-90" style={{ backgroundColor: 'var(--primary-color)' }}>
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

      <aside className="hidden w-[400px] shrink-0 border-l border-slate-200 bg-white shadow-2xl lg:block z-30">
        <CartContent />
      </aside>

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
    </div>
  )
}
