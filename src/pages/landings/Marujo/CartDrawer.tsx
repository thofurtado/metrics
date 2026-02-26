import { useState } from 'react'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Minus, Trash2, ShoppingBag } from 'lucide-react'
import { useCart } from './CartContext'

export function CartDrawer() {
    const { items, isCartOpen, setIsCartOpen, updateQuantity, total, clearCart } = useCart()

    const [name, setName] = useState('')
    const [phone, setPhone] = useState('')
    const [street, setStreet] = useState('')
    const [number, setNumber] = useState('')
    const [neighborhood, setNeighborhood] = useState('')
    const [reference, setReference] = useState('')
    const [paymentMethod, setPaymentMethod] = useState('Dinheiro')

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        if (items.length === 0) return

        const formattedItems = items.map(i => `*${i.quantity}x* ${i.name} - R$ ${(i.price * i.quantity).toFixed(2).replace('.', ',')}`).join('%0A')
        const formattedTotal = total.toFixed(2).replace('.', ',')

        const message = `Olá Marujo! Gostaria de fazer o seguinte pedido:%0A%0A${formattedItems}%0A%0ATotal: *R$ ${formattedTotal}*%0A%0ADados de Entrega:%0A${name} - ${phone}%0A${street}, ${number} - ${neighborhood}%0ARef: ${reference}%0A%0APagamento: *${paymentMethod}*`

        window.open(`https://wa.me/5512996293344?text=${message}`, '_blank')
        clearCart()
        setIsCartOpen(false)
    }

    return (
        <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
            <SheetContent className="w-full sm:max-w-md flex flex-col bg-[#fdf8f0] border-l-orange-900/20 p-0 sm:p-0">
                <SheetHeader className="p-6 border-b border-orange-900/10 bg-orange-900/5">
                    <SheetTitle className="flex items-center gap-2 text-2xl text-orange-950 font-serif" style={{ fontFamily: '"Cinzel", serif' }}>
                        <ShoppingBag className="text-orange-800" />
                        Seu Pedido
                    </SheetTitle>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {items.length === 0 ? (
                        <div className="text-center text-orange-900/60 py-10 font-medium">
                            Seu carrinho está vazio.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {items.map(item => (
                                <div key={item.id} className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm border border-orange-900/10">
                                    <div className="flex-1">
                                        <h4 className="font-bold text-orange-950">{item.name}</h4>
                                        <div className="text-orange-800 font-medium mt-1">
                                            R$ {item.price.toFixed(2).replace('.', ',')}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 bg-orange-50 rounded-lg p-1 border border-orange-200">
                                        <button
                                            type="button"
                                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                            className="w-8 h-8 flex items-center justify-center bg-white text-orange-900 rounded-md shadow-sm border border-orange-200 hover:bg-orange-100 transition-colors"
                                        >
                                            {item.quantity <= 1 ? <Trash2 size={16} className="text-red-500" /> : <Minus size={16} />}
                                        </button>
                                        <span className="font-bold text-orange-950 w-4 text-center">{item.quantity}</span>
                                        <button
                                            type="button"
                                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                            className="w-8 h-8 flex items-center justify-center bg-orange-900 text-white rounded-md shadow-sm hover:bg-orange-800 transition-colors"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {items.length > 0 && (
                        <form id="checkout-form" onSubmit={handleSubmit} className="space-y-4 pt-6 border-t border-orange-900/10">
                            <h3 className="font-bold text-lg text-orange-950 mb-4" style={{ fontFamily: '"Cinzel", serif' }}>Dados de Entrega</h3>

                            <div className="space-y-3">
                                <Input required placeholder="Seu Nome" value={name} onChange={(e) => setName(e.target.value)} className="bg-white border-orange-900/20 focus-visible:ring-orange-900" />
                                <Input required placeholder="Telefone / WhatsApp" value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-white border-orange-900/20 focus-visible:ring-orange-900" />

                                <div className="grid grid-cols-3 gap-3">
                                    <Input required placeholder="Rua" value={street} onChange={(e) => setStreet(e.target.value)} className="col-span-2 bg-white border-orange-900/20 focus-visible:ring-orange-900" />
                                    <Input required placeholder="Núm." value={number} onChange={(e) => setNumber(e.target.value)} className="bg-white border-orange-900/20 focus-visible:ring-orange-900" />
                                </div>
                                <Input required placeholder="Bairro" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} className="bg-white border-orange-900/20 focus-visible:ring-orange-900" />
                                <Input placeholder="Ponto de Referência (Opcional)" value={reference} onChange={(e) => setReference(e.target.value)} className="bg-white border-orange-900/20 focus-visible:ring-orange-900" />

                                <div className="pt-2">
                                    <label className="text-sm font-bold text-orange-950 mb-2 block">Forma de Pagamento</label>
                                    <select
                                        required
                                        value={paymentMethod}
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                        className="flex h-10 w-full items-center justify-between rounded-md border border-orange-900/20 bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <option value="Dinheiro">Dinheiro</option>
                                        <option value="Pix">Pix</option>
                                        <option value="Cartão de Crédito">Cartão de Crédito</option>
                                        <option value="Cartão de Débito">Cartão de Débito</option>
                                    </select>
                                </div>
                            </div>
                        </form>
                    )}
                </div>

                <SheetFooter className="p-6 bg-white border-t border-orange-900/10 shrink-0 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
                    <div className="w-full flex justify-between items-center mb-4">
                        <span className="text-lg font-medium text-orange-950">Total</span>
                        <span className="text-2xl font-bold text-orange-900">R$ {total.toFixed(2).replace('.', ',')}</span>
                    </div>

                    <Button
                        type="submit"
                        form="checkout-form"
                        disabled={items.length === 0}
                        className="w-full h-14 text-lg font-bold bg-gradient-to-r from-orange-800 to-orange-950 hover:from-orange-900 hover:to-orange-950 text-white shadow-xl rounded-xl transition-all"
                    >
                        Finalizar Pedido
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    )
}
