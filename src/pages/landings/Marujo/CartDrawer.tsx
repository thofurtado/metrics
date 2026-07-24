import {
  Loader2,
  MapPin,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

import { api } from '../../../lib/axios'
import { useCart } from './CartContext'

const DELIVERY_FEES = [
  { neighborhood: 'Balneário California', fee: 5.0 },
  { neighborhood: 'Balneário Copacabana', fee: 5.0 },
  { neighborhood: 'Benfica', fee: 23.0 },
  { neighborhood: 'Capricórnio 1, 2, 3', fee: 5.0 },
  { neighborhood: 'Caputera', fee: 23.0 },
  { neighborhood: 'Centro', fee: 23.0 },
  { neighborhood: 'Chocolate', fee: 10.0 },
  { neighborhood: 'Cidade Jardim', fee: 20.0 },
  { neighborhood: 'Cocanha', fee: 15.0 },
  { neighborhood: 'Getuba', fee: 10.0 },
  { neighborhood: 'Golfinho', fee: 30.0 },
  { neighborhood: 'Hotel Costa Norte', fee: 7.0 },
  { neighborhood: 'Indaiá', fee: 27.0 },
  { neighborhood: 'Jaraguazinho', fee: 27.0 },
  { neighborhood: 'Jd. Jaqueira', fee: 27.0 },
  { neighborhood: 'Jd. Santa Rosa', fee: 10.0 },
  { neighborhood: 'Mar Verde', fee: 23.0 },
  { neighborhood: 'Maranduba', fee: 40.0 },
  { neighborhood: 'Martin de Sá', fee: 20.0 },
  { neighborhood: 'Massaguaçu', fee: 10.0 },
  { neighborhood: 'Palmeiras', fee: 30.0 },
  { neighborhood: 'Parque Imperial', fee: 15.0 },
  { neighborhood: 'Patrimônio', fee: 10.0 },
  { neighborhood: 'Pinheirinho', fee: 10.0 },
  { neighborhood: 'Poiares', fee: 30.0 },
  { neighborhood: 'Portal Fazendinha', fee: 10.0 },
  { neighborhood: 'Porto Novo', fee: 36.0 },
  { neighborhood: 'Prainha', fee: 20.0 },
  { neighborhood: 'Primavera', fee: 23.0 },
  { neighborhood: 'Rio do Ouro', fee: 27.0 },
  { neighborhood: 'Sapê', fee: 40.0 },
  { neighborhood: 'Sertão da Quina', fee: 40.0 },
  { neighborhood: 'Tabatinga', fee: 23.0 },
  { neighborhood: 'Tinga', fee: 27.0 },
  { neighborhood: 'Verde Mar', fee: 15.0 },
]

export function CartDrawer() {
  const { items, isCartOpen, setIsCartOpen, updateQuantity, total, clearCart } =
    useCart()

  const fractionalSum = items
    .filter((i) => i.measureUnit === 'FRACTIONAL')
    .reduce((sum, i) => sum + i.quantity, 0)
  const hasFractionalPendency = fractionalSum % 1 !== 0

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

  const [savedAddresses, setSavedAddresses] = useState<any[]>([])
  const [isAddressesModalOpen, setIsAddressesModalOpen] = useState(false)

  const formatPhone = (val: string) => {
    const v = val.replace(/\D/g, '').substring(0, 11)
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
    const v = val.replace(/\D/g, '').substring(0, 8)
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
          setSavedAddresses(client.addresses)
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
        isNewAddress,
      })

      const formatQty = (q: number) =>
        q === 0.5 ? '1/2' : q === 1.5 ? '1.5' : q === 2.5 ? '2.5' : q

      const formattedItems = items
        .map(
          (i) =>
            `*${formatQty(i.quantity)}x* ${i.name} - R$ ${(i.price * i.quantity).toFixed(2).replace('.', ',')}${i.observation ? `%0A  _Obs: ${i.observation}_` : ''}`,
        )
        .join('%0A')
      const formattedTotal = total.toFixed(2).replace('.', ',')

      const rawCepToSend = cep.replace(/\D/g, '')
      const adrressString = rawCepToSend
        ? `${street}, ${number} - ${neighborhood}%0A${city}/${state} - CEP: ${formatCep(rawCepToSend)}`
        : `${street}, ${number} - ${neighborhood}`

      const message = `Olá Marujo! Gostaria de fazer o seguinte pedido:%0A%0A${formattedItems}%0A%0ATotal: *R$ ${formattedTotal}*%0A%0ADados de Entrega:%0A${name} - ${formatPhone(phone)}%0A${adrressString}%0ARef: ${reference}%0A%0APagamento: *${paymentMethod}*`

      window.open(`https://wa.me/5512996293344?text=${message}`, '_blank')

      clearCart()
      setIsCartOpen(false)

      setTimeout(() => {
        setName('')
        setPhone('')
        setCep('')
        setStreet('')
        setNumber('')
        setNeighborhood('')
        setCity('')
        setState('')
        setReference('')
        setPaymentMethod('Dinheiro')
        setHasSearchedPhone(false)
        setClientFound(false)
        setAddressReadonly(false)
        setIsNewAddress(false)
        setSavedAddresses([])
      }, 300)
    } catch (error) {
      toast.error('Ocorreu um erro ao registrar as informações da entrega.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
      <SheetContent className="flex w-full flex-col border-l-orange-900/20 bg-[#fdf8f0] p-0 sm:max-w-md sm:p-0">
        <SheetHeader className="border-b border-orange-900/10 bg-orange-900/5 p-6">
          <SheetTitle
            className="flex items-center gap-2 font-serif text-2xl text-orange-950"
            style={{ fontFamily: '"Cinzel", serif' }}
          >
            <ShoppingBag className="text-orange-800" />
            Seu Pedido
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {items.length === 0 ? (
            <div className="py-10 text-center font-medium text-orange-900/60">
              Seu carrinho está vazio.
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => {
                const step = item.measureUnit === 'FRACTIONAL' ? 0.5 : 1
                const formatQtyLocal = (q: number) => (q === 0.5 ? '1/2' : q)

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border border-orange-900/10 bg-white p-3 shadow-sm"
                  >
                    <div className="flex-1">
                      <h4 className="font-bold text-orange-950">{item.name}</h4>
                      {item.observation && (
                        <p className="mt-0.5 line-clamp-2 max-w-[180px] break-words text-xs italic text-orange-900/70">
                          Obs: {item.observation}
                        </p>
                      )}
                      <div className="mt-1 font-medium text-orange-800">
                        R$ {item.price.toFixed(2).replace('.', ',')}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-lg border border-orange-200 bg-orange-50 p-1">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.id, item.quantity - step)
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-md border border-orange-200 bg-white text-orange-900 shadow-sm transition-colors hover:bg-orange-100"
                      >
                        {item.quantity <= step ? (
                          <Trash2 size={16} className="text-red-500" />
                        ) : (
                          <Minus size={16} />
                        )}
                      </button>
                      <span className="w-6 text-center font-bold text-orange-950">
                        {formatQtyLocal(item.quantity)}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.id, item.quantity + step)
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-md bg-orange-900 text-white shadow-sm transition-colors hover:bg-orange-800"
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
            <form
              id="checkout-form"
              onSubmit={handleSubmit}
              className="space-y-4 border-t border-orange-900/10 pt-6"
            >
              <h3
                className="mb-4 text-lg font-bold text-orange-950"
                style={{ fontFamily: '"Cinzel", serif' }}
              >
                Dados de Entrega
              </h3>

              <div className="space-y-3">
                <label className="mb-1 block text-sm font-bold text-orange-950">
                  1. Seu Telefone
                </label>
                <div className="flex gap-2">
                  <Input
                    required
                    placeholder="Telefone / WhatsApp"
                    value={formatPhone(phone)}
                    onChange={(e) => {
                      setPhone(e.target.value.replace(/\D/g, ''))
                      setHasSearchedPhone(false)
                    }}
                    className="flex-1 border-orange-900/20 bg-white focus-visible:ring-orange-900"
                  />
                  <Button
                    type="button"
                    onClick={handlePhoneSearch}
                    disabled={
                      phone.replace(/\D/g, '').length < 10 || isLoadingPhone
                    }
                    className="shrink-0 bg-orange-900 text-white hover:bg-orange-800"
                  >
                    {isLoadingPhone ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <Search size={20} />
                    )}
                  </Button>
                </div>

                {hasSearchedPhone && (
                  <div className="mt-4 space-y-3 border-t border-orange-900/10 pb-1 pt-2 duration-300 animate-in fade-in slide-in-from-top-4">
                    <label className="block text-sm font-bold text-orange-950">
                      2. Endereço e Pagamento
                    </label>

                    <Input
                      required
                      placeholder="Seu Nome"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={addressReadonly}
                      className="border-orange-900/20 bg-white focus-visible:ring-orange-900 disabled:bg-orange-900/5 disabled:opacity-75"
                    />

                    <div className="space-y-1">
                      <div className="relative">
                        <Input
                          required
                          placeholder="CEP"
                          value={formatCep(cep)}
                          onChange={handleCepChange}
                          disabled={addressReadonly}
                          maxLength={9}
                          className="border-orange-900/20 bg-white focus-visible:ring-orange-900 disabled:bg-orange-900/5 disabled:opacity-75"
                        />
                        {isLoadingCep && (
                          <Loader2 className="absolute right-3 top-2.5 h-5 w-5 animate-spin text-orange-900/50" />
                        )}
                      </div>
                      {cepError && (
                        <p className="px-1 text-xs font-bold text-red-500">
                          {cepError}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <Input
                        required
                        placeholder="Rua"
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                        disabled={addressReadonly}
                        className="col-span-2 border-orange-900/20 bg-white focus-visible:ring-orange-900 disabled:bg-orange-900/5 disabled:opacity-75"
                      />
                      <Input
                        required
                        id="number-input"
                        placeholder="Núm."
                        value={number}
                        onChange={(e) => setNumber(e.target.value)}
                        disabled={addressReadonly}
                        className="border-orange-900/20 bg-white focus-visible:ring-orange-900 disabled:bg-orange-900/5 disabled:opacity-75"
                      />
                    </div>

                    <Input
                      required
                      placeholder="Bairro"
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      disabled={addressReadonly}
                      className="border-orange-900/20 bg-white focus-visible:ring-orange-900 disabled:bg-orange-900/5 disabled:opacity-75"
                    />

                    <div className="grid grid-cols-4 gap-3">
                      <Input
                        required
                        placeholder="Cidade"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        disabled={addressReadonly}
                        className="col-span-3 border-orange-900/20 bg-white focus-visible:ring-orange-900 disabled:bg-orange-900/5 disabled:opacity-75"
                      />
                      <Input
                        required
                        placeholder="UF"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        disabled={addressReadonly}
                        maxLength={2}
                        className="border-orange-900/20 bg-white uppercase focus-visible:ring-orange-900 disabled:bg-orange-900/5 disabled:opacity-75"
                      />
                    </div>

                    {(clientFound && addressReadonly) ||
                    savedAddresses.length > 1 ? (
                      <div className="mb-2 mt-1 flex flex-wrap justify-start gap-4 pt-1">
                        {clientFound && addressReadonly && (
                          <button
                            type="button"
                            onClick={handleNewAddress}
                            className="flex items-center gap-1 text-xs font-bold text-orange-800 underline hover:text-orange-950"
                          >
                            <Plus size={14} /> Entregar em outro endereço
                          </button>
                        )}

                        {savedAddresses.length > 1 && (
                          <Dialog
                            open={isAddressesModalOpen}
                            onOpenChange={setIsAddressesModalOpen}
                          >
                            <DialogTrigger asChild>
                              <button
                                type="button"
                                className="flex items-center gap-1 text-xs font-bold text-orange-800 underline hover:text-orange-950"
                              >
                                <MapPin size={14} /> Escolher endereços salvos
                              </button>
                            </DialogTrigger>
                            <DialogContent className="max-w-sm rounded-[1rem] border bg-white outline-none">
                              <DialogHeader>
                                <DialogTitle className="mb-2 text-center font-serif text-2xl font-bold text-orange-950">
                                  Meus Endereços
                                </DialogTitle>
                              </DialogHeader>
                              <div className="custom-scrollbar max-h-[60vh] overflow-y-auto pr-2">
                                <div className="space-y-3">
                                  {savedAddresses.map((addr, index) => (
                                    <button
                                      key={index}
                                      type="button"
                                      onClick={() => {
                                        setCep(
                                          addr.zipcode
                                            ?.toString()
                                            .padStart(8, '0') || '',
                                        )
                                        setStreet(addr.street || '')
                                        setNumber(addr.number?.toString() || '')
                                        setNeighborhood(addr.neighborhood || '')
                                        setCity(addr.city || '')
                                        setState(addr.state || '')
                                        setAddressReadonly(true)
                                        setIsNewAddress(false)
                                        setIsAddressesModalOpen(false)
                                      }}
                                      className="w-full rounded-lg border border-orange-900/10 p-3 text-left transition-colors hover:border-orange-500 hover:bg-orange-50"
                                    >
                                      <div className="mb-1 flex items-start justify-between">
                                        <span className="text-sm font-bold text-orange-950">
                                          {addr.street}, {addr.number}
                                        </span>
                                        {addr.is_main && (
                                          <span className="rounded-full bg-orange-800 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                                            Principal
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-xs text-stone-600">
                                        {addr.neighborhood} - {addr.city}/
                                        {addr.state}
                                      </p>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    ) : null}

                    <Input
                      placeholder="Ponto de Referência (Opcional)"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      className="mt-2 border-orange-900/20 bg-white focus-visible:ring-orange-900"
                    />

                    <div className="pt-2">
                      <label className="mb-2 block text-sm font-bold text-orange-950">
                        Forma de Pagamento
                      </label>
                      <select
                        required
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="flex h-10 w-full items-center justify-between rounded-md border border-orange-900/20 bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="Dinheiro">Dinheiro</option>
                        <option value="Pix">Pix</option>
                        <option value="Cartão de Crédito">
                          Cartão de Crédito
                        </option>
                        <option value="Cartão de Débito">
                          Cartão de Débito
                        </option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </form>
          )}
        </div>

        <SheetFooter className="shrink-0 border-t border-orange-900/10 bg-white p-6 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
          <div className="mb-4 flex w-full items-center justify-between">
            <span className="text-lg font-medium text-orange-950">Total</span>
            <span className="text-2xl font-bold text-orange-900">
              R$ {total.toFixed(2).replace('.', ',')}
            </span>
          </div>

          {hasFractionalPendency && (
            <div className="mb-3 w-full text-center">
              <span className="block rounded-md border border-red-200 bg-red-50 p-2.5 text-sm font-bold leading-tight text-red-600 shadow-sm">
                ⚠️ Você possui metades pendentes. Escolha a outra metade da
                pizza para formar uma inteira.
              </span>
            </div>
          )}

          <div className="mb-4 flex justify-center">
            <Dialog>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1 text-sm font-medium text-orange-800 underline transition-colors hover:text-orange-950"
                >
                  <MapPin size={16} />
                  Consulte aqui a taxa de entrega para o seu bairro
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-sm rounded-[1rem] border bg-white outline-none">
                <DialogHeader>
                  <DialogTitle className="mb-2 text-center font-serif text-2xl font-bold text-orange-950">
                    Taxas de Entrega
                  </DialogTitle>
                </DialogHeader>
                <div className="custom-scrollbar max-h-[60vh] overflow-y-auto pr-2">
                  <div className="space-y-2">
                    {DELIVERY_FEES.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between border-b border-orange-900/10 py-2 last:border-0"
                      >
                        <span className="text-sm font-medium text-stone-700">
                          {item.neighborhood}
                        </span>
                        <span className="text-sm font-bold text-orange-900">
                          R$ {item.fee.toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Button
            type="submit"
            form="checkout-form"
            disabled={
              items.length === 0 ||
              hasFractionalPendency ||
              !hasSearchedPhone ||
              isSubmitting
            }
            className={`h-14 w-full rounded-xl text-lg font-bold shadow-xl transition-all ${
              hasFractionalPendency || !hasSearchedPhone || isSubmitting
                ? 'cursor-not-allowed bg-stone-300 text-stone-500 opacity-60 hover:bg-stone-300'
                : 'bg-gradient-to-r from-orange-800 to-orange-950 text-white hover:from-orange-900 hover:to-orange-950'
            }`}
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin" />
            ) : (
              'Finalizar Pedido'
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
