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
  imageUrl?: string // Optional for future or current use
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

  // Derived state: categories
  const categories = useMemo(() => {
    if (!products) return []
    const cats = Array.from(new Set(products.map((p) => p.category || 'Geral')))
    return ['All', ...cats]
  }, [products])

  // Set initial category when loaded
  useEffect(() => {
    if (categories.length > 1 && activeCategory === 'All') {
      setActiveCategory('All')
    }
  }, [categories, activeCategory])

  // Filtered products based on search and category
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

  // Group filtered products by category for rendering
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

  // Common Cart Component for both Mobile Modal and Desktop Sidebar
  const CartContent = () => (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between border-b p-6">
        <h2 className="text-xl font-bold text-slate-800">Seu Pedido</h2>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
          {cartCount} itens
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {cartItems.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-slate-400">
            <ShoppingBag className="mb-4 h-16 w-16 opacity-20" />
            <p className="text-center font-medium">Sua sacola está vazia.</p>
            <p className="mt-1 text-sm">Adicione itens para fazer seu pedido.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <AnimatePresence>
              {cartItems.map((item) => (
                <motion.div
                  key={item.product.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex items-start justify-between gap-4"
                >
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-800">{item.product.name}</h4>
                    <p className="font-medium" style={{ color: 'var(--primary-color)' }}>
                      {formatCurrency(item.product.price * item.quantity)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 rounded-full border p-1 shadow-sm">
                    <button
                      onClick={() => handleRemoveFromCart(item.product.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-4 text-center text-sm font-bold text-slate-700">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => handleAddToCart(item.product)}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-white shadow-sm transition-transform active:scale-95"
                      style={{ backgroundColor: 'var(--primary-color)' }}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div className="border-t bg-slate-50 p-6">
        <div className="mb-4 flex items-center justify-between text-lg font-bold text-slate-800">
          <span>Total</span>
          <span>{formatCurrency(cartTotal)}</span>
        </div>
        <button
          onClick={handleCheckout}
          disabled={cartCount === 0 || profile?.isOpenManual === false}
          className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-bold text-white shadow-lg transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          style={{ backgroundColor: 'var(--primary-color)' }}
        >
          {profile?.isOpenManual === false ? 'Fechado' : 'Finalizar Pedido'}
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-[var(--background-color)] font-sans text-slate-800 lg:flex-row">
      
      {/* MAIN CONTENT AREA */}
      <main className="flex flex-1 flex-col overflow-hidden pb-24 lg:pb-0">
        
        {/* HEADER & BANNER */}
        <header className="relative z-10 shrink-0 bg-white shadow-sm">
          {profile?.banner_url ? (
            <div className="relative h-40 w-full lg:h-56">
              <div className="absolute inset-0 bg-black/30 z-10" />
              <img src={profile.banner_url} className="h-full w-full object-cover" alt="Banner" />
              {/* Logo over banner */}
              <div className="absolute -bottom-10 left-6 z-20 flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-white shadow-lg lg:left-12 lg:h-32 lg:w-32">
                {profile?.logo_url ? (
                  <img src={profile.logo_url} alt="Logo" className="h-full w-full object-cover" />
                ) : (
                  <Store className="h-10 w-10" style={{ color: 'var(--primary-color)' }} />
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-32 items-end px-6 pb-6 lg:h-40 lg:px-12" style={{ backgroundColor: 'var(--secondary-color)' }}>
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-white shadow-lg lg:h-24 lg:w-24">
                {profile?.logo_url ? (
                  <img src={profile.logo_url} alt="Logo" className="h-full w-full object-cover" />
                ) : (
                  <Store className="h-10 w-10" style={{ color: 'var(--primary-color)' }} />
                )}
              </div>
            </div>
          )}

          <div className="mt-12 px-6 pb-6 pt-2 lg:mt-4 lg:px-12 lg:ml-48">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                  {tenantName}
                </h1>
                {profile?.isOpenManual === false ? (
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                    <span className="h-2 w-2 rounded-full bg-red-500"></span>
                    Fechado no momento
                  </span>
                ) : (
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Aberto para pedidos
                  </span>
                )}
              </div>
            </div>
            
            {/* Search Bar */}
            <div className="mt-6 flex items-center gap-3 rounded-2xl bg-slate-100 px-4 py-3 shadow-inner">
              <Search className="h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por pratos, ingredientes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-slate-700 placeholder-slate-400 outline-none"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </header>

        {/* CATEGORY TABS (Sticky) */}
        {!searchQuery && categories.length > 0 && (
          <div className="sticky top-0 z-20 shrink-0 border-b bg-white/80 px-6 py-4 backdrop-blur-md lg:px-12">
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className="relative whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-bold transition-colors"
                  style={{
                    color: activeCategory === cat ? 'white' : 'var(--primary-color)',
                  }}
                >
                  {activeCategory === cat && (
                    <motion.div
                      layoutId="activeCategory"
                      className="absolute inset-0 rounded-full"
                      style={{ backgroundColor: 'var(--primary-color)' }}
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <span className="relative z-10">
                    {cat === 'All' ? 'Todos' : cat}
                  </span>
                  {/* Subtle translucent background for non-active items */}
                  {activeCategory !== cat && (
                    <div 
                      className="absolute inset-0 rounded-full opacity-10" 
                      style={{ backgroundColor: 'var(--primary-color)' }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PRODUCT LIST */}
        <div className="flex-1 overflow-y-auto px-6 py-8 lg:px-12">
          {isLoading ? (
            <div className="flex h-64 flex-col items-center justify-center space-y-4">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[var(--primary-color)]" />
              <span className="text-sm font-medium text-slate-500">Preparando o cardápio...</span>
            </div>
          ) : !products?.length ? (
            <div className="flex h-64 flex-col items-center justify-center text-center text-slate-400">
              <UtensilsCrossed className="mb-4 h-16 w-16 opacity-20" />
              <h3 className="text-lg font-bold text-slate-600">Nenhum produto encontrado</h3>
              <p className="mt-1 text-sm">Volte mais tarde para conferir as novidades.</p>
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
                    <h2 className="mb-6 flex items-center gap-2 text-2xl font-extrabold text-slate-800">
                      {catName}
                      <span className="text-sm font-normal text-slate-400">({prods.length})</span>
                    </h2>
                  )}
                  <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    {prods.map((product) => (
                      <div
                        key={product.id}
                        className="group relative flex flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-100 transition-all hover:shadow-md hover:ring-slate-200"
                      >
                        {product.imageUrl ? (
                          <div className="h-48 w-full overflow-hidden bg-slate-100">
                            <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                          </div>
                        ) : null}
                        <div className="flex flex-1 flex-col p-5">
                          <h3 className="text-lg font-bold text-slate-800 leading-tight">{product.name}</h3>
                          {product.description && (
                            <p className="mt-2 text-sm text-slate-500 line-clamp-2">
                              {product.description}
                            </p>
                          )}
                          <div className="mt-auto pt-4 flex items-center justify-between">
                            <p className="text-xl font-black tracking-tight" style={{ color: 'var(--primary-color)' }}>
                              {formatCurrency(product.price)}
                            </p>
                            
                            <div>
                              {cart[product.id] ? (
                                <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1 shadow-sm">
                                  <button onClick={() => handleRemoveFromCart(product.id)} className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors">
                                    <Minus className="h-4 w-4" />
                                  </button>
                                  <span className="w-6 text-center text-sm font-bold">{cart[product.id].quantity}</span>
                                  <button onClick={() => handleAddToCart(product)} className="flex h-8 w-8 items-center justify-center rounded-full text-white shadow-sm transition-transform active:scale-95" style={{ backgroundColor: 'var(--primary-color)' }}>
                                    <Plus className="h-4 w-4" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleAddToCart(product)}
                                  className="flex h-10 w-10 items-center justify-center rounded-full text-white shadow-sm transition-transform hover:scale-105 active:scale-95"
                                  style={{ backgroundColor: 'var(--primary-color)' }}
                                >
                                  <Plus className="h-5 w-5" />
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

      {/* DESKTOP SIDEBAR CART */}
      <aside className="hidden w-[400px] shrink-0 border-l border-slate-200 bg-white shadow-2xl lg:block z-30">
        <CartContent />
      </aside>

      {/* MOBILE FLOATING CART BUTTON */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4 lg:hidden">
          <motion.button
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            onClick={() => setIsCartModalOpen(true)}
            className="flex w-full items-center justify-between rounded-2xl p-4 font-bold text-white shadow-2xl transition-transform active:scale-[0.98]"
            style={{ backgroundColor: 'var(--primary-color)' }}
          >
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                <ShoppingBag className="h-5 w-5" />
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-black" style={{ color: 'var(--primary-color)' }}>
                  {cartCount}
                </span>
              </div>
              <span className="text-lg">Ver Sacola</span>
            </div>
            <span className="rounded-xl bg-white/20 px-4 py-2 text-lg">
              {formatCurrency(cartTotal)}
            </span>
          </motion.button>
        </div>
      )}

      {/* MOBILE CART MODAL (BOTTOM SHEET) */}
      <AnimatePresence>
        {isCartModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartModalOpen(false)}
              className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              className="fixed bottom-0 left-0 right-0 z-50 flex h-[85vh] flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-2xl lg:hidden"
            >
              <div className="flex items-center justify-between border-b p-6 pt-8 relative">
                <div className="absolute top-3 left-1/2 -translate-x-1/2 h-1.5 w-12 rounded-full bg-slate-200" />
                <h2 className="text-2xl font-bold text-slate-800">Seu Pedido</h2>
                <button
                  onClick={() => setIsCartModalOpen(false)}
                  className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"
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
