import { useQuery } from '@tanstack/react-query'
import { api } from '../../../lib/axios'
import { useState, useRef } from 'react'
import { getCurrentTenant } from '../../../config/tenants'
import { ArrowLeft, Anchor, RotateCw, Plus, Minus, ShoppingBag, ChevronLeft, ChevronRight } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import { LogoMarujo } from '../../../components/logos/LogoMarujo'
import { CartProvider, useCart } from './CartContext'
import { CartDrawer } from './CartDrawer'
import {
    ResponsiveDialog,
    ResponsiveDialogContent,
    ResponsiveDialogHeader,
    ResponsiveDialogTitle,
    ResponsiveDialogFooter,
    ResponsiveDialogClose,
    ResponsiveDialogDescription
} from '@/components/ui/responsive-dialog'
import { Textarea } from '@/components/ui/textarea'

interface Product {
    id: string
    name: string
    price: number
    category: string
    display_id?: string
    description?: string
    measureUnit?: 'UNITARY' | 'FRACTIONAL'
}

function CardapioContent() {
    const isDev = import.meta.env.DEV;

    if (!isDev && getCurrentTenant().id !== 'marujo') {
        return <Navigate to="/" />
    }

    const [activeCategory, setActiveCategory] = useState<string>('')
    const { addToCart, setIsCartOpen, items } = useCart()
    const cartCount = items.reduce((acc, i) => acc + i.quantity, 0)

    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
    const [modalQuantity, setModalQuantity] = useState(1)
    const [modalObservation, setModalObservation] = useState('')

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
            <header className="py-4 px-4 sm:px-6 flex items-center justify-between border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50 w-full relative shrink-0 h-20 sm:h-24 md:h-28">
                {/* Botão de Voltar à Esquerda */}
                <div className="flex-1 flex justify-start z-10">
                    <Link to="/" className="text-amber-500 hover:text-amber-400 transition-colors flex items-center gap-2 font-bold font-serif pointer-events-auto">
                        <ArrowLeft size={24} />
                        <span className="hidden sm:inline">Voltar</span>
                    </Link>
                </div>

                {/* Logo Centralizado Absoluto */}
                <LogoMarujo />

                {/* Espaço à Direita (Para Botões Futuros ou Carrinho) */}
                <div className="flex-1 flex justify-end z-10">
                </div>
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
                                <div key={product.id} data-testid={`product-item-${product.display_id}`} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-5 flex flex-col sm:flex-row justify-between sm:items-center shadow-lg hover:shadow-amber-500/10 hover:-translate-y-1 transition-all duration-300 gap-4">
                                    <div className="flex-1 pr-4 min-h-[4rem] flex flex-col justify-center">
                                        <h3 className="text-xl font-bold text-stone-100" style={{ fontFamily: '"Cinzel", serif' }}>{product.name}</h3>
                                        <p className="text-sm text-stone-400 mt-1 line-clamp-2 min-h-[2.5rem]">
                                            {product.description || ''}
                                        </p>
                                    </div>
                                    <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto mt-2 sm:mt-0">
                                        <div className="text-2xl font-bold text-amber-500 shrink-0">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
                                        </div>
                                        <button
                                            data-testid={`add-to-cart-${product.display_id}`}
                                            onClick={() => {
                                                setSelectedProduct(product)
                                                setModalQuantity(1)
                                                setModalObservation('')
                                            }}
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

            <ResponsiveDialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
                <ResponsiveDialogContent className="sm:max-w-md bg-stone-950 border border-white/10 text-stone-200">
                    <ResponsiveDialogHeader>
                        <ResponsiveDialogTitle className="text-2xl text-amber-500 font-bold" style={{ fontFamily: '"Cinzel", serif' }}>
                            {selectedProduct?.name}
                        </ResponsiveDialogTitle>
                        <ResponsiveDialogDescription className="text-stone-400">
                            {selectedProduct?.description || 'Adicione ao pedido e conte com o melhor sabor.'}
                        </ResponsiveDialogDescription>
                    </ResponsiveDialogHeader>

                    <div className="py-6 space-y-6">
                        <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/5">
                            <span className="text-stone-300 font-medium">Preço</span>
                            <span className="text-xl font-bold text-amber-500">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedProduct?.price || 0)}
                            </span>
                        </div>

                        <div className="space-y-3">
                            <label className="text-sm font-bold text-stone-400 uppercase tracking-wide block">Alguma observação?</label>
                            <Textarea
                                placeholder="Ex: Tirar cebola, ponto da carne..."
                                value={modalObservation}
                                onChange={(e) => setModalObservation(e.target.value)}
                                className="bg-stone-900 border-white/10 text-stone-200 placeholder:text-stone-600 focus-visible:ring-amber-500 resize-none min-h-[80px]"
                            />
                        </div>

                        {selectedProduct?.measureUnit === 'FRACTIONAL' && (
                            <div className="flex gap-2 w-full justify-center my-4">
                                <button
                                    onClick={() => setModalQuantity(1)}
                                    className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors ${modalQuantity === 1 ? 'bg-amber-500 text-stone-950 border-amber-500' : 'bg-transparent text-amber-500 border-amber-500/50 hover:bg-amber-500/10'}`}
                                >
                                    Comprar Inteira (1x)
                                </button>
                                <button
                                    onClick={() => setModalQuantity(0.5)}
                                    className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors ${modalQuantity === 0.5 ? 'bg-amber-500 text-stone-950 border-amber-500' : 'bg-transparent text-amber-500 border-amber-500/50 hover:bg-amber-500/10'}`}
                                >
                                    Metade (0.5x)
                                </button>
                            </div>
                        )}

                        <div className="flex items-center justify-between p-1 bg-stone-900 rounded-lg border border-white/10 w-full max-w-[160px] mx-auto mt-4">
                            <button
                                onClick={() => setModalQuantity(Math.max(selectedProduct?.measureUnit === 'FRACTIONAL' ? 0.5 : 1, modalQuantity - (selectedProduct?.measureUnit === 'FRACTIONAL' ? 0.5 : 1)))}
                                className="w-10 h-10 flex items-center justify-center text-amber-500 hover:bg-white/10 rounded-md transition-colors"
                            >
                                <Minus size={20} />
                            </button>
                            <span className="font-bold text-xl w-10 text-center">{modalQuantity === 0.5 ? '1/2' : modalQuantity}</span>
                            <button
                                onClick={() => setModalQuantity(modalQuantity + (selectedProduct?.measureUnit === 'FRACTIONAL' ? 0.5 : 1))}
                                className="w-10 h-10 flex items-center justify-center text-amber-500 hover:bg-white/10 rounded-md transition-colors"
                            >
                                <Plus size={20} />
                            </button>
                        </div>
                    </div>

                    <ResponsiveDialogFooter className="flex-col sm:flex-row gap-3 pt-2">
                        <ResponsiveDialogClose asChild>
                            <button className="flex-1 py-3 text-stone-300 font-bold hover:bg-white/5 rounded-lg transition-colors hidden sm:block">
                                Cancelar
                            </button>
                        </ResponsiveDialogClose>
                        <button
                            onClick={() => {
                                if (selectedProduct) {
                                    addToCart(selectedProduct, modalQuantity, modalObservation.trim())
                                    setSelectedProduct(null)
                                }
                            }}
                            className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-lg transition-colors"
                        >
                            Adicionar - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((selectedProduct?.price || 0) * modalQuantity)}
                        </button>
                    </ResponsiveDialogFooter>
                </ResponsiveDialogContent>
            </ResponsiveDialog>

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
