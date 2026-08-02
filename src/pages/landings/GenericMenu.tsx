import { useQuery } from '@tanstack/react-query'
import { Store, ShoppingBag, Plus, Minus, Info } from 'lucide-react'
import { useState } from 'react'
import { api } from '@/lib/axios'
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

  const { data: products, isLoading } = useQuery({
    queryKey: ['public-menu'],
    queryFn: fetchMenu,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  // Group by category
  const categories = products?.reduce((acc, product) => {
    const cat = product.category || 'Geral'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(product)
    return acc
  }, {} as Record<string, Product[]>)

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

  const cartTotal = Object.values(cart).reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const cartCount = Object.values(cart).reduce((sum, item) => sum + item.quantity, 0)

  const handleCheckout = () => {
    if (!profile?.whatsappNumber) {
      alert('Número de WhatsApp não configurado por este estabelecimento.')
      return
    }
    
    let text = `Olá, gostaria de fazer um pedido no *${tenantName}*:\n\n`
    Object.values(cart).forEach((item) => {
      text += `${item.quantity}x ${item.product.name} - ${formatCurrency(item.product.price * item.quantity)}\n`
    })
    text += `\n*Total:* ${formatCurrency(cartTotal)}`

    const phone = profile.whatsappNumber.replace(/\D/g, '')
    const url = `https://wa.me/55${phone}?text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background-color)] pb-24 font-sans text-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-10 flex flex-col items-center justify-center p-6 shadow-sm" style={{ backgroundColor: 'var(--secondary-color)', borderBottom: '2px solid var(--primary-color)' }}>
        <div className="mb-3 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full shadow-md" style={{ backgroundColor: 'var(--background-color)' }}>
          {profile?.logo_url ? (
            <img src={profile.logo_url} alt="Logo da Empresa" className="h-full w-full object-cover" />
          ) : (
            <Store className="h-10 w-10" style={{ color: 'var(--primary-color)' }} />
          )}
        </div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--primary-color)' }}>
          {tenantName}
        </h1>
        {profile?.isOpenManual === false && (
          <div className="mt-2 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
            Fechado no momento
          </div>
        )}
      </header>

      {/* Banner / Info */}
      {profile?.banner_url && (
        <div className="h-40 w-full overflow-hidden">
          <img src={profile.banner_url} className="h-full w-full object-cover" alt="Banner" />
        </div>
      )}

      {/* Menu Content */}
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <span className="animate-pulse">Carregando cardápio...</span>
          </div>
        ) : !products?.length ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-center">
            <Info className="mb-4 h-12 w-12 opacity-20" />
            <p>Nenhum produto cadastrado no momento.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {categories && Object.entries(categories).map(([catName, prods]) => (
              <section key={catName}>
                <h2 className="mb-4 border-b-2 pb-2 text-xl font-bold" style={{ borderColor: 'var(--primary-color)', color: 'var(--primary-color)' }}>
                  {catName}
                </h2>
                <div className="grid gap-4">
                  {prods.map((product) => (
                    <div key={product.id} className="flex items-center justify-between rounded-xl p-4 shadow-sm" style={{ backgroundColor: 'var(--secondary-color)' }}>
                      <div className="flex-1 pr-4">
                        <h3 className="font-semibold text-slate-700">{product.name}</h3>
                        {product.description && (
                          <p className="text-sm text-slate-400 mt-1 line-clamp-2">{product.description}</p>
                        )}
                        <p className="mt-2 font-bold" style={{ color: 'var(--primary-color)' }}>{formatCurrency(product.price)}</p>
                      </div>
                      
                      <div className="flex flex-col items-center gap-2">
                        {cart[product.id] ? (
                          <div className="flex items-center gap-3 rounded-full bg-slate-100 p-1 shadow-inner">
                            <button onClick={() => handleRemoveFromCart(product.id)} className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm text-slate-600 hover:bg-slate-50 transition-colors">
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="w-4 text-center font-semibold text-sm">{cart[product.id].quantity}</span>
                            <button onClick={() => handleAddToCart(product)} className="flex h-8 w-8 items-center justify-center rounded-full shadow-sm text-white transition-colors" style={{ backgroundColor: 'var(--primary-color)' }}>
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleAddToCart(product)}
                            className="flex h-10 w-24 items-center justify-center gap-2 rounded-full font-medium text-white shadow-sm transition-transform active:scale-95"
                            style={{ backgroundColor: 'var(--primary-color)' }}
                          >
                            Adicionar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {/* Floating Cart Button */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-900/10 to-transparent pointer-events-none">
          <div className="mx-auto max-w-2xl pointer-events-auto">
            <button
              onClick={handleCheckout}
              disabled={profile?.isOpenManual === false}
              className="flex w-full items-center justify-between rounded-2xl p-4 font-bold text-white shadow-lg transition-transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--primary-color)' }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <span>{cartCount} item(s)</span>
              </div>
              <div className="flex items-center gap-2">
                <span>Ver sacola</span>
                <span className="rounded-xl bg-white/20 px-3 py-1">{formatCurrency(cartTotal)}</span>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
