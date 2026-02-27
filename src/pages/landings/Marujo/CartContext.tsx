import { createContext, useContext, useState, ReactNode } from 'react'
import { toast } from 'sonner'

export interface CartItem {
    id: string
    productId: string
    name: string
    price: number
    quantity: number
    observation?: string
    measureUnit?: 'UNITARY' | 'FRACTIONAL'
}

interface CartContextData {
    items: CartItem[]
    addToCart: (product: { id: string; name: string; price: number; measureUnit?: string }, quantity?: number, observation?: string) => void
    removeFromCart: (id: string) => void
    updateQuantity: (id: string, quantity: number) => void
    clearCart: () => void
    total: number
    isCartOpen: boolean
    setIsCartOpen: (isOpen: boolean) => void
}

const CartContext = createContext<CartContextData>({} as CartContextData)

export function CartProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([])
    const [isCartOpen, setIsCartOpen] = useState(false)

    const addToCart = (product: { id: string; name: string; price: number; measureUnit?: string }, quantity: number = 1, observation?: string) => {
        setItems(prev => {
            const cartItemId = `${product.id}-${observation || ''}`
            const existing = prev.find(i => i.id === cartItemId)
            if (existing) {
                return prev.map(i => i.id === cartItemId ? { ...i, quantity: i.quantity + quantity } : i)
            }
            return [...prev, { id: cartItemId, productId: product.id, name: product.name, price: product.price, quantity, observation, measureUnit: product.measureUnit as any }]
        })
        toast.success(`${product.name} adicionado ao carrinho!`, {
            style: { background: '#7c2d12', color: '#fff', border: 'none' },
            duration: 1500,
            position: 'top-center'
        })
    }

    const removeFromCart = (id: string) => {
        setItems(prev => prev.filter(i => i.id !== id))
    }

    const updateQuantity = (id: string, quantity: number) => {
        if (quantity < 0.5) {
            removeFromCart(id)
            return
        }
        setItems(prev => prev.map(i => i.id === id ? { ...i, quantity } : i))
    }

    const clearCart = () => {
        setItems([])
    }

    const total = items.reduce((acc, item) => acc + (item.price * item.quantity), 0)

    return (
        <CartContext.Provider value={{
            items,
            addToCart,
            removeFromCart,
            updateQuantity,
            clearCart,
            total,
            isCartOpen,
            setIsCartOpen
        }}>
            {children}
        </CartContext.Provider>
    )
}

export const useCart = () => useContext(CartContext)
