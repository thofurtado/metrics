import { useQuery } from '@tanstack/react-query'
import { api } from '../../../lib/axios'
import { useState, useRef } from 'react'
import { TENANTS_CONFIG, getCurrentTenant } from '../../../config/tenants'
import { ArrowLeft, Anchor, RotateCw, Plus, ShoppingBag, ChevronLeft, ChevronRight } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import { CartProvider, useCart } from './CartContext'
import { CartDrawer } from './CartDrawer'

interface Product {
    id: string
    name: string
    price: number
    category: string
}

function CardapioContent() {
    if (getCurrentTenant().id !== 'marujo') {
        return <Navigate to="/" />
    }

    const tenant = TENANTS_CONFIG['metrics-two-gamma.vercel.app']
    const [activeCategory, setActiveCategory] = useState<string>('')
    const [logoError, setLogoError] = useState(false)
    const { addToCart, setIsCartOpen, items } = useCart()
    const cartCount = items.reduce((acc, i) => acc + i.quantity, 0)

    const scrollRef = useRef<HTMLDivElement>(null)

    const scrollLeft = () => {
        if (scrollRef.current) scrollRef.current.scrollBy({ left: -200, behavior: 'smooth' })
    }

    const scrollRight = () => {
        if (scrollRef.current) scrollRef.current.scrollBy({ left: 200, behavior: 'smooth' })
    }

    const { data, isLoading, error, refetch } = useQuery<{ products: Product[] }>({
        queryKey: ['public-menu'],
        queryFn: async () => {
            const response = await api.get('/public/menu')
            return response.data
        }
    })

    const products = data?.products || []

    const groupedProducts = products.reduce((acc, product) => {
        if (!acc[product.category]) {
            acc[product.category] = []
        }
        acc[product.category].push(product)
        return acc
    }, {} as Record<string, Product[]>)

    const categories = Object.keys(groupedProducts).sort()

    if (!activeCategory && categories.length > 0) {
        setActiveCategory(categories[0])
    }

    return (
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-stone-900 to-black text-stone-200 font-sans pb-20">
            <header className="p-4 flex flex-row items-center justify-between border-b border-white/10 bg-black/40 backdrop-blur-md sticky top-0 z-50 w-full">
                <Link to="/" className="text-amber-500 hover:text-amber-400 transition-colors flex items-center gap-2 font-bold font-serif w-1/4">
                    <ArrowLeft size={24} />
                    <span className="hidden sm:inline">Voltar</span>
                </Link>

                <div className="flex-1 flex justify-center w-2/4">
                    {!logoError ? (
                        <img
                            src={tenant.logo}
                            alt={`Logo de ${tenant.name}`}
                            className="h-14 object-contain drop-shadow-md"
                            onError={() => setLogoError(true)}
                        />
                    ) : (
                        <span className="text-2xl font-bold text-amber-500 tracking-wider whitespace-nowrap drop-shadow-md" style={{ fontFamily: '"Pirata One", cursive' }}>
                            {tenant.name}
                        </span>
                    )}
                </div>

                <div className="w-1/4"></div>
            </header>

            <main className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="text-center mb-10">
                    <h1 className="text-5xl font-bold text-amber-500 drop-shadow-lg mb-4" style={{ fontFamily: '"Pirata One", cursive' }}>
                        Nosso Cardápio
                    </h1>
                    <p className="text-stone-300 font-medium tracking-wide">
                        Escolha sua categoria e desfrute do melhor sabor dos mares
                    </p>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-amber-500"></div>
                    </div>
                ) : error ? (
                    <div className="text-center py-20 flex flex-col items-center">
                        <div className="text-red-400 font-bold text-xl mb-4">
                            Ocorreu um erro ao carregar o cardápio.
                        </div>
                        <button onClick={() => refetch()} className="flex items-center gap-2 text-amber-500 font-bold px-6 py-2 rounded-lg border border-amber-600 hover:bg-amber-600/10 transition-colors">
                            <RotateCw size={18} /> Tentar Novamente
                        </button>
                    </div>
                ) : categories.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-70">
                        <Anchor size={64} className="text-amber-500 mb-6 drop-shadow-md" />
                        <h3 className="text-2xl font-bold text-amber-500 mb-2" style={{ fontFamily: '"Cinzel", serif' }}>Nada no horizonte!</h3>
                        <p className="text-lg text-stone-300 mb-6">Nenhum prato disponível no momento.</p>
                        <button onClick={() => refetch()} className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-stone-900 font-bold px-6 py-3 rounded-lg shadow-md transition-colors">
                            <RotateCw size={18} /> Içar as Velas
                        </button>
                    </div>
                ) : (
                    <div>
                        {/* Tabs de Categorias */}
                        <div className="relative group w-full mb-8">
                            <button
                                onClick={scrollLeft}
                                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 hidden md:flex items-center justify-center w-10 h-10 bg-gradient-to-r from-stone-950 to-transparent text-amber-500 cursor-pointer"
                            >
                                <ChevronLeft size={28} />
                            </button>

                            <div
                                ref={scrollRef}
                                className="flex max-w-full overflow-x-auto flex-nowrap whitespace-nowrap justify-start gap-4 pb-4 snap-x border-b border-white/10 [&::-webkit-scrollbar]:hidden"
                                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                            >
                                {categories.map(category => (
                                    <button
                                        key={category}
                                        onClick={() => setActiveCategory(category)}
                                        className={`shrink-0 px-4 py-2 font-bold text-lg whitespace-nowrap transition-all duration-300 ${activeCategory === category
                                            ? 'text-amber-500 border-b-4 border-amber-600 drop-shadow-sm'
                                            : 'text-stone-400 border-b-4 border-transparent hover:text-stone-200'
                                            }`}
                                        style={{ fontFamily: '"Cinzel", serif' }}
                                    >
                                        {category}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={scrollRight}
                                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 hidden md:flex items-center justify-center w-10 h-10 bg-gradient-to-l from-stone-950 to-transparent text-amber-500 cursor-pointer"
                            >
                                <ChevronRight size={28} />
                            </button>
                        </div>

                        {/* Listagem de Produtos */}
                        <div className="space-y-4">
                            {activeCategory && groupedProducts[activeCategory]?.map(product => (
                                <div key={product.id} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-5 flex flex-col sm:flex-row justify-between sm:items-center shadow-lg hover:shadow-amber-500/10 hover:-translate-y-1 transition-all duration-300 gap-4">
                                    <div className="flex-1 pr-4">
                                        <h3 className="text-xl font-bold text-stone-100" style={{ fontFamily: '"Cinzel", serif' }}>{product.name}</h3>
                                    </div>
                                    <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                                        <div className="text-2xl font-bold text-amber-500 shrink-0">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
                                        </div>
                                        <button
                                            onClick={() => addToCart(product)}
                                            className="w-10 h-10 flex flex-shrink-0 items-center justify-center bg-amber-600/20 border border-amber-600/50 text-amber-400 rounded-full shadow-lg hover:bg-amber-600 hover:text-stone-950 hover:scale-105 transition-all"
                                        >
                                            <Plus size={20} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

            {cartCount > 0 && (
                <button
                    onClick={() => setIsCartOpen(true)}
                    className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-orange-800 to-orange-950 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-105 transition-transform z-50 group border border-orange-900/20"
                >
                    <ShoppingBag size={28} className="group-hover:-translate-y-1 transition-transform" />
                    <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-md border-2 border-[#d4b88c]">
                        {cartCount}
                    </span>
                </button>
            )}

        </div>
    )
}

export default function Cardapio() {
    return (
        <CartProvider>
            <CardapioContent />
            <CartDrawer />
        </CartProvider>
    )
}
