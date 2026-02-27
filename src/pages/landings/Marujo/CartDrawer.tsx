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
import { Plus, Minus, Trash2, ShoppingBag, Loader2, Search } from 'lucide-react'
import { useCart } from './CartContext'
import { api } from '../../../lib/axios'
import { toast } from 'sonner'

export function CartDrawer() {
    const { items, isCartOpen, setIsCartOpen, updateQuantity, total, clearCart } = useCart()

    const fractionalSum = items
        .filter(i => i.measureUnit === 'FRACTIONAL')
        .reduce((sum, i) => sum + i.quantity, 0);
    const hasFractionalPendency = fractionalSum % 1 !== 0;

    const [name, setName] = useState('')
    const [phone, setPhone] = useState('')
    const [cep, setCep] = useState('')
    const [street, setStreet] = useState('')
    const [number, setNumber] = useState('')
    const [neighborhood, setNeighborhood] = useState('')
    const [city, setCity] = useState('')
    const [state, setState] = useState('')
    const [reference, setReference] = useState('')
    const [paymentMethod, setPaymentMethod] = useState('Dinheiro')

    const [isLoadingCep, setIsLoadingCep] = useState(false)
    const [cepError, setCepError] = useState('')

    const [clientFound, setClientFound] = useState(false)
    const [addressReadonly, setAddressReadonly] = useState(false)
    const [isNewAddress, setIsNewAddress] = useState(false)
    const [isLoadingPhone, setIsLoadingPhone] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [hasSearchedPhone, setHasSearchedPhone] = useState(false)

    const formatPhone = (val: string) => {
        let v = val.replace(/\D/g, '').substring(0, 11)
        if (v.length > 10) {
            return v.replace(/^(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
        } else if (v.length > 6) {
            return v.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3')
        } else if (v.length > 2) {
            return v.replace(/^(\d{2})(\d{0,5})/, '($1) $2')
        } else if (v.length > 0) {
            return v.replace(/^(\d{0,2})/, '($1')
        }
        return v
    }

    const formatCep = (val: string) => {
        let v = val.replace(/\D/g, '').substring(0, 8)
        if (v.length > 5) {
            return v.replace(/^(\d{5})(\d{1,3})/, '$1-$2')
        }
        return v
    }

    const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawCep = e.target.value.replace(/\D/g, '')
        setCep(rawCep)
        setCepError('')

        if (rawCep.length === 8) {
            setIsLoadingCep(true)
            try {
                const res = await fetch(`https://brasilapi.com.br/api/cep/v1/${rawCep}`)
                if (!res.ok) throw new Error('CEP não encontrado')

                const data = await res.json()
                setStreet(data.street || '')
                setNeighborhood(data.neighborhood || '')
                setCity(data.city || '')
                setState(data.state || '')

                setTimeout(() => {
                    document.getElementById('number-input')?.focus()
                }, 100)
            } catch (err) {
                setCepError('CEP não encontrado')
            } finally {
                setIsLoadingCep(false)
            }
        }
    }

    const handlePhoneSearch = async () => {
        const rawPhone = phone.replace(/\D/g, '')
        if (rawPhone.length < 10) return

        setIsLoadingPhone(true)
        try {
            const res = await api.get(`/public/clients/phone/${rawPhone}`)
            if (res.data.client) {
                const client = res.data.client
                setName(client.name || '')
                setClientFound(true)

                if (client.addresses && client.addresses.length > 0) {
                    const addr = client.addresses[0]
                    setCep(addr.zipcode?.toString().padStart(8, '0') || '')
                    setStreet(addr.street || '')
                    setNumber(addr.number?.toString() || '')
                    setNeighborhood(addr.neighborhood || '')
                    setCity(addr.city || '')
                    setState(addr.state || '')
                    setAddressReadonly(true)
                    setIsNewAddress(false)
                }
            }
        } catch (error: any) {
            setClientFound(false)
            setAddressReadonly(false)
            setIsNewAddress(true)
            setName('')
            setCep('')
            setStreet('')
            setNumber('')
            setNeighborhood('')
            setCity('')
            setState('')
        } finally {
            setIsLoadingPhone(false)
            setHasSearchedPhone(true)
        }
    }

    const handleNewAddress = () => {
        setAddressReadonly(false)
        setIsNewAddress(true)
        setCep('')
        setStreet('')
        setNumber('')
        setNeighborhood('')
        setCity('')
        setState('')
        setReference('')
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (items.length === 0) return

        setIsSubmitting(true)
        try {
            const rawPhone = phone.replace(/\D/g, '')
            await api.post('/public/checkout/client', {
                name,
                phone: rawPhone,
                street,
                number,
                neighborhood,
                city,
                state,
                zipcode: cep ? cep.replace(/\D/g, '') : undefined,
                isNewAddress
            })

            const formatQty = (q: number) => q === 0.5 ? '1/2' : q === 1.5 ? '1.5' : q === 2.5 ? '2.5' : q;

            const formattedItems = items.map(i => `*${formatQty(i.quantity)}x* ${i.name} - R$ ${(i.price * i.quantity).toFixed(2).replace('.', ',')}${i.observation ? `%0A  _Obs: ${i.observation}_` : ''}`).join('%0A')
            const formattedTotal = total.toFixed(2).replace('.', ',')

            const rawCepToSend = cep.replace(/\D/g, '')
            const adrressString = rawCepToSend
                ? `${street}, ${number} - ${neighborhood}%0A${city}/${state} - CEP: ${formatCep(rawCepToSend)}`
                : `${street}, ${number} - ${neighborhood}`

            const message = `Olá Marujo! Gostaria de fazer o seguinte pedido:%0A%0A${formattedItems}%0A%0ATotal: *R$ ${formattedTotal}*%0A%0ADados de Entrega:%0A${name} - ${formatPhone(phone)}%0A${adrressString}%0ARef: ${reference}%0A%0APagamento: *${paymentMethod}*`

            window.open(`https://wa.me/5512996293344?text=${message}`, '_blank')
            clearCart()
            setIsCartOpen(false)
        } catch (error) {
            toast.error("Ocorreu um erro ao registrar as informações da entrega.")
        } finally {
            setIsSubmitting(false)
        }
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
                            {items.map(item => {
                                const step = item.measureUnit === 'FRACTIONAL' ? 0.5 : 1;
                                const formatQtyLocal = (q: number) => q === 0.5 ? '1/2' : q;

                                return (
                                    <div key={item.id} className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm border border-orange-900/10">
                                        <div className="flex-1">
                                            <h4 className="font-bold text-orange-950">{item.name}</h4>
                                            {item.observation && (
                                                <p className="text-xs text-orange-900/70 italic mt-0.5 max-w-[180px] break-words line-clamp-2">
                                                    Obs: {item.observation}
                                                </p>
                                            )}
                                            <div className="text-orange-800 font-medium mt-1">
                                                R$ {item.price.toFixed(2).replace('.', ',')}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 bg-orange-50 rounded-lg p-1 border border-orange-200">
                                            <button
                                                type="button"
                                                onClick={() => updateQuantity(item.id, item.quantity - step)}
                                                className="w-8 h-8 flex items-center justify-center bg-white text-orange-900 rounded-md shadow-sm border border-orange-200 hover:bg-orange-100 transition-colors"
                                            >
                                                {item.quantity <= step ? <Trash2 size={16} className="text-red-500" /> : <Minus size={16} />}
                                            </button>
                                            <span className="font-bold text-orange-950 w-6 text-center">{formatQtyLocal(item.quantity)}</span>
                                            <button
                                                type="button"
                                                onClick={() => updateQuantity(item.id, item.quantity + step)}
                                                className="w-8 h-8 flex items-center justify-center bg-orange-900 text-white rounded-md shadow-sm hover:bg-orange-800 transition-colors"
                                            >
                                                <Plus size={16} />
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {items.length > 0 && (
                        <form id="checkout-form" onSubmit={handleSubmit} className="space-y-4 pt-6 border-t border-orange-900/10">
                            <h3 className="font-bold text-lg text-orange-950 mb-4" style={{ fontFamily: '"Cinzel", serif' }}>Dados de Entrega</h3>

                            <div className="space-y-3">
                                <label className="text-sm font-bold text-orange-950 mb-1 block">1. Seu Telefone</label>
                                <div className="flex gap-2">
                                    <Input required placeholder="Telefone / WhatsApp" value={formatPhone(phone)} onChange={(e) => {
                                        setPhone(e.target.value.replace(/\D/g, ''))
                                        setHasSearchedPhone(false)
                                    }} className="bg-white border-orange-900/20 focus-visible:ring-orange-900 flex-1" />
                                    <Button type="button" onClick={handlePhoneSearch} disabled={phone.replace(/\D/g, '').length < 10 || isLoadingPhone} className="bg-orange-900 hover:bg-orange-800 text-white shrink-0">
                                        {isLoadingPhone ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                                    </Button>
                                </div>

                                {hasSearchedPhone && (
                                    <div className="pt-2 pb-1 border-t border-orange-900/10 mt-4 space-y-3 animate-in fade-in slide-in-from-top-4 duration-300">
                                        <label className="text-sm font-bold text-orange-950 block">2. Endereço e Pagamento</label>

                                        <Input required placeholder="Seu Nome" value={name} onChange={(e) => setName(e.target.value)} disabled={addressReadonly} className="bg-white border-orange-900/20 focus-visible:ring-orange-900 disabled:opacity-75 disabled:bg-orange-900/5" />

                                        <div className="space-y-1">
                                            <div className="relative">
                                                <Input required placeholder="CEP" value={formatCep(cep)} onChange={handleCepChange} disabled={addressReadonly} maxLength={9} className="bg-white border-orange-900/20 focus-visible:ring-orange-900 disabled:opacity-75 disabled:bg-orange-900/5" />
                                                {isLoadingCep && <Loader2 className="absolute right-3 top-2.5 h-5 w-5 animate-spin text-orange-900/50" />}
                                            </div>
                                            {cepError && <p className="text-red-500 text-xs font-bold px-1">{cepError}</p>}
                                        </div>

                                        <div className="grid grid-cols-3 gap-3">
                                            <Input required placeholder="Rua" value={street} onChange={(e) => setStreet(e.target.value)} disabled={addressReadonly} className="col-span-2 bg-white border-orange-900/20 focus-visible:ring-orange-900 disabled:opacity-75 disabled:bg-orange-900/5" />
                                            <Input required id="number-input" placeholder="Núm." value={number} onChange={(e) => setNumber(e.target.value)} disabled={addressReadonly} className="bg-white border-orange-900/20 focus-visible:ring-orange-900 disabled:opacity-75 disabled:bg-orange-900/5" />
                                        </div>

                                        <Input required placeholder="Bairro" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} disabled={addressReadonly} className="bg-white border-orange-900/20 focus-visible:ring-orange-900 disabled:opacity-75 disabled:bg-orange-900/5" />

                                        <div className="grid grid-cols-4 gap-3">
                                            <Input required placeholder="Cidade" value={city} onChange={(e) => setCity(e.target.value)} disabled={addressReadonly} className="col-span-3 bg-white border-orange-900/20 focus-visible:ring-orange-900 disabled:opacity-75 disabled:bg-orange-900/5" />
                                            <Input required placeholder="UF" value={state} onChange={(e) => setState(e.target.value)} disabled={addressReadonly} maxLength={2} className="uppercase bg-white border-orange-900/20 focus-visible:ring-orange-900 disabled:opacity-75 disabled:bg-orange-900/5" />
                                        </div>

                                        {clientFound && addressReadonly && (
                                            <div className="flex justify-start mt-1 mb-2 pt-1">
                                                <button type="button" onClick={handleNewAddress} className="text-xs text-orange-800 font-bold underline hover:text-orange-950 flex items-center gap-1">
                                                    <Plus size={14} /> Entregar em outro endereço
                                                </button>
                                            </div>
                                        )}

                                        <Input placeholder="Ponto de Referência (Opcional)" value={reference} onChange={(e) => setReference(e.target.value)} className="bg-white border-orange-900/20 focus-visible:ring-orange-900 mt-2" />

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
                                )}
                            </div>
                        </form>
                    )}
                </div>

                <SheetFooter className="p-6 bg-white border-t border-orange-900/10 shrink-0 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
                    <div className="w-full flex justify-between items-center mb-4">
                        <span className="text-lg font-medium text-orange-950">Total</span>
                        <span className="text-2xl font-bold text-orange-900">R$ {total.toFixed(2).replace('.', ',')}</span>
                    </div>

                    {hasFractionalPendency && (
                        <div className="w-full text-center mb-3">
                            <span className="text-sm font-bold text-red-600 bg-red-50 border border-red-200 p-2.5 rounded-md block shadow-sm leading-tight">
                                ⚠️ Você possui metades pendentes. Escolha a outra metade da pizza para formar uma inteira.
                            </span>
                        </div>
                    )}

                    <Button
                        type="submit"
                        form="checkout-form"
                        disabled={items.length === 0 || hasFractionalPendency || !hasSearchedPhone || isSubmitting}
                        className={`w-full h-14 text-lg font-bold shadow-xl rounded-xl transition-all ${hasFractionalPendency || !hasSearchedPhone || isSubmitting
                            ? 'bg-stone-300 text-stone-500 cursor-not-allowed opacity-60 hover:bg-stone-300'
                            : 'bg-gradient-to-r from-orange-800 to-orange-950 hover:from-orange-900 hover:to-orange-950 text-white'
                            }`}
                    >
                        {isSubmitting ? <Loader2 className="animate-spin" /> : 'Finalizar Pedido'}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    )
}
