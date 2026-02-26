import { createContext, useContext, useState, ReactNode } from 'react'
import { toast } from 'sonner'

export interface CartItem {
    id: string
    name: string
    price: number
    quantity: number
}

interface CartContextData {
    items: CartItem[]
    addToCart: (product: { id: string; name: string; price: number }) => void
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

    const addToCart = (product: { id: string; name: string; price: number }) => {
        setItems(prev => {
            const existing = prev.find(i => i.id === product.id)
            if (existing) {
                return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
            }
            return [...prev, { ...product, quantity: 1 }]
        })
        toast.success(`${product.name} adicionado ao carrinho!`, {
            style: { background: '#7c2d12', color: '#fff', border: 'none' }
        })
    }

    const removeFromCart = (id: string) => {
        setItems(prev => prev.filter(i => i.id !== id))
    }

    const updateQuantity = (id: string, quantity: number) => {
        if (quantity < 1) {
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
