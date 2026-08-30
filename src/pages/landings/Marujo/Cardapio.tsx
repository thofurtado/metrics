import { useQuery } from '@tanstack/react-query'
import {
  Anchor,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  RotateCw,
  ShoppingBag,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'

import {
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog'
import { Textarea } from '@/components/ui/textarea'

import { LogoMarujo } from '../../../components/logos/LogoMarujo'
import { getCurrentTenant } from '../../../config/tenants'
import { api } from '../../../lib/axios'
import { CartProvider, useCart } from './CartContext'
import { CartDrawer } from './CartDrawer'

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
  useEffect(() => {
    const root = document.documentElement
    const hadDark = root.classList.contains('dark')
    root.classList.remove('dark')
    root.classList.add('light')
    return () => {
      if (hadDark) {
        root.classList.add('dark')
        root.classList.remove('light')
      }
    }
  }, [])
  const isDev = import.meta.env.DEV

  if (!isDev && getCurrentTenant()?.id !== 'marujo') {
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
    if (scrollRef.current)
      scrollRef.current.scrollBy({ left: -200, behavior: 'smooth' })
  }

  const scrollRight = () => {
    if (scrollRef.current)
      scrollRef.current.scrollBy({ left: 200, behavior: 'smooth' })
  }

  const { data, isLoading, error, refetch } = useQuery<{ products: Product[] }>(
    {
      queryKey: ['public-menu'],
      queryFn: async () => {
        const response = await api.get('/public/menu')
        return response.data
      },
    },
  )

  const products = Array.isArray(data?.products) ? data.products : (Array.isArray(data) ? data : [])

  const groupedProducts = products.reduce(
    (acc, product) => {
      if (!acc[product.category]) {
        acc[product.category] = []
      }
      acc[product.category].push(product)
      return acc
    },
    {} as Record<string, Product[]>,
  )

  const categories = Object.keys(groupedProducts).sort()

  if (!activeCategory && categories.length > 0) {
    setActiveCategory(categories[0])
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-stone-900 to-black pb-20 font-sans text-stone-200">
      <header className="relative sticky top-0 z-50 flex h-20 w-full shrink-0 items-center justify-between border-b border-white/10 bg-black/50 px-4 py-4 backdrop-blur-md sm:h-24 sm:px-6 md:h-28">
        {/* Botão de Voltar à Esquerda */}
        <div className="z-10 flex flex-1 justify-start">
          <Link
            to="/"
            className="pointer-events-auto flex items-center gap-2 font-serif font-bold text-amber-500 transition-colors hover:text-amber-400"
          >
            <ArrowLeft size={24} />
            <span className="hidden sm:inline">Voltar</span>
          </Link>
        </div>

        {/* Logo Centralizado Absoluto */}
        <LogoMarujo />

        {/* Espaço à Direita (Para Botões Futuros ou Carrinho) */}
        <div className="z-10 flex flex-1 justify-end"></div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-8">
        <div className="mb-10 text-center">
          <h1
            className="mb-4 text-5xl font-bold text-amber-500 drop-shadow-lg"
            style={{ fontFamily: '"Pirata One", cursive' }}
          >
            Nosso Cardápio
          </h1>
          <p className="font-medium tracking-wide text-stone-300">
            Escolha sua categoria e desfrute do melhor sabor dos mares
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="h-12 w-12 animate-spin rounded-full border-b-4 border-amber-500"></div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="mb-4 text-xl font-bold text-red-400">
              Ocorreu um erro ao carregar o cardápio.
            </div>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 rounded-lg border border-amber-600 px-6 py-2 font-bold text-amber-500 transition-colors hover:bg-amber-600/10"
            >
              <RotateCw size={18} /> Tentar Novamente
            </button>
          </div>
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-70">
            <Anchor size={64} className="mb-6 text-amber-500 drop-shadow-md" />
            <h3
              className="mb-2 text-2xl font-bold text-amber-500"
              style={{ fontFamily: '"Cinzel", serif' }}
            >
              Nada no horizonte!
            </h3>
            <p className="mb-6 text-lg text-stone-300">
              Nenhum prato disponível no momento.
            </p>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 rounded-lg bg-amber-600 px-6 py-3 font-bold text-stone-900 shadow-md transition-colors hover:bg-amber-500"
            >
              <RotateCw size={18} /> Içar as Velas
            </button>
          </div>
        ) : (
          <div>
            {/* Tabs de Categorias */}
            <div className="group relative mb-8 w-full">
              <button
                onClick={scrollLeft}
                className="absolute left-0 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center bg-gradient-to-r from-stone-950 to-transparent text-amber-500 md:flex"
              >
                <ChevronLeft size={28} />
              </button>

              <div
                ref={scrollRef}
                className="flex max-w-full snap-x flex-nowrap justify-start gap-4 overflow-x-auto whitespace-nowrap border-b border-white/10 pb-4 [&::-webkit-scrollbar]:hidden"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`shrink-0 whitespace-nowrap px-4 py-2 text-lg font-bold transition-all duration-300 ${
                      activeCategory === category
                        ? 'border-b-4 border-amber-600 text-amber-500 drop-shadow-sm'
                        : 'border-b-4 border-transparent text-stone-400 hover:text-stone-200'
                    }`}
                    style={{ fontFamily: '"Cinzel", serif' }}
                  >
                    {category}
                  </button>
                ))}
              </div>

              <button
                onClick={scrollRight}
                className="absolute right-0 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center bg-gradient-to-l from-stone-950 to-transparent text-amber-500 md:flex"
              >
                <ChevronRight size={28} />
              </button>
            </div>

            {/* Listagem de Produtos */}
            <div className="space-y-4">
              {activeCategory &&
                groupedProducts[activeCategory]?.map((product) => (
                  <div
                    key={product.id}
                    data-testid={`product-item-${product.display_id}`}
                    className="flex flex-col justify-between gap-4 rounded-xl border border-white/10 bg-white/5 p-5 shadow-lg backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-amber-500/10 sm:flex-row sm:items-center"
                  >
                    <div className="flex min-h-[4rem] flex-1 flex-col justify-center pr-4">
                      <h3
                        className="text-xl font-bold text-stone-100"
                        style={{ fontFamily: '"Cinzel", serif' }}
                      >
                        {product.name}
                      </h3>
                      <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm text-stone-400">
                        {product.description || ''}
                      </p>
                    </div>
                    <div className="mt-2 flex w-full items-center justify-between gap-4 sm:mt-0 sm:w-auto sm:justify-end">
                      <div className="shrink-0 text-2xl font-bold text-amber-500">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(product.price)}
                      </div>
                      <button
                        data-testid={`add-to-cart-${product.display_id}`}
                        onClick={() => {
                          setSelectedProduct(product)
                          setModalQuantity(1)
                          setModalObservation('')
                        }}
                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-amber-600/50 bg-amber-600/20 text-amber-400 shadow-lg transition-all hover:scale-105 hover:bg-amber-600 hover:text-stone-950"
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
          className="group fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full border border-orange-900/20 bg-gradient-to-br from-orange-800 to-orange-950 text-white shadow-2xl transition-transform hover:scale-105"
        >
          <ShoppingBag
            size={28}
            className="transition-transform group-hover:-translate-y-1"
          />
          <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#d4b88c] bg-red-600 text-xs font-bold text-white shadow-md">
            {cartCount}
          </span>
        </button>
      )}

      <ResponsiveDialog
        open={!!selectedProduct}
        onOpenChange={(open) => !open && setSelectedProduct(null)}
      >
        <ResponsiveDialogContent className="border border-white/10 bg-stone-950 text-stone-200 sm:max-w-md">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle
              className="text-2xl font-bold text-amber-500"
              style={{ fontFamily: '"Cinzel", serif' }}
            >
              {selectedProduct?.name}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription className="text-stone-400">
              {selectedProduct?.description ||
                'Adicione ao pedido e conte com o melhor sabor.'}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <div className="space-y-6 py-6">
            <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-4">
              <span className="font-medium text-stone-300">Preço</span>
              <span className="text-xl font-bold text-amber-500">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(selectedProduct?.price || 0)}
              </span>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-bold uppercase tracking-wide text-stone-400">
                Alguma observação?
              </label>
              <Textarea
                placeholder="Ex: Tirar cebola, ponto da carne..."
                value={modalObservation}
                onChange={(e) => setModalObservation(e.target.value)}
                className="min-h-[80px] resize-none border-white/10 bg-stone-900 text-stone-200 placeholder:text-stone-600 focus-visible:ring-amber-500"
              />
            </div>

            {selectedProduct?.measureUnit === 'FRACTIONAL' && (
              <div className="my-4 flex w-full justify-center gap-2">
                <button
                  onClick={() => setModalQuantity(1)}
                  className={`flex-1 rounded-lg border py-2 text-sm font-bold transition-colors ${modalQuantity === 1 ? 'border-amber-500 bg-amber-500 text-stone-950' : 'border-amber-500/50 bg-transparent text-amber-500 hover:bg-amber-500/10'}`}
                >
                  Comprar Inteira (1x)
                </button>
                <button
                  onClick={() => setModalQuantity(0.5)}
                  className={`flex-1 rounded-lg border py-2 text-sm font-bold transition-colors ${modalQuantity === 0.5 ? 'border-amber-500 bg-amber-500 text-stone-950' : 'border-amber-500/50 bg-transparent text-amber-500 hover:bg-amber-500/10'}`}
                >
                  Metade (0.5x)
                </button>
              </div>
            )}

            <div className="mx-auto mt-4 flex w-full max-w-[160px] items-center justify-between rounded-lg border border-white/10 bg-stone-900 p-1">
              <button
                onClick={() =>
                  setModalQuantity(
                    Math.max(
                      selectedProduct?.measureUnit === 'FRACTIONAL' ? 0.5 : 1,
                      modalQuantity -
                        (selectedProduct?.measureUnit === 'FRACTIONAL'
                          ? 0.5
                          : 1),
                    ),
                  )
                }
                className="flex h-10 w-10 items-center justify-center rounded-md text-amber-500 transition-colors hover:bg-white/10"
              >
                <Minus size={20} />
              </button>
              <span className="w-10 text-center text-xl font-bold">
                {modalQuantity === 0.5 ? '1/2' : modalQuantity}
              </span>
              <button
                onClick={() =>
                  setModalQuantity(
                    modalQuantity +
                      (selectedProduct?.measureUnit === 'FRACTIONAL' ? 0.5 : 1),
                  )
                }
                className="flex h-10 w-10 items-center justify-center rounded-md text-amber-500 transition-colors hover:bg-white/10"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          <ResponsiveDialogFooter className="flex-col gap-3 pt-2 sm:flex-row">
            <ResponsiveDialogClose asChild>
              <button className="hidden flex-1 rounded-lg py-3 font-bold text-stone-300 transition-colors hover:bg-white/5 sm:block">
                Cancelar
              </button>
            </ResponsiveDialogClose>
            <button
              onClick={() => {
                if (selectedProduct) {
                  addToCart(
                    selectedProduct,
                    modalQuantity,
                    modalObservation.trim(),
                  )
                  setSelectedProduct(null)
                }
              }}
              className="flex-1 rounded-lg bg-amber-600 py-3 font-bold text-stone-950 transition-colors hover:bg-amber-500"
            >
              Adicionar -{' '}
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }).format((selectedProduct?.price || 0) * modalQuantity)}
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
